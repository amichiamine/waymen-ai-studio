# Contrat d'API — KA Tech Hub

Le frontend est prêt à être câblé sur un backend REST. Rien à modifier dans les composants :
il suffit de renseigner les variables d'environnement et de basculer `VITE_API_MODE`.

## Configuration

```env
VITE_API_MODE=http          # "mock" (défaut, localStorage) | "http"
VITE_API_BASE_URL=https://api.exemple.dz/v1
VITE_API_AUTH=cookie        # "cookie" (recommandé, httpOnly) | "bearer"
VITE_API_TIMEOUT_MS=15000
```

## Conventions

- Base URL : `/api/v1`
- Réponse succès : `200/201` avec `{ "data": ... }` (les réponses brutes sont aussi acceptées)
- Réponse vide : `204`
- Réponse erreur : `{ "error": { "code": "...", "message": "...", "fields": { "email": ["invalide"] } } }`
- Listes paginées : `{ "items": [], "total": 0, "page": 1, "perPage": 20 }`
- Query params standard : `page`, `perPage`, `search`, `sort`, `order`
- Auth : cookie httpOnly `SameSite=Lax` (le client envoie `credentials: include`)
- Montants : entiers en DZD (pas de décimales)
- Dates : ISO 8601 UTC

## Endpoints

### Auth

| Méthode | Chemin                  | Description                           |
| ------- | ----------------------- | ------------------------------------- |
| POST    | `/auth/register`        | Création de compte client             |
| POST    | `/auth/login`           | Connexion (pose le cookie de session) |
| POST    | `/auth/logout`          | Déconnexion                           |
| GET     | `/auth/me`              | Session courante                      |
| POST    | `/auth/refresh`         | Renouvellement du token               |
| POST    | `/auth/forgot-password` | Envoi email de réinitialisation       |
| POST    | `/auth/reset-password`  | Réinitialisation via token            |
| POST    | `/auth/change-password` | Changement mot de passe (connecté)    |

### Catalogue

| Méthode          | Chemin                             |
| ---------------- | ---------------------------------- |
| GET/POST         | `/products`                        |
| GET/PATCH/DELETE | `/products/:id`                    |
| PATCH            | `/products/:id/stock`              |
| GET/POST         | `/categories`, `/brands`           |
| GET/PATCH/DELETE | `/categories/:slug`, `/brands/:id` |

Filtres produits : `category`, `brand`, `minPrice`, `maxPrice`, `stock`, `use`, `bestSeller`, `sale`.

### Configurateur PC

| Méthode | Chemin    | Garde             |
| ------- | --------- | ----------------- |
| POST    | `/builds` | `protegeConnecte` |

Corps : `{ "picks": { "<idEtape>": "<idPiece>", … } }`. Le prix est **recalculé côté serveur** à partir de `site_content.builder` — tout champ `price` ou `id` fourni par le client est ignoré sans erreur. Le résultat est un produit avec `customBuild = true`, exclu du catalogue public mais accessible par `GET /products/:id` (panier, paiement). Le débit est limité côté contrôleur. Détails : `ControleurBuilds.php`.

### Commandes

| Méthode | Chemin               | Remarque de sécurité                                    |
| ------- | -------------------- | ------------------------------------------------------- |
| GET     | `/orders`            | `protege('read')` — back-office uniquement              |
| POST    | `/orders`            | public (commande invité)                                |
| GET     | `/orders/:id`        | `protegeConnecte` + appartenance vérifiée en contrôleur |
| PATCH   | `/orders/:id/status` | `protege('update')` — back-office uniquement            |
| DELETE  | `/orders/:id`        | `protege('delete')` — back-office uniquement            |
| GET     | `/me/orders`         | `protegeConnecte`                                       |

`GET /orders/:id` est gardé par `protegeConnecte` (non par `protege('read')`). La logique de contrôle d'accès est déléguée au contrôleur : un client propriétaire de la commande reçoit 200, un client tiers reçoit 403, un anonyme reçoit 401. Voir `docs/PERMISSIONS.md §3` pour la justification de sécurité.

La création de commande décrémente le stock côté serveur (transaction) et valide le coupon.

### Avis

`GET /reviews`, `GET|POST /products/:id/reviews`, `PATCH /reviews/:id/status`, `DELETE /reviews/:id`.
Un avis créé est en statut `pending` jusqu'à modération.

### Coupons

