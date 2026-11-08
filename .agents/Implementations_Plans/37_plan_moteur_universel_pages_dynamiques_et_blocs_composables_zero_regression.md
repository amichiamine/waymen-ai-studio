# PLAN D'IMPLÉMENTATION 37 : MOTEUR UNIVERSEL DE PAGES DYNAMIQUES & BLOCS COMPOSABLES (ZÉRO RÉGRESSION)

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Projet Hôte :** StacGate Platform (`ka-tech`)  
**Workspace :** `c:\xampp\htdocs\ka-tech`  
**Statut :** `🟡 Sous-Phase 37.1 Soumise à Validation d'ArchiSys3.0`

---

## 1. Objectifs & Sanctuarisation Absolue (Zéro Régression)

Ce chantier concrétise l'**Universalité Vraie** en dotant StacGate Platform d'un **Moteur Universel de Pages Dynamiques et de Blocs Composables**, tout en garantissant une **sanctuarisation intégrale et inviolable** de l'ensemble des acquis opérationnels de la plateforme.

### 🛡️ Engagements de Non-Régression & Sanctuarisation (Périmètres Inviolables) :

1. **Base de Données & Persistance :**
   - Zéro rupture de schéma. Les 21 tables existantes (`products`, `categories`, `brands`, `customers`, `orders`, `order_items`, `coupons`, `reviews`, `users`, `blog_posts`, `media_assets`, `notifications`, `messages`, `subscribers`, `shipping_rates`, `payment_methods`, `stock_movements`, `site_content`, `settings`, `audit_logs`, `outbox`) demeurent **strictement intactes**.
   - La persistance des pages et blocs dynamiques s'effectue de manière **purement additive et souveraine** dans la table existante [`site_content`](file:///c:/xampp/htdocs/ka-tech/api/schema/schema.sqlite.sql#L272-L276) (clé `custom_pages`) avec réplication automatique MySQL/PgSQL sans altérer la CI.
2. **Tunnel d'Achat, Commandes & Suivi :**
   - Le panier (`/cart`), le passage de commande (`/checkout`), le succès (`/checkout/success`), le suivi (`/track`, `/suivi`), le calcul des frais par wilaya et les méthodes de paiement restent **100% opérationnels sans modification de leur logique métier**.
3. **Comptes Utilisateurs & Authentification :**
   - Connexion, inscription, réinitialisation de mot de passe, rôles administrateurs et espace client (`/account`) demeurent **strictement inchangés**.
4. **Notifications & CRM Messages :**
   - Le système de notifications d'audit et la réception des formulaires dans la table `messages` continuent de fonctionner à l'identique.

---

## 2. Architecture Technique du Moteur Composable

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         STACGATE COMPOSABLE ENGINE                          │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┴──────────────────────────────┐
         ▼                                                             ▼
┌─────────────────────────────────┐                   ┌─────────────────────────────────┐
│ GESTIONNAIRE BACKSTAGE          │                   │ REGISTRE UNIVERSEL DE 24 BLOCS  │
│ (/admin/pages)                  │                   │ (src/components/blocks/)        │
├─────────────────────────────────┤                   ├─────────────────────────────────┤
│ • Créer / Dupliquer une vue     │                   │ • Famille Commerce (13 blocs)   │
│ • Masquer / Supprimer une vue   │                   │ • Famille Identité & CV (5 bloc)│
│ • Ordonner les blocs (drag/drop)│                   │ • Famille Vitrine & R&D (4 bloc)│
│ • Inspecteur de Props de Blocs  │                   │ • Famille Interaction (3 blocs) │
│ • Intégration Menu Navbar/Footer│                   └────────────────┬────────────────┘
└────────────────┬────────────────┘                                    │
                 │                                                     │
                 ▼                                                     │
┌─────────────────────────────────┐                                    │
│ PERSISTANCE SOUVERAINE          │                                    │
│ site_content -> 'customPages'   │                                    │
└────────────────┬────────────────┘                                    │
                 │                                                     │
                 └──────────────────────┬──────────────────────────────┘
                                        │
                                        ▼
                      ┌───────────────────────────────────┐
                      │ ROUTEUR REACT DYNAMIQUE           │
                      │ src/pages/DynamicPage.tsx         │
                      ├───────────────────────────────────┤
                      │ Attrape le slug, charge la pile   │
                      │ de blocs et la rend avec 0 lag !  │
                      └───────────────────────────────────┘
