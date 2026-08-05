import { ApiError } from "@/api/client";

/**
 * Normalise n'importe quelle valeur levée en `ApiError`.
 *
 * Intention : l'appelant (composant ou hook) ne doit jamais avoir à faire de
 * `instanceof` en cascade ni à inspecter un `unknown`. Après ce passage,
 * `status`, `code`, `message` et `fields` sont toujours disponibles — y compris
 * pour une erreur de programmation remontée par le store local en mode mock.
 *
 * `status: 0` et `code: "provider_error"` signalent une cause locale (non HTTP),
 * ce qui permet de distinguer une panne réseau d'un défaut de code.
 */
export function toApiError(cause: unknown): ApiError {
  if (cause instanceof ApiError) return cause;
  if (cause instanceof Error) return new ApiError(0, "provider_error", cause.message, undefined);
  if (typeof cause === "string" && cause.trim() !== "") {
    return new ApiError(0, "provider_error", cause);
  }
  return new ApiError(0, "provider_error", "Erreur inattendue du fournisseur de données.");
}
