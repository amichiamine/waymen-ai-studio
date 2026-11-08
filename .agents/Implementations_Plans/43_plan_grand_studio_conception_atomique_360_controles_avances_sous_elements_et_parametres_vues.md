# PLAN D'IMPLÉMENTATION — PHASE 43

## Grand Studio de Conception Atomique 360° : Contrôles Avancés des Sous-Éléments (Badges, Titres, CTAs, Grilles/Cartes), Complétude des 29 Blocs, Paramètres de Vues Dédiés (SEO & Layout) & Persistance Souveraine SQLite (Zéro Régression)

---

### 1. Contexte & Enjeux d'Architecture

Suite à l'arbitrage stratégique d'**ArchiSys3.0**, le Studio Visuel passe d'un formulaire de blocs à un véritable **Studio de Conception Atomique Haute Précision**.

L'objectif est d'offrir une liberté de direction artistique absolue tout en respectant trois impératifs cardinaux :

1. **Persistance Souveraine SQLite Directe :** Toutes les nouvelles options (styles, réglages de page, SEO, sous-éléments) sont sérialisées dans `site_content.customPages` via l'API serveur (`PATCH /api/v1/content`), avec zéro dépendance à `localStorage`.
2. **Complétude 100% sans Bloc Orphelin :** Les 7 blocs non encore administrables graphiquement (`builder_teaser`, `company_history`, `values_grid`, `contact_form`, `direct_contact_cards`, `ticker_bar`, `promo_banner`) reçoivent un inspecteur sur-mesure complet.
3. **Zéro Régression & Intégrité Système :** Le comportement des pages existantes, de la vitrine, du catalogue et des fonctionnalités transactionnelles reste strictement préservé avec des valeurs par défaut rétrocompatibles.

---

### 2. Découpage Chirurgical des Étapes

#### Étape 43.1 : Extension Typologique Rétrocompatible (`src/types/pages.ts`)

