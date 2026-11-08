# PLAN D'IMPLÉMENTATION — PHASE 42

## Ergonomie & Réactivité 360° du Studio Visuel : Rétractabilité de la Barre Latérale Backstage, Navigation Dédiée Mobile/Tablette, Auto-Scroll Focalisé & Inspecteur Graphique Ultra-Fin

---

### 1. Contexte & Problématique

Suite au retour d'expérience terrain d'**ArchiSys3.0**, cinq dysfonctionnements et limitations ergonomiques majeurs ont été identifiés dans le Studio Visuel et le Backstage :

1. **Aperçu WYSIWYG sur écrans Mobile & Tablette (< 1024px) :**  
   La grille de mise en page retombe en une seule colonne verticale (`grid-cols-1`). Le panneau gauche (arborescence des blocs) s'étire sur 800px et refoule le visualiseur WYSIWYG tout en bas de la page, le rendant invisible sans défilement fastidieux.
2. **Manque de fluidité responsive générale :**  
   L'empilement 3-6-3 dans une grille fixe de 12 colonnes avec la sidebar du Backstage (256px) compresse excessivement la surface de conception centrale sur les écrans d'ordinateurs portables (1366px à 1440px).
3. **Sidebar principale du Backstage non rétractable :**  
   `<AdminSidebar />` est figée à `w-64` (256px) sans mode compact ni bascule de repli.
4. **Absence d'auto-scroll vers le bloc sélectionné :**  
   Cliquer sur un bloc dans l'arborescence sélectionne bien le bloc visuellement (bordure bleue), mais ne fait pas défiler le conteneur du visualiseur pour le centrer à l'écran.
5. **Inspecteur droit encore trop limité :**  
   L'inspecteur de style ne propose actuellement que padding, fond et alignement, sans contrôles avancés sur les arrondis, ombres, bordures, conteneurs, marges externes, ancres et classes CSS personnalisées.

---

### 2. Objectifs de la Phase 42

- Rendre la **barre latérale principale du Backstage rétractable** (`w-64` $\leftrightarrow$ `w-16` mode rail avec infobulles).
- Mettre en place une **navigation par onglets dédiée sur Mobile et Tablette** (`[ 📋 Structure | 👁️ Aperçu Live | ⚙️ Inspecteur ]`) afin d'offrir une expérience 100% plein écran instantanée.
- Implémenter l'**auto-scroll bidirectionnel fluide** (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) entre l'arborescence et le Live Canvas.
- Enrichir le modèle `BlockStyleConfig` et l'inspecteur avec un **jeu complet de contrôles graphiques professionnels** (arrondis, ombres, bordures, largeur max de conteneur, marges verticales, ancres HTML, classes Tailwind personnalisées).
- Assurer 0 régression, conformité stricte TypeScript, i18n trilingue et compilation réussie.

---

### 3. Découpage Chirurgical des Étapes

#### Étape 42.1 : Rétractabilité de la Barre Latérale Principale du Backstage

- **Fichiers concernés :**
  - [`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx)
  - [`src/components/admin/AdminShell.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminShell.tsx)
- **Actions :**
  - Création d'un état persistant de repli de la sidebar (`admin_sidebar_collapsed` dans `localStorage`).
  - Implémentation du mode compact `w-16` :
    - Masquage des libellés textuels et maintien des icônes centrées.
    - Ajout d'infobulles natives pour préserver l'accessibilité et la lisibilité des 25 entrées du menu.
    - Bouton de repli/dépli avec icône `PanelLeftClose` / `PanelLeftOpen` dans le pied de la barre latérale.
    - Ajout d'un déclencheur de bascule dans l'en-tête général du Backstage pour un accès immédiat.
  - Animation de transition fluide `transition-all duration-200 ease-in-out`.

#### Étape 42.2 : Ergonomie Mobile & Tablette Dédiée pour le Studio Visuel

