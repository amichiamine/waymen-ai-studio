# Déploiement de KA Tech Hub

Procédure complète de mise en ligne sur un hébergement mutualisé, écrite pour
être exécutée **sans SSH**, uniquement avec le gestionnaire de fichiers du
panneau de l'hébergeur.

Cible de référence : **Hostinger** (panneau hPanel, serveur LiteSpeed, MySQL
fourni, tâches CRON disponibles). La procédure vaut pour tout mutualisé PHP
8.2+ qui lit les fichiers `.htaccess`.

> **Aucun prérequis exotique.** Pas de SSH, pas de Composer sur le serveur,
> pas de Node.js sur le serveur, aucune dépendance à installer. Le site est
> construit en local ; le serveur ne reçoit que des fichiers finis.

> **Trois moteurs de base supportés.** L'API fonctionne à l'identique sur
> `sqlite`, `mysql` et `pgsql` (PostgreSQL — Supabase, Neon, Railway…).
> Le choix se fait avec une seule variable, `DB_DRIVER`, et reste réversible
> via la page `/admin/developpeur`.

---

## Sommaire

1. [Ce qu'il faut avant de commencer](#1-ce-quil-faut-avant-de-commencer)
2. [Sonder l'hébergement (recommandé)](#2-sonder-lhébergement-recommandé)
3. [Construire le site en local](#3-construire-le-site-en-local)
4. [L'arborescence cible](#4-larborescence-cible)
5. [Téléverser les fichiers](#5-téléverser-les-fichiers)
6. [Choisir le pilote de base de données](#6-choisir-le-pilote-de-base-de-données)
7. [Renseigner `api/.env`](#7-renseigner-apienv)
8. [Lancer l'installation](#8-lancer-linstallation)
9. [Suppressions obligatoires](#9-suppressions-obligatoires)
10. [La tâche CRON de sauvegarde](#10-la-tâche-cron-de-sauvegarde)
11. [Liste de vérification après déploiement](#11-liste-de-vérification-après-déploiement)
12. [Restaurer une sauvegarde](#12-restaurer-une-sauvegarde)
13. [Si quelque chose échoue](#13-si-quelque-chose-échoue)
14. [Mettre le site à jour plus tard](#14-mettre-le-site-à-jour-plus-tard)
15. [Ce qui n'a pas pu être vérifié avant l'achat de l'hébergement](#15-ce-qui-na-pas-pu-être-vérifié-avant-lachat-de-lhébergement)

---

## 1. Ce qu'il faut avant de commencer

| Élément     | Détail                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| Hébergement | PHP **8.2 minimum**, `.htaccess` lus, au moins un pilote PDO disponible |
| Accès       | Panneau de l'hébergeur (hPanel) + gestionnaire de fichiers              |
| Domaine     | Pointé sur l'hébergement, **certificat HTTPS actif**                    |
| En local    | Le dépôt du projet et `bun` (ou `npm`) pour construire `dist/`          |
| Temps       | Environ 45 minutes la première fois                                     |

Extensions PHP nécessaires : **un** parmi `pdo_mysql`, `pdo_sqlite` ou
`pdo_pgsql`, plus `mbstring`, `json`, `openssl`. Toutes sont standard.
`zlib` est utilisée pour compresser les sauvegardes ; son absence n'est pas
bloquante.

> **HTTPS d'abord.** Activez le certificat SSL **avant** l'installation. Les
> cookies de session sont marqués `Secure` : en HTTP simple, la connexion à
> l'administration échouera sans message explicite côté navigateur.

---

## 2. Sonder l'hébergement (recommandé)

Le dépôt contient une sonde qui répond aux questions qu'on ne peut pas poser à
l'avance : version de PHP, extensions présentes, droits d'écriture hors
`public_html`, `.htaccess` pris en compte.

1. Téléverser `scripts/sonde-hebergeur.php` dans `public_html/`.
2. Ouvrir `https://votre-domaine/sonde-hebergeur.php`.
3. Lire le verdict, le conserver.
4. **Supprimer immédiatement le fichier** (voir [§9](#9-suppressions-obligatoires)).

La sonde est en lecture seule, à une exception près : elle écrit puis efface un
fichier de test hors `public_html` pour vérifier que l'écriture y est permise —
c'est ce qui décide si le pilote SQLite est utilisable.

---

## 3. Construire le site en local

```bash
bun install
bun run build      # produit dist/
```

### Après le build — une vérification qui évite une panne difficile à diagnostiquer

Vérifiez que **`dist/.htaccess` existe** :

```bash
ls -la dist/.htaccess
```

Ce fichier vient de `public/.htaccess`, que Vite recopie dans `dist/`. Certains
outils de copie et certains clients FTP **ignorent les fichiers commençant par
un point**. S'il est absent de `dist/`, copiez-le à la main :

```bash
cp public/.htaccess dist/.htaccess
```

**Sans ce fichier, aucune route du site ne fonctionne à part l'accueil** :
`/produits` renverrait une erreur 404 du serveur, parce que c'est une route
gérée côté navigateur et qu'aucun fichier `produits` n'existe sur le disque.

---

## 4. L'arborescence cible

`~` désigne la racine de votre compte d'hébergement. Chez Hostinger, c'est
`/home/uXXXXXXXXX/domains/votre-domaine.dz/`, et la racine web est le
`public_html` qu'elle contient.

```
~/
├── katech-data/                    ← HORS de la racine web. Jamais accessible par HTTP.
│   ├── katech.sqlite                  (uniquement si DB_DRIVER=sqlite)
│   ├── backups/                       (sauvegardes automatiques)
│   └── sessions/                      (optionnel, voir SESSION_SAVE_PATH)
│
└── public_html/                    ← LA RACINE WEB. Tout ce qui est ici est public.
    ├── .htaccess                      ← contenu de dist/.htaccess (repli SPA, sécurité, cache)
    ├── index.html                     ← contenu de dist/
    ├── favicon.ico
    ├── robots.txt
    ├── sitemap.xml
    ├── assets/                        ← contenu de dist/assets/ (JS, CSS, images empreintés)
    │
    ├── uploads/                       ← médias téléversés depuis l'administration
    │
    └── api/                        ← contenu du dossier api/ du dépôt
        ├── .htaccess                  ← routage de l'API + refus des fichiers sensibles
        ├── .env                       ← À CRÉER, jamais versionné, jamais téléchargeable
        ├── index.php                  ← seul point d'entrée de l'API
        ├── install.php                ← À SUPPRIMER après l'installation
        ├── routes.php
        ├── schema/
        ├── src/
        └── tools/
            ├── sauvegarder.php
            └── vider-outbox.php
```

### Deux règles qui expliquent toute cette structure

1. **Ce qui est dans `public_html` est téléchargeable par n'importe qui.** La
   base de données, les sauvegardes et les secrets n'y sont donc pas. Les
   `.htaccess` bloquent ce qui doit rester dans `api/` (le code, le `.env`),
   mais un `.htaccess` peut être ignoré par un serveur mal configuré. Le seul
   emplacement réellement sûr est **hors** de `public_html`.
2. **`uploads/` est dans `public_html` — c'est voulu.** Les images produits
   doivent être servies par HTTP. Le `.htaccess` racine y interdit en revanche
   l'exécution de tout `.php`, `.phar`, `.cgi` qui y serait déposé.

---

## 5. Téléverser les fichiers

Avec le gestionnaire de fichiers de hPanel :

1. **Le site** : envoyer le **contenu** de `dist/` dans `public_html/`
   (donc `index.html` directement dans `public_html`, pas dans un sous-dossier
   `dist`). Vérifier que `public_html/.htaccess` est bien présent.
2. **L'API** : envoyer le dossier `api/` **entier** dans `public_html/`, pour
   obtenir `public_html/api/`. Vérifier que `public_html/api/.htaccess` est
   présent.
3. **Le dossier de données** : créer `katech-data/` **au même niveau que**
   `public_html`, jamais dedans. Y créer un sous-dossier `backups/`.
4. **Les médias** : créer `public_html/uploads/` s'il n'existe pas.

> **Astuce.** Téléverser une archive ZIP puis la décompresser depuis hPanel est
> beaucoup plus rapide et plus fiable que d'envoyer les fichiers un à un.
> Après décompression, **vérifiez la présence des fichiers `.htaccess`** :
> beaucoup d'outils de compression les excluent par défaut.

Droits attendus : `755` pour les dossiers, `644` pour les fichiers. Pour
`katech-data/` et ses sous-dossiers, `755` convient ; `770` si l'hébergeur
l'exige pour l'écriture.

---

## 6. Choisir le pilote de base de données

Le projet fonctionne à l'identique sur les trois pilotes. Le choix se fait
avec une seule variable, `DB_DRIVER`, et reste réversible après déploiement
via la page `/admin/developpeur` (voir [§8](#8-lancer-linstallation)).

| Critère                    | `mysql`                       | `sqlite`                                        | `pgsql`                                         |
| -------------------------- | ----------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Disponibilité en mutualisé | **Garantie**                  | Dépend de `pdo_sqlite` et des droits d'écriture | Si `pdo_pgsql` est activé (pas toujours le cas) |
| Mise en place              | Créer la base dans hPanel     | Aucune, un simple fichier                       | Créer la base PostgreSQL (Supabase, Neon…)      |
| Sauvegarde                 | Export SQL                    | Copie d'un fichier                              | Export SQL                                      |
| Portabilité                | Export/import                 | **Totale** : un fichier à copier                | Export/import, ou migrateur intégré             |
| Recommandation             | **Par défaut chez Hostinger** | Si la sonde confirme que c'est possible         | Si vous utilisez Supabase, Neon, ou Railway     |

**En cas de doute, choisissez `mysql`** : c'est la raison d'être d'un
hébergement mutualisé, et rien ne dépend d'un dossier inscriptible.

Vous pouvez changer de moteur après déploiement : la page
`/admin/developpeur` propose une migration assistée (simulation d'abord,
transfert réel après confirmation). `docs/MIGRATION.md` décrit la procédure
complète.

### 6.a — MySQL : créer la base dans hPanel

1. hPanel → **Bases de données** → **Gestion des bases MySQL**.
2. Créer une base. Noter **les quatre valeurs** :
   - nom de la base (souvent préfixé, ex. `u123456789_katech`) ;
   - nom d'utilisateur (souvent préfixé aussi, ex. `u123456789_katech`) ;
   - mot de passe (le générer, le conserver dans un gestionnaire) ;
   - hôte : chez Hostinger, c'est **`localhost`**.
3. Ne créer aucune table à la main : `install.php` s'en charge.

> **Le piège le plus fréquent.** Le nom réel de la base et de l'utilisateur
> comportent le préfixe du compte. Renseigner `katech` au lieu de
> `u123456789_katech` produit exactement l'erreur « Connexion MySQL refusée »
> décrite au [§13](#13-si-quelque-chose-échoue).
>
> **Second piège.** `DB_HOST` vaut `localhost`, **pas** `127.0.0.1` : chez
> beaucoup de mutualisés, la connexion passe par une socket Unix que seul
> `localhost` déclenche.

### 6.b — SQLite : placer le fichier

Rien à créer : `install.php` crée le fichier au premier lancement. Il faut
seulement que le **dossier** existe et soit inscriptible.

1. Créer `~/katech-data/` (hors `public_html`).
2. Dans `.env`, renseigner le **chemin absolu** :
   ```
   DB_SQLITE_PATH=/home/uXXXXXXXXX/domains/votre-domaine.dz/katech-data/katech.sqlite
   ```

Le chemin absolu exact est affiché par la sonde de l'étape 2, ou par le
gestionnaire de fichiers de hPanel.

> **À ne jamais faire :**
> `DB_SQLITE_PATH=/home/.../public_html/katech.sqlite`
> La base entière — clients, commandes, mots de passe hachés — deviendrait
> téléchargeable par quiconque devine l'adresse. Le `.htaccess` racine bloque
> les fichiers `.sqlite` en défense de dernier recours, mais **ne comptez pas
> dessus** : placez le fichier hors de la racine web.

SQLite doit pouvoir écrire dans le **dossier**, pas seulement dans le fichier :
il y crée aussi `katech.sqlite-wal` et `katech.sqlite-shm`.

### 6.c — PostgreSQL : Supabase, Neon, Railway

PostgreSQL est un serveur externe : la base n'est **pas** sur le même serveur
que le site. Cela convient parfaitement à un hébergement mutualisé.

1. Créer la base chez le fournisseur (Supabase : `Project Settings` → `Database`).
2. Vérifier que `pdo_pgsql` est activé (la sonde §2 le confirme).
3. Dans `api/.env` :
   ```ini
   DB_DRIVER=pgsql
   DB_HOST=db.<référence>.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=le-mot-de-passe-du-projet
   DB_SSLMODE=require
   ```

> **`DB_SSLMODE=require` est obligatoire chez Supabase.** Sans lui, la
> connexion échoue avec un message qui ne mentionne pas TLS, ce qui rend
> le diagnostic difficile.
>
> **Port 5432, pas 6543.** Le port 6543 est le pooler en mode transaction :
> il désactive les requêtes préparées côté serveur utilisées par ce projet.
>
> La base doit exister avant d'ouvrir `install.php` : contrairement à MySQL
> chez Hostinger, elle n'est **pas** créée automatiquement.

---

## 7. Renseigner `api/.env`

Copier `api/.env.example` en `api/.env` (gestionnaire de fichiers → renommer
une copie), puis l'éditer. `api/.env.example` documente **toutes** les
variables ; voici les seules obligatoires pour démarrer.

### Communes aux deux pilotes

```ini
APP_ENV=production
CORS_ORIGINS=
APP_URL=https://votre-domaine.dz
```

- `APP_ENV=production` : aucune trace d'erreur n'est renvoyée au visiteur.
  **Ne jamais mettre `dev` en ligne** : les messages d'exception, chemins de
  fichiers et numéros de ligne seraient exposés dans les réponses JSON.
- `CORS_ORIGINS` **vide** : le site et l'API sont sur le même domaine, aucune
  requête n'est cross-origin. Y mettre une valeur sans nécessité ouvre l'API à
  un autre domaine.

### Si `DB_DRIVER=mysql`

```ini
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_katech
DB_USER=u123456789_katech
DB_PASSWORD=le-mot-de-passe-genere
```

### Si `DB_DRIVER=sqlite`

```ini
DB_DRIVER=sqlite
DB_SQLITE_PATH=/home/uXXXXXXXXX/domains/votre-domaine.dz/katech-data/katech.sqlite
```

### Si `DB_DRIVER=pgsql`

```ini
DB_DRIVER=pgsql
DB_HOST=db.<référence>.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=le-mot-de-passe-du-projet
DB_SSLMODE=require
```

`DB_SSLMODE=require` est obligatoire chez Supabase et la plupart des services
PostgreSQL hébergés. Laisser vide seulement pour un PostgreSQL local.

### Le compte propriétaire — lu une seule fois

```ini
INSTALL_OWNER_NAME=Votre Nom
INSTALL_OWNER_EMAIL=vous@votre-domaine.dz
INSTALL_OWNER_PASSWORD=une-phrase-de-passe-longue-et-unique
```

L'installateur **refuse** un mot de passe faible ou prévisible, et ne crée
jamais de compte `admin/admin` par défaut. Le mot de passe est haché
(Argon2id, ou bcrypt si Argon2id est absent) ; il n'est jamais stocké en clair.

**Ces trois lignes sont à effacer du `.env` juste après l'installation**
(voir [§9](#9-suppressions-obligatoires)).

### Sauvegardes — à renseigner maintenant

```ini
BACKUP_DIR=/home/uXXXXXXXXX/domains/votre-domaine.dz/katech-data/backups
BACKUP_KEEP=14
```

---

## 8. Lancer l'installation

Ouvrir **une seule fois** :

```
https://votre-domaine.dz/api/install.php
```

La page répond en texte brut. En cas de succès :

```
== Installation KA Tech Hub ==
Pilote : mysql

Schéma appliqué : 48 instructions, 23 tables présentes.
Compte propriétaire créé : vous@votre-domaine.dz
Mot de passe haché avec : argon2id.
Effacez maintenant INSTALL_OWNER_PASSWORD de api/.env : le mot de passe est en base,
haché ; le laisser en clair dans un fichier du serveur annule tout le bénéfice.

TERMINÉ.
Étape suivante OBLIGATOIRE : supprimez api/install.php du serveur.
```

**Le nombre de tables doit être 23.** S'il est inférieur, le dossier
`api/schema/` n'a pas été téléversé entièrement.

### Accès aux données après installation : page Développeur

Une fois connecté avec le compte propriétaire, la page `/admin/developpeur`
donne accès à :

- l'état de la base (pilote actif, nombre de lignes par table) ;
- une sauvegarde téléchargeable à la demande ;
- la migration assistée vers un autre moteur (simulation d'abord, transfert
  réel après confirmation).

C'est le seul moyen pour le propriétaire d'accéder à ses données sans SSH.
**Seul le propriétaire peut ouvrir cette page** — jamais un administrateur.

L'installateur dépose un témoin `api/installed.lock` et **refuse de
s'exécuter une seconde fois** : rejoué, il détruirait les données en place. Un
second appel affiche `INSTALLATION DÉJÀ EFFECTUÉE` avec un code 409.

En cas d'échec, **aucun témoin n'est posé** et aucune donnée n'est écrite :
corrigez ce que le message indique, puis rechargez la page. Les messages
d'erreur possibles sont tous listés au [§13](#13-si-quelque-chose-échoue).

---

## 9. Suppressions obligatoires

> **Cette étape n'est pas optionnelle.** Tant qu'elle n'est pas faite, le site
> est en ligne avec deux portes ouvertes.

| Fichier                           | Pourquoi il doit disparaître                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public_html/api/install.php`     | Point d'entrée capable de créer des tables et un compte propriétaire. Le témoin `installed.lock` le neutralise, mais **un fichier absent protège mieux qu'un fichier protégé** : il suffirait qu'un transfert efface le témoin. |
| `public_html/sonde-hebergeur.php` | Publie la version de PHP, les extensions, les chemins absolus du serveur et ses limites. C'est une carte du terrain offerte à un attaquant.                                                                                     |

À faire dans la foulée, dans `api/.env` :

```ini
INSTALL_OWNER_PASSWORD=
```

Effacer la valeur. Le mot de passe est désormais en base, haché ; le laisser en
clair dans un fichier du serveur annule le bénéfice du hachage.

Vérification (les deux doivent renvoyer une page d'erreur 404) :

```
https://votre-domaine.dz/api/install.php
https://votre-domaine.dz/sonde-hebergeur.php
```

---

## 10. La tâche CRON de sauvegarde

hPanel → **Avancé** → **Tâches Cron**.

Il faut le **chemin absolu** de l'interpréteur PHP et du script. Chez
Hostinger, PHP en ligne de commande est `/usr/bin/php` (parfois
`/opt/alt/php82/usr/bin/php` selon la version choisie ; hPanel propose la bonne
valeur dans son assistant).

> **Une seule tâche CRON est nécessaire.** Les emails de confirmation de
> commande sont émis directement à la fin de la requête qui crée la commande,
> sans CRON. C'est un choix explicite du projet : une petite boutique n'a pas
> à gérer un processus de fond. `api/tools/vider-outbox.php` reste disponible
> comme outil manuel de réessai, mais n'est pas à planifier.

### CRON — sauvegarde de la base

| Champ     | Valeur                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------- |
| Fréquence | Une fois par jour, la nuit (`15 3 * * *`)                                                      |
| Commande  | `/usr/bin/php /home/uXXXXXXXXX/domains/votre-domaine.dz/public_html/api/tools/sauvegarder.php` |

Le script fonctionne sur les trois pilotes, sans rien à configurer de plus :

- **SQLite** : instantané cohérent par `VACUUM INTO`, le mécanisme de
  sauvegarde de SQLite. Ce n'est pas une copie de fichier : une copie prise
  pendant une écriture produirait un fichier qui s'ouvre sans erreur mais peut
  être corrompu — le pire des cas, une sauvegarde à laquelle on se fie à tort.
- **MySQL** : export SQL écrit depuis PHP, dans une transaction à instantané
  cohérent. `mysqldump` n'est pas utilisé, car il est souvent absent d'un
  mutualisé.
- **PostgreSQL** : export SQL depuis PHP, avec lecture cohérente par
  transaction. Même procédé que MySQL.

Après écriture, la sauvegarde est **relue et vérifiée par le contenu**
(empreintes par table calculées et comparées à la source). La rotation ne
supprime les anciennes sauvegardes **qu'après** cette vérification : une
sauvegarde ratée n'entraîne jamais la perte d'une sauvegarde valide.

Pour vérifier une archive existante après coup :

```bash
php api/tools/sauvegarder.php --verifier=/chemin/vers/katech-20260806.sqlite.gz
```

> **Ne redirigez pas la sortie vers `/dev/null`.** Le CRON de l'hébergeur
> envoie la sortie du script par courriel, et c'est exactement ainsi qu'un
> échec se remarque. Le script sort avec le **code 1** et écrit sur la sortie
> d'erreur en cas de problème. Renseignez une adresse de notification dans
> hPanel.

Pour lancer une sauvegarde à la main et voir le résultat, utilisez le
« Terminal » de hPanel s'il est disponible :

```bash
php ~/domains/votre-domaine.dz/public_html/api/tools/sauvegarder.php
```

Sortie attendue :

```
[sauvegarde] Démarrage — pilote : mysql
[sauvegarde] Destination : /home/.../katech-data/backups
[sauvegarde] Vérification : marqueur de fin présent, 23 table(s) exportées.
[sauvegarde] Fichier écrit : katech-20260806-031500.sql.gz (412 Ko)
[sauvegarde] Rotation : rien à supprimer (limite de 14 non atteinte).
[sauvegarde] TERMINÉ avec succès en 1.24 s.
```

Options disponibles : `--destination=/chemin`, `--garder=30`,
`--sans-compression`.

Ces scripts **refusent de s'exécuter s'ils sont appelés par HTTP**, même si le
`.htaccess` venait à être ignoré : ils répondent `403` et s'arrêtent.

---

## 11. Liste de vérification après déploiement

À parcourir intégralement, dans l'ordre. La colonne « attendu » décrit ce que
vous devez voir — **tout écart est un problème à régler avant l'ouverture au
public**.

### Le site fonctionne

| À ouvrir                                | Attendu                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `https://votre-domaine.dz/`             | La page d'accueil, avec ses images et ses polices                                           |
| `https://votre-domaine.dz/produits`     | La page produits — **et non une erreur 404 du serveur**. Si 404 : `.htaccess` racine absent |
| Recharger (F5) sur `/produits`          | La même page. C'est le test réel du repli SPA                                               |
| `https://votre-domaine.dz/api/health`   | `{"data":{"status":"ok","driver":"mysql", ...}}` — `driver` doit être le pilote choisi      |
| `https://votre-domaine.dz/api/products` | Un JSON `{"data":{"items":[...]}}`                                                          |
| Console du navigateur (F12)             | **Aucune erreur rouge.** Voir la note CSP ci-dessous                                        |
| Connexion à l'administration            | Le compte propriétaire créé à l'étape 8 fonctionne                                          |

### Ce qui doit être REFUSÉ

Chacune de ces adresses doit renvoyer **403** ou **404** — jamais le contenu du
fichier, jamais un téléchargement qui démarre.

| À ouvrir                                               | Attendu                                   |
| ------------------------------------------------------ | ----------------------------------------- |
| `https://votre-domaine.dz/api/.env`                    | **403** — jamais le contenu du fichier    |
| `https://votre-domaine.dz/api/src/Db.php`              | **403**                                   |
| `https://votre-domaine.dz/api/tools/sauvegarder.php`   | **403**                                   |
| `https://votre-domaine.dz/api/schema/schema.mysql.sql` | **403**                                   |
| `https://votre-domaine.dz/api/installed.lock`          | **403**                                   |
| `https://votre-domaine.dz/api/`                        | Pas de liste de fichiers                  |
| `https://votre-domaine.dz/assets/`                     | Pas de liste de fichiers                  |
| `https://votre-domaine.dz/api/install.php`             | **404** (le fichier a été supprimé au §9) |
| `https://votre-domaine.dz/sonde-hebergeur.php`         | **404** (supprimé au §9)                  |

### Le fichier de base de données — le test à ne pas sauter

**En SQLite**, vérifier les deux adresses suivantes :

| À ouvrir                                         | Attendu        |
| ------------------------------------------------ | -------------- |
| `https://votre-domaine.dz/api/var/katech.sqlite` | **403**        |
| `https://votre-domaine.dz/katech.sqlite`         | **403 ou 404** |

> **Si l'une de ces adresses déclenche un téléchargement, arrêtez tout.**
> Toute la base est publique : comptes clients, commandes, adresses, mots de
> passe hachés. Coupez le site, déplacez le fichier hors de `public_html`,
> corrigez `DB_SQLITE_PATH`, puis **changez tous les mots de passe**.

**En MySQL**, il n'y a pas de fichier à tester : la base n'est pas dans le
système de fichiers du site. Vérifiez en revanche que `api/.env`, qui contient
le mot de passe de la base, renvoie bien **403**.

**Dans les deux cas**, vérifier que les sauvegardes ne sont pas exposées :

| À ouvrir                                | Attendu                                              |
| --------------------------------------- | ---------------------------------------------------- |
| `https://votre-domaine.dz/backups/`     | **404** — ce dossier n'existe pas dans la racine web |
| `https://votre-domaine.dz/katech-data/` | **404**                                              |

### Les en-têtes de sécurité

Dans l'onglet « Réseau » des outils de développement, sur la réponse de la page
d'accueil, vérifier la présence de : `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
`Content-Security-Policy`.

> **Note sur la politique de sécurité du contenu (CSP).** Elle est active dans
> `public/.htaccess` et autorise précisément ce dont le site a besoin : les
> scripts et styles du domaine, les polices Google (`fonts.googleapis.com` et
> `fonts.gstatic.com`), les images du domaine ainsi que celles en `data:`,
> `blob:` et `https:` (une fiche produit peut pointer une image externe), et
> `'unsafe-inline'` pour les styles — obligatoire, React et Radix positionnent
> les composants par attribut `style`.
>
> Si un élément du site ne s'affiche plus après la mise en ligne, ouvrez la
> console : une violation CSP s'y affiche explicitement, en nommant la
> directive en cause. Pour diagnostiquer sans casser le site, remplacez dans
> `public_html/.htaccess` le nom de l'en-tête `Content-Security-Policy` par
> `Content-Security-Policy-Report-Only` : les violations restent visibles mais
> ne sont plus appliquées. Corrigez, puis remettez le nom d'origine.

### La page Développeur

Ouvrir `/admin/developpeur` avec le compte propriétaire. Elle doit afficher :

- le pilote actif (doit correspondre à `DB_DRIVER` dans `api/.env`) ;
- le nombre de lignes par table (les tables du schéma doivent toutes être là) ;
- le bouton de sauvegarde téléchargeable.

### La tâche CRON de sauvegarde

Après 24 heures, vérifier qu'un fichier est apparu dans
`~/katech-data/backups/`. Sinon, lancer la sauvegarde à la main
([§10](#10-la-tâche-cron-de-sauvegarde)) et lire le message d'erreur.

---

## 12. Restaurer une sauvegarde

> Une sauvegarde n'a de valeur que si la restauration a été essayée au moins
> une fois. **Faites cet essai avant l'ouverture au public**, sur une base de
> test, pas en production.

Les fichiers sont nommés `katech-AAAAMMJJ-HHMMSS.sqlite.gz` ou
`katech-AAAAMMJJ-HHMMSS.sql.gz`. L'ordre alphabétique est l'ordre
chronologique.

### SQLite

1. Décompresser l'archive (`gunzip`, ou 7-Zip en local).
2. Mettre le site hors ligne le temps de l'opération.
3. Remplacer le fichier désigné par `DB_SQLITE_PATH` par le fichier restauré.
4. Supprimer les éventuels `katech.sqlite-wal` et `katech.sqlite-shm` restants :
   laissés en place, ils réappliqueraient un journal qui ne correspond plus.
5. Vérifier les droits (`644`, propriétaire = utilisateur PHP), puis ouvrir
   `/api/health`.

### MySQL

1. Décompresser l'archive pour obtenir le `.sql`.
2. hPanel → **phpMyAdmin** → sélectionner la base → onglet **Importer**.
3. Envoyer le fichier `.sql`. Il contient les `DROP TABLE IF EXISTS` et les
   `CREATE TABLE` : il remet la base dans l'état de la sauvegarde.
4. Si le fichier dépasse la limite d'import de phpMyAdmin, découpez-le ou
   augmentez `upload_max_filesize` dans hPanel.

Le fichier se termine par une ligne
`-- FIN DE SAUVEGARDE 23 table(s), N ligne(s)`. **Son absence signifie que
l'export a été tronqué** : n'utilisez pas ce fichier, prenez le précédent.

### Vérifier après restauration

Ouvrir `/api/health`, puis l'administration, et comparer les nombres de
produits et de commandes avec ce qu'ils devaient être.

---

## 13. Si quelque chose échoue

Les messages ci-dessous sont ceux réellement produits par `api/src/Db.php`.
Chacun nomme la cause probable **et** le geste correctif. Ils apparaissent dans
la sortie de `install.php` ou dans le champ `message` des réponses JSON de
l'API.

### « Pilote de base inconnu : « … ». Vérifiez DB_DRIVER dans api/.env »

`DB_DRIVER` contient autre chose que `sqlite`, `mysql` ou `pgsql`. Fautes
fréquentes : espace en fin de ligne, majuscules, guillemets superflus. Écrire
exactement `DB_DRIVER=mysql` (ou `sqlite`, ou `pgsql`).

### « L'extension PHP « pdo_mysql » n'est pas activée sur ce serveur »

Message complet : _« Activez-la dans le panneau de l'hébergeur, ou basculez
DB_DRIVER=sqlite dans api/.env. »_
hPanel → **Configuration PHP** → onglet **Extensions PHP** → cocher
`pdo_mysql` → enregistrer. La même chose vaut pour `pdo_sqlite`.

### « Connexion MySQL refusée sur localhost:3306, base « … », utilisateur « … » »

Message complet : _« Vérifiez dans api/.env : DB_HOST (souvent « localhost »
chez un mutualisé, pas « 127.0.0.1 »), DB_PORT, DB_NAME, DB_USER et
DB_PASSWORD — et que la base a bien été créée dans le panneau de
l'hébergeur. »_

Dans l'ordre de probabilité :

1. Le **préfixe** manque dans `DB_NAME` ou `DB_USER` (`u123456789_katech`).
2. `DB_HOST` vaut `127.0.0.1` au lieu de `localhost`.
3. L'utilisateur n'est pas rattaché à la base dans hPanel.
4. Le mot de passe contient un caractère mal recopié, ou des guillemets
   inutiles ont été ajoutés autour.

### « Le dossier de données « … » n'existe pas et n'a pas pu être créé »

Message complet : _« Créez-le manuellement et rendez-le inscriptible par PHP,
ou corrigez DB_SQLITE_PATH dans api/.env. »_
Le chemin est probablement erroné : vérifiez le chemin **absolu** exact dans le
gestionnaire de fichiers. C'est l'erreur classique quand on recopie
`/home/monuser/...` de l'exemple sans le remplacer par son vrai identifiant.

### « Le dossier de données « … » n'est pas inscriptible par PHP »

Message complet : _« Passez-le en droits 0775 (ou 0755 s'il appartient à
l'utilisateur PHP). SQLite a besoin d'écrire dans le DOSSIER, pas seulement
dans le fichier (journaux -wal et -shm). »_
Corriger les droits du dossier `katech-data/` depuis hPanel.

### « Le fichier de base « … » existe mais n'est pas inscriptible par PHP »

Corriger les droits du fichier (`0664`) et son propriétaire. Survient
typiquement après une restauration faite par téléversement.

### « Impossible d'ouvrir la base SQLite « … » »

Message complet : _« Vérifiez DB_SQLITE_PATH dans api/.env, l'existence du
dossier et ses droits d'écriture. »_
Si le dossier existe et est inscriptible, le système de fichiers de
l'hébergeur peut être en cause (montage réseau). Basculer sur MySQL.

### « La base est verrouillée par une autre écriture et n'a pas répondu dans le délai imparti »

Spécifique à SQLite, sous forte concurrence. Ponctuel : réessayer. Répété :
le système de fichiers ne gère pas correctement les verrous — **basculer sur
MySQL** (changer `DB_DRIVER`, renseigner les identifiants, réinstaller sur la
nouvelle base).

### Dans le journal : « PRAGMA journal_mode=WAL refusé par le système de fichiers »

Message complet : _« La base reste fonctionnelle mais moins concurrente. »_
Ce n'est **pas** une erreur bloquante : le site fonctionne. C'est un signal
que le mode WAL n'est pas accepté — surveillez les verrous ci-dessus.

### « Connexion PostgreSQL refusée sur … »

Message complet : _« Vérifiez dans api/.env : DB_HOST, DB_PORT (5432 en direct),
DB_NAME, DB_USER, DB_PASSWORD — et que la base existe (elle n'est pas créée
automatiquement). Chez Supabase : DB_SSLMODE=require est OBLIGATOIRE… »_

Dans l'ordre de probabilité :

1. **`DB_SSLMODE=require` manquant** chez Supabase ou un service hébergé : la
   connexion est refusée sans message explicite mentionnant TLS.
2. **Port 6543 au lieu de 5432** : le pooler en mode transaction désactive les
   requêtes préparées côté serveur utilisées par ce projet — erreur différente,
   mais liée.
3. La base n'a pas été créée avant l'installation (ce n'est pas automatique
   en PostgreSQL).

### « SESSION_SAVE_PATH pointe vers « … », qui n'existe pas et n'a pas pu être créé »

Créer le dossier de sessions, ou retirer la ligne `SESSION_SAVE_PATH` du
`.env` pour revenir au dossier temporaire par défaut.

### Une page blanche, ou « Erreur interne du serveur »

L'API ne renvoie **jamais** de page blanche : elle répond en JSON en toutes
circonstances. Une page blanche signifie que la requête n'a pas atteint
`index.php`.

1. `.htaccess` absent ou ignoré → voir ci-dessous.
2. Version de PHP inférieure à 8.2 → hPanel → **Configuration PHP**.
3. Consulter le **journal d'erreurs PHP** dans hPanel : le détail complet y est
   écrit, préfixé `[katech-api]`. Le client ne reçoit qu'un message générique,
   c'est volontaire.

### Toutes les adresses `/api/...` renvoient 404

Le `.htaccess` de `api/` est absent, ou le serveur ne le lit pas. Vérifier
d'abord sa présence (les gestionnaires de fichiers masquent souvent les
fichiers commençant par un point : activer « afficher les fichiers cachés »).
Si le fichier est bien là, l'hébergeur n'autorise pas la réécriture d'URL —
c'est très rare en mutualisé, contactez le support.

### Le site s'affiche mais aucune route ne fonctionne

Le `.htaccess` de la **racine** manque. Voir [§3](#3-construire-le-site-en-local).

### Une modification du site n'apparaît pas après une mise à jour

Le navigateur a gardé l'ancien `index.html` en cache. Le `.htaccess` racine
l'interdit explicitement (`Cache-Control: no-cache, no-store`) ; si le problème
persiste, un cache est actif côté hébergeur (LiteSpeed Cache dans hPanel) :
videz-le.

---

## 14. Mettre le site à jour plus tard

1. **Sauvegarder d'abord** : lancer `api/tools/sauvegarder.php` à la main et
   vérifier que le fichier est bien créé.
2. `bun run build` en local ; vérifier que `dist/.htaccess` existe.
3. Remplacer dans `public_html/` : `index.html`, `assets/`, et les fichiers
   statiques modifiés.
   **Ne pas supprimer** `uploads/`, `api/.env`, ni le dossier `katech-data/`.
4. Si le code de l'API a changé, remplacer `api/src/`, `api/routes.php`,
   `api/index.php`, `api/schema/`, `api/tools/`. **Ne pas** re-téléverser
   `install.php`. `api/schema/` contient maintenant trois fichiers
   (`schema.sqlite.sql`, `schema.mysql.sql`, `schema.pgsql.sql`) — téléverser
   les trois, même si vous n'utilisez qu'un seul pilote.
5. Les anciens fichiers de `assets/` peuvent être supprimés : leurs noms
   contiennent une empreinte, les nouveaux ont d'autres noms. En cas de doute,
   les laisser une semaine — un visiteur ayant un onglet ouvert peut encore les
   réclamer.

Le cache est conçu pour ça : `index.html` n'est jamais mis en cache et désigne
les empreintes du jour ; les fichiers de `assets/` sont mis en cache un an,
puisqu'un changement de contenu change leur nom.

---

## 15. Ce qui n'a pas pu être vérifié avant l'achat de l'hébergement

Cette procédure a été écrite et testée **sans accès à l'hébergement cible**.
Les points suivants relèvent du comportement du serveur web et ne peuvent être
confirmés qu'à la première mise en ligne. Ils sont tous couverts par la liste
de vérification du [§11](#11-liste-de-vérification-après-déploiement) :

- l'interprétation effective des deux `.htaccess` par LiteSpeed (les règles ont
  été relues ligne à ligne et validées par simulation des motifs contre les
  93 routes réelles, mais aucun serveur web n'a été exécuté) ;
- les codes de retour réels des adresses qui doivent être refusées ;
- le comportement de la politique CSP dans un navigateur ;
- la disponibilité et le chemin exact de l'interpréteur PHP en ligne de
  commande pour les CRON ;
- l'export MySQL de `sauvegarder.php`, écrit sans accès à un serveur MySQL.
  **Lancez une sauvegarde à la main, et faites un essai de restauration
  ([§12](#12-restaurer-une-sauvegarde)), avant l'ouverture au public.**

---

## Voir aussi

- `api/.env.example` — toutes les variables de configuration, commentées
- `docs/BACKEND.md` — architecture de l'API et recette
- `docs/MIGRATION.md` — migrer les données entre moteurs (six directions)
- `PLAN.md` — décisions d'architecture, dont le triple pilote SQLite / MySQL / PostgreSQL
