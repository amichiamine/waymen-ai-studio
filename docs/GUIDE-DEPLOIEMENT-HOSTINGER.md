# Guide de déploiement sur Hostinger — de zéro à la boutique en ligne

Ce guide est une **marche à suivre**. Il se lit du haut vers le bas, une étape
après l'autre, les mains sur le clavier. Chaque étape se termine par un
paragraphe « Vérifier avant de continuer » : tant que cette vérification
échoue, l'étape suivante ne servira à rien.

## À qui s'adresse ce guide

À la personne qui a acheté un hébergement Hostinger, qui a le panneau **hPanel**
ouvert devant elle, et qui **n'est pas développeuse**. Elle dispose de trois
choses, et de rien d'autre :

- un **gestionnaire de fichiers** dans hPanel ;
- un **gestionnaire de bases de données** dans hPanel ;
- un **nom de domaine** pointé sur cet hébergement.

Il n'y a **pas d'accès SSH**, pas de terminal sur le serveur. Ce guide ne
demande jamais d'en avoir un.

## Ce que ce guide couvre, et ce qu'il ne couvre pas

| Sujet                                                       | Ici                    |
| ----------------------------------------------------------- | ---------------------- |
| Vérifier que l'hébergement convient                         | Oui — étape 1          |
| Compiler le site sur une machine                            | Oui — étapes 2 et 3    |
| Téléverser les fichiers au bon endroit                      | Oui — étapes 4 et 5    |
| Installer et sécuriser                                      | Oui — étapes 6 à 9     |
| Déployer dans un sous-dossier                               | Oui — chapitre dédié   |
| Diagnostiquer une panne de déploiement                      | Oui — chapitre dédié   |
| Créer et choisir la base de données, sauvegarder, restaurer | **Non — guide séparé** |

Les bases de données font l'objet d'un guide dédié : **`docs/GUIDE-BASES-DE-DONNEES.md`**. Ce guide-ci
s'y réfère chaque fois qu'il faut une valeur venant de la base. La référence
technique déjà existante est `docs/DEPLOIEMENT.md` — plus complète, mais écrite
comme un ouvrage de référence, pas comme une marche à suivre.

## Vocabulaire employé partout dans ce guide

Ces mots ont un sens unique, du début à la fin.

| Mot                        | Sens                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| **hPanel**                 | Le panneau de contrôle de Hostinger, ouvert dans un navigateur               |
| **racine web**             | Le dossier `public_html`. Tout ce qui s'y trouve est public sur Internet.    |
| **dossier de données**     | Le dossier `katech-data`, placé **à côté** de `public_html`, jamais dedans   |
| **machine de compilation** | Votre ordinateur, ou celui d'un prestataire. Jamais le serveur.              |
| **dossier de compilation** | Le dossier `dist`, produit par la compilation                                |
| **téléverser**             | Envoyer un fichier de votre ordinateur vers le serveur                       |
| **la sonde**               | Le fichier `scripts/sonde-hebergeur.php`                                     |
| **l'installateur**         | Le fichier `api/install.php`                                                 |
| **compte propriétaire**    | Le compte qui administre la boutique, créé une seule fois par l'installateur |

## Les neuf étapes

| #   | Étape                                 | Où cela se passe    | Durée  |
| --- | ------------------------------------- | ------------------- | ------ |
| 1   | Sonder l'hébergement                  | hPanel + navigateur | 10 min |
| 2   | Préparer la machine de compilation    | Votre ordinateur    | 15 min |
| 3   | Compiler le site                      | Votre ordinateur    | 5 min  |
| 4   | Préparer le colis (`katech-site.zip`) | Votre ordinateur    | 5 min  |
| 5   | Téléverser et extraire le zip         | hPanel              | 10 min |
| 6   | Rassembler les informations           | Votre ordinateur    | 10 min |
| 7   | Lancer l'assistant d'installation     | Navigateur          | 10 min |
| 8   | Verrouiller                           | hPanel + navigateur | 10 min |
| 9   | Recette finale                        | Navigateur          | 15 min |

Comptez **deux heures** la première fois, sans se presser. Les étapes 2 à 4 ne
sont à refaire que lorsque le site change.

---

