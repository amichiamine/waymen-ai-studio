<?php

/**
 * Travailleur CRON — sauvegarde de la base de données.
 *
 * Fonctionne sur LES TROIS pilotes :
 *   - SQLite     : instantané cohérent par « VACUUM INTO » (mécanisme de
 *                  sauvegarde de SQLite), jamais un simple copy() ;
 *   - MySQL      : export SQL écrit depuis PHP, sans dépendre de mysqldump,
 *                  souvent absent d'un hébergement mutualisé ;
 *   - PostgreSQL : export SQL écrit depuis PHP pour la même raison — `pg_dump`
 *                  n'existe pas plus sur un mutualisé, et n'est de toute façon
 *                  pas joignable sur un Supabase où l'on n'a que la connexion
 *                  SQL. La structure est reconstruite depuis les catalogues
 *                  (`pg_attribute`, `pg_constraint`, `pg_indexes`).
 *
 * Utilisation :
 *   php api/tools/sauvegarder.php
 *   php api/tools/sauvegarder.php --destination=/chemin/vers/backups
 *   php api/tools/sauvegarder.php --garder=30
 *   php api/tools/sauvegarder.php --sans-compression
 *   php api/tools/sauvegarder.php --verifier=/chemin/katech-….sql[.gz]
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
 *   3. Vérification PAR LE CONTENU : la sauvegarde est relue et contrôlée
 *      AVANT que la rotation ne supprime quoi que ce soit. Une sauvegarde
 *      illisible n'entraîne jamais la suppression d'une sauvegarde valide.
 *   4. Échec bruyant : tout problème écrit sur STDERR, journalise, et sort
 *      avec le code 1. Une sauvegarde qui échoue en silence est pire que
 *      pas de sauvegarde du tout.
 *   5. Verrou : deux exécutions qui se chevauchent ne s'écrasent pas.
 *
 * ---------------------------------------------------------------------------
 * CE QUE « VÉRIFIÉE » VEUT DIRE ICI — et pourquoi ça a changé
 * ---------------------------------------------------------------------------
 * La version précédente contrôlait, en SQLite, `PRAGMA integrity_check` plus le
 * NOMBRE de tables ; en MySQL, la présence du marqueur de fin plus le nombre de
 * `CREATE TABLE`. Ces contrôles portent tous sur la STRUCTURE. Une sauvegarde
 * dont les LIGNES manqueraient, seraient tronquées ou déformées les passait
 * sans un mot — 23 tables bien présentes, toutes vides, verdict « OK ». Le
 * commerçant croyait ses données à l'abri.
 *
 * Désormais la vérification porte sur le CONTENU : une EMPREINTE est calculée
 * par table, ligne à ligne, sur la base vivante, puis RECALCULÉE depuis la
 * sauvegarde produite (relecture du fichier SQLite, ou analyse des INSERT du
 * fichier SQL). Les deux doivent coïncider, table par table.
 *
 * L'algorithme est celui de `api/src/Migration/Migrateur.php` (section
 * « Empreintes de contenu »), à dessein : c'est déjà le juge de la fidélité
 * d'une migration inter-moteurs, et deux façons différentes de mesurer la même
 * chose finiraient par diverger. Deux propriétés en font le bon outil ici :
 *   - l'agrégat est COMMUTATIF (OU-exclusif + somme + compte), donc insensible
 *     à l'ordre des lignes — aucun `ORDER BY` coûteux à imposer, et aucun faux
 *     écart dû aux collations ;
 *   - les valeurs sont NORMALISÉES avant hachage, si bien qu'un entier relu
 *     depuis un littéral SQL (« 42 ») et le même entier rendu par PDO (42)
 *     donnent la même empreinte.
 * Les méthodes du migrateur sont privées et ce script doit tourner seul depuis
 * un CRON : l'algorithme est donc repris ici, avec les mêmes règles. Toute
 * modification de l'un doit être reportée dans l'autre.
 *
 * Les empreintes sont aussi ÉCRITES dans le fichier de sauvegarde (lignes
 * `-- EMPREINTE …`), ce qui le rend auto-descriptif : des mois plus tard,
 * `--verifier=…` peut rejuger une archive sans la restaurer.
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

    // --------------------------------------------------------------
    // Mode « vérifier seulement » : rejuge une sauvegarde existante.
    //
    // Sert à deux choses, l'une pour l'exploitant, l'autre pour la recette :
    //   - contrôler qu'une archive d'il y a six mois est toujours fidèle,
    //     sans avoir à la restaurer par-dessus la production ;
    //   - prouver que la vérification SAIT REFUSER. Une vérification qu'on ne
    //     peut pas faire échouer ne démontre rien.
    // --------------------------------------------------------------
    if (isset($options['verifier'])) {
        $aVerifier = (string) $options['verifier'];
        if ($aVerifier === '' || $aVerifier === '1') {
            sortirErreur('--verifier attend un chemin : --verifier=/chemin/katech-….sql');
        }
        verifierSauvegardeExistante(Db::instance(), $aVerifier);
        libererVerrouEtSortir($verrou, 0);
    }

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
    // UNE BRANCHE PAR PILOTE. L'ancien « si SQLite, sinon MySQL » envoyait une
    // base PostgreSQL vers l'exportateur MySQL (SHOW FULL TABLES, backticks) :
    // aucune sauvegarde n'était possible en pgsql. Le `match` sans branche par
    // défaut fera échouer bruyamment tout pilote ajouté sans passer ici.
    $fichier = match ($pilote) {
        Db::PILOTE_SQLITE => sauvegarderSqlite($db, $destination, $horodatage),
        Db::PILOTE_MYSQL => sauvegarderMysql($db, $destination, $horodatage),
        Db::PILOTE_PGSQL => sauvegarderPgsql($db, $destination, $horodatage),
    };

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
 * Relit la sauvegarde et refuse de la valider si elle est corrompue, vide, ou
 * si son CONTENU diffère de celui de la base.
 *
 * Trois étages, du moins au plus exigeant :
 *   1. `PRAGMA integrity_check` — le fichier est un SQLite cohérent ;
 *   2. même liste de tables que la source — rien n'a été oublié ;
 *   3. MÊME CONTENU, table par table, empreinte contre empreinte.
 *
 * L'étage 3 est celui qui manquait. Sans lui, une copie contenant les 23 tables
 * VIDES était déclarée bonne.
 */
