import { http } from "@/api/client";
import { endpoints as E } from "@/api/endpoints";
import type { AuditLog } from "@/lib/admin-store";
import type { Paginated } from "@/api/types";

import { extraireItems } from "./normalisation";
import { useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const AUDIT_LOGS_RESOURCE = "audit-logs";

/** Repli stable. */
const NO_AUDIT_LOGS: AuditLog[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Journal d'audit — lecture seule.
 *
 * Le vidage du journal est une action d'administration destructive déjà
 * protégée par les permissions de la phase 1 — elle n'est pas exposée ici.
 *
 * ## Mode http
 *
 * Branché sur `GET /analytics/audit` (route existante côté serveur).
 * `perPage: 100` transmis au serveur pour éviter la troncature silencieuse à 20.
 *
 * ## Mode mock
 *
 * `fromStore` lit directement `state.auditLogs` — le mode mock est complet.
 */
export function useAuditLogList(): ResourceState<AuditLog[]> {
  return useResource<AuditLog[]>({
    key: AUDIT_LOGS_RESOURCE,
    fromStore: (state) => state.auditLogs,
    fromHttp: async () =>
      extraireItems(
        AUDIT_LOGS_RESOURCE,
        await http.get<Paginated<AuditLog>>(E.analytics.audit(), { perPage: DEFAULT_PER_PAGE }),
        NO_AUDIT_LOGS,
      ),
    fallback: NO_AUDIT_LOGS,
  });
}
