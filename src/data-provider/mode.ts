/**
 * Sélection du mode de données — **le seul endroit du dépôt** où le choix
 * mock / http est lu par l'interface.
 *
 * Intention : aucun composant, aucun hook d'entité ne doit interroger
 * `import.meta.env` ni `API_MODE`. Un composant qui « sait » dans quel mode il
 * tourne finit toujours par se comporter différemment dans l'un des deux, et la
 * promesse de `docs/API-CONTRACT.md` (« basculer `VITE_API_MODE` sans modifier
 * aucun composant ») redevient fausse.
 *
 * On ré-exporte la valeur de `src/api/config.ts` plutôt que de relire
 * l'environnement : une seule source de vérité pour le mode.
 */
import { API_MODE, type ApiMode } from "@/api/config";

export const DATA_MODE: ApiMode = API_MODE;

/** Vrai lorsque les données proviennent du réseau (donc asynchrones). */
export const isHttpData = (): boolean => DATA_MODE === "http";
