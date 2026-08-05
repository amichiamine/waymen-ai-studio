<?php

/**
 * Amorçage — autoloader PSR-4 maison et réglages d'erreur.
 *
 * Aucun `vendor/autoload.php` : l'API doit tourner sur un hébergement
 * mutualisé sans que Composer y ait jamais été exécuté.
 */

declare(strict_types=1);

spl_autoload_register(static function (string $classe): void {
    $prefixe = 'KaTech\\';
    if (!str_starts_with($classe, $prefixe)) {
        return;
    }
    $relatif = substr($classe, strlen($prefixe));
    $chemin = __DIR__ . '/' . str_replace('\\', '/', $relatif) . '.php';
    if (is_file($chemin)) {
        require_once $chemin;
    }
});

require_once __DIR__ . '/Env.php';

\KaTech\Env::charger();

/**
 * Vrai en production : aucune trace ne doit sortir vers le client.
 * `APP_ENV=dev` (ou `local`) réactive l'affichage détaillé.
 */
function katech_est_production(): bool
{
    $env = strtolower((string) \KaTech\Env::get('APP_ENV', 'production'));

    return !in_array($env, ['dev', 'development', 'local', 'test'], true);
}

$production = katech_est_production();

// En production : rien à l'écran, tout dans le journal du serveur.
ini_set('display_errors', $production ? '0' : '1');
ini_set('display_startup_errors', $production ? '0' : '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Fuseau UTC : le contrat impose des dates ISO 8601 UTC.
date_default_timezone_set('UTC');

/**
 * Les avertissements PHP deviennent des exceptions : un `Warning` ignoré est
 * exactement l'échec silencieux que la doctrine interdit (AGENTS.md §7).
 */
set_error_handler(static function (int $niveau, string $message, string $fichier, int $ligne): bool {
    if ((error_reporting() & $niveau) === 0) {
        return false;
    }

    throw new ErrorException($message, 0, $niveau, $fichier, $ligne);
});