> ## ⛔ Ne laissez pas l'hébergeur construire le site à votre place
>
> Hostinger propose un constructeur Node.js. **N'utilisez pas cette
> fonctionnalité pour ce projet.** Si vous l'avez déjà lancé et obtenu
> une erreur, lisez la suite — vous êtes au bon endroit.
>
> **Raison 1 — Ce site n'a pas besoin d'un serveur Node.** Le résultat de la
> compilation est un ensemble de fichiers HTML, CSS et JavaScript que n'importe
> quel hébergeur peut servir. L'API est en PHP. Rien ne tourne en Node en
> production : construire sur le serveur ne sert à rien.
>
> **Raison 2 — Sans navigateur, pas de prérendu, et le site devient invisible
> pour Google.** La compilation produit une version de chaque page lisible par
> les moteurs de recherche (le prérendu). Cette étape exige un navigateur web,
> que le serveur de l'hébergeur n'a pas. Sans prérendu, Google reçoit une page
> vide et ne peut pas indexer vos produits. **Une boutique que Google ne voit
> pas perd des ventes.** C'est la raison la plus importante, et elle ne
> disparaîtra jamais quelle que soit la version du projet.
>
> **Raison 3 — Historique (pour qui cherche un message d'erreur).** Avant le
> 9 août 2026, tenter de construire chez l'hébergeur échouait immédiatement
> avec le message :
>
> ```
> sh: line 1: bunx: command not found
> ```
>
> Ce n'est plus le cas depuis le correctif du 9 août 2026 : le build
> aboutit maintenant même sans `bun`. Mais il le fait **sans prérendu** —
> sans le signaler clairement. Le conseil reste donc le même : construisez
> sur votre ordinateur, et téléversez le résultat. Les étapes 2 et 3
> décrivent exactement comment.

---

## Étape 0 — Ce qu'il faut avoir sous la main

Rassemblez ces éléments **avant** de commencer. Les chercher en cours de route
est la première cause d'abandon en milieu d'installation.

| Élément                          | Détail                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| Accès à hPanel                   | Identifiant et mot de passe de votre compte Hostinger        |
| Domaine actif                    | Le domaine répond déjà, même par une page vide               |
| Certificat HTTPS                 | Activé dans hPanel. À faire **avant** l'étape 7.             |
| Le projet KA Tech                | Le dépôt complet, téléchargé sur votre ordinateur            |
| Les valeurs de la base           | Fournies par le guide `docs/GUIDE-BASES-DE-DONNEES.md`       |
| Un gestionnaire de mots de passe | Vous allez créer un mot de passe fort et devoir le retrouver |

**Version de PHP.** Le projet exige **PHP 8.2 au minimum**. Dans hPanel, la
version de PHP se choisit dans la section de configuration de PHP. Choisissez
8.2 ou plus récent maintenant : l'étape 1 le vérifiera.

---

## Étape 1 — Sonder l'hébergement

Un hébergement mutualisé ne dit pas de lui-même ce qu'il sait faire. La sonde
pose les questions à votre place : version de PHP, extensions installées,
droit d'écrire en dehors de la racine web, mémoire disponible.

### Les gestes

1. Sur votre ordinateur, repérez le fichier `scripts/sonde-hebergeur.php` dans
   le projet téléchargé.
2. Dans hPanel, ouvrez le **gestionnaire de fichiers**, puis le dossier
   `public_html` de votre domaine.
3. Téléversez la sonde directement dans `public_html`.
4. Dans un navigateur, ouvrez `https://votre-domaine/sonde-hebergeur.php`.

### Lire le verdict

La sonde répond en texte brut. Chaque ligne commence par `[OK]`, `[KO]` ou par
deux espaces (information neutre, ni bonne ni mauvaise). La partie qui décide
se trouve **tout en bas**, sous le titre `=== VERDICT ===`.

Deux cas, deux seulement.

**Cas 1 — la sonde écrit `AUCUN BLOCAGE.`**
Elle liste ensuite les pilotes de base utilisables et recommande le plus sûr.
Voici un verdict réel, produit en exécutant la sonde :

```
=== VERDICT ===

AUCUN BLOCAGE.
Pilotes de base utilisables : sqlite, mysql, pgsql.
Indiquer votre choix dans api/.env → DB_DRIVER=…
Recommandation chez un hébergeur mutualisé : DB_DRIVER=mysql (garanti, sans prérequis).
```

Notez cette liste. Le guide `docs/GUIDE-BASES-DE-DONNEES.md` en a besoin. Continuez.

**Cas 2 — la sonde écrit `BLOCAGES À TRAITER :`**
Elle énumère alors, ligne par ligne, ce qui manque **et** où le corriger. Ne
continuez pas : traitez chaque blocage, puis rechargez la page de la sonde.

Sous le verdict apparaît parfois une section `POINTS D'ATTENTION`. Ce ne sont
pas des blocages. Exemple réel : `Argon2id indisponible : l'API utilisera
bcrypt automatiquement, ce qui est parfaitement sûr. Aucune action requise.`
Lisez ces lignes, elles se suffisent à elles-mêmes.

### Vérifier avant de continuer

- La page de la sonde s'affiche, et se termine par `>>> SUPPRIME CE FICHIER MAINTENANT. <<<`.
- Le verdict dit `AUCUN BLOCAGE.`
- La ligne `Version PHP` est marquée `[OK]`.

> **Ne supprimez pas encore la sonde.** Vous en aurez peut-être besoin à
> l'étape 6 pour relire un chemin absolu. Sa suppression est l'étape 8, et elle
> est **obligatoire** : la sonde publie la version de PHP, les extensions et les
> chemins réels du serveur.

---

## Étape 2 — Préparer la machine de compilation

Le serveur mutualisé ne compile rien. Il ne reçoit que des fichiers finis. La
compilation se fait **sur votre ordinateur**, une fois, et peut être confiée à
un prestataire.

> **Si quelqu'un vous a déjà remis un dossier `dist`**, sautez les étapes 2 et 3
> et allez directement à l'étape 4. Mais lisez quand même l'encadré « Les deux
> variables qui décident de tout » de l'étape 3 : ce sont les deux questions à
> poser à la personne qui a compilé.

### Les gestes

1. Installez **Bun**, l'outil qui compile le projet. Il s'installe depuis le
   site officiel `https://bun.sh`, en une commande, sur Windows, macOS et Linux.
2. Ouvrez un terminal **dans le dossier du projet** (celui qui contient le
   fichier `package.json`).
3. Vérifiez que Bun répond :

   ```bash
   bun --version
   ```

4. Installez les dépendances du projet :

   ```bash
   bun install
   ```

   Cette commande télécharge les bibliothèques nécessaires. Elle peut durer
   plusieurs minutes la première fois. Elle ne modifie rien sur le serveur.

### Vérifier avant de continuer

- `bun --version` affiche un numéro de version (par exemple `1.3.14`).
- `bun install` se termine sans ligne d'erreur.
- Un dossier `node_modules` est apparu dans le projet.

---

## Étape 3 — Compiler le site

> ### Les deux variables qui décident de tout
>
> La compilation **fige** certains réglages dans les fichiers produits. Les
> changer après coup sur le serveur n'a aucun effet. Deux d'entre eux sont des
> pièges connus, et tous deux ont été relus dans le code du projet.
>
> **1. `VITE_API_MODE` doit valoir `http`.**
> Le fichier `.env.example` porte déjà `VITE_API_MODE=http` depuis le 8 août
> 2026 : si vous compilez depuis ce projet sans modifier les variables, c'est
> le bon mode. Si jamais la variable vaut `mock`, le site fonctionne
> entièrement dans le navigateur, avec des données de démonstration, et
> **n'appelle jamais l'API**. Rien ne l'indique à l'écran : les pages
> s'affichent, les produits apparaissent, et pourtant aucune commande
> n'arrivera jamais dans votre base. Le code responsable est
> `src/api/config.ts`, ligne 22 : le mode vaut `http` si et seulement si la
> variable vaut exactement `http`, et `mock` dans tous les autres cas.
>
> **2. `VITE_API_BASE_URL` doit rester vide.**
> Laissée vide, l'adresse de l'API est **calculée à l'exécution** à partir de
> l'endroit où le site est réellement déposé. C'est ce qui permet de déployer
> dans un sous-dossier sans recompiler. Lui donner une valeur commençant par
> `/`, y compris la valeur d'apparence anodine `/api/v1`, fige l'adresse à la
> racine du domaine : le site déposé dans `public_html/ma-boutique/` appellera
> `/api/v1` au lieu de `/ma-boutique/api/v1`, et rien ne répondra. Le code
> responsable est `src/api/config.ts`, fonction `resoudreBaseApi`, lignes 80 à
> 103 : la valeur vide déclenche le calcul automatique, un chemin absolu est
> respecté tel quel.
>
> **Attention au fichier `.env.example` de la racine du projet.** Il contient
> la ligne `VITE_API_BASE_URL=/api/v1`. Si vous le recopiez en `.env` pour
> compiler, vous activez exactement le piège décrit ci-dessus. Voir « Défauts
> connus » à la fin de ce guide.

### Les gestes

Dans le terminal, toujours dans le dossier du projet :

```bash
VITE_API_MODE=http SITE_URL=https://votre-domaine.dz bun run build
```

Remplacez `votre-domaine.dz` par votre domaine réel, avec `https://` et sans
barre oblique finale. `SITE_URL` sert uniquement à écrire les adresses du plan
du site (`sitemap.xml`) ; une erreur ici n'empêche pas le site de fonctionner,
elle gêne seulement les moteurs de recherche.

Sous Windows, si cette forme n'est pas acceptée par votre terminal, définissez
les deux variables avant d'appeler `bun run build`, ou utilisez le terminal Git
Bash livré avec Git pour Windows.

La compilation se déroule en deux temps. D'abord `vite build` (~6 s), puis
le script de prérendu visite les 27 URL du sitemap et écrit un fichier HTML
prérendu pour chacune. La sortie ressemble à :

```
✓ built in 6.04s
[prerendu] 27 route(s) du sitemap…
[prerendu] 10/27 page(s) écrites…
```

Le temps total est d'environ **17 secondes**. C'est normal.

Si une page n'est pas prérendue (la sortie l'indique), elle reste accessible en
mode normal — le build n'échoue pas. Cause la plus fréquente : l'API n'est pas
disponible sur la machine de compilation ; pour prérender les fiches produit et
les articles, ajouter `PRERENDU_API_URL=http://127.0.0.1:8160` et démarrer
l'API localement (`bun run dev:api`) avant de lancer `bun run build`.

