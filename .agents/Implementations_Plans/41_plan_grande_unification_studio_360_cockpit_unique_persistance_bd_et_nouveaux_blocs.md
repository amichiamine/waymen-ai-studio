# PLAN D'IMPLÉMENTATION — PHASE 41

## Grande Unification 360° du Studio Visuel : Cockpit Unique, Volets Rétractables, Correction Écrans Mobile/Tablette, Inspecteurs Ultra-Fins, Nouveaux Blocs Majeurs & Persistance Souveraine en BD

**Projet :** StacGate Platform (ka-tech)  
**Directeur & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 **En attente de validation formelle par ArchiSys3.0**

---

### 1. Contexte & Problématique

Suite au grand diagnostic partagé avec ArchiSys3.0, l'expérience du Studio Visuel doit franchir son ultime palier d'excellence en résolvant 5 verrous critiques :

1. **Encombrement de l'interface & Manque de respiration :** La disposition figée en 3 colonnes (3-6-3) compresse le visualiseur au centre. Les volets gauche et droit ne peuvent pas être repliés, empêchant de profiter d'un véritable grand écran de travail.
2. **Défaillance d'affichage sur les résolutions Mobile & Tablette :** L'usage de `my-auto` dans un conteneur Flexbox contraint en hauteur (`h-[720px]`) avec `overflow-hidden` et un `max-w-[768px]` inséré dans une colonne de 550px provoque un écrasement vertical et fait disparaître les composants dans les modes Mobile et Tablette.
3. **Inspecteurs de blocs trop légers :** Les inspecteurs de propriétés ne proposent que quelques champs textuels basiques, sans accès aux images (MediaPicker), aux boutons CTA, aux cartes de réassurance individuelles ni aux paramètres avancés existants dans les anciens formulaires.
4. **Catalogue de blocs incomplet pour les vitrines modernes :** Il manque des blocs fondamentaux (Bannière Parallaxe grand format, Grille de Fonctionnalités/Services, Tableau de Prix/Offres, Témoignage Vedette, Espaceur visuel).
5. **Fragmentation entre 4 onglets rivaux :** L'existence de 4 onglets dissociés (_Pages & Vues Composables_, _Sections de l'Accueil_, _En-tête & Footer_, _Mobile & Flottant_) disperse l'attention. L'administrateur doit tout piloter depuis un **Cockpit Unique 360°**, avec **Persistance Directe et Souveraine en Base de Données SQLite** (sans dépendance fragile à `localStorage`).

---

### 2. Objectifs d'Architecture & Garanties Zéro Régression

1. **Persistance Souveraine BD SQLite Directe (Zéro Dépendance LocalStorage) :**  
   Toutes les configurations de blocs, de styles, d'en-tête, de pied de page et de sections sont transmises directement à l'API backend (`PATCH /content`) et persistées physiquement dans la table SQLite `site_content`. Le `localStorage` n'est jamais utilisé pour stocker les contenus souverains de la plateforme.
2. **Volets Rétractables & Mode Plein Écran Zen :**
   - Boutons chevrons rétractables (`«` / `»`) sur le volet gauche (arborescence) et le volet droit (inspecteur).
   - Redistribution dynamique de la largeur du Canvas central :
     - Volets ouverts : 3 cols (gauche) / 6 cols (canvas) / 3 cols (droite).
     - 1 volet replié : 0 cols / 9 cols (canvas) / 3 cols (droite) ou inversement.
     - 2 volets repliés : **12 cols (100% Canvas Plein Écran Zen)**.
3. **Visualiseur Mobile & Tablette 100% Fonctionnel :**
   - Suppression du `my-auto` bloquant et révision du défilement dans `StudioLiveCanvas.tsx`.
   - Ajustement de l'espace de simulation : le conteneur central alloue l'espace suffisant pour afficher les 375px et 768px sans rognage ni écrasement.
4. **Enrichissement du Catalogue : 5 Nouveaux Blocs Majeurs :**
   - `features_grid` : Grille de 3 ou 4 fonctionnalités/services avec icônes Lucide, titres et textes.
   - `pricing_table` : Grille de plans tarifaires / devis avec prix, badges et listes d'avantages.
   - `quote_star` : Témoignage client d'impact / citation avec avatar, nom, entreprise et notation.
   - `full_width_banner` : Grande bannière d'impact avec image de fond, titre centré et bouton CTA.
   - `visual_spacer` : Espaceur visuel réglable (hauteur personnalisée et ligne séparatrice discrète).
