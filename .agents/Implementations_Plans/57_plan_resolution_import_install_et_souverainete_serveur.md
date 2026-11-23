# Plan d'Implémentation Phase 57 — Résolution Définitive de l'Import Catalogue (Schémas SQL) & Éradication de la Synchronisation Inversée Client ➔ Serveur

- **Date :** 23/11/2026
- **Directeur de Projet & Architecte Décideur :** ArchiSys3.0
- **Tech Lead, Architecte & Consultant R&D :** AImi
- **Statut :** 📋 **En Attente de Validation Formelle**

---

## 1. Contexte & Problématique

Lors de la réinstallation depuis zéro via `api/install.php` sur le serveur `waymen.stacgate.com`, deux anomalies majeures ont été identifiées :

1. **Échec d'Import du Catalogue à l'Installation :**  
   Le schéma initial d'usine créait la table `brands` sans colonne `logo`. Lorsque l'assistant `install.php` exécutait immédiatement l'import du catalogue enrichi, SQLite rejetait l'insertion (`SQLSTATE[HY000]: General error: 1 table brands has no column named logo`), laissant la boutique installée avec un catalogue vide.
2. **Synchronisation Inversée Parasite (Client ➔ Serveur) :**  
   Lorsqu'une base serveur est neuve ou purgée, le `localStorage` du navigateur administrateur réinjectait ses anciennes données locales en fallback et pouvait écraser la base serveur lors de la visite des réglages, créant l'illusion que le serveur conservait les anciennes données malgré la suppression des fichiers.

---

## 2. Découpage en Sous-Phases & Actions Chirurgicales

### Sous-Phase 57.1 : Intégration Native de la Colonne `logo` dans les 3 Schémas SQL

- Ajout de la colonne `logo TEXT NULL` dans la définition de `CREATE TABLE brands` dans :
  - [`api/schema/schema.sqlite.sql`](file:///c:/xampp/htdocs/waymen/api/schema/schema.sqlite.sql)
  - [`api/schema/schema.mysql.sql`](file:///c:/xampp/htdocs/waymen/api/schema/schema.mysql.sql)
  - [`api/schema/schema.pgsql.sql`](file:///c:/xampp/htdocs/waymen/api/schema/schema.pgsql.sql)
- Exécution du script de conformité [`api/tools/verifier-parite-schema.php`](file:///c:/xampp/htdocs/waymen/api/tools/verifier-parite-schema.php) pour garantir la stricte parité 1:1 entre les 3 moteurs.
- Vérification dans le banc d'essai d'installation sur base SQLite vierge : confirmation du succès de `ImporteurDonneesFront::importer()` à 100%.

### Sous-Phase 57.2 : Éradication de la Synchronisation Inversée Parasite (Souveraineté Serveur 100%)

- **Isolation du mode HTTP :**  
  Dans [`src/data-provider/site-settings.ts`](file:///c:/xampp/htdocs/waymen/src/data-provider/site-settings.ts), en mode HTTP (`isHttpData()`), le fallback `localStorage` ne doit jamais être utilisé pour contaminer une mutation serveur. Si la base serveur est neuve, les réglages d'usine prévalent.
- **Purger le cache résiduel :**  
  Nettoyage automatique des clés `katech_site_settings` et `katech_site_settings_name` lors de la réinitialisation ou si l'API signale une base réinitialisée.
- **Bouton d'administration dédié :**  
  Ajout d'un bouton d'action dans [`src/pages/admin/Developpeur.tsx`](file:///c:/xampp/htdocs/waymen/src/pages/admin/Developpeur.tsx) : _« Purger le cache local du navigateur & Forcer la synchronisation serveur »_ pour permettre à l'administrateur de repartir d'un état client vierge sans devoir ouvrir la console F12.

### Sous-Phase 57.3 : Validation CI Intégrale & Nouveaux Paquets de Déploiement

- Exécution de la suite complète :
  ```powershell
  bun run verifier-i18n
  bunx tsc --noEmit
  bun run format
  bun run lint
  bun run build
  bun run paqueter:data
  ```
- Mise à jour du journal [`.agents/tracabilites.md`](file:///c:/xampp/htdocs/waymen/.agents/tracabilites.md).

---

## 3. Matrice de Recette & Critères d'Acceptation

- [ ] `php api/tools/verifier-parite-schema.php` confirme la parité stricte avec la colonne `logo` intégrée.
- [ ] Un test d'installation sur base vierge en mémoire importe avec succès les 33 produits, 23 marques et 9 catégories sans avertissement.
- [ ] Le `localStorage` ne peut plus écraser la base de données serveur.
- [ ] Le bouton de purge du cache est disponible dans `/admin/developer`.
- [ ] Les archives `katech-site.zip` et `katech-data.zip` sont régénérées et prêtes pour mise en ligne.
