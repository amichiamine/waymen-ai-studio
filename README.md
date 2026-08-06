# KA Tech — Frontend React + Vite (SPA)

Application 100 % client, sans backend. `bun run build` produit un dossier `dist/` statique copiable sur n'importe quel serveur web.

## Développement

```bash
bun install
bun run dev        # http://localhost:8080 (ou le premier port libre au-dessus)
bun run build      # produit ./dist
bun run preview    # sert ./dist localement
```

### Choisir le port

Le serveur démarre sur **8080** par défaut. Si le port est occupé — Tomcat de
XAMPP l'utilise, et une fenêtre de terminal fermée sans `Ctrl+C` laisse un
serveur en vie — Vite **balaie automatiquement** les ports suivants (8081,
8082…) et affiche l'URL retenue au démarrage.

Pour imposer un port de départ :

```bash
PORT=5173 bun run dev              # macOS / Linux
$env:PORT=5173; bun run dev        # Windows PowerShell
set PORT=5173 && bun run dev       # Windows cmd
bunx vite --port 5173              # ponctuel, sans variable
```

`PREVIEW_PORT` fait de même pour `bun run preview`.

## Développement à deux serveurs (API PHP + Vite)

Par défaut, le frontend tourne **seul** : `VITE_API_MODE=mock` lit tout dans le
`localStorage`, aucun serveur n'est requis. Pour travailler contre la vraie API
PHP, il faut **deux serveurs en parallèle** et une bascule d'environnement.

> **Avant de basculer, lisez `docs/CONFORMITE-API.md`.** Toutes les ressources
> ne concordent pas encore entre le provider et l'API : 10 sur 27 sont
> conformes à ce jour. Le mode `http` n'est pas encore un mode de travail
> confortable.

### 1. Serveur 1 — l'API PHP

Une base dédiée au développement, jamais celle d'un autre travail en cours :

```bash
# a. Installation du schéma + compte propriétaire (une seule fois)
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/katech-dev.sqlite APP_ENV=production \
  API_BASE_PATH=/ \
  INSTALL_OWNER_EMAIL=admin@katech.dz INSTALL_OWNER_PASSWORD='Mdp-Dev-2026!' \
  php api/install.php

# b. Données du frontend (catalogue, blog, tarifs, contenu) — idempotent
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/katech-dev.sqlite \
  php api/tools/importer-donnees-front.php

# c. Le serveur, à laisser tourner
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/katech-dev.sqlite APP_ENV=production \
  API_BASE_PATH=/ php -S 127.0.0.1:8160 -t api
```

Sonde de disponibilité : `curl http://127.0.0.1:8160/v1/health`.

### 2. Serveur 2 — Vite, avec le proxy

```bash
echo 'VITE_API_MODE=http' >> .env.local     # ou éditer .env.local
API_PORT=8160 bun run dev
```

`vite.config.ts` achemine tout `/api` vers `http://127.0.0.1:$API_PORT`. Le
port par défaut est **8160** ; `API_PORT` le change, comme `PORT` change celui
de Vite.

**Pourquoi un proxy est indispensable.** Sans lui, le front (`:8080`) et l'API
(`:8160`) sont deux **origines** distinctes. Le cookie de session `katech_sid`
est `HttpOnly` + `SameSite=Lax` : il ne serait ni posé ni renvoyé sur une
requête inter-origine, et toute route authentifiée répondrait `401`. Le proxy
ramène l'API sur l'origine du front — exactement la situation de production, où
front et API partagent le domaine.

Le proxy vit sous `server.proxy` : il **n'existe qu'en développement**. Il
n'entre dans aucun artefact de `bun run build`, et `bun run preview` n'en
hérite pas.

**Piège de préfixe.** En production, `api/.htaccess` est monté sous `/api` et
PHP retire ce préfixe lui-même. En développement, `php -S -t api` a pour racine
le dossier `api/` : le préfixe `/api` n'existe pas côté serveur. C'est le proxy
qui le retire. Conséquence : `VITE_API_BASE_URL` doit rester un chemin relatif
commençant par `/api` (défaut `/api/v1`). Une URL absolue ferait sortir les
requêtes de l'origine du front et le cookie cesserait d'être envoyé.

### 3. Revenir en mode `mock`

```bash
# retirer VITE_API_MODE=http de .env.local (ou le remettre à "mock")
bun run dev
```

`VITE_API_MODE` est lu **à la compilation** : un simple rechargement de page ne
suffit pas, il faut redémarrer Vite. Les données du `localStorage` ne sont pas
effacées par la bascule — le mode `mock` retrouve l'état exact qu'il avait.

### 4. Vérifier que les deux moitiés s'accordent

```bash
API_URL=http://127.0.0.1:8160/v1 API_EMAIL=admin@katech.dz \
  API_PASSWORD='Mdp-Dev-2026!' bunx tsx scripts/conformite-api.ts
```

Le harnais appelle les 27 ressources et compare la réponse réelle à la forme que
`src/data-provider` attend. Sortie `0` si tout concorde, `1` en cas d'écart,
`2` s'il n'a pas pu travailler (API injoignable, connexion refusée) — un
harnais muet n'est jamais compté comme un succès. Il **écrit** dans la base
(amorçage d'un jeu d'essai) et refuse de tourner ailleurs qu'en loopback.
Rapport commenté : `docs/CONFORMITE-API.md`.

## Déploiement

