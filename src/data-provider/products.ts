import { useCallback, useMemo } from "react";

import { productsApi } from "@/api/resources/products";
import type { ProductQuery } from "@/api/types";
import type { Product, UseTag } from "@/data/products";

import { extraireItems } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const PRODUCTS_RESOURCE = "products";

/**
 * Repli de liste : référence **stable au niveau module**. Un `[]` littéral
 * recréé à chaque rendu suffirait à invalider tous les mémos en aval.
 */
const NO_PRODUCTS: Product[] = [];

/**
 * En mode mock, `productsApi.list()` renvoie tout le catalogue quand `perPage`
 * n'est pas précisé ; en http, `docs/API-CONTRACT.md` fixe le défaut serveur à
 * 20. Sans valeur explicite, la même page afficherait 12 produits en mock et
 * 20 maximum en http — exactement la divergence de sémantique entre modes que
 * ce fournisseur existe pour empêcher. On demande donc une page large, adaptée
 * à des écrans qui filtrent et trient côté client.
 *
 * Limite connue et assumée de la phase 2 : la pagination serveur réelle
 * (`total`, page suivante) n'est pas exposée — voir `docs/DATA-PROVIDER.md`.
 */
const DEFAULT_PER_PAGE = 100;

/**
 * Filtrage local, miroir de `paginateLocal` de `src/api/resources/products.ts`.
 *
 * Duplication assumée et **signalée** : `paginateLocal` n'est pas exportée et
 * `src/api/**` est hors périmètre de cette vague. Les deux implémentations
 * doivent être fusionnées en vague 2.3, en exportant le filtre depuis la
 * ressource API. Toute divergence entre ces deux fonctions se traduirait par
 * des résultats différents en mock et en http.
 */
export function applyProductQuery(list: Product[], query: ProductQuery): Product[] {
  let result = list;
  if (query.category) result = result.filter((p) => p.category === query.category);
  if (query.brand) result = result.filter((p) => p.brand === query.brand);
  if (query.stock) result = result.filter((p) => p.stock === query.stock);
  if (query.sale) result = result.filter((p) => p.sale === true);
  if (query.bestSeller) result = result.filter((p) => p.bestSeller === true);
  if (query.use) {
    const tag = query.use as UseTag;
    result = result.filter((p) => p.use.includes(tag));
  }
  const { minPrice, maxPrice } = query;
  if (minPrice != null) result = result.filter((p) => p.price >= minPrice);
  if (maxPrice != null) result = result.filter((p) => p.price <= maxPrice);
  if (query.search) {
    const needle = query.search.toLowerCase();
    result = result.filter((p) =>
      `${p.name} ${p.brand} ${p.specLine}`.toLowerCase().includes(needle),
    );
  }
  const perPage = query.perPage;
  if (perPage != null && perPage > 0) {
    const page = query.page ?? 1;
    result = result.slice((page - 1) * perPage, page * perPage);
  }
  return result;
}

/**
 * Sérialise la requête en clé stable **par valeur**.
 *
 * C'est le pivot du socle : un objet de requête littéral change de référence à
 * chaque rendu et ne peut donc pas servir de dépendance d'effet. Sa forme
 * sérialisée, si : les entrées sont triées pour que `{a,b}` et `{b,a}` donnent
 * la même clé, et les valeurs vides sont écartées comme le fait `buildUrl` du
 * client HTTP — la clé de cache colle ainsi à l'URL réellement appelée.
 */
function productListKey(query: ProductQuery): string {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => [name, String(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => `${name}=${value}`);
  return parts.length > 0 ? `${PRODUCTS_RESOURCE}?${parts.join("&")}` : PRODUCTS_RESOURCE;
}

/**
 * Liste de produits — remplace `useAdminState().products`.
 *
 * Attention : la liste contient aussi les configurations `/builder`
 * (`customBuild`). Toute surface publique de listing doit la passer par
 * `catalogProducts()` de `@/data/products`, comme avant la migration.
 */
export function useProductList(query: ProductQuery = {}): ResourceState<Product[]> {
  const normalized: ProductQuery = { ...query, perPage: query.perPage ?? DEFAULT_PER_PAGE };
  const key = productListKey(normalized);

  // `normalized` est recréé à chaque rendu, et c'est sans conséquence : il n'est
  // jamais une dépendance de hook. Seule `key` — stable par valeur — pilote les
  // recalculs, et les deux fermetures ci-dessous ne sont invoquées par le socle
  // que lorsque `key` (ou l'état du store) change.
  return useResource<Product[]>({
    key,
    fromStore: (state) => applyProductQuery(state.products, normalized),
    fromHttp: async () =>
      extraireItems(PRODUCTS_RESOURCE, await productsApi.list(normalized), NO_PRODUCTS),
    fallback: NO_PRODUCTS,
  });
}

/**
 * Détail d'un produit — remplace `useAdminState().products.find(...)`.
 *
 * `id` optionnel : le hook reste monté et inactif quand l'identifiant n'est pas
 * encore connu (paramètre d'URL en cours de résolution). Ne jamais court-circuiter
 * l'appel du hook lui-même.
 */
export function useProductDetail(id?: string): ResourceState<Product | undefined> {
  const key = id ? `${PRODUCTS_RESOURCE}/${id}` : `${PRODUCTS_RESOURCE}/inactif`;

  return useResource<Product | undefined>({
    key,
    enabled: Boolean(id),
    fromStore: (state) => (id ? state.products.find((p) => p.id === id) : undefined),
    fromHttp: async () => (id ? productsApi.detail(id) : undefined),
    fallback: undefined,
  });
}

export type ProductMutations = {
  create: (input: Product) => Promise<Product>;
  update: (id: string, input: Product) => Promise<Product>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations produits. Toujours asynchrones, y compris en mock (où elles
 * résolvent immédiatement après écriture dans le store) : un composant écrit une
 * seule fois pour les deux modes.
 *
 * Les erreurs sont relancées normalisées en `ApiError` — `status`, `code` et
 * `fields` sont exploitables par l'appelant pour marquer un formulaire.
 */
export function useProductMutations(): ProductMutations {
  const create = useCallback(
    (input: Product) => runMutation(PRODUCTS_RESOURCE, "create", () => productsApi.create(input)),
    [],
  );
  const update = useCallback(
    (id: string, input: Product) =>
      runMutation(PRODUCTS_RESOURCE, "update", () => productsApi.update(id, input)),
    [],
  );
  const remove = useCallback(
    (id: string) => runMutation(PRODUCTS_RESOURCE, "remove", () => productsApi.remove(id)),
    [],
  );

  return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}
