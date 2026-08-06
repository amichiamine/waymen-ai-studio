<?php

/**
 * Point d'entrée HTML du site — vingt lignes utiles qui rendent le dossier
 * de build renommable et déplaçable.
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
 * `api/src/Requete.php` pour retirer son propre préfixe. Rien n'est écrit en
 * dur, ni d'un côté ni de l'autre.
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
 * Deux voies sont possibles pour les rendre portables :
 *
 *  a) Variable d'environnement VITE_SITE_URL au moment du build.
 *     Avantage : simple. Inconvénient : fige le domaine dans le livrable ;
 *     le commerçant qui reçoit un dist/ tout fait ne peut plus rien changer
 *     sans reconstruire — c'est exactement le problème que ce projet évite.
 *
 *  b) Réécriture à l'exécution par PHP (approche retenue).
 *     Ce fichier connaît déjà le protocole (HTTPS ou non, via
 *     $_SERVER['HTTPS'] et X-Forwarded-Proto) et le chemin. Il suffit
 *     d'ajouter la lecture de HTTP_HOST pour obtenir l'origine complète.
 *
 * Sécurité de HTTP_HOST : l'en-tête vient du navigateur, pas du serveur.
 * Mais nous ne le stockons pas, n'y faisons aucune décision de sécurité,
 * et nous le reflètons uniquement dans les balises meta de la page HTML
 * (non dans un cookie, non dans une session). C'est exactement l'usage
 * décrit dans les recommandations OWASP pour les URL canoniques.
 * Le format est validé par un masque strict avant utilisation.
 *
 * Repli propre : si index.html est servi directement (sans PHP, sans Host),
 * les URL de repli « https://katech.dz/… » restent en place — c'est le
 * domaine de production réel, donc les vignettes fonctionnent quand même.
 */

declare(strict_types=1);

$fichier = __DIR__ . '/index.html';

// -----------------------------------------------------------------------
// Origine calculée à l'exécution — sert à réécrire les URL absolues OG/LD
// -----------------------------------------------------------------------

/**
 * Vrai si la requête courante arrive en HTTPS.
 *
 * Copie fidèle de la logique de api/src/Auth/Session.php::estHttps() :
 * le projet a une position documentée sur ce sujet — ne pas diverger.
 * X-Forwarded-Proto est pris en compte car, derrière le proxy d'un
 * hébergeur mutualisé, $_SERVER['HTTPS'] est vide alors que le visiteur
 * est bien en HTTPS.
 */
function katech_est_https(): bool
{
    $https = (string) ($_SERVER['HTTPS'] ?? '');
    if ($https !== '' && strtolower($https) !== 'off') {
        return true;
    }

    if ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443) {
        return true;
    }

    $transmis = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));

    return str_contains($transmis, 'https');
}

/**
 * Hôte HTTP validé, ou null si absent ou invalide.
 *
 * HTTP_HOST est fourni par le navigateur. On ne l'utilise que pour construire
 * une URL de partage (balises OG/JSON-LD) — jamais pour une décision de
 * sécurité, jamais dans un cookie. On valide son format pour rejeter toute
 * valeur malformée avant de l'injecter dans le HTML.
 *
 * Format accepté : lettres, chiffres, tirets, points, deux-points (port
 * optionnel), entre 1 et 253 caractères. Les crochets IPv6 sont aussi tolérés.
 */
function katech_hote_valide(): ?string
{
    $hote = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($hote === '') {
        return null;
    }

    // Longueur maximale d'un nom d'hôte + port
    if (strlen($hote) > 253) {
        return null;
    }

    // Format strict : hôte DNS avec port optionnel, ou adresse IPv6 entre crochets
    if (!preg_match('/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(:\d{1,5})?$/', $hote)
        && !preg_match('/^\[[\da-fA-F:]+\](:\d{1,5})?$/', $hote)) {
        return null;
    }

    return $hote;
}

/**
 * Origine complète déduite de la requête, ex. « https://katech.dz » ou
 * « http://localhost:8080 ».
 *
 * Si HTTP_HOST est absent ou invalide, on retourne null : les URL de repli
 * codées dans index.html (« https://katech.dz/… ») seront conservées telles
 * quelles, ce qui est correct sur le domaine de production.
 */
function katech_origine(): ?string
{
    $hote = katech_hote_valide();
    if ($hote === null) {
        return null;
    }

    return (katech_est_https() ? 'https' : 'http') . '://' . $hote;
}

// Échec visible plutôt que silencieux : sans index.html il n'y a pas de site,
// et une page blanche n'expliquerait rien. Le cas se produit pour de bon —
// voir docs/DEPLOIEMENT.md, « Après le build » : des clients FTP sautent des
// fichiers.
if (!is_file($fichier)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "index.html est absent a cote de index.php : le televersement est incomplet.\n";

    exit;
}

// Dossier qui contient ce script, vu depuis le web : « / » à la racine du
// domaine, « /boutique/ » dans un sous-dossier, quel que soit son nom.
$base = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php')));
$base = rtrim($base, '/') . '/';

$html = (string) file_get_contents($fichier);

// -----------------------------------------------------------------------
// Réécriture des URL absolues OG/JSON-LD selon le domaine réel de la requête.
//
// index.html contient des URL figées sur « https://katech.dz » dans :
//   - og:url, og:image
//   - twitter:image
//   - le bloc JSON-LD (clés "url" et "logo")
//
// Ces balises DOIVENT être absolues (Facebook, WhatsApp, robots SEO les
// récupèrent depuis leurs propres serveurs). Elles doivent aussi pointer
// vers le bon domaine, y compris sur un hébergement de recette ou après un
// déplacement du site.
//
// On remplace « https://katech.dz » (la valeur de repli dans index.html) par
// l'origine calculée à la requête. Si l'hôte est absent ou invalide, la
// valeur de repli reste en place — correcte sur le domaine de production.
//
// On remplace ensuite « https://katech.dz/ » (URL racine codée dans og:url et
// le JSON-LD) par l'URL racine réelle de CE déploiement — qui peut être en
// sous-dossier. Cela garantit que l'URL partagée sur WhatsApp correspond à
// l'adresse réellement accessible, même si le site tourne dans
// public_html/boutique/.
// -----------------------------------------------------------------------
$origine = katech_origine();
if ($origine !== null) {
    // Étape 1 : adapter l'origine (protocole + hôte)
    if ($origine !== 'https://katech.dz') {
        $html = str_replace('https://katech.dz', $origine, $html);
    }

    // Étape 2 : si le site tourne en sous-dossier, corriger og:url et l'URL
    // du JSON-LD qui pointent sur la racine (ex. "https://katech.dz/") vers
    // la racine réelle de l'application (ex. "https://katech.dz/boutique/").
    // On ne modifie que "origin/" pour éviter de toucher og:image.
    if ($base !== '/') {
        $html = str_replace($origine . '/', $origine . $base, $html);
    }
}

// Insertion juste après <head> : la balise doit précéder TOUTE URL relative du
// document, sinon celles qui la précèdent seraient résolues autrement.
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
    echo "index.html ne contient pas de <head> : impossible d'y poser la balise <base>.\n";

    exit;
}

header('Content-Type: text/html; charset=UTF-8');
// Même règle que pour index.html : le document d'amorçage désigne les
// empreintes du jour ; le mettre en cache rendrait tout déploiement invisible
// pour les visiteurs déjà venus.
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

echo $html;
