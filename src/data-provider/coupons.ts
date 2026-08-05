import { useCallback, useMemo } from "react";

import { couponsApi } from "@/api/resources/coupons";
import type { Coupon, CouponCheckResult } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const COUPONS_RESOURCE = "coupons";

/** Repli de liste : référence stable au niveau module. */
const NO_COUPONS: Coupon[] = [];

/**
 * Liste des coupons — remplace `useAdminState().coupons`.
 */
export function useCouponList(): ResourceState<Coupon[]> {
  return useResource<Coupon[]>({
    key: COUPONS_RESOURCE,
    fromStore: (state) => state.coupons,
    fromHttp: async () => (await couponsApi.list()).items,
    fallback: NO_COUPONS,
  });
}

/**
 * Détail d'un coupon par son code.
 *
 * `code` optionnel : le hook reste monté et inactif quand le code n'est pas
 * encore connu.
 */
export function useCouponDetail(code?: string): ResourceState<Coupon | undefined> {
  const key = code ? `${COUPONS_RESOURCE}/${code}` : `${COUPONS_RESOURCE}/inactif`;

  return useResource<Coupon | undefined>({
    key,
    enabled: Boolean(code),
    fromStore: (state) => (code ? state.coupons.find((c) => c.code === code) : undefined),
    fromHttp: async () => (code ? couponsApi.detail(code) : undefined),
    fallback: undefined,
  });
}

export type CouponMutations = {
  create: (input: Coupon) => Promise<Coupon>;
  update: (code: string, input: Coupon) => Promise<Coupon>;
  remove: (code: string) => Promise<void>;
  /**
   * Valide un code coupon pour un montant donné.
   *
   * En mode http : POST /coupons/validate.
   * En mode mock : délègue à `validateCoupon()` du store via `couponsApi.validate()`.
   *
   * Rejette avec une `ApiError` normalisée en cas d'échec réseau ou métier,
   * afin que l'appelant puisse distinguer un refus métier d'une panne réseau
   * et afficher le bon message à l'utilisateur.
   */
  validate: (code: string, subtotal: number) => Promise<CouponCheckResult>;
};

/**
 * Mutations coupons. Toujours asynchrones, y compris en mock.
 */
export function useCouponMutations(): CouponMutations {
  const create = useCallback(
    (input: Coupon) => runMutation(COUPONS_RESOURCE, "create", () => couponsApi.create(input)),
    [],
  );

  const update = useCallback(
    (code: string, input: Coupon) =>
      runMutation(COUPONS_RESOURCE, "update", () => couponsApi.update(code, input)),
    [],
  );

  const remove = useCallback(
    (code: string) => runMutation(COUPONS_RESOURCE, "remove", () => couponsApi.remove(code)),
    [],
  );

  const validate = useCallback(
    (code: string, subtotal: number) =>
      runMutation(COUPONS_RESOURCE, "validate", () => couponsApi.validate(code, subtotal)),
    [],
  );

  return useMemo(() => ({ create, update, remove, validate }), [create, update, remove, validate]);
}
