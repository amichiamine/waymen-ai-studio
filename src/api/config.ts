/**
 * Configuration de la couche API.
 *
 * Le frontend fonctionne actuellement en mode "mock" (localStorage via admin-store).
 * Dès que le backend est déployé, il suffit de définir dans `.env` :
 *
 *   VITE_API_MODE=http
 *   VITE_API_BASE_URL=https://api.mondomaine.dz/v1
 *
 * Aucun composant n'a besoin d'être modifié : les hooks/services de `src/api/*`
 * basculent automatiquement.
 */

export type ApiMode = "mock" | "http";

const env = import.meta.env as Record<string, string | undefined>;

export const API_MODE: ApiMode = env.VITE_API_MODE === "http" ? "http" : "mock";

export const API_BASE_URL = (env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/+$/, "");

/**
 * Stratégie d'authentification :
 * - "cookie" (recommandé) : le backend pose un cookie httpOnly, le client envoie `credentials: "include"`.
 * - "bearer" : un access token court est conservé en mémoire et injecté en header.
 */
export const AUTH_STRATEGY: "cookie" | "bearer" =
  env.VITE_API_AUTH === "bearer" ? "bearer" : "cookie";

export const API_TIMEOUT_MS = Number(env.VITE_API_TIMEOUT_MS ?? 15000);

export const isHttpMode = () => API_MODE === "http";
