import { useCallback, useMemo } from "react";

import { notificationsApi } from "@/api/resources/notifications";
import type { AdminNotification } from "@/lib/admin-store";

import { runMutation, useResource } from "./use-resource";
import { invalidateResource } from "./cache";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const NOTIFICATIONS_RESOURCE = "notifications";

/** Repli stable. */
const NO_NOTIFICATIONS: AdminNotification[] = [];

/**
 * Liste des notifications — remplace `useAdminState().notifications`.
 *
 * En mode mock : lecture directe du store, `loading: false` au premier rendu.
 * En mode http : lecture de `GET /notifications` (liste paginée, on extrait `.items`).
 */
export function useNotificationList(): ResourceState<AdminNotification[]> {
  return useResource<AdminNotification[]>({
    key: NOTIFICATIONS_RESOURCE,
    fromStore: (state) => state.notifications,
    fromHttp: async () => (await notificationsApi.list()).items,
    fallback: NO_NOTIFICATIONS,
  });
}

export type NotificationInput = {
  title: string;
  /** Corps du message. Vide par défaut si non fourni. */
  body?: string;
  level?: AdminNotification["level"];
  link?: string;
};

export type NotificationMutations = {
  create: (input: NotificationInput) => Promise<void>;
  markRead: (id: string, read?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * Mutations des notifications. Toujours asynchrones, y compris en mock.
 */
export function useNotificationMutations(): NotificationMutations {
  const create = useCallback((input: NotificationInput) => {
    return runMutation(NOTIFICATIONS_RESOURCE, "create", async () => {
      await notificationsApi.create({
        title: input.title,
        body: input.body ?? "",
        level: input.level ?? "info",
        link: input.link,
      });
    });
  }, []);

  const markRead = useCallback((id: string, read = true) => {
    return runMutation(NOTIFICATIONS_RESOURCE, "markRead", async () => {
      await notificationsApi.markRead(id, read);
    });
  }, []);

  const markAllRead = useCallback(() => {
    return runMutation(NOTIFICATIONS_RESOURCE, "markAllRead", async () => {
      await notificationsApi.markAllRead();
    });
  }, []);

  const remove = useCallback((id: string) => {
    return runMutation(NOTIFICATIONS_RESOURCE, "remove", async () => {
      await notificationsApi.remove(id);
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
    () => ({ create, markRead, markAllRead: markAllReadWithInvalidate, remove }),
    [create, markRead, markAllReadWithInvalidate, remove],
  );
}

// Nécessaire pour que le moteur http invalide la ressource (import direct dans
// certains hooks dérivés). On ré-exporte depuis cache pour ne pas en créer une
// dépendance circulaire.
export { invalidateResource };
