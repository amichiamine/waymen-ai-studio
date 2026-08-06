<?php
/**
 * Sonde d'hébergement — KA Tech, vérification des prérequis (voir PLAN.md §8).
 *
 * MODE D'EMPLOI
 *   1. Téléverser ce fichier dans public_html/ (gestionnaire de fichiers hPanel).
 *   2. Ouvrir https://ton-domaine/sonde-hebergeur.php
 *   3. Lire le verdict, le copier, puis SUPPRIMER LE FICHIER.
 *
 * Ce script est en LECTURE SEULE, à deux exceptions près :
 *   — il crée puis efface un fichier de test dans un dossier hors public_html,
 *     pour vérifier que l'écriture y est possible (décide si SQLite est utilisable) ;
 *   — si des paramètres PostgreSQL sont fournis ($PGSQL_* ci-dessous), il tente
 *     d'ouvrir réellement une connexion pour confirmer que pdo_pgsql fonctionne.
 *   Il ne modifie rien d'autre.
 *
 * PARAMÈTRES OPTIONNELS POSTGRESQL
 *   Renseigner les constantes ci-dessous pour tester une vraie connexion
 *   PostgreSQL (Supabase, serveur dédié…). Laisser vides pour les omettre.
 *
 * IMPORTANT : supprime-le après usage. Il divulgue des informations sur ta
 * configuration serveur, ce qui est une aide pour un attaquant.
 */

// ----------------------------------------------------------------
// Paramètres optionnels pour tester une vraie connexion PostgreSQL.
// Laisser vides si non pertinent.
// ----------------------------------------------------------------
const PGSQL_HOST    = '';   // ex. db.xxxxxxxx.supabase.co  ou 127.0.0.1
const PGSQL_PORT    = '';   // ex. 5432
const PGSQL_DBNAME  = '';   // ex. postgres  ou  katech
const PGSQL_USER    = '';   // ex. postgres  ou  katech
const PGSQL_PASS    = '';   // mot de passe
const PGSQL_SSLMODE = '';   // laisser vide pour local ; 'require' pour Supabase

header('Content-Type: text/plain; charset=utf-8');

$ok   = [];
$ko   = [];
$note = [];

function ligne(string $label, string $valeur, ?bool $bon = null): void
{
    $marque = $bon === null ? '  ' : ($bon ? 'OK' : 'KO');
    printf("[%s] %-38s %s\n", $marque, $label, $valeur);
}

echo "=== SONDE D'HÉBERGEMENT — KA TECH ===\n\n";

// ---------------------------------------------------------------- 1. PHP
echo "1. RUNTIME PHP\n";
$php   = PHP_VERSION;
$phpOk = version_compare($php, '8.2.0', '>=');
ligne('Version PHP', $php . ($phpOk ? ' (>= 8.2 requis)' : ' — INSUFFISANT, il faut 8.2+'), $phpOk);
if (!$phpOk) {
    $ko[] = "PHP insuffisant ($php) : il faut 8.2+. Dans hPanel → Configuration PHP, choisir PHP 8.2.";
}
ligne('Serveur web', $_SERVER['SERVER_SOFTWARE'] ?? 'inconnu');
ligne('Interface PHP (SAPI)', PHP_SAPI);

// ---- Mémoire ----
// Le migrateur de données charge les lignes par lots et tient sous 2 Mo
// (mesuré sur 40 000 lignes, cf. docs/MIGRATION.md §2.6).
// La sauvegarde sérialise une table à la fois.
// La limite critique, sur un mutualisé, est souvent 64 Mo — raisonnablement
// suffisant. En dessous de 32 Mo, une sauvegarde ou une migration risque
// un « Allowed memory size exhausted » qui tronque le fichier produit.
$memLimite = trim(ini_get('memory_limit'));
$memOctets = -1;
if ($memLimite !== '-1') {
    $val = (int) $memLimite;
    $unite = strtoupper(substr($memLimite, -1));
    $memOctets = $val * match ($unite) {
        'G' => 1024 * 1024 * 1024,
        'M' => 1024 * 1024,
        'K' => 1024,
        default => 1,
    };
}
$memOk = $memOctets === -1 || $memOctets >= 64 * 1024 * 1024;
ligne(
    'Mémoire autorisée',
    $memLimite
        . ($memOk
            ? ' (sauvegarde et migration : OK)'
            : ' — INSUFFISANT pour la sauvegarde ou la migration (min. recommandé : 64 M)'),
    $memOk
);
if (!$memOk) {
    $note[] = "Mémoire PHP à {$memLimite} : la sauvegarde ou la migration peuvent planter en "
        . '"Allowed memory size exhausted". Augmenter dans hPanel → Configuration PHP.';
}

