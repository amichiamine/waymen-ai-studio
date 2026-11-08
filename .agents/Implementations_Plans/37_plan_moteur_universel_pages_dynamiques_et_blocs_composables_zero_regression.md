# PLAN D'IMPLÉMENTATION 37 : MOTEUR UNIVERSEL DE PAGES DYNAMIQUES & BLOCS COMPOSABLES (ZÉRO RÉGRESSION)

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Projet Hôte :** StacGate Platform (`ka-tech`)  
**Workspace :** `c:\xampp\htdocs\ka-tech`  
**Statut :** `🟢 Validé par ArchiSys3.0 — En cours d'exécution`

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
│ GESTIONNAIRE BACKSTAGE          │                   │ REGISTRE UNIVERSEL DE BLOCS     │
│ (/admin/pages)                  │                   │ (src/components/blocks/)        │
├─────────────────────────────────┤                   ├─────────────────────────────────┤
│ • Créer / Dupliquer une vue     │                   │ • BlockHero (Bannière / Slogan) │
│ • Masquer / Supprimer une vue   │                   │ • BlockProfile (Bio / CV / Liens│
│ • Ordonner les blocs (drag/drop)│                   │ • BlockItems (Grille Catalogue) │
│ • Ajouter / Supprimer des blocs │                   │ • BlockTimeline (Parcours/Jalons│
│ • Intégration Menu Navbar/Footer│                   │ • BlockSkills (Matrice Techs)   │
└────────────────┬────────────────┘                   │ • BlockMarkdown (Texte / Média) │
                 │                                    │ • BlockContact (Devis / Message)│
                 ▼                                    │ • BlockFaq (Accordéon FAQ)      │
┌─────────────────────────────────┐                   │ • BlockReviews (Avis clients)   │
│ PERSISTANCE SOUVERAINE          │                   └────────────────┬────────────────┘
│ site_content -> 'custom_pages'  │                                    │
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

### Le Registre de Blocs Universels (Autonomes et Réutilisables) :

Chaque bloc est un composant React pur, typé, acceptant ses données de configuration et supportant le trilinguisme natif (FR / EN / AR) avec disposition miroir RTL :

1. **`BlockHero` :** Bannière d'impact avec titre, sous-titre, image/vidéo d'arrière-plan et boutons d'action.
2. **`BlockProfile` :** Profil exécutif pour CV ou présentation (avatar/photo, nom, titre pro, badges de disponibilité, liens GitHub/LinkedIn/Email).
3. **`BlockItems` :** Grille polyvalente filtrable par catégorie (`products` existants : PC, Logiciels, Projets R&D, Services) avec boutons d'action contextuels (Acheter, Télécharger 0 DA, Demander un devis, Voir le projet).
4. **`BlockTimeline` :** Parcours chronologique d'expériences, jalons d'entreprise ou étapes de projet.
5. **`BlockSkills` :** Matrice de compétences ou technologies avec jauges ou badges par domaine.
6. **`BlockMarkdown` :** Zone de contenu éditorial libre au format Markdown/HTML avec support images et vidéos YouTube/Vimeo débloquées.
7. **`BlockContact` :** Formulaire de contact ou de devis connecté directement à l'API existante `/api/messages`.
8. **`BlockFaq` :** Accordéon de questions/réponses interactif.
9. **`BlockReviews` :** Carrousel de témoignages et avis connecté à la table existante `reviews`.

---

## 3. Découpage Chronologique des Étapes

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Phase 37 : Moteur Universel de Pages & Blocs Composables                   │
 │  ├── Étape 37.A : Modèle de Données & Typage (site_content 'custom_pages')  │
 │  ├── Étape 37.B : Implémentation du Registre des 9 Blocs Universels         │
 │  ├── Étape 37.C : Routeur Dynamique & Vue Publique (DynamicPage.tsx)        │
 │  ├── Étape 37.D : Interface Backstage de Gestion (/admin/pages)             │
 │  ├── Étape 37.E : Intégration Menu Navigation (Navbar & Footer Dynamiques)  │
 │  └── Étape 37.F : Recette Complète Non-Régression (Commandes, Users, CI)    │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### Étape 37.A : Modèle de Données & Typage TypeScript

- Définition des types TypeScript dans `src/types/pages.ts` :
  - `PageDefinition` : `{ id, slug, title: Localized<string>, description?: Localized<string>, blocks: BlockConfig[], isPublished: boolean, inNavbar: boolean, navOrder: number, updatedAt: string }`
  - `BlockConfig` : `{ id, type: BlockType, enabled: boolean, props: Record<string, any> }`
- Initialisation additive dans `site_content` via la couche API existante (`ControleurContenu.php`).
- Zéro impact sur les autres tables SQL.

### Étape 37.B : Registre des 9 Blocs Universels

- Création du répertoire dédié `src/components/blocks/` abritant chaque composant bloc.
- Export centralisé via `src/components/blocks/index.ts` et dictionnaire de rendu `BLOCK_COMPONENTS`.

### Étape 37.C : Routeur Dynamique & Vue Publique

- Création de `src/pages/DynamicPage.tsx` qui lit la définition de la page depuis le contexte, vérifie la publication et affiche séquentiellement les blocs activés.
- Intégration dans `src/App.tsx` via une route dynamique `<Route path="/p/:slug" element={<DynamicPage />} />` (ou résolution élégante avant repli `NotFound`), sans toucher aux routes fixes existantes.

### Étape 37.D : Interface Backstage d'Administration des Pages

- Création de `src/pages/admin/PagesManager.tsx` :
  - Liste des pages créées avec indicateurs (Publié, Dans le menu, Nombre de blocs).
  - Modal/Écran de création et édition d'une page.
  - Gestionnaire de blocs : Ajouter un bloc depuis le catalogue, monter/descendre avec flèches ou drag, activer/désactiver, formulaire d'édition des paramètres du bloc.
- Ajout de l'entrée dans le menu latéral `AdminShell.tsx` sous l'intitulé _« Pages & Vues »_.

### Étape 37.E : Intégration Menu Navigation & Parité i18n

- Mise à jour de `Navbar.tsx` et `Footer.tsx` pour inclure dynamiquement les pages personnalisées marquées `inNavbar: true`, tout en préservant les liens essentiels.
- Clés de traduction trilingues FR / EN / AR dans `src/lib/i18n.tsx`.

### Étape 37.F : Recette Complète de Non-Régression & Validation CI

- Validation intégrale des flux existants :
  - Panier et checkout commande (passage d'une commande test).
  - Gestion des clients et utilisateurs.
  - Notifications et médias.
- Exécution de la suite de vérification obligatoire :
  - `bun run verifier-i18n` (parité trilingue).
  - `bun run format` (Prettier).
  - `bunx tsc --noEmit` (TypeScript strict, 0 erreur).
  - `bun run lint` (ESLint).
  - `bun run build; bun run paqueter:data` (build complet de production).

---

## 4. Matrice de Recette & Critères de Succès

| Domaine                              | Critère de Contrôle                                        | Résultat Attendu                                                  |
| :----------------------------------- | :--------------------------------------------------------- | :---------------------------------------------------------------- |
| **Création de Vue Libre**            | Créer une page `/p/cv` ou `/p/projets` dans `/admin/pages` | La page est immédiatement accessible en ligne avec ses blocs      |
| **Modularité des Blocs**             | Ajouter, réordonner et supprimer des blocs sur une page    | L'ordre et le contenu reflètent fidèlement les réglages Backstage |
| **Zéro Régression Commandes**        | Ajouter un produit au panier et valider le checkout        | Tunnel d'achat, wilayas, paiements 100% opérationnels             |
| **Zéro Régression Authentification** | Connexion visiteur et connexion administrateur             | 100% fonctionnel sans altération de session                       |
| **Zéro Régression BD**               | Exécuter `php api/tools/verifier-parite-schema.php`        | Parité SQLite / MySQL / PgSQL 100% respectée                      |
| **Qualité & Pipeline CI**            | `bun run lint && bunx tsc --noEmit && bun run build`       | 0 erreur bloquante                                                |