function verifierSauvegardeSqlite(string $cible, Db $db): void
{
    if (!is_file($cible) || filesize($cible) === 0) {
        sortirErreur("La sauvegarde « {$cible} » n'a pas été écrite ou est vide.");
    }

    try {
        $copie = new PDO('sqlite:' . $cible, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $integrite = (string) $copie->query('PRAGMA integrity_check')?->fetchColumn();
        if (strtolower($integrite) !== 'ok') {
            sortirErreur("Contrôle d'intégrité de la sauvegarde ÉCHOUÉ : {$integrite}");
        }

        $tablesCopie = listerTablesSqlite($copie);
        $tablesSource = listerTablesSqlite($db->pdo());

        $manquantes = array_diff($tablesSource, $tablesCopie);
        $enTrop = array_diff($tablesCopie, $tablesSource);
        if ($manquantes !== [] || $enTrop !== []) {
            sortirErreur(
                'La sauvegarde n\'a pas les mêmes tables que la base'
                . ($manquantes === [] ? '' : ' — absentes de la copie : ' . implode(', ', $manquantes))
                . ($enTrop === [] ? '' : ' — présentes en trop : ' . implode(', ', $enTrop))
                . '. Sauvegarde incomplète.'
            );
        }

        $empreintesCopie = empreintesDeBase($copie, $tablesSource);
        $empreintesSource = empreintesDeBase($db->pdo(), $tablesSource);

        $ecarts = comparerEmpreintes($empreintesSource, $empreintesCopie);

        if ($ecarts !== []) {
            // Un écart peut avoir DEUX causes très différentes : la sauvegarde
            // est fausse (grave), ou la base a été écrite pendant qu'on la
            // sauvegardait (bénin — l'instantané reste cohérent, il est
            // simplement plus ancien que la base). On tranche en relisant la
            // source : si son empreinte a bougé entre deux lectures, c'est
            // qu'une écriture est passée.
            $secondeLecture = empreintesDeBase($db->pdo(), $tablesSource);
            if ($secondeLecture !== $empreintesSource) {
                echo "[sauvegarde] AVERTISSEMENT : la base a été modifiée pendant la sauvegarde. "
                    . "L'instantané reste cohérent, mais il ne reflète pas les toutes dernières "
                    . "écritures. Tables concernées : " . implode(', ', array_keys($ecarts)) . "\n";
            } else {
                sortirErreur(
                    'CONTENU DIVERGENT entre la base et sa sauvegarde, alors que la base est stable. '
                    . 'La sauvegarde n\'est PAS fidèle et ne doit pas être considérée comme valide. '
                    . 'Détail — ' . implode(' ; ', $ecarts)
                );
            }
        }

        $lignes = array_sum(array_map('nombreDeLignesEmpreinte', $empreintesCopie));
        echo '[sauvegarde] Vérification du CONTENU : intégrité OK, ' . count($tablesSource)
            . " table(s), {$lignes} ligne(s), empreintes identiques à la base.\n";
    } catch (PDOException $e) {
        sortirErreur('La sauvegarde produite est illisible : ' . $e->getMessage());
    }
}

/** @return list<string> */
function listerTablesSqlite(PDO $pdo): array
{
    $tables = (array) $pdo->query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )?->fetchAll(PDO::FETCH_COLUMN);

    return array_values(array_map('strval', $tables));
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
    /** @var array<string,string> $empreintes table → empreinte de contenu */
    $empreintes = [];

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

            // L'empreinte est calculée sur les lignes TELLES QU'ON LES LIT,
            // c'est-à-dire dans l'instantané de la transaction. La comparer
            // ensuite au contenu du fichier compare bien deux fois la même
            // chose : aucune écriture concurrente ne peut fausser le verdict.
            $agregat = nouvelAgregat();
            $nbLignes += ecrireLignes($pdo, $handle, $table, $q, 'mysql', $agregat);
            $empreintes[$table] = condenserEmpreinte($agregat);
            ecrire($handle, ligneEmpreinte($table, $empreintes[$table]));
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

    echo "[sauvegarde] Export MySQL : {$nbTables} table(s), {$nbLignes} ligne(s).\n";
    verifierSauvegardeSql($cible, 'mysql', $nbTables, $empreintes);

    return $cible;
}

/**
 * Écrit les INSERT d'une table, par paquets, sans jamais charger la table
 * entière en mémoire (limite de mémoire d'un mutualisé : souvent 128 Mo).
 *
 * Au passage, cumule l'empreinte de contenu des lignes lues : les mêmes octets
 * servent à écrire ET à mesurer, sans seconde lecture de la table.
 *
 * @param array{xor:string,somme:array<int,int>,nb:int} $agregat
 */
function ecrireLignes(
    PDO $pdo,
    mixed $handle,
    string $table,
    string $tableQuotee,
    string $pilote,
    array &$agregat,
): int {
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

        cumulerEmpreinte($agregat, empreinteLigne($table, $ligne));

        $valeurs = [];
        foreach ($ligne as $valeur) {
            $valeurs[] = quoterValeur($pdo, $valeur, $pilote);
        }
        $tampon[] = '(' . implode(',', $valeurs) . ')';
        $nb++;

        // Paquets de 200 lignes : un compromis entre taille du fichier et
        // risque de dépasser max_allowed_packet à la restauration.
        if (count($tampon) >= 200) {
            viderTampon($handle, $tableQuotee, $colonnes, $tampon, $pilote);
        }
    }

    if ($tampon !== [] && $colonnes !== null) {
        viderTampon($handle, $tableQuotee, $colonnes, $tampon, $pilote);
    }

    return $nb;
}

/**
 * @param list<string> $colonnes
 * @param list<string> $tampon
 */
function viderTampon(
    mixed $handle,
    string $tableQuotee,
    array $colonnes,
    array &$tampon,
    string $pilote,
): void {
    if ($tampon === []) {
        return;
    }
    $liste = implode(',', array_map(
        static fn (string $c): string => identifiantQuote($c, $pilote),
        $colonnes
    ));
    ecrire($handle, "INSERT INTO {$tableQuotee} ({$liste}) VALUES\n" . implode(",\n", $tampon) . ";\n");
    $tampon = [];
}

/** Backtick en MySQL, guillemet double partout ailleurs (norme SQL). */
function identifiantQuote(string $nom, string $pilote): string
{
    return $pilote === 'mysql'
        ? '`' . str_replace('`', '``', $nom) . '`'
        : '"' . str_replace('"', '""', $nom) . '"';
}

/** Rend une valeur PHP sous forme de littéral SQL sûr, pour le pilote donné. */
function quoterValeur(PDO $pdo, mixed $valeur, string $pilote): string
{
    if ($valeur === null) {
        return 'NULL';
    }
    if (is_int($valeur) || is_float($valeur)) {
        return (string) $valeur;
    }
    if (is_bool($valeur)) {
        // PostgreSQL REFUSE `1` dans une colonne booléenne (« column is of type
        // boolean but expression is of type integer ») : le dump serait
        // rejouable en MySQL et pas en PostgreSQL.
        return $pilote === 'pgsql'
            ? ($valeur ? 'TRUE' : 'FALSE')
            : ($valeur ? '1' : '0');
    }

    $texte = (string) $valeur;

    // Les données binaires (une image stockée en BLOB) ne survivraient pas à
    // un échappement textuel : on les écrit en hexadécimal.
    if (!mb_check_encoding($texte, 'UTF-8')) {
        return $pilote === 'pgsql'
            ? "'\\x" . bin2hex($texte) . "'::bytea"
            : '0x' . bin2hex($texte);
    }

    return $pdo->quote($texte);
}

// =====================================================================
// PostgreSQL
// =====================================================================

/**
 * Export SQL d'une base PostgreSQL, écrit intégralement depuis PHP.
 *
 * POURQUOI PAS `pg_dump` : la raison est la même qu'en MySQL avec `mysqldump`,
 * en pire. Un mutualisé ne fournit pas le binaire et interdit souvent
 * `exec()` ; et chez Supabase, on n'a QUE la connexion SQL — aucun accès shell
 * à la machine du serveur. Un outil de sauvegarde qui exige un binaire absent
 * est un outil qui ne sauvegarde pas.
 *
 * Cohérence : tout l'export vit dans une transaction REPEATABLE READ READ ONLY,
 * ouverte AVANT la première lecture. PostgreSQL y sert un instantané figé (MVCC)
 * sans poser le moindre verrou : les commandes continuent d'arriver pendant la
 * sauvegarde, elles ne seront simplement pas dedans. C'est l'équivalent exact du
 * `--serializable-deferrable` de pg_dump pour ce qui nous intéresse.
 *
 * Structure : reconstruite depuis les catalogues. L'ordre du fichier est pensé
 * pour être rejouable tel quel dans psql ou dans l'éditeur SQL de Supabase :
 *   1. toutes les tables SANS leurs clés étrangères ;
 *   2. les données ;
 *   3. les clés étrangères, puis les index, puis les vues ;
 *   4. le repositionnement des séquences d'identité.
 * Différer les clés étrangères évite d'avoir à trier les tables par dépendance,
 * et rend l'import insensible à un cycle de références.
 */
