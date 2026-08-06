# Conformité provider ↔ API PHP — état au 6 août 2026

> **Verdict : la bascule `VITE_API_MODE=http` n'est PAS à portée en l'état.**
> 10 ressources sur 27 concordent. 17 divergent, dont 4 font planter une page au
> rendu. Une vague de correction est nécessaire — le périmètre est ci-dessous,
> chaque entrée est rédigée pour devenir une consigne d'agent.

Ce document est **produit par un harnais exécutable**, pas par relecture :
`scripts/conformite-api.ts` appelle la vraie API PHP et compare chaque réponse à
la forme que `src/data-provider/**` déballe réellement.

```bash
# base dédiée
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/conf.sqlite APP_ENV=production API_BASE_PATH=/ \
  INSTALL_OWNER_EMAIL=admin@katech.dz INSTALL_OWNER_PASSWORD='…' php api/install.php
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/conf.sqlite php api/tools/importer-donnees-front.php
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/conf.sqlite APP_ENV=production API_BASE_PATH=/ \
  php -S 127.0.0.1:8160 -t api

# harnais
API_URL=http://127.0.0.1:8160/v1 API_PASSWORD='…' bunx tsx scripts/conformite-api.ts
```

Sortie `0` si les 27 ressources concordent, `1` sinon, `2` si le harnais n'a pas
pu travailler (connexion refusée, API injoignable). **À entrer dans la CI** :
c'est la seule protection durable contre la dérive entre les deux moitiés.

---

## 1. Bilan

| Compteur             | Nombre |
| -------------------- | -----: |
| Ressources examinées | **27** |
| **Conformes**        | **10** |
| **Divergentes**      | **17** |
| **Non testées**      |  **6** |
| Écarts bloquants     | **34** |
| Écarts majeurs       |      0 |
| Écarts mineurs       |      3 |
| Risques latents (§6) |     12 |

« Non testée » n'est pas « conforme » : c'est une ressource dont la forme des
champs **reste inconnue**, parce que l'appel a été refusé, que l'enveloppe était
inexploitable, ou que la collection est restée vide malgré l'amorçage.

**Conformes** (`10`) : `.products`, `.categories`, `.brands`, `.orders`,
`.customers`, `.coupons`, `.blogPosts`, `.subscribers`, `.siteSettings`,
`.shippingSettings`.

L'authentification est également conforme et n'est pas comptée dans le tableau
de correspondance : `POST /auth/login`, `POST /auth/register` et `GET /auth/me`
renvoient exactement l'`AuthSession` de `src/api/types.ts`, et le cookie
`katech_sid` (`HttpOnly`, `SameSite=Lax`) est bien posé et réutilisé.

**Non testées** (`6`) : `.orders (client connecté)`, `.reviews`,
`.reviews (d'un produit)`, `.users`, `.stockMovements`, `.auditLogs`.

---

## 2. Gravité 1 — enveloppe : la page plante au rendu

**Nature.** Le contrat (`docs/API-CONTRACT.md`) impose
`{ items, total, page, perPage }` pour toute liste paginée, et l'API le
respecte partout. Mais **quatre services de `src/api/resources/*` déclarent un
tableau nu** et ne déballent pas `.items`. Le provider transmet donc un objet là
où le composant attend un tableau.

Conséquence exacte, à ne pas confondre :

- `.reviews`, `.users`, `.stockMovements` → `data` est un **objet**. Le premier
  `.map()` du composant lève un `TypeError` **pendant le rendu** →
  `ErrorBoundary` → page perdue. Ni `loading` ni `error` ne l'attrapent.
- `.reviews (d'un produit)` → le provider fait `all.filter(...)` **dans**
  `fromHttp`, donc l'exception est capturée : bandeau d'erreur et liste vide.
  Dégradé, pas planté.

**Correctif recommandé : côté frontend.** L'API est dans le contrat, c'est le
frontend qui en sort. Quatre lignes, quatre fichiers, aucune route touchée.

| #   | Fichier                          | Ligne à corriger                                     | Attendu                                                       |
| --- | -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| 1.1 | `src/api/resources/reviews.ts`   | `http.get<Review[]>(E.reviews.list())`               | `(await http.get<Paginated<Review>>(E.reviews.list())).items` |
| 1.2 | `src/api/resources/reviews.ts`   | `http.get<Review[]>(E.reviews.byProduct(productId))` | idem, déballer `.items`                                       |
| 1.3 | `src/api/resources/users.ts`     | `http.get<AdminUser[]>(E.users.list())`              | idem                                                          |
| 1.4 | `src/api/resources/inventory.ts` | `http.get<StockMovement[]>(E.inventory.movements())` | idem                                                          |

