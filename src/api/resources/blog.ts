import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import {
  getAdminSnapshot,
  getBlogPost,
  getBlogPostBySlug,
  upsertBlogPost,
  deleteBlogPost,
} from "@/lib/admin-store";
import type { BlogPost } from "../types";
import type { Paginated } from "../types";

export const blogApi = {
  async list(): Promise<Paginated<BlogPost>> {
    if (isHttpMode()) return http.get<Paginated<BlogPost>>(E.blog.list());
    const posts = getAdminSnapshot().blogPosts;
    return { items: posts, total: posts.length, page: 1, perPage: posts.length || 1 };
  },

  async detail(idOrSlug: string): Promise<BlogPost | undefined> {
    if (isHttpMode()) return http.get<BlogPost>(E.blog.detail(idOrSlug));
    // Try id first, then slug — matches admin (id) and public (slug) routing.
    return getBlogPost(idOrSlug) ?? getBlogPostBySlug(idOrSlug);
  },

  async create(input: BlogPost): Promise<BlogPost> {
    if (isHttpMode()) return http.post<BlogPost>(E.blog.create(), input);
    upsertBlogPost(input);
    return input;
  },

  async update(id: string, input: BlogPost): Promise<BlogPost> {
    if (isHttpMode()) return http.patch<BlogPost>(E.blog.update(id), input);
    upsertBlogPost({ ...input, id });
    return { ...input, id };
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.blog.remove(id));
      return;
    }
    deleteBlogPost(id);
  },
};
