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

/** Signatures « clé::cause » déjà écrites en console — voir `logResourceNormalisation`. */
const alreadyReported = new Set<string>();

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

/**
 * Journalise une réponse SERVEUR STRUCTURELLEMENT INEXPLOITABLE.
 *
 * À distinguer de `logResourceFailure` : ici la requête a RÉUSSI (HTTP 200),
 * mais le corps ne respecte pas le contrat de `docs/API-CONTRACT.md` — par
 * exemple un tableau `[]` là où un objet de sections est attendu, ce que
 * produit `json_encode()` en PHP pour un tableau associatif vide.
 *
 * C'est le silence qui a coûté le plus cher : le socle acceptait ce corps
 * parce qu'il n'était pas `undefined`, l'injectait dans les composants, et la
 * page entière tombait sur un `TypeError` sans qu'aucun journal ne dise
 * pourquoi (AGENTS.md §7, « instrumenter »).
 *
 * On ne journalise QUE la violation de TYPE. Un objet `{}` ou une liste `[]`
 * sur une ressource de liste sont des états LÉGITIMES — une boutique neuve
 * dont le commerçant n'a rien saisi — et ne doivent jamais être présentés
 * comme une panne.
 */
export function logResourceNormalisation(key: string, cause: string): void {
  const entry: ResourceFailure = {
    key,
    status: 200,
    code: "reponse_inexploitable",
    message: cause,
    at: new Date().toISOString(),
  };
  failures.unshift(entry);
  if (failures.length > FAILURE_LIMIT) failures.length = FAILURE_LIMIT;

  // Une seule ligne par cause et par ressource. Sur une base vide, la même
  // violation de contrat se répète à chaque montage et à chaque route : la
  // console en portait des centaines d'exemplaires identiques, et c'est ainsi
  // qu'un avertissement cesse d'être lu (même leçon que le regroupement des
  // erreurs de `scripts/prerendu.ts`). L'anneau, lui, garde tout.
  const signature = `${key}::${cause}`;
  if (alreadyReported.has(signature)) return;
  alreadyReported.add(signature);

  console.error(
    `[data-provider] ressource « ${key} » : réponse acceptée par le réseau mais ` +
      `inexploitable — ${cause}. Repli sur les valeurs par défaut pour que la page ` +
      `reste affichable. Cette ligne n'est écrite qu'une fois par cause.`,
  );
}

/** Échecs les plus récents en premier. Lecture seule pour les appelants. */
export function getResourceFailures(): readonly ResourceFailure[] {
  return failures;
}

export function clearResourceFailures(): void {
  failures.length = 0;
  alreadyReported.clear();
}
