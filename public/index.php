<?php

/**
 * Point d'entrée HTML du site — les lignes utiles qui rendent le dossier
 * de build renommable, déplaçable, ET déposable sur n'importe quel domaine.
 *
 * =====================================================================
 * LE PROBLÈME QU'IL RÉSOUT
 * =====================================================================
 * `bun run build` produit un `dist/` dont on veut pouvoir changer le nom et
 * qu'on veut pouvoir déposer n'importe où (`public_html/`,
 * `public_html/boutique/`, `public_html/v2/`…) sans reconstruire ni éditer
 * un fichier à la main.
 *
 * Vite est configuré en base relative (`base: "./"`, cf. `vite.config.ts`) :
 * index.html référence `./assets/index-XXXX.js` au lieu de `/assets/…`. Cela
 * suffit tant que le document est servi depuis la racine de l'application.
 *
 * Cela NE suffit PAS quand un visiteur ouvre ou rafraîchit une route profonde.
 * Le repli SPA sert alors le document à l'URL /boutique/product/xyz, et le
 * navigateur résout `./assets/…` contre l'URL du DOCUMENT :
 * /boutique/product/assets/index-XXXX.js — qui n'existe pas.
 *
 * =====================================================================
 * POURQUOI PHP, ET PAS UNE RÈGLE .HTACCESS
 * =====================================================================
 * Deux contournements ont été écrits, déployés et parcourus dans un vrai
 * navigateur avant d'être écartés :
 *
 *  1. Réécriture INTERNE des demandes profondes vers `assets/`. Les fichiers
 *     sont bien servis, mais l'application reste incapable de savoir sous
 *     quel dossier elle tourne : vu du navigateur, rien ne distingue le
 *     dossier de déploiement des premiers segments de la route. Le routeur
 *     et l'API n'ont alors aucune base fiable — le symptôme se déplace, il
 *     ne disparaît pas.
 *
 *  2. REDIRECTION (302) des demandes profondes vers leur forme canonique.
 *     L'URL du module devient exacte… et l'application casse. Le navigateur
 *     enregistre le module d'entrée sous l'URL DEMANDÉE
 *     (/boutique/product/assets/index-XXXX.js), alors que les imports de ce
 *     module se résolvent contre son URL de RÉPONSE
 *     (/boutique/assets/index-XXXX.js). Les deux clés diffèrent : le chunk
 *     d'entrée est téléchargé et ÉVALUÉ DEUX FOIS. Il en résulte deux
 *     instances de chaque contexte React et des pannes du type
 *     « useI18n must be used inside I18nProvider », sur les seules routes à
 *     deux segments. Ni le typage, ni le lint, ni le build ne le voient, et
 *     l'accueil continue de s'afficher parfaitement.
 *
 * Conclusion : seul le serveur connaît le dossier de déploiement, il doit
 * donc le DIRE, et la seule façon portable de le dire à un document HTML est
 * la balise `<base>`. Un HTML statique ne peut pas la calculer ; PHP, si —
 * et PHP est déjà une exigence dure du projet, puisque l'API en est faite.
 *
 * Le chemin est déduit de `SCRIPT_NAME`, exactement comme le fait déjà
 * `api/src/Requete.php` pour retirer son propre préfixe (voir
 * `katech_base_web()` dans `public/origine.php`). Rien n'est écrit en dur,
 * ni d'un côté ni de l'autre.
 *
 * =====================================================================
 * BALISES OG ET JSON-LD — DOMAINE DÉDUIT À L'EXÉCUTION
 * =====================================================================
 * og:image, og:url, twitter:image et le bloc JSON-LD contiennent dans
 * index.html des URL absolues figées sur « https://katech.dz ». Cette valeur
 * de repli est correcte en production sur ce domaine, mais elle est fausse
 * sur tout autre hébergement (recette, sous-domaine, client white-label…).
 *
 * Ces balises DOIVENT être absolues — Facebook, WhatsApp et les robots SEO
 * récupèrent la page depuis leurs propres serveurs ; un chemin relatif ne
 * produit aucune vignette.
 *
 * Deux voies étaient possibles pour les rendre portables :
 *
 *  a) Variable d'environnement SITE_URL au moment du build.
 *     Avantage : simple. Inconvénient : fige le domaine dans le livrable ;
 *     le commerçant qui reçoit un dist/ tout fait ne peut plus rien changer
 *     sans reconstruire — c'est exactement le problème que ce projet évite.
 *     Cette voie reste DISPONIBLE pour qui veut délibérément figer un
 *     domaine, mais elle n'est plus NÉCESSAIRE.
 *
 *  b) Réécriture à l'exécution par PHP (approche retenue).
 *     La déduction d'origine et la réécriture vivent dans
 *     `public/origine.php`, partagées avec `sitemap.php` et `robots.php` :
 *     la validation de HTTP_HOST n'existe qu'à un seul endroit.
 *
 * Repli propre : si un HTML est servi directement (sans PHP, sans Host), les
 * URL de repli « https://katech.dz/… » restent en place — c'est un domaine
 * réel, donc les vignettes fonctionnent quand même.
 *
 * =====================================================================
 * LES PAGES PRÉRENDUES PASSENT PAR ICI, ELLES AUSSI
 * =====================================================================
 * `scripts/prerendu.ts` écrit au build le HTML rendu de chaque URL du sitemap
 * dans `dist/<route>/index.html`. Ces fichiers portent ce qu'aucune autre page
 * ne porte : un `<link rel="canonical">`, et des `og:url` propres à la route.
 *
 * Servis en STATIQUE par Apache — ce qu'ils étaient — ils annonçaient à Google
 * la canonique du domaine de BUILD. Un même paquet déposé sur deux domaines
 * demandait donc à Google d'indexer le premier depuis le second : le pire
 * défaut de référencement possible, et une raison de reconstruire le paquet
 * pour chaque domaine.
 *
 * Ils sont donc servis PAR CE FICHIER (voir `public/.htaccess`, §1 « Pages
 * prérendues »), qui leur applique exactement le traitement de l'accueil :
 * réécriture du domaine, puis balise `<base>` calculée. Deux propriétés en
 * découlent, et sont le motif du choix :
 *
 *  - ZÉRO DUPLICATION : une seule réécriture, une seule validation d'hôte.
 *    L'alternative — faire écrire au prérendu une forme « neutre » que PHP
 *    substituerait — exigeait un jeton dans le fichier, et ce jeton serait
 *    parti tel quel vers Google le jour où PHP ne tourne pas.
 *  - LE FICHIER RESTE VALIDE SEUL : `<route>/index.html` demeure un document
 *    complet, avec son `<base>` relatif et ses URL de repli. Servi en statique
 *    pur, il s'affiche et se référence encore — sur le domaine de repli.
 *
 * La balise `<base>` relative écrite par le prérendu (`../` pour
 * /product/xyz) est retirée et remplacée par la base ABSOLUE de ce
 * déploiement. Les deux sont justes ; l'absolue l'est indépendamment de la
 * forme d'URL servie, ce qui retire une hypothèse au lieu d'en ajouter une.
 */

