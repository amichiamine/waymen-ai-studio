# PLAN D'IMPLÉMENTATION — PHASE 40

## Grand Studio Visuel Interactif 360° : Live Canvas de Rendu Réactif, Inspecteurs de Contenus Réels & Contrôles Fins de Styles

**Projet :** StacGate Platform (ka-tech)  
**Directeur & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 **En attente de validation formelle par ArchiSys3.0**

---

### 1. Contexte & Problématique

Dans l'état actuel de l'application :

1. **Travail à l'aveugle (Absence de Prévisualisation Temps Réel) :** L'administrateur réordonne des blocs sous forme de rectangles gris munis de boutons monter/descendre, sans voir l'impact visuel de ses choix ni le rendu réel de la page en cours de composition. Il est contraint d'ouvrir un nouvel onglet de navigateur pour vérifier la vitrine publique.
2. **Déconnexion des Blocs E-Commerce avec leur Contenu Réel :** Les blocs de l'accueil (`hero_banner`, `flash_sale`, `best_sellers`, `why_us`, `reviews_grid`, etc.) ne permettaient pas d'éditer leur contenu textuel et graphique depuis l'Onglet 1 (_« Pages & Vues Composables »_). Les textes réels étaient dissociés dans l'Onglet 2 (_« Sections de l'Accueil »_), forçant un va-et-vient cognitif permanent.
3. **Absence de Contrôles Fins de Design & de Mise en Page :** Les blocs ne disposent pas d'options universelles de style (espacement vertical / padding, arrière-plan de section, alignement du texte, conteneur plein écran vs centré, et masquage conditionnel selon la résolution mobile ou grand écran).
4. **Décision d'ArchiSys3.0 :** Validation formelle de l'**Option A (Grand Studio Visuel Interactif 360°)** pour transformer le Studio en un environnement de conception visuelle moderne, ergonomique et temps réel (calibre Shopify / Webflow).

---

### 2. Objectifs d'Architecture & Garanties Zéro Régression

1. **Garantie Zéro Régression Vitrine :**  
   Le moteur public de restitution des blocs (`renderBlock(block)`) et les pages routées (`/`, `/about`, `/contact`, `/cv`, `/projets`, `/page/:slug`) continuent de fonctionner sans la moindre rupture. Les nouveaux attributs de style s'appliquent de manière additive et progressive.
2. **Live Visual Canvas Interactif (WYSYWIG Réactif) :**
   - Intégration d'un Canvas central de prévisualisation dans [`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) affichant le véritable rendu des composants React en temps réel.
   - Sélecteur de résolutions responsives avec cadre physique simulé :
     - 🖥️ **Bureau (Large Viewport - 100%)**
     - 💻 **Tablette (768px)**
     - 📱 **Mobile (375px)**
   - Détection de survol et contour de sélection actif : cliquer sur un bloc dans le Canvas sélectionne instantanément son inspecteur de propriétés.
3. **Raccordement Bidirectionnel au Contenu Réel dans l'Inspecteur :**
   - Tous les blocs e-commerce (`hero_banner`, `flash_sale`, `category_cards`, `best_sellers`, `featured_tabs`, `brands_marquee`, `why_us`, `reviews_grid`, `contact_cta`, `builder_teaser`, `promo_banner`) disposent d'un inspecteur dédié dans [`BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx) permettant de modifier directement leurs titres, sous-titres, boutons, images et compteurs.
   - Si une propriété est surchargée localement sur le bloc, elle prime ; sinon, elle lit et modifie harmonieusement le contenu global de `siteContent`.
4. **Contrôles Fins de Styles Standardisés pour l'Ensemble des 24 Blocs :**
   - Extension de `BlockConfig` avec un sous-objet `style` :
     - `padding` : `compact` (py-6), `normal` (py-12), `ample` (py-20).
     - `bg` : `default` (transparent), `surface` (bg-card), `muted` (bg-muted/30), `accent` (bg-primary/5), `dark` (sombre profond #0f172a).
     - `align` : `start` (aligné début) ou `center` (centré).
     - `hideOnMobile` : boolean (masquer le bloc sur écran < 768px).
     - `hideOnDesktop` : boolean (masquer le bloc sur grand écran).
   - Enveloppe d'exécution universelle `BlockWrapper` appliquant ces styles sans altérer les composants internes.
5. **Ergonomie Backstage Trilingue & Écran Scindé :**
   - Deux modes de vue commutables : **Mode Structurel** (liste compacte d'ordonnancement rapide) et **Mode Studio WYSYWIG** (Canvas centralisé avec inspecteur latéral).
   - Prise en charge intégrale du dictionnaire trilingue (FR, EN, AR) pour l'ensemble des réglages.

---

### 3. Matrice d'Édition des Blocs dans le Grand Studio 360°

| Famille de Blocs             | Types de Blocs Inclus                                                                                                                                                                     | Données Réelles Raccordées dans l'Inspecteur                                                                | Contrôles Fins de Styles                                       |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Commerce & Accueil**       | `hero_banner`, `flash_sale`, `category_cards`, `best_sellers`, `featured_tabs`, `brands_marquee`, `why_us`, `builder_teaser`, `reviews_grid`, `contact_cta`, `ticker_bar`, `promo_banner` | Titres, slogans, compte à rebours, badges, images de fond, CTA, nombre max d'éléments, visibilité des prix. | Padding, Fond de section, Visibilité responsive Mobile/Bureau. |
| **Institutionnel & Contact** | `company_history`, `values_grid`, `direct_contact_cards`, `contact_form`, `faq_accordion`, `brand_banner`                                                                                 | Histoire, mission, coordonnées, cartes d'accès direct, questions/réponses de la FAQ.                        | Padding, Surface contrastée, Centrage.                         |
| **Profil & Showcase**        | `profile_hero`, `timeline`, `skills_matrix`, `projects_grid`                                                                                                                              | Bio expert, timeline de carrière, radar de compétences, galerie des réalisations.                           | Padding, Fond accentué, Filtrage.                              |
| **Éditorial & Contenu**      | `markdown_section`, `latest_blog_posts`                                                                                                                                                   | Contenu Markdown riche, nombre d'articles récents, tags affichés.                                           | Padding, Alignement, Largeur de texte.                         |

---

### 4. Découpage des Étapes Chirurgicales

```
  [Étape 40.1] Extension du Modèle de Données & Wrapper Universel de Styles (types/pages.ts & BlockWrapper.tsx)
         │
         ▼
  [Étape 40.2] Composant Studio Live Canvas avec Sélecteur Responsive (StudioLiveCanvas.tsx)
         │
         ▼
  [Étape 40.3] Enrichissement des Inspecteurs E-Commerce & Contenus Réels (BlockPropsEditor.tsx)
         │
         ▼
  [Étape 40.4] Refonte Backstage Split-Screen & Mode WYSYWIG (PagesManager.tsx)
         │
         ▼
  [Étape 40.5] Batterie Qualité CI (i18n, tsc, lint, format), Compilation Vite & Empaquetage
```

#### Étape 40.1 : Extension Typée & Wrapper Universel de Styles

- Dans [`src/types/pages.ts`](file:///c:/xampp/htdocs/ka-tech/src/types/pages.ts) :
  - Définir `BlockStyleConfig` :
    ```typescript
    export interface BlockStyleConfig {
      padding?: "compact" | "normal" | "ample";
      bg?: "transparent" | "surface" | "muted" | "accent" | "dark";
      align?: "start" | "center";
      hideOnMobile?: boolean;
      hideOnDesktop?: boolean;
    }
    ```
  - Ajouter `style?: BlockStyleConfig` dans l'interface `BlockConfig`.
- Créer [`src/components/blocks/BlockWrapper.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/BlockWrapper.tsx) :
  - Enveloppe intelligente appliquant les classes Tailwind adéquates selon `config.style` (`py-6`, `py-12`, `py-20`, `bg-card`, `bg-muted/40`, `bg-primary/5`, `hidden md:block`, `md:hidden`, etc.).
  - Mettre à jour [`src/components/blocks/index.ts`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/index.ts) pour que `renderBlock(block)` applique systématiquement cette enveloppe.

#### Étape 40.2 : Composant Canvas de Prévisualisation Responsive (`StudioLiveCanvas.tsx`)

- Créer [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx) :
  - Barre d'outils responsive avec boutons radio : `[🖥️ Bureau 100%]`, `[💻 Tablette 768px]`, `[📱 Mobile 375px]`.
  - Simulateur de cadre d'écran à dimensions contraintes avec barre d'état et ombre portée réaliste.
  - Rendu direct de la séquence ordonnée des blocs de la page via `renderBlock(block)`.
  - Décoration au survol (hover) : contour subtil et badge du type de bloc (`Hero Banner`, `Vente Flash`, etc.).
  - Sélection interactive au clic : cliquer sur un bloc dans le Canvas active son inspecteur et le met en valeur avec un anneau de focus primaire.

#### Étape 40.3 : Raccordement Complet des Inspecteurs de Blocs E-Commerce (`BlockPropsEditor.tsx`)

- Dans [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx) :
  - Ajouter l'onglet ou la section transversale **Style & Disposition** (Padding, Arrière-plan, Visibilité Mobile/Bureau) accessible sur les 24 blocs.
  - Développer les formulaires dédiés pour tous les blocs d'accueil et e-commerce qui en étaient dépourvus :
    - `hero_banner` : Titres (1 & 2), sous-titre/tagline, badge de réassurance, texte et lien du bouton principal, texte et lien du bouton secondaire.
    - `flash_sale` : Badge flamme, titre promotionnel, délai du compte à rebours en heures.
    - `category_cards` : Nombre de catégories à afficher (4, 6, 8, toutes).
    - `best_sellers` / `featured_tabs` : Titre et sous-titre de la section de produits.
    - `why_us` : Titre de la section réassurance et personnalisation des arguments.
    - `reviews_grid` : Titre de la section avis et nombre d'avis affichés.
    - `contact_cta` : Titre d'accroche, texte d'action et libellé du bouton WhatsApp/Appel.

#### Étape 40.4 : Refonte de l'Expérience Backstage Split-Screen (`PagesManager.tsx`)

- Dans [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) :
  - Ajouter un commutateur de mode dans l'en-tête : **[📋 Vue Liste Structurelle]** $\leftrightarrow$ **[🎨 Studio Visuel Canvas]**.
  - En mode Studio Visuel :
    - Volet gauche (25%) : Liste ordonnable des blocs avec flèches rapides et bouton d'ajout.
    - Canvas central (50%) : `StudioLiveCanvas` affichant la page vivante dans la résolution choisie.
    - Volet droit (25%) : `BlockPropsEditor` pour le bloc sélectionné, synchronisé en direct avec le Canvas.
  - Enregistrement réactif instantané dans la mémoire locale du composant et synchronisation en base via `handleSave` lors du clic sur _« Enregistrer »_.

#### Étape 40.5 : Batterie Qualité CI, Tests & Empaquetage

- `bun run verifier-i18n` (100% de parité trilingue).
- `bunx tsc --noEmit` & `bun run lint` (0 erreur).
- `bun run format`.
- `bun run build ; bun run paqueter:data` (régénération des archives de production).
- Mise à jour du journal officiel de traçabilité [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).
- Synchronisation Git (commit conventionnel et push sur `origin/main`).

---

### 5. Matrice de Recette & Validation

| Test                          | Comportement Attendu                                                                                                     | Statut Visé |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :---------: |
| **Live Visual Canvas**        | La page d'accueil ou toute vue sélectionnée s'affiche en temps réel dans le canvas central du Studio.                    | 🟡 Phase 40 |
| **Sélecteur Responsive**      | Basculer sur "Mobile (375px)" redimensionne immédiatement le Canvas avec un comportement responsive parfait.             | 🟡 Phase 40 |
| **Édition Directe Hero**      | Modifier le titre du Hero dans l'inspecteur met à jour instantanément le texte affiché dans le Canvas.                   | 🟡 Phase 40 |
| **Édition Vente Flash & CTA** | Modifier les champs de la vente flash ou du CTA se reflète en temps réel dans la prévisualisation.                       | 🟡 Phase 40 |
| **Contrôle Fin d'Espacement** | Choisir `padding: "compact"` ou `"ample"` ajuste immédiatement la marge verticale du bloc dans le Canvas et sur le site. | 🟡 Phase 40 |
| **Arrière-plan Personnalisé** | Appliquer `bg: "surface"` ou `"accent"` teinte proprement la section.                                                    | 🟡 Phase 40 |
| **Masquage Mobile/Bureau**    | Cocher "Masquer sur mobile" masque le bloc lorsque le simulateur mobile (375px) est sélectionné.                         | 🟡 Phase 40 |
| **Sauvegarde Atomique BD**    | Le clic sur "Enregistrer" persiste les blocs, leurs propriétés et leurs styles en base SQLite sans régression.           | 🟡 Phase 40 |
| **Batterie Qualité & Build**  | Typescript, ESLint, i18n et le build Vite passent avec 0 erreur.                                                         | 🟡 Phase 40 |
