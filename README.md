# KA Tech — Boutique en ligne (React + PHP)

Application e-commerce complète : SPA React/Vite en frontend, API PHP 8.2
en backend, base de données au choix (`sqlite`, `mysql` ou `pgsql`). Hébergement
mutualisé sans prérequis exotique : pas de Node.js côté serveur, pas de Composer
sur le serveur. `bun run build` produit le frontend statique avec prérendu des
27 URL du sitemap (`scripts/prerendu.ts`, script `postbuild`) ; `api/` contient
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

**Ceci concerne uniquement le poste de développement.** En production, la base
doit rester hors de la racine web — voir `docs/DEPLOIEMENT.md`.

La base vit dans le projet lui-même : `<projet>/katech-data/`. Son nom est tiré
au sort au premier démarrage (`dev-2dd162e7e762.sqlite`, par exemple) — un nom
non devinable est la seule protection qui tienne quel que soit le serveur web
utilisé. Trois protections s'empilent dans ce dossier : un `.htaccess` (Apache
et LiteSpeed uniquement — nginx les ignore), un `index.html` anti-listage, et le
nom non devinable du fichier lui-même.

> **Si le projet est cloné sous une racine web** (`htdocs`, `www`, `public_html`,
> `wwwroot`), le script détecte la situation, pose les protections disponibles et
> affiche un avertissement. La base n'est pas refusée : le client a demandé cet
> emplacement, il est servi — mais honnêtement informé de ce que les protections
> ne couvrent pas (nginx notamment).
>
> Pour une sécurité qui ne dépend d'aucune de ces trois barrières, pointez la
> base ailleurs avec `DB_SQLITE_PATH=<chemin hors racine web>`.

Pour repartir de zéro, supprimez le fichier (le dossier affiche son chemin
exact au démarrage) ; il sera recréé et rempli au démarrage suivant.

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

1. `VITE_API_MODE=http bun run build && bun run paqueter` — produit
   `katech-site.zip` (site + `api/` embarqué). La variable `VITE_API_MODE=http`
   est la valeur par défaut de `.env.example` ; elle est obligatoire pour tout
   déploiement réel. Désactiver le prérendu : `PRERENDU=0 bun run build`.
2. Déposer `katech-site.zip` dans `public_html` et l'extraire sur place
   (clic droit → Extraire dans hPanel). Plus de double téléversement.
3. Ouvrir `https://votre-domaine/api/install.php` et suivre les trois écrans :
   l'assistant écrit `api/.env`, crée `katech-data/` hors racine web et prouve
   que la base n'est pas téléchargeable.
4. Cliquer le bouton « Supprimer ce fichier » à la fin de l'assistant.

**La base de données ne doit jamais être dans `public_html`.** La sonde
`scripts/sonde-hebergeur.php` vérifie que les prérequis sont réunis avant
l'achat de l'hébergement.

**PHP doit être actif à la racine du site.** `public_html/index.php` sert
`index.html` en y injectant la balise `<base>` calculée à l'exécution, ce qui
permet de déployer le site dans un sous-dossier (`public_html/ma-boutique/`)
sans reconstruire. Si PHP n'est pas actif à la racine, les routes profondes
rechargées échoueront.

### Où vivent les données

```
~/
├── katech-data/          ← HORS public_html (ni SQLite ni sauvegardes ne doivent être en racine web)
│   ├── katech.sqlite       (si DB_DRIVER=sqlite)
│   └── backups/
└── public_html/
    ├── index.php             ← injecte la balise <base>, permet le sous-dossier
    ├── index.html, assets/
    ├── about/, blog/, builder/, category/, contact/ ← sous-dossiers prérendus
    ├── uploads/            ← images produits (servis par HTTP)
    └── api/                ← backend PHP
```

### Moteurs de base supportés

| `DB_DRIVER` | Quand l'utiliser                                                   |
| ----------- | ------------------------------------------------------------------ |
| `mysql`     | Recommandé chez Hostinger — garanti, sans prérequis                |
| `sqlite`    | Si `pdo_sqlite` est activé et un dossier hors web est inscriptible |
| `pgsql`     | Si vous utilisez Supabase, Neon, Railway ou un PostgreSQL dédié    |

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

En mode `mock`, la connexion est vérifiée localement dans le navigateur, sans appel serveur. En mode `http` (`VITE_API_MODE=http`, désormais la valeur par défaut de `.env.example`), la vérification passe par l'API PHP avec Argon2id — voir `PLAN.md` §8. `bun run dev:mock` reste la porte du mode sans serveur.

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

`bun run build` produit un bundle optimisé sans aucun identifiant embarqué, puis prérend les 27 URL du sitemap. La variable `VITE_API_MODE=http` est la valeur par défaut de `.env.example` ; sans elle (ou avec `VITE_API_MODE=mock`), le site ne parle jamais à l'API. La connexion fonctionnelle requiert aussi un `api/.env` renseigné — voir `docs/DEPLOIEMENT.md`.

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

### Par où commencer, selon qui vous êtes

**Vous n'êtes pas développeur ?** Ouvrez **`GUIDE.html`**, à la racine du dépôt.
Un seul fichier, un double-clic, aucune connexion Internet nécessaire : le guide
complet et illustré de tout le site — configuration, compilation, installation,
déploiement, usage quotidien, entretien, dépannage. **Français et arabe**, avec
une bascule en haut de page. C'est le seul document à lire si vous n'en lisez
qu'un. Il se reconstruit par `bun run construire-guide`.

**Vous êtes le commerçant qui exploite la boutique ?** Ouvrez plutôt
**`MANUEL.html`**, à la racine lui aussi. Même principe — un fichier, un
double-clic, hors connexion, français et arabe — mais **toute la technique en a
été retirée** : ni compilation, ni déploiement, ni serveur. Uniquement ce qui se
fait à la souris dans l'administration : produits, commandes, clients, coupons,
avis, contenu, réglages, livraison, équipe et droits, copie de sauvegarde.
22 sections, 39 captures de l'application réelle, une procédure numérotée par
tâche qui dit toujours comment savoir que ça a marché. Les deux documents sont
indépendants : `MANUEL.html` ne renvoie jamais à `GUIDE.html`. Il se reconstruit
par `bun run construire-manuel` — la marche à suivre est en tête du script.

**Vous lisez l'arabe ?** `docs/ar/` porte la version arabe des trois guides
destinés au commerçant : manuel d'utilisation, guide d'exploitation, guide de
déploiement chez l'hébergeur. `docs/ar/README.md` en est l'index, et dit
honnêtement ce qui existe en arabe et ce qui reste en français.

Les documents purement techniques — contrat d'API, backend, migration, contrat
Notion — restent en français **à dessein** : ils sont attachés à des identifiants
du code, et une traduction y créerait une divergence silencieuse.

### Où trouver quoi

| Besoin                          | Fichier                           |
| ------------------------------- | --------------------------------- |
| Guide complet illustré (FR/AR)  | `GUIDE.html`                      |
| Manuel du propriétaire (FR/AR)  | `MANUEL.html`                     |
| Documentation en arabe          | `docs/ar/`                        |
| Schéma des tables               | `api/schema/`                     |
| Contrôleurs API                 | `api/src/Controllers/`            |
| Connexion et dialectes SQL      | `api/src/Db.php`                  |
| Migrateur de données            | `api/src/Migration/`              |
| Page Développeur (propriétaire) | `src/pages/admin/Developpeur.tsx` |
| Sonde d'hébergement             | `scripts/sonde-hebergeur.php`     |

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