declare(strict_types=1);

require_once __DIR__ . '/origine.php';

/**
 * Chemin du fichier prérendu correspondant à l'URL demandée, ou null s'il n'y
 * en a pas — auquel cas c'est le document d'amorçage de la SPA qui est servi.
 *
 * `public/.htaccess` ne réécrit vers ce script que si `<route>/index.html`
 * existe, mais cette fonction ne s'appuie PAS sur cette garantie : le chemin
 * vient de l'URL, donc du visiteur. Trois barrières, et c'est volontairement
 * redondant — la même règle que les trois barrières de `api/.htaccess` :
 *
 *   1. chaque segment doit correspondre à `[A-Za-z0-9._-]+` : ni barre
 *      oblique inversée, ni octet nul, ni « .. », ni chemin absolu ;
 *   2. « . » et « .. » sont refusés nommément ;
 *   3. `realpath()` doit rester SOUS le dossier de ce script.
 *
 * Sans cela, ce fichier serait une primitive de lecture arbitraire dès qu'un
 * hébergeur servirait `index.php` sans passer par les règles de réécriture.
 */
function katech_document_prerendu(string $racine, string $base): ?string
{
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    $chemin = rawurldecode((string) (parse_url($uri, PHP_URL_PATH) ?: '/'));

    // Retirer le préfixe de déploiement : « /ma-boutique/product/x » vue de la
    // racine du domaine est « /product/x » vue de l'application.
    $prefixe = rtrim($base, '/');
    if ($prefixe !== '' && str_starts_with($chemin, $prefixe)) {
        $chemin = substr($chemin, strlen($prefixe));
    }

    $relatif = trim($chemin, '/');
    if ($relatif === '') {
        return null;
    }

    foreach (explode('/', $relatif) as $segment) {
        if ($segment === '' || $segment === '.' || $segment === '..') {
            return null;
        }
        if (preg_match('/^[A-Za-z0-9._-]+$/', $segment) !== 1) {
            return null;
        }
    }

    $reel = realpath($racine . '/' . $relatif . '/index.html');
    $racineReelle = realpath($racine);
    if ($reel === false || $racineReelle === false) {
        return null;
    }
    if (!str_starts_with($reel, $racineReelle . DIRECTORY_SEPARATOR)) {
        return null;
    }

    return $reel;
}

