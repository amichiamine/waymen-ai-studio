import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import {
  getAdminSnapshot,
  addContactMessage,
  markMessageRead,
  deleteContactMessage,
  addSubscriber,
  deleteSubscriber,
  type ContactMessage,
  type Subscriber,
} from "@/lib/admin-store";
import type { ListQuery, Paginated } from "../types";

export const contactMessagesApi = {
  async list(query: ListQuery = {}): Promise<Paginated<ContactMessage>> {
    if (isHttpMode()) return http.get<Paginated<ContactMessage>>(E.crm.messages(), query);
    const items = getAdminSnapshot().messages;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async detail(id: string): Promise<ContactMessage | undefined> {
    if (isHttpMode()) return http.get<ContactMessage>(E.crm.message(id));
    return getAdminSnapshot().messages.find((m) => m.id === id);
  },

  async markRead(id: string, read = true): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.crm.message(id), { read });
      return;
    }
    markMessageRead(id, read);
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.crm.message(id));
      return;
    }
    deleteContactMessage(id);
  },

  async create(
    input: Omit<ContactMessage, "id" | "createdAt" | "read"> & { read?: boolean },
  ): Promise<ContactMessage> {
    if (isHttpMode()) return http.post<ContactMessage>(E.crm.messages(), input);
    return addContactMessage(input);
  },
};

export const subscribersApi = {
  async list(query: ListQuery = {}): Promise<Paginated<Subscriber>> {
    if (isHttpMode()) return http.get<Paginated<Subscriber>>(E.crm.subscribers(), query);
    const items = getAdminSnapshot().subscribers;
    return { items, total: items.length, page: 1, perPage: items.length || 1 };
  },

  async detail(id: string): Promise<Subscriber | undefined> {
    if (isHttpMode()) return http.get<Subscriber>(E.crm.subscriber(id));
    return getAdminSnapshot().subscribers.find((s) => s.id === id);
  },

  async subscribe(email: string, source?: string): Promise<Subscriber> {
    if (isHttpMode()) return http.post<Subscriber>(E.crm.subscribers(), { email, source });
    const result = addSubscriber(email, source);
    if (!result.ok) throw new Error(result.error ?? "Inscription échouée.");
    const sub = getAdminSnapshot().subscribers.find((s) => s.email === email.trim().toLowerCase());
    if (!sub) throw new Error("Abonné introuvable après inscription.");
    return sub;
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.crm.subscriber(id));
      return;
    }
    deleteSubscriber(id);
  },
};
