# PLAN DIRECTEUR — PHASE 30

## Universalisation Intégrale « StacGate Platform », Remplacement des Références Métier et Accès Ergonomique au Footer dans l'Admin

**Projet :** StacGate Platform (Plateforme E-Commerce & Vitrines Tous Produits et Tous Commerces)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan  
**Statut :** En attente de validation par ArchiSys3.0

---

## 1. Contexte & Enjeux d'Ingénierie

Suite aux directives formelles d'ArchiSys3.0, la Phase 30 opère la transition d'identité définitive vers une universalité 100% Marque Blanche :

1. **Nouvelle Identité Racine par Défaut :**
   - Enseigne par défaut : **« StacGate Platform »** (en remplacement de « KA Tech » et ses variantes).
   - Slogan universel agnostique : **« Plateforme E-Commerce, Vitrines tous produits et tous commerces »** (FR) / **« E-Commerce Platform, Showcases for all products and all businesses »** (EN) / **« منصة التجارة الإلكترونية، واجهات لجميع المنتجات وجميع المتاجر »** (AR) (en remplacement des mentions informatiques/gaming/smartphones).
   - Éradication systématique de toutes les occurrences directes dans l'interface visiteur et d'administration, les titres de documents HTML/SEO et les graines de données par défaut.
2. **Accessibilité Immédiate de l'Éditeur du Footer :**
   - Restructuration des onglets de [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) : mise en évidence directe de l'onglet **« En-tête & Pied de page (Global) »** avec sélection intuitive du Footer.
   - Passerelle croisée dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) : ajout d'une carte d'action rapide permettant de basculer en 1 clic vers l'édition des colonnes et textes du Footer.

---

## 2. Découpage Chirurgical des Travaux

```
                       UNIVERSALISATION STACGATE PLATFORM & FOOTER
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ▼                                   ▼                                   ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│  1. Identité Racine Défaut   │  │  2. Dictionnaires & Vues UI  │  │  3. Ergonomie Backstage      │
├──────────────────────────────┤  ├──────────────────────────────┤  ├──────────────────────────────┤
│ • index.html : title & meta  │  │ • fr.ts, en.ts, ar.ts        │  │ • Content.tsx : Onglet       │
│ • site-settings.ts (DEFAULT) │  │   (~35 titres de pages et    │  │   "En-tête & Pied de page"   │
│ • site-content.ts (taglines) │  │   descriptions nettoyés)     │  │ • Settings.tsx : Passerelle  │
│ • admin-store.tsx (seeds)    │  │ • admin/* : notifications,   │  │   rapide vers l'édition du    │
│ • Logo.tsx & Footer.tsx      │  │   tableaux et documentations │  │   Footer                     │
└──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

---

### Étape 30.A — Identité Racine & Métadonnées Générales

- Fichiers cibles :
  - [`index.html`](file:///c:/xampp/htdocs/ka-tech/index.html) : remplacement du `<title>` par `StacGate Platform — Plateforme E-Commerce, Vitrines tous produits et tous commerces` et de la `<meta name="description">`.
  - [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts) : `storeName: "StacGate Platform"`, `tagline` universel.
  - [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) : mise à jour des baselines et taglines du header et footer par défaut.
  - [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx) : mise à jour de `seedSiteSettings()` et des notifications/avis mockés.
  - [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) : repli sur `"StacGate Platform"`.
  - [`src/lib/i18n.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n.tsx) : interpolation dynamique prenant en charge les substitutions de marque.

---

### Étape 30.B — Assainissement Trilingue des Dictionnaires i18n (FR, EN, AR)

- Fichiers cibles :
  - [`src/lib/i18n/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/fr.ts)
  - [`src/lib/i18n/en.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/en.ts)
  - [`src/lib/i18n/ar.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/ar.ts)
  - Dictionnaires d'administration dans `src/lib/i18n/admin/`
- **Actions :**
  - Remplacer les titres de pages codés en dur (`"À propos — KA Tech"`, `"Contact — KA Tech"`, etc.) par `{storeName}` ou `"StacGate Platform"`.
  - Remplacer les textes spécialisés informatique/téléphonie (`"laptops, desktops, PC sur-mesure et smartphones"`) par des formulations universelles pour tous produits et tous commerces.
  - Maintenir une parité stricte à 100% entre les trois langues (FR, EN, AR).

---

### Étape 30.C — Ergonomie & Accès Direct au Footer dans l'Administration

- Fichiers cibles :
  - [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx)
  - [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)
- **Actions :**
  1. Dans `Content.tsx` :
     - Renommer le pôle `global` en `« En-tête & Pied de page »` (`label: t("admin.contenu.contenu.pole_global_nav")` ou libellé explicite).
     - Rendre le sous-onglet Footer immédiatement identifiable avec une icône ou un libellé clair.
     - Prise en charge du paramètre URL `?pole=global&sub=footer` pour permettre la navigation ciblée en profondeur.
  2. Dans `Settings.tsx` :
     - Dans la section des coordonnées du magasin (adresse, téléphone, horaires), ajouter une carte d'information contextuelle avec un bouton d'action :  
       `[ 🔗 Éditer les colonnes, textes et réseaux du Pied de page ]`  
       qui redirige directement vers l'éditeur de Footer dans `Content.tsx`.

---

### Étape 30.D — Validation Qualité CI & Livrables Horodatés

- Exécuter la suite complète :
  1. `bun run verifier-i18n` (100% parité trilingue).
  2. `bun run format` (conformité Prettier).
  3. `bunx tsc --noEmit` (0 erreur TypeScript).
  4. `bun run lint` (0 erreur ESLint).
  5. `bun run build; bun run paqueter:data` (nouvelles archives horodatées).
- Mettre à jour [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) avec l'entrée officielle Phase 30.
- Commit et push sur `origin/main`.

---

## 3. Matrice de Recette & Vérification

| Test                           | Comportement Attendu                                                                                                                                   |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Titre et Meta index.html**   | L'onglet du navigateur et les balises `<title>` et `<meta description>` affichent `StacGate Platform` et la description agnostique e-commerce/vitrine. |
| **Titres de Pages Publics**    | Les pages `/about`, `/contact`, `/cart`, `/checkout`, `/search` affichent `StacGate Platform` (ou le nom personnalisé du magasin).                     |
| **Descriptions & Catégories**  | Les méta-descriptions ne font plus référence forcée aux laptops/ordinateurs/téléphones mais à tous commerces et tous produits.                         |
| **Accès Footer dans Contenu**  | L'onglet « En-tête & Pied de page » dans `/admin/content` permet d'accéder au Footer en 1 clic direct.                                                 |
| **Passerelle depuis Réglages** | Clic sur le bouton de passerelle dans `/admin/settings` ➔ ouverture directe de l'éditeur du Footer dans `/admin/content`.                              |
| **CI & Parité Complète**       | 0 erreur `verifier-i18n`, 0 erreur TypeScript, 0 erreur ESLint, build de production réussi.                                                            |
