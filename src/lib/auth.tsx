import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  authProvider,
  type AuthUser,
  type ResetOutcome,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from "@/data-provider/auth";

// Contexte d'authentification. Toute la logique mock / http vit dans
// `@/data-provider/auth` : ce module ne sait pas dans quel mode il tourne, il
// ne fait que porter la session en mémoire et la persister en localStorage.

export type { AuthUser };

/**
 * Session exposée à l'interface.
 *
 * Forme alignée sur le contrat (`AuthSession["user"]` : `id`, `email`, `name?`,
 * `phone?`, `role`).
 */
export type SessionUser = AuthUser;

type AuthCtx = {
  user: SessionUser | null;
  session: { user: SessionUser } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: null | { message: string } }>;
  signUp: (
    email: string,
    password: string,
    meta?: { name?: string; phone?: string },
  ) => Promise<{ error: null | { message: string } }>;
  signOut: () => Promise<void>;
  /** Met à jour le profil de l'utilisateur connecté et rafraîchit la session. */
  updateProfile: (input: UpdateProfileInput) => Promise<{ error: null | { message: string } }>;
  /** Demande l'envoi d'un lien de réinitialisation (sans effet en mock). */
  forgotPassword: (email: string) => Promise<void>;
  /** Réinitialise un mot de passe oublié (utilisateur non connecté). */
  resetPassword: (input: ResetPasswordInput) => Promise<ResetOutcome>;
  /** Change le mot de passe de l'utilisateur connecté. */
  changePassword: (currentPassword: string, password: string) => Promise<boolean>;
};

const STORAGE_KEY = "ka-mock-user";

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  forgotPassword: async () => {},
  resetPassword: async () => ({ ok: true }),
  changePassword: async () => false,
});

/**
 * Forme historique de la session persistée (avant l'alignement sur le contrat).
 * Les sessions déjà en localStorage doivent survivre à la mise à jour : sans
 * cette migration, tout visiteur connecté serait déconnecté silencieusement.
 */
type StoredSession = Partial<AuthUser> & {
  user_metadata?: { name?: string; phone?: string };
};

function readStored(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSession;
    if (!stored.id || !stored.email) return null;
    return {
      id: stored.id,
      email: stored.email,
      name: stored.name ?? stored.user_metadata?.name,
      phone: stored.phone ?? stored.user_metadata?.phone,
      // Sessions historiques : aucun rôle enregistré. `customer` est le moindre
      // privilège du contrat ; l'autorité admin reste dérivée de la table
      // `users` par `useAdminRoles()`, jamais de cette valeur.
      role: stored.role ?? "customer",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((u: AuthUser | null) => {
    const next: SessionUser | null = u ?? null;
    if (typeof window !== "undefined") {
      if (u) {
        // On n'écrit que la forme du contrat.
        const { id, email, name, phone, role } = u;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, email, name, phone, role }));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setUser(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const stored = readStored();
      if (!cancelled) setUser(stored);
      try {
        // En mock, `me()` renvoie `null` : le localStorage reste la source de
        // vérité. En http, la session serveur prime lorsqu'elle répond.
        const remote = await authProvider.me();
        if (!cancelled && remote) setUser(remote);
      } catch (e) {
        // Échec visible plutôt que silencieux (AGENTS.md §7) : on conserve la
        // session locale au lieu de déconnecter sur un simple aléa réseau.
        console.warn("[auth] session serveur indisponible, session locale conservée", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback<AuthCtx["signIn"]>(
    async (email, password) => {
      const outcome = await authProvider.signIn({ email, password });
      if (!outcome.ok) return { error: { message: outcome.message } };
      persist(outcome.user);
      return { error: null };
    },
    [persist],
  );

  const signUp = useCallback<AuthCtx["signUp"]>(
    async (email, password, meta) => {
      const outcome = await authProvider.signUp({
        email,
        password,
        name: meta?.name,
        phone: meta?.phone,
      });
      if (!outcome.ok) return { error: { message: outcome.message } };
      persist(outcome.user);
      return { error: null };
    },
    [persist],
  );

  const signOut = useCallback<AuthCtx["signOut"]>(async () => {
    await authProvider.signOut();
    persist(null);
  }, [persist]);

  const updateProfile = useCallback<AuthCtx["updateProfile"]>(
    async (input) => {
      if (!user) return { error: { message: "Aucune session active." } };
      const updated = await authProvider.updateProfile(user, input);
      persist(updated);
      return { error: null };
    },
    [persist, user],
  );

  const forgotPassword = useCallback<AuthCtx["forgotPassword"]>(
    (email) => authProvider.forgotPassword(email),
    [],
  );

  const resetPassword = useCallback<AuthCtx["resetPassword"]>(
    (input) => authProvider.resetPassword(input),
    [],
  );

  const changePassword = useCallback<AuthCtx["changePassword"]>(
    (currentPassword, password) => {
      if (!user) return Promise.resolve(false);
      return authProvider.changePassword(user.email, currentPassword, password);
    },
    [user],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session: user ? { user } : null,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      forgotPassword,
      resetPassword,
      changePassword,
    }),
    [
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      forgotPassword,
      resetPassword,
      changePassword,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
