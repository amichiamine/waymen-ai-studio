/**
 * Configuration de la couche API.
 *
 * Le frontend fonctionne actuellement en mode "mock" (localStorage via admin-store).
 * Dès que le backend est déployé, il suffit de définir dans `.env` :
 *
 *   VITE_API_MODE=http
 *
 * Aucun composant n'a besoin d'être modifié : les hooks/services de `src/api/*`
 * basculent automatiquement.
 *
 * `VITE_API_BASE_URL` n'a plus à être renseignée : l'emplacement de l'API est
 * déduit de l'endroit où le site est réellement déposé (voir `CHEMIN_BASE`
 * ci-dessous). Elle reste lisible pour le cas — rare — d'une API hébergée
 * ailleurs que sous la racine de l'application.
 */

export type ApiMode = "mock" | "http";

const env = import.meta.env as Record<string, string | undefined>;

export const API_MODE: ApiMode = env.VITE_API_MODE === "http" ? "http" : "mock";

/** Un chemin de base est toujours normalisé « /…/ », barre oblique finale comprise. */
const terminerParBarre = (chemin: string): string => (chemin.endsWith("/") ? chemin : `${chemin}/`);

/**
 * Chemin sous lequel l'application est RÉELLEMENT déposée, toujours terminé
 * par une barre oblique. `"/"` à la racine du domaine, `"/ma-boutique/"` si le
 * dossier issu de `bun run build` a été renommé et déposé dans un sous-dossier.
 *
 * POURQUOI CE CALCUL AU LIEU D'UNE CONSTANTE : le commerçant renomme `dist/`
 * comme il veut et le dépose où il veut, sans reconstruire. Le chemin n'est
 * donc pas connu au moment du build — l'écrire en dur ramènerait exactement le
 * fichier-à-éditer-à-la-main que ce chantier supprime.
 *
 * COMMENT : `public/index.php` insère dans le document une balise `<base>`
 * calculée à partir de `SCRIPT_NAME`, c'est-à-dire de l'emplacement réel des
 * fichiers. C'est la seule source fiable : vu du navigateur, rien ne distingue
 * le dossier de déploiement des premiers segments de la route. `public/
 * index.php` détaille les deux contournements `.htaccess` essayés et pourquoi
 * ils échouent — le second casse React de façon spectaculaire.
 *
 * En développement, et pour toute base absolue explicitement configurée,
 * `import.meta.env.BASE_URL` porte déjà la réponse : on la prend telle quelle.
 */
function deduireCheminBase(): string {
  const declaree = import.meta.env.BASE_URL;
  if (declaree.startsWith("/")) return terminerParBarre(declaree);

  const balise = document.querySelector("base[href]");
  if (balise instanceof HTMLBaseElement) {
    return terminerParBarre(new URL(balise.href).pathname);
  }

  // Échec visible plutôt que silencieux. Sans la balise, le repli ci-dessous
  // n'est juste QUE si l'on se trouve déjà à la racine de l'application : le
  // site « marcherait presque » — accueil correct, route profonde cassée — et
  // c'est le pire symptôme à diagnostiquer. On nomme donc la cause.
  console.error(
    "[ka-tech] Balise <base> absente : le document n'a pas été servi par index.php. " +
      "Vérifier que PHP est actif et que DirectoryIndex ainsi que le repli SPA " +
      "pointent sur index.php (voir public/.htaccess). " +
      "Repli sur le dossier de l'URL courante.",
  );

  return terminerParBarre(window.location.pathname.replace(/[^/]*$/, ""));
}

export const CHEMIN_BASE = deduireCheminBase();

/**
 * Préfixe HTTP de l'API, sans barre oblique finale.
 *
 * Par défaut `<CHEMIN_BASE>api/v1` : l'API est déposée SOUS l'application
 * (`public_html/ma-boutique/api/`), donc son adresse suit le même déplacement.
 * Côté serveur, `api/src/Requete.php` déduit symétriquement son propre préfixe
 * de `SCRIPT_NAME` : les deux bouts se retrouvent sans qu'on configure rien.
 */
function resoudreBaseApi(): string {
  const declaree = (env.VITE_API_BASE_URL ?? "").trim();

  if (declaree === "") return `${CHEMIN_BASE}api/v1`.replace(/\/+$/, "");

  // API sur une autre origine : on n'y touche pas.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(declaree)) return declaree.replace(/\/+$/, "");

  // Chemin absolu : choix explicite de l'exploitant, respecté tel quel. Mais
  // s'il ne tombe pas sous l'application, l'appel partira vers la racine du
  // domaine et échouera en 404 — on le dit au lieu de le laisser deviner.
  if (declaree.startsWith("/")) {
    if (CHEMIN_BASE !== "/" && !declaree.startsWith(CHEMIN_BASE)) {
      console.error(
        `[ka-tech] VITE_API_BASE_URL vaut « ${declaree} » (chemin absolu) alors que le site ` +
          `est déposé sous « ${CHEMIN_BASE} ». Les appels d'API viseront la racine du domaine. ` +
          `Laisser VITE_API_BASE_URL vide rend l'adresse portable.`,
      );
    }
    return declaree.replace(/\/+$/, "");
  }

  return `${CHEMIN_BASE}${declaree.replace(/^\/+/, "")}`.replace(/\/+$/, "");
}

export const API_BASE_URL = resoudreBaseApi();

/**
 * Stratégie d'authentification :
 * - "cookie" (recommandé) : le backend pose un cookie httpOnly, le client envoie `credentials: "include"`.
 * - "bearer" : un access token court est conservé en mémoire et injecté en header.
 */
export const AUTH_STRATEGY: "cookie" | "bearer" =
  env.VITE_API_AUTH === "bearer" ? "bearer" : "cookie";

export const API_TIMEOUT_MS = Number(env.VITE_API_TIMEOUT_MS ?? 15000);

export const isHttpMode = () => API_MODE === "http";
