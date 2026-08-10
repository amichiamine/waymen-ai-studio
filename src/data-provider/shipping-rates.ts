import { useCallback, useMemo } from "react";

import { settingsApi } from "@/api/resources/content";
import type { ShippingRate } from "@/api/types";
import { upsertShippingRate, deleteShippingRate, getAdminSnapshot } from "@/lib/admin-store";
import { isHttpMode } from "@/api/config";
import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";

import { normaliserListe } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const SHIPPING_RATES_RESOURCE = "shipping-rates";

/**
 * Repli de liste : référence stable au niveau module.
 */
const NO_SHIPPING_RATES: ShippingRate[] = [];

/**
 * Liste des tarifs de livraison par wilaya — remplace `useAdminState().shippingRates`.
 *
 * Note : la liste des wilayas elle-même (`src/data/wilayas.ts`) est une donnée
 * statique et ne transite pas par ce provider.
 */
export function useShippingRateList(): ResourceState<ShippingRate[]> {
  return useResource<ShippingRate[]>({
    key: SHIPPING_RATES_RESOURCE,
    fromStore: (state) => state.shippingRates,
    fromHttp: async () => settingsApi.shippingRates(),
    normaliser: (brut) => normaliserListe(SHIPPING_RATES_RESOURCE, brut, NO_SHIPPING_RATES),
    fallback: NO_SHIPPING_RATES,
  });
}

export type ShippingRateMutations = {
  upsert: (rate: ShippingRate) => Promise<ShippingRate>;
  remove: (wilayaCode: string) => Promise<void>;
};

async function upsertRateHttp(rate: ShippingRate): Promise<ShippingRate> {
  return http.put<ShippingRate>(E.settings.shippingRateUpsert(rate.wilayaCode), rate);
}

async function removeRateHttp(wilayaCode: string): Promise<void> {
  await http.del<void>(E.settings.shippingRateRemove(wilayaCode));
}

async function upsertRateMock(rate: ShippingRate): Promise<ShippingRate> {
  upsertShippingRate(rate);
  return getAdminSnapshot().shippingRates.find(
    (r) => r.wilayaCode === rate.wilayaCode,
  ) as ShippingRate;
}

async function removeRateMock(wilayaCode: string): Promise<void> {
  deleteShippingRate(wilayaCode);
}

/**
 * Mutations des tarifs de livraison. Toujours asynchrones, y compris en mock.
 */
export function useShippingRateMutations(): ShippingRateMutations {
  const upsert = useCallback(
    (rate: ShippingRate) =>
      runMutation(SHIPPING_RATES_RESOURCE, "upsert", () =>
        isHttpMode() ? upsertRateHttp(rate) : upsertRateMock(rate),
      ),
    [],
  );

  const remove = useCallback(
    (wilayaCode: string) =>
      runMutation(SHIPPING_RATES_RESOURCE, "remove", () =>
        isHttpMode() ? removeRateHttp(wilayaCode) : removeRateMock(wilayaCode),
      ),
    [],
  );

  return useMemo(() => ({ upsert, remove }), [upsert, remove]);
}
