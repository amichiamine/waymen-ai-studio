#!/usr/bin/env php
<?php

/**
 * Importeur des données de démonstration du frontend — OUTIL DE DÉVELOPPEMENT.
 *
 * Charge le fichier JSON produit par `bun run scripts/extraire-donnees-front.ts`
 * et insère les données dans la base de données active (SQLite ou MySQL).
 *
 * Voie retenue : extraction Node/bun → artefact JSON versionné → import PHP.
 * Justification : le frontend est en TypeScript avec des imports d'assets non
 * exécutables depuis PHP. L'extraction Node produit une seule source de vérité
 * rejouable si les données du frontend évoluent. Le PHP lit ce JSON neutre,
 * évitant toute dépendance à la chaîne de build JS.
 *
 * Garanties :
 *  - Idempotent : peut être relancé sans créer de doublon (upsert par clé).
 *  - Multilingue : les champs Localized<string> sont stockés en JSON, sans
 *    aplatissement (conformément à docs/LOCALIZED-DATA.md) — TOUJOURS encodés,
 *    y compris quand la valeur est une chaîne simple (`"texte"`, guillemets
 *    compris). Une chaîne stockée brute dans une colonne JSON est illisible à la
 *    relecture et fait journaliser un repli à chaque requête.
 *  - Rattrapage : les bases déjà remplies avec des valeurs brutes sont
 *    réencodées au passage (voir `rattraperColonnesJson()`), sans jamais
 *    réencoder une valeur déjà valide.
 *  - Empreintes historiques : order_items.name, stock_movements.product_name,
 *    reviews.product_name sont des chaînes simples (non concernées ici — les
 *    commandes et avis de démo ne sont pas importés par cet outil).
 *  - Requêtes préparées exclusivement.
 *  - Fonctionne sur SQLite et MySQL (Db::upsert() absorbe la divergence).
 *
 * Usage :
 *   DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/katech.sqlite php api/tools/importer-donnees-front.php
 *   DB_DRIVER=mysql php api/tools/importer-donnees-front.php
 *
 * Prérequis : `bun run scripts/extraire-donnees-front.ts` doit avoir été
 * exécuté au préalable pour générer api/tools/donnees-front.json.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script est réservé à la ligne de commande.\n");
}

require_once __DIR__ . '/../src/bootstrap.php';

use KaTech\Db;

/**
 * Rattrapage : réencode les colonnes JSON restées en clair.
 *
 * Une version précédente de cet outil n'encodait que les valeurs multilingues et
 * écrivait la chaîne simple telle quelle (`ASUS ROG Strix G16` au lieu de
 * `"ASUS ROG Strix G16"`). Les bases déjà remplies portent donc des valeurs que
 * `json_decode()` refuse : le repli de lecture les affiche correctement, mais
 * journalise à chaque requête. Réencoder à l'import est le seul moyen de rendre
 * le journal réellement propre sur une base existante.
 *
 * IDEMPOTENT PAR CONSTRUCTION : une valeur qui se décode déjà est laissée
 * strictement intacte. Relancer l'import ne réencode donc jamais deux fois (ce
 * qui aurait produit `"\"texte\""`), et un import déjà correct ne bouge pas.
 *
 * @param string[] $colonnes Colonnes JSON de la table.
 * @return int Nombre de lignes réellement corrigées.
 */
function rattraperColonnesJson(Db $db, string $table, string $cle, array $colonnes): int
{
    $projection = implode(', ', array_map(
        [Db::class, 'identifiant'],
        array_merge([$cle], $colonnes),
    ));

    $lignes = $db->tous('SELECT ' . $projection . ' FROM ' . Db::identifiant($table));
    $corrigees = 0;

    foreach ($lignes as $ligne) {
        $set = [];
        $params = [':cle_rattrapage' => $ligne[$cle]];

        foreach ($colonnes as $colonne) {
            $brut = $ligne[$colonne];
            if (!is_string($brut) || $brut === '') {
                continue; // NULL ou vide : `Db::dejson()` rend le repli sans rien journaliser.
            }
            json_decode($brut, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                continue; // Déjà du JSON valide — on n'y touche pas.
            }
            $set[] = Db::identifiant($colonne) . ' = :' . $colonne;
            $params[':' . $colonne] = Db::json($brut);
        }

        if ($set === []) {
            continue;
        }

        $db->run(
            'UPDATE ' . Db::identifiant($table) . ' SET ' . implode(', ', $set)
                . ' WHERE ' . Db::identifiant($cle) . ' = :cle_rattrapage',
            $params,
        );
        $corrigees++;
    }

    return $corrigees;
}

