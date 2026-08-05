import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, upsertCustomer, deleteCustomer } from "@/lib/admin-store";
import type { Customer, Paginated, ListQuery } from "../types";

function paginateLocal(items: Customer[], q: ListQuery = {}): Paginated<Customer> {
  const page = q.page ?? 1;
  const perPage = q.perPage ?? (items.length || 1);
  let list = items;
  if (q.search) {
    const s = q.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.phone.includes(s),
    );
  }
  return {
    items: list.slice((page - 1) * perPage, page * perPage),
    total: list.length,
    page,
    perPage,
  };
}

export const customersApi = {
  async list(query: ListQuery = {}): Promise<Paginated<Customer>> {
    if (isHttpMode()) return http.get<Paginated<Customer>>(E.customers.list(), query);
    return paginateLocal(getAdminSnapshot().customers, query);
  },

  async detail(id: string): Promise<Customer | undefined> {
    if (isHttpMode()) return http.get<Customer>(E.customers.detail(id));
    return getAdminSnapshot().customers.find((c) => c.id === id);
  },

  async upsert(input: Customer): Promise<Customer> {
    if (isHttpMode()) {
      const existing = getAdminSnapshot().customers.find((c) => c.id === input.id);
      if (existing) {
        return http.patch<Customer>(E.customers.detail(input.id), input);
      }
      return http.post<Customer>(E.customers.list(), input);
    }
    upsertCustomer(input);
    return input;
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.customers.detail(id));
      return;
    }
    deleteCustomer(id);
  },
};
