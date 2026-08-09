<?php

/**
 * Écran 1 — ce que cet hébergement sait faire, dit à quelqu'un qui n'est pas
 * informaticien.
 *
 * Le projet possédait déjà `scripts/sonde-hebergeur.php`, à téléverser puis à
 * supprimer à la main. C'est un bon outil, mais il suppose qu'on y pense AVANT
 * l'installation, et il parle en technicien. Ici, le même examen est fait au
 * moment où il sert — juste avant de choisir une base de données — et chaque
 * constat est traduit en conséquence concrète : « SQLite utilisable », « il
 * faudra demander MySQL à votre hébergeur ».
 *
 * RÈGLE DE RÉDACTION : un constat sans conséquence n'a rien à faire ici. On
 * n'affiche pas « open_basedir : /home/u:/tmp » — on affiche ce que
 * l'exploitant doit décider ou réclamer.
 *
 * TROIS ÉTATS, PAS DEUX : `ok`, `alerte`, et `inconnu`. Un contrôle qu'on n'a
 * pas pu faire ne se peint jamais en vert (AGENTS.md §7 : rendre les échecs
 * visibles).
 */

declare(strict_types=1);

namespace KaTech\Installation;

use KaTech\Db;
use PDO;

final class Diagnostic
{
    public const OK = 'ok';
    public const ALERTE = 'alerte';
    public const INCONNU = 'inconnu';

    /** @var list<array{titre:string,valeur:string,etat:string,conseil:?string}> */
    private array $points = [];

    /** @var array<string,bool> pilote → utilisable ici */
    private array $pilotes = [];

    /**
     * @param array{chemin:string,horsRacineWeb:bool,possible:bool,raison:string} $destination
     *        Où le dossier de données atterrira RÉELLEMENT — repli compris.
     */
    private function __construct(
        public readonly Emplacement $emplacement,
        public readonly array $destination,
        public readonly bool $apiInscriptible,
        public readonly bool $envExistant,
    ) {
    }

    /**
     * @param array<string,mixed> $serveur copie de `$_SERVER`
     */
    public static function etablir(string $racineApi, array $serveur): self
    {
        $emplacement = Emplacement::deduire($racineApi, isset($serveur['DOCUMENT_ROOT'])
            ? (string) $serveur['DOCUMENT_ROOT']
            : null);

        $d = new self(
            $emplacement,
            $emplacement->evaluer($racineApi),
            is_writable($racineApi),
            is_file($racineApi . '/.env'),
        );

        $d->examinerPhp();
        $d->examinerExtensions();
        $d->examinerEcriture($racineApi);
        $d->examinerHtaccess($racineApi, $serveur);
        $d->examinerPilotes();

        return $d;
    }

    /** @return list<array{titre:string,valeur:string,etat:string,conseil:?string}> */
    public function points(): array
    {
        return $this->points;
    }

    /** @return list<string> pilotes réellement proposables dans le formulaire */
    public function pilotesDisponibles(): array
    {
        return array_values(array_keys(array_filter($this->pilotes)));
    }

    /** Vrai si rien n'empêche d'installer. */
    public function installable(): bool
    {
        return $this->pilotesDisponibles() !== [] && $this->bloquants() === [];
    }

    /** @return list<string> */
    public function bloquants(): array
    {
        $bloquants = [];
        foreach ($this->points as $point) {
            if ($point['etat'] === self::ALERTE && $point['conseil'] !== null && str_starts_with($point['conseil'], 'BLOQUANT')) {
                $bloquants[] = $point['titre'] . ' — ' . $point['conseil'];
            }
        }

        return $bloquants;
    }

    /** Verdict d'une phrase, lisible par un non-technicien. */
    public function verdict(): string
    {
        if (!$this->installable()) {
            return 'Cet hébergement ne réunit pas encore les conditions nécessaires. '
                . 'Les points en rouge ci-dessus indiquent quoi demander à votre hébergeur.';
        }

        $pilotes = $this->pilotesDisponibles();
        $liste = implode(', ', array_map(self::nomPilote(...), $pilotes));

        return 'Tout est en ordre. ' . (count($pilotes) > 1
            ? 'Vous pouvez installer la boutique sur : ' . $liste . '.'
            : 'Vous pouvez installer la boutique sur ' . $liste . '.');
    }

