import { useCallback, useMemo } from "react";

import { inventoryApi } from "@/api/resources/inventory";
import type { StockAdjustInput } from "@/api/resources/inventory";
import type { StockMovement } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const STOCK_MOVEMENTS_RESOURCE = "stock-movements";

/**
 * Repli de liste : référence stable au niveau module.
 * Un `[]` littéral recréé à chaque rendu invaliderait tous les mémos en aval.
 */
const NO_STOCK_MOVEMENTS: StockMovement[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste des mouvements de stock — remplace `useAdminState().stockMovements`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 mouvements.
 */
export function useStockMovementList(): ResourceState<StockMovement[]> {
  return useResource<StockMovement[]>({
    key: STOCK_MOVEMENTS_RESOURCE,
    fromStore: (state) => state.stockMovements,
    fromHttp: async () => inventoryApi.movements({ perPage: DEFAULT_PER_PAGE }),
    fallback: NO_STOCK_MOVEMENTS,
  });
}

export type InventoryMutations = {
  /**
   * Ajustement atomique côté serveur.
   *
   * Transmet un delta au serveur, jamais un couple (lecture + écriture).
   * En phase 4, l'endpoint `PATCH /inventory/:id/adjust` sera servi par une
   * transaction SQLite `IMMEDIATE` : le serveur est le seul arbitre du stock.
   */
  adjustStock: (productId: string, input: StockAdjustInput) => Promise<StockMovement>;
};

/**
 * Mutations d'inventaire. Toujours asynchrones, y compris en mock.
 */
export function useInventoryMutations(): InventoryMutations {
  const adjustStock = useCallback(
    (productId: string, input: StockAdjustInput) =>
      runMutation(STOCK_MOVEMENTS_RESOURCE, "adjustStock", () =>
        inventoryApi.adjustStock(productId, input),
      ),
    [],
  );

  return useMemo(() => ({ adjustStock }), [adjustStock]);
}
