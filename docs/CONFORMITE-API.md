# Conformité provider ↔ API PHP — état au 8 août 2026

> **Verdict : 26 ressources sur 27 concordent. La bascule `VITE_API_MODE=http` est
> à portée dès que `.auditLogs` est branché ou exclu du périmètre de recette.**
> Un seul écart bloquant subsiste (provider non branché côté frontend), une ressource
> reste non testée (table `audit_logs` vide — aucune écriture dans le journal).

Ce document est **produit par un harnais exécutable**, pas par relecture :
`scripts/conformite-api.ts` appelle la vraie API PHP et compare chaque réponse à
la forme que `src/data-provider/**` déballe réellement.

## Procédure de reproduction

```bash
# 1. Base dédiée (témoin posé par install.php — à supprimer si déjà présent)
rm -f api/installed.lock /tmp/cad.sqlite*
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/cad.sqlite APP_ENV=production API_BASE_PATH=/ \
  INSTALL_OWNER_EMAIL=admin@katech.dz INSTALL_OWNER_PASSWORD='Audit-2026!xY' \
  php api/install.php
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/cad.sqlite php api/tools/importer-donnees-front.php

# 2. Serveur PHP local (ne jamais pointer sur la production)
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/cad.sqlite APP_ENV=production API_BASE_PATH=/ \
  UPLOAD_DIR=/tmp/up-b3 php -S 127.0.0.1:8194 -t api &

# 3. Harnais
API_URL=http://127.0.0.1:8194/v1 API_PASSWORD='Audit-2026!xY' \
  bunx tsx scripts/conformite-api.ts --verbeux
```

Sortie `0` si les 27 ressources concordent, `1` sinon. **À entrer dans la CI** :
c'est la seule protection durable contre la dérive entre les deux moitiés.

---

## 1. Bilan — mesuré le 8 août 2026

| Compteur             | Nombre |
| -------------------- | -----: |
| Ressources examinées | **27** |
| **Conformes**        | **26** |
| **Divergentes**      |  **1** |
| **Non testées**      |  **1** |
| Écarts bloquants     |  **1** |
| Écarts majeurs       |      0 |
| Écarts mineurs       |      0 |
| Risques latents      |  **0** |

**Implémenté (26 conformes)** : `.products`, `.categories`, `.brands`, `.orders`,
`.orders (client connecté)`, `.customers`, `.coupons`, `.reviews`,
`.reviews (d'un produit)`, `.users`, `.blogPosts`, `.homeReviews`,
`.tickerMessages`, `.marqueeBrands`, `.aboutValues`, `.builderSteps`,
`.shippingRates`, `.paymentMethods`, `.stockMovements`, `.mediaAssets`,
`.notifications`, `.messages`, `.subscribers`, `.siteSettings`,
`.shippingSettings`, `.siteContent`.

L'authentification est également conforme et n'est pas comptée dans le tableau :
`POST /auth/login`, `POST /auth/register` et `GET /auth/me` renvoient exactement
l'`AuthSession` de `src/api/types.ts`, et le cookie `katech_sid` (`HttpOnly`,
`SameSite=Lax`) est bien posé et réutilisé.

**Divergente (1)** : `.auditLogs` — `useAuditLogList()` lève une `ApiError 501`
alors que `GET /analytics/audit` existe côté API.

**Non testée (1)** : `.auditLogs` — la table `audit_logs` est vide après
l'amorçage (aucun contrôleur n'y insère de ligne), les champs `actor` / `action`
/ `entity` / `detail` n'ont donc jamais pu être observés.

---

## 2. Reste à faire

### 2.1 `.auditLogs` — provider non branché (bloquant)

`src/data-provider/audit-logs.ts` → `fromHttp` lève une `ApiError 501
not_implemented` alors que `GET /analytics/audit` existe côté serveur.

Deux sous-tâches liées :

1. **Brancher le provider** : remplacer le `throw new ApiError(501, …)` par
   l'appel HTTP `http.get<Paginated<AuditLog>>(E.analytics.audit(), { perPage: 100 })`.
2. **Écrire dans le journal** : après neuf mutations effectuées par le harnais,
   `audit_logs` reste vide. Aucun contrôleur n'y insère quoi que ce soit.
   Brancher la lecture sur une table vide n'apporterait rien. La forme des champs
   `actor` / `action` / `entity` / `detail` reste **inconnue** — ressource non
   testée.

Ne pas brancher 2.1.1 avant 2.1.2, sauf à vouloir une vue toujours vide.

---

## 3. Dette technique identifiée

### 3.1 Risque de troncature (résolu le 8 août 2026)

