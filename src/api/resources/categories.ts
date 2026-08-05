import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, getCategory, upsertCategory, deleteCategory } from "@/lib/admin-store";
import type { AdminCategory, Paginated } from "../types";

export const categoriesApi = {
  async list(): Promise<Paginated<AdminCategory>> {
    if (isHttpMode()) return http.get<Paginated<AdminCategory>>(E.categories.list());
    const items = getAdminSnapshot().categories;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async detail(slug: string): Promise<AdminCategory | undefined> {
    if (isHttpMode()) return http.get<AdminCategory>(E.categories.detail(slug));
    return getCategory(slug);
  },

  async create(input: AdminCategory): Promise<AdminCategory> {
    if (isHttpMode()) return http.post<AdminCategory>(E.categories.create(), input);
    upsertCategory(input);
    return input;
  },

  async update(slug: string, input: AdminCategory): Promise<AdminCategory> {
    if (isHttpMode()) return http.patch<AdminCategory>(E.categories.update(slug), input);
    upsertCategory({ ...input, slug });
    return { ...input, slug };
  },

  async remove(slug: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.categories.remove(slug));
      return;
    }
    deleteCategory(slug);
  },
};
