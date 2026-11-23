<?php
declare(strict_types=1);

require_once __DIR__ . '/../../api/src/bootstrap.php';

use KaTech\Db;
use KaTech\Installation\ImporteurDonneesFront;

$db = Db::instance();
$pdo = $db->pdo();

echo "=== PURGE PHYSIQUE DES DONNÉES OBSOLÈTES ===\n";
echo "Base cible : " . $db->cheminSqlite() . "\n\n";

$pdo->beginTransaction();

try {
    // 1. Liste des IDs des 23 produits Waymen légitimes
    $cheminJson = __DIR__ . '/../../api/tools/donnees-front.json';
    if (!file_exists($cheminJson)) {
        throw new RuntimeException("donnees-front.json introuvable.");
    }
    $frontData = json_decode(file_get_contents($cheminJson), true);
    $waymenProductIds = array_map(fn($p) => $p['id'], $frontData['products'] ?? []);
    $waymenCategorySlugs = array_map(fn($c) => $c['slug'], $frontData['categories'] ?? []);
    $waymenBrandIds = array_map(fn($b) => $b['id'], $frontData['brands'] ?? []);

    echo "Produits Waymen attendus : " . count($waymenProductIds) . "\n";
    echo "Catégories Waymen attendues : " . count($waymenCategorySlugs) . "\n";
    echo "Marques Waymen attendues : " . count($waymenBrandIds) . "\n\n";

    // 2. Suppression des anciens produits matériels
    $inClause = "'" . implode("','", array_map('addslashes', $waymenProductIds)) . "'";
    $stmt = $pdo->prepare("DELETE FROM products WHERE id NOT IN ($inClause) OR category IN ('laptops', 'desktops', 'builds', 'phones')");
    $stmt->execute();
    echo "Produits obsolètes supprimés : " . $stmt->rowCount() . "\n";

    // 3. Suppression des anciennes catégories
    $catInClause = "'" . implode("','", array_map('addslashes', $waymenCategorySlugs)) . "'";
    $stmt = $pdo->prepare("DELETE FROM categories WHERE slug NOT IN ($catInClause)");
    $stmt->execute();
    echo "Catégories obsolètes supprimées : " . $stmt->rowCount() . "\n";

    // 4. Suppression des anciennes marques
    $brandInClause = "'" . implode("','", array_map('addslashes', $waymenBrandIds)) . "'";
    $stmt = $pdo->prepare("DELETE FROM brands WHERE id NOT IN ($brandInClause)");
    $stmt->execute();
    echo "Marques obsolètes supprimées : " . $stmt->rowCount() . "\n";

    // 5. Purge de la section customPages dans site_content pour éliminer les blocs gravés résiduels
    $stmt = $pdo->prepare("DELETE FROM site_content WHERE section IN ('customPages', 'about')");
    $stmt->execute();
    echo "Sections obsolètes supprimées de site_content : " . $stmt->rowCount() . "\n";

    $pdo->commit();
    echo "\n✔ Transaction de purge validée avec succès.\n\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    echo "ERREUR lors de la purge : " . $e->getMessage() . "\n";
    exit(1);
}

// 6. Ré-importation propre via ImporteurDonneesFront
echo "=== RÉ-IMPORTATION DES DONNÉES FRONT VIA IMPORTEURDONNEESFRONT ===\n";
$importeur = new ImporteurDonneesFront($cheminJson, $db);
$res = $importeur->importer();

if (!$res['ok']) {
    echo "ERREUR lors du ré-import : " . ($res['erreur'] ?? 'Échec') . "\n";
    exit(1);
}

echo $res['details'] . "\n";

echo "=== VÉRIFICATION FINALE DES COMPTEURS EN BASE ===\n";
$nbCats = $pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
$nbBrands = $pdo->query("SELECT COUNT(*) FROM brands")->fetchColumn();
$nbProds = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
$nbContents = $pdo->query("SELECT COUNT(*) FROM site_content")->fetchColumn();

echo "Catégories en base : {$nbCats} (Attendu: 6)\n";
echo "Marques en base     : {$nbBrands} (Attendu: 13)\n";
echo "Produits en base    : {$nbProds} (Attendu: 23)\n";
echo "Sections contenu    : {$nbContents} (Attendu: 22)\n";

if ((int)$nbCats === 6 && (int)$nbProds === 23) {
    echo "\n🎯 BASE SQLITE 100% PURE, CONFORME ET IMMACULÉE !\n";
} else {
    echo "\n⚠ Attention : les compteurs diffèrent des attentes cibles.\n";
}

