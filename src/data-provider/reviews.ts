import { useCallback, useMemo } from "react";

import { reviewsApi } from "@/api/resources/reviews";
import type { Review, ReviewStatus } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const REVIEWS_RESOURCE = "reviews";

/**
 * Replis de liste : références **stables au niveau module**.
 * Un `[]` littéral recréé à chaque rendu suffirait à invalider tous les mémos
 * en aval.
 */
const NO_REVIEWS: Review[] = [];

/**
 * Liste complète des avis — panneau admin.
 *
 * Remplace `useAdminState().reviews` (tous statuts confondus).
 */
export function useReviewList(): ResourceState<Review[]> {
  return useResource<Review[]>({
    key: REVIEWS_RESOURCE,
    fromStore: (state) => state.reviews,
    fromHttp: async () => reviewsApi.list(),
    fallback: NO_REVIEWS,
  });
}

/**
 * Avis d'un produit — surface visiteur.
 *
 * Ne renvoie QUE les avis approuvés, comme le fait `Product.tsx` avant
 * migration (filtrage sur `status === "approved"`). Ce contrat est vérifié
 * dans `src/pages/Product.tsx` : l'affichage public travaille exclusivement
 * sur `stats.approved`.
 *
 * `productId` optionnel : le hook reste monté et inactif quand l'identifiant
 * n'est pas encore connu (paramètre d'URL en cours de résolution). Ne jamais
 * court-circuiter l'appel du hook lui-même.
 */
export function useProductReviewList(productId?: string): ResourceState<Review[]> {
  const key = productId
    ? `${REVIEWS_RESOURCE}/product/${productId}/approved`
    : `${REVIEWS_RESOURCE}/product/inactif`;

  return useResource<Review[]>({
    key,
    enabled: Boolean(productId),
    fromStore: (state) =>
      productId
        ? state.reviews.filter((r) => r.productId === productId && r.status === "approved")
        : NO_REVIEWS,
    fromHttp: async () => {
      if (!productId) return NO_REVIEWS;
      const all = await reviewsApi.byProduct(productId);
      // Le backend doit renvoyer uniquement les avis approuvés pour l'endpoint
      // public. On filtre côté client par prudence pour le mode http, miroir du
      // comportement mock.
      return all.filter((r) => r.status === "approved");
    },
    fallback: NO_REVIEWS,
  });
}

export type ReviewMutations = {
  create: (
    productId: string,
    input: {
      productName: string;
      customerName: string;
      rating: number;
      title: string;
      body: string;
    },
  ) => Promise<Review>;
  moderate: (id: string, status: ReviewStatus) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations avis. Toujours asynchrones, y compris en mock.
 *
 * Partagées entre `useReviewList` (admin) et `useProductReviewList`
 * (visiteur) — un seul hook de mutations pour les deux vues, conformément
 * au tableau de correspondance de `DATA-PROVIDER.md`.
 */
export function useReviewMutations(): ReviewMutations {
  const create = useCallback(
    (
      productId: string,
      input: {
        productName: string;
        customerName: string;
        rating: number;
        title: string;
        body: string;
      },
    ) => runMutation(REVIEWS_RESOURCE, "create", () => reviewsApi.create(productId, input)),
    [],
  );

  const moderate = useCallback(
    (id: string, status: ReviewStatus) =>
      runMutation(REVIEWS_RESOURCE, "moderate", () => reviewsApi.moderate(id, status)),
    [],
  );

  const remove = useCallback(
    (id: string) => runMutation(REVIEWS_RESOURCE, "remove", () => reviewsApi.remove(id)),
    [],
  );

  return useMemo(() => ({ create, moderate, remove }), [create, moderate, remove]);
}
