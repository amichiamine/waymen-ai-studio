# Phase 13 — Unification du Setup Wizard (Installation & Onboarding), Résolution du Mode Maintenance & Contrôleurs Visuels Backstore

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & R&D :** AImi  
**Date :** 05 Novembre 2026  
**Statut :** Proposé — En attente de validation par ArchiSys3.0

---

## 1. Contexte & Problématique

Lors de la recette d'exploitation post-Phases 10-12, deux axes majeurs d'amélioration et un angle mort critique ont été identifiés par **ArchiSys3.0** :

1. **Rupture entre l'installateur serveur (`api/install.php`) et l'assistant de configuration (`SetupWizard.tsx`) :**
   - Actuellement, l'installateur PHP crée la base de données et le mot de passe propriétaire, puis l'administrateur doit se connecter et découvrir l'assistant dans `/admin/settings`.
   - **Exigence d'ArchiSys3.0 :** Unifier l'expérience dès le premier déploiement. L'assistant doit pouvoir guider l'utilisateur de bout en bout (création/vérification de la base & du compte root jusqu'aux personnalisations graphiques et sectorielles), tout en restant disponible de manière permanente dans le backstage pour toute réintervention durant l'exploitation.
2. **Angle mort critique du Mode Maintenance (`src/App.tsx`) :**
   - Le composant `App.tsx` et `AdminLayout` consomment l'ancien store mémoire `useAdminState()` au lieu du fournisseur officiel `useSiteSettings()`.
   - Conséquence : le mode maintenance activé en base SQLite reste inopérant pour les visiteurs publics (toujours `false` dans le store mock).
3. **Persistance de zones de personnalisation en "Pur JSON" dans `/admin/settings` :**
   - 4 cartes critiques (Bandeau défilant Ticker, Marques partenaires du carrousel, Valeurs de la page À propos, Étapes du configurateur) s'éditent actuellement via des `<textarea>` de JSON brut.
   - Une simple virgule manquante ou un guillemet mal placé fait crasher la configuration, ce qui est inacceptable pour un commerçant ou une utilisation White-Label non-technique.

---

## 2. Objectifs & Livrables Attendus

1. **Livrable 1 — Résolution Chirurgicale du Mode Maintenance & Options Globales (`App.tsx` & Data-Provider) :**
   - Raccorder `useSiteSettings()` dans `App.tsx` et `AdminLayout` pour remplacer définitivement les deux derniers appels résiduels à `useAdminState()`.
   - Garantir que dès que `maintenance === true`, tout visiteur public non-admin est immédiatement basculé sur `MaintenanceScreen`.
   - Activer par défaut le sélecteur trilingue (`languageSelectorEnabled: true`).
2. **Livrable 2 — Remplacement des 4 Éditeurs Pure JSON par des Contrôleurs Visuels Interactifs :**
   - **Contrôleur Visuel Tickers :** Liste de messages avec badges, ajout de message en 1 clic, sélection de l'icône et suppression directe.
   - **Contrôleur Visuel Marques du Carrousel :** Gestionnaire de chips/pastilles visuel avec champ d'ajout direct (ex: tapez le nom, Entrée/Ajouter, pastille avec croix de suppression).
   - **Contrôleur Visuel Valeurs À Propos :** Liste de cartes visuelles éditables (Titre, Description, Icône Lucide).
   - **Contrôleur Visuel Étapes Configurateur :** Interface modulaire accordéon par étape.
   - _(Bouton bascule « Vue Visuelle / Vue JSON expert » conservé pour les techniciens)._
3. **Livrable 3 — Grand Wizard Unifié & Intégration Premier Déploiement :**
   - Raccordement du Setup Wizard dès l'installation : détection automatique de l'état d'installation et guidage pas-à-pas.
   - Raccourci d'accès direct et permanent au Wizard dans la barre latérale du Backstore (menu d'administration principal) en plus du bandeau dans `/admin/settings`.

---

## 3. Découpage Chirurgical en Sous-Phases d'Exécution

```
                   CHRONOGRAMME D'EXÉCUTION — PHASE 13
                   ═══════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────────┐
  │ SOUS-PHASE 13.1 : RÉSOLUTION MODE MAINTENANCE & APP.TSX (0 RÉGRESSION)  │
  │ • Substitution useAdminState ➔ useSiteSettings dans src/App.tsx        │
  │ • Hydratation 0 ms & détection immédiate de maintenance = true         │
  │ • languageSelectorEnabled = true par défaut                            │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────┴────────────────────────────────────┐
  │ SOUS-PHASE 13.2 : CONTRÔLEURS VISUELS INTERACTIFS DANS /ADMIN/SETTINGS │
  │ • Création des éditeurs visuels : Tickers, Marques (Chips), Valeurs   │
  │ • Mode double : « Visuel (défaut) / JSON brut (expert) »              │
  │ • Éradication du risque d'erreur de syntaxe JSON pour le commerçant    │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────┴────────────────────────────────────┐
  │ SOUS-PHASE 13.3 : EXPÉRIENCE WIZARD ÉTENDUE & ACCÈS DIRECT PERMANENT   │
  │ • Raccourci Wizard dans la Sidebar Admin (Navigation immédiate)        │
  │ • Passerelle fluide entre l'installateur serveur et le Wizard React    │
  │ • Validation finale : verifier-i18n, tsc, lint, build et paqueter      │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Matrice de Recette & Conditions de Validation

| Id           | Critère de Validation            | Résultat Attendu                                                                                                                         |
| :----------- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **REC-13.1** | Mode Maintenance activé en Admin | Dès l'activation dans `/admin/settings`, un visiteur sur `/` (navigation privée) voit instantanément le grand écran `MaintenanceScreen`. |
| **REC-13.2** | Accès Administrateur préservé    | L'administrateur connecté conserve l'accès direct à `/admin` et `/auth` même si la maintenance est active.                               |
| **REC-13.3** | Édition des Marques sans JSON    | L'administrateur ajoute et supprime des marques du carrousel sous forme de tags visuels sans jamais taper de crochets ni de guillemets.  |
| **REC-13.4** | Édition des Tickers sans JSON    | L'administrateur gère ses messages défilants via une liste interactive avec champ texte et bouton de suppression.                        |
| **REC-13.5** | Accès Permanent au Wizard        | Le Wizard est accessible en 1 clic depuis le menu latéral de l'administration et reconfigurable à tout moment.                           |
| **REC-13.6** | Pipeline de Certification        | `bun run verifier-i18n`, `bunx tsc --noEmit`, `bun run lint`, `bun run build` à 100 % vert.                                              |

---

## 5. Règle d'Engagement

Conformément à la gouvernance, **aucun code source ne sera modifié avant la validation formelle et explicite de ce plan directeur par ArchiSys3.0**.