// ------------------------------------------------------------------ Chargement du JSON
$cheminJson = __DIR__ . '/donnees-front.json';

if (!is_file($cheminJson)) {
    fwrite(STDERR, "ERREUR : {$cheminJson} introuvable.\n");
    fwrite(STDERR, "Lancez d'abord : bun run scripts/extraire-donnees-front.ts\n");
    exit(1);
}

$contenuBrut = file_get_contents($cheminJson);
if ($contenuBrut === false) {
    fwrite(STDERR, "ERREUR : impossible de lire {$cheminJson}.\n");
    exit(1);
}

/** @var array<string,mixed> $donnees */
$donnees = json_decode($contenuBrut, true, 512, JSON_THROW_ON_ERROR);

$db         = Db::instance();
$maintenant = gmdate('c');

$compteurs = [];

// ------------------------------------------------------------------ Catégories
/**
 * Colonnes : slug, label, description, cover, position, created_at, updated_at.
 * Clé d'upsert : slug.
 */
$categories = (array) ($donnees['categories'] ?? []);

foreach ($categories as $cat) {
    $db->upsert('categories', [
        'slug'        => (string) $cat['slug'],
        'label'       => (string) $cat['label'],
        'description' => (string) $cat['description'],
        'cover'       => isset($cat['cover']) ? (string) $cat['cover'] : null,
        'position'    => (int) ($cat['position'] ?? 0),
        'created_at'  => $maintenant,
        'updated_at'  => $maintenant,
    ], ['slug']);
}

$compteurs['categories'] = (int) $db->valeur('SELECT COUNT(*) FROM categories');

// ------------------------------------------------------------------ Marques
/**
 * Colonnes : id, name, description, country, created_at, updated_at.
 * Clé d'upsert : id.
 */
$marques = (array) ($donnees['brands'] ?? []);

foreach ($marques as $m) {
    $db->upsert('brands', [
        'id'          => (string) $m['id'],
        'name'        => (string) $m['name'],
        'description' => isset($m['description']) ? (string) $m['description'] : null,
        'country'     => isset($m['country']) ? (string) $m['country'] : null,
        'created_at'  => $maintenant,
        'updated_at'  => $maintenant,
    ], ['id']);
}

$compteurs['brands'] = (int) $db->valeur('SELECT COUNT(*) FROM brands');

// ------------------------------------------------------------------ Produits
/**
 * Colonnes : id, name (JSON), brand, category, use_tags (JSON), spec_line (JSON),
 *            specs (JSON), price, old_price, stock, stock_qty, image,
 *            best_seller, sale, custom_build, created_at, updated_at.
 *
 * Les champs Localized<string> (name, spec_line, specs et ses valeurs) sont
 * stockés en JSON sans être aplatis.
 *
 * TOUJOURS ENCODER, chaîne simple comprise. La version précédente n'encodait que
 * les valeurs multilingues et stockait la chaîne simple telle quelle :
 * `json_decode("ASUS ROG Strix G16")` échoue à la lecture, et le serveur
 * journalisait « Colonne JSON illisible, repli appliqué » pour chaque produit, à
 * chaque requête — des centaines de lignes de bruit masquant les vraies erreurs.
 * `Db::json("texte")` rend `"texte"`, guillemets compris : du JSON valide, et
 * exactement la forme que le contrôleur écrit sur POST /products.
 *
 * Clé d'upsert : id.
 */
$produits = (array) ($donnees['products'] ?? []);

