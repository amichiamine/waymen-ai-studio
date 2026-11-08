# PLAN D'IMPLÉMENTATION 38 : STUDIO DE CONCEPTION VISUELLE UNIFIÉ & HARMONISATION ERGONOMIQUE BACKSTAGE 360°

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Projet Hôte :** StacGate Platform (`ka-tech`)  
**Workspace :** `c:\xampp\htdocs\ka-tech`  
**Statut :** `🟡 Soumis à Validation d'ArchiSys3.0`

---

## 1. Objectifs & Constat de Rationalisation

Suite au diagnostic critique partagé entre ArchiSys3.0 et AImi, la coexistence de trois espaces distincts (`Paramètres`, `Contenus du site` et `Pages & Vues`) crée une dispersion ergonomique et une confusion dans l'esprit de l'exploitant.

La **Phase 38** a pour objectif d'unifier l'expérience d'administration en fusionnant la gestion des écrans et du cadre global au sein d'un **« Studio de Conception Visuelle Unifié »**, tout en recentrant les **« Paramètres »** sur leur vocation naturelle : la configuration système et métier.

### 🛡️ Engagements de Non-Régression & Sanctuarisation (Périmètres Inviolables) :

1. **Persistance & Schéma BD Intacts :**
   - Zéro modification de tables SQL. Les endpoints `/content` (`site_content`) et `/settings` (`settings`) continuent d'opérer sous le capot sans aucune rupture de contrat.
2. **Rétrocompatibilité Totale des Liens & Routes :**
   - Toute URL historique `/admin/content` redirige automatiquement vers le bon onglet du Studio unifié.
3. **Intégrité Métier Absolue :**
   - Les commandes, paiements, clients, utilisateurs, notifications, blog et avis clients restent 100% opérationnels.
4. **Parité Linguistique Trilingue Inviolable :**
   - Toutes les interfaces du Studio respectent la parité FR / EN / AR et le support RTL.

---

## 2. Architecture Ergonomique Cible du Backstage

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                NOUVELLE TOPOLOGIE ÉPURÉE DU BACKSTAGE                       │
 ├────────────────────────────────────────┬────────────────────────────────────┤
 │ ⚙️ PARAMÈTRES BOUTIQUE (/admin/settings)│ 🎨 STUDIO DE CONCEPTION (/admin/pages)│
 ├────────────────────────────────────────┼────────────────────────────────────┤
 │ Purement Système, Métier & Identité :  │ Tout ce qui est Visuel & Rendu :   │
 │ • Raison sociale, logo & devises       │ ┌────────────────────────────────┐ │
 │ • Thème & couleurs (Dark/Light/System) │ │ Onglet 1 : « Pages & Vues »    │ │
 │ • Maintenance VIP & Teasing            │ │  (Accueil, CV, Projets, etc.)  │ │
 │ • Seuils de stock & Franco de port     │ ├────────────────────────────────┤ │
 │ • Coordonnées officielles boutique     │ │ Onglet 2 : « Cadre Global »    │ │
 │                                        │ │  (Header, Footer, Ticker, WA)  │ │
 │                                        │ └────────────────────────────────┘ │
 └────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Découpage Chronologique des Étapes

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Phase 38 : Studio de Conception Visuelle Unifié & Harmonisation Backstage  │
 │  ├── Étape 38.A : Architecture du Studio Unifié & Navigation par Onglets   │
 │  ├── Étape 38.B : Intégration du Cadre Global (Header, Footer, Ticker, WA)  │
 │  ├── Étape 38.C : Intégration de l'Accueil dans le Compositeur de Vues     │
 │  ├── Étape 38.D : Clarification Épurée des Paramètres (/admin/settings)    │
 │  ├── Étape 38.E : Harmonisation Sidebar AdminLayout & Redirections 360°    │
 │  └── Étape 38.F : Recette Qualité, CI Stricte & Packaging Horodaté         │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### Étape 38.A : Architecture du Studio Unifié (`/admin/pages`)

