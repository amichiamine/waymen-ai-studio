# PLAN.md — Plan de complétion KA Tech vers la production

> **Source de vérité du projet.** Ce fichier est citable dans chaque consigne
> d'agent. Il survit aux redémarrages de session — contrairement à un plan
> resté dans une conversation (cf. `AGENTS.md` §5).
>
> Toute consigne d'agent doit référencer la vague et la tâche concernées.

**Dernière mise à jour** : 5 août 2026
**Branche de travail** : `main` (phases 0, 1, 3) — branches dédiées (phases 2, 4)

---

## 0. Constat de départ — mesuré, non supposé

Audit réalisé le 5 août 2026 sur le dépôt complet.

| Axe              | État vérifié                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| TypeScript       | `npx tsc --noEmit` → **0 erreur** (mode `strict` activé)                                                 |
| Build            | Réussi en 5,17 s — mais **un seul chunk de 1 383 kB** (378 kB gzip)                                      |
| Lint             | 2 119 problèmes, dont **2 029 de pur formatage** ; **4 vrais défauts**                                   |
| Backend          | **Inexistant** — zéro appel réseau dans toute l'application                                              |
| Couche `src/api` | Écrite (425 lignes) mais **0 des 76 fichiers UI ne l'importe**                                           |
| Lovable Lot 2    | Pages i18n **faites** (381 clés × 3 langues, parité parfaite) ; **données produits/blog non localisées** |
| Lovable Lot 3    | Fait pour `site-content` ; **absent pour produits et blog**                                              |
| Tests            | **0** — aucun test, aucune CI, aucun `ErrorBoundary`                                                     |

### Volumétrie

53 pages (18 visiteur + 35 admin), 56 routes, 23 composants métier,
44 primitives shadcn, ~13 572 lignes TS/TSX hors `src/components/ui/`.

### Défauts de cadrage identifiés

- `Product` (`src/data/products.ts:20`) et `BlogPost` (`src/lib/admin-store.tsx:113`)
  ont des champs `string` bruts au lieu de `Localized<string>` — reliquat du Lot 2.
- `src/data/products.ts:41` : `tr()` mort (`v ?? ""`), vestige de l'ancien i18n.
- `src/components/Hero.tsx:119-120` : re-export de `Localized` avec le commentaire
  « to satisfy unused-import checkers » — contournement à supprimer.
- `.lovable/project.json` déclare le template `tanstack_start_ts_current` alors que
  le projet est un Vite nu ; d'où la règle `no-restricted-imports` orpheline visant
  `@tanstack/react-start` dans `eslint.config.js`.

---

## 1. Cible d'architecture

**Hébergement mutualisé** (dossier `public_html`), ce qui exclut Node.js côté serveur.

| Couche                       | Choix                                                                 |
| ---------------------------- | --------------------------------------------------------------------- |
| Runtime                      | PHP 8.2+                                                              |
| Framework API                | Aucun (routeur maison) — pas de Composer, pas de `vendor/`            |
| Persistance transactionnelle | **SQLite, MySQL ou PostgreSQL** — pilote choisi par `DB_DRIVER`       |
| Persistance JSON             | Factures figées, contenu éditorial, payloads d'outbox                 |
| Authentification             | Sessions PHP + cookie `httpOnly`, hachage **Argon2id** (repli bcrypt) |
| Emails                       | PHPMailer en SMTP, émission en fin de requête (pas de CRON)           |
| Médias                       | Fichiers dans `public_html/uploads/`                                  |
| Paiement au lancement        | **Paiement à la livraison** (SATIM ultérieurement)                    |
| SEO                          | Prérendu au build (le SSR est impossible en mutualisé)                |

### Répartition SQLite / JSON

SQLite porte tout le transactionnel : produits, stock, commandes, clients,
coupons, avis, utilisateurs, blog, tarifs wilayas. Le JSON est réservé à ce
qu'il fait mieux que SQL : les **snapshots de facture immuables**, le
**contenu éditorial semi-structuré**, et les **payloads de l'outbox**.

**Justification du choix SQLite plutôt que JSON pour les écritures** : le
décompte de stock exige l'atomicité. `UPDATE products SET stock = stock - 1
WHERE id = ? AND stock > 0` empêche la survente ; deux processus écrivant un
fichier JSON ne l'empêchent pas. Par ailleurs les agrégations du Dashboard
(CA, graphe 30 jours, top produits, LTV) sont des `GROUP BY` en SQL et des
parcours de N fichiers en JSON.

### Emplacement des données — critique

Le fichier `.sqlite` et les JSON doivent être **hors de `public_html`**,
sinon ils sont téléchargeables par HTTP.

```
/home/user/
├── katech-data/          ← HORS public_html
│   ├── katech.sqlite
│   ├── invoices/
│   └── backups/
└── public_html/
    ├── index.html, assets/   ← contenu de dist/
    ├── uploads/
    ├── .htaccess             ← fallback SPA + exclusion de /api
    └── api/                  ← Slim