### Vérifier avant de continuer

Trois vérifications, dans cet ordre. Aucune n'est facultative.

**1. Le dossier `dist` existe et contient `index.html` et `index.php`.**

```bash
ls -la dist
```

**2. Le fichier `dist/.htaccess` existe.**

```bash
ls -la dist/.htaccess
```

Ce fichier commence par un point. Beaucoup d'outils l'ignorent, y compris
certains outils de copie et certains clients FTP. S'il manque, recopiez-le à la
main :

```bash
cp public/.htaccess dist/.htaccess
```

**Sans ce fichier, seule la page d'accueil du site fonctionnera.**

**3. La compilation est bien en mode `http`.**

```bash
grep -rl 'VITE_API_MODE===' dist/assets/
```

Cette commande doit **ne rien afficher**. Si elle affiche un nom de fichier,
la compilation est restée en mode `mock` : la variable n'a pas été prise en
compte. Recommencez l'étape.

> **Pourquoi ce test fonctionne.** En mode `mock`, la variable n'est pas définie
> au moment de la compilation : le test `VITE_API_MODE==="http"` reste écrit tel
> quel dans le fichier produit. En mode `http`, l'outil de compilation connaît
> la réponse et remplace tout le test par sa valeur. Ce comportement a été
> constaté en comparant deux compilations réelles du projet, l'une avec la
> variable, l'autre sans.

---

## Étape 4 — Préparer le colis à téléverser

La commande `bun run paqueter` (exécutée à la suite de `bun run build`) produit
un fichier unique : **`katech-site.zip`**. Il contient le site et le dossier
`api/`. Rien d'autre à préparer.

### Ce que contient `katech-site.zip`

```
~/                                  ← la racine de votre compte d'hébergement
├── katech-data/                    ← HORS de la racine web. Jamais accessible par Internet.
│   └── backups/                       (créé par l'assistant à l'étape 7)
└── public_html/                    ← LA RACINE WEB. Tout ce qui est ici est public.
    ├── .htaccess                      ← repli SPA, sécurité, cache
    ├── index.php                      ← le point d'entrée. Indispensable.
    ├── index.html
    ├── assets/
    ├── media/
    ├── about/                         ← sous-dossiers prérendus (produits par bun run build)
    ├── blog/                             Chacun contient un index.html prérendu.
    ├── builder/
    ├── category/
    ├── contact/
    ├── favicon.ico, robots.txt, sitemap.xml, …
    ├── uploads/
    └── api/
        ├── .htaccess
        ├── index.php
        ├── install.php                ← à supprimer à l'étape 8
        ├── routes.php
        ├── schema/
        ├── src/
        └── tools/
```

