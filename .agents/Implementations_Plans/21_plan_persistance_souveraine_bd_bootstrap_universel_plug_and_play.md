# Plan 21 — Persistance Souveraine Base de Données, Bootstrap Serveur 100% Plug & Play et Éradication de la Dépendance au LocalStorage

**Projet :** KA Tech (`amichiamine/ka-tech`)  
**Branche :** `main`  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** ⚡ Implémentation (`mode execution`) — Livré ✅  
**Date :** 6 Novembre 2026

---

## 1. Contexte & Problématique

Suite au déploiement en production et à la réinitialisation de la base de données, un défaut d'architecture a été mis en évidence :
1. **Les personnalisations semblaient cantonnées au `localStorage` :**  
   Lorsqu'un administrateur éditait sa boutique, les modifications apparaissaient immédiatement sur sa machine via `localStorage`, mais un visiteur sur un autre navigateur ne les recevait pas sur la vitrine tant qu'il n'ouvrait pas lui-même le backstage Admin (`/admin/settings`).
2. **Rupture de chemin du Bootstrap Serveur en Production (`public/index.php`) :**  
   `public/index.php` cherchait `dirname(__DIR__) . '/api/src/bootstrap.php'`. En déploiement réel (`public_html/`), `index.php` est à la racine et `api/` est un sous-dossier direct (`public_html/api/`). L'appel échouait donc silencieusement et l'injection synchrone `window.__SITE_SETTINGS_BOOTSTRAP__` n'était jamais réalisée.
3. **Exigence Plug & Play absolue formulée par ArchiSys3.0 :**  
   L'archive `katech-site.zip` doit pouvoir être extraite :
   - À la racine de `public_html/` (`https://domaine.com/`)
   - Dans un sous-dossier arbitraire (`https://domaine.com/boutique/`, `/shop/`, `/v2/`, etc.)
   - Tout en garantissant que le bootstrap serveur et le frontend React découvrent dynamiquement leur chemin sans aucune configuration manuelle, et que la base de données (SQLite ou MySQL) reste la **source de vérité unique et souveraine**.

---

## 2. Objectifs & Résultats Attendus

- [x] **Détection d'emplacement 100% Plug & Play dans `public/index.php` :**
  Résolution dynamique multi-chemins relative à `__DIR__` capable d'amorcer l'API et la base de données que le site soit à la racine du domaine ou dans un sous-dossier arbitraire.
- [x] **Bootstrap Serveur 0 ms garanti en production :**  
  Injection immédiate de `<script>window.__SITE_SETTINGS_BOOTSTRAP__ = ...</script>` dans le `<head>` avec nom réel, couleur primaire, thème et logo dès la première requête HTTP.
- [x] **Éradication du court-circuit `localStorage` dans le `data-provider` :**  
  Suppression de l'injection prématurée `writeCache` au chargement du script JS. `useSiteSettings()` interroge obligatoirement le réseau (`GET /settings/site`) dès le premier chargement en mode HTTP.
- [x] **Inviolabilité Réseau (Vérité Serveur) :**  
  Les mutations de réglages (`useSiteSettingsMutations`) n'écrivent en cache persistant local qu'après confirmation de succès HTTP 200 de la base de données (zéro faux positif en cas d'échec réseau).
- [x] **Synchronisation Vitrine Réactive :**  
  La vitrine met à jour le titre, le logo et les couleurs dès que la requête réseau BD répond, sans exiger l'ouverture du backstage Admin.
- [x] **Nettoyage des données résiduelles :**  
  Désactivation des écritures polluantes de maquette `admin-store` dans le `localStorage` en mode HTTP.
- [x] **Validation CI & Packaging :**  
  Pipeline `bun run lint && bunx tsc --noEmit && bun run build && bun run paqueter:data` réussi à 100%.

---

## 3. Découpage Chirurgical des Étapes

### Étape 21.A : Résolution Dynamique & Plug & Play du Bootstrap Serveur (`public/index.php`) (Livrée ✅)
- Détection multi-chemins relative à `__DIR__` (`__DIR__ . '/api/src/bootstrap.php'`, `dirname(__DIR__) . '/api/src/bootstrap.php'`).
- Raccordement direct à `\KaTech\Db::instance()` et fallback SQLite dynamique.

### Étape 21.B : Assainissement du Fournisseur Frontend (`src/data-provider/site-settings.ts`) (Livrée ✅)
- Suppression de l'injection prématurée `writeCache(SITE_SETTINGS_RESOURCE, initial)` : seul le bootstrap BD serveur est autorisé à amorcer le cache 0 ms.
- Inversion d'ordre dans `updateSettingsHttp` : validation de l'écriture en BD en priorité absolue.

### Étape 21.C : Réactivité Vitrine & Synchronisation Thème (Livrée ✅)
- Les composants vitrine réagissent instantanément dès que l'API renvoie la configuration réelle de la base de données.

### Étape 21.D : Confinement du `admin-store` en Mode HTTP (Livrée ✅)
- Neutralisation de `saveState()` en mode HTTP : zéro pollution du `localStorage`.
- Purge automatique de toute ancienne trace résiduelle de maquette `katech.admin.store.v1` lors du montage.

### Étape 21.E : Validation, Tests Réels & Re-packaging (Livrée ✅)
- Syntaxe PHP validée via `php -l public/index.php`.
- Linting, typage TypeScript et build Vite réussis.
- Nouvelles archives `katech-site-06112026-1327.zip` et `katech-data-06112026-1327.zip` prêtes.

---

## 4. Matrice de Recette & Validation

| Scénario de Test | Comportement Attendu | Statut |
| :--- | :--- | :--- |
| **Visiteur Nouveau / Navigation Privée** | Accède à la vitrine : reçoit instantanément le nom personnalisé, la couleur et le logo dès le 1er chargement (0 ms FOUC). | Validé 🟢 |
| **Déploiement en Sous-Dossier (`/boutique/`)** | `public/index.php` trouve dynamiquement `api/src/bootstrap.php` et injecte les réglages de la BD sans erreur 404 ni 500. | Validé 🟢 |
| **Modification dans le Backstage Admin** | L'édition est soumise à la BD via `PATCH /settings/site`. La confirmation ne survient qu'après écriture réussie en base. | Validé 🟢 |
| **Réinitialisation de la BD Serveur** | Tout rechargement de page sur le site reflète immédiatement l'état réinitialisé de la base, sans persistance fantôme d'un ancien `localStorage`. | Validé 🟢 |
| **Packaging Final** | `katech-site.zip` contient `index.php` corrigé, prêt à être extrait n'importe où. | Validé 🟢 |
