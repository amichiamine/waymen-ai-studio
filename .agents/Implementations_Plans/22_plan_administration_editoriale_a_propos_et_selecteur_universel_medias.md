# PLAN D'IMPLÉMENTATION — PHASE 22

## Administration Éditoriale Intégrale (« À propos ») & Sélecteur Universel de Médias (`MediaPickerField`)

**Projet :** KA Tech (`amichiamine/ka-tech`)  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead & Consultant R&D :** AImi  
**Mode :** 📋 Mode Plan  
**Statut :** En attente de validation par ArchiSys3.0

---

## 1. Contexte & Objectifs de la Phase 22

Suite au diagnostic 360° réalisé en concertation avec ArchiSys3.0, deux axes d'amélioration ergonomiques majeurs ont été identifiés et validés (Option C) :

1. **Administration Éditoriale Intégrale de la vue « À propos » (`/about`) :**
   - Rendre 100% administrable depuis le Backstage Admin (`/admin/content`) toute la narration de la boutique : Kicker, Titre, Intro, Histoire complète de la boutique, Mission d'entreprise, Cartes de valeurs avec icônes, et Appel à l'action final (CTA).
   - Rapatrier la gestion des cartes de valeurs (actuellement égarées dans `/admin/settings`) directement dans l'onglet dédié « Page À propos » d'Admin Contenu.
   - Préserver la parité multilingue complète FR / EN / AR avec persistance souveraine en base de données SQLite/MySQL via la table `site_content`.

2. **Éradication des Placeholders d'URL Manuelles & Sélecteur Universel `MediaPickerField` :**
   - Éradiquer l'obligation pour l'administrateur de copier/coller manuellement des URL d'images ou de devoir naviguer sur un autre écran pour téléverser un fichier.
   - Créer un composant réutilisable standard `MediaPickerField` offrant en un seul bloc :
     - Prévisualisation instantanée de l'image sélectionnée.
     - Bouton de **Téléversement Direct** (envoi immédiat du fichier vers `POST /media` sans quitter le formulaire).
     - Bouton **« Choisir dans la médiathèque »** ouvrant une modale visuelle avec grille des images du serveur et filtre de recherche.
     - Option de saisie d'URL externe manuelle pour les liens CDN ou distants.
     - Bouton de suppression/réinitialisation de l'image.
   - Remplacer tous les formulaires archaïques du Backstage : **Produits (`ProductForm`)**, **Catégories (`CategoryForm`)**, **Blog (`BlogForm`)**, **Marques (`BrandForm`)**, **Paramètres (`Settings`)** et **Contenu (`Content`)**.

---

## 2. Découpage Chirurgical des Étapes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 22 : ARCHITECTURE                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. ÉDITORIAL « À PROPOS »        │ 2. MÉDIAS UNIFIÉS                   │
│ • Extension de SiteContent       │ • Composant MediaPickerField        │
│ • Intégration dans /about        │ • Dialogue modal MediaPickerDialog  │
│ • Nouvel onglet Admin -> Contenu │ • Remplacement sur 5 formulaires    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### Étape 22.A : Modèle de Données & Alimentation de la Page « À propos »

1. **Extension du schéma `SiteContent` dans [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) :**
   - Ajout de la section `about` :
     ```typescript
     about: {
       kicker: Localized<string>;
       title: Localized<string>;
       intro: Localized<string>;
       historyTitle: Localized<string>;
       historyBody: Localized<string>;
       missionTitle: Localized<string>;
       missionBody: Localized<string>;
       ctaTitle: Localized<string>;
       ctaSubtitle: Localized<string>;
       ctaBrowseLabel: Localized<string>;
       ctaContactLabel: Localized<string>;
       values: AboutValue[];
     };
     ```
   - Renseignement des valeurs par défaut complètes (FR, EN, AR) dans `seedSiteContent()`.
2. **Consommation dynamique dans [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx) :**
   - Remplacement des clés statiques `t("about.*")` par les champs localisés issus de `siteContent.about`, avec repli automatique (fallback) vers les traductions par défaut si la base contient des champs vides.

### Étape 22.B : Interface d'Administration « Page À propos » dans `AdminContent`

