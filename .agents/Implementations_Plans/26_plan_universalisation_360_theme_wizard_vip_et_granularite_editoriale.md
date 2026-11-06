# Plan d'Implémentation 26 (Intégral & Révisé) — Universalisation Totale 360° : Éradication des Mocks, Moteur de Thème Avancé, Granularité Éditoriale Vue-par-Vue & Refonte du Setup Wizard

## 1. Contexte & Réponse Exhaustive aux 5 Axes d'ArchiSys3.0

Ce plan traite à **parts égales et avec une profondeur maximale** l'intégralité des 5 axes identifiés par ArchiSys3.0 :

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LES 5 PILIERS DU PLAN D'UNIVERSALISATION 360°                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. ÉRADICATION DES MOCKS & HARDCODAGES : Suppression des fallbacks et textes en dur    │
│ 2. MOTEUR DE THÈME 360° : Palette complète, Typographie web, Border-Radius & Ombres   │
│ 3. GRANULARITÉ ÉDITORIALE VUE PAR VUE : Contrôle section par section & vue par vue    │
│ 4. TÉLÉVERSEMENT DIRECT LOGO & FAVICON DANS LE WIZARD : Upload + Médiathèque intégrés  │
│ 5. SETUP WIZARD ENRICHI : Configuration commerce, livraison, thèmes & sections métier  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Analyse Détaillée des 5 Piliers d'Intervention

---

### PILIER 1 : Éradication des Mocks & Hardcodages (Vitrine & Backstage)

Actuellement, plusieurs composants vitrine et du backstage reposent sur des constantes ou des textes figés :

1. **Catégories Informatiques Fantômes dans `CategoryDetail.tsx` & `Search.tsx` :**
   - Constat : `const BUILTIN_CATEGORIES = ["laptops", "desktops", "builds", "phones"]` et `getCategoryMeta()` retombent sur des images et textes d'ordinateurs même si le commerçant a créé une boutique de mode ou d'alimentation.
   - Action : Suppression de `BUILTIN_CATEGORIES` ; le catalogue repose **exclusivement sur les catégories réelles** issues de l'API / base de données.
2. **Métriques et Chiffres Clés en Dur dans `About.tsx` :**
   - Constat : `STATS = [{ value: "15K+", labelKey: "about.stat.clients" }, ...]` est codé en dur dans le fichier TypeScript.
   - Action : Migration de ces 4 indicateurs clés dans `SiteContent.about.stats` pour les rendre 100% administrables depuis le backstage (valeur et libellé).
3. **Badges de Réassurance en Dur dans `Product.tsx` :**
   - Constat : Les blocs de garantie et livraison sous le bouton d'ajout au panier sont des balises fixes dans le JSX.
   - Action : Raccordement à `SiteContent.productPage.reassurances` (icône, titre, description configurables).
4. **Puces d'Usage Techniques `UseChips.tsx` :**
   - Constat : Les tags « Gaming », « Bureautique », « Montage » avec icônes CPU sont figés.
   - Action : Conditionnement par switch d'activation et libellés personnalisables.

---

### PILIER 2 : Moteur de Thème 360° (Palette, Typo, Radius, Ombres)

Actuellement, seul `primaryColor` est administrable. Nous déployons un **Design System dynamique complet** dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) et [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) :

1. **Palette Chromatique Étendue (Schéma `SiteSettings`) :**
   - `primaryColor` : Couleur principale de marque (boutons principaux, liens actifs, focus).
   - `secondaryColor` : Couleur d'accentuation (badges, boutons secondaires, bordures actives).
   - `accentColor` : Couleur de mise en avant (promotions, alertes visuelles, glow).
   - Nuanciers thématiques prêts à l'emploi (Bleu Tech, Luxe Noir & Or, Émeraude Nature, Violet Créatif, Terre Cuite, Minimalist Monochrome).
2. **Typographie Web Multi-Polices :**
   - `fontFamily` : Sélecteur de typographie web injectant dynamiquement la police sur `:root` :
     - _Inter_ (Neutre, lisible, tech)
     - _Plus Jakarta Sans_ (Moderne, dynamique)
     - _Outfit_ (Élégant, premium)
     - _Poppins_ (Chaleureux, e-commerce grand public)
     - _Cairo_ (Optimisé pour le multilingue et l'arabe RTL)
3. **Formes & Géométrie (`borderRadius`) :**
   - `borderRadius` :
     - `sharp` : 0px (Brutaliste, luxe angulaire)
     - `modern` : 6px (Moderne, discret, équilibré)
     - `soft` : 12px (Doux, standard e-commerce actuel)
     - `pill` : 20px (Très arrondi, ludique, accessible)
   - Injection directe dans `--radius` répercutée sur tous les boutons, cartes, inputs et modals.
4. **Styles de Boutons & Ombres :**
   - Option d'ombrage (`flat`, `subtle`, `glow`).

---

### PILIER 3 : Granularité Éditoriale Vue par Vue & Section par Section (« Contenu du site »)

Restructuration de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) et du schéma `SiteContent` pour administrer **chaque vue, chaque section, chaque composant** :

#### A. Vue Accueil (`Index.tsx`) — Contrôle Total Section par Section :

- Ajout d'interrupteurs individuels `enabled: boolean` pour les 11 sections de l'accueil :
  1. `hero.enabled`
  2. `flashSale.enabled`
  3. `categories.enabled`
  4. `useChips.enabled`
  5. `bestSellers.enabled`
  6. `featuredTabs.enabled`
  7. `brandsMarquee.enabled`
  8. `whyUs.enabled`
  9. `builderTeaser.enabled` (Permet de masquer le teaser configurateur en 1 clic pour un magasin de mode !)
  10. `reviews.enabled`
  11. `contactCta.enabled`