- **Fichier :** [`src/types/pages.ts`](file:///c:/xampp/htdocs/ka-tech/src/types/pages.ts)
- **Actions :**
  - Extension du modèle `CustomPageDefinition` :

    ```typescript
    export interface PageLayoutConfig {
      hideHeader?: boolean;
      transparentHeader?: boolean;
      hideFooter?: boolean;
      hideTicker?: boolean;
      hideFloatingContact?: boolean;
      pageBg?: "default" | "dark" | "surface" | "gradient" | "muted";
    }

    export interface PageSeoConfig {
      metaTitle?: Localized<string>;
      metaDescription?: Localized<string>;
      ogImage?: string;
      canonicalUrl?: string;
      noIndex?: boolean;
    }
    ```

  - Intégration optionnelle de `layout?: PageLayoutConfig` et `seo?: PageSeoConfig` dans `CustomPageDefinition`.
  - Extension de `BlockStyleConfig` pour supporter le style des cartes (`cardStyle`, `cardHover`, `gridColsDesktop`, `gridColsMobile`, `gridGap`).

#### Étape 43.2 : Prise en Compte des Directives de Vue dans la Vitrine (`src/pages/DynamicPage.tsx`)

- **Fichier :** [`src/pages/DynamicPage.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/DynamicPage.tsx)
- **Actions :**
  - Injection des balises SEO avancées dans `<Helmet>` :
    - `og:image`, `canonical`, balise `robots` (`noindex, nofollow` si activé).
  - Application du fond de page de la vue (`pageBg`) sur le conteneur principal de `DynamicPage`.
  - Émission ou support d'événements/classes permettant d'adapter la visibilité du header, footer ou ticker si spécifié par le layout de la page.

#### Étape 43.3 : Complétude Intégrale des 7 Blocs Orphelins dans l'Inspecteur (`src/components/admin/BlockPropsEditor.tsx`)

- **Fichier :** [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  - Implémentation des formulaires d'édition granulaires dédiés pour les 7 blocs orphelins :
    1. **`builder_teaser` :** Badge, Titre, Sous-titre, Bouton CTA vers le configurateur, Image de fond avec MediaPicker.
    2. **`company_history` :** Titre, Sous-titre, Gestionnaire dynamique des jalons chronologiques (année, titre, description, statut).
    3. **`values_grid` :** Titre, Sous-titre, Gestionnaire des cartes de valeurs d'entreprise (icônes Lucide, titres, textes).
    4. **`contact_form` :** Titre, Chapô, Libellé du bouton de soumission, Message de succès, Affichage/masquage du champ téléphone.
    5. **`direct_contact_cards` :** Cartes de coordonnées directes (Email de support, Téléphone, Adresse physique, WhatsApp, Horaires).
    6. **`ticker_bar` :** Messages défilants dynamiques trilingues, Vitesse de défilement, Couleur d'accent.
    7. **`promo_banner` :** Accroche promo, Code de réduction, Date limite, Bouton d'action et lien.

#### Étape 43.4 : Contrôleurs Atomiques des Sous-Éléments (Badges, Titres, CTAs & Grilles)

- **Fichiers :**
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
  - [`src/components/blocks/BlockWrapper.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/BlockWrapper.tsx)
- **Actions :**
  - Création de contrôles visuels standardisés pour :
    - **Boutons d'action (CTAs) :** Sélection de variante (Plein primaire, Secondaire, Outline, Ghost, Gradient StacGate), taille (sm, md, lg), choix de l'icône, URL cible, ouverture dans un nouvel onglet.
    - **En-têtes de section :** Badge d'accroche personnalisé avec choix d'icône, taille de titre H1 à H4, graisse, dégradé de texte.
    - **Cartes & Grilles :** Sélecteur de colonnes réactif (1 à 4 cols sur desktop, 1 à 2 sur mobile), écartement (`gap`), effet de survol (`hover-lift`, `glow`).

#### Étape 43.5 : Paramètres Avancés de Page 360° (Layout & SEO) dans le Backstage

- **Fichier :** [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Refonte du modal de paramètres de page (`handleOpenEditPageMeta`) avec un sélecteur d'onglets clair :
    - **Onglet "Général" :** Titre trilingue, Slug URL, Statut de publication, Ordre de navigation, Affichage Navbar / Footer.
    - **Onglet "Mise en Page / Layout" :** Masquer l'En-tête (Header), Header transparent, Masquer le Pied de page (Footer), Masquer le Ticker, Fond de page personnalisé.
    - **Onglet "SEO & Réseaux Sociaux" :** Meta Title personnalisé, Meta Description, Image OpenGraph (via MediaPicker), Directives d'indexation robots.

#### Étape 43.6 : Validation CI, Assurance Qualité SQLite, Traçabilités & Packaging

- **Actions :**
  - Vérification de la persistance SQLite par requête directe sur `katech-data/dev-a97b6b98a368.sqlite`.
  - Exécution de `bun run verifier-i18n` (0 erreur, parité trilingue FR, EN, AR).
  - Exécution de `bunx tsc --noEmit` (0 erreur TypeScript).
  - Exécution de `bun run format` et `bun run lint` (100% conforme).
  - Exécution de `bun run build` et `bun run paqueter:data`.
  - Mise à jour du journal officiel de traçabilité [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Phase 43).
  - Commit Git et Push sur `origin/main`.

---

### 3. Matrice de Recette & Critères d'Acceptance (Phase Principale 43 — Statut : 🟢 Livré)

| Critère d'Acceptance                 | Test de Vérification                                 |                             Résultat Attendu                             |
| :----------------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------: |
| **Complétude des Blocs**             | Sélectionner successivement chacun des 28 blocs      |   Chaque bloc dispose d'un formulaire dédié d'édition, 0 bloc orphelin   |
| **Contrôle des Boutons CTAs**        | Changer la variante, le lien et la taille d'un CTA   |     Rendu visuel immédiat dans le Live Canvas et persistance en base     |
| **Paramètres de Vue (Layout & SEO)** | Configurer une vue sans footer ou avec fond sombre   | La page respecte les directives visuelles et injecte les métadonnées SEO |
| **Persistance Souveraine SQLite**    | Modifier les blocs et les paramètres de page puis F5 |    Rechargement fidèle des données depuis la base SQLite, zéro perte     |
| **Zéro Régression & Build**          | `bun run lint && bunx tsc --noEmit && bun run build` |               Code 0, dist/ généré, archives zip produites               |

---

## SOUS-PHASE 43.1 : ÉRADICATION FORENSIQUE DES ANGLES MORTS

### Responsivité Réelle du Live Canvas sur Mobile & Tablette, Complétude Absolue 30/30 Blocs (`use_chips` & `brands_marquee`), Persistance Directe SQLite du Modal & Header Transparent

---

### 1. Diagnostic Forensique des 4 Angles Morts Identifiés

1. **Défaut de Responsivité du Live Canvas sur Desktop simulant Mobile/Tablette & sur Écrans Tactiles Réels :**
   - Sur bureau, lorsqu'un utilisateur sélectionne "Mobile (375px)" ou "Tablette (768px)", la boîte du simulateur est restreinte en largeur (`max-w-[375px]`), mais les media queries CSS globales (`md:`, `lg:`) continuent d'évaluer la largeur réelle de la fenêtre (ex: 1920px). Les grilles desktop (3 ou 4 colonnes) restent donc actives à l'intérieur de 375px, écrasant les contenus ou débordant.
   - Sur smartphone physique ou tablette tactile, `device` démarrait par défaut sur "desktop", imposant une échelle non optimisée au lieu de s'adapter nativement.
   - La hauteur fixe `h-[740px]` dans `PagesManager.tsx` ne s'adapte pas aux hauteurs d'écran variables, générant des doubles barres de défilement ou coupant l'aperçu.
2. **Incomplétude Résiduelle de 2 Blocs (`use_chips` & `brands_marquee`) :**
   - Le registre compte 30 blocs universels. 28 étaient pourvus d'inspecteurs dédiés. `use_chips` (puces de filtres d'usage) et `brands_marquee` (défilement des partenaires) manquaient de formulaires dédiés et basculaient encore sur le mode codeur JSON brut.
3. **Persistance Asynchrone Différée du Modal de Vue (`handleSavePageMeta`) :**
   - Valider le modal mettait à jour le state React et passait `isDirty` à `true`, mais n'appelait pas directement `updateSiteContent`. Si l'administrateur rechargeait (F5) sans cliquer sur "Enregistrer les modifications" dans la barre d'outils générale, les réglages de Layout et SEO n'étaient pas encore écrits dans le fichier SQLite physique `katech-data/*.sqlite`.
4. **Header Transparent Non Relaié :**
   - La propriété `transparentHeader` de `PageLayoutConfig` n'était pas passée au composant `<Header />`.

---

### 2. Découpage Chirurgical des Étapes de la Sous-Phase 43.1

#### Étape 43.1.1 : Moteur de Responsivité Profonde du Live Canvas (`src/components/admin/StudioLiveCanvas.tsx`)

- **Fichier :** [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx)
- **Actions :**
  - Auto-détection intelligente du terminal au montage :
    - Si `window.innerWidth < 640px` $\rightarrow$ `setDevice("mobile")`.
    - Si `window.innerWidth < 1024px` $\rightarrow$ `setDevice("tablet")`.
    - Sinon $\rightarrow$ `setDevice("desktop")`.
  - Application de classes de simulation responsive profonde sur le conteneur du simulateur :
    - Mode `mobile` (`simulate-mobile`) : force les grilles internes en 1 colonne (`[&_.grid]:grid-cols-1! [&_[class*="grid-cols-"]]:grid-cols-1! [&_[class*="md\\:grid-cols-"]]:grid-cols-1! [&_[class*="lg\\:grid-cols-"]]:grid-cols-1!`), adapte les espacements de `container-page` et calibre les titres pour un rendu 100% fidèle à un iPhone réel.
    - Mode `tablet` (`simulate-tablet`) : force les grilles en 2 colonnes (`[&_[class*="lg\\:grid-cols-"]]:grid-cols-2! [&_[class*="md\\:grid-cols-3"]]:grid-cols-2!`) pour simuler un iPad authentique.
  - Suppression de tout défilement horizontal résiduel.

#### Étape 43.1.2 : Hauteur Réactive du Cockpit Studio (`src/pages/admin/PagesManager.tsx`)

- **Fichier :** [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Remplacement de `h-[740px]` par un conteneur flexible et réactif : `h-[calc(100vh-13rem)] min-h-[520px] max-h-[850px] w-full`.
  - Adaptation fluide sur tous formats d'écrans (moniteurs ultra-larges, laptops 13 pouces, tablettes et smartphones).

#### Étape 43.1.3 : Complétude Absolue 30/30 Blocs (`src/components/admin/BlockPropsEditor.tsx` & `CommerceBlocks.tsx`)

- **Fichiers :**
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
  - [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/CommerceBlocks.tsx)
- **Actions :**
  - Formulaire dédié pour **`use_chips`** :
    - Titre de section personnalisable trilingue (`p.title`).
    - Chapô / sous-titre explicatif.
    - Affichage / masquage dynamique.
  - Formulaire dédié pour **`brands_marquee`** :
    - Titre de section optionnel (`p.title`).
    - Vitesse de défilement (`slow`, `normal`, `fast`).
    - Masquage des marques sans logo.
  - Prise en charge des surcharges de props dans `UseChipsBlock` et `BrandsMarqueeBlock`.

#### Étape 43.1.4 : Persistance Directe Instantanée SQLite dans le Modal de Page (`handleSavePageMeta`)

- **Fichier :** [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Modification de `handleSavePageMeta` pour appeler directement `await updateSiteContent({ customPages: nextPages })` dès la soumission du modal.
  - Les modifications de slug, layout, SEO et métadonnées de vue sont écrites **instantanément dans la base SQLite locale** `katech-data/dev-a97b6b98a368.sqlite` via transaction ACID, éliminant tout risque de perte au rechargement (F5).

#### Étape 43.1.5 : Prise en Charge Réelle de `transparentHeader` (`src/App.tsx` & `src/components/Header.tsx`)

- **Fichiers :**
  - [`src/App.tsx`](file:///c:/xampp/htdocs/ka-tech/src/App.tsx)
  - [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx)
- **Actions :**
  - Passage de la prop `transparent={transparentHeader}` à `<Header />`.
  - Forçage de la transparence de la barre de navigation lorsque le layout de la vue le stipule.

#### Étape 43.1.6 : Validation CI, Assurance Qualité SQLite, Traçabilités & Packaging

- **Actions :**
  - Vérification de la persistance SQLite par inspection physique directe sur `katech-data/dev-a97b6b98a368.sqlite`.
  - Exécution de `bun run verifier-i18n` (parité trilingue 100% conforme, 0 erreur).
  - Exécution de `bunx tsc --noEmit` (0 erreur TypeScript).
  - Exécution de `bun run format` et `bun run lint` (0 erreur).
  - Exécution de `bun run build` et `bun run paqueter:data`.
  - Mise à jour du journal officiel de traçabilité [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Sous-Phase 43.1).
  - Commit Git et Push sur `origin/main`.

---

### 3. Matrice de Recette & Critères d'Acceptance de la Sous-Phase 43.1

| Critère d'Acceptance                | Test de Vérification                                      |                             Résultat Attendu                              |
| :---------------------------------- | :-------------------------------------------------------- | :-----------------------------------------------------------------------: |
| **Responsivité Réelle Live Canvas** | Basculer en mode Mobile (375px) sur PC                    |   Les grilles basculent authentiquement en 1 colonne, zéro débordement    |
| **Adaptation Tactile & Mobile**     | Ouvrir le studio sur écran tactile ou tablette            |   Détection automatique du device et hauteur adaptée sans double scroll   |
| **Complétude 30/30 Blocs**          | Inspecter `use_chips` et `brands_marquee`                 | Formulaires dédiés présents, 100% des blocs administrables sans JSON brut |
| **Persistance Immédiate SQLite**    | Modifier les métadonnées dans le modal et faire F5 direct |    Données conservées immédiatement depuis la base SQLite, zéro perte     |
| **Header Transparent**              | Activer `transparentHeader` sur une vue personnalisée     |        La navbar reste transparente selon les directives de layout        |
| **Zéro Régression & Build**         | `bun run lint && bunx tsc --noEmit && bun run build`      |               Code 0, dist/ généré, archives zip produites                |
