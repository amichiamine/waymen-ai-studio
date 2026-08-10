<?php

/**
 * robots.txt servi à l'exécution, avec le domaine réel de la requête.
 *
 * =====================================================================
 * POURQUOI CE FICHIER EXISTE
 * =====================================================================
 * `robots.txt` porte deux sortes de chemins, et les deux étaient faux hors du
 * domaine de build :
 *
 *  1. la directive `Sitemap:`, ABSOLUE par protocole (robotstxt.org) — elle
 *     annonçait `https://katech.dz/sitemap.xml` depuis n'importe quel
 *     hébergement, envoyant les robots chez un tiers ;
 *  2. les directives `Allow:` et `Disallow:`, dont les chemins sont relatifs à
 *     la RACINE DU DOMAINE et non à l'application. Déployé dans
 *     `public_html/ma-boutique/`, `Disallow: /admin` ne protège pas
 *     `/ma-boutique/admin` : il parle d'un `/admin` qui n'existe pas.
 *
 * Ce script lit `robots.txt` à côté de lui et corrige les deux, avec l'origine
 * et la base déduites de la requête. Il ne réénumère aucune règle : le fichier
 * statique reste la source, et reste le repli si PHP ne tourne pas — exactement
 * le rapport qu'entretiennent `index.php` et `index.html`.
 *
 * =====================================================================
 * CE QU'IL NE PEUT PAS RÉPARER
 * =====================================================================
 * Les robots ne lisent le `robots.txt` QUE à la racine de l'hôte. Dans un
 * déploiement en sous-dossier, `https://hote/ma-boutique/robots.txt` n'est
 * jamais consulté, quoi qu'il contienne — c'est une propriété du protocole,
 * pas un défaut d'ici. Les chemins sont néanmoins corrigés : le fichier reste
 * juste pour qui le lit (audit, copie manuelle vers la racine de l'hôte), et
 * un document exact ne coûte rien de plus qu'un document trompeur.
 */

declare(strict_types=1);

require_once __DIR__ . '/origine.php';

$fichier = __DIR__ . '/robots.txt';

// Échec visible plutôt que silencieux, mais JAMAIS bloquant : un robots.txt
// illisible se traite comme un robots.txt permissif (c'est la convention des
// robots). On sert donc la règle la plus sûre possible plutôt qu'une erreur.
if (!is_file($fichier)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "# robots.txt est absent a cote de robots.php : televersement incomplet.\n";
    echo "User-agent: *\nAllow: /\n";

    exit;
}

$base = katech_base_web();
$texte = (string) file_get_contents($fichier);

// Étape 1 : l'URL absolue de la directive `Sitemap:` — même réécriture que les
// balises OG et le sitemap lui-même, donc même validation de HTTP_HOST.
$texte = katech_reecrire_domaine($texte, $base);

// Étape 2 : les chemins d'`Allow:` et `Disallow:` sont relatifs à la racine de
// l'hôte. En sous-dossier, ils doivent porter le préfixe de l'application.
// Ancré sur la directive et en début de ligne : une occurrence de « /admin »
// ailleurs dans le fichier (un commentaire) n'est pas touchée.
if ($base !== '/') {
    $texte = (string) preg_replace(
        '/^(Allow|Disallow):\s*\/(\S*)\s*$/mi',
        '$1: ' . $base . '$2',
        $texte,
    );
}

header('Content-Type: text/plain; charset=UTF-8');
katech_cache_court();

echo $texte;