- Transformation de [`src/pages/admin/PagesManager.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/PagesManager.tsx) en **Studio Visuel & Pages** :
  - Barre d'onglets maîtres supérieurs :
    1. **📄 Pages & Vues Composables :** Le gestionnaire de vues existant (liste des pages, réordonnancement, inspecteur de props, 24 blocs universels).
    2. **🌐 Cadre Global & Navigation :** Les éditeurs du Header, du Footer, du Ticker bar et du widget flottant WhatsApp.
  - Support de l'état d'onglet dans l'URL (`?tab=pages` ou `?tab=global`) pour préserver la navigation directe.

### Étape 38.B : Rapatriement du Cadre Global dans le Studio

- Migration des éditeurs visuels de `Content.tsx` (Pôle Global & Mobile) directement dans l'onglet « Cadre Global » du Studio :
  - **En-tête (Header) :** Titre, logo, liens personnalisés du menu.
  - **Barre d'annonces (Ticker) :** Messages défilants, vitesse, switch actif.
  - **Pied de page (Footer) :** Slogan, colonnes de liens personnalisées, texte de copyright.
  - **Bouton Flottant WhatsApp :** Numéro, message prérempli, interrupteur d'activation.

### Étape 38.C : Intégration de la Page d'Accueil dans le Compositeur

- Permettre à l'administrateur de gérer l'Accueil (`/`) directement depuis la liste des vues composables :
  - La page `home` (slug `/`) figure en tête de liste des vues comme vue maîtresse sanctuarisée.
  - L'exploitant peut y activer, désactiver, réordonner les blocs de la page d'accueil avec le même inspecteur de contenu.

### Étape 38.D : Clarification Épurée de `/admin/settings`

- Nettoyage des redondances dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) :
  - Recentrage sur : Identité boutique, Logo/Favicon, Thème sombre/clair, Maintenance VIP, Stocks & seuils, Livraison.
  - Les liens de réseaux sociaux et le copyright redirigent ou s'harmonisent avec le Studio pour éviter toute double saisie discordante.

### Étape 38.E : Harmonisation Menu Backstage & Redirection

- Mise à jour de [`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx) :
  - Remplacement de l'entrée redondante `Contenus du site` par l'intitulé unifié **« Studio Visuel & Pages »** (`/admin/pages`).
  - Ajout d'une redirection automatique dans `src/App.tsx` : `/admin/content` $\rightarrow$ `/admin/pages?tab=global` avec notification amicale.
- Alignement des clés d'i18n trilingues FR / EN / AR dans `src/lib/i18n/admin/socle/`.

### Étape 38.F : Recette Complète & Validation CI

- Exécution de la suite obligatoire :
  - `bun run verifier-i18n` (parité trilingue stricte).
  - `bun run format` (Prettier).
  - `bunx tsc --noEmit` (TypeScript strict, 0 erreur).
  - `bun run lint` (ESLint, 0 erreur).
  - `bun run build; bun run paqueter:data` (génération des archives horodatées).
- Enregistrement officiel dans [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) (Phase 38).

---

## 4. Matrice de Recette & Critères de Succès

| Domaine                        | Critère de Contrôle                                  | Résultat Attendu                                                         |
| :----------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------- |
| **Studio Unifié**              | Accéder à `/admin/pages`                             | Interface fluide avec onglets « Pages & Vues » et « Cadre Global »       |
| **Éléments Globaux**           | Modifier le Ticker ou les colonnes du Footer         | Modifications immédiatement enregistrées dans `site_content` et visibles |
| **Redirection /admin/content** | Taper l'URL `/admin/content`                         | Redirection propre vers le Studio sans erreur 404                        |
| **Paramètres Épurés**          | Naviguer dans `/admin/settings`                      | Écran clair dédié aux réglages système et boutique sans dispersion       |
| **Zéro Régression Métier**     | Panier, checkout, commandes, auth                    | 100% opérationnel sans altération                                        |
| **Pipeline CI**                | `bun run lint && bunx tsc --noEmit && bun run build` | 0 erreur bloquante                                                       |
