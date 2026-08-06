<?php

/**
 * Travailleur CRON — sauvegarde de la base de données.
 *
 * Fonctionne sur LES DEUX pilotes :
 *   - SQLite : instantané cohérent par « VACUUM INTO » (mécanisme de
 *              sauvegarde de SQLite), jamais un simple copy() ;
 *   - MySQL  : export SQL écrit depuis PHP, sans dépendre de mysqldump,
 *              souvent absent d'un hébergement mutualisé.
 *
 * Utilisation :
 *   php api/tools/sauvegarder.php
 *   php api/tools/sauvegarder.php --destination=/chemin/vers/backups
 *   php api/tools/sauvegarder.php --garder=30
 *   php api/tools/sauvegarder.php --sans-compression
 *
 * Exemple de CRON (tous les jours à 3 h 15) :
 *   15 3 * * * php /home/monuser/public_html/api/tools/sauvegarder.php
 *
 * Ne PAS rediriger la sortie vers /dev/null : le CRON de l'hébergeur envoie
 * la sortie par courriel, et c'est précisément ainsi qu'un échec se remarque.
 *
 * Variables d'environnement (api/.env) :
 *   BACKUP_DIR       Dossier de destination. Défaut : ../../katech-data/backups
 *                    relativement à api/, soit HORS de public_html.
 *   BACKUP_KEEP      Nombre de sauvegardes conservées (défaut 14). Les plus
 *                    anciennes sont supprimées après chaque exécution réussie.
 *   BACKUP_COMPRESS  1 (défaut) pour compresser en gzip, 0 sinon.
 *
 * Garanties :
 *   1. Cohérence : aucune écriture partielle n'est capturée (voir plus bas).
 *   2. Destination hors racine web : le script REFUSE d'écrire dans
 *      public_html, car une sauvegarde téléchargeable est une fuite de
 *      toute la base.
 *   3. Vérification : la sauvegarde est relue et contrôlée AVANT que la
 *      rotation ne supprime quoi que ce soit. Une sauvegarde illisible
 *      n'entraîne jamais la suppression d'une sauvegarde valide.
 *   4. Échec bruyant : tout problème écrit sur STDERR, journalise, et sort
 *      avec le code 1. Une sauvegarde qui échoue en silence est pire que
 *      pas de sauvegarde du tout.
 *   5. Verrou : deux exécutions qui se chevauchent ne s'écrasent pas.
 *
 * Restauration : voir docs/DEPLOIEMENT.md, section « Restaurer une sauvegarde ».
 */

declare(strict_types=1);

// =====================================================================
// GARDE D'EXÉCUTION — seconde barrière, indépendante du .htaccess
// =====================================================================
// api/.htaccess refuse déjà /api/tools/. Mais un .htaccess peut être ignoré
// (AllowOverride None, migration vers nginx, erreur de configuration). Ce
// script contient des chemins de sauvegarde et se connecte à la base : il ne
// doit JAMAIS s'exécuter parce que quelqu'un a tapé son URL. Cette garde est
// placée avant tout require : elle tient même si le reste du projet est cassé.
//
// Le critère n'est PAS « SAPI différent de cli » : chez plusieurs mutualisés,
// le CRON est exécuté par php-cgi (SAPI « cgi-fcgi »), et un tel test
// interdirait la sauvegarde automatique — une protection qui casse la
// fonctionnalité qu'elle protège. On refuse donc sur deux critères sûrs :
// un SAPI de serveur web, ou la présence de variables propres à une requête
// HTTP (toujours définies quand la requête vient d'un navigateur, jamais
// définies dans un CRON).
$sapiWeb = in_array(PHP_SAPI, [
    'apache', 'apache2handler', 'apache2filter', 'litespeed', 'fpm-fcgi', 'uwsgi', 'srv',
], true);
$signauxHttp = isset($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI'])
    || isset($_SERVER['HTTP_HOST'])
    || isset($_SERVER['REQUEST_METHOD']);

if ($sapiWeb || $signauxHttp) {
    if (!headers_sent()) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
    }
    echo "Acces refuse : ce script est un outil d'administration en ligne de commande.\n";
    error_log('[katech-sauvegarde] Tentative d\'appel par HTTP refusée.');
    exit(1);
}