> **`api/.env` n'est pas dans le zip** — il contient vos identifiants, et il
> sera créé par l'assistant à l'étape 7. Ne le cherchez pas dans l'archive.

### Deux règles qui expliquent toute cette structure

1. **Ce qui est dans `public_html` est téléchargeable par n'importe qui.** Les
   fichiers de base de données, les sauvegardes et les mots de passe n'y sont
   donc pas. C'est la raison d'être du dossier de données, placé à côté.
2. **PHP doit fonctionner à la racine du site**, pas seulement sous `api/`. Le
   fichier `public_html/index.php` sert la page en y insérant une balise qui
   indique au navigateur l'endroit exact où le site est déposé. C'est ce
   mécanisme qui rend possible le déploiement en sous-dossier.

### Vérifier avant de continuer

- Le fichier `katech-site.zip` existe sur votre ordinateur.
- Sa taille est supérieure à 1 Mo (le zip contient des centaines de fichiers).

---

## Étape 5 — Téléverser

### Les gestes

1. Dans hPanel, ouvrez le **gestionnaire de fichiers**.
2. **Activez l'affichage des fichiers cachés.** Le gestionnaire de fichiers
   masque par défaut les noms commençant par un point ; sans cette option, vous
   ne verrez jamais `.htaccess` ni `.env`, et vous croirez qu'ils manquent. Cette
   option se trouve dans les réglages ou le menu d'affichage du gestionnaire.
3. Ouvrez `public_html`. Videz-le s'il contient une page d'accueil par défaut
   posée par l'hébergeur.
4. Téléversez **`katech-site.zip`** dans `public_html`.
5. Clic droit sur l'archive → **Extraire**. Le gestionnaire décompresse sur place.
6. Vérifiez que `public_html/.htaccess` est bien présent (les fichiers cachés
   doivent être affichés).

**Droits d'accès** : `755` pour les dossiers, `644` pour les fichiers. Ce sont
les valeurs par défaut du gestionnaire de fichiers. N'y touchez que si une
erreur vous y invite.

### Vérifier avant de continuer

Dans le gestionnaire de fichiers, avec les fichiers cachés affichés :

| À vérifier                  | Attendu                                |
| --------------------------- | -------------------------------------- |
| `public_html/.htaccess`     | Présent                                |
| `public_html/index.php`     | Présent                                |
| `public_html/index.html`    | Présent                                |
| `public_html/assets/`       | Présent, contient beaucoup de fichiers |
| `public_html/api/.htaccess` | Présent                                |
| `public_html/api/index.php` | Présent                                |
| `public_html/api/schema/`   | Présent, contient **trois** fichiers   |
| `public_html/uploads/`      | Présent, vide                          |

Puis, dans un navigateur, ouvrez `https://votre-domaine/`.

**Attendu à ce stade : la page d'accueil de la boutique s'affiche**, avec ses
images. Les produits affichés sont ceux fournis avec le projet ; ils viendront
de votre base après l'étape 7.

Si vous obtenez une page blanche ou une erreur, allez au chapitre
« Ce qui ne marche pas et pourquoi » avant de continuer.

---

## Étape 6 — Préparer les informations de configuration

Avant d'ouvrir l'assistant, rassemblez ces informations. L'assistant vous les
demandera dans son formulaire et écrira `api/.env` lui-même à partir de vos
réponses — vous n'avez rien à créer ni à copier dans le gestionnaire de
fichiers.

| Information                                   | Où la trouver                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| Moteur de base (`mysql`, `sqlite` ou `pgsql`) | Résultat de la sonde (étape 1)                                            |
| Identifiants de la base                       | `docs/GUIDE-BASES-DE-DONNEES.md`                                          |
| URL du site (`https://…`)                     | Votre domaine, avec `https://`                                            |
| Nom, e-mail, mot de passe propriétaire        | À choisir maintenant, à enregistrer dans un gestionnaire de mots de passe |

> **Lisez le chapitre « Défauts connus » avant de choisir l'adresse e-mail du
> compte propriétaire.** Un défaut constaté sur un déploiement d'essai limite
> aujourd'hui les adresses acceptées par le back-office.

> **Le dossier des images téléversées.** L'assistant vous demandera aussi
> `UPLOAD_DIR` (chemin absolu vers `public_html/uploads`) et `UPLOAD_BASE_URL`
> (valeur : `/uploads`). Le chemin absolu de `public_html` est affiché par la
> sonde à la ligne `Racine web détectée`.

### Vérifier avant de continuer

Vous avez sous la main les identifiants de la base et une phrase de passe pour
le compte propriétaire (au moins dix caractères, pas de terme évident).

---

## Étape 7 — Lancer l'assistant d'installation

L'assistant crée `api/.env`, `katech-data/`, les tables de la base et le compte
propriétaire. Il se déroule en **trois écrans** et ne s'exécute **qu'une seule
fois**.

### Le geste

Dans un navigateur, ouvrez, **une seule fois** :

```
https://votre-domaine.dz/api/install.php
```

### Ce que vous verrez

**Écran 1 — Formulaire de configuration.**
L'assistant présente les champs à remplir : URL du site, moteur de base,
identifiants, compte propriétaire, dossier des images. Remplissez-les avec les
informations préparées à l'étape 6 et soumettez.