    public static function nomPilote(string $pilote): string
    {
        return match ($pilote) {
            Db::PILOTE_SQLITE => 'SQLite (un simple fichier, rien à créer)',
            Db::PILOTE_MYSQL => 'MySQL / MariaDB (le cas habituel chez un hébergeur)',
            Db::PILOTE_PGSQL => 'PostgreSQL (Supabase, Neon, Railway…)',
            default => $pilote,
        };
    }

    // =================================================================
    // Examens
    // =================================================================

    private function examinerPhp(): void
    {
        $version = PHP_VERSION;
        $assez = version_compare($version, '8.2.0', '>=');
        $this->ajouter(
            'Version de PHP',
            $version,
            $assez ? self::OK : self::ALERTE,
            $assez ? null : 'BLOQUANT : il faut PHP 8.2 ou plus récent. Dans le panneau de votre '
                . 'hébergeur, section « Configuration PHP », choisissez une version 8.2+.',
        );
    }

    private function examinerExtensions(): void
    {
        // Une extension critique manquante empêche l'API de fonctionner du tout.
        foreach (['json' => 'lecture et écriture des données',
                  'mbstring' => 'textes en arabe, accents, noms de clients',
                  'openssl' => 'connexions sécurisées (e-mails, bases distantes)'] as $ext => $role) {
            $present = extension_loaded($ext);
            $this->ajouter(
                'Module PHP « ' . $ext . ' » (' . $role . ')',
                $present ? 'présent' : 'ABSENT',
                $present ? self::OK : self::ALERTE,
                $present ? null : 'BLOQUANT : demandez l\'activation du module « ' . $ext
                    . ' » dans le panneau de votre hébergeur (Configuration PHP → Extensions).',
            );
        }

        $argon = function_exists('password_algos')
            && defined('PASSWORD_ARGON2ID')
            && in_array((string) PASSWORD_ARGON2ID, password_algos(), true);
        $this->ajouter(
            'Protection des mots de passe',
            $argon ? 'Argon2id (le meilleur disponible)' : 'bcrypt (repli automatique)',
            self::OK,
            $argon ? null : 'Argon2id n\'est pas compilé dans ce PHP. Les mots de passe restent '
                . 'correctement protégés par bcrypt, et seront re-protégés en Argon2id tout seuls '
                . 'le jour où l\'hébergeur l\'activera. Aucune action nécessaire.',
        );
    }

    private function examinerEcriture(string $racineApi): void
    {
        $this->ajouter(
            'Écriture dans le dossier api/ (nécessaire pour enregistrer votre configuration)',
            $this->apiInscriptible ? 'autorisée' : 'REFUSÉE',
            $this->apiInscriptible ? self::OK : self::ALERTE,
            $this->apiInscriptible ? null : 'BLOQUANT : l\'assistant ne pourra pas écrire le '
                . 'fichier api/.env. Dans le gestionnaire de fichiers de votre hébergeur, '
                . 'donnez les droits 0755 au dossier api/.',
        );

        $this->ajouter(
            'Dossier de données hors de la partie publique du site',
            $this->destination['chemin']
                . ($this->destination['horsRacineWeb']
                    ? ' — hors de la partie publique, comme il se doit'
                    : ($this->destination['possible']
                        ? ' — DANS la partie publique du site'
                        : ' — aucun emplacement inscriptible')),
            $this->destination['horsRacineWeb'] ? self::OK : self::ALERTE,
            $this->destination['horsRacineWeb']
                ? $this->destination['raison']
                : ($this->destination['possible']
                    ? $this->destination['raison'] . ' L\'installation se poursuivra en plaçant les '
                        . 'données DANS le site, avec toutes les protections que le projet sait poser '
                        . '— ce n\'est PAS équivalent. L\'écran final vous dira exactement ce que cela '
                        . 'signifie et comment y remédier plus tard, sans réinstaller.'
                    : 'BLOQUANT : aucun dossier inscriptible n\'a été trouvé pour ranger les données. '
                        . 'Dans le gestionnaire de fichiers de votre hébergeur, donnez les droits '
                        . 'd\'écriture au dossier qui contient votre site.'),
        );

        if ($this->envExistant) {
            $this->ajouter(
                'Fichier api/.env',
                'déjà présent',
                self::INCONNU,
                'Une configuration existe déjà. L\'assistant en fera une copie datée avant de la '
                . 'remplacer — rien ne sera perdu, mais cochez la case de confirmation à l\'étape '
                . 'suivante.',
            );
        }
    }

