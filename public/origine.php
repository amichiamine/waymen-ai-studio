<?php

/**
 * Origine et base web déduites de la requête — le seul endroit du livrable
 * qui sache dire « sur quel domaine et dans quel dossier tourne ce site ».
 *
 * =====================================================================
 * POURQUOI CE FICHIER EXISTE
 * =====================================================================
 * `public/index.php` portait cette logique pour son seul usage : réécrire les
 * URL absolues d'`index.html` (og:url, og:image, JSON-LD) avec l'origine réelle
 * de la requête, afin qu'un `dist/` déposé sur n'importe quel domaine annonce
 * SON domaine et pas celui du build.
 *
 * Trois autres documents du livrable portent des URL absolues et avaient été
 * oubliés :
 *
 *   - `sitemap.xml` — 27 URL absolues. Le protocole des sitemaps EXIGE des URL
 *     absolues (sitemaps.org) : on ne peut pas les rendre relatives. Servi en
 *     statique, il annonçait à Google les URL du domaine de build.
 *   - `robots.txt` — la directive `Sitemap:` est elle aussi absolue par
 *     protocole.
 *   - les pages prérendues (`<route>/index.html`) — elles portent un
 *     `<link rel="canonical">`, et ne passaient PAS par `index.php`.
 *
 * Une URL canonique figée sur le domaine du build est le pire défaut de
 * référencement possible : elle demande à Google d'indexer le site de
 * quelqu'un d'autre. Les trois documents ont donc besoin de la même déduction
 * d'origine — d'où l'extraction ici, plutôt que quatre copies dont trois
 * finiraient par diverger.
 *
 * =====================================================================
 * SÉCURITÉ DE HTTP_HOST — LA VALIDATION EST ICI, ET NULLE PART AILLEURS
 * =====================================================================
 * `HTTP_HOST` vient du navigateur, pas du serveur. Nous ne le stockons pas,
 * n'y prenons aucune décision de sécurité, et ne le reflétons que dans des
 * URL de document (balises meta, sitemap, robots) — jamais dans un cookie ni
 * une session. C'est exactement l'usage décrit par les recommandations OWASP
 * pour les URL canoniques. Le format est validé par un masque strict avant
 * toute utilisation, et un hôte invalide fait retomber le livrable sur ses
 * valeurs de repli au lieu d'injecter une valeur douteuse dans le document.
 *
 * Ce masque ne doit exister qu'ici. Un appelant qui reconstruirait « à peu
 * près » la même validation est un appelant qui l'affaiblira.
 *
 * =====================================================================
 * CE FICHIER N'EST PAS UNE PAGE
 * =====================================================================
 * Il ne définit que des fonctions et n'émet rien. `public/.htaccess` refuse
 * son accès direct (403) — non parce qu'il serait dangereux, mais parce qu'une
 * URL qui répond 200 sans contenu est une URL qu'un robot indexera.
 */

declare(strict_types=1);

/**
 * Origine écrite en dur dans les documents produits au build, quand
 * `SITE_URL` n'est pas renseignée.
 *
 * C'est une valeur de REPLI, pas une configuration : `katech_reecrire_domaine()`
 * la remplace à chaque requête par l'origine réelle. Elle ne sert que si PHP
 * ne tourne pas du tout (dossier servi en statique pur), cas où il vaut mieux
 * un domaine réel qu'un jeton laissé à nu dans le HTML.
 *
 * ATTENTION — cette chaîne est LITTÉRALEMENT celle qu'écrivent `index.html`,
 * `public/robots.txt`, `scripts/generate-sitemap.ts` et `scripts/prerendu.ts`.
 * La changer ici sans la changer là-bas rend la réécriture inopérante en
 * silence : rien ne casse, tout devient faux. Les quatre valeurs se répondent.
 */
const KATECH_ORIGINE_REPLI = 'https://katech.dz';

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
 * Format accepté : lettres, chiffres, tirets, points, deux-points (port
 * optionnel), entre 1 et 253 caractères. Les crochets IPv6 sont aussi tolérés.
 * Tout le reste — espace, guillemet, chevron, virgule de plusieurs en-têtes
 * concaténés — est refusé, ce qui interdit l'injection d'attribut ou de balise
 * par l'en-tête Host.
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
 * codées dans les documents du build seront conservées telles quelles.
 */
