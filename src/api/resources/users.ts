/**
 * Couche API pour la ressource utilisateurs admin.
 *
 * SÉCURITÉ — champ `password` :
 * `AdminUser` contient un champ `password?: string` qui est documenté « mock
 * only » dans `src/lib/admin-store.tsx`. Un backend réel ne doit JAMAIS renvoyer
 * ce champ, ni le recevoir lors d'une mise à jour générique.
 *
 * Mesures prises ici :
 *  1. Le type `AdminUserPayload` (utilisé comme DTO de création/mise à jour)
 *     omet explicitement `password` via `Omit`. La mutation générique `update`
 *     ne peut donc pas transmettre un mot de passe — intentionnellement.
 *  2. Le changement de mot de passe passe par un endpoint dédié
 *     (`setPassword`), séparé de la mise à jour des métadonnées utilisateur.
 *     En mode http, cet endpoint n'existe pas encore (phase 4) et échoue
 *     explicitement. En mode mock, il appelle `setUserPassword` du store.
 *  3. La lecture (`list`, `detail`) renvoie `AdminUser` tel quel depuis le
 *     store : en mock le champ `password` peut être présent (seed de démo), mais
 *     en http le backend ne doit jamais l'inclure dans sa réponse — c'est une
 *     contrainte documentée sur le contrat serveur, pas sur ce code.
 */
import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import { getAdminSnapshot, upsertUser, deleteUser, setUserPassword } from "@/lib/admin-store";
import type { AdminUser, Paginated } from "../types";

/**
 * DTO de création / mise à jour : `password` est intentionnellement omis.
 * Un backend ne doit jamais recevoir ni renvoyer ce champ via ce chemin.
 */
export type AdminUserPayload = Omit<AdminUser, "password">;

export const usersApi = {
  async list(): Promise<AdminUser[]> {
    if (isHttpMode()) return (await http.get<Paginated<AdminUser>>(E.users.list())).items;
    return getAdminSnapshot().users;
  },

  async detail(id: string): Promise<AdminUser | undefined> {
    // `endpoints.users` ne déclare pas encore de route `detail` — on la dérive
    // de la route `list` en attendant qu'elle soit ajoutée en phase 4.
    if (isHttpMode()) return http.get<AdminUser>(`${E.users.list()}/${id}`);
    return getAdminSnapshot().users.find((u) => u.id === id);
  },

  async create(input: AdminUserPayload): Promise<AdminUser> {
    if (isHttpMode()) return http.post<AdminUser>(E.users.create(), input);
    const user: AdminUser = { ...input };
    upsertUser(user);
    return user;
  },

  async update(id: string, input: AdminUserPayload): Promise<AdminUser> {
    if (isHttpMode()) return http.patch<AdminUser>(E.users.update(id), input);
    const user: AdminUser = { ...input, id };
    upsertUser(user);
    return user;
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.users.remove(id));
      return;
    }
    deleteUser(id);
  },

  /**
   * Changement de mot de passe — chemin dédié, séparé de `update`.
   *
   * En mode http : non implémenté avant la phase 4 (authentification serveur).
   * L'échec est explicite et renvoie un message orientant vers la phase 4 plutôt
   * que de tomber silencieusement (AGENTS.md §7).
   *
   * En mode mock : délègue à `setUserPassword` du store ; le mot de passe ne
   * sort jamais de ce chemin.
   */
  async setPassword(email: string, password: string): Promise<void> {
    if (isHttpMode()) {
      throw new Error(
        "[usersApi.setPassword] Non disponible en mode http avant la phase 4. " +
          "Le changement de mot de passe côté serveur sera câblé via " +
          "endpoints.auth.changePassword lorsque le backend sera en place.",
      );
    }
    const ok = setUserPassword(email, password);
    if (!ok) {
      throw new Error(`[usersApi.setPassword] Utilisateur introuvable : ${email}`);
    }
  },
};
