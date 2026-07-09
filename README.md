# KA Tech — Frontend React + Vite (SPA)

Application 100 % client, sans backend. `bun run build` produit un dossier `dist/` statique copiable sur n'importe quel serveur web.

## Développement

```bash
bun install
bun run dev        # http://localhost:8080
bun run build      # produit ./dist
bun run preview    # sert ./dist localement
```

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

## Architecture

- **React 19** + **Vite 7** + **React Router v6** (SPA)
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** (Radix + variantes), **lucide-react**, **framer-motion**
- État global : `React Context` (`ThemeProvider`, `I18nProvider`, `AuthProvider`, `StoreProvider`)
- Persistance client : `localStorage` (panier, favoris, auth mockée)

Aucun serveur applicatif n'est requis en Phase 1. Le backend (Bun + Hono + SQLite) sera ajouté en Phase 2.
