# MIGRATION.md — Déménager les données d'une base à une autre

> Comment copier l'intégralité de la boutique d'un moteur de base de données
> vers un autre — SQLite, MySQL/MariaDB, PostgreSQL — dans n'importe quel sens,
> sans rien perdre et sans rien déformer.

| Élément                           | Rôle                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `api/src/Migration/Migrateur.php` | Le moteur. Utilisable depuis la ligne de commande **ou** depuis une page web. |
| `api/src/Migration/Rapport.php`   | Le rapport, **structure de données** (jamais du texte).                       |
| `api/tools/migrer.php`            | Habillage console. Aucune logique de migration dedans.                        |

---

## 1. En trois commandes

```bash
# 1) Répétition générale — lit tout, contrôle tout, N'ÉCRIT RIEN
php api/tools/migrer.php \
    --source='sqlite:/home/monuser/katech-data/katech.sqlite' \
    --cible='mysql:host=localhost;dbname=katech' \
    --cible-utilisateur=katech --cible-mdp-env=MDP \
    --creer-schema

# 2) Si la simulation est verte : la vraie migration
php api/tools/migrer.php --source=… --cible=… --creer-schema --reelle

# 3) Basculer l'application : api/.env → DB_DRIVER=mysql
```

**Le mode par défaut est la simulation.** Sans `--reelle`, rien n'est jamais
écrit. Une migration destructrice ne doit pas pouvoir partir d'un clic distrait
ni d'une commande tapée à moitié.

DSN acceptés :

```
sqlite:/chemin/absolu/katech.sqlite
mysql:host=localhost;port=3306;dbname=katech;charset=utf8mb4
pgsql:host=127.0.0.1;port=5432;dbname=katech
```

> **Mots de passe** : préférez `--cible-mdp-env=NOM_DE_VARIABLE`. Un mot de
> passe passé en `--cible-mdp=…` est lisible par tous les comptes de la machine
> dans `ps aux`.

---

## 2. Ce que le moteur garantit

### 2.1 Le CONTENU est comparé, pas le nombre de lignes

Compter les lignes ne prouve rien : 145 lignes tronquées font toujours 145
lignes. Chaque table produit donc une **empreinte de contenu**, recalculée côté
cible et comparée à celle de la source.

Cette empreinte est calculée sur des valeurs **normalisées**, pas sur le texte
brut, parce que les trois moteurs ne rendent pas la même chose pour la même
donnée :

| Divergence                   | Ce que rend chaque moteur                         | Traitement                                 |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Booléens                     | `0`/`1` (SQLite, MySQL), `t`/`f` (PostgreSQL)     | ramenés à `0`/`1`                          |
| JSON                         | MySQL **réordonne les clés** d'un objet           | comparé sous forme canonique (clés triées) |
| `NULL` contre chaîne vide    | —                                                 | **jamais confondus** (marqueur dédié)      |
| Nombres                      | `10`, `10.00`, `1.0E1`                            | écriture décimale canonique                |
| Dates en type temporel natif | `2026-01-15 08:30:00+00` / `2026-01-15T08:30:00Z` | ISO-8601 UTC                               |

L'empreinte est **commutative** (OU-exclusif + somme + compte) : elle ne dépend
pas de l'ordre des lignes. C'est nécessaire, car « `ORDER BY id` » ne classe pas
au même endroit en `utf8mb4_unicode_ci` (MySQL) et en collation `C`
(PostgreSQL) — une empreinte séquentielle signalerait des écarts imaginaires.

### 2.2 La vérification a lieu AVANT la validation

L'ordre est : écrire dans une transaction → **relire la cible et comparer les
empreintes, toujours dans la transaction** → valider seulement si tout
correspond. Une divergence provoque une annulation, pas un rapport d'échec sur
une base déjà sale.

### 2.3 Une cible non vide n'est jamais écrasée en silence

```
REFUS : la base cible n'est pas vide (145 ligne(s) dans 24 table(s) : …).
Écraser ces données doit être demandé explicitement (option « remplacer »).
Sauvegardez d'abord : api/tools/sauvegarder.php.
```

