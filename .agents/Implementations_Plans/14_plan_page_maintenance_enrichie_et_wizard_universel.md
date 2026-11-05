# Phase 14 — Page de Maintenance Enrichie (VIP / Teasing), Déblocage de la Redirection Admin & Déclencheur Universel du Wizard

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & R&D :** AImi  
**Date :** 05 Novembre 2026  
**Statut :** Proposé — En attente de validation par ArchiSys3.0

---

## 1. Contexte & Problématique

Lors des tests en conditions réelles sur l'environnement de déploiement distant (`Waymen.stacgate.com`), plusieurs points ergonomiques et fonctionnels clés ont été identifiés par **ArchiSys3.0** :

1. **Boucle de redirection du bouton « Espace administrateur » en Mode Maintenance :**
   - Lorsqu'un utilisateur clique sur « Espace administrateur » depuis l'écran de maintenance, il est redirigé vers `/auth`.
   - Une fois connecté (ou s'il l'était déjà), `Auth.tsx` redirige par défaut vers `/account` (espace client standard).
   - Comme `/account` n'est pas une route admin, elle est immédiatement interceptée par la barrière de maintenance, renvoyant l'administrateur en boucle sur la page de maintenance.
2. **Page de maintenance trop minimaliste :**
   - Actuellement limitée à une icône et un texte brut.
   - **Vision d'ArchiSys3.0 :** Transformer cette page en une véritable vitrine d'attente premium (Coming Soon / En travaux VIP) comprenant : titre sur mesure, date/heure estimée de réouverture, bouton de discussion directe WhatsApp pour ne perdre aucun prospect, et coordonnées claires.
3. **Conditionnement & Déclenchement du Setup Wizard :**
   - Clarifier et fiabiliser le cycle de vie du flag `onboardingCompleted` (qui doit valoir `false` lors d'une nouvelle installation serveur pour s'ouvrir au premier accès).
   - Rendre le Wizard invocable à tout instant via un simple paramètre d'URL (`/admin?wizard=1` ou `/admin/settings?wizard=1`) sur n'importe quel navigateur.

---

## 2. Objectifs & Livrables Attendus

1. **Livrable 1 — Déblocage Définitif de l'Accès Admin depuis la Maintenance :**
   - Modifier [`src/components/MaintenanceGate.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/MaintenanceGate.tsx) pour faire pointer le bouton directement vers `/admin` avec état d'origine (`from: "/admin"`).
   - Mettre à jour [`src/pages/Auth.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Auth.tsx) : pour tout compte de rang `owner` ou `admin`, la redirection par défaut post-authentification est automatiquement dirigée vers `/admin` et jamais vers `/account`.
2. **Livrable 2 — Vitrine de Maintenance VIP Personnalisable (Backstage ➔ Vitrine) :**
   - Extension de `SiteSettings` avec :
     - `maintenanceTitle?: string` : Titre d'accroche personnalisé.
     - `maintenanceEstimatedReturn?: string` : Date/heure estimée de retour.
     - `maintenanceShowWhatsApp?: boolean` : Affichage du bouton vert d'assistance WhatsApp.
   - Backstage ([`Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)) : enrichissement de la carte "Mode Maintenance" avec contrôleurs visuels dédiés.
   - Vitrine ([`MaintenanceGate.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/MaintenanceGate.tsx)) : design premium responsive avec badge de date, bouton WhatsApp pulsant et liens de contact.
3. **Livrable 3 — Déclenchement Universel du Wizard par URL :**
   - Dans [`AdminShell.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminShell.tsx), ajout de la détection des paramètres d'URL `?wizard=1` ou `?setup=1` pour forcer l'ouverture du dialogue à la demande.
   - Initialisation explicite de `onboardingCompleted: false` lors des installations vierges dans l'installateur serveur.

---

## 3. Découpage Chirurgical en 3 Étapes

```
                   CHRONOGRAMME D'EXÉCUTION — PHASE 14
                   ═══════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────────┐
  │ ÉTAPE 14.1 : DÉBLOCAGE REDIRECTION MAINTENANCE ➔ AUTH ➔ ADMIN          │
  │ • MaintenanceGate.tsx : Link to="/admin" (state from: "/admin")        │
  │ • Auth.tsx : Redirection intelligente vers /admin pour rôles admin     │
  │ • Éradication totale de la boucle infinie                              │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────┴────────────────────────────────────┐
  │ ÉTAPE 14.2 : VITRINE MAINTENANCE VIP (BACKSTAGE + VISUEL)              │
  │ • Schéma SiteSettings : maintenanceTitle, estimatedReturn, whatsApp    │
  │ • Settings.tsx : Formulaire d'édition enrichi dans carte Maintenance   │
  │ • MaintenanceGate.tsx : Rendu haut de gamme avec badge + WhatsApp      │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────┴────────────────────────────────────┐
  │ ÉTAPE 14.3 : DÉCLENCHEUR WIZARD PAR URL & VALIDATION TOTALE            │
  │ • AdminShell.tsx : Écouteur query string (?wizard=1)                   │
  │ • Validation : verifier-i18n, tsc, lint, build et packaging zip        │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Matrice de Recette & Conditions de Validation

| Id           | Critère de Recette           | Résultat Attendu                                                                                                                                 |
| :----------- | :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **REC-14.1** | Bouton Maintenance ➔ Admin   | Le clic sur « Espace administrateur » depuis la page de maintenance ouvre directement la mire de connexion et redirige vers `/admin` (0 boucle). |
| **REC-14.2** | Connexion Admin intelligente | Un administrateur qui se connecte sur `/auth` atterrit sur `/admin` par défaut et non sur `/account`.                                            |
| **REC-14.3** | Titre & Message Maintenance  | Le titre personnalisé et la date de retour estimée saisis dans `/admin/settings` s'affichent fidèlement sur l'écran public de maintenance.       |
| **REC-14.4** | Bouton WhatsApp Maintenance  | Si activé, un bouton vert WhatsApp ouvre la discussion avec le numéro du magasin.                                                                |
| **REC-14.5** | Déclenchement Wizard par URL | Ouvrir `/admin?wizard=1` dans le navigateur affiche instantanément le Setup Wizard à l'écran.                                                    |
| **REC-14.6** | Pipeline de Certification    | `bun run verifier-i18n`, `bunx tsc --noEmit`, `bun run lint`, `bun run build` à 100 % vert.                                                      |

---

## 5. Règle d'Engagement

Conformément à la gouvernance, aucun code source ne sera modifié avant la validation formelle et explicite de ce plan directeur par ArchiSys3.0.
