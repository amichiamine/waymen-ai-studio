# Plan 20 — Parachèvement Intégral : Contrat API home-reviews, Vitrine sur Base Vide, Parcours Clients, Toasts Admin 100% i18n & Sécurisation Script d'Urgence (Sous-Phase 20.3)

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
   *Cause :* Asymétrie de contrat entre le contrôleur backend PHP `ControleurContenu::lireHomeReviews` (qui renvoie `{"data":[]}`) et le composant de normalisation frontend `extraireItems` (qui attend `{ items: [...] }`). De plus, `ControleurMaintenance.php` purgeait la section sous forme de chaîne `'[]'`.
2. **Contenus résiduels et sections orphelines sur base de données purgée :**
   *Cause :* `CategoryCards.tsx` n'avait pas de condition de garde `if (cats.length === 0) return null;` et affichait son titre au-dessus d'une grille vide. De plus, le parachute de secours (`FALLBACK_SITE_CONTENT`) injecte légitimement les textes éditoriaux par défaut de la boutique pour éviter l'écran blanc.
3. **Angles noirs multilingues résiduels :**
   Présence de chaînes codées en dur en français dans l'Espace Mon Compte (`Account.tsx`), le Suivi Public de Commande (`TrackOrder.tsx`), l'inscription (`Auth.tsx`), et les retours d'upload médias dans l'administration (`Settings.tsx`, `SettingsVisualEditors.tsx`).
4. **Erreur Système sur Script d'Urgence `api/recup.php` (Sous-Phase 20.3) :**
   Lors de la soumission de réinitialisation de mot de passe, l'appel `$db->executer(...)` échouait avec `Call to undefined method KaTech\Db::executer()`.

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
- [ ] **Sous-Phase 20.3** : Sécurisation de `api/recup.php` avec `$db->run(...)` et ajout de l'alias de tolérance `Db::executer` dans `KaTech\Db`.
- [ ] **Régénération des packages de distribution** : `katech-site.zip` et `katech-data.zip` synchronisés.
- [ ] **CI inviolable au vert** : `bun run lint && bunx tsc --noEmit && bun run build`.

---

## 3. Découpage Chirurgical des Étapes

### Étape 20.A : Résolution Contrat API & Résilience `home-reviews` (Livrée ✅)
### Étape 20.B : Vitrine Épurée sur Base Vide (Livrée ✅)
### Étape 20.C : Localisation Intégrale Espace Client (`Account.tsx`) (Livrée ✅)
### Étape 20.D : Localisation Intégrale Suivi Public (`TrackOrder.tsx`) (Livrée ✅)
### Étape 20.E : Assainissement Toasts Admin, Auth & Dictionnaire Arabe (Livrée ✅)
### Sous-Phase 20.1 : Correction Diagnostics Intelephense / PHP Language Server (Livrée ✅)
### Sous-Phase 20.2 : Outillage Packaging Séparé `katech-data` (Livrée ✅)

### Sous-Phase 20.3 : Sécurisation Script d'Urgence `recup.php` & Compatibilité `KaTech\Db`
1. **Édition de [`api/recup.php`](file:///c:/xampp/htdocs/ka-tech/api/recup.php) :**
   - Remplacement de `$db->executer(...)` par `$db->run(...)` à la ligne 68.
2. **Édition de [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) :**
   - Ajout de l'alias explicite :
     ```php
     /**
      * Alias de compatibilité francophone pour `run()`.
      *
      * @param array<string|int,mixed> $params
      */
     public function executer(string $sql, array $params = []): PDOStatement
     {
         return $this->run($sql, $params);
     }
     ```
3. **Validation Syntaxe PHP :**
   - `php -l api/recup.php`
   - `php -l api/src/Db.php`
4. **Recompilation & Packaging :**
   - `bun run build` (met à jour `dist/api/` et génère `katech-site-*.zip`).
   - `bun run paqueter:data` (garantit les zips `katech-data` à jour).
5. **Traçabilité & Git :**
   - Journalisation dans `.agents/tracabilites.md`.
   - Commit git et push origin main.

---

## 4. Matrice de Recette & Validation

| Test / Scénario | Résultat Attendu |
| :--- | :--- |
| **Lint PHP `recup.php` & `Db.php`** | `No syntax errors detected`. |
| **Exécution `recup.php` en POST** | Met à jour le mot de passe sans lever `Call to undefined method Db::executer()`. |
| **Génération Package `katech-site.zip`** | Inclut `api/recup.php` corrigé et `api/src/Db.php` avec l'alias. |
| **Vérification CI Globale** | `tsc --noEmit` = 0 erreur, `build` = succès. |
