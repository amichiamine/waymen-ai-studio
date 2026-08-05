import { useCallback, useMemo } from "react";

import { setMarqueeBrands } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const MARQUEE_BRANDS_RESOURCE = "marquee-brands";

const NO_MARQUEE_BRANDS: string[] = [];

/**
 * Échec explicite du mode http pour les marques du bandeau défilant.
 *
 * Aucun endpoint REST dédié n'est encore défini pour cette ressource.
 * Le câblage http sera réalisé en phase 4 (PLAN.md). On refuse tout repli
 * silencieux vers le store local : une erreur explicite est préférable à un
 * résultat incorrect (AGENTS.md §7).
 */
function marqueeBrandsHttpNotImplemented(): Promise<never> {
  return Promise.reject(
    new Error(
      "[marquee-brands] Aucun endpoint HTTP dédié n'est encore défini. " +
        "Cette ressource sera câblée en phase 4 — voir PLAN.md. " +
        "En mode http, les marques du bandeau défilant ne sont pas disponibles.",
    ),
  );
}

/**
 * Marques du bandeau défilant (liste de chaînes).
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : l'endpoint n'est pas encore défini (phase 4). Le hook renvoie
 * la liste vide avec une `ApiError` journalisée — jamais un échec silencieux
 * (AGENTS.md §7).
 */
export function useMarqueeBrandList(): ResourceState<string[]> {
  return useResource<string[]>({
    key: MARQUEE_BRANDS_RESOURCE,
    fromStore: (state) => state.marqueeBrands,
    fromHttp: () => marqueeBrandsHttpNotImplemented(),
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
