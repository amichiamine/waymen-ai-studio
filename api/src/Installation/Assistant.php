<?php

/**
 * Assistant d'installation par le navigateur — les trois écrans.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE CETTE PAGE REMPLACE
 * ─────────────────────────────────────────────────────────────────────────
 * Avant : le commerçant devait copier `api/.env.example` en `api/.env` dans un
 * gestionnaire de fichiers web, éditer six lignes sans se tromper, créer
 * lui-même un dossier hors de la racine du site, puis ouvrir `install.php` en
 * espérant. Chaque étape est un endroit où l'on se trompe, et la faute la plus
 * fréquente — poser la base dans la partie publique du site — ne provoque
 * aucune erreur : elle publie simplement la clientèle.
 *
 * Maintenant : trois écrans. On regarde ce que l'hébergement sait faire, on
 * demande ce que la machine ne peut pas deviner, on fait le reste — et on
 * PROUVE que la base n'est pas téléchargeable.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RÈGLES DE SÉCURITÉ TENUES ICI (la page est publique tant que rien n'est installé)
 * ─────────────────────────────────────────────────────────────────────────
 *   · Aucun mot de passe ne repart dans le HTML : pas de champ pré-rempli, pas
 *     d'écho dans un message d'erreur, pas de valeur dans une URL. Après un
 *     refus, les champs de mot de passe sont vides — c'est volontairement un
 *     peu pénible, et c'est la seule façon de garantir qu'ils ne traînent ni
 *     dans le cache du navigateur, ni dans l'historique, ni dans un journal de
 *     proxy.
 *   · Tout ce qui modifie l'état passe en POST, avec jeton anti-rejeu (`Garde`).
 *   · Les tentatives sont plafonnées (`Garde`).
 *   · Une fois installé, l'accès est REFUSÉ (HTTP 403), pas découragé. Seule
 *     l'auto-suppression reste possible : c'est le geste qui fait disparaître
 *     la page.
 *   · Aucune trace technique brute à l'écran (chemins internes du code,
 *     exceptions, requêtes SQL) : message clair pour l'exploitant, détail dans
 *     le journal du serveur.
 *
 * Le HTML est autonome : aucune police, aucune feuille de style, aucun script
 * venu d'ailleurs. Cette page doit s'afficher correctement sur un hébergement
 * qui vient d'être acheté, avant même que le DNS ne soit complètement propagé.
 */

declare(strict_types=1);

namespace KaTech\Installation;

use KaTech\ApiException;
use KaTech\Db;
use Throwable;

final class Assistant
{
    private Garde $garde;

    /** @var list<string> compte rendu technique de l'installation */
    private array $journal = [];

    public function __construct(
        private readonly string $racineApi,
        private readonly array $serveur,
    ) {
        $this->garde = new Garde($racineApi);
    }

    /** Point d'entrée unique appelé par `api/install.php` en mode HTTP. */
    public function repondre(): never
    {
        $action = (string) ($_POST['action'] ?? $_GET['etape'] ?? '');
        $temoin = $this->racineApi . '/installed.lock';

        // ---- Auto-suppression : possible AVANT comme APRÈS l'installation ---
        if ($action === 'supprimer') {
            $this->supprimerInstallateur();
        }

        // ---- Refus net une fois l'installation faite ------------------------
        if (is_file($temoin)) {
            $this->ecranDejaInstalle($temoin);
        }

        if ($action === 'installer') {
            $this->traiterFormulaire();
        }

        if ($action === 'configurer') {
            $this->ecranFormulaire([], []);
        }

        $this->ecranDiagnostic();
    }

    // =================================================================
    // Écran 1 — diagnostic
    // =================================================================

    private function ecranDiagnostic(): never
    {
        $diag = Diagnostic::etablir($this->racineApi, $this->serveur);

        $corps = '<h1>Installation de votre boutique</h1>'
            . '<p class="chapeau">Cette page vous accompagne en trois étapes : on regarde d\'abord ce '
            . 'que votre hébergement sait faire, puis on vous demande le strict nécessaire, et '
            . 'l\'installateur se charge du reste — y compris de vérifier que vos données ne sont '
            . 'pas téléchargeables depuis Internet.</p>'
            . $this->fil(1)
            . '<h2>Étape 1 — Ce que votre hébergement sait faire</h2>'
            . '<table class="constats"><tbody>';

        foreach ($diag->points() as $point) {
            $corps .= '<tr class="' . $point['etat'] . '">'
                . '<th scope="row">' . self::h($point['titre']) . '</th>'
                . '<td><span class="pastille ' . $point['etat'] . '">' . self::symbole($point['etat']) . '</span> '
                . self::h($point['valeur'])
                . ($point['conseil'] !== null ? '<p class="conseil">' . self::h($point['conseil']) . '</p>' : '')
                . '</td></tr>';
        }

        $corps .= '</tbody></table>';

        $corps .= $diag->installable()
            ? '<p class="verdict ok">' . self::h($diag->verdict()) . '</p>'
                . '<p><a class="bouton" href="?etape=configurer">Continuer &rarr;</a></p>'
            : '<p class="verdict alerte">' . self::h($diag->verdict()) . '</p>'
                . '<p>Corrigez les points ci-dessus, puis <a href="?">rechargez cette page</a>.</p>';

        $this->rendre('Installation — étape 1 sur 3', $corps, $diag->installable() ? 200 : 503);
    }

    // =================================================================
    // Écran 2 — formulaire
    // =================================================================

