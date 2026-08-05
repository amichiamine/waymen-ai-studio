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
        $sql = "SELECT * FROM products{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage";

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
        $ligne = $this->db->un('SELECT * FROM products WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
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