**Écran 2 — Vérification et installation.**
L'assistant écrit `api/.env`, crée `katech-data/` hors racine web (avec repli
à l'intérieur et **avertissement rouge** si l'hébergeur refuse le dossier hors
racine), applique le schéma de la base, crée le compte propriétaire, puis
effectue une **requête HTTP réelle** pour prouver que la base n'est pas
téléchargeable depuis Internet et affiche le résultat.

Un point à contrôler : **`24 tables présentes`**. Un nombre inférieur signifie
que `api/schema/` n'a pas été téléversé entièrement — retournez à l'étape 5.

**Écran 3 — Fin.**
Bouton **« Supprimer ce fichier »** : cliquez-le. Il efface `install.php` du
serveur et vous redirige automatiquement vers l'étape 8.

### Si quelque chose échoue

L'assistant nomme la cause dans le même écran. Les causes liées à la base sont
traitées dans `docs/GUIDE-BASES-DE-DONNEES.md`.

**« INSTALLATION DÉJÀ EFFECTUÉE. »**
L'assistant a déjà tourné. Il refuse de recommencer, car il détruirait vos
données. Ce n'est pas une erreur : passez à l'étape 8.

### Vérifier avant de continuer

Ouvrez `https://votre-domaine/api/health`.

**Attendu : une réponse en JSON qui commence par**
`{"data":{"status":"ok","driver":"…"`

Le champ `driver` doit nommer le moteur que vous avez choisi. Si cette adresse
répond, le site et sa base se parlent.

---

## Étape 8 — Verrouiller

> **Cette étape n'est pas facultative.** Tant qu'elle n'est pas faite, votre
> site est en ligne avec des portes ouvertes.

### Les trois gestes, dans cet ordre

**1. Supprimer l'installateur.**

Si vous avez cliqué le bouton « Supprimer ce fichier » à la fin de l'écran 3
de l'assistant, c'est déjà fait. Vérifiez :

```
https://votre-domaine.dz/api/install.php
```

Cette adresse doit renvoyer **404**. Si ce n'est pas le cas, supprimez
manuellement `public_html/api/install.php` dans le gestionnaire de fichiers.

L'installateur se protège déjà lui-même par un témoin nommé `installed.lock`,
mais **un fichier absent protège mieux qu'un fichier protégé** : il suffirait
qu'un téléversement futur efface le témoin pour rouvrir la porte.

**2. Supprimer la sonde.**

Supprimez le fichier `public_html/sonde-hebergeur.php`. Elle publie la version
de PHP, la liste des extensions et les chemins absolus du serveur.

**3. Vérifier HTTPS.**

Dans hPanel, confirmez que le certificat SSL est actif sur le domaine, et que la
redirection automatique de HTTP vers HTTPS est activée. Ouvrez ensuite
`http://votre-domaine/` (sans le `s`) : le navigateur doit vous conduire en
`https://`.

### Vérifier avant de continuer

Les deux adresses suivantes doivent renvoyer une **erreur 404** :

```
https://votre-domaine.dz/api/install.php
https://votre-domaine.dz/sonde-hebergeur.php
```

### HSTS : à activer, mais pas tout de suite

HSTS est une consigne envoyée au navigateur : « pour ce domaine, n'accepte plus
jamais le HTTP simple ». Elle protège contre une interception au tout premier
contact.

**Son danger est qu'elle ne s'annule pas.** Une fois envoyée, le navigateur du
visiteur la retient pendant un an. Si votre certificat expire ou si un
sous-domaine n'a pas de certificat, ces adresses deviennent inaccessibles pour
ce visiteur, et vous ne pouvez rien y faire depuis le serveur.

**La règle** : activez HSTS **au moins une semaine après** la mise en ligne,
quand HTTPS fonctionne de façon stable sur le domaine **et sur tous ses
sous-domaines**.

Pour l'activer, ouvrez `public_html/.htaccess` dans le gestionnaire de fichiers
et retirez le `#` en début de cette ligne, déjà écrite et commentée dans le
fichier :

```apache
# Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

Elle se trouve dans la section des en-têtes de sécurité, accompagnée du même
avertissement.

---

## Étape 9 — Recette finale

Parcourez cette liste en entier, dans l'ordre. **Tout écart est un problème à
régler avant d'ouvrir la boutique au public.**

### Le site répond

| À ouvrir                                      | Attendu                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `https://votre-domaine.dz/`                   | La page d'accueil, avec ses images et ses polices     |
| `https://votre-domaine.dz/category`           | La page catalogue, **pas** une erreur 404 du serveur  |
| Recharger la page (touche F5) sur `/category` | La même page. C'est le vrai test du repli des routes. |
| `https://votre-domaine.dz/api/health`         | Un JSON avec `"status":"ok"` et le bon `driver`       |
| `https://votre-domaine.dz/api/v1/products`    | Un JSON de la forme `{"data":{"items":[…]`            |
| Console du navigateur (touche F12)            | Aucune ligne rouge                                    |

### Ce qui doit être refusé

Chacune de ces adresses doit renvoyer **403** ou **404**. Jamais le contenu du
fichier, jamais un téléchargement.

| À ouvrir                                             | Attendu                  |
| ---------------------------------------------------- | ------------------------ |
| `https://votre-domaine.dz/api/.env`                  | 403                      |
| `https://votre-domaine.dz/api/src/Db.php`            | 403                      |
| `https://votre-domaine.dz/api/tools/sauvegarder.php` | 403                      |
| `https://votre-domaine.dz/api/installed.lock`        | 403                      |
| `https://votre-domaine.dz/api/`                      | Pas de liste de fichiers |
| `https://votre-domaine.dz/assets/`                   | Pas de liste de fichiers |
| `https://votre-domaine.dz/api/install.php`           | 404                      |
| `https://votre-domaine.dz/sonde-hebergeur.php`       | 404                      |
| `https://votre-domaine.dz/katech-data/`              | 404                      |