    /**
     * @param array<string,list<string>> $erreurs champ → messages
     * @param array<string,string>       $saisie  valeurs NON sensibles à réafficher
     */
    private function ecranFormulaire(array $erreurs, array $saisie, ?string $echec = null): never
    {
        $diag = Diagnostic::etablir($this->racineApi, $this->serveur);
        $pilotes = $diag->pilotesDisponibles();

        if ($pilotes === []) {
            $this->ecranDiagnostic();
        }

        $jeton = $this->garde->emettreJeton();
        $v = static fn (string $cle, string $defaut = ''): string => self::h($saisie[$cle] ?? $defaut);

        $corps = '<h1>Installation de votre boutique</h1>' . $this->fil(2);

        if ($echec !== null) {
            $corps .= '<div class="encart alerte"><strong>L\'installation n\'a pas abouti.</strong>'
                . '<p>' . self::h($echec) . '</p></div>';
        }

        $corps .= '<h2>Étape 2 — Vos informations</h2>'
            . '<p class="chapeau">Trois choses seulement : où ranger les données, qui est le '
            . 'propriétaire du site, et quel mot de passe le protège.</p>'
            . '<form method="post" action="" autocomplete="off">'
            . '<input type="hidden" name="action" value="installer">'
            . '<input type="hidden" name="jeton" value="' . self::h($jeton) . '">';

        // ---- Choix du moteur : uniquement ceux qui marchent ici -------------
        $corps .= '<fieldset><legend>1. Où ranger les données</legend>'
            . '<p class="aide">Seuls les moteurs réellement disponibles sur votre hébergement sont '
            . 'proposés. Les autres ne sont pas cachés par prudence : ils ne fonctionneraient pas.</p>';

        $choisi = $saisie['pilote'] ?? $pilotes[0];
        foreach ($pilotes as $pilote) {
            $corps .= '<label class="choix"><input type="radio" name="pilote" value="' . self::h($pilote) . '"'
                . ($choisi === $pilote ? ' checked' : '') . ' data-pilote="' . self::h($pilote) . '"> '
                . self::h(Diagnostic::nomPilote($pilote)) . '</label>';
        }
        $corps .= self::erreursDe($erreurs, 'pilote') . '</fieldset>';

        // ---- Identifiants de la base ---------------------------------------
        $corps .= '<fieldset><legend>2. Identifiants de la base</legend>'
            . '<p class="aide">À remplir uniquement si vous avez choisi MySQL ou PostgreSQL. '
            . 'Ces quatre valeurs vous sont données par votre hébergeur, dans la section '
            . '« Bases de données » de son panneau. Avec SQLite, laissez tout vide : '
            . 'l\'installateur crée le fichier lui-même, hors de la partie publique du site.</p>'
            . self::champ('db_host', 'Serveur de la base', $v('db_host', 'localhost'), 'text', $erreurs)
            . self::champ('db_port', 'Port (laisser vide pour le port habituel)', $v('db_port'), 'text', $erreurs)
            . self::champ('db_name', 'Nom de la base', $v('db_name'), 'text', $erreurs)
            . self::champ('db_user', 'Utilisateur de la base', $v('db_user'), 'text', $erreurs)
            . self::champ('db_password', 'Mot de passe de la base', '', 'password', $erreurs,
                'Jamais réaffiché : après une erreur, il faut le retaper.')
            . '<label class="choix"><input type="checkbox" name="db_ssl" value="1"'
            . (isset($saisie['db_ssl']) ? ' checked' : '')
            . '> Connexion chiffrée obligatoire (à cocher pour Supabase, Neon, Railway)</label>'
            . '</fieldset>';

        // ---- Compte propriétaire — l'exigence est expliquée AVANT la saisie --
        $corps .= '<fieldset><legend>3. Votre compte de propriétaire</legend>'
            . '<p class="aide">C\'est le compte qui pourra tout faire sur le site. Il n\'y a pas de '
            . 'mot de passe par défaut, et il n\'y en aura jamais : un « admin/admin » sur une '
            . 'boutique en ligne se fait forcer dans la journée.</p>'
            . '<div class="encart info"><strong>Ce que le mot de passe doit respecter, avant que '
            . 'vous ne le choisissiez :</strong><ul>'
            . '<li>au moins 10 caractères — c\'est la longueur qui compte le plus ;</li>'
            . '<li>pas un mot courant ni un classique des attaques (« motdepasse », « admin1234 », '
            . '« katech2026 »…), même suivi de chiffres ;</li>'
            . '<li>pas une suite de clavier ni un caractère répété.</li></ul>'
            . '<p>Le plus simple et le plus solide : une phrase que vous seul retiendrez, par exemple '
            . 'quatre mots sans rapport entre eux. Il est enregistré sous forme d\'empreinte '
            . 'impossible à inverser, et n\'est écrit dans aucun fichier du serveur.</p></div>'
            . self::champ('owner_name', 'Votre nom', $v('owner_name', 'Propriétaire'), 'text', $erreurs)
            . self::champ('owner_email', 'Votre adresse e-mail (elle servira à vous connecter)',
                $v('owner_email'), 'email', $erreurs, null, 'INSTALL_OWNER_EMAIL')
            . self::champ('owner_password', 'Mot de passe', '', 'password', $erreurs, null, 'INSTALL_OWNER_PASSWORD')
            . self::champ('owner_password2', 'Répétez le mot de passe', '', 'password', $erreurs)
            . '</fieldset>';

        // ---- Catalogue de démonstration — choix explicite ------------------
        $importChoix = $saisie['import_catalogue'] ?? 'demo';
        $corps .= '<fieldset><legend>4. Catalogue de produits</legend>'
            . '<p class="aide">Votre boutique peut démarrer avec des produits de démonstration, ou '
            . 'complètement vide si vous souhaitez y ajouter vos propres produits dès le départ.</p>'
            . '<label class="choix"><input type="radio" name="import_catalogue" value="demo"'
            . ($importChoix === 'demo' ? ' checked' : '') . '>'
            . ' <strong>Démarrer avec les produits de démonstration</strong>'
            . ' — ordinateurs, téléphones et configurations d\'exemple, que vous pourrez modifier '
            . 'ou supprimer depuis l\'administration. Idéal pour découvrir le site en conditions réelles.</label>'
            . '<label class="choix"><input type="radio" name="import_catalogue" value="vide"'
            . ($importChoix === 'vide' ? ' checked' : '') . '>'
            . ' <strong>Démarrer sur une boutique vide</strong>'
            . ' — aucun produit ajouté, vous partez d\'une feuille blanche. Pour importer le catalogue '
            . 'plus tard, utilisez la commande : '
            . '<code>php api/tools/importer-donnees-front.php</code></label>'
            . '</fieldset>';

        if ($diag->envExistant) {
            $corps .= '<fieldset><legend>5. Configuration existante</legend>'
                . '<p class="aide">Un fichier de configuration <code>api/.env</code> existe déjà. '
                . 'L\'assistant en fera une copie datée avant de le remplacer.</p>'
                . '<label class="choix"><input type="checkbox" name="confirmer_env" value="1"> '
                . 'J\'autorise le remplacement du fichier de configuration existant</label>'
                . self::erreursDe($erreurs, 'confirmer_env')
                . '</fieldset>';
        }

        $corps .= '<p><button type="submit" class="bouton">Installer la boutique</button></p>'
            . '<p class="aide">L\'opération prend quelques secondes. Ne rechargez pas la page.</p>'
            . '</form>';

        $this->rendre('Installation — étape 2 sur 3', $corps, $erreurs === [] && $echec === null ? 200 : 400);
    }

