import type { ApiError } from "@/api/client";

/**
 * Journal des échecs du fournisseur de données.
 *
 * `AGENTS.md` §7 : « une dégradation gracieuse silencieuse masque ses pannes ».
 * Comme le fournisseur remplace une ressource indisponible par une valeur vide,
 * l'interface reste utilisable — et l'incident deviendrait invisible sans trace.
 * On journalise donc **systématiquement, avec la cause**, en `console.error`
 * (seul canal de diagnostic d'une SPA 100 % client) et on conserve un anneau
 * borné en mémoire pour qu'un indicateur de mode (vague 2.6) puisse l'afficher
 * sans avoir à re-instrumenter le socle.
 */
export type ResourceFailure = {
  /** Clé de ressource concernée, telle qu'utilisée par le cache. */
  key: string;
  status: number;
  code: string;
  message: string;
  /** Horodatage ISO 8601 UTC, aligné sur `docs/API-CONTRACT.md`. */
  at: string;
};

/** Borne l'anneau : un backend durablement injoignable ne doit pas fuir en mémoire. */
const FAILURE_LIMIT = 50;

const failures: ResourceFailure[] = [];

export function logResourceFailure(key: string, error: ApiError): void {
  const entry: ResourceFailure = {
    key,
    status: error.status,
    code: error.code,
    message: error.message,
    at: new Date().toISOString(),
  };
  failures.unshift(entry);
  if (failures.length > FAILURE_LIMIT) failures.length = FAILURE_LIMIT;

  console.error(
    `[data-provider] ressource « ${key} » indisponible — ${entry.code} (HTTP ${entry.status}) : ${entry.message}`,
  );
}

/** Échecs les plus récents en premier. Lecture seule pour les appelants. */
export function getResourceFailures(): readonly ResourceFailure[] {
  return failures;
}

export function clearResourceFailures(): void {
  failures.length = 0;
}