function sauvegarderPgsql(Db $db, string $destination, string $horodatage): string
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

    $nomBase = (string) $pdo->query('SELECT current_database()')?->fetchColumn();
    $nbTables = 0;
    $nbLignes = 0;
    /** @var array<string,string> $empreintes */
    $empreintes = [];

    try {
        // La connexion est épinglée en READ COMMITTED par Db : on demande donc
        // explicitement l'isolation de l'instantané pour CETTE transaction.
        $pdo->exec('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

        $schema = (string) $pdo->query('SELECT current_schema()')?->fetchColumn();

        ecrire($handle, "-- Sauvegarde KA Tech Hub\n");
        ecrire($handle, '-- Base    : ' . $nomBase . ' (schéma ' . $schema . ")\n");
        ecrire($handle, '-- Date    : ' . gmdate('c') . " (UTC)\n");
        ecrire($handle, '-- Produit par api/tools/sauvegarder.php (sans pg_dump)' . "\n");
        ecrire($handle, "--\n-- Restauration : voir docs/DEPLOIEMENT.md\n\n");

        // `standard_conforming_strings = on` est le défaut depuis PostgreSQL 9.1,
        // mais on le fixe : sans lui, les antislashs des littéraux écrits par
        // PDO::quote() seraient réinterprétés comme des échappements, et une
        // chaîne « C:\temp » reviendrait déformée.
        ecrire($handle, "SET client_encoding = 'UTF8';\n");
        ecrire($handle, "SET standard_conforming_strings = on;\n");
        ecrire($handle, "SET client_min_messages = warning;\n\n");

        $tables = tablesPgsql($pdo);
        if ($tables === []) {
            sortirErreur(
                "La base « {$nomBase} » ne contient aucune table. Rien à sauvegarder — "
                . "l'installation a-t-elle été effectuée (/api/install.php) ?"
            );
        }

        $clesEtrangeres = [];
        $index = [];

        foreach ($tables as $table) {
            $nbTables++;
            $q = identifiantQuote($table, 'pgsql');

            ecrire($handle, "\n-- ---------------------------------------------------------\n");
            ecrire($handle, "-- Table {$table}\n");
            ecrire($handle, "-- ---------------------------------------------------------\n");
            ecrire($handle, "DROP TABLE IF EXISTS {$q} CASCADE;\n");
            ecrire($handle, creationTablePgsql($pdo, $table));

            foreach (clesEtrangeresPgsql($pdo, $table) as $def) {
                $clesEtrangeres[] = "ALTER TABLE {$q} ADD {$def};";
            }
            foreach (indexPgsql($pdo, $table) as $def) {
                $index[] = $def . ';';
            }
        }

        // --- Données ---------------------------------------------------
        foreach ($tables as $table) {
            $q = identifiantQuote($table, 'pgsql');
            ecrire($handle, "\n-- Données de {$table}\n");

            $agregat = nouvelAgregat();
            $nbLignes += ecrireLignes($pdo, $handle, $table, $q, 'pgsql', $agregat);
            $empreintes[$table] = condenserEmpreinte($agregat);
            ecrire($handle, ligneEmpreinte($table, $empreintes[$table]));
        }

        // --- Clés étrangères, index, vues ------------------------------
        if ($clesEtrangeres !== []) {
            ecrire($handle, "\n-- Clés étrangères (posées après les données)\n");
            ecrire($handle, implode("\n", $clesEtrangeres) . "\n");
        }
        if ($index !== []) {
            ecrire($handle, "\n-- Index\n");
            ecrire($handle, implode("\n", $index) . "\n");
        }

        $vues = (array) $pdo->query(
            'SELECT viewname, definition FROM pg_catalog.pg_views '
            . 'WHERE schemaname = ANY (current_schemas(false)) ORDER BY viewname'
        )?->fetchAll(PDO::FETCH_ASSOC);
        foreach ($vues as $vue) {
            $qv = identifiantQuote((string) $vue['viewname'], 'pgsql');
            ecrire($handle, "\nDROP VIEW IF EXISTS {$qv};\n");
            ecrire($handle, "CREATE VIEW {$qv} AS\n" . trim((string) $vue['definition']) . "\n");
        }

        // --- Séquences d'identité --------------------------------------
        // PIÈGE CLASSIQUE : réinsérer `id = 42` ne fait pas avancer la séquence.
        // Sans ce repositionnement, la première création faite par
        // l'application APRÈS restauration échoue en doublon de clé — des jours
        // plus tard, quand plus personne ne fait le lien avec la restauration.
        $sequences = sequencesIdentitePgsql($pdo, $tables);
        if ($sequences !== []) {
            ecrire($handle, "\n-- Repositionnement des séquences d'identité\n");
            ecrire($handle, implode("\n", $sequences) . "\n");
        }

        // Marqueur de fin : son absence signale un export tronqué.
        ecrire($handle, "\n-- FIN DE SAUVEGARDE {$nbTables} table(s), {$nbLignes} ligne(s)\n");

        $pdo->exec('COMMIT');
    } catch (Throwable $e) {
        fclose($handle);
        @unlink($cible);
        try {
            $pdo->exec('ROLLBACK');
        } catch (Throwable) {
            // La transaction est déjà close : rien à faire.
        }
        sortirErreur("Export PostgreSQL interrompu : {$e->getMessage()} — aucun fichier partiel n'a été conservé.");
    }

    fclose($handle);

    echo "[sauvegarde] Export PostgreSQL : {$nbTables} table(s), {$nbLignes} ligne(s).\n";
    verifierSauvegardeSql($cible, 'pgsql', $nbTables, $empreintes);

    return $cible;
}

/**
 * Tables ordinaires du schéma courant. `current_schemas(false)` suit le
 * `search_path` réel : écrire « public » en dur casserait sur un projet
 * Supabase dont le schéma applicatif est ailleurs.
 *
 * @return list<string>
 */
function tablesPgsql(PDO $pdo): array
{
    $tables = (array) $pdo->query(
        'SELECT tablename FROM pg_catalog.pg_tables '
        . 'WHERE schemaname = ANY (current_schemas(false)) ORDER BY tablename'
    )?->fetchAll(PDO::FETCH_COLUMN);

    return array_values(array_map('strval', $tables));
}

/**
 * Reconstruit le `CREATE TABLE`, clés étrangères EXCLUES (elles sont posées
 * après les données, voir `sauvegarderPgsql()`).
 */
