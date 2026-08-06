<?php

/**
 * Factures — snapshots de commande immuables.
 *
 * Une facture est un instantané JSON capturant TOUT ce qui fait foi au moment
 * de la commande : libellés figés, prix retenus, client, livraison, totaux.
 *
 * Principe d'immuabilité : si le commerçant renomme un produit ou modifie son
 * prix après-coup, la facture ne change pas. C'est la décision de la phase 3
 * sur les empreintes historiques (docs/LOCALIZED-DATA.md §6, PLAN.md §7).
 *
 * ---- Choix de stockage ----
 *
 * Les factures sont stockées dans une colonne `invoice_snapshot` (TEXT /* JSON *‌/)
 * ajoutée à la table `orders`, plutôt que dans des fichiers sur disque.
 *
 * Justification :
 *   1. **Cohérence architecturale** : PLAN.md §1 réserve JSON aux « snapshots
 *      de facture immuables » portés PAR la base, pas à côté. La colonne JSON
 *      sur `orders` est la traduction directe de cette décision.
 *   2. **Atomicité** : le snapshot est écrit dans la MÊME transaction que la
 *      commande. Pas de facture orpheline, pas de commande sans facture.
 *   3. **Sécurité** : une colonne de base n'est pas accessible par HTTP. Un
 *      fichier JSON sous `public_html/invoices/` l'est ; hors `public_html/`
 *      il exige un accès shell ou une route d'API dédiée — complexité gratuite.
 *   4. **Portabilité** : un dump SQLite contient les factures. Une sauvegarde
 *      de la base est une sauvegarde des factures. Aucun synchronisme à gérer.
 *   5. **Requêtabilité** : chercher « toutes les commandes d'un client avec
 *      leur facture » est un SELECT simple.
 *
 * La colonne est ajoutée dans les deux fichiers de schéma (schema.sqlite.sql
 * et schema.mysql.sql), conformément à la règle « les DEUX fichiers de
 * schema/ dans le même ordre » (docs/BACKEND.md §4).
 *
 * ---- Ce que contient le snapshot ----
 *
 * Structure (toutes les valeurs sont figées à l'écriture) :
 * {
 *   "version": "1",            — pour pouvoir migrer le format à l'avenir
 *   "commandeId": "KA123456",
 *   "date": "2026-08-06T…",
 *   "client": { "nom", "email", "telephone" },
 *   "livraison": { "wilaya", "mode", "adresse", "frais" },
 *   "lignes": [
 *     { "produitId", "libelle", "prixUnitaire", "quantite", "sousTotal", "image?" }
 *   ],
 *   "sousTotal":  — somme des sousTotal de lignes
 *   "remise":     — coupon appliqué
 *   "coupon":     — code coupon ou null
 *   "fraisPort":
 *   "total":
 *   "modePaiement": { "id", "libelle" }
 * }
 */

declare(strict_types=1);

namespace KaTech;

final class Factures
{
    public function __construct(private readonly Db $db)
    {
    }

    // =========================================================================
    // Création
    // =========================================================================

    /**
     * Produit un snapshot JSON immuable d'une commande et l'inscrit dans
     * la colonne `invoice_snapshot` de la table `orders`.
     *
     * DOIT être appelé à l'intérieur de la transaction de création de commande :
     * l'atomicité garantit qu'une commande ne peut pas exister sans sa facture.
     *
     * @param string                              $commandeId
     * @param array{id:?string,name:string,email:?string,phone:string,note:?string} $client
     * @param array{wilaya:string,kind:string,address:string}                       $livraison
     * @param array<int,array{produit:string,libelle:string,prix:int,qte:int,image:?string}> $lignes
     * @param int      $sousTotal
     * @param int      $remise
     * @param ?string  $codeApplique
     * @param int      $fraisPort
     * @param int      $total
     * @param array{id:string,label:?string}      $paiement
     * @param string   $maintenant  ISO-8601 UTC partagé avec la transaction
     */
    public function creer(
        string $commandeId,
        array $client,
        array $livraison,
        array $lignes,
        int $sousTotal,
        int $remise,
        ?string $codeApplique,
        int $fraisPort,
        int $total,
        array $paiement,
        string $maintenant,
    ): void {
        $lignesSnapshot = [];
        foreach ($lignes as $ligne) {
            $item = [
                'produitId'    => $ligne['produit'],
                'libelle'      => $ligne['libelle'],
                'prixUnitaire' => $ligne['prix'],
                'quantite'     => $ligne['qte'],
                'sousTotal'    => $ligne['prix'] * $ligne['qte'],
            ];
            // L'image est un champ optionnel du snapshot ; on l'inclut seulement
            // si elle était présente au moment de la commande.
            if (isset($ligne['image']) && $ligne['image'] !== null && $ligne['image'] !== '') {
                $item['image'] = $ligne['image'];
            }
            $lignesSnapshot[] = $item;
        }

        $snapshot = [
            'version'      => '1',
            'commandeId'   => $commandeId,
            'date'         => $maintenant,
            'client'       => [
                'nom'       => $client['name'],
                'email'     => $client['email'] ?? null,
                'telephone' => $client['phone'],
            ],
            'livraison'    => [
                'wilaya'  => $livraison['wilaya'],
                'mode'    => $livraison['kind'],
                'adresse' => $livraison['address'],
                'frais'   => $fraisPort,
            ],
            'lignes'       => $lignesSnapshot,
            'sousTotal'    => $sousTotal,
            'remise'       => $remise,
            'coupon'       => $codeApplique,
            'fraisPort'    => $fraisPort,
            'total'        => $total,
            'modePaiement' => [
                'id'      => $paiement['id'],
                'libelle' => $paiement['label'],
            ],
        ];

        // L'écriture est intentionnellement un UPDATE et non un INSERT séparé :
        // la commande a déjà été insérée dans la même transaction — on complète
        // sa ligne plutôt que de créer un enregistrement supplémentaire.
        $this->db->run(
            'UPDATE orders SET invoice_snapshot = :snapshot WHERE id = :id',
            [':snapshot' => Db::json($snapshot), ':id' => $commandeId],
        );
    }

    // =========================================================================
    // Lecture
    // =========================================================================

    /**
     * Restitue le snapshot d'une commande, ou null si la commande n'existe pas
     * ou si elle a été créée avant l'ajout de cette fonctionnalité.
     *
     * @return array<string,mixed>|null
     */
    public function lire(string $commandeId): ?array
    {
        $brut = $this->db->valeur(
            'SELECT invoice_snapshot FROM orders WHERE id = :id',
            [':id' => $commandeId],
        );

        if ($brut === null || $brut === '') {
            return null;
        }

        $snapshot = Db::dejson($brut);

        return is_array($snapshot) ? $snapshot : null;
    }
}
