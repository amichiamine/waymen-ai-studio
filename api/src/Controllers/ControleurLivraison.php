<?php

/**
 * Livraison — tarifs par wilaya.
 *
 * Routes à câbler (INTERDIT de modifier api/routes.php ici — l'orchestrateur s'en charge) :
 *   GET    /settings/shipping/rates                   → lister()
 *   PUT    /settings/shipping/rates/:wilayaCode       → upsertTarif()
 *   DELETE /settings/shipping/rates/:wilayaCode       → supprimer()
 *
 * Remarques d'architecture :
 *  - Les 58 wilayas sont une donnée statique du frontend (`src/data/wilayas.ts`).
 *    L'API n'expose QUE les tarifs (table `shipping_rates`) ; elle ne sert pas
 *    la liste des wilayas.
 *  - La création ou mise à jour est un UPSERT : `Db::upsert()` isole la
 *    divergence `ON CONFLICT` / `ON DUPLICATE KEY UPDATE`. Ne jamais réécrire
 *    cette logique ici.
 *  - `wilaya_code = '*'` désigne le tarif par défaut (toutes wilayas non
 *    configurées individuellement).
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurLivraison
{
    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /settings/shipping/rates
     * → { data: { items: ShippingRate[], total, page, perPage } }
     *
     * Pas de filtre particulier : on renvoie tous les tarifs configurés
     * (généralement ≤ 59 lignes). La pagination est conservée par cohérence
     * avec le contrat général, mais perPage est borné très haut.
     */
    public function lister(Requete $r): Reponse
    {
        $lignes = $this->db->tous(
            'SELECT * FROM shipping_rates ORDER BY wilaya_code ASC',
        );

        return Reponse::ok(array_map([$this, 'enDto'], $lignes));
    }

    /**
     * PUT /settings/shipping/rates/:wilayaCode
     * Corps attendu : { "home": <entier DZD>, "desk": <entier DZD> }
     *
     * Création ou mise à jour (upsert) : si le code wilaya n'existe pas, il
     * est créé ; sinon, les tarifs sont mis à jour.
     */
    public function upsertTarif(Requete $r): Reponse
    {
        $code = $r->param('wilayaCode');
        if ($code === '') {
            throw ApiException::validation('Code wilaya manquant.');
        }

        // Validation des tarifs
        $home = $r->corps('home');
        $desk = $r->corps('desk');

        $erreurs = [];
        if (!is_numeric($home) || (int) $home < 0) {
            $erreurs['home'] = ['Le tarif domicile doit être un entier positif en DZD.'];
        }
        if (!is_numeric($desk) || (int) $desk < 0) {
            $erreurs['desk'] = ['Le tarif bureau doit être un entier positif en DZD.'];
        }
        if ($erreurs !== []) {
            throw ApiException::validation('Tarifs invalides.', $erreurs);
        }

        $maintenant = gmdate('c');

        $this->db->upsert(
            'shipping_rates',
            [
                'wilaya_code' => $code,
                'home'        => (int) $home,
                'desk'        => (int) $desk,
                'updated_at'  => $maintenant,
            ],
            ['wilaya_code'],
            ['home', 'desk', 'updated_at'],
        );

        $ligne = $this->db->un(
            'SELECT * FROM shipping_rates WHERE wilaya_code = :code',
            [':code' => $code],
        );

        Journal::consigner($this->db, 'tarif_livraison_upsert', 'shipping_rate', ['wilayaCode' => $code]);

        return Reponse::ok($this->enDto((array) $ligne));
    }

    /**
     * DELETE /settings/shipping/rates/:wilayaCode
     * → 204 si supprimé, 404 si introuvable.
     */
    public function supprimer(Requete $r): Reponse
    {
        $code = $r->param('wilayaCode');

        $n = $this->db->run(
            'DELETE FROM shipping_rates WHERE wilaya_code = :code',
            [':code' => $code],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun tarif pour la wilaya « {$code} ».");
        }

        Journal::consigner($this->db, 'tarif_livraison_supprime', 'shipping_rate', ['wilayaCode' => $code]);

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
            'wilayaCode' => (string) $l['wilaya_code'],
            'home'       => (int) $l['home'],
            'desk'       => (int) $l['desk'],
            'updatedAt'  => (string) $l['updated_at'],
        ];
    }
}
