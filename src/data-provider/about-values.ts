import { useCallback, useMemo } from "react";

import { setAboutValues, type AboutValue } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const ABOUT_VALUES_RESOURCE = "about-values";

const NO_ABOUT_VALUES: AboutValue[] = [];

/**
 * Échec explicite du mode http pour les valeurs « À propos ».
 *
 * Aucun endpoint REST dédié n'est encore défini pour cette ressource.
 * Le câblage http sera réalisé en phase 4 (PLAN.md). On refuse tout repli
 * silencieux vers le store local : une erreur explicite est préférable à un
 * résultat incorrect (AGENTS.md §7).
 */
function aboutValuesHttpNotImplemented(): Promise<never> {
  return Promise.reject(
    new Error(
      "[about-values] Aucun endpoint HTTP dédié n'est encore défini. " +
        "Cette ressource sera câblée en phase 4 — voir PLAN.md. " +
        "En mode http, les valeurs « À propos » ne sont pas disponibles.",
    ),
  );
}

/**
 * Valeurs affichées sur la page « À propos ».
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : l'endpoint n'est pas encore défini (phase 4). Le hook renvoie
 * la liste vide avec une `ApiError` journalisée — jamais un échec silencieux
 * (AGENTS.md §7).
 */
export function useAboutValueList(): ResourceState<AboutValue[]> {
  return useResource<AboutValue[]>({
    key: ABOUT_VALUES_RESOURCE,
    fromStore: (state) => state.aboutValues,
    fromHttp: () => aboutValuesHttpNotImplemented(),
    fallback: NO_ABOUT_VALUES,
  });
}

export type AboutValueMutations = {
  set: (list: AboutValue[]) => Promise<AboutValue[]>;
};

/**
 * Mutations des valeurs « À propos ».
 * `set` remplace la liste complète.
 */
export function useAboutValueMutations(): AboutValueMutations {
  const set = useCallback(
    (list: AboutValue[]) =>
      runMutation(ABOUT_VALUES_RESOURCE, "set", async () => {
        setAboutValues(list);
        return list;
      }),
    [],
  );

  return useMemo(() => ({ set }), [set]);
}