$racineApi = dirname(__DIR__);
require $racineApi . '/src/bootstrap.php';

use KaTech\Db;
use KaTech\Env;

$depart = microtime(true);

// =====================================================================
// Verrou d'exécution
// =====================================================================
$verrouChemin = sys_get_temp_dir() . '/katech-sauvegarde.lock';
$verrou = @fopen($verrouChemin, 'c+');
if ($verrou === false) {
    sortirErreur("Impossible de créer le fichier de verrou : {$verrouChemin}");
}
if (!flock($verrou, LOCK_EX | LOCK_NB)) {
    echo "[sauvegarde] Une sauvegarde est déjà en cours. Sortie sans rien faire.\n";
    fclose($verrou);
    exit(0);
}

// =====================================================================
// Configuration
// =====================================================================
try {
    Env::charger();

    $options = lireArguments($argv);

    $destination = (string) ($options['destination']
        ?? Env::get('BACKUP_DIR', dirname($racineApi, 2) . '/katech-data/backups'));
    $garder = (int) ($options['garder'] ?? Env::int('BACKUP_KEEP', 14));
    $compresser = isset($options['sans-compression'])
        ? false
        : Env::bool('BACKUP_COMPRESS', true);

    if ($garder < 1) {
        sortirErreur(
            "BACKUP_KEEP vaut {$garder} : il faut conserver au moins une sauvegarde. "
            . 'Corrigez BACKUP_KEEP dans api/.env.'
        );
    }
    if ($compresser && !function_exists('gzopen')) {
        echo "[sauvegarde] AVERTISSEMENT : l'extension zlib est absente, la compression est désactivée.\n";
        $compresser = false;
    }

    $destination = preparerDestination($destination);

    $db = Db::instance();
    $pilote = $db->pilote();
    $horodatage = gmdate('Ymd-His');

    echo "[sauvegarde] Démarrage — pilote : {$pilote}\n";
    echo "[sauvegarde] Destination : {$destination}\n";

    // -----------------------------------------------------------------
    // Production de la sauvegarde
    // -----------------------------------------------------------------
    $fichier = $db->estSqlite()
        ? sauvegarderSqlite($db, $destination, $horodatage)
        : sauvegarderMysql($db, $destination, $horodatage);

    // -----------------------------------------------------------------
    // Compression (après vérification, jamais avant)
    // -----------------------------------------------------------------
    if ($compresser) {
        $fichier = compresser($fichier);
    }

    $taille = (int) filesize($fichier);
    if ($taille === 0) {
        sortirErreur("La sauvegarde « {$fichier} » est vide. Elle est inutilisable.");
    }

    echo '[sauvegarde] Fichier écrit : ' . basename($fichier) . ' (' . formaterOctets($taille) . ")\n";

    // -----------------------------------------------------------------
    // Rotation — seulement maintenant, la nouvelle sauvegarde étant sûre
    // -----------------------------------------------------------------
    $supprimees = faireLaRotation($destination, $garder);
    if ($supprimees !== []) {
        echo '[sauvegarde] Rotation : ' . count($supprimees) . ' ancienne(s) sauvegarde(s) supprimée(s) — '
            . implode(', ', array_map('basename', $supprimees)) . "\n";
    } else {
        echo "[sauvegarde] Rotation : rien à supprimer (limite de {$garder} non atteinte).\n";
    }

    $duree = round(microtime(true) - $depart, 2);
    echo "[sauvegarde] TERMINÉ avec succès en {$duree} s.\n";

    libererVerrouEtSortir($verrou, 0);
} catch (Throwable $e) {
    // Filet ultime : aucune exception ne doit sortir sans être expliquée.
    sortirErreur(sprintf('%s : %s (%s:%d)', $e::class, $e->getMessage(), $e->getFile(), $e->getLine()));
}

