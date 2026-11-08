# PLAN D'IMPLÉMENTATION — PHASE 39

## Universalisation des Vues Composables 360° : Intégration de l'Accueil, À Propos, Contact & Gestion Globale des Écrans

**Projet :** StacGate Platform (ka-tech)  
**Directeur & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date :** 08 Novembre 2026  
**Statut :** 📋 **Sous-Phase 39.2 en attente de validation formelle par ArchiSys3.0**

---

### 1. Contexte & Problématique

Dans l'état actuel de l'application :

- L'onglet **`[📄 Pages & Vues Composables]`** du Studio Visuel n'exposait à l'origine que deux pages créées (`/cv` et `/projets`).
- Les vues primordiales du site — **Page d'Accueil (`/`)**, **À propos (`/about`)**, et **Contact (`/contact`)** — sont restées des composants React monolithiques à disposition figée.
- ArchiSys3.0 a validé l'**Option C (Convergence Graduelle 360°)** pour faire entrer la **Page d'Accueil** et les **Pages Institutionnelles** au rang de **Vues Composables Souveraines**, réordonnables et éditables bloc par bloc.
- **Sous-Phase 39.1 [LIVRÉE] :** La persistance en base SQLite a été blindée (atomicité du contrôleur PHP, export seed installateur, écriture physique de `customPages` avec 7 324 octets).
- **Audit de Recette & Angles Morts (Sous-Phase 39.2) :** L'audit 360° mené avec ArchiSys3.0 a mis en évidence 4 incohérences inter-onglets à éradiquer :
  1. _Doublons dans le Header :_ `/about` et `/contact` apparaissent deux fois dans la navbar et le drawer mobile car présents à la fois dans `customPages` (`inNavbar: true`) et `H.primaryNav`.
  2. _Désynchronisation Accueil :_ Couper une section dans l'Onglet 2 (_Sections de l'Accueil_) ne masque pas le bloc rendu par l'Onglet 1 (`page_home`) car `CommerceBlocks.tsx` n'interrogeait pas `siteContent[section].enabled !== false`.
  3. _Inertie du switch `inFooter` :_ Cocher `inFooter: true` sur une vue ne l'injectait pas dans les colonnes du pied de page.
  4. _Aides ergonomiques du Studio :_ Absence de précisions visuelles sur le rôle exact de `inNavbar` et `inFooter`.

---

### 2. Objectifs d'Architecture & Garanties Zéro Régression

1. **Intégration de l'Accueil (`/`) comme Vue Composable Racine [LIVRÉ] :**
   - La page d'accueil devient la vue maîtresse `page_home` (slug: `""` ou `"home"`).
   - Les blocs de l'accueil (Hero, FlashSale, Catégories, Produits Phares/Meilleures Ventes, Réassurance, Avis, CTA Contact) deviennent des blocs réordonnables avec les flèches `↑` / `↓`.
   - Si `Index.tsx` détecte la configuration composable, il restitue fidèlement l'ordre personnalisé des blocs ; en cas d'absence de configuration, il applique le repli élégant existant. ZÉRO régression.
2. **Intégration des Pages Institutionnelles Clés [LIVRÉ] :**
   - `page_about` (`/about`) : composée des blocs natifs `company_history`, `values_cards`, `stats_counter`, `contact_cta`.
   - `page_contact` (`/contact`) : composée des blocs `contact_form`, `faq_accordion`, `brand_banner`.
3. **Persistance Souveraine BD SQLite Directe [LIVRÉ - Sous-Phase 39.1] :**
   - Remplacement atomique des listes indexées dans le contrôleur backend PHP.
   - Écriture physique de la section `customPages` dans la table SQLite `site_content`.
   - Inclusion dans `scripts/extraire-donnees-front.ts` pour que `install.php` initialise immédiatement les vues sur toute nouvelle boutique.
4. **Cohérence Croisée Inter-Onglets Absolue (Sous-Phase 39.2) :**
   - Dédoublonnage strict des liens de navigation dans `Header.tsx`.
   - Respect absolu des commutateurs d'activation de sections dans tous les blocs de `CommerceBlocks.tsx`.
   - Injection dynamique et dédoublonnée des pages marquées `inFooter` dans `Footer.tsx`.
   - Précisions ergonomiques dans la modale d'édition de page de `PagesManager.tsx`.

---

### 3. Matrice des Vues Intégrées au Studio Composable

| ID Vue         | Slug             | Titre FR               | Blocs Pré-assemblés par Défaut                                                                                                | Type de Vue                    |
| :------------- | :--------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| `page_home`    | `""` (ou `home`) | 🏠 Accueil             | `hero_banner`, `flash_sale`, `category_cards`, `use_chips`, `best_sellers`, `featured_tabs`, `brands_marquee`, `why_us`, etc. | **Système / Vitrine**          |
| `page_about`   | `about`          | 🏢 À propos & Histoire | `company_history`, `values_cards`, `stats_counter`, `contact_cta`                                                             | **Système / Institutionnelle** |
| `page_contact` | `contact`        | ✉️ Contact & Support   | `direct_contact_cards`, `contact_form`, `faq_accordion`                                                                       | **Système / Support**          |
| `page_cv`      | `cv`             | 👤 Profil & CV         | `profile_hero`, `timeline`, `skills_matrix`, `projects_grid`, `contact_form`                                                  | **Sur-mesure / Profil**        |
| `page_projets` | `projets`        | 🚀 Réalisations        | `projects_grid`, `contact_cta`                                                                                                | **Sur-mesure / Showcase**      |

---

