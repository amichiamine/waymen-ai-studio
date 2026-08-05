<?php

/**
 * Avis clients — CRUD + modération.
 *
 * Deux chemins de lecture bien distincts :
 *   - Route publique  : GET /products/:id/reviews — UNIQUEMENT les avis approuvés.
 *   - Route admin     : GET /reviews              — tous les avis, filtrables par statut.
 *
 * Sécurité notes :
 *   - Requêtes préparées exclusivement (zéro concaténation de valeurs).
 *   - `product_name` est une EMPREINTE historique (chaîne simple, résolue à l'écriture).
 *   - Piège n°1 du dialecte MySQL/SQLite : un paramètre nommé NE PEUT PAS
 *     apparaître deux fois dans la même requête (ATTR_EMULATE_PREPARES=false).
 *     → Chaque occurrence du même motif LIKE reçoit un placeholder distinct.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurAvis
{
    /** Statuts valides pour la modération. */
    private const STATUTS = ['pending', 'approved', 'rejected'];

    /** Colonnes triables depuis l'URL. */
    private const TRIS = [
        'rating'    => 'rating',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    // ----------------------------------------------------------------
    // Routes admin — tous les avis, filtrables
    // ----------------------------------------------------------------

    /**
     * GET /reviews
     *
     * Paramètres facultatifs :
     *   - productId : filtrer par produit
     *   - status    : pending | approved | rejected
     *   - search    : recherche dans customer_name et body
     *   - sort, order, page, perPage
     */
    public function lister(Requete $r): Reponse
    {
        [$where, $params] = $this->filtresAdmin($r);
        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM reviews{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT id, product_id, product_name, customer_name, rating, title, body, status, created_at, updated_at"
            . " FROM reviews{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    // ----------------------------------------------------------------
    // Route publique — avis d'un produit (approuvés uniquement)
    // ----------------------------------------------------------------

    /**
     * GET /products/:id/reviews
     *
     * Ne renvoie QUE les avis approuvés — les avis pending/rejected restent
     * invisibles pour les visiteurs. Le filtre est codé en dur dans le WHERE,
     * jamais contrôlé par l'utilisateur.
     */
    public function listerParProduit(Requete $r): Reponse
    {
        $productId = $r->param('id');
        $p = Pagination::depuis($r);
        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        // Filtre statique approuvé — jamais remplacé par l'entrée utilisateur.
        $params = [':product_id' => $productId, ':status' => 'approved'];

        $total = (int) $this->db->valeur(
            'SELECT COUNT(*) FROM reviews WHERE product_id = :product_id AND status = :status',
            $params,
        );

        $lignes = $this->db->tous(
            "SELECT id, product_id, product_name, customer_name, rating, title, body, status, created_at, updated_at"
            . " FROM reviews WHERE product_id = :product_id2 AND status = :status2"
            . " ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            // Placeholders distincts — piège n°1 MySQL ATTR_EMULATE_PREPARES=false.
            [
                ':product_id2' => $productId,
                ':status2'     => 'approved',
                ':limite'      => $p->perPage,
                ':decalage'    => $p->offset(),
            ],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    // ----------------------------------------------------------------
    // Création par un client
    // ----------------------------------------------------------------

    /**
     * POST /products/:id/reviews
     *
     * Corps attendu : { customerName, rating, title?, body }
     *
     * L'avis est créé en statut `pending` — il n'est pas visible publiquement
     * avant approbation par un administrateur.
     *
     * `product_name` est une EMPREINTE : la chaîne est résolue ici à l'écriture
     * depuis le nom courant du produit. Si le produit est renommé demain, l'avis
     * conserve le nom qu'il avait au moment où il a été déposé.
     */
    public function creer(Requete $r): Reponse
    {
        $productId = $r->param('id');

        // Vérifier que le produit existe et récupérer son nom (empreinte).
        $produit = $this->db->un(
            'SELECT id, name FROM products WHERE id = :id',
            [':id' => $productId],
        );
        if ($produit === null) {
            throw ApiException::introuvable("Aucun produit ne porte l'identifiant « {$productId} ».");
        }

        // `product_name` est une chaîne simple — on résout la langue française
        // si c'est du JSON localisé, sinon on prend la valeur telle quelle.
        $nomBrut = $produit['name'];
        $nomDecode = Db::dejson($nomBrut, $nomBrut);
        if (is_array($nomDecode)) {
            $productName = (string) ($nomDecode['fr'] ?? $nomDecode['en'] ?? reset($nomDecode) ?? $nomBrut);
        } else {
            $productName = (string) $nomDecode;
        }

        // Validation des champs obligatoires.
        $erreurs = [];
        $customerName = trim((string) $r->corps('customerName', ''));
        if ($customerName === '') {
            $erreurs['customerName'] = ['Champ obligatoire.'];
        }

        $rating = (int) $r->corps('rating', 0);
        if ($rating < 1 || $rating > 5) {
            $erreurs['rating'] = ['Valeur entre 1 et 5 attendue.'];
        }

        $body = trim((string) $r->corps('body', ''));
        if ($body === '') {
            $erreurs['body'] = ['Champ obligatoire.'];
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Avis invalide.', $erreurs);
        }

        $title = trim((string) $r->corps('title', ''));
        $maintenant = gmdate('c');
        $id = bin2hex(random_bytes(8));

        $this->db->transaction(fn (Db $d) => $d->inserer('reviews', [
            'id'            => $id,
            'product_id'    => $productId,
            'product_name'  => $productName,
            'customer_name' => $customerName,
            'rating'        => $rating,
            'title'         => $title,
            'body'          => $body,
            'status'        => 'pending',
            'created_at'    => $maintenant,
            'updated_at'    => $maintenant,
        ]));

        $avis = $this->db->un(
            'SELECT id, product_id, product_name, customer_name, rating, title, body, status, created_at, updated_at'
            . ' FROM reviews WHERE id = :id',
            [':id' => $id],
        );

        return Reponse::cree($this->enDto((array) $avis));
    }

    // ----------------------------------------------------------------
    // Modération — approuver ou rejeter
    // ----------------------------------------------------------------

    /**
     * PATCH /reviews/:id/status
     *
     * Corps : { status: "approved" | "rejected" }
     *
     * Seule la transition de statut est modifiable par cette route ;
     * le contenu de l'avis ne peut pas être altéré ici.
     */
    public function moderer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $statut = trim((string) $r->corps('status', ''));
        if (!in_array($statut, self::STATUTS, true)) {
            throw ApiException::validation('Statut invalide.', [
                'status' => ['Valeurs acceptées : pending, approved, rejected.'],
            ]);
        }

        $maintenant = gmdate('c');

        $n = $this->db->run(
            'UPDATE reviews SET status = :status, updated_at = :updated_at WHERE id = :id',
            [':status' => $statut, ':updated_at' => $maintenant, ':id' => $id],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun avis ne porte l'identifiant « {$id} ».");
        }

        $avis = $this->db->un(
            'SELECT id, product_id, product_name, customer_name, rating, title, body, status, created_at, updated_at'
            . ' FROM reviews WHERE id = :id',
            [':id' => $id],
        );

        return Reponse::ok($this->enDto((array) $avis));
    }

    // ----------------------------------------------------------------
    // Suppression
    // ----------------------------------------------------------------

    /**
     * DELETE /reviews/:id
     *
     * Suppression définitive d'un avis. Renvoie 204 sans corps.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $n = $this->db->run(
            'DELETE FROM reviews WHERE id = :id',
            [':id' => $id],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun avis ne porte l'identifiant « {$id} ».");
        }

        return Reponse::vide();
    }

    // ----------------------------------------------------------------
    // Filtres admin
    // ----------------------------------------------------------------

    /**
     * Construit la clause WHERE pour la route admin GET /reviews.
     *
     * Chaque valeur est un paramètre lié, jamais du texte interpolé.
     *
     * @return array{0:string[],1:array<string,mixed>}
     */
    private function filtresAdmin(Requete $r): array
    {
        $where  = [];
        $params = [];

        if (($v = $r->query('productId')) !== null) {
            $where[]              = 'product_id = :product_id';
            $params[':product_id'] = $v;
        }

        if (($v = $r->query('status')) !== null) {
            if (!in_array($v, self::STATUTS, true)) {
                throw ApiException::validation('Filtre invalide.', [
                    'status' => ['Valeurs acceptées : pending, approved, rejected.'],
                ]);
            }
            $where[]           = 'status = :status';
            $params[':status'] = $v;
        }

        // Piège n°1 — MySQL refuse un paramètre nommé réutilisé.
        // :search1 et :search2 sont deux placeholders distincts portant la même valeur.
        if (($v = $r->query('search')) !== null) {
            $motif               = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[]             = '(LOWER(customer_name) LIKE :search1 OR LOWER(body) LIKE :search2)';
            $params[':search1']  = $motif;
            $params[':search2']  = $motif;
        }

        return [$where, $params];
    }

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    // ----------------------------------------------------------------
    // Mapping ligne SQL → DTO du contrat
    // ----------------------------------------------------------------

    /**
     * Convertit une ligne SQL en tableau conforme au contrat.
     *
     * snake_case → camelCase, 0/1 → booléens, champs optionnels omis si nuls.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'id'           => (string) $l['id'],
            'productId'    => (string) $l['product_id'],
            'productName'  => (string) $l['product_name'],
            'customerName' => (string) $l['customer_name'],
            'rating'       => (int) $l['rating'],
            'body'         => (string) $l['body'],
            'status'       => (string) $l['status'],
            'createdAt'    => (string) $l['created_at'],
            'updatedAt'    => (string) $l['updated_at'],
        ];

        if (isset($l['title']) && (string) $l['title'] !== '') {
            $dto['title'] = (string) $l['title'];
        }

        return $dto;
    }
}
