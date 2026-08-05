import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, setSiteContentSection, updateSiteSettings } from "@/lib/admin-store";
import type {
  SiteContent,
  SiteSettings,
  ShippingSettings,
  ShippingRate,
  PaymentMethod,
} from "../types";

export const contentApi = {
  async get(): Promise<SiteContent> {
    if (isHttpMode()) return http.get<SiteContent>(E.content.get());
    return getAdminSnapshot().siteContent;
  },
  async update(patch: Partial<SiteContent>): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.content.update(), patch);
      return;
    }
    Object.entries(patch).forEach(([k, v]) =>
      setSiteContentSection(k as keyof SiteContent, v as SiteContent[keyof SiteContent]),
    );
  },
};

export const settingsApi = {
  async site(): Promise<SiteSettings> {
    if (isHttpMode()) return http.get<SiteSettings>(E.settings.site());
    return getAdminSnapshot().siteSettings;
  },
  async updateSite(patch: Partial<SiteSettings>): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.settings.site(), patch);
      return;
    }
    updateSiteSettings(patch);
  },
  async shipping(): Promise<ShippingSettings> {
    if (isHttpMode()) return http.get<ShippingSettings>(E.settings.shipping());
    return getAdminSnapshot().shippingSettings;
  },
  async shippingRates(): Promise<ShippingRate[]> {
    if (isHttpMode()) return http.get<ShippingRate[]>(E.settings.shippingRates());
    return getAdminSnapshot().shippingRates;
  },
  async payments(): Promise<PaymentMethod[]> {
    if (isHttpMode()) return http.get<PaymentMethod[]>(E.settings.payments());
    return getAdminSnapshot().paymentMethods;
  },
};
