# PLAN D'IMPLÉMENTATION CONSOLIDÉ — PHASE 41 & SOUS-PHASE 41.1

## Grande Unification 360° du Studio Visuel : Cockpit Unique, Volets Rétractables, Correction Écrans Mobile/Tablette, Inspecteurs Ultra-Fins, Nouveaux Blocs Majeurs, Persistance Souveraine en BD & Éradication des Angles Morts

**Projet :** StacGate Platform (ka-tech)  
**Directeur & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 **En attente de validation formelle par ArchiSys3.0 (Sous-Phase 41.1)**

---

### 1. Contexte & Rétrospective de la Phase 41

Les chantiers majeurs de la Phase 41 ont été livrés et validés :

1. **Volets Rétractables & Mode Plein Écran Zen :** Arborescence et inspecteur repliables avec boutons chevrons, dégageant jusqu'à 100% de la largeur d'écran (12 colonnes) pour le visualiseur.
2. **Débogage Physique du Simulateur Mobile & Tablette :** Éradication de `my-auto` dans `StudioLiveCanvas.tsx`, défilement vertical fluide `overflow-y-auto` sans écrasement de composants.
3. **Persistance Souveraine SQLite Directe (Zéro Dépendance LocalStorage) :** Vérifiée physiquement via PDO sur `katech-data/dev-a97b6b98a368.sqlite` (table `site_content`, section `customPages` de 7 324 octets avec les 5 vues et 25 blocs persistés).
4. **Création des 5 Nouveaux Blocs Majuscules :** `features_grid`, `pricing_table`, `quote_star`, `full_width_banner`, `visual_spacer`.
5. **Inspecteurs avec `MediaPickerField` :** Téléversement et sélection d'images pour le Hero, les bannières et les avatars.

---

### 2. Détection des 4 Angles Morts & Objectifs de la Sous-Phase 41.1

L'audit forensique approfondi a mis en lumière 4 points d'incohérence à éradiquer pour une complétude absolue à 100% :

1. **Absence de `defaultProps` pour les 5 nouveaux blocs dans `BLOCK_REGISTRY` :**
   - _Constat :_ Sans `defaultProps`, `handleAddBlock` crée le bloc avec `props: {}`. Dans l'inspecteur, les listes de cartes (`items`) ou de tarifs (`plans`) apparaissent vides au lieu d'être pré-remplies.
   - _Action 41.1.1 :_ Injecter les `defaultProps` trilingues complètes dans [`src/components/blocks/registry.ts`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/registry.ts) pour les 5 blocs.
2. **Omission de `onStyleChange` dans le Mode « Structure » :**
   - _Constat :_ Dans [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) ligne 1083, le mode accordéon Structure appelait `BlockPropsEditor` sans lui transmettre `onStyleChange`.
   - _Action 41.1.2 :_ Raccorder `onStyleChange={(newStyle) => handleUpdateBlockStyle(idx, newStyle)}` en mode Structure.
3. **Compteur figé à 24 au lieu de 29 blocs :**
   - _Constat :_ Le dialogue d'ajout de bloc mentionnait en dur « 24 Blocs » alors que le catalogue compte 29 blocs.
   - _Action 41.1.3 :_ Remplacer par `{BLOCK_REGISTRY.length} Blocs` dynamiquement.
4. **Édition granulaire des cartes de réassurance `why_us` :**
   - _Constat :_ L'inspecteur de `why_us` ne permettait d'éditer que les titres et sous-titres, sans accès aux cartes de réassurance individuelles.
   - _Action 41.1.4 :_ Ajouter l'éditeur de cartes répétables dans [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx).

---

### 3. Découpage Chirurgical de la Sous-Phase 41.1

```
  [Sous-Étape 41.1.1] Injection des defaultProps trilingues complets dans registry.ts (5 blocs)
         │
         ▼
  [Sous-Étape 41.1.2] Raccordement onStyleChange en mode Structure (PagesManager.tsx)
         │
         ▼
  [Sous-Étape 41.1.3] Dynamisation du compteur du catalogue (PagesManager.tsx)
         │
         ▼
  [Sous-Étape 41.1.4] Éditeur de cartes individuelles why_us dans BlockPropsEditor.tsx
         │
         ▼
  [Sous-Étape 41.1.5] Batterie Qualité CI (verifier-i18n, tsc, lint, format), Compilation Vite & Build
```

---

### 4. Matrice de Recette de la Sous-Phase 41.1

| Test                               | Comportement Attendu                                                                 |    Statut Visé     |
| :--------------------------------- | :----------------------------------------------------------------------------------- | :----------------: |
| **Ajout `features_grid`**          | Le bloc apparaît avec ses 3 cartes pré-remplies dans le Canvas ET dans l'inspecteur. | 🟡 Sous-Phase 41.1 |
| **Ajout `pricing_table`**          | Le bloc apparaît avec ses 3 plans tarifaires éditables dès la première seconde.      | 🟡 Sous-Phase 41.1 |
| **Ajout `quote_star`**             | Les champs auteur, citation, note et avatar sont directement éditables.              | 🟡 Sous-Phase 41.1 |
| **Ajout `full_width_banner`**      | Titres, visuel et double CTA sont directement personnalisables.                      | 🟡 Sous-Phase 41.1 |
| **Ajout `visual_spacer`**          | Hauteur et séparateur sont ajustables instantanément.                                | 🟡 Sous-Phase 41.1 |
| **Mode Structure `onStyleChange`** | Modifier le padding ou le fond en mode Structure met à jour le bloc avec succès.     | 🟡 Sous-Phase 41.1 |
| **Compteur Modale**                | Affiche fidèlement « 29 Blocs ».                                                     | 🟡 Sous-Phase 41.1 |
| **Édition Réassurance `why_us`**   | L'inspecteur permet d'ajouter, modifier ou supprimer chaque carte de réassurance.    | 🟡 Sous-Phase 41.1 |
| **Persistance BD SQLite**          | Sauvegarde via `PATCH /content` enregistre l'ensemble sans localStorage.             | 🟡 Sous-Phase 41.1 |
| **Qualité CI & Build**             | Typescript, ESLint, i18n et le build Vite passent avec 0 erreur.                     | 🟡 Sous-Phase 41.1 |
