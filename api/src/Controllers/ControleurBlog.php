<?php

/**
 * Blog — articles `blog_posts`.
 *
 * Points de vigilance propres à cette ressource :
 *
 *   1. `title`, `excerpt`, `content` sont du JSON localisé (`{ fr, en?, ar? }`).
 *      On décode à la lecture et on encode à l'écriture via `Db::dejson()` /
 *      `Db::json()`. On ne les aplatit jamais.
 *
 *   2. `tags` est aussi un tableau JSON, mais ses valeurs ne sont pas localisées.
 *
 *   3. Le détail accepte un identifiant OU un slug : l'administration navigue
 *      par id, les URL publiques par slug. On tente l'id en premier, puis le
 *      slug, sans réutiliser le même paramètre nommé (piège MySQL §4-1).
 *
 *   4. La liste publique (paramètre `published=1`) ne voit jamais les brouillons.
 *      La liste administrative les inclut tous.
 *
 *   5. Le `slug` est une URL : jamais traduit, jamais du JSON.
 *
 *   6. Piège MySQL : un paramètre nommé ne peut pas apparaître deux fois dans
 *      une même requête avec ATTR_EMULATE_PREPARES=false. Chaque occurrence
 *      reçoit son propre placeholder.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurBlog
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'createdAt'   => 'created_at',
        'updatedAt'   => 'updated_at',
        'publishedAt' => 'published_at',
        'title'       => 'title',
        'author'      => 'author',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /blog
     * → { data: { items, total, page, perPage } }
     *
     * Filtres : `status` (ex. `published`, `draft`), `search`, `sort`, `order`.
     * Paramètre spécial : `published=1` restreint aux articles publiés (chemin
     * public). Sans ce paramètre, tous les statuts sont retournés (chemin admin).
     */
    public function lister(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        // Filtre public : n'expose jamais les brouillons aux visiteurs.
        if ($r->queryBool('published') === true) {
            $where[]             = "status = :status";
            $params[':status']   = 'published';
        } elseif (($v = $r->query('status')) !== null) {
            // Filtre administrateur explicite sur le statut.
            if (!in_array($v, ['published', 'draft', 'archived'], true)) {
                throw ApiException::validation('Statut invalide.', [
                    'status' => ["Valeurs acceptées : published, draft, archived."],
                ]);
            }
            $where[]           = "status = :status";
            $params[':status'] = $v;
        }

        // Recherche dans le JSON sérialisé — couvre les trois langues d'un coup.
        // Deux occurrences du motif → deux placeholders distincts (piège MySQL §4-1).
        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[] = '(LOWER(title) LIKE :search1 OR LOWER(author) LIKE :search2)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM blog_posts{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM blog_posts{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * GET /blog/:slug
     * → { data: BlogPost } ou 404 enveloppé.
     *
     * Accepte un identifiant OU un slug : cherche d'abord par id, puis par slug.
     * Même comportement que `blogApi.detail()` côté client
     * (src/data-provider/blog.ts et src/api/resources/blog.ts).
     *
     * Les deux recherches utilisent des paramètres distincts pour respecter la
     * contrainte MySQL (ATTR_EMULATE_PREPARES=false).
     */
    public function detail(Requete $r): Reponse
    {
        $idOuSlug = $r->param('slug');

        // Recherche par id en premier (chemin admin), puis par slug (chemin public).
        // Note : deux paramètres distincts `:id` et `:slug` — jamais réutilisés.
        $ligne = $this->db->un(
            'SELECT * FROM blog_posts WHERE id = :id OR slug = :slug LIMIT 1',
            [':id' => $idOuSlug, ':slug' => $idOuSlug],
        );

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun article ne correspond à « {$idOuSlug} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    /**
     * POST /blog
     * Corps : BlogPost (tous champs obligatoires).
     * → 201 { data: BlogPost }
     */
    public function creer(Requete $r): Reponse
    {
        [$donnees, $id] = $this->validerEtPreparer($r, null);

        $this->db->transaction(fn (Db $d) => $d->upsert(
            'blog_posts',
            $donnees,
            ['id'],
            ['slug', 'title', 'excerpt', 'content', 'cover', 'author', 'tags', 'status', 'published_at', 'updated_at'],
        ));

        return Reponse::cree($this->enDto(
            (array) $this->db->un('SELECT * FROM blog_posts WHERE id = :id', [':id' => $id])
        ));
    }

    /**
     * PATCH /blog/:slug
     * Corps : champs à mettre à jour (partiels).
     * → 200 { data: BlogPost }
     *
     * Mise à jour partielle des champs localisés :
     * si seule la variante française est envoyée, les variantes anglaise et arabe
     * survivent — on fusionne avec les valeurs existantes avant d'écrire.
     */
    public function mettreAJour(Requete $r): Reponse
    {
        $idOuSlug = $r->param('slug');

        // Recherche par id puis par slug (même logique que detail()).
        $existant = $this->db->un(
            'SELECT * FROM blog_posts WHERE id = :id OR slug = :slug LIMIT 1',
            [':id' => $idOuSlug, ':slug' => $idOuSlug],
        );

        if ($existant === null) {
            throw ApiException::introuvable("Aucun article ne correspond à « {$idOuSlug} ».");
        }

        $maintenant = gmdate('c');
        $maj = ['updated_at' => $maintenant];

        // Slug : jamais JSON, jamais traduit.
        if (($v = $r->corps('slug')) !== null) {
            $slug = trim((string) $v);
            if ($slug === '') {
                throw ApiException::validation('Slug invalide.', ['slug' => ['Le slug ne peut pas être vide.']]);
            }
            $maj['slug'] = $slug;
        }

        // Champs localisés : fusion profonde pour ne pas perdre de traductions.
        foreach (['title', 'excerpt', 'content'] as $champ) {
            if (($v = $r->corps($champ)) !== null) {
                $actuel = Db::dejson($existant[$champ], null);
                $maj[$champ] = Db::json($this->fusionnerLocalise($actuel, $v));
            }
        }

        // Champs scalaires optionnels.
        if (($v = $r->corps('cover')) !== null) {
            $maj['cover'] = $v !== '' ? (string) $v : null;
        }
        if (($v = $r->corps('author')) !== null) {
            $maj['author'] = (string) $v;
        }
        if (($v = $r->corps('tags')) !== null) {
            $maj['tags'] = Db::json(is_array($v) ? $v : []);
        }
        if (($v = $r->corps('status')) !== null) {
            if (!in_array($v, ['published', 'draft', 'archived'], true)) {
                throw ApiException::validation('Statut invalide.', [
                    'status' => ["Valeurs acceptées : published, draft, archived."],
                ]);
            }
            $maj['status'] = (string) $v;
            // Pose published_at à la première publication.
            if ($v === 'published' && $existant['published_at'] === null) {
                $maj['published_at'] = $maintenant;
            }
        }
        if (($v = $r->corps('publishedAt')) !== null) {
            $maj['published_at'] = $v !== '' ? (string) $v : null;
        }

        if (count($maj) === 1) {
            // Seul updated_at : aucun champ métier fourni — on renvoie l'existant.
            return Reponse::ok($this->enDto($existant));
        }

        // Construction de la clause SET avec placeholders distincts par colonne.
        $set = [];
        $params = [];
        foreach ($maj as $col => $val) {
            $placeholder = ':set_' . $col;
            $set[]           = Db::identifiant($col) . " = {$placeholder}";
            $params[$placeholder] = $val;
        }

        $params[':where_id'] = (string) $existant['id'];
        $this->db->transaction(fn (Db $d) => $d->run(
            'UPDATE blog_posts SET ' . implode(', ', $set) . ' WHERE id = :where_id',
            $params,
        ));

        return Reponse::ok($this->enDto(
            (array) $this->db->un('SELECT * FROM blog_posts WHERE id = :id', [':id' => $existant['id']])
        ));
    }

    /**
     * DELETE /blog/:slug
     * → 204
     */
    public function supprimer(Requete $r): Reponse
    {
        $idOuSlug = $r->param('slug');

        $n = $this->db->run(
            'DELETE FROM blog_posts WHERE id = :id OR slug = :slug',
            [':id' => $idOuSlug, ':slug' => $idOuSlug],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable('Article introuvable.');
        }

        return Reponse::vide();
    }

    // -----------------------------------------------------------------------
    // Validation et préparation des données
    // -----------------------------------------------------------------------

    /**
     * Valide le corps de la requête (création) et retourne les données à insérer.
     *
     * @return array{0:array<string,mixed>,1:string}
     */
    private function validerEtPreparer(Requete $r, ?string $idExistant): array
    {
        $erreurs = [];

        // Titre localisé : obligatoire.
        $titre = $r->corps('title');
        if ($titre === null || (is_string($titre) && trim($titre) === '')) {
            $erreurs['title'] = ['Champ obligatoire.'];
        }

        // Slug : URL simple, obligatoire.
        $slug = trim((string) $r->corps('slug', ''));
        if ($slug === '') {
            $erreurs['slug'] = ['Champ obligatoire.'];
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Article invalide.', $erreurs);
        }

        // Identifiant : fourni ou dérivé du slug.
        $id = $idExistant ?? trim((string) $r->corps('id', ''));
        if ($id === '') {
            $id = preg_replace('/[^a-z0-9]+/', '-', mb_strtolower($slug)) ?? $slug;
            $id = trim($id, '-');
        }
        if ($id === '') {
            $id = bin2hex(random_bytes(8));
        }

        $maintenant = gmdate('c');
        $statut = (string) $r->corps('status', 'draft');
        if (!in_array($statut, ['published', 'draft', 'archived'], true)) {
            $statut = 'draft';
        }

        $donnees = [
            'id'           => $id,
            'slug'         => $slug,
            'title'        => Db::json($titre),
            'excerpt'      => Db::json($r->corps('excerpt')),
            'content'      => Db::json($r->corps('content')),
            'cover'        => $r->corps('cover') !== '' ? $r->corps('cover') : null,
            'author'       => (string) $r->corps('author', ''),
            'tags'         => Db::json(is_array($r->corps('tags')) ? $r->corps('tags') : []),
            'status'       => $statut,
            'published_at' => $statut === 'published' ? ($r->corps('publishedAt') ?? $maintenant) : $r->corps('publishedAt'),
            'created_at'   => $maintenant,
            'updated_at'   => $maintenant,
        ];

        return [$donnees, $id];
    }

    // -----------------------------------------------------------------------
    // Mise à jour partielle multilingue
    // -----------------------------------------------------------------------

    /**
     * Fusionne une valeur localisée entrante avec la valeur existante en base.
     *
     * Principe :
     *   - si la nouvelle valeur est une chaîne simple, elle remplace la variante fr
     *     tout en conservant en et ar existants ;
     *   - si c'est un tableau, on fusionne clé par clé : seules les clés présentes
     *     dans la nouvelle valeur sont écrasées.
     *
     * Exemple : existant = { fr: "A", en: "B", ar: "ج" }, entrant = { fr: "A2" }
     *           → résultat = { fr: "A2", en: "B", ar: "ج" }
     *
     * @param mixed $existant Valeur décodée de la base (tableau ou chaîne).
     * @param mixed $entrant  Valeur envoyée par le client.
     * @return mixed
     */
    private function fusionnerLocalise(mixed $existant, mixed $entrant): mixed
    {
        if ($entrant === null) {
            return $existant;
        }

        // L'entrant est une chaîne simple : il remplace uniquement fr.
        if (is_string($entrant)) {
            if (is_array($existant)) {
                return array_merge($existant, ['fr' => $entrant]);
            }

            return $entrant;
        }

        // L'entrant est un objet/tableau localisé : fusion clé par clé.
        if (is_array($entrant)) {
            if (is_array($existant)) {
                return array_merge($existant, $entrant);
            }

            // L'existant était une chaîne simple : on le traite comme { fr: ... }.
            if (is_string($existant)) {
                return array_merge(['fr' => $existant], $entrant);
            }

            return $entrant;
        }

        return $entrant;
    }

    // -----------------------------------------------------------------------
    // Neutralisation des jokers LIKE
    // -----------------------------------------------------------------------

    /** Neutralise `%` et `_` dans une valeur fournie par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    // -----------------------------------------------------------------------
    // Mapping ligne SQL → DTO du contrat
    // -----------------------------------------------------------------------

    /**
     * Rend le type `BlogPost` de `src/api/types.ts`.
     *
     * Points de vigilance :
     *   - snake_case → camelCase ;
     *   - title/excerpt/content sont des JSON localisés, décodés ici ;
     *   - tags est un tableau JSON (non localisé) ;
     *   - published_at et cover sont optionnels (omis si null).
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'id'        => (string) $l['id'],
            'slug'      => (string) $l['slug'],
            'title'     => Db::dejson($l['title'], ''),
            'author'    => (string) $l['author'],
            'tags'      => Db::dejson($l['tags'], []),
            'status'    => (string) $l['status'],
            'createdAt' => (string) $l['created_at'],
            'updatedAt' => (string) $l['updated_at'],
        ];

        if ($l['excerpt'] !== null) {
            $dto['excerpt'] = Db::dejson($l['excerpt'], '');
        }
        if ($l['content'] !== null) {
            $dto['content'] = Db::dejson($l['content'], '');
        }
        if ($l['cover'] !== null) {
            $dto['cover'] = (string) $l['cover'];
        }
        if ($l['published_at'] !== null) {
            $dto['publishedAt'] = (string) $l['published_at'];
        }

        return $dto;
    }
}