    /**
     * Les fichiers `.htaccess` sont invisibles dans la plupart des
     * gestionnaires de fichiers et sont régulièrement perdus au téléversement
     * ou à la décompression d'un ZIP. Leur absence ne provoque aucune erreur :
     * le site fonctionne, et le code de l'API devient simplement téléchargeable.
     * C'est l'échec silencieux type, donc celui qu'on vérifie.
     *
     * Deux niveaux : le fichier EST-IL LÀ, et est-il PRIS EN COMPTE ? Le second
     * ne se démontre pas en lisant le disque : on demande au serveur, par HTTP,
     * un fichier que le `.htaccess` doit refuser.
     */
    private function examinerHtaccess(string $racineApi, array $serveur): void
    {
        $apiHtaccess = is_file($racineApi . '/.htaccess');
        $this->ajouter(
            'Fichier de protection api/.htaccess',
            $apiHtaccess ? 'présent' : 'ABSENT',
            $apiHtaccess ? self::OK : self::ALERTE,
            $apiHtaccess ? null : 'BLOQUANT : ce fichier commence par un point ; beaucoup d\'outils '
                . 'de téléversement et de décompression les ignorent. Sans lui, le code de l\'API et '
                . 'vos identifiants sont téléchargeables. Téléversez-le à nouveau depuis le paquet '
                . 'd\'installation, dans public_html/api/.',
        );

        $racineWeb = $this->emplacement->racineWeb;
        if ($racineWeb !== null) {
            $siteHtaccess = is_file(\dirname($racineApi) . '/.htaccess');
            $this->ajouter(
                'Fichier de protection .htaccess à la racine du site',
                $siteHtaccess ? 'présent' : 'ABSENT',
                $siteHtaccess ? self::OK : self::ALERTE,
                $siteHtaccess ? null : 'Sans ce fichier, les pages du site rechargées directement '
                    . '(autre que l\'accueil) renverront une erreur 404. Téléversez-le à nouveau : '
                    . 'c\'est le .htaccess livré à la racine du paquet.',
            );
        }

        // Le fichier peut être là et n'être lu par personne (AllowOverride None,
        // ou serveur nginx). On le demande donc au serveur lui-même.
        //
        // LA CIBLE DE LA SONDE N'EST PAS UN FICHIER PHP, ET C'EST LE POINT CLÉ.
        // Demander `api/src/Db.php` ne prouverait RIEN : un serveur où PHP est
        // actif l'EXÉCUTE au lieu d'en montrer la source, `.htaccess` ou pas —
        // la sonde répondrait « protégé » dans tous les cas, y compris quand
        // rien ne protège. On vise donc `api/.env.example` : un fichier réel,
        // livré avec le projet, sans PHP dedans, que deux règles distinctes du
        // `.htaccess` doivent refuser. S'il revient avec son contenu, les
        // `.htaccess` ne sont pas appliqués, point final.
        $etat = self::INCONNU;
        $valeur = 'non vérifié';
        $conseil = 'Le serveur n\'a pas pu s\'interroger lui-même (requêtes réseau sortantes '
            . 'bloquées par l\'hébergeur). Vérifiez-le à la main : ouvrez '
            . 'https://votre-domaine/api/.env.example — vous devez obtenir une erreur 403, '
            . 'jamais du texte.';

        $base = SondeHttp::racinePublique($serveur);
        $prefixe = self::prefixeApi($serveur);
        $exemple = $racineApi . '/.env.example';

        if ($base !== null && $prefixe !== null && is_file($exemple)) {
            $reponse = SondeHttp::requete($base . $prefixe . '/.env.example');
            if ($reponse !== null) {
                // Marqueur présent dans le fichier livré : un 200 servi par une
                // page d'erreur maison ou un portail ne peut pas se faire passer
                // pour une fuite.
                $livre = $reponse['statut'] < 400 && str_contains($reponse['corps'], 'DB_DRIVER');
                $etat = $livre ? self::ALERTE : self::OK;
                $valeur = $livre
                    ? 'NON — un fichier qui devrait être refusé a été téléchargé (HTTP '
                        . $reponse['statut'] . ')'
                    : 'oui — le serveur refuse bien les fichiers sensibles (HTTP '
                        . $reponse['statut'] . ' sur api/.env.example)';
                $conseil = $livre
                    ? 'Votre serveur ignore les fichiers .htaccess (configuration « AllowOverride '
                        . 'None », ou serveur nginx). Vos identifiants de base de données seraient '
                        . 'téléchargeables une fois écrits. Signalez-le à votre hébergeur AVANT de '
                        . 'continuer. Le placement du dossier de données hors du site public reste '
                        . 'la protection qui survit à ce défaut : l\'assistant s\'en charge et le '
                        . 'vérifiera.'
                    : null;
            }
        }

        $this->ajouter('Les fichiers .htaccess sont-ils réellement appliqués ?', $valeur, $etat, $conseil);
    }