// ---- Temps d'exécution ----
// La migration est la plus contraignante : jusqu'à 30 s sur un hébergeur
// à 30 s de timeout. Le moteur est conçu pour s'arrêter proprement avant
// l'échéance (docs/MIGRATION.md §4), mais le script doit être autorisé
// à tourner assez longtemps.
// La sauvegarde est bien plus rapide (< 2 s pour une boutique normale).
$tempMax  = (int) ini_get('max_execution_time');
$tempTexte = $tempMax === 0 ? 'illimité (CLI)' : "{$tempMax} s";
// 25 s est le minimum utile pour une migration HTTP.
// 0 = illimité (ligne de commande), acceptable.
$tempOk = $tempMax === 0 || $tempMax >= 25;
ligne(
    'Temps max d\'exécution',
    $tempTexte
        . ($tempOk
            ? ''
            : ' — trop court pour la migration en ligne (min. recommandé : 30 s)'),
    $tempOk
);
if (!$tempOk) {
    $note[] = "max_execution_time à {$tempMax} s : la migration assistée depuis la page Développeur "
        . "risque d'être coupée avant la fin. Augmenter dans hPanel → Configuration PHP.";
}

ligne('Taille max de téléversement', ini_get('upload_max_filesize'));

// ------------------------------------------------------- 2. Extensions
echo "\n2. EXTENSIONS REQUISES\n";
$extensions = [
    'pdo_sqlite' => [
        'critique' => false,   // critique si pas de mysql non plus
        'role'     => 'base SQLite — pilote principal ou repli léger',
    ],
    'pdo_mysql'  => [
        'critique' => false,   // critique si pas de sqlite non plus
        'role'     => 'base MySQL/MariaDB — garanti chez tout hébergeur mutualisé',
    ],
    'pdo_pgsql'  => [
        'critique' => false,
        'role'     => 'base PostgreSQL — nécessaire pour Supabase, Neon, Railway',
    ],
    'json'       => [
        'critique' => true,
        'role'     => 'encodage des réponses API et du contenu localisé',
    ],
    'mbstring'   => [
        'critique' => true,
        'role'     => 'chaînes arabes, accents, noms de clients',
    ],
    'openssl'    => [
        'critique' => true,
        'role'     => 'connexions TLS sortantes (SMTP, Supabase…)',
    ],
    'fileinfo'   => [
        'critique' => false,
        'role'     => 'validation des images téléversées (type MIME réel)',
    ],
    'curl'       => [
        'critique' => false,
        'role'     => 'webhooks de notification sortants',
    ],
    'zlib'       => [
        'critique' => false,
        'role'     => 'compression des sauvegardes — son absence n\'est pas bloquante',
    ],
    'gd'         => [
        'critique' => false,
        'role'     => 'redimensionnement d\'images — optionnel',
    ],
];

$presences = [];
foreach ($extensions as $ext => $meta) {
    $present         = extension_loaded($ext);
    $presences[$ext] = $present;
    ligne($ext, ($present ? 'présente' : 'ABSENTE') . ' — ' . $meta['role'], $present);
    if (!$present && $meta['critique']) {
        $ko[] = "Extension « {$ext} » absente — BLOQUANT. "
            . 'Activer dans hPanel → Configuration PHP → Extensions PHP.';
    }
}

// Vérifier qu'au moins un pilote de base est disponible.
$auMoinsUnePdo = $presences['pdo_sqlite'] || $presences['pdo_mysql'] || $presences['pdo_pgsql'];
if (!$auMoinsUnePdo) {
    $ko[] = "Aucune extension PDO de base disponible (ni pdo_sqlite, ni pdo_mysql, ni pdo_pgsql). "
        . "Impossible de faire tourner l'API. Activer au moins pdo_mysql dans hPanel.";
}

