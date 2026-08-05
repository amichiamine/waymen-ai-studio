import { useCallback, useMemo } from "react";

import { ApiError } from "@/api/client";
import { contentApi } from "@/api/resources/content";
import type { SiteContent } from "@/api/types";
import { isHttpMode } from "@/api/config";
import { resetSiteContentSection } from "@/lib/admin-store";
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
  resetSection: <K extends keyof SiteContent>(section: K) => Promise<void>;
};

/**
 * Mutations du contenu éditorial.
 * `update` envoie un patch partiel — seuls les champs présents sont modifiés,
 * ce qui préserve les `Localized<string>` non touchés.
 * `resetSection` réinitialise une section à sa valeur de départ (seedSiteContent).
 * En mode http, aucun endpoint de réinitialisation par section n'existe à ce stade ;
 * la mutation échoue explicitement (phase 4 — PLAN.md).
 */
export function useSiteContentMutations(): SiteContentMutations {
  const update = useCallback(
    (patch: Partial<SiteContent>) =>
      runMutation(SITE_CONTENT_RESOURCE, "update", () => contentApi.update(patch)),
    [],
  );

  const resetSection = useCallback(<K extends keyof SiteContent>(section: K) => {
    return runMutation(SITE_CONTENT_RESOURCE, "resetSection", async () => {
      if (isHttpMode()) {
        throw new ApiError(
          501,
          "not_implemented",
          "La réinitialisation par section du contenu éditorial n'est pas disponible via l'API HTTP. " +
            "Cette mutation sera implémentée en phase 4 (PLAN.md).",
        );
      }
      resetSiteContentSection(section);
    });
  }, []);

  return useMemo(() => ({ update, resetSection }), [update, resetSection]);
}
