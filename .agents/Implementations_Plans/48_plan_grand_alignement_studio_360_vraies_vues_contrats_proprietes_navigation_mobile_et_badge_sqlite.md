# Plan d'Implémentation — Phase 48 : Grand Alignement Studio 360° — Vraies Vues Systèmes Connectées, Contrats 1:1 Exhaustifs des 24 Blocs (Médias & Configurations Fines), Navigation Tactile & Fermeture Mobile/Tablette, et Badge de Persistance SQLite Directe

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Projet Hôte :** StacGate Platform (`ka-tech`)  
**Branche Git :** `main`  
**Mode :** 📋 Mode Plan

---

## 1. Contexte & Problématique Résolue

À la suite de la recette terrain menée par ArchiSys3.0, 5 blocages majeurs et angles morts critiques ont été identifiés dans le Studio de Conception 360° :

1. **Aperçu Live non fidèle sur les Vues Systèmes & Disparition Silencieuse de Blocs :**
   - Les vues systèmes (`track`, `cart`, `builder`, `blog`, `checkout_success`, `not_found`) affichaient une carte maquette pointillée statique (`SystemViewNativePreview`) au lieu de rendre les vrais composants fonctionnels du site.
   - Plusieurs blocs du catalogue commercial (`FlashSale`, `BestSellers`, `FeaturedTabs`, `CategoryCards`) retournaient silencieusement `null` en interne si aucun produit en promotion ou meilleure vente n'était chargé en base, rendant le bloc invisible sur le canevas alors qu'il était actif.
   - Le fond de page configuré (`page.layout?.pageBgClass`) n'était pas appliqué au canevas.

2. **Désynchronisation des Clés de Propriétés & Médias Manquants dans l'Inspecteur :**
   - **`projects_grid` :** Le composant lit `p.items` avec `{ title, description, image, demoUrl, codeUrl }`, alors que l'inspecteur écrivait dans `p.projects` avec `{ title, desc, link }` sans aucun sélecteur d'image !
   - **`skills_matrix` :** Le composant lit `p.categories`, alors que l'inspecteur écrivait dans `p.groups`. De plus, le titre et sous-titre de section n'étaient pas exposés.
   - **`timeline` :** Le composant lit `p.items` avec `role` et `description`, ainsi que `p.title` et `p.subtitle`, non exposés dans l'inspecteur.
   - **`profile_hero` :** Absence du sélecteur d'avatar (`avatarUrl`), du bouton de téléchargement CV (`showDownloadPdf`), des liens réseaux sociaux (`githubUrl`, `linkedinUrl`, `email`) et absence de localisation des textes.

3. **Manque de Contrôles Fins & d'Édition Trilingue sur l'Ensemble des 24 Blocs :**
   - **`hero_banner` :** Absence d'édition des boutons CTAs (primaire et secondaire avec libellés trilingues et URLs), du switch d'affichage de l'image (`showImage`), et des indicateurs KPIs.
   - **`pricing_table` :** Aplatissement des plans et fonctionnalités en chaînes simples sans éditeur fin trilingue.
   - **`category_cards` & `latest_blog_posts` :** Absence d'édition du titre et du sous-titre de section.

4. **Piège de Navigation & Impossibilité de Fermer l'Aperçu sur Mobile et Tablette (< 1024px) :**
   - Dès que l'administrateur basculait en vue Aperçu Live (`setMobileStudioView("canvas")`), le canevas occupait 100% de l'écran, sans aucun bouton de fermeture ou de retour pour revenir à l'arborescence des blocs ou à l'inspecteur de propriétés.

5. **Visibilité & Garantie de la Persistance SQLite Directe :**
   - Absence d'un indicateur de statut visuel confirmant en temps réel que les données sont bel et bien écrites et persistées dans le fichier SQLite local `katech-data`.

---

