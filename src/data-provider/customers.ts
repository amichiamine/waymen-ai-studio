import { useCallback, useMemo } from "react";

import { customersApi } from "@/api/resources/customers";
import type { Customer, ListQuery } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const CUSTOMERS_RESOURCE = "customers";

/** Repli de liste : référence stable au niveau module. */
const NO_CUSTOMERS: Customer[] = [];

/**
 * Liste des clients — remplace `useAdminState().customers`.
 */
export function useCustomerList(query: ListQuery = {}): ResourceState<Customer[]> {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => [name, String(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => `${name}=${value}`);
  const key = parts.length > 0 ? `${CUSTOMERS_RESOURCE}?${parts.join("&")}` : CUSTOMERS_RESOURCE;

  return useResource<Customer[]>({
    key,
    fromStore: (state) => {
      let items = state.customers;
      if (query.search) {
        const s = query.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.name.toLowerCase().includes(s) ||
            c.email.toLowerCase().includes(s) ||
            c.phone.includes(s),
        );
      }
      return items;
    },
    fromHttp: async () => (await customersApi.list(query)).items,
    fallback: NO_CUSTOMERS,
  });
}

/**
 * Détail d'un client.
 *
 * `id` optionnel : le hook reste monté et inactif quand l'identifiant n'est
 * pas encore connu.
 */
export function useCustomerDetail(id?: string): ResourceState<Customer | undefined> {
  const key = id ? `${CUSTOMERS_RESOURCE}/${id}` : `${CUSTOMERS_RESOURCE}/inactif`;

  return useResource<Customer | undefined>({
    key,
    enabled: Boolean(id),
    fromStore: (state) => (id ? state.customers.find((c) => c.id === id) : undefined),
    fromHttp: async () => (id ? customersApi.detail(id) : undefined),
    fallback: undefined,
  });
}

export type CustomerMutations = {
  upsert: (input: Customer) => Promise<Customer>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations clients. Toujours asynchrones, y compris en mock.
 */
export function useCustomerMutations(): CustomerMutations {
  const upsert = useCallback(
    (input: Customer) =>
      runMutation(CUSTOMERS_RESOURCE, "upsert", () => customersApi.upsert(input)),
    [],
  );

  const remove = useCallback(
    (id: string) => runMutation(CUSTOMERS_RESOURCE, "remove", () => customersApi.remove(id)),
    [],
  );

  return useMemo(() => ({ upsert, remove }), [upsert, remove]);
}
