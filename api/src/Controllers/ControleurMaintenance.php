<?php

/**
 * Maintenance — état de la base, sauvegarde téléchargeable, migration de pilote.
 *
 * Routes à câbler par l'orchestrateur (ne pas modifier api/routes.php ici) :
 *   GET  /maintenance/status    → etat()
 *   GET  /maintenance/backup    → sauvegarder()
 *   POST /maintenance/migrate   → migrer()
 *
 * Réservé au rôle `owner` exclusivement.
 *
 * POURQUOI CE CONTRÔLEUR EXISTE.
 * La sécurité des données est la priorité explicite du propriétaire (hébergement
 * mutualisé, pas de SSH). Ces routes lui permettent de constater l'état de sa
 * base, d'en télécharger une sauvegarde et d'en migrer le contenu vers un autre
 * moteur, sans quitter son navigateur.
 *
 * ---------------------------------------------------------------------------
 * UNE SEULE LOGIQUE DE SAUVEGARDE — et pourquoi ce fichier n'en porte plus
 * ---------------------------------------------------------------------------
 * Ce contrôleur a longtemps RÉIMPLÉMENTÉ la sauvegarde : son propre export
 * MySQL, son propre instantané SQLite, sa propre vérification. Les deux
 * versions ont divergé, exactement comme il fallait s'y attendre. Pendant que
 * `api/tools/sauvegarder.php` apprenait à vérifier le CONTENU (empreintes par
 * table, inscrites dans le fichier, capables de rejuger une archive), le
 * contrôleur en restait à l'intégrité structurelle et au comptage de tables :
 * une sauvegarde amputée d'une ligne y passait sans un mot. Le commerçant
 * utilisait le chemin le moins sûr — celui-là même que personne ne testait —
 * et il ne savait pas exporter une base PostgreSQL du tout.
 *
 * Il n'y a donc plus ici la moindre ligne d'export ni de vérification. La route
 * `/maintenance/backup` DÉLÈGUE à `api/tools/sauvegarder.php`, l'outil éprouvé,
 * puis se contente de renvoyer au navigateur le fichier qu'il a produit et
 * validé. Un seul algorithme, un seul jeu de garanties, trois pilotes.
 *
 * COMMENT, PUISQUE L'OUTIL REFUSE D'ÊTRE APPELÉ EN HTTP.
 * Sa garde (§ GARDE D'EXÉCUTION) refuse un SAPI web ou la présence de variables
 * de requête HTTP. Elle protège contre l'appel de son URL par un navigateur —
 * et elle a raison : ce script ne doit jamais être une page. Elle n'interdit
 * pas, en revanche, qu'un processus PHP le lance EN LIGNE DE COMMANDE, ce qui
 * est précisément le contexte pour lequel il est écrit. Le contrôleur ouvre
 * donc un processus fils `php api/tools/sauvegarder.php …`, avec un
 * environnement construit par LISTE BLANCHE : aucune variable de requête ne
 * traverse, la garde est respectée dans sa lettre comme dans son intention.
 * `require` était impossible (le fichier s'exécute à l'inclusion et sortirait
 * en 403 avant tout) ; le sous-processus est la réutilisation propre.
 *
 * CE QUE ÇA COÛTE, ET CE QUE ÇA ÉVITE.
 * Il faut un binaire PHP en ligne de commande et `proc_open`. Sur un mutualisé
 * qui interdit l'un ou l'autre, la route échoue — bruyamment, en nommant la
 * cause et le geste correctif (installer le CRON documenté). C'est un choix
 * assumé : une sauvegarde produite par un second chemin non éprouvé est
 * exactement l'accident dont ce commentaire décrit la réparation. Mieux vaut
 * un écran qui dit « utilisez le CRON » qu'un fichier auquel on ne peut pas
 * se fier. `PHP_CLI_BINARY` (api/.env) permet de nommer le binaire quand il
 * n'est pas dans le PATH — cas fréquent : `/usr/local/bin/php8.2`.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Garde;
use KaTech\Db;
use KaTech\Installation\ImporteurDonneesFront;
use KaTech\Migration\Migrateur;
use KaTech\Migration\Rapport;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurMaintenance
{
    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /maintenance/status
     *
     * Tableau de bord d'un coup d'œil pour le propriétaire :
     *   - pilote actif et nom de la base (JAMAIS le DSN complet ni le mot de passe)
     *   - taille de la base en octets (null si indisponible)
     *   - taille lisible (« 4.2 Mo ») pour l'affichage direct
     *   - liste ordonnée des tables avec leur nombre de lignes
     *   - événements outbox en attente
     *   - date de la dernière sauvegarde sur disque (ou null si aucune)
     *
     * Choix de `size` : on renvoie DEUX formes — `size` (entier, octets) et
     * `sizeHuman` (chaîne lisible). L'interface utilise `sizeHuman` pour
     * l'affichage ; `size` sert aux tests automatisés et aux comparaisons.
     * Un seul champ string aurait masqué la valeur brute et rendu les tests
     * fragiles ; un seul entier aurait obligé le frontend à formater lui-même.
     *
     * → { data: { driver, database, size, sizeHuman, tables: [{name, rows}],
     *             outboxPending, lastBackup } }
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     */
    public function etat(Requete $r): Reponse
    {
        // Un admin ne peut pas exfiltrer les informations de la base : seul l'owner passe.
        Garde::exiger('owner');

        $pilote = $this->db->pilote();

        // ---------- Identification de la base (sans exposer de secret) ----------
        // UNE BRANCHE PAR PILOTE, sans branche par défaut. Le « si SQLite, sinon
        // c'est forcément MySQL » qui régnait ici envoyait `SELECT DATABASE()`
        // — fonction MySQL — à PostgreSQL, qui répond « function database() does
        // not exist » : l'écran Développeur était en panne sèche sur une
        // boutique en pgsql. Un quatrième pilote ajouté à `Db::PILOTES` lèvera
        // ici une `UnhandledMatchError` visible, plutôt que d'emprunter en
        // silence le dialecte d'un autre moteur (même règle qu'install.php).
        [$nomBase, $tailleOctets] = match ($pilote) {
            Db::PILOTE_SQLITE => $this->identiteSqlite(),
            Db::PILOTE_MYSQL => $this->identiteMysql(),
            Db::PILOTE_PGSQL => $this->identitePgsql(),
        };

        // ---------- Nombre de lignes par table (tableau ordonné pour l'interface) ----------
        // L'interface affiche une liste ordonnée, pas une carte nom→nombre.
        // Chaque élément est { name, rows } pour la lisibilité côté frontend.
        $tables = $this->tablesEnListe();

        // ---------- Événements outbox en attente ----------
        // « En attente » = status = 'pending', peu importe available_at.
        // Le propriétaire voit TOUS les pending, y compris ceux en recul progressif,
        // car un événement bloqué depuis longtemps est une anomalie à diagnostiquer.
        $outboxEnAttente = (int) $this->db->valeur(
            "SELECT COUNT(*) FROM outbox WHERE status = 'pending'"
        );

        // ---------- Dernière sauvegarde ----------
        // On cherche dans le dossier BACKUP_DIR les fichiers produits par l'outil
        // (préfixe « katech- »). Si le dossier est absent ou vide, on dit null sans
        // planter : une absence d'information vaut mieux qu'une exception.
        $derniereSauvegarde = $this->derniereDate();

        return Reponse::ok([
            'driver'       => $pilote,
            'database'     => $nomBase,
            'path'         => $pilote === Db::PILOTE_SQLITE ? (string) $this->db->cheminSqlite() : null,
            'size'         => $tailleOctets,
            'sizeHuman'    => $tailleOctets !== null ? $this->tailleLisible($tailleOctets) : null,
            'tables'       => $tables,
            'outboxPending' => $outboxEnAttente,
            'lastBackup'   => $derniereSauvegarde,
        ]);
    }

    /**
     * GET /maintenance/backup
     *
     * Produit une sauvegarde de la base et l'envoie au navigateur en
     * téléchargement. Aucun fichier n'est conservé sur le serveur.
     *
     * CE QUE FAIT RÉELLEMENT CETTE MÉTHODE : presque rien. Elle demande à
     * `api/tools/sauvegarder.php` de produire la sauvegarde dans un dossier
     * temporaire privé, lui demande ensuite de la REJUGER (`--verifier=…`),
     * et n'envoie le fichier que si les deux étapes ont réussi. Voir l'en-tête
     * de ce fichier pour le pourquoi de cette délégation.
     *
     * Garanties, toutes tenues par l'outil et non par ce contrôleur :
     *   1. Cohérence     — SQLite : « VACUUM INTO » ou `SQLite3::backup()`,
     *                      jamais une copie brute. MySQL : transaction
     *                      REPEATABLE READ avec instantané cohérent.
     *                      PostgreSQL : REPEATABLE READ READ ONLY (MVCC).
     *   2. Vérification  — par le CONTENU, empreinte par empreinte, table par
     *                      table. Une sauvegarde amputée d'une seule ligne est
     *                      REFUSÉE, et rien n'est envoyé au navigateur.
     *   3. Trois pilotes — y compris PostgreSQL/Supabase, que l'ancienne
     *                      version de cette route ne savait pas exporter.
     *   4. Nom parlant   — `katech-AAAAMMJJ-HHMMSS.sqlite|.sql`, horodatage UTC,
     *                      exactement le nom que le CRON écrit dans BACKUP_DIR.
     *
     * FICHIER TRONQUÉ EN COURS DE TRANSFERT.
     * Le pire scénario reste un fichier incomplet que le propriétaire croit
     * valide. Trois éléments le rendent détectable, et c'est un progrès sur
     * l'état antérieur où l'export MySQL partait sans taille annoncée :
     *   a) `Content-Length` est TOUJOURS posé — la taille est connue puisque le
     *      fichier existe entièrement avant le premier octet envoyé. Un
     *      navigateur signale un téléchargement plus court que l'annonce ;
     *   b) `X-KaTech-Backup-SHA256` permet une vérification manuelle après
     *      téléchargement (`sha256sum` / « Get-FileHash ») ;
     *   c) le fichier lui-même porte ses empreintes et son marqueur de fin :
     *      `php api/tools/sauvegarder.php --verifier=…` rejuge l'archive des
     *      mois plus tard, sans la restaurer.
     *
     * Cette méthode NE RETOURNE PAS de Reponse : elle écrit le corps sur la
     * sortie PHP puis arrête l'exécution. C'est le seul endroit du projet où un
     * contrôleur sort du cycle Requete → Reponse, justifié par la nature
     * binaire du téléchargement.
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 503 si la sauvegarde échoue ou est refusée
     * @return never
     */
    public function sauvegarder(Requete $r): never
    {
        // Un admin ne peut pas exfiltrer l'intégralité de la base : seul l'owner passe.
        Garde::exiger('owner');

        $dossier = $this->dossierTemporaire();

        try {
            $fichier = $this->produireSauvegarde($dossier);
            $this->verifierSauvegarde($fichier);
        } catch (\Throwable $e) {
            // Aucun octet n'a encore été écrit : on peut encore répondre en
            // JSON. Le dossier temporaire part avec l'échec — une sauvegarde
            // refusée ne doit surtout pas rester traîner sur le disque, où
            // quelqu'un finirait par la prendre pour bonne.
            $this->effacerDossier($dossier);

            throw $e;
        }

        $this->envoyerFichier($fichier, $dossier);
    }

    /**
     * POST /maintenance/migrate
     *
     * Lance une migration de la base courante vers une base cible.
     *
     * Corps attendu :
     *   { cible, dsn, utilisateur, motDePasse, simulation: boolean }
     *
     * `cible` est une étiquette libre (« mysql-prod », « postgres-backup »…),
     * transmise telle quelle au rapport pour l'identifier. `dsn` est le DSN PDO
     * de la base destinataire.
     *
     * SIMULATION PAR DÉFAUT ET PAR REPLI.
     * Si `simulation` est absent, non booléen, ou ambigu, on simule. Jamais
     * l'inverse. Un commerçant sans second exemplaire de ses données ne peut
     * pas se permettre une écriture accidentelle.
     *
     * IDENTIFIANTS.
     * `dsn`, `utilisateur` et `motDePasse` transitent dans le corps. Ils ne
     * sont jamais journalisés, ni retournés dans la réponse, ni inclus dans un
     * message d'erreur. En cas d'erreur de connexion, on distingue :
     *   - refus de connexion (hôte joignable, identifiants rejetés)
     *   - hôte injoignable ou DSN malformé
     *   - budget épuisé (max_execution_time)
     * sans jamais copier le DSN dans la réponse.
     *
     * BUDGET DE TEMPS.
     * Le Migrateur annule TOUT si le budget (25 s par défaut) est épuisé, et le
     * dit explicitement dans le rapport. La simulation mesure la durée de la
     * passe de lecture : si elle dépasse le budget, la migration réelle
     * l'épuisera aussi — l'interface doit l'afficher.
     *
     * → { data: { simulation, ok, message, tables: [{nom, lues, ecrites, anomalies}] } }
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 422 si le DSN est absent ou le corps invalide
     */
    public function migrer(Requete $r): Reponse
    {
        // Seul le propriétaire peut déclencher une migration : elle touche à la
        // structure et au contenu COMPLET de la base.
        Garde::exiger('owner');

        // ---------- Lecture et validation des paramètres ----------
        $dsn = trim((string) ($r->corps('dsn', '')));
        if ($dsn === '') {
            throw ApiException::validation('Paramètres de migration invalides.', [
                'dsn' => ['Le DSN de la base cible est obligatoire.'],
            ]);
        }

        $utilisateur = (string) ($r->corps('utilisateur', '') ?? '');
        // Le mot de passe n'est pas journalisé ; null est une valeur légitime
        // pour SQLite (qui n'en exige pas).
        $motDePasseBrut = $r->corps('motDePasse');
        $motDePasse = ($motDePasseBrut === null || $motDePasseBrut === '') ? null : (string) $motDePasseBrut;

        // Comportement par défaut : SIMULATION.
        // On n'accepte `false` que si le champ est explicitement un booléen
        // false (JSON) ou la chaîne stricte « false ». Tout le reste simule.
        $simulationBrut = $r->corps('simulation');
        $simulation = $this->normaliserBooleanSimulation($simulationBrut);

        $etiquetteCible = trim((string) ($r->corps('cible', '') ?? ''));
        if ($etiquetteCible === '') {
            $etiquetteCible = 'cible';
        }

        // ---------- Connexion à la base cible ----------
        // Les erreurs de connexion sont capturées ici pour distinguer le refus
        // d'identifiants (message utile) d'une panne réseau (message différent),
        // sans jamais répercuter le DSN dans la réponse.
        try {
            $pdoCible = Migrateur::connecter($dsn, $utilisateur ?: null, $motDePasse);
        } catch (\RuntimeException $e) {
            // Le message de l'exception peut contenir « dsn masqué » grâce à
            // Migrateur::masquer(), mais on préfère une phrase propre qui ne
            // trahit aucun secret.
            $messageErreur = $this->traduireErreurConnexion($e->getMessage());

            throw new ApiException(
                422,
                'MIGRATION_CONNEXION_ECHEC',
                $messageErreur
            );
        }

        // ---------- Connexion à la base source ----------
        $pdoSource = $this->db->pdo();

        // ---------- Exécution ----------
        $mode = $simulation ? Rapport::MODE_SIMULATION : Rapport::MODE_REELLE;

        $migrateur = new Migrateur($pdoSource, $pdoCible, [
            'mode' => $mode,
            // La création du schéma n'est pas proposée ici : l'interface de
            // migration est réservée aux bases déjà installées. Forcer
            // creer_schema depuis le web ouvrirait des DDL non maîtrisés.
            'creer_schema' => false,
            // Budget légèrement en dessous de la limite mutualisée (30 s) pour
            // laisser le temps de retourner la réponse proprement.
            'budget_s' => 25.0,
            'etiquette_source' => $this->db->pilote(),
            'etiquette_cible' => $etiquetteCible,
        ]);

        $resultat = $migrateur->executer();

        // ---------- Projection de la réponse ----------
        // On renvoie le strict nécessaire pour l'interface, sans les DSN, sans
        // les descripteurs source/cible (qui pourraient contenir le nom de la
        // base cible et des détails de connexion).
        // Les anomalies sont regroupées par table pour être RENDUES, pas
        // seulement comptées. « 1 anomalie » sans son libellé est une alerte
        // qu'on ne peut pas traiter : le propriétaire voit qu'il y a un
        // problème, sans aucun moyen de savoir lequel ni s'il peut migrer
        // malgré tout. C'est le défaut « une erreur est survenue », déjà
        // corrigé ailleurs dans ce projet, sous une autre forme.
        $parTable = [];
        foreach ((array) ($resultat['anomalies'] ?? []) as $a) {
            $table = (string) ($a['table'] ?? '');
            if ($table === '') {
                continue;
            }
            $parTable[$table][] = [
                'gravite' => (string) ($a['gravite'] ?? 'avertissement'),
                // Même filtre que le motif d'échec : une anomalie peut citer la
                // base cible, et cette réponse repart vers le navigateur.
                'message' => $this->sansDsn((string) ($a['message'] ?? '')),
            ];
        }

        $tablesReponse = array_map(
            fn (array $t): array => [
                'nom'       => (string) $t['table'],
                'lues'      => (int) $t['lues'],
                'ecrites'   => (int) $t['ecrites'],
                'anomalies' => (int) $t['anomalies'],
                'details'   => $parTable[(string) $t['table']] ?? [],
            ],
            (array) ($resultat['tables'] ?? [])
        );

        $ok = (bool) ($resultat['ok'] ?? false);

        // Le motif d'échec est exposé uniquement s'il est défini et ne contient
        // pas de DSN. Migrateur::masquer() protège les cas connus, mais une
        // erreur interne peut passer. On filtre prudemment.
        $message = $this->sansDsn((string) ($resultat['motif'] ?? ''));
        if ($message === '' && $ok) {
            $message = $simulation
                ? 'Simulation terminée sans erreur bloquante.'
                : 'Migration terminée avec succès.';
        }

        return Reponse::ok([
            'simulation' => $simulation,
            'ok'         => $ok,
            'message'    => $message,
            'tables'     => $tablesReponse,
        ]);
    }

    /**
     * POST /maintenance/import-catalogue
     *
     * Importe le catalogue de démonstration dans la base courante.
     *
     * POURQUOI CETTE ROUTE EXISTE.
     * L'import par le sous-processus CLI échoue systématiquement sur les
     * hébergements mutualisés (proc_open désactivé, PHP absent du PATH web).
     * Cette route appelle directement ImporteurDonneesFront, une classe PHP
     * pure sans aucune dépendance à l'environnement CLI.
     *
     * IDEMPOTENCE.
     * ImporteurDonneesFront utilise des upserts par clé : rejouer l'import
     * n'écrase que les champs gérés et ne double rien. Le commerçant peut
     * utiliser ce bouton pour réinitialiser le catalogue à tout moment.
     *
     * → { data: { ok, produits, categories, marques, details, erreur } }
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 503 si le fichier JSON source est absent
     */
    public function importerCatalogue(Requete $r): Reponse
    {
        Garde::exiger('owner');

        // Le fichier JSON est produit par `bun run scripts/extraire-donnees-front.ts`
        // et doit être présent dans le paquet d'installation.
        $cheminJson = dirname(__DIR__, 2) . '/tools/donnees-front.json';

        if (!is_file($cheminJson)) {
            throw new ApiException(503, 'IMPORT_ERROR',
                "Le fichier api/tools/donnees-front.json est absent du serveur. "
                . "Il doit être téléversé avec le dossier api/tools/."
            );
        }

        $importeur = new ImporteurDonneesFront($cheminJson, $this->db);
        $resultat  = $importeur->importer();

        if (!$resultat['ok']) {
            throw new ApiException(503, 'IMPORT_ERROR',
                $resultat['erreur'] ?? "L'import a échoué."
            );
        }

        return Reponse::ok([
            'ok'         => true,
            'produits'   => $resultat['produits'],
            'categories' => $resultat['categories'],
            'marques'    => $resultat['marques'],
        ]);
    }

    /**
     * POST /maintenance/reset
     *
     * Corps attendu :
     *   { action: 'clear' | 'reset', target: string }
     */
    public function reinitialiser(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $action = (string) ($r->json['action'] ?? 'clear');
        $target = (string) ($r->json['target'] ?? 'all');

        if (!in_array($action, ['clear', 'reset'], true)) {
            throw ApiException::requeteInvalide("Action inconnue « {$action} ». Valeurs permises : 'clear', 'reset'.");
        }

        $rapport = [
            'action' => $action,
            'target' => $target,
            'counts' => [],
        ];

        $cheminJson = dirname(__DIR__, 2) . '/tools/donnees-front.json';

        $this->db->transaction(function (Db $d) use ($action, $target, $cheminJson, &$rapport): void {
            if ($d->estSqlite()) {
                $d->run('PRAGMA foreign_keys = OFF');
            } elseif ($d->estMysql()) {
                $d->run('SET FOREIGN_KEY_CHECKS = 0');
            }

            try {
                if ($action === 'clear') {
                    $this->executerVidage($d, $target, $rapport);
                } else {
                    $this->executerReinitialisation($d, $target, $cheminJson, $rapport);
                }
            } finally {
                if ($d->estSqlite()) {
                    $d->run('PRAGMA foreign_keys = ON');
                } elseif ($d->estMysql()) {
                    $d->run('SET FOREIGN_KEY_CHECKS = 1');
                }
            }
        });

        if (class_exists('KaTech\\Journal')) {
            \KaTech\Journal::consigner($this->db, 'reinitialisation_maintenance', 'systeme', [
                'action' => $action,
                'target' => $target,
                'counts' => $rapport['counts'],
            ]);
        }

        return Reponse::ok([
            'ok'      => true,
            'message' => "Opération {$action} exécutée avec succès sur {$target}.",
            'action'  => $action,
            'target'  => $target,
            'counts'  => $rapport['counts'],
        ]);
    }

    private function executerVidage(Db $d, string $target, array &$rapport): void
    {
        $viderTable = function (string $table) use ($d, &$rapport): void {
            $cnt = (int) $d->valeur("SELECT COUNT(*) FROM `{$table}`");
            $d->run("DELETE FROM `{$table}`");
            $rapport['counts'][$table] = $cnt;
        };

        $viderSectionContenu = function (string $cle) use ($d, &$rapport): void {
            $sectionMap = [
                'homeReviews' => 'home-reviews',
                'tickerMessages' => 'ticker',
                'marqueeBrands' => 'marquee',
                'aboutValues' => 'about',
                'builderSteps' => 'builder',
            ];
            $sec = $sectionMap[$cle] ?? $cle;
            $payloadDefaut = $sec === 'home-reviews' ? '{"items":[]}' : '[]';
            $d->run("UPDATE site_content SET payload = :p WHERE section = :s", [':p' => $payloadDefaut, ':s' => $sec]);
            $rapport['counts'][$cle] = 1;
        };

        switch ($target) {
            case 'products':
                $viderTable('stock_movements');
                $viderTable('products');
                break;
            case 'categories':
                $viderTable('categories');
                break;
            case 'brands':
                $viderTable('brands');
                break;
            case 'orders':
                $viderTable('order_items');
                $viderTable('orders');
                break;
            case 'customers':
                $viderTable('customers');
                break;
            case 'coupons':
                $viderTable('coupons');
                break;
            case 'reviews':
                $viderTable('reviews');
                break;
            case 'users':
                $cnt = (int) $d->valeur("SELECT COUNT(*) FROM users WHERE role != 'owner'");
                $d->run("DELETE FROM users WHERE role != 'owner'");
                $rapport['counts']['users'] = $cnt;
                break;
            case 'blogPosts':
                $viderTable('blog_posts');
                break;
            case 'homeReviews':
                $viderSectionContenu('homeReviews');
                break;
            case 'tickerMessages':
                $viderSectionContenu('tickerMessages');
                break;
            case 'marqueeBrands':
                $viderSectionContenu('marqueeBrands');
                break;
            case 'aboutValues':
                $viderSectionContenu('aboutValues');
                break;
            case 'builderSteps':
                $viderSectionContenu('builderSteps');
                break;
            case 'shippingRates':
                $viderTable('shipping_rates');
                break;
            case 'paymentMethods':
                $viderTable('payment_methods');
                break;
            case 'stockMovements':
                $viderTable('stock_movements');
                break;
            case 'mediaAssets':
                $viderTable('media_assets');
                break;
            case 'notifications':
                $viderTable('notifications');
                break;
            case 'auditLogs':
                $viderTable('audit_logs');
                break;
            case 'messages':
                $viderTable('messages');
                break;
            case 'subscribers':
                $viderTable('subscribers');
                break;
            case 'siteSettings':
                $defauts = json_encode([
                    'storeName' => 'KA Tech',
                    'currency' => 'DZD',
                    'maintenance' => false,
                    'onboardingCompleted' => true,
                ], JSON_UNESCAPED_UNICODE);
                $d->run("UPDATE settings SET payload = :p WHERE scope = 'site'", [':p' => $defauts]);
                $rapport['counts']['siteSettings'] = 1;
                break;
            case 'shippingSettings':
                $defauts = json_encode([
                    'homeDeliveryEnabled' => true,
                    'deskDeliveryEnabled' => true,
                    'freeShippingThreshold' => null,
                ], JSON_UNESCAPED_UNICODE);
                $d->run("UPDATE settings SET payload = :p WHERE scope = 'shipping'", [':p' => $defauts]);
                $rapport['counts']['shippingSettings'] = 1;
                break;
            case 'all':
                $viderTable('order_items');
                $viderTable('orders');
                $viderTable('customers');
                $viderTable('coupons');
                $viderTable('reviews');
                $viderTable('stock_movements');
                $viderTable('products');
                $viderTable('categories');
                $viderTable('brands');
                $viderTable('blog_posts');
                $viderTable('messages');
                $viderTable('subscribers');
                $viderTable('notifications');
                $viderTable('media_assets');
                $d->run("DELETE FROM users WHERE role != 'owner'");
                $d->run("UPDATE site_content SET payload = '[]' WHERE section IN ('ticker', 'marquee', 'about', 'builder')");
                $d->run("UPDATE site_content SET payload = '{\"items\":[]}' WHERE section = 'home-reviews'");
                break;
            default:
                throw ApiException::requeteInvalide("Cible de vidage inconnue « {$target} ».");
        }
    }

    private function executerReinitialisation(Db $d, string $target, string $cheminJson, array &$rapport): void
    {
        if (!is_file($cheminJson)) {
            throw new ApiException(503, 'IMPORT_ERROR', "Le fichier d'origine {$cheminJson} est introuvable.");
        }

        $importeur = new ImporteurDonneesFront($cheminJson, $d);

        if ($target === 'all') {
            $this->executerVidage($d, 'all', $rapport);
            $res = $importeur->importer();
            $rapport['counts']['catalogue_reinitialise'] = ($res['produits'] ?? 0) + ($res['categories'] ?? 0) + ($res['marques'] ?? 0);
            return;
        }

        if (in_array($target, [
            'products',
            'categories',
            'brands',
            'blogPosts',
            'shippingRates',
            'paymentMethods',
            'siteSettings',
            'shippingSettings',
            'tickerMessages',
            'marqueeBrands',
            'aboutValues',
            'builderSteps',
            'homeReviews',
        ], true)) {
            $this->executerVidage($d, $target, $rapport);
            $res = $importeur->importer();
            $rapport['counts']['reinitialise'] = true;
            return;
        }

        $this->executerVidage($d, $target, $rapport);
    }

    // =========================================================================
    // Délégation à api/tools/sauvegarder.php
    // =========================================================================
    // Il n'y a volontairement AUCUNE logique d'export ni de vérification dans
    // cette section : uniquement de quoi lancer l'outil, l'écouter, et rendre
    // ses échecs lisibles par le propriétaire.

    /**
     * Produit la sauvegarde en confiant le travail à l'outil.
     *
     * @throws ApiException
     * @return string chemin du fichier produit
     */
    private function produireSauvegarde(string $dossier): string
    {
        $resultat = $this->executerOutil([
            '--destination=' . $dossier,
            // Le dossier est privé et ne contient que cette sauvegarde : la
            // rotation n'a rien à y supprimer. L'important est ailleurs —
            // `--destination` détourne l'outil de BACKUP_DIR, où vivent les
            // sauvegardes du CRON. Un simple téléchargement ne doit JAMAIS
            // effacer l'une d'elles.
            '--garder=1',
            // Pas de gzip : le propriétaire reçoit un fichier directement
            // restaurable, et la vérification porte sur ces octets-là.
            '--sans-compression',
        ], 'la production de la sauvegarde');

        $fichiers = array_values(array_filter(
            (array) glob($dossier . '/katech-*'),
            static fn (string $f): bool => is_file($f)
                && preg_match('/^katech-\d{8}-\d{6}\.(sqlite|sql)$/', basename($f)) === 1
        ));

        if ($fichiers === []) {
            // L'outil sort en 0 sans rien produire dans un cas précis : une
            // autre sauvegarde tient déjà le verrou (CRON en cours). Le dire
            // clairement vaut mieux qu'un « erreur interne » : le geste
            // correctif est d'attendre une minute.
            if (str_contains($resultat['sortie'], 'déjà en cours')) {
                throw new ApiException(503, 'BACKUP_ERROR',
                    'Une sauvegarde est déjà en cours sur ce serveur (tâche planifiée). '
                    . 'Attendez qu\'elle se termine, puis réessayez.'
                );
            }

            throw new ApiException(503, 'BACKUP_ERROR',
                'L\'outil de sauvegarde s\'est terminé sans produire de fichier. '
                . $this->extraitLisible($resultat['sortie'])
            );
        }

        if (count($fichiers) > 1) {
            // Impossible en théorie (dossier créé pour cette requête). Si cela
            // arrive, on refuse plutôt que d'envoyer un fichier au hasard.
            throw new ApiException(503, 'BACKUP_ERROR',
                'Plusieurs fichiers de sauvegarde ont été produits pour une seule demande : '
                . 'situation anormale, aucun n\'est envoyé.'
            );
        }

        return $fichiers[0];
    }

    /**
     * Fait REJUGER par l'outil le fichier exact qui va partir vers le
     * navigateur (`--verifier=…`).
     *
     * Pourquoi une seconde passe, alors que l'outil vérifie déjà ce qu'il
     * produit : la première vérification porte sur ce qui vient d'être écrit,
     * celle-ci porte sur ce qu'on s'apprête à LIRE. Elle attrape ce qui
     * pourrait avoir abîmé le fichier entre-temps (disque plein, système de
     * fichiers réseau d'un mutualisé). Elle coûte une relecture ; la sûreté
     * des sauvegardes est la priorité énoncée par le propriétaire.
     *
     * Ce que cette vérification sait refuser, parce que c'est celle de l'outil :
     * une ligne modifiée, une ligne supprimée, un fichier tronqué. Les trois
     * cas ont été éprouvés, pas seulement raisonnés.
     *
     * NUANCE SQLITE. Pour un instantané SQLite, `--verifier` compare l'archive
     * à la base TELLE QU'ELLE EST maintenant. Si une commande est enregistrée
     * pendant ces quelques secondes, l'outil le détecte (il relit la source
     * deux fois) et se contente d'un avertissement. Le seul verdict fatal reste
     * « base stable ET contenu divergent », c'est-à-dire une vraie infidélité.
     *
     * @throws ApiException
     */
    private function verifierSauvegarde(string $fichier): void
    {
        $this->exigerMarqueurDeFin($fichier);

        $resultat = $this->executerOutil(
            ['--verifier=' . $fichier],
            'la vérification de la sauvegarde'
        );

        if ($resultat['code'] !== 0) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'SAUVEGARDE REFUSÉE : la vérification par le contenu a échoué, le fichier N\'A PAS '
                . 'été envoyé. Ne vous fiez pas à une sauvegarde antérieure sans l\'avoir vérifiée. '
                . $this->extraitLisible($resultat['sortie'])
            );
        }
    }

    /**
     * Refuse un export SQL qui ne se termine pas par son marqueur de fin.
     *
     * TROU MESURÉ DANS `--verifier`, ET POURQUOI CES QUELQUES LIGNES EXISTENT.
     * Un export MySQL tronqué à 60 % PASSE `--verifier` : les empreintes y sont
     * écrites table par table, au fil de l'export, si bien que la partie
     * conservée reste cohérente avec les empreintes qu'elle porte. La
     * vérification faite au moment de la PRODUCTION, elle, contrôle le marqueur
     * de fin (`verifierSauvegardeSql()`) et attrape le cas ; `--verifier`
     * (`verifierSauvegardeExistante()`) ne le contrôle pas. Éprouvé : les trois
     * autres formes de dégât (ligne modifiée, ligne supprimée, troncature d'un
     * fichier SQLite ou PostgreSQL) sont bien refusées, celle-ci ne l'était pas.
     *
     * Le correctif propre appartient à `api/tools/sauvegarder.php` (ajouter le
     * contrôle du marqueur dans `verifierSauvegardeExistante`), hors du
     * périmètre de ce fichier. En attendant, la route refuse ici plutôt que
     * d'envoyer un fichier amputé : c'est un contrôle d'exhaustivité sur les
     * octets à expédier, pas une seconde implémentation de la vérification.
     *
     * Un instantané SQLite n'a pas de marqueur : sa troncature est déjà
     * attrapée par `PRAGMA integrity_check` (« database disk image is
     * malformed »), lui aussi éprouvé.
     *
     * @throws ApiException
     */
    private function exigerMarqueurDeFin(string $fichier): void
    {
        if (!str_ends_with($fichier, '.sql')) {
            return;
        }

        $taille = (int) filesize($fichier);
        $handle = @fopen($fichier, 'rb');
        if ($handle === false) {
            throw new ApiException(503, 'BACKUP_ERROR', 'La sauvegarde produite est illisible.');
        }
        fseek($handle, max(0, $taille - 200));
        $fin = (string) fread($handle, 200);
        fclose($handle);

        if (!str_contains($fin, 'FIN DE SAUVEGARDE')) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'SAUVEGARDE REFUSÉE : le fichier ne se termine pas par son marqueur de fin, il est '
                . 'donc TRONQUÉ (disque plein, ou délai d\'exécution dépassé). Rien n\'a été envoyé : '
                . 'une sauvegarde amputée qu\'on croit valide est le pire des cas.'
            );
        }
    }

    /**
     * Lance l'outil en ligne de commande et attend son verdict.
     *
     * Trois précautions portent la sûreté de cet appel :
     *   - la commande est passée en TABLEAU : aucun shell n'est invoqué, donc
     *     aucun caractère du chemin temporaire ne peut être interprété ;
     *   - l'environnement du fils est construit par LISTE BLANCHE (voir
     *     `environnementCli()`) : aucune variable de requête HTTP ne traverse,
     *     la garde d'exécution de l'outil est respectée ;
     *   - un budget de temps borne l'attente : un fils bloqué est tué et le
     *     propriétaire reçoit un message qui nomme la cause.
     *
     * @param list<string> $arguments
     * @param string       $quoi      Ce qu'on tentait de faire, pour les messages.
     * @throws ApiException
     * @return array{code:int,sortie:string}
     */
    private function executerOutil(array $arguments, string $quoi): array
    {
        if (!function_exists('proc_open')) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'La sauvegarde depuis le navigateur exige la fonction PHP « proc_open », désactivée '
                . 'sur ce serveur (directive disable_functions). Deux issues : demander son activation '
                . 'à l\'hébergeur, ou programmer la tâche CRON documentée dans docs/DEPLOIEMENT.md, '
                . 'qui produit les mêmes sauvegardes sans passer par le navigateur. '
                . 'Aucune sauvegarde de secours n\'est improvisée ici : elle ne serait pas vérifiée '
                . 'par le même contrôle, et une sauvegarde à laquelle on ne peut pas se fier ne vaut '
                . 'pas mieux que pas de sauvegarde.'
            );
        }

        $script = dirname(__DIR__, 2) . '/tools/sauvegarder.php';
        if (!is_file($script)) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'L\'outil de sauvegarde « api/tools/sauvegarder.php » est absent du serveur : '
                . 'le téléversement du dossier api/tools/ est incomplet.'
            );
        }

        $commande = array_merge([$this->binairePhpCli(), $script], $arguments);

        $descripteurs = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $processus = @proc_open($commande, $descripteurs, $tuyaux, dirname($script), $this->environnementCli());
        if (!is_resource($processus)) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'Impossible de lancer l\'outil de sauvegarde en ligne de commande. '
                . 'Vérifiez que « proc_open » est autorisée et que PHP_CLI_BINARY désigne un binaire valide.'
            );
        }

        // Le fils ne lit rien : fermer son entrée évite qu'il attende un EOF.
        fclose($tuyaux[0]);
        stream_set_blocking($tuyaux[1], false);
        stream_set_blocking($tuyaux[2], false);

        $budget = $this->budgetSecondes();
        $limite = microtime(true) + $budget;
        $sortie = '';

        while (true) {
            $sortie .= (string) stream_get_contents($tuyaux[1]);
            $sortie .= (string) stream_get_contents($tuyaux[2]);

            $etat = proc_get_status($processus);
            if ($etat['running'] !== true) {
                break;
            }
            if (microtime(true) > $limite) {
                // Un fils qui dépasse le budget est tué : sans cela, la requête
                // HTTP mourrait de son côté (max_execution_time) en laissant
                // tourner un export orphelin qui écrit dans un dossier
                // temporaire que plus personne ne supprimera.
                proc_terminate($processus, 9);
                fclose($tuyaux[1]);
                fclose($tuyaux[2]);
                proc_close($processus);

                throw new ApiException(503, 'BACKUP_ERROR', sprintf(
                    'La sauvegarde a dépassé le budget de %d secondes et a été interrompue : aucun '
                    . 'fichier n\'est envoyé. Une base devenue trop volumineuse pour être sauvegardée '
                    . 'depuis le navigateur doit l\'être par la tâche CRON (docs/DEPLOIEMENT.md), qui '
                    . 'ne subit pas cette limite. Le budget se règle par BACKUP_HTTP_BUDGET_S.',
                    $budget
                ));
            }

            // 50 ms : assez court pour ne pas allonger la requête, assez long
            // pour ne pas tourner à vide sur le processeur du mutualisé.
            usleep(50000);
        }

        // Dernière lecture : ce que le fils a écrit juste avant de sortir.
        $sortie .= (string) stream_get_contents($tuyaux[1]);
        $sortie .= (string) stream_get_contents($tuyaux[2]);
        fclose($tuyaux[1]);
        fclose($tuyaux[2]);

        $closeCode = proc_close($processus);
        // En PHP/Linux, proc_close() renvoie -1 si proc_get_status() a déjà moissonné le processus.
        // Le véritable code de sortie se trouve alors dans $etat['exitcode'].
        $code = ($closeCode !== -1) ? $closeCode : (isset($etat['exitcode']) && $etat['exitcode'] !== -1 ? (int) $etat['exitcode'] : $closeCode);

        // Si le code n'est pas 0 et que la sortie ne confirme pas explicitement le succès de l'outil :
        if ($code !== 0 && !str_contains($sortie, 'TERMINÉ avec succès')) {
            // L'outil échoue TOUJOURS en expliquant pourquoi (droits, espace
            // disque, contenu divergent…). Ce message est justement ce dont le
            // propriétaire a besoin : on le transmet plutôt que de le remplacer
            // par « une erreur est survenue ».
            Db::journaliserStatique('[maintenance] Outil de sauvegarde en échec (code ' . $code . ') : ' . $sortie);

            throw new ApiException(503, 'BACKUP_ERROR',
                'Échec de ' . $quoi . '. ' . $this->extraitLisible($sortie)
            );
        }

        return ['code' => $code, 'sortie' => $sortie];
    }

    /**
     * Chemin du binaire PHP en ligne de commande.
     *
     * Trois sources, dans l'ordre :
     *   1. `PHP_CLI_BINARY` (api/.env) — le seul réglage fiable chez un
     *      mutualisé où `php` dans le PATH est un PHP 5.6 hérité et où le bon
     *      binaire s'appelle `/usr/local/bin/php8.2` ;
     *   2. `PHP_BINARY` quand on tourne déjà en CLI (outils, recette) ;
     *   3. `PHP_BINDIR/php`, puis les noms usuels trouvés dans le PATH.
     *
     * Chaque candidat est SONDÉ avant d'être retenu, et la sonde est en lecture
     * seule : on lui fait afficher son SAPI. Un `php-cgi` déguisé en `php`
     * répondrait « cgi-fcgi » et serait écarté — il émettrait des en-têtes au
     * milieu de la sauvegarde, et surtout la garde de l'outil le refuserait.
     *
     * @throws ApiException
     */
    private function binairePhpCli(): string
    {
        static $resolu = null;
        if (is_string($resolu)) {
            return $resolu;
        }

        $estWindows = PHP_OS_FAMILY === 'Windows' || DIRECTORY_SEPARATOR === '\\';
        $candidats = [];

        $configure = trim((string) (\KaTech\Env::get('PHP_CLI_BINARY', '') ?? ''));
        if ($configure !== '') {
            $candidats[] = $configure;
        }
        if (PHP_SAPI === 'cli' && PHP_BINARY !== '') {
            $candidats[] = PHP_BINARY;
        }
        if ($ini = php_ini_loaded_file()) {
            $candidats[] = dirname($ini) . DIRECTORY_SEPARATOR . ($estWindows ? 'php.exe' : 'php');
        }
        if ($ext = (string) ini_get('extension_dir')) {
            $candidats[] = dirname($ext) . DIRECTORY_SEPARATOR . ($estWindows ? 'php.exe' : 'php');
        }
        if (PHP_BINARY !== '') {
            $candidats[] = dirname(PHP_BINARY) . DIRECTORY_SEPARATOR . ($estWindows ? 'php.exe' : 'php');
        }
        if (PHP_BINDIR !== '') {
            $candidats[] = PHP_BINDIR . '/php';
            if ($estWindows) {
                $candidats[] = PHP_BINDIR . '/php.exe';
                $candidats[] = PHP_BINDIR . '\\php.exe';
            }
        }
        if ($estWindows) {
            $candidats[] = 'C:/xampp/php/php.exe';
            $candidats[] = 'C:\\xampp\\php\\php.exe';
        }
        $noms = ['php', 'php8', 'php8.4', 'php8.3', 'php8.2', 'php-cli'];
        if ($estWindows) {
            $noms = array_merge(['php.exe', 'php8.exe', 'php8.4.exe', 'php8.3.exe', 'php8.2.exe', 'php-cli.exe'], $noms);
        }
        foreach ($noms as $nom) {
            foreach (explode(PATH_SEPARATOR, (string) getenv('PATH')) as $dossier) {
                if ($dossier !== '') {
                    $candidats[] = rtrim($dossier, '/\\') . DIRECTORY_SEPARATOR . $nom;
                }
            }
        }

        $vus = [];
        foreach ($candidats as $candidat) {
            if (isset($vus[$candidat]) || !is_file($candidat) || !is_executable($candidat)) {
                continue;
            }
            $vus[$candidat] = true;
            if ($this->estBinaireCli($candidat)) {
                return $resolu = $candidat;
            }
        }

        throw new ApiException(503, 'BACKUP_ERROR',
            'Aucun binaire PHP en ligne de commande n\'a été trouvé sur ce serveur. La sauvegarde '
            . 'depuis le navigateur en a besoin, parce qu\'elle confie le travail à l\'outil éprouvé '
            . 'api/tools/sauvegarder.php plutôt que d\'en refaire une seconde version. '
            . 'Indiquez le chemin du binaire dans api/.env (PHP_CLI_BINARY=/usr/local/bin/php8.2, '
            . 'chemin visible dans le panneau de l\'hébergeur, rubrique « Tâches CRON »), ou '
            . 'programmez directement la tâche CRON de docs/DEPLOIEMENT.md.'
        );
    }

    /** Sonde en lecture seule : le binaire répond-il « cli » ? */
    private function estBinaireCli(string $binaire): bool
    {
        $descripteurs = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $processus = @proc_open(
            [$binaire, '-r', 'echo PHP_SAPI;'],
            $descripteurs,
            $tuyaux,
            null,
            $this->environnementCli()
        );
        if (!is_resource($processus)) {
            return false;
        }

        fclose($tuyaux[0]);
        // La sonde est bornée : un binaire qui n'affiche rien ne doit pas
        // bloquer la requête. `stream_set_timeout` suffit ici, la sortie
        // attendue tient en trois octets.
        stream_set_timeout($tuyaux[1], 5);
        $sortie = trim((string) stream_get_contents($tuyaux[1]));
        stream_get_contents($tuyaux[2]);
        fclose($tuyaux[1]);
        fclose($tuyaux[2]);
        proc_close($processus);

        return $sortie === 'cli' || str_ends_with($sortie, 'cli');
    }

    /**
     * Environnement du processus fils, construit par LISTE BLANCHE.
     *
     * Une liste noire serait un piège : il suffirait d'une variable de requête
     * oubliée (`REQUEST_METHOD`, `HTTP_HOST`, `REQUEST_URI`…) pour que l'outil
     * se croie appelé par un navigateur, refuse de s'exécuter et rende la
     * sauvegarde impossible — sans que personne comprenne pourquoi. On ne
     * transmet donc QUE ce dont l'outil a besoin.
     *
     * Les identifiants de base en font partie : quand la configuration vient de
     * l'environnement réel plutôt que de api/.env (SetEnv Apache, conteneur),
     * le fils ne les retrouverait nulle part sinon. Il tourne sous le même
     * utilisateur système que ce processus : rien n'est exposé de plus.
     *
     * @return array<string,string>
     */
    private function environnementCli(): array
    {
        $cles = [
            // Exécution
            'PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL',
            'SystemRoot', 'ComSpec', 'PHPRC', 'PHP_CLI_BINARY',
            // Application
            'APP_ENV',
            // Base de données
            'DB_DRIVER', 'DB_SQLITE_PATH', 'DB_HOST', 'DB_PORT', 'DB_NAME',
            'DB_USER', 'DB_PASSWORD', 'DB_SSLMODE',
            // Sauvegarde
            'BACKUP_DIR', 'BACKUP_KEEP', 'BACKUP_COMPRESS',
        ];

        $env = [];
        foreach ($cles as $cle) {
            $valeur = getenv($cle);
            if (is_string($valeur) && $valeur !== '') {
                $env[$cle] = $valeur;
            }
        }

        return $env;
    }

    /**
     * Budget d'attente du processus fils, en secondes.
     *
     * Défaut 120 s : au-delà, sur un mutualisé, la requête HTTP est de toute
     * façon condamnée, et la bonne réponse est le CRON.
     */
    private function budgetSecondes(): int
    {
        $budget = \KaTech\Env::int('BACKUP_HTTP_BUDGET_S', 120);

        return $budget > 0 ? $budget : 120;
    }

    /**
     * Dossier temporaire privé pour cette requête.
     *
     * Droits 0700 : le fichier contient TOUTE la base — clients, commandes,
     * empreintes de mots de passe. Sur un mutualisé, les dossiers temporaires
     * sont parfois partagés entre comptes.
     *
     * @throws ApiException
     */
    private function dossierTemporaire(): string
    {
        $dossier = sys_get_temp_dir() . '/katech-bak-' . bin2hex(random_bytes(8));

        if (!@mkdir($dossier, 0700) && !is_dir($dossier)) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'Impossible de créer un dossier temporaire pour la sauvegarde. '
                . 'Le dossier temporaire de PHP est-il plein ou en lecture seule ?'
            );
        }

        return $dossier;
    }

    /** Supprime le dossier temporaire et tout ce qu'il contient. */
    private function effacerDossier(string $dossier): void
    {
        foreach ((array) glob($dossier . '/*') as $fichier) {
            if (is_string($fichier) && is_file($fichier)) {
                @unlink($fichier);
            }
        }
        @rmdir($dossier);
    }

    /**
     * Envoie le fichier au navigateur, puis efface toute trace sur le serveur.
     *
     * @throws ApiException
     * @return never
     */
    private function envoyerFichier(string $fichier, string $dossier): never
    {
        $taille = (int) filesize($fichier);
        if ($taille === 0) {
            $this->effacerDossier($dossier);

            throw new ApiException(503, 'BACKUP_ERROR', 'La sauvegarde produite est vide.');
        }

        $empreinte = hash_file('sha256', $fichier);

        $handle = @fopen($fichier, 'rb');
        if ($handle === false) {
            $this->effacerDossier($dossier);

            throw new ApiException(503, 'BACKUP_ERROR',
                'Impossible d\'ouvrir la sauvegarde pour l\'envoyer.'
            );
        }

        // index.php a ouvert un tampon de sortie pour capturer les sorties
        // parasites. On le VIDE (et on le jette) avant le premier octet du
        // corps : un avertissement PHP collé en tête d'un fichier SQLite le
        // rendrait illisible.
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        if (!headers_sent()) {
            http_response_code(200);
            header('Content-Type: application/octet-stream');
            // « attachment » force le téléchargement ; « inline » afficherait
            // le binaire dans l'onglet.
            header('Content-Disposition: attachment; filename="' . basename($fichier) . '"');
            // Toujours connu, pour les trois pilotes : le fichier est complet
            // avant que l'envoi ne commence. Un téléchargement plus court que
            // cette annonce est signalé par le navigateur.
            header('Content-Length: ' . $taille);
            header('X-KaTech-Backup-SHA256: ' . ($empreinte !== false ? $empreinte : 'indisponible'));
            // Trace explicite du producteur : si un jour deux chemins de
            // sauvegarde réapparaissent, cet en-tête dira lequel a répondu.
            header('X-KaTech-Backup-Producer: api/tools/sauvegarder.php');
            header('X-KaTech-Backup-Verified: contenu (empreintes par table)');
            header('Cache-Control: no-store, no-cache, must-revalidate');
            header('Pragma: no-cache');
        }

        // Blocs de 256 Ko : la mémoire d'un mutualisé (128 Mo) ne doit jamais
        // avoir à contenir la base entière.
        while (!feof($handle)) {
            $bloc = fread($handle, 262144);
            if ($bloc === false) {
                break;
            }
            echo $bloc;
            flush();
        }

        fclose($handle);
        $this->effacerDossier($dossier);

        exit(0);
    }

    /**
     * Extrait présentable de la sortie de l'outil.
     *
     * On garde les DERNIÈRES lignes : le diagnostic utile de l'outil est
     * toujours en fin de sortie (« ÉCHEC : … »), le début n'étant que le
     * déroulé. La sortie passe par `sansDsn()` — l'outil ne journalise pas de
     * DSN, mais un message d'erreur PDO remonté tel quel pourrait en contenir.
     */
    private function extraitLisible(string $sortie): string
    {
        $lignes = array_values(array_filter(
            array_map('trim', explode("\n", $sortie)),
            static fn (string $l): bool => $l !== ''
        ));

        if ($lignes === []) {
            return 'L\'outil n\'a produit aucun message ; consultez le journal d\'erreurs PHP du serveur.';
        }

        $extrait = implode(' | ', array_slice($lignes, -4));
        if (strlen($extrait) > 1200) {
            $extrait = substr($extrait, 0, 1200) . '…';
        }

        return 'Message de l\'outil : ' . $this->sansDsn($extrait);
    }

    // =========================================================================
    // Identité de la base — une méthode par pilote
    // =========================================================================
    // Chaque méthode rend le couple [nom affichable, taille en octets ou null].
    // Le nom de la base est public (il figure dans le panneau de l'hébergeur) ;
    // l'hôte, le port, l'utilisateur et le mot de passe ne sortent JAMAIS.

    /** @return array{0:string,1:?int} */
    private function identiteSqlite(): array
    {
        $chemin = (string) $this->db->cheminSqlite();

        // Le nom de FICHIER suffit à s'y retrouver ; le chemin complet dirait à
        // un visiteur où tenter de télécharger la base.
        return [
            basename($chemin),
            is_file($chemin) ? (int) filesize($chemin) : null,
        ];
    }

    /** @return array{0:string,1:?int} */
    private function identiteMysql(): array
    {
        return [
            (string) ($this->db->valeur('SELECT DATABASE()') ?? ''),
            // Taille agrégée des tables : information_schema est lisible par
            // tout utilisateur, y compris le compte restreint d'un mutualisé.
            (int) $this->db->valeur(
                "SELECT COALESCE(SUM(data_length + index_length), 0)
                   FROM information_schema.tables
                  WHERE table_schema = DATABASE()"
            ),
        ];
    }

    /** @return array{0:string,1:?int} */
    private function identitePgsql(): array
    {
        // `current_database()` est l'équivalent PostgreSQL de `DATABASE()`.
        // `pg_database_size()` donne la taille réelle sur disque, index compris
        // — plus juste que la somme des tables rendue en MySQL, mais la
        // grandeur affichée reste comparable.
        return [
            (string) ($this->db->valeur('SELECT current_database()') ?? ''),
            (int) $this->db->valeur('SELECT pg_database_size(current_database())'),
        ];
    }

    // =========================================================================
    // Helpers partagés
    // =========================================================================

    /**
     * Renvoie les tables sous forme de liste ordonnée d'objets { name, rows }.
     *
     * Le tableau (pas la carte) est la forme attendue par l'interface : elle
     * affiche les tables en liste ordonnée et non sous forme de carte clé→valeur.
     * L'ordre alphabétique est stable et indépendant du pilote.
     *
     * Les noms de tables sont lus depuis le catalogue interne de la base
     * (sqlite_master / information_schema / pg_tables), jamais depuis une
     * entrée utilisateur. Chaque nom est ensuite passé par Db::identifiant()
     * avant interpolation.
     *
     * Ici encore, un `match` sans branche par défaut : `DATABASE()` envoyé à
     * PostgreSQL était l'autre moitié de la panne de l'écran Développeur.
     *
     * @return list<array{name:string,rows:int}>
     */
    private function tablesEnListe(): array
    {
        $sql = match ($this->db->pilote()) {
            Db::PILOTE_SQLITE => "SELECT name FROM sqlite_master "
                . "WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            Db::PILOTE_MYSQL => 'SELECT table_name AS name FROM information_schema.tables '
                . "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' "
                . 'ORDER BY table_name',
            // `current_schemas(false)` suit le `search_path` réel : écrire
            // « public » en dur casserait sur un Supabase au schéma
            // personnalisé, et compterait les tables d'une autre application
            // sur un serveur partagé (même raisonnement qu'install.php).
            Db::PILOTE_PGSQL => 'SELECT tablename AS name FROM pg_catalog.pg_tables '
                . 'WHERE schemaname = ANY (current_schemas(false)) ORDER BY tablename',
        };

        $lignes = $this->db->tous($sql);

        $resultat = [];
        foreach ($lignes as $l) {
            $nom = (string) $l['name'];
            // Db::identifiant() valide le nom (caractères autorisés uniquement) :
            // même si sqlite_master renvoyait un nom bizarre, il ne passerait pas.
            $nomSql = Db::identifiant($nom);
            $resultat[] = [
                'name' => $nom,
                'rows' => (int) $this->db->valeur("SELECT COUNT(*) FROM {$nomSql}"),
            ];
        }

        return $resultat;
    }

    /**
     * Chemin du dossier de sauvegarde CRON, ou null si non configuré.
     * On cherche la dernière sauvegarde sur disque pour informer le propriétaire.
     */
    private function derniereDate(): ?string
    {
        $dossier = (string) (\KaTech\Env::get('BACKUP_DIR', '') ?? '');
        if ($dossier === '' || !is_dir($dossier)) {
            return null;
        }

        // On ne cherche que les fichiers produits par l'outil (préfixe « katech- »).
        $fichiers = glob($dossier . '/katech-*');
        if ($fichiers === false || $fichiers === []) {
            return null;
        }

        // Filtre : uniquement les noms attendus.
        $valides = array_values(array_filter(
            $fichiers,
            static fn (string $f): bool => is_file($f)
                && preg_match('/^katech-\d{8}-\d{6}\.(sqlite|sql)(\.gz)?$/', basename($f)) === 1
        ));

        if ($valides === []) {
            return null;
        }

        // L'horodatage dans le nom (AAAAMMJJ-HHMMSS) est l'ordre naturel.
        sort($valides, SORT_STRING);
        $dernier = end($valides);

        // On lit la date de modification du fichier comme confirmation,
        // mais on préfère le nom du fichier (plus fiable sur mutualisé).
        if (preg_match('/katech-(\d{8}-\d{6})/', basename($dernier), $m) === 1) {
            // Reformatage AAAAMMJJ-HHMMSS → ISO 8601 UTC.
            $brut = $m[1];
            $dt = \DateTime::createFromFormat('Ymd-His', $brut, new \DateTimeZone('UTC'));

            return $dt !== false ? $dt->format('c') : $brut;
        }

        return null;
    }

    /**
     * Taille en octets → chaîne humainement lisible (« 4.2 Mo », « 120 Ko »…).
     *
     * Les unités sont en base 10 (SI), comme le font la plupart des systèmes
     * de fichiers grand public (macOS, Windows Explorer). La base 2 (Mio, Kio)
     * serait plus précise mais moins compréhensible pour un commerçant.
     */
    private function tailleLisible(int $octets): string
    {
        if ($octets < 1000) {
            return $octets . ' o';
        }
        if ($octets < 1_000_000) {
            return round($octets / 1_000, 1) . ' Ko';
        }
        if ($octets < 1_000_000_000) {
            return round($octets / 1_000_000, 1) . ' Mo';
        }

        return round($octets / 1_000_000_000, 2) . ' Go';
    }

    /**
     * Normalise le champ `simulation` vers un booléen.
     *
     * RÈGLE DE SÉCURITÉ : on simule par défaut ET par repli.
     * Seul un booléen JSON `false` explicite déclenche une migration réelle.
     * Toute valeur absente, mal typée, ou ambiguë (chaîne « faux », null…)
     * est traitée comme une demande de simulation.
     *
     * Pourquoi si strict : une migration réelle sur la seule base de données
     * d'un commerçant sans backup récent est irréversible. Mieux vaut une
     * simulation involontaire (corrigeable en relançant avec simulation=false)
     * qu'une migration réelle involontaire (irréversible).
     */
    private function normaliserBooleanSimulation(mixed $valeur): bool
    {
        // Seul un booléen PHP false (décodé depuis JSON `false`) désactive la simulation.
        // Une chaîne « false » ou 0 ne suffisent pas : on exige la clarté.
        if (is_bool($valeur)) {
            return $valeur;
        }

        // Tout le reste → simulation.
        return true;
    }

    /**
     * Traduit un message d'erreur de connexion en phrase compréhensible,
     * sans jamais reproduire le DSN ni les identifiants.
     *
     * La distinction refus-identifiants / hôte-injoignable est utile :
     *   - Refus : « vérifiez l'utilisateur et le mot de passe »
     *   - Injoignable : « vérifiez l'hôte et le port »
     * Une erreur générique « une erreur est survenue » ne l'est pas.
     */
    private function traduireErreurConnexion(string $messageOriginal): string
    {
        $bas = strtolower($messageOriginal);

        // Refus d'authentification (MySQL : 1045, PostgreSQL : FATAL password, etc.)
        if (str_contains($bas, 'access denied')
            || str_contains($bas, 'password authentication failed')
            || str_contains($bas, '1045')
        ) {
            return 'La base cible refuse la connexion : utilisateur ou mot de passe invalide. '
                . 'Vérifiez les identifiants et les permissions accordées à cet utilisateur.';
        }

        // Hôte inconnu ou injoignable
        if (str_contains($bas, 'could not connect')
            || str_contains($bas, 'connection refused')
            || str_contains($bas, 'unknown host')
            || str_contains($bas, 'no such host')
            || str_contains($bas, 'name or service not known')
        ) {
            return 'Impossible de joindre la base cible : l\'hôte est inconnu ou le port est fermé. '
                . 'Vérifiez le DSN (hôte, port).';
        }

        // DSN malformé ou pilote non supporté (détecté par Migrateur::connecter())
        if (str_contains($bas, 'pilote')
            || str_contains($bas, 'dsn vide')
            || str_contains($bas, 'non support')
        ) {
            return 'Le DSN fourni est invalide ou le pilote n\'est pas supporté. '
                . 'Formats acceptés : sqlite:/chemin, mysql:host=…;dbname=…, pgsql:host=…;dbname=….';
        }

        // Base inexistante (MySQL : 1049, PostgreSQL : database does not exist)
        if (str_contains($bas, 'unknown database')
            || str_contains($bas, 'database')
            || str_contains($bas, '1049')
        ) {
            return 'La base de données cible n\'existe pas. Créez-la d\'abord dans le panneau de votre hébergeur.';
        }

        // Cas non identifié : message générique sans détails techniques.
        // On ne retourne PAS le message d'origine car il peut contenir le DSN.
        return 'Connexion à la base cible impossible. Vérifiez le DSN, les identifiants et que la base existe.';
    }

    /**
     * Supprime toute mention de DSN d'un message avant de le renvoyer en réponse.
     *
     * Filet de sécurité final : même si une exception interne avait encodé un DSN
     * dans son message, il ne doit pas sortir vers le client.
     */
    private function sansDsn(string $message): string
    {
        // Retire les patterns DSN courants : mysql:host=..., sqlite:/path, pgsql:host=...
        $filtre = (string) preg_replace(
            '/\b(mysql|sqlite|pgsql|pdo):[^\s,;)\"\']+/i',
            '[DSN masqué]',
            $message
        );

        // Retire aussi les mots de passe qui auraient pu se glisser (best-effort).
        return (string) preg_replace('/(password|pwd|motdepasse)[=:][^\s,;)\"\']+/i', '$1=[masqué]', $filtre);
    }
}
