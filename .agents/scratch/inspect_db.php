<?php
require 'api/src/bootstrap.php';
$db = KaTech\Db::instance();
$pdo = $db->pdo();

echo "=== DATABASE PATH ===\n";
echo $db->cheminSqlite() . "\n\n";

echo "=== CATEGORIES IN DB ===\n";
$cats = $pdo->query("SELECT slug, label FROM categories")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cats as $c) {
    echo "- {$c['slug']} : {$c['label']}\n";
}

echo "\n=== PRODUCTS IN DB ===\n";
$prods = $pdo->query("SELECT id, name, category, brand FROM products")->fetchAll(PDO::FETCH_ASSOC);
foreach ($prods as $p) {
    echo "- [{$p['category']}] {$p['brand']} : {$p['name']} (id: {$p['id']})\n";
}

echo "\n=== SITE CONTENT SECTIONS IN DB ===\n";
$contents = $pdo->query("SELECT section FROM site_content")->fetchAll(PDO::FETCH_COLUMN);
echo implode(", ", $contents) . "\n";

echo "\n=== SITE CONTENT COLUMNS ===\n";
$cols = $pdo->query("PRAGMA table_info(site_content)")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo "- {$c['name']} ({$c['type']})\n";
}

echo "\n=== SITE CONTENT ROWS ===\n";
$rows = $pdo->query("SELECT section, LENGTH(payload) as len FROM site_content")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "- Section: {$r['section']} (taille payload: {$r['len']} octets)\n";
}

echo "\n=== HERO PAYLOAD IN DB ===\n";
$hero = $pdo->query("SELECT payload FROM site_content WHERE section = 'hero'")->fetchColumn();
echo substr($hero, 0, 300) . "...\n";

echo "\n=== CUSTOM PAGES / BLOCKS IN DB ===\n";
$cp = $pdo->query("SELECT payload FROM site_content WHERE section = 'customPages'")->fetchColumn();
if ($cp) {
    $pages = json_decode($cp, true);
    echo "Nombre de pages dans customPages: " . count($pages) . "\n";
    foreach ($pages as $p) {
        echo "- Page: [{$p['slug']}] {$p['title']['fr']} (nb blocs: " . count($p['blocks'] ?? []) . ")\n";
        foreach ($p['blocks'] ?? [] as $b) {
            echo "   * Bloc type: {$b['type']}\n";
            if (isset($b['props']['badge'])) echo "     badge: " . json_encode($b['props']['badge'], JSON_UNESCAPED_UNICODE) . "\n";
            if (isset($b['props']['title1'])) echo "     title1: " . json_encode($b['props']['title1'], JSON_UNESCAPED_UNICODE) . "\n";
            if (isset($b['props']['title'])) echo "     title: " . json_encode($b['props']['title'], JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
}



