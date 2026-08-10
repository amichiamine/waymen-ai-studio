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
 *
 * `api/` EST EXCLU, et ce n'est pas un détail. Depuis que `scripts/paqueter.ts`
 * embarque l'API dans le paquet, `api/index.php` existe dans l'extraction : le
 * détecteur y voyait une « racine d'application » et prenait `/api` pour un
 * préfixe de déploiement. `/api/health` devenait alors le chemin `health`,
 * échappait à la règle « l'API d'abord » et finissait servi par le repli SPA —
 * qui, par chance, était ici l'API elle-même. La propriété que ce fichier
 * existe pour vérifier — le repli SPA ne répond JAMAIS sous /api — n'était donc
 * plus vérifiée du tout, elle était contournée. En production, `api/` n'est pas
 * une racine d'application : c'est un dossier avec son propre `.htaccess`, et
 * le `.htaccess` racine le laisse passer sans y toucher.
 */
$prefixe = '';
$segments = array_values(array_filter(explode('/', trim($chemin, '/')), 'strlen'));
$essai = '';
foreach ($segments as $segment) {
    if ($segment === 'api') {
        break;
    }
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
// En production la requête poursuit vers public_html/api/.htaccess, qui fait
// son propre routage. Ici, deux cas — et dans les DEUX, le repli SPA ne répond
// jamais du HTML sous /api, ce qui est précisément la propriété à vérifier :
//
//   • SERVIR_API_URL renseignée : la requête est mandatée vers une API PHP déjà
//     lancée, ce qui permet de vérifier /api/health sur l'extraction servie ;
//   • sinon : 404 en texte brut.
if ($relatif === 'api' || str_starts_with($relatif, 'api/')) {
    $amont = rtrim((string) (getenv('SERVIR_API_URL') ?: ''), '/');
    if ($amont === '') {
        refuser(404, 'aucune API mandatee — mais surtout : le repli SPA ne repond pas ici.');
    }

    // Mandat FIDÈLE, et pas seulement « ça répond ». Une première version ne
    // transmettait que l'URL : méthode perdue (tout partait en GET, d'où des 405
    // sur les routes POST) et cookies perdus (donc aucune session — 20 écrans
    // d'administration renvoyés vers /auth). Un mandat qui perd la session ne
    // vérifie pas le produit, il vérifie le mandat.
    $chaine = (string) (parse_url($uri, PHP_URL_QUERY) ?? '');
    $requete = $amont
        . preg_replace('#^/?api#', '', $relatif === 'api' ? '/api' : '/' . $relatif)
        . ($chaine === '' ? '' : '?' . $chaine);

    // En-têtes NON transmis, et chacun pour une raison mesurée :
    //   • Host             : l'amont a le sien ;
    //   • Accept-Encoding  : sans cela l'amont répond en gzip, et ce mandat
    //     relaie les octets comprimés SANS le Content-Encoding qui les décrit.
    //     Le navigateur reçoit alors du gzip étiqueté JSON : le décodage échoue,
    //     et la connexion « échoue » sans qu'aucune erreur ne l'explique. C'est
    //     exactement ce qui faisait retomber 25 écrans d'administration sur
    //     /auth alors que la même requête en curl passait — curl n'annonce pas
    //     gzip par défaut ;
    //   • Connection / Content-Length / Transfer-Encoding : propres au saut
    //     réseau, recalculés par le client HTTP de PHP.
    $exclus = ['HTTP_HOST', 'HTTP_ACCEPT_ENCODING', 'HTTP_CONNECTION', 'HTTP_CONTENT_LENGTH', 'HTTP_TRANSFER_ENCODING'];
    $entetes = [];
    foreach ($_SERVER as $cle => $valeur) {
        if (str_starts_with((string) $cle, 'HTTP_') && !in_array($cle, $exclus, true)) {
            $nom = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr((string) $cle, 5)))));
            $entetes[] = "$nom: $valeur";
        }
    }
    $entetes[] = 'Accept-Encoding: identity';
    if (($_SERVER['CONTENT_TYPE'] ?? '') !== '') {
        $entetes[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
    }

    $entrant = (string) file_get_contents('php://input');
    $contexte = stream_context_create(['http' => [
        'method' => (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'),
        'header' => implode("\r\n", $entetes),
        'content' => $entrant,
        'ignore_errors' => true,
        'follow_location' => 0,
        'timeout' => 20,
    ]]);

    $corps = @file_get_contents($requete, false, $contexte);
    if ($corps === false) {
        refuser(502, 'API mandatee injoignable — le repli SPA ne repond pas ici pour autant.');
    }

    // Set-Cookie doit être RÉPÉTÉ, pas écrasé : c'est lui qui porte la session.
    foreach ($http_response_header ?? [] as $entete) {
        if (preg_match('#^HTTP/#i', $entete) === 1) {
            header($entete);
        } elseif (preg_match('#^(Content-Type|Location|WWW-Authenticate):#i', $entete) === 1) {
            header($entete);
        } elseif (preg_match('#^Set-Cookie:#i', $entete) === 1) {
            header($entete, false);
        }
    }
    echo $corps;

    exit;
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

// --- origine.php n'est pas une page ---------------------------------------
if ($relatif === 'origine.php') {
    refuser(403, 'bibliotheque partagee, pas une page');
}

// --- sitemap.xml et robots.txt : produits a l'execution -------------------
// Leurs URL sont absolues PAR PROTOCOLE : elles doivent porter le domaine reel
// de la requete, donc passer par PHP. Le fichier statique voisin reste le repli.
// Avant la regle « fichiers reels » : sinon sitemap.xml, qui existe, gagnerait.
foreach (['sitemap.xml' => 'sitemap.php', 'robots.txt' => 'robots.php'] as $demande => $script) {
    if ($relatif === $demande && is_file($racine . '/' . $script)) {
        $_SERVER['SCRIPT_NAME'] = $prefixe . '/' . $script;
        require $racine . '/' . $script;

        exit;
    }
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

// --- Pages prerendues (b) : service par index.php, PAS en statique --------
// index.php retrouve la page voulue par REQUEST_URI, reecrit le domaine avec
// l'origine reelle et pose la balise <base> calculee. Servir le .html tel quel
// figerait la canonique sur le domaine du build (voir public/.htaccess §1).
if ($relatif !== '' && is_file(rtrim($fichier, '/') . '/index.html')) {
    $_SERVER['SCRIPT_NAME'] = $prefixe . '/index.php';
    require $racine . '/index.php';

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