**Ne pas** « corriger » l'API en lui faisant renvoyer un tableau nu : elle
deviendrait incohérente avec ses 14 autres listes, et le harnais perdrait sa
vérification de pagination.

---

## 3. Gravité 1 — verbe HTTP : 405 sur mutation

**Nature.** Le provider utilise `PATCH` là où la route est déclarée sous un
autre verbe. Aucun test des deux côtés ne pouvait le voir : chaque moitié était
cohérente avec elle-même. Sonde du harnais : verbe réel du provider sur un
identifiant volontairement absent — un `405` prouve l'écart sans rien écrire.

| #   | Appel du provider                            | Route déclarée                                     | Effet | Correctif                                                                           |
| --- | -------------------------------------------- | -------------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| 2.1 | `PATCH /settings/shipping/rates/:wilayaCode` | `PUT` (`api/routes.php:152`)                       | 405   | `src/data-provider/shipping-rates.ts` → `http.put` (l'upsert par clé EST un `PUT`)  |
| 2.2 | `PATCH /settings/payments/:id`               | `PUT` (`api/routes.php:157`)                       | 405   | `src/data-provider/payment-methods.ts` → `http.put`                                 |
| 2.3 | `PATCH /inventory/:productId/adjust`         | `POST` (`api/routes.php:193`)                      | 405   | `src/api/resources/inventory.ts` → `http.post` (un ajustement est une action)       |
| 2.4 | `PATCH /media/:id` (renommage)               | **aucune route `PATCH`** — seuls `GET` et `DELETE` | 405   | ajouter `PATCH /media/:id` dans `api/routes.php` + méthode `renommer` du contrôleur |

**2.3 porte un second défaut, dans la même correction.**
`POST /inventory/:productId/adjust` renvoie
`{ mouvement: StockMovement, stockQty: number }`, alors que
`src/api/resources/inventory.ts` déclare `Promise<StockMovement>`. Le
`StockMovement` rendu à l'appelant serait `undefined`. Déballer `.mouvement` —
et, tant qu'on y est, exploiter `stockQty` plutôt que de recharger la liste.

Vérifié conforme au passage, ne pas y toucher : `PATCH /products/:id`,
`PATCH /products/:id/stock`, `PATCH /categories/:slug`, `PATCH /brands/:id`,
`PATCH /orders/:id/status`, `PATCH /customers/:id`, `PATCH /coupons/:code`,
`PATCH /reviews/:id/status`, `PATCH /admin/users/:id`, `PATCH /blog/:slug`,
`PATCH /messages/:id`, `PATCH /content`, `PATCH /settings/site`,
`PATCH /settings/shipping`, et les `DELETE` des 12 ressources concernées.

---

## 4. Gravité 1 — routes et champs

### 4.1 `GET /me/orders` répond 401 même avec une session valide

Reproduit avec un compte `customer` fraîchement inscrit et son cookie :

```
401 UNAUTHORIZED — « Identité du client absente : /me/orders ne renvoie jamais
les commandes de tout le monde. La session sera fournie par l'authentification
(vague 4.3). »
```

`ControleurCommandes::mesCommandes()` (`api/src/Controllers/ControleurCommandes.php:136`)
lit encore `?customerId=` en query. La vague 4.3 a livré les sessions mais **ce
TODO n'a pas été soldé**, et le provider n'envoie évidemment aucun paramètre
(`ordersApi.mine()` → `http.get<Order[]>("/me/orders")`).

**Correctif** : remplacer la lecture de la query par l'identifiant de la session
déjà exigée par `Garde::protegeConnecte`. Ne surtout pas conserver un repli sur
la query : ce serait une fuite de données entre clients, ce que le commentaire du
contrôleur dit lui-même. Le `WHERE customer_id` reste la raison d'être de la
route.

**Note** : le compte `customer` a `users.id` (`usr-…`) alors que les commandes
portent un `customers.id` (`cus_…`). La correction devra établir la
correspondance entre compte et fiche client — sinon l'historique restera vide au
lieu de renvoyer 401, ce qui serait un échec plus discret et donc plus grave.

### 4.2 Champs renommés côté serveur — `.messages` et `.notifications`

| #   | Ressource        | Champ frontend    | Champ reçu | Fichier serveur                                   |
| --- | ---------------- | ----------------- | ---------- | ------------------------------------------------- |
| 4.2 | `.messages`      | `message: string` | `body`     | `api/src/Controllers/ControleurCrm.php`           |
| 4.3 | `.messages`      | `read: boolean`   | `isRead`   | `api/src/Controllers/ControleurCrm.php`           |
| 4.4 | `.notifications` | `read: boolean`   | `isRead`   | `api/src/Controllers/ControleurNotifications.php` |

Ce n'est pas un problème de `snake_case` — **aucune clé `snake_case` ne sort de
l'API, ce point est propre partout** — mais un renommage sémantique : le DTO a
été écrit d'après la colonne SQL (`is_read`, `body`) au lieu du type frontend.

**Correctif : côté serveur, dans les deux DTO.** `ContactMessage.message` et
`AdminNotification.read` sont consommés par l'interface d'administration
existante ; renommer côté frontend toucherait des composants au lieu de deux
méthodes de conversion. Corriger **aussi la lecture du corps de requête** des
`PATCH` correspondants, pour que l'aller-retour soit symétrique.

### 4.5 `GET /content` et `SiteContent` sont deux modèles sans intersection

C'est **la divergence structurante**, et elle ne se règle pas par un renommage.

| Côté          | Sections                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API PHP       | `about`, `builder`, `home-reviews`, `marquee`, `ticker` (5)                                                                                                                                                      |
| `SiteContent` | `header`, `footer`, `hero`, `categories`, `useChips`, `bestSellers`, `featuredTabs`, `flashSale`, `brandsMarquee`, `whyUs`, `builderTeaser`, `reviews`, `contactCta`, `floatingWhatsApp`, `mobileBottomBar` (15) |

**Intersection : vide.** En mode `http`, `useSiteContent()` renvoie donc un objet
dont aucune section attendue n'existe. Toute la page d'accueil, l'en-tête et le
pied de page retomberaient sur `FALLBACK_SITE_CONTENT`, et la page `/admin/content`
piloterait du vide.

La table `site_content` porte 5 lignes, qui sont exactement les 5 sections
ci-dessus : le backend a modélisé le **contenu éditorial des listes** (valeurs
« À propos », étapes du configurateur, avis d'accueil, bandeau, marques
défilantes), pas le **contenu rédactionnel du site**. Les deux sont légitimes, ils
ne sont simplement pas la même chose.

**Décision d'architecture requise avant tout code** — trois options :

1. Étendre `site_content` aux 15 sections de `SiteContent` (snapshot JSON par
   section, ce que le schéma permet déjà) et faire de `GET /content` la
   projection complète. Les 5 sections actuelles deviennent des **sous-clés** des
   sections correspondantes (`about.values` → `whyUs.items` ?), à trancher
   explicitement, pas à deviner.
2. Séparer les deux notions : `GET /content` pour les 15 sections de
   `SiteContent`, et des routes dédiées pour les 5 listes éditoriales (ce que
   `/content/home-reviews` fait déjà).
3. Laisser `useSiteContent()` en mock durablement — mais alors la promesse « le
   contenu est pilotable depuis le back-office » tombe dès la bascule.

Ne pas laisser un agent choisir seul : c'est de l'arbitrage produit.

### 4.6 Sept ressources : l'API répond, le provider refuse d'appeler

`fromHttp` lève une `ApiError 501 not_implemented` alors que la donnée **existe
côté serveur**. En mode `http`, ces sept vues afficheraient un bandeau d'erreur
et une liste vide.

| #    | Hook                     | Fichier provider                       | Donnée disponible côté API                     |
| ---- | ------------------------ | -------------------------------------- | ---------------------------------------------- |
| 4.6a | `useHomeReviewList()`    | `src/data-provider/home-reviews.ts`    | `GET /content/home-reviews` → `items` (3 avis) |
| 4.6b | `useTickerMessageList()` | `src/data-provider/ticker-messages.ts` | `GET /content` → `ticker.items`                |
| 4.6c | `useMarqueeBrandList()`  | `src/data-provider/marquee-brands.ts`  | `GET /content` → `marquee.brands` (`string[]`) |
| 4.6d | `useAboutValueList()`    | `src/data-provider/about-values.ts`    | `GET /content` → `about.values`                |
| 4.6e | `useBuilderStepList()`   | `src/data-provider/builder-steps.ts`   | `GET /content` → `builder.steps`               |
| 4.6f | `useNotificationList()`  | `src/data-provider/notifications.ts`   | `GET /notifications` (5 routes complètes)      |
| 4.6g | `useAuditLogList()`      | `src/data-provider/audit-logs.ts`      | `GET /analytics/audit` (2 routes)              |

Les formes reçues ont été vérifiées et **concordent avec les types frontend**
pour 4.6a à 4.6e : `HomeReview`, `TickerMessage`, `string[]`, `AboutValue`,
`BuilderStep` sortent tels quels. Le branchement est donc mécanique.

Pour 4.6f, corriger `isRead` → `read` d'abord (§4.4). Pour 4.6g, lire §6.2.

**Dépendance** : 4.6b à 4.6e passent par `GET /content`, dont la modélisation est
en arbitrage (§4.5). Les brancher sur les sections actuelles serait un travail
à refaire si l'option 1 est retenue. **Traiter §4.5 avant 4.6b–4.6e.**

---

## 5. Gravité 3 — écarts mineurs

| #   | Constat                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.1 | `GET /content/home-reviews` renvoie `{ items }` **sans** `total`, `page`, `perPage` — seule liste de l'API à sortir du format paginé du contrat.                   |
| 5.2 | Champs additifs non attendus par le frontend, sans effet : `position` (`/categories`, `/settings/payments`), `updatedAt` (7 ressources), `phone` (`/admin/users`). |
| 5.3 | `specLine` est vide (`""`) pour les deux produits `builds` importés, alors que le seed frontend en portait une. À vérifier dans `importer-donnees-front.php`.      |

Aucun de ces trois points ne bloque la bascule ; 5.1 et 5.3 méritent quand même
une correction, ce sont des divergences de données réelles.

---

## 6. Risques latents — non observables sur ce jeu de données

### 6.1 Troncature silencieuse à 20 enregistrements

`Pagination::PAR_PAGE_DEFAUT = 20`. **Douze hooks ne transmettent aucun
`perPage`** et ne lisent que `.items` — `ResourceState<T>` n'expose pas `total`
(limite assumée, `docs/DATA-PROVIDER.md` §7.1). Au-delà de 20 lignes, la vue
affiche 20 lignes **sans le dire**, ni erreur ni indication.

Concernés : `useCategoryList`, `useBrandList`, `useOrderList`,
`useCustomerList`, `useCouponList`, `useBlogPostList`, `useHomeReviewList`,
`useMediaAssetList`, `useNotificationList`, `useAuditLogList`,
`useContactMessageList`, `useSubscriberList`.

Seul `useProductList()` demande `perPage: 100`. Invisible aujourd'hui (aucune
table ne dépasse 20 lignes, hormis les 59 tarifs de livraison qui sont un
tableau nu), **certain en production** dès les premières commandes.

