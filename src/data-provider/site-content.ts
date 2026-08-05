import { useCallback, useMemo } from "react";

import { contentApi } from "@/api/resources/content";
import type { SiteContent } from "@/api/types";
import { seedSiteContent } from "@/lib/site-content";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

export const SITE_CONTENT_RESOURCE = "site-content";

/**
 * Repli exploitable : les valeurs par défaut de seedSiteContent().
 *
 * Référence stable au niveau module — jamais un littéral d'objet inline.
 * Garantit que `data` n'est jamais undefined, même en cas d'erreur HTTP.
 * `Localized<string>` est préservé tel quel : les objets `{ fr, en?, ar? }`
 * transitent sans aplatissement depuis le store jusqu'au composant appelant.
 */
const FALLBACK_SITE_CONTENT: SiteContent = seedSiteContent();

/**
 * Contenu éditorial du site (singleton).
 *
 * Retourne `{ data, loading, error, refetch }` où `data` est le `SiteContent`
 * complet — jamais undefined. En mode mock, `loading` vaut `false` dès le
 * premier rendu ; en HTTP, `loading` est `true` le temps du premier
 * aller-retour, puis `data` reflète la réponse serveur.
 *
 * Les champs de type `Localized<string>` (p. ex. `{ fr, en?, ar? }` ou une
 * chaîne directe) ne sont pas aplatis : ils arrivent intacts chez l'appelant,
 * qui les résout via `resolve()` de `@/lib/i18n`.
 */
export function useSiteContent(): ResourceState<SiteContent> {
  return useResource<SiteContent>({
    key: SITE_CONTENT_RESOURCE,
    fromStore: (state) => state.siteContent,
    fromHttp: async () => contentApi.get(),
    fallback: FALLBACK_SITE_CONTENT,
  });
}

export type SiteContentMutations = {
  update: (patch: Partial<SiteContent>) => Promise<void>;
};

/**
 * Mutations du contenu éditorial.
 * `update` envoie un patch partiel — seuls les champs présents sont modifiés,
 * ce qui préserve les `Localized<string>` non touchés.
 */
export function useSiteContentMutations(): SiteContentMutations {
  const update = useCallback(
    (patch: Partial<SiteContent>) =>
      runMutation(SITE_CONTENT_RESOURCE, "update", () => contentApi.update(patch)),
    [],
  );

  return useMemo(() => ({ update }), [update]);
}
