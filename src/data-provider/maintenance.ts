/**
 * Fournisseur de données — ressource Maintenance.
 *
 * Cette ressource est spéciale : elle ne correspond à aucune entité dans le
 * store local (admin-store). En mode mock, on renvoie des données fictives
 * directement dans `fromStore` pour que la page soit opérationnelle sans
 * backend. En mode http, on appelle le backend réel.
 *
 * Les trois opérations exposées sont :
 *   - useEtatBase()       : lecture de l'état de la base (GET /maintenance/status)
 *   - useSauvegarde()     : déclencheur de téléchargement (GET /maintenance/backup)
 *   - useMigration()      : simuler/exécuter une migration (POST /maintenance/migrate)
 *
 * ATTENTION : pas d'import depuis le baril `@/data-provider` ici — cela
 * créerait une dépendance circulaire que Rollup signalerait au build.
 * On n'importe que depuis les chemins profonds.
 */

import { useCallback } from "react";

// Pourquoi importer depuis les chemins profonds et non depuis @/api ?
// L'import depuis le baril @/data-provider créerait une dépendance circulaire
// signalée par Rollup au build. On importe donc directement depuis les modules.
import { http } from "@/api/client";
import { API_BASE_URL, AUTH_STRATEGY } from "@/api/config";

import { useResource } from "./use-resource";
import { runMutation } from "./use-resource";
import { isHttpData } from "./mode";
import type { ResourceState } from "./types";

// ── Types ────────────────────────────────────────────────────────────────────

/** Une ligne du tableau d'inventaire des tables. */
export type TableStat = {
  name: string;
  rows: number;
};

/** Réponse de GET /maintenance/status */
export type EtatBase = {
  driver: string;
  database: string;
  size: string;
  tables: TableStat[];
  outboxPending: number;
  lastBackup: string | null;
};

/** Paramètres du formulaire de migration. */
export type MigrationInput = {
  cible: "mysql" | "postgresql";
  dsn: string;
  utilisateur: string;
  /** Le mot de passe n'est JAMAIS persisté : il est envoyé directement dans
   * la requête et ne passe ni par le localStorage ni par l'URL. */
  motDePasse: string;
  simulation: boolean;
};

/** Résultat d'une migration (simulée ou réelle). */
export type MigrationResultTable = {
  nom: string;
  lues: number;
  ecrites: number;
  anomalies: number;
};

export type MigrationResult = {
  simulation: boolean;
  tables: MigrationResultTable[];
  ok: boolean;
  message: string;
};

// ── Données fictives (mode mock) ──────────────────────────────────────────────

/** Repli stable : une base indisponible ne doit pas casser le rendu. */
const ETAT_VIDE: EtatBase = {
  driver: "—",
  database: "—",
  size: "—",
  tables: [],
  outboxPending: 0,
  lastBackup: null,
};

/**
 * Données mock réalistes pour un commerçant algérien.
 * L'état mock simule une base SQLite de développement avec les tables réelles
 * du projet, pour que la page soit démontrable sans backend.
 */
const ETAT_MOCK: EtatBase = {
  driver: "sqlite",
  database: "katech_dev",
  size: "4.2 Mo",
  tables: [
    { name: "products", rows: 48 },
    { name: "categories", rows: 12 },
    { name: "brands", rows: 8 },
    { name: "orders", rows: 134 },
    { name: "customers", rows: 97 },
    { name: "users", rows: 3 },
    { name: "coupons", rows: 5 },
    { name: "reviews", rows: 62 },
    { name: "media_assets", rows: 210 },
    { name: "shipping_rates", rows: 58 },
    { name: "stock_movements", rows: 340 },
    { name: "audit_logs", rows: 1250 },
    { name: "outbox", rows: 0 },
  ],
  outboxPending: 0,
  lastBackup: "2026-08-05T14:32:00Z",
};

/** Clé de cache stable. */
export const MAINTENANCE_RESOURCE = "maintenance/status";

// ── Hook de lecture — état de la base ────────────────────────────────────────

/**
 * Lit l'état de la base de données.
 *
 * En mode mock : renvoie des données fictives synchrones.
 * En mode http : GET /maintenance/status
 */
export function useEtatBase(): ResourceState<EtatBase> {
  return useResource<EtatBase>({
    key: MAINTENANCE_RESOURCE,
    // En mode mock, le store local n'a pas de section "maintenance". On renvoie
    // la donnée fictive directement — le sélecteur doit rester pur (pas d'effets).
    fromStore: () => ETAT_MOCK,
    // http.get gère le préfixe API_BASE_URL, le délai d'expiration, les cookies
    // de session et la traduction des erreurs (ApiError avec code et message).
    fromHttp: () => http.get<EtatBase>("/maintenance/status"),
    fallback: ETAT_VIDE,
  });
}

// ── Mutation — téléchargement de la sauvegarde ────────────────────────────────

