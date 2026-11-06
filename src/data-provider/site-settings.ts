import { useCallback, useEffect, useMemo } from "react";

import { settingsApi } from "@/api/resources/content";
import type { SiteSettings } from "@/api/types";
import { updateSiteSettings, getAdminSnapshot } from "@/lib/admin-store";
import { setCurrencyConfig, type CurrencyConfig } from "@/data/products";
import { isHttpMode } from "@/api/config";

import { normaliserSingleton } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import { writeCache } from "./cache";
import type { ResourceState } from "./types";
import { resoudreUrlMedia } from "@/components/media-url";

/** Clé de cache de la ressource singleton. */
export const SITE_SETTINGS_RESOURCE = "site-settings";

declare global {
  interface Window {
    __SITE_SETTINGS_BOOTSTRAP__?: {
      storeName?: string;
      logoUrl?: string;
      defaultTheme?: "dark" | "light" | "system";
      primaryColor?: string;
      faviconUrl?: string;
      builderEnabled?: boolean;
      [key: string]: unknown;
    };
  }
}

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
  maintenanceTitle: "",
  maintenanceEstimatedReturn: "",
  maintenanceShowWhatsApp: false,
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
  languageSelectorEnabled: true,
  hideRatingWhenNoReviews: true,
  logoUrl: "",
  defaultTheme: "dark",
  primaryColor: "",
  faviconUrl: "",
  builderEnabled: true,
  onboardingCompleted: true,
};

/**
 * Applique immédiatement le style et favicon dynamiques dans le DOM.
 */
export function appliquerBrandingDynamique(settings: Partial<SiteSettings>): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 1. Couleur primaire
  if (settings.primaryColor && settings.primaryColor.trim()) {
    root.style.setProperty("--primary", settings.primaryColor);
    root.style.setProperty("--ring", settings.primaryColor);
    root.style.setProperty("--primary-glow", settings.primaryColor);
  } else if (settings.primaryColor === "") {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--primary-glow");
  }

  // 2. Favicon
  if (settings.faviconUrl !== undefined) {
    const faviconUrl = settings.faviconUrl.trim();
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      if (faviconUrl) {
        link.href = resoudreUrlMedia(faviconUrl);
      } else {
        link.href = "/favicon.ico";
      }
    }
  }
}

/**
 * Récupère les réglages initiaux de façon synchrone au Tick 0ms :
 * 1. window.__SITE_SETTINGS_BOOTSTRAP__ (injecté par le serveur PHP / SSR)
 * 2. localStorage ("katech_site_settings")
 * 3. DEFAULT_SITE_SETTINGS
 */
export function getInitialSiteSettings(): SiteSettings {
  let settings = { ...DEFAULT_SITE_SETTINGS };
  if (typeof window !== "undefined") {
    if (window.__SITE_SETTINGS_BOOTSTRAP__) {
      settings = { ...settings, ...window.__SITE_SETTINGS_BOOTSTRAP__ };
    } else {
      try {
        const saved = localStorage.getItem("katech_site_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            settings = { ...settings, ...parsed };
          }
        }
      } catch {
        // Ignorer l'erreur localStorage
      }
    }
  }
  return settings;
}

// Initialisation anticipée du cache mémoire pour useResource au chargement du module.
// SEUL le bootstrap direct du serveur PHP (source BD souveraine) a le droit
// de pré-remplir le cache mémoire à 0 ms.
// Si le bootstrap serveur est absent, on applique le repli visuel pour le rendu
// immédiat, mais on NE remplit PAS le cache : useResource fera l'appel réseau
// HTTP vers la base de données dès le premier montage.
if (typeof window !== "undefined") {
  const initial = getInitialSiteSettings();
  if (window.__SITE_SETTINGS_BOOTSTRAP__ && initial && initial.storeName) {
    writeCache(SITE_SETTINGS_RESOURCE, initial);
  }
  appliquerBrandingDynamique(initial);
}

function persistSettingsLocally(patch: Partial<SiteSettings>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getInitialSiteSettings();
    const updated = { ...existing, ...patch };
    localStorage.setItem("katech_site_settings", JSON.stringify(updated));
    if (patch.storeName) {
      localStorage.setItem("katech_site_settings_name", patch.storeName);
    }
  } catch {
    // Ignorer l'erreur d'écriture (mode privé ou quota plein)
  }
}

/**
 * Réglages de la boutique (singleton) — remplace `useAdminState().siteSettings`.
 *
 * `data` est toujours un objet exploitable grâce au repli ci-dessus.
 * Forme de retour : `{ data, loading, error, refetch }` — non négociable.
 */
export function useSiteSettings(): ResourceState<SiteSettings> {
  const resource = useResource<SiteSettings>({
    key: SITE_SETTINGS_RESOURCE,
    fromStore: (state) => state.siteSettings,
    fromHttp: async () => settingsApi.site(),
    fallback: getInitialSiteSettings(),
    // Même exposition que `site-content` : sur une base neuve l'API répond
    // `{}` ici, et pourrait répondre `[]` le jour où la table est vide côté
    // serveur. La fusion garantit en outre qu'un objet PARTIEL — seuls
    // quelques réglages enregistrés — ne laisse pas les autres à `undefined`.
    normaliser: (brut) => normaliserSingleton(SITE_SETTINGS_RESOURCE, DEFAULT_SITE_SETTINGS, brut),
  });

  // Synchronise en continu le formateur universel de prix de la vitrine,
  // applique le branding dynamique (couleur primaire, favicon),
  // et met à jour le cache persistant localStorage pour le prochain rechargement à 0ms
  useEffect(() => {
    if (resource.data) {
      setCurrencyConfig({
        symbol: resource.data.currencySymbol,
        position: resource.data.currencyPosition,
        thousandSeparator: (resource.data.currencyThousandSeparator ||
          "") as CurrencyConfig["thousandSeparator"],
      });

      appliquerBrandingDynamique(resource.data);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("katech_site_settings", JSON.stringify(resource.data));
          if (resource.data.storeName) {
            localStorage.setItem("katech_site_settings_name", resource.data.storeName);
          }
        } catch {
          // Ignorer l'erreur de sauvegarde localStorage
        }
      }
    }
  }, [resource.data]);

  return resource;
}

export type SiteSettingsMutations = {
  update: (patch: Partial<SiteSettings>) => Promise<void>;
};

async function updateSettingsHttp(patch: Partial<SiteSettings>): Promise<void> {
  // Vérité BD souveraine : l'écriture en base de données doit réussir AVANT
  // toute mise à jour du cache local, évitant tout faux positif visuel.
  await settingsApi.updateSite(patch);
  persistSettingsLocally(patch);
  if (
    patch.currencySymbol ||
    patch.currencyPosition ||
    patch.currencyThousandSeparator !== undefined
  ) {
    setCurrencyConfig({
      symbol: patch.currencySymbol,
      position: patch.currencyPosition,
      thousandSeparator: (patch.currencyThousandSeparator ||
        "") as CurrencyConfig["thousandSeparator"],
    });
  }
}

async function updateSettingsMock(patch: Partial<SiteSettings>): Promise<void> {
  persistSettingsLocally(patch);
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
