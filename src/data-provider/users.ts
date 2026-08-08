import { useCallback, useMemo } from "react";

import { usersApi } from "@/api/resources/users";
import type { AdminUserPayload } from "@/api/resources/users";
import type { AdminUser } from "@/api/types";

import { runMutation, useResource } from "./use-resource";
import type { ResourceState } from "./types";

/** Préfixe de cache de la ressource. Unique propriétaire de cette chaîne. */
export const USERS_RESOURCE = "users";

/**
 * Repli de liste : référence **stable au niveau module**.
 */
const NO_USERS: AdminUser[] = [];

/** Valeur large retransmise au serveur pour éviter la troncature silencieuse à 20. */
const DEFAULT_PER_PAGE = 100;

/**
 * Liste des utilisateurs admin — remplace `useAdminState().users`.
 *
 * `perPage: 100` transmis au serveur : sans ce paramètre, `Pagination::PAR_PAGE_DEFAUT = 20`
 * côté serveur tronque silencieusement la liste dès 21 utilisateurs.
 */
export function useUserList(): ResourceState<AdminUser[]> {
  return useResource<AdminUser[]>({
    key: USERS_RESOURCE,
    fromStore: (state) => state.users,
    fromHttp: async () => usersApi.list({ perPage: DEFAULT_PER_PAGE }),
    fallback: NO_USERS,
  });
}

/**
 * Détail d'un utilisateur admin.
 *
 * `id` optionnel : le hook reste monté et inactif quand l'identifiant n'est pas
 * encore connu. Ne jamais court-circuiter l'appel du hook lui-même.
 */
export function useUserDetail(id?: string): ResourceState<AdminUser | undefined> {
  const key = id ? `${USERS_RESOURCE}/${id}` : `${USERS_RESOURCE}/inactif`;

  return useResource<AdminUser | undefined>({
    key,
    enabled: Boolean(id),
    fromStore: (state) => (id ? state.users.find((u) => u.id === id) : undefined),
    fromHttp: async () => (id ? usersApi.detail(id) : undefined),
    fallback: undefined,
  });
}

export type UserMutations = {
  /**
   * Crée un utilisateur. Le champ `password` est absent du DTO —
   * il ne doit jamais transiter via ce chemin (voir `src/api/resources/users.ts`).
   */
  create: (input: AdminUserPayload) => Promise<AdminUser>;
  /**
   * Met à jour les métadonnées d'un utilisateur. Le champ `password` est absent
   * du DTO — utiliser `setPassword` pour changer le mot de passe.
   */
  update: (id: string, input: AdminUserPayload) => Promise<AdminUser>;
  remove: (id: string) => Promise<void>;
  /**
   * Change le mot de passe d'un compte. Chemin dédié, séparé de `update` pour
   * que `password` ne transite jamais dans une mise à jour générique.
   * En mode http, échoue explicitement avant la phase 4.
   */
  setPassword: (email: string, password: string) => Promise<void>;
};

/**
 * Mutations utilisateurs admin. Toujours asynchrones, y compris en mock.
 */
export function useUserMutations(): UserMutations {
  const create = useCallback(
    (input: AdminUserPayload) =>
      runMutation(USERS_RESOURCE, "create", () => usersApi.create(input)),
    [],
  );

  const update = useCallback(
    (id: string, input: AdminUserPayload) =>
      runMutation(USERS_RESOURCE, "update", () => usersApi.update(id, input)),
    [],
  );

  const remove = useCallback(
    (id: string) => runMutation(USERS_RESOURCE, "remove", () => usersApi.remove(id)),
    [],
  );

  const setPassword = useCallback(
    (email: string, password: string) =>
      runMutation(USERS_RESOURCE, "setPassword", () => usersApi.setPassword(email, password)),
    [],
  );

  return useMemo(
    () => ({ create, update, remove, setPassword }),
    [create, update, remove, setPassword],
  );
}
