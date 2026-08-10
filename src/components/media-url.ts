/**
 * Résolution des URL de médias stockées en base.
 *
 * =====================================================================
 * CE QUE CE MODULE RÉPARE
 * =====================================================================
 * Les colonnes `products.image`, `categories.cover`, `blog_posts.cover` et
 * `media_assets.src` contiennent des chemins RELATIFS, sans barre initiale :
 * « media/p-rog.webp », « uploads/a1b2c3.webp ». Deux raisons, et aucune n'est
 * cosmétique :
 *
 *  1. **Le sous-dossier.** Le site est déployable dans `public_html/ma-boutique/`.
 *     Un chemin absolu « /media/… » viserait la racine du DOMAINE, c'est-à-dire
 *     hors du dossier déposé — 404 garanti. C'est le défaut exact qui rendait
 *     les 19 images du catalogue introuvables.
 *  2. **L'empreinte.** `assets/` est le dossier des fichiers empreintés par
 *     Vite (`p-rog-mdwkNFOE.webp`) : son contenu change de nom à chaque build.
 *     Une URL persistée en base ne peut donc pas y pointer. `media/` et
 *     `uploads/` sont des emplacements stables, copiés tels quels.
 *
 * Le préfixe se lit dans `CHEMIN_BASE`, déduit à l'exécution de la balise
 * `<base>` que `public/index.php` calcule depuis `SCRIPT_NAME`. Rien n'est
 * écrit en dur : le commerçant renomme et déplace son dossier sans reconstruire.
 *
 * On ne s'en remet PAS à la seule résolution du navigateur contre `<base>` :
 * en développement, Vite sert `index.html` sans cette balise, et « media/x.webp »
 * se résoudrait alors contre l'URL du document — « /product/media/x.webp » sur
 * une fiche produit. Préfixer explicitement rend l'URL identique dans les deux
 * situations.
 */

import { CHEMIN_BASE } from "@/api/config";

/** URL déjà autoportante : http(s):, data:, blob:, //cdn… — on n'y touche pas. */
const EST_ABSOLUE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Convertit une valeur de base en URL utilisable dans un `src`.
 *
 * - `""` / `undefined` → `""` : au composant d'afficher un repli VISIBLE.
 * - URL absolue (http, data, blob) → rendue telle quelle.
 * - chemin commençant par « / » → préfixé par le dossier de dépôt si le site
 *   ne tourne pas à la racine du domaine, inchangé sinon. Un chemin absolu
 *   comme « /media/p-rog.webp » ignore la balise `<base>` : sans ce préfixe,
 *   il pointe toujours vers la racine du domaine, jamais vers
 *   « /ma-boutique/media/p-rog.webp ». C'est le défaut qui cassait les 8
 *   images du catalogue en déploiement sous-dossier. En dev (CHEMIN_BASE = "/"),
 *   ce branchement est un no-op : les chemins « /src/assets/… » du mode mock
 *   restent inchangés.
 * - tout le reste → préfixé par le chemin de dépôt de l'application.
 */
export function resoudreUrlMedia(src: string | undefined | null): string {
  if (typeof src !== "string") return "";
  const valeur = src.trim();
  if (valeur === "") return "";
  if (EST_ABSOLUE.test(valeur)) return valeur;
  if (valeur.startsWith("/")) {
    // À la racine du domaine (CHEMIN_BASE = "/"), aucun préfixe à ajouter.
    // En sous-dossier (CHEMIN_BASE = "/ma-boutique/"), le préfixe seul manquait.
    return CHEMIN_BASE === "/" ? valeur : CHEMIN_BASE.slice(0, -1) + valeur;
  }

  return `${CHEMIN_BASE}${valeur}`;
}

/**
 * Même résolution, mais en URL absolue avec origine.
 *
 * Réservé aux consommateurs qui l'EXIGENT : balisage schema.org et métadonnées
 * de partage, qu'un moteur ou WhatsApp lit hors du contexte de la page et qui
 * ignorent donc la balise `<base>`.
 */
export function urlMediaAbsolue(src: string | undefined | null): string {
  const relative = resoudreUrlMedia(src);
  if (relative === "") return "";
  if (EST_ABSOLUE.test(relative)) return relative;

  return new URL(relative, window.location.origin).href;
}
