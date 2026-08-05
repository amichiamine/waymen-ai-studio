import { useCallback, useMemo } from "react";

import { settingsApi } from "@/api/resources/content";
import type { PaymentMethod } from "@/api/types";
import { upsertPaymentMethod, deletePaymentMethod, getAdminSnapshot } from "@/lib/admin-store";
import { isHttpMode } from "@/api/config";
import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const PAYMENT_METHODS_RESOURCE = "payment-methods";

/**
 * Repli de liste : référence stable au niveau module.
 */
const NO_PAYMENT_METHODS: PaymentMethod[] = [];

/**
 * Liste des modes de paiement — remplace `useAdminState().paymentMethods`.
 */
export function usePaymentMethodList(): ResourceState<PaymentMethod[]> {
  return useResource<PaymentMethod[]>({
    key: PAYMENT_METHODS_RESOURCE,
    fromStore: (state) => state.paymentMethods,
    fromHttp: async () => settingsApi.payments(),
    fallback: NO_PAYMENT_METHODS,
  });
}

export type PaymentMethodMutations = {
  upsert: (method: PaymentMethod) => Promise<PaymentMethod>;
  remove: (id: string) => Promise<void>;
};

async function upsertMethodHttp(method: PaymentMethod): Promise<PaymentMethod> {
  return http.patch<PaymentMethod>(`${E.settings.payments()}/${method.id}`, method);
}

async function removeMethodHttp(id: string): Promise<void> {
  await http.del<void>(`${E.settings.payments()}/${id}`);
}

async function upsertMethodMock(method: PaymentMethod): Promise<PaymentMethod> {
  upsertPaymentMethod(method);
  return getAdminSnapshot().paymentMethods.find((m) => m.id === method.id) as PaymentMethod;
}

async function removeMethodMock(id: string): Promise<void> {
  deletePaymentMethod(id);
}

/**
 * Mutations des modes de paiement. Toujours asynchrones, y compris en mock.
 */
export function usePaymentMethodMutations(): PaymentMethodMutations {
  const upsert = useCallback(
    (method: PaymentMethod) =>
      runMutation(PAYMENT_METHODS_RESOURCE, "upsert", () =>
        isHttpMode() ? upsertMethodHttp(method) : upsertMethodMock(method),
      ),
    [],
  );

  const remove = useCallback(
    (id: string) =>
      runMutation(PAYMENT_METHODS_RESOURCE, "remove", () =>
        isHttpMode() ? removeMethodHttp(id) : removeMethodMock(id),
      ),
    [],
  );

  return useMemo(() => ({ upsert, remove }), [upsert, remove]);
}
