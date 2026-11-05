# PLAN D'IMPLÉMENTATION — PHASE 16

## Résolution de la ParseError PHP (Crash 500 Cascade), Support Windows CLI (Backup 503) & Complétude i18n

**Projet :** KA Tech Hub  
**Date :** 05/11/2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire :** ArchiSys3.0 (Directeur de Projet & Architecte Décideur)  
**Statut :** Soumis à validation

---

### 1. Objectifs & Enjeux

1. **Rétablir immédiatement l'API (Éradication du crash 500) :**  
   Corriger les erreurs de syntaxe PHP (`ParseError`) dans `ControleurProduits.php` et `ControleurStock.php` où des apostrophes SQL imbriquées non échappées brisaient l'inclusion de `routes.php`, provoquant une panne 500 sur 100% des routes de l'API.
2. **Rendre opérationnel le téléchargement de sauvegarde sous Windows (Éradication du code 503) :**  
   Adapter la détection du binaire PHP CLI dans `ControleurMaintenance.php::binairePhpCli()` pour prendre en compte les extensions exécutables sous Windows (`php.exe`, `PHP_BINDIR . DIRECTORY_SEPARATOR . 'php.exe'`).
3. **Clôturer les avertissements i18n :**
   - Intégrer les clés `admin.reglages.parametres.wizard_bouton_lancer` et `admin.reglages.parametres.json_btn_reinitialiser` dans les trois langues (`fr.ts`, `en.ts`, `ar.ts`).
   - Remplacer l'usage de `admin.socle.confirmation.annuler` par `common.cancel` dans `Auth.tsx` (route publique visiteur non couverte par le namespace `admin`).

---

### 2. Étapes Chirurgicales d'Implémentation

#### Étape 1 : Correction syntaxique PHP (`ControleurProduits.php` & `ControleurStock.php`)

- **Fichiers concernés :**
  - `api/src/Controllers/ControleurProduits.php` (ligne ~289)
  - `api/src/Controllers/ControleurStock.php` (ligne ~151)
- **Action :** Échapper les apostrophes simples entourant les statuts de stock `'out'`, `'low'`, `'in'` dans la chaîne SQL ou utiliser des guillemets SQL compatibles (`\'out\'`, `\'low\'`, `\'in\'`).
- **Contrôle :** Exécuter `php -l` sur chaque fichier pour garantir 0 erreur de syntaxe.

#### Étape 2 : Support Windows du binaire PHP CLI (`ControleurMaintenance.php`)

- **Fichier concerné :** `api/src/Controllers/ControleurMaintenance.php`
- **Action :**
  - Dans `binairePhpCli()`, si `PHP_OS_FAMILY === 'Windows'` ou `DIRECTORY_SEPARATOR === '\\'`, tester également les variantes avec extension `.exe` :
    - `PHP_BINDIR . DIRECTORY_SEPARATOR . 'php.exe'`
    - Les commandes dans le `PATH` : `'php.exe'`, `'php8.exe'`, etc.
- **Contrôle :** Exécuter la sonde isolée pour vérifier que `binairePhpCli()` résout correctement le binaire `php.exe` sur l'environnement hôte.

#### Étape 3 : Complétude des traductions i18n & Correction `Auth.tsx`

- **Fichiers concernés :**
  - `src/lib/i18n/admin/reglages/fr.ts`
  - `src/lib/i18n/admin/reglages/en.ts`
  - `src/lib/i18n/admin/reglages/ar.ts`
  - `src/pages/Auth.tsx`
- **Actions :**
  - Ajouter dans les dictionnaires réglages :
    - FR :
      - `"admin.reglages.parametres.wizard_bouton_lancer": "Assistant de configuration"`
      - `"admin.reglages.parametres.json_btn_reinitialiser": "Réinitialiser"`
    - EN :
      - `"admin.reglages.parametres.wizard_bouton_lancer": "Setup Wizard"`
      - `"admin.reglages.parametres.json_btn_reinitialiser": "Reset"`
    - AR :
      - `"admin.reglages.parametres.wizard_bouton_lancer": "معالج الإعداد"`
      - `"admin.reglages.parametres.json_btn_reinitialiser": "إعادة التعيين"`
  - Dans `src/pages/Auth.tsx` : remplacer `{t("admin.socle.confirmation.annuler")}` par `{t("common.cancel")}`.

---

### 3. Matrice de Validation & Recette

| Jalon de test               | Méthode d'exécution                                               | Résultat attendu                                     |
| :-------------------------- | :---------------------------------------------------------------- | :--------------------------------------------------- |
| **Linting PHP Global**      | Script récursif `php -l` sur l'ensemble de `api/src/`             | 100% fichiers valides, 0 ParseError                  |
| **Test Routeur API**        | Requêtes HTTP GET sur `/api/v1/content`, `/api/v1/products`       | Statut HTTP 200 OK                                   |
| **Test Authentification**   | Requête HTTP GET sur `/api/v1/auth/me`                            | Statut attendu (401 invité ou 200 connecté) sans 500 |
| **Test Sauvegarde Windows** | Requête HTTP GET sur `/api/v1/maintenance/backup` avec rôle owner | Statut 200 + téléchargement flux archive             |
| **Vérification i18n Front** | Inspection console navigateur sur `/admin/settings` et `/auth`    | 0 avertissement de clé manquante                     |
| **Intégrité CI / Build**    | `bun run lint && bunx tsc --noEmit && bun run build`              | Pipeline au vert                                     |

---

### 4. Traçabilité & Packaging

- Mise à jour du journal officiel `.agents/tracabilites.md` pour acter la Phase 16.
- Re-génération des archives déployables `katech-site.zip`.
