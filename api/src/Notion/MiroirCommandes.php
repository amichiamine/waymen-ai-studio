<?php

/**
 * Le miroir : recopie des commandes vers Notion, et retour du suivi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE CE FICHIER N'EST PAS
 * Ce n'est PAS une file d'attente. `api/src/Outbox.php` existe, est éprouvé,
 * porte déjà 5 tentatives, un recul exponentiel, une réservation atomique et
 * une récupération des processus morts. On y ajoute un CONSOMMATEUR ; on n'en
 * réécrit pas une ligne. Zéro duplication (SKILLS.md S6).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * LES QUATRE RÈGLES QUI GOUVERNENT CE FICHIER
 *
 * 1. AUCUN APPEL RÉSEAU DANS UNE TRANSACTION. Le consommateur ne tourne
 *    qu'APRÈS le `commit()` de la commande, dans la fonction de fin de script
 *    de l'outbox. Le sens entrant lit Notion d'abord, puis ouvre une
 *    transaction courte pour écrire. Tenir un verrou de base pendant qu'on
 *    attend un serveur distant est la meilleure façon de bloquer une boutique.
 *
 * 2. NOTION ÉTEINT NE DOIT JAMAIS EMPÊCHER DE VENDRE. La commande est déjà
 *    committée quand ce code s'exécute. Un échec ici rend un MESSAGE, jamais
 *    une exception : l'outbox le range dans `last_error`, repousse
 *    `available_at` et l'événement reste « pending » — donc compté par
 *    `GET /maintenance/status` (`outboxPending`). La vente, elle, a eu lieu.
 *
 * 3. NON CONFIGURÉ = RIEN DU TOUT. Pas d'erreur, pas de journal, pas d'appel.
 *    Le seul coût pour une boutique qui n'utilisera jamais Notion est une
 *    lecture de `settings` par lot d'événements.
 *
 * 4. L'ÉCHEC EST VISIBLE. Trois endroits, aucun n'est optionnel :
 *    journal serveur (diagnostic), `outbox.last_error` + compteur
 *    `outboxPending` de `GET /maintenance/status` (exploitant), et
 *    `notion_links.last_error` + `settings.notion.derniereErreur` (écran du
 *    commerçant). Une dégradation gracieuse silencieuse masque ses pannes.
 */

declare(strict_types=1);

namespace KaTech\Notion;

use KaTech\Db;
use KaTech\Journal;
use Throwable;

final class MiroirCommandes
{
    /** Le seul sujet d'outbox que ce miroir consomme aujourd'hui. */
    public const TOPIC_COMMANDE = 'order.created';

    /**
     * Plafond d'appels réseau par exécution de `renvoyer()`.
     *
     * À 3 requêtes/seconde, 20 commandes = ~7 secondes. Au-delà, on dépasse le
     * temps d'exécution habituel d'un mutualisé (30 s) et on rend une réponse
     * tronquée sans le dire. Mieux vaut annoncer « il en reste » et laisser le
     * commerçant recliquer.
     */
    public const LOT_RENVOI = 20;

    private readonly Liens $liens;

    /**
     * Configuration mémorisée pour la durée du processus : un lot de 5
     * événements ne doit pas relire `settings` cinq fois.
     */
    private ?Configuration $config = null;

    public function __construct(private readonly Db $db)
    {
        $this->liens = new Liens($db);
    }

    /**
     * Émetteur à brancher sur `Outbox::enregistrerVidageEnSortie()`.
     *
     * Signature imposée par l'outbox : `callable(array $evt): ?string` — null
     * si succès (ou si l'événement ne nous concerne pas), message d'erreur
     * sinon.
     */
    public static function emetteur(Db $db): callable
    {
        $miroir = new self($db);

        return static fn (array $evt): ?string => $miroir->traiter($evt);
    }

