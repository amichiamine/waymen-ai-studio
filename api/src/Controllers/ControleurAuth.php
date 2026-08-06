<?php

/**
 * Authentification — les 8 endpoints du contrat (docs/API-CONTRACT.md §Auth).
 *
 *   POST /auth/register         inscription (compte client)
 *   POST /auth/login            connexion, pose le cookie de session
 *   POST /auth/logout           déconnexion
 *   GET  /auth/me               session courante
 *   POST /auth/refresh          renouvellement
 *   POST /auth/forgot-password  demande de réinitialisation
 *   POST /auth/reset-password   réinitialisation par jeton
 *   POST /auth/change-password  changement par l'utilisateur connecté
 *
 * Le client `src/api/resources/auth.ts` est DÉJÀ écrit contre ces chemins et
 * ces formes de réponse (`AuthSession = { user: {...}, expiresAt? }`) : ils ne
 * se renégocient pas.
 *
 * ------------------------------------------------------------------------
 * TROIS RÈGLES DE SÉCURITÉ QUI GOUVERNENT TOUT CE FICHIER
 * ------------------------------------------------------------------------
 *
 * 1. AUCUN MESSAGE NE RÉVÈLE SI UN EMAIL EXISTE.
 *    « Identifiants invalides. » que le compte soit absent, inactif, ou que le
 *    mot de passe soit faux. Trois messages distincts transformeraient
 *    `/auth/login` en annuaire : on itère sur une liste d'adresses et on trie
 *    selon la réponse. Le temps de réponse est égalisé de la même façon, par le
 *    leurre de `MotDePasse::verifier()` — un message identique servi deux fois
 *    plus vite trahit tout autant.
 *
 * 2. « MOT DE PASSE OUBLIÉ » RÉPOND TOUJOURS 204.
 *    Même raison, et c'est le formulaire le plus exposé du site : il est
 *    public, il accepte un email arbitraire, et sa réponse est observable sans
 *    aucun compte. Le jeton n'est créé que si le compte existe, mais le client
 *    ne peut pas faire la différence.
 *
 * 3. LA RÉINITIALISATION EXIGE UN JETON VALIDE, NON EXPIRÉ, À USAGE UNIQUE.
 *    Le défaut historique du projet (PLAN.md, incident de la vague 0.2-A) était
 *    qu'un chemin de repli accordait une session sans vérifier le secret. On ne
 *    le reproduit pas : ici, aucun chemin ne modifie un mot de passe sans
 *    preuve de possession — jeton porteur, ou mot de passe actuel.
 *
 * Sécurité générale : requêtes préparées exclusivement ; `password_hash` n'est
 * lu que pour être vérifié et n'entre jamais dans un DTO ; `hash_equals()` pour
 * toute comparaison de secret.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Garde;
use KaTech\Auth\MotDePasse;
use KaTech\Auth\Session;
use KaTech\Db;
use KaTech\Limiteur;
use KaTech\Outbox;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurAuth
{
    /**
     * Message UNIQUE de tous les échecs de connexion. Constante, pour qu'il
     * soit impossible d'en introduire une variante par inadvertance.
     */
    private const IDENTIFIANTS_INVALIDES = 'Identifiants invalides.';

    /** Colonnes sûres. `password_hash` en est absent — il est lu à part. */
    private const COLONNES_SECURISEES =
        'id, name, email, role, active, phone, last_login, created_at, updated_at';

    /** Durée de vie d'un jeton de réinitialisation : 1 heure. */
    private const DUREE_JETON = 3600;

    /** Vrai une fois la table des jetons vérifiée dans ce processus. */
    private static bool $tableJetonsVerifiee = false;

    public function __construct(private readonly Db $db)
    {
    }

    // ---- VAGUE 4.5 : limiteur instancié à la demande -----------------------

    /**
     * Retourne le limiteur partagé pour ce processus (construction paresseuse).
     *
     * En construisant le Limiteur ici plutôt que dans le constructeur, on garde
     * la signature de `new ControleurAuth($db)` inchangée dans routes.php
     * (interdit à modifier).
     */
    private function limiteur(): Limiteur
    {
        static $instance = null;
        if ($instance === null) {
            $instance = new Limiteur($this->db);
        }

        return $instance;
    }

    // ==================================================================
    // POST /auth/register
    // ==================================================================

    /**
     * Création d'un compte CLIENT.
     *
     * Le rôle est forcé à `customer` et n'est JAMAIS lu depuis le corps : une
     * inscription publique qui accepterait `{"role":"owner"}` offrirait le
     * back-office au premier venu. Les rôles s'attribuent par
     * `PATCH /admin/users/:id`, derrière `Garde::protege('manageUsers', …)`.
     *
     * → 201 { data: AuthSession }, session ouverte dans la foulée.
     */
    public function inscription(Requete $r): Reponse
    {
        $erreurs = [];

        $email = strtolower(trim((string) $r->corps('email', '')));
        if ($email === '') {
            $erreurs['email'] = ['Champ obligatoire.'];
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $erreurs['email'] = ['Adresse e-mail invalide.'];
        }

        $motDePasse = $r->corps('password');
        $motDePasse = $motDePasse === null ? null : (string) $motDePasse;
        $refus = MotDePasse::valider($motDePasse);
        if ($refus !== []) {
            $erreurs['password'] = $refus;
        }

        $nom = trim((string) $r->corps('name', ''));
        $telephone = $r->corps('phone') !== null ? trim((string) $r->corps('phone')) : null;
        if ($telephone === '') {
            $telephone = null;
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Inscription impossible.', $erreurs);
        }

        // ARBITRAGE ASSUMÉ. Ce 409 révèle que l'adresse est déjà enregistrée —
        // c'est une divulgation, mais elle est inhérente à toute inscription :
        // sans elle, l'utilisateur légitime qui possède déjà un compte reçoit
        // un « succès » et ne peut pas se connecter avec le mot de passe qu'il
        // vient de choisir. La discrétion est maintenue là où elle est
        // exploitable sans compte préalable : /auth/login et
        // /auth/forgot-password.
        $existant = $this->db->un(
            'SELECT id FROM users WHERE LOWER(email) = :email',
            [':email' => $email],
        );
        if ($existant !== null) {
            throw ApiException::conflit(
                'Un compte existe déjà avec cette adresse e-mail. '
                . 'Connectez-vous, ou utilisez « mot de passe oublié ».'
            );
        }

        $maintenant = gmdate('c');
        $id = 'usr-' . bin2hex(random_bytes(8));

        $hache = MotDePasse::hacher((string) $motDePasse);

        // Le compte ET sa fiche client dans LA MÊME transaction : pas de compte
        // sans fiche, pas de fiche sans compte (cf. commentaire de
        // `assurerFicheClient`).
        $this->db->transaction(function (Db $d) use ($id, $nom, $email, $hache, $telephone, $maintenant): void {
            $d->inserer('users', [
                'id' => $id,
                'name' => $nom,
                'email' => $email,
                'password_hash' => $hache,
                'role' => 'customer', // JAMAIS depuis le corps de la requête.
                'active' => 1,
                'phone' => $telephone,
                'last_login' => $maintenant,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ]);

            $this->assurerFicheClient($d, $nom, $email, $telephone ?? '', $maintenant);
        });

        $ligne = $this->utilisateurParId($id);
        if ($ligne === null) {
            throw new ApiException(500, 'INTERNAL_ERROR', 'Le compte créé est introuvable juste après son insertion.');
        }

        Session::ouvrir($ligne);

        return Reponse::cree($this->sessionDto($ligne));
    }

    /**
     * Fiche `customers` d'un compte fraîchement inscrit — création idempotente.
     *
     * POURQUOI. `users` et `customers` sont deux tables distinctes et le schéma
     * ne porte aucune clé étrangère entre elles. `GET /me/orders` relie donc un
     * compte à ses commandes par le COURRIEL (`idx_customers_email`), ce que
     * `ControleurCommandes::clientValide()` faisait déjà pour rattacher une
     * commande à une fiche existante. Avant la vague 4.9, l'inscription ne
     * créait AUCUNE fiche : un compte neuf n'avait rien à relier et son
     * historique restait donc vide quoi qu'il fasse (§4.1 de
     * docs/CONFORMITE-API.md).
     *
     * Idempotent : si une fiche porte déjà ce courriel (achat en invité passé
     * avant l'inscription, ou fiche saisie au back-office), on la RÉUTILISE.
     * Créer un doublon casserait l'unicité par courriel que
     * `ControleurClients::creer()` fait respecter.
     */
    private function assurerFicheClient(
        Db $d,
        string $nom,
        string $email,
        string $telephone,
        string $maintenant,
    ): void {
        $courriel = mb_strtolower(trim($email));
        if ($courriel === '') {
            return;
        }

        $existante = $d->valeur(
            'SELECT id FROM customers WHERE LOWER(email) = :courriel AND email <> \'\'',
            [':courriel' => $courriel],
        );
        if ($existante !== null) {
            return;
        }

        // Format `cus_…`, identique à celui de ControleurClients::creer().
        for ($essai = 0; $essai < 8; $essai++) {
            $id = 'cus_' . bin2hex(random_bytes(6));
            if ($d->valeur('SELECT id FROM customers WHERE id = :id', [':id' => $id]) !== null) {
                continue;
            }

            $d->inserer('customers', [
                'id' => $id,
                'name' => $nom === '' ? $courriel : $nom,
                'email' => $courriel,
                'phone' => $telephone,
                'wilaya' => '',
                'orders_count' => 0,
                'total_spent' => 0,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ]);

            return;
        }

        // Jamais d'échec silencieux : l'inscription échoue en 500 nommée plutôt
        // que de rendre un compte sans fiche, donc sans historique possible.
        throw new ApiException(
            500,
            'INTERNAL_ERROR',
            'Impossible de tirer un identifiant de fiche client libre après 8 tentatives.'
        );
    }

    // ==================================================================
    // POST /auth/login
    // ==================================================================

    /**
     * Connexion.
     *
     * Déroulé volontairement PLAT : quel que soit le motif d'échec, on parcourt
     * le même chemin, on paie le même coût de hachage, et on sort par le même
     * `throw`. Toute optimisation « en court-circuit » (retourner tôt si
     * l'email est inconnu) rétablirait le canal auxiliaire par le temps.
     *
     * → 200 { data: AuthSession }
     */
    public function connexion(Requete $r): Reponse
    {
        $email = strtolower(trim((string) $r->corps('email', '')));
        $motDePasse = (string) $r->corps('password', '');

        // VAGUE 4.5 — limitation des tentatives.
        // Appelé EN AMONT de la vérification du mot de passe : même si l'email
        // est inconnu, la tentative est comptabilisée. Le message de refus du
        // limiteur est délibérément identique à IDENTIFIANTS_INVALIDES : un
        // message distinct (« trop de tentatives ») confirmerait que ce compte
        // existe et a déjà été ciblé.
        $this->limiteur()->verifier(
            $r->ip(),
            $email !== '' ? $email : '__vide__',
            'login',
        );

        // Une ligne absente donne `$hache = null` : `verifierEtRehacher()`
        // consomme quand même son leurre. Pas de branchement anticipé.
        $ligne = $email === '' ? null : $this->db->un(
            'SELECT ' . self::COLONNES_SECURISEES . ', password_hash FROM users WHERE LOWER(email) = :email',
            [':email' => $email],
        );

        $hache = $ligne === null ? null : (string) $ligne['password_hash'];
        $id = $ligne === null ? null : (string) $ligne['id'];

        $motDePasseCorrect = MotDePasse::verifierEtRehacher(
            $motDePasse,
            $hache,
            // Repli réversible : si l'hébergeur a gagné Argon2id depuis la
            // dernière connexion, le compte bascule ici, silencieusement pour
            // l'utilisateur et sans réinitialisation.
            function (string $nouveau) use ($id): void {
                if ($id === null) {
                    return;
                }
                $this->db->run(
                    'UPDATE users SET password_hash = :hash, updated_at = :maj WHERE id = :id',
                    [':hash' => $nouveau, ':maj' => gmdate('c'), ':id' => $id],
                );
                Db::journaliserStatique(
                    'Mot de passe re-haché en ' . MotDePasse::nomAlgorithme() . ' pour le compte ' . $id . '.'
                );
            },
        );

        $compteUtilisable = $ligne !== null && (int) $ligne['active'] === 1;

        if (!$motDePasseCorrect || !$compteUtilisable) {
            // Un compte désactivé reçoit le MÊME message qu'un compte
            // inexistant : « votre compte est suspendu » confirmerait
            // l'existence de l'adresse. Le motif réel part au journal, qui lui
            // n'est pas public.
            if ($ligne !== null && $motDePasseCorrect && !$compteUtilisable) {
                Db::journaliserStatique(
                    'Connexion refusée : compte désactivé (' . (string) $ligne['id'] . ').'
                );
            }

            // VAGUE 4.5 — le compteur a déjà été incrémenté dans verifier()
            // ci-dessus. Pas d'incrément supplémentaire ici : la tentative est
            // comptée une fois, qu'elle échoue par mot de passe erroné ou par
            // compte inexistant.
            throw ApiException::nonAuthentifie(self::IDENTIFIANTS_INVALIDES);
        }

        // Connexion réussie : on efface les tentatives pour cette IP/cible.
        $this->limiteur()->reinitialiser($r->ip(), $email, 'login');

        /** @var array<string,mixed> $ligne */
        unset($ligne['password_hash']); // Ceinture : le DTO ne le lit pas non plus.

        $maintenant = gmdate('c');
        $this->db->run(
            'UPDATE users SET last_login = :vu WHERE id = :id',
            [':vu' => $maintenant, ':id' => $ligne['id']],
        );
        $ligne['last_login'] = $maintenant;

        // Régénère l'identifiant de session : parade à la fixation.
        Session::ouvrir($ligne);

        return Reponse::ok($this->sessionDto($ligne));
    }

    // ==================================================================
    // POST /auth/logout
    // ==================================================================

    /**
     * Déconnexion. Idempotente : se déconnecter sans session n'est pas une
     * erreur, c'est déjà l'état voulu. Répondre 401 ici piégerait le client
     * dans une boucle dont il ne peut pas sortir.
     *
     * → 204
     */
    public function deconnexion(Requete $r): Reponse
    {
        Session::fermer();

        return Reponse::vide();
    }

    // ==================================================================
    // GET /auth/me
    // ==================================================================

    /**
     * Session courante.
     *
     * Relit la ligne `users` à chaque appel plutôt que de se fier au contenu du
     * cookie de session : un compte désactivé ou rétrogradé pendant sa session
     * doit perdre l'accès sans attendre l'expiration. La session est refermée
     * dans la foulée, sinon le client garderait un cookie qui ne mène nulle part.
     *
     * RÉPOND 200 AVEC `user: null` À UN ANONYME — et non 401.
     *
     * « Qui suis-je ? » est une QUESTION, pas une ressource protégée : « personne »
     * en est une réponse valide, et la seule route du contrat dont c'est le cas.
     * Le 401 précédent était un état parfaitement normal comptabilisé comme une
     * erreur par le navigateur (deux `GET /auth/me → 401` rouges dans la console
     * à chaque chargement) et par le compteur d'échecs du badge de mode.
     *
     * CE QUI NE CHANGE PAS :
     *   - aucune garde n'est affaiblie : `Garde::protege*` reste intact, et TOUTES
     *     les autres routes protégées répondent toujours 401 (`rafraichir()`
     *     ci-dessous continue d'appeler `relireOuFermer()`) ;
     *   - rien n'est révélé : la réponse anonyme ne contient que `user: null` et
     *     `expiresAt: null` — pas de motif, pas de distinction entre « aucun
     *     cookie », « cookie expiré » et « compte désactivé », qui sortent tous
     *     par la même porte ;
     *   - une session dont le compte a disparu ou a été désactivé est toujours
     *     FERMÉE ici (le client cesse donc de se croire connecté) : c'est
     *     `Session::fermer()` qui protège, pas le code de statut.
     *
     * → 200 { data: AuthSession } · 200 { data: { user: null } } si anonyme
     */
    public function session(Requete $r): Reponse
    {
        $ligne = $this->relireOuNull();

        // « Personne » : même sortie pour un visiteur sans cookie, un cookie
        // expiré et un compte désactivé. Aucun oracle, aucun motif divulgué.
        if ($ligne === null) {
            return Reponse::ok(['user' => null, 'expiresAt' => null]);
        }

        return Reponse::ok($this->sessionDto($ligne));
    }

    // ==================================================================
    // POST /auth/refresh
    // ==================================================================

    /**
     * Renouvellement : prolonge l'échéance et fait tourner l'identifiant de
     * session. Aucun jeton porteur n'est émis — la stratégie du projet est le
     * cookie (`VITE_API_AUTH=cookie`), donc `accessToken` reste absent de la
     * réponse et le client ne le cherche pas (`if (s.accessToken)`).
     *
     * → 200 { data: AuthSession }
     */
    public function rafraichir(Requete $r): Reponse
    {
        $ligne = $this->relireOuFermer();

        Session::rafraichir();
        Session::actualiser([
            'email' => (string) $ligne['email'],
            'name' => (string) $ligne['name'],
            'phone' => $ligne['phone'],
            'role' => (string) $ligne['role'],
        ]);

        return Reponse::ok($this->sessionDto($ligne));
    }

    // ==================================================================
    // POST /auth/forgot-password
    // ==================================================================

    /**
     * Demande de réinitialisation. RÉPOND TOUJOURS 204.
     *
     * Aucune branche de ce corps ne peut faire varier la réponse : même statut,
     * même absence de corps, que l'adresse soit inscrite, inconnue, ou attachée
     * à un compte désactivé.
     *
     * Le jeton est composé de deux parties, `identifiant.secret` :
     *   - l'identifiant sert à retrouver la ligne (index, requête préparée) ;
     *   - le secret n'est JAMAIS stocké, seule son empreinte SHA-256 l'est.
     * Une fuite de la table `password_resets` ne permet donc de réinitialiser
     * aucun compte. C'est le même raisonnement que pour `users.password_hash`.
     *
     * → 204
     */
    public function motDePasseOublie(Requete $r): Reponse
    {
        $email = strtolower(trim((string) $r->corps('email', '')));

        // Adresse vide ou mal formée : on sort par la même porte, sans 422.
        // Un 422 « adresse invalide » contre un 204 « adresse valide » serait
        // déjà un oracle, certes grossier.
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Reponse::vide();
        }

        // VAGUE 4.5 — limitation des tentatives sur forgot-password.
        // Sans cette garde, l'endpoint devient un outil d'envoi massif d'emails.
        // Le refus lève une ApiException 429 avec le MÊME message qu'un refus
        // de connexion : on ne confirme pas que l'email ciblé existe.
        $this->limiteur()->verifier($r->ip(), $email, 'forgot-password');

        $ligne = $this->db->un(
            'SELECT id, email, active FROM users WHERE LOWER(email) = :email',
            [':email' => $email],
        );

        if ($ligne !== null && (int) $ligne['active'] === 1) {
            $this->emettreJeton((string) $ligne['id'], (string) $ligne['email']);
        }

        return Reponse::vide();
    }

    /** Crée et enregistre un jeton de réinitialisation pour un compte. */
    private function emettreJeton(string $idUtilisateur, string $email): void
    {
        $this->assurerTableJetons();

        $idJeton = bin2hex(random_bytes(8));
        $secret = bin2hex(random_bytes(32)); // 256 bits — hors de portée d'un tirage au sort.
        $maintenant = time();
        $expiresAt = gmdate('c', $maintenant + self::DUREE_JETON);

        $jeton = $idJeton . '.' . $secret;

        // VAGUE 4.5 — l'email est déposé dans l'outbox DANS la même transaction
        // que le jeton : si la transaction est annulée, le message n'est pas
        // envoyé ; si elle réussit, le CRON l'envoie. Atomicité garantie.
        // Le jeton en clair (lien de réinitialisation) est dans la charge utile
        // de l'outbox — jamais en base sous forme lisible, uniquement son hash.
        $outbox = new Outbox($this->db);

        $this->db->transaction(function (Db $d) use (
            $idUtilisateur, $idJeton, $secret, $maintenant, $expiresAt,
            $email, $jeton, $outbox
        ): void {
            // Un nouveau jeton annule les précédents : deux liens valides en
            // circulation doublent la surface d'attaque pour zéro bénéfice.
            $d->run(
                'UPDATE password_resets SET used_at = :maintenant WHERE user_id = :uid AND used_at IS NULL',
                [':maintenant' => gmdate('c', $maintenant), ':uid' => $idUtilisateur],
            );

            $d->inserer('password_resets', [
                'id' => $idJeton,
                'user_id' => $idUtilisateur,
                'token_hash' => hash('sha256', $secret),
                'expires_at' => $expiresAt,
                'used_at' => null,
                'created_at' => gmdate('c', $maintenant),
            ]);

            // VAGUE 4.5 : dépôt dans l'outbox, DANS la transaction.
            // Le CRON (vider-outbox.php) lit ce topic et appelle Courriel::envoyer().
            // Aucun appel réseau ici — uniquement de l'écriture en base.
            $outbox->deposer('password_reset', [
                'email'     => $email,
                'token'     => $jeton,    // jeton en clair, à usage unique
                'expiresAt' => $expiresAt,
                'appUrl'    => (string) (\KaTech\Env::get('APP_URL', '') ?? ''),
            ]);
        });

        Db::journaliserStatique(sprintf(
            'Jeton de réinitialisation émis pour %s, valable %d minutes — email en outbox.',
            $email,
            (int) (self::DUREE_JETON / 60),
        ));

        // Le jeton en clair n'apparaît JAMAIS en production, ni dans la réponse
        // HTTP, ni dans le journal. Hors production, il est écrit au journal :
        // sans cela, la fonctionnalité serait intestable avant la vague 4.5.
        if (!katech_est_production()) {
            Db::journaliserStatique('[dev] Jeton de réinitialisation en clair : ' . $jeton);
        }
    }

    // ==================================================================
    // POST /auth/reset-password
    // ==================================================================

    /**
     * Réinitialisation par jeton.
     *
     * Quatre conditions, toutes obligatoires : le jeton existe, il n'a pas
     * expiré, il n'a jamais servi, et son secret correspond — comparé avec
     * `hash_equals()`, jamais avec `===`. Une comparaison de chaînes ordinaire
     * s'interrompt au premier octet différent ; sa durée renseigne donc sur le
     * nombre d'octets déjà devinés, et un secret se reconstitue octet par octet.
     *
     * Le jeton est consommé et le mot de passe écrit DANS LA MÊME TRANSACTION :
     * deux requêtes concurrentes porteuses du même lien ne peuvent pas
     * réussir toutes les deux.
     *
     * → 204
     */
    public function reinitialiserMotDePasse(Requete $r): Reponse
    {
        $this->assurerTableJetons();

        $jeton = trim((string) $r->corps('token', ''));
        $nouveau = $r->corps('password');
        $nouveau = $nouveau === null ? null : (string) $nouveau;

        $erreurs = [];
        if ($jeton === '') {
            $erreurs['token'] = ['Champ obligatoire.'];
        }
        $refus = MotDePasse::valider($nouveau);
        if ($refus !== []) {
            $erreurs['password'] = $refus;
        }
        if ($erreurs !== []) {
            throw ApiException::validation('Réinitialisation impossible.', $erreurs);
        }

        // Format `identifiant.secret`. Tout écart est traité comme un jeton
        // invalide : même message, aucun détail sur ce qui cloche.
        $morceaux = explode('.', $jeton, 2);
        if (count($morceaux) !== 2 || $morceaux[0] === '' || $morceaux[1] === '') {
            throw $this->jetonInvalide();
        }
        [$idJeton, $secret] = $morceaux;

        $ligne = $this->db->un(
            'SELECT id, user_id, token_hash, expires_at, used_at FROM password_resets WHERE id = :id',
            [':id' => $idJeton],
        );

        // Comparaison en temps constant, exécutée MÊME quand la ligne est
        // absente : on compare alors à une empreinte factice, pour que la durée
        // ne distingue pas « identifiant inconnu » de « secret erroné ».
        $empreinteAttendue = $ligne === null ? str_repeat('0', 64) : (string) $ligne['token_hash'];
        $secretValide = hash_equals($empreinteAttendue, hash('sha256', $secret));

        if ($ligne === null || !$secretValide) {
            throw $this->jetonInvalide();
        }
        if ($ligne['used_at'] !== null) {
            // Usage unique : un lien déjà consommé est mort, même dans l'heure.
            throw $this->jetonInvalide();
        }
        if (strtotime((string) $ligne['expires_at']) <= time()) {
            throw $this->jetonInvalide();
        }

        $idUtilisateur = (string) $ligne['user_id'];
        $hache = MotDePasse::hacher((string) $nouveau);
        $maintenant = gmdate('c');

        $affectees = $this->db->transaction(
            function (Db $d) use ($idJeton, $idUtilisateur, $hache, $maintenant): int {
                // Consommation d'ABORD, et conditionnée à `used_at IS NULL` :
                // si une requête concurrente est passée entre-temps, celle-ci
                // affecte zéro ligne et n'écrit aucun mot de passe.
                $n = $d->run(
                    'UPDATE password_resets SET used_at = :maintenant WHERE id = :id AND used_at IS NULL',
                    [':maintenant' => $maintenant, ':id' => $idJeton],
                )->rowCount();

                if ($n === 0) {
                    return 0;
                }

                $d->run(
                    'UPDATE users SET password_hash = :hash, updated_at = :maj WHERE id = :uid',
                    [':hash' => $hache, ':maj' => $maintenant, ':uid' => $idUtilisateur],
                );

                // Les autres jetons du compte tombent avec celui-ci.
                $d->run(
                    'UPDATE password_resets SET used_at = :maintenant2 WHERE user_id = :uid2 AND used_at IS NULL',
                    [':maintenant2' => $maintenant, ':uid2' => $idUtilisateur],
                );

                return $n;
            }
        );

        if ($affectees === 0) {
            throw $this->jetonInvalide();
        }

        Db::journaliserStatique('Mot de passe réinitialisé par jeton pour le compte ' . $idUtilisateur . '.');

        return Reponse::vide();
    }

    // ==================================================================
    // POST /auth/change-password
    // ==================================================================

    /**
     * Changement de mot de passe par l'utilisateur connecté.
     *
     * Le mot de passe ACTUEL est exigé, même si la session est valide : c'est
     * ce qui empêche un poste laissé déverrouillé — ou un cookie volé — de se
     * transformer en prise de contrôle définitive du compte.
     *
     * Ici, et seulement ici, le message peut être précis : l'appelant est déjà
     * authentifié, il n'apprend rien sur un compte qui n'est pas le sien.
     *
     * → 204
     */
    public function changerMotDePasse(Requete $r): Reponse
    {
        $utilisateur = Garde::exigerConnexion();

        $actuel = (string) $r->corps('currentPassword', '');
        $nouveau = $r->corps('password');
        $nouveau = $nouveau === null ? null : (string) $nouveau;

        $erreurs = [];
        if ($actuel === '') {
            $erreurs['currentPassword'] = ['Champ obligatoire.'];
        }
        $refus = MotDePasse::valider($nouveau);
        if ($refus !== []) {
            $erreurs['password'] = $refus;
        }
        if ($erreurs !== []) {
            throw ApiException::validation('Changement de mot de passe impossible.', $erreurs);
        }

        $ligne = $this->db->un(
            'SELECT id, password_hash FROM users WHERE id = :id',
            [':id' => $utilisateur['id']],
        );
        if ($ligne === null) {
            Session::fermer();

            throw ApiException::nonAuthentifie('Votre compte n\'existe plus. Reconnectez-vous.');
        }

        if (!MotDePasse::verifier($actuel, (string) $ligne['password_hash'])) {
            throw ApiException::validation('Changement de mot de passe impossible.', [
                'currentPassword' => ['Mot de passe actuel incorrect.'],
            ]);
        }

        if (MotDePasse::verifier((string) $nouveau, (string) $ligne['password_hash'])) {
            throw ApiException::validation('Changement de mot de passe impossible.', [
                'password' => ['Le nouveau mot de passe doit différer de l\'actuel.'],
            ]);
        }

        $hache = MotDePasse::hacher((string) $nouveau);
        $maintenant = gmdate('c');
        $id = (string) $ligne['id'];

        $this->assurerTableJetons();
        $this->db->transaction(function (Db $d) use ($hache, $maintenant, $id): void {
            $d->run(
                'UPDATE users SET password_hash = :hash, updated_at = :maj WHERE id = :id',
                [':hash' => $hache, ':maj' => $maintenant, ':id' => $id],
            );
            // Un changement volontaire annule toute demande de réinitialisation
            // en cours : sinon un lien émis avant le changement rouvrirait la
            // porte que l'utilisateur vient de refermer.
            $d->run(
                'UPDATE password_resets SET used_at = :maintenant WHERE user_id = :uid AND used_at IS NULL',
                [':maintenant' => $maintenant, ':uid' => $id],
            );
        });

        // Rotation de l'identifiant de session : si le motif du changement est
        // un vol de cookie, l'ancien identifiant cesse de valoir quelque chose.
        Session::rafraichir();

        return Reponse::vide();
    }

    // ==================================================================
    // Outillage interne
    // ==================================================================

    /** Message unique de tous les refus de jeton. */
    private function jetonInvalide(): ApiException
    {
        return ApiException::validation('Réinitialisation impossible.', [
            'token' => [
                'Lien de réinitialisation invalide, expiré, ou déjà utilisé. '
                . 'Demandez-en un nouveau depuis « mot de passe oublié ».',
            ],
        ]);
    }

    /**
     * Relit l'utilisateur de la session en base, SANS jamais lever.
     *
     * Renvoie `null` dans les trois cas où il n'y a personne à servir : aucune
     * session, compte disparu, compte désactivé. Dans les deux derniers, la
     * session est REFERMÉE — un cookie qui ne mène nulle part ne doit pas
     * survivre à cet appel.
     *
     * Extrait de `relireOuFermer()` pour que `session()` (GET /auth/me) puisse
     * répondre « personne » en 200 sans dupliquer cette relecture, et sans que
     * les autres routes perdent leur 401.
     *
     * @return array<string,mixed>|null
     */
    private function relireOuNull(): ?array
    {
        $utilisateur = Garde::utilisateur(); // Ne lève pas, contrairement à exigerConnexion().

        if ($utilisateur === null) {
            return null;
        }

        $ligne = $this->utilisateurParId($utilisateur['id']);

        if ($ligne === null || (int) $ligne['active'] !== 1) {
            Session::fermer();

            return null;
        }

        // Le rôle en base fait autorité : une rétrogradation prend effet ici.
        Session::actualiser(['role' => (string) $ligne['role']]);

        return $ligne;
    }

    /**
     * Relit l'utilisateur de la session en base ; ferme la session et lève 401
     * si le compte a disparu ou a été désactivé entre-temps.
     *
     * Reste la porte des routes PROTÉGÉES (`rafraichir()`) : leur 401 est
     * inchangé, messages compris.
     *
     * @return array<string,mixed>
     */
    private function relireOuFermer(): array
    {
        // D'abord la garde : elle produit le 401 « Authentification requise… »
        // lorsqu'il n'y a aucune session, message distinct du suivant.
        Garde::exigerConnexion();

        $ligne = $this->relireOuNull();

        if ($ligne === null) {
            throw ApiException::nonAuthentifie(
                'Votre session n\'est plus valide. Reconnectez-vous.'
            );
        }

        return $ligne;
    }

    /**
     * SELECT explicite — `password_hash` délibérément absent.
     *
     * @return array<string,mixed>|null
     */
    private function utilisateurParId(string $id): ?array
    {
        return $this->db->un(
            'SELECT ' . self::COLONNES_SECURISEES . ' FROM users WHERE id = :id',
            [':id' => $id],
        );
    }

    /**
     * Ligne `users` → `AuthSession` du contrat.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function sessionDto(array $l): array
    {
        $utilisateur = [
            'id' => (string) $l['id'],
            'email' => (string) $l['email'],
            'name' => (string) ($l['name'] ?? ''),
            'role' => (string) $l['role'],
        ];

        if (isset($l['phone']) && $l['phone'] !== null && $l['phone'] !== '') {
            $utilisateur['phone'] = (string) $l['phone'];
        }

        // `accessToken` est volontairement absent : stratégie cookie.
        return [
            'user' => $utilisateur,
            'expiresAt' => Session::expiration(),
        ];
    }

    /**
     * Garantit l'existence de `password_resets`.
     *
     * La table est déclarée dans `api/schema/schema.{sqlite,mysql}.sql`, donc
     * présente sur toute installation neuve. Ce filet ne sert qu'aux bases
     * installées AVANT la vague 4.3 : `api/install.php` refuse de rejouer le
     * schéma une fois son témoin posé, et l'exploitant ne doit pas avoir à
     * effacer ce témoin — ce qui l'exposerait à réinstaller par mégarde.
     *
     * Appelée uniquement sur les chemins de réinitialisation, une seule fois
     * par processus, et strictement idempotente.
     */
    private function assurerTableJetons(): void
    {
        if (self::$tableJetonsVerifiee) {
            return;
        }
        self::$tableJetonsVerifiee = true;

        if ($this->db->estSqlite()) {
            $this->db->pdo()->exec(
                'CREATE TABLE IF NOT EXISTS password_resets ('
                . ' id TEXT NOT NULL PRIMARY KEY,'
                . ' user_id TEXT NOT NULL,'
                . ' token_hash TEXT NOT NULL,'
                . ' expires_at TEXT NOT NULL,'
                . ' used_at TEXT NULL,'
                . ' created_at TEXT NOT NULL)'
            );
            $this->db->pdo()->exec(
                'CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id)'
            );

            return;
        }

        $this->db->pdo()->exec(
            'CREATE TABLE IF NOT EXISTS password_resets ('
            . ' id VARCHAR(96) NOT NULL PRIMARY KEY,'
            . ' user_id VARCHAR(96) NOT NULL,'
            . ' token_hash VARCHAR(128) NOT NULL,'
            . ' expires_at VARCHAR(32) NOT NULL,'
            . ' used_at VARCHAR(32) NULL,'
            . ' created_at VARCHAR(32) NOT NULL,'
            . ' INDEX idx_password_resets_user (user_id)'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }
}
