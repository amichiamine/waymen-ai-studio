<?php

/**
 * Point d'entrée unique de l'API KA Tech Hub.
 *
 * Toutes les URL `/api/*` arrivent ici (voir `api/.htaccess`). Ce fichier ne
 * contient AUCUNE logique métier : il amorce, dispatche, et garantit qu'une
 * réponse conforme au contrat sort dans tous les cas — y compris quand tout
 * s'effondre.
 *
 * Garantie non négociable : jamais de page blanche, jamais de trace exposée.
 */

declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Env;
use KaTech\Reponse;
use KaTech\Requete;
use KaTech\Routeur;

// Toute sortie parasite (BOM, avertissement d'un include) est capturée puis
// jetée : un seul octet avant les en-têtes casserait la réponse JSON.
ob_start();

$reponse = null;

try {
    appliquerCors();

    $requete = Requete::depuisGlobals();

    // Préflight CORS : répondre avant même de toucher la base.
    if ($requete->methode === 'OPTIONS') {
        $reponse = Reponse::vide();
    } else {
        $db = Db::instance();

        /** @var Routeur $routeur */
        $routeur = require __DIR__ . '/routes.php';

        $reponse = $routeur->dispatcher($requete);
    }
} catch (ApiException $e) {
    // Erreur métier : le message EST destiné au client.
    if ($e->statut() >= 500) {
        journaliser($e);
    }
    $reponse = Reponse::depuisException($e);
} catch (Throwable $e) {
    // Panne interne : journalisée en détail côté serveur, rendue en 500
    // générique côté client. En dev seulement, le détail est renvoyé.
    journaliser($e);

    $reponse = Reponse::erreur(
        500,
        'INTERNAL_ERROR',
        katech_est_production()
            ? 'Erreur interne du serveur. L\'incident a été journalisé.'
            : sprintf('[dev] %s: %s (%s:%d)', $e::class, $e->getMessage(), $e->getFile(), $e->getLine()),
    );
}

// Rideau de sécurité : si un `exit`, un `die` ou une erreur fatale non
// récupérable survient malgré tout, le client reçoit quand même du JSON.
register_shutdown_function(static function (): void {
    $fatale = error_get_last();
    if ($fatale === null || !in_array($fatale['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }
    if (headers_sent()) {
        return;
    }
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    Db::journaliserStatique(sprintf(
        'Erreur fatale : %s (%s:%d)',
        $fatale['message'],
        $fatale['file'],
        $fatale['line'],
    ));
    Reponse::erreur(500, 'INTERNAL_ERROR', 'Erreur interne du serveur. L\'incident a été journalisé.')->envoyer();
});

// On jette tout ce qui aurait pu être imprimé pendant le traitement.
while (ob_get_level() > 0) {
    ob_end_clean();
}

$reponse->envoyer();

// =====================================================================

function journaliser(Throwable $e): void
{
    Db::journaliserStatique(sprintf(
        '%s: %s (%s:%d) — %s %s | %s',
        $e::class,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $_SERVER['REQUEST_METHOD'] ?? '?',
        $_SERVER['REQUEST_URI'] ?? '?',
        str_replace("\n", ' | ', $e->getTraceAsString()),
    ));
}

/**
 * CORS. En production, le frontend est servi par le MÊME domaine : aucune
 * origine n'est nécessaire. En développement, Vite tourne sur :5173 et il faut
 * l'autoriser nommément — `*` est incompatible avec
 * `credentials: include`, que le client utilise (contrat, auth par cookie).
 */
function appliquerCors(): void
{
    $liste = (string) Env::get('CORS_ORIGINS', '');
    if ($liste === '') {
        return;
    }

    $origine = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origine === '') {
        return;
    }

    $autorisees = array_map('trim', explode(',', $liste));
    if (!in_array($origine, $autorisees, true)) {
        return;
    }

    header('Access-Control-Allow-Origin: ' . $origine);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Vary: Origin');
}
