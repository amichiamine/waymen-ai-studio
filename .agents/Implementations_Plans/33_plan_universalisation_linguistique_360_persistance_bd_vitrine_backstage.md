# PLAN D'IMPLÉMENTATION 33 — Universalisation Linguistique 360° : Persistance BD des Catégories & Marques, Vitrine, Sceau Officiel ArchiSys3.0, Backstage & Dictionnaires

**Projet Hôte :** StacGate Platform (ex KA Tech)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan (`RequestFeedback: true`)  
**Statut :** 🟡 En attente de validation par ArchiSys3.0

---

## 1. Contexte & Problématique

L'audit approfondi du projet a révélé une disparité majeure entre les textes de l'interface et les données métier, ainsi que la présence résiduelle de chaînes brutes en français dans le code source :

1. **Persistance des Catégories et Marques en BD (Angle Noir Métier) :**
   Alors que le Blog et les Produits supportent déjà le format universel `Localized<string>` (`{ fr, en?, ar? }` stocké en JSON en BD), les tables `categories` et `brands` enregistrent `label`, `description` et `country` sous forme de simples chaînes monolingues. Dans le Backstage, les formulaires `CategoryForm.tsx` et `BrandForm.tsx` ne proposent qu'un seul champ de saisie en français, interdisant à l'administrateur de renseigner son catalogue en anglais ou en arabe. Sur la vitrine, [`CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) affiche en brut `c.label` sans passer par la localisation.
2. **Vitrine & Sceau Officiel d'Architecture R&D :**
   Dans [`About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx), le sceau officiel d'architecture validé sous la direction d'ArchiSys3.0 est actuellement codé en dur en français. De même, l'écran de repli lorsque le Builder PC est désactivé ([`Builder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Builder.tsx)), la date de retour de maintenance ([`MaintenanceGate.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/MaintenanceGate.tsx)) et les alertes de boutique vide sont monolingues.
3. **Backstage Administration (Gisement de chaînes brutes) :**
   Dans [`Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) (84 occurrences), [`SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) (74 occurrences), [`Dashboard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Dashboard.tsx) (sceau d'architecture admin), les éditeurs visuels et les validateurs Zod, de nombreux libellés, onglets, descriptions de secteurs, polices et boutons sont codés en dur en français.
4. **Dictionnaires i18n :**
   148 clés dans `src/lib/i18n/en.ts`, `ar.ts` et `admin/...` sont de simples copies de la version française et doivent être traduites dans leurs langues cibles respectives.

---

## 2. Objectifs d'Architecture & Périmètre d'Intervention

La Phase 33 applique la règle d'or universelle **S11 (Enrichir sans casser)** pour doter la plateforme d'un multilinguisme 360° irréprochable :

### A. Persistance BD des Catégories & Marques (`Localized<string>`)

- **Backend PHP :**
  - Dans [`ControleurCategories.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurCategories.php) : sérialiser `label` et `description` via `Db::json()` à l'écriture, et décoder via `Db::dejson()` à la lecture. Une chaîne simple reste tolérée pour une rétrocompatibilité à 100%.
  - Dans [`ControleurMarques.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMarques.php) : sérialiser `description` et `country` via `Db::json()` / `Db::dejson()`.
- **Typage & Normalisation :**
  - Mettre à jour `AdminCategory` (`label: Localized<string>`, `description: Localized<string>`) et `AdminBrand` dans [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) et [`src/api/types.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/types.ts).
- **Formulaires Admin :**
  - Équiper [`CategoryForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/CategoryForm.tsx) et [`BrandForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BrandForm.tsx) des onglets `FR` / `EN` / `AR` (`LLocalizedInput`, `LLocalizedTextarea`), sur le modèle déjà éprouvé de `ProductForm.tsx` et `BlogForm.tsx`.
- **Rendu Vitrine :**
  - Dans [`CategoryCards.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/CategoryCards.tsx) et [`CategoryDetail.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/CategoryDetail.tsx), afficher `L(c.label)` et `L(c.description)` avec repli automatique sur la langue active du visiteur.
- **Données Seed :**
  - Enrichir `seedCategories()` dans `admin-store.tsx` et `donnees-front.json` avec les traductions complètes FR/EN/AR pour les 4 catégories natives (et éliminer la mention "KA Build" résiduelle au profit de StacGate).
  - Enrichir les spécifications produits seed en français brut dans `src/data/products.ts` (ex: `battery: { fr: "Jusqu'à 33h de vidéo", en: "Up to 33h video", ar: "حتى 33 ساعة فيديو" }`).

### B. Vitrine & Sceau Officiel ArchiSys3.0

