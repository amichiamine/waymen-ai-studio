<?php

/**
 * Table de routage — miroir serveur de `src/api/endpoints.ts`.
 *
 * Le frontend est DÉJÀ écrit contre ces chemins : ils ne se renégocient pas.
 * Chaque vague de la phase 4 ajoute ses routes ici, sans jamais en renommer
 * une existante.
 *
 * Rendu : une instance de `Routeur` prête à dispatcher.
 */

declare(strict_types=1);

use KaTech\Controllers\ControleurProduits;
use KaTech\Db;
use KaTech\Reponse;
use KaTech\Requete;
use KaTech\Routeur;

/** @var Db $db */
$routeur = new Routeur();

// ---------------------------------------------------------------- Santé
// Sonde de disponibilité : LECTURE SEULE (AGENTS.md §6 — jamais d'écriture
// pour tester la présence d'un service).
$routeur->get('/health', static function (Requete $r) use ($db): Reponse {
    return Reponse::ok([
        'status' => 'ok',
        'driver' => $db->pilote(),
        'time' => gmdate('c'),
    ]);
});

// ---------------------------------------------------------------- Catalogue
$produits = new ControleurProduits($db);
$routeur->get('/products', [$produits, 'lister']);
$routeur->get('/products/:id', [$produits, 'detail']);

// Les vagues suivantes branchent ici : POST /products, PATCH /products/:id,
// DELETE /products/:id, PATCH /products/:id/stock, puis /categories, /brands,
// /orders, /reviews, /coupons, /content, /settings, /inventory, /media,
// /messages, /subscribers, /admin/users, /analytics, /auth.

return $routeur;
