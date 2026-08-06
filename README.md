# KA Tech — Boutique en ligne (React + PHP)

Application e-commerce complète : SPA React/Vite en frontend, API PHP 8.2
en backend, base de données au choix (`sqlite`, `mysql` ou `pgsql`). Hébergement
mutualisé sans prérequis exotique : pas de Node.js côté serveur, pas de Composer
sur le serveur. `bun run build` produit le frontend statique ; `api/` contient
le backend PHP prêt à déployer.

## Développement

```bash
bun install
```

Une seule commande démarre **tout** : l'API PHP et le frontend.

```bash
bun run dev
```

Au premier lancement, la base est créée et le catalogue importé. Ensuite le
démarrage est immédiat. Le frontend s'ouvre sur **http://localhost:8080** et la
pilule en bas de l'écran affiche **http** : les données viennent de la base, plus
du `localStorage`.

Compte propriétaire : `admin@katech.dz` / `katech-dev-2026`

### Quel identifiant pour quel mode

**Un seul mot de passe de développement : `katech-dev-2026`.** Il vaut dans les
deux modes, c'est voulu — trois mots de passe pour un même écran de connexion,
c'est une connexion refusée sans raison visible.

| Mode                   | Comptes                                                 | Mot de passe                        | Où il est créé                                   |
| ---------------------- | ------------------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `http` (`bun run dev`) | `admin@katech.dz` (owner), en base                      | `katech-dev-2026`                   | `scripts/api-dev.mjs` → `api/install.php`        |
| `mock` (`dev:mock`)    | Les cinq comptes semés `*@katech.dz`, dans localStorage | `katech-dev-2026`                   | `src/lib/admin-store.tsx` (`dev` uniquement)     |
| `mock` + `.env.local`  | Les mêmes cinq comptes                                  | ceux de `VITE_DEV_SEED_CREDENTIALS` | `.env.example` recopié (`admin123`, `sarah123`…) |

Autrement dit : `admin123` et ses voisins n'existent **que** si vous avez recopié
`.env.example` en `.env.local` pour une démonstration en mode `mock`. Sans ce
fichier, il n'y a qu'un seul mot de passe à retenir.

En **production**, rien de tout cela ne s'applique : aucun compte n'est semé et
`INSTALL_OWNER_PASSWORD` est obligatoire, sans valeur par défaut — l'installateur
refuse de créer un propriétaire dont le mot de passe serait devinable.

**Aucun fichier de configuration à créer.** Le mode est injecté par
l'environnement au démarrage.

Sous **Windows**, PHP doit être dans le `PATH` — XAMPP le fournit, ajoutez
`C:\xampp\php`. Si PHP manque, `bun run dev` le dit et démarre quand même le
frontend en mode `mock`, pour que rien ne soit bloquant.

### Les autres entrées

| Commande           | Ce qu'elle fait                               |
| ------------------ | --------------------------------------------- |
| `bun run dev`      | API + frontend, données en base               |
| `bun run dev:mock` | Frontend seul, données dans le `localStorage` |
| `bun run dev:api`  | API seule, pour la sonder au `curl`           |

### Où vit la base de développement

Dans le dossier de données de votre compte utilisateur — **jamais sous une
racine web**, jamais dans le dépôt :

| Système | Chemin                                             |
| ------- | -------------------------------------------------- |
| Windows | `%LOCALAPPDATA%\ka-tech\dev.sqlite`                |
| macOS   | `~/Library/Application Support/ka-tech/dev.sqlite` |
| Linux   | `~/.local/share/ka-tech/dev.sqlite`                |

C'est important : un projet cloné dans `C:\xampp\htdocs\ka-tech` a pour parent
`htdocs`, la racine web d'Apache. Une base placée là serait téléchargeable à
`http://localhost/…/dev.sqlite` — comptes, commandes et empreintes de mots de
passe compris. Le script **refuse** désormais tout emplacement sous `htdocs`,
`www`, `public_html` ou `wwwroot`.

Pour repartir de zéro, supprimez le fichier ; il sera recréé et rempli au
démarrage suivant.

```powershell
Remove-Item -Recurse -Force $env:LOCALAPPDATA\ka-tech    # PowerShell
```

`DB_SQLITE_PATH` reste prioritaire si vous voulez choisir vous-même.

Variables utiles : `PORT` (frontend), `API_PORT` (API), `DB_DRIVER=mysql` pour
changer de pilote, `APP_ENV=development` pour voir les traces d'erreur.

### Pourquoi un proxy

Le frontend et l'API sont sur deux ports. Sans proxy, ce seraient deux
**origines** distinctes : le cookie de session `katech_sid`, qui est `HttpOnly`
et `SameSite=Lax`, ne serait ni posé ni renvoyé, et toute route authentifiée
répondrait `401`. Vite achemine donc `/api` vers l'API — exactement la situation
de production, où les deux partagent le domaine.

