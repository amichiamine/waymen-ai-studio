# Fournisseur de données (`src/data-provider`) — spécification

> **Statut** : pilote livré pour la ressource **produits** (vagues 2.1 + 2.2 de
> `PLAN.md` §6). Les autres ressources sont à créer en vague 2.3 **en copiant
> `src/data-provider/products.ts`**, et les 61 fichiers UI restants à migrer en
> vague 2.4 **en copiant `src/pages/Search.tsx`**.
>
> Ce document est la spécification que suivent les agents de migration. Il ne
> décrit pas une intention : il décrit du code livré et vérifié.

---

## 1. Le problème que ce module résout

`src/api/config.ts` promet qu'il suffit de passer `VITE_API_MODE=http` pour
brancher un backend « sans modifier aucun composant ». La promesse était
**architecturalement fausse** : aucun des 76 fichiers de `src/pages` et
`src/components` n'importait `@/api`. Ils lisaient tous directement
`src/lib/admin-store.tsx` — **62 fichiers**, dont **60** via `useAdminState()`.

`useAdminState()` est **synchrone** : il rend l'état complet, disponible dès le
premier rendu. HTTP est **asynchrone**. Tout le code appelant est écrit en
synchrone. C'est la difficulté centrale de la phase 2, et le fournisseur la
résout d'une seule façon : **deux moteurs, une seule forme de retour**.

|                        | Mode `mock`                                | Mode `http`                                     |
| ---------------------- | ------------------------------------------ | ----------------------------------------------- |
| Moteur                 | `useAdminState()` (`useSyncExternalStore`) | `useEffect` + `AbortController` + cache mémoire |
| `data` au 1er rendu    | la donnée réelle                           | le repli (liste vide) ou le cache chaud         |
| `loading` au 1er rendu | **`false`**                                | `true` si un aller-retour est nécessaire        |
| `error`                | toujours `null`                            | `ApiError` renseignée en cas d'échec            |
| Rafraîchissement       | `emit()` d'`admin-store`                   | horloge de révision (`cache.ts`)                |

**La forme du retour est identique dans les deux modes.** C'est ce qui permet
d'écrire un composant **une seule fois**. Un composant ne doit jamais savoir
dans quel mode il tourne : ni `API_MODE`, ni `isHttpData()`, ni
`import.meta.env` dans `src/pages` ou `src/components`.

---

## 2. Interface

### 2.1 Forme de retour des hooks de lecture

```ts
// src/data-provider/types.ts
type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
};
```

- `data` **n'est jamais `undefined` pour une liste** : une source indisponible
  renvoie `[]`. Seuls les hooks de détail peuvent renvoyer `undefined`, car
  « introuvable » est un résultat légitime.
- `error` est l'`ApiError` de `src/api/client.ts` — `status`, `code`, `message`,
  `fields`. Toute valeur levée est normalisée par `toApiError()` ; un échec
  d'origine locale porte `status: 0` et `code: "provider_error"`.
- `refetch()` invalide le cache et relance la lecture. **En mode mock c'est un
  no-op volontaire** : le store est déjà la source vive. Un bouton
  « réessayer » peut donc être branché sans condition de mode.

### 2.2 Hooks de la ressource produits (livrés)

```ts
import { useProductList, useProductDetail, useProductMutations } from "@/data-provider";

function useProductList(query?: ProductQuery): ResourceState<Product[]>;
function useProductDetail(id?: string): ResourceState<Product | undefined>;

type ProductMutations = {
  create: (input: Product) => Promise<Product>;
  update: (id: string, input: Product) => Promise<Product>;
  remove: (id: string) => Promise<void>;
};
function useProductMutations(): ProductMutations;
```

- `query` est le `ProductQuery` de `src/api/types.ts` (`category`, `brand`,
  `minPrice`, `maxPrice`, `stock`, `use`, `bestSeller`, `sale`, `search`,
  `page`, `perPage`, `sort`, `order`).
