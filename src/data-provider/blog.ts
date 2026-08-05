import { useCallback, useMemo } from "react";

import { blogApi } from "@/api/resources/blog";
import type { BlogPost } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const BLOG_RESOURCE = "blog";

/** Repli de liste — référence stable au niveau module. */
const NO_POSTS: BlogPost[] = [];

/**
 * Liste de tous les articles (brouillons inclus).
 *
 * En mode mock, renvoie l'intégralité du store ; le filtrage « published
 * seulement » appartient aux composants visiteur (Blog.tsx), exactement comme
 * c'était le cas avec useAdminState().blogPosts.
 */
export function useBlogPostList(): ResourceState<BlogPost[]> {
  return useResource<BlogPost[]>({
    key: BLOG_RESOURCE,
    fromStore: (state) => state.blogPosts,
    fromHttp: async () => (await blogApi.list()).items,
    fallback: NO_POSTS,
  });
}

/**
 * Détail d'un article — accepte un identifiant OU un slug.
 *
 * - L'administration navigue par identifiant (`/admin/blog/:id`).
 * - Les URL publiques utilisent le slug (`/blog/:slug`).
 * - `idOrSlug` optionnel : le hook reste monté et inactif quand la valeur
 *   n'est pas encore connue.
 */
export function useBlogPostDetail(idOrSlug?: string): ResourceState<BlogPost | undefined> {
  const key = idOrSlug ? `${BLOG_RESOURCE}/${idOrSlug}` : `${BLOG_RESOURCE}/inactif`;

  return useResource<BlogPost | undefined>({
    key,
    enabled: Boolean(idOrSlug),
    fromStore: (state) => {
      if (!idOrSlug) return undefined;
      // Cherche d'abord par id, puis par slug — identique à blogApi.detail().
      return (
        state.blogPosts.find((p) => p.id === idOrSlug) ??
        state.blogPosts.find((p) => p.slug === idOrSlug)
      );
    },
    fromHttp: async () => (idOrSlug ? blogApi.detail(idOrSlug) : undefined),
    fallback: undefined,
  });
}

export type BlogPostMutations = {
  create: (input: BlogPost) => Promise<BlogPost>;
  update: (id: string, input: BlogPost) => Promise<BlogPost>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations d'articles de blog. Toujours asynchrones, même en mock.
 * Invalident la ressource en cas de succès.
 */
export function useBlogPostMutations(): BlogPostMutations {
  const create = useCallback(
    (input: BlogPost) => runMutation(BLOG_RESOURCE, "create", () => blogApi.create(input)),
    [],
  );
  const update = useCallback(
    (id: string, input: BlogPost) =>
      runMutation(BLOG_RESOURCE, "update", () => blogApi.update(id, input)),
    [],
  );
  const remove = useCallback(
    (id: string) => runMutation(BLOG_RESOURCE, "remove", () => blogApi.remove(id)),
    [],
  );

  return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}