    /**
     * Traite un événement d'outbox.
     *
     * @param array<string,mixed> $evt Ligne de la table `outbox`.
     * @return string|null null = succès ou hors sujet ; message = échec réessayable.
     */
    public function traiter(array $evt): ?string
    {
        if ((string) ($evt['topic'] ?? '') !== self::TOPIC_COMMANDE) {
            return null; // Un autre consommateur s'en occupe (courriels).
        }

        $config = $this->configuration();

        // Règle 3 : non configuré, désactivé, ou tableau pas encore créé →
        // silence complet. Surtout PAS de journal : une boutique qui n'utilise
        // pas Notion n'a pas à voir une ligne par commande dans ses logs.
        if (!$config->miroirOperationnel()) {
            return null;
        }

        $payload = Db::dejson($evt['payload'] ?? null, []);
        $commandeId = is_array($payload) ? (string) ($payload['commandeId'] ?? '') : '';

        if ($commandeId === '') {
            // Événement malformé : on ne bloque pas la file pour autant, mais
            // on le dit. Rendre null ferait disparaître le problème.
            Db::journaliserStatique('[notion] Événement order.created sans commandeId — ignoré.');

            return null;
        }

        return $this->synchroniser($commandeId, $config);
    }

    /**
     * Recopie une commande vers Notion : création ou mise à jour de sa page.
     *
     * @return string|null null si succès (ou si rien n'avait changé),
     *                     message destiné au commerçant sinon.
     */
    public function synchroniser(string $commandeId, ?Configuration $config = null): ?string
    {
        $config ??= $this->configuration();
        if (!$config->miroirOperationnel()) {
            return null;
        }

        $client = $config->client();
        $dataSourceId = $config->dataSourceId();
        if ($client === null || $dataSourceId === null) {
            return null;
        }

        $commande = $this->db->un('SELECT * FROM orders WHERE id = :commande', [':commande' => $commandeId]);
        if ($commande === null) {
            // Commande supprimée entre le dépôt de l'événement et son
            // traitement. Ce n'est pas une panne : il n'y a plus rien à copier.
            return null;
        }

        $articles = $this->db->tous(
            'SELECT name, price, qty FROM order_items WHERE order_id = :commande ORDER BY position ASC, id ASC',
            [':commande' => $commandeId],
        );

        $lien = $this->liens->pourCommande($commandeId);
        $suivi = [
            'carrier' => $lien['carrier'] ?? null,
            'tracking_number' => $lien['tracking_number'] ?? null,
        ];

        $proprietes = SchemaCommandes::versNotion($commande, $articles, $suivi);
        $empreinte = SchemaCommandes::empreinte($proprietes);

        // ---- Anti-écho -------------------------------------------------
        // Si l'état à écrire est EXACTEMENT celui déjà écrit (`pushed_hash`),
        // ou exactement celui que Notion vient de nous annoncer
        // (`pulled_hash`), on n'émet rien. Sans ce test, un changement de
        // statut fait dans Notion déclencherait : webhook → écriture en base
        // → poussée vers Notion → nouveau webhook → … Le quota de 3 req/s
        // partirait en fumée sur une boucle qui ne produit rien.
        if ($lien !== null
            && ($empreinte === (string) ($lien['pushed_hash'] ?? '')
                || $empreinte === (string) ($lien['pulled_hash'] ?? ''))
        ) {
            return null;
        }

        try {
            if ($lien === null) {
                $pageId = $client->creerPage($dataSourceId, $proprietes);
            } else {
                $pageId = (string) $lien['page_id'];
                $client->majPage($pageId, $proprietes);
            }
        } catch (ErreurNotion $e) {
            return $this->consignerEchec($commandeId, $e);
        } catch (Throwable $e) {
            // Filet : l'outbox ne doit jamais voir une exception inattendue
            // remonter d'un émetteur (elle la rattrape, mais le message serait
            // technique et partirait vers l'écran du commerçant).
            Db::journaliserStatique('[notion] Anomalie inattendue sur ' . $commandeId . ' : ' . $e->getMessage());

            return 'La recopie de la commande vers Notion a échoué pour une raison inattendue. '
                . 'Elle sera retentée automatiquement ; la commande, elle, est bien enregistrée.';
        }

        $this->liens->noterPoussee($commandeId, $pageId, $dataSourceId, $empreinte);
        $config->noterErreur(null);

        return null;
    }

