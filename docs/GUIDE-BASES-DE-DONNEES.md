# Guide des bases de données — SQLite, MySQL, Supabase

> Ce guide s'adresse au commerçant, ou à la personne qui installe la boutique
> pour lui. Il répond à trois questions, dans cet ordre : **quel moteur de base
> de données choisir**, **comment le mettre en service**, et **comment en
> changer plus tard** sans rien perdre.

KA Tech Hub fonctionne avec trois moteurs de base de données, au choix :

| Valeur de `DB_DRIVER` | Moteur                     | Où vivent les données                   |
| --------------------- | -------------------------- | --------------------------------------- |
| `sqlite`              | SQLite                     | Un fichier sur le disque de l'hébergeur |
| `mysql`               | MySQL ou MariaDB           | Un serveur fourni par l'hébergeur       |
| `pgsql`               | PostgreSQL (dont Supabase) | Un serveur PostgreSQL, souvent distant  |

Le choix se fait à un seul endroit : la ligne `DB_DRIVER` du fichier
`api/.env`. Aucun autre fichier n'est à modifier. Le reste du projet ne connaît
pas le moteur employé — toute la divergence entre les trois est concentrée dans
`api/src/Db.php`.

## Ce que ce guide ne couvre pas

- **Le déploiement chez un hébergeur** (téléversement des fichiers,
  arborescence, `.htaccess`, tâche CRON, suppressions obligatoires après
  installation) : voir `docs/DEPLOIEMENT.md`.
- **Le fonctionnement interne du migrateur** (empreintes de contenu,
  pagination par clé, tri topologique) : voir `docs/MIGRATION.md`. Ce guide
  n'en donne que le mode d'emploi.

## Sommaire

