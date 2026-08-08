<?php

/**
 * Paiements — modes de paiement.
 *
 * Routes à câbler (INTERDIT de modifier api/routes.php ici — l'orchestrateur s'en charge) :
 *   GET    /settings/payments                 → lister()
 *   PUT    /settings/payments/:id             → upsertMode()
 *   DELETE /settings/payments/:id             → supprimer()
 *
 * L'endpoint de création ou mise à jour est un UPSERT via `Db::upsert()`.
 * Booléen `active` stocké en INTEGER 0/1, rendu comme vrai booléen dans le DTO.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurPaiements
{
    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /settings/payments
     * → { data: PaymentMethod[] }
     *
     * Liste complète ordonnée par position puis par id.
     */
    public function lister(Requete $r): Reponse
    {
        $lignes = $this->db->tous(
            'SELECT * FROM payment_methods ORDER BY position ASC, id ASC',
        );

        return Reponse::ok(array_map([$this, 'enDto'], $lignes));
    }

    /**
     * PUT /settings/payments/:id
     * Corps attendu : { "label": <str>, "instructions": <str>, "active"?: <bool>, "position"?: <int> }
     *
     * Création ou mise à jour (upsert).
     */
    public function upsertMode(Requete $r): Reponse
    {
        $id = $r->param('id');
        if ($id === '') {
            throw ApiException::validation('Identifiant du mode de paiement manquant.');
        }

        $label        = trim((string) $r->corps('label', ''));
        $instructions = trim((string) $r->corps('instructions', ''));

        $erreurs = [];
        if ($label === '') {
            $erreurs['label'] = ['Le libellé est obligatoire.'];
        }
        if ($instructions === '') {
            $erreurs['instructions'] = ['Les instructions sont obligatoires.'];
        }
        if ($erreurs !== []) {
            throw ApiException::validation('Mode de paiement invalide.', $erreurs);
        }

        // Booléen active : vrai par défaut si non fourni
        $activeRaw = $r->corps('active', null);
        $active    = $activeRaw === null ? 1 : ($activeRaw ? 1 : 0);

        $position = (int) $r->corps('position', 0);

        $maintenant = gmdate('c');

        $this->db->upsert(
            'payment_methods',
            [
                'id'           => $id,
                'label'        => $label,
                'instructions' => $instructions,
                'active'       => $active,
                'position'     => $position,
                'updated_at'   => $maintenant,
            ],
            ['id'],
            ['label', 'instructions', 'active', 'position', 'updated_at'],
        );

        $ligne = $this->db->un(
            'SELECT * FROM payment_methods WHERE id = :id',
            [':id' => $id],
        );

        Journal::consigner($this->db, 'mode_paiement_upsert', 'payment_method', ['id' => $id]);

        return Reponse::ok($this->enDto((array) $ligne));
    }

    /**
     * DELETE /settings/payments/:id
     * → 204 si supprimé, 404 si introuvable.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $n = $this->db->run(
            'DELETE FROM payment_methods WHERE id = :id',
            [':id' => $id],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun mode de paiement ne porte l'identifiant « {$id} ».");
        }

        Journal::consigner($this->db, 'mode_paiement_supprime', 'payment_method', ['id' => $id]);

        return Reponse::vide();
    }

    // -----------------------------------------------------------------
    // Mapping ligne SQL → DTO du contrat
    // -----------------------------------------------------------------

    /**
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        return [
            'id'           => (string) $l['id'],
            'label'        => (string) $l['label'],
            'instructions' => (string) $l['instructions'],
            'active'       => (bool) ((int) $l['active']),
            'position'     => (int) $l['position'],
            'updatedAt'    => (string) $l['updated_at'],
        ];
    }
}