5. **Inspecteurs Ultra-Fins avec MediaPicker Intégré :**
   - Intégration du sélecteur de médias (`MediaPickerField`) pour les images de fond et bannières.
   - Édition granulaire des listes (cartes de réassurance `why_us`, étapes `timeline`, questions `faq`, colonnes `pricing`).
6. **Cockpit Unique Réunifié :**
   - Intégration dans le Studio des accès et réglages directs pour l'En-tête (`Header`), le Ticker défilant, le Pied de page (`Footer`) et les boutons Flottants (`WhatsApp`/`Mobile Bar`), permettant de supprimer la redondance des 4 onglets.

---

### 3. Matrice des Nouveaux Blocs & Capacités de Configuration

| Nouveau Bloc            | Rôle Vitrine                                 | Données Raccordées dans l'Inspecteur                                                              | Styles Supportés                                     |
| :---------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------ | :--------------------------------------------------- |
| **`features_grid`**     | Présentation des services, piliers ou atouts | Titre de section, sous-titre, liste dynamique de cartes (icône, titre, description, lien).        | Padding, Fond de section, Colonnes (2, 3, 4).        |
| **`pricing_table`**     | Grille d'offres, tarifs ou devis             | Titre de section, plans (titre, prix, période, badge populaire, liste de points forts, lien CTA). | Padding, Fond contrasté, Centrage.                   |
| **`quote_star`**        | Preuve sociale percutante / Témoignage VIP   | Citation marquante, auteur, fonction/entreprise, avatar, étoiles (1-5).                           | Padding, Fond accentué ou sombre.                    |
| **`full_width_banner`** | Bannière d'impact / Hero secondaire          | Image de fond (MediaPicker), titre, sous-titre, bouton principal et bouton secondaire.            | Hauteur (compacte, standard, ample), Dégradé sombre. |
| **`visual_spacer`**     | Aération et structuration visuelle           | Hauteur en pixels (20px à 120px), Ligne séparatrice optionnelle (discrète/accentuée).             | Marge responsive.                                    |

---

### 4. Découpage des Étapes Chirurgicales

```
  [Étape 41.1] Création des 5 Nouveaux Blocs Majeurs & Enregistrement (types, components, registry)
         │
         ▼
  [Étape 41.2] Débogage Physique du Visualiseur Mobile & Tablette (StudioLiveCanvas.tsx)
         │
         ▼
  [Étape 41.3] Conception des Volets Rétractables & Mode Plein Écran Zen (PagesManager.tsx)
         │
         ▼
  [Étape 41.4] Inspecteurs Ultra-Fins avec MediaPicker & Raccordement des Blocs (BlockPropsEditor.tsx)
         │
         ▼
  [Étape 41.5] Unification Cockpit 360° & Persistance Souveraine BD SQLite (PATCH /content direct)
         │
         ▼
  [Étape 41.6] Batterie Qualité CI (i18n, tsc, lint, format), Compilation Vite & Empaquetage
```

#### Étape 41.1 : Création des 5 Nouveaux Blocs Majeurs & Enregistrement