`--remplacer` vide les tables **dans la transaction** (`DELETE`, jamais
`TRUNCATE` : en MySQL, `TRUNCATE` est du DDL et validerait implicitement la
transaction, rendant la purge irréversible avant la première insertion).

### 2.4 Une migration interrompue ne laisse pas une base à moitié remplie

Deux mécanismes, et il faut les deux :

1. **Une seule transaction** pour tout le chargement. Si le processus meurt,
   le serveur annule. _Mesuré_ : `kill -9` en plein transfert de 40 000 lignes
   → **0 ligne** dans la cible.
2. **Une table témoin `_katech_migration`** déposée dans la cible **avant** la
   transaction et validée aussitôt — sinon elle disparaîtrait avec elle et ne
   témoignerait de rien.

| État du témoin | Signification                                           | Migration suivante                    |
| -------------- | ------------------------------------------------------- | ------------------------------------- |
| `en_cours`     | processus tué : personne n'a pu conclure                | **refusée** sans `--remplacer`        |
| `annulee`      | échec propre, annulation confirmée par le moteur        | autorisée                             |
| `terminee`     | validée et vérifiée (le résumé chiffré est en `detail`) | soumise à la règle « cible non vide » |

La distinction `annulee` / `en_cours` compte : sans elle, le moindre échec
obligerait à repasser `--remplacer`, et l'utilisateur prendrait l'habitude de
le taper systématiquement — ce qui ruinerait la protection §2.3.

### 2.5 Les séquences sont repositionnées

**Le piège** : en PostgreSQL, insérer `id = 50` explicitement ne touche pas la
séquence, qui reste à 1. Tout se passe bien… jusqu'à la première commande créée
par la boutique, qui échoue en doublon de clé — parfois des jours plus tard,
quand plus personne ne fait le lien avec la migration.

Trois tables sont concernées (`order_items`, `outbox`, `login_attempts`) :

| Moteur     | Correctif appliqué après le commit                     |
| ---------- | ------------------------------------------------------ |
| PostgreSQL | `setval(pg_get_serial_sequence(…), max+1, false)`      |
| MySQL      | `ALTER TABLE … AUTO_INCREMENT = max+1`                 |
| SQLite     | `sqlite_sequence` (vérifié ; alimenté automatiquement) |

Après le commit et pas avant : en MySQL, `ALTER TABLE` est du DDL et validerait
implicitement la transaction en cours.

### 2.6 Aucune table n'est jamais chargée en mémoire

Lecture par lots avec **pagination par clé** (`WHERE cle > … LIMIT n`), et non
par curseur : le pilote PostgreSQL de PDO rapatrie la totalité d'un résultat
côté client avant la première ligne, un `SELECT * FROM orders` y coûterait donc
autant de mémoire que la table entière. Ni par `LIMIT/OFFSET`, qui relit tout
depuis le début à chaque lot.

Le tri est forcé en **collation binaire** sur les clés textuelles. Sans cela,
MySQL trie en `utf8mb4_unicode_ci`, où « a » et « A » sont _égaux_ : deux lignes
distinctes peuvent alors être sautées ou relues à la frontière d'un lot.

_Mesuré_ : 40 000 lignes migrées avec `memory_limit=48M`, **pic à 1,3 Mo**, sur
les trois pilotes — y compris en lecture PostgreSQL.

---

## 3. Le mode simulation, et pourquoi il faut s'en servir

La simulation lit **toute** la source et contrôle, ligne par ligne, ce qui se
passerait à l'écriture :

- valeur `NULL` vers une colonne cible `NOT NULL` sans valeur par défaut ;
- chaîne plus longue que le `VARCHAR(n)` cible — MySQL en mode non strict la
  **tronquerait en silence**, PostgreSQL la refuserait, SQLite l'accepterait :
  trois comportements, un seul signalement ;
- entier hors des bornes de la colonne cible (voir §5) ;
- valeur non-JSON dans une colonne JSON ;
- colonne ou table présente d'un côté et pas de l'autre.

Exemple de sortie réelle :