    private function examinerPilotes(): void
    {
        $pdo = PDO::getAvailableDrivers();

        // SQLite : le pilote ne suffit pas, il faut un dossier où poser le
        // fichier. On accepte le repli DANS le site — refuser SQLite là où le
        // repli existe reviendrait à interdire d'installer chez un hébergeur qui
        // verrouille le dossier parent, alors que l'assistant sait faire, le dit
        // en rouge et explique comment corriger ensuite.
        $sqlite = in_array('sqlite', $pdo, true) && $this->destination['possible'];
        $this->pilotes[Db::PILOTE_SQLITE] = $sqlite;
        $this->ajouter(
            'Base SQLite (un fichier, rien à créer chez l\'hébergeur)',
            $sqlite ? 'utilisable' : (in_array('sqlite', $pdo, true)
                ? 'indisponible — aucun dossier inscriptible pour y poser le fichier'
                : 'indisponible — module pdo_sqlite absent'),
            $sqlite ? self::OK : self::INCONNU,
            $sqlite ? null : 'Ce n\'est pas grave si MySQL est disponible ci-dessous.',
        );

        $mysql = in_array('mysql', $pdo, true);
        $this->pilotes[Db::PILOTE_MYSQL] = $mysql;
        $this->ajouter(
            'Base MySQL / MariaDB',
            $mysql ? 'utilisable' : 'indisponible — module pdo_mysql absent',
            $mysql ? self::OK : self::INCONNU,
            $mysql
                ? 'Créez la base dans le panneau de votre hébergeur (« Bases de données MySQL ») '
                    . 'avant de passer à l\'étape suivante : vous aurez besoin de son nom, de son '
                    . 'utilisateur et de son mot de passe.'
                : 'Demandez l\'activation du module « pdo_mysql » si vous voulez utiliser MySQL.',
        );

        $pgsql = in_array('pgsql', $pdo, true);
        $this->pilotes[Db::PILOTE_PGSQL] = $pgsql;
        $this->ajouter(
            'Base PostgreSQL (Supabase, Neon, Railway…)',
            $pgsql ? 'utilisable' : 'indisponible — module pdo_pgsql absent',
            $pgsql ? self::OK : self::INCONNU,
            $pgsql
                ? 'La base doit déjà exister chez le fournisseur : l\'assistant ne la crée pas.'
                : 'Ce module n\'est pas activé par défaut chez la plupart des hébergeurs. '
                    . 'Inutile si vous utilisez SQLite ou MySQL.',
        );

        if ($this->pilotesDisponibles() === []) {
            $this->ajouter(
                'Aucune base de données utilisable',
                'aucun moteur disponible',
                self::ALERTE,
                'BLOQUANT : demandez à votre hébergeur d\'activer au moins « pdo_mysql ».',
            );
        }
    }

    /**
     * Chemin sous lequel `api/` est publié (« /api », « /ma-boutique/api »),
     * déduit de `SCRIPT_NAME` — la seule source qui reste juste en sous-dossier.
     */
    private static function prefixeApi(array $serveur): ?string
    {
        $script = (string) ($serveur['SCRIPT_NAME'] ?? '');
        if ($script === '') {
            return null;
        }
        $prefixe = rtrim(str_replace('\\', '/', \dirname($script)), '/');

        return $prefixe === '' ? '' : $prefixe;
    }

    private function ajouter(string $titre, string $valeur, string $etat, ?string $conseil): void
    {
        $this->points[] = ['titre' => $titre, 'valeur' => $valeur, 'etat' => $etat, 'conseil' => $conseil];
    }
}
