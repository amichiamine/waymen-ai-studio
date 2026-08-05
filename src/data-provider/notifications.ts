import { useCallback, useMemo } from "react";

import { isHttpMode } from "@/api/config";
import { ApiError } from "@/api/client";
import {
  getAdminSnapshot,
  updateNotification,
  deleteNotification,
  markAllNotificationsRead,
  type AdminNotification,
} from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import { invalidateResource } from "./cache";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const NOTIFICATIONS_RESOURCE = "notifications";

/** Repli stable. */
const NO_NOTIFICATIONS: AdminNotification[] = [];

/**
 * Liste des notifications — remplace `useAdminState().notifications`.
 */
export function useNotificationList(): ResourceState<AdminNotification[]> {
  return useResource<AdminNotification[]>({
    key: NOTIFICATIONS_RESOURCE,
    fromStore: (state) => state.notifications,
    fromHttp: async () => {
      // Aucun endpoint backend dédié aux notifications n'existe à ce stade.
      // Le mode http échoue explicitement pour éviter un silence trompeur
      // (AGENTS.md §7). Phase 4 devra déclarer l'endpoint et brancher la couche API.
      throw new ApiError(
        501,
        "not_implemented",
        "Les notifications ne sont pas encore disponibles via l'API HTTP. " +
          "Cette ressource sera implémentée en phase 4 (PLAN.md).",
      );
    },
    fallback: NO_NOTIFICATIONS,
  });
}

export type NotificationMutations = {
  markRead: (id: string, read?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations des notifications. Toujours asynchrones, y compris en mock.
 */
export function useNotificationMutations(): NotificationMutations {
  const markRead = useCallback((id: string, read = true) => {
    return runMutation(NOTIFICATIONS_RESOURCE, "markRead", async () => {
      if (isHttpMode()) {
        throw new ApiError(
          501,
          "not_implemented",
          "Les mutations de notifications ne sont pas encore disponibles via l'API HTTP. " +
            "Cette ressource sera implémentée en phase 4 (PLAN.md).",
        );
      }
      updateNotification(id, { read });
    });
  }, []);

  const markAllRead = useCallback(() => {
    return runMutation(NOTIFICATIONS_RESOURCE, "markAllRead", async () => {
      if (isHttpMode()) {
        throw new ApiError(
          501,
          "not_implemented",
          "Les mutations de notifications ne sont pas encore disponibles via l'API HTTP. " +
            "Cette ressource sera implémentée en phase 4 (PLAN.md).",
        );
      }
      markAllNotificationsRead();
    });
  }, []);

  const remove = useCallback((id: string) => {
    return runMutation(NOTIFICATIONS_RESOURCE, "remove", async () => {
      if (isHttpMode()) {
        throw new ApiError(
          501,
          "not_implemented",
          "Les mutations de notifications ne sont pas encore disponibles via l'API HTTP. " +
            "Cette ressource sera implémentée en phase 4 (PLAN.md).",
        );
      }
      deleteNotification(id);
    });
  }, []);

  // runMutation invalide NOTIFICATIONS_RESOURCE après chaque succès, mais
  // markAllRead mutate l'ensemble : on force une invalidation explicite au
  // cas où la clé de liste serait distincte à l'avenir.
  const markAllReadWithInvalidate = useCallback(() => {
    return markAllRead().then(() => {
      invalidateResource(NOTIFICATIONS_RESOURCE);
    });
  }, [markAllRead]);

  return useMemo(
    () => ({ markRead, markAllRead: markAllReadWithInvalidate, remove }),
    [markRead, markAllReadWithInvalidate, remove],
  );
}

// Nécessaire pour que le moteur http invalide la ressource (import direct dans
// certains hooks dérivés). On ré-exporte depuis cache pour ne pas en créer une
// dépendance circulaire.
export { invalidateResource };
