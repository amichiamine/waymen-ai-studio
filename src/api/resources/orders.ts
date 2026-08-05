import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, createOrder, setOrderStatus } from "@/lib/admin-store";
import type { CreateOrderInput, Order, OrderQuery, OrderStatus, Paginated } from "../types";

export const ordersApi = {
  async list(query: OrderQuery = {}): Promise<Paginated<Order>> {
    if (isHttpMode()) return http.get<Paginated<Order>>(E.orders.list(), query);
    let items = getAdminSnapshot().orders;
    if (query.status) items = items.filter((o) => o.status === query.status);
    const page = query.page ?? 1;
    const perPage = query.perPage ?? items.length || 1;
    return { items: items.slice((page - 1) * perPage, page * perPage), total: items.length, page, perPage };
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
    if (isHttpMode()) { await http.patch<void>(E.orders.updateStatus(id), { status, note }); return; }
    setOrderStatus(id, status, note);
  },

  async mine(): Promise<Order[]> {
    if (isHttpMode()) return http.get<Order[]>(E.orders.mine());
    return getAdminSnapshot().orders;
  },
};

// Ré-export pour rappel : en mock, la création passe par le store.
export { createOrder as createOrderLocal };
