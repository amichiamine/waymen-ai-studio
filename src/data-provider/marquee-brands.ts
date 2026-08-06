import { useCallback, useMemo } from "react";

import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";
import { setMarqueeBrands } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import { isHttpData } from "./mode";
import type { ResourceState } from "./types";

export const MARQUEE_BRANDS_RESOURCE = "marquee-brands";

const NO_MARQUEE_BRANDS: string[] = [];

/**
 * Lit la section `marquee` depuis `GET /content` et en extrait `marquee.brands`.
 *
 * Le backend stocke les marques du bandeau dans la section « marquee » de la
 * table `site_content`. La route `/content` retourne l'ensemble des sections ;
 * le provider en extrait uniquement `marquee.brands`.
 */
async function fetchMarqueeBrands(): Promise<string[]> {
  const content = await http.get<Record<string, unknown>>(E.content.get());
  const marquee = content?.marquee;
  if (
    marquee !== null &&
    marquee !== undefined &&
    typeof marquee === "object" &&
    !Array.isArray(marquee) &&
    Array.isArray((marquee as Record<string, unknown>).brands)
  ) {
    return (marquee as { brands: string[] }).brands;
  }
  return [];
}

/**
 * Marques du bandeau défilant (liste de chaînes).
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : lecture de `GET /content → marquee.brands`.
 */
export function useMarqueeBrandList(): ResourceState<string[]> {
  return useResource<string[]>({
    key: MARQUEE_BRANDS_RESOURCE,
    fromStore: (state) => state.marqueeBrands,
    fromHttp: fetchMarqueeBrands,
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
        if (isHttpData()) {
          await http.patch<void>(E.content.update(), { marquee: { brands: list } });
          return list;
        }
        setMarqueeBrands(list);
        return list;
      }),
    [],
  );

  return useMemo(() => ({ set }), [set]);
}
