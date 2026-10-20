<?php
require_once __DIR__ . '/../../api/src/bootstrap.php';

$dossier = __DIR__ . '/../../katech-data';
$fichiers = glob($dossier . '/dev-*.sqlite');
if (empty($fichiers)) {
    echo "Aucune base sqlite trouvée dans $dossier\n";
    exit(1);
}

foreach ($fichiers as $f) {
    echo "=== Fichier: " . basename($f) . " ===\n";
    try {
        $pdo = new PDO('sqlite:' . $f);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stmt = $pdo->query('SELECT id, name, email, role, active, password_hash FROM users');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($rows)) {
            echo "Table users vide.\n";
        }
        foreach ($rows as $r) {
            echo "ID: " . $r['id'] . " | Email: [" . $r['email'] . "] | Role: " . $r['role'] . " | Active: " . $r['active'] . "\n";
            echo "  Hash: " . $r['password_hash'] . "\n";
            
            // Testons avec différents mots de passe usuels
            $tests = [
                'admin123',
                'katech-dev-2026',
                'Mdp-Dev-2026!',
                'admin1234',
                'admin',
                'katech2026',
                'patron@boutique-test.dz'
            ];
            foreach ($tests as $t) {
                if (password_verify($t, $r['password_hash'])) {
                    echo "  >>> MATCH TROUVÉ avec le mot de passe : '$t' <<<\n";
                }
            }
        }
    } catch (Exception $e) {
        echo "Erreur sur $f: " . $e->getMessage() . "\n";
    }
}
