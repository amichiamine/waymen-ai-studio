/**
 * Ressource d'authentification du fournisseur de données.
 *
 * Rôle : **unique** endroit où l'on décide si l'authentification passe par le
 * réseau (`authApi`, mode http) ou par la table `admin-store.users` (mode mock).
 * `src/lib/auth.tsx` redevient ainsi un contexte React purement présentationnel :
 * il ne sait pas dans quel mode il tourne, conformément à l'intention de
 * `src/data-provider/mode.ts`.
 *
 * Pourquoi ici et pas dans `src/api/resources/auth.ts` : cette ressource-là est
 * volontairement http-seulement (elle lève une erreur explicite en mock). Le
 * chemin mock — la vérification contre `users`, la création de compte — vit donc
 * dans ce module, qui possède les deux branches.
 *
 * Contrairement aux autres ressources, ce module n'utilise pas `useResource` :
 * une session n'est pas une entité listable et son cycle de vie est porté par
 * le contexte React (`AuthProvider`), pas par le cache de ressources.
 */
import { authApi } from "@/api/resources/auth";
import type { AuthSession, SignInInput, SignUpInput } from "@/api/types";
import {
  findUserByEmail,
  listUsersWithoutPassword,
  setUserPassword,
  touchUserLogin,
  upsertUser,
  verifyUserCredentials,
  type AdminUser,
} from "@/lib/admin-store";

import { isHttpData } from "./mode";

/** Préfixe de ressource — réservé pour une future invalidation de cache. */
export const AUTH_RESOURCE = "auth";

/**
 * Utilisateur authentifié. Forme **dérivée du contrat** (`AuthSession["user"]`)
 * plutôt que redéfinie : `{ id, email, name?, phone?, role }`. Toute évolution
 * du contrat se propage donc automatiquement ici.
 */
export type AuthUser = AuthSession["user"];

/** Résultat d'une tentative de connexion / inscription. */
export type AuthOutcome = { ok: true; user: AuthUser } | { ok: false; message: string };

/** Motif d'échec d'une réinitialisation — traduit par la page appelante. */
export type ResetFailure = "no-account" | "update-failed";

export type ResetOutcome = { ok: true } | { ok: false; reason: ResetFailure };

export type ResetPasswordInput = {
  email: string;
  password: string;
  /** Jeton reçu par courriel. Requis en mode http, ignoré en mode mock. */
  token?: string;
};

export type UpdateProfileInput = { name: string; phone?: string };

/**
 * Projection `AdminUser` → `AuthUser`.
 *
 * `AdminUser` ne porte pas de champ `phone` : le téléphone n'existe que dans la
 * session (localStorage) et doit donc être fourni par l'appelant. C'est une
 * limite du store mock, pas du contrat — le backend de la phase 4 renverra le
 * téléphone dans `AuthSession.user`.
 */
function toAuthUser(u: AdminUser, phone?: string): AuthUser {
  return { id: u.id, email: u.email, name: u.name, phone, role: u.role };
}

/**
 * Diagnostic de développement : emails des comptes actifs qui, faute de mot de
 * passe, ne peuvent pas se connecter en mode mock.
 *
 * Vit ici parce que ce module est le seul autorisé à connaître `admin-store`
 * (doctrine `docs/DATA-PROVIDER.md`) : l'interface consomme ce diagnostic sans
 * importer le magasin mock. Renvoie toujours un tableau vide en production et
 * en mode http — un état dégradé du magasin mock n'y a aucun sens.
 *
 * Destiné à `DataModeBadge` : un état dégradé ne doit jamais rester silencieux
 * (AGENTS.md §7). C'est l'absence de ce signal qui a laissé passer un repli
 * d'authentification accordant la connexion sans mot de passe.
 */
export function listPasswordlessAccounts(): string[] {
  if (!import.meta.env.DEV) return [];
  if (isHttpData()) return [];
  return listUsersWithoutPassword();
}

