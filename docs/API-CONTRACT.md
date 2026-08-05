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
| Méthode | Chemin | Description |
|---|---|---|
| POST | `/auth/register` | Création de compte client |
| POST | `/auth/login` | Connexion (pose le cookie de session) |
| POST | `/auth/logout` | Déconnexion |
| GET | `/auth/me` | Session courante |
| POST | `/auth/refresh` | Renouvellement du token |
| POST | `/auth/forgot-password` | Envoi email de réinitialisation |
| POST | `/auth/reset-password` | Réinitialisation via token |
| POST | `/auth/change-password` | Changement mot de passe (connecté) |

### Catalogue
| Méthode | Chemin |
|---|---|
| GET/POST | `/products` |
| GET/PATCH/DELETE | `/products/:id` |
| PATCH | `/products/:id/stock` |
| GET/POST | `/categories`, `/brands` |
| GET/PATCH/DELETE | `/categories/:slug`, `/brands/:id` |

Filtres produits : `category`, `brand`, `minPrice`, `maxPrice`, `stock`, `use`, `bestSeller`, `sale`.

### Commandes
| Méthode | Chemin |
|---|---|
| GET/POST | `/orders` |
| GET/DELETE | `/orders/:id` |
| PATCH | `/orders/:id/status` |
| GET | `/me/orders` |

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
`/analytics/dashboard`, `/analytics/reports`, `/analytics/audit`.

## Rôles et autorisations

| Rôle | Portée |
|---|---|
| `customer` | ses commandes, ses avis, son profil |
| `viewer` | lecture back-office |
| `editor` | catalogue, contenu, blog |
| `admin` | + commandes, réglages, CRM |
| `owner` | + utilisateurs et réinitialisations |

Toutes les routes `/admin/*`, `/settings/*`, `/analytics/*`, `/inventory/*` exigent un rôle back-office.

## Côté frontend

- `src/api/config.ts` — mode et base URL
- `src/api/client.ts` — fetch typé, timeout, erreurs `ApiError`
- `src/api/endpoints.ts` — table des chemins
- `src/api/types.ts` — DTO partagés
- `src/api/resources/*` — services par domaine, avec repli automatique sur le store local en mode mock
