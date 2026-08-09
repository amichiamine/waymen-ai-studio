<?php

/**
 * Coffre — chiffrement au repos du jeton Notion (skill S13).
 *
 * LE PROBLÈME EXACT, ET IL N'EST PAS THÉORIQUE.
 * Le jeton est saisi par le commerçant dans l'interface : il doit donc vivre
 * côté serveur, dans la table `settings`. Or `GET /maintenance/backup` produit
 * une archive de TOUTE la base, TÉLÉCHARGEABLE depuis l'administration. Un
 * jeton en clair dans `settings` se retrouve donc dans un fichier qui circule
 * par courriel, dort dans un dossier « Téléchargements » et finit sur une clé
 * USB. Et un jeton d'intégration interne Notion N'EXPIRE PAS : il reste
 * valable jusqu'à révocation manuelle. La fuite serait donc permanente.
 *
 * LA PARADE : AES-256-GCM, clé HORS BASE.
 * La clé vit dans `api/.env` (`NOTION_CRYPTO_KEY`), c'est-à-dire dans un
 * fichier que la sauvegarde ne contient pas et que `api/.htaccess` interdit de
 * télécharger. Sauvegarde volée + base volée = jeton toujours illisible. GCM
 * plutôt que CBC parce qu'il authentifie : un octet modifié dans `settings`
 * fait échouer le déchiffrement au lieu de rendre une valeur silencieusement
 * fausse.
 *
 * CE QUE CE COFFRE NE PROTÈGE PAS, et il faut le dire :
 * un attaquant qui obtient un accès au SYSTÈME DE FICHIERS du serveur lit
 * `api/.env` et la base : il a tout. Le coffre protège contre la fuite d'une
 * SAUVEGARDE et contre la fuite de la seule base (dump SQL, accès phpMyAdmin,
 * fichier SQLite mal placé) — c'est-à-dire contre les fuites réellement
 * observées sur un hébergement mutualisé.
 *
 * GÉNÉRATION DE LA CLÉ : à la première mise en service, `cle()` fabrique 32
 * octets aléatoires et les ajoute à `api/.env`. Aucun agent ne touche à
 * `install.php` pour autant (périmètre), et une installation existante n'a
 * rien à faire : la clé apparaît le jour où on enregistre un jeton.
 *
 * ATTENTION AUX SAUVEGARDES DE `.env` : si la clé est perdue, le jeton stocké
 * devient indéchiffrable. Ce n'est pas grave — il suffit de le ressaisir dans
 * l'écran Notion. C'est exactement pour ça que `ouvrir()` rend `null` au lieu
 * de lever une exception : perdre la clé doit dégrader vers « non configuré »,
 * jamais vers une panne (dégradation gracieuse, AGENTS.md §6).
 */

declare(strict_types=1);

namespace KaTech\Notion;

use KaTech\Db;
use KaTech\Env;

final class Coffre
{
    /** Nom de la variable d'environnement portant la clé. Documenté dans api/.env.example. */
    public const VARIABLE_CLE = 'NOTION_CRYPTO_KEY';

    /**
     * Préfixe de format. Il sert à deux choses :
     *   1. reconnaître au premier coup d'oeil qu'une valeur est chiffrée — si
     *      un jour un `grep` sur une sauvegarde montrait « ntn_ », on saurait
     *      immédiatement que quelque chose ne va pas ;
     *   2. permettre un futur « v2 » (autre algorithme) sans casser l'existant.
     */
    private const PREFIXE = 'ntnc1:';

    private const ALGO = 'aes-256-gcm';

    /** Clé mémorisée pour la durée du processus (évite de relire/regénérer). */
    private static ?string $cleMemo = null;

