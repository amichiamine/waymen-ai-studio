# Plan d'Implémentation — Phase 50 : Déploiement Plein Écran de l'Inspecteur Desktop, Structure Déployable & Focalisation 360° Universelle

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 En attente de validation par ArchiSys3.0 (Clic « Proceed »)  
**Objectif Clé :** Rompre la rigidité de la grille CSS desktop (`lg:col-span-3`) pour offrir une parité ergonomique 100% stricte entre Desktop, Tablette et Mobile, en permettant à l'Inspecteur et à la Structure de se déployer individuellement sur toute la largeur de l'écran (`lg:col-span-12`).

---

## 1. Contexte & Problématique

En mode Desktop ($\ge 1024\text{ px}$), la grille du Studio était figée sur une répartition contraignante :

- **Volet Gauche (Structure) :** 3 colonnes fixes (ou masqué).
- **Canvas Central (Aperçu) :** Flottant entre 6, 9 et 12 colonnes (Mode Zen).
- **Volet Droit (Inspecteur) :** **3 colonnes fixes (ou masqué)**.

Tandis que sur mobile et tablette, un sélecteur exclusif (`Structure` / `Aperçu Live` / `Inspecteur`) permet à chaque volet d'occuper 100% de la largeur, en Desktop l'Inspecteur ne pouvait jamais dépasser 3 colonnes sur 12 (~320 à 380 px).  
Cette limitation constituait un angle mort majeur pour l'administration confortable des textes trilingues (FR/EN/AR), des paramètres SEO, des atmosphères de fond et des sous-éléments de blocs configurables.

---

## 2. Spécifications & Architecture de la Solution

### A. Modes de Disposition Desktop (`desktopFocusMode`)

Définition d'un état réactif de focalisation `desktopFocusMode` dans [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) :

1. **`split` (Défaut - Tri-Volets partagés) :**
   - Structure : `lg:col-span-3` (si non repliée).
   - Canvas : `lg:col-span-6` (ou `lg:col-span-9` si un volet est replié, ou `lg:col-span-12` si Zen).
   - Inspecteur : `lg:col-span-3` (si non replié).
2. **`inspector` (Focus Inspecteur Plein Écran) :**
   - Structure : masquée (`hidden`).
   - Canvas : masqué (`hidden`).
   - Inspecteur : **`lg:col-span-12` (100% de la largeur, confort maximal)**.
3. **`tree` (Focus Structure Plein Écran) :**
   - Structure : **`lg:col-span-12` (100% de la largeur)**.
   - Canvas : masqué (`hidden`).
   - Inspecteur : masqué (`hidden`).
4. **`canvas` (Focus Aperçu Plein Écran) :**
   - Structure : masquée (`hidden`).
   - Canvas : **`lg:col-span-12` (100% de la largeur — Mode Zen)**.
   - Inspecteur : masqué (`hidden`).

### B. Contrôles & Interactions UI

- **Bouton d'Agrandissement `Maximize2` / `Minimize2` dans l'Inspecteur Droit :**  
  Placé à côté de `PanelRightClose`, il bascule instantanément entre `desktopFocusMode === "inspector"` et le mode partagé `split`.
- **Bouton d'Agrandissement `Maximize2` / `Minimize2` dans la Structure Gauche :**  
  Placé à côté de `PanelLeftClose`, il bascule instantanément entre `desktopFocusMode === "tree"` et `split`.
- **Barre de Commutation Universelle Desktop & Mobile :**  
  Dans le bandeau d'outils du Studio, mise à disposition des boutons de bascule de disposition :
  `[ ⊞ 3 Volets ]` | `[ ◧ Structure ]` | `[ 🗖 Aperçu ]` | `[ ◨ Inspecteur ]`.

---

## 3. Plan d'Exécution Chirurgical par Étapes

### Étape 50.1 : État Réactif de Focalisation dans `PagesManager.tsx`

- Ajout de l'état `desktopFocusMode: "split" | "tree" | "canvas" | "inspector"`.
- Calcul dynamique des classes CSS des 3 colonnes :
  - Colonne Gauche : `desktopFocusMode === "tree" ? "lg:col-span-12" : "lg:col-span-3"`
  - Colonne Centrale (Canvas) : `desktopFocusMode === "canvas" ? "lg:col-span-12" : canvasColsClass`
  - Colonne Droite (Inspecteur) : `desktopFocusMode === "inspector" ? "lg:col-span-12" : "lg:col-span-3"`
- Gestion des visibilités selon `desktopFocusMode`.

### Étape 50.2 : Boutons d'Agrandissement Dédiés sur chaque Volet

- **Sur l'Inspecteur :** Ajout d'un bouton `Maximize2` / `Minimize2` avec infobulle claire ("Agrandir l'inspecteur sur toute la page" / "Restaurer l'affichage partagé").
- **Sur la Structure :** Ajout d'un bouton `Maximize2` / `Minimize2` avec infobulle claire ("Agrandir la structure sur toute la page" / "Restaurer l'affichage partagé").
- **Sur le Canvas :** Continuité du bouton plein écran existant (`isZenMode` aligné avec `desktopFocusMode === "canvas"`).

### Étape 50.3 : Sélecteur de Disposition Rapide dans la Barre d'Outils

- Intégration dans l'en-tête du Studio (à côté de `Studio WYSYWIG` et `Structure`) d'un groupe de boutons de disposition rapide :
  - `⊞ 3 Volets` (`split`)
  - `◧ Structure` (`tree`)
  - `🗖 Aperçu` (`canvas`)
  - `◨ Inspecteur` (`inspector`)
- Synchronisation bidirectionnelle avec le sélecteur tactile mobile/tablette existant (`mobileStudioView`).

### Étape 50.4 : Contrôles Qualité CI & Packaging

- Exécution de la suite complète sans affaiblissement :
  1. `bun run verifier-i18n` (0 erreur, parité trilingue).
  2. `bunx tsc --noEmit` (0 erreur TypeScript).
  3. `bun run format` (conforme Prettier, isolation stricte `devis/`).
  4. `bun run lint` (0 erreur ESLint).
  5. `bun run build` (build Vite dist/ vérifié).
  6. `bun run paqueter:data` (archive SQLite horodatée).
- Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Phase 50, parité 1:1).
- Git commit et push sur `origin/main`.

---

## 4. Matrice de Recette & Critères d'Acceptation

| Test Visuel & Fonctionnel                   | Résultat Attendu                                                                                                                                  |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Clic sur Agrandir dans l'Inspecteur**     | L'inspecteur prend instantanément 100% de la largeur d'écran (`col-span-12`). Le Canvas et la Structure se masquent. L'icône devient `Minimize2`. |
| **Clic sur Restaurer dans l'Inspecteur**    | Retour immédiat à la vue 3 volets partagée.                                                                                                       |
| **Clic sur Agrandir dans la Structure**     | La liste des vues et l'arborescence des blocs prennent 100% de la largeur d'écran (`col-span-12`).                                                |
| **Sélecteur de disposition barre d'outils** | Permet de basculer d'un clic entre `3 Volets`, `Structure seule`, `Aperçu seul` et `Inspecteur seul` sur Desktop.                                 |
| **Comportement Mobile/Tablette (< 1024px)** | Le sélecteur tactile existant continue de fonctionner de manière fluide sans interférence.                                                        |
| **Auto-Save SQLite & Bi-Mode**              | L'Inspecteur en plein écran permet d'éditer les propriétés des blocs et les paramètres de vue avec auto-save 1500ms actif.                        |