Le refus de `api/tools/sauvegarder.php` a une double serrure, vérifiée sur le
déploiement d'essai : même si le fichier `.htaccess` venait à être ignoré, le
script répond lui-même `Acces refuse : ce script est un outil d'administration
en ligne de commande.` avec un code 403.

### La boutique fonctionne vraiment

1. Connectez-vous à l'administration avec le compte propriétaire.
2. Ouvrez la page des produits et créez un produit d'essai.
3. Téléversez une image sur ce produit, et **vérifiez qu'elle s'affiche**.
   C'est le test des lignes `UPLOAD_DIR` et `UPLOAD_BASE_URL` renseignées à l'étape 7.
4. Passez une commande d'essai depuis la boutique.
5. Vérifiez que la commande apparaît dans l'administration.
6. Supprimez le produit et la commande d'essai.

### Les sauvegardes

Elles relèvent de `docs/GUIDE-BASES-DE-DONNEES.md`. **Ne considérez pas le
déploiement terminé tant qu'une sauvegarde n'a pas été produite et qu'une
restauration n'a pas été essayée au moins une fois.**

---

## Le cas du sous-dossier

Vous pouvez déposer la boutique dans `public_html/ma-boutique/` au lieu de
`public_html/`. Elle répondra alors à `https://votre-domaine.dz/ma-boutique/`.

**Il n'y a rien à recompiler, et rien à modifier dans les fichiers.** C'est le
fichier `index.php` déposé avec le site qui calcule, à chaque visite, l'endroit
réel où le site se trouve, et qui le dit au navigateur.

### Ce qui change dans la marche à suivre

| Étape | Changement                                                                         |
| ----- | ---------------------------------------------------------------------------------- |
| 5     | `katech-site.zip` est téléversé dans `public_html/ma-boutique/` et extrait là      |
| 6     | Aucun changement — les informations se rassemblent de la même façon                |
| 7     | Dans le formulaire de l'assistant : `APP_URL=https://votre-domaine.dz/ma-boutique` |
| 7     | Dans le formulaire : `UPLOAD_DIR` désigne `.../public_html/ma-boutique/uploads`    |
| 7     | L'assistant s'ouvre à `https://votre-domaine.dz/ma-boutique/api/install.php`       |
| 9     | Toutes les adresses de contrôle prennent le préfixe `/ma-boutique`                 |

Le dossier `katech-data/` ne bouge pas : il reste **à côté** de `public_html`,
jamais dedans.

### La condition à ne pas oublier

`VITE_API_BASE_URL` doit être **vide** au moment de la compilation. C'est la
seule chose qui puisse casser le déploiement en sous-dossier, et elle se décide
à l'étape 3. Voir l'encadré « Les deux variables qui décident de tout ».

### Ce qui a été vérifié

Un déploiement complet dans un sous-dossier nommé `ma-boutique` a été monté et
parcouru dans un vrai navigateur, avec l'outil `scripts/parcours.mjs` du projet.
Les 38 étapes du parcours — vitrine, fiche produit, panier, connexion, et les
25 pages d'administration — sont passées sans erreur, exactement comme le même
déploiement à la racine du domaine.

---

## Ce qui ne marche pas, et pourquoi

Chaque symptôme, sa cause, son geste.

### J'ai vu `bunx: command not found` chez l'hébergeur

Vous avez lancé le constructeur Node.js de Hostinger sur ce projet.
Depuis le 9 août 2026, ce message n'apparaît plus — mais le problème de fond
reste entier : l'hébergeur ne dispose pas du navigateur nécessaire au prérendu.
Le site se construit, mais il arrive **sans les pages prérendues**, ce que
Google ne peut pas lire.

**Le geste** : ignorez le constructeur de l'hébergeur. Construisez sur votre
ordinateur (étapes 2 et 3), puis téléversez le dossier `dist/` produit.

### Mon site est en ligne mais introuvable sur Google

Si vous avez construit sur l'hébergeur (ou reçu un `dist/` construit sans
navigateur disponible), le prérendu n'a pas été produit. Chaque page du site
est une page vide pour les moteurs de recherche.

Pour vérifier : ouvrez la source de la page d'accueil (clic droit →
« Afficher le code source ») depuis un navigateur. Si le `<body>` ne contient
qu'une balise `<div id="root"></div>` sans texte visible, le prérendu est
absent.

**Le geste** : recompilez sur votre ordinateur avec la commande de l'étape 3.
La sortie doit afficher des lignes du type
`[prerendu] 27 route(s) du sitemap…`. Retéléversez ensuite le contenu de
`dist/` (les sous-dossiers `about/`, `blog/`, `category/`, `contact/`… font
partie du résultat prérendu). **Ne touchez pas** à `api/.env`, ni au dossier
`uploads/`, ni à `katech-data/`.

### La page est entièrement blanche

Le navigateur n'a rien reçu à afficher.

1. **`index.php` manque à la racine du site.** Vérifiez sa présence dans
   `public_html`. C'est lui le point d'entrée, pas `index.html`.
2. **PHP n'est pas actif à la racine du site.** Ouvrez
   `https://votre-domaine/api/health` : si cette adresse répond en JSON, PHP
   fonctionne sous `api/` mais peut-être pas à la racine. C'est rare ;
   contactez le support de l'hébergeur.
3. **La version de PHP est inférieure à 8.2.** Corrigez-la dans hPanel.
4. **Le journal d'erreurs de PHP dans hPanel** contient le détail. Les messages
   du projet y sont préfixés `[katech-api]`.

Si la page affiche le texte
`index.html est absent a cote de index.php : le televersement est incomplet.`,
le diagnostic est déjà fait : `index.html` n'a pas été téléversé.

### La page d'accueil s'affiche, mais toutes les autres pages donnent une erreur 404

