<?php

/**
 * sitemap.xml servi à l'exécution, avec le domaine réel de la requête.
 *
 * =====================================================================
 * POURQUOI CE FICHIER EXISTE
 * =====================================================================
 * Le protocole des sitemaps (sitemaps.org) EXIGE des URL absolues dans
 * `<loc>` : contrairement à tout le reste du livrable, on ne peut pas les
 * rendre relatives. Un `sitemap.xml` statique porte donc nécessairement un
 * domaine — et le seul domaine qu'un fichier écrit au build puisse porter est
 * celui du build.
 *
 * Mesuré avant ce correctif : les 27 `<loc>` de `dist/sitemap.xml` annonçaient
 * `https://katech.dz/…`, quel que soit l'hébergement. Le même paquet déposé
 * sur un autre domaine demandait à Google d'indexer le site de quelqu'un
 * d'autre, et le commanditaire devait reconstruire le paquet pour chaque
 * domaine. La `<base>` de `public/index.php` n'y pouvait rien : un XML servi en
 * statique ne passe par aucun PHP.
 *
 * Ce script sert donc le sitemap, avec l'origine déduite de la requête.
 *
 * =====================================================================
 * IL NE RÉÉNUMÈRE RIEN
 * =====================================================================
 * Il LIT `sitemap.xml` à côté de lui et n'en réécrit que l'origine. C'est
 * important à trois titres :
 *
 *  - `scripts/generate-sitemap.ts` reste l'unique endroit où les routes
 *    publiques sont énumérées. Redéclarer les 27 URL ici, en PHP, aurait
 *    créé une seconde liste — donc, à terme, deux listes différentes ;
 *  - `scripts/prerendu.ts` LIT `dist/sitemap.xml` pour savoir quelles pages
 *    prérendre. Le fichier statique doit donc continuer d'exister ;
 *  - il reste le REPLI si PHP ne tourne pas : un sitemap au domaine de repli
 *    vaut mieux que pas de sitemap. `public/.htaccess` ne réécrit
 *    `/sitemap.xml` vers ce script que là où PHP tourne ; ailleurs, le fichier
 *    est servi tel quel, et reste un XML valide.
 *
 * C'est exactement le rapport qu'entretiennent `index.php` et `index.html`.
 *
 * La réécriture elle-même est celle de `public/origine.php`, partagée avec
 * `index.php` et `robots.php` : la validation de HTTP_HOST n'existe qu'à un
 * seul endroit, et le déploiement en sous-dossier est traité par la même
 * règle que les balises OG (`/product/x` devient `/ma-boutique/product/x`).
 */

declare(strict_types=1);

require_once __DIR__ . '/origine.php';

$fichier = __DIR__ . '/sitemap.xml';

// Échec visible plutôt que silencieux. Un sitemap absent est un téléversement
// incomplet ou un build sans l'étape « prebuild » : on le dit, en XML valide
// pour ne pas ajouter une erreur de syntaxe au diagnostic du robot.
if (!is_file($fichier)) {
    http_response_code(500);
    header('Content-Type: application/xml; charset=UTF-8');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<!-- sitemap.xml est absent a cote de sitemap.php : televersement incomplet. -->\n";
    echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>\n";

    exit;
}

$xml = katech_reecrire_domaine((string) file_get_contents($fichier), katech_base_web());

header('Content-Type: application/xml; charset=UTF-8');
katech_cache_court();

echo $xml;
