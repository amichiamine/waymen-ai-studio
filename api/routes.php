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

use KaTech\Auth\Garde;
use KaTech\Auth\MotDePasse;
use KaTech\Controllers\ControleurAuth;
use KaTech\Controllers\ControleurAvis;
use KaTech\Controllers\ControleurBlog;
use KaTech\Controllers\ControleurBuilds;
use KaTech\Controllers\ControleurCategories;
use KaTech\Controllers\ControleurClients;
use KaTech\Controllers\ControleurCommandes;
use KaTech\Controllers\ControleurContenu;
use KaTech\Controllers\ControleurCoupons;
use KaTech\Controllers\ControleurCrm;
use KaTech\Controllers\ControleurJournal;
use KaTech\Controllers\ControleurLivraison;
use KaTech\Controllers\ControleurMaintenance;
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
        // Rend visible l'algorithme qui protege reellement les mots de passe :
        // Argon2id n'est pas disponible partout, le repli bcrypt ne doit pas
        // etre silencieux (AGENTS.md section 7).
        'passwordHashing' => MotDePasse::diagnostic(),
    ]);
});

// ---------------------------------------------------------------- Catalogue
$produits = new ControleurProduits($db);
$routeur->get('/products', [$produits, 'lister']);
$routeur->get('/products/:id', [$produits, 'detail']);

$routeur->post('/products', Garde::protege('create', [$produits, 'creer']));
$routeur->patch('/products/:id', Garde::protege('update', [$produits, 'modifier']));
$routeur->delete('/products/:id', Garde::protege('delete', [$produits, 'supprimer']));
$routeur->patch('/products/:id/stock', Garde::protege('update', [$produits, 'mettreAJourStock']));

// Configurateur PC. Route d'ÉCRITURE ouverte aux CLIENTS : `protegeConnecte`,
// comme /me/orders — un client authentifié y a sa place, un anonyme non. Elle
// n'est surtout PAS gardée par `create` : c'est précisément la permission
// `editor` de POST /products qui renvoyait 403 au visiteur du configurateur.
// Le prix est recalculé côté serveur ; aucun prix venant du client n'est lu.
// Le plafond de débit est posé dans le contrôleur (voir ControleurBuilds).
$builds = new ControleurBuilds($db);
$routeur->post('/builds', Garde::protegeConnecte([$builds, 'creer']));

$categories = new ControleurCategories($db);
$routeur->get('/categories', [$categories, 'lister']);
$routeur->post('/categories', Garde::protege('create', [$categories, 'creer']));
$routeur->get('/categories/:slug', [$categories, 'detail']);
$routeur->patch('/categories/:slug', Garde::protege('update', [$categories, 'modifier']));
$routeur->delete('/categories/:slug', Garde::protege('delete', [$categories, 'supprimer']));

$marques = new ControleurMarques($db);
$routeur->get('/brands', [$marques, 'lister']);
$routeur->post('/brands', Garde::protege('create', [$marques, 'creer']));
$routeur->get('/brands/:id', [$marques, 'detail']);
$routeur->patch('/brands/:id', Garde::protege('update', [$marques, 'modifier']));
$routeur->delete('/brands/:id', Garde::protege('delete', [$marques, 'supprimer']));

// ---------------------------------------------------------------- Commerce
$commandes = new ControleurCommandes($db);
// ATTENTION : /me/orders est déclarée AVANT /orders/:id, sinon « me » serait
// capturé comme un identifiant de commande.
$routeur->get('/me/orders', Garde::protegeConnecte([$commandes, 'mesCommandes']));
$routeur->get('/orders', Garde::protege('read', [$commandes, 'lister']));
$routeur->post('/orders', [$commandes, 'creer']);
$routeur->get('/orders/:id', Garde::protege('read', [$commandes, 'detail']));
$routeur->patch('/orders/:id/status', Garde::protege('update', [$commandes, 'changerStatut']));
$routeur->delete('/orders/:id', Garde::protege('delete', [$commandes, 'supprimer']));

$clients = new ControleurClients($db);
$routeur->get('/customers', Garde::protege('read', [$clients, 'lister']));
$routeur->post('/customers', Garde::protege('create', [$clients, 'creer']));
$routeur->get('/customers/:id', Garde::protege('read', [$clients, 'detail']));
$routeur->patch('/customers/:id', Garde::protege('update', [$clients, 'majPartielle']));
$routeur->delete('/customers/:id', Garde::protege('delete', [$clients, 'supprimer']));