- Étendre `BlockType` dans [`src/types/pages.ts`](file:///c:/xampp/htdocs/ka-tech/src/types/pages.ts) avec `features_grid`, `pricing_table`, `quote_star`, `full_width_banner`, `visual_spacer`.
- Développer les composants React dans `src/components/blocks/` :
  - `FeaturesGridBlock.tsx`
  - `PricingTableBlock.tsx`
  - `QuoteStarBlock.tsx`
  - `FullWidthBannerBlock.tsx`
  - `VisualSpacerBlock.tsx`
- Enregistrer les métadonnées et composants dans [`src/components/blocks/registry.ts`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/registry.ts) et [`src/components/blocks/index.ts`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/index.ts).
- Mettre à jour [`scripts/extraire-donnees-front.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/extraire-donnees-front.ts) pour garantir l'export propre de ces types.

#### Étape 41.2 : Débogage Physique du Visualiseur Mobile & Tablette

- Dans [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx) :
  - Éradiquer `my-auto` qui causait le collapse vertical dans le conteneur flex.
  - Revoir le système de défilement : conteneur scrollable externe `overflow-y-auto` avec cadre d'appareil responsive centré.
  - Adapter le comportement des colonnes pour que le mode Tablette (768px) dispose d'un espace réel non tronqué.

#### Étape 41.3 : Conception des Volets Rétractables & Mode Plein Écran Zen

- Dans [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) :
  - Introduire les états : `leftCollapsed` (booléen) et `rightCollapsed` (booléen).
  - Ajouter des boutons de rétractation à chevrons (`PanelLeftClose`, `PanelLeftOpen`, `PanelRightClose`, `PanelRightOpen`).
  - Gérer dynamiquement la grille :
    - `leftCollapsed ? "hidden" : "lg:col-span-3"`
    - `rightCollapsed ? "hidden" : "lg:col-span-3"`
    - Canvas central : calcule sa portée (`leftCollapsed && rightCollapsed ? "lg:col-span-12" : leftCollapsed || rightCollapsed ? "lg:col-span-9" : "lg:col-span-6"`).
  - Ajouter un bouton de raccourci "Plein Écran Zen" dans la barre d'outils du Studio.

#### Étape 41.4 : Inspecteurs Ultra-Fins avec MediaPicker & Raccordement

- Dans [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx) :
  - Intégrer [`MediaPickerField`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) pour les téléversements d'images (Hero, bannières, logos, avatars).
  - Rendre modulaires et éditables les cartes répétables de `why_us` (icônes, titres, textes).
  - Ajouter les formulaires d'édition complets pour les 5 nouveaux blocs.

#### Étape 41.5 : Unification Cockpit 360° & Persistance BD Directe

- Regrouper la gestion de l'En-tête, du Ticker, du Footer et des Flottants au sein du Studio Visuel comme des sections globales d'écran.
- Sauvegarde atomique directe sur l'endpoint backend `PATCH /content` alimentant SQLite, garantissant 0 régression et 0 donnée volatile dans `localStorage`.

#### Étape 41.6 : Batterie Qualité CI, Compilation Vite & Empaquetage

- `bun run verifier-i18n` (100% parité trilingue FR, EN, AR).
- `bunx tsc --noEmit` & `bun run lint` (0 erreur).
- `bun run format`.
- `bun run build ; bun run paqueter:data` (nouvelles archives horodatées).
- Mise à jour du journal `tracabilites.md`.
- Git commit et push sur `origin/main`.

---

### 5. Matrice de Recette & Validation

| Test                              | Comportement Attendu                                                                                                             | Statut Visé |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :---------: |
| **Persistance BD Directe**        | Toutes les modifications sont enregistrées directement en base SQLite via l'API, sans dépendance à `localStorage`.               | 🟡 Phase 41 |
| **Rétractation Volet Gauche**     | Cliquer sur le chevron gauche replie l'arborescence et agrandit le Canvas à 9 colonnes.                                          | 🟡 Phase 41 |
| **Rétractation Volet Droit**      | Cliquer sur le chevron droit replie l'inspecteur et libère 3 colonnes supplémentaires.                                           | 🟡 Phase 41 |
| **Mode Plein Écran Zen**          | Replier les deux volets permet au visualiseur d'occuper 100% de la largeur de l'écran (12 colonnes).                             | 🟡 Phase 41 |
| **Visualiseur Mobile (375px)**    | Le rendu mobile s'affiche parfaitement, avec textes, images et défilement vertical complet sans écrasement.                      | 🟡 Phase 41 |
| **Visualiseur Tablette (768px)**  | Le rendu tablette s'affiche à sa largeur réelle sans rognage.                                                                    | 🟡 Phase 41 |
| **5 Nouveaux Blocs**              | `features_grid`, `pricing_table`, `quote_star`, `full_width_banner`, `visual_spacer` s'insèrent et se configurent sans friction. | 🟡 Phase 41 |
| **MediaPicker dans l'Inspecteur** | Choisir une image depuis la galerie multimédia met à jour instantanément le visuel dans le Canvas.                               | 🟡 Phase 41 |
| **Cockpit Unique**                | L'exploitant pilote l'intégralité du site sans avoir besoin de naviguer entre 4 onglets disjoints.                               | 🟡 Phase 41 |
| **Batterie Qualité & Build**      | Typescript, ESLint, i18n et le build Vite passent avec 0 erreur.                                                                 | 🟡 Phase 41 |