    // =================================================================
    // Traitement du formulaire
    // =================================================================

    private function traiterFormulaire(): never
    {
        // ---- Plafond de tentatives : la page est publique -------------------
        $ip = (string) ($this->serveur['REMOTE_ADDR'] ?? 'inconnue');
        if ($this->garde->tropDeTentatives($ip)) {
            $this->rendre(
                'Installation — trop de tentatives',
                '<h1>Trop de tentatives</h1>'
                . '<div class="encart alerte"><p>Cette page a reçu trop de soumissions en peu de '
                . 'temps. Elle est temporairement fermée, pendant '
                . $this->garde->minutesAvantLevee() . ' minutes environ.</p>'
                . '<p>Si ce n\'était pas vous, c\'est le signe que l\'adresse de votre site est déjà '
                . 'sondée : terminez l\'installation dès que possible, puis supprimez ce fichier.</p>'
                . '</div>',
                429,
            );
        }

        // ---- Jeton anti-rejeu ------------------------------------------------
        if (!$this->garde->consommerJeton(isset($_POST['jeton']) ? (string) $_POST['jeton'] : null)) {
            $this->rendre(
                'Installation — formulaire expiré',
                '<h1>Formulaire non valide</h1>'
                . '<div class="encart alerte"><p>Ce formulaire ne portait pas de jeton de sécurité '
                . 'valide. Rien n\'a été installé.</p>'
                . '<p>Deux explications possibles : la page est restée ouverte trop longtemps, ou '
                . 'l\'envoi ne venait pas de cette page. Recommencez depuis le début.</p></div>'
                . '<p><a class="bouton" href="?">Recommencer</a></p>',
                403,
            );
        }

        $diag = Diagnostic::etablir($this->racineApi, $this->serveur);
        $pilotes = $diag->pilotesDisponibles();

        $lire = static fn (string $cle): string => trim((string) ($_POST[$cle] ?? ''));

        // Ce qui peut être réaffiché sans risque. Les mots de passe n'y sont pas.
        $saisie = [
            'pilote'           => $lire('pilote'),
            'db_host'          => $lire('db_host'),
            'db_port'          => $lire('db_port'),
            'db_name'          => $lire('db_name'),
            'db_user'          => $lire('db_user'),
            'owner_name'       => $lire('owner_name'),
            'owner_email'      => $lire('owner_email'),
            'import_catalogue' => $lire('import_catalogue') === 'vide' ? 'vide' : 'demo',
        ];
        if (($_POST['db_ssl'] ?? '') !== '') {
            $saisie['db_ssl'] = '1';
        }

        $erreurs = [];

        $pilote = $saisie['pilote'];
        if (!in_array($pilote, $pilotes, true)) {
            $erreurs['pilote'] = ['Choisissez une base parmi celles proposées : elles sont les seules '
                . 'à fonctionner sur cet hébergement.'];
        }

        $motDePasse = (string) ($_POST['owner_password'] ?? '');
        $repetition = (string) ($_POST['owner_password2'] ?? '');
        $motDePasseBase = (string) ($_POST['db_password'] ?? '');

        // Politique unique, la même que /auth/register et que la ligne de commande.
        foreach (Installateur::validerIdentifiants($saisie['owner_email'], $motDePasse) as $champ => $messages) {
            $cle = $champ === 'INSTALL_OWNER_EMAIL' ? 'owner_email' : 'owner_password';
            $erreurs[$cle] = $messages;
        }

        if ($motDePasse !== '' && $repetition !== $motDePasse) {
            $erreurs['owner_password2'] = ['Les deux mots de passe saisis ne sont pas identiques.'];
        }

        if ($pilote !== Db::PILOTE_SQLITE && $pilote !== '') {
            foreach (['db_name' => 'Nom de la base', 'db_user' => 'Utilisateur de la base'] as $cle => $libelle) {
                if ($saisie[$cle] === '') {
                    $erreurs[$cle] = [$libelle . ' : valeur obligatoire pour ce moteur. Vous la trouverez '
                        . 'dans la section « Bases de données » du panneau de votre hébergeur.'];
                }
            }
        }

        if ($diag->envExistant && ($_POST['confirmer_env'] ?? '') === '') {
            $erreurs['confirmer_env'] = ['Cochez la case : un fichier de configuration existe déjà, '
                . 'et l\'assistant ne le remplace pas sans votre accord.'];
        }

        if ($erreurs !== []) {
            $this->ecranFormulaire($erreurs, $saisie);
        }

        // ---- Tout est valide : on agit --------------------------------------
        try {
            $this->installer($pilote, $saisie, $motDePasseBase, $motDePasse, $saisie['import_catalogue'] === 'demo');
        } catch (ApiException $e) {
            // Message déjà rédigé pour un exploitant : on l'affiche tel quel.
            $detail = $e->getMessage();
            foreach ($e->champs() as $champ => $messages) {
                $detail .= ' ' . $champ . ' : ' . implode(' ', $messages);
            }
            $this->ecranFormulaire([], $saisie, $detail);
        } catch (Throwable $e) {
            // Trace technique : dans le journal du serveur, jamais à l'écran.
            Db::journaliserStatique('install.php (assistant) : ' . $e->getMessage()
                . ' (' . $e->getFile() . ':' . $e->getLine() . ')');
            $this->ecranFormulaire([], $saisie, katech_est_production()
                ? 'Une erreur interne est survenue. Le détail a été écrit dans le journal '
                    . 'd\'erreurs de votre hébergement. Vérifiez vos identifiants de base de '
                    . 'données et réessayez.'
                : $e::class . ' : ' . $e->getMessage());
        }
    }