```
[ERREUR] products.name n'est pas du JSON valide alors que la colonne cible
         l'exige : « ASUS ROG Strix G16 ». {table=products colonne=name ligne=id=rog-strix-g16}
[ERREUR] coupons.code : la valeur fait 80 caractères pour une colonne cible
         limitée à 64. Elle serait tronquée ou refusée. {table=coupons colonne=code …}
```

Chaque anomalie nomme **la table, la colonne et la ligne**. Une anomalie qu'il
faut aller chercher revient à ne rien signaler.

La simulation mesure aussi la durée de la passe de lecture : c'est ainsi qu'on
sait **avant d'écrire** si la migration tient dans le temps imparti (§4).

> **La seule écriture admise en simulation** est `--creer-schema`, qui crée des
> tables **vides** (`CREATE TABLE IF NOT EXISTS`). Sans cette exception, aucune
> simulation ne serait possible vers une base fraîchement créée — et la première
> migration réelle se ferait donc sans répétition générale, ce qui est bien
> pire. Le rapport l'annonce explicitement.

### Contrôler deux bases après coup

Le même mode sert de vérificateur : si la source **et** la cible sont peuplées,
la simulation compare leurs empreintes table par table et ne compare rien
d'autre. C'est la façon de vérifier une migration faite avec un autre outil
(export phpMyAdmin, par exemple).

```bash
php api/tools/migrer.php --source='sqlite:…' --cible='mysql:…' --json
```

---

## 4. Hébergement mutualisé : la contrainte structurante

Le script sera souvent appelé depuis une requête HTTP, avec un
`max_execution_time` à 30 s. **« Ça n'arrivera pas » n'est pas une réponse.**

Le moteur travaille sous un **budget de temps** (`budget_s`, `--budget=`). S'il
l'épuise, il **annule tout** et le dit, plutôt que de valider une base à moitié
remplie :

```
[ERREUR] Budget de temps de 25 s épuisé pendant « login_attempts » (5000 ligne(s)
         traitées). Tout est annulé : la base cible n'a pas été modifiée.
```

| Contexte                  | Budget conseillé                                            |
| ------------------------- | ----------------------------------------------------------- |
| Ligne de commande / CRON  | 300 s (défaut de `migrer.php`)                              |
| Derrière une requête HTTP | `max_execution_time − 5 s`, soit **25 s** pour un mutualisé |

