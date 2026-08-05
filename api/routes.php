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

use KaTech\Controllers\ControleurAvis;
use KaTech\Controllers\ControleurBlog;
use KaTech\Controllers\ControleurCategories;
use KaTech\Controllers\ControleurClients;
use KaTech\Controllers\ControleurCommandes;
use KaTech\Controllers\ControleurContenu;
use KaTech\Controllers\ControleurCoupons;
use KaTech\Controllers\ControleurCrm;
use KaTech\Controllers\ControleurJournal;
use KaTech\Controllers\ControleurLivraison;
use KaTech\Controllers\ControleurMarques;
use KaTech\Controllers\ControleurMedias;
use KaTech\Controllers\ControleurNotifications;
use KaTech\Controllers\ControleurPaiements;
use KaTech\Controllers\ControleurProduits;
use KaTech\Controllers\ControleurStock;
use KaTech\Controllers\ControleurUtilisateurs;
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

$routeur->post('/products', [$produits, 'creer']);
$routeur->patch('/products/:id', [$produits, 'modifier']);
$routeur->delete('/products/:id', [$produits, 'supprimer']);
$routeur->patch('/products/:id/stock', [$produits, 'mettreAJourStock']);

$categories = new ControleurCategories($db);
$routeur->get('/categories', [$categories, 'lister']);
$routeur->post('/categories', [$categories, 'creer']);
$routeur->get('/categories/:slug', [$categories, 'detail']);
$routeur->patch('/categories/:slug', [$categories, 'modifier']);
$routeur->delete('/categories/:slug', [$categories, 'supprimer']);

$marques = new ControleurMarques($db);
$routeur->get('/brands', [$marques, 'lister']);
$routeur->post('/brands', [$marques, 'creer']);
$routeur->get('/brands/:id', [$marques, 'detail']);
$routeur->patch('/brands/:id', [$marques, 'modifier']);
$routeur->delete('/brands/:id', [$marques, 'supprimer']);

// ---------------------------------------------------------------- Commerce
$commandes = new ControleurCommandes($db);
// ATTENTION : /me/orders est déclarée AVANT /orders/:id, sinon « me » serait
// capturé comme un identifiant de commande.
$routeur->get('/me/orders', [$commandes, 'mesCommandes']);
$routeur->get('/orders', [$commandes, 'lister']);
$routeur->post('/orders', [$commandes, 'creer']);
$routeur->get('/orders/:id', [$commandes, 'detail']);
$routeur->patch('/orders/:id/status', [$commandes, 'changerStatut']);
$routeur->delete('/orders/:id', [$commandes, 'supprimer']);

$clients = new ControleurClients($db);
$routeur->get('/customers', [$clients, 'lister']);
$routeur->post('/customers', [$clients, 'creer']);
$routeur->get('/customers/:id', [$clients, 'detail']);
$routeur->patch('/customers/:id', [$clients, 'majPartielle']);
$routeur->delete('/customers/:id', [$clients, 'supprimer']);

$coupons = new ControleurCoupons($db);
// ATTENTION : /coupons/validate AVANT /coupons/:code, même raison.
$routeur->post('/coupons/validate', [$coupons, 'valider']);
$routeur->get('/coupons', [$coupons, 'lister']);
$routeur->post('/coupons', [$coupons, 'creer']);
$routeur->get('/coupons/:code', [$coupons, 'detail']);
$routeur->patch('/coupons/:code', [$coupons, 'majPartielle']);
$routeur->delete('/coupons/:code', [$coupons, 'supprimer']);

// ------------------------------------------------------- Avis et comptes
$avis = new ControleurAvis($db);
$routeur->get('/reviews', [$avis, 'lister']);
$routeur->get('/products/:id/reviews', [$avis, 'listerParProduit']);
$routeur->post('/products/:id/reviews', [$avis, 'creer']);
$routeur->patch('/reviews/:id/status', [$avis, 'moderer']);
$routeur->delete('/reviews/:id', [$avis, 'supprimer']);

$utilisateurs = new ControleurUtilisateurs($db);
$routeur->get('/admin/users', [$utilisateurs, 'lister']);
$routeur->post('/admin/users', [$utilisateurs, 'creer']);
$routeur->get('/admin/users/:id', [$utilisateurs, 'detail']);
$routeur->patch('/admin/users/:id', [$utilisateurs, 'mettreAJour']);
$routeur->patch('/admin/users/:id/password', [$utilisateurs, 'changerMotDePasse']);
$routeur->delete('/admin/users/:id', [$utilisateurs, 'supprimer']);

