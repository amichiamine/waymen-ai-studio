import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, upsertCoupon, deleteCoupon, validateCoupon } from "@/lib/admin-store";
import type { Coupon, CouponCheckResult, Paginated, ListQuery } from "../types";

function paginateLocal(items: Coupon[], q: ListQuery = {}): Paginated<Coupon> {
  const page = q.page ?? 1;
  const perPage = q.perPage ?? (items.length || 1);
  let list = items;
  if (q.search) {
    const s = q.search.toLowerCase();
    list = list.filter((c) => c.code.toLowerCase().includes(s));
  }
  return {
    items: list.slice((page - 1) * perPage, page * perPage),
    total: list.length,
    page,
    perPage,
  };
}

export const couponsApi = {
  async list(query: ListQuery = {}): Promise<Paginated<Coupon>> {
    if (isHttpMode()) return http.get<Paginated<Coupon>>(E.coupons.list(), query);
    return paginateLocal(getAdminSnapshot().coupons, query);
  },

  async detail(code: string): Promise<Coupon | undefined> {
    if (isHttpMode()) return http.get<Coupon>(E.coupons.detail(code));
    return getAdminSnapshot().coupons.find((c) => c.code === code);
  },

  async create(input: Coupon): Promise<Coupon> {
    if (isHttpMode()) return http.post<Coupon>(E.coupons.create(), input);
    upsertCoupon(input);
    return input;
  },

  async update(code: string, input: Coupon): Promise<Coupon> {
    if (isHttpMode()) return http.patch<Coupon>(E.coupons.update(code), input);
    upsertCoupon({ ...input, code });
    return { ...input, code };
  },

  async remove(code: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.coupons.remove(code));
      return;
    }
    deleteCoupon(code);
  },

  /**
   * Valide un code coupon pour un montant donné.
   *
   * En mode http : POST /coupons/validate (cf. endpoints.ts).
   * En mode mock : délègue à `validateCoupon()` de admin-store, qui est la
   * source de vérité locale.
   *
   * Retourne un `CouponCheckResult` normalisé. En cas d'échec métier (coupon
   * invalide, expiré, etc.) la mutation rejette avec une erreur descriptive
   * pour que l'appelant puisse l'afficher à l'utilisateur.
   */
  async validate(code: string, subtotal: number): Promise<CouponCheckResult> {
    if (isHttpMode()) {
      return http.post<CouponCheckResult>(E.coupons.validate(), { code, subtotal });
    }
    const result = validateCoupon(code, subtotal);
    if (result.ok) {
      return {
        valid: true,
        code: result.coupon.code,
        discount: result.discount,
        type: result.coupon.type,
      };
    }
    return { valid: false, reason: result.error };
  },
};