**Ce que le moteur ne fait pas** : reprendre une migration là où elle s'était
arrêtée. C'est un choix. Une reprise partielle suppose de savoir exactement ce
qui a été écrit, or c'est précisément ce qu'une coupure rend incertain ; et
« tout ou rien » est le seul état qu'un commerçant peut vérifier lui-même.
Si la migration ne tient pas dans le budget d'une requête HTTP, il faut la
lancer en ligne de commande (voir le gestionnaire de tâches CRON de
l'hébergeur, comme pour `api/tools/sauvegarder.php`).

Ordre de grandeur mesuré sur ce banc : **40 000 lignes en 0,8 s**
(SQLite → MySQL). Les 145 lignes du jeu de démonstration passent en 0,04 s. Une
boutique réelle est très en dessous du budget.

---

## 5. Divergences de types constatées

Toutes ont été rencontrées sur ce banc d'essai, pas imaginées.

### 5.1 JSON : MySQL réordonne les clés

Le schéma PostgreSQL du projet stocke le JSON en `TEXT` (et non en `jsonb`) — la
justification est en tête de `api/schema/schema.pgsql.sql`. **MySQL, lui, range
le type `JSON` dans une représentation binaire qui trie les clés d'objet.**

Aller-retour SQLite → MySQL → PostgreSQL → SQLite, mesuré :

```
{"fr":"Guide d'achat…","en":"Buying guide…","ar":"دليل الشراء…"}   (départ)
{"ar":"دليل الشراء…","en":"Buying guide…","fr":"Guide d'achat…"}   (arrivée)
```

**53 champs sur 938 sont revenus réécrits dans un autre ordre de clés.** Le
contenu est intact, le texte non. C'est exactement pourquoi la vérification
porte sur une forme canonique et non sur les octets : une comparaison naïve
aurait déclaré la migration ratée.

Conséquence pratique : `products.name`, `products.specs`, `orders.status_history`,
`blog_posts.title`… peuvent changer d'ordre de clés en passant par MySQL. Aucun
code du projet ne dépend de cet ordre (`json_decode` en tableau associatif),
mais il ne faut jamais comparer ces colonnes octet à octet entre deux bases.

Le moteur sait quelles colonnes sont du JSON parce qu'il lit les marqueurs
`/* JSON */` de `api/schema/schema.sqlite.sql`. **Aucune introspection ne
pourrait le lui apprendre** : côté SQLite comme côté PostgreSQL, ces colonnes
sont de simples `TEXT`. Ce registre est indispensable — sans lui, un
aller-retour signalerait 53 faux écarts.

### 5.2 Entiers : SQLite est sur 64 bits, les autres non

`INTEGER` en SQLite est un entier signé **64 bits**, quel que soit le mot écrit
dans le `CREATE TABLE`. `INT` en MySQL et `INTEGER` en PostgreSQL s'arrêtent à
**2 147 483 647**.

Une valeur parfaitement valide en SQLite est donc refusée par les deux autres.
Rencontré en écrivant ce banc d'essai :

```
SQLSTATE[22003]: Numeric value out of range: 1264 Out of range value for column 'total_spent'
```

Le moteur détecte désormais ce cas **en simulation**, en nommant la ligne. La
limite concrète : un `customers.total_spent` ne peut pas dépasser 2,1 milliards
de dinars, et un `orders.total` non plus. C'est très au-delà des besoins d'une
boutique, mais c'est une **asymétrie du schéma** dont il faut avoir conscience :
une base SQLite peut contenir des valeurs qu'aucune des deux autres n'acceptera.

### 5.3 Booléens

Aucun des trois schémas n'utilise de booléen natif (`INTEGER`/`TINYINT`/`SMALLINT`
0-1, choix documenté en tête de `api/schema/schema.pgsql.sql`). Le moteur gère
tout de même le cas d'une cible installée à la main avec de vrais `boolean` :
`t`/`f`, `true`/`false` et `0`/`1` sont ramenés à la même valeur, et l'écriture
lie un vrai booléen quand la colonne l'exige.

### 5.4 Collations et tri

Trois ordres de tri différents pour les mêmes clés textuelles
(`utf8mb4_unicode_ci`, `C`, `BINARY`). Deux conséquences traitées : les
empreintes sont commutatives (§2.1) et la pagination force la collation binaire
(§2.6). À noter : `ORDER BY … COLLATE "C"` est **refusé par PostgreSQL sur une
colonne entière** (« collations are not supported by type bigint ») — la
collation n'est donc appliquée qu'aux colonnes textuelles.

### 5.5 Clés étrangères

**Le schéma du projet n'en déclare aucune** — `api/tools/verifier-parite-schema.php`
refuse même les contraintes de table. L'ordre d'insertion suit donc l'ordre de
déclaration du schéma, qui est déjà un ordre de dépendance.

Le moteur applique tout de même un tri topologique sur les clés étrangères
réellement présentes dans la cible, et les relâche le temps du chargement
(`SET FOREIGN_KEY_CHECKS = 0` en MySQL, `SET CONSTRAINTS ALL DEFERRED` en
PostgreSQL). Aujourd'hui c'est neutre ; le jour où une clé étrangère
apparaîtra, une migration qui insère dans le désordre échouerait de façon
spectaculaire et incompréhensible.

---

## 6. Le rapport est une structure de données

`Migrateur::executer()` rend un tableau PHP, jamais du texte : la même exécution
alimente la console et une page d'administration.

```php
require_once __DIR__ . '/../src/bootstrap.php';

use KaTech\Migration\Migrateur;
use KaTech\Migration\Rapport;

$rapport = (new Migrateur(
    Migrateur::connecter('sqlite:/chemin/katech.sqlite'),
    Migrateur::connecter('mysql:host=localhost;dbname=katech', 'katech', $motDePasse),
    [
        'mode'        => Rapport::MODE_REELLE,   // défaut : MODE_SIMULATION
        'remplacer'   => false,
        'creer_schema'=> true,
        'budget_s'    => 25.0,                   // derrière une requête HTTP
    ],
))->executer();
```

