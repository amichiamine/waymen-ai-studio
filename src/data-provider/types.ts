import type { ApiError } from "@/api/client";
import type { AdminState } from "@/lib/admin-store";

/**
 * Forme de retour **unique** de tous les hooks de lecture du fournisseur.
 *
 * Intention : un composant est écrit une seule fois pour les deux modes. En
 * mock, `loading` vaut `false` dès le premier rendu et `error` reste `null` —
 * mais la forme ne change pas, donc le code qui traite le chargement et
 * l'erreur est déjà en place le jour où `VITE_API_MODE=http` est activé.
 *
 * `data` n'est jamais `undefined` pour une liste : une source indisponible
 * renvoie une liste vide (dégradation gracieuse, cf. `AGENTS.md` §6). Seuls les
 * hooks de détail peuvent renvoyer `undefined`, car « introuvable » est un
 * résultat légitime.
 */
export type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: ApiError | null;
  /**
   * Relance la lecture réseau après invalidation du cache. En mode mock, le
   * store local est déjà la source vive : l'appel est un no-op volontaire, de
   * sorte qu'un bouton « réessayer » puisse être branché sans condition.
   */
  refetch: () => void;
};

/**
 * Contrat d'une lecture de ressource, fourni par le hook d'entité au socle.
 * Les deux moteurs (mock synchrone / http asynchrone) sont décrits côte à côte
 * pour rendre visible toute divergence de sémantique entre les modes.
 */
export type ResourceSource<T> = {
  /**
   * Clé de cache et d'identité de la ressource. Doit être **stable par valeur**
   * (une chaîne) et encoder tous les paramètres de la requête : c'est elle qui
   * décide d'un rechargement, jamais un objet de requête recréé à chaque rendu.
   */
  key: string;
  /** Lecture synchrone dans le store local (mode mock). */
  fromStore: (state: AdminState) => T;
  /** Lecture réseau (mode http). Doit propager `signal` quand la ressource l'accepte. */
  fromHttp: (signal: AbortSignal) => Promise<T>;
  /** Valeur affichable quand la source est indisponible. Référence stable exigée. */
  fallback: T;
  /**
   * `false` = hook monté mais inactif (identifiant absent, garde de permission
   * non satisfaite). Indispensable : un hook ne peut pas être appelé
   * conditionnellement, donc on le désactive au lieu de ne pas l'appeler.
   */
  enabled?: boolean;
};
