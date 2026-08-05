/**
 * Ressource API Inventaire.
 *
 * NOTE ARCHITECTURE — atomicité de l'ajustement de stock :
 *
 * La mutation `adjustStock` transmet un **delta** (quantité relative) ou une
 * quantité cible au serveur via `PATCH /inventory/:productId/adjust`, jamais
 * un couple (lecture locale + écriture). Cette conception est délibérée : en
 * phase 4, l'endpoint sera servi par une transaction SQLite `IMMEDIATE` avec
 * `UPDATE ... WHERE stock > 0`, ce qui garantit qu'aucune survente ne peut se
 * produire même en cas de requêtes concurrentes. Si le client lisait le stock
 * puis l'écrivait lui-même, deux sessions simultanées pourraient toutes deux
 * lire « 1 » et toutes deux valider, vendant le même article deux fois. Le
 * serveur est le seul arbitre du stock : le client ne fait que demander un
 * ajustement.
 *
 * NOTE MANQUE — `productsApi.updateStock()` :
 * L'endpoint `PATCH /products/:id/stock` est déclaré dans `endpoints.ts`
 * (`E.products.stock(id)`), mais `src/api/resources/products.ts` n'expose pas
 * de méthode `updateStock`. Ce fichier est hors périmètre et ne peut pas être
 * modifié. L'appel HTTP à cet endpoint est donc implémenté ici, dans
 * `inventoryApi.adjustStock`, pour la durée de la phase 2. Il devra être
 * déplacé dans `productsApi` en phase 3 quand la ressource produits sera
 * étendue.
 */
import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, adjustStock as storeAdjustStock } from "@/lib/admin-store";
import type { StockMovement } from "../types";

export type StockAdjustInput = {
  /** Variation relative : positif = entrée, négatif = sortie. */
  delta: number;
  reason: string;
};

export const inventoryApi = {
  async movements(): Promise<StockMovement[]> {
    if (isHttpMode()) return http.get<StockMovement[]>(E.inventory.movements());
    return getAdminSnapshot().stockMovements;
  },

  /**
   * Ajustement atomique côté serveur.
   *
   * En mode http : `PATCH /inventory/:productId/adjust` avec `{ delta, reason }`.
   * Le serveur applique le delta dans une transaction et renvoie le mouvement créé.
   * Le client ne lit jamais le stock courant avant d'envoyer la requête.
   *
   * En mode mock : délégation à `adjustStock()` du store, qui réplique la même
   * logique de façon synchrone mais sans garantie transactionnelle.
   */
  async adjustStock(productId: string, input: StockAdjustInput): Promise<StockMovement> {
    if (isHttpMode()) {
      return http.patch<StockMovement>(E.inventory.adjust(productId), input);
    }
    storeAdjustStock(productId, input.delta, input.reason);
    const movements = getAdminSnapshot().stockMovements;
    const mov = movements.find((m) => m.productId === productId);
    if (!mov) {
      throw new Error(`Produit ${productId} introuvable`);
    }
    return mov;
  },
};
