import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useAdminState, type AdminState } from "@/lib/admin-store";
import type { ApiError } from "@/api/client";

import { getRevision, invalidateResource, readCache, subscribeRevision, writeCache } from "./cache";
import { toApiError } from "./errors";
import { logResourceFailure } from "./log";
import { isHttpData } from "./mode";
import type { ResourceSource, ResourceState } from "./types";

type RemoteState<T> = { data: T; loading: boolean; error: ApiError | null };

/**
 * Socle commun de tous les hooks de lecture du fournisseur.
 *
 * La difficulté centrale de la phase 2 est là : 60 fichiers UI sont écrits en
 * **synchrone** au-dessus de `useAdminState()`, alors que HTTP est
 * **asynchrone**. On ne résout pas ça en rendant le mock asynchrone (toutes les
 * pages se mettraient à clignoter sans raison), ni en rendant HTTP synchrone
 * (impossible). On garde donc **deux moteurs** derrière **une seule forme de
 * retour** :
 *
 *  - moteur mock : `useAdminState()` (`useSyncExternalStore`) — la donnée est
 *    là au premier rendu, `loading` est `false`, `error` est `null` ;
 *  - moteur http : `useEffect` + `AbortController` + cache mémoire — `loading`
 *    est `true` le temps du premier aller-retour.
 *
 * Les deux moteurs sont **toujours montés** : les hooks ne peuvent pas être
 * appelés conditionnellement. Le moteur inactif ne coûte qu'une souscription
 * inerte, et c'est ce qui garantit qu'un basculement de mode ne change jamais
 * l'ordre des hooks.
 */
export function useResource<T>(source: ResourceSource<T>): ResourceState<T> {
  const { key, fromStore, fromHttp, fallback, enabled = true } = source;
  const httpActive = isHttpData() && enabled;

  // --- Moteur mock ---------------------------------------------------------
  const storeState = useAdminState();

  /**
   * Mémo manuel de la sélection locale. `fromStore` est une fermeture recréée à
   * chaque rendu : elle ne peut pas servir de dépendance à `useMemo`. `key`
   * encode déjà tous ses paramètres, et l'état du store change de référence à
   * chaque mutation — ces deux valeurs suffisent à décider d'un recalcul.
   *
   * Sans ce mémo, un sélecteur qui filtre (`s.products.filter(...)`) renverrait
   * un nouveau tableau à chaque rendu et invaliderait tous les `useMemo` des
   * composants appelants. Le pilote paie ce détail une fois pour les 62 fichiers.
   */
  const selection = useRef<{ key: string; state: AdminState; value: T } | null>(null);
  if (
    !selection.current ||
    selection.current.key !== key ||
    selection.current.state !== storeState
  ) {
    selection.current = { key, state: storeState, value: fromStore(storeState) };
  }
  const storeData = selection.current.value;

  // --- Moteur http ---------------------------------------------------------
  // Les fermetures passent par des refs : elles changent d'identité à chaque
  // rendu et déclencheraient une boucle de rechargement en dépendance d'effet.
  const fromHttpRef = useRef(fromHttp);
  fromHttpRef.current = fromHttp;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const revision = useSyncExternalStore(subscribeRevision, getRevision, getRevision);

  const [remote, setRemote] = useState<RemoteState<T>>(() => {
    const cached = httpActive ? readCache<T>(key) : undefined;
    return {
      data: cached === undefined ? fallback : cached,
      // `loading` n'est vrai que si un aller-retour est réellement nécessaire :
      // un cache chaud ne doit pas faire réapparaître le squelette.
      loading: httpActive && cached === undefined,
      error: null,
    };
  });

  useEffect(() => {
    if (!httpActive) return;

    const cached = readCache<T>(key);
    if (cached !== undefined) {
      setRemote((current) =>
        current.data === cached && !current.loading && current.error === null
          ? current
          : { data: cached, loading: false, error: null },
      );
      return;
    }

    // `alive` protège des réponses arrivées après démontage ou changement de
    // clé ; `abort()` coupe la requête elle-même (le client de `src/api` relaie
    // le signal et son propre délai d'expiration).
    const controller = new AbortController();
    let alive = true;
    setRemote((current) => (current.loading ? current : { ...current, loading: true }));

    fromHttpRef
      .current(controller.signal)
      .then((data) => {
        if (!alive) return;
        writeCache(key, data);
        setRemote({ data, loading: false, error: null });
      })
      .catch((cause: unknown) => {
        if (!alive || controller.signal.aborted) return;
        const error = toApiError(cause);
        // Dégradation gracieuse : jamais d'exception remontée au rendu (elle
        // déclencherait l'ErrorBoundary et un écran vide), mais un `error`
        // renseigné, une donnée toujours exploitable, et une trace journalisée.
        logResourceFailure(key, error);
        setRemote((current) => ({
          data: current.data === undefined ? fallbackRef.current : current.data,
          loading: false,
          error,
        }));
      });

    return () => {
      alive = false;
      controller.abort();
    };
    // `revision` est la dépendance qui rejoue la lecture après une mutation :
    // l'invalidation vide le cache puis incrémente l'horloge.
  }, [httpActive, key, revision]);

  const refetch = useCallback(() => {
    // En mock, le store local est déjà la source vive : rien à recharger. Le
    // no-op est volontaire pour qu'un bouton « réessayer » puisse être branché
    // sans se demander dans quel mode il tourne.
    if (!isHttpData()) return;
    invalidateResource(key);
  }, [key]);

  if (httpActive) {
    return { data: remote.data, loading: remote.loading, error: remote.error, refetch };
  }
  return { data: storeData, loading: false, error: null, refetch };
}

/**
 * Enveloppe une mutation : normalisation de l'erreur, journalisation, puis
 * invalidation de la ressource pour que toutes les vues montées se rafraîchissent.
 *
 * L'erreur est **relancée** après normalisation : c'est l'appelant qui sait
 * s'il doit afficher un toast, marquer un champ de formulaire (`error.fields`)
 * ou proposer une nouvelle tentative. Avaler l'erreur ici recréerait la
 * dégradation silencieuse que `AGENTS.md` §7 interdit.
 */
export async function runMutation<T>(
  resource: string,
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    const result = await operation();
    invalidateResource(resource);
    return result;
  } catch (cause) {
    const error = toApiError(cause);
    logResourceFailure(`${resource}#${label}`, error);
    throw error;
  }
}