// Échec visible plutôt que silencieux : sans index.html il n'y a pas de site,
// et une page blanche n'expliquerait rien. Le cas se produit pour de bon —
// voir docs/DEPLOIEMENT.md, « Après le build » : des clients FTP sautent des
// fichiers.
$amorce = __DIR__ . '/index.html';
if (!is_file($amorce)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "index.html est absent a cote de index.php : le televersement est incomplet.\n";

    exit;
}

// Dossier qui contient ce script, vu depuis le web : « / » à la racine du
// domaine, « /boutique/ » dans un sous-dossier, quel que soit son nom.
$base = katech_base_web();

// Page prérendue si l'URL en désigne une, document d'amorçage sinon.
$fichier = katech_document_prerendu(__DIR__, $base) ?? $amorce;

$html = (string) file_get_contents($fichier);

// -----------------------------------------------------------------------
// Réécriture des URL absolues selon le domaine réel de la requête.
//
// Les documents du build portent des URL figées sur « https://katech.dz » :
//   - index.html          : og:url, og:image, twitter:image, bloc JSON-LD
//   - <route>/index.html  : en plus, <link rel="canonical"> et og:url de la
//                           route — les balises qui pilotent l'indexation
//
// Ces URL DOIVENT être absolues (Facebook, WhatsApp, robots SEO les
// récupèrent depuis leurs propres serveurs). Elles doivent aussi pointer vers
// le bon domaine ET le bon sous-dossier, y compris sur un hébergement de
// recette ou après un déplacement du site.
//
// Tout est fait par `katech_reecrire_domaine()` (public/origine.php), qui sert
// aussi `sitemap.php` et `robots.php` : une seule réécriture, une seule
// validation de HTTP_HOST. Si l'hôte est absent ou invalide, les valeurs de
// repli restent en place.
// -----------------------------------------------------------------------
$html = katech_reecrire_domaine($html, $base);

// -----------------------------------------------------------------------
// Balise <base> — calculée, absolue, et unique.
//
// On retire d'abord celle qu'une page prérendue porte déjà (`../`, relative à
// la profondeur de la route) : deux balises `<base>` dans un document sont une
// invitation à ce qu'un navigateur retienne la mauvaise. La valeur absolue
// posée ici est juste quelle que soit la forme d'URL servie.
//
// Insertion juste après <head> : la balise doit précéder TOUTE URL relative du
// document, sinon celles qui la précèdent seraient résolues autrement.
// -----------------------------------------------------------------------
$html = (string) preg_replace('#\n?\s*<base\s[^>]*>#i', '', $html, 1);