### 4. Découpage des Étapes Chirurgicales

#### Étape 39.1 à 39.4 : Socle des Vues Composables & Sécurisation Backend — [LIVRÉ]

- Vues maîtresses initialisées dans `site-content.ts` et `api/tools/donnees-front.json`.
- Passerelle composable activée sur `/`, `/about`, `/contact`.
- Contrôleur PHP `ControleurContenu.php` blindé avec remplacement atomique des listes.
- Écriture directe en base SQLite (`dev-a97b6b98a368.sqlite`) vérifiée.

---

### Sous-Phase 39.2 : Blindage Intégral de la Cohérence Inter-Onglets du Studio & Éradication des 4 Angles Morts

#### Étape 39.2.A : Dédoublonnage Navigational Header & Drawer Mobile (`Header.tsx`)

- Dans [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx) :
  - Filtrer `customNavItems` pour exclure la racine `/` (`p.slug === "" || p.slug === "home"` car déjà assurée par le Logo du site).
  - Exclure tout élément dont le lien (`/${p.slug}`) figure déjà dans `H.primaryNav` (comparaison insensible à la casse et insensible aux slashes).
  - Résultat : Zéro doublon sur `/about` ou `/contact` dans la barre desktop et dans le tiroir mobile.

#### Étape 39.2.B : Conjonction des Toggles d'Activation Accueil (`CommerceBlocks.tsx`)

- Dans [`src/components/blocks/CommerceBlocks.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/CommerceBlocks.tsx) :
  - Injecter la vérification `siteContent.[sectionKey]?.enabled !== false` sur l'ensemble des blocs e-commerce :
    - `HeroBannerBlock` : `siteContent.hero?.enabled !== false`
    - `FlashSaleBlock` : `siteContent.flashSale?.enabled !== false`
    - `CategoryCardsBlock` : `siteContent.categories?.enabled !== false`
    - `UseChipsBlock` : `siteContent.useChips?.enabled !== false`
    - `BestSellersBlock` : `siteContent.bestSellers?.enabled !== false`
    - `FeaturedTabsBlock` : `siteContent.featuredTabs?.enabled !== false`
    - `BrandsMarqueeBlock` : `siteContent.brandsMarquee?.enabled !== false`
    - `WhyUsBlock` : `siteContent.whyUs?.enabled !== false`
    - `BuilderTeaserBlock` : `siteContent.builderTeaser?.enabled !== false && siteSettings.builderEnabled !== false`
    - `ReviewsGridBlock` : `siteContent.reviews?.enabled !== false`
    - `ContactCtaBlock` : `siteContent.contactCta?.enabled !== false`
    - `TickerBarBlock` : `siteContent.ticker?.enabled !== false`
    - `PromoBannerBlock` : `siteContent.promoBanner?.enabled !== false`
  - Résultat : Désactiver une section dans l'Onglet 2 ("Sections de l'Accueil") coupe immédiatement la section sur la vitrine, même en mode composable.

#### Étape 39.2.C : Intégration Dynamique des Pages dans le Footer (`Footer.tsx`)

- Dans [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) :
  - Récupérer les `customPages` actives ayant `p.isPublished && p.inFooter`.
  - Les injecter dynamiquement dans la colonne de liens institutionnels (colonne avec ID `"fc_company"`), en excluant la racine `/` et en évitant tout doublon avec les liens existants.
  - Résultat : Cocher `inFooter: true` sur n'importe quelle vue l'affiche instantanément dans le pied de page du site.

#### Étape 39.2.D : Clarification & Aides Ergonomiques dans le Studio (`PagesManager.tsx`)

- Dans [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) :
  - Dans la modale de configuration d'une vue, expliciter sous le switch `inNavbar` : _"Visible dans l'en-tête et le menu mobile (dédoublonné si déjà présent dans la navigation principale)"_.
  - Expliciter sous le switch `inFooter` : _"Visible dans la colonne institutionnelle du pied de page"_.

#### Étape 39.2.E : Validation CI Complète, Build & Paquetage

- `bun run verifier-i18n` (100% cohérent).
- `bunx tsc --noEmit` & `bun run lint` (0 erreur).
- `bun run format`.
- `bun run build ; bun run paqueter:data` (régénération des archives de production).
- Mise à jour du journal `tracabilites.md` et synchronisation Git.

---

### 5. Matrice de Recette & Validation

| Test                                    | Comportement Attendu                                                                              |    Statut Visé     |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------ | :----------------: |
| **Persistance BD Directe**              | La table SQLite `site_content` contient la ligne physique `customPages` avec ses 5 vues.          |     🟢 Validé      |
| **Dédoublonnage Header**                | `/about` et `/contact` n'apparaissent qu'une seule fois dans la navbar et le menu mobile.         | 🟡 Sous-Phase 39.2 |
| **Synchronisation Onglet 1 ↔ Onglet 2** | Désactiver la "Vente flash" ou "Avis" dans l'Onglet 2 masque immédiatement le bloc sur l'accueil. | 🟡 Sous-Phase 39.2 |
| **Liaison `inFooter`**                  | Cocher `inFooter: true` sur `/cv` ou `/projets` fait apparaître le lien dans le footer du site.   | 🟡 Sous-Phase 39.2 |
| **Clarté Ergonomique Studio**           | Les commutateurs de visibilité indiquent clairement leur comportement à l'administrateur.         | 🟡 Sous-Phase 39.2 |
| **Batterie Qualité & Build**            | Typescript, ESLint, i18n et build passent sans avertissement ni régression.                       | 🟡 Sous-Phase 39.2 |
