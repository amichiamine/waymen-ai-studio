import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  verifyUserCredentials,
  findUserByEmail,
  touchUserLogin,
  upsertUser,
  type AdminUser,
} from "@/lib/admin-store";

// Auth mockée : pas de backend. Les identifiants sont validés contre la
// table `admin-store.users` (comptes créés/édités depuis /admin/users).
// La session est persistée en localStorage.

export type MockUser = {
  id: string;
  email: string;
  user_metadata: { name?: string; phone?: string };
};

type AuthCtx = {
  user: MockUser | null;
  session: { user: MockUser } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: null | { message: string } }>;
  signUp: (
    email: string,
    password: string,
    meta?: { name?: string; phone?: string },
  ) => Promise<{ error: null | { message: string } }>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = "ka-mock-user";
const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

function readStored(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

function toMock(u: AdminUser): MockUser {
  return { id: u.id, email: u.email, user_metadata: { name: u.name } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readStored());
    setLoading(false);
  }, []);

  const persist = (u: MockUser | null) => {
    if (typeof window !== "undefined") {
      if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else window.localStorage.removeItem(STORAGE_KEY);
    }
    setUser(u);
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const found = verifyUserCredentials(email, password);
    if (!found) {
      // Commodité de développement uniquement : les comptes semés (seed) n'ont
      // pas de mot de passe en production (voir import.meta.env.DEV dans
      // admin-store). En DEV, on autorise l'accès si un compte de même email
      // existe sans mot de passe, afin que les comptes de démonstration soient
      // utilisables sans avoir configuré .env.local.
      // Ce chemin est INTERDIT en production : un compte sans mot de passe ne
      // doit jamais permettre une connexion, quelle que soit la valeur saisie.
      if (import.meta.env.DEV) {
        const known = findUserByEmail(email);
        if (known && !known.password) {
          console.warn(
            "[auth] auth de développement : connexion accordée sans vérification du mot de passe" +
              " — ce chemin est absent du build de production",
          );
          touchUserLogin(known.email);
          persist(toMock(known));
          return { error: null };
        }
      }
      return { error: { message: "Identifiants invalides." } };
    }
    touchUserLogin(found.email);
    persist(toMock(found));
    return { error: null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, meta) => {
    const existing = findUserByEmail(email);
    if (existing) return { error: { message: "Un compte existe déjà avec cet email." } };
    const created: AdminUser = {
      id: `usr_${Date.now()}`,
      name: meta?.name || email.split("@")[0],
      email: email.trim(),
      role: "viewer",
      active: true,
      password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    upsertUser(created);
    persist({
      id: created.id,
      email: created.email,
      user_metadata: { name: created.name, phone: meta?.phone },
    });
    return { error: null };
  };

  return (
    <Ctx.Provider
      value={{
        user,
        session: user ? { user } : null,
        loading,
        signIn,
        signUp,
        signOut: async () => persist(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
