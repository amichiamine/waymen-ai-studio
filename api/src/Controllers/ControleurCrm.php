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
     * POST /messages  — ROUTE PUBLIQUE (visiteur non connecté).
     *
     * Corps attendu (conforme au formulaire Contact.tsx) :
     *   { name, email, phone?, subject, message }
     *
     * Limites de taille calquées sur le schéma Zod du frontend (Contact.tsx) :
     *   name    : 2–100 caractères
     *   email   : valide, max 255
     *   phone   : optionnel, max 30
     *   subject : 2–150 caractères
     *   message : 5–2000 caractères
     *
     * → 201 { data: Message } en cas de succès.
     *
     * Sécurité :
     *   - Validation stricte avec messages exploitables.
     *   - Taille de chaque champ bornée pour éviter le remplissage de la base.
     *   - VAGUE 4.5 : brancher ici une limitation de débit (rate-limit) par IP
     *     ou par empreinte de formulaire, comme cela a été fait sur la connexion.
     */
    public function recevoirMessage(Requete $r): Reponse
    {
        // VAGUE 4.5 : insérer ici l'appel au throttle (ex. RateLimiter::verifier($ip, 'contact', 10, 60))
        // avant toute validation, pour couper les rafales avant qu'elles n'atteignent la logique métier.

        $erreurs = [];

        // -- name --
        $name = trim((string) $r->corps('name', ''));
        if ($name === '') {
            $erreurs['name'][] = 'Le nom est obligatoire.';
        } elseif (mb_strlen($name) < 2) {
            $erreurs['name'][] = 'Le nom doit contenir au moins 2 caractères.';
        } elseif (mb_strlen($name) > 100) {
            $erreurs['name'][] = 'Le nom ne peut pas dépasser 100 caractères.';
        }

        // -- email --
        $email = trim(mb_strtolower((string) $r->corps('email', '')));
        if ($email === '') {
            $erreurs['email'][] = "L'adresse e-mail est obligatoire.";
        } elseif (mb_strlen($email) > 255) {
            $erreurs['email'][] = "L'adresse e-mail ne peut pas dépasser 255 caractères.";
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $erreurs['email'][] = "L'adresse e-mail est invalide.";
        }

        // -- phone (optionnel) --
        $phone     = null;
        $phoneRaw  = trim((string) $r->corps('phone', ''));
        if ($phoneRaw !== '') {
            if (mb_strlen($phoneRaw) > 30) {
                $erreurs['phone'][] = 'Le numéro de téléphone ne peut pas dépasser 30 caractères.';
            } else {
                $phone = $phoneRaw;
            }
        }

        // -- subject --
        $subject = trim((string) $r->corps('subject', ''));
        if ($subject === '') {
            $erreurs['subject'][] = "L'objet du message est obligatoire.";
        } elseif (mb_strlen($subject) < 2) {
            $erreurs['subject'][] = "L'objet doit contenir au moins 2 caractères.";
        } elseif (mb_strlen($subject) > 150) {
            $erreurs['subject'][] = "L'objet ne peut pas dépasser 150 caractères.";
        }

        // -- message --
        $corps = trim((string) $r->corps('message', ''));
        if ($corps === '') {
            $erreurs['message'][] = 'Le message est obligatoire.';
        } elseif (mb_strlen($corps) < 5) {
            $erreurs['message'][] = 'Le message doit contenir au moins 5 caractères.';
        } elseif (mb_strlen($corps) > 2000) {
            $erreurs['message'][] = 'Le message ne peut pas dépasser 2 000 caractères.';
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Le formulaire contient des erreurs.', $erreurs);
        }

        $id         = $this->genererUuid();
        $maintenant = gmdate('c');

        $this->db->transaction(function (Db $d) use ($id, $name, $email, $phone, $subject, $corps, $maintenant): void {
            $d->inserer('messages', [
                'id'         => $id,
                'name'       => $name,
                'email'      => $email,
                'phone'      => $phone,
                'subject'    => $subject,
                'body'       => $corps,
                'is_read'    => 0,
                'created_at' => $maintenant,
            ]);
        });

        $ligne = $this->db->un('SELECT * FROM messages WHERE id = :id', [':id' => $id]);

        return Reponse::cree($this->enDtoMessage((array) $ligne));
    }

    /**
     * GET /messages
     * Filtres : read (booléen, `isRead` toléré en repli), search (name, email,
     * subject, message).
     * → { data: { items, total, page, perPage } }
     */
    public function listerMessages(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        // Même nom que le champ rendu par le DTO (`read`), pour que filtrer
        // s'écrive comme lire. `isRead` reste accepté en repli.
        $lu = $r->queryBool('read');
        if ($lu === null) {
            $lu = $r->queryBool('isRead');
        }
        if (($v = $lu) !== null) {
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
     * Corps : { read: bool }
     * → { data: ContactMessage }
     *
     * SYMÉTRIE LECTURE/ÉCRITURE (vague 4.9) : la lecture rend `read`, la mise à
     * jour l'accepte sous le MÊME nom — c'est ce que le provider envoie
     * (`crmApi.markRead()` → `http.patch(…, { read })`). L'ancien `isRead` reste
     * toléré en repli, car un aller-retour asymétrique est le piège que ce
     * correctif ferme : le refuser franchement casserait tout appelant resté sur
     * l'ancien nom sans rien apporter.
     */
    public function mettreAJourMessage(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM messages WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun message ne porte l'identifiant « {$id} ».");
        }

        $isRead = $r->corps('read');
        if ($isRead === null) {
            $isRead = $r->corps('isRead');
        }
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
     * NOMMAGE (vague 4.9, §4.2–4.3 de docs/CONFORMITE-API.md). Le DTO servait
     * les noms des COLONNES (`body`, `is_read` → `isRead`) au lieu de ceux du
     * type `ContactMessage` (src/lib/admin-store.tsx) : `message` et `read`.
     * Le contrat fait foi et le frontend est déjà écrit contre lui — c'est donc
     * ici que ça se corrige, pas dans les composants d'administration.
     *
     * Les colonnes SQL, elles, ne bougent pas : `messages.body` et
     * `messages.is_read` restent le stockage, la traduction se fait au bord.
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
            'message'   => (string) $l['body'],
            'read'      => (bool) (int) $l['is_read'],
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