    /**
     * Sens ENTRANT : une page Notion a changé, on en tire le suivi.
     *
     * Appelé par `POST /notion/webhook` (route publique, signature HMAC
     * vérifiée en amont par `Webhook::verifierSignature()` — ce n'est PAS le
     * rôle de cette méthode).
     *
     * SEULS quatre champs sont acceptés : statut, transporteur, numéro de
     * colis, note. Tout le reste de la page est ignoré même s'il a été modifié
     * — la base reste maîtresse du stock, des prix et des paiements.
     *
     * @return array{applique:bool,raison:string,commandeId:?string}
     */
    public function appliquerPageEntrante(string $pageId): array
    {
        $config = $this->configuration();
        if (!$config->miroirOperationnel()) {
            return ['applique' => false, 'raison' => 'miroir inactif', 'commandeId' => null];
        }

        $lien = $this->liens->pourPage($pageId);
        if ($lien === null) {
            // Page inconnue : une page créée à la main dans le tableau, ou la
            // notification d'une autre base. On l'ignore SANS erreur — Notion
            // renverrait sinon indéfiniment le même événement.
            return ['applique' => false, 'raison' => 'page hors périmètre', 'commandeId' => null];
        }

        $commandeId = (string) $lien['order_id'];
        $client = $config->client();
        if ($client === null) {
            return ['applique' => false, 'raison' => 'miroir inactif', 'commandeId' => $commandeId];
        }

        // Lecture réseau AVANT toute transaction (règle 1). On ne fait pas
        // confiance au corps du webhook : Notion y met un résumé, pas l'état.
        try {
            $page = $client->lirePage($pageId);
        } catch (ErreurNotion $e) {
            $this->consignerEchec($commandeId, $e);

            return ['applique' => false, 'raison' => $e->getMessage(), 'commandeId' => $commandeId];
        }

        $recu = SchemaCommandes::depuisNotion($page);

        $commande = $this->db->un('SELECT * FROM orders WHERE id = :commande', [':commande' => $commandeId]);
        if ($commande === null) {
            return ['applique' => false, 'raison' => 'commande supprimée', 'commandeId' => $commandeId];
        }

        $nouveauStatut = $recu['statut'];
        if ($nouveauStatut === null && ($page['properties'][SchemaCommandes::COL_STATUT] ?? null) !== null) {
            // Statut saisi à la main dans Notion, hors de nos cinq valeurs.
            // On ne l'écrit PAS en base (le contrat d'API l'interdirait) et on
            // le dit, plutôt que de laisser le commerçant croire que ça a pris.
            Db::journaliserStatique(
                '[notion] Statut inconnu reçu pour la commande ' . $commandeId . ' — ignoré. '
                . 'Seuls les cinq statuts prévus sont acceptés.'
            );
        }

        $note = $recu['note'];
        $maintenant = gmdate('c');

        // Transaction COURTE : plus aucun appel réseau à partir d'ici.
        $this->db->transaction(function (Db $d) use (
            $commandeId,
            $commande,
            $nouveauStatut,
            $note,
            $maintenant
        ): void {
            $statutActuel = (string) $commande['status'];

            if ($nouveauStatut !== null && $nouveauStatut !== $statutActuel) {
                // L'historique de statut du projet est un tableau JSON :
                // on l'ALLONGE, on ne le remplace pas.
                $historique = Db::dejson($commande['status_history'] ?? null, []);
                $historique = is_array($historique) ? $historique : [];
                $historique[] = [
                    'status' => $nouveauStatut,
                    'at' => $maintenant,
                    'by' => 'notion',
                ];

                $d->run(
                    'UPDATE orders SET status = :statut, status_history = :historique, '
                    . 'updated_at = :majAt WHERE id = :commande',
                    [
                        ':statut' => $nouveauStatut,
                        ':historique' => Db::json($historique),
                        ':majAt' => $maintenant,
                        ':commande' => $commandeId,
                    ],
                );
            }

            if ($note !== null && $note !== (string) ($commande['note'] ?? '')) {
                $d->run(
                    'UPDATE orders SET note = :note, updated_at = :majAt WHERE id = :commande',
                    [':note' => $note === '' ? null : $note, ':majAt' => $maintenant, ':commande' => $commandeId],
                );
            }
        });

        // Empreinte de l'état APRÈS application : c'est elle qui coupe l'écho.
        // On recalcule les propriétés sortantes telles qu'elles seraient si on
        // repoussait maintenant ; si elles sont identiques à ce qui est déjà
        // dans Notion, `synchroniser()` n'émettra pas d'appel.
        $commandeMaj = (array) $this->db->un(
            'SELECT * FROM orders WHERE id = :commande',
            [':commande' => $commandeId],
        );
        $articles = $this->db->tous(
            'SELECT name, price, qty FROM order_items WHERE order_id = :commande ORDER BY position ASC, id ASC',
            [':commande' => $commandeId],
        );
        $empreinte = SchemaCommandes::empreinte(SchemaCommandes::versNotion($commandeMaj, $articles, [
            'carrier' => $recu['transporteur'],
            'tracking_number' => $recu['colis'],
        ]));

        $this->liens->noterReception($commandeId, $empreinte, $recu['transporteur'], $recu['colis']);

        Journal::consigner($this->db, 'notion_suivi_recu', 'order', [
            'id' => $commandeId,
            'statut' => $nouveauStatut,
            'transporteur' => $recu['transporteur'],
            'colis' => $recu['colis'],
        ]);

        return ['applique' => true, 'raison' => 'suivi mis à jour', 'commandeId' => $commandeId];
    }

