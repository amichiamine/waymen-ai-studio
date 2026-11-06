# Plan 20 — Parachèvement Intégral : Contrat API home-reviews, Vitrine sur Base Vide, Parcours Clients, Toasts Admin 100% i18n & Sécurisation Script d'Urgence (Sous-Phases 20.3 & 20.4)

**Projet :** KA Tech (`amichiamine/ka-tech`)  
**Branche :** `main`  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** ⚡ Implémentation (`mode execution`)  
**Date :** 5 Novembre 2026

---

## 1. Contexte & Problématique

Suite aux réussites des Phases 18 et 19 sur la vitrine principale, deux questions majeures ont émergé lors de l'audit en lecture seule :

1. **Warning Console Récurrent sur `home-reviews` :**
   ```
   log.ts:86 [data-provider] ressource « home-reviews » : réponse acceptée par le réseau mais inexploitable — réponse de type « tableau (0 entrée(s)) » là où le contrat annonce un objet paginé { items, total, page, perPage }.
   ```
   _Cause :_ Asymétrie de contrat entre le contrôleur backend PHP `ControleurContenu::lireHomeReviews` (qui renvoie `{"data":[]}`) et le composant de normalisation frontend `extraireItems` (qui attend `{ items: [...] }`). De plus, `ControleurMaintenance.php` purgeait la section sous forme de chaîne `'[]'`.
2. **Contenus résiduels et sections orphelines sur base de données purgée :**
   _Cause :_ `CategoryCards.tsx` n'avait pas de condition de garde `if (cats.length === 0) return null;` et affichait son titre au-dessus d'une grille vide. De plus, le parachute de secours (`FALLBACK_SITE_CONTENT`) injecte légitimement les textes éditoriaux par défaut de la boutique pour éviter l'écran blanc.
3. **Angles noirs multilingues résiduels :**
   Présence de chaînes codées en dur en français dans l'Espace Mon Compte (`Account.tsx`), le Suivi Public de Commande (`TrackOrder.tsx`), l'inscription (`Auth.tsx`), et les retours d'upload médias dans l'administration (`Settings.tsx`, `SettingsVisualEditors.tsx`).
4. **Erreur Système & Portée de Variable sur `api/recup.php` (Sous-Phases 20.3 & 20.4) :**
   - L'appel `$db->executer(...)` a été corrigé en `$db->run(...)` avec un alias pérenne `Db::executer` dans `KaTech\Db`.
   - Initialisation préventive de `$admin = null;` dans le scope racine et garde `is_array($admin)` pour neutraliser tout warning runtime ou Intelephense en cas de panne de base amont.

---

## 2. Objectifs & Résultats Attendus

- [x] **0 warning console** au rechargement de l'accueil, y compris en base purgée.
- [x] **Contrat `home-reviews` blindé** côté backend PHP (`{ items, total, page, perPage }`) et côté frontend (`extraireItems` tolérant directement `Array.isArray`).
- [x] **Vitrine épurée et intelligente sur base vide** : `CategoryCards.tsx` s'efface silencieusement quand il n'y a aucune catégorie, sans laisser de titre orphelin.
- [x] **100% de couverture i18n sur les parcours clients** :
  - `Account.tsx` (modale de commande, récapitulatif, boutons, adresses).
  - `TrackOrder.tsx` (étapes de transport, mode de livraison, annulation, message marchand).
  - `Auth.tsx` (règle de validation du nom complet).
- [x] **Toasts d'administration 100% localisés** : upload médias logo/favicon et retours JSON.
- [x] **Parité 1:1:1 stricte vérifiée** par `bun run verifier-i18n` sur FR, EN, AR.
- [x] **Sous-Phase 20.1** : Correction des diagnostics Intelephense sur `ControleurMaintenance.php`.
- [x] **Sous-Phase 20.2** : Script dédié `bun run paqueter:data` pour archiver `katech-data` séparément.
- [x] **Sous-Phase 20.3** : Sécurisation de `api/recup.php` avec `$db->run(...)` et ajout de l'alias de tolérance `Db::executer` dans `KaTech\Db`.
- [x] **Sous-Phase 20.4** : Initialisation explicite de `$admin = null;` et clause `is_array($admin)` dans `api/recup.php`.
- [x] **Régénération des packages de distribution** : `katech-site.zip` et `katech-data.zip` synchronisés.
- [x] **CI inviolable au vert** : `bun run lint && bunx tsc --noEmit && bun run build`.

---

## 3. Découpage des Étapes

### Étape 20.A : Résolution Contrat API & Résilience `home-reviews` (Livrée ✅)

### Étape 20.B : Vitrine Épurée sur Base Vide (Livrée ✅)

### Étape 20.C : Localisation Intégrale Espace Client (`Account.tsx`) (Livrée ✅)

### Étape 20.D : Localisation Intégrale Suivi Public (`TrackOrder.tsx`) (Livrée ✅)

### Étape 20.E : Assainissement Toasts Admin, Auth & Dictionnaire Arabe (Livrée ✅)

### Sous-Phase 20.1 : Correction Diagnostics Intelephense / PHP Language Server (Livrée ✅)

### Sous-Phase 20.2 : Outillage Packaging Séparé `katech-data` (Livrée ✅)

### Sous-Phase 20.3 : Sécurisation Script d'Urgence `recup.php` & Compatibilité `KaTech\Db` (Livrée ✅)

### Sous-Phase 20.4 : Portée de Variable & Typage Inféré `$admin` dans `recup.php` (Livrée ✅)

1. **Édition de [`api/recup.php`](file:///c:/xampp/htdocs/ka-tech/api/recup.php) :**
   - Déclaration de `$admin = null;` ligne 30 aux côtés de `$erreur` et `$succes`.
   - Utilisation de `<?php elseif (is_array($admin)): ?>` ligne 196.
2. **Vérification Syntaxe PHP :** `php -l api/recup.php`.
3. **Recompilation & Packaging :** `bun run build`.

---

## 4. Matrice de Recette & Validation

| Test / Scénario                          | Résultat Attendu                                                                 |
| :--------------------------------------- | :------------------------------------------------------------------------------- |
| **Lint PHP `recup.php`**                 | `No syntax errors detected`.                                                     |
| **Diagnostics Intelephense**             | 0 diagnostic `Possible undefined variable $admin`.                               |
| **Exécution `recup.php` en POST**        | Met à jour le mot de passe sans lever `Call to undefined method Db::executer()`. |
| **Génération Package `katech-site.zip`** | Inclut `api/recup.php` avec toutes les sécurisations.                            |
| **Vérification CI Globale**              | `tsc --noEmit` = 0 erreur, `build` = succès.                                     |