// =====================================================================
// SQLite
// =====================================================================

/**
 * Instantané cohérent d'une base SQLite.
 *
 * Pourquoi pas copy() : le fichier peut être copié au milieu d'une
 * transaction, et une partie des pages du journal WAL peut manquer. Le
 * résultat s'ouvre sans erreur mais peut être corrompu — le pire des cas,
 * une sauvegarde qu'on croit bonne.
 *
 * Deux mécanismes officiels sont tentés, dans l'ordre :
 *   1. « VACUUM INTO » (SQLite 3.27+, via PDO) : écrit un instantané compacté
 *      dans une transaction de lecture. Aucune extension supplémentaire.
 *   2. « SQLite3::backup() » (extension sqlite3, PHP 7.4+) : l'API de
 *      sauvegarde en ligne de SQLite, page par page.
 * Si aucun des deux n'aboutit, on ÉCHOUE. On ne se rabat pas sur copy() :
 * mieux vaut une alerte qu'un fichier auquel on ne peut pas se fier.
 */
function sauvegarderSqlite(Db $db, string $destination, string $horodatage): string
{
    $source = (string) $db->cheminSqlite();

    if (!is_file($source)) {
        sortirErreur(
            "La base SQLite « {$source} » est introuvable. Vérifiez DB_SQLITE_PATH dans api/.env. "
            . "Si l'installation n'a jamais été lancée, ouvrez d'abord /api/install.php."
        );
    }
    if (!is_readable($source)) {
        sortirErreur("La base SQLite « {$source} » n'est pas lisible par l'utilisateur qui exécute le CRON.");
    }

    verifierEspaceDisque($destination, (int) filesize($source));

    $cible = $destination . '/katech-' . $horodatage . '.sqlite';
    if (file_exists($cible)) {
        sortirErreur("Le fichier de sauvegarde « {$cible} » existe déjà. Sauvegarde interrompue.");
    }

    $methode = null;

    // --- 1. VACUUM INTO ----------------------------------------------
    try {
        $pdo = $db->pdo();
        // Le chemin vient de la configuration, pas d'une entrée utilisateur ;
        // il est tout de même échappé par PDO plutôt que concaténé brut.
        $pdo->exec('VACUUM INTO ' . $pdo->quote($cible));
        $methode = 'VACUUM INTO';
    } catch (Throwable $e) {
        echo '[sauvegarde] VACUUM INTO indisponible (' . $e->getMessage() . "), tentative via SQLite3::backup().\n";
        @unlink($cible);
    }

    // --- 2. SQLite3::backup() ----------------------------------------
    if ($methode === null && class_exists('SQLite3') && method_exists('SQLite3', 'backup')) {
        try {
            $src = new SQLite3($source, SQLITE3_OPEN_READONLY);
            $dst = new SQLite3($cible, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
            $src->busyTimeout(10000);
            if (!$src->backup($dst)) {
                throw new RuntimeException('SQLite3::backup() a renvoyé false.');
            }
            $src->close();
            $dst->close();
            $methode = 'SQLite3::backup()';
        } catch (Throwable $e) {
            @unlink($cible);
            sortirErreur(
                'Les deux mécanismes de sauvegarde SQLite ont échoué. Dernière erreur : ' . $e->getMessage()
                . ' — La sauvegarde par simple copie de fichier n\'est volontairement PAS proposée en repli : '
                . 'elle produirait un fichier potentiellement corrompu.'
            );
        }
    }

    if ($methode === null) {
        sortirErreur(
            'Aucun mécanisme de sauvegarde SQLite disponible : « VACUUM INTO » a échoué et l\'extension '
            . 'PHP « sqlite3 » est absente (seul pdo_sqlite est activé). Activez l\'extension sqlite3 dans '
            . 'le panneau de l\'hébergeur, ou basculez sur MySQL.'
        );
    }

    echo "[sauvegarde] Instantané SQLite pris via {$methode}.\n";

    verifierSauvegardeSqlite($cible, $db);

    return $cible;
}

/**
 * Relit la sauvegarde et refuse de la valider si elle est corrompue ou vide.
 * C'est ce contrôle qui distingue « un fichier a été écrit » de
 * « une sauvegarde exploitable existe ».
 */
function verifierSauvegardeSqlite(string $cible, Db $db): void
{
    if (!is_file($cible) || filesize($cible) === 0) {
        sortirErreur("La sauvegarde « {$cible} » n'a pas été écrite ou est vide.");
    }

    try {
        $copie = new PDO('sqlite:' . $cible, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

        $integrite = (string) $copie->query('PRAGMA integrity_check')?->fetchColumn();
        if (strtolower($integrite) !== 'ok') {
            sortirErreur("Contrôle d'intégrité de la sauvegarde ÉCHOUÉ : {$integrite}");
        }

        $nbCopie = (int) $copie->query(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        )?->fetchColumn();

        $nbSource = (int) $db->valeur(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        );

        if ($nbCopie !== $nbSource) {
            sortirErreur(
                "La sauvegarde contient {$nbCopie} table(s) alors que la base en compte {$nbSource}. "
                . 'Sauvegarde incomplète.'
            );
        }

        echo "[sauvegarde] Vérification : intégrité OK, {$nbCopie} table(s) présentes.\n";
    } catch (PDOException $e) {
        sortirErreur('La sauvegarde produite est illisible : ' . $e->getMessage());
    }
}

// =====================================================================
// MySQL
// =====================================================================

/**
 * Export SQL d'une base MySQL, écrit intégralement depuis PHP.
 *
 * mysqldump est fréquemment absent (ou son exécution interdite) sur un
 * hébergement mutualisé : on ne peut pas en dépendre.
 *
 * Cohérence : le dump est produit dans une transaction unique en isolation
 * REPEATABLE READ, ouverte AVANT la première lecture. Toutes les tables sont
 * donc vues dans le même état, y compris si des commandes arrivent pendant
 * l'export. C'est l'équivalent du --single-transaction de mysqldump, et cela
 * ne pose aucun verrou sur les tables InnoDB.
 *
 * Le fichier produit est rejouable tel quel dans phpMyAdmin.
 */
function sauvegarderMysql(Db $db, string $destination, string $horodatage): string
{
    $pdo = $db->pdo();
    $cible = $destination . '/katech-' . $horodatage . '.sql';

    if (file_exists($cible)) {
        sortirErreur("Le fichier de sauvegarde « {$cible} » existe déjà. Sauvegarde interrompue.");
    }

    $handle = @fopen($cible, 'wb');
    if ($handle === false) {
        sortirErreur("Impossible d'écrire dans « {$cible} ». Vérifiez les droits du dossier de sauvegarde.");
    }

    $nomBase = (string) $pdo->query('SELECT DATABASE()')?->fetchColumn();
    $nbTables = 0;
    $nbLignes = 0;

    try {
        $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        $pdo->exec('START TRANSACTION /*!40100 WITH CONSISTENT SNAPSHOT */');

        ecrire($handle, "-- Sauvegarde KA Tech Hub\n");
        ecrire($handle, '-- Base    : ' . $nomBase . "\n");
        ecrire($handle, '-- Date    : ' . gmdate('c') . " (UTC)\n");
        ecrire($handle, '-- Produit par api/tools/sauvegarder.php (sans mysqldump)' . "\n");
        ecrire($handle, "--\n-- Restauration : voir docs/DEPLOIEMENT.md\n\n");

        ecrire($handle, "SET NAMES utf8mb4;\n");
        ecrire($handle, "SET FOREIGN_KEY_CHECKS = 0;\n");
        ecrire($handle, "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n");
        ecrire($handle, "SET time_zone = '+00:00';\n\n");

        // Tables d'abord, vues ensuite : une vue peut dépendre d'une table.
        $tables = [];
        $vues = [];
        foreach ($pdo->query('SHOW FULL TABLES', PDO::FETCH_NUM) as $ligne) {
            if (strtoupper((string) $ligne[1]) === 'VIEW') {
                $vues[] = (string) $ligne[0];
            } else {
                $tables[] = (string) $ligne[0];
            }
        }

        if ($tables === [] && $vues === []) {
            sortirErreur(
                "La base « {$nomBase} » ne contient aucune table. Rien à sauvegarder — "
                . "l'installation a-t-elle été effectuée (/api/install.php) ?"
            );
        }

        foreach ($tables as $table) {
            $nbTables++;
            $q = '`' . str_replace('`', '``', $table) . '`';

            $creation = $pdo->query("SHOW CREATE TABLE {$q}", PDO::FETCH_NUM)?->fetch();
            if (!is_array($creation) || !isset($creation[1])) {
                sortirErreur("Impossible de lire la structure de la table « {$table} ».");
            }

            ecrire($handle, "\n-- ---------------------------------------------------------\n");
            ecrire($handle, "-- Table {$table}\n");
            ecrire($handle, "-- ---------------------------------------------------------\n");
            ecrire($handle, "DROP TABLE IF EXISTS {$q};\n");
            ecrire($handle, $creation[1] . ";\n\n");

            $nbLignes += ecrireLignes($pdo, $handle, $table, $q);
        }

        foreach ($vues as $vue) {
            $q = '`' . str_replace('`', '``', $vue) . '`';
            $creation = $pdo->query("SHOW CREATE VIEW {$q}", PDO::FETCH_NUM)?->fetch();
            if (is_array($creation) && isset($creation[1])) {
                ecrire($handle, "\nDROP VIEW IF EXISTS {$q};\n");
                ecrire($handle, $creation[1] . ";\n");
            }
        }

        ecrire($handle, "\nSET FOREIGN_KEY_CHECKS = 1;\n");
        // Marqueur de fin : son absence signale un export tronqué.
        ecrire($handle, "-- FIN DE SAUVEGARDE {$nbTables} table(s), {$nbLignes} ligne(s)\n");

        $pdo->exec('COMMIT');
    } catch (Throwable $e) {
        fclose($handle);
        @unlink($cible);
        try {
            $pdo->exec('ROLLBACK');
        } catch (Throwable) {
            // La transaction est déjà close : rien à faire.
        }
        sortirErreur("Export MySQL interrompu : {$e->getMessage()} — aucun fichier partiel n'a été conservé.");
    }

    fclose($handle);

    verifierSauvegardeMysql($cible, $nbTables);
    echo "[sauvegarde] Export MySQL : {$nbTables} table(s), {$nbLignes} ligne(s).\n";

    return $cible;
}

/**
 * Écrit les INSERT d'une table, par paquets, sans jamais charger la table
 * entière en mémoire (limite de mémoire d'un mutualisé : souvent 128 Mo).
 */
function ecrireLignes(PDO $pdo, mixed $handle, string $table, string $tableQuotee): int
{
    $st = $pdo->prepare("SELECT * FROM {$tableQuotee}");
    $st->execute();

    $nb = 0;
    $tampon = [];
    // Les noms de colonnes sont figés à la PREMIÈRE ligne et réutilisés
    // ensuite : à la fin de la boucle, fetch() a renvoyé false et la
    // dernière ligne n'est plus disponible pour les déduire.
    $colonnes = null;

    while (($ligne = $st->fetch(PDO::FETCH_ASSOC)) !== false) {
        $colonnes ??= array_keys($ligne);

        $valeurs = [];
        foreach ($ligne as $valeur) {
            $valeurs[] = quoterValeur($pdo, $valeur);
        }
        $tampon[] = '(' . implode(',', $valeurs) . ')';
        $nb++;

        // Paquets de 200 lignes : un compromis entre taille du fichier et
        // risque de dépasser max_allowed_packet à la restauration.
        if (count($tampon) >= 200) {
            viderTampon($handle, $tableQuotee, $colonnes, $tampon);
        }
    }

    if ($tampon !== [] && $colonnes !== null) {
        viderTampon($handle, $tableQuotee, $colonnes, $tampon);
    }

    return $nb;
}

/**
 * @param list<string> $colonnes
 * @param list<string> $tampon
 */
function viderTampon(mixed $handle, string $tableQuotee, array $colonnes, array &$tampon): void
{
    if ($tampon === []) {
        return;
    }
    $liste = implode(',', array_map(
        static fn (string $c): string => '`' . str_replace('`', '``', $c) . '`',
        $colonnes
    ));
    ecrire($handle, "INSERT INTO {$tableQuotee} ({$liste}) VALUES\n" . implode(",\n", $tampon) . ";\n");
    $tampon = [];
}

/** Rend une valeur PHP sous forme de littéral SQL sûr. */
function quoterValeur(PDO $pdo, mixed $valeur): string
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

    // Les données binaires (une image stockée en BLOB) ne survivraient pas à
    // un échappement textuel : on les écrit en hexadécimal.
    if (!mb_check_encoding($texte, 'UTF-8')) {
        return '0x' . bin2hex($texte);
    }

    return $pdo->quote($texte);
}

/** Relit l'export et vérifie qu'il est complet. */
function verifierSauvegardeMysql(string $cible, int $nbTablesAttendues): void
{
    if (!is_file($cible) || filesize($cible) === 0) {
        sortirErreur("L'export « {$cible} » n'a pas été écrit ou est vide.");
    }

    // Le marqueur de fin est la preuve que l'écriture est allée à son terme.
    $fin = lireFinDeFichier($cible, 200);
    if (!str_contains($fin, 'FIN DE SAUVEGARDE')) {
        sortirErreur(
            "L'export « {$cible} » ne se termine pas par son marqueur de fin : il est tronqué "
            . '(disque plein ? délai d\'exécution dépassé ?).'
        );
    }

    $nbCreate = 0;
    $fh = fopen($cible, 'rb');
    if ($fh !== false) {
        while (($l = fgets($fh)) !== false) {
            if (str_starts_with($l, 'CREATE TABLE')) {
                $nbCreate++;
            }
        }
        fclose($fh);
    }

    if ($nbCreate !== $nbTablesAttendues) {
        sortirErreur(
            "L'export contient {$nbCreate} CREATE TABLE pour {$nbTablesAttendues} table(s) attendue(s). "
            . 'Export incomplet.'
        );
    }

    echo "[sauvegarde] Vérification : marqueur de fin présent, {$nbCreate} table(s) exportées.\n";
}

// =====================================================================
// Destination, rotation, utilitaires
// =====================================================================

/**
 * Valide le dossier de destination et le crée au besoin.
 *
 * Refus catégorique d'écrire sous public_html : une sauvegarde accessible par
 * HTTP livre l'intégralité de la base — clients, commandes, mots de passe
 * hachés — à quiconque devine son nom.
 */
function preparerDestination(string $chemin): string
{
    $chemin = rtrim($chemin, '/');
    if ($chemin === '') {
        sortirErreur('BACKUP_DIR est vide. Indiquez un dossier de destination dans api/.env.');
    }

    if (!is_dir($chemin)) {
        if (!@mkdir($chemin, 0770, true) && !is_dir($chemin)) {
            sortirErreur(
                "Le dossier de sauvegarde « {$chemin} » n'existe pas et n'a pas pu être créé. "
                . 'Créez-le depuis le gestionnaire de fichiers de l\'hébergeur, HORS de public_html, '
                . 'et rendez-le inscriptible.'
            );
        }
    }

    $reel = realpath($chemin);
    if ($reel === false) {
        sortirErreur("Le dossier de sauvegarde « {$chemin} » est introuvable après création.");
    }

    if (!is_writable($reel)) {
        sortirErreur("Le dossier de sauvegarde « {$reel} » n'est pas inscriptible par PHP (droits 0770 attendus).");
    }

    // Garde-fou : jamais dans la racine web.
    $normalise = str_replace('\\', '/', $reel);
    if (preg_match('#(^|/)(public_html|htdocs|www|public)(/|$)#', $normalise) === 1) {
        sortirErreur(
            "REFUS D'ÉCRIRE : le dossier de sauvegarde « {$reel} » se trouve dans la racine web. "
            . 'Les sauvegardes seraient téléchargeables par HTTP, ce qui exposerait toute la base. '
            . 'Placez BACKUP_DIR hors de public_html, par exemple /home/monuser/katech-data/backups.'
        );
    }

    // Un index.html vide en plus : si la destination finissait malgré tout
    // exposée un jour, aucun listing ne serait possible.
    $garde = $reel . '/index.html';
    if (!file_exists($garde)) {
        @file_put_contents($garde, '');
    }

    return $reel;
}

/**
 * Supprime les sauvegardes les plus anciennes au-delà de $garder.
 *
 * Ne touche QUE les fichiers produits par ce script (préfixe « katech- » et
 * extension attendue) : le dossier peut contenir autre chose, et une rotation
 * qui efface un fichier étranger serait une perte de données.
 *
 * Le nom contient un horodatage AAAAMMJJ-HHMMSS : l'ordre alphabétique est
 * donc l'ordre chronologique, y compris si les dates de fichier sont fausses.
 *
 * @return list<string> chemins supprimés
 */
function faireLaRotation(string $destination, int $garder): array
{
    $motif = $destination . '/katech-*';
    $trouves = glob($motif);
    if ($trouves === false) {
        echo "[sauvegarde] AVERTISSEMENT : impossible de lister « {$destination} », rotation ignorée.\n";

        return [];
    }

    $sauvegardes = array_values(array_filter(
        $trouves,
        static fn (string $f): bool => is_file($f)
            && preg_match('/^katech-\d{8}-\d{6}\.(sqlite|sql)(\.gz)?$/', basename($f)) === 1
    ));

    sort($sauvegardes, SORT_STRING);

    $aSupprimer = count($sauvegardes) > $garder
        ? array_slice($sauvegardes, 0, count($sauvegardes) - $garder)
        : [];

    $supprimees = [];
    foreach ($aSupprimer as $fichier) {
        if (@unlink($fichier)) {
            $supprimees[] = $fichier;
        } else {
            // Non fatal — la sauvegarde du jour est faite — mais jamais tu.
            echo "[sauvegarde] AVERTISSEMENT : impossible de supprimer « {$fichier} ». "
                . "Le dossier va grossir : vérifiez les droits.\n";
        }
    }

    return $supprimees;
}

/** Compresse en gzip, puis supprime l'original seulement si tout s'est bien passé. */
function compresser(string $fichier): string
{
    $cible = $fichier . '.gz';

    $entree = @fopen($fichier, 'rb');
    if ($entree === false) {
        sortirErreur("Compression impossible : « {$fichier} » illisible.");
    }
    $sortie = @gzopen($cible, 'wb9');
    if ($sortie === false) {
        fclose($entree);
        sortirErreur("Compression impossible : écriture de « {$cible} » refusée.");
    }

    while (!feof($entree)) {
        $bloc = fread($entree, 262144);
        if ($bloc === false) {
            fclose($entree);
            gzclose($sortie);
            @unlink($cible);
            sortirErreur("Compression interrompue à la lecture de « {$fichier} ».");
        }
        if (gzwrite($sortie, $bloc) === false) {
            fclose($entree);
            gzclose($sortie);
            @unlink($cible);
            sortirErreur("Compression interrompue à l'écriture de « {$cible} » (disque plein ?).");
        }
    }

    fclose($entree);
    gzclose($sortie);

    if (!is_file($cible) || filesize($cible) === 0) {
        @unlink($cible);
        sortirErreur("La compression de « {$fichier} » a produit un fichier vide.");
    }

    // L'original n'est retiré qu'une fois l'archive écrite et non vide.
    @unlink($fichier);

    return $cible;
}

/** Refuse de démarrer si l'espace libre est manifestement insuffisant. */
function verifierEspaceDisque(string $destination, int $tailleSource): void
{
    $libre = @disk_free_space($destination);
    if ($libre === false) {
        return; // Information indisponible : on n'invente pas, on continue.
    }

    // Marge de 20 % : VACUUM INTO écrit une copie compactée, jamais plus
    // grosse que la source, mais la compression a besoin de place en plus.
    $requis = (int) ($tailleSource * 1.2);
    if ($libre < $requis) {
        sortirErreur(sprintf(
            'Espace disque insuffisant dans « %s » : %s disponibles pour %s nécessaires. '
            . 'Libérez de la place ou réduisez BACKUP_KEEP.',
            $destination,
            formaterOctets((int) $libre),
            formaterOctets($requis),
        ));
    }
}

/** @return array<string,string|true> */
function lireArguments(array $argv): array
{
    $options = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (!str_starts_with($arg, '--')) {
            sortirErreur("Argument non reconnu : « {$arg} ». Options : --destination=… --garder=N --sans-compression");
        }
        $arg = substr($arg, 2);
        $pos = strpos($arg, '=');
        if ($pos === false) {
            $options[$arg] = true;
        } else {
            $options[substr($arg, 0, $pos)] = substr($arg, $pos + 1);
        }
    }

    foreach (array_keys($options) as $cle) {
        if (!in_array($cle, ['destination', 'garder', 'sans-compression'], true)) {
            sortirErreur("Option inconnue : « --{$cle} ». Options : --destination=… --garder=N --sans-compression");
        }
    }

    return $options;
}

