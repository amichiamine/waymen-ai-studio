import { useCallback, useMemo } from "react";

import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";
import { setTickerMessages, type TickerMessage } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import { isHttpData } from "./mode";
import type { ResourceState } from "./types";

export const TICKER_RESOURCE = "ticker-messages";

const NO_TICKER_MESSAGES: TickerMessage[] = [];

/**
 * Lit la section `ticker` depuis `GET /content` et en extrait `ticker.items`.
 *
 * Le backend stocke les messages du bandeau dans la section « ticker » de la
 * table `site_content`. La route `/content` retourne l'ensemble des sections ;
 * le provider en extrait uniquement `ticker.items`.
 */
async function fetchTickerMessages(): Promise<TickerMessage[]> {
  const content = await http.get<Record<string, unknown>>(E.content.get());
  const ticker = content?.ticker;
  if (
    ticker !== null &&
    ticker !== undefined &&
    typeof ticker === "object" &&
    !Array.isArray(ticker) &&
    Array.isArray((ticker as Record<string, unknown>).items)
  ) {
    return (ticker as { items: TickerMessage[] }).items;
  }
  return [];
}

/**
 * Messages du bandeau défilant (ticker).
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : lecture de `GET /content → ticker.items`.
 */
export function useTickerMessageList(): ResourceState<TickerMessage[]> {
  return useResource<TickerMessage[]>({
    key: TICKER_RESOURCE,
    fromStore: (state) => state.tickerMessages,
    fromHttp: fetchTickerMessages,
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
        if (isHttpData()) {
          await http.patch<void>(E.content.update(), { ticker: { items: list } });
          return list;
        }
        setTickerMessages(list);
        return list;
      }),
    [],
  );

  return useMemo(() => ({ set }), [set]);
}