Le fichier `public_html/.htaccess` est absent, ou le serveur ne le lit pas.

C'est **le problème le plus fréquent**, et il a toujours la même origine : le
nom du fichier commence par un point, et les outils de copie, les clients FTP et
les compresseurs le sautent en silence.

**Le geste** : dans le gestionnaire de fichiers, activez l'affichage des
fichiers cachés et regardez si `public_html/.htaccess` est là. S'il manque,
téléversez-le depuis `dist/.htaccess`.

Les adresses comme `/category` ne correspondent à aucun fichier réel sur le
disque. C'est `.htaccess` qui indique au serveur de servir la page d'accueil et
de laisser le navigateur trouver la bonne page.

### Recharger la page sur une adresse profonde donne une erreur 404

Même cause que ci-dessus. Testez-le explicitement : ouvrez `/category`, puis
appuyez sur F5. C'est le geste qui échoue chez un visiteur qui a mis une page en
favori.

### L'API renvoie du HTML au lieu du JSON

Symptôme : `https://votre-domaine/api/health` affiche la page d'accueil de la
boutique, ou une page vide, au lieu d'un texte commençant par `{"data"`.

**Cause** : le fichier `public_html/api/.htaccess` est absent. Le `.htaccess` de
la racine laisse passer tout ce qui commence par `/api` — c'est sa toute
première règle — en supposant que le `.htaccess` de `api/` prendra le relais.
S'il n'est pas là, la demande retombe sur le repli général et reçoit la page
d'accueil.

**Le geste** : vérifiez la présence de `public_html/api/.htaccess`, fichiers
cachés affichés. Téléversez-le si nécessaire.

Si le fichier est bien là et que le problème persiste, l'hébergeur n'autorise
pas la réécriture d'adresses. C'est très rare sur un mutualisé : contactez le
support.

### Toutes les adresses en `/api/...` donnent une erreur 404

Même cause, même geste que ci-dessus.

### Le site s'affiche, mais aucune donnée n'apparaît, et rien n'est enregistré

Les pages s'affichent normalement, les produits de démonstration apparaissent,
mais aucune commande n'arrive dans la base et l'administration ne montre pas vos
modifications.

**Cause** : la compilation a été faite sans `VITE_API_MODE=http`. Le site
fonctionne alors entièrement dans le navigateur, sans jamais appeler l'API.

**Le geste** : recompilez à l'étape 3 avec la variable, refaites le contrôle
`grep -rl 'VITE_API_MODE===' dist/assets/` qui doit ne rien afficher, puis
retéléversez le contenu de `dist/`. **Ne touchez pas** à `api/.env`, ni au
dossier `uploads/`, ni à `katech-data/`.

### Le site déposé dans un sous-dossier ne fonctionne qu'à l'accueil

**Cause** : `VITE_API_BASE_URL` a reçu une valeur au moment de la compilation.
L'adresse de l'API a été figée à la racine du domaine.

**Le geste** : recompilez sans cette variable, ou avec une valeur vide.

Pour le confirmer : ouvrez la console du navigateur (touche F12). Le site écrit
lui-même un message qui commence par `[ka-tech] VITE_API_BASE_URL vaut …` et
nomme le problème.

### Les images ne s'affichent pas

Trois causes distinctes, à distinguer avant d'agir.

**a) Les images du catalogue livrées avec le site.** Elles vivent dans
`public_html/media/`. Si ce dossier n'a pas été téléversé, aucune photo produit
n'apparaît. Vérifiez sa présence.

**b) Les images que vous téléversez depuis l'administration.** Elles doivent
arriver dans `public_html/uploads/`. Si le dossier `uploads/` n'existe pas, ou
si `UPLOAD_DIR` n'est pas renseigné dans `api/.env`, elles atterrissent ailleurs
et apparaissent cassées. Voir « Défauts connus ».

**c) Une image manquante en particulier.** Le site le dit lui-même dans la
console du navigateur, avec un message qui nomme le fichier :
`[ka-tech] Image introuvable : « /uploads/xxxx.png » (nom-du-fichier.png)`.

### Une modification du site n'apparaît pas après une mise à jour

Le navigateur a gardé l'ancienne page en mémoire. Le fichier `.htaccess`
l'interdit explicitement pour la page d'accueil. Si le problème persiste, un
cache est actif du côté de l'hébergeur : videz-le depuis hPanel.

### Un élément du site a disparu après la mise en ligne

Une règle de sécurité du navigateur bloque peut-être une ressource externe.
Ouvrez la console (touche F12) : une violation de ce type s'y affiche
explicitement, en nommant la règle en cause. `docs/DEPLOIEMENT.md` décrit
comment la passer temporairement en mode observation pour diagnostiquer sans
casser le site.

---

## Mettre le site à jour plus tard

1. **Sauvegardez d'abord.** Suivez `docs/GUIDE-BASES-DE-DONNEES.md`, et vérifiez
   que le fichier de sauvegarde existe bien avant de continuer.
2. Recompilez : `bun run build && bun run paqueter` sur votre ordinateur.
3. Refaites les trois vérifications de l'étape 3, y compris celle de
   `dist/.htaccess`.
4. Dans `public_html`, remplacez `index.php`, `index.html`, `.htaccess`,
   le dossier `assets/`, le dossier `media/` et les fichiers statiques modifiés.
   Vous pouvez aussi déposer le nouveau `katech-site.zip` et l'extraire sur
   place — cela remplace les fichiers sans toucher à `api/.env` ni à `uploads/`.
5. **Ne supprimez jamais** : `uploads/`, `api/.env`, ni le dossier
   `katech-data/`.
6. Si le code de l'API a changé, remplacez `api/src/`, `api/routes.php`,
   `api/index.php`, `api/schema/` et `api/tools/`. **Ne retéléversez pas**
   `install.php`.

