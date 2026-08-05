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

Les comptes de démonstration sont semés uniquement lorsque le build n'est pas en mode `production` (voir ci-dessous). Pour les utiliser en développement local, copiez `.env.example` vers `.env.local` ; la variable `VITE_DEV_SEED_CREDENTIALS` y définit les identifiants des comptes semés.

En production, aucun compte n'est semé et aucun compte sans mot de passe ne peut se connecter. L'authentification réelle (backend + base de données) sera introduite en phase 4 du `PLAN.md` ; jusque-là, aucune connexion n'est fonctionnelle sur un build de production.

## Déployer une démonstration

Pour déployer une version cliquable avec les comptes de test pré-remplis (par exemple sur un hébergement mutualisé pour faire tester l'interface) :

```bash
# 1. Créez .env.local à partir du fichier d'exemple (gitignoré)
cp .env.example .env.local

# 2. Construisez le bundle de démonstration
bun run build:dev
```

La commande `bun run build:dev` exécute `vite build --mode development`. En mode `development`, Vite injecte la valeur de `VITE_DEV_SEED_CREDENTIALS` dans le bundle ; les comptes de démonstration sont alors disponibles sans serveur de développement.

**Comptes disponibles après déploiement :**

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