```

### Triple pilote SQLite / MySQL / PostgreSQL — décision du 5 août 2026, étendue le 6 août 2026

**Contexte** : l'hébergement n'est pas encore acquis, aucun test préalable n'est
possible, et l'exigence est un déploiement sans surprise.

SQLite seul reposait sur **trois hypothèses invérifiables à l'avance** :
`pdo_sqlite` activé, un dossier inscriptible hors de `public_html`, et le mode
WAL accepté par le système de fichiers. Trois paris.

MySQL seul aurait été garanti — c'est la raison d'être d'un mutualisé, et XAMPP
le fournit déjà en local — mais aurait fait perdre la portabilité du fichier
unique.

**Retenu : les deux** à l'origine, puis **un troisième pilote `pgsql`** a été
ajouté. Il ouvre PostgreSQL en général (Supabase, Neon, Railway ou tout serveur
PostgreSQL autonome). Ce sont exactement les mêmes données, le même code de
contrôleur, la seule différence est la chaîne de connexion et une variable
`DB_SSLMODE=require` obligatoire chez les fournisseurs qui imposent TLS.

Voir §9 ter pour la décision détaillée de ne PAS utiliser l'API HTTPS de Supabase
(PostgREST), mais le pilote SQL direct.

#### Ce que la double compatibilité impose

| Point                      | Traitement                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Clés primaires             | `AUTOINCREMENT` / `AUTO_INCREMENT` — isolé dans les deux fichiers de schéma                            |
| Booléens                   | `INTEGER` 0/1 partout : SQLite n'a pas de type booléen                                                 |
| Dates                      | Chaînes ISO-8601 partout, jamais de type date natif                                                    |
| JSON                       | Colonne `JSON` en MySQL, `TEXT` en SQLite — `json_encode` des deux côtés                               |
| Upsert                     | Divergence réelle (`ON CONFLICT` / `ON DUPLICATE KEY`) — **isolée dans un helper unique**              |
| Transaction d'écriture     | `BEGIN IMMEDIATE` en SQLite, `BEGIN` en MySQL — isolé dans `beginWrite()`                              |
| Décompte de stock          | `UPDATE … SET stock = stock - ? WHERE id = ? AND stock >= ?` — **identique et atomique dans les deux** |
| PRAGMA WAL, `busy_timeout` | SQLite uniquement, appliqués à la connexion                                                            |

**Garde-fou** : un script de vérification compare les deux fichiers de schéma
(tables, colonnes, index) et échoue s'ils divergent. Deux schémas maintenus à la
main finissent toujours par s'écarter — cette vérification entre dans la CI.

#### Déploiement visé — sans prérequis exotique

1. Téléverser `dist/` dans `public_html/`
2. Téléverser `api/` avec son `vendor/` **compilé en local** (pas de Composer requis sur le serveur)
3. Renseigner `api/.env` : `DB_DRIVER` et, pour MySQL, les 4 identifiants du panneau
4. Ouvrir `/api/install.php` une fois — création des tables, compte propriétaire, puis auto-désactivation

Aucune écriture hors `public_html` n'est requise en mode MySQL. En mode SQLite,
le dossier de données reste hors racine web.

---

## 2. Doctrine d'exécution

Application de `AGENTS.md`. Rappels contraignants :

- **Pilote avant réplication** (§1, skill S1) : chaque phase commence par un
  exemplaire irréprochable produit par un agent **fort**, puis la réplication
  passe en **intermédiaire**.
- **Micro-tâches de 5 à 10 minutes**, auto-commit, livrables numérotés à seuil.
- **Périmètres strictement disjoints** : un fichier n'a qu'un propriétaire par vague.
- **4 à 6 agents simultanés** maximum ; anti-doublon `git log` systématique.
- **Validation à froid par l'orchestrateur** : jamais de conclusion sur la foi
  des rapports d'agents.
- **Rapports de 4 à 5 lignes** maximum.

### Adaptations propres à ce projet

1. **`npm run format` est un commit solo.** Il réécrit 2 029 lignes sur presque
   tous les fichiers ; lancé après un fan-out, chaque agent rebase contre le
   dépôt entier.
2. **Les agents ne lancent pas `vite build`.** Six builds concurrents dans le
   même répertoire se disputent `dist/`. Les agents lancent `tsc --noEmit` et
   `eslint` sur leurs fichiers ; **l'orchestrateur seul** lance le build complet
   à la validation à froid.
3. **Aucun force-push, aucun rebase de commits déjà poussés** — le dépôt est
   synchronisé avec Lovable.

### Commande de vérité

```bash
npx tsc --noEmit && npx eslint . && npx vite build
```

Jamais affaiblie. Enrichissement additif uniquement.

---

## 3. Phases

| Phase | Objet                              | Effort agent | Agents         |
| ----- | ---------------------------------- | ------------ | -------------- |
| 0     | Assainissement                     | 2-3 h        | 6              |
| 1     | Complétion du frontend             | 10-14 h      | 12 en 3 vagues |
| 2     | Isolation et commutation des mocks | 16-20 h      | 14 en 5 vagues |
| 3     | Solde du travail Lovable           | 6-8 h        | 8 en 3 vagues  |
| 4     | Persistance SQLite + JSON          | 20-26 h      | 16 en 6 vagues |
| 5     | Mise en production                 | 6-8 h        | 5              |
|       | **Total**                          | **60-80 h**  | **≈ 60**       |

### Ce qui ne se comprime pas

Le facteur de compression sur l'écriture de code est de 15 à 25×. Il est de
**1×** sur quatre points, qui fixent le calendrier réel :

1. **Contrat marchand SATIM** — délai bancaire de plusieurs semaines. Hors
   périmètre du lancement (paiement à la livraison retenu).
2. **Relecture des traductions AR/EN** — production par agent, validation par
   un locuteur.
3. **Tests humains** — rendu RTL, ergonomie, interactions réelles en navigateur.
4. **Accès hébergeur** — test WAL, déploiement, identifiants.

---

## 4. Phase 0 — Assainissement

**Objectif** : rendre le dépôt sain avant toute construction. Aucun changement
fonctionnel.

| Vague | Agent                  | Périmètre                                                     | Tâche                                         |
| ----- | ---------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| 0.0   | orchestrateur          | `PLAN.md`, `AGENTS.md`                                        | Plan versionné dans le dépôt                  |
| 0.1   | orchestrateur **solo** | tout le dépôt                                                 | `npm run format` — 2 029 corrections          |
| 0.2-A | **fort** (S13)         | `src/lib/admin-store.tsx`                                     | Retirer les 5 mots de passe en dur (L437-441) |
| 0.2-B | **fort** (S1)          | `src/App.tsx`, `src/components/ErrorBoundary.tsx`             | ErrorBoundary + `React.lazy` sur 56 routes    |
| 0.2-C | minimal                | `use-reveal.ts`, `ProductCard.tsx`, `Product.tsx`, `i18n.tsx` | 4 défauts de lint réels                       |
| 0.2-D | minimal                | `scripts/generate-sitemap.ts`, `public/robots.txt`            | `BASE_URL` absolu + ligne `Sitemap:`          |
| 0.2-E | minimal                | `package.json`                                                | Purger les 9 dépendances mortes               |
| 0.2-F | minimal                | `.github/workflows/`                                          | CI : `tsc` + `eslint` + `build`               |

### Phase 0 — LIVRÉE le 5 août 2026

15 commits, 7 agents (2 forts, 2 intermédiaires, 3 minimaux) + 3 commits solo
d'orchestrateur. Commande de vérité **verte sous bun** : `lint` 0 erreur,
`tsc --noEmit` 0 erreur, `build` OK.

#### Résultat mesuré sur le bundle

|                                | Avant          | Après                            | Gain      |
| ------------------------------ | -------------- | -------------------------------- | --------- |
| Chunks JS                      | **1**          | **81**                           | —         |
| Chunk initial                  | 1 383 kB       | 608 kB                           | −56 %     |
| **Premier chargement (gzip)**  | **397,8 kB**   | **210,5 kB**                     | **−47 %** |
| Recharts dans le chunk initial | oui (109 occ.) | **non** (chunk séparé de 384 kB) | —         |

Recharts n'est plus servi aux visiteurs de la boutique : il ne se charge qu'à
l'ouverture du Dashboard ou d'Analytics.

#### Incident de sécurité rattrapé à la validation

La vague 0.2-A a retiré les mots de passe de seed du build de production. Cela a
**activé une faille dormante** dans `src/lib/auth.tsx` : le repli de `signIn`
accordait une session à tout compte dépourvu de mot de passe, sans vérifier la
valeur saisie. Les comptes semés n'en ayant plus, `admin@katech.dz` (rôle
`owner`) devenait accessible avec n'importe quel mot de passe.

Détecté par l'agent 0.2-A (qui l'a signalé au lieu de sortir de son périmètre),
confirmé par lecture directe du code par l'orchestrateur, corrigé en vague 0.2-G
(commit `6667c98`) : le repli est désormais conditionné à `import.meta.env.DEV`.

**Leçon pour `AGENTS.md` §6** : retirer une donnée d'un modèle peut activer un
chemin de code jusque-là inatteignable. Toute suppression doit être suivie de la
recherche des branches qui testaient l'absence de cette donnée.

#### Deux pièges d'outillage rencontrés

1. **`prettier` n'est pas idempotent** sur `src/lib/admin-store.tsx` : une seule
   passe laisse des erreurs `prettier/prettier`. Vérifier avec
   `bunx prettier --check .` après chaque `--write`.
2. **`bun.lock` doit être régénéré** après toute modification de `package.json`,
   sinon `bun install --frozen-lockfile` de la CI échoue. Fait en commit `ed0dc78`.

#### Reste à faire — actions humaines

- [ ] **Porte humaine** : vérifier en navigateur que les 56 routes fonctionnent
      après le code splitting, et que l'`ErrorBoundary` s'affiche correctement.
- [ ] Copier `.env.example` vers `.env.local` pour retrouver les comptes de
      démonstration en développement (`VITE_DEV_SEED_CREDENTIALS`).
- [ ] **Pousser les 15 commits** : le remote n'est pas accessible depuis le
      sandbox et le PAT fourni a été exposé — générer un token neuf
      (fine-grained, limité à ce dépôt) avant tout push.

#### Vague 0.3 — optimisation du chemin critique (5 août 2026)

Traitement de la piste identifiée. 6 commits, 5 agents (4 forts, 1 intermédiaire).

| Étape                                                      | Premier chargement (gzip) |
| ---------------------------------------------------------- | ------------------------- |
| Départ phase 0                                             | 397,8 kB                  |
| Après `React.lazy` (vague 0.2)                             | 210,5 kB                  |
| Dictionnaires EN/AR en `import()` + retrait de react-query | 192,4 kB                  |
| Chrome admin sorti du shell (`AdminShell` paresseux)       | 184,3 kB                  |
| Recalibrage des chunks Radix                               | **179,5 kB**              |

**Gain total : −55 %.**

Détail du chemin critique final : `vendor-react` 59,2 · shell applicatif 65,0 ·
`vendor-radix-shell` 27,8 · `vendor-router` 7,7 · CSS 19,1 · HTML 0,8.

#### Ce qui a réellement produit le gain

1. **Les 3 dictionnaires FR/EN/AR étaient dans le chunk d'entrée.** `en` et `ar`
   passent en `import()` dynamique, `fr` reste statique comme repli. Parité
   vérifiée : 381 clés dans chacun des 3 modules, corps identiques à l'octet près.
2. **React Query était monté sans être utilisé** — zéro `useQuery`/`useMutation`
   dans tout le projet. Retiré (peut être réintroduit délibérément en phase 2).
3. **Le chrome du back-office était importé statiquement par `App.tsx`** :
   `AdminLayout` (386 lignes) et `ui/sidebar` (744 lignes) étaient servis à chaque
   client de la boutique. Extrait en `AdminShell` paresseux — la garde
   d'authentification reste en amont, un visiteur non admin ne télécharge rien.
4. **Recalibrage des chunks Radix** : une fois le chrome admin parti, seuls
   `dialog`, `dropdown-menu` et `slot` restent nécessaires au shell.

#### Enseignement à retenir sur `manualChunks`

`manualChunks` **déplace** du code, il ne le rend pas paresseux : une librairie
importée par le shell est téléchargée au premier rendu quoi qu'il arrive, dans une
requête parallèle. Mesuré sur ce projet : le regroupement Radix seul a coûté
+0,4 kB au premier chargement pour un gain de cache. **Le volume ne baisse que
lorsque du code quitte réellement le graphe d'imports statiques du shell** — ce
qu'ont fait les points 1, 2 et 3.

Corollaire de méthode : ne jamais mesurer le seul chunk d'entrée. La mesure
valable est la somme gzip de tous les fichiers référencés par `index.html`
(entrée + `modulepreload` + CSS).

#### Pourquoi la cible de 150 kB n'est pas atteinte

Il manque 29,5 kB, et ils ne sont pas accessibles à ce stade :

- `vendor-react` 59,2 kB est incompressible sans changer de framework.
- Le shell applicatif de 65,0 kB contient **l'intégralité du jeu de données mock**
  (`admin-store.tsx` : 24 clients, 32 commandes, 5 articles, pièces du
  configurateur, 58 wilayas, modes de paiement). Dans une architecture sans
  backend, le navigateur DOIT recevoir ce jeu de données pour afficher la boutique.
- Le CSS Tailwind de 19,1 kB est déjà purgé.

**La cible de 150 kB devient atteignable en phase 4**, quand les données viendront
de l'API SQLite au lieu du bundle : le shell devrait alors tomber sous 40 kB, soit
environ 155 kB au total, puis sous 150 avec un allègement du `sheet` mobile de
l'en-tête. À reprendre comme critère de recette de la phase 4.

---

## 5. Phase 1 — Complétion du frontend

**Note d'ordonnancement** : la vague 2.1 (conception de l'interface du
fournisseur de données) doit précéder la vague 1.3, pour que tout code neuf
naisse du bon côté de la couture.

| Vague | Agent                  | Tâche                                                                                                    |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| 1.1   | **fort** (S1)          | Pilote de permissions : `canPerform` appliqué à `admin/Products.tsx`                                     |
| 1.2   | 5 × intermédiaire (S2) | Répliquer le pilote sur les 34 autres pages admin, groupes de 7                                          |
| 1.3   | **fort**               | Builder : ajout au panier + contrôles de compatibilité                                                   |
| 1.3   | **fort**               | Analytics : remplacer l'entonnoir inventé (L63-75) par du réel ou une mention                            |
| 1.3   | intermédiaire (S10)    | `admin/Customers.tsx` : CRUD complet                                                                     |
| 1.3   | intermédiaire          | Édition de coupon manquante + `Account.tsx:49` (`handleSave` n'enregistre rien)                          |
| 1.3   | intermédiaire          | Helmet sur les 7 pages manquantes + JSON-LD `Product`                                                    |
| 1.3   | intermédiaire          | 6 classes RTL (`Builder`, `Product`, `Header:116`) + i18n de `MaintenanceGate` et des gardes d'`App.tsx` |
| 1.3   | minimal                | Images en WebP, logo en SVG, attributs `alt`                                                             |
| 1.3   | intermédiaire          | Garde de quota + message visible sur l'upload de médias                                                  |

---

### Phase 1 — LIVRÉE le 5 août 2026

28 commits, 13 agents (6 forts, 7 intermédiaires) en 5 vagues, sur la branche
`chantier/phase-1-frontend`. Commande de vérité verte : `lint` 0 erreur,
`tsc --noEmit` 0 erreur, `prettier --check` vert, `build` sans avertissement,
`bun install --frozen-lockfile` conforme.

#### Permissions — le défaut de conception rencontré

Le socle existait (`ROLE_RANK`, `canPerform`) mais **n'était appelé nulle part**.
Pire, `canPerform` se rabattait par défaut sur `getActiveRole()`, qui lit une clé
localStorage pilotée par un **sélecteur de démonstration** avec `"owner"` comme
valeur de repli. L'appliquer tel quel aurait produit une sécurité décorative :
n'importe qui se serait promu propriétaire.

Le pilote (`docs/PERMISSIONS.md` + `usePermissions()`) fonde désormais les
permissions sur le **rôle réel** issu de `useAdminRoles()`. Le sélecteur de
démonstration ne peut plus que **rétrograder**, et uniquement en développement.

Couverture finale : **31 des 35 pages** portent `usePermissions`, dont **24 avec
garde de niveau 2** (vérification dans le handler, pas seulement masquage visuel).
Les 4 pages restantes sont des enveloppes d'une ligne (`ProductNew`, `ProductEdit`,
`BlogNew`, `BlogEdit`) dont la garde vit dans le formulaire cible — dupliquer y
serait une fausse protection.

Arbitrages notables : `manageUsers` réservé au propriétaire (sinon un `admin` se
promeut `owner`) ; réglages scindés en `manageSettings` et `manageCriticalSettings`
(mode maintenance et éditeurs JSON bruts au niveau critique).

#### Effet de bord rattrapé à la validation

Le configurateur, rendu ajoutable au panier, matérialisait chaque configuration en
vrai `Product` via `upsertProduct` — contrainte réelle, le panier ne stockant que
des `product_id` résolus dans le catalogue. Mais `CategoryDetail` liste
`products.filter(p => p.category === cat)` : **les configurations privées des
clients apparaissaient dans la boutique**. Anodin en localStorage, ce serait une
fuite de données en phase 4 avec un backend partagé.

Corrigé par un champ optionnel `Product.customBuild` et deux helpers
(`isCustomBuild`, `catalogProducts`), filtrant 5 surfaces publiques tout en
préservant la résolution par identifiant dont dépendent panier et paiement.

#### Autres livrables

- **Analytics** : l'entonnoir inventé (`visitors = carts * 5.4`) est supprimé au
  profit de « Traitement des commandes », fondé sur `statusHistory` réel. Le KPI
  « Conversion » devient « Taux de livraison ».
- **Customers** : CRUD complet (skill S10), avec `upsertCustomer` / `deleteCustomer`
  ajoutés à `admin-store` de façon strictement additive, et refus de suppression
  d'un client ayant des commandes actives.
- **Coupons** : édition ajoutée, en réutilisant la boîte de dialogue de création.
- **Account** : `handleSave` persiste réellement le profil (il affichait un succès
  sans rien enregistrer).
- **Builder** : ajout au panier, contrôles de compatibilité socket/mémoire
  (bloquants) et alimentation (avertissement).
- **SEO** : Helmet sur les 7 pages manquantes, `noindex` cohérent avec `robots.txt`,
  JSON-LD `Product`, et **11 canoniques passées en URL absolues** (elles étaient
  toutes relatives, donc inopérantes).
- **i18n** : 25 clés ajoutées aux trois dictionnaires (**406 clés × 3, parité
  vérifiée**), écran de maintenance et gardes d'`App.tsx` internationalisés.
- **Médias** : budget de 3 Mo affiché en permanence, refus explicite au-delà, et
  **vérification que l'écriture a réussi** — le dépassement de quota était avalé
  en silence par le `catch {}` de `saveState()`.
- **Images** : 19 visuels convertis en WebP, 469 → 288 Ko (**−38,5 %**), script
  réutilisable `scripts/convert-to-webp.ts`, originaux conservés hors du build.
- **RTL** : classes physiques corrigées dans l'en-tête, le configurateur, la fiche
  produit et les vues de détail.

#### Chemin critique

**179,5 → 186,2 kB gzip (+6,7 kB).** Hausse assumée : les permissions, 25 clés de
dictionnaire, la logique de compatibilité et le JSON-LD sont du code neuf. Les
images, elles, sont hors chemin critique et gagnent 181 Ko.

#### Incident de méthode — à porter dans AGENTS.md §6

L'agent du groupe G3 a committé **trois fichiers appartenant au groupe G1**
(`ProductForm`, `ProductDetail`, `Inventory`, commit `2d98640`) en utilisant un
`git add` trop large. Aucun travail n'a été perdu, mais deux de ces fichiers ont
échappé au contrôle de formatage de leur propriétaire et ont cassé le lint.

**Règle à ajouter** : `git add` ne doit JAMAIS recevoir de répertoire ni de motif —
uniquement la liste explicite des fichiers du périmètre assigné.

#### Reste à faire — actions humaines

- [ ] **Porte humaine** : tester les permissions en se connectant avec chaque rôle,
      et vérifier le rendu RTL arabe sur les formulaires.
- [ ] **Relecture des traductions arabes** par un locuteur, en particulier
      `bp.compat.*` (terminologie matérielle), `bp.page.title` et `maintenance.admin`.
- [ ] **Logo en SVG** : la conversion WebP fait passer le logo de 68 à 35 Ko, mais
      une vectorisation fidèle n'est pas automatisable — à confier à un graphiste.

---

## 6. Phase 2 — Isolation et commutation des mocks

**Branche dédiée** : `chantier/phase-2-provider`.

**Clé de voûte du projet.** `src/api/config.ts` promet aujourd'hui une bascule
mock→http qui est **architecturalement fausse** : aucun fichier UI n'importe
`@/api`. Cette phase rend la promesse vraie.

| Vague | Agent                  | Tâche                                                                                                                      |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 2.1   | orchestrateur **fort** | Concevoir l'interface du fournisseur de données, la consigner dans `docs/`                                                 |
| 2.2   | **fort** (S1)          | Pilote de bout en bout sur les produits : provider mock + http + une page migrée                                           |
| 2.2   | **fort** (S3)          | Dégradation gracieuse + journal des échecs                                                                                 |
| 2.3   | 5 × intermédiaire (S2) | Créer les 10 ressources manquantes (categories, brands, coupons, blog, media, users, analytics, inventory, crm, customers) |
| 2.3   | intermédiaire          | 3 endpoints déclarés non implémentés : stock produit, suppression commande, avis accueil                                   |
| 2.3   | intermédiaire          | Corriger `ordersApi.mine()` qui retourne toutes les commandes de tous les clients                                          |
| 2.4   | 6 × intermédiaire (S2) | Migrer les 65 fichiers UI, périmètres disjoints par dossier                                                                |
| 2.5   | **fort**, solo         | Réécrire `auth.tsx` sur `authApi` ; aligner `MockUser` sur `AuthSession` (supprimer `user_metadata`)                       |
| 2.6   | minimal                | Règle ESLint interdisant l'import direct d'`admin-store` depuis `pages/` et `components/`                                  |
| 2.6   | intermédiaire          | Rendre `VITE_API_MODE` effectif + indicateur de mode en développement                                                      |
| 2.7   | intermédiaire (S9)     | Audit de cohérence : chaque champ des types ↔ chaque porte d'entrée de l'API                                               |

---

### Phase 2 — LIVRÉE le 5 août 2026 (branche `chantier/phase-2-provider`)

**Vagues 2.1 à 2.7 terminées.** ~40 commits, 21 agents. Commande de vérité verte :
`lint` 0 erreur, `tsc --noEmit` 0 erreur, `prettier --check` vert, `build` sans
avertissement.

#### Résultat

|                                              | Avant      | Après              |
| -------------------------------------------- | ---------- | ------------------ |
| Fichiers UI important `@/api` ou le provider | **0 / 76** | **62 / 62**        |
| Ressources provider (mock + http)            | 0          | **24**             |
| Ressources API                               | 5          | **14**             |
| Endpoints implémentés                        | 32 / 70    | **63 / 70 (90 %)** |

La promesse de `src/api/config.ts` — « il suffit de passer `VITE_API_MODE=http` » —
est désormais **vraie**, et verrouillée par une règle ESLint.

#### La décision d'architecture

62 fichiers importaient `admin-store`, dont **60 le même hook synchrone
`useAdminState()`**. Réponse : une **forme de retour uniforme**
`{ data, loading, error, refetch }` dans les deux modes, avec `loading: false`
immédiat en mock. Un composant s'écrit une fois et ne sait jamais dans quel mode
il tourne. `useAdminState()` reste fonctionnel (skill S11) — la migration a donc
pu se faire fichier par fichier sans jamais casser l'application.

#### L'audit S9 a rattrapé 7 bloquants

La skill S9 existe pour ce moment précis : après un enrichissement mené par
7 agents en parallèle, vérifier que le tout est cohérent. Elle a produit
21 constats, dont 7 bloquants, tous corrigés :

1. **Repli silencieux vers le store en mode http** (`about-values`,
   `ticker-messages`, `marquee-brands`) — le défaut le plus grave : basculer en
   `http` aurait renvoyé des données locales **sans le dire**. Indétectable en
   recette, il aurait été découvert en production. Remplacé par un échec explicite.
2. **Lignes de commande corrompues** en mock : `name = productId` et `price = 0`,
   ce qui cassait factures, récapitulatifs et chiffre d'affaires.
3. **Divergence de filtrage** entre mock et http sur le filtre `use` : la page
   Catégorie ne renvoyait pas les mêmes produits selon le mode.
4. Une **lecture envoyée en `PATCH`** (`couponsApi.detail`).
5. Une **lecture directe de la variable d'environnement** contournant le point unique.
6. `ordersApi.remove` déclaré mais absent.
7. Endpoints de mutation des réglages non déclarés.

Corrigé en outre à la source : **`ordersApi.mine()` renvoyait toutes les commandes
de tous les clients** — une fuite entre clients.

#### Autres acquis

- **`auth.tsx` passe par `authApi`** en mode http ; le type de session est aligné
  sur le contrat (`{ id, email, name?, phone?, role }`), et l'héritage Supabase
  `user_metadata` est supprimé — avec une lecture de rétrocompatibilité qui évite
  de déconnecter les sessions existantes.
- **Règle ESLint** interdisant l'import direct d'`admin-store` depuis `pages/` et
  `components/`, avec une liste d'exceptions explicites, chacune commentée et
  datée de la phase qui la supprimera.
- **Indicateur de mode** en développement, affichant aussi le nombre d'échecs de
  ressources journalisés — pour qu'une dégradation gracieuse cesse d'être muette.

#### Incident d'infrastructure

L'agent du groupe M6 est tombé sur une coupure réseau en pleine migration. Son
lot 1 était committé, son travail sur `Settings.tsx` était sur disque. Un **agent
de reprise** (`AGENTS.md` §3.6) a repris le fichier en l'état plutôt que de le
réécrire — et y a d'ailleurs trouvé des noms de méthodes erronés que le
prédécesseur n'avait pas eu le temps de corriger. Rien n'a été repayé.

#### Chemin critique

**186,2 → 191,2 kB gzip (+5,0 kB)**, le coût du socle du provider. À mettre en
regard du gain de la phase 4, où le jeu de données mock quittera le bundle.

#### Reste — dette assumée et documentée

- 15 imports de valeurs d'`admin-store` subsistent, tous justifiés et sous
  exception ESLint commentée : opérations de réinitialisation locale sans
  équivalent serveur, plomberie de permissions, et deux petits manques du
  provider (`resetSiteContentSection`, `addNotification`) à combler en phase 3.
- `sort` / `order` ne sont implémentés dans aucun des deux modes — fonctionnalité
  manquante commune, pas une divergence.
- Les 14 constats non bloquants de `docs/AUDIT-MODELE-API.md`.
- Les limites de `docs/DATA-PROVIDER.md` §7, dont la plus structurante :
  **les configurations du configurateur ne seront pas résolubles en http**
  (`customBuild` n'existe que localement). Panier et paiement en dépendent —
  décision d'architecture à prendre en phase 4.

---

## 7. Phase 3 — Solde du travail Lovable

| Vague | Agent                  | Tâche                                                                                         |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------- |
| 3.1   | **fort** (S1, S11)     | `Product.name`, `.specLine`, `.specs` en `Localized` + migration douce                        |
| 3.2   | intermédiaire (S11)    | `BlogPost.title`, `.excerpt`, `.content` en `Localized`                                       |
| 3.2   | 2 × intermédiaire (S2) | Éditeurs admin produits et blog en 3 onglets FR/EN/AR — pilote existant : `admin/Content.tsx` |
| 3.3   | 3 × intermédiaire (S7) | Traductions EN/AR des 12 produits et 5 articles seed                                          |
| 3.3   | minimal                | Supprimer `tr()` (`products.ts:41`) et le re-export de `Hero.tsx:119-120`                     |
| 3.3   | minimal                | Nettoyer la règle ESLint TanStack orpheline + `project.json`                                  |

**Porte humaine** : relecture des traductions par un locuteur + test visuel RTL.

---

### Phase 3 — LIVRÉE le 5 août 2026 (branche `chantier/phase-3-i18n`)

**14 commits, 13 agents en 4 vagues.** Commande de vérité verte : `lint`
0 erreur, `tsc --noEmit` 0 erreur, `prettier --check` vert, `build` sans
avertissement.

#### Le reliquat Lovable est soldé

`.lovable/plan.md` (Lot 2) prévoyait des données produits et blog multilingues,
et le Lot 3 des éditeurs à trois onglets. Les deux sont faits :

- `Product.name`, `.specLine` et les valeurs de `.specs` en `Localized<string>`.
- `BlogPost.title`, `.excerpt`, `.content` idem.
- Traductions EN/AR produites pour les 12 produits et les 5 articles.
- Éditeurs **FR / EN / AR** dans la fiche produit et l'article, copiés du pilote
  `admin/Content.tsx`, avec point ambré signalant une traduction manquante.

#### La propriété qui a rendu la migration sûre

`Localized<T> = T | { fr; en?; ar? }` **inclut le type nu**. Changer
`name: string` en `name: Localized<string>` n'a donc invalidé **aucune donnée
existante** — migration douce, skill S11. Et `tsc --noEmit` a **énuméré
lui-même les 37 sites de rendu à corriger, sur 14 fichiers** : la liste de
tâches n'a pas eu à être établie à la main.

#### Décisions d'architecture prises

**Recherche et tri.** Chercher dans **les trois variantes**, afficher dans la
langue active, trier sur la valeur affichée. Un client algérien tape
indifféremment en français, en arabe ou en anglais ; un « aucun résultat »
injustifié est une vente perdue.

**Empreintes historiques.** Les commandes, mouvements de stock et avis figent le
nom du produit dans un champ `string` **nu**, la langue étant résolue **à
l'écriture**. Ces champs n'ont volontairement pas été élargis en `Localized` :
une facture doit conserver le libellé du moment de l'achat, et ne pas changer
rétroactivement si le commerçant ajoute une traduction six mois plus tard. En
phase 4, ce sont de simples colonnes SQL et des snapshots JSON immuables.

**Ce qui ne se traduit pas.** Seul le langage naturel est traduit : 4 champs
sur ~100 côté produits. « Intel Core i9-13980HX » ou « 32GB DDR5 » restent des
chaînes nues — en fabriquer trois copies identiques serait du bruit.

**Formulaires non destructifs.** Avant même les onglets, `ProductForm` et
`BlogForm` ont reçu `mergeLocalized()` : une chaîne nue ne peut jamais écraser
un objet multilingue existant. C'est ce qui a garanti que la vague des onglets
ne trouverait pas des traductions déjà détruites.

#### Deux bugs attrapés au passage

1. `logAudit(\`produit ${p.name}\`)`dans`adjustStock` aurait écrit
**`[object Object]`\*\* dans le journal d'audit dès qu'un produit reçoit une
   traduction.
2. Le JSON-LD `Product` et `Article` recevait des objets au lieu de chaînes —
   les données structurées seraient devenues invalides pour Google.

#### Nettoyage

Vestiges supprimés : le re-export de contournement dans `Hero.tsx` et la règle
ESLint orpheline visant TanStack Start. `.lovable/project.json` a été laissé
intact volontairement : sa valeur `template` est fausse, mais elle est lue par
un outil externe et une valeur inventée risquerait de casser la synchronisation.

Les deux manques du provider sont comblés (`resetSection`, `create` de
notification), et **les deux exceptions ESLint correspondantes retirées** — le
lint reste vert sans elles, ce qui prouve la disparition des imports directs.
Il ne reste que **9 imports de valeurs** d'`admin-store` dans l'UI, tous
justifiés : réinitialisation locale et plomberie de permissions.

#### Chemin critique

**191,2 → 192,6 kB gzip (+1,4 kB)** — le coût des traductions embarquées.

#### Reste — action humaine

- [ ] **Relecture arabe** : `docs/RELECTURE-TRADUCTIONS.md` couvre désormais
      l'interface (22 clés), le catalogue et les 5 articles. Un arbitrage
      éditorial y est signalé : la version arabe de l'article
      `livraison-58-wilayas` est **plus riche** que les versions française et
      anglaise.

---

## 8. Phase 4 — Persistance SQLite et JSON

**Branche dédiée** : `chantier/phase-4-api`.
**Prérequis bloquant** : test WAL chez l'hébergeur (cf. §1).

| Vague | Agent                  | Tâche                                                                                                        |
| ----- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 4.1   | orchestrateur **fort** | Schéma des 21 tables + `outbox` ; note d'architecture                                                        |
| 4.2   | **fort** (S1)          | Pilote complet sur les produits : PDO, PRAGMA WAL, `busy_timeout`, stock atomique en transaction `IMMEDIATE` |
| 4.3   | 5 × intermédiaire (S2) | Répliquer les endpoints des autres ressources                                                                |
| 4.4   | **fort** (S13)         | Sessions PHP, cookie `httpOnly`, Argon2id                                                                    |
| 4.5   | intermédiaire          | Outbox vidée en fin de requête HTTP (pas de CRON), snapshots de facture JSON immuables                       |
| 4.5   | intermédiaire          | Stockage des images en fichiers (abandon du base64)                                                          |
| 4.5   | intermédiaire          | Emails transactionnels SMTP (PHPMailer)                                                                      |
| 4.6   | intermédiaire (S7)     | Script de migration des données seed vers SQLite                                                             |
| 4.7   | **fort**               | Emplacement hors `public_html`, `.htaccess`, fallback SPA, sauvegarde                                        |
| 4.8   | intermédiaire (S14)    | Documentation de déploiement et d'exploitation                                                               |

### Transactions — règle absolue

Aucun appel réseau à l'intérieur d'une transaction. Les intégrations passent
par l'outbox, qui est précisément ce qui garde les transactions courtes.

```php
$db->beginTransaction();
  creerCommande();
  $db->prepare('INSERT INTO outbox (event, payload) VALUES (?, ?)')
     ->execute(['order.created', json_encode($data)]);
$db->commit();
// l'émission des emails se fait en fin de requête via register_shutdown_function()
// -- pas de CRON nécessaire pour une petite boutique
```

---

### Phase 4 — EN COURS (branche `chantier/phase-4-api`)

#### Vague 4.1 — LIVRÉE : la fondation

3 commits, 1 agent fort. **23 tables, 184 colonnes, 25 index**, installées pour
de vrai sur les **trois pilotes**.

Validé à froid par l'orchestrateur, pas sur rapport : `install.php` exécuté sur
SQLite, MySQL et PostgreSQL, seed appliqué, serveur lancé, et `GET /products`
interrogé en HTTP réel sur les trois. Même enveloppe, même pagination, y compris
sur une recherche en arabe dans les champs `Localized`. `/health` confirme le
pilote actif, 404 et 405 sont bien enveloppés.

Le vérificateur de parité des schémas (`api/tools/verifier-parite-schema.php`)
passe sur les **trois** fichiers de schéma, et il a été **testé en négatif** :
en modifiant une nullabilité et en retirant un index, il signale les deux écarts
et échoue. Il entrera dans la CI.

> **Dette technique identifiée le 8 août 2026 — tri non identique entre moteurs.**
> `GET /brands` (et toute liste triée par colonne texte) renvoie les résultats
> dans un ordre différent selon le moteur :
>
> - SQLite (tri binaire) : `ASUS, Apple, Dell, HP, KA Build, Lenovo, Samsung, Xiaomi`
> - PostgreSQL (tri binaire) : `ASUS, Apple, Dell, HP, KA Build, Lenovo, Samsung, Xiaomi`
> - MySQL/MariaDB (`utf8mb4_unicode_ci`, insensible à la casse) : `Apple, ASUS, Dell, HP, KA Build, Lenovo, Samsung, Xiaomi`
>
> Cause : `utf8mb4_unicode_ci` traite `A` et `a` comme équivalents pour le tri ;
> SQLite et PostgreSQL font un tri binaire (majuscule `A` < minuscule `a`).
> `api/tools/verifier-parite-schema.php` ne le détecte pas : il compare la
> **structure** (23 tables, 184 colonnes, 25 index), pas le **comportement de tri**.
> Écart non bloquant pour la vague 4.8 (l'ordre d'affichage dans l'admin est
> cosmétique), à traiter dans une vague ultérieure avec `COLLATE` explicite ou
> normalisation des noms.

#### Décision : aucune dépendance Composer

Ni Slim, ni `vendor/`. Un routeur maison couvre les 70 routes du contrat.
Motif : l'hébergement n'est pas acquis, et téléverser plusieurs mégaoctets de
dépendances dont la compatibilité avec la version PHP de l'hébergeur est
inconnue est exactement la surprise que le commanditaire veut éviter. Déployer
revient à copier le dossier `api/`.

#### Le piège trouvé en exécution, pas en raisonnement

Avec `ATTR_EMULATE_PREPARES=false`, **MySQL refuse un paramètre nommé réutilisé**
là où SQLite l'accepte sans broncher. Le filtre de recherche fonctionnait donc
en SQLite et échouait en MySQL. Corrigé, et consigné comme piège n°1 de
`docs/BACKEND.md`.

C'est la justification concrète du double pilote : ce défaut n'aurait été
découvert qu'en production sur un hébergeur MySQL. Avoir les deux moteurs
installés en développement l'a fait apparaître immédiatement.

#### Trois écarts assumés, consignés dans `docs/BACKEND.md` §9

1. `home_reviews` n'est pas une table mais une section JSON de `site_content` —
   contenu éditorial semi-structuré, conforme à la répartition SQLite/JSON.
2. `categories.label` et `.description` restent en TEXTE et non en JSON :
   `AdminCategory` les déclare en `string` nu, les passer en `Localized`
   exigerait de toucher au frontend. À arbitrer avec la vague `/categories`.
3. Les `DEFAULT ''` sur colonnes TEXT ont été retirés des deux schémas, MySQL
   les interdisant.

#### Vagues 4.2 à 4.7 — LIVRÉES (vague en cours au 6 août 2026)

- [x] 4.2 — contrôleurs de toutes les ressources livrés
- [x] 4.3 — authentification : sessions PHP, cookie `httpOnly`, Argon2id avec repli bcrypt
- [x] 4.4 — décompte de stock atomique en transaction, anti-survente prouvé sur les trois pilotes
- [x] 4.5 — outbox vidée en fin de requête (pas de CRON), snapshots de facture JSON immuables,
      téléversement de médias, emails SMTP, limitation de débit sur `/auth/login`
- [x] 4.6 — script de migration des données seed (`api/tools/importer-donnees-front.php`, `semer-demo.php`)
- [x] 4.7 — emplacement hors `public_html`, `.htaccess`, sauvegarde avec vérification de contenu

**Livraisons supplémentaires non prévues au plan :**

- Pilote `pgsql` (PostgreSQL, Supabase) — voir §9 ter.
- Moteur de migration à six directions (`api/src/Migration/`, `api/tools/migrer.php`).
- Page `/admin/developpeur` : état de la base, sauvegarde téléchargeable, migration assistée.
- Routes `GET /maintenance/status`, `GET /maintenance/backup`, `POST /maintenance/migrate`
  (rang `owner`).
- Vérificateur de parité des trois schémas (`api/tools/verifier-parite-schema.php`).

#### Vague 4.8 — EN COURS (mise à jour 8 août 2026)

**Documentation mise à jour** (agent intermédiaire, périmètre : `README.md`,
`docs/DEPLOIEMENT.md`, `api/.env.example`, `PLAN.md`) :

- `README.md` §"Où vit la base de développement" : section entièrement
  réécrite. Le tableau des chemins OS (`%LOCALAPPDATA%`, `~/Library/…`,
  `~/.local/share/…`) était FAUX depuis la migration dans `katech-data/`. La
  phrase "le script refuse tout emplacement sous htdocs" était FAUSSE : il
  détecte, protège, et avertit honnêtement — il ne refuse que si les protections
  ne peuvent pas être posées sur un emplacement dangereux. La commande PowerShell
  `Remove-Item $LOCALAPPDATA\ka-tech` pointait vers un dossier qui n'existe plus.
  Ajout de la note "ceci concerne uniquement le dev" (en production : hors racine
  web). Ajout de `index.php` dans l'arborescence de déploiement avec note PHP
  obligatoire à la racine.

- `docs/DEPLOIEMENT.md` §4 : `index.php` ajouté à l'arborescence cible
  (manquant alors que le fichier existe dans `public/`). Troisième règle ajoutée
  : PHP actif à la racine, déploiement en sous-dossier, nuance build vs
  commerçant.

- `api/.env.example` : titre de la section Outbox reformulé — "CRON d'émission
  des événements" impliquait qu'un CRON est nécessaire, alors que l'émission se
  fait en fin de requête depuis la vague 4.5. `vider-outbox.php` est un outil de
  réessai manuel.

**Correctifs livrés le 8 août 2026 :**

- Pagination (`69f881c`) : 15 providers paginés transmettent désormais
  `perPage: 100`. Risque de troncature silencieuse à 20 éliminé. Le harnais
  `scripts/conformite-api.ts` a été mis à jour en conséquence : 0 risques
  latents contre 15 avant.
- Médias (`4b800d4`) : route `PATCH /media/:id` ajoutée. `.mediaAssets` passe
  conforme (sonde PATCH → 404, non 405 comme avant).
- Migration : cause réelle d'un échec de connexion rendue visible
  (`deb0ba6`).
- CI (`f352758`) : harnais de conformité entré dans le workflow GitHub Actions
  (branches `chantier/*`).
- Instruments de mesure (`docs/CONFORMITE-API.md`, `PLAN.md`,
  `scripts/conformite-api.ts`, `api/.htaccess`) : mis à jour pour refléter la
  réalité mesurée le 8 août — 26/27 conformes, 0 risques latents, 98 routes,
  dette de tri identifiée (voir §8 vague 4.1).

**Ce qui reste :**

- [ ] 4.8 — bascule `VITE_API_MODE=http` et recette de bout en bout
- [ ] `.auditLogs` — écrire dans `audit_logs` depuis les contrôleurs de mutation,
      puis brancher `useAuditLogList()` (voir `docs/CONFORMITE-API.md` §2.1)

**Ce qui reste à documenter une fois les autres agents rentrés :**
les images du catalogue (`public/media/`) et les règles de cache
(`public/.htaccess`) sont en cours de modification par deux autres agents en
parallèle — leur état final n'est pas encore stabilisé et n'a pas été documenté
ici intentionnellement.

---

## 9. Phase 5 — Mise en production

| Vague | Agent         | Tâche                                                                                                  |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------ |
| —     | humain        | Démarches SATIM (à lancer en parallèle, hors chemin critique)                                          |
| 5.1   | **fort**      | Prérendu au build pour l'indexabilité sans SSR                                                         |
| 5.2   | intermédiaire | Paiement à la livraison comme mode principal                                                           |
| 5.3   | minimal       | CI (avancée en phase 0)                                                                                |
| —     | humain        | Déploiement sur sous-domaine de recette, recette du tunnel d'achat, test de sauvegarde et restauration |

---

## 9 bis. Décision d'architecture backend — 5 août 2026

### Objectif retenu

**Les deux canaux, priorité à la boutique complète.**

1. **Boutique réelle** (prioritaire) : comptes clients, historique et suivi de
   commandes, back-office alimenté par de vraies données.
2. **WhatsApp** (complémentaire) : canal de commande alternatif, déjà présent
   dans le configurateur, à étendre au tunnel d'achat comme second bouton.

### Le fait qui a tranché

Un navigateur **ne peut pas écrire sur le serveur** — c'est la nature de HTTP,
pas une limitation contournable. Toute écriture (commande, compte, stock,
message) exige un programme qui tourne côté serveur. Les lectures, elles, n'en
exigent aucun.

### Retenu

**PHP 8.2 + Slim 4 + SQLite côté serveur**, pour trois raisons :

- Le moteur PHP est **déjà installé** chez l'hébergeur mutualisé : rien à
  démarrer, rien à maintenir, aucun risque de déploiement.
- Les données restent **la propriété du commerçant** : un fichier `.sqlite`
  téléchargeable à volonté, sans dépendance ni abonnement.
- Coût récurrent nul.

**TypeScript serveur : écarté définitivement (5 août 2026).** L'hébergeur
déclare Node.js « supporté mais **non garanti** ». Pour un backend — le
programme qui doit tourner en permanence et détenir les commandes — un runtime
non garanti est disqualifiant : c'est un risque de panne sans recours sur la
partie la plus critique. Le bénéfice des types partagés entre front et back ne
compense pas ce risque. **La question est close, ne pas la rouvrir.**

### Écartées, et pourquoi

**SQLite lu dans le navigateur** (`sql.js` / WebAssembly). Techniquement
valide, mais disproportionné ici : le moteur pèse **~400 kB gzip** pour
interroger un catalogue de **9 kB**. Un `catalogue.json` statique rend le même
service pour quelques kilo-octets. La phase 0 a fait tomber le premier
chargement à 179 kB gzip — cette option l'aurait plus que doublé.
**Seuil de reconsidération : plusieurs milliers de produits**, quand un index
SQL bat un `Array.filter()` et qu'on ne veut plus tout charger.

**Backend externe** (Supabase, PocketBase…). Écarté : les données quitteraient
l'hébergement, avec dépendance à un tiers et coût récurrent.

**Vitrine WhatsApp seule.** Écartée comme cible unique : elle rendrait sans
objet une bonne partie des 35 pages d'administration déjà construites. Conservée
comme canal complémentaire.

### Conséquence sur les phases 0 à 2

**Aucune.** Le contrat (`docs/API-CONTRACT.md`), `src/api/endpoints.ts`, le
client HTTP et la couche `src/data-provider` sont agnostiques du langage
serveur. Le frontend ne change pas d'une ligne.

---

## 9 ter. Phase 6 — troisième pilote et migration assistée (décidée le 6 août 2026)

**Séquencement retenu** : après la bascule `http`, pas avant. Un moteur de
migration ne se teste sérieusement que contre un système qui tourne déjà avec de
vraies données ; le construire à vide reviendrait à le valider sur rien.

### Portée

1. **Pilote `pgsql`** — un troisième dialecte SQL derrière PDO, comme SQLite et
   MySQL. Il ouvre Supabase, mais aussi Neon, Railway ou tout PostgreSQL : pas
   d'enfermement chez un fournisseur.
2. **Moteur de migration** entre les trois pilotes, avec comptages de contrôle.
3. **Menu « développeur »** dans l'administration : choisir et changer de base
   après déploiement.

### Pourquoi le pilote SQL et non l'API HTTPS de Supabase

L'API HTTPS de Supabase (PostgREST) **n'a pas de transactions multi-requêtes**.
La création de commande — décompte de stock, commande, lignes, mouvement,
outbox — deviendrait cinq appels web sans annulation possible. Le refus de
survente, prouvé sous six commandes concurrentes, serait perdu.

Le retrouver exigerait de réécrire la logique de commande **en PL/pgSQL chez
Supabase** : déplacer le cœur métier hors du projet, dans un autre langage, chez
un tiers. Coût estimé 15-20 h contre 4 h, pour un seul avantage — fonctionner si
l'hébergeur bloque le trafic sortant hors HTTP.

Or dans ce cas, SQLite et MySQL restent disponibles et testés. Supabase serait
simplement indisponible, jamais bloquant.

**Note** : Supabase Auth et les Row Level Security ne sont pas utilisés.
L'authentification PHP par session reste maîtresse. Supabase sert de base de
données hébergée, pas de plateforme.

### Garde-fous imposés au menu développeur

Une interface web qui change la base de production et réécrit la configuration
serveur est l'outil le plus dangereux du projet. Non négociable :

- **Propriétaire uniquement**, jamais un administrateur
- **Sauvegarde automatique** avant toute migration
- **Simulation d'abord** : compter et valider sans écrire
- **Test de connexion** à la cible avant toute bascule
- **Les identifiants ne transitent jamais vers le navigateur**
- **Réversible** : l'ancienne base reste intacte, bascule après vérification des comptages

### Effort

| Lot                                       | Agent     |
| ----------------------------------------- | --------- |
| Pilote `pgsql`, 3ᵉ schéma, parité à trois | 4 h       |
| Moteur de migration                       | 5 h       |
| Menu développeur et garde-fous            | 5 h       |
| Recette des 6 chemins de migration        | 3 h       |
| **Total**                                 | **~17 h** |

### Décision : pas de CRON pour l'outbox — 6 août 2026

L'outbox a été conçue pour être vidée par un CRON toutes les 5 minutes.
**Le CRON a été supprimé.** À la place, l'outbox est vidée en fin de la
requête HTTP qui crée la commande, via `register_shutdown_function()` :
la réponse est envoyée au client, puis les emails partent dans la foulée,
invisibles pour l'acheteur.

**Motif** : le client (commerçant algérien, petite boutique) ne veut pas
gérer une tâche planifiée. Un CRON mal configuré ou désactivé par l'hébergeur
ne serait pas diagnostiqué facilement — les commandes ne recevraient jamais
de confirmation. En émettant en fin de requête, la chaîne est directe et
observable : si un email échoue, il reste en file `pending` et
`GET /maintenance/status` le signale.

**Limite connue** : sur le serveur intégré `php -S` (développement), le
client attend la fin de l'envoi. En production avec LiteSpeed/FastCGI,
`fastcgi_finish_request()` libère le navigateur avant l'envoi.

`api/tools/vider-outbox.php` reste disponible comme outil de réessai manuel.

---

## 10. Décisions prises

| Décision                 | Choix                                                                                                  | Date        |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ----------- |
| Base de données          | SQLite (transactionnel) + JSON (immuable et semi-structuré)                                            | 5 août 2026 |
| Backend                  | PHP 8.2 sans framework ni Composer — aucune dépendance à installer sur le serveur                      | 5 août 2026 |
| Authentification         | Sessions PHP + cookie `httpOnly` (déjà anticipé par `VITE_API_AUTH=cookie`)                            | 5 août 2026 |
| Branches                 | Phases 2 et 4 sur branche dédiée, fusion après commande de vérité                                      | 5 août 2026 |
| Paiement au lancement    | Paiement à la livraison seul ; SATIM ultérieurement                                                    | 5 août 2026 |
| Backend                  | **PHP 8.2 + routeur maison + SQLite/MySQL/PostgreSQL — définitif.** Node « supporté mais non garanti » | 5 août 2026 |
| Canaux de vente          | Boutique complète prioritaire, WhatsApp complémentaire                                                 | 5 août 2026 |
| SQLite navigateur        | Écarté : 400 kB de moteur pour 9 kB de données                                                         | 5 août 2026 |
| Pilote pgsql             | Ajouté — pilote SQL direct, PAS l'API HTTPS PostgREST (voir §9 ter)                                    | 6 août 2026 |
| Outbox / CRON emails     | L'outbox est vidée en fin de requête HTTP. Pas de CRON pour les emails — décision explicite du client  | 6 août 2026 |
| Vérification sauvegardes | Par empreinte de CONTENU par table, pas seulement par structure                                        | 6 août 2026 |

## 11. Décisions ouvertes

- Admin en français uniquement, ou internationaliser les 35 pages (+2-3 h agent) ?
- Sortir le back-office du bundle visiteur (au-delà du code splitting) ?
- Volumétrie cible à 12 mois — confirme SQLite ou impose MySQL ou PostgreSQL.
- `categories.label` et `.description` : passer en `Localized` (exige de toucher
  le frontend — voir §8, écart §3 assumé).