## 2. Architecture Technique de la Solution

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STUDIO 360° RÉALIGNÉ & VERROUILLÉ                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. BARRE MOBILE & BOUTON DE FERMETURE IMMÉDIATE :                                      │
│    [ ← Fermer l'Aperçu ] [ 📁 Structure ] [ 👁️ Aperçu Live ] [ ⚙️ Inspecteur ]        │
│                                                                                        │
│ 2. VRAIES VUES APPLICATIVES EMBARQUÉES DANS LE CANVAS :                                │
│    <TrackOrder inStudioPreview />   <Cart inStudioPreview />                           │
│    <Builder inStudioPreview />      <Blog inStudioPreview />                           │
│    + Fond dynamique : layout.pageBgClass                                               │
│    + Fallback d'édition Studio pour FlashSale / BestSellers / Categories               │
│                                                                                        │
│ 3. CONTRAT 1:1 STRICT ENTRE L'INSPECTEUR ET LES 24 BLOCS :                             │
│    • ProjectsGrid  : items[] ➔ MediaPickerField (image), titrage trilingue, URLs      │
│    • ProfileHero   : MediaPickerField (avatarUrl), switch PDF, github, linkedin, email │
│    • SkillsMatrix  : categories[] ➔ titrage trilingue, liste skills, titre section     │
│    • Timeline      : items[] ➔ role, company, period, description trilingues          │
│    • HeroBanner    : CTAs primaire & secondaire trilingues, showImage, KPIs            │
│    • PricingTable  : plans[] ➔ name, period, badge, features[], CTAs trilingues        │
│    • CategoryCards / LatestBlogPosts : titre & sous-titre localisés                    │
│                                                                                        │
│ 4. SOUVERAINETÉ PERSISTANCE SQLITE :                                                   │
│    Badge interactif : 🟢 Synchronisé SQLite (katech-data) [ Enregistrer en BD ]        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Plan d'Action Découpé en Étapes Chirurgicales

### Étape 48.1 : Bouton de Fermeture & Navigation Tactile Fluide sur Mobile / Tablette

- **Fichiers :** [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx), [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  1. Ajouter la prop `onCloseMobilePreview?: () => void` à `StudioLiveCanvasProps`.
  2. Dans la barre d'outils du Live Canvas, afficher un bouton visible sur mobile/tablette (`lg:hidden`) :  
     `<Button size="sm" variant="secondary" onClick={onCloseMobilePreview} className="gap-1.5 font-bold text-xs"><ArrowLeft className="size-3.5" /> Fermer l'aperçu</Button>`.
  3. Dans `PagesManager.tsx`, rendre la barre d'onglets mobile (`[ Structure ] [ Aperçu Live ] [ Inspecteur ]`) flottante et sticky en haut ou en bas, assurant une bascule instantanée sans jamais être bloqué.

---

### Étape 48.2 : Exécution Réelle des Vues Systèmes & Fallback Studio Catalogue

- **Fichiers :** [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx), [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/CommerceBlocks.tsx)
- **Actions :**
  1. Remplacer le mock `SystemViewNativePreview` par les vraies vues applicatives exécutées en mode simulation sécurisée (`inStudioPreview={true}`) :
     - Pour `track` : exécution du vrai composant `<TrackOrder />`.
     - Pour `cart` : exécution du vrai composant `<Cart />`.
     - Pour `builder` : exécution du vrai composant `<Builder />`.
     - Pour `blog` : exécution du vrai composant `<Blog />`.
     - Pour `checkout_success` : exécution du vrai composant `<CheckoutSuccess />`.
     - Pour `not_found` : exécution du vrai composant `<NotFound />`.
  2. Dans `CommerceBlocks.tsx`, immuniser les blocs catalogue en mode Studio : si `FlashSale`, `BestSellers` ou `CategoryCards` ne trouvent pas de produits ou de catégories filtrés sur la base, générer un aperçu de démonstration élégant dans le canvas au lieu de retourner `null`.
  3. Appliquer la classe d'arrière-plan `page.layout?.pageBg` au conteneur du canevas pour refléter l'ambiance visuelle réelle de la page.

---

### Étape 48.3 : Alignement 1:1 Exhaustif des Propriétés & Médias dans `BlockPropsEditor.tsx`

- **Fichier :** [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  1. **`projects_grid` :** Réaligner strictement sur `p.items`. Pour chaque projet : `MediaPickerField` pour l'image, `LocalizedFieldEditor` pour le titre et la description, champ catégorie, badges tags, liens démo et code source.
  2. **`profile_hero` :** Ajouter `MediaPickerField` pour `avatarUrl` (repli sur `archisysSignatureSrc`), switch `showDownloadPdf`, champs URLs `githubUrl`, `linkedinUrl`, `email`, et `LocalizedFieldEditor` pour `name`, `role`, `bio`, `availability`.
  3. **`skills_matrix` :** Réaligner sur `p.categories`. Pour chaque domaine : `LocalizedFieldEditor` pour le nom du domaine, champ tags pour les compétences, et ajout des champs `title` et `subtitle` de section.
  4. **`timeline` :** Réaligner sur `p.items`. Pour chaque jalon : `role` et `description` trilingues, `company`, `period`, tags, et ajout des champs `title` et `subtitle` de section.
  5. **`hero_banner` :** Ajouter la configuration des deux boutons CTAs (Primaire et Secondaire : libellés trilingues avec `LocalizedFieldEditor`, liens URLs), switch d'affichage de l'image (`showImage`), et gestionnaire de KPIs.
  6. **`pricing_table` :** Titre et sous-titre de section avec `LocalizedFieldEditor`. Pour chaque plan : `name`, `price`, `period`, `badge` trilingues, switch `popular`, liste des `features` trilingues, libellé et lien du bouton CTA.
  7. **`category_cards` & `latest_blog_posts` :** Ajouter les champs de titre et sous-titre de section avec `LocalizedFieldEditor`.

---

### Étape 48.4 : Badge Visuel de Persistance SQLite & Bouton d'Enregistrement Direct

- **Fichier :** [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  1. Ajouter un badge d'état persistance dans la barre d'en-tête du Studio :  
     `🟢 Synchronisé SQLite (katech-data)` avec horodatage de la dernière sauvegarde, ou `🟡 Modifications locales non synchronisées`.
  2. Ajouter un bouton explicite "Enregistrer en Base de Données" déclenchant un appel direct à `updateSiteContent({ customPages })` avec notification toast de confirmation et gestion d'erreurs transparente.

---

### Étape 48.5 : Matrice de Recette & Contrôles Qualité Inviolables

- **Validation CI :**
  1. `bun run verifier-i18n` : parité FR / EN / AR à 100%.
  2. `bunx tsc --noEmit` : 0 erreur de typage.
  3. `bun run format` & `bun run lint` : respect strict des règles de formatage et d'analyse statique.
  4. `bun run build` : compilation Vite de production et prérendu.
  5. `bun run paqueter:data` : archive SQLite horodatée cumulative.
  6. Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) et synchronisation Git vers `origin/main`.

---

## 4. Matrice de Recette Attendue

| Scénario Testé                          | Résultat Attendu                                                                                                                                                       |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Navigation Mobile / Tablette**        | L'administrateur clique sur "Aperçu Live" sur mobile, voit le canevas, puis clique sur "Fermer l'aperçu" et revient instantanément à l'arborescence ou à l'inspecteur. |
| **Vraies Vues Systèmes dans le Canvas** | La sélection de `system_track` ou `system_cart` affiche l'interface réelle avec son style et son fond, et non une maquette pointillée factice.                         |
| **Inspecteur Projets & Médias**         | La sélection du bloc `projects_grid` permet de téléverser ou choisir une image pour chaque projet via la médiathèque, avec titres trilingues.                          |
| **Inspecteur Profile Hero & CV**        | La sélection du bloc `profile_hero` permet de changer l'avatar officiel, d'activer le bouton PDF et de renseigner les réseaux sociaux.                                 |
| **Inspecteur Hero Banner CTAs**         | L'administrateur peut personnaliser les boutons CTA 1 et 2 du Hero dans les 3 langues.                                                                                 |
| **Persistance SQLite**                  | Le badge indique `🟢 Synchronisé SQLite (katech-data)` dès la confirmation de sauvegarde par l'API PHP/SQLite.                                                         |
