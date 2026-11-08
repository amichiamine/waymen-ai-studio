# PLAN DIRECTEUR D'IMPLÉMENTATION — PHASE 47

## Studio 360° : Fidélité Réelle du Live Canvas, Résolution des Propriétés & Médias en Cascade, Édition Trilingue Fine & Persistance SQLite Directe

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Date d'Élaboration :** 08/11/2026  
**Statut du Document :** 📋 En Attente de Validation Formelle ("Proceed")

---

### 1. Contexte & Diagnostic des 4 Angles Morts

Suite aux vérifications d'**ArchiSys3.0**, quatre défaillances fonctionnelles et ergonomiques critiques ont été constatées dans le Studio 360° :

1. **Le Live Canvas ne rend pas les Vraies Vues Systèmes :** Dans [`StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx), le simulateur n'affiche que les blocs additionnels (`blocks.map`). Pour les vues systèmes (`cart`, `track`, `blog`, `builder`, `checkout-success`, `404`), le cœur métier (panier, configurateur, suivi colis, articles) est inexistant dans le canevas, affichant à tort "Cette vue est vide".
2. **L'Inspecteur affiche des champs vides et n'affiche pas les médias existants :** Dans [`BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx), l'inspecteur lit uniquement `block.props`. Or, les blocs par défaut de [`site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts) avaient `props: undefined` car ils comptaient sur les fallbacks runtime (`siteContent` ou `defaultProps`). Conséquence : les inputs de texte sont vides, les miniatures d'images sont absentes, et les FAQs affichent 0 item en raison d'un conflit de clé (`p.items` vs `p.faqs`).
3. **L'Édition n'est pas encore "Fine" ni Trilingue :** Les champs écrasent les dictionnaires trilingues en chaînes de caractères simples, privant l'administrateur de l'édition ciblée en Français, Anglais ou Arabe, et manquent de réglages granulaires (sélecteur visuel d'icônes, typographies, boutons d'action WhatsApp).
4. **Persistance BD & Sync Réactive :** Dans [`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx#L158), lors du chargement initial de `siteContent`, un `setPages(siteContent.customPages)` écrasait les 10 nouvelles vues (légales et systèmes) si elles n'étaient pas encore enregistrées en base SQLite.

---

### 2. Découpage Chirurgical des Étapes de la Phase 47

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│              PHASE 47 : FIDÉLITÉ CANVAS 360°, CASCADE PROPS, ÉDITION FINE ET PERSISTANCE BD            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Étape 47.1 : Résolution Universelle des Propriétés & Médias en Cascade (Inspecteur Hydraté 100%)       │
│   • Fusion { ...defaultProps, ...siteContent, ...block.props }                                         │
│   • Pré-remplissage des images et bannières officielles dans MediaPickerField (miniature active)       │
│   • Réconciliation du schéma FAQ (normalisation faqs ↔ items)                                          │
│                                                                                                        │
│ Étape 47.2 : Rendu Fidèle du Cœur Applicatif dans le Live Canvas (StudioLiveCanvas)                   │
│   • Transmission de la page sélectionnée (selectedPage) au Canvas                                      │
│   • Injection du composant miroir système natif entre topBlocks et bottomBlocks                        │
│   • Rendu réaliste pour Panier, Suivi Colis, Configurateur PC, Blog, Succès Commande et 404            │
│                                                                                                        │
│ Étape 47.3 : Édition Trilingue Native (FR/EN/AR) & Contrôles Granulaires Fins (BlockPropsEditor)      │
│   • Sélecteur d'onglets linguistiques (FR / EN / AR) pour les champs de texte localisés                │
│   • Sélecteur visuel d'icônes avec aperçu                                                              │
│   • Réglages fins : typographies, badges, actions WhatsApp avec message automatique, arrondis         │
│                                                                                                        │
│ Étape 47.4 : Blindage de la Persistance Réactive SQLite Directe (PagesManager)                         │
│   • Maintien des 10 vues fusionnées lors des réceptions asynchrones serveur                             │
│   • Auto-persistance en base dès l'initialisation pour immuniser contre le rechargement F5            │
│                                                                                                        │
│ Étape 47.5 : Validation CI, Assurance Qualité Trilingue, Traçabilités & Packaging                     │
│   • verifier-i18n, tsc --noEmit, format, lint, build et packaging data/site                           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### Étape 47.1 : Résolution Universelle des Propriétés & Médias en Cascade

- **Fichiers :**
  - [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
  - [`src/components/blocks/registry.ts`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/registry.ts)
- **Actions :**
  - Implémentation du résolveur de cascade `getEffectiveBlockProps(block, siteContent)` :
    1. Si `block.props` contient la valeur, elle est prioritaire.
    2. Sinon, lit dans `getBlockMeta(block.type)?.defaultProps`.
    3. Sinon, lit dans les nœuds correspondants de `siteContent` (`hero`, `about`, `contact`, `footer`, `values`).
  - Pour les médias : `bannerSrc`, `image`, `avatar` reçoivent l'URL officielle active par défaut (ex: `archisysBannerSrc`) afin que le sélecteur `MediaPickerField` affiche immédiatement la miniature réelle et permette son remplacement en un clic.
  - Pour la FAQ : support unifié lisant indifféremment `faqs` (avec `question` et `answer`) ou `items` (avec `q` et `a`), assurant que les questions existantes apparaissent toujours dans l'inspecteur.

#### Étape 47.2 : Rendu Fidèle du Cœur Applicatif dans le Live Canvas

- **Fichier :** [`src/components/admin/StudioLiveCanvas.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/StudioLiveCanvas.tsx)
- **Actions :**
  - Ajout de la prop `page?: CustomPageDefinition | null` dans `StudioLiveCanvas`.
  - Création du composant interne `SystemViewNativePreview({ systemKey, slug })` qui rend une réplique visuelle exacte et interactive du composant métier :
    - `track` : formulaire de suivi, badges d'étapes (En attente, Traitement, Expédié, Livré), carte transporteur.
    - `cart` : tableau des articles avec image, quantité, calculs de sous-total, zone coupon et bouton de validation.
    - `builder` : sélecteur de composants en 8 étapes avec jauges de progression et validation.
    - `blog` : barre de recherche et grille d'articles illustrés.
    - `checkout_success` : reçu de confirmation de commande avec récapitulatif des pièces.
    - `not_found` : visuel 404 stylisé avec bouton d'accueil.
  - Ordonnancement du Canvas : `topBlocks` $\rightarrow$ **Cœur Métier Système** $\rightarrow$ `bottomBlocks`. Même sans aucun bloc custom ajouté, le Canvas affiche fidèlement l'écran réel !

