<?php

/**
 * CRM — messages de contact et abonnés newsletter.
 *
 * Messages (table messages) :
 *   - GET    /messages          : liste paginée + filtrable
 *   - GET    /messages/:id      : détail
 *   - PATCH  /messages/:id      : marquer lu / non lu
 *   - DELETE /messages/:id      : suppression
 *
 * Abonnés (table subscribers) :
 *   - GET    /subscribers       : liste paginée
 *   - POST   /subscribers       : inscription
 *   - DELETE /subscribers/:id   : désinscription
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurCrm
{
    /** Alias de tri pour les messages. */
    private const TRIS_MESSAGES = [
        'createdAt' => 'created_at',
        'name'      => 'name',
        'email'     => 'email',
    ];

    /** Alias de tri pour les abonnés. */
    private const TRIS_ABONNES = [
        'createdAt' => 'created_at',
        'email'     => 'email',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    // =================================================================
    // Messages de contact
    // =================================================================

    /**
     * GET /messages
     * Filtres : isRead (booléen), search (name, email, subject, body).
     * → { data: { items, total, page, perPage } }
     */
    public function listerMessages(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        if (($v = $r->queryBool('isRead')) !== null) {
            $where[] = 'is_read = :isRead';
            $params[':isRead'] = $v ? 1 : 0;
        }

        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            // Quatre occurrences → quatre placeholders distincts (piège MySQL).
            $where[] = '(LOWER(name) LIKE :search1 OR LOWER(email) LIKE :search2 OR LOWER(subject) LIKE :search3 OR LOWER(body) LIKE :search4)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
            $params[':search3'] = $motif;
            $params[':search4'] = $motif;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p      = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM messages{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS_MESSAGES, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM messages{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDtoMessage'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * GET /messages/:id
     * → { data: Message } ou 404.
     */
    public function detailMessage(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM messages WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun message ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDtoMessage($ligne));
    }

    /**
     * PATCH /messages/:id
     * Corps : { isRead: bool }
     * → { data: Message }
     */
    public function mettreAJourMessage(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM messages WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun message ne porte l'identifiant « {$id} ».");
        }

        $isRead = $r->corps('isRead');
        if ($isRead === null) {
            // Aucun champ modifiable fourni : renvoi de la ressource telle quelle.
            return Reponse::ok($this->enDtoMessage($ligne));
        }

        $this->db->run(
            'UPDATE messages SET is_read = :isRead WHERE id = :id',
            [':isRead' => $isRead ? 1 : 0, ':id' => $id],
        );

        $ligne = $this->db->un('SELECT * FROM messages WHERE id = :id', [':id' => $id]);

        return Reponse::ok($this->enDtoMessage((array) $ligne));
    }

    /**
     * DELETE /messages/:id
     * → 204, sans corps.
     */
    public function supprimerMessage(Requete $r): Reponse
    {
        $n = $this->db->run(
            'DELETE FROM messages WHERE id = :id',
            [':id' => $r->param('id')]
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable('Message introuvable.');
        }

        return Reponse::vide();
    }

    // =================================================================
    // Abonnés newsletter
    // =================================================================

    /**
     * GET /subscribers
     * Filtres : search (email, source).
     * → { data: { items, total, page, perPage } }
     */
    public function listerAbonnes(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            // Deux placeholders distincts.
            $where[] = '(LOWER(email) LIKE :search1 OR LOWER(COALESCE(source,\'\')) LIKE :search2)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p      = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM subscribers{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS_ABONNES, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM subscribers{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDtoAbonne'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * POST /subscribers
     * Corps : { email, source? }
     * → 201 { data: Subscriber }
     *
     * Un email déjà présent renvoie 409 (conflit) : pas de doublon silencieux.
     */
    public function inscrire(Requete $r): Reponse
    {
        $email = trim(mb_strtolower((string) $r->corps('email', '')));

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw ApiException::validation('Inscription invalide.', [
                'email' => ['Adresse e-mail manquante ou invalide.'],
            ]);
        }

        // Vérification de l'unicité avant insertion.
        $existant = $this->db->un('SELECT id FROM subscribers WHERE email = :email', [':email' => $email]);
        if ($existant !== null) {
            throw ApiException::conflit('Cette adresse e-mail est déjà inscrite.');
        }

        $id         = $this->genererUuid();
        $source     = $r->corps('source');
        $maintenant = gmdate('c');

        $this->db->transaction(function (Db $d) use ($id, $email, $source, $maintenant): void {
            $d->inserer('subscribers', [
                'id'         => $id,
                'email'      => $email,
                'source'     => $source !== null ? (string) $source : null,
                'created_at' => $maintenant,
            ]);
        });

        $ligne = $this->db->un('SELECT * FROM subscribers WHERE id = :id', [':id' => $id]);

        return Reponse::cree($this->enDtoAbonne((array) $ligne));
    }

    /**
     * DELETE /subscribers/:id
     * → 204, sans corps.
     */
    public function desinscrire(Requete $r): Reponse
    {
        $n = $this->db->run(
            'DELETE FROM subscribers WHERE id = :id',
            [':id' => $r->param('id')]
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable('Abonné introuvable.');
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
     * Ligne SQL → DTO message.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDtoMessage(array $l): array
    {
        $dto = [
            'id'        => (string) $l['id'],
            'name'      => (string) $l['name'],
            'email'     => (string) $l['email'],
            'subject'   => (string) $l['subject'],
            'body'      => (string) $l['body'],
            'isRead'    => (bool) (int) $l['is_read'],
            'createdAt' => (string) $l['created_at'],
        ];

        if ($l['phone'] !== null) {
            $dto['phone'] = (string) $l['phone'];
        }

        return $dto;
    }

    /**
     * Ligne SQL → DTO abonné.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDtoAbonne(array $l): array
    {
        $dto = [
            'id'        => (string) $l['id'],
            'email'     => (string) $l['email'],
            'createdAt' => (string) $l['created_at'],
        ];

        if ($l['source'] !== null) {
            $dto['source'] = (string) $l['source'];
        }

        return $dto;
    }
}
