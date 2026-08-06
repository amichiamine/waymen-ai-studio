<?php

/**
 * Session serveur et cookie d'authentification.
 *
 * STRATÉGIE : session PHP native, cookie `httpOnly`.
 *
 * Le frontend est DÉJÀ écrit pour ce mode et ne se renégocie pas :
 *   - `.env.example` → `VITE_API_AUTH=cookie`
 *   - `src/api/client.ts` → `credentials: "include"`
 * Le client ne lit donc jamais le cookie et n'a aucun jeton à stocker. C'est
 * précisément l'intérêt : un cookie `httpOnly` est hors de portée de
 * `document.cookie`, donc hors de portée d'une injection de script. Un jeton
 * rangé dans `localStorage`, lui, se lit en une ligne de JavaScript.
 *
 * Quatre protections, toutes indispensables ensemble :
 *
 *   1. `httpOnly`   — le JavaScript de la page ne peut pas lire le cookie.
 *   2. `SameSite=Lax` — le cookie n'accompagne pas une requête POST venue d'un
 *      autre site : c'est la parade de base contre le CSRF, et la valeur
 *      inscrite au contrat (docs/API-CONTRACT.md).
 *   3. `Secure` dès que la requête est en HTTPS — le cookie ne repart jamais
 *      en clair. Non forcé en HTTP, sinon le développement local casse ; la
 *      détection est faite par requête, pas par configuration oubliable.
 *   4. Régénération de l'identifiant à l'ouverture — parade à la FIXATION de
 *      session : un attaquant qui aurait imposé un identifiant à la victime
 *      avant sa connexion se retrouve avec un identifiant périmé après.
 *
 * Deux horloges bornent la session :
 *   - une échéance ABSOLUE (`SESSION_TTL_SECONDS`, 12 h par défaut) : une
 *     session ne vit jamais indéfiniment, même active ;
 *   - une échéance d'INACTIVITÉ (`SESSION_IDLE_SECONDS`, 2 h par défaut) : un
 *     poste laissé ouvert finit par se refermer tout seul.
 * L'expiration détruit la session côté serveur ET efface le cookie côté
 * navigateur, sinon le client conserverait un cookie orphelin et recevrait des
 * 401 sans comprendre pourquoi.
 */

declare(strict_types=1);

namespace KaTech\Auth;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Env;

final class Session
{
    /** Nom du cookie. Ni `PHPSESSID` (bavard sur la pile) ni un nom aléatoire. */
    private const NOM_COOKIE = 'katech_sid';

    /** Clé unique sous laquelle vit tout notre état dans `$_SESSION`. */
    private const CLE = 'katech_auth';

    /** Durée de vie absolue par défaut : 12 heures. */
    private const TTL_DEFAUT = 43200;

    /** Inactivité tolérée par défaut : 2 heures. */
    private const INACTIVITE_DEFAUT = 7200;

    private static bool $demarree = false;

    private function __construct()
    {
    }

    // ------------------------------------------------------------------
    // Cycle de vie
    // ------------------------------------------------------------------

    /**
     * Démarre la session si elle ne l'est pas déjà. Idempotent : toutes les
     * méthodes de cette classe l'appellent, on ne s'en préoccupe pas ailleurs.
     */
    public static function demarrer(): void
    {
        if (self::$demarree || session_status() === PHP_SESSION_ACTIVE) {
            self::$demarree = true;

            return;
        }

        if (session_status() === PHP_SESSION_DISABLED) {
            throw ApiException::baseIndisponible(
                'Les sessions PHP sont désactivées sur ce serveur (session.save_handler = files ? '
                . 'extension session absente ?). L\'authentification par cookie ne peut pas fonctionner : '
                . 'activez l\'extension « session » dans le panneau de l\'hébergeur.'
            );
        }

        // Les en-têtes doivent encore être modifiables : le cookie de session
        // part dans les en-têtes de réponse. Échouer ici avec un message clair
        // vaut mieux qu'un cookie jamais posé et une connexion qui « ne tient
        // pas » sans explication.
        if (headers_sent($fichier, $ligne)) {
            throw new ApiException(
                500,
                'INTERNAL_ERROR',
                "Impossible d'ouvrir la session : les en-têtes ont déjà été envoyés "
                . "({$fichier}:{$ligne}). Un espace ou un BOM traîne avant une balise PHP."
            );
        }

        self::configurer();

        if (!session_start()) {
            throw ApiException::baseIndisponible(
                'Le démarrage de la session PHP a échoué. Vérifiez que le dossier de sessions '
                . '(session.save_path) existe et est inscriptible par PHP, ou définissez '
                . 'SESSION_SAVE_PATH dans api/.env vers un dossier accessible en écriture.'
            );
        }

        self::$demarree = true;

        // Purge d'une session expirée AVANT que quiconque la lise.
        self::purgerSiExpiree();
    }

