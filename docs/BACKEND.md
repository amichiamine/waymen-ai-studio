# BACKEND.md — le socle `api/` et sa recette de réplication

> **Statut** : vague 4.1 livrée (skill S1, pilote). Ce document est la **recette
> à suivre** par toutes les vagues suivantes de la phase 4.
> Contrat de référence : `docs/API-CONTRACT.md`. Chemins de référence :
> `src/api/endpoints.ts`. Ni l'un ni l'autre ne se renégocie.

---

## 1. Décisions déjà prises — ne pas les rouvrir

| Point       | Décision                                                              |
| ----------- | --------------------------------------------------------------------- |
| Runtime     | PHP 8.2+ (validé sur 8.5), extensions `pdo_sqlite` **ou** `pdo_mysql` |
| Dépendances | **Aucune.** Pas de Slim, pas de `vendor/`, autoloader maison          |
| Persistance | PDO, double pilote choisi par `DB_DRIVER`                             |
| Routage     | `api/src/Routeur.php`, ~150 lignes, motifs `:nom`                     |
| Enveloppe   | `api/src/Reponse.php` — seul endroit qui écrit sur la sortie          |
| Erreurs     | `api/src/ApiException.php` — jamais de trace exposée en production    |

**Pourquoi zéro Composer** : l'hébergement n'est pas acquis. Un `vendor/` de
plusieurs mégaoctets à téléverser, dont les dépendances doivent être compatibles
avec la version PHP de l'hébergeur, est précisément la surprise qu'on refuse.
Un `composer.json` d'outillage de développement reste permis — l'API doit
tourner **sans que `vendor/` existe**.

---

## 2. Arborescence

```
api/
├── index.php                    Point d'entrée unique. N'A AUCUNE logique métier.
├── routes.php                   Table de routage — miroir de src/api/endpoints.ts
├── install.php                  Création des tables. Refuse la 2e exécution.
├── .htaccess                    Routage + blocage de .env, .sqlite, src/, schema/…
├── .env.example                 Configuration documentée (à copier en .env)
├── .gitignore                   .env, vendor/, *.sqlite, var/, installed.lock
├── src/
│   ├── bootstrap.php            Autoloader PSR-4 maison + réglages d'erreur
│   ├── Env.php                  Lecture de .env (l'environnement réel prime)
│   ├── Db.php                   ★ Connexion PDO, beginWrite(), upsert(), json()
│   ├── ApiException.php         Erreurs métier → enveloppe { error }
│   ├── Requete.php              Méthode, chemin, query, corps JSON, params
│   ├── Reponse.php              ★ Enveloppe { data } / { error } / 204
│   ├── Routeur.php              Motifs d'URL, 404 vs 405
│   ├── Pagination.php           page / perPage normalisés et bornés
│   └── Controllers/
│       └── ControleurProduits.php   ★ EXEMPLAIRE À RECOPIER
├── schema/
│   ├── schema.sqlite.sql        21 tables — jumeau obligatoire du fichier suivant
│   └── schema.mysql.sql         21 tables
├── tools/
│   ├── verifier-parite-schema.php   Garde-fou CI : échoue si les schémas divergent
│   └── semer-demo.php               Semis de développement (CLI uniquement)
└── var/                         Base SQLite en local. HORS public_html en production.
```

Les fichiers marqués ★ sont ceux qu'on lit avant d'écrire une ligne.

---

## 3. Ajouter une ressource — recette copiable

Exemple complet : les **marques** (`GET /brands`, `GET /brands/:id`).

### 3.1 Le contrôleur

`api/src/Controllers/ControleurMarques.php` :

