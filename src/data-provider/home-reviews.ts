/**
 * Provider des avis d'accueil (HomeReview).
 *
 * LIMITE CONNUE — mode http :
 * `endpoints.content.homeReviews` est déclaré dans `src/api/endpoints.ts`
 * (→ `/content/home-reviews`), mais l'endpoint n'est pas implémenté dans
 * `src/api/resources/content.ts` (hors périmètre de cette vague). Le câblage
 * http sera réalisé en phase 4 lors de la mise en place du backend.
 *
 * Comportement retenu (AGENTS.md §7 — jamais d'échec silencieux) :
 *  - Mode mock : implémentation complète via le store local.
 *  - Mode http : échoue explicitement avec un message renvoyant à la phase 4,
 *    plutôt que de tomber silencieusement ou de renvoyer une liste vide sans
 *    avertissement.
 */
import { useCallback, useMemo } from "react";

import { isHttpMode } from "@/api/config";
import { getAdminSnapshot, upsertHomeReview, deleteHomeReview } from "@/lib/admin-store";
import type { HomeReview } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const HOME_REVIEWS_RESOURCE = "home-reviews";

/**
 * Repli de liste : référence **stable au niveau module**.
 */
const NO_HOME_REVIEWS: HomeReview[] = [];

/**
 * Message d'erreur explicite renvoyé lorsque le mode http est actif.
 * L'absence d'implémentation dans `content.ts` est signalée ici pour ne pas
 * bloquer silencieusement les vues.
 */
function httpNotImplementedError(): Promise<never> {
  return Promise.reject(
    new Error(
      "[home-reviews] L'endpoint /content/home-reviews n'est pas encore câblé côté client " +
        "(src/api/resources/content.ts hors périmètre vague 2.3). " +
        "L'implémentation http est prévue en phase 4 — voir PLAN.md.",
    ),
  );
}

/**
 * Liste des avis d'accueil — section vitrine de la page d'accueil.
 *
 * Remplace `useAdminState().homeReviews`.
 */
export function useHomeReviewList(): ResourceState<HomeReview[]> {
  return useResource<HomeReview[]>({
    key: HOME_REVIEWS_RESOURCE,
    fromStore: (state) => state.homeReviews,
    fromHttp: () => httpNotImplementedError(),
    fallback: NO_HOME_REVIEWS,
  });
}

export type HomeReviewMutations = {
  upsert: (review: HomeReview) => Promise<HomeReview>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations avis d'accueil. Toujours asynchrones, y compris en mock.
 *
 * En mode http : échouent explicitement avant la phase 4.
 */
export function useHomeReviewMutations(): HomeReviewMutations {
  const upsert = useCallback(
    (review: HomeReview) =>
      runMutation(HOME_REVIEWS_RESOURCE, "upsert", () => {
        if (isHttpMode()) return httpNotImplementedError();
        upsertHomeReview(review);
        return Promise.resolve(review);
      }),
    [],
  );

  const remove = useCallback(
    (id: string) =>
      runMutation(HOME_REVIEWS_RESOURCE, "remove", () => {
        if (isHttpMode()) return httpNotImplementedError();
        deleteHomeReview(id);
        return Promise.resolve();
      }),
    [],
  );

  return useMemo(() => ({ upsert, remove }), [upsert, remove]);
}
