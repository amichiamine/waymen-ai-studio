import { useCallback, useMemo } from "react";

import { getAdminSnapshot, setAboutValues, type AboutValue } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const ABOUT_VALUES_RESOURCE = "about-values";

const NO_ABOUT_VALUES: AboutValue[] = [];

/**
 * Valeurs affichées sur la page « À propos ».
 *
 * En mode mock, lit `AdminState.aboutValues`.
 * En mode HTTP, le backend exposera un endpoint dédié (vague 2.4+) ;
 * `fromHttp` lit le snapshot local jusqu'à ce câblage.
 */
export function useAboutValueList(): ResourceState<AboutValue[]> {
  return useResource<AboutValue[]>({
    key: ABOUT_VALUES_RESOURCE,
    fromStore: (state) => state.aboutValues,
    fromHttp: async () => getAdminSnapshot().aboutValues,
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