Correctif court : transmettre `perPage: 100` comme le fait `products.ts`.
Correctif juste : exposer la pagination serveur dans les tableaux admin — c'est
la décision d'architecture annoncée en `docs/DATA-PROVIDER.md` §7.1, elle
devient exigible.

### 6.2 Le journal d'audit n'est jamais écrit

Après **neuf écritures** effectuées par le harnais en session propriétaire
(coupon, client, abonné, message, notification, commande, avis, ajustement de
stock, média), `GET /analytics/audit` renvoie `items: []`.

Vérification : `audit_logs` n'est cité que par `ControleurJournal.php` — le
lecteur. **Aucun contrôleur n'y insère quoi que ce soit.** La table existe, la
route existe, la vue existe : seule l'écriture manque. Brancher
`useAuditLogList()` (§4.6g) sur une table qui restera vide n'apporterait rien.

C'est la raison pour laquelle `.auditLogs` est **non testée** et non
« conforme » : la forme des champs `actor` / `action` / `entity` / `detail`
n'a jamais pu être observée.

### 6.3 Rappels de limites déjà connues, inchangées

- `customBuild` n'existe que dans le store local : `GET /products/:id` répondra
  404 pour une configuration du configurateur, et panier + paiement en
  dépendent (`docs/DATA-PROVIDER.md` §7.3). Décision d'architecture toujours
  ouverte.