```php
<?php

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurMarques
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = ['name' => 'name', 'createdAt' => 'created_at'];

    public function __construct(private readonly Db $db)
    {
    }

    public function lister(Requete $r): Reponse
    {
        $where = [];
        $params = [];

        if (($v = $r->query('search')) !== null) {
            $where[] = 'LOWER(name) LIKE :search';
            $params[':search'] = '%' . mb_strtolower($v) . '%';
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p = Pagination::depuis($r);

        // Le total utilise EXACTEMENT le même WHERE que la page.
        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM brands{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'name');
        $sens = Db::sens($r->query('order'), 'ASC');

        $lignes = $this->db->tous(
            "SELECT * FROM brands{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    public function detail(Requete $r): Reponse
    {
        $id = $r->param('id');
        $l = $this->db->un('SELECT * FROM brands WHERE id = :id', [':id' => $id]);

        if ($l === null) {
            throw ApiException::introuvable("Aucune marque ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($l));
    }

    public function creer(Requete $r): Reponse
    {
        $nom = trim((string) $r->corps('name', ''));
        if ($nom === '') {
            throw ApiException::validation('Marque invalide.', ['name' => ['Champ obligatoire.']]);
        }

        $maintenant = gmdate('c');
        $id = (string) $r->corps('id', strtolower(preg_replace('/[^a-z0-9]+/i', '-', $nom) ?? ''));

        $this->db->transaction(fn (Db $d) => $d->upsert('brands', [
            'id' => $id,
            'name' => $nom,
            'description' => $r->corps('description'),
            'country' => $r->corps('country'),
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ], ['id'], ['name', 'description', 'country', 'updated_at']));

        return Reponse::cree($this->enDto(
            (array) $this->db->un('SELECT * FROM brands WHERE id = :id', [':id' => $id])
        ));
    }

    public function supprimer(Requete $r): Reponse
    {
        $n = $this->db->run('DELETE FROM brands WHERE id = :id', [':id' => $r->param('id')])->rowCount();
        if ($n === 0) {
            throw ApiException::introuvable('Marque introuvable.');
        }

        return Reponse::vide(); // 204, sans corps
    }

    /**
     * Ligne SQL → DTO du contrat. snake_case → camelCase, JSON décodé,
     * 0/1 → booléens, champs optionnels OMIS quand ils sont nuls.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = ['id' => (string) $l['id'], 'name' => (string) $l['name']];
        if ($l['description'] !== null) {
            $dto['description'] = (string) $l['description'];
        }
        if ($l['country'] !== null) {
            $dto['country'] = (string) $l['country'];
        }

        return $dto;
    }
}
```

### 3.2 Le branchement

Dans `api/routes.php`, sous la section de la ressource :

```php
use KaTech\Controllers\ControleurMarques;

$marques = new ControleurMarques($db);
$routeur->get('/brands', [$marques, 'lister']);
$routeur->get('/brands/:id', [$marques, 'detail']);
$routeur->post('/brands', [$marques, 'creer']);
$routeur->delete('/brands/:id', [$marques, 'supprimer']);
```

Les chemins se copient **littéralement depuis `src/api/endpoints.ts`**. Une
lettre d'écart casse le frontend déjà écrit.

### 3.3 La vérification

```bash
php -l api/src/Controllers/ControleurMarques.php
php api/tools/verifier-parite-schema.php

# SQLite
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/kt.sqlite php api/install.php
DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/kt.sqlite php -S 127.0.0.1:8099 -t api api/index.php &
curl -s "http://127.0.0.1:8099/brands?perPage=2"

# MySQL — les DEUX pilotes, jamais un seul
rm api/installed.lock
DB_DRIVER=mysql DB_HOST=127.0.0.1 DB_NAME=katech DB_USER=katech DB_PASSWORD=… php api/install.php
```

---

## 4. Règles de dialecte — le tableau qui évite les incidents

`Db` isole la divergence. Le reste du code n'a **aucune raison** de tester
`DB_DRIVER` ; si vous en écrivez un, c'est que la couture manque dans `Db`.

| Point                  | Règle                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Booléens               | `INTEGER` 0/1 en base ; vrais booléens dans le DTO                                                                   |
| Dates                  | Chaînes ISO-8601 UTC (`gmdate('c')`), jamais de type date natif                                                      |
| JSON                   | `Db::json()` à l'écriture, `Db::dejson()` à la lecture. Jamais de `json_encode` nu                                   |
| Montants               | Entiers en DZD, jamais de décimale                                                                                   |
| Upsert                 | `Db::upsert()` uniquement. `ON CONFLICT` / `ON DUPLICATE KEY` n'apparaît nulle part ailleurs                         |
| Transaction d'écriture | `Db::transaction()` (ou `beginWrite()`) : `BEGIN IMMEDIATE` en SQLite, `BEGIN` en MySQL                              |
| Décompte de stock      | `UPDATE … SET stock_qty = stock_qty - :q WHERE id = :id AND stock_qty >= :q2` — identique et atomique des deux côtés |
| Tri venant de l'URL    | `Db::colonneTri()` + `Db::sens()` contre une liste blanche. Jamais interpolé brut                                    |
| Nouvelle table/colonne | **Les DEUX fichiers de `schema/`**, dans le même ordre, puis le vérificateur                                         |