1. **Nouvel onglet dans [`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx) :**
   - Ajout de l'entrée `{ key: "about", labelKey: "admin.contenu.contenu.section_about" }` dans la liste des sections éditables.
2. **Composant d'édition `AboutEditor` :**
   - Éditeur de l'en-tête (Kicker, Titre, Introduction multilingue avec onglets FR/EN/AR).
   - Éditeur narratif Histoire & Mission (Champs Titres et Textareas multilingues).
   - Gestionnaire visuel de la liste des Cartes de Valeurs (Ajout, suppression, réordonnancement, choix d'icône, titre et description).
   - Éditeur du bloc Call to Action final (Titres et libellés des boutons de redirection).
3. **Mise à jour des traductions d'administration dans `src/lib/i18n/admin/contenu/{fr,en,ar}.ts`.**

### Étape 22.C : Création du Composant Étalon `MediaPickerField` & Dialogue Modale

1. **Création de [`src/components/admin/MediaPickerField.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/MediaPickerField.tsx) :**
   - Aperçu de l'image courante avec badge de statut.
   - Input de fichier caché déclenché par un bouton **« Téléverser une image »** :
     - Envoi transparent via `useMediaAssetMutations().upload(file)`.
     - Prise en charge du chargement avec indicateur visuel (spinner).
     - Renseignement automatique du champ avec l'URL relative/absolue retournée par l'API.
   - Bouton **« Choisir dans la médiathèque »** :
     - Ouverture d'un dialogue modale `MediaPickerDialog`.
     - Champ de recherche en temps réel filtrant par nom de fichier ou tag.
     - Grille de vignettes responsive des médias existants avec prévisualisation et métadonnées.
     - Clic = sélection instantanée et fermeture.
   - Accompagnement d'un champ repliable pour saisie manuelle d'URL externe (CDN, liens distants).
   - Bouton de suppression pour effacer l'image.

### Étape 22.D : Déploiement Systématique sur l'Ensemble du Backstage

1. **Formulaire Produits ([`src/pages/admin/ProductForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/ProductForm.tsx)) :**
   - Remplacement de l'ancien `<Select>` textuel et de l'input d'URL par `MediaPickerField`. L'administrateur peut téléverser une photo produit directement pendant la saisie.
2. **Formulaire Catégories ([`src/pages/admin/CategoryForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/CategoryForm.tsx)) :**
   - Remplacement de l'input texte brut de la couverture par `MediaPickerField`.
3. **Formulaire Articles de Blog ([`src/pages/admin/BlogForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BlogForm.tsx)) :**
   - Remplacement du champ texte d'URL `https://...` par `MediaPickerField`.
4. **Formulaire Marques ([`src/pages/admin/BrandForm.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/BrandForm.tsx)) :**
   - Ajout du support de logo de marque via `MediaPickerField`.
5. **Paramètres du Site ([`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)) :**
   - Unification du téléversement du logo et du favicon via `MediaPickerField`.
6. **Contenu Visuel ([`src/pages/admin/Content.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Content.tsx)) :**
   - Intégration de `MediaPickerField` pour l'image du Hero (`hero.imageSrc`) et la bannière teaser Builder (`builderTeaser.bannerSrc`).

### Étape 22.E : Recette, CI, Packaging & Traçabilité

1. Validation TypeScript : `bunx tsc --noEmit` (0 erreur).
2. Validation ESLint : `bun run lint` (0 erreur).
3. Validation i18n : `bun run verifier-i18n` (parité 100% FR/EN/AR).
4. Rebuild & Emballage : `bun run build; bun run paqueter:data` (production de l'archive unique horodatée).
5. Journalisation : Mise à jour officielle de [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).
6. Commit git & synchronisation sur `main`.

---

## 3. Matrice de Recette & Critères d'Acceptation

| Test / Scénario                       | Résultat Attendu                                                                                                                                        |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Édition page À propos**             | Les modifications du titre, de l'histoire, de la mission et des valeurs dans Admin -> Contenu s'affichent immédiatement sur `/about`.                   |
| **Téléversement direct d'image**      | Depuis la création d'un produit, catégorie ou article de blog, cliquer sur "Téléverser" envoie l'image vers le serveur sans rechargement ni navigation. |
| **Sélection depuis la médiathèque**   | Cliquer sur "Choisir dans la médiathèque" affiche la modale avec les images du serveur. Un clic sur une vignette l'associe immédiatement au formulaire. |
| **Compatibilité sous-dossier & URLs** | Les images choisies continuent d'utiliser `resoudreUrlMedia` et s'affichent sans 404, quel que soit le dossier de déploiement.                          |
| **Pipeline de Vérité**                | `lint`, `tsc --noEmit` et `build` passent à 100% avec 0 erreur.                                                                                         |