$remplacements = 0;
$html = preg_replace(
    '#<head(\s[^>]*)?>#i',
    '$0' . "\n    <base href=\"" . htmlspecialchars($base, ENT_QUOTES, 'UTF-8') . "\" />",
    $html,
    1,
    $remplacements,
);

// <head> introuvable : on refuse de servir un document silencieusement faux,
// qui n'échouerait qu'une fois chez le visiteur, sur une route profonde.
if ($html === null || $remplacements !== 1) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Le document HTML ne contient pas de <head> : impossible d'y poser la balise <base>.\n";

    exit;
}

// -----------------------------------------------------------------------
// Bootstrapping White-Label & Éradication du FOUC (0 ms)
//
// Injection de `window.__SITE_SETTINGS_BOOTSTRAP__` depuis la base de données
// pour que le navigateur et React disposent immédiatement des réglages réels
// (nom du magasin, logo, etc.) sans attendre l'appel réseau GET /settings/site.
// -----------------------------------------------------------------------
$settingsBootstrap = null;
try {
    $bootstrapFichier = dirname(__DIR__) . '/api/src/bootstrap.php';
    if (is_file($bootstrapFichier)) {
        require_once $bootstrapFichier;
        if (class_exists('\\KaTech\\Db')) {
            $db = \KaTech\Db::instance();
            $ligne = $db->un("SELECT payload FROM settings WHERE scope = 'site'");
            if ($ligne !== null && !empty($ligne['payload'])) {
                $payload = \KaTech\Db::dejson($ligne['payload'], null);
                if (is_array($payload)) {
                    $settingsBootstrap = $payload;
                }
            }
        }
    }
} catch (\Throwable $e) {
    // Repli de secours : scan direct katech-data en environnement de dev local
    try {
        $dossierDev = dirname(__DIR__) . '/katech-data';
        if (is_dir($dossierDev)) {
            $fichiers = glob($dossierDev . '/dev-*.sqlite');
            if (!empty($fichiers)) {
                usort($fichiers, fn($a, $b) => filemtime($b) <=> filemtime($a));
                $pdo = new PDO('sqlite:' . $fichiers[0]);
                $stmt = $pdo->query("SELECT payload FROM settings WHERE scope = 'site'");
                $row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : null;
                if ($row && !empty($row['payload'])) {
                    $payload = json_decode($row['payload'], true);
                    if (is_array($payload)) {
                        $settingsBootstrap = $payload;
                    }
                }
            }
        }
    } catch (\Throwable $e2) {
        // Dégradation gracieuse absolue
    }
}

if ($settingsBootstrap !== null) {
    $jsonBootstrap = json_encode(
        $settingsBootstrap,
        JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP
    );
    if ($jsonBootstrap !== false) {
        $injection = "\n    <script>window.__SITE_SETTINGS_BOOTSTRAP__ = " . $jsonBootstrap . ";</script>";
        $html = (string) preg_replace('#<head(\s[^>]*)?>#i', '$0' . $injection, $html, 1);
    }
    if (!empty($settingsBootstrap['storeName']) && is_string($settingsBootstrap['storeName'])) {
        $nomMagasin = htmlspecialchars($settingsBootstrap['storeName'], ENT_QUOTES, 'UTF-8');
        $html = (string) preg_replace('#<title>.*?</title>#i', "<title>{$nomMagasin} — La puissance tech entre vos mains</title>", $html, 1);
    }
}

header('Content-Type: text/html; charset=UTF-8');
// Même règle que pour index.html : le document d'amorçage désigne les
// empreintes du jour ; le mettre en cache rendrait tout déploiement invisible
// pour les visiteurs déjà venus. Une page prérendue référence les mêmes
// empreintes — même politique, pour la même raison.
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

echo $html;
