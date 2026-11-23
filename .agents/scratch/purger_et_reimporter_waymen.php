<?php
/**
 * Purge physique et ré-importation directe pour la base locale active de WAYMEN.
 */
require_once __DIR__ . '/../../api/src/bootstrap.php';
require_once __DIR__ . '/../../api/src/Installation/ImporteurDonneesFront.php';

$db = KaTech\Db::instance();
$pdo = $db->pdo();
$dbPath = $db->cheminSqlite();

echo "=== CIBLE SQLITE LOCALE WAYMEN ===\n";
echo "Chemin : $dbPath\n";

$jsonPath = __DIR__ . '/../../api/tools/donnees-front.json';
if (!file_exists($jsonPath)) {
    die("ERREUR: donnees-front.json introuvable : $jsonPath\n");
}

echo "\n=== RÉ-IMPORTATION VIA IMPORTEURDONNEESFRONT ===\n";
$importeur = new KaTech\Installation\ImporteurDonneesFront($jsonPath, $db);
$rapport = $importeur->importer();
print_r($rapport);

echo "\n=== CONTRÔLE QUALITÉ DES COMPTEURS LOCAUX WAYMEN ===\n";
$cntCats = $pdo->query("SELECT count(*) FROM categories")->fetchColumn();
$cntBrands = $pdo->query("SELECT count(*) FROM brands")->fetchColumn();
$cntProds = $pdo->query("SELECT count(*) FROM products")->fetchColumn();
$cntSections = $pdo->query("SELECT count(*) FROM site_content")->fetchColumn();

echo "Catégories : $cntCats (Attendu: 6)\n";
echo "Marques    : $cntBrands (Attendu: 13)\n";
echo "Produits   : $cntProds (Attendu: 23)\n";
echo "Sections   : $cntSections (Attendu: 22)\n";

$heroPayload = json_decode($pdo->query("SELECT payload FROM site_content WHERE section = 'hero'")->fetchColumn(), true);
echo "\nHero primary CTA : " . json_encode($heroPayload['primaryCta'] ?? null, JSON_UNESCAPED_UNICODE) . "\n";

if ($cntCats == 6 && $cntBrands == 13 && $cntProds == 23 && $cntSections == 22) {
    echo "\n🎯 BASE LOCALE WAYMEN 100% PURE, EXACTE ET CONFORME !\n";
} else {
    echo "\n❌ ANOMALIE DE COMPTEURS !\n";
}