/** Écriture contrôlée : un disque plein ne doit pas passer inaperçu. */
function ecrire(mixed $handle, string $texte): void
{
    $ecrit = fwrite($handle, $texte);
    if ($ecrit === false || $ecrit < strlen($texte)) {
        throw new RuntimeException('Écriture incomplète dans le fichier de sauvegarde (disque plein ?).');
    }
}

function lireFinDeFichier(string $chemin, int $octets): string
{
    $fh = fopen($chemin, 'rb');
    if ($fh === false) {
        return '';
    }
    $taille = (int) filesize($chemin);
    fseek($fh, max(0, $taille - $octets));
    $fin = (string) fread($fh, $octets);
    fclose($fh);

    return $fin;
}

function formaterOctets(int $octets): string
{
    $unites = ['o', 'Ko', 'Mo', 'Go'];
    $i = 0;
    $v = (float) $octets;
    while ($v >= 1024 && $i < count($unites) - 1) {
        $v /= 1024;
        $i++;
    }

    return round($v, $i === 0 ? 0 : 1) . ' ' . $unites[$i];
}

/** @param resource $verrou */
function libererVerrouEtSortir(mixed $verrou, int $code): never
{
    flock($verrou, LOCK_UN);
    fclose($verrou);
    exit($code);
}

/**
 * Échec bruyant : STDERR (que le CRON envoie par courriel), journal du
 * serveur, et code de sortie 1. Jamais de sortie silencieuse.
 */
function sortirErreur(string $message): never
{
    fwrite(STDERR, "[sauvegarde] ÉCHEC : {$message}\n");
    error_log('[katech-sauvegarde] ÉCHEC : ' . $message);
    exit(1);
}
