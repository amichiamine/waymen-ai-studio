# Plan d'Implémentation — Phase 09 : Résolution Définitive des Médias Téléversés (Uploads & Logo) et Accessibilité Radix UI

**Projet :** KA Tech (ka-tech)  
**Directeur & Validateur :** ArchiSys3.0  
**Tech Lead & Architecte R&D :** AImi  
**Mode :** 📋 Mode Plan

---

## 1. Contexte & Problématique Vérifiés sur le Code Réel

Les vérifications chirurgicales menées directement sur les codes sources et l'état disque ont confirmé les causes racines suivantes :

1. **Destination erronée des uploads (`api/src/Controllers/ControleurMedias.php`) :**
   - Lignes 174 et 308 : le code utilise `dirname(__DIR__, 3) . '/public_html/uploads'`.
   - En environnement local XAMPP (`C:\xampp\htdocs\ka-tech`), `dirname(__DIR__, 3)` vaut déjà `C:\xampp\htdocs\ka-tech`. Le fichier s'écrit donc dans `ka-tech/public_html/uploads/` au lieu de `ka-tech/uploads/`.
   - Apache servant depuis `C:\xampp\htdocs\ka-tech`, la requête `GET http://localhost/ka-tech/uploads/xxx.jpg` retourne un **code 404** (alors que `public_html/uploads/xxx.jpg` répond 200).
   - De même sur Hostinger en production, l'archive étant extraite dans `public_html/`, ce code créait un double dossier `public_html/public_html/uploads/` (`GUIDE-EXPLOITATION.md` §8.2, défaut n° 4).

2. **Absence de résolution d'URL dans les composants `Logo.tsx` et `Settings.tsx` :**
   - [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx) (ligne 15) : `const logoSrc = hasCustomLogo ? s.logoUrl! : defaultLogoSrc;` n'appelle pas `resoudreUrlMedia()`.
   - [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx) (ligne 216) : l'aperçu utilise directement `form.logoUrl` brut au lieu de `resoudreUrlMedia(form.logoUrl)`.
   - Sur `/admin/settings`, le navigateur interprète `uploads/xxx.jpg` comme `/admin/uploads/xxx.jpg` (404), affichant l'icône d'image brisée.
   - Sur la vitrine, l'échec 404 déclenche `onError` dans `Logo.tsx`, qui bascule sur `defaultLogoSrc` (`ka-tech-logo.webp`), masquant le logo téléversé.

3. **Sauvegarde immédiate du logo téléversé :**
   - Dans `Settings.tsx`, le téléversement met à jour l'état local `form.logoUrl` mais n'enregistre pas immédiatement dans `siteSettings` via l'API, ce qui créait une ambiguïté pour l'utilisateur au premier essai avant de cliquer sur « Enregistrer les modifications ».

4. **Routage de développement Vite pour `/uploads` :**
   - Dans [`vite.config.ts`](file:///c:/xampp/htdocs/ka-tech/vite.config.ts), seul `/api` est proxifié vers le backend. Les requêtes vers `/uploads` retombent sur le serveur Vite nu qui ne possède pas ce dossier.

5. **Avertissement d'accessibilité Radix UI :**
   - Dans [`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx) (ligne 311), `<SheetContent>` ne comporte pas de `<SheetDescription>`, ce qui déclenche l'avertissement `sheet.tsx:63 Warning: Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}`.

---

## 2. Plan d'Action Découpé en Étapes

### Étape 1 : Réparation de l'API PHP et Gestion du Dossier `uploads/`

- **Fichier :** [`api/src/Controllers/ControleurMedias.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Controllers/ControleurMedias.php)
  - Remplacer `dirname(__DIR__, 3) . '/public_html/uploads'` par `dirname(__DIR__, 3) . '/uploads'` (aux lignes 174 et 308).
- **Fichier :** [`api/.env`](file:///c:/xampp/htdocs/ka-tech/api/.env)
  - Définir explicitement `UPLOAD_DIR=C:/xampp/htdocs/ka-tech/uploads`.
- **Système de fichiers :**
  - Créer le dossier racine `uploads/` s'il n'existe pas.
  - Déplacer les images déjà téléversées depuis `public_html/uploads/` vers le dossier racine `uploads/`.

### Étape 2 : Relais Proxy Vite pour `/uploads` en Mode Dev

- **Fichier :** [`vite.config.ts`](file:///c:/xampp/htdocs/ka-tech/vite.config.ts)
  - Ajouter dans `server.proxy` la directive pour `/uploads` routant vers `http://localhost/ka-tech/uploads` (ou vers le port de l'API dev).

### Étape 3 : Câblage Robuste du Logo Frontend & Backstage

- **Fichier :** [`src/components/Logo.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/Logo.tsx)
  - Importer `resoudreUrlMedia` depuis `./media-url`.
  - Appliquer `resoudreUrlMedia(s.logoUrl)` pour alimenter `logoSrc`.
- **Fichier :** [`src/pages/admin/Settings.tsx`](file:///c:/xampp/htdocs/ka-tech/src/pages/admin/Settings.tsx)
  - Importer `resoudreUrlMedia` depuis `@/components/media-url`.
  - Appliquer `resoudreUrlMedia(form.logoUrl)` dans l'aperçu d'image.
  - Dans `handleLogoUpload`, déclencher la sauvegarde immédiate dans les réglages (`await updateSettings({ ...form, logoUrl: asset.src })`) pour que le changement prenne effet dès le téléversement sans dépendre d'un clic ultérieur sur le bouton en bas de page.

### Étape 4 : Éradication de l'Avertissement Radix UI Sheet

- **Fichier :** [`src/components/admin/AdminLayout.tsx`](file:///c:/xampp/htdocs/ka-tech/src/components/admin/AdminLayout.tsx)
  - Ajouter `<SheetDescription className="sr-only">{t("admin.socle.navigation.description") || "Menu de navigation d'administration"}</SheetDescription>` dans `AdminMobileNav`.

### Étape 5 : Validation Qualité, Packaging & Traçabilité

- Validation globale : `bun run format && bunx tsc --noEmit && bun run lint && bun run build`.
- Vérification du livrable zip horodaté.
- Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) en parité 1:1.

---

## 3. Matrice de Recette & Critères de Succès

| Test                                    | Action                                                | Résultat Attendu                                                                   |
| :-------------------------------------- | :---------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **T1 : Téléversement Logo**             | Téléverser une image de logo depuis `/admin/settings` | Fichier écrit dans `uploads/`, aperçu immédiat sans image cassée, toast de succès. |
| **T2 : Affichage Vitrine**              | Recharger la vitrine `/` et une sous-page `/about`    | Le logo personnalisé s'affiche fidèlement à la place du logo officiel par défaut.  |
| **T3 : Suppression / Réinitialisation** | Vider le logo ou cliquer sur la corbeille             | Le logo officiel KA Tech reprend immédiatement sa place.                           |
| **T4 : Console Dev**                    | Ouvrir la console du navigateur en mode dev           | Zéro avertissement Radix UI Dialog/Sheet.                                          |
| **T5 : Intégrité Build**                | Exécution du pipeline complet                         | 0 erreur `tsc`, 0 erreur `lint`, build Vite OK, package zip généré.                |
