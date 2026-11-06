<?php

/**
 * Où poser le dossier de données — et comment le prouver.
 *
 * LE PROBLÈME, EN UNE PHRASE : la base contient les noms, téléphones, adresses
 * et empreintes de mots de passe des clients ; déposée dans la racine web, elle
 * est téléchargeable par quiconque devine son nom. L'emplacement du dossier de
 * données n'est donc pas un détail de confort, c'est LA protection qui survit à
 * la perte de tous les `.htaccess` (voir api/.htaccess, « la quatrième
 * barrière »).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * COMMENT ON DÉDUIT LE BON DOSSIER — et pourquoi pas autrement
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La cible est `katech-data/` À CÔTÉ de `public_html/`, jamais dedans
 * (docs/DEPLOIEMENT.md §4). Chez Hostinger c'est atteignable sans SSH : le
 * gestionnaire de fichiers de hPanel ouvre le dossier PARENT de `public_html`
 * et permet d'y créer un dossier — donc PHP le peut aussi, la plupart du temps.
 *
 * L'ANCRE EST `DOCUMENT_ROOT`, PAS L'EMPLACEMENT DE CE FICHIER. C'est la seule
 * décision non évidente de ce fichier, et elle est payée par un cas réel : le
 * site est déployable dans un SOUS-DOSSIER (`public_html/ma-boutique/`), cas
 * que le projet supporte explicitement (docs/DEPLOIEMENT.md §4, règle 3).
 * Compter des crans depuis `api/` casse dans un cas ou dans l'autre :
 *
 *   déploiement            api/ se trouve à…                    dirname(api,2)   dirname(api,3)
 *   à la racine            /home/u/public_html/api              /home/u   ✅     /home      ✗ trop haut
 *   en sous-dossier        /home/u/public_html/boutique/api     /home/u/public_html ✗ DANS la racine web
 *                                                                                 /home/u   ✅
 *
 * Aucun nombre de crans n'est juste dans les deux cas. `DOCUMENT_ROOT`, lui,
 * vaut `/home/u/public_html` dans les DEUX : le parent est alors `/home/u`,
 * correct des deux côtés. Le sous-dossier n'est plus un cas particulier, il
 * disparaît du calcul.
 *
 * DEUX GARDE-FOUS complètent la déduction, parce que `DOCUMENT_ROOT` ment
 * parfois :
 *   1. Si l'hébergeur a fixé la racine web SUR le sous-dossier lui-même
 *      (`DOCUMENT_ROOT=/home/u/public_html/boutique`), le parent naïf serait
 *      `/home/u/public_html`, c'est-à-dire DANS la racine web. On remonte donc
 *      tant que le candidat porte, ou traverse, un nom de racine web connu
 *      (`public_html`, `htdocs`, `www`, `wwwroot`, `public`) — même liste que
 *      `api/tools/sauvegarder.php` et `scripts/api-dev.mjs`.
 *   2. Le résultat est REVÉRIFIÉ : s'il tombe malgré tout sous la racine web,
 *      il est rejeté, et l'on passe au repli documenté.
 *
 * En ligne de commande, `DOCUMENT_ROOT` n'existe pas : on retombe sur
 * `dirname(api, 2)`, qui est le comportement historique du projet
 * (`api/tools/sauvegarder.php` calcule son défaut ainsi) et reste juste hors
 * navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE REPLI, QUAND LE PARENT REFUSE L'ÉCRITURE
 * ─────────────────────────────────────────────────────────────────────────
 * Certains hébergeurs verrouillent le dossier parent en écriture pour PHP.
 * Refuser d'installer serait absurde ; installer en silence dans la racine web
 * serait une fuite annoncée. On replie DANS la racine web, avec les trois
 * protections que le projet sait poser (`.htaccess`, `index.html`, nom de
 * fichier non devinable), et l'écran de résultat le dit EN ROUGE, sans
 * euphémisme. `estHorsRacineWeb()` porte cette vérité jusqu'à l'affichage.
 */

declare(strict_types=1);