    /**
     * Le travail lui-même. Ordre choisi pour qu'un échec laisse le moins de
     * traces possible : dossier, connexion, configuration, schéma, témoin.
     *
     * @param array<string,string> $saisie
     */
    private function installer(
        string $pilote,
        array $saisie,
        string $motDePasseBase,
        string $motDePasseProprietaire,
        bool $importerCatalogue,
    ): never {
        // ---- 1. Le dossier de données, au bon endroit ------------------------
        $prevu = Emplacement::deduire($this->racineApi, isset($this->serveur['DOCUMENT_ROOT'])
            ? (string) $this->serveur['DOCUMENT_ROOT']
            : null);
        $prepare = $prevu->preparer($this->racineApi);
        /** @var Emplacement $emplacement */
        $emplacement = $prepare['emplacement'];

        $this->journal[] = 'Dossier de données : ' . $emplacement->chemin;
        if ($prepare['backups'] !== null) {
            $this->journal[] = 'Dossier de sauvegardes : ' . $prepare['backups'];
        }
        foreach ($prepare['protections'] as $fichier) {
            $this->journal[] = 'Protection posée : ' . $fichier;
        }

        // ---- 2. La configuration, en mémoire d'abord -------------------------
        $valeurs = ['DB_DRIVER' => $pilote];

        if ($pilote === Db::PILOTE_SQLITE) {
            $valeurs['DB_SQLITE_PATH'] = $emplacement->chemin . '/' . $emplacement->nomBaseSqlite();
        } else {
            $valeurs['DB_HOST'] = $saisie['db_host'] !== '' ? $saisie['db_host'] : 'localhost';
            $valeurs['DB_PORT'] = $saisie['db_port'] !== ''
                ? $saisie['db_port']
                : ($pilote === Db::PILOTE_PGSQL ? '5432' : '3306');
            $valeurs['DB_NAME'] = $saisie['db_name'];
            $valeurs['DB_USER'] = $saisie['db_user'];
            $valeurs['DB_PASSWORD'] = $motDePasseBase;
            if ($pilote === Db::PILOTE_PGSQL && isset($saisie['db_ssl'])) {
                $valeurs['DB_SSLMODE'] = 'require';
            }
        }

        $valeurs['APP_ENV'] = 'production';
        $valeurs['INSTALL_OWNER_NAME'] = $saisie['owner_name'] !== '' ? $saisie['owner_name'] : 'Propriétaire';
        $valeurs['INSTALL_OWNER_EMAIL'] = strtolower($saisie['owner_email']);
        if ($prepare['backups'] !== null) {
            $valeurs['BACKUP_DIR'] = $prepare['backups'];
        }

        $racinePublique = SondeHttp::racinePublique($this->serveur);
        if ($racinePublique !== null) {
            $valeurs['APP_URL'] = $racinePublique;
        }

        // `INSTALL_OWNER_PASSWORD` n'apparaît NULLE PART dans $valeurs : le mot de
        // passe va de ce formulaire au hachage, puis en base. Point final.

        // ---- 3. Rendre la configuration effective pour CE processus ----------
        //
        // `KaTech\Env` charge `api/.env` une seule fois, au démarrage — c'est-à-dire
        // avant que ce fichier n'existe. Réécrire le fichier ne suffirait donc pas :
        // la connexion partirait avec l'ancienne configuration, ou avec aucune.
        // On pose les valeurs dans l'environnement RÉEL du processus, que
        // `Env::get()` consulte en priorité. Aucune modification du lecteur d'env
        // n'est nécessaire, et le fichier écrit juste après reste la source de
        // vérité pour toutes les requêtes suivantes.
        foreach ($valeurs as $cle => $valeur) {
            if (str_starts_with($cle, 'DB_')) {
                putenv($cle . '=' . $valeur);
                $_ENV[$cle] = $valeur;
            }
        }

        Db::reinitialiser();
        $db = Db::instance();
        $db->pdo();   // échoue ici, avec un message parlant, si les identifiants sont faux
        $this->journal[] = 'Connexion à la base : réussie (' . $pilote . ').';

        // ---- 4. Le fichier de configuration ----------------------------------
        $env = RedacteurEnv::ecrire($this->racineApi, $valeurs);
        $this->journal[] = 'Configuration écrite dans api/.env (permissions ' . $env['permissions'] . ').';
        if ($env['sauvegarde'] !== null) {
            $this->journal[] = 'Ancienne configuration conservée : ' . basename($env['sauvegarde']);
        }

        // ---- 5. Le schéma et le compte propriétaire --------------------------
        $installateur = new Installateur($db, $this->racineApi, function (string $l): void {
            $this->journal[] = $l;
        });

        $ddlTransactionnel = $installateur->ddlTransactionnel();
        try {
            $installateur->appliquerSchema();
            $installateur->creerProprietaire(
                $valeurs['INSTALL_OWNER_EMAIL'],
                $motDePasseProprietaire,
                $valeurs['INSTALL_OWNER_NAME'],
                false,
            );
            $installateur->conclure();
        } catch (Throwable $e) {
            $this->journal[] = Installateur::annulerEtDecrire($db, $ddlTransactionnel);

            throw $e;
        }

        // ---- 6. Import du catalogue de démonstration (optionnel, non bloquant) --
        //
        // L'import arrive APRÈS le témoin : même si l'import échoue,
        // l'installation est déclarée réussie. Le compte propriétaire et les
        // tables sont l'essentiel ; le catalogue est un bonus.
        //
        // `ImportateurCatalogue` appelle directement `ImporteurDonneesFront`,
        // une classe PHP pure — aucun sous-processus, aucune dépendance à
        // `proc_open` ou au binaire PHP en ligne de commande. Fonctionnel sur
        // tous les hébergements mutualisés, même avec `disable_functions`.
        /** @var array{ok:bool,produits:int,categories:int,marques:int,details:string,erreur:string|null}|null $resultImport */
        $resultImport = null;
        if ($importerCatalogue) {
            $importateur = new ImportateurCatalogue($this->racineApi, $db);
            $resultImport = $importateur->importer();
            $this->journal[] = $resultImport['ok']
                ? sprintf(
                    'Catalogue importé : %d produit(s), %d catégorie(s), %d marque(s).',
                    $resultImport['produits'],
                    $resultImport['categories'],
                    $resultImport['marques'],
                )
                : 'Import du catalogue : échec (non bloquant) — ' . ($resultImport['erreur'] ?? '');
        } else {
            $this->journal[] = 'Import du catalogue : non demandé (boutique vide).';
        }

        // ---- 7. La preuve : la base est-elle téléchargeable ? ----------------
        $sonde = SondeHttp::eprouver($emplacement, $this->serveur);

        $this->ecranResultat($emplacement, $prepare, $env, $sonde, $pilote, $importerCatalogue, $resultImport);
    }

