<?php
/**
 * Sonde d'hébergement — KA Tech, prérequis de la phase 4 (voir PLAN.md).
 *
 * MODE D'EMPLOI
 *   1. Téléverser ce fichier dans public_html/ (gestionnaire de fichiers hPanel).
 *   2. Ouvrir https://ton-domaine/sonde-hebergeur.php
 *   3. Lire le verdict, le copier, puis SUPPRIMER LE FICHIER.
 *
 * Ce script est en LECTURE SEULE, à une exception près : il crée puis efface
 * un fichier de test dans un dossier hors public_html, pour vérifier que
 * l'écriture y est possible. Il ne modifie rien d'autre.
 *
 * IMPORTANT : supprime-le après usage. Il divulgue des informations sur ta
 * configuration serveur, ce qui est une aide pour un attaquant.
 */

header('Content-Type: text/plain; charset=utf-8');

$ok = [];
$ko = [];
$note = [];

function ligne(string $label, string $valeur, ?bool $bon = null): void
{
    $marque = $bon === null ? '  ' : ($bon ? 'OK' : 'KO');
    printf("[%s] %-34s %s\n", $marque, $label, $valeur);
}

echo "=== SONDE D'HÉBERGEMENT — KA TECH ===\n\n";

// ---------------------------------------------------------------- 1. PHP
echo "1. RUNTIME PHP\n";
$php = PHP_VERSION;
$phpOk = version_compare($php, '8.2.0', '>=');
ligne('Version PHP', $php . ($phpOk ? ' (>= 8.2 requis)' : ' — INSUFFISANT, il faut 8.2+'), $phpOk);
ligne('Serveur web', $_SERVER['SERVER_SOFTWARE'] ?? 'inconnu');
ligne('Interface PHP (SAPI)', PHP_SAPI);
ligne('Mémoire autorisée', ini_get('memory_limit'));
ligne('Temps max d\'exécution', ini_get('max_execution_time') . ' s');
ligne('Taille max de téléversement', ini_get('upload_max_filesize'));

// ------------------------------------------------------- 2. Extensions
echo "\n2. EXTENSIONS REQUISES\n";
$extensions = [
    'pdo_sqlite' => 'CRITIQUE — base de données SQLite',
    'sqlite3'    => 'utile, non bloquant',
    'json'       => 'CRITIQUE — encodage des réponses API',
    'mbstring'   => 'CRITIQUE — chaînes arabes et accents',
    'openssl'    => 'CRITIQUE — HTTPS sortant, hachage',
    'fileinfo'   => 'important — validation des images téléversées',
    'curl'       => 'important — outbox vers Telegram / Notion',
    'gd'         => 'optionnel — redimensionnement d\'images',
    'pdo_mysql'  => 'repli si SQLite indisponible',
];
foreach ($extensions as $ext => $role) {
    $present = extension_loaded($ext);
    ligne($ext, ($present ? 'présente' : 'ABSENTE') . ' — ' . $role, $present);
    if (!$present && str_starts_with($role, 'CRITIQUE')) {
        $ko[] = "extension manquante : $ext";
    }
}

// --------------------------------------------------- 3. Argon2id / bcrypt
echo "\n3. HACHAGE DES MOTS DE PASSE\n";
$argon = defined('PASSWORD_ARGON2ID');
ligne('Argon2id', $argon ? 'disponible (recommandé)' : 'indisponible — repli sur bcrypt', $argon);
if (!$argon) {
    $note[] = "Argon2id indisponible : utiliser PASSWORD_BCRYPT, parfaitement acceptable.";
}

// ------------------------------------------------- 4. Dossier hors web
echo "\n4. STOCKAGE HORS RACINE WEB\n";
$racineWeb = rtrim($_SERVER['DOCUMENT_ROOT'] ?? __DIR__, '/');
$maison    = dirname($racineWeb);
$dossier   = $maison . '/katech-data';
ligne('Racine web détectée', $racineWeb);
ligne('Dossier de données visé', $dossier);

$creable = is_dir($dossier) || @mkdir($dossier, 0750, true);
ligne('Dossier créable / présent', $creable ? 'oui' : 'NON', $creable);

$inscriptible = false;
if ($creable) {
    $test = $dossier . '/.sonde-' . bin2hex(random_bytes(4));
    $inscriptible = @file_put_contents($test, 'test') !== false;
    if ($inscriptible) {
        @unlink($test);
    }
}
ligne('Écriture possible', $inscriptible ? 'oui' : 'NON', $inscriptible);
if (!$inscriptible) {
    $ko[] = "impossible d'écrire hors de public_html — la base serait exposée au téléchargement";
}

// ------------------------------------------------------- 5. SQLite / WAL
echo "\n5. SQLITE — LE POINT DÉCISIF\n";
if (!extension_loaded('pdo_sqlite')) {
    ligne('Test SQLite', 'impossible, pdo_sqlite absent', false);
} elseif (!$inscriptible) {
    ligne('Test SQLite', 'impossible, dossier non inscriptible', false);
} else {
    $fichier = $dossier . '/sonde-test.sqlite';
    try {
        $db = new PDO('sqlite:' . $fichier);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        ligne('Version SQLite', $db->query('SELECT sqlite_version()')->fetchColumn());

        $mode = $db->query('PRAGMA journal_mode=WAL')->fetchColumn();
        $walOk = strtolower((string) $mode) === 'wal';
        ligne(
            'Mode journal WAL',
            $walOk
                ? 'ACTIF — lectures non bloquantes, configuration idéale'
                : "refusé (mode « $mode ») — stockage type NFS, voir verdict",
            $walOk
        );
        if (!$walOk) {
            $note[] = "WAL indisponible : jouable jusqu'à quelques milliers de commandes/jour, "
                . "mais les lectures seront bloquées pendant les écritures. Au-delà, basculer sur MySQL.";
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
        ligne('200 écritures groupées', round($duree) . ' ms');

        $db = null;
        @unlink($fichier);
        @unlink($fichier . '-wal');
        @unlink($fichier . '-shm');
    } catch (Throwable $e) {
        ligne('Test SQLite', 'ÉCHEC : ' . $e->getMessage(), false);
        $ko[] = 'SQLite inutilisable : ' . $e->getMessage();
    }
}

// ------------------------------------------------------------ 6. Outils
echo "\n6. OUTILLAGE\n";
$exec = function_exists('exec') && !in_array('exec', array_map('trim', explode(',', (string) ini_get('disable_functions'))), true);
ligne('Fonction exec()', $exec ? 'autorisée' : 'désactivée (fréquent et sain)');
ligne('Composer installable en ligne', $exec ? 'peut-être — tester en SSH' : 'non — téléverser vendor/ compilé en local');
ligne('mail()', function_exists('mail') ? 'présente (préférer SMTP)' : 'absente — SMTP obligatoire');

// ----------------------------------------------------------- 7. Verdict
echo "\n\n=== VERDICT ===\n\n";
if ($ko === []) {
    echo "AUCUN BLOCAGE. L'architecture prévue (PHP + Slim + SQLite) est applicable.\n";
} else {
    echo "BLOCAGES À TRAITER :\n";
    foreach ($ko as $x) {
        echo "  - $x\n";
    }
}
if ($note !== []) {
    echo "\nPOINTS D'ATTENTION :\n";
    foreach ($note as $x) {
        echo "  - $x\n";
    }
}

echo "\n\n>>> SUPPRIME CE FICHIER MAINTENANT. <<<\n";
