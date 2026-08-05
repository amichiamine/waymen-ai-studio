# Audit de cohérence modèle ↔ API — Phase 2 (Vague 2.7)

> **Date** : 2026-08-05
> **Branche** : `chantier/phase-2-provider`
> **Périmètre** : `src/data-provider/` (24 fichiers), `src/api/resources/` (14 fichiers),
> `src/api/endpoints.ts`, `src/lib/admin-store.tsx`
> **Méthode** : lecture exhaustive des sources, application de la skill S9

---

## Synthèse

| Gravité                         | Nombre de constats |
| ------------------------------- | ------------------ |
| Bloquant pour la phase 4        | 7                  |
| À corriger (non bloquant)       | 9                  |
| Cosmétique / divergence mineure | 5                  |
| **Total**                       | **21**             |

---

## 1. Comptage réel des endpoints déclarés

`src/api/endpoints.ts` déclare **70 endpoints** (et non 86 comme mentionné dans le plan). Le
décompte par groupe :

| Groupe     | Endpoints |
| ---------- | --------- |
| auth       | 8         |
| products   | 6         |
| categories | 5         |
| brands     | 5         |
| orders     | 6         |
| customers  | 2         |
| coupons    | 5         |
| reviews    | 5         |
| blog       | 5         |
| content    | 3         |
| settings   | 4         |
| inventory  | 2         |
| media      | 3         |
| crm        | 4         |
| users      | 4         |
| analytics  | 3         |
| **Total**  | **70**    |

### Taux d'implémentation

- **Implémentés** (appelés dans au moins une ressource `src/api/resources/*.ts`) : **63 / 70**
- **Déclarés mais non implémentés** : **7 / 70**

Endpoints non implémentés :

| Endpoint                         | Raison documentée                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `analytics.dashboard`            | Aucune ressource API ni hook provider. Non branché.                                                                     |
| `analytics.reports`              | Aucune ressource API ni hook provider. Non branché.                                                                     |
| `analytics.audit`                | Non implémenté HTTP ; le provider lève une `ApiError` 501 explicite (audit-logs.ts l. 40).                              |
| `products.stock`                 | Déclaré dans endpoints.ts l. 23 ; `products.ts` n'expose pas de `updateStock`. Commentaire dans inventory.ts l. 18.     |
| `orders.remove`                  | Déclaré (`DELETE /orders/:id`) ; `ordersApi` n'a pas de méthode `remove`. Commentaire dans orders.ts (provider) l. 103. |
| `content.homeReviews`            | Déclaré (`GET /content/home-reviews`) ; non câblé dans `content.ts`. home-reviews.ts l. 9.                              |
| `users.detail` (endpoint propre) | `usersApi.detail()` construit l'URL manuellement (`list() + "/" + id`) au lieu d'un endpoint dédié. users.ts l. 43.     |

### Endpoints non déclarés mais appelés

| Appel HTTP                                    | Fichier                       | Ligne |
| --------------------------------------------- | ----------------------------- | ----- |
| `PATCH /settings/shipping/rates/:wilayaCode`  | shipping-rates.ts (provider)  | 42    |
| `DELETE /settings/shipping/rates/:wilayaCode` | shipping-rates.ts (provider)  | 46    |
| `PATCH /settings/payments/:id`                | payment-methods.ts (provider) | 39    |
| `DELETE /settings/payments/:id`               | payment-methods.ts (provider) | 43    |
| `GET /media/:id` (via `list() + "/:id"`)      | media.ts (resources)          | 79    |

---

## 2. Champs du modèle contre champs exposés par entité

### 2.1 Produits

- **Modèle** (`src/data/products.ts`) : `id`, `name`, `brand`, `category`, `use`, `specLine`,
  `specs`, `price`, `oldPrice?`, `stock`, `stockQty?`, `image`, `bestSeller?`, `sale?`, `customBuild?`.
- **API** (`productsApi.create` / `productsApi.update`) : accepte `Product` complet — **tous les champs sont exposés**. ✓
- **Hook** (`useProductList`) : expose tous les champs via `fromStore`. ✓
- **Constat** : entité cohérente.

### 2.2 Catégories