    // =================================================================
    // Écran 3 — résultat
    // =================================================================

    /**
     * @param array{emplacement:Emplacement,backups:?string,replie:bool,raisonRepli:?string,protections:list<string>} $prepare
     * @param array{chemin:string,permissions:string,sauvegarde:?string} $env
     * @param array{ok:bool,produits:int,categories:int,marques:int,details:string,erreur:string|null}|null $resultImport
     */
    private function ecranResultat(
        Emplacement $emplacement,
        array $prepare,
        array $env,
        SondeHttp $sonde,
        string $pilote,
        bool $importCatalogue = false,
        ?array $resultImport = null,
    ): never {
        $jeton = $this->garde->emettreJeton();

        $corps = '<h1>Votre boutique est installée</h1>' . $this->fil(3)
            . '<h2>Étape 3 — Ce qui a été fait</h2>';

        // ---- Le repli : en rouge, et sans euphémisme ------------------------
        if ($prepare['replie'] || !$emplacement->horsRacineWeb) {
            $corps .= '<div class="encart alerte"><strong>Vos données sont rangées DANS la partie '
                . 'publique de votre site.</strong>'
                . '<p>L\'installateur a essayé de créer le dossier de données à côté de votre site, '
                . 'là où aucun visiteur ne peut aller. Votre hébergeur l\'a refusé : '
                . self::h((string) ($prepare['raisonRepli'] ?? $emplacement->explication)) . '</p>'
                . '<p><strong>Ce que cela signifie concrètement :</strong> le dossier '
                . '<code>' . self::h($emplacement->chemin) . '</code> se trouve à l\'intérieur du '
                . 'site. Il est protégé par un fichier <code>.htaccess</code> et par un nom de base '
                . 'impossible à deviner, mais ces deux protections cessent d\'exister le jour où '
                . 'votre hébergeur passe à un serveur qui ignore les <code>.htaccess</code>. '
                . 'Quelqu\'un pourrait alors télécharger la base : noms, téléphones, adresses et '
                . 'empreintes des mots de passe de vos clients.</p>'
                . '<p><strong>Comment y remédier, plus tard et sans réinstaller :</strong> dans le '
                . 'gestionnaire de fichiers de votre hébergeur, créez un dossier '
                . '<code>katech-data</code> au même niveau que <code>public_html</code> (pas dedans), '
                . 'déplacez-y le contenu du dossier ci-dessus, puis corrigez les deux lignes '
                . '<code>DB_SQLITE_PATH</code> et <code>BACKUP_DIR</code> dans '
                . '<code>api/.env</code>. Si vous n\'y arrivez pas, demandez à votre hébergeur de '
                . 'rendre ce dossier parent inscriptible.</p></div>';
        }

        // ---- La preuve HTTP ---------------------------------------------------
        $classe = match ($sonde->verdict) {
            SondeHttp::PROTEGE => 'ok',
            SondeHttp::EXPOSE => 'alerte',
            default => 'inconnu',
        };
        $titre = match ($sonde->verdict) {
            SondeHttp::PROTEGE => 'Vos données sont inaccessibles depuis Internet ✅',
            SondeHttp::EXPOSE => 'ALERTE : vos données SONT accessibles depuis Internet',
            default => 'La vérification n\'a pas pu être faite',
        };
        $corps .= '<div class="encart ' . $classe . '"><strong>' . self::h($titre) . '</strong>'
            . '<p>' . self::h($sonde->explication) . '</p>';
        if ($sonde->essais !== []) {
            $corps .= '<ul class="essais">';
            foreach ($sonde->essais as $essai) {
                $corps .= '<li><code>' . self::h($essai['url']) . '</code> → ' . self::h($essai['resultat']) . '</li>';
            }
            $corps .= '</ul>';
        }
        if ($sonde->estExpose()) {
            $corps .= '<p><strong>À faire tout de suite :</strong> vérifiez que le fichier '
                . '<code>.htaccess</code> est bien présent dans le dossier de données et à la racine '
                . 'du site (ces fichiers commencent par un point et sont souvent perdus au '
                . 'téléversement), puis rechargez cette vérification. Si votre hébergeur n\'applique '
                . 'pas les <code>.htaccess</code>, la seule solution est de déplacer le dossier de '
                . 'données hors de <code>public_html</code>.</p>';
        }
        $corps .= '</div>';

        // ---- Catalogue de démonstration ---------------------------------------
        if ($importCatalogue) {
            if ($resultImport !== null && $resultImport['ok']) {
                $corps .= '<div class="encart ok"><strong>Catalogue importé avec succès ✅</strong>'
                    . '<p>'
                    . $resultImport['produits'] . ' produit(s), '
                    . $resultImport['categories'] . ' catégorie(s), '
                    . $resultImport['marques'] . ' marque(s) importés en base.'
                    . '</p>'
                    . '<p>Vous pouvez les modifier ou les supprimer depuis l\'administration. '
                    . 'Pour ré-importer plus tard (idempotent) : '
                    . '<code>php api/tools/importer-donnees-front.php</code></p>'
                    . '</div>';
            } else {
                $erreur = $resultImport['erreur'] ?? 'Erreur inconnue.';
                $corps .= '<div class="encart alerte"><strong>Import du catalogue : non abouti</strong>'
                    . '<p>' . self::h($erreur) . '</p>'
                    . '<p>Votre boutique est néanmoins installée et fonctionnelle. '
                    . 'Vous pouvez importer le catalogue plus tard avec la commande :<br>'
                    . '<code>php api/tools/importer-donnees-front.php</code></p>'
                    . '</div>';
            }
        } else {
            $corps .= '<div class="encart info"><strong>Boutique vide</strong>'
                . '<p>Vous avez choisi de démarrer sans produits de démonstration. '
                . 'Ajoutez vos propres produits depuis l\'administration, ou importez le catalogue '
                . 'de démonstration plus tard avec :<br>'
                . '<code>php api/tools/importer-donnees-front.php</code></p>'
                . '</div>';
        }

        // ---- Où sont les choses -----------------------------------------------
        $corps .= '<h3>Où sont vos données</h3><table class="constats"><tbody>'
            . self::ligne('Moteur de base de données', Diagnostic::nomPilote($pilote))
            . self::ligne('Dossier de données', $emplacement->chemin
                . ($emplacement->horsRacineWeb ? ' (hors de la partie publique du site)' : ' (DANS la partie publique — voir l\'alerte ci-dessus)'))
            . self::ligne('Sauvegardes', $prepare['backups'] ?? 'dossier non créé — à configurer plus tard')
            . self::ligne('Fichier de configuration', $env['chemin'] . ' (droits ' . $env['permissions'] . ')')
            . self::ligne('Mot de passe du propriétaire', 'enregistré en base sous forme d\'empreinte. '
                . 'Il n\'est écrit dans AUCUN fichier du serveur : il n\'y a rien à effacer.')
            . '</tbody></table>';

        // ---- Les fichiers cachés ont-ils survécu ? -----------------------------
        $corps .= '<h3>Fichiers de protection</h3>' . $this->tableauHtaccess();

        // ---- Compte rendu détaillé ---------------------------------------------
        $corps .= '<details><summary>Compte rendu détaillé de l\'installation</summary><pre>'
            . self::h(implode("\n", $this->journal)) . '</pre></details>';

        // ---- Le geste suivant ---------------------------------------------------
        $corps .= '<h3>Le geste suivant</h3>'
            . '<div class="encart info"><p>Ce fichier d\'installation ne sert plus à rien, et tant '
            . 'qu\'il est là, il reste une porte ouverte sur votre site. Le bouton ci-dessous le '
            . 'supprime pour vous et vérifie qu\'il a bien disparu.</p>'
            . '<form method="post" action="">'
            . '<input type="hidden" name="action" value="supprimer">'
            . '<input type="hidden" name="jeton" value="' . self::h($jeton) . '">'
            . '<button type="submit" class="bouton">Supprimer le fichier d\'installation</button>'
            . '</form></div>'
            . '<p>Ensuite, connectez-vous à votre administration avec l\'adresse e-mail et le mot de '
            . 'passe que vous venez de choisir.</p>'
            . '<p style="margin-top:16px;"><a class="bouton" href="../admin">Accéder à l\'administration & Assistant &rarr;</a></p>';

        $this->rendre('Installation terminée', $corps, 200);
    }

