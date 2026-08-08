import { useCallback, useMemo } from "react";

import { ordersApi, createOrderLocal } from "@/api/resources/orders";
import { useAuth } from "@/lib/auth";
import { useI18n, localize } from "@/lib/i18n";
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

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste de toutes les commandes — remplace `useAdminState().orders`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 commandes.
 */
export function useOrderList(query: OrderQuery = {}): ResourceState<Order[]> {
  const normalized: OrderQuery = { ...query, perPage: query.perPage ?? DEFAULT_PER_PAGE };
  const key = orderListKey(normalized);

  return useResource<Order[]>({
    key,
    fromStore: (state) => {
      let items = state.orders;
      if (query.status) items = items.filter((o) => o.status === query.status);
      return items;
    },
    fromHttp: async () => (await ordersApi.list(normalized)).items,
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
 * `fromStore` filtre par `customerId` directement sur l'état local.
 * `fromHttp` délègue à `ordersApi.mine(customerId)` qui, en http, appelle
 * `GET /me/orders` (filtrage côté serveur) et, en mock, filtre par
 * `customerId` à la source — aucune fuite de données entre clients.
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
    // En mock, on passe customerId pour que ordersApi.mine() filtre à la source.
    fromHttp: async () => ordersApi.mine(customerId),
    fallback: NO_ORDERS,
  });
}

export type OrderMutations = {
  create: (input: CreateOrderInput) => Promise<{ id: string }>;
  updateStatus: (id: string, status: OrderStatus, note?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations commandes.
 *
 * `create` : en mode mock, `ordersApi.create()` rejette volontairement (la
 * création passe par `createOrderLocal()` du store). Ce hook utilise donc
 * `createOrderLocal` directement en mock.
 *
 * `remove` : câblé sur `DELETE /orders/:id` en http. En mock, l'opération
 * n'est pas supportée faute de `deleteOrder()` dans admin-store — une erreur
 * explicite est levée.
 */
export function useOrderMutations(): OrderMutations {
  const { user } = useAuth();
  // Langue de la commande : celle dans laquelle le client passe commande. Elle
  // est figée dans les lignes au moment de la création (empreinte historique) —
  // `localize` est appelé à l'écriture, jamais à la relecture de la facture.
  const { lang } = useI18n();
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
              // Correctif phase 2 conservé : nom et prix viennent du catalogue,
              // pas de l'entrée client. Le nom est résolu ici, dans la langue de
              // la commande, et reste une chaîne nue dans la ligne enregistrée.
              name: localize(product.name, lang) ?? "",
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
    [user, lang],
  );

  const updateStatus = useCallback(
    (id: string, status: OrderStatus, note?: string) =>
      runMutation(ORDERS_RESOURCE, "updateStatus", () => ordersApi.updateStatus(id, status, note)),
    [],
  );

  const remove = useCallback(
    (id: string) => runMutation(ORDERS_RESOURCE, "remove", () => ordersApi.remove(id)),
    [],
  );

  return useMemo(() => ({ create, updateStatus, remove }), [create, updateStatus, remove]);
}
