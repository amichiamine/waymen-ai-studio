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

### 3. Matrice de Recette & Critères d'Acceptance

| Critère d'Acceptance                 | Test de Vérification                                 |                             Résultat Attendu                             |
| :----------------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------: |
| **Complétude des 29 Blocs**          | Sélectionner successivement chacun des 29 blocs      |   Chaque bloc dispose d'un formulaire dédié d'édition, 0 bloc orphelin   |
| **Contrôle des Boutons CTAs**        | Changer la variante, le lien et la taille d'un CTA   |     Rendu visuel immédiat dans le Live Canvas et persistance en base     |
| **Paramètres de Vue (Layout & SEO)** | Configurer une vue sans footer ou avec fond sombre   | La page respecte les directives visuelles et injecte les métadonnées SEO |
| **Persistance Souveraine SQLite**    | Modifier les blocs et les paramètres de page puis F5 |    Rechargement fidèle des données depuis la base SQLite, zéro perte     |
| **Zéro Régression & Build**          | `bun run lint && bunx tsc --noEmit && bun run build` |               Code 0, dist/ généré, archives zip produites               |
