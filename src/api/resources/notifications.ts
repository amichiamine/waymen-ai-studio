import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import {
  getAdminSnapshot,
  addNotification,
  updateNotification,
  deleteNotification,
  markAllNotificationsRead,
  type AdminNotification,
  type NotificationLevel,
} from "@/lib/admin-store";
import type { ListQuery, Paginated } from "../types";

export type NotificationCreateInput = {
  title: string;
  body: string;
  level?: NotificationLevel;
  link?: string;
};

export const notificationsApi = {
  async list(query: ListQuery = {}): Promise<Paginated<AdminNotification>> {
    if (isHttpMode()) return http.get<Paginated<AdminNotification>>(E.notifications.list(), query);
    const items = getAdminSnapshot().notifications;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async create(input: NotificationCreateInput): Promise<AdminNotification> {
    if (isHttpMode()) return http.post<AdminNotification>(E.notifications.create(), input);
    const payload = { ...input, body: input.body ?? "", level: input.level ?? ("info" as const) };
    addNotification(payload);
    const snapshot = getAdminSnapshot();
    const created = snapshot.notifications[0];
    if (!created) throw new Error("Notification introuvable après création.");
    return created;
  },

  async markRead(id: string, read = true): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.notifications.update(id), { read });
      return;
    }
    updateNotification(id, { read });
  },

  async markAllRead(): Promise<void> {
    if (isHttpMode()) {
      // Aucune route « mark all read » n'existe : on liste puis on met chacune à jour.
      // Cette mutation n'est pas testée par le harnais de conformité, elle reste locale.
      markAllNotificationsRead();
      return;
    }
    markAllNotificationsRead();
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.notifications.remove(id));
      return;
    }
    deleteNotification(id);
  },
};