Les anciens fichiers du dossier `assets/` peuvent être supprimés : leurs noms
contiennent une empreinte, et les nouveaux portent d'autres noms. En cas de
doute, laissez-les une semaine — un visiteur ayant un onglet resté ouvert peut
encore les réclamer.

---

## Ce que ce guide n'a pas pu vérifier

Ce guide a été écrit et éprouvé sur un déploiement d'essai complet, monté dans
l'environnement de développement du projet : compilation réelle, fichiers
disposés comme sur le serveur, installateur exécuté par HTTP, et parcours des
38 écrans du site dans un vrai navigateur, à la racine du domaine **et** dans un
sous-dossier. Les sorties de texte reproduites dans ce guide sont des sorties
réelles.

Trois choses n'ont pas pu être vérifiées, et sont décrites ici comme des
intentions plutôt que comme des certitudes.

1. **L'interface exacte de hPanel.** Les noms des boutons, leur emplacement à
   l'écran et l'organisation des menus changent au fil des versions. Ce guide
   décrit donc l'**intention** (« ouvrir le gestionnaire de fichiers », « créer
   une base de données ») et jamais un libellé exact. Un faux libellé fait
   perdre plus de temps qu'une description générale.

2. **Le comportement réel des fichiers `.htaccess` sur le serveur de
   Hostinger.** Le serveur d'essai employé ici ne les lit pas ; leurs règles ont
   été relues ligne à ligne, et leurs effets reproduits par une émulation, mais
   aucun serveur Apache ni LiteSpeed n'a été exécuté. C'est précisément ce que
   contrôle la liste de l'étape 9 : les codes 403 et 404 attendus **sont** ce
   test.

3. **Les codes de retour exacts des adresses qui doivent être refusées**, pour
   la même raison.

---

## Défauts connus, constatés lors de la rédaction de ce guide

Ces trois défauts ont été **constatés en exécutant le logiciel**, pas déduits.
Ils appartiennent à des fichiers hors du périmètre de ce guide et sont signalés
ici pour que vous ne les découvriez pas seul, un soir de mise en ligne.

### 1. Le back-office n'accepte aujourd'hui que certaines adresses e-mail

**Ce qui se passe.** Vous créez le compte propriétaire à l'étape 6 avec votre
adresse, par exemple `vous@votre-domaine.dz`. L'installateur crée bien le
compte. Vous vous connectez sur le site : la connexion réussit. Mais en ouvrant
`/admin`, vous obtenez le message **« Zone réservée à l'équipe admin »**.

**Pourquoi.** Le contrôle d'accès au back-office cherche votre adresse dans une
liste d'utilisateurs de démonstration écrite dans le code du site
(`src/lib/admin-store.tsx`, fonction `seedUsers`, à partir de la ligne 710), au
lieu de lire le rôle renvoyé par l'API. Le fichier responsable du contrôle est
`src/lib/admin-auth.tsx`, fonction `useAdminRoles`, ligne 23.

**Constaté** sur le déploiement d'essai : avec l'adresse
`proprietaire@essai.dz`, l'accès est refusé ; avec `admin@katech.dz`, la même
base et le même mot de passe donnent accès au back-office complet.

**Contournement, en attendant la correction** : renseignez
`INSTALL_OWNER_EMAIL=admin@katech.dz` à l'étape 6. Ce n'est pas satisfaisant —
signalez ce défaut à l'équipe de développement avant l'ouverture au public.

### 2. `UPLOAD_DIR` doit être renseigné, contrairement à ce qu'annonce le modèle

**Ce qui se passe.** Vous téléversez une image depuis l'administration.
L'opération réussit, mais l'image ne s'affiche nulle part. La console du
navigateur écrit `[ka-tech] Image introuvable : « /uploads/… »`.

**Pourquoi.** Sans `UPLOAD_DIR`, l'API calcule un dossier de destination à
partir de son propre emplacement, en supposant qu'elle se trouve **à côté** de
`public_html` et non **dedans**. Le code est
`api/src/Controllers/ControleurMedias.php`, ligne 173. Une fois `api/` déposé
dans `public_html`, le fichier part dans `public_html/public_html/uploads/`,
alors que l'adresse publiée reste `/uploads/…`.

**Constaté** sur le déploiement d'essai : le fichier a été écrit dans
`…/ma-boutique/public_html/uploads/`, hors de portée du site. Après avoir
renseigné `UPLOAD_DIR`, la même image a été téléversée et servie correctement.

Le commentaire de `api/.env.example` (ligne 170) annonce comme valeur par défaut
`<racine du compte>/public_html/uploads`, ce qui n'est vrai qu'en développement.

**Contournement** : renseigner `UPLOAD_DIR` et `UPLOAD_BASE_URL`, comme
l'indique l'étape 6.

### 3. Le fichier `.env.example` de la racine du projet fige l'adresse de l'API

Le fichier `.env.example` situé à la racine du projet contient la ligne
`VITE_API_BASE_URL=/api/v1` (ligne 64). Recopié en `.env` avant la compilation,
il produit exactement la panne décrite au chapitre « Le site déposé dans un
sous-dossier ne fonctionne qu'à l'accueil ».

**Contournement** : ne pas définir cette variable, ou lui donner une valeur
vide. La compilation de l'étape 3 ne demande aucun fichier `.env`.

---

## Voir aussi

- `docs/GUIDE-BASES-DE-DONNEES.md` — création de la base, choix du moteur,
  sauvegarde, restauration
- `docs/DEPLOIEMENT.md` — la référence technique complète du déploiement
- `api/.env.example` — toutes les variables de configuration, commentées
- `scripts/sonde-hebergeur.php` — la sonde de l'étape 1
