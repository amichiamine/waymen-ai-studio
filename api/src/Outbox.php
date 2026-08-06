<?php

/**
 * Outbox — dépôt d'événements différés.
 *
 * Principe : déposer un événement DANS la même transaction que le fait métier
 * (ex. création de commande), puis laisser un travailleur extérieur l'émettre.
 *
 * Règles absolues (PLAN.md §8) :
 *   - Aucun appel réseau ici. L'Outbox ne fait que lire/écrire en base.
 *   - Le dépôt est conçu pour participer à une transaction déjà ouverte par
 *     l'appelant — c'est essentiel pour l'atomicité. On n'ouvre PAS de nouvelle
 *     transaction ici.
 *   - Jamais d'échec silencieux : tout événement en échec définitif garde sa
 *     cause dans `last_error` et reste visible dans la table.
 *
 * Structure de la table `outbox` (schema.sqlite.sql §21) :
 *   id           — autoincrement
 *   topic        — type d'événement (ex. « order.created »)
 *   payload      — JSON
 *   status       — « pending » | « done » | « failed »
 *   attempts     — nombre de tentatives effectuées
 *   last_error   — message du dernier échec, null si succès
 *   available_at — date ISO à partir de laquelle l'événement peut être dépilé
 *   processed_at — date de la dernière tentative (succès ou abandon)
 *   created_at   — date de dépôt
 */

declare(strict_types=1);

namespace KaTech;

final class Outbox
{
    /**
     * Nombre maximal de tentatives avant abandon définitif.
     *
     * Au-delà, le statut passe à « failed » et le travailleur n'y touche plus.
     * Un exploitant peut alors diagnostiquer via `last_error` et, si besoin,
     * repasser manuellement le statut à « pending ».
     */
    public const MAX_TENTATIVES = 5;

    /**
     * Délai de recul progressif entre tentatives, en secondes.
     *
     * available_at est décalé de BASE × 2^(tentative-1) après chaque échec :
     *   1ʳᵉ erreur → +60 s
     *   2ᵉ          → +120 s
     *   3ᵉ          → +240 s
     *   4ᵉ          → +480 s
     *   5ᵉ → abandon définitif (statut « failed »)
     */
    private const RECUL_SECONDES_BASE = 60;

    public function __construct(private readonly Db $db)
    {
    }

    // =========================================================================
    // Dépôt
    // =========================================================================

    /**
     * Dépose un événement dans l'outbox.
     *
     * Cette méthode DOIT être appelée à l'intérieur d'une transaction déjà
     * ouverte par l'appelant. Elle n'ouvre ni ne ferme de transaction — c'est
     * la garantie d'atomicité : si la transaction parente est annulée (rollback),
     * l'événement n'est pas déposé non plus.
     *
     * @param string       $topic   Type d'événement (ex. « order.created »)
     * @param array<string,mixed> $payload Données de l'événement
     */
    public function deposer(string $topic, array $payload): void
    {
        $maintenant = gmdate('c');

        $this->db->inserer('outbox', [
            'topic'        => $topic,
            'payload'      => Db::json($payload),
            'status'       => 'pending',
            'attempts'     => 0,
            'last_error'   => null,
            'available_at' => $maintenant,
            'processed_at' => null,
            'created_at'   => $maintenant,
        ]);
    }

    // =========================================================================
    // Lecture
    // =========================================================================

    /**
     * Liste les événements en attente d'émission, disponibles maintenant.
     *
     * « Disponible » signifie : status = 'pending' ET available_at <= maintenant.
     * Les événements en recul progressif (available_at dans le futur) sont
     * ignorés jusqu'à leur fenêtre.
     *
     * @param int $limite Nombre maximal d'événements rendus (défaut 100)
     * @return array<int,array<string,mixed>>
     */
    public function enAttente(int $limite = 100): array
    {
        $maintenant = gmdate('c');

        return $this->db->tous(
            "SELECT * FROM outbox WHERE status = 'pending' AND available_at <= :maintenant "
            . 'ORDER BY id ASC LIMIT :limite',
            [':maintenant' => $maintenant, ':limite' => $limite],
        );
    }

    // =========================================================================
    // Marquage
    // =========================================================================

    /**
     * Marque un événement comme émis avec succès.
     *
     * L'appel est HORS transaction : on ne tient pas de verrou pendant les
     * appels réseau du travailleur.
     */
    public function marquerEmis(int $id): void
    {
        $maintenant = gmdate('c');

        $this->db->run(
            "UPDATE outbox SET status = 'done', processed_at = :at WHERE id = :id",
            [':at' => $maintenant, ':id' => $id],
        );
    }

    /**
     * Marque un échec d'émission.
     *
     * Si le nombre de tentatives atteint MAX_TENTATIVES, le statut passe à
     * « failed » (abandon définitif). Sinon, available_at est repoussé avec
     * un recul progressif (exponentiel) pour ne pas saturer les appels réseau.
     *
     * L'appel est HORS transaction : le marquage doit réussir même si
     * l'appel réseau a échoué.
     *
     * @param int    $id      Identifiant de l'événement
     * @param int    $tentatives Nombre de tentatives déjà effectuées (avant celle-ci)
     * @param string $erreur  Message d'erreur à conserver pour le diagnostic
     */
    public function marquerEchec(int $id, int $tentatives, string $erreur): void
    {
        $maintenant = gmdate('c');
        $nouvellesTentatives = $tentatives + 1;

        if ($nouvellesTentatives >= self::MAX_TENTATIVES) {
            // Abandon définitif : l'exploitant doit intervenir manuellement.
            $this->db->run(
                "UPDATE outbox SET status = 'failed', attempts = :tentatives, "
                . 'last_error = :erreur, processed_at = :at WHERE id = :id',
                [
                    ':tentatives' => $nouvellesTentatives,
                    ':erreur'     => $erreur,
                    ':at'         => $maintenant,
                    ':id'         => $id,
                ],
            );

            return;
        }

        // Recul progressif : 60 s × 2^(tentatives) — tentatives ∈ [0..3].
        $reculSecondes = self::RECUL_SECONDES_BASE * (2 ** $tentatives);
        $disponibleAt = gmdate('c', time() + $reculSecondes);

        $this->db->run(
            "UPDATE outbox SET status = 'pending', attempts = :tentatives, "
            . 'last_error = :erreur, processed_at = :at, available_at = :dispo WHERE id = :id',
            [
                ':tentatives' => $nouvellesTentatives,
                ':erreur'     => $erreur,
                ':at'         => $maintenant,
                ':dispo'      => $disponibleAt,
                ':id'         => $id,
            ],
        );
    }
}