### Vérifier que les deux moitiés s'accordent

```bash
API_URL=http://127.0.0.1:8160/v1 API_EMAIL=admin@katech.dz \
  API_PASSWORD='katech-dev-2026' bunx tsx scripts/conformite-api.ts
```

Le harnais appelle les 27 ressources et compare la réponse réelle à la forme
attendue par `src/data-provider`. Sortie `0` si tout concorde, `1` en cas
d'écart, `2` s'il n'a pas pu travailler — un harnais muet n'est jamais compté
comme un succès. Rapport : `docs/CONFORMITE-API.md`.

## Déploiement

La procédure complète sans SSH est dans `docs/DEPLOIEMENT.md`.
Résumé :

1. `bun run build` — produit `dist/`.
2. Téléverser le contenu de `dist/` dans `public_html/` et `api/` dans
   `public_html/api/`.
3. Créer `api/.env` à partir de `api/.env.example`. Choisir `DB_DRIVER`
   (`sqlite`, `mysql` ou `pgsql`).
4. Ouvrir `/api/install.php` une fois, puis le supprimer.

**La base de données ne doit jamais être dans `public_html`.** La sonde
`scripts/sonde-hebergeur.php` vérifie que les prérequis sont réunis avant
l'achat de l'hébergement.

### Où vivent les données

```
~/
├── katech-data/          ← HORS public_html (ni SQLite ni sauvegardes ne doivent être en racine web)
│   ├── katech.sqlite       (si DB_DRIVER=sqlite)
│   └── backups/
└── public_html/
    ├── index.html, assets/
    ├── uploads/            ← images produits (servis par HTTP)
    └── api/                ← backend PHP
```

### Moteurs de base supportés

| `DB_DRIVER` | Quand l'utiliser |
|-------------|-----------------|
| `mysql`     | Recommandé chez Hostinger — garanti, sans prérequis |
| `sqlite`    | Si `pdo_sqlite` est activé et un dossier hors web est inscriptible |
| `pgsql`     | Si vous utilisez Supabase, Neon, Railway ou un PostgreSQL dédié |

Les données peuvent migrer d'un moteur à l'autre depuis `/admin/developpeur`.

### Fallback SPA (configurations autres que Hostinger)

Le `.htaccess` livré dans `public/` gère le fallback SPA sur Apache/LiteSpeed.
Sur d'autres serveurs :

#### nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

#### Caddy

```caddy
try_files {path} /index.html
```

## Comptes de démonstration

Toute cette section décrit le mode **`mock`** : ces comptes vivent dans le
`localStorage`, jamais en base. En mode **`http`**, le seul compte existant est le
propriétaire créé en base (`admin@katech.dz` / `katech-dev-2026`) — voir
[Quel identifiant pour quel mode](#quel-identifiant-pour-quel-mode).

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

### Frontend

- **React 19** + **Vite 7** + **React Router v6** (SPA)
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **shadcn/ui** (Radix + variantes), **lucide-react**, **framer-motion**
- i18n : français / anglais / arabe, texte RTL
- État global : `React Context` (`ThemeProvider`, `I18nProvider`, `AuthProvider`)

### Backend

- **PHP 8.2+**, sans framework ni Composer
- Routeur maison, PDO, sessions PHP, cookie `httpOnly`
- Triple pilote : **SQLite**, **MySQL/MariaDB**, **PostgreSQL**
- Outbox vidée en fin de requête (pas de tâche planifiée pour les emails)

### Où trouver quoi

| Besoin | Fichier |
|--------|---------|
| Schéma des tables | `api/schema/` |
| Contrôleurs API | `api/src/Controllers/` |
| Connexion et dialectes SQL | `api/src/Db.php` |
| Migrateur de données | `api/src/Migration/` |
| Page Développeur (propriétaire) | `src/pages/admin/Developpeur.tsx` |
| Sonde d'hébergement | `scripts/sonde-hebergeur.php` |

### Quand ça casse

1. Ouvrir `/api/health` — il doit renvoyer `{"data":{"status":"ok",...}}`.
2. Si la réponse est vide ou en HTML : le `.htaccess` de `api/` est absent
   ou non lu. Voir `docs/DEPLOIEMENT.md` §13.
3. Si `/api/health` répond mais l'admin refuse la connexion : vérifier que
   HTTPS est actif (les cookies de session exigent `Secure`).
4. En production, les détails d'erreur sont dans le journal PHP du serveur,
   préfixés `[katech-api]`, jamais dans la réponse au navigateur.
5. Pour diagnostiquer une base inaccessible : `docs/DEPLOIEMENT.md` §13
   liste tous les messages produits par `api/src/Db.php` et le geste
   correctif pour chacun.