- `sort` / `order` ne sont implémentés dans aucun des deux modes — manque
  commun, pas une divergence.
- Argon2id est indisponible sur le PHP de recette : repli bcrypt coût 12,
  signalé par `/health`. Sans effet sur la conformité.

---

## 7. Ordre de traitement conseillé pour la vague de correction

1. **§2 (enveloppes)** et **§3 (verbes)** — 8 correctifs mécaniques, aucun
   arbitrage, effet immédiat : 4 pages cessent de planter, 4 mutations cessent
   de renvoyer 405. C'est le meilleur rapport risque/gain.
2. **§4.1 (`/me/orders`)** et **§4.2–4.4 (champs renommés)** — correctifs
   serveur localisés, à faire d'un tenant avec les `PATCH` symétriques.
3. **§6.1 (`perPage`)** — une ligne par hook, avant toute mise en production.
4. **§4.5 (modèle de contenu)** — **arbitrage humain requis**, puis §4.6b–4.6e.
5. **§4.6f, §6.2 (audit)** — brancher les notifications ; écrire le journal
   d'audit avant de brancher sa lecture.
6. **§5** — finitions.

Relancer `scripts/conformite-api.ts` après chaque lot : le compteur
« conformes » doit monter et « non testées » descendre à zéro. Tant que la
sortie n'est pas `0`, la bascule reste devant nous.