#### Étape 47.3 : Édition Trilingue Native & Contrôles Granulaires Fins

- **Fichier :** [`src/components/admin/BlockPropsEditor.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/BlockPropsEditor.tsx)
- **Actions :**
  - Introduction d'un composant d'édition localisée `LocalizedInputField` et `LocalizedTextareaField` :
    - Barre d'onglets compacte `[FR | EN | AR]` permettant de basculer et de saisir le texte dans chaque langue sans écraser l'objet trilingue.
  - Enrichissement des contrôles par bloc :
    - Sélecteur visuel d'icônes avec catalogue d'icônes Lucide courantes.
    - Contrôle de typographie (taille de texte, alignement, graisse).
    - Bouton d'action directe WhatsApp avec champ pour numéro et message prédéfini personnalisé.
    - Contrôles d'arrondis et de bordures.

#### Étape 47.4 : Blindage de la Persistance Réactive SQLite Directe

- **Fichier :** [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)
- **Actions :**
  - Correction de la synchronisation réactive :
    `setPages(customPages)` (au lieu de `setPages(siteContent.customPages)`), garantissant que les 10 vues légales et systèmes ne sont jamais révoquées par une lecture asynchrone.
  - Auto-sauvegarde conditionnelle dès la première détection de vues par défaut manquantes dans la base SQLite, inscrivant définitivement les vues dans `katech-data` sans nécessiter de clic manuel préalable.

#### Étape 47.5 : Validation CI, Assurance Qualité Trilingue, Traçabilités & Packaging

- **Actions :**
  - Contrôle strict `bun run verifier-i18n`.
  - Contrôle `bunx tsc --noEmit` (0 erreur).
  - Contrôle `bun run format` et `bun run lint`.
  - Exécution de `bun run build` et `bun run paqueter:data`.
  - Mise à jour du journal officiel [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Phase 47).
  - Commit Git et Push sur `origin/main`.

---

### 3. Matrice de Recette & Critères d'Acceptance

| Critère d'Acceptance                    | Test de Vérification                                                     |                                                 Résultat Attendu                                                  |
| :-------------------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------: |
| **Inspecteur Rempli & Actif**           | Sélectionner n'importe quel bloc d'une page (ex: Bannière, Valeurs, FAQ) | Les titres, textes, questions et miniatures d'images s'affichent immédiatement dans les champs (aucun champ vide) |
| **Édition Trilingue Préservée**         | Modifier un titre en passant par les onglets FR, EN, AR                  |                          Les 3 langues sont enregistrées sans écrasement en chaîne plate                          |
| **Médias Actifs Visibles**              | Ouvrir un bloc avec image ou bannière                                    |                      La miniature de l'image officielle apparaît dans le sélecteur de média                       |
| **Rendu du Vrai Panier dans le Canvas** | Choisir la vue "/cart (Panier)" dans le Studio                           |              Le tableau des articles, le total et le bouton de commande s'affichent dans le canevas               |
| **Rendu du Vrai Suivi dans le Canvas**  | Choisir la vue "/track (Suivi de Commande)"                              |                Le formulaire de suivi et le stepper de livraison s'affichent au centre du canevas                 |
| **Persistance SQLite Durable (F5)**     | Actualiser la page du navigateur (F5)                                    |                    Les 10 vues systèmes et légales demeurent présentes et éditables sans perte                    |
| **Zéro Régression CI**                  | `bun run lint && bunx tsc --noEmit && bun run build`                     |                                   Code 0, dist/ produit, archive SQLite à jour                                    |