### Quatre pièges vérifiés sur les deux pilotes

1. **Un paramètre nommé ne peut pas apparaître deux fois.** Avec
   `ATTR_EMULATE_PREPARES = false`, MySQL renvoie « Invalid parameter number »
   là où SQLite l'accepte sans broncher. Un placeholder **distinct** par
   occurrence : `:search1`, `:search2`, `:search3`. Ce piège a été rencontré en
   vraie exécution pendant la vague 4.1 — la route marchait en SQLite et
   tombait en MySQL, c'est-à-dire en production.
2. **MySQL refuse un `DEFAULT` littéral sur une colonne `TEXT`.** Les deux
   schémas s'alignent donc en n'en mettant pas ; l'application fournit la
   valeur. Le vérificateur de parité le détecte.
3. **`JSON_CONTAINS` n'existe pas en SQLite, `json_each` n'existe pas en
   MySQL.** Pour filtrer un tableau JSON, utiliser `LIKE '%"valeur"%'` sur la
   forme sérialisée — les guillemets englobants évitent que `work` matche
   `network`.
4. **`PDO::exec()` n'accepte qu'une instruction à la fois en MySQL.**
   `install.php` découpe donc le fichier SQL ; ne pas lui passer un `.sql`
   multi-instructions directement.

### Sécurité — non négociable

- **Requêtes préparées exclusivement.** Aucune valeur n'est concaténée dans du
  SQL. Les seuls fragments interpolés sont des identifiants, validés par
  `Db::identifiant()` (liste blanche `[A-Za-z0-9_]`).
- Les jokers `%` et `_` d'un `LIKE` fourni par l'utilisateur sont échappés.
- Les mots de passe sont hachés en **Argon2id**, jamais stockés en clair.
- En production, aucune trace n'atteint le client : `APP_ENV=production` est le
  défaut, et l'oublier ne fuite rien.

---

## 5. Le vérificateur de parité — il entre dans la CI

```bash
php api/tools/verifier-parite-schema.php
# PARITÉ OK — 21 tables, 172 colonnes, 22 index identiques des deux côtés.
```

Il compare tables, ordre des tables, colonnes, ordre des colonnes, type
canonique, nullabilité, clé primaire, unicité, auto-incrément, valeur par
défaut, et la définition de chaque index. Code de sortie **1** au moindre écart.

Correspondances de types tolérées, et elles seules :

| SQLite            | MySQL                              |
| ----------------- | ---------------------------------- |
| `TEXT`            | `VARCHAR(n)` · `TEXT` · `LONGTEXT` |
| `TEXT /* JSON */` | `JSON`                             |
| `INTEGER`         | `INT` · `BIGINT` · `TINYINT`       |
| `REAL`            | `DOUBLE` · `FLOAT` · `DECIMAL`     |

Le marqueur `/* JSON */` du côté SQLite n'est pas décoratif : il porte
l'intention de type et le vérificateur le lit. Une colonne JSON sans marqueur
est signalée comme une divergence.

---

## 6. Localisation — ce qui est JSON, ce qui ne l'est pas

Voir `docs/LOCALIZED-DATA.md`. Depuis la phase 3, le frontend manipule
`Localized<string> = string | { fr, en?, ar? }`. **Le type nu fait partie de
l'union** : une chaîne simple reste valide et vaut « français ».

**Champs multilingues → colonne JSON** :
`products.name`, `products.spec_line`, `products.specs`,
`blog_posts.title`, `blog_posts.excerpt`, `blog_posts.content`.

**Empreintes historiques → chaîne simple, jamais JSON** :
`order_items.name`, `stock_movements.product_name`, `reviews.product_name`.

La langue y est résolue **à l'écriture**. C'est la décision de la phase 3, et
elle a une raison précise : une facture émise en français ne doit pas changer
rétroactivement parce qu'on a traduit le nom du produit six mois plus tard.
Ne jamais « corriger » ces trois colonnes en JSON.

---

## 7. Déploiement sur mutualisé

### 7.1 Arborescence cible

```
/home/monuser/
├── katech-data/               ← HORS public_html — mode SQLite uniquement
│   └── katech.sqlite
└── public_html/
    ├── index.html, assets/    ← contenu de dist/
    ├── uploads/
    ├── .htaccess              ← repli SPA, exclut /api
    └── api/                   ← contenu de api/, SANS vendor/
```

