# Plan d'Implémentation — Phase 10 : Branding 360°, Thème Dynamique (Clair/Sombre/Système) & Modularité Visuelle

**Projet :** KA Tech (ka-tech)  
**Directeur & Validateur :** ArchiSys3.0  
**Tech Lead & Architecte R&D :** AImi  
**Mode :** 📋 Mode Plan

---

## 1. Contexte & Objectifs

Pour poursuivre la transformation de KA Tech en une plateforme Marque Blanche (White-Label) universelle et configurable à 100 % depuis son backstore, la **Phase 10** prend en charge la maîtrise complète de l'allure visuelle et de l'ambiance graphique de la boutique.

### Objectifs Clés :

1. **Thème par défaut configurable :** Pouvoir choisir depuis `/admin/settings` si la boutique s'ouvre en **Mode Clair**, en **Mode Sombre** ou selon les **Préférences Système** du visiteur, avec application instantanée à 0 ms (zéro flash blanc/noir).
2. **Couleur de marque dynamique :** Permettre au commerçant de définir sa couleur primaire (`primaryColor`) et sa couleur d'accent pour métamorphoser l'identité visuelle de la vitrine sans recompiler Tailwind CSS.
3. **Favicon personnalisé :** Téléverser et synchroniser le favicon de la boutique (`faviconUrl`) dans l'en-tête HTML.
4. **Modularité Métier (Configurateur PC) :** Commutateur `builderEnabled` permettant de masquer en un clic le configurateur de PC (`/builder`) et ses bandeaux pour les commerces non informatiques.

---

## 2. Découpage Chirurgical des Étapes

### Étape 1 : Extension du Schéma des Réglages (`SiteSettings`)

- **Fichier :** [`src/api/types.ts`](file:///c:/xampp/htdocs/ka-tech/src/api/types.ts) et [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/ka-tech/src/data-provider/site-settings.ts)
  - Ajouter à `SiteSettings` :
    - `defaultTheme: "dark" | "light" | "system"` (défaut : `"dark"` pour préserver l'existant).
    - `primaryColor?: string` (code hexadécimal ex: `#3b82f6` ou HSL).
    - `faviconUrl?: string` (chemin relatif ou URL d'icône).
    - `builderEnabled: boolean` (défaut : `true`).
  - Mettre à jour `DEFAULT_SITE_SETTINGS` et la synchronisation locale dans `getInitialSiteSettings()`.

### Étape 2 : Bootstrapping Synchrone du Thème & Favicon (0 ms)

- **Fichier :** [`public/index.php`](file:///c:/xampp/htdocs/ka-tech/public/index.php) et [`index.html`](file:///c:/xampp/htdocs/ka-tech/index.html)
  - Injecter `defaultTheme`, `primaryColor` et `faviconUrl` dans `window.__SITE_SETTINGS_BOOTSTRAP__`.
  - Adapter le micro-script synchrone du `<head>` pour positionner `class="light"` ou `class="dark"` sur `<html>` avant le premier paint selon `defaultTheme` (si aucun choix dans `localStorage`).
  - Remplacer dynamiquement le `<link rel="icon">` par le favicon personnalisé s'il est configuré.

### Étape 3 : Dynamisation du `ThemeProvider` & Variables CSS

- **Fichier :** [`src/lib/theme.tsx`](file:///c:/xampp/htdocs/ka-tech/src/lib/theme.tsx)
  - Lire `defaultTheme` depuis `getInitialSiteSettings()` comme valeur de repli si `localStorage.getItem("ka-theme")` est absent.
  - Appliquer dynamiquement la variable CSS `--primary` sur `document.documentElement` lorsque `primaryColor` est configuré.

### Étape 4 : Interface d'Administration (`/admin/settings`)

- **Fichier :** [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)
  - Section _Boutique & Identité_ :
    - Sélecteur de thème par défaut : _Mode Sombre (Défaut)_ / _Mode Clair_ / _Automatique (OS)_.
    - Sélecteur / palette de couleur primaire avec aperçu en temps réel.
    - Champ et bouton de téléversement pour le Favicon personnalisé.
  - Section _Options générales & Modules_ :
    - Commutateur pour activer ou masquer le module Configurateur PC (`builderEnabled`).

### Étape 5 : Conditionnement Visuel des Briques Métier (Vitrine & Navigation)

- **Fichiers :** [`src/components/Header.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Header.tsx), [`src/components/Footer.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Footer.tsx), [`src/pages/Index.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/Index.tsx)
  - Masquer le lien de menu "Configurateur" et le composant `BuilderTeaser` dès que `builderEnabled === false`.

### Étape 6 : Validation Qualité, Packaging & Traçabilité

- `bun run format && bunx tsc --noEmit && bun run lint && bun run build`.
- Génération du zip horodaté et consignation officielle dans [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

## 3. Matrice de Recette & Critères de Succès

| Test                            | Action                                                                                                        | Résultat Attendu                                                                             |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| **T1 : Thème Clair par Défaut** | Régler `defaultTheme: "light"` dans `/admin/settings` et ouvrir le site dans une fenêtre de navigation privée | Le site s'ouvre immédiatement en mode clair à 0 ms sans flash noir.                          |
| **T2 : Couleur Primaire**       | Sélectionner une nouvelle couleur primaire (ex: émeraude `#10b981`)                                           | Les boutons, liens actifs et badges de la vitrine prennent immédiatement la nouvelle teinte. |
| **T3 : Favicon Personnalisé**   | Téléverser un favicon depuis l'admin                                                                          | L'onglet du navigateur met à jour l'icône de la boutique.                                    |
| **T4 : Masquage Builder**       | Désactiver `builderEnabled` dans l'admin                                                                      | Le configurateur disparaît du Header, de l'accueil et du Footer.                             |
| **T5 : Qualité & Build**        | Exécution des checks de vérité                                                                                | 0 erreur `tsc`, 0 erreur `lint`, build Vite validé.                                          |
