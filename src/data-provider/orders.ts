import { useCallback, useMemo } from "react";

import { ordersApi, createOrderLocal } from "@/api/resources/orders";
import { useAuth } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/admin-store";
import type { CreateOrderInput, Order, OrderQuery, OrderStatus } from "@/api/types";
import { isHttpData } from "./mode";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const ORDERS_RESOURCE = "orders";

/** Repli de liste : référence stable au niveau module. */
const NO_ORDERS: Order[] = [];

/**
 * Sérialise la requête en clé stable par valeur.
 */
function orderListKey(query: OrderQuery): string {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => [name, String(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => `${name}=${value}`);
  return parts.length > 0 ? `${ORDERS_RESOURCE}?${parts.join("&")}` : ORDERS_RESOURCE;
}

/**
 * Liste de toutes les commandes — remplace `useAdminState().orders`.
 */
export function useOrderList(query: OrderQuery = {}): ResourceState<Order[]> {
  const key = orderListKey(query);

  return useResource<Order[]>({
    key,
    fromStore: (state) => {
      let items = state.orders;
      if (query.status) items = items.filter((o) => o.status === query.status);
      return items;
    },
    fromHttp: async () => (await ordersApi.list(query)).items,
    fallback: NO_ORDERS,
  });
}

/**
 * Détail d'une commande.
 *
 * `id` optionnel : le hook reste monté et inactif quand l'identifiant n'est
 * pas encore connu.
 */
export function useOrderDetail(id?: string): ResourceState<Order | undefined> {
  const key = id ? `${ORDERS_RESOURCE}/${id}` : `${ORDERS_RESOURCE}/inactif`;

  return useResource<Order | undefined>({
    key,
    enabled: Boolean(id),
    fromStore: (state) => (id ? state.orders.find((o) => o.id === id) : undefined),
    fromHttp: async () => (id ? ordersApi.detail(id) : undefined),
    fallback: undefined,
  });
}

/**
 * Commandes du client connecté.
 *
 * ATTENTION — défaut connu dans `ordersApi.mine()` (orders.ts ~ligne 34) :
 * en mode mock, cette méthode renvoie TOUTES les commandes du store sans
 * aucun filtrage par client. C'est une fuite de données entre clients.
 * Ce hook corrige le problème en filtrant côté provider sur l'id de
 * l'utilisateur connecté (`useAuth().user?.id`). La ressource API devra
 * être corrigée pour filtrer côté serveur (et côté mock).
 */
export function useMyOrderList(): ResourceState<Order[]> {
  const { user } = useAuth();
  const customerId = user?.id ?? "";
  const key = customerId
    ? `${ORDERS_RESOURCE}/mine/${customerId}`
    : `${ORDERS_RESOURCE}/mine/anonymous`;

  return useResource<Order[]>({
    key,
    // Inactif si aucun utilisateur connecté.
    enabled: Boolean(customerId),
    fromStore: (state) =>
      customerId ? state.orders.filter((o) => o.customerId === customerId) : NO_ORDERS,
    // En http, le backend filtre lui-même via GET /me/orders ; on ne refiltre
    // pas côté client pour ne pas dépendre d'un champ que le serveur ne renvoie
    // peut-être pas dans la liste.
    fromHttp: async () => ordersApi.mine(),
    fallback: NO_ORDERS,
  });
}

export type OrderMutations = {
  create: (input: CreateOrderInput) => Promise<{ id: string }>;
  updateStatus: (id: string, status: OrderStatus, note?: string) => Promise<void>;
};

/**
 * Mutations commandes.
 *
 * ATTENTION — défaut connu : `ordersApi.remove()` n'existe pas alors que
 * `DELETE /orders/:id` est déclaré dans `endpoints.ts`. La méthode `remove`
 * n'est donc pas exposée ici jusqu'à correction de `orders.ts`.
 *
 * Concernant `create` : en mode mock, `ordersApi.create()` rejette
 * volontairement (la création passe par `createOrderLocal()` du store).
 * Ce hook utilise donc `createOrderLocal` directement en mock, via
 * `createOrderLocal` ré-exporté depuis `orders.ts`.
 */
export function useOrderMutations(): OrderMutations {
  const { user } = useAuth();
  const create = useCallback(
    (input: CreateOrderInput) =>
      runMutation(ORDERS_RESOURCE, "create", async () => {
        // En http, le backend renvoie { id }. En mock, createOrderLocal
        // retourne l'Order complet ; on renvoie { id } pour uniformité.
        if (isHttpData()) {
          return ordersApi.create(input);
        }
        // Mode mock : on adapte CreateOrderInput -> paramètres de createOrder.
        const products = getAdminSnapshot().products;
        const order = createOrderLocal({
          items: input.items.map((it) => {
            const product = products.find((p) => p.id === it.productId);
            if (!product) {
              throw new Error(
                `Produit introuvable en mode mock : productId="${it.productId}". Vérifiez le catalogue.`,
              );
            }
            return {
              productId: it.productId,
              name: product.name,
              price: product.price,
              qty: it.qty,
            };
          }),
          customerId: user?.id,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          subtotal: 0,
          discount: 0,
          couponCode: input.couponCode,
          shipping: 0,
          total: 0,
          paymentMethod: input.paymentMethodId ?? "cod",
          wilaya: input.shipping.wilayaCode,
          deliveryKind: input.shipping.method,
          address: input.shipping.address ?? "",
          phone: input.customer.phone,
          note: input.note,
        });
        return { id: order.id };
      }),
    [user],
  );

  const updateStatus = useCallback(
    (id: string, status: OrderStatus, note?: string) =>
      runMutation(ORDERS_RESOURCE, "updateStatus", () => ordersApi.updateStatus(id, status, note)),
    [],
  );

  return useMemo(() => ({ create, updateStatus }), [create, updateStatus]);
}
