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
 * Concernant api/tools/sauvegarder.php : ce script est un travailleur CRON,
 * conçu pour la ligne de commande. Il refuse explicitement tout appel HTTP
 * (§ GARDE D'EXÉCUTION) car son chemin de sauvegarde et sa connexion à la base
 * ne doivent pas être déclenchés depuis un navigateur. Sa logique n'est donc
 * pas réutilisable telle quelle depuis une requête HTTP : c'est la raison pour
 * laquelle le présent contrôleur la réimplémente — sans la dupliquer en douce,
 * mais en partageant les mêmes principes et garanties (cohérence, vérification,
 * en-têtes corrects, pas de fichier tronqué silencieux).
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Garde;
use KaTech\Db;
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
        if ($this->db->estSqlite()) {
            $chemin = (string) $this->db->cheminSqlite();
            $nomBase = basename($chemin);
            // La taille du fichier renseigne sur l'espace occupé sans révéler le chemin.
            $tailleOctets = is_file($chemin) ? (int) filesize($chemin) : null;
        } else {
            // En MySQL, le nom de la base est public (CREATE DATABASE l'expose) ;
            // en revanche le host, le port et l'utilisateur ne doivent PAS sortir.
            $nomBase = (string) ($this->db->valeur('SELECT DATABASE()') ?? '');
            // Taille agrégée des tables (information_schema est toujours lisible).
            $tailleOctets = (int) $this->db->valeur(
                "SELECT COALESCE(SUM(data_length + index_length), 0)
                   FROM information_schema.tables
                  WHERE table_schema = DATABASE()"
            );
        }

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
     * Produit une sauvegarde de la base et l'envoie directement au navigateur
     * en téléchargement. Aucun fichier n'est conservé sur le serveur.
     *
     * Garanties héritées de api/tools/sauvegarder.php :
     *   1. Cohérence    — SQLite : VACUUM INTO (instantané dans une transaction
     *                     de lecture, jamais de copie brute). MySQL : transaction
     *                     REPEATABLE READ ouverte avant la première lecture.
     *   2. Vérification — la sauvegarde est contrôlée AVANT d'être envoyée.
     *   3. Pas de fichier tronqué — si l'envoi échoue en cours de route, le
     *                     navigateur reçoit un fichier incomplet. Ce cas est
     *                     inévitable avec un flux HTTP : voir la section
     *                     LIMITATION FONDAMENTALE ci-dessous.
     *   4. Nom parlant  — contient le pilote et l'horodatage UTC.
     *
     * LIMITATION FONDAMENTALE.
     * Le pire scénario d'une sauvegarde est un fichier tronqué que le
     * propriétaire croit valide. En HTTP, ce risque ne peut pas être
     * complètement éliminé : les en-têtes sont envoyés avant le corps, et si
     * la connexion est coupée à mi-chemin, le navigateur enregistre ce qu'il a
     * reçu. Deux mesures atténuent ce risque :
     *   a) Pour SQLite : la sauvegarde est produite dans un fichier temporaire,
     *      vérifiée (intégrité, nombre de tables), puis envoyée en une seule
     *      passe depuis ce fichier — si la vérification échoue, rien n'est
     *      envoyé du tout.
     *   b) Pour MySQL : le corps SQL se termine par un marqueur « FIN DE
     *      SAUVEGARDE » ; si le propriétaire voit ce marqueur en fin de fichier,
     *      il sait que la sauvegarde est complète.
     *   c) L'en-tête Content-Length est positionné pour SQLite (taille connue
     *      à l'avance) : le navigateur peut ainsi détecter un fichier tronqué.
     *   Pour MySQL, le flux est produit sans bufferiser l'intégralité en
     *   mémoire (contrainte mutualisé 128 Mo), donc Content-Length ne peut pas
     *   être posé à l'avance.
     *
     * Cette méthode NE RETOURNE PAS de Reponse : elle écrit directement sur la
     * sortie PHP via les en-têtes HTTP et flush, puis arrête l'exécution.
     * C'est le seul cas dans le projet où un contrôleur sort du cycle normal
     * (Requete → Reponse) — justifié par la nature binaire/streaming de la
     * sauvegarde.
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 500 si la sauvegarde échoue
     * @return never
     */
    public function sauvegarder(Requete $r): never
    {
        // Un admin ne peut pas exfiltrer l'intégralité de la base : seul l'owner passe.
        Garde::exiger('owner');

        $horodatage = gmdate('Ymd-His');
        $pilote = $this->db->pilote();

        if ($this->db->estSqlite()) {
            $this->envoyerSqlite($horodatage);
        } else {
            $this->envoyerMysql($horodatage);
        }

        // envoyerSqlite / envoyerMysql terminent avec exit — cette ligne est
        // morte mais satisfait le typage « never ».
        exit(0);
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
        $tablesReponse = array_map(
            static fn (array $t): array => [
                'nom'       => (string) $t['table'],
                'lues'      => (int) $t['lues'],
                'ecrites'   => (int) $t['ecrites'],
                'anomalies' => (int) $t['anomalies'],
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

    // =========================================================================
    // SQLite
    // =========================================================================

    /**
     * Instantané cohérent puis envoi HTTP.
     *
     * Même logique que api/tools/sauvegarder.php → sauvegarderSqlite() :
     * VACUUM INTO d'abord, SQLite3::backup() en repli. On refuse copy() :
     * un instantané en milieu de transaction WAL produirait un fichier
     * ouvert sans erreur mais potentiellement corrompu.
     *
     * La sauvegarde passe par un fichier temporaire pour permettre la
     * vérification (intégrité + nombre de tables) AVANT l'envoi. Si la
     * vérification échoue, aucun octet n'est envoyé au navigateur.
     *
     * @throws ApiException
     * @return never
     */
    private function envoyerSqlite(string $horodatage): never
    {
        $source = (string) $this->db->cheminSqlite();

        if (!is_file($source)) {
            throw new ApiException(503, 'BACKUP_ERROR',
                "La base SQLite est introuvable. L'installation a-t-elle été effectuée ?"
            );
        }
        if (!is_readable($source)) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'La base SQLite n\'est pas lisible par PHP. Vérifiez les droits du fichier.'
            );
        }

        // Fichier temporaire : s'il est valide, on l'envoie ; sinon on le supprime et on échoue proprement.
        $tmp = tempnam(sys_get_temp_dir(), 'katech-bak-');
        if ($tmp === false) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'Impossible de créer un fichier temporaire pour la sauvegarde.'
            );
        }

        // Le fichier créé par tempnam est vide ; VACUUM INTO exige qu'il n'existe pas
        // encore, ou qu'il soit un fichier SQLite valide. On le supprime pour laisser
        // SQLite le créer lui-même avec la bonne structure de page.
        @unlink($tmp);

        $methode = null;

        // --- 1. VACUUM INTO (SQLite 3.27+, aucune extension supplémentaire) --
        try {
            $pdo = $this->db->pdo();
            $pdo->exec('VACUUM INTO ' . $pdo->quote($tmp));
            $methode = 'VACUUM INTO';
        } catch (\Throwable $e) {
            Db::journaliserStatique('[maintenance] VACUUM INTO indisponible : ' . $e->getMessage() . ', tentative SQLite3::backup().');
            @unlink($tmp);
        }

        // --- 2. SQLite3::backup() (API officielle de sauvegarde en ligne) -----
        if ($methode === null && class_exists('SQLite3') && method_exists('SQLite3', 'backup')) {
            try {
                $src = new \SQLite3($source, SQLITE3_OPEN_READONLY);
                $dst = new \SQLite3($tmp, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
                $src->busyTimeout(10000);
                if (!$src->backup($dst)) {
                    throw new \RuntimeException('SQLite3::backup() a renvoyé false.');
                }
                $src->close();
                $dst->close();
                $methode = 'SQLite3::backup()';
            } catch (\Throwable $e) {
                @unlink($tmp);
                throw new ApiException(503, 'BACKUP_ERROR',
                    'Les deux mécanismes de sauvegarde SQLite ont échoué : ' . $e->getMessage()
                    . ' — La copie brute n\'est pas proposée en repli car elle pourrait livrer un fichier corrompu.'
                );
            }
        }

        if ($methode === null) {
            @unlink($tmp);
            throw new ApiException(503, 'BACKUP_ERROR',
                'Aucun mécanisme de sauvegarde SQLite disponible : VACUUM INTO a échoué et l\'extension '
                . 'sqlite3 est absente. Activez l\'extension sqlite3 dans le panneau de l\'hébergeur, '
                . 'ou basculez sur MySQL.'
            );
        }

        // --- Vérification avant envoi (l'intégrité est contrôlée ici) --------
        $this->verifierSauvegardeSqlite($tmp);

        $taille = (int) filesize($tmp);
        if ($taille === 0) {
            @unlink($tmp);
            throw new ApiException(503, 'BACKUP_ERROR', 'La sauvegarde produite est vide.');
        }

        // --- Envoi HTTP -------------------------------------------------------
        $nomFichier = 'katech-' . $horodatage . '.sqlite';

        // SHA-256 du fichier : le propriétaire peut le vérifier après téléchargement
        // pour s'assurer que le fichier n'a pas été altéré pendant le transit.
        $empreinte = hash_file('sha256', $tmp);

        $handle = @fopen($tmp, 'rb');
        if ($handle === false) {
            @unlink($tmp);
            throw new ApiException(503, 'BACKUP_ERROR', 'Impossible d\'ouvrir le fichier temporaire pour l\'envoi.');
        }

        // Les en-têtes sont posés en une seule fois avant le premier octet du corps.
        // Content-Length est connu : le navigateur peut détecter un fichier tronqué.
        if (!headers_sent()) {
            http_response_code(200);
            header('Content-Type: application/octet-stream');
            // « attachment » force le téléchargement, « inline » afficherait le binaire.
            header('Content-Disposition: attachment; filename="' . $nomFichier . '"');
            header('Content-Length: ' . $taille);
            // L'empreinte voyage dans un en-tête non standard, visible dans les outils
            // de développement ou avec curl -I. Elle ne prouve pas l'intégrité de la
            // transmission (man-in-the-middle), mais elle permet une vérification
            // manuelle côté propriétaire.
            header('X-KaTech-Backup-SHA256: ' . ($empreinte !== false ? $empreinte : 'indisponible'));
            header('X-KaTech-Backup-Method: ' . $methode);
            header('Cache-Control: no-store, no-cache, must-revalidate');
            header('Pragma: no-cache');
        }

        // Envoi en blocs de 256 Ko : économise la mémoire sur mutualisé.
        while (!feof($handle)) {
            $bloc = fread($handle, 262144);
            if ($bloc !== false) {
                echo $bloc;
            }
            // flush() pousse le bloc vers le navigateur sans attendre la fin ;
            // si la connexion est rompue en cours d'envoi, l'exécution continue
            // jusqu'à la fin (PHP ne détecte pas la déconnexion dans ce contexte)
            // mais le fichier téléchargé sera tronqué. Le Content-Length posé
            // ci-dessus permet au navigateur de le détecter.
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
        }

        fclose($handle);
        @unlink($tmp);

        exit(0);
    }

    /**
     * Vérifie l'intégrité d'une sauvegarde SQLite et que le nombre de tables
     * correspond à la base source. Lève une ApiException si la vérification échoue.
     *
     * @throws ApiException
     */
    private function verifierSauvegardeSqlite(string $cheminTmp): void
    {
        if (!is_file($cheminTmp) || filesize($cheminTmp) === 0) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'La sauvegarde n\'a pas été écrite ou est vide après l\'instantané.'
            );
        }

        try {
            $copie = new \PDO('sqlite:' . $cheminTmp, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);

            $integrite = (string) ($copie->query('PRAGMA integrity_check')?->fetchColumn() ?? '');
            if (strtolower($integrite) !== 'ok') {
                throw new ApiException(503, 'BACKUP_ERROR',
                    "Contrôle d'intégrité de la sauvegarde ÉCHOUÉ : {$integrite}. Fichier non envoyé."
                );
            }

            $nbCopie = (int) $copie->query(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )?->fetchColumn();

            $nbSource = (int) $this->db->valeur(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            );

            if ($nbCopie !== $nbSource) {
                throw new ApiException(503, 'BACKUP_ERROR',
                    "La sauvegarde contient {$nbCopie} table(s) mais la base en compte {$nbSource}. "
                    . 'Sauvegarde incomplète, fichier non envoyé.'
                );
            }
        } catch (ApiException $e) {
            throw $e;
        } catch (\PDOException $e) {
            throw new ApiException(503, 'BACKUP_ERROR',
                'La sauvegarde produite est illisible : ' . $e->getMessage()
            );
        }
    }

    // =========================================================================
    // MySQL
    // =========================================================================

    /**
     * Export SQL complet d'une base MySQL, envoyé en streaming sans buffériser
     * l'intégralité en mémoire.
     *
     * Cohérence : transaction REPEATABLE READ ouverte AVANT la première lecture,
     * comme --single-transaction de mysqldump. Aucun verrou sur les tables InnoDB.
     *
     * Un marqueur « FIN DE SAUVEGARDE » est écrit en dernière ligne : son absence
     * dans le fichier téléchargé signale un export tronqué.
     *
     * @throws ApiException
     * @return never
     */
    private function envoyerMysql(string $horodatage): never
    {
        $pdo = $this->db->pdo();

        $nomBase = (string) ($pdo->query('SELECT DATABASE()')?->fetchColumn() ?? '');
        $nomFichier = 'katech-' . $horodatage . '.sql';

        // En-têtes HTTP AVANT d'ouvrir la transaction : s'ils échouent, on n'a
        // rien commencé. En MySQL, Content-Length est inconnu à l'avance
        // (on ne bufférise pas) donc on n'en pose pas.
        if (!headers_sent()) {
            http_response_code(200);
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $nomFichier . '"');
            header('Cache-Control: no-store, no-cache, must-revalidate');
            header('Pragma: no-cache');
            // Le marqueur de fin est la seule preuve d'exhaustivité disponible ici.
            header('X-KaTech-Backup-Verify: Fichier complet si la dernière ligne contient "FIN DE SAUVEGARDE"');
        }

        // Tampon de sortie : on s'assure que les blocs partent vers le navigateur
        // au fil de l'export, pas accumulés en mémoire.
        if (ob_get_level() > 0) {
            ob_end_flush();
        }

        try {
            $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            $pdo->exec('START TRANSACTION /*!40100 WITH CONSISTENT SNAPSHOT */');

            $this->echoFlush("-- Sauvegarde KA Tech Hub\n");
            $this->echoFlush('-- Base    : ' . $nomBase . "\n");
            $this->echoFlush('-- Date    : ' . gmdate('c') . " (UTC)\n");
            $this->echoFlush("-- Produit par ControleurMaintenance (compatible phpMyAdmin)\n");
            $this->echoFlush("--\n-- Restauration : voir docs/DEPLOIEMENT.md\n\n");
            $this->echoFlush("SET NAMES utf8mb4;\n");
            $this->echoFlush("SET FOREIGN_KEY_CHECKS = 0;\n");
            $this->echoFlush("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n");
            $this->echoFlush("SET time_zone = '+00:00';\n\n");

            $tables = [];
            $vues = [];
            foreach ($pdo->query('SHOW FULL TABLES', \PDO::FETCH_NUM) as $ligne) {
                if (strtoupper((string) $ligne[1]) === 'VIEW') {
                    $vues[] = (string) $ligne[0];
                } else {
                    $tables[] = (string) $ligne[0];
                }
            }

            if ($tables === [] && $vues === []) {
                throw new ApiException(503, 'BACKUP_ERROR',
                    "La base « {$nomBase} » ne contient aucune table. L'installation a-t-elle été effectuée ?"
                );
            }

            $nbTables = 0;
            $nbLignes = 0;

            foreach ($tables as $table) {
                $nbTables++;
                $q = '`' . str_replace('`', '``', $table) . '`';

                $creation = $pdo->query("SHOW CREATE TABLE {$q}", \PDO::FETCH_NUM)?->fetch();
                if (!is_array($creation) || !isset($creation[1])) {
                    throw new ApiException(503, 'BACKUP_ERROR',
                        "Impossible de lire la structure de la table « {$table} »."
                    );
                }

                $this->echoFlush("\n-- ---------------------------------------------------------\n");
                $this->echoFlush("-- Table {$table}\n");
                $this->echoFlush("-- ---------------------------------------------------------\n");
                $this->echoFlush("DROP TABLE IF EXISTS {$q};\n");
                $this->echoFlush($creation[1] . ";\n\n");

                $nbLignes += $this->exporterLignesMysql($pdo, $table, $q);
            }

            foreach ($vues as $vue) {
                $q = '`' . str_replace('`', '``', $vue) . '`';
                $creation = $pdo->query("SHOW CREATE VIEW {$q}", \PDO::FETCH_NUM)?->fetch();
                if (is_array($creation) && isset($creation[1])) {
                    $this->echoFlush("\nDROP VIEW IF EXISTS {$q};\n");
                    $this->echoFlush($creation[1] . ";\n");
                }
            }

            $this->echoFlush("\nSET FOREIGN_KEY_CHECKS = 1;\n");
            // Marqueur de fin : son absence dans le fichier téléchargé signale un export tronqué.
            $this->echoFlush("-- FIN DE SAUVEGARDE {$nbTables} table(s), {$nbLignes} ligne(s)\n");

            $pdo->exec('COMMIT');
        } catch (ApiException $e) {
            // On ne peut plus annuler les en-têtes HTTP déjà envoyés.
            // On essaie d'écrire le message d'erreur dans le fichier pour que
            // le propriétaire le voie plutôt qu'un fichier tronqué silencieux.
            $this->echoFlush("\n-- ERREUR PENDANT L'EXPORT : " . $e->getMessage() . "\n");
            $this->echoFlush("-- FICHIER INCOMPLET — NE PAS UTILISER POUR UNE RESTAURATION.\n");
            Db::journaliserStatique('[maintenance] Échec export MySQL : ' . $e->getMessage());
            try {
                $pdo->exec('ROLLBACK');
            } catch (\Throwable) {
            }
            exit(1);
        } catch (\Throwable $e) {
            $this->echoFlush("\n-- ERREUR INTERNE PENDANT L'EXPORT\n");
            $this->echoFlush("-- FICHIER INCOMPLET — NE PAS UTILISER POUR UNE RESTAURATION.\n");
            Db::journaliserStatique('[maintenance] Échec export MySQL inattendu : ' . $e->getMessage());
            try {
                $pdo->exec('ROLLBACK');
            } catch (\Throwable) {
            }
            exit(1);
        }

        exit(0);
    }

    /**
     * Exporte les lignes d'une table MySQL en INSERT, par paquets de 200.
     * Ne charge jamais la table entière en mémoire (limite mutualisé : ~128 Mo).
     *
     * @return int nombre de lignes exportées
     */
    private function exporterLignesMysql(\PDO $pdo, string $table, string $tableQuotee): int
    {
        $st = $pdo->prepare("SELECT * FROM {$tableQuotee}");
        $st->execute();

        $nb = 0;
        $tampon = [];
        $colonnes = null;

        while (($ligne = $st->fetch(\PDO::FETCH_ASSOC)) !== false) {
            $colonnes ??= array_keys($ligne);

            $valeurs = [];
            foreach ($ligne as $valeur) {
                $valeurs[] = $this->quoterValeurMysql($pdo, $valeur);
            }
            $tampon[] = '(' . implode(',', $valeurs) . ')';
            $nb++;

            if (count($tampon) >= 200) {
                $this->viderTamponMysql($tableQuotee, $colonnes, $tampon);
            }
        }

        if ($tampon !== [] && $colonnes !== null) {
            $this->viderTamponMysql($tableQuotee, $colonnes, $tampon);
        }

        return $nb;
    }

    /**
     * @param list<string> $colonnes
     * @param list<string> $tampon
     */
    private function viderTamponMysql(string $tableQuotee, array $colonnes, array &$tampon): void
    {
        if ($tampon === []) {
            return;
        }
        $liste = implode(',', array_map(
            static fn (string $c): string => '`' . str_replace('`', '``', $c) . '`',
            $colonnes
        ));
        $this->echoFlush("INSERT INTO {$tableQuotee} ({$liste}) VALUES\n" . implode(",\n", $tampon) . ";\n");
        $tampon = [];
    }

    /** Rend une valeur PHP sous forme de littéral SQL sûr pour MySQL. */
    private function quoterValeurMysql(\PDO $pdo, mixed $valeur): string
    {
        if ($valeur === null) {
            return 'NULL';
        }
        if (is_int($valeur) || is_float($valeur)) {
            return (string) $valeur;
        }
        if (is_bool($valeur)) {
            return $valeur ? '1' : '0';
        }

        $texte = (string) $valeur;

        // Les données binaires (BLOB) ne survivent pas à l'échappement textuel.
        if (!mb_check_encoding($texte, 'UTF-8')) {
            return '0x' . bin2hex($texte);
        }

        return $pdo->quote($texte);
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
     * Les noms de tables sont lus depuis le schéma interne de la base
     * (sqlite_master / information_schema), jamais depuis une entrée utilisateur.
     * Chaque nom est ensuite passé par Db::identifiant() avant interpolation.
     *
     * @return list<array{name:string,rows:int}>
     */
    private function tablesEnListe(): array
    {
        if ($this->db->estSqlite()) {
            $lignes = $this->db->tous(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            );
        } else {
            $lignes = $this->db->tous(
                "SELECT table_name AS name FROM information_schema.tables
                  WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
                  ORDER BY table_name"
            );
        }

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

    /**
     * Écrit du texte sur la sortie et vide immédiatement les tampons.
     *
     * Sur mutualisé, les tampons de sortie PHP peuvent retenir des données.
     * flush() seul ne suffit pas si ob_start() a été appelé quelque part.
     */
    private function echoFlush(string $texte): void
    {
        echo $texte;
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }
}
