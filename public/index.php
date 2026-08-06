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
 */

declare(strict_types=1);

$fichier = __DIR__ . '/index.html';

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
