import { useCallback, useMemo } from "react";

import { reviewsApi } from "@/api/resources/reviews";
import type { Review, ReviewStatus } from "@/api/types";
import type { Product, ProductRating } from "@/data/products";
import { useAdminState } from "@/lib/admin-store";

import { isHttpData } from "./mode";
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

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste complète des avis — panneau admin.
 *
 * Remplace `useAdminState().reviews` (tous statuts confondus).
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 avis.
 */
export function useReviewList(): ResourceState<Review[]> {
  return useResource<Review[]>({
    key: REVIEWS_RESOURCE,
    fromStore: (state) => state.reviews,
    fromHttp: async () => reviewsApi.list({ perPage: DEFAULT_PER_PAGE }),
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
      const all = await reviewsApi.byProduct(productId, { perPage: DEFAULT_PER_PAGE });
      // Le backend doit renvoyer uniquement les avis approuvés pour l'endpoint
      // public. On filtre côté client par prudence pour le mode http, miroir du
      // comportement mock.
      return all.filter((r) => r.status === "approved");
    },
    fallback: NO_REVIEWS,
  });
}

/** Aucun avis : référence stable au niveau module. */
const NO_RATING: ProductRating = { average: 0, count: 0 };

/** Moyenne et nombre d'avis approuvés d'un produit, dérivés d'une liste d'avis. */
function agreger(reviews: readonly Review[], productId: string): ProductRating {
  let somme = 0;
  let count = 0;
  for (const r of reviews) {
    if (r.productId !== productId || r.status !== "approved") continue;
    somme += r.rating;
    count += 1;
  }
  return count === 0 ? NO_RATING : { average: somme / count, count };
}

/**
 * Note moyenne et nombre d'avis approuvés d'un produit — surface **vitrine**.
 *
 * Pourquoi ce hook existe : la carte produit lisait `useReviewList()`, c'est-à-dire
 * `GET /reviews`, la liste d'**administration** protégée par la permission `read`.
 * Sur l'accueil, douze cartes en faisaient douze appels, et un visiteur non
 * connecté récoltait douze 401. Deux défauts en un — une route protégée sollicitée
 * depuis une page publique, et un appel par carte pour une seule et même liste.
 *
 * Source retenue, par mode :
 *   - **http** : l'agrégat livré par l'API **avec le produit** (`Product.rating`,
 *     calculé par `ControleurProduits::SELECTION` sur les avis approuvés). La
 *     donnée arrive dans la réponse publique `GET /products` déjà demandée par la
 *     page : **zéro requête supplémentaire**, aucune route protégée.
 *   - **mock** : dérivation depuis le magasin local, qui contient déjà les avis —
 *     comportement rigoureusement identique à l'existant, sans réseau.
 *
 * Aucun cache de ressource ici : en http la valeur voyage avec le produit, donc
 * elle est déjà aussi fraîche que lui. La mémoriser à part ne ferait que créer
 * une fenêtre de péremption sans rien économiser.
 */
export function useProductRating(product: Pick<Product, "id" | "rating">): ProductRating {
  // Toujours souscrit : un hook ne peut pas être appelé conditionnellement. En
  // mode http la souscription est inerte, exactement comme le moteur mock de
  // `useResource`.
  const state = useAdminState();
  const { id, rating } = product;

  return useMemo(
    () => (isHttpData() ? (rating ?? NO_RATING) : agreger(state.reviews, id)),
    [id, rating, state],
  );
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
