import { useCallback, useMemo } from "react";

import { getAdminSnapshot, setTickerMessages, type TickerMessage } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const TICKER_RESOURCE = "ticker-messages";

const NO_TICKER_MESSAGES: TickerMessage[] = [];

/**
 * Messages du bandeau défilant (ticker).
 *
 * En mode mock, lit directement `AdminState.tickerMessages`.
 * En mode HTTP, le backend exposera un endpoint dédié (vague 2.4+) ;
 * `fromHttp` lit le snapshot local jusqu'à ce câblage — aucune divergence
 * observable en phase mock.
 */
export function useTickerMessageList(): ResourceState<TickerMessage[]> {
  return useResource<TickerMessage[]>({
    key: TICKER_RESOURCE,
    fromStore: (state) => state.tickerMessages,
    fromHttp: async () => getAdminSnapshot().tickerMessages,
    fallback: NO_TICKER_MESSAGES,
  });
}

export type TickerMessageMutations = {
  set: (list: TickerMessage[]) => Promise<TickerMessage[]>;
};

/**
 * Mutations du bandeau défilant.
 * `set` remplace la liste complète.
 */
export function useTickerMessageMutations(): TickerMessageMutations {
  const set = useCallback(
    (list: TickerMessage[]) =>
      runMutation(TICKER_RESOURCE, "set", async () => {
        setTickerMessages(list);
        return list;
      }),
    [],
  );

  return useMemo(() => ({ set }), [set]);
}