namespace KaTech\Installation;

final class Emplacement
{
    /** Nom du dossier de données, identique partout dans le projet. */
    public const NOM_DOSSIER = 'katech-data';

    /**
     * Marqueur cherché dans un `.htaccess` existant : s'il a disparu, le fichier
     * a été vidé ou remplacé, et on le réécrit. Sans marqueur, on ne saurait pas
     * distinguer « protection en place » de « fichier vide de 0 octet ».
     * Même valeur que `scripts/api-dev.mjs` : les deux écrivent le même fichier.
     */
    public const MARQUEUR_PROTECTION = '# katech-data:protection-v1';

    /**
     * Noms de dossier qui désignent une racine web chez les hébergeurs visés.
     * Liste alignée sur `api/tools/sauvegarder.php` et `scripts/api-dev.mjs` :
     * trois endroits, une seule définition de « c'est public ».
     */
    private const NOMS_RACINE_WEB = ['public_html', 'htdocs', 'www', 'wwwroot', 'public'];

    private function __construct(
        public readonly string $chemin,
        public readonly bool $horsRacineWeb,
        public readonly ?string $racineWeb,
        public readonly string $sousDossier,
        public readonly string $explication,
        public readonly string $nomDossier = self::NOM_DOSSIER,
    ) {
    }

