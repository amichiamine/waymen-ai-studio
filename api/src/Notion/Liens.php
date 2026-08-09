<?php

/**
 * Accès à la table de liaison `notion_links` — commande ↔ page Notion.
 *
 * Un seul fichier connaît cette table. Les trois agents qui suivent (routes,
 * écran, webhook) passent par ici : dupliquer deux requêtes SQL, c'est se
 * garantir qu'un jour l'une des deux oubliera de mettre `updated_at` à jour.
 *
 * PIÈGE DE DIALECTE respecté partout (docs/BACKEND.md §4, piège n°1) : avec
 * `ATTR_EMULATE_PREPARES = false`, MySQL REFUSE qu'un même paramètre nommé
 * apparaisse deux fois dans une requête. Chaque occurrence a donc son propre
 * nom, même quand la valeur est identique.
 */

declare(strict_types=1);

namespace KaTech\Notion;

use KaTech\Db;

final class Liens
{
    public function __construct(private readonly Db $db)
    {
    }

    /**
     * Sens commande → page.
     *
     * @return array<string,mixed>|null
     */
    public function pourCommande(string $commandeId): ?array
    {
        return $this->db->un(
            'SELECT * FROM notion_links WHERE order_id = :commande',
            [':commande' => $commandeId],
        );
    }

    /**
     * Sens page → commande. C'est TOUT ce que le webhook connaît : Notion
     * n'envoie qu'un identifiant de page, jamais notre référence de commande.
     * D'où l'index UNIQUE sur `page_id`.
     *
     * @return array<string,mixed>|null
     */
    public function pourPage(string $pageId): ?array
    {
        return $this->db->un(
            'SELECT * FROM notion_links WHERE page_id = :page',
            [':page' => $pageId],
        );
    }

    /**
     * Crée ou met à jour le lien après une écriture SORTANTE réussie.
     *
     * `pushed_hash` mémorise l'état exact qu'on vient d'écrire dans Notion :
     * la prochaine synchronisation le comparera et n'émettra rien si rien n'a
     * bougé. `last_error` est remis à null — un succès efface la plainte
     * précédente, sinon l'écran Notion afficherait éternellement une panne
     * résolue.
     */
    public function noterPoussee(
        string $commandeId,
        string $pageId,
        string $dataSourceId,
        string $empreinte,
    ): void {
        $maintenant = gmdate('c');

        $this->db->upsert(
            'notion_links',
            [
                'order_id' => $commandeId,
                'page_id' => $pageId,
                'data_source_id' => $dataSourceId,
                'pushed_hash' => $empreinte,
                'pushed_at' => $maintenant,
                'last_error' => null,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ],
            ['order_id'],
            // `created_at` n'est PAS écrasé : c'est la date du premier
            // rattachement, elle ne doit pas glisser à chaque synchronisation.
            ['page_id', 'data_source_id', 'pushed_hash', 'pushed_at', 'last_error', 'updated_at'],
        );
    }

    /**
     * Enregistre ce qui vient d'être REÇU de Notion (webhook).
     *
     * `pulled_hash` porte l'empreinte de l'état entrant. Le miroir sortant s'y
     * réfère pour ne pas renvoyer à Notion le changement que Notion vient de
     * nous annoncer — le piège de l'écho, qui sinon boucle indéfiniment.
     */
    public function noterReception(
        string $commandeId,
        string $empreinte,
        ?string $transporteur,
        ?string $colis,
    ): void {
        $maintenant = gmdate('c');

        $this->db->run(
            'UPDATE notion_links SET pulled_hash = :empreinte, pulled_at = :recuAt, '
            . 'carrier = :transporteur, tracking_number = :colis, updated_at = :majAt '
            . 'WHERE order_id = :commande',
            [
                ':empreinte' => $empreinte,
                // Deux noms distincts pour la même valeur : MySQL l'exige.
                ':recuAt' => $maintenant,
                ':majAt' => $maintenant,
                ':transporteur' => $transporteur,
                ':colis' => $colis,
                ':commande' => $commandeId,
            ],
        );
    }

    /**
     * Consigne un échec SUR LE LIEN (et non seulement dans l'outbox).
     *
     * Pourquoi les deux : l'outbox porte l'échec de l'ÉVÉNEMENT, qui finira
     * par disparaître de la vue « en attente » après cinq tentatives. Le lien,
     * lui, reste : c'est là qu'on lit « cette commande-ci n'est pas à jour
     * dans Notion, et voici pourquoi ». Sans ça, un échec définitif deviendrait
     * invisible — exactement l'échec silencieux qu'AGENTS.md §7 interdit.
     */
    public function noterErreur(string $commandeId, ?string $message): void
    {
        $ligne = $this->pourCommande($commandeId);
        if ($ligne === null) {
            // Pas encore de page : rien à annoter. L'échec reste porté par
            // l'outbox, ce qui suffit à le rendre visible.
            return;
        }

        $this->db->run(
            'UPDATE notion_links SET last_error = :erreur, updated_at = :majAt WHERE order_id = :commande',
            [':erreur' => $message, ':majAt' => gmdate('c'), ':commande' => $commandeId],
        );
    }

    /**
     * Commandes déjà liées mais dont la dernière poussée a échoué — alimente
     * `POST /notion/renvoyer`.
     *
     * @return array<int,array<string,mixed>>
     */
    public function enEchec(int $limite = 100): array
    {
        return $this->db->tous(
            'SELECT * FROM notion_links WHERE last_error IS NOT NULL ORDER BY updated_at ASC LIMIT :limite',
            [':limite' => $limite],
        );
    }

    /**
     * Commandes qui n'ont AUCUNE page Notion — le cas du rattrapage après
     * mise en service (les commandes d'avant l'installation du miroir).
     *
     * @return array<int,string> identifiants de commandes, de la plus récente à la plus ancienne
     */
    public function commandesSansPage(int $limite = 50): array
    {
        $lignes = $this->db->tous(
            'SELECT o.id FROM orders o LEFT JOIN notion_links n ON n.order_id = o.id '
            . 'WHERE n.order_id IS NULL ORDER BY o.created_at DESC LIMIT :limite',
            [':limite' => $limite],
        );

        return array_map(static fn (array $l): string => (string) $l['id'], $lignes);
    }

    /** Nombre de commandes dont la synchronisation Notion est en défaut (écran d'état). */
    public function nombreEnEchec(): int
    {
        return (int) $this->db->valeur('SELECT COUNT(*) FROM notion_links WHERE last_error IS NOT NULL');
    }
}
