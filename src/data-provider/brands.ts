import { useCallback, useMemo } from "react";

import { brandsApi } from "@/api/resources/brands";
import type { AdminBrand } from "@/api/types";

import { extraireItems } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const BRANDS_RESOURCE = "brands";

/**
 * Repli de liste : référence **stable au niveau module**. Un `[]` littéral
 * recréé à chaque rendu suffirait à invalider tous les mémos en aval.
 */
const NO_BRANDS: AdminBrand[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste de marques — remplace `useAdminState().brands`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 marques.
 */
export function useBrandList(): ResourceState<AdminBrand[]> {
  return useResource<AdminBrand[]>({
    key: BRANDS_RESOURCE,
    fromStore: (state) => state.brands,
    fromHttp: async () =>
      extraireItems(
        BRANDS_RESOURCE,
        await brandsApi.list({ perPage: DEFAULT_PER_PAGE }),
        NO_BRANDS,
      ),
    fallback: NO_BRANDS,
  });
}

/**
 * Détail d'une marque — remplace `useAdminState().brands.find(...)`.
 *
 * `id` optionnel : le hook reste monté et inactif quand l'identifiant n'est
 * pas encore connu. Ne jamais court-circuiter l'appel du hook lui-même.
 */
export function useBrandDetail(id?: string): ResourceState<AdminBrand | undefined> {
  const key = id ? `${BRANDS_RESOURCE}/${id}` : `${BRANDS_RESOURCE}/inactif`;

  return useResource<AdminBrand | undefined>({
    key,
    enabled: Boolean(id),
    fromStore: (state) => (id ? state.brands.find((b) => b.id === id) : undefined),
    fromHttp: async () => (id ? brandsApi.detail(id) : undefined),
    fallback: undefined,
  });
}

export type BrandMutations = {
  create: (input: AdminBrand) => Promise<AdminBrand>;
  update: (id: string, input: AdminBrand) => Promise<AdminBrand>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations marques. Toujours asynchrones, y compris en mock.
 *
 * Les erreurs sont relancées normalisées en `ApiError`.
 */
export function useBrandMutations(): BrandMutations {
  const create = useCallback(
    (input: AdminBrand) => runMutation(BRANDS_RESOURCE, "create", () => brandsApi.create(input)),
    [],
  );
  const update = useCallback(
    (id: string, input: AdminBrand) =>
      runMutation(BRANDS_RESOURCE, "update", () => brandsApi.update(id, input)),
    [],
  );
  const remove = useCallback(
    (id: string) => runMutation(BRANDS_RESOURCE, "remove", () => brandsApi.remove(id)),
    [],
  );

  return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}
