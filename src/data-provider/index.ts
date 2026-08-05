/**
 * Fournisseur de données — interface publique.
 *
 * Les composants importent **uniquement** depuis `@/data-provider`. Ils
 * n'importent ni `@/api`, ni `@/lib/admin-store`, ni `@/api/config` : c'est
 * cette règle qui rend la bascule `VITE_API_MODE=mock|http` réellement
 * transparente, et elle sera outillée par une règle ESLint en vague 2.6.
 *
 * Spécification et tableau de correspondance : `docs/DATA-PROVIDER.md`.
 */

// Socle — utile aux nouveaux hooks d'entité, pas aux composants.
export { useResource, runMutation } from "./use-resource";
export type { ResourceState, ResourceSource } from "./types";
export { DATA_MODE, isHttpData } from "./mode";
export { invalidateResource, invalidateAll } from "./cache";
export { toApiError } from "./errors";
export { getResourceFailures, clearResourceFailures } from "./log";
export type { ResourceFailure } from "./log";

// Ressources.
export {
  PRODUCTS_RESOURCE,
  applyProductQuery,
  useProductDetail,
  useProductList,
  useProductMutations,
} from "./products";
export type { ProductMutations } from "./products";
