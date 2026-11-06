# PLAN D'IMPLÉMENTATION — PHASE 27

## Raccordement Global « Pages & Textes » (À propos, Contact, FAQ), Assainissement de `mergeSiteContent`, Clés i18n & Performance

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Plan (En attente d'arbitrage et validation formelle)  
**Date :** 06 Novembre 2026  
**Branche Git :** `main`

---

## 1. Contexte & Problématique

1. **Rupture constatée sur « À propos » :** En base SQLite, la section `site_content` contenait historiquement un tableau vide (`payload = "[]"`). Lors du chargement, `mergeSiteContent` écrasait l'objet complet `seed.about` par `[]`, rendant tous les champs `undefined` dans l'éditeur de l'admin et forçant la page publique `/about` à se replier en permanence sur les chaînes fixes de `fr.ts`.
2. **Déconnexion de la page Contact (`/contact`) :** Actuellement, la page `/contact` lit des textes statiques hardcodés (`t("contact.title")`), et l'onglet _Pages & Textes_ dans l'Admin ne propose aucun formulaire pour administrer le titre, le sous-titre, les horaires, les textes du formulaire ni une section FAQ dynamique.
3. **Alertes i18n en console :** [`MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) appelle des clés inexistantes (`admin.media.televerser`, `admin.media.choisir_mediatheque`, `admin.media.rechercher_placeholder`) au lieu des clés officielles déclarées sous `admin.catalogue.media.*`.
4. **Violations de performance en console (`[Violation] 'message' handler took X ms`) :** Montage simultané de l'ensemble des formulaires de sections lourdes dans [`Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) provoquant des blocages du fil principal au-delà du seuil de 50ms en dev mode.

---

## 2. Objectifs de la Phase 27

- 🎯 **Objectif 1 :** Assainir le moteur de fusion `mergeSiteContent` pour immuniser `about` contre tout écrasement par un tableau résiduel, et migrer la ligne en base SQLite.
- 🎯 **Objectif 2 :** Créer la section `contact` (kicker, title, subtitle, infoBox, faqs) dans `SiteContent` et la brancher en temps réel sur [`src/pages/Contact.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Contact.tsx) avec un module d'accordéon FAQ interactif.
- 🎯 **Objectif 3 :** Enrichir le pôle _Pages & Textes_ dans [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) avec un éditeur visuel complet pour la page Contact et ses FAQs.
- 🎯 **Objectif 4 :** Éradiquer à 100% les alertes i18n dans [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) et enrichir les dictionnaires FR, EN, AR.
- 🎯 **Objectif 5 :** Optimiser le rendu de [`Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) par montage paresseux (_lazy-mounting_) de l'onglet actif uniquement pour supprimer les violations de performance.

---

## 3. Découpage Chirurgical des Étapes

### Étape 27.A : Résilience de `mergeSiteContent` & Migration de la section `about`

- Dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) :
  - Dans `mergeSiteContent(seed, partial)` : si `s` est un objet et que `p` entrant est un tableau (`Array.isArray(p)`), ne plus écraser `s`. Si `p` contient des éléments de valeurs historiques, les insérer dans `s.values`, sinon préserver l'objet `s` et fusionner ses propriétés.
- Dans [`api/src/Controllers/ControleurContenu.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurContenu.php) :
  - Détecter si la section `about` en base est un tableau JSON (`[]`) et la migrer automatiquement vers la structure objet standard de `seedSiteContent().about`.
- Mettre à jour la base SQLite locale pour que la section `about` contienne le payload objet complet.

### Étape 27.B : Modèle `SiteContent["contact"]` & Dynamisation de `Contact.tsx`

- Dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) :
  - Ajouter le type `ContactSection` dans `SiteContent` :
    ```ts
    contact: {
      kicker: Localized<string>;
      title: Localized<string>;
      subtitle: Localized<string>;
      faqs: {
        id: string;
        question: Localized<string>;
        answer: Localized<string>;
      }
      [];
    }
    ```
  - Alimenter `seedSiteContent().contact` avec des valeurs par défaut élégantes en FR, EN, AR.
- Dans [`src/pages/Contact.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Contact.tsx) :
  - Remplacer les appels fixes `t("contact.title")`, etc., par `L(siteContent.contact.title) || t("contact.title")`.
  - Intégrer un bloc d'accordéon FAQ interactif moderne sous le formulaire de contact, alimenté dynamiquement par `siteContent.contact.faqs`.

### Étape 27.C : Éditeur Visuel Page Contact & FAQ dans `Content.tsx`

- Dans [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) :
  - Ajouter `contact` dans `PAGES_SECTIONS` aux côtés de `about` et `contactCta`.
  - Créer le composant `ContactPageForm` :
    - En-tête de la page (kicker, titre, sous-titre).
    - Gestionnaire dynamique de FAQ : ajout de questions/réponses trilingues, modification en direct, suppression et réordonnancement.

### Étape 27.D : Éradication des Clés i18n Manquantes

- Dans [`src/lib/i18n/admin/catalogue/fr.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/i18n/admin/catalogue/fr.ts), `en.ts` et `ar.ts` :
  - Déclarer la clé `admin.catalogue.media.choisir_mediatheque` :
    - FR : `"Choisir dans la médiathèque"`
    - EN : `"Choose from library"`
    - AR : `"اختر من مكتبة الوسائط"`
- Dans [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) :
  - Remplacer `t("admin.media.televerser")` par `t("admin.catalogue.media.btn_televerser")`.
  - Remplacer `t("admin.media.choisir_mediatheque")` par `t("admin.catalogue.media.choisir_mediatheque")`.
  - Remplacer `t("admin.media.rechercher_placeholder")` par `t("admin.catalogue.media.recherche_placeholder")`.

### Étape 27.E : Optimisation de Rendu & Chaîne de Vérité

- Dans [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) :
  - Conditionner le montage du formulaire à la sous-section active uniquement (`subHome === s.key ? <SectionEditor ... /> : null`), évitant le calcul du DOM pour les 10 autres sections masquées.
- Exécuter la suite complète de validation :
  1. `bun run format`
  2. `bun run verifier-i18n` (parité FR/EN/AR absolue)
  3. `bun run lint` (0 avertissement bloquant, 0 erreur)
  4. `bunx tsc --noEmit` (0 erreur TypeScript)
  5. `bun run build; bun run paqueter:data` (nouvelle archive cumulative)
- Mettre à jour le journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md), committer et pousser vers `origin/main`.

---

## 4. Matrice de Recette & Validation

| Test                          | Comportement Attendu                                                                                          |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Édition « À propos »**      | Les textes saisis dans l'Admin s'affichent instantanément sur `/about` sans repli statique.                   |
| **Édition « Contact & FAQ »** | Les titres, textes et questions/réponses FAQ saisis dans l'Admin apparaissent sur `/contact`.                 |
| **Console Navigateur**        | Zéro alerte `[i18n] clé « admin.media.* » absente` lors de l'ouverture de l'admin ou des sélecteurs de média. |
| **Fluidité Backstage**        | Réduction drastique des temps de traitement d'événements sous 50ms (zéro freeze).                             |
| **Chaîne de Vérité**          | `tsc`, `lint`, `verifier-i18n` et `build` passent avec succès.                                                |

---

_Soumis à l'arbitrage et validation d'ArchiSys3.0 avant tout démarrage technique._
