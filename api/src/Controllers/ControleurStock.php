<?php

/**
 * Stock — mouvements et ajustement atomique.
 *
 * Routes à câbler (INTERDIT de modifier api/routes.php ici — l'orchestrateur s'en charge) :
 *   GET  /inventory/movements             → lister()
 *   POST /inventory/:productId/adjust     → ajuster()
 *
 * Point critique : ajuster() ouvre une transaction `beginWrite()` et exécute
 * l'UPDATE en une seule opération atomique. Le mouvement de stock est écrit dans
 * la MÊME transaction. Aucune lecture préalable du stock : cela empêche la
 * survente sous concurrence. Si rowCount() = 0 après l'UPDATE, c'est un refus
 * métier (stock insuffisant), pas une panne — la transaction est annulée et
 * AUCUN mouvement n'est enregistré.
 *
 * Piège évité : MySQL refuse un paramètre nommé réutilisé avec
 * ATTR_EMULATE_PREPARES=false. La requête emploie :delta et :delta2 (identiques
 * en valeur, distincts en nom) pour contourner ce comportement.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurStock
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'createdAt' => 'created_at',
        'delta'     => 'delta',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /inventory/movements
     * → { data: { items, total, page, perPage } }
     *
     * Filtre : productId (optionnel).
     */
    public function lister(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        if (($v = $r->query('productId')) !== null) {
            $where[]            = 'product_id = :productId';
            $params[':productId'] = $v;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p      = Pagination::depuis($r);

        // Le total utilise EXACTEMENT le même WHERE que la page.
        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM stock_movements{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM stock_movements{$clause}
             ORDER BY {$colonne} {$sens}, id ASC
             LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDtoMouvement'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * POST /inventory/:productId/adjust
     * Corps attendu : { "delta": <entier>, "reason": <chaîne> }
     *
     * Transaction atomique :
     *  1. UPDATE products SET stock_qty = stock_qty + :delta
     *       WHERE id = :id AND stock_qty + :delta2 >= 0
     *  2. Si rowCount() == 0 → refus métier (stock insuffisant), ROLLBACK.
     *  3. Sinon, INSERT dans stock_movements.
     *  4. COMMIT.
     *
     * Le `product_name` est une empreinte historique résolue à l'écriture
     * (chaîne simple, jamais du JSON multilingue — décision phase 3).
     */
    public function ajuster(Requete $r): Reponse
    {
        $productId = $r->param('productId');

        // Validation du delta
        $deltaRaw = $r->corps('delta');
        if (!is_int($deltaRaw) && !(is_numeric($deltaRaw) && is_string($deltaRaw))) {
            throw ApiException::validation('Ajustement invalide.', [
                'delta' => ['Le champ delta est obligatoire et doit être un entier.'],
            ]);
        }
        $delta = (int) $deltaRaw;
        if ($delta === 0) {
            throw ApiException::validation('Ajustement invalide.', [
                'delta' => ['Le delta ne peut pas être zéro.'],
            ]);
        }

        $raison = trim((string) $r->corps('reason', ''));
        if ($raison === '') {
            throw ApiException::validation('Ajustement invalide.', [
                'reason' => ['La raison est obligatoire.'],
            ]);
        }

        // Vérifier l'existence du produit avant d'ouvrir la transaction.
        $produit = $this->db->un(
            'SELECT id, name, stock_qty FROM products WHERE id = :id',
            [':id' => $productId],
        );
        if ($produit === null) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$productId} ».");
        }

        // Résolution du nom à l'écriture : empreinte historique en chaîne simple.
        // `name` est une colonne JSON multilingue ; on résout en français (priorité fr).
        $nomBrut  = Db::dejson($produit['name'], '');
        $nomEmpreinte = is_array($nomBrut) ? (string) ($nomBrut['fr'] ?? $nomBrut['en'] ?? reset($nomBrut)) : (string) $nomBrut;

        $maintenant = gmdate('c');
        $mouvementId = bin2hex(random_bytes(16));

        $this->db->beginWrite();
        try {
            // UPDATE atomique. Deux noms de paramètre distincts pour le delta
            // car MySQL (ATTR_EMULATE_PREPARES=false) interdit la réutilisation
            // d'un même paramètre nommé dans une requête préparée.
            $affectes = $this->db->run(
                'UPDATE products
                 SET stock_qty = stock_qty + :delta,
                     updated_at = :updatedAt
                 WHERE id = :id
                   AND (stock_qty IS NOT NULL)
                   AND stock_qty + :delta2 >= 0',
                [
                    ':delta'     => $delta,
                    ':delta2'    => $delta,
                    ':id'        => $productId,
                    ':updatedAt' => $maintenant,
                ],
            )->rowCount();

            if ($affectes === 0) {
                // Refus métier : l'ajustement rendrait le stock négatif (ou
                // stock_qty IS NULL). Transaction annulée, aucun mouvement écrit.
                $this->db->rollback();

                throw new ApiException(
                    409,
                    'STOCK_INSUFFISANT',
                    "L'ajustement de {$delta} unité(s) rendrait le stock négatif ou "
                    . "le produit n'a pas de suivi de stock_qty. Opération annulée."
                );
            }

            // Mouvement écrit dans la même transaction.
            $this->db->inserer('stock_movements', [
                'id'           => $mouvementId,
                'product_id'   => $productId,
                'product_name' => $nomEmpreinte,
                'delta'        => $delta,
                'reason'       => $raison,
                'created_at'   => $maintenant,
            ]);

            $this->db->commit();
        } catch (ApiException $e) {
            // Refus métier : déjà annulé ci-dessus, on relance proprement.
            $this->db->rollback();

            throw $e;
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        // Relecture du produit pour renvoyer le stock mis à jour.
        $produitMaj = $this->db->un(
            'SELECT stock_qty FROM products WHERE id = :id',
            [':id' => $productId],
        );

        return Reponse::ok([
            'mouvement' => [
                'id'          => $mouvementId,
                'productId'   => $productId,
                'productName' => $nomEmpreinte,
                'delta'       => $delta,
                'reason'      => $raison,
                'createdAt'   => $maintenant,
            ],
            'stockQty' => $produitMaj !== null ? (int) $produitMaj['stock_qty'] : null,
        ]);
    }

    // -----------------------------------------------------------------
    // Mapping ligne SQL → DTO du contrat
    // -----------------------------------------------------------------

    /**
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDtoMouvement(array $l): array
    {
        return [
            'id'          => (string) $l['id'],
            'productId'   => (string) $l['product_id'],
            'productName' => (string) $l['product_name'],
            'delta'       => (int) $l['delta'],
            'reason'      => (string) $l['reason'],
            'createdAt'   => (string) $l['created_at'],
        ];
    }
}
