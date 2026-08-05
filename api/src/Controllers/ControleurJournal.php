<?php

/**
 * Journal d'audit — LECTURE SEULE.
 *
 * Aucune route d'écriture n'est exposée ici : les entrées sont insérées
 * par les autres contrôleurs dans la même transaction que le fait métier.
 *
 * Table : audit_logs (id, actor, action, entity, detail TEXT NULL, created_at).
 *
 * Routes :
 *   GET /analytics/audit   — liste paginée et filtrable
 *   GET /analytics/audit/:id — détail d'une entrée
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurJournal
{
    /** Alias de tri public → colonne réelle. */
    private const TRIS = [
        'createdAt' => 'created_at',
        'actor'     => 'actor',
        'action'    => 'action',
        'entity'    => 'entity',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /analytics/audit
     *
     * Filtres :
     *   - search  : portée sur actor, action, entity, detail
     *   - action  : filtre exact sur la colonne action
     *   - entity  : filtre exact sur la colonne entity
     *   - actor   : filtre exact sur la colonne actor
     *   - from    : date ISO-8601 (borne inférieure de created_at)
     *   - to      : date ISO-8601 (borne supérieure de created_at)
     *
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        if (($v = $r->query('action')) !== null) {
            $where[] = 'action = :action';
            $params[':action'] = $v;
        }

        if (($v = $r->query('entity')) !== null) {
            $where[] = 'entity = :entity';
            $params[':entity'] = $v;
        }

        if (($v = $r->query('actor')) !== null) {
            $where[] = 'actor = :actor';
            $params[':actor'] = $v;
        }

        if (($v = $r->query('from')) !== null) {
            $where[] = 'created_at >= :dateFrom';
            $params[':dateFrom'] = $v;
        }

        if (($v = $r->query('to')) !== null) {
            $where[] = 'created_at <= :dateTo';
            $params[':dateTo'] = $v;
        }

        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            // Quatre placeholders distincts : piège MySQL avec ATTR_EMULATE_PREPARES=false.
            $where[] = '(LOWER(actor) LIKE :search1 OR LOWER(action) LIKE :search2 OR LOWER(entity) LIKE :search3 OR LOWER(COALESCE(detail,\'\')) LIKE :search4)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
            $params[':search3'] = $motif;
            $params[':search4'] = $motif;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p      = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM audit_logs{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM audit_logs{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * GET /analytics/audit/:id
     * → { data: AuditEntry } ou 404.
     */
    public function detail(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM audit_logs WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucune entrée d'audit ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    /**
     * Ligne SQL → DTO du contrat.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'id'        => (string) $l['id'],
            'actor'     => (string) $l['actor'],
            'action'    => (string) $l['action'],
            'entity'    => (string) $l['entity'],
            'createdAt' => (string) $l['created_at'],
        ];

        if ($l['detail'] !== null) {
            $dto['detail'] = (string) $l['detail'];
        }

        return $dto;
    }
}
