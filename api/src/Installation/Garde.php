<?php

/**
 * Garde de la page d'installation : jeton anti-rejeu et limitation des tentatives.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI PAS `KaTech\Limiteur`
 * ─────────────────────────────────────────────────────────────────────────
 * Le projet a déjà un limiteur de débit, et il est bon : deux axes, clés
 * hachées, verrouillage temporaire, message de refus qui ne révèle rien. Mais
 * il range ses compteurs dans la table `login_attempts` — c'est-à-dire dans la
 * base de données que cette page-ci n'a pas encore créée, et dont elle est
 * précisément en train de demander les identifiants. L'appeler avant
 * l'installation reviendrait à exiger l'existence de ce qu'on installe.
 *
 * Ce garde reprend donc la MÊME DOCTRINE dans le seul support disponible avant
 * la base : un fichier. Il vit le temps de l'installation, et disparaît avec
 * elle. Rien ici n'est réutilisable ailleurs, et c'est voulu : le limiteur du
 * projet reste le seul limiteur du projet.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QU'IL PROTÈGE
 * ─────────────────────────────────────────────────────────────────────────
 * Tant que rien n'est installé, `install.php` est une page PUBLIQUE qui accepte
 * des mots de passe et écrit des fichiers. C'est une cible. Trois mesures :
 *
 *   1. JETON ANTI-REJEU. Chaque formulaire porte un jeton à usage unique, tiré
 *      au hasard et gardé côté serveur. Un POST sans jeton valide est refusé.
 *      Cela ferme la porte au site tiers qui ferait installer la boutique à
 *      l'insu du commerçant (CSRF), et à la soumission rejouée deux fois.
 *   2. PLAFOND DE TENTATIVES. Au-delà de `MAX_TENTATIVES` soumissions dans la
 *      fenêtre, la page refuse tout, le temps du verrou.
 *   3. STOCKAGE HORS DE PORTÉE. Le fichier d'état commence par un point :
 *      `api/.htaccess` refuse déjà tout fichier de ce type (barrières 1 et 2).
 *      Il ne contient de toute façon aucun secret — des empreintes et des
 *      horodatages.
 */

declare(strict_types=1);

namespace KaTech\Installation;

final class Garde
{
    /**
     * Nom du fichier d'état. Le point initial le rend non téléchargeable
     * (api/.htaccess, barrières 1 et 2 : tout fichier commençant par un point).
     */
    private const FICHIER = '.installation-etat.json';

    /**
     * Dossier préféré : `api/var/`. Trois raisons, dans cet ordre —
     *   1. `api/.htaccess` refuse le dossier `var/` en entier, par NOM DE
     *      DOSSIER, en plus du refus par nom de fichier : deux barrières valent
     *      mieux qu'une pour un fichier qui porte des empreintes de jetons ;
     *   2. `api/.gitignore` ignore déjà `var/` : rien ne risque d'être committé
     *      par un `git add -A` distrait ;
     *   3. c'est le dossier que le projet réserve depuis toujours aux données
     *      locales de l'API — on n'invente pas un emplacement de plus.
     */
    private const SOUS_DOSSIER = 'var';

    /** Soumissions autorisées par fenêtre, tous jetons confondus. */
    private const MAX_TENTATIVES = 12;

    /** Fenêtre de comptage, en secondes. */
    private const FENETRE = 900;

    /** Durée de validité d'un jeton, en secondes. */
    private const VIE_JETON = 3600;

    /** Nombre de jetons valides simultanément (onglets, retours arrière). */
    private const JETONS_GARDES = 6;

    private string $fichier;

    /** @var array{jetons:array<string,int>,tentatives:array<string,list<int>>} */
    private array $etat;

    public function __construct(string $racineApi)
    {
        $racineApi = rtrim($racineApi, '/');
        $dossier = $racineApi . '/' . self::SOUS_DOSSIER;

        if (!@is_dir($dossier)) {
            @mkdir($dossier, 0750, true);
        }

        // Repli en cascade. Un assistant sans anti-rejeu serait pire qu'un
        // assistant dont l'état est rangé ailleurs : on descend jusqu'au dossier
        // temporaire du système plutôt que de renoncer au jeton.
        if (!@is_dir($dossier) || !@is_writable($dossier)) {
            $dossier = @is_writable($racineApi) ? $racineApi : sys_get_temp_dir();
        }
        $this->fichier = $dossier . '/' . self::FICHIER;
        $this->etat = $this->lire();
    }

