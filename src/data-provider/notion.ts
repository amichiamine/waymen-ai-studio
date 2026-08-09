/**
 * Fournisseur de données — intégration Notion.
 *
 * Cette ressource ne correspond à aucune entité du store local. En mode mock,
 * on renvoie un état fictif cohérent. En mode http, on appelle le backend.
 *
 * ATTENTION : pas d'import depuis le baril `@/data-provider` ici — cela
 * créerait une dépendance circulaire que Rollup signalerait au build.
 * On n'importe que depuis les chemins profonds.
 *
 * SÉCURITÉ (S13) : aucune variable sensible (jeton) ne transite par ce module.
 * Le jeton est passé directement à `notionApi.enregistrerToken()` depuis le
 * composant, sans jamais passer par le store ni le cache.
 */

import { useCallback } from "react";

import { notionApi, NOTION_ETAT_VIDE } from "@/api/resources/notion";
import { isHttpData } from "./mode";
import { useResource } from "./use-resource";
import { runMutation } from "./use-resource";
import type { ResourceState } from "./types";
import type { NotionEtat, NotionPage, NotionRenvoiResultat } from "@/api/types";

// ── Clé de cache ──────────────────────────────────────────────────────────────

export const NOTION_RESOURCE = "notion/status";

// ── Hook de lecture — état Notion ─────────────────────────────────────────────

/**
 * Lit l'état de l'intégration Notion.
 *
 * En mode mock : renvoie un état vide synchrone (Notion non configuré).
 * En mode http : GET /notion/status
 *
 * Repli stable : NOTION_ETAT_VIDE — l'écran reste utilisable même si l'API
 * est injoignable (S3 : dégradation gracieuse).
 */
export function useNotionEtat(): ResourceState<NotionEtat> {
  return useResource<NotionEtat>({
    key: NOTION_RESOURCE,
    fromStore: () => ({ ...NOTION_ETAT_VIDE }),
    fromHttp: () => notionApi.status(),
    fallback: { ...NOTION_ETAT_VIDE },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Hook regroupant toutes les mutations de l'intégration Notion.
 *
 * Chaque mutation invalide le cache de l'état après succès, afin que
 * `useNotionEtat` se recharge automatiquement.
 */
export function useNotionMutations() {
  /**
   * Enregistre le jeton Notion.
   *
   * S13 : le jeton n'est passé que dans l'argument de cette fonction.
   * Il ne transite par aucun état React, aucun store, aucun cache.
   * L'appelant doit vider son champ de saisie dès que la promesse se résout.
   */
  const enregistrerToken = useCallback(
    async (token: string): Promise<NotionEtat> =>
      runMutation<NotionEtat>(NOTION_RESOURCE, "enregistrerToken", () =>
        notionApi.enregistrerToken(token),
      ),
    [],
  );

  /** Récupère la liste des pages Notion accessibles. */
  const listerPages = useCallback(async (): Promise<NotionPage[]> => {
    if (!isHttpData()) {
      const res = await notionApi.listerPages();
      return res.pages;
    }
    return runMutation<NotionPage[]>(NOTION_RESOURCE, "listerPages", async () => {
      const res = await notionApi.listerPages();
      return res.pages;
    });
  }, []);

  /**
   * Récupère la liste des pages avec le message d'aide éventuel.
   * Utilisé pour afficher la marche à suivre quand la liste est vide.
   */
  const listerPagesAvecMessage = useCallback(
    async (): Promise<{
      pages: NotionPage[];
      message?: string;
    }> => runMutation(NOTION_RESOURCE, "listerPagesAvecMessage", () => notionApi.listerPages()),
    [],
  );

  /** Crée ou rattache la base Notion des commandes. */
  const creerBase = useCallback(
    async (params: { pageId: string } | { databaseId: string }): Promise<NotionEtat> =>
      runMutation<NotionEtat>(NOTION_RESOURCE, "creerBase", () => notionApi.creerBase(params)),
    [],
  );

  /** Active ou désactive le miroir Notion. */
  const definirActif = useCallback(
    async (actif: boolean): Promise<NotionEtat> =>
      runMutation<NotionEtat>(NOTION_RESOURCE, "definirActif", () => notionApi.definirActif(actif)),
    [],
  );

  /** Relance les envois en attente ou en échec. */
  const renvoyer = useCallback(
    async (): Promise<NotionRenvoiResultat> =>
      runMutation<NotionRenvoiResultat>(NOTION_RESOURCE, "renvoyer", () => notionApi.renvoyer()),
    [],
  );

  return {
    enregistrerToken,
    listerPages,
    listerPagesAvecMessage,
    creerBase,
    definirActif,
    renvoyer,
  };
}