### 7.2 Procédure

1. `npx vite build` en local, téléverser `dist/` dans `public_html/`.
2. Téléverser `api/` dans `public_html/api/`. **Rien à compiler, rien à
   installer** : il n'y a pas de dépendance.
3. Copier `api/.env.example` en `api/.env` et le renseigner :
   - `DB_DRIVER=mysql` + les 4 identifiants du panneau de l'hébergeur
     (`DB_HOST` vaut souvent `localhost`, pas `127.0.0.1`) ;
   - ou `DB_DRIVER=sqlite` + `DB_SQLITE_PATH` pointant **hors de
     `public_html`**.
   - `APP_ENV=production`, `CORS_ORIGINS` vide.
   - `INSTALL_OWNER_EMAIL` / `INSTALL_OWNER_PASSWORD` pour le compte propriétaire.
4. Ouvrir `https://votre-domaine/api/install.php` **une seule fois**. Il crée
   les 21 tables, le compte propriétaire, dépose `installed.lock` et refuse
   tout appel ultérieur.
5. **Supprimer `api/install.php` du serveur**, et vider les deux variables
   `INSTALL_OWNER_*` du `.env`.
6. Vérifier : `https://votre-domaine/api/health` doit rendre
   `{"data":{"status":"ok","driver":"…"}}`.

### 7.3 Contrôles de sécurité après déploiement — à faire, pas à supposer

Ouvrir chacune de ces URL ; **toutes** doivent rendre 403 ou 404 :

```
https://votre-domaine/api/.env
https://votre-domaine/api/src/Db.php
https://votre-domaine/api/schema/schema.mysql.sql
https://votre-domaine/api/installed.lock
https://votre-domaine/api/var/katech.sqlite     (mode SQLite mal placé)
```

Si l'une d'elles renvoie du contenu, `mod_rewrite` ou `AllowOverride` est
désactivé : **déplacer immédiatement la base hors de `public_html`** et
demander l'activation de `.htaccess` à l'hébergeur.

Un `.htaccess` seul ne protège pas une base SQLite placée dans la racine web.
En mode SQLite, `DB_SQLITE_PATH` **doit** sortir de `public_html` ; c'est la
seule protection qui ne dépend pas de la configuration du serveur.

### 7.4 `public_html/.htaccess` — repli SPA sans avaler l'API

