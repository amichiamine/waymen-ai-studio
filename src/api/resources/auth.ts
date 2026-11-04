import { isHttpMode } from "../config";
import { http, setAccessToken } from "../client";
import { endpoints as E } from "../endpoints";
import type { AuthSession, SignInInput, SignUpInput } from "../types";

/**
 * Service d'authentification côté HTTP.
 * En mode mock, `src/lib/auth.tsx` reste la source de vérité — ces méthodes
 * lèvent une erreur explicite pour éviter tout usage accidentel.
 */
const mockGuard = () => {
  throw new Error("authApi requiert VITE_API_MODE=http (mode mock : utiliser useAuth()).");
};

export const authApi = {
  async signUp(input: SignUpInput): Promise<AuthSession> {
    if (!isHttpMode()) return mockGuard();
    const s = await http.post<AuthSession>(E.auth.signUp(), input);
    if (s.accessToken) setAccessToken(s.accessToken);
    return s;
  },

  async signIn(input: SignInInput): Promise<AuthSession> {
    if (!isHttpMode()) return mockGuard();
    const s = await http.post<AuthSession>(E.auth.signIn(), input);
    if (s.accessToken) setAccessToken(s.accessToken);
    return s;
  },

  async signOut(): Promise<void> {
    if (!isHttpMode()) return;
    await http.post<void>(E.auth.signOut());
    setAccessToken(null);
  },

  async me(): Promise<AuthSession | null> {
    if (!isHttpMode()) return null;
    return http.get<AuthSession>(E.auth.me());
  },

  async refresh(): Promise<AuthSession> {
    if (!isHttpMode()) return mockGuard();
    const s = await http.post<AuthSession>(E.auth.refresh());
    if (s.accessToken) setAccessToken(s.accessToken);
    return s;
  },

  forgotPassword: (email: string) =>
    isHttpMode() ? http.post<void>(E.auth.forgotPassword(), { email }) : Promise.resolve(),

  resetPassword: (token: string, password: string) =>
    isHttpMode() ? http.post<void>(E.auth.resetPassword(), { token, password }) : Promise.resolve(),

  changePassword: (currentPassword: string, password: string) =>
    isHttpMode()
      ? http.post<void>(E.auth.changePassword(), { currentPassword, password })
      : Promise.resolve(),

  updateProfile: (input: { name: string; phone?: string }): Promise<AuthSession> =>
    isHttpMode() ? http.patch<AuthSession>(E.auth.profile(), input) : mockGuard(),
};
