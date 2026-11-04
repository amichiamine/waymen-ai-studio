<?php

/**
 * Commandes — le point le plus sensible de l'API : il touche l'argent et le stock.
 *
 * Calqué sur le pilote `ControleurProduits` (cf. docs/BACKEND.md, « Ajouter une
 * ressource »). Trois règles gouvernent ce fichier, et aucune ne se négocie :
 *
 *   1. **Le prix et le libellé viennent de la BASE, jamais du client.** Le
 *      panier reçu ne porte que `productId` et `qty` ; tout le reste est
 *      résolu par une lecture serveur. Sans cela, n'importe qui commande un
 *      ordinateur à 1 dinar.
 *   2. **Le stock se décrémente par une mise à jour CONDITIONNELLE**
 *      (`... SET stock_qty = stock_qty - :q WHERE id = :id AND stock_qty >= :qmin`).
 *      On ne lit JAMAIS le stock pour le réécrire ensuite : c'est la condition
 *      dans le `WHERE` qui rend la survente impossible même sous concurrence.
 *      Zéro ligne affectée = refus métier, et toute la transaction est annulée.
 *   3. **Les libellés de lignes sont des empreintes figées** (chaîne simple,
 *      langue résolue à l'écriture — docs/LOCALIZED-DATA.md §6). Une facture
 *      émise en français ne change pas parce qu'on a traduit le produit six
 *      mois plus tard.
 *
 * Un refus métier (stock insuffisant, coupon épuisé) sort en 409/422 avec un
 * message qui NOMME la cause ; une panne technique sort en 5xx par `Db`. Les
 * deux ne se confondent jamais côté appelant (AGENTS.md §6).
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Garde;
use KaTech\Courriel;
use KaTech\Db;
use KaTech\Env;
use KaTech\Factures;
use KaTech\Journal;
use KaTech\Modeles\ConfirmationCommande;
use KaTech\Modeles\NouvelleCommande;
use KaTech\Notion\MiroirCommandes;
use KaTech\Outbox;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;
use KaTech\Services\NotificationService;

final class ControleurCommandes
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
        'total' => 'total',
        'status' => 'status',
        'customerName' => 'customer_name',
    ];

    /** Statuts du contrat (`OrderStatus` de src/lib/admin-store.tsx). */
    private const STATUTS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    /** Statuts qui rendent une commande « active » — bloquent la suppression d'un client. */
    public const STATUTS_ACTIFS = ['pending', 'processing', 'shipped'];

    /** Seuils de repli si `settings.site` n'est pas encore renseigné. */
    private const SEUIL_RUPTURE_DEFAUT = 0;
    private const SEUIL_BAS_DEFAUT = 5;

    private readonly Outbox $outbox;
    private readonly Factures $factures;

    public function __construct(private readonly Db $db)
    {
        $this->outbox   = new Outbox($db);
        $this->factures = new Factures($db);
    }

    // =================================================================
    // Lecture
    // =================================================================

    /**
     * GET /orders
     * → { data: { items, total, page, perPage } }
     *
     * Filtres du contrat (`OrderQuery`) : status, from, to — plus search,
     * sort, order, page, perPage. `customerId` est accepté en supplément pour
     * le back-office (fiche client).
     */
    public function lister(Requete $r): Reponse
    {
        [$where, $params] = $this->filtres($r);
        $pagination = Pagination::depuis($r);

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        // Le total utilise EXACTEMENT le même WHERE que la page, sinon la
        // pagination du frontend ment.
        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM orders{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM orders{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $pagination->perPage, ':decalage' => $pagination->offset()],
        );

        return Reponse::page(
            $this->enDtos($lignes),
            $total,
            $pagination->page,
            $pagination->perPage,
        );
    }

    /**
     * GET /orders/:id → { data: Order } ou 404 enveloppé.
     *
     * DEUX PORTES, UNE SEULE SERRURE (vague 4.10). La route était gardée par
     * `Garde::protege('read', …)`, qui exige le rang `viewer` du back-office : un
     * client voyait donc sa propre commande dans `/me/orders` mais recevait 403
     * « Action réservée au rôle Lecteur » sur `/orders/<son-id>`. Conséquence
     * concrète : `/checkout/success` cassée pour TOUS les clients, et suivi de
     * commande inaccessible. C'est le tunnel d'achat, pas un détail.
     *
     * L'accès est désormais accordé si — et SEULEMENT si — l'une des deux
     * conditions est vraie :
     *   (a) l'appelant atteint le rang `viewer` (comportement back-office,
     *       inchangé : aucune régression au sommet, AGENTS.md §6 additivité) ;
     *   (b) la commande appartient à une fiche client rattachée au COMPTE de la
     *       session (`fichesClientDuCompte()`, le mécanisme déjà éprouvé de
     *       `mesCommandes()` — réutilisé, jamais dupliqué).
     * Tout autre appelant reçoit le MÊME code qu'avant : 401 anonyme, 403 client
     * tiers, avec le message de refus d'origine.
     *
     * L'IDENTITÉ VIENT DE LA SESSION, JAMAIS DE LA REQUÊTE. Aucun repli sur
     * `?customerId=` : ce provisoire a existé, il a été supprimé volontairement
     * (voir `mesCommandes()`), et le faire revenir ici rendrait toutes les
     * commandes lisibles en changeant un chiffre dans l'URL.
     *
     * ORDRE DES OPÉRATIONS : la lecture de la ligne précède l'autorisation
     * — il faut connaître `customer_id` pour trancher — mais RIEN n'est divulgué
     * avant l'arbitrage. Le 404 reste après, et un appelant refusé reçoit 403
     * que la commande existe ou non : pas d'oracle d'existence. On ne renvoie
     * jamais 404 « pour cacher » : 403 reste cohérent avec le reste de l'API.
     */
    public function detail(Requete $r): Reponse
    {
        $id = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM orders WHERE id = :id', [':id' => $id]);

        // Autorisation AVANT toute divulgation. Revérification volontaire : la
        // route est derrière `Garde::protegeConnecte`, mais le contrôleur ne
        // dépend pas de la pose d'un intergiciel pour ne pas fuir de données
        // (même principe que `mesCommandes()`).
        Garde::exigerAppartenanceOu(
            'read',
            fn (array $utilisateur): bool => $this->commandeAppartientAuCompte($ligne, $utilisateur),
        );

        if ($ligne === null) {
            throw ApiException::introuvable("Aucune commande ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne, $this->lignesDe([$id])));
    }

    /**
     * Vrai si la commande est rattachée à une fiche client du compte connecté.
     *
     * Zéro duplication (SKILLS.md, AGENTS.md §6) : la correspondance
     * compte ↔ fiche(s) est celle de `fichesClientDuCompte()`, la seule et même
     * règle que `/me/orders`. Les deux routes ne peuvent donc pas diverger — et
     * c'est exactement ce qui rend le résultat vérifiable : ce que (b) autorise
     * ici est précisément ce que `/me/orders` liste.
     *
     * Ne lève jamais : une commande absente ou une commande invité
     * (`customer_id` NULL ou vide) rend `false`, et l'appelant retombe sur
     * l'exigence de rang — donc 403, pas une fuite ni un 404 révélateur.
     *
     * @param array<string,mixed>|null $ligne Ligne `orders`, ou null si absente.
     * @param array{id:string,email:string,name:string,phone:?string,role:string} $utilisateur
     */
    private function commandeAppartientAuCompte(?array $ligne, array $utilisateur): bool
    {
        if ($ligne === null) {
            return false;
        }

        $clientId = (string) ($ligne['customer_id'] ?? '');
        if ($clientId === '') {
            // Commande invité : elle n'appartient à aucun compte. Personne ne
            // se l'approprie en se connectant.
            return false;
        }

        return in_array(
            $clientId,
            $this->fichesClientDuCompte((string) $utilisateur['email']),
            true,
        );
    }

    /**
     * GET /me/orders → { data: Order[] } (tableau nu, cf. ordersApi.mine()).
     *
     * SÉCURITÉ (vague 4.9, §4.1 de docs/CONFORMITE-API.md) : l'identité vient
     * de la SESSION (cookie httpOnly `katech_sid`), JAMAIS d'un paramètre de
     * requête. Le provisoire `?customerId=` de la vague 4.2 est supprimé sans
     * repli : un repli sur la query rendrait la fuite entre clients possible
     * en changeant un chiffre dans l'URL. Il ne doit jamais revenir.
     *
     * Le défaut historique corrigé en phase 2 était l'inverse : en l'absence
     * d'identité, la route renvoyait TOUTES les commandes de TOUS les clients.
     * Ici, pas de session = 401 (posé par `Garde::protegeConnecte` sur la route
     * et revérifié ici), et une session sans fiche client = liste VIDE, jamais
     * un jeu de données élargi.
     *
     * Le paramètre `$r` n'est pas lu : c'est volontaire et c'est la garantie.
     */
    public function mesCommandes(Requete $r): Reponse
    {
        // Revérification volontaire : la route est déjà derrière
        // `Garde::protegeConnecte`, mais le contrôleur ne dépend pas de la
        // pose d'un intergiciel pour ne pas fuir de données.
        $utilisateur = Garde::exigerConnexion();

        $clientIds = $this->fichesClientDuCompte((string) $utilisateur['email']);

        // Aucune fiche client rattachée au compte : le compte n'a pas d'historique.
        // Pas de 401 (l'appelant EST authentifié), pas de liste élargie non plus.
        if ($clientIds === []) {
            return Reponse::ok([]);
        }

        // Le filtrage par client est la RAISON D'ÊTRE de cette route : sans ce
        // WHERE, c'est une fuite de données entre clients.
        //
        // PIÈGE DE DIALECTE (docs/BACKEND.md §4, piège n°1) : un paramètre nommé
        // ne se réutilise pas sous MySQL. Chaque identifiant reçoit donc SON
        // propre nom (`:client0`, `:client1`, …).
        $noms = [];
        $params = [':limite' => Pagination::PAR_PAGE_MAX];
        foreach (array_values($clientIds) as $index => $clientId) {
            $nom = ':client' . $index;
            $noms[] = $nom;
            $params[$nom] = $clientId;
        }

        $lignes = $this->db->tous(
            'SELECT * FROM orders WHERE customer_id IN (' . implode(', ', $noms) . ') '
            . 'ORDER BY created_at DESC, id ASC LIMIT :limite',
            $params,
        );

        return Reponse::ok($this->enDtos($lignes));
    }

    /**
     * Correspondance compte ↔ fiche(s) client.
     *
     * `users` et `customers` sont deux tables distinctes et le schéma ne porte
     * AUCUNE clé étrangère entre elles (pas de `customers.user_id`). Le seul
     * rattachement fiable disponible est le COURRIEL, qui est déjà celui
     * qu'utilise `clientValide()` pour rattacher une commande à une fiche
     * existante, et qui est indexé (`idx_customers_email`). Les deux moitiés du
     * code se rejoignent donc sur la même règle.
     *
     * Un courriel vide ne rattache rien : `customers.email` vaut `''` par
     * défaut pour les fiches créées à la main, et `'' = ''` rattacherait tout
     * le monde à tout le monde.
     *
     * @return list<string>
     */
    private function fichesClientDuCompte(string $courriel): array
    {
        $courriel = mb_strtolower(trim($courriel));
        if ($courriel === '') {
            return [];
        }

        $lignes = $this->db->tous(
            'SELECT id FROM customers WHERE LOWER(email) = :courriel AND email <> \'\' ORDER BY id ASC',
            [':courriel' => $courriel],
        );

        return array_map(static fn (array $l): string => (string) $l['id'], $lignes);
    }

    /**
     * GET /orders/track?id=...&phone=...
     * Accès public sécurisé pour le suivi d'une commande (invité ou connecté).
     * Vérifie la concordance stricte entre l'identifiant et le téléphone ou l'email.
     */
    public function suivre(Requete $r): Reponse
    {
        $id = trim((string) $r->query('id', ''));
        $contact = trim((string) $r->query('phone', ''));
        if ($contact === '') {
            $contact = trim((string) $r->query('email', ''));
        }

        if ($id === '' || $contact === '') {
            throw ApiException::requeteInvalide('L\'identifiant de commande et vos coordonnées sont requis pour le suivi.');
        }

        $ligne = $this->db->un('SELECT * FROM orders WHERE id = :id', [':id' => $id]);
        if ($ligne === null) {
            throw ApiException::introuvable("Aucune commande ne correspond à ces informations.");
        }

        $contactNettoye = preg_replace('/\D/', '', $contact) ?? '';
        $telCommande    = preg_replace('/\D/', '', (string) ($ligne['phone'] ?? '')) ?? '';
        $emailCommande  = strtolower(trim((string) ($ligne['customer_email'] ?? '')));

        $telOk   = ($contactNettoye !== '' && $telCommande !== '' && str_ends_with($telCommande, substr($contactNettoye, -8)));
        $emailOk = (strtolower($contact) === $emailCommande && $emailCommande !== '');

        if (!$telOk && !$emailOk) {
            throw ApiException::introuvable("Aucune commande ne correspond à ces informations.");
        }

        $articles = $this->lignesDe([$id]);

        return Reponse::ok($this->enDto((array) $ligne, $articles));
    }

    // =================================================================
    // Création — la transaction la plus importante du projet
    // =================================================================

    /**
     * POST /orders → 201 { data: Order }
     *
     * Corps attendu : `CreateOrderInput` de src/api/types.ts.
     * Tout se joue dans UNE transaction ouverte par `beginWrite()` :
     * validation, résolution serveur des prix/libellés, décompte atomique du
     * stock, écriture des lignes, mouvements de stock, coupon.
     */
    public function creer(Requete $r): Reponse
    {
        $panier = $this->panierValide($r);
        $client = $this->clientValide($r);
        $livraison = $this->livraisonValide($r);
        $codeCoupon = $this->codeCouponDemande($r);
        // Langue de FIGEAGE des libellés. « fr » est la langue de référence et
        // le repli garanti (docs/LOCALIZED-DATA.md §3.4).
        $langue = $this->langue($r);

        $maintenant = gmdate('c');

        $this->db->beginWrite();

        try {
            $seuils = $this->seuilsStock();

            $lignesCommande = [];
            $mouvements = [];
            $sousTotal = 0;

            foreach ($panier as $produitId => $quantite) {
                // 1) Prix et libellé résolus DEPUIS LA BASE. Le client n'a
                //    fourni que l'identifiant et la quantité.
                $produit = $this->db->un(
                    'SELECT id, name, price, image, stock_qty, stock FROM products WHERE id = :produit',
                    [':produit' => $produitId],
                );

                if ($produit === null) {
                    throw ApiException::validation(
                        "Le produit « {$produitId} » n'existe pas ou n'est plus au catalogue.",
                        ['items' => ["Produit inconnu : {$produitId}."]],
                    );
                }

                $libelle = $this->libelleFige($produit['name'], $langue, $produitId);
                $prix = (int) $produit['price'];

                // 2) Décompte ATOMIQUE. Un stock non suivi (`stock_qty` NULL)
                //    n'est pas décompté — mais un produit étiqueté « out » est
                //    refusé, sinon on vendrait un article annoncé indisponible.
                if ($produit['stock_qty'] === null) {
                    if ((string) $produit['stock'] === 'out') {
                        throw $this->ruptureDeStock($libelle, $quantite, 0);
                    }
                } else {
                    $this->decrementerStock($produitId, $libelle, $quantite, $maintenant, $seuils);

                    // 5) Mouvement de stock, avec l'empreinte du libellé.
                    $mouvements[] = ['produit' => $produitId, 'libelle' => $libelle, 'qte' => $quantite];
                }

                $lignesCommande[] = [
                    'produit' => $produitId,
                    'libelle' => $libelle,
                    'prix' => $prix,
                    'qte' => $quantite,
                    'image' => $produit['image'] === null ? null : (string) $produit['image'],
                ];

                $sousTotal += $prix * $quantite;
            }

            // 3) Coupon : consommé de façon conditionnelle, exactement comme le
            //    stock. Deux clients ne peuvent pas franchir la même dernière
            //    utilisation.
            $remise = 0;
            $codeApplique = null;
            if ($codeCoupon !== null) {
                [$codeApplique, $remise] = $this->consommerCoupon($codeCoupon, $sousTotal, $maintenant);
            }

            $fraisPort = $this->fraisDePort($livraison, $sousTotal - $remise);
            $total = $sousTotal - $remise + $fraisPort;

            $paiement = $this->paiementValide($r);
            $commandeId = $this->identifiantCommandeLibre();

            // Un client CONNECTÉ doit toujours repartir avec une commande
            // rattachée : sinon `/me/orders` resterait vide sans le dire.
            // Créée dans la MÊME transaction : pas de fiche orpheline si la
            // commande est annulée.
            if ($client['id'] === null && $client['compte'] !== null) {
                $client['id'] = $this->ficheClientGarantie($client, $livraison['wilaya'], $maintenant);
            }

            $this->db->inserer('orders', [
                'id' => $commandeId,
                'customer_id' => $client['id'],
                'customer_name' => $client['name'],
                'customer_email' => $client['email'],
                'subtotal' => $sousTotal,
                'discount' => $remise,
                'coupon_code' => $codeApplique,
                'shipping' => $fraisPort,
                'total' => $total,
                'status' => 'pending',
                'status_history' => Db::json([
                    ['status' => 'pending', 'at' => $maintenant, 'note' => 'Commande passée'],
                ]),
                'payment_method' => $paiement['id'],
                'payment_label' => $paiement['label'],
                'wilaya' => $livraison['wilaya'],
                'delivery_kind' => $livraison['kind'],
                'address' => $livraison['address'],
                'phone' => $client['phone'],
                'note' => $client['note'],
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ]);

            // 4) Lignes de commande, avec le LIBELLÉ FIGÉ (chaîne simple).
            $position = 0;
            foreach ($lignesCommande as $ligne) {
                $this->db->inserer('order_items', [
                    'order_id' => $commandeId,
                    'product_id' => $ligne['produit'],
                    'name' => $ligne['libelle'],
                    'price' => $ligne['prix'],
                    'qty' => $ligne['qte'],
                    'image' => $ligne['image'],
                    'position' => $position++,
                ]);
            }

            foreach ($mouvements as $index => $mouvement) {
                $this->db->inserer('stock_movements', [
                    'id' => sprintf('mov_%s_%d', $commandeId, $index),
                    'product_id' => $mouvement['produit'],
                    'product_name' => $mouvement['libelle'],
                    'delta' => -$mouvement['qte'],
                    'reason' => "Commande {$commandeId}",
                    'created_at' => $maintenant,
                ]);
            }

            // Agrégats CRM : mis à jour uniquement si la commande est rattachée
            // à un client connu. Un achat invité ne crée pas de fiche ici.
            if ($client['id'] !== null) {
                $this->db->run(
                    'UPDATE customers SET orders_count = orders_count + 1, total_spent = total_spent + :montant, '
                    . 'updated_at = :maj WHERE id = :client',
                    [':montant' => $total, ':maj' => $maintenant, ':client' => $client['id']],
                );
            }

            // ----------------------------------------------------------------
            // Facture — snapshot immuable de la commande.
            //
            // Écrit dans la même transaction : une commande ne peut pas exister
            // sans sa facture, et une facture ne peut pas exister sans commande.
            // Si la transaction est annulée (rollback), la facture disparaît aussi.
            // ----------------------------------------------------------------
            $this->factures->creer(
                commandeId:   $commandeId,
                client:       $client,
                livraison:    $livraison,
                lignes:       $lignesCommande,
                sousTotal:    $sousTotal,
                remise:       $remise,
                codeApplique: $codeApplique,
                fraisPort:    $fraisPort,
                total:        $total,
                paiement:     $paiement,
                maintenant:   $maintenant,
            );

            // ----------------------------------------------------------------
            // Outbox — événements différés (PLAN.md §8, règle absolue).
            //
            // Aucun appel réseau n'est effectué ici. Les événements sont écrits
            // dans la même transaction que la commande : si la transaction est
            // annulée, il n'y a pas d'événement fantôme. Le vidage est déclenché
            // en fin de requête (register_shutdown_function ci-dessous), et
            // api/tools/vider-outbox.php reste le filet de secours manuel.
            // ----------------------------------------------------------------
            $payloadCommande = [
                'commandeId'    => $commandeId,
                'clientNom'     => $client['name'],
                'clientEmail'   => $client['email'],
                'clientTel'     => $client['phone'],
                'wilaya'        => $livraison['wilaya'],
                'modeLivraison' => $livraison['kind'],
                'adresse'       => $livraison['address'],
                'sousTotal'     => $sousTotal,
                'remise'        => $remise,
                'coupon'        => $codeApplique,
                'fraisPort'     => $fraisPort,
                'total'         => $total,
                'modePaiement'  => $paiement['id'],
                'nbLignes'      => count($lignesCommande),
                'produits'      => array_map(
                    static fn (array $l): array => [
                        'produitId' => $l['produit'],
                        'libelle'   => $l['libelle'],
                        'prix'      => $l['prix'],
                        'qte'       => $l['qte'],
                    ],
                    $lignesCommande,
                ),
                'createdAt'     => $maintenant,
            ];
            $this->outbox->deposer('order.created', $payloadCommande);

            // Consignation d'audit : commande créée.
            Journal::consigner($this->db, 'commande_creee', 'order', [
                'id'     => $commandeId,
                'total'  => $total,
                'status' => 'pending',
                'coupon' => $codeApplique,
                'items'  => count($lignesCommande),
            ]);

            // Notification in-app pour le commerçant / back-office (cloche et popover)
            NotificationService::emettre(
                $this->db,
                "Nouvelle commande #{$commandeId}",
                sprintf(
                    "Client : %s (%s) — Montant total : %s DZD (%d article%s)",
                    $client['name'],
                    $client['email'] ?: $client['phone'],
                    number_format($total, 0, ',', ' '),
                    count($lignesCommande),
                    count($lignesCommande) > 1 ? 's' : ''
                ),
                'success',
                "/admin/commandes/{$commandeId}"
            );

            // Événement de rupture de stock : utile au commerçant pour réapprovisionner.
            // Émis pour chaque produit que le décompte a fait descendre à zéro (ou
            // dont le statut est désormais « out »).
            foreach ($lignesCommande as $ligne) {
                $stockRestant = $this->db->valeur(
                    "SELECT stock_qty FROM products WHERE id = :produit AND stock = 'out'",
                    [':produit' => $ligne['produit']],
                );
                // `valeur` renvoie `null` si aucune ligne ou si la colonne est NULL.
                // Ici : si la requête renvoie une ligne, le produit est en rupture.
                if ($stockRestant !== null) {
                    $this->outbox->deposer('stock.rupture', [
                        'produitId' => $ligne['produit'],
                        'libelle'   => $ligne['libelle'],
                        'stockQty'  => (int) $stockRestant,
                        'commandeId' => $commandeId,
                        'at'        => $maintenant,
                    ]);

                    NotificationService::emettre(
                        $this->db,
                        "Rupture de stock : {$ligne['libelle']}",
                        "Le produit « {$ligne['libelle']} » (ID : {$ligne['produit']}) est désormais en rupture suite à la commande #{$commandeId}.",
                        'warning',
                        "/admin/inventaire"
                    );
                }
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            // Un refus métier annule TOUT : ni commande partielle, ni stock
            // entamé, ni coupon consommé.
            $this->db->rollback();

            throw $e;
        }

        // ----------------------------------------------------------------
        // Vidage de l'outbox en fin de requête (PLAN.md §8).
        //
        // La commande est DÉJÀ enregistrée — le commit() ci-dessus a réussi.
        // On enregistre maintenant une fonction de fin de script pour dépiler
        // l'outbox APRÈS que la réponse HTTP a été envoyée au client.
        //
        // Pourquoi en fin de script et non ici ?
        //   Appeler l'émetteur de courriel ici bloquerait le client pendant
        //   tout l'envoi SMTP (plusieurs secondes). Un acheteur qui attend
        //   recliquerait, et on se retrouverait avec une double commande.
        //   En enregistrant une shutdown function, la réponse HTTP part d'abord,
        //   puis l'envoi se fait dans la foulée, invisible pour le client.
        //
        // Sur LiteSpeed/FastCGI (production) : fastcgi_finish_request() libère
        // le navigateur avant l'envoi ; latence observable = 0 ms pour le client.
        //
        // Sur le serveur intégré `php -S` (développement avec SMTP_SIMULATE=1) :
        // fastcgi_finish_request() n'existe pas et le client attend la fin
        // complète du script. En simulation, l'écriture sur disque est
        // quasi-instantanée (< 10 ms) : l'impact est imperceptible. C'est
        // une LIMITE CONNUE ET DOCUMENTÉE du serveur intégré, non un bug.
        //
        // Isolation : un échec d'envoi ne peut plus annuler la commande — elle
        // est déjà commitée. L'événement reste en file pour réessai (recul
        // progressif géré par Outbox::marquerEchec).
        // ----------------------------------------------------------------
        $appUrl = rtrim((string) Env::get('APP_URL', ''), '/');

        // ----------------------------------------------------------------
        // Miroir Notion — consommateur ADDITIONNEL de la même file (vague 4.7).
        //
        // C'est le SEUL point de ce fichier que la vague Notion modifie. Aucune
        // route, aucun contrôle métier, aucun événement supplémentaire : le
        // miroir consomme l'événement `order.created` qui existait déjà.
        //
        // POURQUOI NOTION AVANT LE COURRIEL, et pas l'inverse — ce n'est pas un
        // détail de style, c'est ce qui empêche un doublon d'e-mail :
        //   l'outbox rejoue un événement ENTIER quand son émetteur échoue. Si
        //   le courriel partait d'abord et que Notion échouait ensuite, le
        //   réessai renverrait le courriel de confirmation à l'acheteur — deux
        //   fois, cinq fois. Dans cet ordre, un échec Notion survient AVANT
        //   tout envoi, et le réessai d'une écriture Notion est inoffensif : la
        //   table `notion_links` retrouve la page déjà créée et se contente de
        //   la mettre à jour (et l'empreinte évite même l'appel si rien n'a
        //   changé). Notion est idempotent, le courriel ne l'est pas : le non
        //   idempotent passe en dernier.
        //
        // Si Notion n'est pas configuré, `MiroirCommandes::traiter()` rend null
        // sans le moindre appel réseau ni la moindre trace : le comportement de
        // cette route est alors rigoureusement celui d'avant la vague 4.7.
        // ----------------------------------------------------------------
        $miroirNotion = MiroirCommandes::emetteur($this->db);

        $this->outbox->enregistrerVidageEnSortie(
            static function (array $evt) use ($appUrl, $miroirNotion): ?string {
                $echecNotion = $miroirNotion($evt);
                if ($echecNotion !== null) {
                    // L'événement reste « pending » et sera rejoué : la
                    // boutique a vendu, seul le miroir est en retard.
                    return $echecNotion;
                }

                return self::emettreEvenement($evt, $appUrl);
            },
            Outbox::LIMITE_EN_SORTIE,
        );

        $ligne = $this->db->un('SELECT * FROM orders WHERE id = :id', [':id' => $commandeId]);

        return Reponse::cree($this->enDto((array) $ligne, $this->lignesDe([$commandeId])));
    }

    /**
     * Décompte conditionnel — le cœur de l'anti-survente.
     *
     * Aucune lecture préalable du stock ne sert à calculer la nouvelle valeur :
     * c'est le `WHERE ... AND stock_qty >= :qteMinimale` qui arbitre. Zéro
     * ligne affectée signifie « pas assez de stock au moment précis de
     * l'écriture », et déclenche l'annulation de toute la transaction.
     *
     * PIÈGE DE DIALECTE (docs/BACKEND.md §4, piège n°1) : avec
     * `ATTR_EMULATE_PREPARES = false`, MySQL REFUSE qu'un même paramètre nommé
     * apparaisse deux fois. La quantité est donc liée sous DEUX noms distincts
     * — `:qte` et `:qteMinimale` — pour la même valeur.
     *
     * @param array{rupture:int,bas:int} $seuils
     */
    private function decrementerStock(
        string $produitId,
        string $libelle,
        int $quantite,
        string $maintenant,
        array $seuils,
    ): void {
        $affectees = $this->db->run(
            'UPDATE products SET stock_qty = stock_qty - :qte, updated_at = :maj '
            . 'WHERE id = :produit AND stock_qty IS NOT NULL AND stock_qty >= :qteMinimale',
            [
                ':qte' => $quantite,
                ':maj' => $maintenant,
                ':produit' => $produitId,
                ':qteMinimale' => $quantite,
            ],
        )->rowCount();

        if ($affectees === 0) {
            // On ne relit le stock QUE pour nommer la quantité disponible dans
            // le message de refus. Cette lecture n'entre dans aucun calcul
            // d'écriture : la décision est déjà prise par le WHERE ci-dessus.
            $restant = (int) $this->db->valeur(
                'SELECT stock_qty FROM products WHERE id = :produit',
                [':produit' => $produitId],
            );

            throw $this->ruptureDeStock($libelle, $quantite, $restant);
        }

        // Étiquette de stock recalculée EN SQL, sans aller-retour applicatif :
        // le catalogue et ses filtres restent cohérents avec la quantité.
        $this->db->run(
            'UPDATE products SET stock = CASE '
            . 'WHEN stock_qty <= :seuilRupture THEN \'out\' '
            . 'WHEN stock_qty <= :seuilBas THEN \'low\' '
            . 'ELSE \'in\' END '
            . 'WHERE id = :produit AND stock_qty IS NOT NULL',
            [
                ':seuilRupture' => $seuils['rupture'],
                ':seuilBas' => $seuils['bas'],
                ':produit' => $produitId,
            ],
        );
    }

    /** Refus métier explicite, nommant le produit en rupture. */
    private function ruptureDeStock(string $libelle, int $demande, int $disponible): ApiException
    {
        return ApiException::conflit(sprintf(
            'Stock insuffisant pour « %s » : %d unité(s) demandée(s), %d disponible(s). '
            . 'La commande n\'a pas été enregistrée et aucun stock n\'a été décompté.',
            $libelle,
            $demande,
            max(0, $disponible),
        ));
    }

    /**
     * Consommation conditionnelle du coupon.
     *
     * `usage_limit = 0` vaut « illimité » (valeur par défaut du schéma).
     *
     * @return array{0:string,1:int} Code réellement appliqué et remise en DZD.
     */
    private function consommerCoupon(string $code, int $sousTotal, string $maintenant): array
    {
        $coupon = $this->db->un(
            'SELECT * FROM coupons WHERE UPPER(code) = :code',
            [':code' => mb_strtoupper($code)],
        );

        if ($coupon === null) {
            throw ApiException::validation('Code promo inconnu.', ['couponCode' => ['Code inconnu.']]);
        }

        $refus = self::refusCoupon($coupon, $sousTotal);
        if ($refus !== null) {
            throw ApiException::validation('Code promo refusé : ' . $refus, ['couponCode' => [$refus]]);
        }

        $affectees = $this->db->run(
            'UPDATE coupons SET usage_count = usage_count + 1, updated_at = :maj '
            . 'WHERE code = :code AND active = 1 AND (usage_limit = 0 OR usage_count < usage_limit)',
            [':maj' => $maintenant, ':code' => (string) $coupon['code']],
        )->rowCount();

        if ($affectees === 0) {
            // Course perdue avec une autre commande : le compteur a atteint la
            // limite entre la vérification et l'écriture. Refus métier net.
            throw ApiException::conflit(
                'Ce code promo vient d\'atteindre sa limite d\'utilisation. La commande n\'a pas été enregistrée.'
            );
        }

        return [(string) $coupon['code'], self::remise($coupon, $sousTotal)];
    }

    // =================================================================
    // Écritures secondaires
    // =================================================================

    /**
     * PATCH /orders/:id/status → { data: Order }
     * Corps : { status, note? }. L'historique est APPENDU, jamais réécrit.
     */
    public function changerStatut(Requete $r): Reponse
    {
        $id = $r->param('id');
        $statut = trim((string) $r->corps('status', ''));

        if (!in_array($statut, self::STATUTS, true)) {
            throw ApiException::validation('Statut de commande invalide.', [
                'status' => ['Valeurs acceptées : ' . implode(', ', self::STATUTS) . '.'],
            ]);
        }

        $note = $r->corps('note');
        $note = ($note === null || $note === '') ? null : (string) $note;
        $maintenant = gmdate('c');

        $this->db->beginWrite();

        try {
            $ligne = $this->db->un('SELECT * FROM orders WHERE id = :id', [':id' => $id]);
            if ($ligne === null) {
                throw ApiException::introuvable("Aucune commande ne porte l'identifiant « {$id} ».");
            }

            $historique = Db::dejson($ligne['status_history'], []);
            if (!is_array($historique)) {
                $historique = [];
            }
            $evenement = ['status' => $statut, 'at' => $maintenant];
            if ($note !== null) {
                $evenement['note'] = $note;
            }
            $historique[] = $evenement;

            $this->db->run(
                'UPDATE orders SET status = :statut, status_history = :historique, note = COALESCE(:note, note), '
                . 'updated_at = :maj WHERE id = :id',
                [
                    ':statut' => $statut,
                    ':historique' => Db::json(array_values($historique)),
                    ':note' => $note,
                    ':maj' => $maintenant,
                    ':id' => $id,
                ],
            );

            // Consignation d'audit : changement de statut.
            Journal::consigner($this->db, 'statut_modifie', 'order', [
                'id'     => $id,
                'statut' => $statut,
                'note'   => $note,
            ]);

            // Notification client : événement outbox pour envoi d'email
            $payloadStatut = [
                'commandeId'    => $id,
                'nouveauStatut' => $statut,
                'ancienStatut'  => (string) $ligne['status'],
                'note'          => $note ?? '',
                'clientNom'     => (string) ($ligne['customer_name'] ?? ''),
                'clientEmail'   => (string) ($ligne['customer_email'] ?? ''),
                'clientTel'     => (string) ($ligne['phone'] ?? ''),
                'total'         => (int) ($ligne['total'] ?? 0),
                'updatedAt'     => $maintenant,
            ];
            $this->outbox->deposer('order.status_updated', $payloadStatut);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        $appUrl = rtrim((string) Env::get('APP_URL', ''), '/');
        $this->outbox->enregistrerVidageEnSortie(
            static function (array $evt) use ($appUrl): ?string {
                return self::emettreEvenement($evt, $appUrl);
            },
            Outbox::LIMITE_EN_SORTIE,
        );

        $ligne = $this->db->un('SELECT * FROM orders WHERE id = :id', [':id' => $id]);

        return Reponse::ok($this->enDto((array) $ligne, $this->lignesDe([$id])));
    }

    /**
     * DELETE /orders/:id → 204, sans corps.
     *
     * La commande et ses lignes partent ensemble : une ligne orpheline
     * fausserait tous les rapports. Le stock N'EST PAS reconstitué ici — une
     * restitution d'inventaire est un fait métier distinct, qui passera par
     * `/inventory/:productId/adjust` afin de laisser une trace dans
     * `stock_movements` plutôt qu'une correction invisible.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id = $r->param('id');

        $this->db->beginWrite();

        try {
            $existe = $this->db->valeur('SELECT id FROM orders WHERE id = :id', [':id' => $id]);
            if ($existe === null) {
                throw ApiException::introuvable("Aucune commande ne porte l'identifiant « {$id} ».");
            }

            $this->db->run('DELETE FROM order_items WHERE order_id = :commande', [':commande' => $id]);
            $this->db->run('DELETE FROM orders WHERE id = :id', [':id' => $id]);

            // Consignation d'audit : commande supprimée.
            Journal::consigner($this->db, 'commande_supprimee', 'order', ['id' => $id]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        return Reponse::vide();
    }

    // =================================================================
    // Validation de l'entrée
    // =================================================================

    /**
     * Panier normalisé : `productId => quantité cumulée`, trié par
     * identifiant.
     *
     * Le cumul évite deux lignes du même produit décomptées séparément ; le tri
     * fixe un ordre de verrouillage identique pour toutes les commandes, ce qui
     * réduit les interblocages en MySQL quand deux paniers partagent des
     * produits.
     *
     * @return array<string,int>
     */
    private function panierValide(Requete $r): array
    {
        $items = $r->corps('items');

        if (!is_array($items) || $items === []) {
            throw ApiException::validation('Panier vide : une commande contient au moins un article.', [
                'items' => ['Champ obligatoire, au moins un article.'],
            ]);
        }

        $panier = [];
        foreach ($items as $rang => $item) {
            if (!is_array($item)) {
                throw ApiException::validation('Article de panier illisible.', [
                    'items' => ["Article #{$rang} : objet attendu."],
                ]);
            }

            $produitId = trim((string) ($item['productId'] ?? $item['product_id'] ?? ''));
            if ($produitId === '') {
                throw ApiException::validation('Article de panier sans produit.', [
                    'items' => ["Article #{$rang} : « productId » obligatoire."],
                ]);
            }

            $brut = $item['qty'] ?? $item['quantity'] ?? 1;
            if (!is_numeric($brut) || (int) $brut < 1) {
                throw ApiException::validation('Quantité invalide.', [
                    'items' => ["Article #{$rang} : quantité entière supérieure ou égale à 1 attendue."],
                ]);
            }

            $panier[$produitId] = ($panier[$produitId] ?? 0) + (int) $brut;
        }

        ksort($panier);

        return $panier;
    }

    /**
     * Identité de l'acheteur.
     *
     * SÉCURITÉ (vague 4.9) : quand la requête porte une session de rôle
     * `customer`, le COURRIEL et le rattachement viennent de la session, et le
     * `customer.id` du corps est IGNORÉ. Sans cela, un client connecté pourrait
     * rattacher sa commande à la fiche d'un autre — et la verrait ensuite
     * apparaître, ou disparaître, dans le mauvais `/me/orders`.
     *
     * Le back-office (rôle `viewer`+) conserve le comportement d'origine : il
     * saisit des commandes POUR un client, `customer.id` y est légitime. Et une
     * commande INVITÉ (sans session) n'est pas modifiée du tout — c'est l'usage
     * courant, il reste additif.
     *
     * @return array{id:?string,name:string,email:?string,phone:string,note:?string,compte:?string}
     */
    private function clientValide(Requete $r): array
    {
        $client = $r->corps('customer');
        $client = is_array($client) ? $client : [];

        // Session éventuelle. `Garde::utilisateur()` ne lève jamais : une
        // commande invité doit continuer de passer.
        $session = Garde::utilisateur();
        $compte = ($session !== null && $session['role'] === 'customer') ? $session : null;

        $nom = trim((string) ($client['name'] ?? $r->corps('customerName', '')));
        $telephone = trim((string) ($client['phone'] ?? $r->corps('phone', '')));
        $courriel = trim((string) ($client['email'] ?? $r->corps('customerEmail', '')));

        if ($compte !== null) {
            // L'identité prime sur le corps de la requête.
            $courriel = trim((string) $compte['email']);
            if ($nom === '') {
                $nom = trim((string) $compte['name']);
            }
            if ($telephone === '' && ($compte['phone'] ?? null) !== null) {
                $telephone = trim((string) $compte['phone']);
            }
        }

        $champs = [];
        if ($nom === '') {
            $champs['customer.name'] = ['Champ obligatoire.'];
        }
        if ($telephone === '') {
            $champs['customer.phone'] = ['Champ obligatoire.'];
        }
        if ($courriel !== '' && !filter_var($courriel, FILTER_VALIDATE_EMAIL)) {
            $champs['customer.email'] = ['Adresse électronique invalide.'];
        }
        if ($champs !== []) {
            throw ApiException::validation('Coordonnées client incomplètes.', $champs);
        }

        // Un client connecté ne choisit PAS sa fiche : elle est déduite de son
        // courriel de session, plus bas. Le back-office, lui, la désigne.
        $id = $compte !== null ? '' : trim((string) ($client['id'] ?? $r->corps('customerId', '')));
        $resolu = null;

        if ($id !== '') {
            $trouve = $this->db->valeur('SELECT id FROM customers WHERE id = :client', [':client' => $id]);
            if ($trouve === null) {
                throw ApiException::validation('Client inconnu.', [
                    'customerId' => ["Aucun client ne porte l'identifiant « {$id} »."],
                ]);
            }
            $resolu = (string) $trouve;
        } elseif ($courriel !== '') {
            // Rattachement opportuniste à une fiche existante, par courriel.
            $trouve = $this->db->valeur(
                'SELECT id FROM customers WHERE LOWER(email) = :courriel AND email <> \'\'',
                [':courriel' => mb_strtolower($courriel)],
            );
            $resolu = $trouve === null ? null : (string) $trouve;
        }

        $note = $r->corps('note');

        return [
            'id' => $resolu,
            'name' => $nom,
            'email' => $courriel === '' ? null : $courriel,
            'phone' => $telephone,
            'note' => ($note === null || $note === '') ? null : (string) $note,
            // Identifiant `users.id` du client connecté, ou null (invité,
            // back-office). Sert à garantir une fiche client à la commande.
            'compte' => $compte === null ? null : (string) $compte['id'],
        ];
    }

    /**
     * Fiche client garantie pour un compte connecté, DANS la transaction de la
     * commande.
     *
     * Cas visé : un compte créé avant la vague 4.9 (donc sans fiche `customers`)
     * qui passe commande. Sans cette création, la commande partirait avec
     * `customer_id = NULL` et son auteur ne la reverrait jamais dans
     * `/me/orders` — un échec silencieux, donc interdit (AGENTS.md §6).
     *
     * La relecture par courriel est refaite ici : entre `clientValide()` et
     * l'écriture, une autre requête a pu créer la fiche.
     *
     * @param array{name:string,email:?string,phone:string} $client
     */
    private function ficheClientGarantie(array $client, string $wilaya, string $maintenant): ?string
    {
        $courriel = mb_strtolower(trim((string) ($client['email'] ?? '')));
        if ($courriel === '') {
            return null;
        }

        $existante = $this->db->valeur(
            'SELECT id FROM customers WHERE LOWER(email) = :courriel AND email <> \'\'',
            [':courriel' => $courriel],
        );
        if ($existante !== null) {
            return (string) $existante;
        }

        $id = $this->identifiantClientLibre();

        $this->db->inserer('customers', [
            'id' => $id,
            'name' => $client['name'] === '' ? $courriel : $client['name'],
            'email' => $courriel,
            'phone' => $client['phone'],
            'wilaya' => $wilaya,
            'orders_count' => 0,
            'total_spent' => 0,
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ]);

        return $id;
    }

    /** Identifiant de fiche client libre, au format `cus_…` de ControleurClients. */
    private function identifiantClientLibre(): string
    {
        for ($essai = 0; $essai < 8; $essai++) {
            $id = 'cus_' . bin2hex(random_bytes(6));
            if ($this->db->valeur('SELECT id FROM customers WHERE id = :id', [':id' => $id]) === null) {
                return $id;
            }
        }

        // Jamais d'échec silencieux : mieux vaut une 500 nommée qu'une collision.
        throw new ApiException(
            500,
            'INTERNAL_ERROR',
            'Impossible de tirer un identifiant client libre après 8 tentatives.'
        );
    }

    /**
     * Livraison. `shipping` du contrat porte wilayaCode, method, address, commune.
     *
     * @return array{wilaya:string,kind:string,address:string}
     */
    private function livraisonValide(Requete $r): array
    {
        $livraison = $r->corps('shipping');
        $livraison = is_array($livraison) ? $livraison : [];

        $wilaya = trim((string) ($livraison['wilayaCode'] ?? $r->corps('wilaya', '')));
        $mode = strtolower(trim((string) ($livraison['method'] ?? $r->corps('deliveryKind', 'home'))));

        if ($wilaya === '') {
            throw ApiException::validation('Wilaya de livraison manquante.', [
                'shipping.wilayaCode' => ['Champ obligatoire.'],
            ]);
        }
        if (!in_array($mode, ['home', 'desk'], true)) {
            throw ApiException::validation('Mode de livraison invalide.', [
                'shipping.method' => ['Valeurs acceptées : home, desk.'],
            ]);
        }

        $adresse = trim((string) ($livraison['address'] ?? $r->corps('address', '')));
        $commune = trim((string) ($livraison['commune'] ?? ''));
        if ($commune !== '' && $adresse !== '') {
            $adresse .= ', ' . $commune;
        } elseif ($adresse === '') {
            $adresse = $commune;
        }

        if ($mode === 'home' && $adresse === '') {
            throw ApiException::validation('Adresse obligatoire pour une livraison à domicile.', [
                'shipping.address' => ['Champ obligatoire pour le mode « home ».'],
            ]);
        }

        return ['wilaya' => $wilaya, 'kind' => $mode, 'address' => $adresse];
    }

    /**
     * Moyen de paiement : le libellé est FIGÉ dans la commande, comme les
     * libellés de lignes — renommer un moyen de paiement ne doit pas réécrire
     * l'historique.
     *
     * @return array{id:string,label:?string}
     */
    private function paiementValide(Requete $r): array
    {
        $id = trim((string) ($r->corps('paymentMethodId') ?? $r->corps('paymentMethod', '')));
        if ($id === '') {
            return ['id' => '', 'label' => null];
        }

        $moyen = $this->db->un(
            'SELECT id, label, active FROM payment_methods WHERE id = :moyen',
            [':moyen' => $id],
        );

        if ($moyen === null) {
            throw ApiException::validation('Moyen de paiement inconnu.', [
                'paymentMethodId' => ["Aucun moyen de paiement ne porte l'identifiant « {$id} »."],
            ]);
        }
        if ((int) $moyen['active'] !== 1) {
            throw ApiException::validation('Moyen de paiement désactivé.', [
                'paymentMethodId' => ['Ce moyen de paiement n\'est plus proposé.'],
            ]);
        }

        return ['id' => (string) $moyen['id'], 'label' => (string) $moyen['label']];
    }

    private function codeCouponDemande(Requete $r): ?string
    {
        $code = $r->corps('couponCode');
        $code = $code === null ? '' : trim((string) $code);

        return $code === '' ? null : $code;
    }

    /** Langue de figeage des empreintes. `fr` est la référence. */
    private function langue(Requete $r): string
    {
        $langue = strtolower((string) ($r->corps('lang') ?? $r->query('lang', 'fr')));

        return in_array($langue, ['fr', 'en', 'ar'], true) ? $langue : 'fr';
    }

    // =================================================================
    // Calculs serveur
    // =================================================================

    /**
     * Frais de port depuis `shipping_rates` (`*` = tarif par défaut) et le
     * seuil de gratuité de `settings.shipping`. Jamais depuis l'entrée client :
     * un panier ne fixe pas ses propres frais de livraison.
     *
     * @param array{wilaya:string,kind:string,address:string} $livraison
     */
    private function fraisDePort(array $livraison, int $sousTotalApresRemise): int
    {
        $reglages = $this->payloadReglages('shipping');
        $seuil = (int) ($reglages['freeShippingThreshold'] ?? 0);

        if ($seuil > 0 && $sousTotalApresRemise >= $seuil) {
            return 0;
        }

        $tarif = $this->db->un(
            'SELECT home, desk FROM shipping_rates WHERE wilaya_code = :wilaya',
            [':wilaya' => $livraison['wilaya']],
        );

        if ($tarif === null) {
            $tarif = $this->db->un(
                'SELECT home, desk FROM shipping_rates WHERE wilaya_code = :defaut',
                [':defaut' => '*'],
            );
        }
        if ($tarif === null) {
            // Aucune grille tarifaire renseignée : port nul, et on le DIT dans
            // le journal serveur plutôt que de facturer un montant inventé.
            Db::journaliserStatique(
                'Aucun tarif de livraison pour la wilaya « ' . $livraison['wilaya']
                . ' » ni de tarif par défaut « * » : frais de port facturés à 0.'
            );

            return 0;
        }

        return (int) $tarif[$livraison['kind'] === 'desk' ? 'desk' : 'home'];
    }

    /** @return array{rupture:int,bas:int} */
    private function seuilsStock(): array
    {
        $reglages = $this->payloadReglages('site');

        return [
            'rupture' => (int) ($reglages['outOfStockThreshold'] ?? self::SEUIL_RUPTURE_DEFAUT),
            'bas' => (int) ($reglages['lowStockThreshold'] ?? self::SEUIL_BAS_DEFAUT),
        ];
    }

    /** @return array<string,mixed> */
    private function payloadReglages(string $portee): array
    {
        $brut = $this->db->valeur('SELECT payload FROM settings WHERE scope = :portee', [':portee' => $portee]);
        $payload = Db::dejson($brut, []);

        return is_array($payload) ? $payload : [];
    }

    /**
     * Identifiant de commande libre, au format `KA######` du frontend.
     * Appelé DANS la transaction d'écriture : le verrou est déjà pris, la
     * vérification d'unicité ne peut pas être doublée par un concurrent.
     */
    private function identifiantCommandeLibre(): string
    {
        for ($essai = 0; $essai < 20; $essai++) {
            $id = 'KA' . random_int(100000, 999999);
            if ($this->db->valeur('SELECT id FROM orders WHERE id = :id', [':id' => $id]) === null) {
                return $id;
            }
        }

        // 20 collisions d'affilée : ce n'est pas de la malchance, c'est un
        // espace d'identifiants saturé. On le dit au lieu d'écraser.
        throw new ApiException(
            500,
            'ID_EXHAUSTED',
            'Impossible de générer un identifiant de commande libre après 20 tentatives : '
            . 'l\'espace « KA###### » est saturé, il faut l\'élargir.',
        );
    }

    // =================================================================
    // Coupons — logique partagée avec ControleurCoupons
    // =================================================================

    /**
     * Motif de refus d'un coupon, ou null s'il est applicable.
     * Reproduit `validateCoupon()` de src/lib/admin-store.tsx.
     *
     * @param array<string,mixed> $coupon
     */
    public static function refusCoupon(array $coupon, int $sousTotal): ?string
    {
        if ((int) $coupon['active'] !== 1) {
            return 'Ce code est désactivé.';
        }

        $expiration = $coupon['expires_at'];
        if (is_string($expiration) && $expiration !== '') {
            $horodatage = strtotime($expiration);
            if ($horodatage !== false && $horodatage < time()) {
                return 'Ce code a expiré.';
            }
        }

        $limite = (int) $coupon['usage_limit'];
        if ($limite > 0 && (int) $coupon['usage_count'] >= $limite) {
            return 'Ce code a atteint sa limite d\'utilisation.';
        }

        $minimum = (int) $coupon['min_purchase'];
        if ($sousTotal < $minimum) {
            return sprintf('Achat minimum de %s DA requis.', number_format($minimum, 0, ',', ' '));
        }

        return null;
    }

    /**
     * Remise en DZD, entière, jamais supérieure au sous-total.
     *
     * @param array<string,mixed> $coupon
     */
    public static function remise(array $coupon, int $sousTotal): int
    {
        $valeur = (int) $coupon['value'];
        $remise = (string) $coupon['type'] === 'percent'
            ? (int) round($sousTotal * $valeur / 100)
            : $valeur;

        return max(0, min($remise, $sousTotal));
    }

    // =================================================================
    // Filtres
    // =================================================================

    /**
     * @return array{0:string[],1:array<string,mixed>}
     */
    private function filtres(Requete $r): array
    {
        $where = [];
        $params = [];

        if (($v = $r->query('status')) !== null) {
            if (!in_array($v, self::STATUTS, true)) {
                throw ApiException::validation('Filtre invalide.', [
                    'status' => ['Valeurs acceptées : ' . implode(', ', self::STATUTS) . '.'],
                ]);
            }
            $where[] = 'status = :status';
            $params[':status'] = $v;
        }
        if (($v = $r->query('customerId')) !== null) {
            $where[] = 'customer_id = :customerId';
            $params[':customerId'] = $v;
        }
        if (($v = $r->query('from')) !== null) {
            $where[] = 'created_at >= :depuis';
            $params[':depuis'] = $v;
        }
        if (($v = $r->query('to')) !== null) {
            $where[] = 'created_at <= :jusqua';
            $params[':jusqua'] = $v;
        }

        // Un paramètre nommé ne peut PAS apparaître deux fois (MySQL sans
        // émulation) : un placeholder distinct par occurrence.
        if (($v = $r->query('search')) !== null) {
            $motif = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
            $where[] = '(LOWER(id) LIKE :search1 OR LOWER(customer_name) LIKE :search2 '
                . 'OR LOWER(customer_email) LIKE :search3 OR phone LIKE :search4)';
            $params[':search1'] = $motif;
            $params[':search2'] = $motif;
            $params[':search3'] = $motif;
            $params[':search4'] = $motif;
        }

        return [$where, $params];
    }

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    // =================================================================
    // Mapping ligne SQL → DTO du contrat
    // =================================================================

    /**
     * Lignes de commande des commandes données, groupées par `order_id`.
     *
     * Une seule requête pour toute la page : N+1 requêtes sur une liste de 200
     * commandes se paient comptant sur un mutualisé. Les placeholders sont
     * générés par le serveur (`:cmd0`, `:cmd1`, …), jamais par l'utilisateur.
     *
     * @param string[] $ids
     * @return array<string,array<int,array<string,mixed>>>
     */
    private function lignesDe(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $placeholders = [];
        $params = [];
        foreach (array_values($ids) as $rang => $id) {
            $placeholders[] = ':cmd' . $rang;
            $params[':cmd' . $rang] = $id;
        }

        $lignes = $this->db->tous(
            'SELECT * FROM order_items WHERE order_id IN (' . implode(', ', $placeholders) . ') '
            . 'ORDER BY order_id ASC, position ASC, id ASC',
            $params,
        );

        $parCommande = [];
        foreach ($lignes as $ligne) {
            $parCommande[(string) $ligne['order_id']][] = $ligne;
        }

        return $parCommande;
    }

    /**
     * @param array<int,array<string,mixed>> $lignes
     * @return array<int,array<string,mixed>>
     */
    private function enDtos(array $lignes): array
    {
        $ids = array_map(static fn (array $l): string => (string) $l['id'], $lignes);
        $articles = $this->lignesDe($ids);

        return array_map(fn (array $l): array => $this->enDto($l, $articles), $lignes);
    }

    /**
     * Rend EXACTEMENT le type `Order` de src/lib/admin-store.tsx.
     *
     * `items[].name` est rendu tel quel : c'est une chaîne simple figée à
     * l'écriture, pas un objet localisé. Ne jamais tenter de la relire depuis
     * `products.name` (docs/LOCALIZED-DATA.md §6).
     *
     * @param array<string,mixed> $l
     * @param array<string,array<int,array<string,mixed>>> $articles
     * @return array<string,mixed>
     */
    private function enDto(array $l, array $articles): array
    {
        $id = (string) $l['id'];

        $items = [];
        foreach ($articles[$id] ?? [] as $article) {
            $item = [
                'productId' => (string) $article['product_id'],
                'name' => (string) $article['name'],
                'price' => (int) $article['price'],
                'qty' => (int) $article['qty'],
            ];
            if ($article['image'] !== null && $article['image'] !== '') {
                $item['image'] = (string) $article['image'];
            }
            $items[] = $item;
        }

        $historique = Db::dejson($l['status_history'], []);

        $dto = [
            'id' => $id,
            // Le type TS déclare `customerId: string` : une commande invité
            // rend une chaîne vide, jamais `null`.
            'customerId' => (string) ($l['customer_id'] ?? ''),
            'customerName' => (string) $l['customer_name'],
            'items' => $items,
            'subtotal' => (int) $l['subtotal'],
            'discount' => (int) $l['discount'],
            'shipping' => (int) $l['shipping'],
            'total' => (int) $l['total'],
            'status' => (string) $l['status'],
            'statusHistory' => is_array($historique) ? $historique : [],
            'paymentMethod' => (string) $l['payment_method'],
            'wilaya' => (string) $l['wilaya'],
            'deliveryKind' => (string) $l['delivery_kind'],
            'address' => (string) $l['address'],
            'phone' => (string) $l['phone'],
            'createdAt' => (string) $l['created_at'],
        ];

        // Champs optionnels du type TS : OMIS quand ils sont nuls, pas rendus
        // à `null` — `couponCode?: string` n'accepte pas `null`.
        if ($l['customer_email'] !== null && $l['customer_email'] !== '') {
            $dto['customerEmail'] = (string) $l['customer_email'];
        }
        if ($l['coupon_code'] !== null && $l['coupon_code'] !== '') {
            $dto['couponCode'] = (string) $l['coupon_code'];
        }
        if ($l['payment_label'] !== null && $l['payment_label'] !== '') {
            $dto['paymentLabel'] = (string) $l['payment_label'];
        }
        if ($l['note'] !== null && $l['note'] !== '') {
            $dto['note'] = (string) $l['note'];
        }

        return $dto;
    }

    // =================================================================
    // Émission d'événements outbox — partagée entre le vidage en sortie
    // (fin de requête HTTP) et, à terme, vider-outbox.php si refactorisé.
    // =================================================================

    /**
     * Tente d'émettre un événement issu de l'outbox.
     *
     * Cette méthode est statique pour pouvoir être passée comme callable à
     * `Outbox::enregistrerVidageEnSortie()` sans capturer `$this` (le
     * contrôleur n'est pas disponible dans une shutdown function après que
     * l'objet peut avoir été détruit).
     *
     * Structure extensible : les topics nommés (order.created) sont traités
     * en premier ; tout autre topic est journalisé et considéré émis (pas
     * d'échec pour un topic inconnu, qui serait bloquant indéfiniment).
     *
     * Aucune transaction n'est ouverte ici. Le marquage (marquerEmis /
     * marquerEchec) est fait par l'appelant dans Outbox::enregistrerVidageEnSortie.
     *
     * @param array<string,mixed> $evt   Ligne de la table outbox
     * @param string              $appUrl URL de base de l'application (APP_URL)
     * @return string|null null si succès, message d'erreur sinon
     */
    private static function emettreEvenement(array $evt, string $appUrl): ?string
    {
        $topic      = (string) $evt['topic'];
        $payloadBrut = $evt['payload'];

        $payload = is_string($payloadBrut)
            ? (array) (json_decode($payloadBrut, true) ?? [])
            : (array) $payloadBrut;

        switch ($topic) {
            case 'order.created':
                return self::emettreEmailCommande($payload);

            case 'order.status_updated':
                return self::emettreEmailStatutCommande($payload, $appUrl);

            case 'stock.rupture':
                // La rupture de stock est une notification au commerçant.
                // Elle passe par le même canal que la confirmation de commande
                // mais avec un message différent. Pour l'instant, on logue et
                // on marque émis — la notification spécifique sera ajoutée
                // quand un modèle de courriel de rupture sera disponible.
                Db::journaliserStatique(
                    '[outbox] stock.rupture ignoré (pas de handler dédié) — '
                    . 'produitId=' . ($payload['produitId'] ?? '?')
                );

                return null;

            default:
                // Topic inconnu : on ne fait pas échouer pour éviter de bloquer
                // la file indéfiniment. On logue pour que l'exploitant soit au
                // courant (AGENTS.md §7, rendre les échecs visibles).
                Db::journaliserStatique(
                    "[outbox] Topic « {$topic} » ignoré : aucun handler local. "
                    . 'Configurez OUTBOX_WEBHOOK_URL pour les topics génériques.'
                );

                return null;
        }
    }

    /**
     * Émet un email de confirmation de commande (client) et de notification
     * au commerçant.
     *
     * Factorisation : la même logique se trouve dans api/tools/vider-outbox.php.
     * Quand ce fichier sera refactorisé, il appellera cette méthode (ou une
     * méthode équivalente dans Outbox) plutôt que de dupliquer le dispatch.
     *
     * @param array<string,mixed> $payload
     * @return string|null null si succès, message d'erreur sinon
     */
    private static function emettreEmailCommande(array $payload): ?string
    {
        try {
            // ---- Email au client -------------------------------------------
            $emailClient = (string) ($payload['clientEmail'] ?? '');
            if ($emailClient !== '' && filter_var($emailClient, FILTER_VALIDATE_EMAIL)) {
                $msg = ConfirmationCommande::generer($payload);
                Courriel::envoyer(
                    $emailClient,
                    (string) ($payload['clientNom'] ?? ''),
                    $msg['sujet'],
                    $msg['texte'],
                    $msg['html'],
                );
            }

            // ---- Notification au commerçant --------------------------------
            $emailCommerçant = (string) Env::get('NOTIFY_OWNER_EMAIL', '');
            if ($emailCommerçant !== '' && filter_var($emailCommerçant, FILTER_VALIDATE_EMAIL)) {
                $msg = NouvelleCommande::generer($payload);
                Courriel::envoyer(
                    $emailCommerçant,
                    (string) Env::get('NOTIFY_OWNER_NAME', 'KA Tech Hub'),
                    $msg['sujet'],
                    $msg['texte'],
                    $msg['html'],
                );
            }

            return null;
        } catch (\Throwable $e) {
            return 'Envoi email order.created : ' . $e->getMessage();
        }
    }

    /**
     * Émet un email au client informant du changement de statut de sa commande.
     *
     * @param array<string,mixed> $payload
     * @return string|null null si succès, message d'erreur sinon
     */
    private static function emettreEmailStatutCommande(array $payload, string $appUrl): ?string
    {
        try {
            $emailClient = (string) ($payload['clientEmail'] ?? '');
            if ($emailClient !== '' && filter_var($emailClient, FILTER_VALIDATE_EMAIL)) {
                $msg = \KaTech\Modeles\StatutCommandeCourriel::generer($payload, $appUrl);
                Courriel::envoyer(
                    $emailClient,
                    (string) ($payload['clientNom'] ?? ''),
                    $msg['sujet'],
                    $msg['texte'],
                    $msg['html'],
                );
            }

            return null;
        } catch (\Throwable $e) {
            Db::journaliserStatique('[outbox] Échec envoi email statut commande : ' . $e->getMessage());
            return 'Envoi email order.status_updated : ' . $e->getMessage();
        }
    }

    /**
     * Résout un `Localized<string>` en CHAÎNE SIMPLE pour une empreinte
     * historique (`order_items.name`, `stock_movements.product_name`).
     *
     * Repli en cascade : langue demandée → `fr` (référence) → première
     * variante non vide → identifiant du produit. Une facture doit porter un
     * libellé, jamais « [object Object] » ni une chaîne vide.
     */
    private function libelleFige(mixed $nom, string $langue, string $repli): string
    {
        $valeur = Db::dejson($nom, $nom);

        if (is_string($valeur)) {
            return $valeur === '' ? $repli : $valeur;
        }

        if (is_array($valeur)) {
            foreach ([$langue, 'fr', 'en', 'ar'] as $cle) {
                if (isset($valeur[$cle]) && is_string($valeur[$cle]) && $valeur[$cle] !== '') {
                    return $valeur[$cle];
                }
            }
            foreach ($valeur as $variante) {
                if (is_string($variante) && $variante !== '') {
                    return $variante;
                }
            }
        }

        Db::journaliserStatique(
            "Libellé de produit illisible pour « {$repli} » : empreinte de ligne repliée sur l'identifiant."
        );

        return $repli;
    }
}
