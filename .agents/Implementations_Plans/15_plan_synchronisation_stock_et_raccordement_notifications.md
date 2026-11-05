# PLAN D'IMPLÉMENTATION N°15 : SYNCHRONISATION ATOMIQUE DU STOCK & RACCORDEMENT DES NOTIFICATIONS E-MAIL

**Projet :** KA Tech Hub  
**Date :** 05/11/2026  
**Auteur :** AImi (Tech Lead, Architecte & Consultant R&D)  
**Destinataire & Validateur :** ArchiSys3.0 (Directeur de Projet & Architecte en Chef)  
**Statut :** 📋 Soumis pour validation (RequestFeedback: true)

---

## 1. Contexte & Problématique Résolue

L'audit approfondi de l'application a révélé deux dysfonctionnements silencieux critiques du même ordre que l'anomalie du mode maintenance :

1. **Désynchronisation entre la quantité (`stock_qty`) et le statut catégoriel (`stock`) :**  
   Lorsqu'un administrateur réapprovisionne un produit en rupture depuis `/admin/inventory` (ex: +20 unités), `ControleurProduits.php::mettreAJourStock()` incrémente `stock_qty` mais **ne recalcule jamais** la colonne `stock`. Le produit reste stocké en `'out'` en base de données. Conséquence terrain directe : le catalogue public et la recherche (`Search.tsx`) continuent d'afficher le produit comme « En rupture de stock » et le filtre « En stock uniquement » le masque totalement aux acheteurs.
2. **Déconnexion du commutateur "Notifications par e-mail" (`emailNotifications`) :**  
   Dans `/admin/settings`, le switch permettant d'activer/désactiver les e-mails de commande commerçant est sauvegardé dans SQLite mais n'est **jamais lu** par `ControleurCommandes.php`. Les e-mails partent ou échouent sans tenir compte de la volonté de l'administrateur.
3. **Inertie des seuils globaux de stock :**  
   La modification des seuils de stock bas et rupture dans les réglages globaux ne recalcule pas rétroactivement le statut `stock` des produits existants.

---

## 2. Objectifs d'Architecture

- **Cohérence Atomique 1:1 :** Garantir que tout mouvement de stock (qu'il provienne d'une vente client ou d'un ajustement admin) maintienne une cohérence mathématique et immédiate entre `stock_qty` et `stock` (`'in'`, `'low'`, `'out'`).
- **Autorité Effectrice des Réglages :** Assurer que le réglage `emailNotifications` contrôle réellement l'émission des courriels vers le marchand dans l'Outbox.
- **Zéro Régression :** Respect absolu de la signature d'API (`docs/API-CONTRACT.md`), des types TypeScript stricts, et intégrité de la chaîne de build `bun run lint && bunx tsc --noEmit && bun run build`.

---

## 3. Découpage des Chantiers Techniques

### Phase 15.1 : Synchronisation Atomique du Stock dans `ControleurProduits.php`

- [ ] Dans `api/src/Controllers/ControleurProduits.php::mettreAJourStock()` :
  - Extraire les seuils dynamiques `lowStockThreshold` (défaut 5) et `outOfStockThreshold` (défaut 0) depuis les réglages `siteSettings` enregistrés en base.
  - Modifier l'instruction `UPDATE` atomique pour actualiser simultanément `stock_qty` ET la colonne `stock` :
    ```sql
    UPDATE products
       SET stock_qty = stock_qty + :delta1,
           stock = CASE
               WHEN (stock_qty + :delta2) <= :seuilRupture THEN 'out'
               WHEN (stock_qty + :delta2) <= :seuilBas THEN 'low'
               ELSE 'in'
           END
     WHERE id = :id
       AND stock_qty + :delta3 >= 0
    ```
  - Dans `creer()` et `modifier()` de `ControleurProduits.php`, synchroniser le statut calculé si `stockQty` est ajusté directement.

### Phase 15.2 : Recalcul en Masse lors du Changement des Seuils Globaux

- [ ] Dans le contrôleur de gestion du contenu / réglages (`ControleurContenu.php` ou équivalent) :
  - Détecter si un patch sur les réglages de site modifie `lowStockThreshold` ou `outOfStockThreshold`.
  - Exécuter une requête SQL d'alignement globale sur l'ensemble de la table `products` :
    ```sql
    UPDATE products
       SET stock = CASE
           WHEN stock_qty <= :seuilRupture THEN 'out'
           WHEN stock_qty <= :seuilBas THEN 'low'
           ELSE 'in'
       END
     WHERE stock_qty IS NOT NULL
    ```

### Phase 15.3 : Raccordement Effectif du Switch `emailNotifications`

- [ ] Dans `api/src/Controllers/ControleurCommandes.php::emettreEmailCommande()` :
  - Lire la configuration du site `siteSettings` depuis la table `settings`.
  - Vérifier la propriété `emailNotifications` :
    - Si `emailNotifications === false`, bypasser l'envoi de l'e-mail commerçant (sans générer d'erreur, avec consigne claire dans le journal).
    - Si `emailNotifications === true` (ou par défaut actif), procéder à l'envoi vers `NOTIFY_OWNER_EMAIL` ou l'e-mail de contact du site.
- [ ] Dans `src/pages/admin/Settings.tsx` :
  - Ajouter un libellé d'aide contextuel sous le toggle `emailNotifications` informant l'administrateur de l'état du service d'expédition.

---

## 4. Matrice de Recette & Vérification

| Test                                                 | Procédure                                                                                        | Résultat Attendu                                                                           |
| :--------------------------------------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **T1 : Réapprovisionnement d'un produit en rupture** | Mettre un produit à 0 (rupture `out`), puis exécuter un réassort de +10 dans `/admin/inventory`. | `stock_qty` passe à 10 et `stock` passe immédiatement à `'in'` en BDD et sur le catalogue. |
| **T2 : Filtrage Vitrine "En Stock Uniquement"**      | Consulter `/search?stock=1` après réapprovisionnement.                                           | Le produit réapprovisionné s'affiche instantanément parmi les résultats disponibles.       |
| **T3 : Désactivation du toggle e-mail**              | Désactiver `emailNotifications` dans `/admin/settings` et passer une commande.                   | L'acheteur reçoit son e-mail (si SMTP actif), mais aucun e-mail commerçant n'est émis.     |
| **T4 : Build & Intégrité Globale**                   | Exécution de `bun run lint && bunx tsc --noEmit && bun run build`.                               | Zéro erreur TypeScript, zéro warning ESLint, bundle de production statique propre.         |

---

## 5. Livrables Attendus

1. `api/src/Controllers/ControleurProduits.php` mis à jour avec logique atomique bi-colonne.
2. `api/src/Controllers/ControleurCommandes.php` branché sur `siteSettings.emailNotifications`.
3. `api/src/Controllers/ControleurContenu.php` doté du recalcul rétroactif des seuils.
4. `src/pages/admin/Settings.tsx` clarifié avec indicateurs d'aide.
5. Copie miroir dans `.agents/Implementations_Plans/15_plan_synchronisation_stock_et_raccordement_notifications.md`.
6. Consignation officielle dans `.agents/tracabilites.md`.
