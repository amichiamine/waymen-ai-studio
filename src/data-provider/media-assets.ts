import { useCallback, useMemo } from "react";

import { mediaApi } from "@/api/resources/media";
import type { MediaAsset } from "@/lib/admin-store";

import { extraireItems } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const MEDIA_RESOURCE = "media";

/** Repli stable : jamais un littéral `[]` (invaliderait tous les mémos en aval). */
const NO_MEDIA: MediaAsset[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste des médias — remplace `useAdminState().mediaAssets`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 médias.
 */
export function useMediaAssetList(): ResourceState<MediaAsset[]> {
  return useResource<MediaAsset[]>({
    key: MEDIA_RESOURCE,
    fromStore: (state) => state.mediaAssets,
    fromHttp: async () =>
      extraireItems(MEDIA_RESOURCE, await mediaApi.list({ perPage: DEFAULT_PER_PAGE }), NO_MEDIA),
    fallback: NO_MEDIA,
  });
}

/**
 * Détail d'un média — remplace `useAdminState().mediaAssets.find(...)`.
 *
 * `id` optionnel : le hook reste monté et inactif quand l'identifiant n'est pas
 * encore connu. Ne jamais court-circuiter l'appel du hook lui-même.
 */
export function useMediaAssetDetail(id?: string): ResourceState<MediaAsset | undefined> {
  const key = id ? `${MEDIA_RESOURCE}/${id}` : `${MEDIA_RESOURCE}/inactif`;

  return useResource<MediaAsset | undefined>({
    key,
    enabled: Boolean(id),
    fromStore: (state) => (id ? state.mediaAssets.find((m) => m.id === id) : undefined),
    fromHttp: async () => (id ? mediaApi.detail(id) : undefined),
    fallback: undefined,
  });
}

export type MediaAssetMutations = {
  /**
   * Téléverse un fichier.
   *
   * Accepte un `File` dans les deux modes. En mode mock, il est converti en
   * data:URL base64 et stocké dans le localStorage. En mode http, il est
   * envoyé en multipart/form-data et le serveur retourne une URL absolue.
   * `MediaAsset.src` porte donc deux sémantiques selon le mode — cette
   * divergence est documentée dans `src/api/resources/media.ts` et sera unifiée
   * en phase 4 (PLAN.md §8, vague 4.5).
   */
  upload: (file: File) => Promise<MediaAsset>;
  rename: (id: string, name: string, tag?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations médias. Toujours asynchrones, y compris en mock.
 *
 * Le cas le plus divergent entre les deux modes est le téléversement :
 * la mutation `upload()` accepte un `File` et masque entièrement la divergence
 * base64 / FormData à l'appelant. Voir `src/api/resources/media.ts` pour le
 * détail et le pointeur vers la phase 4.
 */
export function useMediaAssetMutations(): MediaAssetMutations {
  const upload = useCallback(
    (file: File) => runMutation(MEDIA_RESOURCE, "upload", () => mediaApi.upload(file)),
    [],
  );
  const rename = useCallback(
    (id: string, name: string, tag?: string) =>
      runMutation(MEDIA_RESOURCE, "rename", () => mediaApi.rename(id, name, tag)),
    [],
  );
  const remove = useCallback(
    (id: string) => runMutation(MEDIA_RESOURCE, "remove", () => mediaApi.remove(id)),
    [],
  );

  return useMemo(() => ({ upload, rename, remove }), [upload, rename, remove]);
}
