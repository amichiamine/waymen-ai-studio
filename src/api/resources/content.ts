import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import {
  getAdminSnapshot,
  setSiteContentSection,
  updateSiteSettings,
  upsertHomeReview,
  deleteHomeReview,
  type HomeReview,
} from "@/lib/admin-store";
import type {
  SiteContent,
  SiteSettings,
  ShippingSettings,
  ShippingRate,
  PaymentMethod,
  Paginated,
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

export const homeReviewsApi = {
  async list(): Promise<Paginated<HomeReview>> {
    if (isHttpMode()) return http.get<Paginated<HomeReview>>(E.content.homeReviews());
    const items = getAdminSnapshot().homeReviews;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async upsert(review: HomeReview): Promise<HomeReview> {
    if (isHttpMode()) {
      const current = await http.get<Paginated<HomeReview>>(E.content.homeReviews());
      const items = current.items.filter((r) => r.id !== review.id);
      items.push(review);
      await http.patch<void>(E.content.homeReviews(), { items });
      return review;
    }
    upsertHomeReview(review);
    return review;
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      const current = await http.get<Paginated<HomeReview>>(E.content.homeReviews());
      const items = current.items.filter((r) => r.id !== id);
      await http.patch<void>(E.content.homeReviews(), { items });
      return;
    }
    deleteHomeReview(id);
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
