<?php

/**
 * Marques — contrôleur CRUD complet.
 *
 * La version de docs/BACKEND.md §3.1 ne couvrait que `lister`, `detail`,
 * `creer` et `supprimer`. Cette vague ajoute `modifier` et renforce
 * `supprimer` avec la garde métier côté serveur.
 *
 * Garde métier côté serveur : suppression interdite si au moins un produit
 * est rattaché à la marque. Le frontend fait la même vérification, mais un
 * client HTTP brut peut contourner l'interface ; le serveur est la dernière
 * ligne de défense.
 *
 * Structure copiée sur ControleurProduits (pilote validé — vague 4.1).
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurMarques
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = ['name' => 'name', 'createdAt' => 'created_at'];

    public function __construct(private readonly Db $db)
    {
        try {
            // Migration idempotente exécutée directement sur PDO pour ne pas polluer les journaux d'erreurs
            $this->db->pdo()->exec("ALTER TABLE brands ADD COLUMN logo TEXT");
        } catch (\Throwable) {
            // Colonne déjà présente
        }
    }

    /**
     * GET /brands
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where = [];
        $params = [];

        if (($v = $r->query('search')) !== null) {
            $where[] = 'LOWER(name) LIKE :search';
            $params[':search'] = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
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

    /**
     * GET /brands/:id
     * → { data: Brand } ou 404 enveloppé.
     */
    public function detail(Requete $r): Reponse
    {
        $id = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM brands WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucune marque ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    /**
     * POST /brands
     * → 201 { data: Brand }
     */
    public function creer(Requete $r): Reponse
    {
        $nom = trim((string) $r->corps('name', ''));
        if ($nom === '') {
            throw ApiException::validation('Marque invalide.', ['name' => ['Champ obligatoire.']]);
        }

        $maintenant = gmdate('c');
        $id = $r->corps('id') !== null
            ? strtolower(trim((string) $r->corps('id')))
            : strtolower(preg_replace('/[^a-z0-9]+/i', '-', $nom) ?? '');

        $this->db->transaction(fn (Db $d) => $d->upsert('brands', [
            'id'          => $id,
            'name'        => $nom,
            'description' => $r->corps('description'),
            'country'     => $r->corps('country'),
            'logo'        => $r->corps('logo'),
            'created_at'  => $maintenant,
            'updated_at'  => $maintenant,
        ], ['id'], ['name', 'description', 'country', 'logo', 'updated_at']));

        Journal::consigner($this->db, 'marque_creee', 'brand', ['id' => $id, 'name' => $nom]);

        return Reponse::cree($this->enDto(
            (array) $this->db->un('SELECT * FROM brands WHERE id = :id', [':id' => $id])
        ));
    }

    /**
     * PATCH /brands/:id
     * → 200 { data: Brand }
     */
    public function modifier(Requete $r): Reponse
    {
        $id = $r->param('id');

        // Vérifier l'existence avant la mise à jour.
        $existant = $this->db->un('SELECT * FROM brands WHERE id = :id', [':id' => $id]);
        if ($existant === null) {
            throw ApiException::introuvable("Aucune marque ne porte l'identifiant « {$id} ».");
        }

        // Fusion PATCH : seuls les champs fournis écrasent l'existant.
        $nom         = trim((string) $r->corps('name', $existant['name']));
        $description = $r->corps('description') !== null ? (string) $r->corps('description') : $existant['description'];
        $country     = $r->corps('country') !== null ? (string) $r->corps('country') : $existant['country'];
        $logo        = $r->corps('logo') !== null ? (string) $r->corps('logo') : ($existant['logo'] ?? null);

        if ($nom === '') {
            throw ApiException::validation('Marque invalide.', ['name' => ['Champ obligatoire.']]);
        }

        $maintenant = gmdate('c');

        $this->db->run(
            'UPDATE brands SET name = :name, description = :description, country = :country, logo = :logo,
             updated_at = :updated_at WHERE id = :id',
            [
                ':name'        => $nom,
                ':description' => $description,
                ':country'     => $country,
                ':logo'        => $logo,
                ':updated_at'  => $maintenant,
                ':id'          => $id,
            ],
        );

        Journal::consigner($this->db, 'marque_modifiee', 'brand', ['id' => $id]);

        return Reponse::ok($this->enDto(
            (array) $this->db->un('SELECT * FROM brands WHERE id = :id', [':id' => $id])
        ));
    }

    /**
     * DELETE /brands/:id
     * → 204 sans corps.
     *
     * GARDE MÉTIER : refus si au moins un produit utilise cette marque.
     * Le frontend effectue la même vérification, mais tout client HTTP brut
     * peut contourner l'interface — la protection doit vivre sur le serveur.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        // Garde métier : présence de produits rattachés.
        $nb = (int) $this->db->valeur(
            'SELECT COUNT(*) FROM products WHERE brand = :id',
            [':id' => $id],
        );
        if ($nb > 0) {
            throw new ApiException(
                409,
                'BRAND_IN_USE',
                "Impossible de supprimer la marque « {$id} » : {$nb} produit(s) y sont encore rattaché(s). "
                . 'Réaffectez ou supprimez ces produits avant de supprimer la marque.',
            );
        }

        $n = $this->db->run(
            'DELETE FROM brands WHERE id = :id',
            [':id' => $id],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucune marque ne porte l'identifiant « {$id} ».");
        }

        Journal::consigner($this->db, 'marque_supprimee', 'brand', ['id' => $id]);

        return Reponse::vide();
    }

    // -----------------------------------------------------------------
    // Neutralisation des jokers LIKE
    // -----------------------------------------------------------------

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    // -----------------------------------------------------------------
    // Mapping ligne SQL → DTO du contrat
    // -----------------------------------------------------------------

    /**
     * Rend exactement le type `AdminBrand` de `src/lib/admin-store.tsx`.
     * snake_case → camelCase, champs optionnels OMIS quand ils sont nuls.
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
        if (isset($l['logo']) && $l['logo'] !== null && $l['logo'] !== '') {
            $dto['logo'] = (string) $l['logo'];
        }

        return $dto;
    }
}
