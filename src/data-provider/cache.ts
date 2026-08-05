/**
 * Cache mémoire par clé de ressource + horloge d'invalidation.
 *
 * Intention : sans cache, chaque navigation vers une page qui lit les produits
 * relancerait un appel réseau, et deux composants montés simultanément en
 * feraient deux. `react-query` remplissait ce rôle mais a été retiré en phase 0
 * (monté, jamais utilisé) — on ne le réintroduit pas pour 60 lignes.
 *
 * Deux mécanismes complémentaires :
 *  - le **cache** évite de refaire un appel déjà satisfait (TTL court) ;
 *  - la **révision** est une horloge globale : toute invalidation l'incrémente,
 *    et les hooks http y sont abonnés via `useSyncExternalStore`. C'est ce qui
 *    fait qu'une mutation rafraîchit toutes les vues montées, exactement comme
 *    `emit()` le fait dans `admin-store` pour le mode mock.
 */

/**
 * TTL volontairement court : les données de ce back-office sont modifiées par
 * l'utilisateur lui-même, une fenêtre longue donnerait l'impression que
 * l'application « ne se met pas à jour ». Les mutations invalident de toute
 * façon explicitement.
 */
const TTL_MS = 30_000;

type CacheEntry = { value: unknown; at: number };

const entries = new Map<string, CacheEntry>();

/**
 * Retourne la valeur en cache, ou `undefined` si absente ou périmée.
 *
 * Piège assumé : une valeur `undefined` mémorisée est indistinguable d'une
 * absence de cache. Les hooks de détail refont donc l'appel pour une ressource
 * réellement introuvable — coût acceptable, ambiguïté évitée.
 */
export function readCache<T>(key: string): T | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) {
    entries.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function writeCache<T>(key: string, value: T): void {
  entries.set(key, { value, at: Date.now() });
}

// ---------------------------------------------------------------------------
// Horloge d'invalidation
// ---------------------------------------------------------------------------

let revision = 0;
const listeners = new Set<() => void>();

export function subscribeRevision(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRevision(): number {
  return revision;
}

function bumpRevision(): void {
  revision += 1;
  listeners.forEach((listener) => listener());
}

/**
 * Invalide toutes les clés d'une ressource, quelles que soient ses variantes de
 * requête. `invalidateResource("products")` évacue aussi
 * `products?category=laptops` et `products/abc` : après une mutation, aucune
 * variante n'est plus digne de confiance.
 */
export function invalidateResource(prefix: string): void {
  for (const key of Array.from(entries.keys())) {
    if (key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`)) {
      entries.delete(key);
    }
  }
  bumpRevision();
}

/** Purge totale — utile à une déconnexion : aucune donnée d'une session ne survit. */
export function invalidateAll(): void {
  entries.clear();
  bumpRevision();
}