`GET|POST /coupons`, `PATCH|DELETE /coupons/:code`, `POST /coupons/validate`.

### Contenu & réglages (pilotage /admin)

`GET|PATCH /content`, `/content/home-reviews`,
`GET|PATCH /settings/site`, `/settings/shipping`, `/settings/shipping/rates`, `/settings/payments`.

Tous les champs éditoriaux sont **multilingues** : `{ "fr": "...", "en": "...", "ar": "..." }`.

### Inventaire, médias, CRM, admin

`/inventory/movements`, `/inventory/:productId/adjust`,
`/media` (upload multipart), `/media/:id`,
`/messages`, `/subscribers`,
`/admin/users`,
`/analytics/audit`.

`/analytics/dashboard` et `/analytics/reports` ne sont pas implémentés (optionnels non livrés).

### Notion / miroir des commandes

Les sept routes `/notion/*` sont documentées en détail dans `docs/NOTION.md`, qui est leur contrat. Ce fichier les liste uniquement pour la complétude.

| Méthode | Chemin               | Garde                                                     |
| ------- | -------------------- | --------------------------------------------------------- |
| GET     | `/notion/status`     | `protege('resetData')` — owner uniquement                 |
| POST    | `/notion/token`      | `protege('resetData')` — owner uniquement                 |
| GET     | `/notion/pages`      | `protege('resetData')` — owner uniquement                 |
| POST    | `/notion/base`       | `protege('resetData')` — owner uniquement                 |
| PATCH   | `/notion/parametres` | `protege('resetData')` — owner uniquement                 |
| POST    | `/notion/renvoyer`   | `protege('resetData')` — owner uniquement                 |
| POST    | `/notion/webhook`    | **publique** — identité établie par signature HMAC-SHA256 |

`POST /notion/webhook` est la seule route d'écriture non authentifiée par session. C'est un choix explicite : Notion appelle depuis ses propres serveurs, sans cookie ni session. La sécurité repose sur la vérification de la signature `X-Notion-Signature` dans `ControleurNotionWebhook`. Voir `docs/PERMISSIONS.md §3` pour la justification.

### Journal d'audit

| Méthode | Chemin                 | Garde             |
| ------- | ---------------------- | ----------------- |
| GET     | `/analytics/audit`     | `protege('read')` |
| GET     | `/analytics/audit/:id` | `protege('read')` |

Les entrées du journal sont écrites par la classe `KaTech\Journal` (statique), instrumentée dans 16 contrôleurs. Les secrets (mots de passe, jetons, clés) en sont explicitement filtrés avant sérialisation.

## Rôles et autorisations

| Rôle       | Portée                                    |
| ---------- | ----------------------------------------- |
| `customer` | ses commandes, ses avis, son profil       |
| `viewer`   | lecture back-office                       |
| `editor`   | catalogue, contenu, blog                  |
| `admin`    | + commandes, réglages, CRM                |
| `owner`    | + utilisateurs, réinitialisations, Notion |

Toutes les routes `/admin/*`, `/settings/*`, `/analytics/*`, `/inventory/*` exigent un rôle back-office. La matrice complète est dans `docs/PERMISSIONS.md`.

## Routes publiques assumées

Ces routes sont sans garde par décision explicite, pas par oubli :

| Route                                 | Justification                                                |
| ------------------------------------- | ------------------------------------------------------------ |
| `GET /products` et ses sous-routes    | Vitrine publique                                             |
| `GET /categories`, `/brands`, `/blog` | Vitrine publique                                             |
| `GET /content`, `GET /settings/site`  | Vitrine publique                                             |
| `POST /orders`                        | Commande invité — usage courant en Algérie                   |
| `POST /coupons/validate`              | Vérification avant connexion, au panier                      |
| `POST /subscribers`                   | Inscription à l'infolettre                                   |
| `GET /products/:id/reviews`           | Avis approuvés uniquement (filtre en dur dans le contrôleur) |
| `POST /notion/webhook`                | Appelé par les serveurs Notion ; sécurisé par HMAC-SHA256    |

## Côté frontend

- `src/api/config.ts` — mode et base URL
- `src/api/client.ts` — fetch typé, timeout, erreurs `ApiError`
- `src/api/endpoints.ts` — table des chemins
- `src/api/types.ts` — DTO partagés
- `src/api/resources/*` — services par domaine, avec repli automatique sur le store local en mode mock