    /**
     * Chiffre une valeur en clair. Le résultat est du texte imprimable, sûr à
     * placer dans une colonne JSON.
     *
     * @throws ErreurNotion si le chiffrement est impossible — on préfère
     *                      REFUSER d'enregistrer plutôt que stocker en clair.
     */
    public static function fermer(string $clair): string
    {
        if ($clair === '') {
            throw new ErreurNotion(
                ErreurNotion::REFUSE,
                'La clé de connexion Notion est vide. Recopiez-la depuis Notion avant d\'enregistrer.',
            );
        }

        self::exigerOpenssl();

        $cle = self::cle();
        $iv = random_bytes(12); // 96 bits : la taille recommandée pour GCM.
        $tag = '';

        $chiffre = openssl_encrypt($clair, self::ALGO, $cle, OPENSSL_RAW_DATA, $iv, $tag);
        if ($chiffre === false) {
            throw new ErreurNotion(
                ErreurNotion::REFUSE,
                'Le serveur n\'a pas réussi à protéger la clé de connexion Notion, elle n\'a donc '
                . 'PAS été enregistrée. Prévenez votre hébergeur : l\'extension PHP « openssl » '
                . 'semble mal configurée.',
            );
        }

        return self::PREFIXE . base64_encode($iv . $tag . $chiffre);
    }

    /**
     * Déchiffre une valeur produite par `fermer()`.
     *
     * Rend `null` — jamais d'exception — quand la valeur est absente, illisible,
     * ou chiffrée avec une autre clé. L'appelant traduit ça en « Notion n'est
     * pas configuré », ce qui est la vérité utile pour le commerçant : il n'a
     * qu'à ressaisir son jeton.
     */
    public static function ouvrir(?string $ferme): ?string
    {
        if ($ferme === null || $ferme === '' || !str_starts_with($ferme, self::PREFIXE)) {
            return null;
        }
        if (!self::opensslDisponible()) {
            Db::journaliserStatique('[notion] Jeton illisible : extension openssl absente.');

            return null;
        }

        $brut = base64_decode(substr($ferme, strlen(self::PREFIXE)), true);
        if ($brut === false || strlen($brut) < 12 + 16 + 1) {
            Db::journaliserStatique('[notion] Jeton illisible : enveloppe chiffrée tronquée.');

            return null;
        }

        $iv = substr($brut, 0, 12);
        $tag = substr($brut, 12, 16);
        $chiffre = substr($brut, 28);

        $clair = openssl_decrypt($chiffre, self::ALGO, self::cleSansCreation(), OPENSSL_RAW_DATA, $iv, $tag);
        if ($clair === false || $clair === '') {
            // Étiquette GCM invalide : mauvaise clé, ou valeur altérée en base.
            Db::journaliserStatique(
                '[notion] Jeton indéchiffrable — la clé ' . self::VARIABLE_CLE . ' de api/.env a changé, '
                . 'ou la valeur stockée a été modifiée. Le miroir est traité comme non configuré ; '
                . 'ressaisissez la clé de connexion dans l\'écran Notion.'
            );

            return null;
        }

        return $clair;
    }

    /**
     * Clé de chiffrement, 32 octets bruts. Créée et persistée si absente.
     *
     * @throws ErreurNotion si la clé manque ET ne peut pas être écrite : mieux
     *                      vaut refuser l'enregistrement que chiffrer avec une
     *                      clé volatile qui rendrait le jeton illisible au
     *                      prochain redémarrage.
     */
    public static function cle(): string
    {
        if (self::$cleMemo !== null) {
            return self::$cleMemo;
        }

        $existante = self::lireCleConfiguree();
        if ($existante !== null) {
            return self::$cleMemo = $existante;
        }

        $nouvelle = random_bytes(32);
        self::persisterDansEnv(base64_encode($nouvelle));

        return self::$cleMemo = $nouvelle;
    }

    /** Variante de `cle()` qui ne crée rien : utilisée à la lecture. */
    private static function cleSansCreation(): string
    {
        if (self::$cleMemo !== null) {
            return self::$cleMemo;
        }
        $existante = self::lireCleConfiguree();

        // Clé fictive si rien n'est configuré : le déchiffrement échouera
        // proprement (étiquette GCM invalide) au lieu de lever une erreur PHP.
        return self::$cleMemo = $existante ?? str_repeat("\0", 32);
    }

