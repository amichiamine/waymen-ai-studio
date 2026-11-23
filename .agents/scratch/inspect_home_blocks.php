<?php
$db = new PDO('sqlite:katech-data/dev-a97b6b98a368.sqlite');
$stmt = $db->query("SELECT payload FROM site_content WHERE section = 'customPages'");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$pages = json_decode($row['payload'], true);
foreach ($pages as $p) {
    if ($p['id'] === 'page_home' || $p['slug'] === '') {
        echo "=== PAGE D'ACCUEIL : " . $p['id'] . " (slug: " . $p['slug'] . ") ===" . PHP_EOL;
        echo "Nombre de blocs : " . count($p['blocks'] ?? []) . PHP_EOL;
        foreach ($p['blocks'] ?? [] as $i => $b) {
            echo "Bloc #$i : " . $b['type'] . " (id: " . $b['id'] . ", enabled: " . ($b['enabled'] ? 'OUI' : 'NON') . ")" . PHP_EOL;
            echo "  Props: " . json_encode($b['props'] ?? [], JSON_UNESCAPED_UNICODE) . PHP_EOL;
        }
    }
}