    // =================================================================
    // Auto-suppression et refus
    // =================================================================

    private function supprimerInstallateur(): never
    {
        if (!$this->garde->consommerJeton(isset($_POST['jeton']) ? (string) $_POST['jeton'] : null)) {
            $this->rendre(
                'Suppression refusée',
                '<h1>Demande non valide</h1><div class="encart alerte"><p>Cette demande ne portait '
                . 'pas de jeton de sécurité valide. Rien n\'a été supprimé.</p></div>'
                . '<p><a class="bouton" href="?">Recharger la page</a></p>',
                403,
            );
        }

        $fichier = $this->racineApi . '/install.php';
        @unlink($fichier);
        clearstatcache(true, $fichier);

        if (!is_file($fichier)) {
            $this->garde->oublier();
            $this->rendre(
                'Fichier d\'installation supprimé',
                '<h1>C\'est fait</h1>'
                . '<div class="encart ok"><p>Le fichier <code>api/install.php</code> a été supprimé, '
                . 'et sa disparition est vérifiée : cette adresse ne répond plus.</p></div>'
                . '<p>Votre boutique est prête. Connectez-vous à votre administration avec l\'adresse '
                . 'e-mail et le mot de passe choisis pendant l\'installation pour finaliser la configuration :</p>'
                . '<p style="margin-top:16px;"><a class="bouton" href="../admin">Accéder à l\'administration &rarr;</a></p>',
                200,
            );
        }

        $this->rendre(
            'Suppression impossible',
            '<h1>Le fichier n\'a pas pu être supprimé</h1>'
            . '<div class="encart alerte"><p>Votre hébergeur n\'autorise pas PHP à effacer ce '
            . 'fichier. Il faut le faire à la main.</p>'
            . '<p><strong>Comment :</strong> ouvrez le gestionnaire de fichiers de votre hébergeur, '
            . 'allez dans le dossier <code>public_html/api/</code>, faites un clic droit sur '
            . '<code>install.php</code> et choisissez « Supprimer ». Rechargez ensuite cette page : '
            . 'elle ne doit plus s\'afficher.</p>'
            . '<p>En attendant, l\'installation étant déjà faite, cette page refuse de recommencer '
            . 'quoi que ce soit — mais un fichier absent protège mieux qu\'un refus.</p></div>',
            500,
        );
    }