/**
 * Déclenche un téléchargement authentifié de la sauvegarde.
 *
 * Pourquoi une balise <a> avec window.open n'est pas suffisant :
 * la réponse est un flux binaire potentiellement volumineux, servi derrière
 * un cookie de session HttpOnly. fetch() avec credentials:"same-origin"
 * transmet automatiquement ce cookie, contrairement à un lien direct. On
 * convertit ensuite le blob en URL objet pour déclencher le téléchargement
 * sans exposer le contenu ni recharger la page.
 *
 * En mode mock : génère un fichier JSON de démonstration pour que le bouton
 * soit testable sans backend.
 *
 * Retourne une promesse qui se résout quand le téléchargement est amorcé,
 * ou rejette avec un Error contenant un message lisible.
 */
export function useSauvegarde() {
  const telecharger = useCallback(async (): Promise<void> => {
    const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const nomFichier = `katech-sauvegarde-${horodatage}.sql`;

    if (!isHttpData()) {
      // Mode mock : on génère un contenu SQL factice pour démontrer le flux.
      const contenuMock =
        `-- Sauvegarde fictive KA-Tech (mode mock)\n` +
        `-- Générée le ${new Date().toLocaleString("fr-DZ")}\n` +
        `-- Ce fichier est un exemple. Activez le mode http pour une vraie sauvegarde.\n`;
      const blob = new Blob([contenuMock], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomFichier;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    // Mode http : la réponse est un flux binaire (SQL dump), pas du JSON.
    // Le client http.get() tente de parser la réponse en JSON et ne convient
    // donc pas ici. On utilise fetch() directement, mais en construisant l'URL
    // depuis API_BASE_URL pour que le préfixe (/api/v1 par défaut, ou toute
    // autre valeur de VITE_API_BASE_URL) soit respecté — c'est exactement le
    // défaut que ce module corrige.
    // Les credentials sont calés sur la même stratégie que le client HTTP du
    // projet : "include" pour les cookies, "same-origin" pour le bearer.
    const urlSauvegarde = `${API_BASE_URL}/maintenance/backup`;
    const credentialsSauvegarde: RequestCredentials =
      AUTH_STRATEGY === "cookie" ? "include" : "same-origin";
    const resp = await fetch(urlSauvegarde, { credentials: credentialsSauvegarde });
    if (!resp.ok) {
      const texte = await resp.text().catch(() => "");
      throw new Error(texte || `Erreur HTTP ${resp.status} — la sauvegarde a échoué`);
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Libération différée : le navigateur a besoin de quelques ms pour amorcer
    // le téléchargement avant que l'URL objet soit révoquée.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  return { telecharger };
}

// ── Mutation — migration vers un autre moteur ─────────────────────────────────

export type MigrationMutations = {
  /**
   * Envoie la demande de migration (simulation ou exécution réelle).
   * Le mot de passe est transmis dans le corps JSON de la requête et n'est
   * jamais stocké localement.
   */
  migrer: (input: MigrationInput) => Promise<MigrationResult>;
};

/**
 * Données mock du rapport de simulation, pour démontrer l'interface sans backend.
 */
function mockMigrationResult(input: MigrationInput): MigrationResult {
  return {
    simulation: input.simulation,
    ok: true,
    message: input.simulation
      ? "Simulation réussie — aucune donnée n'a été modifiée."
      : "Migration exécutée avec succès.",
    tables: [
      { nom: "products", lues: 48, ecrites: 48, anomalies: 0 },
      { nom: "categories", lues: 12, ecrites: 12, anomalies: 0 },
      { nom: "brands", lues: 8, ecrites: 8, anomalies: 0 },
      { nom: "orders", lues: 134, ecrites: 134, anomalies: 0 },
      { nom: "customers", lues: 97, ecrites: 97, anomalies: 0 },
      { nom: "users", lues: 3, ecrites: 3, anomalies: 0 },
      { nom: "reviews", lues: 62, ecrites: 62, anomalies: 0 },
      { nom: "media_assets", lues: 210, ecrites: 210, anomalies: 0 },
      { nom: "stock_movements", lues: 340, ecrites: 340, anomalies: 0 },
    ],
  };
}

/**
 * Mute une migration. Toujours asynchrone, même en mode mock.
 * L'appelant est responsable d'afficher le résultat (rapport ou erreur).
 */
export function useMigrationMutations(): MigrationMutations {
  const migrer = useCallback(async (input: MigrationInput): Promise<MigrationResult> => {
    return runMutation(MAINTENANCE_RESOURCE, "migration", async () => {
      if (!isHttpData()) {
        // Petite pause artificielle en mock pour simuler le temps de traitement
        // et valider visuellement l'état « en cours ».
        await new Promise((r) => setTimeout(r, 800));
        return mockMigrationResult(input);
      }

      // http.post gère le préfixe API_BASE_URL, le Content-Type JSON, les cookies
      // de session et la traduction des erreurs — cohérent avec les 24 autres
      // ressources du projet. Le mot de passe est dans le corps JSON, jamais
      // dans l'URL.
      return http.post<MigrationResult>("/maintenance/migrate", input);
    });
  }, []);

  return { migrer };
}