1. [Choisir son moteur](#1-choisir-son-moteur)
2. [Savoir ce que l'hébergeur permet](#2-savoir-ce-que-lhébergeur-permet)
3. [Mode d'emploi — SQLite](#3-mode-demploi--sqlite)
4. [Mode d'emploi — MySQL et MariaDB](#4-mode-demploi--mysql-et-mariadb)
5. [Mode d'emploi — PostgreSQL et Supabase](#5-mode-demploi--postgresql-et-supabase)
6. [Vérifier que la boutique fonctionne](#6-vérifier-que-la-boutique-fonctionne)
7. [Sauvegarder, vérifier une sauvegarde, restaurer](#7-sauvegarder-vérifier-une-sauvegarde-restaurer)
8. [Changer de moteur](#8-changer-de-moteur)
9. [La garantie anti-survente, et comment la rejouer soi-même](#9-la-garantie-anti-survente-et-comment-la-rejouer-soi-même)
10. [Ce qui est garanti, ce qui ne l'est pas](#10-ce-qui-est-garanti-ce-qui-ne-lest-pas)
11. [Le banc d'essai de ce guide](#11-le-banc-dessai-de-ce-guide)

---

## 1. Choisir son moteur

### 1.1 La recommandation, d'abord

Un tableau qui aligne des colonnes sans conclure ne sert à rien. Voici la
décision, par situation.

| Votre situation                                                                               | Prenez       |
| --------------------------------------------------------------------------------------------- | ------------ |
| Hébergement mutualisé algérien ou international (Hostinger, OVH, LWS…), une boutique, un site | **MySQL**    |
| L'hébergeur ne propose pas de base MySQL, ou son quota de bases est déjà consommé             | **SQLite**   |
| Vous testez le projet sur votre ordinateur avant de le mettre en ligne                        | **SQLite**   |
| Vous voulez des sauvegardes gérées par un tiers et une console d'administration en ligne      | **Supabase** |
| Plusieurs sites ou plusieurs serveurs doivent lire la même base                               | **Supabase** |
| Vous n'êtes pas sûr                                                                           | **MySQL**    |

**Pourquoi MySQL par défaut.** C'est le seul moteur qu'un hébergement mutualisé
fournit toujours, sans supplément de prix, avec une interface de gestion
(phpMyAdmin) déjà installée et une sauvegarde côté hébergeur en plus de la
nôtre. Il ne demande aucune extension PHP que l'hébergeur pourrait ne pas avoir
activée : `pdo_mysql` est présent partout. Et si la boutique grandit, le
migrateur (§8) permet de partir vers PostgreSQL sans rien réécrire.

**Pourquoi pas SQLite par défaut**, alors qu'il ne demande rien ? Parce que
toute la base tient dans **un fichier**, et que ce fichier doit être placé hors
de la racine web, dans un dossier inscriptible par PHP. Deux conditions simples,
mais deux occasions de se tromper avec une conséquence grave : un fichier placé
dans `public_html` est **téléchargeable par n'importe qui** — clients,
commandes, mots de passe hachés compris. MySQL n'expose pas cette surface.

**Pourquoi pas Supabase par défaut.** Le serveur est ailleurs, sur Internet.
Chaque requête de la boutique traverse le réseau, ce qui ajoute un délai à
chaque page. Il faut aussi que l'hébergeur ait activé l'extension PHP
`pdo_pgsql`, ce qui n'est pas systématique sur un mutualisé d'entrée de gamme.
Supabase devient le bon choix quand ses avantages propres comptent vraiment :
sauvegardes gérées par le fournisseur, console web, base accessible depuis
plusieurs machines.

### 1.2 Les critères, un par un

#### Ce qu'il faut installer

| Moteur     | Extension PHP requise | Serveur à installer                | Si l'extension manque                                          |
| ---------- | --------------------- | ---------------------------------- | -------------------------------------------------------------- |
| SQLite     | `pdo_sqlite`          | Aucun                              | Message explicite, bascule conseillée vers `mysql`             |
| MySQL      | `pdo_mysql`           | Fourni par l'hébergeur             | Ne se produit pratiquement jamais                              |
| PostgreSQL | `pdo_pgsql`           | Fourni par Supabase, Neon, un VPS… | Message explicite, bascule conseillée vers `sqlite` ou `mysql` |

Le projet ne se contente pas d'échouer : chaque extension absente produit un
message qui nomme l'extension et propose la solution de repli. Par exemple,
pour PostgreSQL (`api/src/Db.php`) :

```
L'extension PHP « pdo_pgsql » n'est pas activée sur ce serveur. Activez-la dans
le panneau de l'hébergeur, ou basculez DB_DRIVER=sqlite ou DB_DRIVER=mysql dans
api/.env.
```

Sur un hébergement mutualisé, activer une extension se demande au support, ou
se coche dans le panneau (Hostinger : hPanel → « Avancé » → « Configuration
PHP » → onglet « Extensions PHP »). Ce n'est pas toujours accordé. C'est
exactement pourquoi le projet supporte trois moteurs plutôt qu'un.

#### Ce que ça coûte

| Moteur   | Coût                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| SQLite   | Nul. C'est un fichier sur un disque déjà payé.                                   |
| MySQL    | Nul en pratique : compris dans toutes les formules mutualisées.                  |
| Supabase | Une offre gratuite existe, avec des limites, et des formules payantes au-dessus. |

Les tarifs et les limites de l'offre gratuite de Supabase changent avec le
temps : consultez la page de tarification du fournisseur au moment du choix. Ce
guide ne cite aucun montant, parce qu'un montant faux est pire qu'une absence de
montant. Le point durable est celui-ci : SQLite et MySQL n'ajoutent rien à la
facture de l'hébergement ; Supabase est un service séparé, avec sa propre
facture et ses propres conditions.

#### Ce qui se passe quand deux clients commandent en même temps

C'est le critère où l'on attendrait le plus de différences. Il n'y en a pas :
**les trois moteurs tiennent la même garantie**, et elle a été rejouée sur les
trois pour écrire ce guide (§9 et §11).

Ce qui diffère, c'est le mécanisme et sa limite haute.

| Moteur     | Mécanisme d'écriture concurrente                                                                 | Limite pratique                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| SQLite     | **Un seul écrivain à la fois** pour tout le fichier ; les lectures restent parallèles (mode WAL) | Convient très largement à une boutique ; s'essouffle sur un site à très fort trafic d'écriture |
| MySQL      | Verrou par **ligne**, plusieurs écritures simultanées sur des produits différents                | Aucune limite atteignable par une petite boutique                                              |
| PostgreSQL | Verrou par **ligne** également                                                                   | Idem                                                                                           |

Autrement dit : SQLite sérialise les écritures, MySQL et PostgreSQL les
parallélisent. Pour une boutique qui enregistre quelques dizaines de commandes
par jour, la différence est invisible. Elle deviendrait sensible sur un site qui
écrit en permanence.

Ce que SQLite ne peut pas faire, en revanche : servir **plusieurs serveurs web**
en même temps. Le fichier est sur un disque ; si demain le site tourne sur deux
machines, il faut MySQL ou PostgreSQL.

#### Ce qu'on fait pour sauvegarder

| Moteur     | Sauvegarde                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| SQLite     | `api/tools/sauvegarder.php` produit un instantané cohérent (`VACUUM INTO`), pas une copie de fichier         |
| MySQL      | Le même script écrit un export SQL depuis PHP, sans dépendre de `mysqldump` (souvent absent d'un mutualisé)  |
| PostgreSQL | Le même script, pour la même raison : `pg_dump` n'est ni présent sur un mutualisé, ni joignable sur Supabase |

Un seul script, trois moteurs, la même commande. Et dans les trois cas la
sauvegarde est **relue et vérifiée par son contenu** avant que la rotation ne
supprime quoi que ce soit (§7).

Ce que chaque moteur apporte **en plus**, en dehors du projet :

- SQLite : rien. Votre sauvegarde est celle du script, et celle de l'hébergeur
  s'il sauvegarde les fichiers du compte.
- MySQL : l'export manuel par phpMyAdmin, et la sauvegarde de base proposée par
  l'hébergeur.
- Supabase : des sauvegardes automatiques gérées par le fournisseur, dans sa
  console. C'est son argument le plus solide.

#### La taille sur le disque

Mesurée sur le même jeu de données (23 tables, 143 lignes), via
`GET /maintenance/status` :

| Moteur     | Taille occupée |
| ---------- | -------------- |
| SQLite     | 364 Ko         |
| MySQL      | 885 Ko         |
| PostgreSQL | 9,4 Mo         |

Ces chiffres mesurent surtout la **taille de départ** d'un moteur, pas le coût
par ligne : PostgreSQL réserve beaucoup d'espace dès la création des tables. Sur
un hébergement mutualisé où le disque est compté, c'est un point à connaître
sans en faire un critère décisif.

#### Le temps de réponse

Mesuré avec les trois moteurs sur la **même machine** (aucun réseau, serveur de
développement PHP), 50 requêtes successives sur la liste des produits :

| Moteur     | Temps moyen par requête |
| ---------- | ----------------------- |
| SQLite     | 4,5 ms                  |
| MySQL      | 4,6 ms                  |
| PostgreSQL | 9,6 ms                  |

À retenir : **les trois se valent** quand le serveur est le même. Ce n'est plus
vrai avec Supabase, où le serveur est distant : il faut ajouter le temps
d'aller-retour du réseau à chaque requête SQL. Ce délai n'a pas pu être mesuré
ici (voir §10, « ce qui n'a pas été vérifié »), mais il est structurel : il
dépend de la distance entre l'hébergeur du site et la région du projet Supabase.
Si vous choisissez Supabase, choisissez la région la plus proche de votre
hébergeur.

### 1.3 Tableau de synthèse

| Critère                         | SQLite                        | MySQL / MariaDB      | PostgreSQL / Supabase          |
| ------------------------------- | ----------------------------- | -------------------- | ------------------------------ |
| Serveur à prévoir               | Aucun                         | Celui de l'hébergeur | Distant, chez un fournisseur   |
| Extension PHP                   | `pdo_sqlite`                  | `pdo_mysql`          | `pdo_pgsql`                    |
| Disponibilité chez un mutualisé | Presque toujours              | Toujours             | À vérifier                     |
| Coût supplémentaire             | Aucun                         | Aucun                | Offre gratuite puis payante    |
| Écritures simultanées           | Une à la fois                 | Parallèles           | Parallèles                     |
| Anti-survente                   | Garantie, vérifiée            | Garantie, vérifiée   | Garantie, vérifiée             |
| Plusieurs serveurs web          | Non                           | Oui                  | Oui                            |
| Console d'administration        | Aucune                        | phpMyAdmin           | Console Supabase               |
| Sauvegardes gérées par un tiers | Non                           | Selon l'hébergeur    | Oui                            |
| Risque propre à surveiller      | Le fichier hors `public_html` | Aucun notable        | Réseau, TLS, port de connexion |

---

## 2. Savoir ce que l'hébergeur permet

Avant de choisir, faites parler le serveur. Le projet fournit une sonde :

```bash
# 1. Téléversez scripts/sonde-hebergeur.php dans public_html/
# 2. Ouvrez https://votre-domaine/sonde-hebergeur.php
# 3. Lisez le verdict, puis SUPPRIMEZ le fichier
```

Elle est en lecture seule, à deux exceptions près documentées en tête du
fichier. Extrait réel de sa sortie :

```
2. EXTENSIONS REQUISES
[OK] pdo_sqlite     présente — base SQLite — pilote principal ou repli léger
[OK] pdo_mysql      présente — base MySQL/MariaDB — garanti chez tout hébergeur mutualisé
[OK] pdo_pgsql      présente — base PostgreSQL — nécessaire pour Supabase, Neon, Railway

4. STOCKAGE HORS RACINE WEB (pilote SQLite)
[OK] Écriture possible hors public_html    oui — SQLite utilisable

=== VERDICT ===
AUCUN BLOCAGE.
Pilotes de base utilisables : sqlite, mysql, pgsql.
Recommandation chez un hébergeur mutualisé : DB_DRIVER=mysql (garanti, sans prérequis).
```

La sonde sait aussi **essayer une vraie connexion PostgreSQL**, ce qui est la
seule façon de savoir si votre hébergeur peut réellement joindre Supabase — un
`pdo_pgsql` présent ne garantit pas que le pare-feu sortant laisse passer le
port 5432. Renseignez les constantes en tête du fichier :

```php
const PGSQL_HOST    = 'db.abcdefghijkl.supabase.co';
const PGSQL_PORT    = '5432';
const PGSQL_DBNAME  = 'postgres';
const PGSQL_USER    = 'postgres';
const PGSQL_PASS    = 'votre-mot-de-passe';
const PGSQL_SSLMODE = 'require';
```

La sonde répond alors :

```
[OK] Connexion PostgreSQL   RÉUSSIE — PostgreSQL 16.12 …
```

**Supprimez ce fichier ensuite.** Il décrit votre configuration serveur, et il
contiendrait votre mot de passe de base si vous l'avez renseigné.

---

## 3. Mode d'emploi — SQLite

### 3.1 Ce qu'il faut préparer

Un seul point, mais il est décisif : **choisir un dossier hors de la racine
web**, inscriptible par PHP.

```
/home/monuser/
├── katech-data/          ← ICI. Hors d'atteinte par HTTP.
│   └── katech.sqlite
└── public_html/          ← la racine web. JAMAIS la base ici.
    ├── index.html
    └── api/
```

Pourquoi : un fichier dans `public_html` est servi par le serveur web. Un
visiteur qui devine son nom télécharge la base entière — la liste des clients,
les commandes, les mots de passe hachés. Il n'existe aucun réglage qui rattrape
cette erreur de façon fiable.

Le dossier doit être **inscriptible**, et pas seulement le fichier : SQLite y
crée des journaux temporaires `katech.sqlite-wal` et `katech.sqlite-shm`. Si
vous vous trompez, le message le dit :

```
Le dossier de données « /tmp/kt-ro » n'est pas inscriptible par PHP. Passez-le en
droits 0775 (ou 0755 s'il appartient à l'utilisateur PHP). SQLite a besoin
d'écrire dans le DOSSIER, pas seulement dans le fichier (journaux -wal et -shm).
```

### 3.2 Ce qu'il faut écrire dans `api/.env`

```dotenv
DB_DRIVER=sqlite
DB_SQLITE_PATH=/home/monuser/katech-data/katech.sqlite

INSTALL_OWNER_NAME=Propriétaire
INSTALL_OWNER_EMAIL=votre-adresse@exemple.dz
INSTALL_OWNER_PASSWORD=une phrase de passe bien à moi

APP_ENV=production
```

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD` ne servent pas en
SQLite : laissez-les vides ou supprimez-les.

Si `DB_SQLITE_PATH` est absent, la base est créée dans `api/var/katech.sqlite`.
Cela convient à un test local ; **jamais à une mise en ligne**, car `api/` est
dans la racine web.

### 3.3 Installer

Ouvrez `https://votre-domaine/api/install.php` dans le navigateur, ou en ligne
de commande :

```bash
php api/install.php
```

Sortie observée :

```
== Installation KA Tech Hub ==
Pilote : sqlite
Fichier : /home/monuser/katech-data/katech.sqlite

Schéma appliqué : 48 instructions, 23 tables présentes.
Compte propriétaire créé : votre-adresse@exemple.dz
TERMINÉ.
Étape suivante OBLIGATOIRE : supprimez api/install.php du serveur.
```

Effacez ensuite `INSTALL_OWNER_PASSWORD` de `api/.env`, et supprimez
`api/install.php` du serveur.

À noter : `install.php` corrige lui-même les permissions du `.env` s'il est
lisible par tous, et le dit (`Permissions de api/.env corrigées : 0640`).

### 3.4 Vérifier

```bash
curl https://votre-domaine/api/health
```

```json
{ "data": { "status": "ok", "driver": "sqlite", "time": "…" } }
```

Le champ `driver` doit valoir `sqlite`. Puis, depuis un navigateur, ouvrez
`https://votre-domaine/katech-data/katech.sqlite` : vous devez obtenir une
**erreur 404 ou 403**. Si le fichier se télécharge, arrêtez tout et déplacez-le.

---

## 4. Mode d'emploi — MySQL et MariaDB

### 4.1 Ce qu'il faut préparer chez l'hébergeur

Dans le panneau (Hostinger : hPanel → « Bases de données » → « Gestion des
bases MySQL »), créez :

1. une **base de données** — notez son nom exact, souvent préfixé par
   l'hébergeur (`u123456789_katech`) ;
2. un **utilisateur** — notez son nom, également préfixé ;
3. un **mot de passe** — notez-le, il ne sera plus affiché ;
4. **rattachez l'utilisateur à la base**, avec tous les privilèges. Cette
   quatrième étape est celle qu'on oublie : sans elle, la connexion échoue avec
   un message d'accès refusé alors que tout semble correct.

Le jeu de caractères de la base doit être `utf8mb4` (l'arabe et les émojis en
dépendent). Le projet force `SET NAMES utf8mb4` à chaque connexion, mais une
base créée en `latin1` déformerait quand même les données.

### 4.2 Ce qu'il faut écrire dans `api/.env`

```dotenv
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_katech
DB_USER=u123456789_katech
DB_PASSWORD=le-mot-de-passe-de-la-base

INSTALL_OWNER_NAME=Propriétaire
INSTALL_OWNER_EMAIL=votre-adresse@exemple.dz
INSTALL_OWNER_PASSWORD=une phrase de passe bien à moi

APP_ENV=production
```

`DB_HOST` vaut **`localhost`** chez la plupart des mutualisés, et non
`127.0.0.1` : les deux ne sont pas équivalents, le premier passe par une socket
locale et le second par le réseau. Certains hébergeurs donnent un hôte dédié
(`mysql.monhebergeur.com`) : utilisez celui affiché dans le panneau.

### 4.3 Installer

```bash
php api/install.php
```

```
== Installation KA Tech Hub ==
Pilote : mysql

Schéma appliqué : 48 instructions, 23 tables présentes.
Compte propriétaire créé : votre-adresse@exemple.dz
TERMINÉ.
```

**Un avertissement propre à MySQL.** MySQL ne sait pas annuler la création de
tables : chaque `CREATE TABLE` valide implicitement la transaction en cours. Si
l'installation échoue à mi-chemin, la base reste à moitié construite, et
`install.php` le dit clairement :

```
ATTENTION : MySQL ne sait pas annuler la création de tables. Des tables ont pu
être créées avant l'erreur. Videz la base (phpMyAdmin : « Opérations » →
supprimer les tables) AVANT de relancer, sinon l'installation repartira sur un
schéma partiel.
```

SQLite et PostgreSQL n'ont pas ce défaut : chez eux, un échec ramène la base
exactement à son état d'avant.

### 4.4 Si la connexion est refusée

Message réellement obtenu en pointant vers une base à laquelle l'utilisateur
n'avait pas été rattaché :

```
Connexion MySQL refusée sur 127.0.0.1:3306, base « katech_guide », utilisateur
« katech ». Vérifiez dans api/.env : DB_HOST (souvent « localhost » chez un
mutualisé, pas « 127.0.0.1 »), DB_PORT, DB_NAME, DB_USER et DB_PASSWORD — et que
la base a bien été créée dans le panneau de l'hébergeur.
```

Reprenez les quatre étapes du §4.1 dans l'ordre. Neuf fois sur dix, c'est
l'étape 4 (le rattachement de l'utilisateur) ou le préfixe du nom de base qui
manque.

---

## 5. Mode d'emploi — PostgreSQL et Supabase

### 5.1 Une précision honnête, à lire avant tout

**Supabase n'est pas branché par son API HTTPS.** La boutique s'y connecte avec
le pilote PostgreSQL ordinaire de PHP (`pdo_pgsql`), exactement comme elle se
connecterait à un PostgreSQL installé sur un serveur privé.

Ce n'est pas un raccourci, c'est un choix délibéré. L'API HTTPS de Supabase
(PostgREST) **ne permet pas de transaction couvrant plusieurs instructions**.
Or la garantie anti-survente repose précisément sur une transaction qui, en une
fois, décrémente le stock sous condition, écrit la commande, ses lignes et le
mouvement de stock. Passer par PostgREST aurait détruit cette garantie. Le
détail du mécanisme est commenté dans `api/src/Db.php`, méthode
`connecterPgsql()`.

Deux conséquences pratiques pour vous :

1. Ici, « Supabase » signifie **« un PostgreSQL hébergé par Supabase »**. Les
   fonctions propres à Supabase (Auth, Storage, Realtime, Edge Functions) ne
   sont pas utilisées et ne sont pas nécessaires.
2. **N'importe quel autre PostgreSQL convient tout aussi bien** : Neon,
   Railway, un PostgreSQL installé sur un VPS, ou celui d'un autre hébergeur.
   Seule la chaîne de connexion change.

### 5.2 Ce qu'il faut préparer

1. Créez un projet Supabase (ou une base sur votre autre fournisseur
   PostgreSQL). **La base n'est pas créée par l'installateur** : elle doit
   exister avant d'ouvrir `install.php`. Chez Supabase, elle s'appelle
   `postgres` et existe dès la création du projet.
2. Notez le mot de passe de la base, donné une seule fois à la création du
   projet. Il est régénérable depuis la console, mais pas consultable.
3. Relevez l'hôte et le port dans la console, section « Database ».
4. Vérifiez que votre hébergeur a l'extension `pdo_pgsql` **et** peut sortir sur
   le port de la base : la sonde du §2 répond aux deux questions en une fois.

### 5.3 Les deux pièges de la connexion

Ce sont les deux seules choses qui distinguent réellement Supabase d'un
PostgreSQL local. Toutes deux sont documentées dans `api/.env.example` et
appliquées dans `api/src/Db.php`.

#### Piège 1 — le port 5432 et le port 6543 ne sont pas interchangeables

| Port     | Ce que c'est                         | À utiliser ici |
| -------- | ------------------------------------ | -------------- |
| **5432** | Connexion **directe** à la base      | **Oui**        |
| 6543     | Pooler Supabase, en mode transaction | **Non**        |

Le port 6543 met en défaut les **requêtes réellement préparées côté serveur**,
que ce projet emploie partout : `api/src/Db.php` désactive explicitement
l'émulation (`PDO::ATTR_EMULATE_PREPARES => false`), parce qu'une requête
émulée reconvertit tous les paramètres en chaînes de caractères et fausse les
types entiers. Le pooler en mode transaction est incompatible avec ce réglage.
Utilisez donc **le port 5432, connexion directe**.

Le symptôme d'une erreur de port n'évoque jamais le port. Voici le message réel
obtenu en pointant sur 6543 un serveur qui n'écoute que sur 5432 :

```
Connexion PostgreSQL refusée sur 127.0.0.1:6543, base « katech_gbd », utilisateur
« katech ». Vérifiez dans api/.env : DB_HOST, DB_PORT (5432 en direct), DB_NAME,
DB_USER, DB_PASSWORD — et que la base existe (elle n'est pas créée
automatiquement). Chez Supabase : DB_SSLMODE=require est OBLIGATOIRE, l'hôte est
celui de la section « Database » du tableau de bord, et le port 5432 (connexion
directe) est préférable au 6543 (pooler en mode transaction)…
```

#### Piège 2 — `DB_SSLMODE` est obligatoire chez un service hébergé

Un PostgreSQL hébergé **refuse les connexions en clair**. Sans
`DB_SSLMODE=require`, la connexion échoue, et le message d'origine ne parle pas
de TLS : il ressemble à un refus d'identifiants.

Ce réglage fonctionne dans les deux sens, et c'est vérifiable. Voici l'erreur
réellement obtenue en demandant `DB_SSLMODE=require` à un PostgreSQL local qui
n'a pas TLS :

```
SQLSTATE[08006] [7] connection to server at "127.0.0.1", port 5432 failed:
server does not support SSL, but SSL was required
```

Autrement dit : **`require` pour un service hébergé, vide pour un PostgreSQL
local.** Les valeurs acceptées :

| Valeur        | Effet                                                       | Quand                                                   |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| _(vide)_      | Laisse le défaut de libpq (« prefer ») décider              | PostgreSQL local, sans TLS                              |
| `require`     | Chiffrement obligatoire, sans vérification du certificat    | Supabase, Neon, Railway                                 |
| `verify-full` | Chiffrement **et** vérification du nom d'hôte — le plus sûr | Si les certificats racine sont installés sur le serveur |

Techniquement, `sslmode` n'est ajouté à la chaîne de connexion que si la
variable a une valeur : un `sslmode=` vide serait refusé par la bibliothèque
PostgreSQL, alors qu'un paramètre absent retombe proprement sur `prefer`.

### 5.4 Ce qu'il faut écrire dans `api/.env`

Chez Supabase :

```dotenv
DB_DRIVER=pgsql
DB_HOST=db.abcdefghijklmnop.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=le-mot-de-passe-du-projet
DB_SSLMODE=require

INSTALL_OWNER_NAME=Propriétaire
INSTALL_OWNER_EMAIL=votre-adresse@exemple.dz
INSTALL_OWNER_PASSWORD=une phrase de passe bien à moi

APP_ENV=production
```

Sur un PostgreSQL local ou sur un VPS sans TLS, la seule différence est
`DB_SSLMODE`, qui reste vide ou absent :

```dotenv
DB_DRIVER=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=katech
DB_USER=katech
DB_PASSWORD=…
# DB_SSLMODE=  ← laisser vide en local
```

### 5.5 Installer et vérifier

```bash
php api/install.php
```

```
== Installation KA Tech Hub ==
Pilote : pgsql

Schéma appliqué : 48 instructions, 23 tables présentes.
Compte propriétaire créé : votre-adresse@exemple.dz
TERMINÉ.
```

Puis :

```bash
curl https://votre-domaine/api/health
```

Le champ `driver` doit valoir `pgsql`.

### 5.6 Deux réglages appliqués automatiquement, qu'il est utile de connaître

À chaque connexion PostgreSQL, le projet impose :

- `SET TIME ZONE 'UTC'` et `SET client_encoding TO 'UTF8'` ;
- `SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED`.

Le second **porte la garantie anti-survente**. En `READ COMMITTED`, une
transaction bloquée sur une ligne verrouillée réévalue sa condition après
l'attente : le stock relu est le stock déjà décrémenté, la commande est refusée
proprement en HTTP 409. En `REPEATABLE READ` ou `SERIALIZABLE`, le même scénario
produirait une erreur de sérialisation, donc une **panne (HTTP 500) à la place
d'un refus métier**. Le niveau est donc épinglé explicitement plutôt que laissé
au réglage par défaut du projet Supabase.

---

## 6. Vérifier que la boutique fonctionne

Ces trois contrôles valent pour les trois moteurs.

### 6.1 Le moteur en service

```bash
curl https://votre-domaine/api/health
```

```json
{
  "data": {
    "status": "ok",
    "driver": "mysql",
    "time": "2026-08-06T22:27:56+00:00",
    "passwordHashing": { "algorithm": "bcrypt", "preferred": "argon2id", "fallback": true }
  }
}
```

`driver` confirme le moteur réellement utilisé — pas celui que vous croyez avoir
configuré. Un `fallback: true` sur `passwordHashing` signale que l'hébergeur
n'a pas Argon2id et que bcrypt prend le relais : c'est sûr, et les comptes
seront re-hachés automatiquement si l'extension apparaît un jour.

### 6.2 L'état détaillé de la base

Connectez-vous en tant que propriétaire, puis ouvrez la page
**`/admin/developpeur`**. Sa première section affiche le moteur, la taille de la
base et le nombre de lignes par table. En ligne de commande, la même
information :

```bash
curl -b cookies.txt https://votre-domaine/api/maintenance/status
```

```json
{
  "data": {
    "driver": "mysql",
    "database": "katech_gbd",
    "sizeHuman": "884.7 Ko",
    "tables": [
      { "name": "products", "rows": 12 },
      { "name": "orders", "rows": 3 }
    ]
  }
}
```

### 6.3 Une vraie commande

Le contrôle qui prouve le plus : passez une commande de test sur le site, puis
vérifiez qu'elle apparaît dans l'administration et que le stock du produit a
baissé d'une unité. C'est aussi ce contrôle qui révèle une séquence mal
repositionnée après une migration (§8.6).

---

## 7. Sauvegarder, vérifier une sauvegarde, restaurer

### 7.1 Sauvegarder — une seule commande pour les trois moteurs

```bash
php api/tools/sauvegarder.php
```

Le script lit `api/.env`, reconnaît le moteur et produit le bon format. Résultats
réellement obtenus sur les trois, avec le même jeu de données :

```
[sauvegarde] Démarrage — pilote : sqlite
[sauvegarde] Instantané SQLite pris via VACUUM INTO.
[sauvegarde] Vérification du CONTENU : intégrité OK, 23 table(s), 143 ligne(s),
             empreintes identiques à la base.
[sauvegarde] Fichier écrit : katech-20260806-223927.sqlite.gz (20.6 Ko)
[sauvegarde] TERMINÉ avec succès en 0.01 s.

[sauvegarde] Démarrage — pilote : mysql
[sauvegarde] Export MySQL : 24 table(s), 147 ligne(s).
[sauvegarde] Vérification du CONTENU : marqueur de fin présent, 24 table(s),
             147 ligne(s) relues depuis le fichier, empreintes identiques à la base.
[sauvegarde] Fichier écrit : katech-20260806-223927.sql.gz (15.8 Ko)
[sauvegarde] TERMINÉ avec succès en 0.02 s.

[sauvegarde] Démarrage — pilote : pgsql
[sauvegarde] Export PostgreSQL : 24 table(s), 147 ligne(s).
[sauvegarde] Vérification du CONTENU : marqueur de fin présent, 24 table(s),
             147 ligne(s) relues depuis le fichier, empreintes identiques à la base.
[sauvegarde] Fichier écrit : katech-20260806-223927.sql.gz (15.7 Ko)
[sauvegarde] TERMINÉ avec succès en 0.16 s.
```

Trois observations utiles :

- **SQLite n'est jamais copié bêtement.** `VACUUM INTO` prend un instantané
  cohérent, ce qu'une copie de fichier ne garantit pas si une écriture est en
  cours.
- **Ni `mysqldump` ni `pg_dump` ne sont nécessaires.** L'export est écrit
  depuis PHP, parce que ces outils sont absents de la plupart des mutualisés — et
  que `pg_dump` n'est de toute façon pas joignable sur un Supabase où l'on n'a
  que la connexion SQL.
- **24 tables et 147 lignes en MySQL et PostgreSQL, contre 23 et 143 en
  SQLite** : l'écart est la table témoin `_katech_migration`, déposée par le
  migrateur (§8.5), et ses lignes. Elle peut être supprimée une fois la bascule
  confirmée.

Options utiles :

| Option                  | Effet                                                       |
| ----------------------- | ----------------------------------------------------------- |
| `--destination=/chemin` | Dossier de destination (défaut : `BACKUP_DIR` du `.env`)    |
| `--garder=30`           | Nombre de sauvegardes conservées (défaut 14)                |
| `--sans-compression`    | Ne pas compresser en gzip                                   |
| `--verifier=/chemin`    | Rejuger une archive existante sans en produire une nouvelle |

Le dossier de destination doit être **hors de `public_html`**, pour la même
raison que le fichier SQLite. Le script refuse d'écrire dans la racine web.

### 7.2 Vérifier une sauvegarde

Une sauvegarde qu'on n'a jamais relue n'est pas une sauvegarde. La commande :

```bash
php api/tools/sauvegarder.php --verifier=/home/monuser/katech-data/backups/katech-20260806-223927.sql.gz
```

Résultats réellement obtenus :

```
[sauvegarde] Vérification de « … » (pilote sqlite).
[sauvegarde] Vérification du CONTENU : intégrité OK, 23 table(s), 143 ligne(s),
             empreintes identiques à la base.

[sauvegarde] Vérification de « … » (pilote mysql).
[sauvegarde] Cohérence interne : OK, 24 table(s) conformes à leurs empreintes.
[sauvegarde] L'archive est IDENTIQUE à la base actuelle.

[sauvegarde] Vérification de « … » (pilote pgsql).
[sauvegarde] Cohérence interne : OK, 24 table(s) conformes à leurs empreintes.
[sauvegarde] L'archive est IDENTIQUE à la base actuelle.
```

Ce que « vérifiée » signifie ici : le contrôle porte sur le **contenu**, pas sur
la structure. Une empreinte est calculée par table, ligne à ligne, sur la base
vivante, puis **recalculée depuis le fichier de sauvegarde**. Les deux doivent
coïncider. Un contrôle qui se contenterait de compter les tables déclarerait
« 23 tables, OK » sur une sauvegarde entièrement vide.

Les empreintes sont écrites dans le fichier lui-même (lignes `-- EMPREINTE …`),
ce qui rend l'archive auto-descriptive : des mois plus tard, `--verifier`
rejuge l'archive sans avoir besoin de la restaurer.

### 7.3 Restaurer

La procédure complète pour SQLite et MySQL est dans `docs/DEPLOIEMENT.md`,
section « Restaurer une sauvegarde ». Le cas PostgreSQL, absent de ce document,
a été exécuté ici :

```bash
# 1. Créer une base vide (ou vider la base cible)
createdb -h VOTRE-HOTE -U postgres katech_restauree

# 2. Décompresser puis charger
gunzip -c katech-20260806-223927.sql.gz > restauration.sql
psql -h VOTRE-HOTE -U postgres -d katech_restauree -v ON_ERROR_STOP=1 -f restauration.sql

# 3. Contrôler
psql -h VOTRE-HOTE -U postgres -d katech_restauree \
     -tAc "select count(*) from products; select count(*) from orders;"
```

Contrôle obtenu : `12` produits et `5` commandes, conformes à la base d'origine.
La comparaison indépendante par le migrateur (§8.4) a confirmé **0 table
divergente** sur les 13 tables peuplées.

Notez la dernière ligne de sortie du chargement : `setval 13`. Les séquences
sont incluses dans l'export et repositionnées à la restauration — sans quoi la
première commande créée après la restauration échouerait en doublon de clé.

### 7.4 Automatiser

Une sauvegarde manuelle est une sauvegarde oubliée. Planifiez une tâche CRON
(hPanel → « Avancé » → « Tâches Cron ») :

```
15 3 * * * php /home/monuser/public_html/api/tools/sauvegarder.php
```

Ne redirigez **pas** la sortie vers `/dev/null` : le CRON de l'hébergeur envoie
la sortie par courriel, et c'est ainsi qu'un échec se remarque. Le détail de la
configuration CRON est dans `docs/DEPLOIEMENT.md`.

---

## 8. Changer de moteur

Le choix du §1 n'est pas définitif. Un migrateur déplace **toutes** les données
d'un moteur vers un autre, dans les **six directions** possibles entre les trois
moteurs. Les six ont été exécutées pour écrire ce guide (§11).

### 8.1 Le principe qui protège l'utilisateur : la simulation est le mode par défaut

**Rien n'est jamais écrit tant qu'on ne l'a pas demandé explicitement.** En
ligne de commande, il faut l'option `--reelle` ; dans l'interface web, il faut
cliquer sur un second bouton, qui reste verrouillé tant qu'une simulation n'a
pas réussi.

La simulation lit **toute** la source et contrôle, ligne par ligne, ce qui se
passerait à l'écriture :

- une valeur `NULL` vers une colonne cible qui l'interdit ;
- une chaîne plus longue que la colonne cible ne l'accepte — MySQL la
  tronquerait en silence, PostgreSQL la refuserait, SQLite l'accepterait : trois
  comportements, un seul signalement ;
- un entier hors des bornes de la colonne cible ;
- une valeur qui n'est pas du JSON dans une colonne JSON ;
- une table ou une colonne présente d'un côté et pas de l'autre.

Elle rend un rapport **table par table**. Exemple réel, obtenu en simulant une
migration de SQLite vers une base MySQL vide :

```
 TABLE                    LUES ÉCRITES EMPREINTE SOURCE            CONTENU
 ------------------------------------------------------------------------
 categories                  4        0 b9078f7dd4c4b668f7c8e7a6.4  —
 brands                      8        0 d86a2108880c4391278e0594.8  —
 products                   12        0 89960e44c358b9f4da60ab69.12 —
 customers                   0        0 f426b0b982ba8cb2e6d7a69c.0  —
 orders                      5        0 f694844b564ce61257f98b4b.5  —
 order_items                 5        0 8abf9fb229bccdaa4486335d.5  —
 users                       1        0 c57ca7cff1d1ea480d20e71f.1  —
 shipping_rates             59        0 dc82edfbb352e5fd6bfdfbca.59 —
 site_content               20        0 ffe1fb23f4afd7b3406fa58f.20 —
 outbox                     13        0 3d187c0a74a40974711ea44e.13 —
 ------------------------------------------------------------------------
 TOTAL (23 tables)         143        0  0/23 table(s) au contenu identique

 ANOMALIES (0 bloquante(s), 0 avertissement(s)) :
   [INFO] Simulation : les tables absentes de la cible ont été CRÉÉES (vides)
          pour pouvoir contrôler les types. Aucune donnée n'est écrite.

 SIMULATION RÉUSSIE — rien n'a été écrit. Relancez avec --reelle pour migrer.
```

La colonne `ÉCRITES` vaut zéro partout : c'est la preuve visible que rien n'a
été touché. La colonne `CONTENU` porte un tiret parce qu'il n'y a rien à
comparer dans une cible vide ; quand la cible contient déjà des données, elle
affiche `IDENTIQUE` ou `DIVERGENT` table par table.

La ligne `[INFO]` signale la **seule écriture admise en simulation** :
`--creer-schema` crée des tables **vides**. Sans cette exception, aucune
simulation ne serait possible vers une base neuve, et la première migration
réelle se ferait donc sans répétition générale — ce qui est bien pire.

### 8.2 Migrer depuis la page `/admin/developpeur`, sans ligne de commande

C'est le chemin prévu pour quelqu'un qui n'a pas d'accès SSH — le cas de la
plupart des hébergements mutualisés.

1. Connectez-vous en **Propriétaire** (le rôle Administrateur ne suffit pas :
   une migration touche au contenu complet de la base).
2. Ouvrez **`/admin/developpeur`**, section « Migration vers un autre moteur ».
3. **Sauvegardez d'abord** : la section précédente de la même page propose un
   téléchargement de sauvegarde. Faites-le.
4. Renseignez le moteur cible, l'utilisateur, le DSN de connexion et le mot de
   passe. Le DSN attendu est un **DSN PDO** :

   ```
   mysql:host=localhost;port=3306;dbname=ma_base_cible;charset=utf8mb4
   pgsql:host=db.abcdefghijkl.supabase.co;port=5432;dbname=postgres
   ```

   > **Attention.** Au moment où ce guide est écrit, l'exemple affiché sous le
   > champ de saisie de la page (`mysql://hôte:3306/base_cible`) est une **URL**,
   > et non un DSN PDO. Recopié tel quel, il ne fonctionne pas. Employez la
   > forme donnée ci-dessus : `pilote:host=…;port=…;dbname=…`.

5. Cliquez sur **Simuler**. Lisez le rapport table par table.
6. Le bouton **Exécuter** ne se déverrouille qu'après une simulation réussie.
   Une fenêtre de confirmation s'affiche encore avant l'écriture.

Résultats réellement obtenus par ce chemin (source SQLite, cible MySQL) :

| Étape      | Lues | Écrites | Anomalies | Message                                        |
| ---------- | ---- | ------- | --------- | ---------------------------------------------- |
| Simulation | 143  | 0       | 0         | « Simulation terminée sans erreur bloquante. » |
| Réelle     | 143  | 143     | 0         | « Migration terminée avec succès. »            |

La table témoin de la cible affiche ensuite l'état `terminee`, et la cible
contient bien 12 produits et 5 commandes.

Et pour confirmer que le champ `simulation` manquant ne déclenche jamais une
écriture : une requête envoyée **sans** ce champ a répondu
`simulation = True`. La simulation est le mode par défaut **et** le mode de
repli.

#### Trois limites de l'interface web, à connaître avant de commencer

1. **La base cible doit déjà contenir les tables.** L'interface web ne crée pas
   le schéma. Installez-le d'abord sur la cible (voir 8.2.1).
2. **La base cible doit être vide de données.** L'interface web n'expose pas
   l'option « remplacer ». Si la cible contient déjà des lignes, la migration
   est refusée — voir §8.3.
3. **La cible doit être MySQL ou PostgreSQL.** Le sélecteur de l'interface ne
   propose pas SQLite comme destination. Pour migrer _vers_ SQLite, passez par
   la ligne de commande (§8.4).

#### 8.2.1 Préparer la base cible — l'étape qu'il ne faut pas rater

Installez le schéma sur la cible **sans créer de compte propriétaire**. Pour
cela, laissez `INSTALL_OWNER_EMAIL` et `INSTALL_OWNER_PASSWORD` vides dans le
`.env` pointant vers la cible :

```
Schéma appliqué : 48 instructions, 23 tables présentes.
Compte propriétaire NON créé : renseignez INSTALL_OWNER_EMAIL et
INSTALL_OWNER_PASSWORD dans api/.env puis relancez après avoir effacé le témoin.
AVERTISSEMENT : sans compte propriétaire, personne ne peut administrer le site.
```

Cet avertissement est ici **le résultat souhaité** : le compte propriétaire
arrivera avec les données migrées.

Si vous installez la cible avec un compte propriétaire, la table `users`
contient une ligne, la cible n'est donc plus vide, et la migration web est
refusée. Message réellement obtenu dans ce cas :

```
REFUS : la base cible n'est pas vide (1 ligne(s) dans 1 table(s) : users=1).
Écraser ces données doit être demandé explicitement (option « remplacer »).
Sauvegardez d'abord : api/tools/sauvegarder.php.
```

### 8.3 Ce qui se passe quand la cible n'est pas vide

Le migrateur **refuse**, et il nomme précisément ce qu'il a trouvé. Message
réellement obtenu :

```
REFUS : la base cible n'est pas vide (143 ligne(s) dans 13 table(s) :
categories=4, brands=8, products=12, orders=5, order_items=5, users=1,
blog_posts=5, shipping_rates=59, payment_methods=4, stock_movements=5,
site_content=20, settings=2, outbox=13). Écraser ces données doit être demandé
explicitement (option « remplacer »). Sauvegardez d'abord :
api/tools/sauvegarder.php.

La transaction a été annulée : la base cible n'a pas été modifiée.
```

Trois façons de continuer :

| Vous voulez…                    | Faites…                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| Garder les données de la cible  | Choisissez une autre base cible                               |
| Écraser les données de la cible | Ligne de commande, option `--remplacer`, **après sauvegarde** |
| Repartir d'une cible propre     | Videz ou recréez la base, réinstallez le schéma seul (§8.2.1) |

L'option `--remplacer` vide les tables **à l'intérieur de la transaction**, par
des `DELETE` et jamais des `TRUNCATE` : en MySQL, `TRUNCATE` valide
implicitement la transaction et rendrait la purge irréversible avant la première
insertion.

### 8.4 Migrer en ligne de commande

Trois commandes, et la troisième n'est pas une commande :

```bash
# 1. Répétition générale — lit tout, contrôle tout, N'ÉCRIT RIEN
export MDP='mot-de-passe-de-la-cible'
php api/tools/migrer.php \
    --source='sqlite:/home/monuser/katech-data/katech.sqlite' \
    --cible='mysql:host=localhost;port=3306;dbname=katech;charset=utf8mb4' \
    --cible-utilisateur=katech --cible-mdp-env=MDP \
    --creer-schema

# 2. Si la simulation est verte : la vraie migration
php api/tools/migrer.php --source=… --cible=… --cible-utilisateur=… \
    --cible-mdp-env=MDP --creer-schema --reelle

# 3. Basculer la boutique : dans api/.env, changer DB_DRIVER et les identifiants
```

Formes de DSN acceptées :

```
sqlite:/chemin/absolu/katech.sqlite
mysql:host=localhost;port=3306;dbname=katech;charset=utf8mb4
pgsql:host=127.0.0.1;port=5432;dbname=katech
```

Options principales :

| Option                 | Effet                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| _(aucune)_             | **Simulation.** Rien n'est écrit.                                          |
| `--reelle`             | Écrit réellement.                                                          |
| `--creer-schema`       | Crée les tables vides dans la cible avant de migrer.                       |
| `--remplacer`          | Autorise l'effacement d'une cible non vide. Sauvegardez d'abord.           |
| `--budget=SECONDES`    | Annule tout au-delà (défaut 300 en ligne de commande, 25 derrière le web). |
| `--tables=a,b,c`       | Restreint la migration à ces tables.                                       |
| `--json`               | Rend le rapport brut, pour un autre programme.                             |
| `--source-mdp-env=VAR` | Mot de passe lu dans une variable d'environnement — **à préférer**.        |

> **Mots de passe.** Utilisez `--cible-mdp-env=NOM_DE_VARIABLE`. Un mot de passe
> passé en `--cible-mdp=…` est lisible par tous les comptes de la machine dans
> `ps aux`.

**Contrôler deux bases après coup.** Le même mode simulation sert de
vérificateur : si la source et la cible sont toutes deux peuplées, il compare
leurs empreintes table par table sans rien écrire. C'est ainsi qu'on vérifie une
migration faite avec un autre outil, ou une restauration de sauvegarde (§7.3).

### 8.5 Ce qu'on fait d'une migration interrompue

Une coupure — connexion perdue, onglet fermé, hébergeur qui interrompt un script
trop long — ne laisse **jamais** une base à moitié remplie. Deux mécanismes, et
il faut les deux :

1. **Tout le chargement tient dans une seule transaction.** Si le processus
   meurt, le serveur de base de données annule. Mesure rapportée dans
   `docs/MIGRATION.md` : un `kill -9` en plein transfert de 40 000 lignes laisse
   **0 ligne** dans la cible.
2. **Une table témoin `_katech_migration`** est déposée dans la cible **avant**
   la transaction, et validée aussitôt — sinon elle disparaîtrait avec la
   transaction et ne témoignerait de rien.

Le témoin porte un état :

| État       | Ce que ça veut dire                               | Migration suivante                    |
| ---------- | ------------------------------------------------- | ------------------------------------- |
| `en_cours` | Le processus a été tué : personne n'a pu conclure | **Refusée** sans « remplacer »        |
| `annulee`  | Échec propre, annulation confirmée par le moteur  | Autorisée                             |
| `terminee` | Validée et vérifiée                               | Soumise à la règle « cible non vide » |

Pour lire l'état après une interruption :

```sql
SELECT * FROM _katech_migration ORDER BY id DESC LIMIT 1;
```

**Que faire concrètement**, selon ce que vous lisez :

- `terminee` — la migration a réussi. Rien à réparer. Passez au §8.6.
- `annulee` — l'échec a été propre, la cible n'a pas été modifiée. Corrigez la
  cause indiquée dans le rapport, puis relancez normalement.
- `en_cours` — le processus a été tué. La cible est vide (la transaction a été
  annulée par le serveur), mais le migrateur ne peut pas le certifier lui-même :
  il refuse donc de repartir sans instruction explicite. Vérifiez la cible,
  puis relancez avec `--remplacer` pour repartir d'une base nette.

La distinction entre `annulee` et `en_cours` n'est pas cosmétique : sans elle,
le moindre échec obligerait à taper `--remplacer`, et l'utilisateur en prendrait
l'habitude — ce qui annulerait la protection du §8.3.

**Ce que le migrateur ne fait pas : reprendre là où il s'était arrêté.** C'est
un choix. Une reprise partielle suppose de savoir exactement ce qui a été écrit,
or c'est précisément ce qu'une coupure rend incertain. « Tout ou rien » est le
seul état qu'un commerçant peut vérifier lui-même.

Si la migration ne tient pas dans le temps imparti à une requête HTTP (25
secondes), lancez-la en ligne de commande, ou par le gestionnaire de tâches CRON
de l'hébergeur. Ordre de grandeur mesuré ici : **143 lignes en 0,04 à 0,15
seconde**, selon la direction. `docs/MIGRATION.md` rapporte 40 000 lignes en 0,8 seconde. Une
boutique réelle est très loin de la limite.

### 8.6 Après la migration

1. **Vérifier le témoin** : `SELECT * FROM _katech_migration` doit montrer
   `terminee`. Cette table n'est jamais migrée — elle appartient au migrateur —
   et peut être supprimée une fois la bascule confirmée.
2. **Basculer `api/.env`** : `DB_DRIVER`, puis `DB_HOST` / `DB_NAME` /
   `DB_USER` / `DB_PASSWORD`, ou `DB_SQLITE_PATH`.
3. **Vérifier** : `curl https://votre-domaine/api/health` doit annoncer le
   nouveau `driver`.
4. **Sauvegarder immédiatement** la nouvelle base :
   `php api/tools/sauvegarder.php`.
5. **Ne pas supprimer l'ancienne base** avant plusieurs jours d'exploitation
   normale. C'est la seule chose qui rend la migration réversible.
6. **Passer une commande de test.** C'est ce qui prouve que les séquences
   d'identifiants ont été repositionnées. Sans ce repositionnement, tout
   fonctionnerait jusqu'à la première commande créée par la boutique, qui
   échouerait en doublon de clé — parfois des jours plus tard, quand plus
   personne ne fait le lien avec la migration.

### 8.7 Une déformation attendue : l'ordre des clés JSON

Certaines colonnes contiennent du JSON (`products.name`, `products.specs`,
`orders.status_history`, `blog_posts.title`…). **MySQL range le type `JSON` dans
une représentation interne qui trie les clés d'objet.** Un aller-retour par
MySQL peut donc rendre :

```
{"fr":"Guide d'achat…","en":"Buying guide…","ar":"دليل الشراء…"}   (départ)
{"ar":"دليل الشراء…","en":"Buying guide…","fr":"Guide d'achat…"}   (arrivée)
```

Le contenu est intact, le texte non. Aucun code du projet ne dépend de cet
ordre. C'est pourquoi la vérification du migrateur porte sur une **forme
canonique** et non sur les octets : une comparaison naïve déclarerait la
migration ratée alors qu'elle est fidèle. Retenez simplement : **ne comparez
jamais ces colonnes octet à octet entre deux bases**.

---

## 9. La garantie anti-survente, et comment la rejouer soi-même

### 9.1 La promesse

Deux clients qui achètent le dernier article dans la même seconde **ne repartent
pas tous les deux avec une confirmation**. Un seul obtient sa commande ; l'autre
reçoit un refus clair, et le stock ne descend jamais sous zéro.

Cette promesse tient sur les **trois** moteurs. Le mécanisme est une seule
instruction SQL conditionnelle, exécutée dans une transaction d'écriture
(`api/src/Controllers/ControleurCommandes.php`) :

```sql
UPDATE products SET stock_qty = stock_qty - :qte, updated_at = :maj
WHERE id = :produit AND stock_qty IS NOT NULL AND stock_qty >= :qteMinimale
```

Si la clause `WHERE` ne correspond plus — parce qu'un autre client vient de
prendre la dernière unité — aucune ligne n'est modifiée, et la commande est
refusée en HTTP 409. Il n'y a pas de « lire le stock puis décider » : la lecture
et la décision sont la même opération, et c'est ce qui rend la course
impossible.

Chaque moteur y arrive à sa façon, et chacune est commentée dans
`api/src/Db.php` :

| Moteur     | Ce qui rend le résultat correct                                                     |
| ---------- | ----------------------------------------------------------------------------------- |
| SQLite     | `BEGIN IMMEDIATE` : le verrou d'écriture est pris tout de suite, pas à la promotion |
| MySQL      | Verrou de ligne pris par l'`UPDATE` lui-même                                        |
| PostgreSQL | Verrou de ligne, **plus** isolation `READ COMMITTED` épinglée (voir §5.6)           |

### 9.2 La rejouer soi-même

Un guide qui écrit « c'est sûr » demande qu'on lui fasse confiance. Voici la
commande, à lancer sur une base de recette :

```bash
php api/tools/preuve-concurrence.php --base=http://127.0.0.1:8410
```

| Option            | Effet                                                      |
| ----------------- | ---------------------------------------------------------- |
| `--base=URL`      | Racine de l'API à interroger                               |
| `--produit=ID`    | Produit visé (défaut : le premier trouvé en base)          |
| `--concurrents=N` | Nombre de processus simultanés (défaut 6)                  |
| `--stock=S`       | Stock initial à poser (défaut 2)                           |
| `--forcer=oui`    | Autorise l'exécution sur une base qui a déjà des commandes |

Le script pose le stock, lance N processus qui attendent tous le même instant,
puis compte. Le moteur employé vient de `api/.env` : **le même script prouve les
trois, sans être modifié**.

> **AVERTISSEMENT.** Ce script **écrit**. Il vide `orders`, `order_items` et
> `stock_movements`, et force le stock du produit visé. Il refuse de démarrer si
> la base contient déjà des commandes — précisément pour ne pas effacer celles
> d'une vraie boutique. Ne le lancez **jamais** sur la base de production.

### 9.3 Les chiffres réellement obtenus

Trois séries, sur les trois moteurs, sur ce banc d'essai :

| Moteur     | Processus | Stock | 201 acceptées | 409 refusées | Autres | Stock final | `orders` / `order_items` / `stock_movements` | Verdict |
| ---------- | --------- | ----- | ------------- | ------------ | ------ | ----------- | -------------------------------------------- | ------- |
| SQLite     | 6         | 2     | 2             | 4            | 0      | 0           | 2 / 2 / 2                                    | OK      |
| MySQL      | 6         | 2     | 2             | 4            | 0      | 0           | 2 / 2 / 2                                    | OK      |
| PostgreSQL | 6         | 2     | 2             | 4            | 0      | 0           | 2 / 2 / 2                                    | OK      |
| SQLite     | 12        | 3     | 3             | 9            | 0      | 0           | 3 / 3 / 3                                    | OK      |
| MySQL      | 12        | 3     | 3             | 9            | 0      | 0           | 3 / 3 / 3                                    | OK      |
| PostgreSQL | 12        | 3     | 3             | 9            | 0      | 0           | 3 / 3 / 3                                    | OK      |
| SQLite     | 20        | 5     | 5             | 15           | 0      | 0           | 5 / 5 / 5                                    | OK      |
| MySQL      | 20        | 5     | 5             | 15           | 0      | 0           | 5 / 5 / 5                                    | OK      |
| PostgreSQL | 20        | 5     | 5             | 15           | 0      | 0           | 5 / 5 / 5                                    | OK      |

Sortie complète d'une exécution :

```
Pilote pgsql — produit « build-mid-gaming », stock posé à 2.
6 processus simultanés, 1 unité chacun.

  processus 1 : HTTP 409 — {"error":{"code":"CONFLICT","message":"Stock insuffisant …
  …
  201 acceptées : 2   409 refusées : 4   autres : 0
  stock final   : 0
  orders=2 order_items=2 stock_movements=2

VERDICT : OK — aucune survente, le stock n'est jamais passé sous zéro.
```

**Trois points comptent autant que le premier chiffre :**

- **`autres : 0`.** Une erreur serveur sous concurrence serait un échec, pas un
  aléa. Zéro réponse hors 201 et 409.
- **`orders = order_items = stock_movements`.** Accepter le bon nombre de
  commandes tout en écrivant un mouvement de stock de travers serait une
  comptabilité fausse. La preuve contrôle aussi cela.
- **La concurrence est réellement testée.** Le script mesure la durée totale et
  **avertit** si le profil ressemble à celui d'un serveur qui traite les
  requêtes une par une — car un test sérialisé passe au vert sans rien prouver.
  Cet avertissement ne s'est pas déclenché lors des neuf exécutions ci-dessus.

Si vous employez le serveur intégré de PHP pour ce test, lancez-le avec
`PHP_CLI_SERVER_WORKERS` au moins égal au nombre de processus, faute de quoi il
ne sert qu'une requête à la fois :

```bash
PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8410 -t api api/index.php
```

---

## 10. Ce qui est garanti, ce qui ne l'est pas

### 10.1 Garanti, et vérifiable par vous

| Promesse                                                         | Comment la vérifier vous-même                       |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| Aucune survente, sur les trois moteurs                           | `php api/tools/preuve-concurrence.php` (§9)         |
| Les trois moteurs stockent exactement les mêmes données          | `php api/tools/migrer.php` en simulation (§8.4)     |
| Une sauvegarde contient réellement les données                   | `php api/tools/sauvegarder.php --verifier=…` (§7.2) |
| Une migration ne valide rien qu'elle n'ait relu et comparé       | Rapport table par table du migrateur (§8.1)         |
| Une migration interrompue ne laisse pas de base à moitié remplie | Table témoin `_katech_migration` (§8.5)             |
| Le moteur réellement en service                                  | `curl https://votre-domaine/api/health` (§6.1)      |

### 10.2 Non garanti, ou hors de portée du projet

| Point                                                   | Réalité                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Reprise d'une migration interrompue                     | Non implémentée, par choix. « Tout ou rien » (§8.5).                           |
| Migration à chaud                                       | Mettez la boutique en maintenance pendant la copie.                            |
| Migration du **schéma** (nouvelles versions des tables) | Le migrateur copie des **données**. Le schéma vient de `api/schema/`.          |
| Copie des index et contraintes depuis la source         | Ils viennent du fichier de schéma, pas de la base source.                      |
| Migration vers SQLite depuis l'interface web            | Ligne de commande seulement (§8.2, limite 3).                                  |
| Création de la base MySQL ou PostgreSQL                 | Elle doit exister avant `install.php`. Seul SQLite crée son fichier.           |
| Fonctions Supabase autres que la base SQL               | Auth, Storage, Realtime et Edge Functions ne sont pas utilisés (§5.1).         |
| Valeurs entières au-delà de 2 147 483 647               | Acceptées par SQLite, refusées par MySQL et PostgreSQL. Détecté en simulation. |

### 10.3 Ce qui n'a pas pu être vérifié pour écrire ce guide

Par honnêteté, et parce qu'un guide qui ne distingue pas le mesuré du supposé
n'est pas fiable :

- **Un vrai projet Supabase.** Le pilote `pgsql` a été éprouvé sur un
  PostgreSQL 16.12 local. Le code de connexion est **le même** — c'est le sens
  du §5.1 — mais trois choses n'ont pas pu être observées sur le service
  réel : le comportement exact du port 6543 (pooler), la négociation TLS avec
  les certificats de Supabase, et la latence réseau. Les deux premiers points
  sont documentés dans `api/.env.example` et `api/src/Db.php` ; le troisième
  dépend de votre région.
- **Un hébergement mutualisé réel.** Les limites de temps d'exécution, les
  extensions PHP réellement activées et le comportement des `.htaccess` ne se
  vérifient que chez l'hébergeur. La sonde du §2 est faite pour cela.
- **L'interruption d'une migration par `kill -9`** et l'épuisement du budget de
  temps. Ces deux comportements sont rapportés comme mesurés dans
  `docs/MIGRATION.md` ; ils n'ont pas été reproduits ici, le jeu de données
  d'essai (143 lignes, moins de 0,2 seconde) étant trop petit pour être
  interrompu de façon fiable. Une tentative avec un budget volontairement
  minuscule (`--budget=0.001`) n'a pas interrompu la migration : sur un jeu de
  cette taille, le budget n'est jamais évalué. Le mécanisme reste donc
  documenté mais non revérifié par ce guide.

---

## 11. Le banc d'essai de ce guide

Toutes les valeurs citées viennent des exécutions ci-dessous. Aucune n'est
estimée.

**Environnement** : PHP 8.5.6, SQLite 3.40.0, MariaDB 10.5.29, PostgreSQL 16.12,
sur une même machine. Trois instances de l'API servies par le serveur intégré de
PHP avec `PHP_CLI_SERVER_WORKERS=8`, aux ports 8410 (SQLite), 8411 (MySQL) et
8412 (PostgreSQL).

**Jeu de données** : 23 tables, 143 lignes — les données de démonstration du
projet (12 produits, 8 marques, 4 catégories, 59 tarifs de livraison, 5 articles
de blog, 20 blocs de contenu, 4 moyens de paiement, 2 réglages, 1 compte
propriétaire) plus 5 commandes réelles, leurs 5 lignes de commande, leurs 5
mouvements de stock et 13 événements, créés par les tests de concurrence.

**Ce qui a été exécuté**

| Opération                                                         | Résultat                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| Installation par `api/install.php`, sur les trois moteurs         | 48 instructions, 23 tables, compte propriétaire créé         |
| Installation pilotée par un fichier `api/.env` réel               | Réussie ; permissions du `.env` corrigées en 0640            |
| Installation du schéma seul (sans compte propriétaire)            | Réussie, avertissement explicite                             |
| Import des données de démonstration, sur les trois                | Réussi et rejouable                                          |
| `preuve-concurrence.php` — 6, 12 et 20 processus, sur 3 moteurs   | 9 exécutions, 9 verdicts OK, 0 survente                      |
| SQLite → MySQL                                                    | 143 lues / 143 écrites, 23/23 identiques, 0,045 s            |
| MySQL → PostgreSQL                                                | 143 lues / 143 écrites, 23/23 identiques, 0,149 s            |
| PostgreSQL → SQLite (base neuve, `--creer-schema`)                | 143 lues / 143 écrites, 23/23 identiques, 0,087 s            |
| SQLite → PostgreSQL                                               | 143 lues / 143 écrites, 23/23 identiques, 0,134 s            |
| PostgreSQL → MySQL                                                | 143 lues / 143 écrites, 23/23 identiques, 0,099 s            |
| MySQL → SQLite (base neuve)                                       | 143 lues / 143 écrites, 23/23 identiques, 0,043 s            |
| Contrôle SQLite de départ vs SQLite d'arrivée, sur les 2 circuits | 13 tables peuplées identiques, 0 divergente, 0 anomalie      |
| Migration réelle sans `--remplacer` sur une cible peuplée         | Refusée, cible intacte, code de sortie 1                     |
| Migration depuis `/admin/developpeur` — simulation                | 143 lues / 0 écrite / 0 anomalie                             |
| Migration depuis `/admin/developpeur` — réelle                    | 143 lues / 143 écrites, témoin `terminee`                    |
| Migration web vers une cible installée avec compte propriétaire   | Refusée : « la base cible n'est pas vide … users=1 »         |
| Requête web sans champ `simulation`                               | Simulation appliquée d'office                                |
| Sauvegarde, sur les trois moteurs                                 | 20,6 Ko / 15,8 Ko / 15,7 Ko, empreintes identiques à la base |
| Vérification des trois archives (`--verifier`)                    | « L'archive est IDENTIQUE à la base actuelle »               |
| Restauration d'une archive PostgreSQL dans une base neuve         | 12 produits, 5 commandes, 0 table divergente                 |
| `DB_SSLMODE=require` vers un serveur sans TLS                     | Refus explicite : « server does not support SSL »            |
| Port 6543 vers un serveur qui n'écoute pas dessus                 | Refus, message nommant le port 5432 et Supabase              |
| Dossier SQLite non inscriptible                                   | Refus, message nommant les journaux `-wal` et `-shm`         |
| `scripts/sonde-hebergeur.php`, avec connexion PostgreSQL réelle   | « AUCUN BLOCAGE », connexion PostgreSQL réussie              |

Les six directions de migration ont donc été exécutées, et les deux circuits
complets (SQLite → MySQL → PostgreSQL → SQLite, puis SQLite → PostgreSQL →
MySQL → SQLite) rendent une base d'arrivée identique à la base de départ.

---

## Pour aller plus loin

| Question                                     | Document              |
| -------------------------------------------- | --------------------- |
| Déployer chez un hébergeur, de bout en bout  | `docs/DEPLOIEMENT.md` |
| Le fonctionnement interne du migrateur       | `docs/MIGRATION.md`   |
| L'architecture de l'API et de la persistance | `docs/BACKEND.md`     |
| Toutes les variables de configuration        | `api/.env.example`    |
| Le code qui porte les trois pilotes          | `api/src/Db.php`      |
