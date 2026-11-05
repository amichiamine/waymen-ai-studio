# PLAN D'IMPLÉMENTATION — PHASE 17

## Raccordement Serveur de la Réinitialisation et du Vidage des Données (`/admin/reset`)

**Projet :** KA Tech Hub  
**Date :** 05/11/2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire :** ArchiSys3.0 (Directeur de Projet & Architecte Décideur)  
**Statut :** Soumis à validation

---

### 1. Objectifs & Enjeux

1. **Raccordement Serveur Effectif de `/admin/reset` :**  
   Permettre à la page backstage `/admin/reset` d'agir réellement sur la base de données SQL serveur (SQLite/MySQL/PostgreSQL) en mode HTTP, au lieu de se cantonner au store local `localStorage` (`admin-store.tsx`).
2. **Création de la Route Sécurisée `POST /api/v1/maintenance/reset` :**
   - Protégée strictement par la garde de niveau 2 réservée exclusivement au rôle `owner` (`Garde::protege('resetData')`).
   - Prise en charge des actions granulaires par table/ressource (`clear` ou `reset` par ligne) et des actions globales (« Tout vider » / « Tout réinitialiser »).
3. **Garde-fous de Sécurité & Intégrité Système :**
   - **Protection vitale du propriétaire :** Ne jamais supprimer l'administrateur propriétaire connecté lors d'un vidage des utilisateurs (`users`).
   - **Préservation des structures vitales :** Lors du vidage des réglages (`siteSettings`, `shippingSettings`), réinitialiser sur des charges utiles par défaut sûres pour éviter toute erreur 500 ultérieure.
   - **Intégrité relationnelle :** Gestion propre des clés étrangères et dépendances en cascade (`order_items` avec `orders`, `stock_movements` avec `products`, etc.).
   - **Réinitialisation usine (« Reset ») :** Réinjection propre des données d'origine depuis `api/tools/donnees-front.json` via `ImporteurDonneesFront`.
4. **Réactivité Front & Invalidation de Cache TanStack Query :**  
   Dès qu'une suppression ou réinitialisation serveur réussit, invalider automatiquement les requêtes TanStack Query pour que les compteurs et tableaux de bord reflètent instantanément l'état réel de la base sans rechargement manuel.

---

### 2. Étapes Chirurgicales d'Implémentation

#### Étape 1 : Création de la méthode Backend `ControleurMaintenance::reinitialiser()`

- **Fichier :** `api/src/Controllers/ControleurMaintenance.php`
- **Actions :**
  - Implémenter la méthode publique `reinitialiser(Requete $r): Reponse` :
    - Exige la permission `owner` (`Garde::exiger('owner')`).
    - Valide le corps JSON : `{ action: 'clear' | 'reset', target: string }`.
    - Exécute le traitement dans une transaction SQL sécurisée (`$this->db->transaction(...)`).
    - **Algorithme d'effacement (`clear`) :**
      - Pour une table standard (`products`, `categories`, `brands`, `coupons`, `customers`, etc.) : `DELETE FROM <table>`.
      - Pour `orders` : suppression conjointe d'`order_items` puis `orders`.
      - Pour `users` : `DELETE FROM users WHERE role != 'owner'` (garde-fou absolu).
      - Pour les listes contenues dans `site_content` (`homeReviews`, `tickerMessages`, `marqueeBrands`, `aboutValues`, `builderSteps`) : `UPDATE site_content SET payload = '[]' WHERE key = :key`.
      - Pour `siteSettings` et `shippingSettings` : réinitialisation sur `{}` minimal valide.
      - Pour `all` : vidage de l'ensemble des tables métier tout en préservant le propriétaire et les paramètres de base.
    - **Algorithme de réinitialisation usine (`reset`) :**
      - Si `target === 'all'` ou catalogue : réinjection des données d'origine via `ImporteurDonneesFront`.
      - Si commandes/avis/messages : vidage propre.
    - Consignation de l'action dans `audit_logs` (`Journal::consigner`).
    - Retourne un rapport JSON clair avec les nombres de lignes affectées : `{ ok: true, message: "...", counts: { ... } }`.

#### Étape 2 : Câblage de la Route API dans `api/routes.php`

- **Fichier :** `api/routes.php`
- **Action :**  
  Enregistrer la nouvelle route d'écriture sous la garde `resetData` :
  ```php
  $routeur->post('/maintenance/reset', Garde::protege('resetData', [$maintenance, 'reinitialiser']));
  ```

#### Étape 3 : Couche Client Data Provider & Intégration dans `Reset.tsx`

- **Fichiers :**
  - `src/data-provider/maintenance.ts`
  - `src/pages/admin/Reset.tsx`
- **Actions :**
  - Dans `src/data-provider/maintenance.ts` : ajouter la fonction exportée `reinitialiserServeur(action: "clear" | "reset", target: string)`.
  - Dans `src/pages/admin/Reset.tsx` :
    - Dans la fonction `exec()` :
      - Si mode HTTP (`isHttpData()`) : appeler `reinitialiserServeur(pending.kind, pending.key)`.
      - Répercuter également le changement sur `admin-store` pour maintenir la parité du cache local.
      - Invoquer `queryClient.invalidateQueries()` pour recharger immédiatement les compteurs et listes (`products`, `categories`, `orders`, etc.).
      - Notifier l'utilisateur via `toast.success()`.
    - Gestion des erreurs serveur via `toApiError` et `toast.error()`.

---

### 3. Matrice de Recette & Validation

| Test / Scénario                                   | Procédure                                                                    | Critère de Succès                                                                                    |
| :------------------------------------------------ | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Sécurité Rôle**                                 | Appel POST `/api/v1/maintenance/reset` sans authentification ou rôle < owner | HTTP 401 / 403 Forbidden                                                                             |
| **Vidage Ciblé Produit**                          | Clic sur "Vider" pour la ligne Produits dans `/admin/reset`                  | Table `products` vidée en base SQLite, compteur à 0, vitrine affiche 0 produit                       |
| **Protection Owner**                              | Clic sur "Vider" pour la ligne Utilisateurs                                  | Seuls les comptes non-owner sont supprimés, session admin intacte                                    |
| **Vidage Global ("Tout vider")**                  | Clic sur "Tout vider"                                                        | Toutes les données transactionnelles et catalogue passent à 0, site reste sain (0 erreur 500)        |
| **Réinitialisation Usine ("Tout réinitialiser")** | Clic sur "Tout réinitialiser"                                                | Rechargement automatique des produits et catégories depuis `donnees-front.json`, compteurs restaurés |
| **Qualité & CI**                                  | `php -l` + `bun run lint && bunx tsc --noEmit && bun run build`              | 0 erreur, compilation et packaging conformes                                                         |

---

### 4. Traçabilité & Packaging

- Mise à jour du journal officiel `.agents/tracabilites.md` (Phase 17).
- Re-packaging des archives prêtes au déploiement (`katech-site.zip`).
