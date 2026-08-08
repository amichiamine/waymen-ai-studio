<?php

/**
 * Clients (CRM) — `/customers`.
 *
 * Calqué sur le pilote `ControleurProduits` (docs/BACKEND.md, « Ajouter une
 * ressource »). Deux particularités méritent d'être lues avant modification :
 *
 *   1. `orders_count` et `total_spent` sont des AGRÉGATS entretenus par la
 *      création de commande (`ControleurCommandes::creer`). Ils ne sont pas
 *      modifiables par une écriture cliente : accepter un `totalSpent` venu du
 *      réseau, ce serait laisser un client réécrire son historique d'achats.
 *   2. La suppression est REFUSÉE tant que des commandes actives sont
 *      rattachées au client — un refus métier explicite, jamais un silence ni
 *      une cascade qui détruirait des commandes en cours de livraison.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurClients
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'name' => 'name',
        'email' => 'email',
        'wilaya' => 'wilaya',
        'ordersCount' => 'orders_count',
        'totalSpent' => 'total_spent',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /customers
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where = [];
        $params = [];

        // Un paramètre nommé ne peut PAS apparaître deux fois avec
        // `ATTR_EMULATE_PREPARES = false` (MySQL : « Invalid parameter
        // number »). Un placeholder DISTINCT par occurrence.
        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[] = '(LOWER(name) LIKE :search1 OR LOWER(email) LIKE :search2 '
                . 'OR phone LIKE :search3 OR LOWER(wilaya) LIKE :search4)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
            $params[':search3'] = $motif;
            $params[':search4'] = $motif;
        }
        if (($v = $r->query('wilaya')) !== null) {
            $where[] = 'wilaya = :wilaya';
            $params[':wilaya'] = $v;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pagination = Pagination::depuis($r);

        // Le total utilise EXACTEMENT le même WHERE que la page.
        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM customers{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM customers{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $pagination->perPage, ':decalage' => $pagination->offset()],
        );

        return Reponse::page(
            array_map([$this, 'enDto'], $lignes),
            $total,
            $pagination->page,
            $pagination->perPage,
        );
    }

    /** GET /customers/:id → { data: Customer } ou 404 enveloppé. */
    public function detail(Requete $r): Reponse
    {
        return Reponse::ok($this->enDto($this->exigerClient($r->param('id'))));
    }

    /** POST /customers → 201 { data: Customer }. */
    public function creer(Requete $r): Reponse
    {
        $nom = trim((string) $r->corps('name', ''));
        $courriel = trim((string) $r->corps('email', ''));
        $telephone = trim((string) $r->corps('phone', ''));

        $champs = [];
        if ($nom === '') {
            $champs['name'] = ['Champ obligatoire.'];
        }
        if ($courriel !== '' && !filter_var($courriel, FILTER_VALIDATE_EMAIL)) {
            $champs['email'] = ['Adresse électronique invalide.'];
        }
        if ($courriel === '' && $telephone === '') {
            $champs['phone'] = ['Un courriel ou un téléphone est nécessaire pour joindre le client.'];
        }
        if ($champs !== []) {
            throw ApiException::validation('Client invalide.', $champs);
        }

        $id = trim((string) $r->corps('id', ''));
        if ($id === '') {
            $id = 'cus_' . bin2hex(random_bytes(6));
        }

        $maintenant = gmdate('c');

        $this->db->beginWrite();

        try {
            if ($this->db->valeur('SELECT id FROM customers WHERE id = :id', [':id' => $id]) !== null) {
                throw ApiException::conflit("Un client porte déjà l'identifiant « {$id} ».");
            }
            if ($courriel !== '') {
                $doublon = $this->db->valeur(
                    'SELECT id FROM customers WHERE LOWER(email) = :courriel AND email <> \'\'',
                    [':courriel' => mb_strtolower($courriel)],
                );
                if ($doublon !== null) {
                    throw ApiException::conflit(
                        "L'adresse « {$courriel} » est déjà rattachée au client « {$doublon} »."
                    );
                }
            }

            // Les agrégats démarrent à zéro : ils appartiennent aux commandes,
            // pas à l'entrée cliente.
            $this->db->inserer('customers', [
                'id' => $id,
                'name' => $nom,
                'email' => $courriel,
                'phone' => $telephone,
                'wilaya' => trim((string) $r->corps('wilaya', '')),
                'orders_count' => 0,
                'total_spent' => 0,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ]);

            Journal::consigner($this->db, 'client_cree', 'customer', ['id' => $id, 'name' => $nom]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        return Reponse::cree($this->enDto($this->exigerClient($id)));
    }

    /**
     * PATCH /customers/:id → { data: Customer }
     *
     * Mise à jour PARTIELLE : seuls les champs présents dans le corps sont
     * touchés. `ordersCount` et `totalSpent` sont ignorés volontairement.
     */
    public function majPartielle(Requete $r): Reponse
    {
        $id = $r->param('id');

        $affectations = [];
        $params = [];

        if (array_key_exists('name', $r->corps)) {
            $nom = trim((string) $r->corps('name', ''));
            if ($nom === '') {
                throw ApiException::validation('Client invalide.', ['name' => ['Ne peut pas être vidé.']]);
            }
            $affectations[] = 'name = :nom';
            $params[':nom'] = $nom;
        }
        if (array_key_exists('email', $r->corps)) {
            $courriel = trim((string) $r->corps('email', ''));
            if ($courriel !== '' && !filter_var($courriel, FILTER_VALIDATE_EMAIL)) {
                throw ApiException::validation('Client invalide.', [
                    'email' => ['Adresse électronique invalide.'],
                ]);
            }
            $affectations[] = 'email = :courriel';
            $params[':courriel'] = $courriel;
        }
        if (array_key_exists('phone', $r->corps)) {
            $affectations[] = 'phone = :telephone';
            $params[':telephone'] = trim((string) $r->corps('phone', ''));
        }
        if (array_key_exists('wilaya', $r->corps)) {
            $affectations[] = 'wilaya = :wilaya';
            $params[':wilaya'] = trim((string) $r->corps('wilaya', ''));
        }

        if ($affectations === []) {
            throw ApiException::validation(
                'Aucun champ modifiable fourni. Champs acceptés : name, email, phone, wilaya '
                . '(ordersCount et totalSpent sont calculés par les commandes).'
            );
        }

        $this->db->beginWrite();

        try {
            $this->exigerClient($id);

            if (isset($params[':courriel']) && $params[':courriel'] !== '') {
                $doublon = $this->db->valeur(
                    'SELECT id FROM customers WHERE LOWER(email) = :courriel AND email <> \'\' AND id <> :client',
                    [':courriel' => mb_strtolower((string) $params[':courriel']), ':client' => $id],
                );
                if ($doublon !== null) {
                    throw ApiException::conflit(
                        'Cette adresse électronique est déjà rattachée au client « ' . $doublon . ' ».'
                    );
                }
            }

            $affectations[] = 'updated_at = :maj';
            $params[':maj'] = gmdate('c');
            $params[':id'] = $id;

            $this->db->run(
                'UPDATE customers SET ' . implode(', ', $affectations) . ' WHERE id = :id',
                $params,
            );

            Journal::consigner($this->db, 'client_modifie', 'customer', ['id' => $id]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        return Reponse::ok($this->enDto($this->exigerClient($id)));
    }

    /**
     * DELETE /customers/:id → 204, sans corps.
     *
     * REFUS MÉTIER si des commandes actives sont rattachées au client : une
     * commande en cours de préparation ou de livraison ne doit pas perdre son
     * destinataire. L'appelant reçoit un 409 qui NOMME le nombre de commandes
     * bloquantes, pas un échec muet.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $this->db->beginWrite();

        try {
            $this->exigerClient($id);

            // Placeholders générés par le serveur, un par statut actif.
            $placeholders = [];
            $params = [':client' => $id];
            foreach (array_values(ControleurCommandes::STATUTS_ACTIFS) as $rang => $statut) {
                $placeholders[] = ':statut' . $rang;
                $params[':statut' . $rang] = $statut;
            }

            $actives = (int) $this->db->valeur(
                'SELECT COUNT(*) FROM orders WHERE customer_id = :client '
                . 'AND status IN (' . implode(', ', $placeholders) . ')',
                $params,
            );

            if ($actives > 0) {
                throw ApiException::conflit(sprintf(
                    'Suppression refusée : %d commande(s) active(s) (%s) sont rattachées à ce client. '
                    . 'Terminez-les ou annulez-les avant de supprimer la fiche.',
                    $actives,
                    implode(', ', ControleurCommandes::STATUTS_ACTIFS),
                ));
            }

            // Les commandes closes (livrées, annulées) survivent au client :
            // elles sont la comptabilité. Leur `customer_id` est détaché, les
            // coordonnées figées dans la commande restent lisibles.
            $this->db->run(
                'UPDATE orders SET customer_id = NULL, updated_at = :maj WHERE customer_id = :client',
                [':maj' => gmdate('c'), ':client' => $id],
            );
            $this->db->run('DELETE FROM customers WHERE id = :id', [':id' => $id]);

            Journal::consigner($this->db, 'client_supprime', 'customer', ['id' => $id]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        return Reponse::vide();
    }

    // -----------------------------------------------------------------
    // Utilitaires
    // -----------------------------------------------------------------

    /** @return array<string,mixed> */
    private function exigerClient(string $id): array
    {
        $ligne = $this->db->un('SELECT * FROM customers WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun client ne porte l'identifiant « {$id} ».");
        }

        return $ligne;
    }

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    /**
     * Rend EXACTEMENT le type `Customer` de src/lib/admin-store.tsx :
     * tous les champs sont requis, aucun n'est omis.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        return [
            'id' => (string) $l['id'],
            'name' => (string) $l['name'],
            'email' => (string) $l['email'],
            'phone' => (string) $l['phone'],
            'wilaya' => (string) $l['wilaya'],
            'createdAt' => (string) $l['created_at'],
            'ordersCount' => (int) $l['orders_count'],
            'totalSpent' => (int) $l['total_spent'],
        ];
    }
}
