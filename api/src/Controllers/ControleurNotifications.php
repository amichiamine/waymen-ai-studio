<?php

/**
 * Notifications — liste, création, mise à jour (lu / non lu), suppression.
 *
 * Table : notifications (id, title, body, level, is_read INTEGER 0/1,
 *                        link TEXT NULL, created_at TEXT).
 *
 * Niveaux acceptés : info, success, warning, error.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurNotifications
{
    /** Alias de tri public → colonne réelle. */
    private const TRIS = [
        'createdAt' => 'created_at',
        'level'     => 'level',
    ];

    /** Niveaux de notification valides. */
    private const NIVEAUX = ['info', 'success', 'warning', 'error'];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /notifications
     * Filtres : isRead (booléen), level, search.
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        if (($v = $r->queryBool('isRead')) !== null) {
            $where[] = 'is_read = :isRead';
            $params[':isRead'] = $v ? 1 : 0;
        }

        if (($v = $r->query('level')) !== null) {
            if (!in_array($v, self::NIVEAUX, true)) {
                throw ApiException::validation('Niveau invalide.', [
                    'level' => ['Valeurs acceptées : ' . implode(', ', self::NIVEAUX) . '.'],
                ]);
            }
            $where[] = 'level = :level';
            $params[':level'] = $v;
        }

        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            // Paramètres distincts pour éviter le piège MySQL ATTR_EMULATE_PREPARES=false.
            $where[] = '(LOWER(title) LIKE :search1 OR LOWER(body) LIKE :search2)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p      = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM notifications{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM notifications{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * GET /notifications/:id
     * → { data: Notification } ou 404.
     */
    public function detail(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM notifications WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucune notification ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    /**
     * POST /notifications
     * Corps : { title, body, level?, link? }
     * → 201 { data: Notification }
     */
    public function creer(Requete $r): Reponse
    {
        $title = trim((string) $r->corps('title', ''));
        $body  = trim((string) $r->corps('body', ''));

        $erreurs = [];
        if ($title === '') {
            $erreurs['title'] = ['Champ obligatoire.'];
        }
        if ($body === '') {
            $erreurs['body'] = ['Champ obligatoire.'];
        }

        $level = (string) $r->corps('level', 'info');
        if (!in_array($level, self::NIVEAUX, true)) {
            $erreurs['level'] = ['Valeurs acceptées : ' . implode(', ', self::NIVEAUX) . '.'];
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Notification invalide.', $erreurs);
        }

        $id   = $this->genererUuid();
        $link = $r->corps('link');
        $maintenant = gmdate('c');

        $this->db->transaction(function (Db $d) use ($id, $title, $body, $level, $link, $maintenant): void {
            $d->inserer('notifications', [
                'id'         => $id,
                'title'      => $title,
                'body'       => $body,
                'level'      => $level,
                'is_read'    => 0,
                'link'       => $link !== null ? (string) $link : null,
                'created_at' => $maintenant,
            ]);
        });

        $ligne = $this->db->un('SELECT * FROM notifications WHERE id = :id', [':id' => $id]);

        return Reponse::cree($this->enDto((array) $ligne));
    }

    /**
     * PATCH /notifications/:id
     * Corps partiel : { isRead?, title?, body?, level?, link? }
     * → { data: Notification }
     */
    public function mettreAJour(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM notifications WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucune notification ne porte l'identifiant « {$id} ».");
        }

        $set    = [];
        $params = [':id' => $id];

        // Mise à jour du statut lu / non lu.
        $isRead = $r->corps('isRead');
        if ($isRead !== null) {
            $set[] = 'is_read = :isRead';
            $params[':isRead'] = $isRead ? 1 : 0;
        }

        if (($v = $r->corps('title')) !== null) {
            $v = trim((string) $v);
            if ($v === '') {
                throw ApiException::validation('Notification invalide.', ['title' => ['Ne peut pas être vide.']]);
            }
            $set[] = 'title = :title';
            $params[':title'] = $v;
        }

        if (($v = $r->corps('body')) !== null) {
            $v = trim((string) $v);
            if ($v === '') {
                throw ApiException::validation('Notification invalide.', ['body' => ['Ne peut pas être vide.']]);
            }
            $set[] = 'body = :body';
            $params[':body'] = $v;
        }

        if (($v = $r->corps('level')) !== null) {
            if (!in_array($v, self::NIVEAUX, true)) {
                throw ApiException::validation('Notification invalide.', [
                    'level' => ['Valeurs acceptées : ' . implode(', ', self::NIVEAUX) . '.'],
                ]);
            }
            $set[] = 'level = :level';
            $params[':level'] = $v;
        }

        if (array_key_exists('link', $r->corps)) {
            $set[] = 'link = :link';
            $params[':link'] = $r->corps('link');
        }

        if ($set === []) {
            // Aucun champ fourni : renvoi de la ressource telle quelle.
            return Reponse::ok($this->enDto($ligne));
        }

        $this->db->run(
            'UPDATE notifications SET ' . implode(', ', $set) . ' WHERE id = :id',
            $params,
        );

        $ligne = $this->db->un('SELECT * FROM notifications WHERE id = :id', [':id' => $id]);

        return Reponse::ok($this->enDto((array) $ligne));
    }

    /**
     * DELETE /notifications/:id
     * → 204, sans corps.
     */
    public function supprimer(Requete $r): Reponse
    {
        $n = $this->db->run(
            'DELETE FROM notifications WHERE id = :id',
            [':id' => $r->param('id')]
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable('Notification introuvable.');
        }

        return Reponse::vide();
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    /** Génère un UUID v4 simple. */
    private function genererUuid(): string
    {
        $octets = random_bytes(16);
        $octets[6] = chr((ord($octets[6]) & 0x0f) | 0x40);
        $octets[8] = chr((ord($octets[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($octets), 4));
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
            'title'     => (string) $l['title'],
            'body'      => (string) $l['body'],
            'level'     => (string) $l['level'],
            'isRead'    => (bool) (int) $l['is_read'],
            'createdAt' => (string) $l['created_at'],
        ];

        if ($l['link'] !== null) {
            $dto['link'] = (string) $l['link'];
        }

        return $dto;
    }
}
