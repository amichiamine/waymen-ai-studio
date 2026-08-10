import { useCallback, useMemo } from "react";

import { subscribersApi } from "@/api/resources/crm";
import type { Subscriber } from "@/lib/admin-store";

import { extraireItems } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const SUBSCRIBERS_RESOURCE = "subscribers";

/** Repli stable. */
const NO_SUBSCRIBERS: Subscriber[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste des abonnés newsletter — remplace `useAdminState().subscribers`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 abonnés.
 */
export function useSubscriberList(): ResourceState<Subscriber[]> {
  return useResource<Subscriber[]>({
    key: SUBSCRIBERS_RESOURCE,
    fromStore: (state) => state.subscribers,
    fromHttp: async () =>
      extraireItems(
        SUBSCRIBERS_RESOURCE,
        await subscribersApi.list({ perPage: DEFAULT_PER_PAGE }),
        NO_SUBSCRIBERS,
      ),
    fallback: NO_SUBSCRIBERS,
  });
}

export type SubscriberMutations = {
  subscribe: (email: string, source?: string) => Promise<Subscriber>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations des abonnés. Toujours asynchrones, y compris en mock.
 */
export function useSubscriberMutations(): SubscriberMutations {
  const subscribe = useCallback(
    (email: string, source?: string) =>
      runMutation(SUBSCRIBERS_RESOURCE, "subscribe", () => subscribersApi.subscribe(email, source)),
    [],
  );

  const remove = useCallback(
    (id: string) => runMutation(SUBSCRIBERS_RESOURCE, "remove", () => subscribersApi.remove(id)),
    [],
  );

  return useMemo(() => ({ subscribe, remove }), [subscribe, remove]);
}
