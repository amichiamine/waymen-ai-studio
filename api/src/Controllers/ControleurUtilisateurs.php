<?php

/**
 * Utilisateurs — CRUD admin sous /admin/users.
 *
 * Trois exigences de sécurité fondamentales :
 *
 *   1. Le mot de passe ne sort JAMAIS de la base.
 *      Tous les SELECT listent EXPLICITEMENT les colonnes retournées —
 *      jamais de SELECT * — pour résister à l'ajout futur d'une colonne sensible.
 *
 *   2. Le changement de mot de passe passe par une route DÉDIÉE (changerMotDePasse).
 *      La mise à jour générique (mettre_a_jour) REFUSE tout champ password/password_hash
 *      dans le corps, et renvoie une erreur explicite.
 *
 *   3. VAGUE 4.3 : le hachage Argon2id n'est pas encore implémenté.
 *      La route changerMotDePasse refuse l'opération avec un message clair
 *      plutôt que d'écrire un mot de passe en clair — jamais de plain-text en base.
 *
 * Sécurité générale :
 *   - Requêtes préparées exclusivement.
 *   - Piège n°1 du dialecte MySQL/SQLite (ATTR_EMULATE_PREPARES=false) :
 *     un paramètre nommé ne peut pas apparaître deux fois — placeholders distincts.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurUtilisateurs
{
    /** Rôles valides dans le système. */
    private const ROLES = ['customer', 'viewer', 'editor', 'admin', 'owner'];

    /** Colonnes triables depuis l'URL. */
    private const TRIS = [
        'name'      => 'name',
        'email'     => 'email',
        'role'      => 'role',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    /**
     * Colonnes sûres à retourner — password_hash est ABSENTE.
     * La liste est dupliquée dans chaque requête SELECT pour être explicite.
     */
    private const COLONNES_SECURISEES =
        'id, name, email, role, active, phone, last_login, created_at, updated_at';

    public function __construct(private readonly Db $db)
    {
    }

    // ----------------------------------------------------------------
    // Liste
    // ----------------------------------------------------------------

    /**
     * GET /admin/users
     *
     * Paramètres facultatifs :
     *   - role   : filtrer par rôle
     *   - search : recherche dans name et email
     *   - sort, order, page, perPage
     *
     * Le champ `password_hash` n'est jamais inclus dans la réponse.
     */
    public function lister(Requete $r): Reponse
    {
        [$where, $params] = $this->filtres($r);
        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM users{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        // SELECT explicite — password_hash délibérément absent.
        $lignes = $this->db->tous(
            "SELECT " . self::COLONNES_SECURISEES
            . " FROM users{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    // ----------------------------------------------------------------
    // Détail
    // ----------------------------------------------------------------

    /**
     * GET /admin/users/:id
     *
     * Le champ `password_hash` n'est jamais inclus dans la réponse.
     */
    public function detail(Requete $r): Reponse
    {
        $id = $r->param('id');

        // SELECT explicite — password_hash délibérément absent.
        $ligne = $this->db->un(
            'SELECT ' . self::COLONNES_SECURISEES . ' FROM users WHERE id = :id',
            [':id' => $id],
        );

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun utilisateur ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    // ----------------------------------------------------------------
    // Création
    // ----------------------------------------------------------------

    /**
     * POST /admin/users
     *
     * Corps : { name, email, role, phone? }
     *
     * Le champ `password` n'est pas accepté ici. L'attribution d'un mot de passe
     * initial passe par la route dédiée POST /admin/users/:id/password, qui sera
     * opérationnelle en vague 4.3.
     *
     * La réponse ne contient jamais le champ `password_hash`.
     */
    public function creer(Requete $r): Reponse
    {
        // Refus explicite si un mot de passe est fourni ici.
        if ($r->corps('password') !== null || $r->corps('password_hash') !== null) {
            throw ApiException::validation(
                'Le mot de passe ne peut pas être défini via cette route.'
                . ' Utilisez POST /admin/users/:id/password (disponible en vague 4.3).',
                ['password' => ['Route dédiée requise.']]
            );
        }

        $erreurs = [];

        $nom = trim((string) $r->corps('name', ''));
        if ($nom === '') {
            $erreurs['name'] = ['Champ obligatoire.'];
        }

        $email = trim((string) $r->corps('email', ''));
        if ($email === '') {
            $erreurs['email'] = ['Champ obligatoire.'];
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $erreurs['email'] = ['Adresse e-mail invalide.'];
        }

        $role = trim((string) $r->corps('role', 'customer'));
        if (!in_array($role, self::ROLES, true)) {
            $erreurs['role'] = ['Rôle invalide. Valeurs acceptées : ' . implode(', ', self::ROLES) . '.'];
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Utilisateur invalide.', $erreurs);
        }

        // Vérifier l'unicité de l'email avant insertion.
        $existant = $this->db->un(
            'SELECT id FROM users WHERE email = :email',
            [':email' => $email],
        );
        if ($existant !== null) {
            throw ApiException::conflit("L'adresse e-mail « {$email} » est déjà utilisée.");
        }

        $maintenant = gmdate('c');
        $id = bin2hex(random_bytes(8));
        $phone = $r->corps('phone') !== null ? trim((string) $r->corps('phone')) : null;
        $actif = (int) (bool) $r->corps('active', true);

        // password_hash est NOT NULL en base — on insère un marqueur non fonctionnel.
        // JAMAIS de plain-text. Le vrai hachage Argon2id sera câblé en vague 4.3.
        // VAGUE 4.3 : remplacer cette valeur par password_hash($motDePasse, PASSWORD_ARGON2ID)
        //             après réception du mot de passe initial via la route dédiée.
        $marqueurMotDePasse = '!!non-defini!!';

        $this->db->transaction(fn (Db $d) => $d->inserer('users', [
            'id'            => $id,
            'name'          => $nom,
            'email'         => $email,
            'password_hash' => $marqueurMotDePasse,
            'role'          => $role,
            'active'        => $actif,
            'phone'         => $phone,
            'last_login'    => null,
            'created_at'    => $maintenant,
            'updated_at'    => $maintenant,
        ]));

        // SELECT explicite — password_hash délibérément absent.
        $ligne = $this->db->un(
            'SELECT ' . self::COLONNES_SECURISEES . ' FROM users WHERE id = :id',
            [':id' => $id],
        );

        return Reponse::cree($this->enDto((array) $ligne));
    }

    // ----------------------------------------------------------------
    // Mise à jour
    // ----------------------------------------------------------------

    /**
     * PATCH /admin/users/:id
     *
     * Corps : { name?, email?, role?, phone?, active? }
     *
     * Toute tentative de modifier `password` ou `password_hash` via cette route
     * est rejetée avec un message explicite. La route dédiée est
     * PATCH /admin/users/:id/password, opérationnelle en vague 4.3.
     *
     * La réponse ne contient jamais le champ `password_hash`.
     */
    public function mettreAJour(Requete $r): Reponse
    {
        $id = $r->param('id');

        // Vérifier que l'utilisateur existe.
        $existant = $this->db->un(
            'SELECT id FROM users WHERE id = :id',
            [':id' => $id],
        );
        if ($existant === null) {
            throw ApiException::introuvable("Aucun utilisateur ne porte l'identifiant « {$id} ».");
        }

        // Refus explicite de tout changement de mot de passe via cette route.
        if ($r->corps('password') !== null || $r->corps('password_hash') !== null) {
            throw ApiException::validation(
                'Le mot de passe ne peut pas être modifié via cette route.'
                . ' Utilisez PATCH /admin/users/:id/password (disponible en vague 4.3).',
                ['password' => ['Route dédiée requise.']]
            );
        }

        $colonnes = [];
        $params   = [':id' => $id];
        $erreurs  = [];

        if (($v = $r->corps('name')) !== null) {
            $nom = trim((string) $v);
            if ($nom === '') {
                $erreurs['name'] = ['Ne peut pas être vide.'];
            } else {
                $colonnes[]      = 'name = :name';
                $params[':name'] = $nom;
            }
        }

        if (($v = $r->corps('email')) !== null) {
            $email = trim((string) $v);
            if ($email === '') {
                $erreurs['email'] = ['Ne peut pas être vide.'];
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $erreurs['email'] = ['Adresse e-mail invalide.'];
            } else {
                // Vérifier l'unicité en excluant l'utilisateur courant.
                $doublon = $this->db->un(
                    'SELECT id FROM users WHERE email = :email AND id != :id_check',
                    [':email' => $email, ':id_check' => $id],
                );
                if ($doublon !== null) {
                    $erreurs['email'] = ["L'adresse e-mail « {$email} » est déjà utilisée."];
                } else {
                    $colonnes[]       = 'email = :email';
                    $params[':email'] = $email;
                }
            }
        }

        if (($v = $r->corps('role')) !== null) {
            $role = trim((string) $v);
            if (!in_array($role, self::ROLES, true)) {
                $erreurs['role'] = ['Rôle invalide. Valeurs acceptées : ' . implode(', ', self::ROLES) . '.'];
            } else {
                $colonnes[]      = 'role = :role';
                $params[':role'] = $role;
            }
        }

        if (($v = $r->corps('phone')) !== null) {
            $phone               = $v === '' ? null : trim((string) $v);
            $colonnes[]          = 'phone = :phone';
            $params[':phone']    = $phone;
        }

        if (($v = $r->corps('active')) !== null) {
            $colonnes[]          = 'active = :active';
            $params[':active']   = (int) (bool) $v;
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Données invalides.', $erreurs);
        }

        if ($colonnes === []) {
            // Aucune modification demandée — on renvoie l'utilisateur tel quel.
            $ligne = $this->db->un(
                'SELECT ' . self::COLONNES_SECURISEES . ' FROM users WHERE id = :id',
                [':id' => $id],
            );

            return Reponse::ok($this->enDto((array) $ligne));
        }

        $maintenant     = gmdate('c');
        $colonnes[]     = 'updated_at = :updated_at';
        $params[':updated_at'] = $maintenant;

        $this->db->run(
            'UPDATE users SET ' . implode(', ', $colonnes) . ' WHERE id = :id',
            $params,
        );

        // SELECT explicite — password_hash délibérément absent.
        $ligne = $this->db->un(
            'SELECT ' . self::COLONNES_SECURISEES . ' FROM users WHERE id = :id',
            [':id' => $id],
        );

        return Reponse::ok($this->enDto((array) $ligne));
    }

    // ----------------------------------------------------------------
    // Changement de mot de passe — route dédiée
    // ----------------------------------------------------------------

    /**
     * PATCH /admin/users/:id/password
     *
     * Corps : { password: string }
     *
     * Cette route est le SEUL endroit où un mot de passe peut être mis à jour.
     * Elle impose le hachage Argon2id — implémenté en vague 4.3.
     *
     * En attendant la vague 4.3, l'opération est REFUSÉE explicitement plutôt
     * que d'écrire un mot de passe en clair en base.
     *
     * Ne renvoie jamais le champ password_hash — réponse 204 (opération réussie
     * sans données à retourner).
     */
    public function changerMotDePasse(Requete $r): Reponse
    {
        $id = $r->param('id');

        // Vérifier que l'utilisateur existe.
        $existant = $this->db->un(
            'SELECT id FROM users WHERE id = :id',
            [':id' => $id],
        );
        if ($existant === null) {
            throw ApiException::introuvable("Aucun utilisateur ne porte l'identifiant « {$id} ».");
        }

        $motDePasse = $r->corps('password');
        if ($motDePasse === null || trim((string) $motDePasse) === '') {
            throw ApiException::validation('Mot de passe invalide.', [
                'password' => ['Champ obligatoire.'],
            ]);
        }

        // VAGUE 4.3 : implémenter le hachage ici.
        //   $hache = password_hash((string) $motDePasse, PASSWORD_ARGON2ID);
        //   $this->db->run(
        //       'UPDATE users SET password_hash = :hash, updated_at = :updated_at WHERE id = :id',
        //       [':hash' => $hache, ':updated_at' => gmdate('c'), ':id' => $id],
        //   );
        //   return Reponse::vide();

        // Refus explicite jusqu'à la vague 4.3 — jamais de plain-text en base.
        throw ApiException::requeteInvalide(
            'Le hachage des mots de passe (Argon2id) sera activé en vague 4.3.'
            . ' Cette route n\'est pas encore opérationnelle.'
        );
    }

    // ----------------------------------------------------------------
    // Suppression
    // ----------------------------------------------------------------

    /**
     * DELETE /admin/users/:id
     *
     * Suppression définitive. Renvoie 204 sans corps.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $n = $this->db->run(
            'DELETE FROM users WHERE id = :id',
            [':id' => $id],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun utilisateur ne porte l'identifiant « {$id} ».");
        }

        return Reponse::vide();
    }

    // ----------------------------------------------------------------
    // Filtres
    // ----------------------------------------------------------------

    /**
     * Construit la clause WHERE pour GET /admin/users.
     *
     * @return array{0:string[],1:array<string,mixed>}
     */
    private function filtres(Requete $r): array
    {
        $where  = [];
        $params = [];

        if (($v = $r->query('role')) !== null) {
            if (!in_array($v, self::ROLES, true)) {
                throw ApiException::validation('Filtre invalide.', [
                    'role' => ['Valeurs acceptées : ' . implode(', ', self::ROLES) . '.'],
                ]);
            }
            $where[]         = 'role = :role';
            $params[':role'] = $v;
        }

        if (($v = $r->queryBool('active')) !== null) {
            $where[]           = 'active = :active';
            $params[':active'] = $v ? 1 : 0;
        }

        // Piège n°1 — MySQL refuse un paramètre nommé réutilisé.
        // :search1 et :search2 sont deux placeholders distincts portant la même valeur.
        if (($v = $r->query('search')) !== null) {
            $motif               = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[]             = '(LOWER(name) LIKE :search1 OR LOWER(email) LIKE :search2)';
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
     * Le champ `password_hash` n'est jamais présent dans la ligne transmise
     * (SELECT explicite), et donc jamais présent dans le DTO — double protection.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'id'        => (string) $l['id'],
            'name'      => (string) $l['name'],
            'email'     => (string) $l['email'],
            'role'      => (string) $l['role'],
            'active'    => (bool) (int) $l['active'],
            'createdAt' => (string) $l['created_at'],
            'updatedAt' => (string) $l['updated_at'],
        ];

        if (isset($l['phone']) && $l['phone'] !== null) {
            $dto['phone'] = (string) $l['phone'];
        }
        if (isset($l['last_login']) && $l['last_login'] !== null) {
            $dto['lastLogin'] = (string) $l['last_login'];
        }

        return $dto;
    }
}
