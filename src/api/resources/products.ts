import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, getProduct, upsertProduct, deleteProduct } from "@/lib/admin-store";
import type { Paginated, Product, ProductQuery } from "../types";

function paginateLocal(items: Product[], q: ProductQuery = {}): Paginated<Product> {
  const page = q.page ?? 1;
  const perPage = q.perPage ?? (items.length || 1);
  let list = items;
  if (q.category) list = list.filter((p) => p.category === q.category);
  if (q.brand) list = list.filter((p) => p.brand === q.brand);
  if (q.stock) list = list.filter((p) => p.stock === q.stock);
  if (q.sale) list = list.filter((p) => p.sale);
  if (q.bestSeller) list = list.filter((p) => p.bestSeller);
  if (q.minPrice != null) list = list.filter((p) => p.price >= q.minPrice!);
  if (q.maxPrice != null) list = list.filter((p) => p.price <= q.maxPrice!);
  if (q.search) {
    const s = q.search.toLowerCase();
    list = list.filter((p) => `${p.name} ${p.brand} ${p.specLine}`.toLowerCase().includes(s));
  }
  return {
    items: list.slice((page - 1) * perPage, page * perPage),
    total: list.length,
    page,
    perPage,
  };
}

export const productsApi = {
  async list(query: ProductQuery = {}): Promise<Paginated<Product>> {
    if (isHttpMode()) return http.get<Paginated<Product>>(E.products.list(), query);
    return paginateLocal(getAdminSnapshot().products, query);
  },

  async detail(id: string): Promise<Product | undefined> {
    if (isHttpMode()) return http.get<Product>(E.products.detail(id));
    return getProduct(id);
  },

  async create(input: Product): Promise<Product> {
    if (isHttpMode()) return http.post<Product>(E.products.create(), input);
    upsertProduct(input);
    return input;
  },

  async update(id: string, input: Product): Promise<Product> {
    if (isHttpMode()) return http.patch<Product>(E.products.update(id), input);
    upsertProduct({ ...input, id });
    return { ...input, id };
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.products.remove(id));
      return;
    }
    deleteProduct(id);
  },
};
