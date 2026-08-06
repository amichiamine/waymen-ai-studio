import { useCallback, useMemo } from "react";

import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";
import { setAboutValues, type AboutValue } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import { isHttpData } from "./mode";
import type { ResourceState } from "./types";

export const ABOUT_VALUES_RESOURCE = "about-values";

const NO_ABOUT_VALUES: AboutValue[] = [];

/**
 * Lit la section `about` depuis `GET /content` et en extrait `about.values`.
 *
 * Le backend stocke les valeurs de la page « À propos » dans la section
 * « about » de la table `site_content`. La route `/content` retourne l'ensemble
 * des sections ; le provider en extrait uniquement `about.values`.
 */
async function fetchAboutValues(): Promise<AboutValue[]> {
  const content = await http.get<Record<string, unknown>>(E.content.get());
  const about = content?.about;
  if (
    about !== null &&
    about !== undefined &&
    typeof about === "object" &&
    !Array.isArray(about) &&
    Array.isArray((about as Record<string, unknown>).values)
  ) {
    return (about as { values: AboutValue[] }).values;
  }
  return [];
}

/**
 * Valeurs affichées sur la page « À propos ».
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : lecture de `GET /content → about.values`.
 */
export function useAboutValueList(): ResourceState<AboutValue[]> {
  return useResource<AboutValue[]>({
    key: ABOUT_VALUES_RESOURCE,
    fromStore: (state) => state.aboutValues,
    fromHttp: fetchAboutValues,
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
        if (isHttpData()) {
          await http.patch<void>(E.content.update(), { about: { values: list } });
          return list;
        }
        setAboutValues(list);
        return list;
      }),
    [],
  );

  return useMemo(() => ({ set }), [set]);
}
