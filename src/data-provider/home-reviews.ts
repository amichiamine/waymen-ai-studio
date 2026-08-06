import { useCallback, useMemo } from "react";

import { homeReviewsApi } from "@/api/resources/content";
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
 * Liste des avis d'accueil — section vitrine de la page d'accueil.
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : lecture de `GET /content/home-reviews` → section `home-reviews`
 * (stockée dans la table `site_content`, pas dans une table dédiée).
 */
export function useHomeReviewList(): ResourceState<HomeReview[]> {
  return useResource<HomeReview[]>({
    key: HOME_REVIEWS_RESOURCE,
    fromStore: (state) => state.homeReviews,
    fromHttp: async () => (await homeReviewsApi.list()).items,
    fallback: NO_HOME_REVIEWS,
  });
}

export type HomeReviewMutations = {
  upsert: (review: HomeReview) => Promise<HomeReview>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations avis d'accueil. Toujours asynchrones, y compris en mock.
 */
export function useHomeReviewMutations(): HomeReviewMutations {
  const upsert = useCallback(
    (review: HomeReview) =>
      runMutation(HOME_REVIEWS_RESOURCE, "upsert", () => homeReviewsApi.upsert(review)),
    [],
  );

  const remove = useCallback(
    (id: string) => runMutation(HOME_REVIEWS_RESOURCE, "remove", () => homeReviewsApi.remove(id)),
    [],
  );

  return useMemo(() => ({ upsert, remove }), [upsert, remove]);
}