`executer()` **ne lève jamais d'exception** : une page web doit pouvoir afficher
le rapport dans tous les cas, y compris celui de l'échec.

Forme du rapport :

```php
[
  'ok'      => true,
  'mode'    => 'reelle',
  'motif'   => null,                       // renseigné en cas d'échec
  'source'  => ['pilote' => 'sqlite', 'version' => '3.45.1', 'etiquette' => '…'],
  'cible'   => ['pilote' => 'mysql',  'version' => '10.11.6', 'etiquette' => '…'],
  'duree_s' => 0.184,
  'totaux'  => [
      'tables' => 23, 'lues' => 145, 'ecrites' => 145,
      'erreurs' => 0, 'avertissements' => 0, 'tables_identiques' => 23,
  ],
  'tables'  => [
      [
        'table' => 'products', 'lues' => 13, 'ecrites' => 13,
        'empreinte_source' => '207fb1a40b621910b15e71a8.13',
        'empreinte_cible'  => '207fb1a40b621910b15e71a8.13',
        'identique' => true,               // true | false | null (non comparée)
        'duree_s' => 0.012, 'anomalies' => 0,
      ], // …
  ],
  'sequences'  => [['table' => 'order_items', 'colonne' => 'id', 'valeur' => 50, 'note' => '…']],
  'anomalies'  => [['gravite' => 'erreur', 'message' => '…', 'table' => '…', 'colonne' => '…', 'ligne' => '…']],
  'journal'    => [['a' => 0.004, 'message' => '24 table(s) au plan : …']],
]
```

Gravités : `erreur` (bloquante — la transaction est annulée),
`avertissement` (visible, non bloquante), `info`.

`api/tools/migrer.php --json` rend ce tableau tel quel.

---

## 7. Ce que ce moteur ne fait PAS

| Non couvert                           | Pourquoi                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Reprise après coupure                 | Voir §4 : « tout ou rien » est le seul état vérifiable.                                 |
| Migration de schéma (ALTER, versions) | Ce moteur copie des **données**. Le schéma vient de `api/schema/`.                      |
| Copie des index et contraintes        | Ils viennent du fichier de schéma, pas de la source.                                    |
| Migration à chaud                     | Arrêtez les écritures : la boutique en maintenance le temps de la copie.                |
| Clés composites en pagination par clé | Repli `LIMIT/OFFSET`, signalé en avertissement. Aucune table du projet n'est concernée. |

---

## 8. Recette exécutée — l'aller-retour complet

Toutes les valeurs ci-dessous ont été mesurées, pas estimées.

**Jeu de données** : 24 tables, 145 lignes. Données de démonstration du projet
(`api/tools/importer-donnees-front.php` puis `api/tools/semer-demo.php`),
complétées de lignes volontairement hostiles : `NULL` contre chaîne vide,
apostrophes, guillemets, retours à la ligne et tabulations dans les valeurs,
arabe et emoji, hachages bcrypt (`$`, `/`, `.`), JSON aux clés désordonnées avec
objet vide, liste vide, `null` et flottant, `data:` URI de 3 200 caractères,
entiers négatifs, borne exacte d'`INT` (2 147 483 647), chaîne de la longueur
maximale d'un `VARCHAR(64)`, identifiants auto-incrémentés troués (1, 2, 50).

```
SQLite  →  MySQL      145 lues / 145 écrites   24/24 tables identiques
MySQL   →  PostgreSQL 145 lues / 145 écrites   24/24 tables identiques
PostgreSQL → SQLite   145 lues / 145 écrites   24/24 tables identiques
─────────────────────────────────────────────────────────────────────
SQLite de départ vs SQLite d'arrivée :         24/24 tables identiques
```

Le sens inverse (SQLite → PostgreSQL → MySQL → SQLite) donne le même résultat :
les six directions ont été exécutées.

