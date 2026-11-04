# PLAN D'IMPLÉMENTATION — PHASE 01

## Activation du Prérendu Playwright via Jonction Locale NTFS & Build de Production Complet

**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode d'Action :** Mode Plan  
**Statut :** 🟢 Livré & Validé

---

## 1. Contexte & Problématique

Lors de l'exécution de `bun run build`, le script de prérendu statique [scripts/prerendu.ts](file:///c:/xampp/htdocs/ka-tech/scripts/prerendu.ts) a sauté la génération des 27 pages HTML destinées au référencement SEO (`0/27 pages prérendues`).  
Bien que Playwright soit déjà présent sur la machine hôte (`C:\Users\Magistik\AppData\Local\ms-playwright`), la version `playwright@1.62.1` installée dans le projet attend strictement la révision `1234` (`chromium_headless_shell-1234`), alors que la machine dispose des révisions `1208`, `1217` et `1223`.

ArchiSys3.0 a formellement arbitré pour la **Solution 2 (Zéro-téléchargement)** : créer une jonction de répertoire NTFS locale liant la révision `1234` demandée vers la révision `1223` existante, puis relancer le pipeline de build complet avec hydratation API.

---

## 2. Objectifs Techniques

1. **Liaison NTFS Locale :** Établir une jonction transparente dans `%LOCALAPPDATA%\ms-playwright` pour que `playwright@1.62.1` trouve immédiatement son exécutable `chrome-headless-shell.exe` sans nécessiter de téléchargement externe.
2. **Hydratation des Données au Build :** Démarrer l'API locale sur le port 8160 (`bun run dev:api`) afin que [scripts/prerendu.ts](file:///c:/xampp/htdocs/ka-tech/scripts/prerendu.ts) puisse récupérer les fiches produits et articles de blog réels pour prérendre les 27 routes sans page d'erreur.
3. **Génération du Paquet de Production :** Produire un `katech-site.zip` exhaustif contenant les 27 pages prérendues en HTML complet ainsi que le bundle client `index-D5MWkN2A.js` intégrant la validation email permissive pour `a@a.a`.
4. **Validation & Non-Régression :** Confirmer le code de sortie 0, l'écriture effective des 27 pages, et la mise à jour du journal [tracabilites.md](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md).

---

## 3. Découpage Opérationnel par Étapes

### Étape 1 : Création de la Jonction NTFS Locale dans ms-playwright

- **Cible :** `C:\Users\Magistik\AppData\Local\ms-playwright\chromium_headless_shell-1234`
- **Source :** `C:\Users\Magistik\AppData\Local\ms-playwright\chromium_headless_shell-1223`
- **Action complémentaire :** Lier également `chromium-1234` vers `chromium-1223` pour couvrir tout appel alternatif.
- **Commande :**
  ```powershell
  cmd /c mklink /J "$env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-1234" "$env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-1223"
  cmd /c mklink /J "$env:LOCALAPPDATA\ms-playwright\chromium-1234" "$env:LOCALAPPDATA\ms-playwright\chromium-1223"
  ```
- **Contrôle :** Vérification de l'existence du chemin d'accès `chrome-headless-shell.exe` sous le dossier `1234`.

### Étape 2 : Lancement de l'API Locale d'Hydratation

- Démarrer l'API dev en arrière-plan :
  ```bash
  bun run dev:api
  ```
- Vérifier la réponse de santé :
  ```bash
  curl -s http://127.0.0.1:8160/health
  ```

### Étape 3 : Exécution du Build Complet avec Prérendu Hydraté

- Exécution de la commande de build avec passage de l'URL d'API de prérendu :
  ```bash
  powershell -Command "$env:PRERENDU_API_URL='http://127.0.0.1:8160'; $env:VITE_API_MODE='http'; bun run build"
  ```
- Surveillance des étapes `generate-sitemap.ts`, `vite build`, `prerendu.ts` et `paqueter.ts`.

### Étape 4 : Inspection et Validation des Artefacts

- Vérifier le log console de `prerendu.ts` : confirmer le statut `27/27 page(s) écrites`.
- Vérifier la structure de `dist/` (présence des répertoires HTML statiques : `dist/about/index.html`, `dist/product/.../index.html`).
- Vérifier la fraîcheur et la taille de l'archive [katech-site.zip](file:///c:/xampp/htdocs/ka-tech/katech-site.zip).

### Étape 5 : Traçabilité et Clôture

- Mettre à jour [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/ka-tech/.agents/tracabilites.md) avec l'état de la Phase 01 et les résultats de recette.
- Restitution du rapport de livraison à ArchiSys3.0.

---

## 4. Matrice de Recette & Critères de Succès

| Point de Contrôle        | Condition de Succès                                   | Méthode de Vérification                                                                                                                 |
| :----------------------- | :---------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Jonction NTFS**        | Chemin valide et exécutable accessible                | `Test-Path "$env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe"` = True |
| **Lancement Playwright** | Lancement sans message d'erreur d'exécutable manquant | Disparition de l'avertissement `Executable doesn't exist` dans la console de build                                                      |
| **Couverture Prérendu**  | 27/27 pages générées avec du texte substantiel        | Ligne de résumé `[prerendu] 27/27 page(s) écrites` dans le terminal                                                                     |
| **Archive Déployable**   | `katech-site.zip` généré avec code de sortie 0        | Taille > 1,4 Mo, 247+ fichiers, timestamp rafraîchi                                                                                     |