    private function ecranDejaInstalle(string $temoin): never
    {
        $jeton = $this->garde->emettreJeton();
        $quand = trim((string) @file_get_contents($temoin));

        $this->rendre(
            'Installation déjà effectuée',
            '<h1>Installation déjà effectuée</h1>'
            . '<div class="encart alerte"><p>Cette boutique est déjà installée'
            . ($quand !== '' ? ' (' . self::h($quand) . ')' : '') . '.</p>'
            . '<p>L\'assistant <strong>refuse</strong> de recommencer : il détruirait la '
            . 'configuration en place et les données de vos clients, sans prévenir. Aucun '
            . 'formulaire n\'est proposé sur cette page.</p></div>'
            . '<div class="encart info"><p>Il reste une chose à faire : supprimer ce fichier '
            . 'd\'installation, qui n\'a plus d\'usage.</p>'
            . '<form method="post" action="">'
            . '<input type="hidden" name="action" value="supprimer">'
            . '<input type="hidden" name="jeton" value="' . self::h($jeton) . '">'
            . '<button type="submit" class="bouton">Supprimer le fichier d\'installation</button>'
            . '</form></div>'
            . '<p class="aide">Réinstaller volontairement (cela suppose une base vide) : supprimez le '
            . 'fichier <code>api/installed.lock</code> depuis le gestionnaire de fichiers de votre '
            . 'hébergeur.</p>'
            . '<p style="margin-top:16px;"><a class="bouton" href="../admin">Accéder à l\'administration &rarr;</a></p>',
            403,
        );
    }

    // =================================================================
    // Rendu
    // =================================================================

    private function tableauHtaccess(): string
    {
        $racineSite = \dirname($this->racineApi);
        $lignes = '';

        foreach ([
            'À la racine du site' => $racineSite . '/.htaccess',
            'Dans le dossier api/' => $this->racineApi . '/.htaccess',
        ] as $libelle => $chemin) {
            $present = is_file($chemin);
            $lignes .= '<tr class="' . ($present ? 'ok' : 'alerte') . '"><th scope="row">'
                . self::h($libelle) . '</th><td><span class="pastille ' . ($present ? 'ok' : 'alerte') . '">'
                . self::symbole($present ? 'ok' : 'alerte') . '</span> '
                . ($present ? 'présent' : 'ABSENT')
                . ($present ? '' : '<p class="conseil">Ce fichier commence par un point : beaucoup '
                    . 'd\'outils de téléversement et de décompression l\'ignorent en silence. Sans '
                    . 'lui, les adresses de votre site renverront des erreurs et le code de l\'API '
                    . 'deviendra téléchargeable. Téléversez-le à nouveau depuis le paquet '
                    . 'd\'installation.</p>')
                . '</td></tr>';
        }

        return '<table class="constats"><tbody>' . $lignes . '</tbody></table>';
    }

    private function fil(int $etape): string
    {
        $noms = [1 => 'Diagnostic', 2 => 'Vos informations', 3 => 'Résultat'];
        $html = '<ol class="fil">';
        foreach ($noms as $numero => $nom) {
            $classe = $numero === $etape ? 'courante' : ($numero < $etape ? 'faite' : '');
            $html .= '<li class="' . $classe . '"><span>' . $numero . '</span> ' . self::h($nom) . '</li>';
        }

        return $html . '</ol>';
    }

    private static function ligne(string $titre, string $valeur): string
    {
        return '<tr><th scope="row">' . self::h($titre) . '</th><td>' . self::h($valeur) . '</td></tr>';
    }

    /** @param array<string,list<string>> $erreurs */
    private static function champ(
        string $nom,
        string $libelle,
        string $valeur,
        string $type,
        array $erreurs,
        ?string $aide = null,
        ?string $variable = null,
    ): string {
        $enErreur = isset($erreurs[$nom]);

        return '<p class="champ' . ($enErreur ? ' en-erreur' : '') . '">'
            . '<label for="c-' . self::h($nom) . '">' . self::h($libelle)
            . ($variable !== null ? ' <span class="var">' . self::h($variable) . '</span>' : '')
            . '</label>'
            . '<input id="c-' . self::h($nom) . '" name="' . self::h($nom) . '" type="' . self::h($type) . '"'
            // Un champ de mot de passe n'est JAMAIS pré-rempli : sa valeur ne
            // doit pas revenir dans le HTML, même la sienne propre.
            . ($type === 'password' ? '' : ' value="' . self::h($valeur) . '"')
            . ($type === 'password' ? ' autocomplete="new-password"' : ' autocomplete="off"')
            . ' spellcheck="false">'
            . ($aide !== null ? '<span class="aide">' . self::h($aide) . '</span>' : '')
            . self::erreursDe($erreurs, $nom)
            . '</p>';
    }

    /** @param array<string,list<string>> $erreurs */
    private static function erreursDe(array $erreurs, string $nom): string
    {
        if (!isset($erreurs[$nom])) {
            return '';
        }

        $html = '<ul class="erreurs">';
        foreach ($erreurs[$nom] as $message) {
            $html .= '<li>' . self::h($message) . '</li>';
        }

        return $html . '</ul>';
    }

    private static function symbole(string $etat): string
    {
        return match ($etat) {
            Diagnostic::OK => '✅',
            Diagnostic::ALERTE => '⛔',
            default => '❔',
        };
    }