- `useProductList()` renvoie **aussi les configurations `/builder`**
  (`customBuild`), exactement comme `useAdminState().products` avant migration.
  Toute surface publique de listing doit continuer à passer par
  `catalogProducts()` de `@/data/products`. **Ne pas régresser ce filtrage.**
- `useProductDetail(undefined)` : le hook reste **monté et inactif**. On ne
  court-circuite jamais l'appel du hook lui-même.

### 2.3 Mutations

Les mutations sont **toujours asynchrones**, y compris en mock où elles
résolvent immédiatement après écriture dans le store. Elles :

1. appellent la ressource de `src/api/resources/*` (jamais `admin-store`
   directement — pas de duplication de logique) ;
2. **invalident** la ressource en cas de succès, ce qui rafraîchit toutes les
   vues montées (équivalent http de l'`emit()` du store) ;
3. **journalisent** l'échec et **relancent** l'erreur normalisée en `ApiError`.

L'erreur n'est jamais avalée : c'est l'appelant qui sait s'il doit afficher un
toast, marquer un champ (`error.fields`) ou proposer une nouvelle tentative.

```tsx
const { update } = useProductMutations();
const [saving, setSaving] = useState(false);

const onSubmit = async (draft: Product) => {
  setSaving(true);
  try {
    await update(draft.id, draft);
    toast.success(/* … */);
  } catch (cause) {
    const error = toApiError(cause); // { status, code, message, fields }
    toast.error(error.message);
  } finally {
    setSaving(false);
  }
};
```

### 2.4 Socle commun (à réutiliser, pas à réécrire)

| Fichier           | Rôle                                                       |
| ----------------- | ---------------------------------------------------------- |
| `mode.ts`         | **Seul** endroit qui lit `API_MODE`. `isHttpData()`.       |
| `types.ts`        | `ResourceState<T>`, `ResourceSource<T>`.                   |
| `use-resource.ts` | `useResource()` (les deux moteurs), `runMutation()`.       |
| `cache.ts`        | Cache mémoire par clé (TTL 30 s) + horloge d'invalidation. |
| `errors.ts`       | `toApiError()`.                                            |
| `log.ts`          | `logResourceFailure()`, `getResourceFailures()`.           |
| `products.ts`     | **Le pilote à copier** pour chaque nouvelle ressource.     |
| `index.ts`        | Interface publique — les composants n'importent que d'ici. |

Créer une ressource = fournir un `ResourceSource<T>` à `useResource()` :

```ts
export function useCouponList(): ResourceState<Coupon[]> {
  return useResource<Coupon[]>({
    key: "coupons", // stable PAR VALEUR, encode tous les paramètres de requête
    fromStore: (state) => state.coupons, // lecture synchrone (mock)
    fromHttp: async () => (await couponsApi.list()).items, // lecture réseau (http)
    fallback: NO_COUPONS, // référence stable au niveau module
  });
}
```

Pas de `react-query` : il a été retiré en phase 0 (monté, jamais utilisé). Ne
pas le réintroduire.

---

## 3. Tableau de correspondance `useAdminState()` → provider

Nomenclature, sans exception : `use<Entité>List` / `use<Entité>Detail` /
`use<Entité>Mutations`, et `use<Réglage>` pour les singletons.

| `useAdminState().xxx`       | Hook de lecture                    | Détail                         | Mutations                        | État      |
| --------------------------- | ---------------------------------- | ------------------------------ | -------------------------------- | --------- |
| `.products`                 | `useProductList(query?)`           | `useProductDetail(id?)`        | `useProductMutations()`          | **livré** |
| `.categories`               | `useCategoryList()`                | `useCategoryDetail(slug?)`     | `useCategoryMutations()`         | 2.3       |
| `.brands`                   | `useBrandList()`                   | `useBrandDetail(id?)`          | `useBrandMutations()`            | 2.3       |
| `.orders`                   | `useOrderList(query?)`             | `useOrderDetail(id?)`          | `useOrderMutations()`            | 2.3       |
| `.orders` (client connecté) | `useMyOrderList()`                 | —                              | —                                | 2.3       |
| `.customers`                | `useCustomerList()`                | `useCustomerDetail(id?)`       | `useCustomerMutations()`         | 2.3       |
| `.coupons`                  | `useCouponList()`                  | `useCouponDetail(code?)`       | `useCouponMutations()`           | 2.3       |
| `.reviews`                  | `useReviewList(query?)`            | —                              | `useReviewMutations()`           | 2.3       |
| `.reviews` (d'un produit)   | `useProductReviewList(productId?)` | —                              | `useReviewMutations()`           | 2.3       |
| `.users`                    | `useUserList()`                    | `useUserDetail(id?)`           | `useUserMutations()`             | 2.3       |
| `.blogPosts`                | `useBlogPostList()`                | `useBlogPostDetail(idOrSlug?)` | `useBlogPostMutations()`         | 2.3       |
| `.homeReviews`              | `useHomeReviewList()`              | —                              | `useHomeReviewMutations()`       | 2.3       |
| `.tickerMessages`           | `useTickerMessageList()`           | —                              | `useTickerMessageMutations()`    | 2.3       |
| `.marqueeBrands`            | `useMarqueeBrandList()`            | —                              | `useMarqueeBrandMutations()`     | 2.3       |
| `.aboutValues`              | `useAboutValueList()`              | —                              | `useAboutValueMutations()`       | 2.3       |
| `.builderSteps`             | `useBuilderStepList()`             | —                              | `useBuilderStepMutations()`      | 2.3       |
| `.shippingRates`            | `useShippingRateList()`            | —                              | `useShippingRateMutations()`     | 2.3       |
| `.paymentMethods`           | `usePaymentMethodList()`           | —                              | `usePaymentMethodMutations()`    | 2.3       |
| `.stockMovements`           | `useStockMovementList()`           | —                              | `useInventoryMutations()`        | 2.3       |
| `.mediaAssets`              | `useMediaAssetList()`              | `useMediaAssetDetail(id?)`     | `useMediaAssetMutations()`       | 2.3       |
| `.notifications`            | `useNotificationList()`            | —                              | `useNotificationMutations()`     | 2.3       |
| `.auditLogs`                | `useAuditLogList()`                | —                              | — (lecture seule)                | 2.3       |
| `.messages`                 | `useContactMessageList()`          | —                              | `useContactMessageMutations()`   | 2.3       |
| `.subscribers`              | `useSubscriberList()`              | —                              | `useSubscriberMutations()`       | 2.3       |
| `.siteSettings`             | `useSiteSettings()`                | —                              | `useSiteSettingsMutations()`     | 2.3       |
| `.shippingSettings`         | `useShippingSettings()`            | —                              | `useShippingSettingsMutations()` | 2.3       |
| `.siteContent`              | `useSiteContent()`                 | —                              | `useSiteContentMutations()`      | 2.3       |

Hooks dérivés déjà réécrits par-dessus le provider, à conserver tels quels :

| Hook existant                            | Signature publique inchangée          |
| ---------------------------------------- | ------------------------------------- |
| `useProducts()` de `@/lib/useProducts`   | `(): Product[]`                       |
| `useProduct(id?)` de `@/lib/useProducts` | `(id?: string): Product \| undefined` |

Ces deux-là restent le chemin le plus court pour un composant qui n'affiche
**aucun** état de chargement (une section de la page d'accueil, par exemple).
Ils masquent `loading` et `error` : en mode http, ils rendent une liste vide le
temps du premier aller-retour et l'échec n'est visible que dans le journal.
**Toute page dont les produits sont le contenu principal doit utiliser
`useProductList()` et traiter `loading` / `error`** — c'est ce que fait
`src/pages/Search.tsx`.

---

## 4. Migration douce — non négociable

`useAdminState()` et les mutations directes d'`admin-store` **continuent de
fonctionner à l'identique** pendant toute la phase 2. `src/lib/admin-store.tsx`
n'est pas modifié : le fournisseur l'**enveloppe**.

Conséquence pratique : à tout instant, une partie des 62 fichiers est migrée,
l'autre non, et l'application fonctionne. Un fichier migré et un fichier non
migré partagent le même store en mode mock, donc la même donnée et les mêmes
mises à jour. Aucun « big bang » n'est nécessaire — et aucun n'est autorisé.

La règle ESLint interdisant l'import direct d'`admin-store` depuis `pages/` et
`components/` n'arrive qu'en **vague 2.6**, une fois les 62 fichiers migrés.

---

## 5. Recette de migration

### 5.1 Avant

```tsx
import { useAdminState } from "@/lib/admin-store";

export default function CouponBoard() {
  const { coupons } = useAdminState();
  return (
    <ul>
      {coupons.map((c) => (
        <li key={c.code}>{c.code}</li>
      ))}
    </ul>
  );
}
```

Ce composant n'a jamais eu besoin de `loading` ni d'`error` : la donnée était là
au premier rendu. En http, elle ne l'est plus.

### 5.2 Après

```tsx
import { useCouponList } from "@/data-provider";
import { useI18n } from "@/lib/i18n";

export default function CouponBoard() {
  const { t } = useI18n();
  // Même en mode mock, on traite les trois états : c'est ce qui rend la bascule
  // vers http sans effet de bord. En mock, `loading` est `false` dès le premier
  // rendu et `error` reste `null` — les deux branches ne coûtent rien.
  const { data: coupons, loading, error } = useCouponList();

  // 1. Chargement : un squelette de la MÊME forme que le contenu final, jamais
  //    un écran vide ni un décalage de mise en page.
  if (loading) {
    return (
      <ul aria-busy="true">
        <span className="sr-only">{t("app.loading")}</span>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </ul>
    );
  }

  // 2. Erreur : `data` reste exploitable (liste vide), donc on n'annule PAS le
  //    rendu. On ajoute un bandeau au-dessus du contenu habituel, et l'échec
  //    est déjà journalisé avec sa cause par le fournisseur.
  return (
    <>
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      {/* 3. État vide : distinct de l'erreur et du chargement. */}
      {coupons.length === 0 ? (
        <p className="text-muted-foreground">{t("…empty")}</p>
      ) : (
        <ul>
          {coupons.map((c) => (
            <li key={c.code}>{c.code}</li>
          ))}
        </ul>
      )}
    </>
  );
}
```

### 5.3 Ordre des trois états

Toujours dans cet ordre, il n'y a pas de variante à inventer :

1. **`loading`** → squelette (jamais un écran vide, jamais un spinner plein
   écran sur une page qui a déjà une mise en page).
2. **`error`** → bandeau **au-dessus du contenu**, texte issu de
   `error.message`. On ne remplace pas la page : `data` est exploitable.
3. **vide** → message d'état vide déjà existant de la page.

### 5.4 Cas particuliers

- **Le composant n'affiche pas les données comme contenu principal** (bandeau,
  compteur, section secondaire d'accueil) : garder `useProducts()` /
  l'équivalent dérivé, ou ignorer `loading` en affichant simplement la liste
  vide. Ne pas ajouter un squelette là où l'absence de contenu est invisible.
- **Mutation** : cf. §2.3. Ajouter un état local `saving` et désactiver le
  bouton — la mutation est asynchrone dans les deux modes.
- **Page admin** : les gardes de permission de la phase 1 (`canPerform`,
  `getActiveRole`) restent **au même endroit et avant tout appel de mutation**.
  Migrer la lecture ne déplace jamais une garde.

---

## 6. Pièges

| Piège                                         | Règle                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hook conditionnel**                         | Jamais de hook derrière un `if`, un `&&` ou un `return` anticipé. Un hook inutile se **désactive** (`enabled: false`, `id` à `undefined`), il ne se saute pas. Le socle monte volontairement les deux moteurs pour cette raison.                                                    |
| **Écran blanc**                               | Une erreur n'annule pas le rendu. `data` reste exploitable (liste vide), l'`ErrorBoundary` est un filet, pas un mode d'affichage.                                                                                                                                                   |
| **État vide oublié**                          | `loading === false && error === null && data.length === 0` est un cas normal. Trois branches, pas deux.                                                                                                                                                                             |
| **Garde de permission régressée**             | Les vérifications de rôle de la phase 1 restent en place, à l'identique. Aucune donnée admin ne doit devenir lisible par la migration.                                                                                                                                              |
| **`customBuild` réintroduit dans un listing** | `catalogProducts()` reste obligatoire sur toute surface publique de listing (accueil, catégorie, recherche).                                                                                                                                                                        |
| **Clé de cache instable**                     | La `key` doit être une **chaîne** encodant tous les paramètres. Un objet de requête littéral change de référence à chaque rendu → boucle de rechargement infinie.                                                                                                                   |
| **Repli non stable**                          | `fallback` doit être une constante de module (`const NO_X: X[] = []`), jamais un `[]` littéral : sinon tous les mémos en aval sont invalidés à chaque rendu.                                                                                                                        |
| **Sélecteur mock coûteux**                    | `fromStore` doit rester une lecture/filtrage pur. Le socle le mémorise sur `(key, état du store)`.                                                                                                                                                                                  |
| **i18n**                                      | Toute chaîne visiteur passe par `t()`. Ne pas inventer de clé : si elle manque, se replier sur une clé existante ou sur une donnée dynamique (`error.message`) et **le signaler**. Alignement `text-start`/`text-end`, `ms-`/`me-`/`ps-`/`pe-` — jamais `left`/`right`/`ml-`/`mr-`. |
| **`any`, `@ts-ignore`, `eslint-disable`**     | Interdits sans exception (`AGENTS.md` §6).                                                                                                                                                                                                                                          |
| **Import direct**                             | Depuis `pages/` et `components/` : `@/data-provider` uniquement. Pas `@/api`, pas `@/lib/admin-store`, pas `@/api/config`.                                                                                                                                                          |

---

## 7. Limites connues de la phase 2, à traiter plus tard

1. **Pas de métadonnées de pagination** dans `ResourceState<T>` : la forme
   uniforme est non négociable, donc `total` / `page` ne sont pas exposés.
   `useProductList()` demande `perPage: 100` par défaut pour aligner le mode
   http sur le mock (qui renvoie tout le catalogue). Les tableaux admin qui
   auront besoin d'une vraie pagination serveur exigeront une décision
   d'architecture — pas un contournement local.
2. **`applyProductQuery()` duplique `paginateLocal()`** de
   `src/api/resources/products.ts`, non exportée et hors périmètre de la vague
   2.2. À fusionner en vague 2.3 : deux filtres qui divergent = résultats
   différents entre mock et http.
3. **`useProductDetail()` en http ne résout pas les configurations
   `/builder`** : un `customBuild` n'existe que dans le store local, `GET
/products/:id` renverra 404. Panier et paiement en dépendent — à traiter
   quand le backend existera.
4. **`AbortSignal` non relayé par les ressources** de `src/api/resources/*`
   (leurs signatures ne l'acceptent pas encore). L'annulation est assurée par
   le drapeau `alive` du socle et par le délai d'expiration de
   `src/api/client.ts`. Ajouter le paramètre en vague 2.3.
5. **Aucune clé i18n pour « réessayer » / « ressource indisponible »** dans
   `src/lib/i18n/{fr,en,ar}.ts`. Les bandeaux d'erreur affichent donc
   `error.message` (produit par le serveur, déjà lisible) et aucun bouton de
   nouvelle tentative n'est étiqueté. `refetch()` est prêt côté provider : il
   suffira de brancher un bouton dès que les clés existeront.