$coupons = new ControleurCoupons($db);
// ATTENTION : /coupons/validate AVANT /coupons/:code, même raison.
$routeur->post('/coupons/validate', [$coupons, 'valider']);
$routeur->get('/coupons', Garde::protege('read', [$coupons, 'lister']));
$routeur->post('/coupons', Garde::protege('create', [$coupons, 'creer']));
$routeur->get('/coupons/:code', Garde::protege('read', [$coupons, 'detail']));
$routeur->patch('/coupons/:code', Garde::protege('update', [$coupons, 'majPartielle']));
$routeur->delete('/coupons/:code', Garde::protege('delete', [$coupons, 'supprimer']));

// ------------------------------------------------------- Avis et comptes
$avis = new ControleurAvis($db);
$routeur->get('/reviews', Garde::protege('read', [$avis, 'lister']));
$routeur->get('/products/:id/reviews', [$avis, 'listerParProduit']);
$routeur->post('/products/:id/reviews', Garde::protegeConnecte([$avis, 'creer']));
$routeur->patch('/reviews/:id/status', Garde::protege('update', [$avis, 'moderer']));
$routeur->delete('/reviews/:id', Garde::protege('delete', [$avis, 'supprimer']));

$utilisateurs = new ControleurUtilisateurs($db);
$routeur->get('/admin/users', Garde::protege('read', [$utilisateurs, 'lister']));
$routeur->post('/admin/users', Garde::protege('manageUsers', [$utilisateurs, 'creer']));
$routeur->get('/admin/users/:id', Garde::protege('read', [$utilisateurs, 'detail']));
$routeur->patch('/admin/users/:id', Garde::protege('manageUsers', [$utilisateurs, 'mettreAJour']));
$routeur->patch('/admin/users/:id/password', Garde::protege('manageUsers', [$utilisateurs, 'changerMotDePasse']));
$routeur->delete('/admin/users/:id', Garde::protege('manageUsers', [$utilisateurs, 'supprimer']));

// --------------------------------------------------------------- Éditorial
$blog = new ControleurBlog($db);
$routeur->get('/blog', [$blog, 'lister']);
$routeur->post('/blog', Garde::protege('create', [$blog, 'creer']));
$routeur->get('/blog/:slug', [$blog, 'detail']);
$routeur->patch('/blog/:slug', Garde::protege('update', [$blog, 'mettreAJour']));
$routeur->delete('/blog/:slug', Garde::protege('delete', [$blog, 'supprimer']));

$contenu = new ControleurContenu($db);
// ATTENTION : /content/home-reviews AVANT /content/:section/reset.
$routeur->get('/content/home-reviews', [$contenu, 'lireHomeReviews']);
$routeur->patch('/content/home-reviews', Garde::protege('update', [$contenu, 'mettreAJourHomeReviews']));
$routeur->get('/content', [$contenu, 'lireContenu']);
$routeur->patch('/content', Garde::protege('update', [$contenu, 'mettreAJourContenu']));
$routeur->post('/content/:section/reset', Garde::protege('update', [$contenu, 'reinitialiserSection']));

$routeur->get('/settings/site', [$contenu, 'lireReglagesSite']);
$routeur->patch('/settings/site', Garde::protege('manageSettings', [$contenu, 'mettreAJourReglagesSite']));
$routeur->get('/settings/shipping', [$contenu, 'lireReglagesLivraison']);
$routeur->patch('/settings/shipping', Garde::protege('manageSettings', [$contenu, 'mettreAJourReglagesLivraison']));

// ARBITRAGE DE L'ORCHESTRATEUR — deux agents de la vague 4.2 ont implémenté
// les tarifs de livraison et les modes de paiement. Le routage désigne les
// contrôleurs DÉDIÉS, plus cohérents que des méthodes noyées dans le contenu ;
// les doublons de ControleurContenu ont été retirés.
$livraison = new ControleurLivraison($db);
$routeur->get('/settings/shipping/rates', [$livraison, 'lister']);
$routeur->put('/settings/shipping/rates/:wilayaCode', Garde::protege('manageSettings', [$livraison, 'upsertTarif']));
$routeur->delete('/settings/shipping/rates/:wilayaCode', Garde::protege('manageSettings', [$livraison, 'supprimer']));

$paiements = new ControleurPaiements($db);
$routeur->get('/settings/payments', [$paiements, 'lister']);
$routeur->put('/settings/payments/:id', Garde::protege('manageSettings', [$paiements, 'upsertMode']));
$routeur->delete('/settings/payments/:id', Garde::protege('manageSettings', [$paiements, 'supprimer']));