export const authProvider = {
  async signIn(input: SignInInput): Promise<AuthOutcome> {
    if (isHttpData()) {
      const session = await authApi.signIn(input);
      return { ok: true, user: session.user };
    }

    // Un mot de passe faux est refusé en développement comme en production,
    // sans exception : `verifyUserCredentials` est le seul juge.
    //
    // Il existait ici un repli conditionné à `import.meta.env.DEV` qui accordait
    // la connexion lorsque le compte trouvé n'avait aucun mot de passe (comptes
    // semés sans `VITE_DEV_SEED_CREDENTIALS`). Il a été supprimé : il
    // transformait silencieusement une erreur de configuration en absence totale
    // d'authentification, à l'endroit exact où l'on croit tester
    // l'authentification. Ne jamais le réintroduire, sous aucune garde.
    //
    // La bonne intention d'origine — des comptes de démonstration utilisables
    // sans configuration — est désormais tenue en amont : `admin-store` sème un
    // mot de passe de développement par défaut (`DEV_DEFAULT_SEED_PASSWORD`)
    // quand la variable est absente, et la vérification a réellement lieu.
    const found = verifyUserCredentials(input.email, input.password);
    if (!found) return { ok: false, message: "Identifiants invalides." };

    touchUserLogin(found.email);
    return { ok: true, user: toAuthUser(found) };
  },

  async signUp(input: SignUpInput): Promise<AuthOutcome> {
    if (isHttpData()) {
      const session = await authApi.signUp(input);
      return { ok: true, user: session.user };
    }

    const existing = findUserByEmail(input.email);
    if (existing) return { ok: false, message: "Un compte existe déjà avec cet email." };

    const created: AdminUser = {
      id: `usr_${Date.now()}`,
      name: input.name || input.email.split("@")[0],
      email: input.email.trim(),
      role: "viewer",
      active: true,
      password: input.password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    upsertUser(created);
    return { ok: true, user: toAuthUser(created, input.phone) };
  },

  async signOut(): Promise<void> {
    // En mock, la déconnexion se résume à effacer la session locale — c'est le
    // contexte qui s'en charge.
    if (isHttpData()) await authApi.signOut();
  },

  /**
   * Session courante côté serveur. `null` en mock : la source de vérité y est
   * le localStorage, lu par le contexte.
   */
  async me(): Promise<AuthUser | null> {
    if (!isHttpData()) return null;
    const session = await authApi.me();
    return session?.user ?? null;
  },

  /**
   * Demande d'envoi d'un lien de réinitialisation. Sans effet en mock : le
   * parcours mock saisit directement le nouveau mot de passe.
   */
  async forgotPassword(email: string): Promise<void> {
    if (isHttpData()) await authApi.forgotPassword(email);
  },

  async resetPassword(input: ResetPasswordInput): Promise<ResetOutcome> {
    if (isHttpData()) {
      if (!input.token) {
        // Échec visible plutôt que silencieux (AGENTS.md §7) : en http, un
        // changement de mot de passe non authentifié exige le jeton reçu par
        // courriel. Accepter la requête sans jeton reviendrait à laisser
        // n'importe qui réinitialiser le mot de passe d'autrui.
        throw new Error(
          "[authProvider.resetPassword] Jeton absent : en mode http, la réinitialisation " +
            "exige le jeton reçu par courriel (paramètre ?token= du lien).",
        );
      }
      await authApi.resetPassword(input.token, input.password);
      return { ok: true };
    }

    if (!findUserByEmail(input.email)) return { ok: false, reason: "no-account" };
    return setUserPassword(input.email, input.password)
      ? { ok: true }
      : { ok: false, reason: "update-failed" };
  },

  /** Changement de mot de passe d'un utilisateur déjà connecté. */
  async changePassword(email: string, currentPassword: string, password: string): Promise<boolean> {
    if (isHttpData()) {
      await authApi.changePassword(currentPassword, password);
      return true;
    }
    if (!verifyUserCredentials(email, currentPassword)) return false;
    return setUserPassword(email, password);
  },

  /**
   * Mise à jour du profil de l'utilisateur connecté.
   *
   * En mock, seul le nom est persistable : `AdminUser` n'a pas de champ `phone`.
   * Le téléphone reste porté par la session (localStorage), comme aujourd'hui.
   */
  async updateProfile(current: AuthUser, input: UpdateProfileInput): Promise<AuthUser> {
    if (isHttpData()) {
      // Le contrat n'expose pas encore d'endpoint de profil : il arrive en
      // phase 4 (même parti pris que `usersApi.setPassword`). Échec explicite
      // plutôt qu'une réussite mensongère.
      throw new Error(
        "[authProvider.updateProfile] Non disponible en mode http avant la phase 4 : " +
          "le contrat ne déclare pas encore d'endpoint de mise à jour du profil.",
      );
    }

    const existing = findUserByEmail(current.email);
    if (!existing) return { ...current, name: input.name, phone: input.phone };
    const updated: AdminUser = { ...existing, name: input.name };
    upsertUser(updated);
    return toAuthUser(updated, input.phone);
  },
};