// --------------------------------------------------------------- Éditorial
$blog = new ControleurBlog($db);
$routeur->get('/blog', [$blog, 'lister']);
$routeur->post('/blog', [$blog, 'creer']);
$routeur->get('/blog/:slug', [$blog, 'detail']);
$routeur->patch('/blog/:slug', [$blog, 'mettreAJour']);
$routeur->delete('/blog/:slug', [$blog, 'supprimer']);

$contenu = new ControleurContenu($db);
// ATTENTION : /content/home-reviews AVANT /content/:section/reset.
$routeur->get('/content/home-reviews', [$contenu, 'lireHomeReviews']);
$routeur->patch('/content/home-reviews', [$contenu, 'mettreAJourHomeReviews']);
$routeur->get('/content', [$contenu, 'lireContenu']);
$routeur->patch('/content', [$contenu, 'mettreAJourContenu']);
$routeur->post('/content/:section/reset', [$contenu, 'reinitialiserSection']);

$routeur->get('/settings/site', [$contenu, 'lireReglagesSite']);
$routeur->patch('/settings/site', [$contenu, 'mettreAJourReglagesSite']);
$routeur->get('/settings/shipping', [$contenu, 'lireReglagesLivraison']);
$routeur->patch('/settings/shipping', [$contenu, 'mettreAJourReglagesLivraison']);

// ARBITRAGE DE L'ORCHESTRATEUR — deux agents de la vague 4.2 ont implémenté
// les tarifs de livraison et les modes de paiement. Le routage désigne les
// contrôleurs DÉDIÉS, plus cohérents que des méthodes noyées dans le contenu ;
// les doublons de ControleurContenu ont été retirés.
$livraison = new ControleurLivraison($db);
$routeur->get('/settings/shipping/rates', [$livraison, 'lister']);
$routeur->put('/settings/shipping/rates/:wilayaCode', [$livraison, 'upsertTarif']);
$routeur->delete('/settings/shipping/rates/:wilayaCode', [$livraison, 'supprimer']);

$paiements = new ControleurPaiements($db);
$routeur->get('/settings/payments', [$paiements, 'lister']);
$routeur->put('/settings/payments/:id', [$paiements, 'upsertMode']);
$routeur->delete('/settings/payments/:id', [$paiements, 'supprimer']);

// ------------------------------------------------------------ Exploitation
$medias = new ControleurMedias($db);
$routeur->get('/media', [$medias, 'lister']);
$routeur->post('/media', [$medias, 'televerser']);
$routeur->get('/media/:id', [$medias, 'detail']);
$routeur->delete('/media/:id', [$medias, 'supprimer']);

$notifs = new ControleurNotifications($db);
$routeur->get('/notifications', [$notifs, 'lister']);
$routeur->post('/notifications', [$notifs, 'creer']);
$routeur->get('/notifications/:id', [$notifs, 'detail']);
$routeur->patch('/notifications/:id', [$notifs, 'mettreAJour']);
$routeur->delete('/notifications/:id', [$notifs, 'supprimer']);

$crm = new ControleurCrm($db);
$routeur->get('/messages', [$crm, 'listerMessages']);
$routeur->get('/messages/:id', [$crm, 'detailMessage']);
$routeur->patch('/messages/:id', [$crm, 'mettreAJourMessage']);
$routeur->delete('/messages/:id', [$crm, 'supprimerMessage']);
$routeur->get('/subscribers', [$crm, 'listerAbonnes']);
$routeur->post('/subscribers', [$crm, 'inscrire']);
$routeur->delete('/subscribers/:id', [$crm, 'desinscrire']);

$journal = new ControleurJournal($db);
$routeur->get('/analytics/audit', [$journal, 'lister']);
$routeur->get('/analytics/audit/:id', [$journal, 'detail']);

// ----------------------------------------------------------- Stock
$stock = new ControleurStock($db);
$routeur->get('/inventory/movements', [$stock, 'lister']);
$routeur->post('/inventory/:productId/adjust', [$stock, 'ajuster']);

// Reste à brancher : /auth (vague 4.3).

return $routeur;