- Dans [`About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx) : connecter le sceau d'architecture certifiée et de direction R&D aux clés de dictionnaire :
  - `about.archisys.badge` : "🛡️ Architecture & R&D Certifiées" / "🛡️ Certified Architecture & R&D" / "🛡️ هندسة وبحث وتطوير معتمدة"
  - `about.archisys.title` : "Conception & Direction Technique" / "Technical Direction & Design" / "التصميم والإدارة التقنية"
  - `about.archisys.desc` : Description officielle traduite dans les 3 langues.
- Dans [`Builder.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Builder.tsx) : internationaliser l'écran de configurateur désactivé (`builder.disabled.title`, `builder.disabled.back`).
- Dans [`MaintenanceGate.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/MaintenanceGate.tsx), [`BandeauBoutiqueVide.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/BandeauBoutiqueVide.tsx), [`ErrorBoundary.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/ErrorBoundary.tsx) et [`DataModeBadge.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/DataModeBadge.tsx) : éradiquer les textes bruts.

### C. Backstage Administration

- Dans [`Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : brancher l'ensemble des 84 chaînes brutes (titres d'onglets, wizard banner, logo officiel, noms de polices, styles de boutons, live modal VIP, placeholders, options multilingues et étoiles) sur le dictionnaire `admin.reglages.*`.
- Dans [`Dashboard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Dashboard.tsx) : brancher le sceau d'architecture admin sur `admin.socle.archisys.*`.
- Dans [`SetupWizard.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SetupWizard.tsx) : brancher les 74 chaînes d'onboarding et des secteurs de boutique sur `admin.reglages.wizard.*`.
- Dans [`BuilderStepsVisualEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BuilderStepsVisualEditor.tsx) et [`SettingsVisualEditors.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/SettingsVisualEditors.tsx) : internationaliser les composants et messages.
- Dans [`Reports.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Reports.tsx) : traduire dynamiquement les entêtes des exports CSV.

### D. Harmonisation des Dictionnaires i18n

- Réviser et traduire dans les fichiers `src/lib/i18n/{en,ar}.ts` et `src/lib/i18n/admin/*/{en,ar}.ts` les 148 clés identifiées lors de l'audit.

---

## 3. Découpage Chirurgical des Étapes

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 33 : Grand Chantier Universalisation Linguistique 360°          │
├─────────┬──────────────────────────────────────────────────────────────┤
│ Étape 1 │ Backend & API : Db::json/dejson pour Catégories & Marques    │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 2 │ Frontend Types & Formulaires Admin : CategoryForm, BrandForm │
│         │ (Onglets FR / EN / AR, LLocalizedInput, LLocalizedTextarea)  │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 3 │ Vitrine & Données Seed : CategoryCards, CategoryDetail,      │
│         │ About.tsx (Sceau ArchiSys), Builder.tsx, MaintenanceGate     │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 4 │ Backstage : Settings.tsx (84 chaînes), SetupWizard (74 ch.), │
│         │ Dashboard.tsx (Sceau Admin), VisualEditors, Reports CSV      │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 5 │ Dictionnaires i18n : Traduction réelle des 148 clés EN & AR │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Étape 6 │ Contrôles Qualité : verifier-i18n, format, lint, tsc, build  │
└─────────┴──────────────────────────────────────────────────────────────┘
```

---

## 4. Matrice de Recette & Vérification

| ID     | Test / Action                               | Résultat Attendu                                                                       |
| :----- | :------------------------------------------ | :------------------------------------------------------------------------------------- |
| **T1** | Création / Édition Catégorie dans Backstage | Onglets FR / EN / AR fonctionnels, données stockées en JSON `Localized<string>` en BD. |
| **T2** | Affichage Catégories sur la Vitrine         | Passage FR ➔ EN ➔ AR : les catégories s'affichent immédiatement dans la langue active. |
| **T3** | Page À Propos (`/about`)                    | Sceau officiel ArchiSys3.0 100% traduit et aligné en RTL en arabe.                     |
| **T4** | Page Paramètres (`/admin/settings`)         | Passage en EN ou AR : 0 mot en français résiduel dans les onglets, polices, et modaux. |
| **T5** | Tableau de bord (`/admin`)                  | Sceau officiel d'architecture Backstage 100% traduit en EN et AR.                      |
| **T6** | Assistant Wizard (`SetupWizard.tsx`)        | Les secteurs, slogans et descriptions s'affichent dans la langue active de l'admin.    |
| **T7** | Suite de validation CI                      | `verifier-i18n`, `format`, `lint`, `tsc --noEmit`, et `build` passent avec 0 erreur.   |

---

## 5. Appel à Validation

ArchiSys3.0, ce plan couvre l'intégralité du multilinguisme (données persistées en base de données, vitrine, sceau d'architecture et administration). Cliquez sur **Proceed** ou donnez votre accord pour engager la réalisation de la **Phase 33**.