foreach ($produits as $p) {
    // name : chaîne simple (invariant) ou objet {fr,en,ar} — encodé dans les deux cas.
    $name = Db::json($p['name']);

    // spec_line idem.
    $specLine = isset($p['spec_line']) ? Db::json($p['spec_line']) : null;

    // specs : dictionnaire dont les valeurs peuvent être Localized.
    $specs = isset($p['specs']) && is_array($p['specs']) ? Db::json($p['specs']) : null;

    $useTags = Db::json($p['use_tags'] ?? []);

    $db->upsert('products', [
        'id'           => (string) $p['id'],
        'name'         => $name,
        'brand'        => (string) ($p['brand'] ?? ''),
        'category'     => (string) ($p['category'] ?? ''),
        'use_tags'     => $useTags,
        'spec_line'    => $specLine,
        'specs'        => $specs,
        'price'        => (int) ($p['price'] ?? 0),
        'old_price'    => isset($p['old_price']) && $p['old_price'] !== null ? (int) $p['old_price'] : null,
        'stock'        => (string) ($p['stock'] ?? 'in'),
        'stock_qty'    => isset($p['stock_qty']) ? (int) $p['stock_qty'] : null,
        'image'        => (string) ($p['image'] ?? ''),
        'best_seller'  => (int) ($p['best_seller'] ?? 0),
        'sale'         => (int) ($p['sale'] ?? 0),
        'custom_build' => (int) ($p['custom_build'] ?? 0),
        'created_at'   => $maintenant,
        'updated_at'   => $maintenant,
    ], ['id']);
}

$compteurs['products'] = (int) $db->valeur('SELECT COUNT(*) FROM products');

// ------------------------------------------------------------------ Articles de blog
/**
 * Colonnes : id, slug, title (JSON), excerpt (JSON), content (JSON),
 *            cover, author, tags (JSON), status, published_at,
 *            created_at, updated_at.
 *
 * title, excerpt et content sont des Localized<string> → JSON.
 * Clé d'upsert : id.
 */
$articles = (array) ($donnees['blogPosts'] ?? []);

foreach ($articles as $a) {
    // Objets {fr,en,ar} dans le JSON d'extraction d'aujourd'hui, mais une chaîne
    // simple y est légitime (LOCALIZED-DATA.md §1) : `Db::json()` encode les deux,
    // là où un `is_array()` en amont laissait passer la chaîne brute.
    $title   = Db::json($a['title']);
    $excerpt = isset($a['excerpt']) ? Db::json($a['excerpt']) : null;
    $content = isset($a['content']) ? Db::json($a['content']) : null;
    $tags    = Db::json($a['tags'] ?? []);

    $db->upsert('blog_posts', [
        'id'           => (string) $a['id'],
        'slug'         => (string) $a['slug'],
        'title'        => $title,
        'excerpt'      => $excerpt,
        'content'      => $content,
        'cover'        => isset($a['cover']) ? (string) $a['cover'] : null,
        'author'       => (string) ($a['author'] ?? ''),
        'tags'         => $tags,
        'status'       => (string) ($a['status'] ?? 'published'),
        'published_at' => isset($a['published_at']) ? (string) $a['published_at'] : null,
        'created_at'   => $maintenant,
        'updated_at'   => $maintenant,
    ], ['id']);
}

$compteurs['blog_posts'] = (int) $db->valeur('SELECT COUNT(*) FROM blog_posts');

// ------------------------------------------------------------------ Tarifs de livraison
/**
 * Colonnes : wilaya_code, home, desk, updated_at.
 * Clé d'upsert : wilaya_code.
 * 59 lignes : 1 défaut ("*") + 58 wilayas.
 */
$tarifs = (array) ($donnees['shippingRates'] ?? []);

foreach ($tarifs as $t) {
    $db->upsert('shipping_rates', [
        'wilaya_code' => (string) $t['wilaya_code'],
        'home'        => (int) ($t['home'] ?? 0),
        'desk'        => (int) ($t['desk'] ?? 0),
        'updated_at'  => $maintenant,
    ], ['wilaya_code']);
}

$compteurs['shipping_rates'] = (int) $db->valeur('SELECT COUNT(*) FROM shipping_rates');

// ------------------------------------------------------------------ Modes de paiement
/**
 * Colonnes : id, label, instructions, active, position, updated_at.
 * Clé d'upsert : id.
 */
$paiements = (array) ($donnees['paymentMethods'] ?? []);