    /** Réglages appliqués avant `session_start()`. */
    private static function configurer(): void
    {
        session_name(self::NOM_COOKIE);

        // `use_strict_mode` : PHP refuse un identifiant de session qu'il n'a
        // pas lui-même émis. Sans ce réglage, la régénération d'identifiant ne
        // suffit pas à écarter toutes les fixations de session. C'est le seul
        // réglage de cette liste dont l'absence affaiblirait réellement la
        // sécurité — il est donc vérifié après coup (voir plus bas).
        self::reglage('session.use_strict_mode', '1');
        self::reglage('session.use_only_cookies', '1');
        self::reglage('session.use_trans_sid', '0');
        self::reglage('session.gc_maxlifetime', (string) self::ttl());

        if (ini_get('session.use_strict_mode') !== '1') {
            Db::journaliserStatique(
                'session.use_strict_mode n\'a pas pu être activé (verrouillé par la configuration de '
                . 'l\'hébergeur ?). La régénération d\'identifiant reste en place, mais la protection '
                . 'contre la fixation de session est moins stricte. À signaler à l\'hébergeur.'
            );
        }

        // Emplacement de stockage. Certains mutualisés pointent
        // `session.save_path` vers un dossier partagé entre clients : le rendre
        // configurable permet de l'isoler sous le compte.
        $chemin = Env::get('SESSION_SAVE_PATH');
        if ($chemin !== null && $chemin !== '') {
            if (!is_dir($chemin) && !@mkdir($chemin, 0700, true) && !is_dir($chemin)) {
                throw ApiException::baseIndisponible(
                    "SESSION_SAVE_PATH pointe vers « {$chemin} », qui n'existe pas et n'a pas pu être créé. "
                    . 'Créez ce dossier et rendez-le inscriptible par PHP, ou retirez la variable de api/.env.'
                );
            }
            if (!is_writable($chemin)) {
                throw ApiException::baseIndisponible(
                    "Le dossier de sessions « {$chemin} » n'est pas inscriptible par PHP. Passez-le en 0700."
                );
            }
            session_save_path($chemin);
        }

        session_set_cookie_params([
            // 0 = cookie de session navigateur. L'expiration réelle est tenue
            // côté SERVEUR : un `expires` côté client est une indication que
            // n'importe qui peut prolonger.
            'lifetime' => 0,
            'path' => self::cheminCookie(),
            'domain' => '',
            'secure' => self::estHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Ouvre une session authentifiée pour un utilisateur.
     *
     * @param array<string,mixed> $utilisateur Ligne `users`, SANS `password_hash`.
     */
    public static function ouvrir(array $utilisateur): void
    {
        self::demarrer();

        // Table rase : aucune donnée d'une session précédente ne survit à une
        // nouvelle connexion.
        $_SESSION = [];

        // FIXATION DE SESSION — la ligne qui compte. `true` détruit l'ancien
        // fichier de session : sans lui, l'identifiant imposé par un attaquant
        // resterait un fichier valide côté serveur.
        session_regenerate_id(true);

        $maintenant = time();

        $_SESSION[self::CLE] = [
            'id' => (string) $utilisateur['id'],
            'email' => (string) $utilisateur['email'],
            'name' => (string) ($utilisateur['name'] ?? ''),
            'phone' => isset($utilisateur['phone']) && $utilisateur['phone'] !== null
                ? (string) $utilisateur['phone']
                : null,
            'role' => (string) ($utilisateur['role'] ?? 'customer'),
            'cree' => $maintenant,
            'vu' => $maintenant,
            'expire' => $maintenant + self::ttl(),
            // Empreinte du contexte client : un identifiant de session volé et
            // rejoué depuis un autre navigateur ne correspondra plus.
            'empreinte' => self::empreinte(),
        ];

        // Pas de `session_write_close()` ici : PHP persiste `$_SESSION` en fin
        // de requête. Fermer maintenant obligerait à rouvrir pour lire, ce qui
        // émettrait un second en-tête `Set-Cookie` dans la même réponse.
    }

    /**
     * Prolonge la session en place et lui donne un nouvel identifiant.
     *
     * Sert `POST /auth/refresh`. La rotation régulière de l'identifiant réduit
     * la fenêtre d'exploitation d'un cookie intercepté.
     */
    public static function rafraichir(): void
    {
        self::demarrer();

        $etat = self::etat();
        if ($etat === null) {
            throw ApiException::nonAuthentifie('Aucune session à renouveler.');
        }

        session_regenerate_id(true);

        $maintenant = time();
        $etat['vu'] = $maintenant;
        $etat['expire'] = $maintenant + self::ttl();
        $_SESSION[self::CLE] = $etat;
    }

    /**
     * Ferme la session : état serveur détruit ET cookie effacé côté client.
     *
     * Effacer le cookie n'est pas cosmétique. Sans cela, le navigateur
     * continuerait d'envoyer un identifiant devenu invalide, et l'utilisateur
     * verrait des 401 sur des pages qu'il croit publiques.
     */
    public static function fermer(): void
    {
        self::demarrer();

        $_SESSION = [];

        if (ini_get('session.use_cookies') && !headers_sent()) {
            setcookie(self::NOM_COOKIE, '', [
                'expires' => time() - 42000,
                'path' => self::cheminCookie(),
                'domain' => '',
                'secure' => self::estHttps(),
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }

        session_destroy();

        // On NE remet PAS `$demarree` à false : rouvrir une session dans la
        // même requête réémettrait un cookie, juste après l'avoir effacé.
        // `$_SESSION` est vide, donc toute lecture ultérieure rend `null`.
    }

    // ------------------------------------------------------------------
    // Lecture
    // ------------------------------------------------------------------

    /**
     * Utilisateur de la session courante, ou `null` si aucune session valide.
     *
     * Ne consulte PAS la base : le rôle est celui figé à la connexion. Une
     * rétrogradation de rôle prend donc effet à la session suivante — c'est le
     * compromis assumé d'une session serveur, et il est borné par le TTL.
     *
     * @return array{id:string,email:string,name:string,phone:?string,role:string}|null
     */
    public static function utilisateur(): ?array
    {
        self::demarrer();

        $etat = self::etat();
        if ($etat === null) {
            return null;
        }

        // Marque d'activité : alimente l'échéance d'inactivité.
        $_SESSION[self::CLE]['vu'] = time();

        return [
            'id' => (string) $etat['id'],
            'email' => (string) $etat['email'],
            'name' => (string) $etat['name'],
            'phone' => $etat['phone'] === null ? null : (string) $etat['phone'],
            'role' => (string) $etat['role'],
        ];
    }

    public static function estAuthentifie(): bool
    {
        return self::utilisateur() !== null;
    }

    /** Échéance absolue de la session, au format ISO 8601 UTC, ou `null`. */
    public static function expiration(): ?string
    {
        self::demarrer();

        $etat = self::etat();

        return $etat === null ? null : gmdate('c', (int) $etat['expire']);
    }

    /**
     * Met à jour le rôle ou l'identité stockés, sans rouvrir de session.
     * Utilisé après un changement de mot de passe ou de profil.
     *
     * @param array<string,mixed> $champs
     */
    public static function actualiser(array $champs): void
    {
        self::demarrer();

        $etat = self::etat();
        if ($etat === null) {
            return;
        }

        foreach (['email', 'name', 'phone', 'role'] as $cle) {
            if (array_key_exists($cle, $champs)) {
                $etat[$cle] = $champs[$cle] === null ? null : (string) $champs[$cle];
            }
        }

        $_SESSION[self::CLE] = $etat;
    }

    // ------------------------------------------------------------------
    // Interne
    // ------------------------------------------------------------------

    /**
     * Applique un réglage `session.*` sans faire tomber la requête.
     *
     * POURQUOI CE DÉTOUR. `bootstrap.php` transforme tout avertissement PHP en
     * exception (AGENTS.md §7). Or la liste des directives `session.*`
     * acceptées bouge d'une version à l'autre : `session.sid_length` et
     * `session.sid_bits_per_character` sont dépréciées depuis PHP 8.4, et
     * d'autres suivront. Un `ini_set()` nu ferait donc tomber toute
     * l'authentification à la prochaine dépréciation — pour un réglage de
     * confort dont le défaut de PHP est déjà correct.
     *
     * On applique donc au mieux, et on JOURNALISE le refus. Jamais silencieux,
     * jamais bloquant. Les directives dépréciées ne sont volontairement plus
     * demandées : leurs valeurs par défaut sont sûres sur toute version
     * supportée.
     */
    private static function reglage(string $cle, string $valeur): void
    {
        if ((string) ini_get($cle) === $valeur) {
            return;
        }

        try {
            if (@ini_set($cle, $valeur) === false) {
                Db::journaliserStatique(
                    "Réglage de session refusé par le serveur : {$cle} = {$valeur} "
                    . '(directive verrouillée). Valeur par défaut de PHP conservée.'
                );
            }
        } catch (\Throwable $e) {
            Db::journaliserStatique(
                "Réglage de session inapplicable : {$cle} = {$valeur} — " . $e->getMessage()
                . '. Valeur par défaut de PHP conservée.'
            );
        }
    }

    /**
     * État brut de la session, après contrôle de validité.
     *
     * @return array<string,mixed>|null
     */
    private static function etat(): ?array
    {
        $etat = $_SESSION[self::CLE] ?? null;
        if (!is_array($etat) || !isset($etat['id'], $etat['expire'], $etat['vu'])) {
            return null;
        }

        return $etat;
    }

    /**
     * Détruit la session si l'une des deux horloges a sonné, ou si l'empreinte
     * du client a changé.
     */
    private static function purgerSiExpiree(): void
    {
        $etat = self::etat();
        if ($etat === null) {
            return;
        }

        $maintenant = time();
        $motif = null;

        if ($maintenant >= (int) $etat['expire']) {
            $motif = 'échéance absolue atteinte';
        } elseif (($maintenant - (int) $etat['vu']) > self::inactivite()) {
            $motif = 'inactivité prolongée';
        } elseif (($etat['empreinte'] ?? null) !== self::empreinte()) {
            // Le contexte client a changé : navigateur différent, donc cookie
            // probablement rejoué ailleurs. On refuse, et on le DIT au journal
            // — c'est le genre d'événement qu'un exploitant veut pouvoir
            // corréler après coup.
            $motif = 'empreinte client différente (cookie rejoué depuis un autre navigateur ?)';
        }

        if ($motif === null) {
            return;
        }

        Db::journaliserStatique('Session close : ' . $motif . '.');

        // Vidage du conteneur plutôt que `session_destroy()` : le traitement de
        // la requête continue et `$_SESSION` doit rester lisible (il rendra
        // `null`). Le fichier vidé sera ramassé par le GC de PHP.
        $_SESSION = [];

        if (!headers_sent()) {
            setcookie(self::NOM_COOKIE, '', [
                'expires' => time() - 42000,
                'path' => self::cheminCookie(),
                'domain' => '',
                'secure' => self::estHttps(),
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
    }

    /**
     * Empreinte du contexte client.
     *
     * On retient l'agent utilisateur, PAS l'adresse IP : chez les opérateurs
     * mobiles algériens, l'IP change en cours de navigation et déconnecterait
     * l'utilisateur toutes les dix minutes. L'agent utilisateur, lui, est
     * stable pour une même session de navigateur.
     */
    private static function empreinte(): string
    {
        return hash('sha256', (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    }

    /**
     * Vrai si la requête courante arrive en HTTPS.
     *
     * `X-Forwarded-Proto` est pris en compte : derrière le proxy d'un
     * hébergeur, `$_SERVER['HTTPS']` est vide alors que le visiteur est bien
     * en HTTPS. Ignorer l'en-tête priverait le cookie de son attribut `Secure`
     * exactement là où il est le plus utile.
     */
    public static function estHttps(): bool
    {
        $https = (string) ($_SERVER['HTTPS'] ?? '');
        if ($https !== '' && strtolower($https) !== 'off') {
            return true;
        }

        if ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443) {
            return true;
        }

        $transmis = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));

        return str_contains($transmis, 'https');
    }

    /** Chemin du cookie : `/` par défaut, surchargeable si l'API est en sous-dossier. */
    private static function cheminCookie(): string
    {
        $chemin = (string) Env::get('SESSION_COOKIE_PATH', '/');

        return $chemin === '' ? '/' : $chemin;
    }

    private static function ttl(): int
    {
        $v = Env::int('SESSION_TTL_SECONDS', self::TTL_DEFAUT);

        return $v > 0 ? $v : self::TTL_DEFAUT;
    }

    private static function inactivite(): int
    {
        $v = Env::int('SESSION_IDLE_SECONDS', self::INACTIVITE_DEFAUT);

        return $v > 0 ? $v : self::INACTIVITE_DEFAUT;
    }
}