// --------------------------------------------------- 3. Argon2id / bcrypt
echo "\n3. HACHAGE DES MOTS DE PASSE\n";
$argon = defined('PASSWORD_ARGON2ID');
ligne('Argon2id', $argon ? 'disponible (recommandé)' : 'indisponible — repli automatique sur bcrypt', $argon);
if (!$argon) {
    $note[] = "Argon2id indisponible : l'API utilisera bcrypt automatiquement, "
        . "ce qui est parfaitement sûr. Aucune action requise.";
}

// ------------------------------------------------- 4. Dossier hors web
echo "\n4. STOCKAGE HORS RACINE WEB (pilote SQLite)\n";
$racineWeb = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__, '/');
$maison    = dirname($racineWeb);
$dossier   = $maison . '/katech-data';
ligne('Racine web détectée', $racineWeb !== '' ? $racineWeb : '— non détectée en mode CLI');
ligne('Dossier de données visé', $dossier);

$creable = is_dir($dossier) || @mkdir($dossier, 0750, true);
ligne(
    'Dossier créable / présent',
    $creable ? 'oui — la base SQLite y serait hors d\'atteinte HTTP' : 'NON — SQLite inutilisable',
    $creable
);

$inscriptible = false;
if ($creable) {
    $test         = $dossier . '/.sonde-' . bin2hex(random_bytes(4));
    $inscriptible = @file_put_contents($test, 'test') !== false;
    if ($inscriptible) {
        @unlink($test);
    }
}
ligne(
    'Écriture possible hors public_html',
    $inscriptible
        ? 'oui — SQLite utilisable'
        : 'NON — SQLite inutilisable ici ; choisissez mysql ou pgsql dans DB_DRIVER',
    $inscriptible
);
if (!$inscriptible) {
    $note[] = "Impossible d'écrire hors de public_html : SQLite ne peut pas être utilisé "
        . "(la base serait accessible par HTTP). Choisissez DB_DRIVER=mysql ou DB_DRIVER=pgsql.";
}

// ------------------------------------------------------- 5. SQLite / WAL
echo "\n5. SQLITE — CONNEXION ET PERFORMANCE\n";
if (!$presences['pdo_sqlite']) {
    ligne('Test SQLite', 'sauté — pdo_sqlite absent. Choisissez mysql ou pgsql.', false);
} elseif (!$inscriptible) {
    ligne('Test SQLite', 'sauté — dossier hors web non inscriptible', false);
} else {
    $fichier = $dossier . '/sonde-test.sqlite';
    try {
        $db = new PDO('sqlite:' . $fichier);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        ligne('Version SQLite', (string) $db->query('SELECT sqlite_version()')->fetchColumn());

        $mode  = $db->query('PRAGMA journal_mode=WAL')->fetchColumn();
        $walOk = strtolower((string) $mode) === 'wal';
        ligne(
            'Mode WAL (lectures non bloquantes)',
            $walOk
                ? 'ACTIF — configuration idéale'
                : "refusé (mode « {$mode} ») — stockage de type réseau, SQLite jouable mais moins concurrent",
            $walOk
        );
        if (!$walOk) {
            $note[] = "WAL indisponible : SQLite reste fonctionnel mais toute écriture bloque "
                . "les lectures simultanées. Acceptable jusqu'à quelques centaines de commandes/jour.";
        }

        $db->exec('PRAGMA busy_timeout=5000');
        $db->exec('CREATE TABLE IF NOT EXISTS sonde (id INTEGER PRIMARY KEY, v TEXT)');
        $db->beginTransaction();
        $db->exec("INSERT INTO sonde (v) VALUES ('essai')");
        $db->commit();
        ligne('Écriture transactionnelle', 'fonctionnelle', true);

        $debut = microtime(true);
        $db->beginTransaction();
        for ($i = 0; $i < 200; $i++) {
            $db->exec("INSERT INTO sonde (v) VALUES ('mesure')");
        }
        $db->commit();
        $duree = (microtime(true) - $debut) * 1000;
        // Sur un bon mutualisé : < 100 ms. Sur un stockage réseau lent : > 500 ms.
        $perf = $duree < 300
            ? 'bon'
            : ($duree < 800 ? 'lent (stockage réseau probable)' : 'TRÈS LENT — préférer mysql ou pgsql');
        ligne('200 écritures groupées', round($duree) . ' ms — ' . $perf);

        $db = null;
        @unlink($fichier);
        @unlink($fichier . '-wal');
        @unlink($fichier . '-shm');
    } catch (Throwable $e) {
        ligne('Test SQLite', 'ÉCHEC : ' . $e->getMessage(), false);
        $ko[] = 'SQLite inutilisable : ' . $e->getMessage()
            . '. Choisissez DB_DRIVER=mysql ou DB_DRIVER=pgsql.';
    }
}

