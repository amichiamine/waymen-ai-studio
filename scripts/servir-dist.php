<?php

/**
 * Serveur de VÉRIFICATION locale d'un `dist/` construit.
 *
 * =====================================================================
 * POURQUOI CE FICHIER EXISTE
 * =====================================================================
 * docs/DEPLOIEMENT.md §15 énumère ce qui n'a jamais pu être vérifié faute
 * d'hébergement : « l'interprétation effective des deux .htaccess […] aucun
 * serveur web n'a été exécuté ». Le prérendu de `scripts/prerendu.ts` dépend
 * précisément de ce qui n'était pas vérifiable : l'ordre des règles de
 * réécriture et la forme de l'URL finalement servie.
 *
 * Ce routeur rejoue ces règles devant `php -S`, dans l'ordre EXACT de
 * `public/.htaccess`, pour qu'on puisse parcourir le site construit dans un
 * vrai navigateur — accueil, fiche produit, panier — et lire la console.
 *
 *   php -S 127.0.0.1:8300 -t dist scripts/servir-dist.php
 *
 * =====================================================================
 * CE QU'IL N'EST PAS
 * =====================================================================
 * Ce n'est **pas** un composant de production, ce n'est pas un substitut à
 * Apache, et il ne doit jamais être téléversé. Il ne reproduit ni la CSP, ni
 * la compression, ni le cache : uniquement le ROUTAGE, seul point dont dépend
 * l'affichage. Un écart de comportement entre ce fichier et
 * `public/.htaccess` est un bogue de CE fichier — `public/.htaccess` est la
 * référence.
 *
 * `/api` n'est pas mandaté : ce routeur répond 404 en texte brut, ce qui est
 * exactement la propriété à vérifier — le repli SPA ne doit JAMAIS répondre du
 * HTML sous `/api`. Pour un parcours avec API, servir `dist/` derrière un vrai
 * Apache, ou utiliser `bun run dev`.
 */

declare(strict_types=1);

$documentRoot = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? getcwd()), '/');
$uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
$chemin = rawurldecode(parse_url($uri, PHP_URL_PATH) ?: '/');

/**
 * Dossier de l'APPLICATION, et son préfixe web.
 *
 * En contexte .htaccess, mod_rewrite compare les motifs au chemin PRIVÉ du
 * préfixe du répertoire où vit le .htaccess, puis remet ce préfixe devant
 * toute substitution relative (voir public/.htaccess, « PAS DE RewriteBase »).
 * On reproduit ce comportement en cherchant le plus long préfixe d'URL qui
 * corresponde à un dossier contenant `index.php` : c'est là que vivrait le
 * .htaccess, donc la racine de l'application.
 *
 * Sans cela, ce routeur ne saurait vérifier qu'un seul déploiement — à la
 * racine — alors que le dossier renommable et déplaçable est justement la
 * propriété la plus fragile du prérendu (la balise <base> relative).
 * Avec cela, `cp -r dist /tmp/web/ma-boutique` se parcourt tel quel.
 */
$prefixe = '';
$segments = array_values(array_filter(explode('/', trim($chemin, '/')), 'strlen'));
$essai = '';
foreach ($segments as $segment) {
    $essai .= '/' . $segment;
    if (is_file($documentRoot . $essai . '/index.php')) {
        $prefixe = $essai;
    }
}

$racine = $documentRoot . $prefixe;
$relatif = ltrim(substr($chemin, strlen($prefixe)), '/');
$fichier = $racine . '/' . $relatif;

/** Refus net, en texte brut : jamais de HTML là où on attend autre chose. */
function refuser(int $code, string $pourquoi): never
{
    http_response_code($code);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "$code — $pourquoi\n";

    exit;
}

// --- L'API d'abord, et on s'arrête là (RewriteRule ^api(/|$) - [L]) --------
// En production la requête poursuit vers public_html/api/.htaccess. Ici il n'y
// a pas d'API dans dist/ : on refuse, SANS jamais servir le document SPA.
if ($relatif === 'api' || str_starts_with($relatif, 'api/')) {
    refuser(404, 'aucune API dans dist/ — mais surtout : le repli SPA ne repond pas ici.');
}

// --- Refus des fichiers cachés et des extensions sensibles -----------------
if (preg_match('#(^|/)\.#', $relatif) === 1) {
    refuser(403, 'fichier commencant par un point');
}
if (preg_match('#\.(env|sqlite|sqlite-wal|sqlite-shm|db|sql|lock|log|ini|bak|old|orig|swp|gz|zip|tar)$#i', $relatif) === 1) {
    refuser(403, 'extension refusee a la racine web');
}

// --- Aucun script executable dans uploads/ ---------------------------------
if (preg_match('#^uploads/.*\.(php|phtml|phps|php[0-9]|phar|pl|py|cgi|sh|jsp|asp|htaccess)$#i', $relatif) === 1) {
    refuser(403, 'script refuse dans uploads/');
}

// --- Pages prerendues (a) : une seule forme d'URL, sans barre finale -------
if ($relatif !== '' && str_ends_with($relatif, '/')) {
    $dossier = $racine . '/' . rtrim($relatif, '/');
    if (is_dir($dossier) && is_file($dossier . '/index.html')) {
        http_response_code(301);
        header('Location: ' . $prefixe . '/' . rtrim($relatif, '/'));

        exit;
    }
}

// --- Pages prerendues (b) : service sans redirection -----------------------
if ($relatif !== '' && is_file(rtrim($fichier, '/') . '/index.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
    readfile(rtrim($fichier, '/') . '/index.html');

    exit;
}

// --- Fichiers reels : servis tels quels (return false => php -S s'en charge)
if ($relatif !== '' && is_file($fichier)) {
    return false;
}

// --- Une ressource absente doit echouer franchement ------------------------
if (preg_match('#(^|/)assets/#', $relatif) === 1) {
    refuser(404, 'asset absent — le repli SPA ne doit pas repondre du HTML ici.');
}
if (
    preg_match('#/uploads/#', $chemin) !== 1
    && preg_match('#^.+/[^/]+\.(?:ico|png|svg|webp|avif|jpe?g|gif|webmanifest|json|txt|xml|css|js|mjs|map|woff2?)$#i', $relatif) === 1
) {
    refuser(404, 'fichier statique reclame en profondeur — balise <base> probablement absente.');
}

// --- Repli SPA : index.php, qui insere la balise <base> --------------------
// SCRIPT_NAME porte le prefixe de deploiement : c'est la seule information
// dont index.php a besoin pour calculer sa balise <base>.
$_SERVER['SCRIPT_NAME'] = $prefixe . '/index.php';
require $racine . '/index.php';