// ------------------------------------------------------------ Exploitation
$medias = new ControleurMedias($db);
$routeur->get('/media', Garde::protege('read', [$medias, 'lister']));
$routeur->post('/media', Garde::protege('create', [$medias, 'televerser']));
$routeur->get('/media/:id', Garde::protege('read', [$medias, 'detail']));
$routeur->patch('/media/:id', Garde::protege('update', [$medias, 'renommer']));
$routeur->delete('/media/:id', Garde::protege('delete', [$medias, 'supprimer']));

$notifs = new ControleurNotifications($db);
$routeur->get('/notifications', Garde::protege('read', [$notifs, 'lister']));
$routeur->post('/notifications', Garde::protege('create', [$notifs, 'creer']));
$routeur->get('/notifications/:id', Garde::protege('read', [$notifs, 'detail']));
$routeur->patch('/notifications/:id', Garde::protege('update', [$notifs, 'mettreAJour']));
$routeur->delete('/notifications/:id', Garde::protege('delete', [$notifs, 'supprimer']));

$crm = new ControleurCrm($db);
// Route PUBLIQUE : le formulaire de contact du site doit pouvoir ecrire sans
// compte. Validation stricte et taille bornee cote controleur.
$routeur->post('/messages', [$crm, 'recevoirMessage']);
$routeur->get('/messages', Garde::protege('read', [$crm, 'listerMessages']));
$routeur->get('/messages/:id', Garde::protege('read', [$crm, 'detailMessage']));
$routeur->patch('/messages/:id', Garde::protege('update', [$crm, 'mettreAJourMessage']));
$routeur->delete('/messages/:id', Garde::protege('delete', [$crm, 'supprimerMessage']));
$routeur->get('/subscribers', Garde::protege('read', [$crm, 'listerAbonnes']));
$routeur->post('/subscribers', [$crm, 'inscrire']);
$routeur->delete('/subscribers/:id', Garde::protege('delete', [$crm, 'desinscrire']));

$journal = new ControleurJournal($db);
$routeur->get('/analytics/audit', Garde::protege('read', [$journal, 'lister']));
$routeur->get('/analytics/audit/:id', Garde::protege('read', [$journal, 'detail']));

// ----------------------------------------------------------- Stock
$stock = new ControleurStock($db);
$routeur->get('/inventory/movements', Garde::protege('read', [$stock, 'lister']));
$routeur->post('/inventory/:productId/adjust', Garde::protege('update', [$stock, 'ajuster']));

// ----------------------------------------------------- Maintenance
// Le proprietaire n'a ni SSH ni phpMyAdmin sur un mutualise : ces trois routes
// sont son seul acces a ses propres donnees. D'ou le rang le plus eleve —
// `resetData` vaut `owner` dans Garde::MATRICE — et la garde posee ICI en plus
// de celle du controleur. Une route capable d'exporter la base entiere ou de la
// deplacer ailleurs doit etre visiblement gardee dans ce fichier : c'est ici
// qu'on relit les 66 gardes, pas dans le corps des controleurs.
$maintenance = new ControleurMaintenance($db);
$routeur->get('/maintenance/status', Garde::protege('resetData', [$maintenance, 'etat']));
$routeur->get('/maintenance/backup', Garde::protege('resetData', [$maintenance, 'sauvegarder']));
$routeur->post('/maintenance/migrate', Garde::protege('resetData', [$maintenance, 'migrer']));

// ------------------------------------------------------ Authentification
// Les 8 routes du contrat sont SANS garde : elles gerent elles-memes leur
// refus, et proteger /auth/login exigerait d'etre deja connecte.
$auth = new ControleurAuth($db);
$routeur->post('/auth/register', [$auth, 'inscription']);
$routeur->post('/auth/login', [$auth, 'connexion']);
$routeur->post('/auth/logout', [$auth, 'deconnexion']);
$routeur->get('/auth/me', [$auth, 'session']);
$routeur->post('/auth/refresh', [$auth, 'rafraichir']);
$routeur->post('/auth/forgot-password', [$auth, 'motDePasseOublie']);
$routeur->post('/auth/reset-password', [$auth, 'reinitialiserMotDePasse']);
$routeur->post('/auth/change-password', [$auth, 'changerMotDePasse']);

// ROUTES PUBLIQUES ASSUMEES, listees ici pour que l'absence de garde soit un
// choix visible et non un oubli :
//   GET  /products, /categories, /brands, /blog, /content, /settings/*  → vitrine
//   POST /orders            → commande invite, usage courant en Algerie
//   POST /coupons/validate  → verification au panier, avant connexion
//   POST /subscribers       → inscription a l'infolettre
//   GET  /products/:id/reviews → avis approuves uniquement (filtre en dur)

return $routeur;
