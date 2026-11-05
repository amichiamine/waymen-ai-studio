# PLAN D'IMPLÉMENTATION PHASE 18

## Grand Audit d'Assurance Qualité, Éradication des Angles Morts Vitrine & Consolidation Intégrale de la Persistance Serveur

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 05/11/2026  
**Branche Git :** `main`  
**Statut :** 📋 En attente de validation formelle

---

### 1. Contexte & Problématique

À la suite de la revue critique menée avec ArchiSys3.0 sur les Phases 10 à 17.1, un constat d'ingénierie s'impose :  
Bien que les blocages techniques ponctuels aient été résolus et que la chaîne de compilation/tests passe avec succès (`lint`, `tsc`, `build`), des **angles morts et noirs subsistent sous la surface** :

1. **Vitrine Asymétrique & Spécialisée :** La vitrine continue de refléter un magasin informatique :
   - L'en-tête ([`Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx)) affiche en dur _« Ordinateurs portables, Ordinateurs de bureau, Configurations, Smartphones »_ au lieu des catégories réelles créées en base.
   - La section _« Usages »_ ([`UseChips.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/UseChips.tsx)) affiche en dur _Gaming, Work, Study, Edit, Home_ et reste inerte (non cliquable) sur la page d'accueil.
   - Les cartes de catégories ([`CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx)) appliquent par défaut une photo de laptop (`DEFAULT_IMG.laptops`) à toute nouvelle catégorie sans image.
   - Les onglets vedettes ([`FeaturedTabs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/FeaturedTabs.tsx)) pointent en dur sur la catégorie `laptops`.
   - Les balises SEO, métas de partage et textes de réassurance de la fiche produit citent en dur _« KA Tech »_ et des promesses informatiques.
2. **Façade Mock en Administration :**
   - Dans [`Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx), 5 boutons « Réinitialiser » appellent encore `resetData(...)` du magasin `localStorage` au lieu de requêtes HTTP serveur réelles. En mode HTTP, le serveur n'est jamais sollicité et les données en base ne changent pas.
3. **Ergonomie & Parcours Produit :**
   - Sur la fiche produit visiteur ([`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx)), l'onglet actif par défaut est _« Spécifications »_ (pensé pour le hardware) au lieu de _« Description »_, et la description par défaut injecte un texte informatique figé.

---

### 2. Objectifs d'Ingénierie & Périmètre Chirurgical

1. **Dynamiser 100% de la navigation vitrine** depuis les données réelles du backend (`useCategoryList()`).
2. **Éliminer tout reliquat textuel informatique rigide** sur l'accueil, les catégories, les fiches produits et les balises SEO.
3. **Remplacer tous les appels résiduels à `resetData()`** dans le back-office par de véritables mutations réseau `HTTP` avec invalidation immédiate de cache (`invalidateAll()`).
4. **Appliquer une matrice de recette sur 3 profils types** (Mode/Habillement, Prestation/Services, High-Tech) pour garantir l'étanchéité absolue de l'universalité.

---

### 3. Découpage en Étapes d'Exécution

```
[ Phase 18 — Consolidation Intégrale 360° ]
  ├── Étape 18.A : Dynamisation Totale de l'En-tête & Catégories Vitrine
  │     ├── Header.tsx : Menu déroulant alimenté par useCategoryList()
  │     ├── CategoryCards.tsx : Placeholders et icônes neutres
  │     └── FeaturedTabs.tsx : Sélection dynamique de la 1ère catégorie réelle
  ├── Étape 18.B : Dé-spécialisation des Composants Accueil & Fiche Produit
  │     ├── UseChips.tsx & Index.tsx : Rendre dynamique ou masquer si non configuré
  │     ├── Product.tsx : Onglet Description par défaut, specs conditionnelles, SEO dynamique
  │     └── Index.tsx & About.tsx : Meta-description et titres interpolés
  ├── Étape 18.C : Raccordement HTTP Purge & Reset en Administration
  │     ├── Settings.tsx : Remplacement des 5 resetData() par les mutations serveur réelles
  │     └── Reset.tsx : Homogénéisation de l'import/export en mode HTTP
  ├── Étape 18.D : Couverture i18n Trilingue (FR, EN, AR)
  │     └── Synchronisation de l'ensemble des nouvelles clés
  └── Étape 18.E : Matrice de Recette 360°, CI & Livraison
        ├── bun run verifier-i18n
        ├── bun run format
        ├── bun run lint && bunx tsc --noEmit && bun run build
        └── Test réel sur 3 cas d'usage métiers
```

---

#### Étape 18.A : Dynamisation Totale de l'En-tête & Catégories Vitrine

1. **Menu Catégories dans [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx) :**
   - Utiliser `categories` issu de `useCategoryList()`.
   - Si des catégories existent en base : afficher dynamiquement les catégories réelles avec leur slug `/category/${slug}` et leur libellé trilingue `L(c.label)`.
   - Si aucune catégorie n'est encore créée : afficher un lien générique vers `/category` sans items fantômes.
2. **Cartes Catégories dans [`src/components/CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) :**
   - Remplacer le repli par défaut `DEFAULT_IMG.laptops` par un arrière-plan avec dégradé thématique et icône stylisée `LayoutGrid` ou `Package`, évitant d'afficher une photo d'ordinateur pour des catégories non-tech.
3. **Onglets Vedettes dans [`src/components/FeaturedTabs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/FeaturedTabs.tsx) :**
   - Initialiser l'onglet actif sur la première catégorie réellement disponible dans `categories` (ou dans `cfg.tabs` si présent).
   - Masquer élégamment la section si aucune catégorie ou aucun produit n'est associé.

---

#### Étape 18.B : Dé-spécialisation Accueil & Fiche Produit Visiteur

1. **Section Usages dans [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx) & [`src/components/UseChips.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/UseChips.tsx) :**
   - Conditionner l'affichage de `<UseChips />` sur la page d'accueil : ne l'afficher que si le module est pertinent ou relier chaque chip à la recherche `/search?use=${u.id}` pour que le clic soit enfin actif et fonctionnel !
2. **Fiche Produit dans [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) :**
   - Définir l'onglet actif par défaut sur `"desc"` (Description) au lieu de `"specs"`.
   - N'afficher l'onglet `"specs"` que si le produit possède des spécifications (`Object.keys(p.specs || {}).length > 0`).
   - Remplacer le texte générique figé `pd.desc` par la description réelle de l'article ou une formule universelle interpolant le nom de la boutique `{storeName}`.
3. **Balises SEO & Métas ([`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx), [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx)) :**
   - Dynamiser la balise `<meta name="description">` sur l'accueil à partir de `siteSettings.tagline` ou `siteSettings.storeName` (plus de texte statique sur les ordinateurs portables).

---

#### Étape 18.C : Raccordement Serveur Purge & Reset en Administration

1. **Dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) :**
   - `resetSettings()` : remplacer `resetData("siteSettings")` par un appel à la route serveur de réinitialisation `/api/v1/maintenance/reset` (cible `siteSettings`) ou mutation avec les paramètres d'usine, suivi de `invalidateAll()`.
   - Boutons de réinitialisation des sections visuelles (Ticker, Marquee, About, Builder) : brancher sur `/api/v1/maintenance/reset` (action `clear` ou `reset` selon la cible) avec invalidation complète du cache.
2. **Dans [`src/pages/admin/Reset.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Reset.tsx) :**
   - S'assurer que l'ensemble des actions de vidage unitaire et globale passe par `reinitialiserServeur()` en mode HTTP, sans aucun repli silencieux sur le `localStorage`.

---

#### Étape 18.D : Couverture i18n Trilingue (FR, EN, AR)

- Vérifier et enrichir les dictionnaires `catalogue`, `systeme`, `reglages` et `visiteur`.
- Validation via `bun run verifier-i18n` (0 divergence, 0 clé manquante).

---

#### Étape 18.E : Recette, Homologation & Packaging

1. **Tests sur 3 Profils Métiers :**
   - Profil Mode / Vêtements : création d'une catégorie "Robes", produit "Robe d'été", vérification de l'accueil, du menu header et de la fiche produit (0 mention d'ordinateur).
   - Profil Services : création d'une catégorie "Conseil", produit de type service, vérification des formulaires et de la grille specs repliée.
   - Profil High-Tech : vérification du maintien des fonctionnalités avancées (grille hardware dépliée, configurateur PC opérationnel).
2. **Commandes de Validation :**
   - `bun run verifier-i18n`
   - `bun run format`
   - `bun run lint && bunx tsc --noEmit && bun run build`
3. **Mise à jour du Journal :** Consignation officielle dans [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).
4. **Git Commit & Push.**

---

### 4. Matrice de Risques & Précautions

| Risque Identifié                                        |  Impact   | Mesure Préventive                                                                                      |
| :------------------------------------------------------ | :-------: | :----------------------------------------------------------------------------------------------------- |
| Rupture d'affichage si la liste des catégories est vide | 🟡 Moyen  | Repli gracieux avec affichage du bouton « Découvrir le catalogue » vers `/category`.                   |
| Conflit de cache React après reset serveur              | 🟡 Moyen  | Appel systématique à `invalidateAll()` couplé à une mise à jour d'état local réactif.                  |
| Altération accidentelle du configurateur PC             | 🟢 Faible | Le configurateur reste 100% fonctionnel lorsque `builderEnabled === true` et s'adapte automatiquement. |
