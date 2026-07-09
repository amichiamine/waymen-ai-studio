import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Auth mockée : pas de backend. On simule un utilisateur stocké en localStorage.
// L'objet `user` reproduit une forme minimale compatible avec le code d'origine
// (id / email / user_metadata) pour éviter de casser les composants.

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
    meta?: { name?: string; phone?: string }
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

  const signIn: AuthCtx["signIn"] = async (email) => {
    const u: MockUser = {
      id: "demo-user",
      email,
      user_metadata: { name: email.split("@")[0] },
    };
    persist(u);
    return { error: null };
  };

  const signUp: AuthCtx["signUp"] = async (email, _password, meta) => {
    const u: MockUser = {
      id: "demo-user",
      email,
      user_metadata: { name: meta?.name, phone: meta?.phone },
    };
    persist(u);
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