// -------------------------------------------------------------- 6. MySQL
echo "\n6. MYSQL — DISPONIBILITÉ DU PILOTE\n";
// Le projet peut fonctionner sans tester la connexion ici : les identifiants
// MySQL viennent du panneau hPanel et ne sont connus qu'une fois l'hébergement
// acheté. Ce qui compte à ce stade, c'est que pdo_mysql est chargé.
if ($presences['pdo_mysql']) {
    ligne('pdo_mysql', 'présente — DB_DRIVER=mysql utilisable', true);
    $note[] = "MySQL disponible. Pour l'utiliser : créer la base dans hPanel → Bases de données "
        . "→ Gestion des bases MySQL, puis renseigner DB_DRIVER=mysql et les 4 identifiants dans api/.env.";
} else {
    ligne(
        'pdo_mysql',
        'ABSENTE — DB_DRIVER=mysql bloqué. Activer dans hPanel → Configuration PHP.',
        false
    );
}

// ---------------------------------------------------------- 7. PostgreSQL
echo "\n7. POSTGRESQL — PILOTE ET CONNEXION OPTIONNELLE\n";
// Contrairement à MySQL, pdo_pgsql n'est PAS activé par défaut sur tous les
// hébergeurs mutualisés. Sa présence ouvre Supabase, Neon ou Railway comme
// base de données hébergée, ce qui intéresse le commerçant qui n'a pas de MySQL
// et ne veut pas gérer un fichier SQLite.
if (!$presences['pdo_pgsql']) {
    ligne(
        'pdo_pgsql',
        'ABSENTE — DB_DRIVER=pgsql bloqué. '
        . "Si vous voulez PostgreSQL/Supabase : activer dans hPanel → Configuration PHP.",
        false
    );
    $note[] = "pdo_pgsql absent : DB_DRIVER=pgsql ne fonctionnera pas. Ce n'est pas bloquant "
        . "si vous utilisez sqlite ou mysql. Pour activer : hPanel → Configuration PHP → Extensions PHP → pdo_pgsql.";
} else {
    ligne('pdo_pgsql', 'présente — DB_DRIVER=pgsql utilisable', true);

    // Test de connexion réel, uniquement si les paramètres sont fournis.
    if (PGSQL_HOST !== '' && PGSQL_DBNAME !== '' && PGSQL_USER !== '') {
        echo "\n  Test de connexion PostgreSQL (paramètres fournis en tête du script)...\n";
        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', PGSQL_HOST, PGSQL_PORT ?: '5432', PGSQL_DBNAME);
        if (PGSQL_SSLMODE !== '') {
            $dsn .= ';sslmode=' . PGSQL_SSLMODE;
        }
        try {
            $pgsql = new PDO($dsn, PGSQL_USER, PGSQL_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $version = (string) $pgsql->query('SELECT version()')->fetchColumn();
            ligne('Connexion PostgreSQL', 'RÉUSSIE — ' . substr($version, 0, 50), true);

            // Supabase requiert TLS : vérifier que SSLMODE est bien configuré.
            if (PGSQL_SSLMODE === '') {
                $note[] = "Connexion PostgreSQL ouverte sans sslmode. Si c'est Supabase ou un "
                    . "service hébergé, ajoutez DB_SSLMODE=require dans api/.env (et PGSQL_SSLMODE "
                    . "en tête de ce script pour tester ici).";
            }
            $pgsql = null;
        } catch (Throwable $e) {
            ligne('Connexion PostgreSQL', 'ÉCHEC : ' . $e->getMessage(), false);
            $ko[] = "Connexion PostgreSQL impossible. Vérifiez PGSQL_HOST, PGSQL_DBNAME, "
                . "PGSQL_USER, PGSQL_PASS en tête du script. "
                . "Pour Supabase : DB_SSLMODE=require est obligatoire. "
                . "Détail : " . $e->getMessage();
        }
    } else {
        ligne(
            'Connexion PostgreSQL (test)',
            'non effectué — renseigner PGSQL_HOST, PGSQL_USER, PGSQL_DBNAME en tête du script',
            null
        );
        $note[] = "Pour tester une vraie connexion PostgreSQL (Supabase, Neon, serveur dédié), "
            . "ouvrir ce fichier dans un éditeur et renseigner les constantes PGSQL_* en tête.";
    }
}

// ------------------------------------------------------------ 8. Outillage
echo "\n8. OUTILLAGE\n";
$exec = function_exists('exec')
    && !in_array('exec', array_map('trim', explode(',', (string) ini_get('disable_functions'))), true);
ligne('Fonction exec()', $exec ? 'autorisée' : 'désactivée (fréquent et sain en mutualisé)');
ligne(
    'CRON disponible',
    'à vérifier dans hPanel → Avancé → Tâches Cron — utilisé pour la sauvegarde nocturne'
);
ligne(
    'mail()',
    function_exists('mail')
        ? 'présente — mais utiliser SMTP est fortement recommandé (fiabilité)'
        : 'absente — SMTP obligatoire (configurer SMTP_HOST dans api/.env)'
);

// .htaccess — critique pour que les routes et la sécurité fonctionnent
$htaccessActif = isset($_SERVER['HTTP_HOST']);  // uniquement testable via HTTP
if ($htaccessActif) {
    // En HTTP, on peut tester si le mod_rewrite semble actif
    ligne('.htaccess / mod_rewrite', 'testable seulement en HTTP — voir §11 de docs/DEPLOIEMENT.md');
} else {
    ligne('.htaccess / mod_rewrite', 'non testable en mode CLI — vérifier après déploiement');
}

// ----------------------------------------------------------- 9. Verdict
echo "\n\n=== VERDICT ===\n\n";
if ($ko === []) {
    $pilotesDisponibles = [];
    if ($inscriptible && $presences['pdo_sqlite'])  $pilotesDisponibles[] = 'sqlite';
    if ($presences['pdo_mysql'])                    $pilotesDisponibles[] = 'mysql';
    if ($presences['pdo_pgsql'])                    $pilotesDisponibles[] = 'pgsql';

    echo "AUCUN BLOCAGE.\n";

    if (count($pilotesDisponibles) >= 2) {
        echo "Pilotes de base utilisables : " . implode(', ', $pilotesDisponibles) . ".\n";
        echo "Indiquer votre choix dans api/.env → DB_DRIVER=…\n";
        if (in_array('mysql', $pilotesDisponibles, true)) {
            echo "Recommandation chez un hébergeur mutualisé : DB_DRIVER=mysql (garanti, sans prérequis).\n";
        }
    } elseif (count($pilotesDisponibles) === 1) {
        echo "Un seul pilote de base disponible : " . $pilotesDisponibles[0] . ". "
            . "Fixer DB_DRIVER=" . $pilotesDisponibles[0] . " dans api/.env.\n";
    } else {
        echo "AUCUN pilote de base disponible — vérifier les extensions PDO dans hPanel.\n";
    }
} else {
    echo "BLOCAGES À TRAITER :\n";
    foreach ($ko as $x) {
        echo "  - {$x}\n";
    }
}

if ($note !== []) {
    echo "\nPOINTS D'ATTENTION :\n";
    foreach ($note as $x) {
        echo "  - {$x}\n";
    }
}

echo "\n\n>>> SUPPRIME CE FICHIER MAINTENANT. <<<\n";