- **Modèle** (`AdminCategory`) : `slug`, `label`, `description`, `cover?`.
- **API** (`categoriesApi.create` / `categoriesApi.update`) : accepte `AdminCategory` complet. ✓
- **Constat** : entité cohérente.

### 2.3 Marques

- **Modèle** (`AdminBrand`) : `id`, `name`, `description?`, `country?`.
- **API** (`brandsApi.create` / `brandsApi.update`) : accepte `AdminBrand` complet. ✓
- **Constat** : entité cohérente.

### 2.4 Commandes

- **Modèle** (`Order`) : `id`, `customerId`, `customerName`, `customerEmail?`, `items`,
  `subtotal`, `discount`, `couponCode?`, `shipping`, `total`, `status`, `statusHistory`,
  `paymentMethod`, `paymentLabel?`, `wilaya`, `deliveryKind`, `address`, `phone`, `createdAt`, `note?`.
- **API** (`ordersApi`) : `create` accepte `CreateOrderInput` (forme abrégée — pas l'`Order` complet).
  `updateStatus` accepte uniquement `status` + `note`.
  `ordersApi.remove` **n'existe pas** alors que `DELETE /orders/:id` est déclaré.
- **Hook** (`useOrderMutations`) : expose `create` et `updateStatus`. Pas de `remove`. **Bloquant.**
- **`CreateOrderInput`** (`src/api/types.ts` l. 103) : la résolution `items.name` et `items.price`
  est absente — ces champs sont dérivés en aval. En mode mock, le provider remplace `name` par
  `productId` et `price` par `0` (orders.ts provider l. 124–126). **Les `OrderItem` créés en mock
  sont corrompus** (nom = id produit, prix = 0). Bloquant pour tout scénario de test de la vague 3.
- **Gravité** : bloquant pour la phase 4 (× 2 problèmes).

### 2.5 Clients

- **Modèle** (`Customer`) : `id`, `name`, `email`, `phone`, `wilaya`, `createdAt`, `ordersCount`,
  `totalSpent`.
- **API** (`customersApi.upsert`) : accepte `Customer` complet, mais utilise `PATCH`
  `E.customers.detail(input.id)` pour la mise à jour et `POST` `E.customers.list()` pour la
  création (l. 40–46). Ces deux endpoints HTTP ne sont pas dédiés : `list` est `GET /customers`,
  pas un endpoint de création. La méthode `remove` appelle `E.customers.detail(id)` avec `DELETE`
  mais `endpoints.customers.detail` n'est déclaré que comme `GET`. **Non bloquant fonctionnellement
  en mock** mais le contrat HTTP est imprécis.
- **Endpoints manquants** : `customers.create`, `customers.update`, `customers.remove` ne sont pas
  déclarés dans `endpoints.ts`. `customersApi` appelle des combinaisons méthode+URL hors déclaration.
- **Gravité** : à corriger.

### 2.6 Coupons

- **Modèle** (`Coupon`) : `code`, `type`, `value`, `minPurchase`, `expiresAt`, `usageCount`,
  `usageLimit`, `active`.
- **API** : `create` / `update` acceptent `Coupon` complet. `validate` est correctement câblé. ✓
- **Particularité** : `couponsApi.detail(code)` appelle `E.coupons.update(code)` (l. 30) — soit
  `PATCH /coupons/:code` — pour une lecture. C'est sémantiquement faux (un GET déguisé en PATCH).
  En mode mock l'appel est correct car `isHttpMode()` renvoie `false`, mais en HTTP cela enverra
  une requête `PATCH` vide à la place d'un `GET`.
- **Gravité** : bloquant pour la phase 4.

### 2.7 Avis (Reviews)

- **Modèle** (`Review`) : `id`, `productId`, `productName`, `customerName`, `rating`, `title`,
  `body`, `status`, `createdAt`.
- **API** (`reviewsApi.create`) : accepte `productId` + `{ productName, customerName, rating, title, body }`. ✓
  `reviewsApi.list()` retourne `Review[]` (pas de `Paginated<Review>`) — forme différente des
  autres ressources (`Paginated<T>`). **Divergence de forme de retour** (non bloquant mais rend la
  pagination impossible plus tard).
- **Constat** : champs complets, tri par défaut en mock = tableau brut sans tri, en HTTP = dépend du serveur.

### 2.8 Utilisateurs

- **Modèle** (`AdminUser`) : `id`, `name`, `email`, `role`, `active`, `password?`, `lastLogin?`, `createdAt`.
- **API** (`usersApi`) : `AdminUserPayload = Omit<AdminUser, "password">` — `password` est
  correctement exclu des mutations génériques. `setPassword` est un chemin dédié. ✓
- **Endpoint manquant** : `usersApi.detail()` construit l'URL via `list() + "/" + id` (l. 43) au
  lieu d'un endpoint `users.detail(id)` dédié, qui n'existe pas dans `endpoints.ts`. Non bloquant
  fonctionnellement mais le contrat est incomplet.
- **Gravité** : à corriger.

### 2.9 Blog

- **Modèle** (`BlogPost`) : `id`, `slug`, `title`, `excerpt`, `content`, `cover?`, `author`,
  `tags`, `status`, `createdAt`, `updatedAt`, `publishedAt?`.
- **API** (`blogApi`) : `create` / `update` acceptent `BlogPost` complet. ✓
- **Particularité** : `blogApi.update` utilise `E.blog.update(id)` soit `PATCH /blog/:id`, mais
  `endpoints.blog.update` attend un slug (`(slug: string)`). En mode http, l'ID sera donc envoyé
  à la place du slug. **Contrat d'URL incohérent** entre le type de `update` et l'usage dans
  `blogApi.update` — le backend devra résoudre les deux formes.
- **Gravité** : à corriger.

### 2.10 Médias

- **Modèle** (`MediaAsset`) : `id`, `name`, `src`, `mime`, `size`, `createdAt`, `tag?`.
- **API** (`mediaApi`) : `upload` et `remove` sont corrects. **`rename` appelle `E.media.remove(id)`
  avec `PATCH`** (l. 100) — c'est `DELETE /media/:id` utilisé pour une mise à jour partielle.
  L'URL est correcte (`/media/:id`) mais la sémantique du endpoint (`remove`) est trompeuse.
  Pas d'endpoint `media.update` déclaré dans `endpoints.ts`. En HTTP, `rename` et `remove` visent
  la même URL avec des méthodes différentes (`PATCH` et `DELETE`) — acceptable REST, mais le nom
  `E.media.remove(id)` pour générer l'URL d'une mise à jour est une bombe à retardement.
- **`mediaApi.detail`** : construit l'URL via `E.media.list() + "/${id}"` (l. 79) au lieu d'un
  endpoint dédié non déclaré.
- **Gravité** : à corriger (× 2).

### 2.11 Notifications

- **Modèle** (`AdminNotification`) : `id`, `title`, `body`, `level`, `read`, `createdAt`, `link?`.
- **Pas d'endpoint** déclaré dans `endpoints.ts`. Le provider lève une `ApiError` 501 explicite
  en mode HTTP. ✓ pour la gestion d'erreur.
- **Gravité** : cosmétique (la limite est documentée, l'erreur est explicite).

### 2.12 Messages de contact

- **Modèle** (`ContactMessage`) : `id`, `name`, `email`, `phone?`, `subject`, `message`, `read`, `createdAt`.
- **API** (`contactMessagesApi`) : `create`, `markRead`, `remove`, `detail` — tous les champs
  du modèle sont couverts. ✓
- **Constat** : entité cohérente.

### 2.13 Abonnés

- **Modèle** (`Subscriber`) : `id`, `email`, `source?`, `createdAt`.
- **API** (`subscribersApi`) : `subscribe` n'expose que `email` + `source`. ✓
- **Constat** : entité cohérente.

### 2.14 Réglages boutique (`SiteSettings`)

- **Modèle** (17 champs, admin-store.tsx l. 167–188).
- **API** (`settingsApi.updateSite`) : accepte `Partial<SiteSettings>` — tous les champs couverts. ✓
- **Constat** : entité cohérente.

### 2.15 Réglages livraison (`ShippingSettings` + `ShippingRate`)

- **ShippingSettings** : `freeShippingThreshold`, `homeEnabled`, `deskEnabled` — lecture via
  `settingsApi.shipping()`, écriture via `useShippingSettingsMutations.update`. ✓
- **ShippingRate** : `wilayaCode`, `home`, `desk` — lecture via `settingsApi.shippingRates()`. ✓
- **Mutations** (`upsert`/`remove`) : construisent des URLs hors `endpoints.ts`
  (`${E.settings.shippingRates()}/${rate.wilayaCode}`, shipping-rates.ts l. 42–46).
  Ces endpoints ne sont pas déclarés.
- **Gravité** : à corriger.

### 2.16 Méthodes de paiement

- **Modèle** (`PaymentMethod`) : `id`, `label`, `instructions`, `active`. Lecture via
  `settingsApi.payments()`. ✓
- **Mutations** : construisent des URLs hors `endpoints.ts` (`${E.settings.payments()}/${method.id}`,
  payment-methods.ts l. 39–43). Ces endpoints ne sont pas déclarés.
- **Gravité** : à corriger.

### 2.17 Mouvements de stock

- **Modèle** (`StockMovement`) : `id`, `productId`, `productName`, `delta`, `reason`, `createdAt`.
- **API** (`inventoryApi`) : `adjustStock` (delta + reason), `movements` (lecture). ✓
- **`products.stock`** (`PATCH /products/:id/stock`) : déclaré mais jamais appelé — l'ajustement
  transite par `inventory.adjust`. Commentaire dans inventory.ts l. 18.
- **Gravité** : cosmétique.

### 2.18 Contenu éditorial (`SiteContent`)

- **Modèle** (`SiteContent`) : défini dans `src/lib/site-content.ts`.
- **API** (`contentApi.update`) : accepte `Partial<SiteContent>` — tous les champs couverts. ✓
- **Constat** : entité cohérente.

### 2.19 Avis d'accueil (`HomeReview`)

- **Modèle** (`HomeReview`) : `id`, `name`, `city`, `productId`, `text`, `rating`, `gradient`.
- **Endpoint** `content.homeReviews` déclaré mais non implémenté dans `content.ts`. Le provider
  lève une erreur explicite (home-reviews.ts l. 38–46). Tous les champs sont couverts en mock. ✓
- **Gravité** : à corriger (câbler en phase 4).

### 2.20 Ticker, Marquee, About Values, Builder Steps

Ces quatre ressources partagent le même pattern : **`fromHttp` lit `getAdminSnapshot()`** au lieu
de rejeter ou d'appeler un endpoint.

| Ressource        | Fichier provider   | Ligne `fromHttp` | Comportement HTTP                             |
| ---------------- | ------------------ | ---------------- | --------------------------------------------- |
| `aboutValues`    | about-values.ts    | 23               | Lit le store local — **silencieusement faux** |
| `tickerMessages` | ticker-messages.ts | 24               | Lit le store local — **silencieusement faux** |
| `marqueeBrands`  | marquee-brands.ts  | 23               | Lit le store local — **silencieusement faux** |
| `builderSteps`   | builder-steps.ts   | 50               | Lève une erreur explicite. ✓                  |

En mode HTTP, `about-values`, `ticker-messages` et `marquee-brands` renvoient une liste issue du
localStorage plutôt que du serveur, sans avertissement. C'est une violation de `AGENTS.md §7`
(pas d'échec silencieux) : un opérateur en mode http verra les données locales sans savoir qu'elles
ne proviennent pas du serveur.

**Gravité** : bloquant pour la phase 4 (× 3).

### 2.21 Journal d'audit (`AuditLog`)

- Lecture seule. Mode HTTP : `ApiError` 501 explicite. ✓
- **Pas d'endpoint analytics.audit** câblé dans `src/api/resources/`.
- **Gravité** : cosmétique (documenté, erreur explicite).

---

## 3. Cohérence mock ↔ HTTP

### 3.1 `applyProductQuery` vs `paginateLocal` — divergence confirmée

Comme signalé dans `docs/DATA-PROVIDER.md` §7.2, les deux fonctions filtrent différemment :

| Filtre       | `paginateLocal` (resources/products.ts l. 7) | `applyProductQuery` (data-provider/products.ts l. 41) |
| ------------ | -------------------------------------------- | ----------------------------------------------------- |
| `category`   | ✓                                            | ✓                                                     |
| `brand`      | ✓                                            | ✓                                                     |
| `stock`      | ✓                                            | ✓                                                     |
| `sale`       | ✓ (`p.sale`)                                 | ✓ (`p.sale === true`) — équivalent pour `boolean`     |
| `bestSeller` | ✓                                            | ✓                                                     |
| `minPrice`   | ✓                                            | ✓                                                     |
| `maxPrice`   | ✓                                            | ✓                                                     |
| `search`     | ✓                                            | ✓                                                     |
| **`use`**    | **ABSENT**                                   | ✓ (`p.use.includes(tag)`)                             |
| `sort`       | ABSENT                                       | ABSENT (les deux ignorent le tri)                     |
| Pagination   | ✓                                            | ✓                                                     |

**Divergence réelle** : le filtre `use` (UseTag) n'est pas appliqué dans `paginateLocal`. En mode
HTTP, une requête avec `use=gaming` renverra tous les produits non filtrés depuis le mock HTTP,
alors que le provider mock filtrera correctement. La surface publique (page Catégorie) utilise ce
filtre — les résultats seraient différents selon le mode.

**Les deux fonctions ignorent `sort` et `order`** (`ListQuery`). En mode HTTP, le tri dépend du
serveur ; en mock, il n'est pas appliqué. Ce n'est pas une divergence entre les deux fonctions
mais une fonctionnalité manquante des deux.

**Gravité** : bloquant pour la phase 4 (le filtre `use` diverge entre mock et http).

### 3.2 `ordersApi.mine()` — fuite de données en mock

`ordersApi.mine()` en mode mock retourne `getAdminSnapshot().orders` sans filtrage par client
(resources/orders.ts l. 42). Le provider corrige cela via `useMyOrderList` qui filtre sur
`customerId` (orders.ts provider l. 86). **La correction est dans le provider, pas dans la ressource
API** — si `ordersApi.mine()` est appelé directement (hors provider), la fuite subsiste.

**Gravité** : à corriger (corriger `ordersApi.mine` en mode mock).

### 3.3 `reviewsApi.list()` — retourne `Review[]` au lieu de `Paginated<Review>`

`reviewsApi.list()` (resources/reviews.ts l. 18) retourne `Review[]` directement, pas
`Paginated<Review>`. Toutes les autres ressources retournent `Paginated<T>`. Cette asymétrie
signifie qu'en HTTP on ne pourra jamais paginer la liste admin des avis sans modifier le provider.

**Gravité** : à corriger.

### 3.4 `useOrderMutations.create` — mode détecté via `import.meta.env`

orders.ts (provider, l. 118) lit `import.meta.env.VITE_API_MODE` directement pour décider du
chemin mock vs HTTP, au lieu d'utiliser `isHttpData()` de `./mode`. C'est exactement la violation
que `docs/DATA-PROVIDER.md` §6 (pièges) interdit : « un composant qui "sait" dans quel mode il
tourne finit toujours par se comporter différemment ». Ici c'est le provider lui-même qui le fait.

**Gravité** : à corriger.

---

## 4. Homogénéité entre les 7 domaines

### 4.1 Import de `isHttpMode` au lieu de `isHttpData`

`docs/DATA-PROVIDER.md` §2.4 spécifie que `mode.ts` est le **seul** endroit qui lit `API_MODE`.
Les ressources du data-provider doivent utiliser `isHttpData()` de `./mode`, pas `isHttpMode()`
de `@/api/config`. Les deux fonctions sont fonctionnellement identiques (même valeur), mais l'import
direct depuis `@/api/config` contourne la couche d'abstraction.

Fichiers concernés :

| Fichier                         | Import incorrect                            | Ligne |
| ------------------------------- | ------------------------------------------- | ----- |
| shipping-settings.ts (provider) | `import { isHttpMode } from "@/api/config"` | 6     |
| shipping-rates.ts (provider)    | `import { isHttpMode } from "@/api/config"` | 6     |
| payment-methods.ts (provider)   | `import { isHttpMode } from "@/api/config"` | 6     |
| site-settings.ts (provider)     | `import { isHttpMode } from "@/api/config"` | 6     |
| notifications.ts (provider)     | `import { isHttpMode } from "@/api/config"` | 3     |
| home-reviews.ts (provider)      | `import { isHttpMode } from "@/api/config"` | 18    |

`builder-steps.ts` est conforme : il utilise `isHttpData` de `./mode` (l. 8). ✓

**Gravité** : cosmétique (impact nul en runtime, violation d'architecture).

### 4.2 `data-provider/auth.ts` — hors index public

`src/data-provider/auth.ts` est importé directement via `@/data-provider/auth` par
`src/lib/auth.tsx` (l. 10), en contournant `index.ts`. Ce n'est pas un usage depuis `pages/` ou
`components/`, donc la règle ESLint de la vague 2.6 ne s'y appliquerait pas. Le fichier n'est pas
exporté dans `index.ts`, ce qui est cohérent avec son statut de module interne consommé par la
couche `lib/`. **Pas de problème fonctionnel**, mais la convention d'import unique depuis
`@/data-provider` est contournée pour ce module.

**Gravité** : cosmétique.

### 4.3 `about-values`, `ticker-messages`, `marquee-brands` — pattern non conforme au pilote

Ces trois ressources contournent le pattern du pilote `products.ts` : au lieu d'appeler une
ressource API (`src/api/resources/`) dans `fromHttp`, elles lisent `getAdminSnapshot()` directement.
Le pilote impose que `fromHttp` soit un appel réseau asynchrone **ou** lève une erreur explicite
(comme `builder-steps.ts` et `home-reviews.ts` le font correctement). Lire le store local dans
`fromHttp` est sémantiquement équivalent à `fromStore` — la distinction mock/http disparaît.

**Gravité** : bloquant pour la phase 4.

### 4.4 Ressources sans API dédiée (`about-values`, `ticker-messages`, `marquee-brands`)

Ces trois ressources n'ont pas de fichier dans `src/api/resources/`. Leurs mutations écrivent
directement dans le store via `admin-store`. En mode mock c'est correct (les mutations passent
par `runMutation` qui invalide bien le cache) — mais il n'y a aucune route de création en HTTP
pour ces entités. L'absence est assumée et documentée dans les commentaires des providers, mais
elle n'est pas tracée dans `endpoints.ts`.

**Gravité** : à corriger (ajouter les endpoints dans `endpoints.ts` et les fichiers ressources
correspondants avant la phase 4, ou documenter leur absence comme limite de phase).

### 4.5 Logging des échecs — conforme au pilote

Toutes les mutations utilisent `runMutation()` (via `use-resource.ts`), qui appelle
`logResourceFailure()` en cas d'erreur. Pas de ressource qui avale une erreur silencieusement. ✓

### 4.6 Valeurs de repli — conformes au pilote

Toutes les ressources de liste déclarent une constante stable au niveau module (ex. `NO_PRODUCTS`,
`NO_ORDERS`, etc.) conforme à la règle du pilote. ✓

---

## 5. Vérification des limites connues (DATA-PROVIDER.md §7)

| Limite documentée                                            | Vérification                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| §7.1 Pas de métadonnées de pagination dans `ResourceState`   | Confirmé : `ResourceState<T>` dans types.ts ne contient que `data`, `loading`, `error`, `refetch`. ✓ |
| §7.2 `applyProductQuery` duplique `paginateLocal`            | Confirmé et aggravé : divergence réelle sur le filtre `use` (cf. §3.1).                              |
| §7.3 `useProductDetail` en HTTP ne résout pas les `/builder` | Confirmé : `productsApi.detail()` en HTTP appelle `GET /products/:id` (products.ts l. 37).           |
| §7.4 `AbortSignal` non relayé par `src/api/resources/*`      | Confirmé : aucun fichier de ressource n'accepte de `signal` dans ses signatures.                     |
| §7.5 Pas de clés i18n pour « réessayer »                     | Confirmé : `refetch()` est prêt mais aucun bouton ne l'appelle en production.                        |

---

## 6. Liste hiérarchisée des correctifs

Les correctifs sont classés par gravité décroissante et rédigés pour devenir directement des
consignes d'agent.

### Bloquants pour la phase 4

**B1 — Corriger `about-values.ts`, `ticker-messages.ts`, `marquee-brands.ts` : `fromHttp` ne
doit pas lire le store local.**
Fichiers : `src/data-provider/about-values.ts` (l. 23), `src/data-provider/ticker-messages.ts`
(l. 24), `src/data-provider/marquee-brands.ts` (l. 23).
Action : remplacer `getAdminSnapshot().<field>` par un `Promise.reject(new Error("...non implémenté
en phase 4..."))` explicite, conformément au modèle de `builder-steps.ts` (l. 28–35) et
`home-reviews.ts` (l. 38–46). Pas de fichier ressource API à créer maintenant, mais l'erreur
explicite est non négociable.

**B2 — Ajouter le filtre `use` dans `paginateLocal` (`src/api/resources/products.ts`).**
Fichier : `src/api/resources/products.ts` l. 7–28.
Action : après le filtre `bestSeller` (l. 15), ajouter :
`if (q.use) list = list.filter((p) => p.use.includes(q.use as UseTag));`
Importer `UseTag` de `@/data/products`. C'est la correction de la divergence §3.1 signalée dans
`docs/DATA-PROVIDER.md` §7.2.

**B3 — Corriger `couponsApi.detail` : utilise `E.coupons.update(code)` pour une lecture.**
Fichier : `src/api/resources/coupons.ts` l. 30.
Action : remplacer `http.get<Coupon>(E.coupons.update(code))` par un appel à un endpoint GET
`/coupons/:code`. Soit déclarer `endpoints.coupons.detail = (code) => \`/coupons/${code}\``dans`endpoints.ts`, soit construire l'URL directement. Ne pas envoyer un `PATCH` pour une lecture.

**B4 — Corriger les `OrderItem` corrompus créés par `useOrderMutations.create` en mode mock.**
Fichier : `src/data-provider/orders.ts` l. 122–143.
Action : le mapping `CreateOrderInput.items` → paramètres de `createOrderLocal` affecte
`name: it.productId` (l. 125) et `price: 0` (l. 126). Résoudre ces champs depuis le store
(`getAdminSnapshot().products.find(p => p.id === it.productId)`) pour obtenir le vrai nom et le
vrai prix. Signaler si le produit est introuvable (erreur explicite).

**B5 — Supprimer la lecture directe de `import.meta.env.VITE_API_MODE` dans le provider.**
Fichier : `src/data-provider/orders.ts` l. 118.
Action : remplacer `import.meta.env.VITE_API_MODE === "http"` par `isHttpData()` importé de
`./mode`. Supprimer le contournement `typeof import.meta !== "undefined"` inutile dans un contexte
Vite.

**B6 — Implémenter `ordersApi.remove` et l'exposer dans `useOrderMutations`.**
Fichiers : `src/api/resources/orders.ts`, `src/data-provider/orders.ts`.
Action : ajouter `async remove(id: string): Promise<void>` dans `ordersApi` en copiant le pattern
de `productsApi.remove` (products.ts l. 53–58). Ajouter `remove` dans `OrderMutations` et dans
`useOrderMutations`. L'endpoint `E.orders.remove(id)` est déjà déclaré.

**B7 — Déclarer les endpoints de mutation `ShippingRate` et `PaymentMethod` dans `endpoints.ts`.**
Fichier : `src/api/endpoints.ts`.
Action : dans le groupe `settings`, ajouter :
`shippingRateUpsert: (wilayaCode: string) => \`/settings/shipping/rates/${wilayaCode}\``,
`shippingRateRemove: (wilayaCode: string) => \`/settings/shipping/rates/${wilayaCode}\``,
`paymentMethodUpsert: (id: string) => \`/settings/payments/${id}\``,
`paymentMethodRemove: (id: string) => \`/settings/payments/${id}\``.
Puis mettre à jour `shipping-rates.ts`et`payment-methods.ts` pour les utiliser.

### À corriger (non bloquant)

**C1 — Ajouter `customers.create`, `customers.update`, `customers.remove` dans `endpoints.ts`.**
Fichier : `src/api/endpoints.ts` groupe `customers`.
Action : déclarer `create: () => \`/customers\``, `update: (id) => \`/customers/${id}\``,
`remove: (id) => \`/customers/${id}\``. Mettre à jour `customersApi.upsert`et`customersApi.remove`pour utiliser ces endpoints nommés au lieu de construire les URLs via`list()`et`detail()`.

**C2 — Ajouter `users.detail` dans `endpoints.ts`.**
Fichier : `src/api/endpoints.ts` groupe `users`.
Action : déclarer `detail: (id: string) => \`/admin/users/${id}\``. Mettre à jour `usersApi.detail`(l. 43) pour utiliser`E.users.detail(id)`.

**C3 — Corriger `mediaApi.rename` : utilise `E.media.remove(id)` pour un `PATCH`.**
Fichier : `src/api/resources/media.ts` l. 100.
Action : déclarer `endpoints.media.update = (id) => \`/media/${id}\`` dans `endpoints.ts`. Remplacer
l'appel `http.patch<void>(E.media.remove(id), ...)` par `http.patch<void>(E.media.update(id), ...)`.
Ajouter aussi `detail: (id) => \`/media/${id}\``et remplacer`E.media.list() + \`/${id}\`` (l. 79).

**C4 — Corriger `ordersApi.mine()` en mode mock : filtre sur le client connecté.**
Fichier : `src/api/resources/orders.ts` l. 42.
Action : en mode mock, `mine()` doit filtrer les commandes par `customerId` de l'utilisateur
connecté. Le store ne connaît pas l'utilisateur courant ; passer `customerId` en paramètre ou
appeler `getActiveActor()` est une option. Documenté dans `src/data-provider/orders.ts` l. 68.

**C5 — Unifier la forme de retour de `reviewsApi.list()` en `Paginated<Review>`.**
Fichier : `src/api/resources/reviews.ts` l. 18.
Action : envelopper le retour dans `{ items, total, page, perPage }` identiquement à toutes les
autres ressources. Mettre à jour `useReviewList` dans le provider.

**C6 — Corriger la divergence de nommage dans `blogApi.update` : id vs slug.**
Fichier : `src/api/resources/blog.ts` l. 33.
Action : clarifier si le backend attend l'id ou le slug dans l'URL de mise à jour. Aligner le
paramètre de `E.blog.update` et la méthode `blogApi.update` sur la même convention. Documenter
explicitement la décision.

**C7 — Déclarer `analytics.dashboard` et `analytics.reports` dans une ressource ou les retirer.**
Fichier : `src/api/endpoints.ts` l. 119–120.
Action : soit créer `src/api/resources/analytics.ts` avec les appels correspondants, soit supprimer
ces endpoints et les ajouter uniquement quand le backend les implémentera.

**C8 — Remplacer `isHttpMode` par `isHttpData` dans les providers.**
Fichiers : `shipping-settings.ts` l. 6, `shipping-rates.ts` l. 6, `payment-methods.ts` l. 6,
`site-settings.ts` l. 6, `notifications.ts` l. 3, `home-reviews.ts` l. 18.
Action : remplacer `import { isHttpMode } from "@/api/config"` par `import { isHttpData } from
"./mode"` et adapter les appels `isHttpMode()` en `isHttpData()`.

**C9 — Exporter `data-provider/auth.ts` depuis `index.ts` ou documenter l'import direct.**
Fichier : `src/data-provider/index.ts`.
Action : soit ajouter les exports de `auth.ts` dans `index.ts` pour respecter la convention
d'import unique depuis `@/data-provider`, soit ajouter un commentaire documentant que `auth.ts`
est un module interne consommé uniquement par `src/lib/auth.tsx`.

### Cosmétiques

**D1 — Déclarer ou retirer `endpoints.products.stock`.**
Fichier : `src/api/endpoints.ts` l. 23.
Cet endpoint n'est appelé par aucune ressource (l'ajustement passe par `inventory.adjust`). Soit
l'utiliser dans `productsApi`, soit le retirer pour nettoyer le contrat.

**D2 — Ajouter les endpoints manquants pour `about-values`, `ticker-messages`, `marquee-brands`
dans `endpoints.ts`.**
Ces ressources seront câblées en phase 4. Déclarer leurs endpoints dès maintenant dans `endpoints.ts`
(groupe `content` ou nouveau groupe `site`) pour que le contrat soit complet avant l'implémentation.

**D3 — Fusionner `applyProductQuery` et `paginateLocal` (déjà signalé dans DATA-PROVIDER.md §7.2).**
Ce correctif est subordonné à B2.