    /** Émet un jeton à usage unique et le mémorise. */
    public function emettreJeton(): string
    {
        $jeton = bin2hex(random_bytes(32));
        $this->etat['jetons'][hash('sha256', $jeton)] = time() + self::VIE_JETON;

        // On ne garde qu'une poignée de jetons : sans plafond, le fichier
        // grossirait indéfiniment sous les rechargements d'un robot.
        if (count($this->etat['jetons']) > self::JETONS_GARDES) {
            asort($this->etat['jetons']);
            $this->etat['jetons'] = array_slice($this->etat['jetons'], -self::JETONS_GARDES, null, true);
        }

        $this->ecrire();

        return $jeton;
    }

    /**
     * Vérifie un jeton et le consomme.
     *
     * `hash_equals` et non `===` : la comparaison d'un secret doit être à temps
     * constant. Ici l'enjeu est mince (le jeton fait 64 caractères aléatoires),
     * mais la règle du projet ne souffre pas d'exception locale.
     */
    public function consommerJeton(?string $jeton): bool
    {
        if ($jeton === null || $jeton === '') {
            return false;
        }

        $empreinte = hash('sha256', $jeton);
        $maintenant = time();
        $valide = false;

        foreach ($this->etat['jetons'] as $connu => $expire) {
            if ($expire >= $maintenant && hash_equals($connu, $empreinte)) {
                $valide = true;
            }
        }

        unset($this->etat['jetons'][$empreinte]);
        $this->ecrire();

        return $valide;
    }

    /**
     * Enregistre une tentative et dit si le plafond est atteint.
     *
     * La clé est l'empreinte de l'adresse IP : comme dans `KaTech\Limiteur`, on
     * ne stocke pas l'adresse en clair — une fuite du fichier ne doit pas dire
     * QUI a essayé.
     */
    public function tropDeTentatives(string $ip): bool
    {
        $cle = hash('sha256', $ip);
        $maintenant = time();

        $recentes = array_values(array_filter(
            $this->etat['tentatives'][$cle] ?? [],
            static fn (int $t): bool => $t > $maintenant - self::FENETRE,
        ));
        $recentes[] = $maintenant;
        $this->etat['tentatives'][$cle] = array_slice($recentes, -(self::MAX_TENTATIVES + 1));
        $this->ecrire();

        return count($recentes) > self::MAX_TENTATIVES;
    }

    /** Minutes restantes avant la levée du verrou, pour le message affiché. */
    public function minutesAvantLevee(): int
    {
        return (int) ceil(self::FENETRE / 60);
    }

    /** Efface le fichier d'état : l'installation est finie, il n'a plus d'objet. */
    public function oublier(): void
    {
        @unlink($this->fichier);
    }

    /** @return array{jetons:array<string,int>,tentatives:array<string,list<int>>} */
    private function lire(): array
    {
        $vide = ['jetons' => [], 'tentatives' => []];

        if (!is_file($this->fichier)) {
            return $vide;
        }

        $brut = @file_get_contents($this->fichier);
        if ($brut === false) {
            return $vide;
        }

        $decode = json_decode($brut, true);
        if (!is_array($decode)) {
            return $vide;
        }

        $maintenant = time();
        $jetons = [];
        foreach ((array) ($decode['jetons'] ?? []) as $empreinte => $expire) {
            if (is_string($empreinte) && is_int($expire) && $expire >= $maintenant) {
                $jetons[$empreinte] = $expire;
            }
        }

        $tentatives = [];
        foreach ((array) ($decode['tentatives'] ?? []) as $cle => $liste) {
            if (!is_string($cle) || !is_array($liste)) {
                continue;
            }
            $gardees = array_values(array_filter(
                $liste,
                static fn ($t): bool => is_int($t) && $t > $maintenant - self::FENETRE,
            ));
            if ($gardees !== []) {
                $tentatives[$cle] = $gardees;
            }
        }

        return ['jetons' => $jetons, 'tentatives' => $tentatives];
    }

    private function ecrire(): void
    {
        $json = json_encode($this->etat, JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return;
        }
        if (@file_put_contents($this->fichier, $json, LOCK_EX) !== false) {
            @chmod($this->fichier, 0600);
        }
    }
}
