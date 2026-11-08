# PLAN DIRECTEUR D'IMPLÉMENTATION — PHASE 46

## Universalisation Totale du Studio 360° : Enrôlement des Vues Systèmes, Parcours de Commande, Hub Blog, Pages Institutionnelles & Éradication des Dépendances Statiques

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date d'Élaboration :** 08/11/2026  
**Statut du Document :** 📋 En Attente de Validation Formelle ("Proceed")

---

### 1. Contexte & Problématique

Suite au diagnostic forensique d'exhaustivité validé par **ArchiSys3.0** (excluant strictement le dossier `devis/` réservé pour instructions ultérieures), un déséquilibre structurel majeur a été mis en évidence :

- Seules **5 vues (25% du site)** sont actuellement composables et administrables dans le Studio 360° (`/`, `/about`, `/contact`, `/cv`, `/projets`).
- **15 vues majeures (75% du site)** sont totalement exclues du Studio, codées en dur dans le code source React, sans possibilité pour l'administrateur de personnaliser les bannières, textes de réassurance, FAQs, blocs WhatsApp ou dispositions visuelles.
- Les liens du footer relatifs à la Garantie, la Livraison et les FAQ redirigent tous artificiellement vers `/about` faute de vraies pages dédiées.
- Le Live Canvas du Studio n'affiche pas le Header et le Footer réels, obligeant l'administrateur à concevoir ses pages en aveugle sans juger de l'immersion globale.

---

### 2. Découpage Chirurgical des Étapes de la Phase 46

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│               PHASE 46 : UNIVERSALISATION TOTALE DU STUDIO 360° SUR L'ENSEMBLE DU SITE                 │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Étape 46.1 : Instanciation Souveraine des 4 Vues Légales & Institutionnelles Dédiées                   │
│   • /livraison-retours, /garantie, /mentions-legales, /conditions-generales                            │
│   • Remplacement des redirections artificielles du footer par de vraies vues composables              │
│                                                                                                        │
│ Étape 46.2 : Moteur d'Enrôlement des Vues Systèmes dans le Studio (SystemViewRegistry)                 │
│   • Registre typé des vues systèmes : /blog, /track, /builder, /cart, /checkout/success, 404          │
│   • Sélecteur de vues hiérarchisé par groupes (Vitrine/Institutionnel, Systèmes/Parcours, Custom)     │
│                                                                                                        │
│ Étape 46.3 : Raccordement Visuel des Zones Composables dans les Vues Systèmes                          │
│   • Injection de blocs personnalisables (Haut, Bas, Réassurance, Cross-selling, WhatsApp)             │
│   • Préservation intégrale et intacte des moteurs fonctionnels natifs (panier, filtres, checkout)     │
│                                                                                                        │
│ Étape 46.4 : Éradication du Dédoublement Hybride dans About.tsx & Contact.tsx                          │
│   • Convergence 100% avec DynamicPage.tsx (support pageBg, SEO OpenGraph complet, noIndex)             │
│                                                                                                        │
│ Étape 46.5 : Immersion Visuelle Globale dans le Live Canvas (Header & Footer Réels)                    │
│   • Commutateur dans la barre d'outils du Studio pour afficher le Header & Footer réels dans le Canvas│
│                                                                                                        │
│ Étape 46.6 : Validation CI, Assurance Qualité Trilingue, Traçabilités & Packaging                     │
│   • Contrôles stricts i18n FR/EN/AR, tsc, lint, build et packaging katech-site / katech-data           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### Étape 46.1 : Instanciation Souveraine des 4 Vues Légales & Institutionnelles Dédiées

- **Fichier :** [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts)
- **Actions :**
  - Ajout des 4 définitions de vues complètes dans `seedCustomPages()` :
    1. `/livraison-retours` (`page_shipping_returns`) : Délais de livraison 58 Wilayas en Cash-on-Delivery, suivi, politique de rétractation et retours sous 48h. Composée avec `brand_banner`, `values_grid`, `faq_accordion`, `contact_cta`.
    2. `/garantie` (`page_warranty`) : Garantie matérielle officielle 100% authentique, SAV réactif, prise en charge des pièces défectueuses. Composée avec `brand_banner`, `features_grid`, `faq_accordion`, `direct_contact_cards`.
    3. `/mentions-legales` (`page_legal_notices`) : Mentions éditeur, registre du commerce, hébergement et propriété intellectuelle StacGate Platform. Composée avec `markdown_section`, `contact_cta`.
    4. `/conditions-generales` (`page_terms_conditions`) : Conditions Générales de Vente (CGV), commandes, prix en DZD, facturation et conformité légale. Composée avec `markdown_section`, `faq_accordion`.
  - Mise à jour des liens du footer dans `seedSiteContent().footer.columns` :
    - Remplacement de `href: "/about"` pour la Garantie par `href: "/garantie"`.
    - Remplacement de `href: "/about"` pour la Livraison par `href: "/livraison-retours"`.
    - Raccordement des liens CGV et Mentions Légales.
  - Définition des clés trilingues complètes (FR, EN, AR).

#### Étape 46.2 : Moteur d'Enrôlement des Vues Systèmes dans le Studio (`SystemViewRegistry`)