function creationTablePgsql(PDO $pdo, string $table): string
{
    $st = $pdo->prepare(
        'SELECT a.attname AS nom, '
        . '       format_type(a.atttypid, a.atttypmod) AS type, '
        . '       a.attnotnull AS obligatoire, '
        . '       a.attidentity AS identite, '
        . '       pg_get_expr(d.adbin, d.adrelid) AS defaut '
        . '  FROM pg_catalog.pg_attribute a '
        . '  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum '
        . ' WHERE a.attrelid = to_regclass(?) AND a.attnum > 0 AND NOT a.attisdropped '
        . ' ORDER BY a.attnum'
    );
    $st->execute([$table]);
    $colonnes = (array) $st->fetchAll(PDO::FETCH_ASSOC);

    if ($colonnes === []) {
        sortirErreur("Impossible de lire la structure de la table « {$table} » dans les catalogues.");
    }

    $morceaux = [];
    foreach ($colonnes as $c) {
        $ligne = '  ' . identifiantQuote((string) $c['nom'], 'pgsql') . ' ' . (string) $c['type'];

        // Une colonne d'identité n'a pas de DEFAULT lisible : son `nextval` est
        // implicite. Il faut réécrire la clause GENERATED, sinon la colonne
        // redevient un simple entier et l'application ne peut plus insérer.
        $identite = (string) ($c['identite'] ?? '');
        if ($identite === 'a') {
            $ligne .= ' GENERATED ALWAYS AS IDENTITY';
        } elseif ($identite === 'd') {
            $ligne .= ' GENERATED BY DEFAULT AS IDENTITY';
        } elseif ($c['defaut'] !== null) {
            $ligne .= ' DEFAULT ' . (string) $c['defaut'];
        }

        if (versBooleenPhp($c['obligatoire'])) {
            $ligne .= ' NOT NULL';
        }
        $morceaux[] = $ligne;
    }

    // PRIMARY KEY, UNIQUE et CHECK sont posées avec la table : elles ne créent
    // aucune dépendance entre tables, contrairement aux clés étrangères.
    $st = $pdo->prepare(
        'SELECT conname, pg_get_constraintdef(oid) AS def '
        . '  FROM pg_catalog.pg_constraint '
        . " WHERE conrelid = to_regclass(?) AND contype IN ('p', 'u', 'c') "
        . ' ORDER BY contype, conname'
    );
    $st->execute([$table]);
    foreach ((array) $st->fetchAll(PDO::FETCH_ASSOC) as $c) {
        $morceaux[] = '  CONSTRAINT ' . identifiantQuote((string) $c['conname'], 'pgsql')
            . ' ' . (string) $c['def'];
    }

    return 'CREATE TABLE ' . identifiantQuote($table, 'pgsql') . " (\n"
        . implode(",\n", $morceaux) . "\n);\n";
}

/**
 * Clés étrangères, rendues sous forme de clauses `ADD CONSTRAINT …`.
 *
 * @return list<string>
 */
function clesEtrangeresPgsql(PDO $pdo, string $table): array
{
    $st = $pdo->prepare(
        'SELECT conname, pg_get_constraintdef(oid) AS def '
        . '  FROM pg_catalog.pg_constraint '
        . " WHERE conrelid = to_regclass(?) AND contype = 'f' ORDER BY conname"
    );
    $st->execute([$table]);

    $defs = [];
    foreach ((array) $st->fetchAll(PDO::FETCH_ASSOC) as $c) {
        $defs[] = 'CONSTRAINT ' . identifiantQuote((string) $c['conname'], 'pgsql') . ' ' . (string) $c['def'];
    }

    return $defs;
}

/**
 * Index de la table, à l'exclusion de ceux qui servent de support à une
 * contrainte : ceux-là sont déjà recréés par la contrainte elle-même, et les
 * redéclarer ferait échouer la restauration sur un nom en double.
 *
 * @return list<string>
 */
function indexPgsql(PDO $pdo, string $table): array
{
    $st = $pdo->prepare(
        'SELECT i.indexname, i.indexdef '
        . '  FROM pg_catalog.pg_indexes i '
        . ' WHERE i.schemaname = ANY (current_schemas(false)) AND i.tablename = ? '
        . '   AND NOT EXISTS ('
        . '        SELECT 1 FROM pg_catalog.pg_constraint c '
        . '         WHERE c.conrelid = to_regclass(i.tablename) '
        . '           AND c.conindid = to_regclass(i.indexname)) '
        . ' ORDER BY i.indexname'
    );
    $st->execute([$table]);

    $defs = [];
    foreach ((array) $st->fetchAll(PDO::FETCH_ASSOC) as $i) {
        $defs[] = (string) $i['indexdef'];
    }

    return $defs;
}

/**
 * Ordres `setval` pour toutes les séquences d'identité des tables exportées.
 *
 * `GREATEST(…, 1)` ignore le NULL d'une table vide : la séquence repart alors
 * de 1, ce qui est exactement l'état d'une base neuve.
 *
 * @param list<string> $tables
 * @return list<string>
 */
function sequencesIdentitePgsql(PDO $pdo, array $tables): array
{
    $ordres = [];

    foreach ($tables as $table) {
        $st = $pdo->prepare(
            'SELECT a.attname AS nom '
            . '  FROM pg_catalog.pg_attribute a '
            . " WHERE a.attrelid = to_regclass(?) AND a.attnum > 0 AND NOT a.attisdropped "
            . "   AND a.attidentity <> ''"
        );
        $st->execute([$table]);

        foreach ((array) $st->fetchAll(PDO::FETCH_COLUMN) as $colonne) {
            $colonne = (string) $colonne;
            $qt = identifiantQuote($table, 'pgsql');
            $qc = identifiantQuote($colonne, 'pgsql');
            // Les deux littéraux sont des identifiants validés par
            // `identifiantQuote()`, pas des valeurs venues d'un utilisateur.
            $ordres[] = sprintf(
                "SELECT setval(pg_get_serial_sequence('%s', '%s'), "
                . 'GREATEST((SELECT MAX(%s) FROM %s), 1), true);',
                str_replace("'", "''", $table),
                str_replace("'", "''", $colonne),
                $qc,
                $qt,
            );
        }
    }

    return $ordres;
}

