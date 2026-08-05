import { useCallback, useMemo } from "react";

import { getAdminSnapshot, setMarqueeBrands } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const MARQUEE_BRANDS_RESOURCE = "marquee-brands";

const NO_MARQUEE_BRANDS: string[] = [];

/**
 * Marques du bandeau défilant (liste de chaînes).
 *
 * En mode mock, lit `AdminState.marqueeBrands`.
 * En mode HTTP, le backend exposera un endpoint dédié (vague 2.4+) ;
 * `fromHttp` lit le snapshot local jusqu'à ce câblage.
 */
export function useMarqueeBrandList(): ResourceState<string[]> {
  return useResource<string[]>({
    key: MARQUEE_BRANDS_RESOURCE,
    fromStore: (state) => state.marqueeBrands,
    fromHttp: async () => getAdminSnapshot().marqueeBrands,
    fallback: NO_MARQUEE_BRANDS,
  });
}

export type MarqueeBrandMutations = {
  set: (list: string[]) => Promise<string[]>;
};

/**
 * Mutations des marques du bandeau.
 * `set` remplace la liste complète.
 */
export function useMarqueeBrandMutations(): MarqueeBrandMutations {
  const set = useCallback(
    (list: string[]) =>
      runMutation(MARQUEE_BRANDS_RESOURCE, "set", async () => {
        setMarqueeBrands(list);
        return list;
      }),
    [],
  );

  return useMemo(() => ({ set }), [set]);
}