    /** Lit et valide la clé configurée. Rend null si absente ou inexploitable. */
    private static function lireCleConfiguree(): ?string
    {
        $brut = (string) Env::get(self::VARIABLE_CLE, '');
        if ($brut === '') {
            return null;
        }

        $decode = base64_decode($brut, true);
        if ($decode === false || strlen($decode) !== 32) {
            // On ne « répare » pas en silence : une clé mal recopiée qui
            // deviendrait une autre clé rendrait le jeton illisible sans que
            // personne comprenne pourquoi.
            throw new ErreurNotion(
                ErreurNotion::REFUSE,
                'La clé de protection ' . self::VARIABLE_CLE . ' inscrite dans api/.env est abîmée '
                . '(elle doit faire exactement 44 caractères). Effacez cette ligne du fichier '
                . 'api/.env : une nouvelle clé sera créée automatiquement, et il suffira de '
                . 'ressaisir la clé de connexion Notion.',
            );
        }

        return $decode;
    }

    /**
     * Ajoute la clé à `api/.env`.
     *
     * On ne CRÉE pas le fichier s'il n'existe pas : depuis le commit 74be474,
     * c'est l'assistant `install.php` (trois écrans dans le navigateur) qui
     * écrit `api/.env` à partir du formulaire de configuration. Si le fichier
     * est absent ici, c'est que l'assistant n'a pas encore été exécuté — on
     * dit alors quoi faire.
     */
    private static function persisterDansEnv(string $cleBase64): void
    {
        $chemin = dirname(__DIR__, 2) . '/.env';

        if (!is_file($chemin)) {
            throw new ErreurNotion(
                ErreurNotion::REFUSE,
                'La liaison avec Notion a besoin d\'écrire une clé de protection dans le fichier '
                . 'api/.env, qui est introuvable sur le serveur. Copiez api/.env.example en '
                . 'api/.env (voir le guide de déploiement), puis réessayez. Sans ce fichier, la '
                . 'clé de connexion Notion ne peut pas être protégée — et elle ne sera donc pas '
                . 'enregistrée.',
            );
        }
        if (!is_writable($chemin)) {
            throw new ErreurNotion(
                ErreurNotion::REFUSE,
                'Le fichier api/.env n\'est pas modifiable par le serveur, or la liaison avec '
                . 'Notion doit y inscrire une clé de protection. Dans le gestionnaire de fichiers '
                . 'de votre hébergeur, donnez les droits 0640 à api/.env, puis réessayez. Rien '
                . 'n\'a été enregistré.',
            );
        }

        $ligne = "\n# Clé de protection du jeton Notion — créée automatiquement, NE PAS MODIFIER.\n"
            . "# La perdre rend le jeton stocké illisible : il suffira de le ressaisir.\n"
            . self::VARIABLE_CLE . '=' . $cleBase64 . "\n";

        // Verrou : deux requêtes simultanées qui mettent Notion en service ne
        // doivent pas écrire deux clés différentes dans le même fichier.
        $ok = @file_put_contents($chemin, $ligne, FILE_APPEND | LOCK_EX);
        if ($ok === false) {
            throw new ErreurNotion(
                ErreurNotion::REFUSE,
                'L\'écriture de la clé de protection dans api/.env a échoué. La clé de connexion '
                . 'Notion n\'a pas été enregistrée. Vérifiez l\'espace disque et les droits du '
                . 'fichier auprès de votre hébergeur.',
            );
        }
    }

    private static function exigerOpenssl(): void
    {
        if (self::opensslDisponible()) {
            return;
        }

        throw new ErreurNotion(
            ErreurNotion::REFUSE,
            'Ce serveur ne sait pas chiffrer : l\'extension PHP « openssl » est absente. La clé '
            . 'de connexion Notion n\'a PAS été enregistrée — la stocker en clair l\'exposerait '
            . 'dans les sauvegardes téléchargeables. Demandez à votre hébergeur d\'activer '
            . '« openssl », puis réessayez.',
        );
    }

    private static function opensslDisponible(): bool
    {
        return function_exists('openssl_encrypt')
            && in_array(self::ALGO, openssl_get_cipher_methods(), true);
    }

    /** Réservé aux tests : oublie la clé mémorisée. */
    public static function oublier(): void
    {
        self::$cleMemo = null;
    }
}
