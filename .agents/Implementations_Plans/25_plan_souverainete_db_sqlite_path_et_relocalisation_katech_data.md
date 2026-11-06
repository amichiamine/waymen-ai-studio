# Plan d'Implémentation 25 — Restauration de la Souveraineté de DB_SQLITE_PATH & Relocalisation Sécurisée dans katech-data/

## 1. Contexte & Diagnostic de Cause Racine

Lors du déploiement de la boutique sur Hostinger, le fichier `api/.env` a été correctement configuré avec :

```ini
DB_DRIVER=sqlite
DB_SQLITE_PATH=/home/zzdwczcx/katech-data/katech.sqlite
BACKUP_DIR=/home/zzdwczcx/katech-data/backups
```

Pourtant, les investigations ont révélé que le site utilisait en réalité la base située dans :

```
waymen.stacgate.com/api/var/katech.sqlite
```

### Cause Racine Identifiée dans [`api/src/Db.php`](file:///c:/xampp/htdocs/ka-tech/api/src/Db.php) (lignes 73-86) :

```php
if ($pilote === self::PILOTE_SQLITE) {
    $chemin = (string) Env::get('DB_SQLITE_PATH', '');
    if ($chemin === '' || !is_file($chemin)) { // ⚠️ ANGLE NOIR CRITIQUE
        // ... déroutement vers api/var/katech.sqlite
    }
}
```

1. Lors de l'installation, le fichier `katech.sqlite` n'existe pas encore dans le dossier `/home/zzdwczcx/katech-data/`.
2. Le test `!is_file($chemin)` étant vrai, `Db::depuisEnv()` a complètement ignoré la valeur configurée dans `api/.env` et a dérivé la création de la base vers `api/var/katech.sqlite`.
3. Comme le fichier `/home/zzdwczcx/katech-data/katech.sqlite` n'était jamais créé, chaque future requête tombait à nouveau dans ce piège, condamnant l'application à tourner indéfiniment sur `api/var/`.

---

## 2. Objectifs du Plan 25

1. **Restauration de la Souveraineté de `DB_SQLITE_PATH` :**
   - Éliminer le test `|| !is_file($chemin)` dans `Db::depuisEnv()`. Si `DB_SQLITE_PATH` est configuré dans `.env`, il fait foi absolue.
2. **Auto-Relocalisation Transparente Sans Perte de Données :**
   - Si la cible `DB_SQLITE_PATH` (ex: `/home/.../katech-data/katech.sqlite`) n'existe pas encore sur le disque, mais qu'une base non vide existe dans l'ancien emplacement `api/var/katech.sqlite`, le code procède à la copie de migration initiale automatique vers `katech-data/` avant ouverture.
   - Les données créées sur le serveur (comptes, réglages, catalogue) sont ainsi automatiquement préservées et transférées vers leur emplacement souverain et sécurisé hors de `public_html`.
3. **Mise à Jour de l'Assistance & Diagnostics :**
   - Garantir que `Developpeur.tsx` et `ControleurMaintenance.php` rapportent fidèlement le chemin actif `katech-data/katech.sqlite`.
4. **Validation CI & Build de Production :**
   - `bun run format`, `bun run verifier-i18n`, `bun run lint`, `bunx tsc --noEmit`.
   - `bun run build; bun run paqueter:data` avec conservation stricte de toutes les archives ZIP horodatées cumulatives.

---

## 3. Découpage des Étapes Chirurgicales

### Étape 25.A : Assainissement de `api/src/Db.php`

- Dans `Db::depuisEnv()`, réserver la recherche de repli (dossier dev local ou `api/var/`) **exclusivement** au cas où `DB_SQLITE_PATH` est vide (`$chemin === ''`).
- Ajouter la logique d'auto-migration gracieuse : si `$chemin !== ''`, que `!is_file($chemin)` et qu'un fichier legacy `api/var/katech.sqlite` valide existe, initialiser le dossier cible et copier la base existante vers `$chemin`.

### Étape 25.B : Sécurisation du Dossier Cible dans `connecterSqlite()`

- Confirmer que `connecterSqlite()` crée bien le dossier parent (`0775`) s'il n'existe pas et vérifie les droits d'écriture sans altérer le flux PDO.

### Étape 25.C : Pipeline de Vérité & Nouvelles Archives Horodatées

- Exécuter la suite complète :
  - `bun run format`
  - `bun run verifier-i18n`
  - `bun run lint`
  - `bunx tsc --noEmit`
  - `bun run build; bun run paqueter:data`
- Vérifier l'accumulation des archives `.zip` sans suppression des versions antérieures (`1401`, `1444`, `1518`).

### Étape 25.D : Traçabilité & Instructions de Déploiement Hostinger

- Consigner la Phase 25 dans `.agents/tracabilites.md`.
- Fournir à ArchiSys3.0 la démarche exacte pour déployer le correctif sur Hostinger et vérifier la transition vers `/home/zzdwczcx/katech-data/katech.sqlite`.

---

## 4. Matrice de Recette & Critères de Succès

| Test                       | Comportement Attendu                                                                                    | Statut    |
| :------------------------- | :------------------------------------------------------------------------------------------------------ | :-------- |
| **Souveraineté `.env`**    | `DB_SQLITE_PATH` dans `.env` est respecté à 100%, sans déroutement vers `api/var/`                      | À valider |
| **Auto-Migration Données** | Si `katech.sqlite` n'est pas encore dans `katech-data/`, copie automatique depuis `api/var/` sans perte | À valider |
| **Pipeline de Vérité**     | `lint`, `tsc`, `build`, `verifier-i18n` à 0 erreur                                                      | À valider |
| **Conservation ZIP**       | Présence cumulative de toutes les archives horodatées antérieures                                       | À valider |