    /**
     * Valide et assainit le nom d'un dossier de données personnalisé.
     * Renvoie un message d'erreur si invalide, ou null si conforme.
     */
    public static function validerNomDossier(?string $nom): ?string
    {
        if ($nom === null || trim($nom) === '') {
            return 'Le nom du dossier de données ne peut pas être vide.';
        }
        $nom = trim($nom);
        if (str_contains($nom, '..') || str_contains($nom, '/') || str_contains($nom, '\\')) {
            return 'Le nom du dossier ne peut pas contenir de séparateur de chemin (« / », « \\ » ou « .. »).';
        }
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $nom)) {
            return 'Le nom du dossier ne peut contenir que des lettres, chiffres, tirets, points et underscores (aucun espace ni caractère spécial).';
        }
        if (in_array(strtolower($nom), self::NOMS_RACINE_WEB, true) || in_array(strtolower($nom), ['api', 'dist', 'src', 'node_modules', 'vendor'], true)) {
            return 'Ce nom de dossier (« ' . $nom . ' ») est réservé et ne peut pas être utilisé comme dossier de données.';
        }
        return null;
    }

    /**
     * Valide et assainit le nom du fichier de base SQLite personnalisé.
     * Renvoie un message d'erreur si invalide, ou null si conforme.
     */
    public static function validerNomFichierSqlite(?string $nom): ?string
    {
        if ($nom === null || trim($nom) === '') {
            return 'Le nom du fichier de base de données ne peut pas être vide.';
        }
        $nom = trim($nom);
        if (str_contains($nom, '/') || str_contains($nom, '\\') || str_contains($nom, '..')) {
            return 'Le nom du fichier ne peut pas contenir de séparateur de chemin (« / », « \\ » ou « .. »).';
        }
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+\.sqlite$/i', $nom)) {
            return 'Le fichier de base de données doit se terminer par l\'extension « .sqlite » (ex: boutique.sqlite).';
        }
        return null;
    }

    /**
     * Décide de l'emplacement SANS rien écrire — l'écran de diagnostic doit
     * pouvoir annoncer le chemin avant que l'utilisateur ne valide quoi que ce
     * soit. `preparer()` fait ensuite la création réelle.
     *
     * @param string $racineApi   Chemin absolu du dossier `api/`.
     * @param string $nomDossier  Nom personnalisé du dossier de données (défaut : 'katech-data').
     */
    public static function deduire(string $racineApi, ?string $documentRoot, string $nomDossier = self::NOM_DOSSIER): self
    {
        $nomDossier = trim($nomDossier) !== '' ? trim($nomDossier) : self::NOM_DOSSIER;
        $racineApi = self::normaliser($racineApi);
        $racineWeb = self::normaliserRacineWeb($documentRoot);

        // Dossier du site lui-même : `public_html/` à la racine,
        // `public_html/ma-boutique/` en sous-dossier. C'est le parent de `api/`.
        $dossierSite = \dirname($racineApi);

        if ($racineWeb === null) {
            // Pas de racine web connue (ligne de commande, ou SAPI exotique).
            // Comportement historique du projet, juste hors navigateur.
            return new self(
                \dirname($racineApi, 2) . '/' . $nomDossier,
                true,
                null,
                '',
                'Racine web inconnue (exécution hors navigateur) : emplacement déduit de la '
                . 'position du dossier api/, comme le fait api/tools/sauvegarder.php.',
                $nomDossier,
            );
        }

        // Sous-dossier de déploiement, relatif à la racine web : « » à la
        // racine, « ma-boutique » sinon. Sert à l'affichage et à la sonde HTTP.
        $sousDossier = '';
        if ($dossierSite !== $racineWeb && str_starts_with($dossierSite . '/', $racineWeb . '/')) {
            $sousDossier = trim(substr($dossierSite, strlen($racineWeb)), '/');
        }

        $parent = self::remonterHorsRacineWeb(\dirname($racineWeb));
        $cible = $parent . '/' . $nomDossier;

        // Garde-fou 2 : le résultat ne doit en aucun cas retomber sous la racine
        // web, quelles que soient les fantaisies de DOCUMENT_ROOT.
        if ($parent === '' || $parent === '/' || self::estSous($cible, $racineWeb)) {
            return new self(
                $dossierSite . '/' . $nomDossier,
                false,
                $racineWeb,
                $sousDossier,
                'Aucun dossier parent utilisable n\'a pu être déduit de la racine web « '
                . $racineWeb . ' ».',
                $nomDossier,
            );
        }

        return new self(
            $cible,
            true,
            $racineWeb,
            $sousDossier,
            'Déduit de la racine web « ' . $racineWeb . ' » : le dossier de données est son VOISIN, '
            . 'jamais son contenu.'
            . ($sousDossier !== ''
                ? ' Le site est déployé dans le sous-dossier « ' . $sousDossier
                    . ' » ; c\'est bien la racine web qui sert d\'ancre, pas ce sous-dossier.'
                : ''),
            $nomDossier,
        );
    }

    /**
     * Où le dossier atterrira réellement — SANS RIEN ÉCRIRE.
     *
     * L'écran de diagnostic doit annoncer la destination et dire si SQLite est
     * jouable, avant que l'utilisateur n'ait rien validé. Il ne peut donc pas
     * appeler `preparer()`, qui crée des dossiers. Et il ne doit pas non plus
     * sonder en écriture : AGENTS.md §6 — « tester la présence d'un service en
     * l'appelant en écriture crée des données fantômes ; sondes en lecture seule
     * uniquement ». `is_writable()` suffit ici, et sa marge d'erreur (ACL, quota)
     * est justement rattrapée par `preparer()`, qui, lui, éprouve pour de bon.
     *
     * @return array{chemin:string,horsRacineWeb:bool,possible:bool,raison:string}
     */
    public function evaluer(string $racineApi): array
    {
        if ($this->horsRacineWeb && self::inscriptible($this->chemin)) {
            return [
                'chemin' => $this->chemin,
                'horsRacineWeb' => true,
                'possible' => true,
                'raison' => $this->explication,
            ];
        }

        $repli = \dirname(self::normaliser($racineApi)) . '/' . $this->nomDossier;

        return [
            'chemin' => $repli,
            'horsRacineWeb' => false,
            'possible' => self::inscriptible($repli),
            'raison' => $this->horsRacineWeb
                ? 'L\'hébergeur refuse l\'écriture à côté de la racine du site (« '
                    . \dirname($this->chemin) . ' »).'
                : $this->explication,
        ];
    }

    /**
     * Le dossier existe-t-il et est-il inscriptible, ou peut-il être créé ?
     *
     * TOUT EST PRÉFIXÉ DE `@`, ET CE N'EST PAS DE LA NÉGLIGENCE. Beaucoup
     * d'hébergements mutualisés posent un `open_basedir` : la moindre question
     * sur un chemin situé en dehors — et le dossier parent de la racine web en
     * est un, précisément celui qu'on interroge ici — émet un avertissement PHP.
     * Or `api/src/bootstrap.php` transforme tout avertissement en exception.
     * Sans ces `@`, l'assistant tomberait en erreur 500 chez exactement les
     * hébergeurs qu'il est censé aider. La réponse attendue est « non », pas une
     * exception.
     */
    private static function inscriptible(string $chemin): bool
    {
        return @is_dir($chemin) ? @is_writable($chemin) : @is_writable(\dirname($chemin));
    }

    /**
     * Crée réellement le dossier, avec repli DANS la racine web si le parent
     * refuse l'écriture. Pose les protections dans les deux cas.
     *
     * @return array{
     *     emplacement: self,
     *     backups: ?string,
     *     replie: bool,
     *     raisonRepli: ?string,
     *     protections: list<string>,
     * }
     */
    public function preparer(string $racineApi): array
    {
        $racineApi = self::normaliser($racineApi);
        $emplacement = $this;
        $replie = false;
        $raisonRepli = null;

        $echec = self::creerEtEprouver($this->chemin);

        if ($echec !== null && $this->horsRacineWeb) {
            // Repli DANS la racine web — dégradé, jamais silencieux.
            $repli = \dirname($racineApi) . '/' . $this->nomDossier;
            $emplacement = new self(
                $repli,
                false,
                $this->racineWeb,
                $this->sousDossier,
                'Repli dans la racine web : ' . $echec,
                $this->nomDossier,
            );
            $echecRepli = self::creerEtEprouver($repli);
            if ($echecRepli !== null) {
                throw new \RuntimeException(
                    'Aucun dossier de données n\'a pu être créé. Hors racine web : ' . $echec
                    . ' Dans la racine web : ' . $echecRepli
                );
            }
            $replie = true;
            $raisonRepli = $echec;
        } elseif ($echec !== null) {
            throw new \RuntimeException('Le dossier de données n\'a pas pu être créé : ' . $echec);
        }

        $protections = self::poserProtections($emplacement->chemin);

        $backups = $emplacement->chemin . '/backups';
        if (self::creerEtEprouver($backups) === null) {
            $protections = array_merge($protections, self::poserProtections($backups));
        } else {
            $backups = null;
        }

        return [
            'emplacement' => $emplacement,
            'backups' => $backups,
            'replie' => $replie,
            'raisonRepli' => $raisonRepli,
            'protections' => $protections,
        ];
    }

    /**
     * Nom du fichier SQLite à créer dans ce dossier.
     *
     * HORS racine web : nom lisible et documenté (par défaut `katech.sqlite`
     * ou nom personnalisé validé) — l'exploitant peut le reconnaître dans son
     * gestionnaire de fichiers.
     *
     * DANS la racine web (repli) : nom NON DEVINABLE. C'est la troisième
     * protection de `scripts/api-dev.mjs`, et la seule qui tienne sur un serveur
     * qui ignore les `.htaccess` (nginx) : on ne télécharge pas ce qu'on ne peut
     * pas nommer. Ce n'est pas de la cryptographie, c'est ce qui reste quand les
     * deux autres barrières sont absentes.
     */
    public function nomBaseSqlite(?string $nomPersonnalise = null): string
    {
        if ($this->horsRacineWeb) {
            if ($nomPersonnalise !== null && trim($nomPersonnalise) !== '') {
                $base = trim($nomPersonnalise);
                if (!str_ends_with(strtolower($base), '.sqlite')) {
                    $base .= '.sqlite';
                }
                return $base;
            }
            return 'katech.sqlite';
        }

        $prefixe = 'katech';
        if ($nomPersonnalise !== null && trim($nomPersonnalise) !== '') {
            $nomNettoye = (string) preg_replace('/[^a-zA-Z0-9_\-]/', '', pathinfo($nomPersonnalise, PATHINFO_FILENAME));
            if ($nomNettoye !== '') {
                $prefixe = $nomNettoye;
            }
        }
        return $prefixe . '-' . bin2hex(random_bytes(6)) . '.sqlite';
    }

    /** Vrai si `$chemin` est le dossier `$racine` ou se trouve dedans. */
    public static function estSous(string $chemin, string $racine): bool
    {
        $chemin = self::normaliser($chemin);
        $racine = self::normaliser($racine);

        return $chemin === $racine || str_starts_with($chemin . '/', $racine . '/');
    }

    /**
     * Remonte tant que le candidat est, ou traverse, une racine web connue.
     * Garde-fou 1 (voir l'en-tête) : `DOCUMENT_ROOT` fixé sur un sous-dossier.
     */
    private static function remonterHorsRacineWeb(string $depart): string
    {
        $courant = self::normaliser($depart);

        for ($i = 0; $i < 8; $i++) {
            if (!self::traverseUneRacineWeb($courant)) {
                return $courant;
            }
            $parent = \dirname($courant);
            if ($parent === $courant) {
                return $courant;
            }
            $courant = $parent;
        }

        return $courant;
    }

    /** Vrai si le chemin porte, ou contient, un segment de racine web connu. */
    private static function traverseUneRacineWeb(string $chemin): bool
    {
        foreach (explode('/', strtolower(self::normaliser($chemin))) as $segment) {
            if ($segment !== '' && in_array($segment, self::NOMS_RACINE_WEB, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Crée le dossier au besoin et ÉPROUVE l'écriture par un fichier temporaire.
     *
     * `is_writable()` seul ment sur un mutualisé : ACL POSIX, quota atteint,
     * système de fichiers monté en lecture seule, `open_basedir`. La seule
     * preuve d'écriture est une écriture.
     *
     * @return string|null null si tout va bien, sinon la raison, en français.
     */
    private static function creerEtEprouver(string $chemin): ?string
    {
        if (!@is_dir($chemin)) {
            // 0750 : le propriétaire et le groupe du serveur web, personne d'autre.
            // `@` partout : voir `inscriptible()` — un `open_basedir` fait de la
            // moindre question sur ce chemin un avertissement, donc une exception.
            if (!@mkdir($chemin, 0750, true) && !@is_dir($chemin)) {
                return 'le dossier « ' . $chemin . ' » n\'existe pas et sa création a été refusée '
                    . 'par l\'hébergeur.';
            }
        }

        $temoin = $chemin . '/.ecriture-' . bin2hex(random_bytes(4));
        if (@file_put_contents($temoin, 'test') === false) {
            return 'le dossier « ' . $chemin . '  » existe mais PHP n\'a pas le droit d\'y écrire.';
        }
        @unlink($temoin);

        return null;
    }

    /**
     * Pose les deux fichiers de protection, à l'identique de
     * `scripts/api-dev.mjs` (même marqueur, même contenu) : deux outils
     * différents ne doivent pas produire deux protections différentes.
     *
     * @return list<string> chemins écrits, pour le compte rendu
     */
    private static function poserProtections(string $dossier): array
    {
        $ecrits = [];

        $htaccess = $dossier . '/.htaccess';
        if (!is_file($htaccess) || !str_contains((string) @file_get_contents($htaccess), self::MARQUEUR_PROTECTION)) {
            if (@file_put_contents($htaccess, self::contenuHtaccess()) !== false) {
                $ecrits[] = $htaccess;
            }
        }

        $index = $dossier . '/index.html';
        if (!is_file($index) || !str_contains((string) @file_get_contents($index), self::MARQUEUR_PROTECTION)) {
            if (@file_put_contents($index, self::contenuIndex()) !== false) {
                $ecrits[] = $index;
            }
        }

        return $ecrits;
    }

    private static function contenuHtaccess(): string
    {
        return self::MARQUEUR_PROTECTION . "\n"
            . <<<'HTACCESS'
            # =====================================================================
            # katech-data/.htaccess — ce dossier ne sort JAMAIS par HTTP
            # =====================================================================
            # Écrit automatiquement par api/install.php. Ne pas supprimer.
            #
            # POURQUOI : ce dossier contient la base (comptes, commandes,
            # empreintes de mots de passe) et les sauvegardes. Un seul fichier
            # téléchargé, et c'est toute la clientèle qui est dehors.
            #
            # PORTÉE RÉELLE : Apache et LiteSpeed seulement, et seulement si
            # AllowOverride autorise ces directives. nginx IGNORE les .htaccess :
            # sur nginx, ce fichier ne protège RIEN. C'est pourquoi le dossier est
            # placé HORS de la racine web chaque fois que l'hébergeur le permet,
            # et pourquoi la base porte un nom non devinable quand il ne le
            # permet pas.
            #
            # Trois barrières redondantes À DESSEIN : si un module manque, une
            # autre tient.
            # =====================================================================

            Options -Indexes

            <IfModule mod_negotiation.c>
              Options -MultiViews
            </IfModule>

            # --- Barrière 1 : refus du dossier entier (mod_authz_core) -----------
            <IfModule mod_authz_core.c>
              Require all denied
            </IfModule>
            <IfModule !mod_authz_core.c>
              Order allow,deny
              Deny from all
            </IfModule>

            # --- Barrière 2 : refus par réécriture, si mod_authz_core manquait ---
            <IfModule mod_rewrite.c>
              RewriteEngine On
              RewriteRule ^ - [F,L]
            </IfModule>

            # --- Barrière 3 : refus par nom de fichier ---------------------------
            # Redondant avec la barrière 1, mais survit à un « Require all granted »
            # hérité d'une configuration de VirtualHost trop permissive.
            <FilesMatch "(^\.|\.(sqlite|sqlite-wal|sqlite-shm|db|sql|env|log|bak|old|gz|zip|tar)$)">
              <IfModule mod_authz_core.c>
                Require all denied
              </IfModule>
              <IfModule !mod_authz_core.c>
                Order allow,deny
                Deny from all
              </IfModule>
            </FilesMatch>

            ErrorDocument 403 "Acces refuse."

            HTACCESS;
    }

    private static function contenuIndex(): string
    {
        return "<!doctype html>\n<!-- " . self::MARQUEUR_PROTECTION . " -->\n"
            . <<<'HTML'
            <!--
              Écrit automatiquement par api/install.php. Ne pas supprimer.

              Rôle : empêcher le LISTAGE du dossier sur les serveurs où
              « Options -Indexes » ne s'applique pas (nginx avec autoindex, par
              exemple). Cette page est alors servie à la place de la liste des
              fichiers.

              Ce fichier n'empêche PAS de télécharger un fichier dont on connaît le
              nom. C'est le .htaccess (Apache/LiteSpeed), le placement hors racine
              web et le nom non devinable de la base qui s'en chargent.
            -->
            <html lang="fr"><head><meta charset="utf-8"><title>Accès refusé</title></head>
            <body><p>Accès refusé.</p></body></html>

            HTML;
    }

    /** Normalise les séparateurs et retire la barre finale. */
    private static function normaliser(string $chemin): string
    {
        $chemin = str_replace('\\', '/', trim($chemin));
        $reel = @realpath($chemin);
        if (is_string($reel) && $reel !== '') {
            $chemin = str_replace('\\', '/', $reel);
        }

        return $chemin === '/' ? '/' : rtrim($chemin, '/');
    }

    /** `DOCUMENT_ROOT` nettoyé, ou null s'il est absent ou inutilisable. */
    private static function normaliserRacineWeb(?string $documentRoot): ?string
    {
        if ($documentRoot === null || trim($documentRoot) === '') {
            return null;
        }
        $normalise = self::normaliser($documentRoot);

        return ($normalise === '' || $normalise === '/' || !@is_dir($normalise)) ? null : $normalise;
    }
}
