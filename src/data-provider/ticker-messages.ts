import { useCallback, useMemo } from "react";

import { setTickerMessages, type TickerMessage } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const TICKER_RESOURCE = "ticker-messages";

const NO_TICKER_MESSAGES: TickerMessage[] = [];

/**
 * Échec explicite du mode http pour le bandeau défilant (ticker).
 *
 * Aucun endpoint REST dédié n'est encore défini pour cette ressource.
 * Le câblage http sera réalisé en phase 4 (PLAN.md). On refuse tout repli
 * silencieux vers le store local : une erreur explicite est préférable à un
 * résultat incorrect (AGENTS.md §7).
 */
function tickerMessagesHttpNotImplemented(): Promise<never> {
  return Promise.reject(
    new Error(
      "[ticker-messages] Aucun endpoint HTTP dédié n'est encore défini. " +
        "Cette ressource sera câblée en phase 4 — voir PLAN.md. " +
        "En mode http, les messages du bandeau défilant ne sont pas disponibles.",
    ),
  );
}

/**
 * Messages du bandeau défilant (ticker).
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : l'endpoint n'est pas encore défini (phase 4). Le hook renvoie
 * la liste vide avec une `ApiError` journalisée — jamais un échec silencieux
 * (AGENTS.md §7).
 */
export function useTickerMessageList(): ResourceState<TickerMessage[]> {
  return useResource<TickerMessage[]>({
    key: TICKER_RESOURCE,
    fromStore: (state) => state.tickerMessages,
    fromHttp: () => tickerMessagesHttpNotImplemented(),
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
