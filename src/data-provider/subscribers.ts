import { useCallback, useMemo } from "react";

import { subscribersApi } from "@/api/resources/crm";
import type { Subscriber } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const SUBSCRIBERS_RESOURCE = "subscribers";

/** Repli stable. */
const NO_SUBSCRIBERS: Subscriber[] = [];

/**
 * Liste des abonnés newsletter — remplace `useAdminState().subscribers`.
 */
export function useSubscriberList(): ResourceState<Subscriber[]> {
  return useResource<Subscriber[]>({
    key: SUBSCRIBERS_RESOURCE,
    fromStore: (state) => state.subscribers,
    fromHttp: async () => (await subscribersApi.list()).items,
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