foreach ($paiements as $pm) {
    $db->upsert('payment_methods', [
        'id'           => (string) $pm['id'],
        'label'        => (string) $pm['label'],
        'instructions' => (string) ($pm['instructions'] ?? ''),
        'active'       => (int) ($pm['active'] ?? 1),
        'position'     => (int) ($pm['position'] ?? 0),
        'updated_at'   => $maintenant,
    ], ['id']);
}

$compteurs['payment_methods'] = (int) $db->valeur('SELECT COUNT(*) FROM payment_methods');

// ------------------------------------------------------------------ Contenu du site (site_content)
/**
 * Table site_content : une ligne par section (clé primaire = section).
 * payload est un JSON semi-structuré.
 * Clé d'upsert : section.
 */
$contenu = (array) ($donnees['siteContent'] ?? []);

foreach ($contenu as $section => $payload) {
    $db->upsert('site_content', [
        'section'    => (string) $section,
        'payload'    => Db::json($payload),
        'updated_at' => $maintenant,
    ], ['section']);
}

$compteurs['site_content'] = (int) $db->valeur('SELECT COUNT(*) FROM site_content');

// ------------------------------------------------------------------ Réglages (settings)
/**
 * Table settings : une ligne par portée (scope).
 * Clé d'upsert : scope.
 */
$siteSettings     = $donnees['siteSettings']     ?? null;
$shippingSettings = $donnees['shippingSettings'] ?? null;

if ($siteSettings !== null) {
    $db->upsert('settings', [
        'scope'      => 'site',
        'payload'    => Db::json($siteSettings),
        'updated_at' => $maintenant,
    ], ['scope']);
}

if ($shippingSettings !== null) {
    $db->upsert('settings', [
        'scope'      => 'shipping',
        'payload'    => Db::json($shippingSettings),
        'updated_at' => $maintenant,
    ], ['scope']);
}

$compteurs['settings'] = (int) $db->valeur('SELECT COUNT(*) FROM settings');

// ------------------------------------------------------------------ Rattrapage des colonnes JSON
/**
 * Après les upserts : les lignes que cet import vient de réécrire sont déjà
 * correctes, ce passage ne concerne donc que l'héritage — les lignes laissées en
 * clair par une version antérieure de l'outil, y compris celles qui ne figurent
 * plus dans le JSON d'extraction.
 *
 * Les tables `orders` (status_history, invoice_snapshot) ne sont pas listées :
 * cet outil n'y écrit rien, et elles sont exclusivement alimentées par le
 * contrôleur, qui passe déjà par `Db::json()`.
 */
$rattrapees = 0;
$rattrapees += rattraperColonnesJson($db, 'products', 'id', ['name', 'use_tags', 'spec_line', 'specs']);
$rattrapees += rattraperColonnesJson($db, 'blog_posts', 'id', ['title', 'excerpt', 'content', 'tags']);
$rattrapees += rattraperColonnesJson($db, 'site_content', 'section', ['payload']);
$rattrapees += rattraperColonnesJson($db, 'settings', 'scope', ['payload']);

// ------------------------------------------------------------------ Rapport final
$pilote = $db->pilote();
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║  Importation des données du frontend — pilote : {$pilote}";
echo str_repeat(' ', max(0, 15 - strlen($pilote))) . "║\n";
echo "╠══════════════════════════════════════════════════════════════╣\n";
foreach ($compteurs as $table => $nb) {
    $ligne = "  {$table} : {$nb} ligne(s) en base";
    echo "║" . $ligne . str_repeat(' ', max(0, 62 - strlen($ligne))) . "║\n";
}
echo "╠══════════════════════════════════════════════════════════════╣\n";
$ligneRattrapage = "  rattrapage JSON : {$rattrapees} ligne(s) réencodée(s)";
echo "║" . $ligneRattrapage . str_repeat(' ', max(0, 62 - mb_strlen($ligneRattrapage))) . "║\n";
echo "╠══════════════════════════════════════════════════════════════╣\n";
echo "║  JSON source : " . basename($cheminJson);
echo str_repeat(' ', max(0, 47 - strlen(basename($cheminJson)))) . "║\n";
echo "║  Généré le   : " . ($donnees['generatedAt'] ?? '—');
echo str_repeat(' ', max(0, 47 - strlen((string) ($donnees['generatedAt'] ?? '—')))) . "║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n";
echo "\nImportation terminée sans erreur. Rejouable (idempotent).\n";
