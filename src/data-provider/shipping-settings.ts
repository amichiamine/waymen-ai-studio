import { useCallback, useMemo } from "react";

import { settingsApi } from "@/api/resources/content";
import type { ShippingSettings } from "@/api/types";
import { updateShippingSettings, getAdminSnapshot } from "@/lib/admin-store";
import { isHttpMode } from "@/api/config";
import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Clé de cache de la ressource singleton. */
export const SHIPPING_SETTINGS_RESOURCE = "shipping-settings";

/**
 * Repli singleton : référence stable au niveau module.
 *
 * Les réglages sont un objet unique, pas une liste. Le repli est un objet
 * exploitable (valeurs par défaut du store) plutôt qu'`undefined` — non
 * négociable selon DATA-PROVIDER.md §2.1.
 */
const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  freeShippingThreshold: 0,
  homeEnabled: true,
  deskEnabled: true,
};

/**
 * Réglages de livraison (singleton) — remplace `useAdminState().shippingSettings`.
 *
 * `data` est toujours un objet exploitable grâce au repli ci-dessus.
 * Forme de retour : `{ data, loading, error, refetch }` — non négociable.
 */
export function useShippingSettings(): ResourceState<ShippingSettings> {
  return useResource<ShippingSettings>({
    key: SHIPPING_SETTINGS_RESOURCE,
    fromStore: (state) => state.shippingSettings,
    fromHttp: async () => settingsApi.shipping(),
    fallback: DEFAULT_SHIPPING_SETTINGS,
  });
}

export type ShippingSettingsMutations = {
  update: (patch: Partial<ShippingSettings>) => Promise<void>;
};

async function updateSettingsHttp(patch: Partial<ShippingSettings>): Promise<void> {
  await http.patch<void>(E.settings.shipping(), patch);
}

async function updateSettingsMock(patch: Partial<ShippingSettings>): Promise<void> {
  updateShippingSettings(patch);
  // Vérification que les réglages ont bien été appliqués.
  void getAdminSnapshot().shippingSettings;
}

/**
 * Mutations des réglages de livraison. Toujours asynchrones, y compris en mock.
 */
export function useShippingSettingsMutations(): ShippingSettingsMutations {
  const update = useCallback(
    (patch: Partial<ShippingSettings>) =>
      runMutation(SHIPPING_SETTINGS_RESOURCE, "update", () =>
        isHttpMode() ? updateSettingsHttp(patch) : updateSettingsMock(patch),
      ),
    [],
  );

  return useMemo(() => ({ update }), [update]);
}
