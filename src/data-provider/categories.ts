import { useCallback, useMemo } from "react";

import { categoriesApi } from "@/api/resources/categories";
import type { AdminCategory } from "@/api/types";

import { extraireItems } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const CATEGORIES_RESOURCE = "categories";

/**
 * Repli de liste : référence **stable au niveau module**. Un `[]` littéral
 * recréé à chaque rendu suffirait à invalider tous les mémos en aval.
 */
const NO_CATEGORIES: AdminCategory[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste de catégories — remplace `useAdminState().categories`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 catégories.
 */
export function useCategoryList(): ResourceState<AdminCategory[]> {
  return useResource<AdminCategory[]>({
    key: CATEGORIES_RESOURCE,
    fromStore: (state) => state.categories,
    fromHttp: async () =>
      extraireItems(
        CATEGORIES_RESOURCE,
        await categoriesApi.list({ perPage: DEFAULT_PER_PAGE }),
        NO_CATEGORIES,
      ),
    fallback: NO_CATEGORIES,
  });
}

/**
 * Détail d'une catégorie — remplace `useAdminState().categories.find(...)`.
 *
 * `slug` optionnel : le hook reste monté et inactif quand l'identifiant n'est
 * pas encore connu. Ne jamais court-circuiter l'appel du hook lui-même.
 */
export function useCategoryDetail(slug?: string): ResourceState<AdminCategory | undefined> {
  const key = slug ? `${CATEGORIES_RESOURCE}/${slug}` : `${CATEGORIES_RESOURCE}/inactif`;

  return useResource<AdminCategory | undefined>({
    key,
    enabled: Boolean(slug),
    fromStore: (state) => (slug ? state.categories.find((c) => c.slug === slug) : undefined),
    fromHttp: async () => (slug ? categoriesApi.detail(slug) : undefined),
    fallback: undefined,
  });
}

export type CategoryMutations = {
  create: (input: AdminCategory) => Promise<AdminCategory>;
  update: (slug: string, input: AdminCategory) => Promise<AdminCategory>;
  remove: (slug: string) => Promise<void>;
};

/**
 * Mutations catégories. Toujours asynchrones, y compris en mock.
 *
 * Les erreurs sont relancées normalisées en `ApiError`.
 */
export function useCategoryMutations(): CategoryMutations {
  const create = useCallback(
    (input: AdminCategory) =>
      runMutation(CATEGORIES_RESOURCE, "create", () => categoriesApi.create(input)),
    [],
  );
  const update = useCallback(
    (slug: string, input: AdminCategory) =>
      runMutation(CATEGORIES_RESOURCE, "update", () => categoriesApi.update(slug, input)),
    [],
  );
  const remove = useCallback(
    (slug: string) => runMutation(CATEGORIES_RESOURCE, "remove", () => categoriesApi.remove(slug)),
    [],
  );

  return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}
