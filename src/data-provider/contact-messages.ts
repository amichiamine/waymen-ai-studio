import { useCallback, useMemo } from "react";

import { contactMessagesApi } from "@/api/resources/crm";
import type { ContactMessage } from "@/lib/admin-store";

import { extraireItems } from "./normalisation";
import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. */
export const CONTACT_MESSAGES_RESOURCE = "contact-messages";

/** Repli stable. */
const NO_MESSAGES: ContactMessage[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste des messages de contact — remplace `useAdminState().messages`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 messages.
 */
export function useContactMessageList(): ResourceState<ContactMessage[]> {
  return useResource<ContactMessage[]>({
    key: CONTACT_MESSAGES_RESOURCE,
    fromStore: (state) => state.messages,
    fromHttp: async () =>
      extraireItems(
        CONTACT_MESSAGES_RESOURCE,
        await contactMessagesApi.list({ perPage: DEFAULT_PER_PAGE }),
        NO_MESSAGES,
      ),
    fallback: NO_MESSAGES,
  });
}

export type ContactMessageMutations = {
  markRead: (id: string, read?: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  create: (
    input: Omit<ContactMessage, "id" | "createdAt" | "read"> & { read?: boolean },
  ) => Promise<ContactMessage>;
};

/**
 * Mutations des messages de contact. Toujours asynchrones, y compris en mock.
 */
export function useContactMessageMutations(): ContactMessageMutations {
  const markRead = useCallback(
    (id: string, read = true) =>
      runMutation(CONTACT_MESSAGES_RESOURCE, "markRead", () =>
        contactMessagesApi.markRead(id, read),
      ),
    [],
  );

  const remove = useCallback(
    (id: string) =>
      runMutation(CONTACT_MESSAGES_RESOURCE, "remove", () => contactMessagesApi.remove(id)),
    [],
  );

  const create = useCallback(
    (input: Omit<ContactMessage, "id" | "createdAt" | "read"> & { read?: boolean }) =>
      runMutation(CONTACT_MESSAGES_RESOURCE, "create", () => contactMessagesApi.create(input)),
    [],
  );

  return useMemo(() => ({ markRead, remove, create }), [markRead, remove, create]);
}