Copiez le contenu de `dist/` à la racine web de votre serveur. **Un fallback SPA est indispensable** pour que le rafraîchissement d'une route profonde (`/product/xyz`, `/admin/orders`) serve `index.html`.

### nginx

```nginx
server {
  listen 80;
  server_name katech.dz;
  root /var/www/katech;
  index index.html;

  # cache long pour les assets hashés
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # fallback SPA
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Apache (`.htaccess` à placer à côté de `index.html`)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Caddy

```caddy
katech.dz {
  root * /var/www/katech
  encode gzip
  try_files {path} /index.html
  file_server
}
```

## Comptes de démonstration

Les comptes de démonstration sont semés uniquement lorsque le build est en mode `development` (serveur `bun run dev` et `bun run build:dev`).

### Mot de passe de développement par défaut

Aucune configuration n'est nécessaire : sans `.env.local`, les cinq comptes semés reçoivent tous le même mot de passe de développement par défaut.

| Mot de passe par défaut | S'applique à                                     |
| ----------------------- | ------------------------------------------------ |
| `katech-dev-2026`       | Les cinq comptes semés (`*@katech.dz`), en `dev` |

`VITE_DEV_SEED_CREDENTIALS` (voir `.env.example`) **remplace** ce défaut, compte par compte : un compte qui y figure prend le mot de passe indiqué, les autres gardent `katech-dev-2026`.

Ce mot de passe est réellement vérifié. **Un mot de passe faux est refusé en développement comme en production**, sans exception : il n'existe aucun repli qui accorderait la connexion à un compte dépourvu de mot de passe. Un tel repli a existé — il acceptait n'importe quelle saisie dès que `.env.local` manquait — il a été supprimé et ne doit pas être réintroduit.

En production, aucun compte n'est semé, aucun mot de passe n'est embarqué dans le bundle et aucun compte sans mot de passe ne peut se connecter. Vérifiable :

```bash
bun run build && grep -r "katech-dev-2026" dist/   # ne doit rien renvoyer
```

L'authentification réelle (backend + base de données) sera introduite en phase 4 du `PLAN.md` ; jusque-là, aucune connexion n'est fonctionnelle sur un build de production.

### Piège : les données semées ne le sont qu'une fois

Le seed ne s'exécute que si le `localStorage` du navigateur est **vide** (clé `katech.admin.state.v1`). Conséquence : modifier `VITE_DEV_SEED_CREDENTIALS` **après** avoir lancé l'application ne change pas les comptes déjà enregistrés. Pour repartir d'un état propre, utilisez la page **`/admin/reset`**.

Une seule exception est rattrapée automatiquement, et uniquement en mode `development` : un compte semé enregistré **sans aucun mot de passe** (état créé avant l'existence du mot de passe par défaut) est complété à l'hydratation, sans toucher aux comptes créés par l'utilisateur ni à un mot de passe existant. Le badge de mode, en bas de l'écran, signale en jaune les comptes qui restent dépourvus de mot de passe et donc incapables de se connecter.

## Déployer une démonstration

Pour déployer une version cliquable avec les comptes de test pré-remplis (par exemple sur un hébergement mutualisé pour faire tester l'interface) :

```bash
# 1. Créez .env.local à partir du fichier d'exemple (gitignoré)
cp .env.example .env.local

# 2. Construisez le bundle de démonstration
bun run build:dev
```

La commande `bun run build:dev` exécute `vite build --mode development`. En mode `development`, Vite injecte la valeur de `VITE_DEV_SEED_CREDENTIALS` dans le bundle ; les comptes de démonstration sont alors disponibles sans serveur de développement. Sans `.env.local`, ce build embarque à la place le mot de passe par défaut `katech-dev-2026` pour les cinq comptes.

**Comptes disponibles après déploiement** (avec le `.env.example` recopié tel quel ; sans `.env.local`, lisez `katech-dev-2026` dans toute la colonne) **:**

| E-mail            | Mot de passe | Rôle   |
| ----------------- | ------------ | ------ |
| `admin@katech.dz` | `admin123`   | owner  |
| `sarah@katech.dz` | `sarah123`   | admin  |
| `karim@katech.dz` | `karim123`   | editor |
| `lina@katech.dz`  | `lina123`    | editor |
| `omar@katech.dz`  | `omar123`    | viewer |

> **Avertissement de sécurité.** Un build `--mode development` embarque les mots de passe **en clair dans le JavaScript livré**. Tout visiteur peut les lire. N'utilisez que des identifiants fictifs (comme ceux de l'exemple) et ne déployez jamais ce build en production. Ce build ne remplace pas `bun run build` pour un déploiement réel.

**Build de production normal :**

```bash
bun run build
```

`bun run build` produit un bundle optimisé sans aucun identifiant embarqué. Aucun accès administrateur n'est fonctionnel avant l'intégration du backend (phase 4 du `PLAN.md`) ; la page de connexion s'affiche mais toute tentative de connexion est refusée.

## Architecture

- **React 19** + **Vite 7** + **React Router v6** (SPA)
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** (Radix + variantes), **lucide-react**, **framer-motion**
- État global : `React Context` (`ThemeProvider`, `I18nProvider`, `AuthProvider`, `StoreProvider`)
- Persistance client : `localStorage` (panier, favoris, auth mockée)

Aucun serveur applicatif n'est requis en Phase 1. Le backend (Bun + Hono + SQLite) sera ajouté en Phase 2.