```

---

## 3. Découpage des Étapes Réalisées (Phase 37)

- [x] **Étape 37.A : Modèle de Données & Typage TypeScript :** [`src/types/pages.ts`](file:///c:/xampp/htdocs/ka-tech/src/types/pages.ts) (24 types, configs, pages).
- [x] **Étape 37.B : Registre & 24 Blocs Composables :** [`src/components/blocks/`](file:///c:/xampp/htdocs/ka-tech/src/components/blocks/) (14 fichiers créés).
- [x] **Étape 37.C : Routeur Dynamique & Vue Publique :** [`src/pages/DynamicPage.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/DynamicPage.tsx).
- [x] **Étape 37.D : Interface Backstage d'Administration des Pages :** [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx).
- [x] **Étape 37.E : Intégration Menu Navigation & Parité i18n :** Injection navbar dynamique dans [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx) et seeds par défaut.
- [x] **Étape 37.F : Recette Qualité & CI :** 0 erreur tsc, 0 erreur lint, packages zip générés.

---

## 4. Sous-Phase 37.1 : Finition Chirurgicale & Éradication des Angles Morts

Afin de garantir une robustesse absolue et une complétude exemplaire sans le moindre angle mort, les 4 interventions suivantes sont programmées :

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Sous-Phase 37.1 : Éradication des 4 Angles Morts & Finitions 360°          │
 │  ├── Étape 37.1.A : Synchronisation Réactive useEffect dans PagesManager    │
 │  ├── Étape 37.1.B : Éradication du Flash 404 / FOUC dans DynamicPage        │
 │  ├── Étape 37.1.C : Parité Linguistique Trilingue Modale (FR / EN / AR)     │
 │  ├── Étape 37.1.D : Inspecteur Étendu de Configuration des Propriétés Blocs │
 │  └── Étape 37.1.E : Recette Complète, Re-Build & Re-Packaging Horodaté      │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### Étape 37.1.A : Synchronisation Réactive `useEffect` dans [`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx)

- Remplacement de l'anti-pattern `useState(() => setPages(...))` par un `useEffect` écoutant `siteContent?.customPages` conditionné à `!isDirty`.
- Sélection automatique de la première page si aucune page n'est sélectionnée et que des pages existent.
- Garantie qu'un rafraîchissement direct (F5) sur `/admin/pages` charge immédiatement les données sans tableau vide.

### Étape 37.1.B : Éradication du Flash 404 / FOUC dans [`DynamicPage.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/DynamicPage.tsx)

- Ajout d'une condition d'attente active `if (loading && !siteContent)` affichant un état de chargement élégant (spinner/skeleton) centré.
- La redirection vers `<NotFound />` n'intervient que si le chargement est formellement terminé (`!loading`) et que le slug reste introuvable.

### Étape 37.1.C : Parité Linguistique Trilingue dans la Modale de Page

- Refonte de la modale d'édition des métadonnées de page dans [`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) :
  - Ajout d'onglets de langues trilingues `[FR | EN | AR]`.
  - Permet la saisie native du **Titre** et de la **Description SEO** dans les trois langues officielles du projet.
  - Sauvegarde conforme au contrat de typage `Localized<string>`.

### Étape 37.1.D : Inspecteur de Propriétés de Blocs Étendu

- Dans [`PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx), enrichissement de chaque carte de bloc avec un panneau repliable « Configuration & Propriétés » :
  - Pour `profile_hero` : saisie du nom, titre professionnel, disponibilité, avatar URL, liens GitHub/LinkedIn/Email.
  - Pour `contact_form` & `faq_accordion` : saisie du titre et sous-titre personnalisés.
  - Pour `category_cards` & `latest_blog_posts` : réglage du nombre maximum d'éléments affichés (`max`).
  - Pour tous les blocs : bouton dépliable d'édition JSON brute pour les utilisateurs avancés, permettant d'altérer 100% des propriétés de n'importe quel bloc sans limitation.

### Étape 37.1.E : Recette Qualité, Validation CI & Packaging

- Validation complète de la suite :
  - `bun run verifier-i18n`
  - `bun run format`
  - `bunx tsc --noEmit` (0 erreur TypeScript)
  - `bun run lint` (0 erreur ESLint)
  - `bun run build; bun run paqueter:data` (régénération des archives de production horodatées).
- Mise à jour du journal officiel [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Rattachement en Sous-Phase 37.1 selon notre gouvernance).

---

## 5. Matrice de Recette de la Sous-Phase 37.1

| Domaine                    | Critère de Contrôle                                  | Résultat Attendu                                                  |
| :------------------------- | :--------------------------------------------------- | :---------------------------------------------------------------- |
| **Synchro F5 Backstage**   | Recharger F5 sur `/admin/pages`                      | Les pages et blocs s'affichent immédiatement sans être écrasés    |
| **0 Flash 404 Visiteur**   | Accéder directement à `/:slug`                       | Spinner propre pendant le fetch, jamais de flash de page 404      |
| **Trilinguisme Modale**    | Éditer les titres/SEO en EN et AR                    | Les 3 variantes sont conservées et rendues selon la langue active |
| **Inspecteur de Blocs**    | Modifier les champs d'un bloc Profil ou FAQ          | Les propriétés éditées sont persistées et visibles sur la vue     |
| **Validation Pipeline CI** | `bun run lint && bunx tsc --noEmit && bun run build` | 0 erreur bloquante                                                |