- **Fichier concerné :**
  - [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Ajout d'un commutateur de vue spécifique aux écrans tactiles / petits écrans (`< lg`) :
    - Segment `[ 📋 Structure | 👁️ Aperçu WYSYWIG | ⚙️ Inspecteur ]`.
    - En mode Mobile/Tablette, seul l'onglet actif est affiché à 100% de la largeur, éliminant tout empilement vertical infini.
    - Lors de l'ouverture du Studio sur mobile/tablette, l'onglet `Aperçu` ou `Structure` est directement actionnable sans encombrement.
  - Sur Desktop (`≥ lg`), conservation de la disposition 3 colonnes réunifiée avec volets latéraux rétractables et Mode Zen.

#### Étape 42.3 : Auto-Scroll Bidirectionnel Instantané sur Sélection de Bloc

- **Fichiers concernés :**
  - [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx)
  - [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Affectation d'un identifiant DOM unique `studio-canvas-block-${block.id}` sur chaque bloc rendu dans le visualiseur.
  - Ajout d'un écouteur `useEffect` dans `StudioLiveCanvas.tsx` déclenchant `scrollIntoView({ behavior: 'smooth', block: 'center' })` lors du changement de `selectedBlockId`.
  - Affectation réciproque d'un identifiant `studio-tree-block-${block.id}` dans l'arborescence de gauche pour assurer le centrage de l'élément cliqué dans la liste latérale.

#### Étape 42.4 : Extension Majeure des Contrôles Graphiques de l'Inspecteur

- **Fichiers concernés :**
  - [`src/types/pages.ts`](file:///c:/xampp/htdocs/ka-tech/src/types/pages.ts)
  - [`src/components/blocks/BlockWrapper.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/BlockWrapper.tsx)
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  - Extension du type `BlockStyleConfig` :
    - `borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full"`
    - `shadow?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "accent"`
    - `border?: "none" | "subtle" | "accent" | "top_bottom" | "dashed"`
    - `maxWidth?: "full" | "7xl" | "5xl" | "3xl" | "prose"`
    - `margin?: "none" | "compact" | "normal" | "ample"`
    - `anchorId?: string` (ancre HTML de navigation `#...`)
    - `customClassName?: string` (classes utilitaires CSS Tailwind personnalisées)
  - Application transparente de l'ensemble de ces styles dans [`src/components/blocks/BlockWrapper.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/BlockWrapper.tsx) pour les 29 blocs.
  - Conception des contrôles dans l'onglet Style de [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx) avec aperçus visuels immédiats.

#### Étape 42.5 : Validation CI, Certification & Déploiement

- **Actions :**
  - Exécution de `bun run verifier-i18n` (parité trilingue FR, EN, AR).
  - Exécution de `bunx tsc --noEmit` (zéro erreur TypeScript).
  - Exécution de `bun run lint` et `bun run format` (conformité ESLint / Prettier).
  - Exécution de `bun run build` et `bun run paqueter:data`.
  - Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Phase 42).
  - Commit Git et Push sur `origin/main`.

---

### 4. Matrice de Recette & Critères d'Acceptance

| Critère d'Acceptance              | Test de Vérification                                 |                                  Résultat Attendu                                   |
| :-------------------------------- | :--------------------------------------------------- | :---------------------------------------------------------------------------------: |
| **Sidebar Backstage Rétractable** | Clic sur le bouton de repli                          |    La sidebar passe de 256px à 64px, les icônes restent centrées avec infobulle     |
| **Affichage Mobile / Tablette**   | Ouverture du studio sous résolution < 1024px         | Commutateur 3 onglets actif, aperçu WYSIWYG affiché immédiatement à 100% de largeur |
| **Auto-Scroll du Visualiseur**    | Clic sur un bloc dans l'arborescence                 |         Le visualiseur défile instantanément et centre le bloc sélectionné          |
| **Inspecteur Graphique Étendu**   | Modification arrondis, ombres, largeur max, bordure  |      Répercussion immédiate dans le visualiseur et persistance en base SQLite       |
| **Zéro Régression & Build**       | `bun run lint && bunx tsc --noEmit && bun run build` |                    Code 0, dist/ généré, archives zip produites                     |

---

## Sous-Phase 42.1 : Éradication Forensique des 4 Angles Morts (Découplage Fond/Conteneur, Sécurisation JSON, Ergonomie Mobile & Anti-Débordement 360px)

### 1. Contexte & Enjeux

Suite à l'audit forensique validé par ArchiSys3.0, quatre angles morts identifiés doivent être éradiqués sans délai :

1. **Angle Mort 1 (Découplage Fond / Conteneur) :** [`src/components/blocks/BlockWrapper.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/BlockWrapper.tsx) applique `bgClass` et `maxWidthClass` sur le même élément `<div>`, ce qui rogne les fonds pleine largeur lorsque le contenu est centré (7xl/5xl).
2. **Angle Noir 2 (Sécurisation JSON) :** [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx) initialise `rawJson` sans `useEffect` lors du changement de bloc, risquant d'écraser les propriétés d'un bloc avec celles d'un autre en cas de passage en mode codeur.
3. **Angle Mort 3 (Raccourci Tactile Mobile) :** Dans [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx), absence d'un bouton contextuel de retour « Voir l'Aperçu Live » directement dans l'en-tête de la carte d'inspecteur sur mobile (< 1024px).
4. **Angle Mort 4 (Anti-débordement Simulateur) :** Dans [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx), sécurisation contre tout débordement horizontal de la simulation mobile sur petits smartphones (360px).

### 2. Actions Chirurgicales Prévues

- **Étape 42.1.1 (`BlockWrapper.tsx`) :**
  - Refonte du conteneur en 2 paliers :
    - Balise externe pleine largeur (100%) : porte `bgClass`, `paddingClass`, `marginClass`, `borderClass`, `roundedClass`, `shadowClass`, `visibilityClass`, `style.anchorId`, `style.customClassName`.
    - Balise interne centrée : porte `maxWidthClass` (`max-w-7xl mx-auto`, etc.) et `alignClass`.
- **Étape 42.1.2 (`BlockPropsEditor.tsx`) :**
  - Ajout d'un écouteur `useEffect` synchronisant automatiquement `rawJson` (`JSON.stringify(block.props || {}, null, 2)`) et réinitialisant `jsonError` dès que `block.id` change.
- **Étape 42.1.3 (`PagesManager.tsx`) :**
  - Ajout d'un bouton contextuel « Voir l'Aperçu » (`Eye`) dans l'en-tête de la carte inspecteur (`CardHeader`) affiché uniquement sur mobile/tablette (`lg:hidden`) pour un retour en 1 tap.
- **Étape 42.1.4 (`StudioLiveCanvas.tsx`) :**
  - Sécurisation du conteneur du simulateur avec `w-full max-w-[375px]` et contrainte `box-border` pour éviter tout débordement au-delà de 360px.
- **Étape 42.1.5 (CI & Certification) :**
  - `bun run verifier-i18n && bunx tsc --noEmit && bun run format && bun run lint && bun run build && bun run paqueter:data`.
  - Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).
