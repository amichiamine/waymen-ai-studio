# Plan 21 — Persistance Souveraine Base de Données, Bootstrap Serveur 100% Plug & Play & Unification des Archives Horodatées (Sous-Phase 21.1)

**Projet :** KA Tech (`amichiamine/ka-tech`)  
**Branche :** `main`  
**Directeur de Projet & Architecte Décideur :** ArchiSys3.0  
**Tech Lead, Architecte & Consultant R&D :** AImi  
**Mode :** 📋 Plan d'Implémentation (`mode plan`)  
**Date :** 6 Novembre 2026

---

## 1. Contexte & Problématique

1. **Persistance Souveraine en Base de Données (Phase 21 principale - Livrée ✅) :**
   - Résolution multi-chemins dynamique dans `public/index.php` relative à `__DIR__` (100% Plug & Play).
   - Éradication du verrouillage prématuré `writeCache` dans `src/data-provider/site-settings.ts`.
   - Confinement de `admin-store` en mode HTTP.
2. **Clarification des Livrables de Déploiement (Sous-Phase 21.1) :**
   - La génération simultanée d'archives horodatées (`katech-site-JJMMYYYY-HHMM.zip`) ET d'alias sans date (`katech-site.zip`, `katech-data.zip`) générait un doublon inutile et prêtait à confusion.
   - **Directive explicite d'ArchiSys3.0 :** Conserver **exclusivement les versions horodatées uniques**, témoins fidèles de chaque build, et supprimer la duplication vers les alias non datés.

---

## 2. Objectifs de la Sous-Phase 21.1

- [ ] **Archives Uniques et Traçables :**  
      Chaque exécution de build génère **un seul et unique zip horodaté** pour le site (`katech-site-JJMMAAAA-HHMM.zip`) et un seul pour les données (`katech-data-JJMMAAAA-HHMM.zip`).
- [ ] **Suppression des Clones Alias :**  
      Élimination de la copie redondante `katech-site.zip` et `katech-data.zip` dans [`scripts/paqueter.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter.ts) et [`scripts/paqueter-data.ts`](file:///c:/xampp/htdocs/ka-tech/scripts/paqueter-data.ts).
- [ ] **Nettoyage de la Racine du Projet :**  
      Suppression des doublons `katech-site.zip` et `katech-data.zip` résiduels pour une clarté visuelle totale.
- [ ] **Mise à jour de la documentation et des logs :**  
      Les messages de fin de build indiquent directement le nom précis de l'archive horodatée à déployer.

---

## 3. Découpage Chirurgical des Actions

### Étape 21.1.A : Modification de `scripts/paqueter.ts`

1. Supprimer la constante `ZIP_LATEST = path.join(ROOT, "katech-site.zip")` et son appel `fs.copyFileSync(zipHorodate, ZIP_LATEST)`.
2. Mettre à jour les logs de sortie pour afficher uniquement l'archive horodatée unique.

### Étape 21.1.B : Modification de `scripts/paqueter-data.ts`

1. Supprimer la constante `ZIP_LATEST = path.join(ROOT, "katech-data.zip")` et son appel `fs.copyFileSync(zipHorodate, ZIP_LATEST)`.
2. Mettre à jour les consignes de déploiement affichées en console.

### Étape 21.1.C : Nettoyage & Exécution Réelle

1. Supprimer `katech-site.zip` et `katech-data.zip` de la racine.
2. Lancer `bun run build && bun run paqueter:data` pour vérifier la production exclusive des 2 archives horodatées.
3. Vérification CI : `bunx tsc --noEmit && bun run lint`.
4. Traçabilité dans `.agents/tracabilites.md` et commit Git versionné.

---

## 4. Matrice de Recette & Validation

| Scénario de Test                      | Comportement Attendu                                                                              |
| :------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **Exécution `bun run build`**         | Produit un seul zip horodaté `katech-site-JJMMAAAA-HHMM.zip`. Aucun `katech-site.zip` n'est créé. |
| **Exécution `bun run paqueter:data`** | Produit un seul zip horodaté `katech-data-JJMMAAAA-HHMM.zip`. Aucun `katech-data.zip` n'est créé. |
| **Explorateur de Fichiers Racine**    | Aucune ambiguïté : chaque archive correspond à un jalon daté unique.                              |
