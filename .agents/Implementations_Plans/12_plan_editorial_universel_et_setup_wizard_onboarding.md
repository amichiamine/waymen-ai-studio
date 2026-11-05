# Plan d'Implémentation — Phase 12 : Dé-spécialisation Éditoriale Complète & Assistant d'Initialisation (Setup Wizard)

**Projet :** KA Tech (ka-tech)  
**Directeur & Validateur :** ArchiSys3.0  
**Tech Lead & Architecte R&D :** AImi  
**Mode :** 📋 Mode Plan

---

## 1. Contexte & Objectifs

La **Phase 12** parachève la mutation White-Label en purgeant les derniers reliquats éditoriaux orientés tech des sections de vitrine et en dotant l'application d'un **Assistant de Configuration Guidé (Setup Wizard)** pour que tout nouveau commerçant puisse configurer sa boutique en 3 minutes dès son premier accès.

### Objectifs Clés :

1. **Universalisation éditoriale des sections vitrine :** Rendre 100% dynamiques et neutres les textes des blocs _Pourquoi nous choisir_ (`WhyUs.tsx`), _Engagements / À propos_ (`About.tsx`), _Bandeau défilant_ (`Ticker.tsx`) et pied de page, sans référence forcée à l'informatique ni mentions de matériel PC imposées.
2. **Setup Wizard (Assistant de Démarrage Clé-en-main) :** Un parcours d'accueil interactif au premier lancement d'administration (ou déclenchable à la demande) :
   - **Étape 1 : Identité & Marque :** Nom de la boutique, slogan, logo, favicon, thème par défaut (sombre/clair/auto), palette et couleur primaire.
   - **Étape 2 : Coordonnées Commerciales & Localisation :** Email de contact, téléphone WhatsApp, wilaya d'ancrage, adresse, devise.
   - **Étape 3 : Profil Métier & Modules :** Choix du profil (Commerce général, High-tech, Mode & Textile, Beauté & Cosmétiques, Prestations de services) avec pré-configuration et activation/désactivation des modules (ex : Configurateur PC sur mesure).
   - **Étape 4 : Gestion du Catalogue Démo :** Option pour conserver les 12 articles démo ou réinitialiser le catalogue pour démarrer immédiatement sur une boutique propre et vierge.
3. **Plateforme White-Label 100% livrable :** Capacité d'exporter et de déployer la boutique comme un produit neutre, prêt pour tout client, secteur d'activité ou entreprise.

---

## 2. Découpage Chirurgical des Étapes

### Étape 1 : Dé-spécialisation des Textes & Slogans Résiduels

- **Fichiers :** [`src/lib/site-content.ts`](file:///c:/xampp/htdocs/ka-tech/src/lib/site-content.ts), [`src/components/WhyUs.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/WhyUs.tsx), [`src/pages/About.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/About.tsx), [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx)
  - Dé-spécialiser les libellés statiques : remplacer les mentions d'informatique par des variables dynamiques interpolables `{storeName}` ou des libellés généralistes de commerce.
  - S'assurer que les blocs d'engagements (_Livraison 58 wilayas_, _Qualité certifiée_, _Support dédié_, _Paiement sécurisé_) s'adaptent harmonieusement à tout commerce.

### Étape 2 : Modèle d'Onboarding & Indicateur d'Initialisation

- **Fichiers :** [`src/lib/admin-store.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/admin-store.tsx), [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts)
  - Ajout du drapeau `onboardingCompleted: boolean` (défaut `true` pour boutiques existantes, initialisé à `false` lors d'un reset ou premier déploiement).
  - Synchronisation de `SiteSettings` avec le serveur SQLite et le store local.

### Étape 3 : Composant Setup Wizard d'Onboarding

- **Fichier :** `src/components/admin/SetupWizard.tsx`
  - Dialog modal immersif et soigné guidé en 4 étapes avec barre de progression et navigation Précédent / Suivant.
  - Sauvegarde immédiate et atomique des réglages (`updateSettings`, `updateContent`).
  - Déclenchement automatique dès l'accès à `/admin` si `!siteSettings.onboardingCompleted`.
  - Bouton permanent « Relancer l'assistant d'installation » dans [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx).

### Étape 4 : Option de Purge du Catalogue Démo

- **Fichier :** [`src/pages/admin/Reset.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Reset.tsx) et au sein du Wizard (Étape 4) :
  - Option explicite pour vider le catalogue des 12 produits démo tech sans corrompre les structures de données.

### Étape 5 : i18n Trilingue, Validation Qualité & Packaging

- Dictionnaires FR / EN / AR mis à jour avec 100% de parité (`bun run verifier-i18n`).
- Validation intégrale du pipeline : `bun run format && bunx tsc --noEmit && bun run lint && bun run build`.
- Création de la release zip horodatée et mise à jour de [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

## 3. Matrice de Recette & Critères de Succès

| Test                            | Action                                                                       | Résultat Attendu                                                                       |
| :------------------------------ | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **T1 : Déclenchement Wizard**   | Premier accès admin ou clic sur "Relancer l'assistant" dans Réglages         | Le Setup Wizard s'ouvre avec les 4 étapes guidées fluides.                             |
| **T2 : Configuration Complète** | Compléter les étapes (nom, logo, couleur, thème, coordonnées, profil métier) | Toutes les valeurs sont appliquées en direct et persistées.                            |
| **T3 : Profils Métier**         | Sélectionner "Mode & Beauté" ou "Services"                                   | Le configurateur PC est désactivé automatiquement, le slogan et la vitrine s'adaptent. |
| **T4 : Purge Données Démo**     | Choisir "Démarrer avec un catalogue vierge"                                  | Les 12 produits démo sont supprimés proprement, prêt pour la saisie commerçant.        |
| **T5 : Zéro Résidu Tech**       | Parcourir l'accueil et la vitrine                                            | Zéro texte figé parlant d'informatique, affichage 100% adapté au commerce choisi.      |
| **T6 : Qualité & Build**        | Pipeline de validation complet                                               | 0 erreur `tsc`, 0 erreur `lint`, build Vite validé et archive de déploiement prête.    |
