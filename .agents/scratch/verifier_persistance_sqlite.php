<?php
$db = new PDO('sqlite:katech-data/dev-a97b6b98a368.sqlite');
$stmt = $db->query("SELECT payload, updated_at FROM site_content WHERE section='customPages'");
$r = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$r) {
    echo "ERREUR : customPages introuvable dans SQLite !\n";
    exit(1);
}

echo "=== VÉRIFICATION SOUVERAINE PERSISTANCE SQLITE 360° ===\n";
echo "Date de dernière mise à jour SQLite : " . $r['updated_at'] . "\n";
echo "Taille payload customPages en base : " . strlen($r['payload']) . " octets\n";

$pages = json_decode($r['payload'], true);
$totalVues = count($pages);
echo "Nombre total de vues dans SQLite : {$totalVues} / 24 attendues\n\n";

if ($totalVues !== 24) {
    echo "ANOMALIE : Le nombre de vues n'est pas égal à 24 !\n";
    exit(1);
}

$totalBlocs = 0;
$blocsSansProps = 0;
$blocsSansStyle = 0;

foreach ($pages as $p) {
    $nbBlocs = count($p['blocks'] ?? []);
    $totalBlocs += $nbBlocs;
    $typeLabel = (!empty($p['isSystem']) || str_starts_with($p['id'], 'system_')) ? '[Système]' : ($p['id'] === 'page_home' ? '[Accueil]' : '[Institutionnelle]');
    echo " ✓ {$typeLabel} {$p['id']} (slug: '{$p['slug']}') : {$nbBlocs} bloc(s)\n";

    foreach ($p['blocks'] ?? [] as $b) {
        $propsCount = count($b['props'] ?? []);
        $styleCount = count($b['style'] ?? []);
        if ($propsCount === 0) $blocsSansProps++;
        if ($styleCount === 0) $blocsSansStyle++;
    }
}

echo "\n--- STATISTIQUES DES BLOCS PERSISTÉS EN BASE ---\n";
echo "Total Blocs : {$totalBlocs}\n";
echo "Blocs sans Props : {$blocsSansProps} (cible: 0)\n";
echo "Blocs sans Style : {$blocsSansStyle} (cible: 0)\n";

if ($blocsSansProps === 0 && $blocsSansStyle === 0) {
    echo "\n>>> SUCCÈS INTÉGRAL : 100% DES 24 VUES ET {$totalBlocs} BLOCS SONT PERSISTÉS DANS SQLITE AVEC PROPS ET STYLES ! <<<\n";
    exit(0);
} else {
    echo "\nAVERTISSEMENT : Certains blocs ont encore des props ou styles vides.\n";
    exit(1);
}