    private static function h(string $texte): string
    {
        return htmlspecialchars($texte, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function rendre(string $titre, string $corps, int $statut): never
    {
        if (!headers_sent()) {
            http_response_code($statut);
            header('Content-Type: text/html; charset=utf-8');
            // Une page qui contient un jeton et l'état d'un serveur n'a rien à
            // faire dans un cache, ni dans l'historique d'un proxy.
            header('Cache-Control: no-store, max-age=0');
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: DENY');
            header('Referrer-Policy: no-referrer');
        }

        echo self::page($titre, $corps);

        while (ob_get_level() > 0) {
            ob_end_flush();
        }

        exit($statut === 200 ? 0 : 1);
    }

    private static function page(string $titre, string $corps): string
    {
        return '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="robots" content="noindex, nofollow">'
            . '<title>' . self::h($titre) . ' — KA Tech</title><style>' . self::STYLE . '</style>'
            . '</head><body><main>' . $corps . '</main></body></html>';
    }

    /**
     * Feuille de style embarquée. Aucune ressource externe : ni police, ni
     * script, ni image. La page doit s'afficher sur un hébergement tout neuf,
     * derrière un DNS à peine propagé, sans dépendre d'un tiers.
     */
    private const STYLE = <<<'CSS'
    :root{--fond:#f6f7f9;--texte:#1c2430;--doux:#5b6675;--trait:#dfe3e8;--ok:#0f7a45;--okf:#e8f5ee;
    --alerte:#b3261e;--alertef:#fdecea;--info:#0b4f8a;--infof:#e8f1fa;--inconnu:#8a6d1f;--inconnuf:#fdf6e3}
    *{box-sizing:border-box}
    body{margin:0;background:var(--fond);color:var(--texte);
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
    main{max-width:52rem;margin:0 auto;padding:2rem 1.25rem 5rem;background:#fff;
    box-shadow:0 0 0 1px var(--trait)}
    h1{font-size:1.7rem;line-height:1.25;margin:0 0 .5rem}
    h2{font-size:1.25rem;margin:2rem 0 .75rem;padding-bottom:.35rem;border-bottom:2px solid var(--trait)}
    h3{font-size:1.05rem;margin:1.75rem 0 .5rem}
    p{margin:.6rem 0}
    code{background:#f0f2f5;padding:.1em .35em;border-radius:3px;font-size:.9em;word-break:break-all}
    .chapeau{color:var(--doux)}
    .aide{color:var(--doux);font-size:.88rem;display:block}
    .var{color:var(--doux);font-size:.78rem;font-family:ui-monospace,monospace}
    ol.fil{display:flex;gap:.5rem;list-style:none;padding:0;margin:1.25rem 0 0;flex-wrap:wrap}
    ol.fil li{flex:1 1 8rem;font-size:.85rem;color:var(--doux);border-top:3px solid var(--trait);padding-top:.4rem}
    ol.fil li span{display:inline-block;min-width:1.4rem;text-align:center;border-radius:50%;
    background:var(--trait);color:#fff;font-weight:700}
    ol.fil li.courante{color:var(--texte);font-weight:600;border-top-color:var(--info)}
    ol.fil li.courante span{background:var(--info)}
    ol.fil li.faite{border-top-color:var(--ok)}
    ol.fil li.faite span{background:var(--ok)}
    table.constats{width:100%;border-collapse:collapse;margin:.5rem 0 1rem}
    table.constats th{text-align:start;font-weight:500;width:42%;vertical-align:top;
    padding:.6rem .75rem .6rem 0;border-top:1px solid var(--trait)}
    table.constats td{vertical-align:top;padding:.6rem 0;border-top:1px solid var(--trait)}
    tr.alerte th,tr.alerte td{background:var(--alertef)}
    .pastille{margin-inline-end:.3rem}
    .conseil{color:var(--doux);font-size:.88rem;margin:.35rem 0 0}
    .encart{border-inline-start:4px solid var(--trait);background:#fafbfc;padding:.85rem 1rem;margin:1rem 0}
    .encart.ok{border-color:var(--ok);background:var(--okf)}
    .encart.alerte{border-color:var(--alerte);background:var(--alertef)}
    .encart.info{border-color:var(--info);background:var(--infof)}
    .encart.inconnu{border-color:var(--inconnu);background:var(--inconnuf)}
    .verdict{font-size:1.05rem;font-weight:600;padding:.85rem 1rem;margin:1rem 0}
    .verdict.ok{background:var(--okf);color:var(--ok)}
    .verdict.alerte{background:var(--alertef);color:var(--alerte)}
    fieldset{border:1px solid var(--trait);margin:1.25rem 0;padding:1rem 1.25rem 1.25rem}
    legend{font-weight:600;padding:0 .4rem}
    .champ{display:block;margin:.9rem 0}
    .champ label{display:block;font-weight:500;margin-bottom:.25rem}
    .champ input{width:100%;padding:.55rem .65rem;border:1px solid #aab2bd;border-radius:4px;
    font-size:1rem;background:#fff;color:var(--texte)}
    .champ.en-erreur input{border-color:var(--alerte);background:var(--alertef)}
    .choix{display:block;margin:.4rem 0}
    ul.erreurs{margin:.4rem 0 0;padding-inline-start:1.1rem;color:var(--alerte);font-size:.9rem}
    ul.essais{margin:.5rem 0 0;padding-inline-start:1.1rem;font-size:.88rem}
    .bouton{display:inline-block;background:var(--info);color:#fff;border:0;border-radius:4px;
    padding:.7rem 1.4rem;font-size:1rem;font-weight:600;cursor:pointer;text-decoration:none}
    .bouton:hover{filter:brightness(1.12)}
    details{margin:1.25rem 0}
    summary{cursor:pointer;font-weight:600}
    pre{background:#f0f2f5;padding:.8rem;overflow-x:auto;font-size:.85rem;white-space:pre-wrap;
    word-break:break-word}
    CSS;
}
