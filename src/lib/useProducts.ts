import { useAdminState } from "./admin-store";
import type { Product } from "@/data/products";

/**
 * Source unique de vérité pour les produits côté vitrine.
 * Lit toujours depuis admin-store (persisté en localStorage, éditable via /admin).
 */
export function useProducts(): Product[] {
  return useAdminState().products;
}

export function useProduct(id?: string): Product | undefined {
  const list = useProducts();
  return id ? list.find((p) => p.id === id) : undefined;
}
