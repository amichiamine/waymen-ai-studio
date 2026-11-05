# PLAN D'IMPLÉMENTATION 19

## Assainissement Ultime des Angles Noirs Vitrine, Accessibilité RTL & Universalité 100% Tout Commerce

- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Mode d'Action :** `mode plan`
- **Statut :** En attente d'arbitrage et de validation par ArchiSys3.0
- **Date :** 05 Novembre 2026

---

### 1. Contexte & Diagnostic des Angles Noirs Détectés

Lors du diagnostic d'assurance qualité exhaustif réalisé en mode Read-Only, **7 angles noirs et angles morts** ont été mis au jour dans le code source :

1. **Fiche Produit ([`Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx)) :** Textes bruts français non traduits (bouton favori `"Dans les favoris"`, réassurances de services `"Garantie & Support"`, formulaire complet d'avis client en français brut, date figée en `"fr-FR"`, et brisure RTL avec `text-right`).
2. **Carte Produit ([`ProductCard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ProductCard.tsx)) :** Infraction RTL avec `left-3` / `right-3` au lieu de `start-3` / `end-3`, badge `"Service"` non traduit, `aria-label` en français brut.
3. **Page Catégorie ([`CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx)) :** État d'erreur `"Catégorie introuvable"` non traduit, curseur de prix rigide (20 000 DA à 500 000 DA) inadapté aux petits ou très gros articles, devise `"DA"` gravée en dur.
4. **Page Recherche ([`Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx)) :** Même curseur de prix statique et rigide (20 000 DA à 500 000 DA).
5. **Pied de Page ([`Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx)) :** Formulaire newsletter non traduit (`"Newsletter"`, `"S'inscrire"` en dur), et colonne des catégories statique non synchronisée avec le catalogue.
6. **Éditeur d'Onglets Back-Office ([`Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx)) :** L'administrateur est bridé à une liste en dur de 4 catégories PC (`["laptops", "desktops", "builds", "phones"]`), bloquant l'usage des catégories dynamiques.
7. **Hero Banner ([`Hero.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Hero.tsx)) :** Image laptop de gaming importée en dur si `showImage` est actif.

---

### 2. Découpage Chirurgical des Travaux (Phasage)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PLAN D'IMPLÉMENTATION 19                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
    ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
    ▼                  ▼                               ▼                  ▼
┌──────────────┐ ┌──────────────┐               ┌──────────────┐   ┌──────────────┐
│  Étape 19.A  │ │  Étape 19.B  │               │  Étape 19.C  │   │  Étape 19.D  │
│ Fiche & Carte│ │ Catégories & │               │  Pied de     │   │ Back-Office  │
│   Produit    │ │  Recherche   │               │ Page & Hero  │   │ Content.tsx  │
│ 100% i18n/RTL│ │  Prix dyn.   │               │ Catégories   │   │  Catégories  │
└──────────────┘ └──────────────┘               └──────────────┘   └──────────────┘
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │         Étape 19.E           │
                       │   Vérification CI & Build    │
                       │   (lint, tsc, verif-i18n)    │
                       └──────────────────────────────┘
```

#### Étape 19.A : Internationalisation Intégrale & Conformité RTL (Product.tsx & ProductCard.tsx)

- **Fichier [`src/pages/Product.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Product.tsx) :**
  - Bouton favori : `{liked ? t("pd.inFavorites") : t("pc.fav")}`.
  - Réassurances adaptées aux services :
    - Titre garantie : `{isService ? t("pd.serviceWarranty") : t("pd.warranty")}`.
    - Sous-titre : `{isService ? t("pd.serviceWarrantySub") : t("pd.warranty.sub")}`.
    - Titre exécution : `{isService ? t("pd.serviceDelivery") : t("pd.delivery")}`.
    - Sous-titre : `{isService ? t("pd.serviceDeliverySub") : t("pd.delivery.sub")}`.
  - Formulaire d'avis :
    - Titre : `{t("pd.addRev")}`.
    - Avis en attente : `{t("pd.reviewPending")}`.
    - Placeholder titre : `t("pd.reviewTitlePlaceholder")`.
    - Placeholder commentaire : `t("pd.reviewBodyPlaceholder")`.
    - Bouton envoi : `{t("pd.reviewSubmit")}`.
    - Invitation connexion : `{t("pd.reviewLogin")}`.
  - Date localisée : `new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR").format(...)`.
  - RTL : remplacer `text-right` par `text-end`.
- **Fichier [`src/components/ProductCard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ProductCard.tsx) :**
  - Remplacer `left-3` par `start-3`, et `right-3` par `end-3`.
  - Badge service : `{t("pd.badgeService")}`.
  - `aria-label` de notation localisé.

#### Étape 19.B : Échelles de Prix Dynamiques & Catégories Universelles (CategoryDetail.tsx & Search.tsx)

- **Fichier [`src/pages/CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx) :**
  - État introuvable traduit via `t("cp.notFound")` et `t("cp.seeAllCategories")`.
  - Calcul dynamique de la borne max de prix : `maxCatalogPrice = Math.max(...all.map(p => p.price), 50000)`.
  - Bornes du curseur : `min={0}`, `max={maxCatalogPrice}`, `step={Math.max(100, Math.round(maxCatalogPrice / 100))}`.
  - Affichage de prix utilisant `formatDZD` ou le symbole de devise issu de `siteSettings`.
  - Conditionnement de `<UseChips />` uniquement si la catégorie contient des articles tagués.
- **Fichier [`src/pages/Search.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Search.tsx) :**
  - Bornes de prix dynamiques adaptées au catalogue (`min={0}`, `max={maxCatalogPrice}`).

#### Étape 19.C : Pied de Page Dynamisé & Universalité du Seed (Footer.tsx & site-content.ts)

- **Fichier [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx) :**
  - Traduction du bloc Newsletter : titre, placeholder, et bouton (`t("footer.newsletter.title")`, etc.).
  - Dynamisation de la colonne catégories : si la colonne s'appelle "Catégories", générer les liens depuis `useCategoryList()` pour que tout ajout dans l'admin soit instantanément répercuté dans le footer.
- **Fichier [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) :**
  - Neutralisation des mentions informatiques du seed par défaut pour garantir une boutique immédiatement neutre et prête pour tout secteur commercial.

#### Étape 19.D : Libération des Catégories dans le Back-Office (Content.tsx)

- **Fichier [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) :**
  - Remplacement de la constante rigide `const cats: Category[] = ["laptops", "desktops", "builds", "phones"];` par la liste réelle des catégories injectée via `useCategoryList()`.
  - Permettre à l'administrateur de composer ses onglets d'accueil avec n'importe quelle catégorie du magasin.

#### Étape 19.E : Dictionnaires Trilingues, Validation CI & Packaging

- Enrichissement rigoureux des dictionnaires trilingues :
  - [`src/lib/i18n/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/fr.ts)
  - [`src/lib/i18n/en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/en.ts)
  - [`src/lib/i18n/ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/ar.ts)
- Contrôles de vérité stricts :
  - `bun run verifier-i18n` (0 clé manquante, parité 1:1:1).
  - `bun run format`.
  - `bun run lint`.
  - `bunx tsc --noEmit`.
  - `bun run build`.
- Enregistrement dans [`tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md), commit Git et push.

---

### 3. Matrice de Recette & Critères de Succès

| Test de Recette                                         | Résultat Attendu                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Fiche Produit en Arabe (`?lang=ar`)                     | Zéro texte en français, date en format arabe local, formulaire d'avis 100% traduit, barres d'avis alignées à droite (`text-end`).    |
| Fiche Produit en Anglais (`?lang=en`)                   | Zéro texte en français, statut favori en anglais (`"In favorites"`), services réassurés en anglais.                                  |
| Page Catégorie avec produits à 1 500 DA ou 2 000 000 DA | Le curseur de prix s'adapte de 0 DA au prix maximum réel, permettant de filtrer les petits comme les grands montants.                |
| Footer                                                  | Le formulaire Newsletter est traduit dans les 3 langues, et les liens de catégories reflètent les catégories réelles de la boutique. |
| Admin Contenu (`/admin/content`)                        | L'administrateur peut choisir n'importe quelle catégorie personnalisée dans les onglets de la page d'accueil.                        |
| Pipeline CI                                             | 0 erreur TypeScript, 0 erreur ESLint, 0 clé i18n manquante, build Vite 100% vert.                                                    |