- **Fichiers :**
  - [`src/types/pages.ts`](file:///c:/xampp/htdocs/ka-tech/src/types/pages.ts)
  - [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Extension du modèle `CustomPageDefinition` avec le drapeau `isSystem?: boolean` et `systemKey?: "blog" | "track" | "builder" | "cart" | "checkout_success" | "not_found"`.
  - Initialisation dans `site_content` des configurations de blocs pour les 6 vues systèmes clés :
    1. `system_blog` (`slug: "blog"`) : Page d'accueil du blog.
    2. `system_track` (`slug: "track"`) : Page de suivi de commande.
    3. `system_builder` (`slug: "builder"`) : Page du configurateur PC.
    4. `system_cart` (`slug: "cart"`) : Page panier.
    5. `system_checkout_success` (`slug: "checkout-success"`) : Page de confirmation de commande.
    6. `system_not_found` (`slug: "404"`) : Page d'erreur 404.
  - Refonte du sélecteur de vues du Studio avec des sous-groupes visuels (`SelectGroup` / `SelectLabel`) :
    - 🏛️ **Vues Vitrine & Institutionnelles** (Accueil, À Propos, Contact, CV, Projets, Livraison, Garantie, Mentions Légales, CGV)
    - ⚙️ **Vues Systèmes & Parcours Client** (Blog, Suivi de Commande, Configurateur, Panier, Succès Commande, 404)
    - 📄 **Vues Personnalisées Libres** (Toutes les landing pages créées manuellement)

#### Étape 46.3 : Raccordement des Zones Composables dans les Vues Systèmes

- **Fichiers :**
  - [`src/pages/TrackOrder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/TrackOrder.tsx)
  - [`src/pages/Blog.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Blog.tsx)
  - [`src/pages/Builder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Builder.tsx)
  - [`src/pages/Cart.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Cart.tsx)
  - [`src/pages/CheckoutSuccess.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CheckoutSuccess.tsx)
  - [`src/pages/NotFound.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/NotFound.tsx)
- **Actions :**
  - Dans chaque page système, lecture réactive de sa définition dans `siteContent.customPages` (ex: `page.slug === "track"`).
  - Rendu ordonné :
    - Rendu des blocs placés avant le composant fonctionnel (ex: bannière héro, alertes, promo).
    - Rendu du composant fonctionnel natif (formulaire de recherche, stepper colis, grille articles, configurateur, panier).
    - Rendu des blocs placés après le composant fonctionnel (cross-selling, avis, réassurance, FAQ, contact).
  - Préservation intégrale et absolue de la logique applicative existante : zéro régression sur les formulaires de commande, les calculs de totaux ou les redirections.

#### Étape 46.4 : Éradication du Dédoublement Hybride dans `About.tsx` & `Contact.tsx`

- **Fichiers :**
  - [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx)
  - [`src/pages/Contact.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Contact.tsx)
- **Actions :**
  - Remplacement du code dupliqué par l'exécution native de la vue dynamique avec tous ses super-pouvoirs : couleur de fond `pageBg`, métadonnées OpenGraph complètes, canonical et indexation maîtrisée.
  - Conservation d'un repli gracieux sécurisé en cas d'absence de configuration en base.

#### Étape 46.5 : Immersion Visuelle Globale dans le Live Canvas (`StudioLiveCanvas.tsx`)

- **Fichier :** [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx)
- **Actions :**
  - Ajout d'un bouton d'activation/désactivation dans la barre d'outils du Live Canvas : _"Afficher Header & Footer réels"_.
  - Lorsque ce mode est actif, le Canvas injecte au-dessus et en-dessous de la page simulée une version miroir visuelle du Header et du Footer réels du site (avec le logo actif, les liens de navigation et la transparence configurée), permettant à l'administrateur de prévisualiser l'immersion complète sans quitter le Studio.

#### Étape 46.6 : Validation CI, Assurance Qualité Trilingue, Traçabilités & Packaging

- **Actions :**
  - Exécution de `bun run verifier-i18n` (parité trilingue FR, EN, AR 100% conforme).
  - Exécution de `bunx tsc --noEmit` (0 erreur TypeScript).
  - Exécution de `bun run format` et `bun run lint` (0 erreur).
  - Exécution de `bun run build` et `bun run paqueter:data`.
  - Mise à jour du journal officiel [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Phase 46).
  - Commit Git et Push sur `origin/main`.

---

### 3. Matrice de Recette & Critères d'Acceptance

| Critère d'Acceptance                   | Test de Vérification                                                   |                                                Résultat Attendu                                                 |
| :------------------------------------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------: |
| **Vraies Pages Légales Dédiées**       | Cliquer sur "Garantie", "Livraison", "CGV" dans le Footer              | Ouvre `/garantie`, `/livraison-retours`, `/conditions-generales` avec de vrais blocs riches au lieu de `/about` |
| **Sélecteur de Vues Hiérarchisé**      | Ouvrir le sélecteur de vues dans le Studio                             |            Les vues sont classées par groupes : Vitrine/Institutionnelles, Systèmes/Parcours, Custom            |
| **Personnalisation Suivi de Commande** | Ajouter un bloc FAQ ou Contact sur `/track` dans le Studio             |                 La page `/track` affiche le formulaire de suivi entouré des blocs personnalisés                 |
| **Personnalisation Hub Blog**          | Ajouter un bloc héro ou newsletter sur `/blog` dans le Studio          |                    La page `/blog` affiche la bannière personnalisée au-dessus des articles                     |
| **Cross-selling Panier & Succès**      | Ajouter un carrousel `best_sellers` sur `/cart` ou `/checkout/success` |                         Rendu immédiat des produits recommandés sur le tunnel de vente                          |
| **Header & Footer en Live Canvas**     | Activer le commutateur dans la barre d'outils du Canvas                |                     Le Header et le Footer apparaissent dans le simulateur autour des blocs                     |
| **Zéro Régression & Build**            | `bun run lint && bunx tsc --noEmit && bun run build`                   |                                  Code 0, dist/ généré, archives zip produites                                   |
