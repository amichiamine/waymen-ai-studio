import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, createOrder, updateOrderStatus } from "@/lib/admin-store";
import type { CreateOrderInput, Order, OrderQuery, OrderStatus, Paginated } from "../types";

export const ordersApi = {
  async list(query: OrderQuery = {}): Promise<Paginated<Order>> {
    if (isHttpMode()) return http.get<Paginated<Order>>(E.orders.list(), query);
    let items = getAdminSnapshot().orders;
    if (query.status) items = items.filter((o) => o.status === query.status);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? (items.length || 1);
    return {
      items: items.slice((page - 1) * perPage, page * perPage),
      total: items.length,
      page,
      perPage,
    };
  },

  async detail(id: string): Promise<Order | undefined> {
    if (isHttpMode()) return http.get<Order>(E.orders.detail(id));
    return getAdminSnapshot().orders.find((o) => o.id === id);
  },

  async create(input: CreateOrderInput): Promise<{ id: string }> {
    if (isHttpMode()) return http.post<{ id: string }>(E.orders.create(), input);
    throw new Error("ordersApi.create en mode mock : utiliser createOrder() de admin-store.");
  },

  async updateStatus(id: string, status: OrderStatus, note?: string): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.orders.updateStatus(id), { status, note });
      return;
    }
    updateOrderStatus(id, status, note);
  },

  /**
   * Commandes du client connecté.
   *
   * En http : le backend filtre via l'identité de session.
   * En mock : `customerId` est requis pour éviter une fuite de données entre
   * clients. Si l'identifiant est absent (appelant non authentifié), retourne
   * un tableau vide plutôt que toutes les commandes.
   */
  async mine(customerId?: string): Promise<Order[]> {
    if (isHttpMode()) return http.get<Order[]>(E.orders.mine());
    if (!customerId) return [];
    return getAdminSnapshot().orders.filter((o) => o.customerId === customerId);
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.orders.remove(id));
      return;
    }
    throw new Error(
      `ordersApi.remove("${id}") en mode mock : deleteOrder() absent de admin-store. Opération non supportée en mock.`,
    );
  },

  /**
   * Suivi public d'une commande par identifiant et téléphone.
   */
  async track(id: string, phone: string): Promise<Order> {
    if (isHttpMode()) {
      return http.get<Order>(E.orders.track(), { id, phone });
    }
    const order = getAdminSnapshot().orders.find((o) => o.id === id);
    if (!order) throw new Error("Commande introuvable.");
    return order;
  },
};

// Ré-export pour rappel : en mock, la création passe par le store.
export { createOrder as createOrderLocal };
