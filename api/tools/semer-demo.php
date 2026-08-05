#!/usr/bin/env php
<?php

/**
 * Semis de démonstration — OUTIL DE DÉVELOPPEMENT, jamais exécuté en production.
 *
 * Insère quelques produits représentatifs pour fumer les routes du catalogue
 * sur les deux pilotes. Passe par `Db::upsert()` : le script vérifie donc aussi,
 * au passage, que la divergence ON CONFLICT / ON DUPLICATE KEY est bien isolée.
 *
 * Usage :
 *   DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/katech.sqlite php api/tools/semer-demo.php
 *   DB_DRIVER=mysql php api/tools/semer-demo.php
 *
 * Idempotent : relançable sans créer de doublon.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script est réservé à la ligne de commande.\n");
}

require_once __DIR__ . '/../src/bootstrap.php';

use KaTech\Db;

$db = Db::instance();
$maintenant = gmdate('c');

// Deux produits à nom nu (invariant dans les 3 langues) et un à nom localisé :
// le mélange reflète exactement ce que `Localized<string>` autorise
// (docs/LOCALIZED-DATA.md) et vérifie que les deux formes traversent la base.
$produits = [
    [
        'id' => 'rog-strix-g16',
        'name' => 'ASUS ROG Strix G16',
        'brand' => 'ASUS',
        'category' => 'laptops',
        'use_tags' => ['gaming', 'edit'],
        'spec_line' => 'Intel i9 · RTX 4070 · 32GB · 1TB',
        'specs' => ['cpu' => 'Intel Core i9-13980HX', 'ram' => '32GB DDR5', 'gpu' => 'NVIDIA RTX 4070 8GB'],
        'price' => 389000,
        'old_price' => 415000,
        'stock' => 'in',
        'stock_qty' => 7,
        'image' => '/assets/p-rog.webp',
        'best_seller' => 1,
        'sale' => 1,
        'custom_build' => 0,
    ],
    [
        'id' => 'macbook-air-m3',
        'name' => 'MacBook Air M3',
        'brand' => 'Apple',
        'category' => 'laptops',
        'use_tags' => ['work', 'study'],
        'spec_line' => 'Apple M3 · 16GB · 512GB',
        'specs' => ['cpu' => 'Apple M3', 'ram' => '16GB', 'storage' => '512GB SSD'],
        'price' => 285000,
        'old_price' => null,
        'stock' => 'low',
        'stock_qty' => 2,
        'image' => '/assets/p-macbook.webp',
        'best_seller' => 0,
        'sale' => 0,
        'custom_build' => 0,
    ],
    [
        'id' => 'ka-build-pro',
        'name' => ['fr' => 'Configuration Pro Créateur', 'en' => 'Pro Creator Build', 'ar' => 'تجميعة المحترف'],
        'brand' => 'KA Build',
        'category' => 'builds',
        'use_tags' => ['edit', 'gaming'],
        'spec_line' => ['fr' => 'Ryzen 9 · RTX 4080 · 64GB', 'en' => 'Ryzen 9 · RTX 4080 · 64GB'],
        'specs' => ['cpu' => 'AMD Ryzen 9 7950X', 'gpu' => 'NVIDIA RTX 4080 16GB', 'ram' => '64GB DDR5'],
        'price' => 620000,
        'old_price' => null,
        'stock' => 'in',
        'stock_qty' => 3,
        'image' => '/assets/p-build-pro.webp',
        'best_seller' => 1,
        'sale' => 0,
        'custom_build' => 0,
    ],
];

foreach ($produits as $p) {
    $db->upsert('products', [
        'id' => $p['id'],
        'name' => Db::json($p['name']),
        'brand' => $p['brand'],
        'category' => $p['category'],
        'use_tags' => Db::json($p['use_tags']),
        'spec_line' => Db::json($p['spec_line']),
        'specs' => Db::json($p['specs']),
        'price' => $p['price'],
        'old_price' => $p['old_price'],
        'stock' => $p['stock'],
        'stock_qty' => $p['stock_qty'],
        'image' => $p['image'],
        'best_seller' => $p['best_seller'],
        'sale' => $p['sale'],
        'custom_build' => $p['custom_build'],
        'created_at' => $maintenant,
        'updated_at' => $maintenant,
    ], ['id']);
}

$total = (int) $db->valeur('SELECT COUNT(*) FROM products');
echo "Semis terminé (pilote {$db->pilote()}) : {$total} produits en base.\n";