function katech_origine(): ?string
{
    $hote = katech_hote_valide();
    if ($hote === null) {
        return null;
    }

    return (katech_est_https() ? 'https' : 'http') . '://' . $hote;
}

/**
 * Dossier qui contient le script courant, vu depuis le web, barre finale
 * comprise : « / » à la racine du domaine, « /boutique/ » dans un sous-dossier,
 * quel que soit son nom.
 *
 * Déduit de `SCRIPT_NAME`, exactement comme le fait `api/src/Requete.php` pour
 * retirer son propre préfixe. Rien n'est écrit en dur, ni d'un côté ni de
 * l'autre : c'est ce qui rend le dossier de build renommable et déplaçable.
 */
function katech_base_web(): string
{
    $base = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php')));

    return rtrim($base, '/') . '/';
}

/**
 * Remplace l'origine de repli des documents du build par l'origine RÉELLE de
 * la requête, et corrige la racine si le site tourne en sous-dossier.
 *
 * Fonction unique appelée par `index.php` (HTML d'amorçage et pages
 * prérendues), `sitemap.php` et `robots.php` : le même contenu, la même
 * réécriture, la même validation d'hôte. C'est ce qui permet au MÊME paquet
 * d'être déposé sur deux domaines différents et de servir les bonnes URL
 * absolues sur chacun, sans reconstruction.
 *
 * Deux étapes, dans cet ordre :
 *
 *  1. l'origine (protocole + hôte) devient celle de la requête ;
 *  2. si le site tourne en sous-dossier, la RACINE annoncée devient celle de
 *     l'application. `https://hote/product/x` doit devenir
 *     `https://hote/ma-boutique/product/x`, sinon la canonique désigne une URL
 *     qui n'existe pas.
 *
 * L'étape 2 est une expression rationnelle et non un `str_replace` : il faut
 * attraper l'origine suivie d'une barre (`…/product/x`) MAIS AUSSI l'origine
 * nue en fin d'URL (`href="https://hote"`, que produit
 * `window.location.origin` dans src/pages/Index.tsx). Sans ce second cas, la
 * canonique de l'accueil restait `https://hote` là où le site vit dans
 * `https://hote/ma-boutique/`. La barre consommée est réécrite par `$base`,
 * qui en porte déjà une.
 *
 * Si l'hôte est absent ou invalide, le contenu est rendu inchangé : les valeurs
 * de repli du build restent en place, ce qui est correct sur le domaine de
 * production et jamais dangereux ailleurs.
 */
function katech_reecrire_domaine(string $contenu, string $base): string
{
    $origine = katech_origine();
    if ($origine === null) {
        return $contenu;
    }

    // Étape 1 : adapter l'origine (protocole + hôte)
    if ($origine !== KATECH_ORIGINE_REPLI) {
        $contenu = str_replace(KATECH_ORIGINE_REPLI, $origine, $contenu);
    }

    // Étape 2 : déploiement en sous-dossier — la racine annoncée est celle de
    // l'application, pas celle du domaine.
    if ($base !== '/') {
        $contenu = (string) preg_replace(
            '#' . preg_quote($origine, '#') . '(?:/|(?=["\'<\s]|$))#',
            $origine . $base,
            $contenu,
        );
    }

    return $contenu;
}

/**
 * En-têtes de cache des documents non empreintés servis par PHP.
 *
 * `public/.htaccess` §4 pose ces valeurs par `<FilesMatch>` sur les NOMS de
 * fichiers (`sitemap.xml`, `robots.txt`). Servis par `sitemap.php` et
 * `robots.php`, ces documents n'ont plus le nom attendu par le motif : sans
 * cette fonction, ils perdraient silencieusement leur politique de cache.
 * Mêmes valeurs, une seule source.
 */
function katech_cache_court(): void
{
    header('Cache-Control: public, max-age=3600, must-revalidate');
}
