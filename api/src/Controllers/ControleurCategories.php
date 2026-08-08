<?php

/**
 * Catégories — contrôleur CRUD complet.
 *
 * Ressource identifiée par `slug` (clé primaire de la table `categories`).
 * Modèle copié de ControleurProduits (pilote validé — vague 4.1).
 *
 * Garde métier côté serveur : suppression interdite si au moins un produit
 * est rattaché à la catégorie. Le frontend fait la même vérification, mais
 * un client HTTP brut peut contourner l'interface ; le serveur est la dernière
 * ligne de défense.
 *
 * Champs `label` et `description` : chaînes simples, PAS de JSON localisé.
 * Décision de la vague 4.1 documentée dans docs/BACKEND.md §9 — AdminCategory
 * les déclare en `string` nu dans src/lib/admin-store.tsx. Ne pas les passer
 * par Db::json() / Db::dejson().
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurCategories
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'position' => 'position',
        'label'    => 'label',
        'createdAt' => 'created_at',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /categories
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where = [];
        $params = [];

        if (($v = $r->query('search')) !== null) {
            // PIÈGE DIALECTE : un même paramètre nommé ne peut pas apparaître
            // deux fois avec ATTR_EMULATE_PREPARES=false (MySQL). Utiliser
            // :search1 et :search2 comme dans le pilote ControleurProduits.
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[] = '(LOWER(label) LIKE :search1 OR LOWER(description) LIKE :search2)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM categories{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'position');
        $sens = Db::sens($r->query('order'), 'ASC');

        $lignes = $this->db->tous(
            "SELECT * FROM categories{$clause} ORDER BY {$colonne} {$sens}, slug ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * GET /categories/:slug
     * → { data: Category } ou 404 enveloppé.
     */
    public function detail(Requete $r): Reponse
    {
        $slug = $r->param('slug');
        $ligne = $this->db->un('SELECT * FROM categories WHERE slug = :slug', [':slug' => $slug]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucune catégorie ne porte le slug « {$slug} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    /**
     * POST /categories
     * → 201 { data: Category }
     */
    public function creer(Requete $r): Reponse
    {
        [$slug, $label, $description, $cover, $position] = $this->validerCorps($r);

        $maintenant = gmdate('c');

        $this->db->transaction(fn (Db $d) => $d->upsert('categories', [
            'slug'        => $slug,
            'label'       => $label,
            'description' => $description,
            'cover'       => $cover,
            'position'    => $position,
            'created_at'  => $maintenant,
            'updated_at'  => $maintenant,
        ], ['slug'], ['label', 'description', 'cover', 'position', 'updated_at']));

        Journal::consigner($this->db, 'categorie_creee', 'category', ['slug' => $slug, 'label' => $label]);

        return Reponse::cree($this->enDto(
            (array) $this->db->un('SELECT * FROM categories WHERE slug = :slug', [':slug' => $slug])
        ));
    }

    /**
     * PATCH /categories/:slug
     * → 200 { data: Category }
     */
    public function modifier(Requete $r): Reponse
    {
        $slug = $r->param('slug');

        // Vérifier l'existence avant la mise à jour.
        $existant = $this->db->un('SELECT * FROM categories WHERE slug = :slug', [':slug' => $slug]);
        if ($existant === null) {
            throw ApiException::introuvable("Aucune catégorie ne porte le slug « {$slug} ».");
        }

        // Fusion PATCH : seuls les champs fournis écrasent l'existant.
        $label       = trim((string) $r->corps('label', $existant['label']));
        $description = trim((string) $r->corps('description', $existant['description']));
        $cover       = $r->corps('cover') !== null ? (string) $r->corps('cover') : $existant['cover'];
        $position    = $r->corps('position') !== null ? (int) $r->corps('position') : (int) $existant['position'];

        if ($label === '') {
            throw ApiException::validation('Catégorie invalide.', ['label' => ['Champ obligatoire.']]);
        }

        $maintenant = gmdate('c');

        $this->db->run(
            'UPDATE categories SET label = :label, description = :description, cover = :cover,
             position = :position, updated_at = :updated_at WHERE slug = :slug',
            [
                ':label'       => $label,
                ':description' => $description,
                ':cover'       => $cover,
                ':position'    => $position,
                ':updated_at'  => $maintenant,
                ':slug'        => $slug,
            ],
        );

        Journal::consigner($this->db, 'categorie_modifiee', 'category', ['slug' => $slug]);

        return Reponse::ok($this->enDto(
            (array) $this->db->un('SELECT * FROM categories WHERE slug = :slug', [':slug' => $slug])
        ));
    }

    /**
     * DELETE /categories/:slug
     * → 204 sans corps.
     *
     * GARDE MÉTIER : refus si au moins un produit utilise cette catégorie.
     * Le frontend effectue la même vérification, mais tout client HTTP brut
     * peut contourner l'interface — la protection doit vivre sur le serveur.
     */
    public function supprimer(Requete $r): Reponse
    {
        $slug = $r->param('slug');

        // Garde métier : présence de produits rattachés.
        $nb = (int) $this->db->valeur(
            'SELECT COUNT(*) FROM products WHERE category = :slug',
            [':slug' => $slug],
        );
        if ($nb > 0) {
            throw new ApiException(
                409,
                'CATEGORY_IN_USE',
                "Impossible de supprimer la catégorie « {$slug} » : {$nb} produit(s) y sont encore rattaché(s). "
                . 'Réaffectez ou supprimez ces produits avant de supprimer la catégorie.',
            );
        }

        $n = $this->db->run(
            'DELETE FROM categories WHERE slug = :slug',
            [':slug' => $slug],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucune catégorie ne porte le slug « {$slug} ».");
        }

        Journal::consigner($this->db, 'categorie_supprimee', 'category', ['slug' => $slug]);

        return Reponse::vide();
    }

    // -----------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------

    /**
     * Extrait et valide les champs obligatoires du corps de la requête.
     *
     * @return array{0:string,1:string,2:string,3:string|null,4:int}
     */
    private function validerCorps(Requete $r): array
    {
        $label = trim((string) $r->corps('label', ''));
        if ($label === '') {
            throw ApiException::validation('Catégorie invalide.', ['label' => ['Champ obligatoire.']]);
        }

        $description = trim((string) $r->corps('description', ''));

        // Le slug peut être fourni ; sinon on le dérive du label.
        $slug = $r->corps('slug') !== null
            ? strtolower(trim((string) $r->corps('slug')))
            : strtolower(preg_replace('/[^a-z0-9]+/i', '-', $label) ?? '');

        if ($slug === '') {
            throw ApiException::validation('Catégorie invalide.', ['slug' => ['Slug invalide ou non dérivable du label.']]);
        }

        $cover    = $r->corps('cover') !== null ? (string) $r->corps('cover') : null;
        $position = (int) $r->corps('position', 0);

        return [$slug, $label, $description, $cover, $position];
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
     * Rend exactement le type `AdminCategory` de `src/lib/admin-store.tsx`.
     *
     * `label` et `description` sont des chaînes simples (pas de JSON
     * localisé), conformément à la décision de vague 4.1 (BACKEND.md §9).
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'slug'        => (string) $l['slug'],
            'label'       => (string) $l['label'],
            'description' => (string) $l['description'],
            'position'    => (int) $l['position'],
        ];

        if ($l['cover'] !== null) {
            $dto['cover'] = (string) $l['cover'];
        }

        return $dto;
    }
}