Avant le commit `69f881c`, **15 providers paginés ne transmettaient pas
`perPage`** au serveur. Avec `Pagination::PAR_PAGE_DEFAUT = 20`, toute liste
dépassant 20 éléments aurait été silencieusement tronquée. Commit `69f881c`
a livré `perPage: 100` sur les 15 providers concernés. Le harnais a été mis à
jour en conséquence (commit de vague 4.8, 8 août 2026) : 0 risque latent.

### 3.2 Route PATCH /media/:id (résolu le 8 août 2026)

Avant le commit `4b800d4`, la route `PATCH /media/:id` n'existait pas : le
provider envoyait un verbe qui retournait 405. Commit `4b800d4` a ajouté la
route et la méthode `renommer` du contrôleur. `.mediaAssets` est désormais
conforme (sonde PATCH → 404, non 405).

### 3.3 Journal d'audit non alimenté (dette ouverte)

`audit_logs` ne reçoit aucune écriture — la table existe, la route de lecture
existe, le provider sera branché en 2.1. L'écriture doit précéder le branchement.
Périmètre estimé : un appel `journaliser(actor, action, entity, detail)` à ajouter
dans les contrôleurs de mutation. À traiter en vague ultérieure.

### 3.4 Limites assumées, inchangées

- `customBuild` n'existe que dans le store local : `GET /products/:id` répondra
  404 pour une configuration du configurateur. Décision d'architecture ouverte.
- `sort` / `order` ne sont implémentés dans aucun des deux modes — manque commun,
  pas une divergence.
- Argon2id indisponible sur le PHP de recette : repli bcrypt coût 12, signalé
  par `/health`. Sans effet sur la conformité.
- La pagination serveur réelle (`total`, page suivante) n'est pas exposée dans
  `ResourceState<T>` — limite assumée, documentée dans `docs/DATA-PROVIDER.md`
  §7.1. `perPage: 100` est le palliatif.

---

## 4. Sortie complète du harnais — 8 août 2026

### AVANT la mise à jour des déclarations (harnais v 69f881c, déclarations non mises à jour)

```
==============================================================================
  CONFORMITE provider <-> API PHP  —  scripts/conformite-api.ts
  API : http://127.0.0.1:8194/v1
==============================================================================
ÉCARTS BLOQUANTS — 1
[PROVIDER_NON_BRANCHE] .auditLogs → useAuditLogList()
    champ    : useAuditLogList()
    attendu  : appel HTTP vers /analytics/audit
    reçu     : ApiError 501 not_implemented levée par le provider

CONFORMES — 26
  .products, .categories, .brands, .orders, .orders (client connecté),
  .customers, .coupons, .reviews, .reviews (d'un produit), .users, .blogPosts,
  .homeReviews, .tickerMessages, .marqueeBrands, .aboutValues, .builderSteps,
  .shippingRates, .paymentMethods, .stockMovements, .mediaAssets,
  .notifications, .messages, .subscribers, .siteSettings, .shippingSettings,
  .siteContent

NON TESTÉES — 1
  · .auditLogs : collection vide après amorçage.

RISQUES LATENTS — 15 (non bloquants, non observables ici)
  · useCategoryList() ne transmet aucun `perPage` …
  [14 autres hooks dans la même situation]

BILAN : 27 examinées, 26 conformes, 1 divergente, 1 non testée
  écarts : 1 bloquant, 0 majeur, 0 mineur
```

### APRÈS la mise à jour des déclarations (vague 4.8, 8 août 2026)

```
==============================================================================
  CONFORMITE provider <-> API PHP  —  scripts/conformite-api.ts
  API : http://127.0.0.1:8194/v1
==============================================================================
ÉCARTS BLOQUANTS — 1
[PROVIDER_NON_BRANCHE] .auditLogs → useAuditLogList()
    champ    : useAuditLogList()
    attendu  : appel HTTP vers /analytics/audit?perPage=100
    reçu     : ApiError 501 not_implemented levée par le provider

CONFORMES — 26
  .products, .categories, .brands, .orders, .orders (client connecté),
  .customers, .coupons, .reviews, .reviews (d'un produit), .users, .blogPosts,
  .homeReviews, .tickerMessages, .marqueeBrands, .aboutValues, .builderSteps,
  .shippingRates, .paymentMethods, .stockMovements, .mediaAssets,
  .notifications, .messages, .subscribers, .siteSettings, .shippingSettings,
  .siteContent

NON TESTÉES — 1
  · .auditLogs (useAuditLogList()) : collection vide après amorçage.

BILAN : 27 examinées, 26 conformes, 1 divergente, 1 non testée
  écarts : 1 bloquant, 0 majeur, 0 mineur
  RISQUES LATENTS : 0
```

Le passage de 15 à 0 risques latents reflète les 15 providers mis à jour dans
le commit `69f881c` : les déclarations du harnais ont été alignées sur ce que
les providers envoient réellement. Aucune logique de vérification n'a été
assouplie.
