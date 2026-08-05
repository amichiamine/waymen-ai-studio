import { ApiError } from "@/api/client";
import type { AuditLog } from "@/lib/admin-store";

import { useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const AUDIT_LOGS_RESOURCE = "audit-logs";

/** Repli stable. */
const NO_AUDIT_LOGS: AuditLog[] = [];

/**
 * Journal d'audit — lecture seule.
 *
 * Le vidage du journal est une action d'administration destructive déjà
 * protégée par les permissions de la phase 1 — elle n'est pas exposée ici.
 *
 * ## Mode http
 *
 * L'endpoint `analytics.audit` est déclaré dans `src/api/endpoints.ts` mais
 * aucun backend ne l'implémente à ce stade. En mode http, `fromHttp` échoue
 * explicitement avec une `ApiError` 501 : la liste vide (`fallback`) est
 * retournée à l'appelant, avec `error` renseigné — jamais d'échec silencieux
 * (AGENTS.md §7). Phase 4 (PLAN.md) devra brancher la vraie réponse en
 * remplaçant le throw par `http.get(E.analytics.audit())`.
 *
 * ## Mode mock
 *
 * `fromStore` lit directement `state.auditLogs` — le mode mock est complet.
 */
export function useAuditLogList(): ResourceState<AuditLog[]> {
  return useResource<AuditLog[]>({
    key: AUDIT_LOGS_RESOURCE,
    fromStore: (state) => state.auditLogs,
    fromHttp: async () => {
      // analytics.audit est déclaré dans endpoints.ts mais n'est pas encore
      // implémenté côté backend. On échoue explicitement pour éviter un silence
      // trompeur (AGENTS.md §7). Phase 4 remplacera ce throw par l'appel HTTP.
      throw new ApiError(
        501,
        "not_implemented",
        "Le journal d'audit n'est pas encore disponible via l'API HTTP. " +
          "Cette ressource sera implémentée en phase 4 (PLAN.md). " +
          "Endpoint prévu : GET /analytics/audit.",
      );
    },
    fallback: NO_AUDIT_LOGS,
  });
}