    /**
     * Relance les recopies en retard — alimente `POST /notion/renvoyer`.
     *
     * Couvre trois cas, dans cet ordre de priorité :
     *   1. les commandes déjà liées dont la dernière poussée a échoué ;
     *   2. les commandes sans page (mise en service après coup : le tableau se
     *      remplit avec l'historique récent) ;
     *   3. les commandes dont l'état a changé côté administration sans qu'un
     *      événement soit émis — le cas d'un statut modifié dans le
     *      back-office. `synchroniser()` compare les empreintes et n'émet un
     *      appel que s'il y a vraiment une différence.
     *
     * @return array{traitees:int,echecs:int,reste:bool,messages:array<int,string>}
     */
    public function renvoyer(int $limite = self::LOT_RENVOI): array
    {
        $config = $this->configuration();
        if (!$config->miroirOperationnel()) {
            return ['traitees' => 0, 'echecs' => 0, 'reste' => false, 'messages' => []];
        }

        $candidats = [];
        foreach ($this->liens->enEchec($limite) as $l) {
            $candidats[] = (string) $l['order_id'];
        }
        foreach ($this->liens->commandesSansPage($limite) as $id) {
            $candidats[] = $id;
        }
        $candidats = array_values(array_unique($candidats));

        $reste = count($candidats) > $limite;
        $candidats = array_slice($candidats, 0, $limite);

        $traitees = 0;
        $echecs = 0;
        $messages = [];

        foreach ($candidats as $commandeId) {
            $erreur = $this->synchroniser($commandeId, $config);
            if ($erreur === null) {
                $traitees++;

                continue;
            }
            $echecs++;
            if (!in_array($erreur, $messages, true)) {
                // On ne répète pas vingt fois le même message : le commerçant
                // veut savoir CE QUI cloche, pas combien de fois.
                $messages[] = $erreur;
            }
        }

        return ['traitees' => $traitees, 'echecs' => $echecs, 'reste' => $reste, 'messages' => $messages];
    }

    /**
     * Nombre d'événements Notion encore en attente dans l'outbox — alimente le
     * champ `enAttente` de `GET /notion/status`.
     */
    public function nombreEnAttente(): int
    {
        return (int) $this->db->valeur(
            "SELECT COUNT(*) FROM outbox WHERE topic = :sujet AND status IN ('pending', 'processing')",
            [':sujet' => self::TOPIC_COMMANDE],
        );
    }

    // ---- Interne --------------------------------------------------------

    private function configuration(): Configuration
    {
        return $this->config ??= Configuration::charger($this->db);
    }

    /**
     * Rend l'échec visible aux trois endroits, et retourne le message destiné
     * au commerçant (celui que l'outbox rangera dans `last_error`).
     */
    private function consignerEchec(string $commandeId, ErreurNotion $e): string
    {
        // Journal serveur : le DÉTAIL technique, déjà expurgé du jeton.
        Db::journaliserStatique(sprintf(
            '[notion] %s sur la commande %s — %s',
            $e->codeNotion,
            $commandeId,
            $e->detailTechnique !== '' ? $e->detailTechnique : $e->getMessage(),
        ));

        // Écran du commerçant : le message en clair, sans jargon ni code HTTP.
        try {
            $this->liens->noterErreur($commandeId, $e->getMessage());
            $this->configuration()->noterErreur($e->getMessage());
        } catch (Throwable $interne) {
            // Ne jamais laisser la consignation d'un échec provoquer un second
            // échec : l'outbox porte déjà l'information.
            Db::journaliserStatique('[notion] Consignation de l\'échec impossible : ' . $interne->getMessage());
        }

        return $e->getMessage();
    }
}