```apache
RewriteEngine On

# /api/… est servi par le backend : ne jamais le réécrire vers index.html.
RewriteRule ^api/ - [L]

# Repli SPA : tout ce qui n'est pas un fichier réel va à index.html.
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### 7.5 Basculer d'un pilote à l'autre

Changer `DB_DRIVER`, renseigner les variables du nouveau pilote, effacer
`installed.lock`, réouvrir `install.php`. Les schémas étant jumeaux et vérifiés,
le code applicatif ne bouge pas d'une ligne. La migration des **données**
existantes est une opération distincte, à traiter au cas par cas.

### 7.6 Le troisième pilote : `pgsql` (PostgreSQL, Supabase, Neon, Railway)

`DB_DRIVER=pgsql` ouvre PostgreSQL. Aucun fournisseur n'est privilégié : seule
la chaîne de connexion change.

```env
DB_DRIVER=pgsql
DB_HOST=127.0.0.1        # Supabase : l'hôte de la section « Database »
DB_PORT=5432             # 5432 = connexion directe (recommandée)
DB_NAME=katech
DB_USER=katech
DB_PASSWORD=…
DB_SSLMODE=              # vide en local ; « require » chez tout Postgres hébergé
```

Trois pièges PostgreSQL, tous rencontrés en exécution réelle sur ce projet :

1. **Le niveau d'isolation porte la garantie anti-survente.** `Db` l'épingle à
   `READ COMMITTED` à chaque connexion, et ce n'est pas décoratif. En
   `READ COMMITTED`, la deuxième transaction attend le verrou de ligne puis
   **réévalue** `stock_qty >= :qmin` sur la version fraîchement committée
   (mécanisme _EvalPlanQual_) : elle obtient `rowCount() = 0`, c'est-à-dire un
   refus métier propre en **409**. Passé en `REPEATABLE READ`, le même test à six
   commandes concurrentes rend `2 × 201`, `1 × 409` et **`3 × 500`**
   (`SQLSTATE 40001, could not serialize access due to concurrent update`) : le
   stock reste juste, mais un refus de stock devient une panne serveur.
2. **JSON en `TEXT`, jamais en `jsonb`.** Le catalogue filtre avec
   `use_tags LIKE '%"work"%'` et `LOWER(name) LIKE …` ; PostgreSQL n'a ni `LIKE`
   ni `LOWER()` sur `jsonb` (« operator does not exist: jsonb ~~ unknown »). De
   plus `jsonb` réordonne les clés, donc la chaîne relue ne serait plus celle
   écrite par `Db::json()` et les trois pilotes cesseraient d'être
   interchangeables pour une migration de données.
3. **Booléens en `SMALLINT` 0/1, jamais en `boolean` natif.** PostgreSQL est
   strictement typé : `WHERE best_seller = :b` avec `1` lié par PDO échoue sur
   une colonne `boolean` (« column is of type boolean but expression is of type
   integer »). La règle du §4 — entier 0/1 en base, vrai booléen dans le DTO —
   vaut donc pour les trois pilotes.

À savoir également : les identifiants non quotés sont repliés en **minuscules**
par PostgreSQL (les trois schémas n'emploient que des minuscules, `Db` ne quote
donc rien) ; l'auto-incrément s'écrit `BIGINT NOT NULL GENERATED BY DEFAULT AS
IDENTITY PRIMARY KEY`, « BY DEFAULT » et non « ALWAYS » pour que l'import de
données puisse fournir un id ; et chez Supabase le port **6543** (pooler en mode
transaction) met en défaut les requêtes réellement préparées côté serveur qu'impose
`ATTR_EMULATE_PREPARES=false` — préférer le **5432**.

Le vérificateur de parité compare désormais les **trois** schémas, SQLite servant
de référence :

```bash
php api/tools/verifier-parite-schema.php
# PARITÉ OK — 23 tables, 184 colonnes, 25 index identiques dans les 3 schémas (sqlite, mysql, pgsql).
```

---

## 8. Développement local

```bash
# SQLite — zéro configuration
export DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/kt/katech.sqlite APP_ENV=dev
php api/install.php
php api/tools/semer-demo.php
php -S 127.0.0.1:8099 -t api api/index.php

curl -s "http://127.0.0.1:8099/products?perPage=2&sort=price&order=asc"
```

Le serveur intégré de PHP a besoin d'`api/index.php` **en argument de routeur**
(dernier paramètre) : sans lui, `/products` cherche un fichier de ce nom et
renvoie 404.

Pour brancher le frontend Vite dessus, dans `.env` du projet :

```env
VITE_API_MODE=http
VITE_API_BASE_URL=http://127.0.0.1:8099
```

et dans `api/.env` : `CORS_ORIGINS=http://localhost:5173`. `*` est inutilisable
ici, car le client envoie `credentials: include`.

---

## 9. Ce que la vague 4.1 n'a PAS fait

À l'attention des vagues suivantes, pour éviter de le redécouvrir :

- **Authentification** : la table `users` existe, `install.php` sait créer un
  propriétaire en Argon2id, mais aucune route `/auth/*` n'est branchée et aucun
  contrôle de rôle n'est appliqué. Toutes les routes sont ouvertes en lecture.
- **Écritures du catalogue** : seuls `GET /products` et `GET /products/:id` sont
  livrés. `POST`, `PATCH`, `DELETE`, `/products/:id/stock` restent à écrire.
- **Outbox** : la table existe et se remplit dans la même transaction que le
  fait métier ; aucun consommateur (cron d'envoi d'emails) n'est écrit.
- **Médias** : la table existe ; l'upload multipart vers `public_html/uploads/`
  n'est pas implémenté.
- **`home_reviews` n'est pas une table.** Les avis de la page d'accueil sont une
  **section** de `site_content` (`section = 'home-reviews'`, payload JSON), au
  même titre que `ticker`, `about` ou `builder`. C'est du contenu éditorial
  semi-structuré, pas du transactionnel — conforme à la répartition de
  `PLAN.md` §1.
- **`categories.label` / `categories.description` restent des colonnes TEXTE**,
  non JSON, parce que `AdminCategory` les déclare en `string` nu dans
  `src/lib/admin-store.tsx`. Les passer en JSON demanderait de modifier le
  frontend, ce qui est hors du périmètre de la vague 4.1. À arbitrer avec la
  vague qui livrera `/categories`.
