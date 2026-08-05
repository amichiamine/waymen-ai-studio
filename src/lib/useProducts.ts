import { useProductDetail, useProductList } from "@/data-provider";
import type { Product } from "@/data/products";

/**
 * Source unique de vérité pour les produits côté vitrine.
 *
 * Réécrit par-dessus `@/data-provider` (phase 2) : ce hook ne lit plus
 * `admin-store` directement, mais sa **signature publique est inchangée** — neuf
 * composants en dépendent et aucun ne devait bouger dans cette vague.
 *
 * Contrepartie assumée de cette signature synchrone : `loading` et `error` sont
 * masqués. En mode http, la liste est vide le temps du premier aller-retour et
 * un échec n'est visible que dans le journal du fournisseur. C'est acceptable
 * pour une section secondaire (accueil, ventes flash) dont l'absence passe
 * inaperçue ; ce n'est **pas** acceptable pour un écran dont les produits sont
 * le contenu principal. Ces écrans-là appellent `useProductList()` et traitent
 * les trois états — voir `src/pages/Search.tsx` et `docs/DATA-PROVIDER.md` §5.
 */
export function useProducts(): Product[] {
  return useProductList().data;
}

/**
 * Un produit par identifiant.
 *
 * Passe par `useProductDetail` plutôt que par un `find()` sur la liste : en mode
 * http, cela évite de télécharger tout le catalogue pour afficher une fiche.
 * Le hook est toujours appelé, même sans `id` — il se désactive alors de
 * lui-même (`docs/DATA-PROVIDER.md` §6).
 */
export function useProduct(id?: string): Product | undefined {
  return useProductDetail(id).data;
}
