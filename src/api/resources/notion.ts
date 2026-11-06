/**
 * Couche API pour l'intégration Notion.
 *
 * SÉCURITÉ (docs/NOTION.md §5, SKILLS.md S13) :
 *   - Le jeton est envoyé dans le corps d'une requête POST — jamais dans une URL,
 *     jamais dans le localStorage, jamais dans un log de console.
 *   - Le serveur ne renvoie JAMAIS le jeton Notion (API) au client.
 *   - `jetonVerification` est un secret DIFFÉRENT (poignée de main webhook), renvoyé
 *     uniquement au rang owner et jamais persisté côté client.
 *   - Ce module ne lit ni n'écrit `localStorage`.
 *
 * DÉGRADATION GRACIEUSE (SKILLS.md S3) :
 *   En mode mock, toutes les opérations retournent des données fictives sans
 *   erreur, pour que l'écran soit démontrable sans backend.
 *
 * CONVENTION : pas d'import depuis le baril @/data-provider ici pour éviter les
 * dépendances circulaires. On importe directement depuis les modules profonds.
 */

import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import type { NotionEtat, NotionPages, NotionRenvoiResultat } from "../types";

// ── Données fictives (mode mock) ──────────────────────────────────────────────

/** Repli stable : Notion non configuré mais la page reste utilisable. */
export const NOTION_ETAT_VIDE: NotionEtat = {
  configure: false,
  relie: false,
  actif: true,
  espace: null,
  baseTitre: null,
  baseUrl: null,
  databaseId: null,
  dataSourceId: null,
  derniereVerification: null,
  derniereErreur: null,
  enAttente: 0,
  jetonVerification: null,
};

/** Mock simulant un espace connecté mais sans base encore créée. */
const NOTION_ETAT_MOCK: NotionEtat = {
  configure: false,
  relie: false,
  actif: true,
  espace: null,
  baseTitre: null,
  baseUrl: null,
  databaseId: null,
  dataSourceId: null,
  derniereVerification: null,
  derniereErreur: null,
  enAttente: 0,
  jetonVerification: null,
};

// ── API Notion ────────────────────────────────────────────────────────────────

export const notionApi = {
  /**
   * GET /notion/status
   * État synthétique de l'intégration.
   */
  async status(): Promise<NotionEtat> {
    if (isHttpMode()) return http.get<NotionEtat>(E.notion.status());
    return { ...NOTION_ETAT_MOCK };
  },

  /**
   * POST /notion/token
   * Vérifie le jeton auprès de Notion, PUIS l'enregistre chiffré côté serveur.
   *
   * Le jeton n'est passé que dans le corps de la requête POST.
   * Il n'est JAMAIS persisté côté client.
   */
  async enregistrerToken(token: string): Promise<NotionEtat> {
    if (isHttpMode()) return http.post<NotionEtat>(E.notion.token(), { token });
    // Mode mock : simuler un espace connecté.
    return {
      ...NOTION_ETAT_MOCK,
      configure: true,
      espace: "Boutique StacGate Platform (mock)",
      derniereVerification: new Date().toISOString(),
    };
  },

  /**
   * GET /notion/pages
   * Liste les pages Notion accessibles à la connexion.
   * Une liste vide n'est pas une erreur : elle indique que le commerçant
   * n'a pas encore partagé de page avec sa connexion.
   */
  async listerPages(): Promise<NotionPages> {
    if (isHttpMode()) return http.get<NotionPages>(E.notion.pages());
    // Mode mock : retourner une page fictive pour démontrer le flux.
    return {
      pages: [
        {
          id: "mock-page-001",
          titre: "Boutique StacGate Platform",
          url: "https://notion.so/mock-page-001",
        },
      ],
    };
  },

  /**
   * POST /notion/base
   * Crée une nouvelle base sous la page indiquée, ou se rattache à une base existante.
   */
  async creerBase(params: { pageId: string } | { databaseId: string }): Promise<NotionEtat> {
    if (isHttpMode()) return http.post<NotionEtat>(E.notion.base(), params);
    return {
      ...NOTION_ETAT_MOCK,
      configure: true,
      relie: true,
      espace: "Boutique StacGate Platform (mock)",
      baseTitre: "Commandes — StacGate Hub",
      baseUrl: "https://notion.so/mock-database-001",
      databaseId: "mock-database-001",
      dataSourceId: "mock-datasource-001",
      derniereVerification: new Date().toISOString(),
    };
  },

  /**
   * PATCH /notion/parametres
   * Active ou désactive le miroir Notion.
   */
  async definirActif(actif: boolean): Promise<NotionEtat> {
    if (isHttpMode()) return http.patch<NotionEtat>(E.notion.parametres(), { actif });
    return { ...NOTION_ETAT_MOCK, actif };
  },

  /**
   * POST /notion/renvoyer
   * Relance les envois en attente ou en échec.
   */
  async renvoyer(): Promise<NotionRenvoiResultat> {
    if (isHttpMode()) return http.post<NotionRenvoiResultat>(E.notion.renvoyer(), {});
    return { traitees: 0, echecs: 0, reste: false, messages: [] };
  },
};
