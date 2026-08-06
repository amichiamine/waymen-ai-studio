<?php

/**
 * Produits — ROUTE EXEMPLAIRE de la phase 4.
 *
 * C'est le pilote que les autres ressources recopient (cf. docs/BACKEND.md,
 * « Ajouter une ressource »). Tout ce qui suit est intentionnel :
 *
 *   1. Le mapping ligne SQL → DTO du contrat vit dans UNE fonction (`enDto`),
 *      jamais dispersé dans les requêtes.
 *   2. Aucune valeur ne touche le SQL par concaténation : les filtres
 *      construisent une liste de fragments `?` et un tableau de paramètres.
 *   3. Les seuls fragments interpolés — colonne de tri et sens — passent par
 *      `Db::colonneTri()` et `Db::sens()`, adossés à une liste blanche.
 *   4. Le total est compté avec EXACTEMENT le même WHERE que la page, sinon
 *      la pagination du frontend ment.
 *   5. Zéro test de `DB_DRIVER` : la portabilité est déjà dans Db.
 *
 * Vague 4.2 — ajouts :
 *   - creer()   : POST /products
 *   - modifier() : PATCH /products/:id
 *   - supprimer() : DELETE /products/:id
 *   - mettreAJourStock() : PATCH /products/:id/stock — atomique, sans survente
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurProduits
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'price' => 'price',
        'name' => 'name',
        'brand' => 'brand',
        'stock' => 'stock_qty',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    /** Valeurs autorisées pour la colonne `stock`. */
    private const STOCK_STATUTS = ['in', 'low', 'out'];

    /**
     * Liste de colonnes commune à TOUTES les lectures de produit.
     *
     * Les deux sous-requêtes agrègent les avis **approuvés** du produit. Elles
     * existent pour une raison précise : la vitrine affiche une note sur chaque
     * carte produit. Sans cet agrégat, la seule source disponible était
     * `GET /reviews` — la liste d'administration, protégée par la permission
     * `read` — appelée une fois par carte : 12 requêtes et 12 réponses 401 pour
     * un seul chargement d'accueil. La note voyage désormais avec le produit,
     * dans la réponse publique déjà demandée : zéro requête supplémentaire,
     * aucune route protégée sollicitée.
     *
     * Sous-requêtes corrélées sur `products.id` plutôt que jointure + GROUP BY :
     * elles restent valides quelle que soit la clause WHERE construite par
     * `filtres()` (qui nomme les colonnes sans préfixe) et n'altèrent ni le
     * comptage total ni le tri. Portables SQLite/MySQL sans un seul test de
     * `DB_DRIVER`.
     */
    private const SELECTION = 'products.*, '
        . "(SELECT COUNT(*) FROM reviews "
        . "WHERE reviews.product_id = products.id AND reviews.status = 'approved') AS reviews_count, "
        . "(SELECT AVG(reviews.rating) FROM reviews "
        . "WHERE reviews.product_id = products.id AND reviews.status = 'approved') AS reviews_average";

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /products
     * → { data: { items, total, page, perPage } }
     *
     * Filtres du contrat : category, brand, minPrice, maxPrice, stock, use,
     * bestSeller, sale — plus search, sort, order, page, perPage.
     */
    public function lister(Requete $r): Reponse
    {
        [$where, $params] = $this->filtres($r);
        $pagination = Pagination::depuis($r);

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM products{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens = Db::sens($r->query('order'), 'DESC');

        // `id` en tri secondaire : sans lui, deux lignes de même prix peuvent
        // changer de page d'un appel à l'autre et l'utilisateur voit un doublon.
        $sql = 'SELECT ' . self::SELECTION . " FROM products{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage";

        $lignes = $this->db->tous($sql, $params + [
            ':limite' => $pagination->perPage,
            ':decalage' => $pagination->offset(),
        ]);

        return Reponse::page(
            array_map([$this, 'enDto'], $lignes),
            $total,
            $pagination->page,
            $pagination->perPage,
        );
    }

    /**
     * GET /products/:id
     * → { data: Product } ou 404 enveloppé.
     */
    public function detail(Requete $r): Reponse
    {
        $id = $r->param('id');
        $ligne = $this->db->un('SELECT ' . self::SELECTION . ' FROM products WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    /**
     * POST /products
     * → 201 { data: Product }
     *
     * Les champs `name`, `spec_line`, `specs` sont des JSON localisés
     * (Localized<string>) : on les encode avec Db::json() à l'écriture.
     */
    public function creer(Requete $r): Reponse
    {
        $donnees = $this->validerEtNormaliser($r, null);
        $maintenant = gmdate('c');

        // Colonnes à mettre à jour en cas de conflit d'identifiant : toutes sauf
        // `id` (clé de conflit) et `created_at` (ne jamais écraser la date de
        // création lors d'un upsert).
        $colsMaj = array_values(array_diff(
            array_keys($donnees),
            ['id'],
        ));
        $colsMaj[] = 'updated_at';

        $this->db->transaction(fn (Db $d) => $d->upsert('products', array_merge($donnees, [
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ]), ['id'], $colsMaj));

        return Reponse::cree($this->enDto(
            (array) $this->db->un('SELECT ' . self::SELECTION . ' FROM products WHERE id = :id', [':id' => $donnees['id']])
        ));
    }

    /**
     * PATCH /products/:id
     * → 200 { data: Product }
     *
     * Mise à jour partielle (PATCH) : seuls les champs fournis sont écrasés.
     */
    public function modifier(Requete $r): Reponse
    {
        $id = $r->param('id');

        $existant = $this->db->un('SELECT ' . self::SELECTION . ' FROM products WHERE id = :id', [':id' => $id]);
        if ($existant === null) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$id} ».");
        }

        $donnees = $this->validerEtNormaliser($r, $existant);
        $maintenant = gmdate('c');

        // Construire la liste SET dynamiquement à partir des colonnes à modifier.
        $set = implode(', ', array_map(
            static fn (string $c): string => Db::identifiant($c) . ' = :' . $c,
            array_keys($donnees),
        ));

        $this->db->run(
            "UPDATE products SET {$set}, updated_at = :updated_at WHERE id = :id_cible",
            array_merge(
                array_combine(
                    array_map(static fn (string $c): string => ':' . $c, array_keys($donnees)),
                    array_values($donnees),
                ),
                [':updated_at' => $maintenant, ':id_cible' => $id],
            ),
        );

        return Reponse::ok($this->enDto(
            (array) $this->db->un('SELECT ' . self::SELECTION . ' FROM products WHERE id = :id', [':id' => $id])
        ));
    }

    /**
     * DELETE /products/:id
     * → 204 sans corps.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $n = $this->db->run(
            'DELETE FROM products WHERE id = :id',
            [':id' => $id],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$id} ».");
        }

        return Reponse::vide();
    }

    /**
     * PATCH /products/:id/stock
     * Corps : { "delta": <entier signé> }
     * → 200 { data: { stockQty } } ou erreur métier 409 (stock insuffisant).
     *
     * ATOMICITÉ : la mise à jour se fait dans une transaction `beginWrite()`
     * (BEGIN IMMEDIATE en SQLite, BEGIN en MySQL) avec une requête conditionnelle
     * qui incorpore la vérification et la mise à jour en une seule passe :
     *
     *   UPDATE products
     *      SET stock_qty = stock_qty + :delta1
     *    WHERE id = :id
     *      AND stock_qty + :delta2 >= 0
     *
     * Si rowCount() == 0, soit le produit n'existe pas, soit le stock serait
     * négatif : on distingue les deux cas. Cette approche empêche la survente
     * parce qu'aucune lecture du stock n'est jamais suivie d'une réécriture
     * séparée — une seule instruction atomique.
     *
     * PIÈGE DIALECTE (BACKEND.md §4, règle 1) : MySQL avec
     * ATTR_EMULATE_PREPARES=false interdit qu'un même paramètre nommé apparaisse
     * deux fois. On utilise donc :delta1 et :delta2 (valeur identique, nom
     * distinct) pour contourner cette limitation tout en restant correct en
     * SQLite et MySQL.
     */
    public function mettreAJourStock(Requete $r): Reponse
    {
        $id = $r->param('id');
        $delta = $r->corps('delta');

        if ($delta === null || !is_numeric($delta)) {
            throw ApiException::validation('Mise à jour de stock invalide.', [
                'delta' => ['Champ obligatoire, entier signé (ex. : 5 ou -3).'],
            ]);
        }
        $delta = (int) $delta;

        // Vérification préalable d'existence — pour distinguer « introuvable »
        // de « stock insuffisant » au retour de l'UPDATE conditionnel.
        $existant = $this->db->un('SELECT id, stock_qty FROM products WHERE id = :id', [':id' => $id]);
        if ($existant === null) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$id} ».");
        }

        // UPDATE atomique et conditionnel dans une transaction d'écriture.
        // :delta1 et :delta2 ont la même valeur mais des noms distincts
        // (obligation MySQL avec ATTR_EMULATE_PREPARES=false).
        $n = 0;
        $this->db->transaction(function (Db $d) use ($id, $delta, &$n): void {
            $n = $d->run(
                'UPDATE products
                    SET stock_qty = stock_qty + :delta1
                  WHERE id = :id
                    AND stock_qty + :delta2 >= 0',
                [':id' => $id, ':delta1' => $delta, ':delta2' => $delta],
            )->rowCount();
        });

        if ($n === 0) {
            // L'existence a déjà été vérifiée : la seule cause restante est un
            // stock insuffisant (stock_qty + delta < 0).
            $actuel = (int) $this->db->valeur(
                'SELECT stock_qty FROM products WHERE id = :id',
                [':id' => $id],
            );

            throw new ApiException(
                409,
                'STOCK_INSUFFISANT',
                "Stock insuffisant pour le produit « {$id} » : "
                . "stock actuel {$actuel}, delta demandé {$delta}. "
                . 'Le stock ne peut pas devenir négatif.',
            );
        }

        $nouveauStock = (int) $this->db->valeur(
            'SELECT stock_qty FROM products WHERE id = :id',
            [':id' => $id],
        );

        return Reponse::ok(['stockQty' => $nouveauStock]);
    }

    // -----------------------------------------------------------------
    // Filtres
    // -----------------------------------------------------------------

    /**
     * Construit le WHERE. Chaque valeur est un paramètre lié, jamais du texte.
     *
     * @return array{0:string[],1:array<string,mixed>}
     */
    private function filtres(Requete $r): array
    {
        $where = [];
        $params = [];

        if (($v = $r->query('category')) !== null) {
            $where[] = 'category = :category';
            $params[':category'] = $v;
        }
        if (($v = $r->query('brand')) !== null) {
            $where[] = 'brand = :brand';
            $params[':brand'] = $v;
        }
        if (($v = $r->query('stock')) !== null) {
            if (!in_array($v, ['in', 'low', 'out'], true)) {
                throw ApiException::validation('Filtre invalide.', [
                    'stock' => ['Valeurs acceptées : in, low, out.'],
                ]);
            }
            $where[] = 'stock = :stock';
            $params[':stock'] = $v;
        }
        if (($v = $r->queryInt('minPrice')) !== null) {
            $where[] = 'price >= :minPrice';
            $params[':minPrice'] = $v;
        }
        if (($v = $r->queryInt('maxPrice')) !== null) {
            $where[] = 'price <= :maxPrice';
            $params[':maxPrice'] = $v;
        }
        if (($v = $r->queryBool('bestSeller')) !== null) {
            $where[] = 'best_seller = :bestSeller';
            $params[':bestSeller'] = $v ? 1 : 0;
        }
        if (($v = $r->queryBool('sale')) !== null) {
            $where[] = 'sale = :sale';
            $params[':sale'] = $v ? 1 : 0;
        }

        // `use_tags` est un tableau JSON : `["gaming","edit"]`. Le LIKE sur la
        // forme sérialisée est la seule écriture portable — `JSON_CONTAINS`
        // existe en MySQL, pas en SQLite, et `json_each` l'inverse.
        // Le guillemet englobant évite que « work » matche « network ».
        if (($v = $r->query('use')) !== null) {
            $where[] = 'use_tags LIKE :use';
            $params[':use'] = '%"' . $this->echapperLike($v) . '"%';
        }

        // Recherche plein texte pauvre mais portable. `name` et `spec_line`
        // sont du JSON localisé : on cherche dans la forme sérialisée, ce qui
        // couvre les trois langues d'un coup.
        //
        // PIÈGE À CONNAÎTRE avant de recopier ce contrôleur : avec
        // `ATTR_EMULATE_PREPARES = false`, MySQL REFUSE qu'un même paramètre
        // nommé apparaisse deux fois dans une requête (« Invalid parameter
        // number »), là où SQLite l'accepte. Un placeholder DISTINCT par
        // occurrence, toujours — sinon la route marche en SQLite et tombe en
        // MySQL, c'est-à-dire en production.
        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[] = '(LOWER(name) LIKE :search1 OR LOWER(brand) LIKE :search2 OR LOWER(spec_line) LIKE :search3)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
            $params[':search3'] = $motif;
        }

        return [$where, $params];
    }

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    // -----------------------------------------------------------------
    // Validation et normalisation du corps de requête
    // -----------------------------------------------------------------

    /**
     * Valide et normalise les champs reçus dans le corps de la requête.
     * En mode PATCH, `$existant` contient la ligne actuelle : les champs
     * absents du corps conservent leur valeur courante.
     *
     * Retourne un tableau colonne → valeur prêt à insérer/mettre à jour.
     *
     * @param array<string,mixed>|null $existant  Ligne SQL courante (PATCH) ou null (POST)
     * @return array<string,mixed>
     */
    private function validerEtNormaliser(Requete $r, ?array $existant): array
    {
        $estCreation = $existant === null;

        // --- Champs obligatoires en création ---
        $nameRaw = $r->corps('name', $existant ? Db::dejson($existant['name'], '') : null);
        if ($estCreation && $nameRaw === null) {
            throw ApiException::validation('Produit invalide.', ['name' => ['Champ obligatoire.']]);
        }

        $category = $r->corps('category', $existant['category'] ?? null);
        if ($estCreation && ($category === null || trim((string) $category) === '')) {
            throw ApiException::validation('Produit invalide.', ['category' => ['Champ obligatoire.']]);
        }

        // --- id (création uniquement si non fourni) ---
        if ($estCreation) {
            $idFourni = $r->corps('id');
            $id = $idFourni !== null && trim((string) $idFourni) !== ''
                ? strtolower(trim((string) $idFourni))
                : strtolower(preg_replace('/[^a-z0-9]+/i', '-', (string) $nameRaw) ?? '');
        } else {
            $id = (string) $existant['id'];
        }

        // --- Prix ---
        $price = $r->corps('price', $existant['price'] ?? null);
        if ($estCreation && $price === null) {
            throw ApiException::validation('Produit invalide.', ['price' => ['Champ obligatoire.']]);
        }
        if ($price !== null && (!is_numeric($price) || (int) $price < 0)) {
            throw ApiException::validation('Produit invalide.', ['price' => ['Doit être un entier positif en DZD.']]);
        }

        // --- Statut de stock ---
        $stock = (string) $r->corps('stock', $existant['stock'] ?? 'in');
        if (!in_array($stock, self::STOCK_STATUTS, true)) {
            throw ApiException::validation('Produit invalide.', [
                'stock' => ['Valeurs acceptées : in, low, out.'],
            ]);
        }

        // --- Champs JSON localisés (Localized<string>) ---
        // On encode avec Db::json() : l'appelant peut passer une chaîne simple
        // (monolingue français) ou un objet { fr, en?, ar? } — les deux sont
        // valides selon LOCALIZED-DATA.md §1.
        $nameEncode = Db::json($nameRaw ?? Db::dejson($existant['name'] ?? null, ''));

        $specLineRaw = $r->corps('specLine', null)
            ?? ($existant ? Db::dejson($existant['spec_line'], null) : null);
        $specLineEncode = $specLineRaw !== null ? Db::json($specLineRaw) : null;

        $specsRaw = $r->corps('specs', null)
            ?? ($existant ? Db::dejson($existant['specs'], null) : null);
        $specsEncode = $specsRaw !== null ? Db::json($specsRaw) : null;

        $useRaw = $r->corps('use', null)
            ?? ($existant ? Db::dejson($existant['use_tags'], []) : []);
        $useEncode = Db::json($useRaw ?? []);

        // --- Champs simples ---
        $brand     = (string) $r->corps('brand', $existant['brand'] ?? '');
        $image     = (string) $r->corps('image', $existant['image'] ?? '');
        $stockQty  = $r->corps('stockQty') !== null ? (int) $r->corps('stockQty') : ($existant['stock_qty'] ?? null);
        $oldPrice  = $r->corps('oldPrice') !== null ? (int) $r->corps('oldPrice') : ($existant['old_price'] ?? null);

        $bestSeller = $r->corps('bestSeller') !== null
            ? ($r->corps('bestSeller') ? 1 : 0)
            : (int) ($existant['best_seller'] ?? 0);
        $sale = $r->corps('sale') !== null
            ? ($r->corps('sale') ? 1 : 0)
            : (int) ($existant['sale'] ?? 0);
        $customBuild = $r->corps('customBuild') !== null
            ? ($r->corps('customBuild') ? 1 : 0)
            : (int) ($existant['custom_build'] ?? 0);

        $donnees = [
            'id'           => $id,
            'name'         => $nameEncode,
            'brand'        => $brand,
            'category'     => (string) ($category ?? ''),
            'use_tags'     => $useEncode,
            'spec_line'    => $specLineEncode,
            'specs'        => $specsEncode,
            'price'        => $price !== null ? (int) $price : 0,
            'old_price'    => $oldPrice,
            'stock'        => $stock,
            'stock_qty'    => $stockQty,
            'image'        => $image,
            'best_seller'  => $bestSeller,
            'sale'         => $sale,
            'custom_build' => $customBuild,
        ];

        // En mode PATCH, ne renvoyer que les colonnes qui ont été modifiées
        // (celles dont la valeur diffère ou dont le corps fourni est non-null).
        // Simplification : on renvoie toutes les colonnes ; l'UPDATE
        // les écrasera avec leur valeur actuelle pour les non-fournis, ce qui
        // est correct (validerEtNormaliser les a déjà hydratés depuis $existant).
        return $donnees;
    }

    // -----------------------------------------------------------------
    // Mapping ligne SQL → DTO du contrat
    // -----------------------------------------------------------------

    /**
     * Rend EXACTEMENT le type `Product` de `src/data/products.ts`.
     *
     * Points de vigilance recopiés par les autres ressources :
     *   - snake_case en base, camelCase dans le DTO ;
     *   - les colonnes JSON sont décodées, jamais rendues en chaîne ;
     *   - les booléens 0/1 redeviennent de vrais booléens ;
     *   - les champs optionnels du type TS sont OMIS quand ils sont nuls,
     *     pas rendus à `null` : `oldPrice?: number` n'accepte pas `null`.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'id' => (string) $l['id'],
            'name' => Db::dejson($l['name'], ''),
            'brand' => (string) $l['brand'],
            'category' => (string) $l['category'],
            'use' => Db::dejson($l['use_tags'], []),
            'specLine' => Db::dejson($l['spec_line'], ''),
            'specs' => Db::dejson($l['specs'], (object) []),
            'price' => (int) $l['price'],
            'stock' => (string) $l['stock'],
            'image' => (string) $l['image'],
            // Agrégat des avis approuvés (cf. self::SELECTION). Toujours rendu,
            // même à zéro : la carte produit doit pouvoir distinguer « aucun
            // avis » d'un champ absent, sans avoir à interroger la liste
            // d'administration `GET /reviews`. `AVG()` rend NULL sur un
            // ensemble vide, d'où le repli à 0.
            'rating' => [
                'average' => round((float) ($l['reviews_average'] ?? 0), 2),
                'count' => (int) ($l['reviews_count'] ?? 0),
            ],
        ];

        if ($l['old_price'] !== null) {
            $dto['oldPrice'] = (int) $l['old_price'];
        }
        if ($l['stock_qty'] !== null) {
            $dto['stockQty'] = (int) $l['stock_qty'];
        }
        if ((int) $l['best_seller'] === 1) {
            $dto['bestSeller'] = true;
        }
        if ((int) $l['sale'] === 1) {
            $dto['sale'] = true;
        }
        if ((int) $l['custom_build'] === 1) {
            $dto['customBuild'] = true;
        }

        return $dto;
    }
}