- Chaque section n'est affichée sur `Index.tsx` que si son interrupteur est actif.

#### B. Vue Catalogue & Rayons (`/category` & `/category/:slug`) :

- `shopPage.bannerTitle` : Titre personnalisé d'en-tête de rayon.
- `shopPage.bannerSubtitle` : Description commerciale.
- `shopPage.showFilters` : Switch pour masquer/afficher la colonne des filtres de recherche.
- `shopPage.gridColumns` : Sélecteur de colonnes sur grand écran (3 ou 4 colonnes).

#### C. Vue Fiche Produit (`/product/:id`) :

- `productPage.showWhatsAppButton` : Activer/désactiver le bouton de commande directe via WhatsApp.
- `productPage.whatsAppPreFilledText` : Message pré-rempli (avec variables `{productName}`, `{price}`).
- `productPage.reassurances` : Liste de 2 à 4 blocs d'assurance (icône, titre, sous-titre) éditables.
- `productPage.customTabTitle` & `productPage.customTabContent` : Onglet additionnel libre (Guide des tailles, Conseils d'utilisation, etc.).

#### D. Vue Panier, Tunnel de Commande & Succès (`/checkout` & `/checkout/success`) :

- `checkoutPage.reassuranceText` : Message d'assurance affiché sous le récapitulatif du total.
- `checkoutPage.successTitle` : Titre de confirmation de commande personnalisable.
- `checkoutPage.successMessage` : Message chaleureux de remerciement et consignes de livraison.

#### E. Vue Contact & FAQ (`/contact`) :

- `contactPage.faqTitle` & `contactPage.faqSubtitle` : En-tête de la foire aux questions.
- `contactPage.faqItems` : Accordéon dynamique avec questions/réponses ajoutables, modifiables et supprimables depuis le backstage.

---

### PILIER 4 : Téléversement Direct du Logo et du Favicon dans le Setup Wizard

Dans [`src/components/admin/SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) :

- Remplacement des `<Input value={logoUrl} placeholder="URL..." />` par :
  - Bouton **Téléverser** natif ouvrant l'explorateur de fichiers de l'ordinateur (`handleLogoUpload`).
  - Bouton **Médiathèque** ouvrant la modale universelle `<MediaPickerDialog>`.
  - Aperçu en direct immédiat du logo et du favicon choisis.
  - Bouton de réinitialisation au logo/favicon officiel en cas de besoin.

---

### PILIER 5 : Setup Wizard Enrichi en Configurations & Métiers

Refonte du parcours d'onboarding en **5 étapes professionnelles** :

1. **Étape 1 : Identité de Marque & Médias** : Nom de boutique, Slogan, Logo (avec upload direct), Favicon (avec upload direct).
2. **Étape 2 : Coordonnées & Contact** : Email, Téléphone, WhatsApp direct, Adresse physique, Horaires.
3. **Étape 3 : Thème 360° & Style** : Mode d'affichage (sombre/clair/système), palette bicolore (primaire + secondaire), et choix d'arrondi (radius).
4. **Étape 4 : Métier & Sections de la Boutique** :
   - Choix du profil métier (Tech, Mode, Beauté, Bazar, Services).
   - **Pré-activation intelligente des sections de la page d'accueil** (ex : si mode ou beauté est choisi, désactiver automatiquement le configurateur PC et activer les catégories vedettes).
   - Configuration monétaire initiale (Devise : DA, €, $, etc.).
5. **Étape 5 : Catalogue Démo & Finalisation** :
   - Option claire : Purger les produits démo pour partir d'une base vierge OU conserver le catalogue démo comme guide.
   - Application instantanée de toutes les configurations sans rechargement.

---

## 3. Découpage Chirurgical en 4 Jalons d'Exécution

```
Jalon 26.A : Moteur de Thème 360° (Palette chromatique, Radius, Polices & CSS)
Jalon 26.B : Refonte Intégrale du Setup Wizard (Uploads Logo/Favicon & 5 Étapes Enrichies)
Jalon 26.C : Granularité Éditoriale Vue par Vue & Interrupteurs de Sections Accueil
Jalon 26.D : Éradication des Mocks Résiduels, Catégories Fantômes & Textes en Dur
```

---

## 4. Matrice de Recette & Critères de Succès

| Test / Scénario               | Comportement Attendu                                                                                                         | Statut     |
| :---------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :--------- |
| **Upload Logo dans Wizard**   | Clic sur « Téléverser » $\rightarrow$ sélection d'une image sur PC $\rightarrow$ logo uploadé et prévisualisé dans le Wizard | À vérifier |
| **Moteur Thème 360°**         | Modifier la couleur secondaire et basculer le radius sur `pill` (20px) arrondit instantanément boutons et cartes             | À vérifier |
| **Switches Sections Accueil** | Désactiver `builderTeaser` et `useChips` dans « Contenu du site » les fait disparaître immédiatement de la vitrine           | À vérifier |
| **Granularité Vue Produit**   | Modifier le texte de réassurance ou la FAQ contact dans le backstage met à jour la page correspondante en direct             | À vérifier |
| **Zéro Mock Résiduel**        | Une boutique de cosmétiques sans produits tech ne fait plus mention d'ordinateurs ou de `BUILTIN_CATEGORIES`                 | À vérifier |
| **Pipeline de Vérité CI**     | `bun run verifier-i18n`, `bun run lint`, `bunx tsc --noEmit`, `bun run build` à 0 erreur                                     | À vérifier |
| **Conservation Archives ZIP** | Présence cumulative de l'ensemble des paquets de déploiement horodatés                                                       | À vérifier |
