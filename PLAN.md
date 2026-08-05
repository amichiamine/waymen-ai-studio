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

| Couche                       | Choix                                                  |
| ---------------------------- | ------------------------------------------------------ |
| Runtime                      | PHP 8.2+                                               |
| Framework API                | Slim 4 (+ Composer)                                    |
| Persistance transactionnelle | **SQLite** (fichier unique, mode WAL)                  |
| Persistance JSON             | Factures figées, contenu éditorial, payloads d'outbox  |
| Authentification             | Sessions PHP + cookie `httpOnly`, hachage **Argon2id** |
| Emails                       | PHPMailer en SMTP                                      |
| Médias                       | Fichiers dans `public_html/uploads/`                   |
| Paiement au lancement        | **Paiement à la livraison** (SATIM ultérieurement)     |
| SEO                          | Prérendu au build (le SSR est impossible en mutualisé) |

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

### Prérequis hébergeur à vérifier (bloquant phase 4)

```php
<?php
$db = new PDO('sqlite:/home/user/katech-data/test.sqlite');
var_dump($db->query('PRAGMA journal_mode=WAL')->fetchColumn());
// attendu : "wal"   |   si "delete" → stockage NFS → basculer sur MySQL
```

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

## 8. Phase 4 — Persistance SQLite et JSON

**Branche dédiée** : `chantier/phase-4-api`.
**Prérequis bloquant** : test WAL chez l'hébergeur (cf. §1).

| Vague | Agent                  | Tâche                                                                                                             |
| ----- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 4.1   | orchestrateur **fort** | Schéma des 16 tables + `outbox` ; note d'architecture                                                             |
| 4.2   | **fort** (S1)          | Pilote Slim complet sur les produits : PDO, PRAGMA WAL, `busy_timeout`, stock atomique en transaction `IMMEDIATE` |
| 4.3   | 5 × intermédiaire (S2) | Répliquer les endpoints des autres ressources                                                                     |
| 4.4   | **fort** (S13)         | Sessions PHP, cookie `httpOnly`, Argon2id                                                                         |
| 4.5   | intermédiaire          | Outbox + CRON d'émission (Telegram, Notion)                                                                       |
| 4.5   | intermédiaire          | Snapshots de facture en JSON immuable                                                                             |
| 4.5   | intermédiaire          | Stockage des images en fichiers (abandon du base64)                                                               |
| 4.5   | intermédiaire          | Emails transactionnels SMTP (PHPMailer)                                                                           |
| 4.6   | intermédiaire (S7)     | Script de migration des données seed vers SQLite                                                                  |
| 4.7   | **fort**               | Emplacement hors `public_html`, `.htaccess`, fallback SPA, CRON de sauvegarde                                     |
| 4.8   | intermédiaire (S14)    | Documentation de déploiement et d'exploitation                                                                    |

### Transactions — règle absolue

Aucun appel réseau à l'intérieur d'une transaction. Les intégrations passent
par l'outbox, qui est précisément ce qui garde les transactions courtes.

```php
$db->beginTransaction();
  creerCommande();
  $db->prepare('INSERT INTO outbox (event, payload) VALUES (?, ?)')
     ->execute(['order.created', json_encode($data)]);
$db->commit();
// l'émission vers Telegram/Notion se fait hors transaction, par CRON
```

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

## 10. Décisions prises

| Décision              | Choix                                                                       | Date        |
| --------------------- | --------------------------------------------------------------------------- | ----------- |
| Base de données       | SQLite (transactionnel) + JSON (immuable et semi-structuré)                 | 5 août 2026 |
| Backend               | PHP 8.2 + Slim 4, contrainte du mutualisé                                   | 5 août 2026 |
| Authentification      | Sessions PHP + cookie `httpOnly` (déjà anticipé par `VITE_API_AUTH=cookie`) | 5 août 2026 |
| Branches              | Phases 2 et 4 sur branche dédiée, fusion après commande de vérité           | 5 août 2026 |
| Paiement au lancement | Paiement à la livraison seul ; SATIM ultérieurement                         | 5 août 2026 |

## 11. Décisions ouvertes

- Rester connecté à Lovable pendant les refontes des phases 2 et 4 ?
- Admin en français uniquement, ou internationaliser les 35 pages (+2-3 h agent) ?
- Sortir le back-office du bundle visiteur (au-delà du code splitting) ?
- Volumétrie cible à 12 mois — confirme SQLite ou impose MySQL.
