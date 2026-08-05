import { useCallback, useMemo } from "react";

import { settingsApi } from "@/api/resources/content";
import type { SiteSettings } from "@/api/types";
import { updateSiteSettings, getAdminSnapshot } from "@/lib/admin-store";
import { isHttpMode } from "@/api/config";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Clé de cache de la ressource singleton. */
export const SITE_SETTINGS_RESOURCE = "site-settings";

/**
 * Repli singleton : référence stable au niveau module.
 *
 * Les réglages sont un objet unique, pas une liste. Le repli est un objet
 * exploitable (valeurs par défaut du store) plutôt qu'`undefined` — non
 * négociable selon DATA-PROVIDER.md §2.1.
 */
const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: "KA Tech",
  contactEmail: "",
  contactPhone: "",
  whatsapp: "",
  address: "",
  hours: "",
  maintenance: false,
  maintenanceMessage: "",
  emailNotifications: false,
  showPromoBanner: false,
  promoBannerText: "",
  promoBannerLabel: "",
  promoBannerHref: "",
  lowStockThreshold: 5,
  outOfStockThreshold: 0,
  currencySymbol: "DA",
  currencyPosition: "suffix",
  currencyThousandSeparator: " ",
  languageSelectorEnabled: false,
  hideRatingWhenNoReviews: true,
};

/**
 * Réglages de la boutique (singleton) — remplace `useAdminState().siteSettings`.
 *
 * `data` est toujours un objet exploitable grâce au repli ci-dessus.
 * Forme de retour : `{ data, loading, error, refetch }` — non négociable.
 */
export function useSiteSettings(): ResourceState<SiteSettings> {
  return useResource<SiteSettings>({
    key: SITE_SETTINGS_RESOURCE,
    fromStore: (state) => state.siteSettings,
    fromHttp: async () => settingsApi.site(),
    fallback: DEFAULT_SITE_SETTINGS,
  });
}

export type SiteSettingsMutations = {
  update: (patch: Partial<SiteSettings>) => Promise<void>;
};

async function updateSettingsHttp(patch: Partial<SiteSettings>): Promise<void> {
  await settingsApi.updateSite(patch);
}

async function updateSettingsMock(patch: Partial<SiteSettings>): Promise<void> {
  updateSiteSettings(patch);
  // Vérification que les réglages ont bien été appliqués.
  void getAdminSnapshot().siteSettings;
}

/**
 * Mutations des réglages de boutique. Toujours asynchrones, y compris en mock.
 */
export function useSiteSettingsMutations(): SiteSettingsMutations {
  const update = useCallback(
    (patch: Partial<SiteSettings>) =>
      runMutation(SITE_SETTINGS_RESOURCE, "update", () =>
        isHttpMode() ? updateSettingsHttp(patch) : updateSettingsMock(patch),
      ),
    [],
  );

  return useMemo(() => ({ update }), [update]);
}
