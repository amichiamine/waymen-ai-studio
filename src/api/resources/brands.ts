import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, getBrand, upsertBrand, deleteBrand } from "@/lib/admin-store";
import type { AdminBrand, ListQuery, Paginated } from "../types";

export const brandsApi = {
  async list(query: ListQuery = {}): Promise<Paginated<AdminBrand>> {
    if (isHttpMode()) return http.get<Paginated<AdminBrand>>(E.brands.list(), query);
    const items = getAdminSnapshot().brands;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async detail(id: string): Promise<AdminBrand | undefined> {
    if (isHttpMode()) return http.get<AdminBrand>(E.brands.detail(id));
    return getBrand(id);
  },

  async create(input: AdminBrand): Promise<AdminBrand> {
    if (isHttpMode()) return http.post<AdminBrand>(E.brands.create(), input);
    upsertBrand(input);
    return input;
  },

  async update(id: string, input: AdminBrand): Promise<AdminBrand> {
    if (isHttpMode()) return http.patch<AdminBrand>(E.brands.update(id), input);
    upsertBrand({ ...input, id });
    return { ...input, id };
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.brands.remove(id));
      return;
    }
    deleteBrand(id);
  },
};