/** Interprète le booléen tel que PDO le rend selon le pilote (bool, « t », 1…). */
function versBooleenPhp(mixed $valeur): bool
{
    if (is_bool($valeur)) {
        return $valeur;
    }
    if (is_int($valeur) || is_float($valeur)) {
        return (float) $valeur !== 0.0;
    }

    return in_array(strtolower(trim((string) $valeur)), ['1', 't', 'true', 'y', 'yes', 'on'], true);
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

// =====================================================================
// Empreintes de contenu
// =====================================================================
// Même algorithme que `api/src/Migration/Migrateur.php`, section « Empreintes
// de contenu » (voir l'en-tête de ce fichier pour le pourquoi de la reprise).
// Toute évolution de l'un doit être reportée dans l'autre, sinon une base
// migrée et une base sauvegardée cesseraient d'être jugées par la même règle.

/**
 * Accumulateur COMMUTATIF : l'ordre des lignes ne doit pas compter, car rien
 * ne garantit qu'un fichier de sauvegarde et une base rendent leurs lignes
 * dans le même ordre (collations différentes, index différents).
 *
 * Le OU-exclusif seul ne suffirait pas — deux lignes identiques s'annuleraient.
 * On lui adjoint une somme par mots de 32 bits et le nombre de lignes, tous
 * deux sensibles à la duplication comme à la disparition.
 *
 * @return array{xor:string,somme:array<int,int>,nb:int}
 */
function nouvelAgregat(): array
{
    return ['xor' => str_repeat("\0", 16), 'somme' => [0, 0, 0, 0], 'nb' => 0];
}

/** @param array{xor:string,somme:array<int,int>,nb:int} $agregat */
function cumulerEmpreinte(array &$agregat, string $digest): void
{
    $agregat['xor'] ^= $digest;
    $mots = array_values((array) unpack('N4', $digest));
    foreach ($mots as $i => $mot) {
        $agregat['somme'][$i] = ($agregat['somme'][$i] + $mot) % 4294967296;
    }
    $agregat['nb']++;
}

/**
 * Forme lisible « <24 hexa>.<nombre de lignes> ». Le nombre de lignes est
 * apparent à dessein : quand une empreinte diverge, le message dit tout de
 * suite s'il manque des lignes ou si leur contenu a changé.
 *
 * @param array{xor:string,somme:array<int,int>,nb:int} $agregat
 */
function condenserEmpreinte(array $agregat): string
{
    return substr(md5(sprintf(
        '%s|%08x%08x%08x%08x|%d',
        bin2hex($agregat['xor']),
        $agregat['somme'][0],
        $agregat['somme'][1],
        $agregat['somme'][2],
        $agregat['somme'][3],
        $agregat['nb'],
    )), 0, 24) . '.' . $agregat['nb'];
}

function nombreDeLignesEmpreinte(string $empreinte): int
{
    $pos = strrpos($empreinte, '.');

    return $pos === false ? 0 : (int) substr($empreinte, $pos + 1);
}

/**
 * Empreinte d'une ligne. Les colonnes sont triées par nom : l'ordre des
 * colonnes rendu par un `SELECT *` ne doit pas influer sur le verdict.
 *
 * @param array<string,mixed> $ligne
 */
function empreinteLigne(string $table, array $ligne): string
{
    ksort($ligne, SORT_STRING);

    $morceaux = [];
    foreach ($ligne as $nom => $valeur) {
        $morceaux[] = $nom . '=' . normaliserValeur($valeur);
    }

    return md5($table . "\x1e" . implode("\x1f", $morceaux), true);
}

/**
 * Forme canonique d'une valeur, indépendante de sa provenance.
 *
 * La difficulté propre à ce fichier : la MÊME donnée est vue une fois telle que
 * PDO la rend (entier 42, booléen true, NULL) et une fois telle qu'elle a été
 * réécrite en littéral SQL puis relue (« 42 », TRUE, NULL). Sans normalisation,
 * chaque ligne semblerait avoir changé.
 *
 * Divergences absorbées :
 *   - NULL     : marqueur dédié, JAMAIS confondu avec la chaîne vide ;
 *   - booléens : true/false, 1/0, « t »/« f » ;
 *   - nombres  : « 10 », « 10.00 » et « 1.0E+1 » convergent.
 * Le reste est comparé littéralement, octet pour octet : c'est le plus sévère,
 * et c'est ce qu'on veut d'un contrôle de sauvegarde.
 */
function normaliserValeur(mixed $valeur): string
{
    if ($valeur === null) {
        return "\x00NUL";
    }
    if (is_resource($valeur)) {
        $valeur = stream_get_contents($valeur);
    }
    if (is_bool($valeur)) {
        return $valeur ? '1' : '0';
    }
    if (is_int($valeur) || is_float($valeur)) {
        return normaliserNombre($valeur);
    }

    $texte = (string) $valeur;

    // Un texte purement numérique est normalisé lui aussi : PDO rend « 42 »
    // pour une colonne VARCHAR contenant 42, et l'analyseur du fichier rend
    // « 42 » également — mais un entier natif arriverait en int d'un côté et en
    // chaîne de l'autre. On aligne les deux plutôt que de deviner le type.
    if (is_numeric($texte)) {
        return normaliserNombre($texte);
    }

    return $texte;
}

/** Écriture décimale canonique : « 10 », « 10.00 » et « 1.0E1 » convergent. */
function normaliserNombre(mixed $valeur): string
{
    $texte = trim((string) $valeur);
    if ($texte === '' || !is_numeric($texte)) {
        return $texte;
    }
    if (stripos($texte, 'e') !== false) {
        $texte = rtrim(rtrim(sprintf('%.12F', (float) $texte), '0'), '.');
    }

    $negatif = str_starts_with($texte, '-');
    $texte = ltrim($texte, '+-');
    if (str_contains($texte, '.')) {
        $texte = rtrim(rtrim($texte, '0'), '.');
    }
    $texte = ltrim($texte, '0');
    if ($texte === '' || str_starts_with($texte, '.')) {
        $texte = '0' . $texte;
    }

    return ($negatif && $texte !== '0' ? '-' : '') . $texte;
}

/**
 * Empreinte de chaque table d'une base ouverte (source ou copie SQLite).
 *
 * Lecture ligne à ligne, jamais `fetchAll()` : une table de commandes d'un an
 * ne doit pas être chargée en mémoire d'un coup sur un mutualisé à 128 Mo.
 *
 * @param list<string> $tables
 * @return array<string,string> table → empreinte
 */
function empreintesDeBase(PDO $pdo, array $tables, string $pilote = 'sqlite'): array
{
    $empreintes = [];

    foreach ($tables as $table) {
        $agregat = nouvelAgregat();
        $st = $pdo->query('SELECT * FROM ' . identifiantQuote($table, $pilote));
        if ($st !== false) {
            while (($ligne = $st->fetch(PDO::FETCH_ASSOC)) !== false) {
                cumulerEmpreinte($agregat, empreinteLigne($table, $ligne));
            }
        }
        $empreintes[$table] = condenserEmpreinte($agregat);
    }

    return $empreintes;
}

/**
 * Compare deux jeux d'empreintes et décrit chaque écart en clair.
 *
 * @param array<string,string> $attendues
 * @param array<string,string> $obtenues
 * @return array<string,string> table → description de l'écart
 */
function comparerEmpreintes(array $attendues, array $obtenues): array
{
    $ecarts = [];

    foreach ($attendues as $table => $attendue) {
        $obtenue = $obtenues[$table] ?? null;
        if ($obtenue === null) {
            $ecarts[$table] = "table « {$table} » ABSENTE de la sauvegarde";
            continue;
        }
        if ($obtenue === $attendue) {
            continue;
        }

        $nAttendu = nombreDeLignesEmpreinte($attendue);
        $nObtenu = nombreDeLignesEmpreinte($obtenue);
        $ecarts[$table] = $nAttendu !== $nObtenu
            ? "table « {$table} » : {$nObtenu} ligne(s) sauvegardée(s) pour {$nAttendu} attendue(s)"
            : "table « {$table} » : {$nAttendu} ligne(s) de part et d'autre mais CONTENU DIFFÉRENT "
                . "(empreinte {$obtenue} au lieu de {$attendue})";
    }

    foreach ($obtenues as $table => $obtenue) {
        if (!array_key_exists($table, $attendues)) {
            $ecarts[$table] = "table « {$table} » présente dans la sauvegarde mais absente de la base";
        }
    }

    return $ecarts;
}

/** Ligne de commentaire portant l'empreinte d'une table dans le fichier SQL. */
function ligneEmpreinte(string $table, string $empreinte): string
{
    return "-- EMPREINTE table={$table} empreinte={$empreinte}\n";
}

// =====================================================================
// Vérification d'un export SQL — par le contenu
// =====================================================================

/**
 * Relit l'export SQL et refuse de le valider si son contenu ne correspond pas
 * à ce qui a été lu dans la base.
 *
 * Quatre étages :
 *   1. marqueur de fin — l'écriture est allée à son terme ;
 *   2. autant de `CREATE TABLE` que de tables — la structure est là ;
 *   3. empreintes annoncées dans le fichier = empreintes de la base ;
 *   4. empreintes RECALCULÉES depuis les INSERT du fichier = les mêmes.
 *
 * L'étage 4 est le seul qui prouve quelque chose sur les DONNÉES. Les trois
 * premiers restent utiles : ils nomment précisément la panne (fichier tronqué,
 * structure incomplète, en-tête altéré) au lieu de laisser conclure « contenu
 * divergent » à un disque plein.
 *
 * @param array<string,string> $empreintesSource table → empreinte lue en base
 */
function verifierSauvegardeSql(
    string $cible,
    string $pilote,
    int $nbTablesAttendues,
    array $empreintesSource,
): void {
    if (!is_file($cible) || filesize($cible) === 0) {
        sortirErreur("L'export « {$cible} » n'a pas été écrit ou est vide.");
    }

    $fin = lireFinDeFichier($cible, 200);
    if (!str_contains($fin, 'FIN DE SAUVEGARDE')) {
        sortirErreur(
            "L'export « {$cible} » ne se termine pas par son marqueur de fin : il est tronqué "
            . '(disque plein ? délai d\'exécution dépassé ?).'
        );
    }

    $lu = analyserExportSql($cible, $pilote);

    if ($lu['creations'] !== $nbTablesAttendues) {
        sortirErreur(
            "L'export contient {$lu['creations']} CREATE TABLE pour {$nbTablesAttendues} table(s) "
            . 'attendue(s). Export incomplet.'
        );
    }

    // Étage 3 — les empreintes ANNONCÉES dans le fichier.
    $ecartsAnnonces = comparerEmpreintes($empreintesSource, $lu['empreintes_annoncees']);
    if ($ecartsAnnonces !== []) {
        sortirErreur(
            'Les empreintes inscrites dans l\'export ne correspondent pas à celles de la base : '
            . implode(' ; ', $ecartsAnnonces)
            . '. L\'en-tête du fichier a été altéré, ou l\'export a été interrompu.'
        );
    }

    // Étage 4 — les empreintes RECALCULÉES depuis les INSERT du fichier.
    $ecarts = comparerEmpreintes($empreintesSource, $lu['empreintes_calculees']);
    if ($ecarts !== []) {
        sortirErreur(
            'CONTENU DIVERGENT : les données réellement présentes dans l\'export ne sont pas celles '
            . 'de la base. La sauvegarde n\'est PAS fidèle et ne doit pas être considérée comme '
            . 'valide. Détail — ' . implode(' ; ', $ecarts)
        );
    }

    $lignes = array_sum(array_map('nombreDeLignesEmpreinte', $lu['empreintes_calculees']));
    echo '[sauvegarde] Vérification du CONTENU : marqueur de fin présent, '
        . "{$lu['creations']} table(s), {$lignes} ligne(s) relues depuis le fichier, "
        . "empreintes identiques à la base.\n";
}

/**
 * Rejuge une sauvegarde déjà écrite, contre la base actuelle (`--verifier=…`).
 *
 * Attention à ce que cela veut dire : le verdict compare l'archive à la base
 * TELLE QU'ELLE EST AUJOURD'HUI. Sur une base qui a vécu depuis, un écart est
 * normal — c'est pour cela que le fichier porte aussi ses propres empreintes,
 * qui elles ne dépendent de rien d'extérieur et sont vérifiées en premier.
 */
function verifierSauvegardeExistante(Db $db, string $chemin): void
{
    if (!is_file($chemin)) {
        sortirErreur("Fichier à vérifier introuvable : « {$chemin} ».");
    }

    $temporaire = null;
    if (str_ends_with($chemin, '.gz')) {
        $temporaire = decompresserVersTemporaire($chemin);
        $chemin = $temporaire;
    }

    $pilote = $db->pilote();
    echo "[sauvegarde] Vérification de « {$chemin} » (pilote {$pilote}).\n";

    try {
        if ($pilote === Db::PILOTE_SQLITE) {
            verifierSauvegardeSqlite($chemin, $db);

            return;
        }

        // EXHAUSTIVITE D'ABORD. Les empreintes sont ecrites table par table :
        // un fichier coupe en deux conserve donc, pour les tables qui ont
        // survecu, des donnees parfaitement coherentes avec leurs empreintes.
        // Le controle de coherence interne le declare alors sain. Ce n'est pas
        // theorique : un export MySQL tronque a 60 % passait ce mode sans un
        // mot, et le commercant aurait cru ses donnees a l'abri.
        //
        // Le marqueur de fin est le seul temoin qu'aucune table ne MANQUE. On
        // le controle donc avant tout le reste.
        $fin = lireFinDeFichier($chemin, 200);
        if (!str_contains($fin, 'FIN DE SAUVEGARDE')) {
            sortirErreur(
                "ARCHIVE TRONQUEE : « {$chemin} » ne porte pas son marqueur de fin. L'export a ete "
                . 'interrompu (disque plein, delai depasse, transfert coupe). Les tables presentes '
                . 'peuvent sembler intactes ; celles qui manquent, elles, ne laissent aucune trace.'
            );
        }

        $lu = analyserExportSql($chemin, $pilote);

        // EXHAUSTIVITE. Le marqueur de fin ne dit pas seulement « le fichier
        // est complet » : il DECLARE combien de tables et de lignes il devait
        // contenir. Se contenter de constater sa presence laissait passer le
        // pire cas, qui a ete mesure ici : une coupure NETTE a une frontiere de
        // table, marqueur recolle. Les 14 tables survivantes restaient
        // coherentes avec leurs 14 empreintes, et la comparaison a la base ne
        // portait que sur ces 14 — les 10 disparues n'etaient comparees a rien.
        // Verdict rendu : « archive IDENTIQUE a la base actuelle ». Sur une
        // sauvegarde amputee de 40 % de la boutique.
        //
        // On lit donc le compte annonce, et on le confronte a ce qu'on a trouve.
        $attendu = compteAnnonceParLeMarqueur($fin);
        if ($attendu !== null) {
            $trouvees = count($lu['empreintes_annoncees']);
            $lignes = array_sum(array_map('nombreDeLignesEmpreinte', $lu['empreintes_calculees']));
            if ($trouvees !== $attendu['tables'] || $lignes !== $attendu['lignes']) {
                sortirErreur(
                    "ARCHIVE INCOMPLETE : le fichier annonce {$attendu['tables']} table(s) et "
                    . "{$attendu['lignes']} ligne(s), on en trouve {$trouvees} et {$lignes}. "
                    . 'Une partie du contenu a disparu — les tables restantes peuvent etre '
                    . 'parfaitement coherentes, la sauvegarde n\'en est pas moins amputee.'
                );
            }
        }

        if ($lu['empreintes_annoncees'] === []) {
            sortirErreur(
                "L'export « {$chemin} » ne porte aucune ligne « -- EMPREINTE » : il a été produit "
                . 'par une version antérieure de ce script, qui ne vérifiait que la structure. '
                . 'Son contenu ne peut pas être jugé ; produisez une nouvelle sauvegarde.'
            );
        }

        // 1. Le fichier est-il cohérent avec LUI-MÊME ? Verdict indépendant de
        //    l'état actuel de la base — c'est le contrôle qui vaut pour une
        //    archive ancienne.
        $ecartsInternes = comparerEmpreintes($lu['empreintes_annoncees'], $lu['empreintes_calculees']);
        if ($ecartsInternes !== []) {
            sortirErreur(
                'ARCHIVE CORROMPUE : les données présentes dans le fichier ne correspondent pas aux '
                . 'empreintes qu\'il annonce. Détail — ' . implode(' ; ', $ecartsInternes)
            );
        }
        echo '[sauvegarde] Cohérence interne : OK, ' . count($lu['empreintes_annoncees'])
            . " table(s) conformes à leurs empreintes.\n";

        // 2. Et par rapport à la base d'aujourd'hui ? Écart = information, pas
        //    forcément faute.
        $tables = array_keys($lu['empreintes_annoncees']);
        sort($tables, SORT_STRING);
        $actuelles = empreintesDeBase($db->pdo(), $tables, $pilote);
        $ecarts = comparerEmpreintes($actuelles, $lu['empreintes_calculees']);
        if ($ecarts === []) {
            echo "[sauvegarde] L'archive est IDENTIQUE à la base actuelle.\n";
        } else {
            echo "[sauvegarde] L'archive est cohérente mais DIFFÈRE de la base actuelle "
                . "(normal si la base a vécu depuis) : " . implode(' ; ', $ecarts) . "\n";
        }
    } finally {
        if ($temporaire !== null) {
            @unlink($temporaire);
        }
    }
}

/** Décompresse une archive .gz dans un fichier temporaire, pour l'analyser. */
function decompresserVersTemporaire(string $chemin): string
{
    if (!function_exists('gzopen')) {
        sortirErreur("L'extension zlib est absente : impossible de lire « {$chemin} ».");
    }

    $sortieChemin = (string) tempnam(sys_get_temp_dir(), 'katech-verif-');
    $entree = gzopen($chemin, 'rb');
    $sortie = @fopen($sortieChemin, 'wb');
    if ($entree === false || $sortie === false) {
        @unlink($sortieChemin);
        sortirErreur("Décompression impossible de « {$chemin} ».");
    }
    while (!gzeof($entree)) {
        fwrite($sortie, (string) gzread($entree, 262144));
    }
    gzclose($entree);
    fclose($sortie);

    return $sortieChemin;
}

/**
 * Analyse un export SQL produit par ce script et en RECALCULE le contenu.
 *
 * On n'analyse pas « du SQL » en général — ce serait un projet à soi seul. On
 * analyse le format que ce script écrit lui-même, ce qui rend l'exercice sûr :
 *   `INSERT INTO <table> (<colonnes>) VALUES\n(…),\n(…);`
 * Toute ligne qui ne s'y conforme pas est signalée plutôt qu'ignorée : un
 * fichier abîmé ne doit pas passer pour un fichier sans données.
 *
 * @return array{creations:int,empreintes_annoncees:array<string,string>,empreintes_calculees:array<string,string>}
 */
function analyserExportSql(string $chemin, string $pilote): array
{
    $fh = fopen($chemin, 'rb');
    if ($fh === false) {
        sortirErreur("Impossible de relire l'export « {$chemin} ».");
    }

    $creations = 0;
    $annoncees = [];
    /** @var array<string,array{xor:string,somme:array<int,int>,nb:int}> $agregats */
    $agregats = [];
    $tablesVues = [];

    // État de l'analyseur d'INSERT : une instruction peut s'étaler sur des
    // milliers de lignes (paquets de 200 tuples), on ne charge donc jamais le
    // fichier entier — seulement l'instruction courante.
    $enCours = null;
    $tampon = '';
    $etatChaine = ['dans' => false, 'echap' => false];

    while (($ligne = fgets($fh)) !== false) {
        if ($enCours === null) {
            if (str_starts_with($ligne, 'CREATE TABLE')) {
                $creations++;
                continue;
            }
            if (str_starts_with($ligne, '-- EMPREINTE ')) {
                if (preg_match('/^-- EMPREINTE table=(\S+) empreinte=(\S+)/', $ligne, $m) === 1) {
                    $annoncees[$m[1]] = $m[2];
                }
                continue;
            }
            if (!str_starts_with($ligne, 'INSERT INTO ')) {
                continue;
            }

            // En-tête de l'INSERT : nom de table et liste de colonnes.
            if (preg_match(
                '/^INSERT INTO\s+(?:`([^`]+)`|"([^"]+)"|([A-Za-z0-9_]+))\s*\(([^)]*)\)\s*VALUES\s*$/',
                rtrim($ligne, "\r\n"),
                $m
            ) !== 1) {
                sortirErreur(
                    'Ligne INSERT illisible dans l\'export — le fichier est abîmé ou n\'a pas été '
                    . 'produit par ce script : ' . trim(substr($ligne, 0, 160))
                );
            }
            $table = $m[1] !== '' ? $m[1] : ($m[2] !== '' ? $m[2] : $m[3]);
            $enCours = ['table' => $table, 'colonnes' => decouperColonnes($m[4])];
            $tablesVues[$table] = true;
            $agregats[$table] ??= nouvelAgregat();
            $tampon = '';
            $etatChaine = ['dans' => false, 'echap' => false];
            continue;
        }

        $tampon .= $ligne;
        $etatChaine = suivreEtatChaine($ligne, $pilote, $etatChaine);

        // L'instruction se termine par « ; » en fin de ligne — mais SEULEMENT
        // hors chaîne. Une valeur peut légitimement contenir un saut de ligne
        // et se terminer par « ; » : « Livraison le 5;\nmerci ». Sans suivi de
        // l'état « dans une chaîne », l'analyseur couperait l'instruction en
        // plein milieu et crierait au fichier abîmé — un faux positif qui
        // ferait échouer toutes les sauvegardes d'une boutique dont un seul
        // commentaire client a cette forme.
        if ($etatChaine['dans'] || !str_ends_with(rtrim($ligne, "\r\n"), ';')) {
            continue;
        }

        foreach (analyserTuples($tampon, $pilote, $enCours['table']) as $tuple) {
            if (count($tuple) !== count($enCours['colonnes'])) {
                sortirErreur(sprintf(
                    'Table « %s » : une ligne de l\'export porte %d valeur(s) pour %d colonne(s). '
                    . 'Le fichier est abîmé.',
                    $enCours['table'],
                    count($tuple),
                    count($enCours['colonnes']),
                ));
            }
            $ligneAssoc = array_combine($enCours['colonnes'], $tuple);
            cumulerEmpreinte($agregats[$enCours['table']], empreinteLigne($enCours['table'], $ligneAssoc));
        }

        $enCours = null;
        $tampon = '';
    }

    fclose($fh);

    if ($enCours !== null) {
        sortirErreur(
            "L'export s'arrête au milieu d'un INSERT sur la table « {$enCours['table']} » : "
            . 'il est tronqué.'
        );
    }

    // Une table déclarée par une empreinte mais sans aucun INSERT est
    // légitimement vide : son agrégat vide condensera en « ….0 », ce qui est
    // exactement l'empreinte d'une table vide côté source.
    foreach (array_keys($annoncees) as $table) {
        $agregats[$table] ??= nouvelAgregat();
    }

    $calculees = [];
    foreach ($agregats as $table => $agregat) {
        $calculees[$table] = condenserEmpreinte($agregat);
    }

    return [
        'creations' => $creations,
        'empreintes_annoncees' => $annoncees,
        'empreintes_calculees' => $calculees,
    ];
}

/**
 * Suit, d'une ligne à l'autre, si l'analyseur se trouve à l'intérieur d'une
 * chaîne SQL — et, en MySQL, si un antislash de fin de ligne échappe le saut
 * de ligne suivant.
 *
 * @param array{dans:bool,echap:bool} $etat
 * @return array{dans:bool,echap:bool}
 */
function suivreEtatChaine(string $ligne, string $pilote, array $etat): array
{
    $dans = $etat['dans'];
    $echap = $etat['echap'];
    $len = strlen($ligne);

    for ($i = 0; $i < $len; $i++) {
        $c = $ligne[$i];

        if ($echap) {
            $echap = false;
            continue;
        }
        if ($dans && $c === '\\' && $pilote === 'mysql') {
            $echap = true;
            continue;
        }
        if ($c !== "'") {
            continue;
        }
        if ($dans && $i + 1 < $len && $ligne[$i + 1] === "'") {
            // Apostrophe doublée : littérale, on ne quitte pas la chaîne.
            $i++;
            continue;
        }
        $dans = !$dans;
    }

    return ['dans' => $dans, 'echap' => $echap];
}

/**
 * Découpe la liste de colonnes d'un INSERT, en retirant les quotes.
 *
 * @return list<string>
 */
function decouperColonnes(string $liste): array
{
    $noms = [];
    foreach (explode(',', $liste) as $brut) {
        $noms[] = trim(trim(trim($brut), '`"'));
    }

    return $noms;
}

/**
 * Analyse la section VALUES d'un INSERT et rend les tuples en valeurs PHP.
 *
 * Les règles d'échappement DIFFÈRENT selon le moteur, et se tromper de règle
 * fabriquerait de fausses divergences :
 *   - PostgreSQL (standard_conforming_strings=on, posé par l'en-tête du
 *     fichier) : seule `''` échappe une apostrophe, l'antislash est un
 *     caractère ordinaire ;
 *   - MySQL : l'antislash échappe (\' \\ \n \r \0 \Z), et `''` fonctionne aussi.
 *
 * @return list<list<mixed>>
 */
function analyserTuples(string $texte, string $pilote, string $table): array
{
    $tuples = [];
    $i = 0;
    $len = strlen($texte);
    $tuple = null;
    $courant = null;

    $fermerValeur = static function () use (&$courant, &$tuple): void {
        if ($courant !== null) {
            $tuple[] = $courant['valeur'];
            $courant = null;
        }
    };

    while ($i < $len) {
        $c = $texte[$i];

        if ($tuple === null) {
            if ($c === '(') {
                $tuple = [];
            }
            $i++;
            continue;
        }

        if ($c === "'") {
            [$chaine, $i] = lireChaineSql($texte, $i, $pilote, $table);
            // `'\x…'::bytea` (PostgreSQL) et `0x…` (MySQL) portent du binaire :
            // on le redéchiffre pour retrouver les octets d'origine.
            if ($pilote === 'pgsql' && str_starts_with($chaine, '\\x') && str_starts_with(substr($texte, $i), '::bytea')) {
                $i += strlen('::bytea');
                $chaine = (string) hex2bin(substr($chaine, 2));
            }
            $courant = ['valeur' => $chaine];
            continue;
        }

        if ($c === ',' || $c === ')') {
            $fermerValeur();
            if ($c === ')') {
                $tuples[] = $tuple;
                $tuple = null;
            }
            $i++;
            continue;
        }

        if (ctype_space($c)) {
            $i++;
            continue;
        }

        // Littéral nu : NULL, TRUE, FALSE, un nombre, ou 0x… en MySQL.
        $debut = $i;
        while ($i < $len && $texte[$i] !== ',' && $texte[$i] !== ')') {
            $i++;
        }
        $brut = trim(substr($texte, $debut, $i - $debut));
        $courant = ['valeur' => interpreterLitteralNu($brut)];
    }

    if ($tuple !== null) {
        sortirErreur("Table « {$table} » : une parenthèse de l'export n'est jamais refermée. Fichier abîmé.");
    }

    return $tuples;
}

/**
 * Lit une chaîne SQL commençant à `$i` (sur l'apostrophe ouvrante).
 *
 * @return array{0:string,1:int} la valeur décodée, et la position juste après
 */
function lireChaineSql(string $texte, int $i, string $pilote, string $table): array
{
    $len = strlen($texte);
    $i++; // apostrophe ouvrante
    $valeur = '';

    while ($i < $len) {
        $c = $texte[$i];

        if ($c === '\\' && $pilote === 'mysql' && $i + 1 < $len) {
            $suivant = $texte[$i + 1];
            $valeur .= match ($suivant) {
                'n' => "\n",
                'r' => "\r",
                't' => "\t",
                '0' => "\0",
                'Z' => "\x1a",
                'b' => "\x08",
                default => $suivant,
            };
            $i += 2;
            continue;
        }

        if ($c === "'") {
            // `''` = une apostrophe littérale ; sinon, fin de la chaîne.
            if ($i + 1 < $len && $texte[$i + 1] === "'") {
                $valeur .= "'";
                $i += 2;
                continue;
            }

            return [$valeur, $i + 1];
        }

        $valeur .= $c;
        $i++;
    }

    sortirErreur("Table « {$table} » : une chaîne de l'export n'est jamais refermée. Fichier tronqué.");
}

/** NULL, TRUE, FALSE, 0x… ou un nombre. */
function interpreterLitteralNu(string $brut): mixed
{
    $majuscule = strtoupper($brut);

    if ($majuscule === 'NULL') {
        return null;
    }
    if ($majuscule === 'TRUE') {
        return true;
    }
    if ($majuscule === 'FALSE') {
        return false;
    }
    if (preg_match('/^0x([0-9A-Fa-f]*)$/', $brut, $m) === 1) {
        return (string) hex2bin($m[1]);
    }

    // Tout le reste est rendu tel quel : `normaliserValeur()` reconnaîtra un
    // nombre. On ne convertit pas en int/float ici, ce qui perdrait la
    // précision d'un grand entier.
    return $brut;
}

/** @return array<string,string|true> */
function lireArguments(array $argv): array
{
    $options = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (!str_starts_with($arg, '--')) {
            sortirErreur(
                "Argument non reconnu : « {$arg} ». Options : --destination=… --garder=N "
                . '--sans-compression --verifier=…'
            );
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
        if (!in_array($cle, ['destination', 'garder', 'sans-compression', 'verifier'], true)) {
            sortirErreur(
                "Option inconnue : « --{$cle} ». Options : --destination=… --garder=N "
                . '--sans-compression --verifier=…'
            );
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

/**
 * Lit le compte que le marqueur de fin DECLARE : « -- FIN DE SAUVEGARDE 24
 * table(s), 147 ligne(s) ».
 *
 * C'est la seule assertion du fichier sur sa propre exhaustivite. Les empreintes,
 * elles, sont ecrites table par table : elles attestent que chaque table presente
 * est intacte, jamais qu'aucune ne manque.
 *
 * Renvoie null si le marqueur ne porte pas de compte — les archives produites
 * par une version anterieure du script. Un fichier ancien ne doit pas etre
 * rejete pour un format qui n'existait pas quand il a ete ecrit.
 *
 * @return array{tables:int,lignes:int}|null
 */
function compteAnnonceParLeMarqueur(string $fin): ?array
{
    if (preg_match('/FIN DE SAUVEGARDE\s+(\d+)\s+table\(s\),\s*(\d+)\s+ligne\(s\)/u', $fin, $m) !== 1) {
        return null;
    }

    return ['tables' => (int) $m[1], 'lignes' => (int) $m[2]];
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