**Contrôle indépendant du moteur** (relecture directe des deux fichiers SQLite,
champ par champ, sans utiliser une ligne de son code) :

```
lignes comparées       : 145 (arrivée : 145)
champs comparés        : 938
champs identiques      : 885
champs JSON réordonnés :  53   (même contenu, ordre des clés normalisé — §5.1)
ÉCARTS RÉELS           :   0
```

**Comportements de sûreté vérifiés en conditions réelles :**

| Scénario                                      | Résultat observé                                            |
| --------------------------------------------- | ----------------------------------------------------------- |
| `kill -9` en plein transfert de 40 000 lignes | 0 ligne dans la cible, témoin `en_cours`                    |
| Migration suivante sur cette cible            | refusée, message nommant la date et le jeton                |
| Puis `--remplacer`                            | 40 000 lignes, 24/24 identiques, `AUTO_INCREMENT → 40001`   |
| Budget de temps épuisé                        | tout annulé, 0 ligne, témoin `annulee`                      |
| Cible non vide sans `--remplacer`             | refusée, données de la cible intactes, code de sortie 1     |
| Cible sans schéma                             | refus explicite renvoyant à `--creer-schema`                |
| Valeur non-JSON dans une colonne JSON         | détectée **en simulation**, table + colonne + ligne nommées |
| Chaîne de 80 caractères vers un `VARCHAR(64)` | détectée en simulation, jamais tronquée                     |
| Entier hors bornes `INT`                      | détecté en simulation                                       |
| 40 000 lignes sous `memory_limit=48M`         | pic à 1,3 Mo, sur les trois pilotes                         |

---

## 9. La table `notion_links` et ce qui se passe lors d'une migration

`notion_links` est migrée comme toutes les autres tables par le migrateur. Elle contient les liaisons commandes-pages Notion, avec leurs empreintes `pushed_hash` et `pulled_hash`.

**Ce qui est préservé :** les `page_id`, `pushed_hash`, `pulled_hash`, `carrier`, `tracking_number`, ainsi que les éventuelles `last_error`. Les empreintes restent valides après migration — le mécanisme anti-écho de Notion fonctionne immédiatement sans resynchronisation forcée.

**Ce qui ne change pas côté Notion :** la page Notion n'est pas une copie locale — c'est un service externe. La migration ne la modifie pas. Les liens sont intacts, le webhook continue de router correctement par `page_id`.

**Ce que la migration ne fait PAS :** elle ne rétablit pas de connexion Notion. Si la boutique n'était pas connectée à Notion avant la migration, elle ne l'est pas après. Si elle l'était, la connexion continue de fonctionner — les réglages Notion sont dans la table `settings` (scope `notion`), également migrée.

**Piège chiffrement.** Le jeton Notion est chiffré avec `NOTION_CRYPTO_KEY` depuis `api/.env`. Une migration vers un serveur avec un `.env` différent (clé différente ou absente) rend le jeton indéchiffrable — le miroir se désactive proprement (`configure = false`) sans panne. Il suffit de ressaisir le jeton. Voir `docs/GUIDE-BASES-DE-DONNEES.md §12.3`.

---

## 10. Après la migration

1. **Vérifier le témoin** : `SELECT * FROM _katech_migration` doit montrer
   `terminee`. Cette table n'est jamais migrée (elle appartient au migrateur) ;
   elle peut être supprimée une fois la bascule confirmée.
2. **Basculer `api/.env`** : `DB_DRIVER`, puis `DB_HOST` / `DB_NAME` /
   `DB_USER` / `DB_PASSWORD` (ou `DB_SQLITE_PATH`).
3. **Sauvegarder immédiatement** la nouvelle base :
   `php api/tools/sauvegarder.php`.
4. **Ne pas supprimer l'ancienne base** avant plusieurs jours d'exploitation
   normale. C'est la seule chose qui rend la migration réversible.
5. **Contrôler une création** (une commande de test) : c'est ce qui prouve que
   les séquences ont bien été repositionnées (§2.5).
