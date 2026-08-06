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
 *   status       — « pending » | « processing » | « done » | « failed »
 *   attempts     — nombre de tentatives effectuées
 *   last_error   — message du dernier échec, null si succès
 *   available_at — date ISO à partir de laquelle l'événement peut être dépilé
 *   processed_at — date de la dernière tentative (succès ou abandon)
 *   created_at   — date de dépôt
 *
 * Statut « processing » :
 *   Valeur transitoire posée par `reserverEvenements()` pour éviter qu'un
 *   appel concurrent (autre requête HTTP, CRON) ne traite le même événement.
 *   Si le processus qui a posé ce statut meurt avant de marquer « done » ou
 *   « pending », `restaurerProcessingExpires()` récupère ces événements après
 *   un délai de sécurité (DELAI_ABANDON_SECONDES).
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

    /**
     * Délai au-delà duquel un événement « processing » est considéré abandonné.
     *
     * Si le processus qui a réservé un événement se termine sans le marquer
     * (crash, timeout réseau), l'événement resterait bloqué en « processing »
     * pour toujours. Après ce délai, `restaurerProcessingExpires()` le remet
     * en « pending » pour qu'un prochain appel le reprenne.
     *
     * 300 s = 5 minutes : largement au-dessus du pire cas d'envoi SMTP (timeout
     * configuré à 15 s dans Courriel.php), mais court assez pour que le CRON
     * manuel puisse récupérer un abandon sans attendre une heure.
     */
    private const DELAI_ABANDON_SECONDES = 300;

    /**
     * Nombre maximal d'événements traités lors d'un vidage en fin de requête HTTP.
     *
     * Justification du chiffre : une commande typique dépose 1 à 2 événements
     * (order.created + éventuellement stock.rupture pour chaque produit épuisé).
     * Traiter 5 garantit de liquider le backlog récent sans risquer de bloquer
     * plusieurs secondes dans la requête d'un client qui vient d'acheter un câble.
     * Le CRON manuel (api/tools/vider-outbox.php) traite jusqu'à 50 événements
     * et reste le filet de sécurité pour les retards accumulés.
     */
    public const LIMITE_EN_SORTIE = 5;

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
     * Cette méthode est destinée à vider-outbox.php (CRON/manuel). Pour un
     * appel concurrent-safe (requête HTTP), utiliser `reserverEvenements()`.
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
    // Réservation atomique (anti-doublon entre processus)
    // =========================================================================

    /**
     * Réserve atomiquement un lot d'événements en les marquant « processing ».
     *
     * Garantie anti-doublon : deux processus (requête HTTP + CRON, ou deux
     * requêtes simultanées) ne peuvent pas prendre le même événement. En SQLite,
     * les écritures sont sérialisées par le moteur — le premier UPDATE prend
     * les lignes, le second ne trouve plus rien à réserver. En MySQL,
     * l'UPDATE conditionnel `WHERE status = 'pending'` garantit la même chose.
     *
     * Appeler `restaurerProcessingExpires()` avant ce SELECT pour récupérer les
     * événements abandonnés par un précédent processus (optionnel mais conseillé
     * dans les boucles longues comme le CRON).
     *
     * @param int $limite Nombre maximal d'événements à réserver
     * @return array<int,array<string,mixed>> Les événements réservés
     */
    public function reserverEvenements(int $limite): array
    {
        $maintenant = gmdate('c');

        // Sous-requête pour cibler les IDs, puis UPDATE sur ces IDs.
        // Deux processus concurrents : l'un obtient le verrou (SQLite : base
        // entière ; MySQL/PostgreSQL : UPDATE sérialisé) et UPDATE en premier ;
        // l'autre attend, puis trouve status='processing' dans sa sous-requête
        // et ne réserve rien.
        //
        // PIÈGE DE DIALECTE (docs/BACKEND.md §4) : MySQL interdit de modifier
        // une table dans une sous-requête de la même table (ERROR 1093). On
        // passe par une sous-requête intermédiaire (`ids`) pour contourner.
        // SQLite et PostgreSQL n'ont pas cette restriction.
        if ($this->db->estMysql()) {
            // MySQL : sous-requête intermédiaire obligatoire pour éviter ERROR 1093.
            $sql = "UPDATE outbox SET status = 'processing', processed_at = :at
                    WHERE id IN (
                        SELECT id FROM (
                            SELECT id FROM outbox
                            WHERE status = 'pending' AND available_at <= :maintenant
                            ORDER BY id ASC LIMIT :limite
                        ) AS ids
                    )";
        } else {
            // SQLite et PostgreSQL : syntaxe directe sans sous-requête intermédiaire.
            $sql = "UPDATE outbox SET status = 'processing', processed_at = :at
                    WHERE id IN (
                        SELECT id FROM outbox
                        WHERE status = 'pending' AND available_at <= :maintenant
                        ORDER BY id ASC LIMIT :limite
                    )";
        }

        $this->db->run($sql, [
            ':at'        => $maintenant,
            ':maintenant' => $maintenant,
            ':limite'    => $limite,
        ]);

        // SELECT des lignes qu'on vient de réserver : seule notre session peut
        // les voir avec status='processing' ET processed_at = $maintenant.
        // Deux processus simultanés ont des $maintenant différents à la seconde
        // près dans le pire cas, mais comme les UPDATE sont sérialisés, le second
        // ne met à jour aucune ligne — sa requête SELECT renvoie un tableau vide.
        return $this->db->tous(
            "SELECT * FROM outbox
             WHERE status = 'processing' AND processed_at = :at AND available_at <= :maintenant
             ORDER BY id ASC LIMIT :limite",
            [':at' => $maintenant, ':maintenant' => $maintenant, ':limite' => $limite],
        );
    }

    /**
     * Remet en « pending » les événements « processing » bloqués depuis trop
     * longtemps (processus mort avant de les marquer).
     *
     * À appeler en début de boucle CRON ou en début de `viderEnSortie()`.
     * L'opération est idempotente et sans effet si aucun processus n'est mort.
     */
    public function restaurerProcessingExpires(): void
    {
        // Un événement reste au maximum DELAI_ABANDON_SECONDES en « processing ».
        // Passé ce délai, il est rendu à la file normale pour être retenté.
        $limite = gmdate('c', time() - self::DELAI_ABANDON_SECONDES);

        $this->db->run(
            "UPDATE outbox SET status = 'pending'
             WHERE status = 'processing' AND processed_at < :limite",
            [':limite' => $limite],
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

    // =========================================================================
    // Vidage en fin de requête HTTP
    // =========================================================================

    /**
     * Enregistre une fonction de fin de script qui vide un lot de l'outbox
     * APRÈS que la réponse HTTP a été envoyée au client.
     *
     * Mécanisme selon le SAPI :
     *
     *   - FastCGI / LiteSpeed (production) : `fastcgi_finish_request()` ferme la
     *     connexion vers le navigateur avant d'exécuter la logique d'envoi.
     *     Le client reçoit sa réponse immédiatement ; l'envoi du courriel se
     *     fait dans la foulée, invisible pour lui.
     *
     *   - Serveur intégré `php -S` (développement) : `fastcgi_finish_request()`
     *     n'existe pas. Le serveur intégré est synchrone et mono-client : même
     *     avec un `flush()`, le client attend la fin complète du script. En
     *     simulation (SMTP_SIMULATE=1), l'écriture dans /tmp est quasi-instantanée
     *     et le délai reste imperceptible. En SMTP réel, un timeout réseau
     *     bloquerait le client : c'est une LIMITE DOCUMENTÉE du serveur intégré,
     *     non un défaut de cette implémentation. En production sur LiteSpeed,
     *     le comportement est correct.
     *
     * Isolation des défaillances :
     *   Chaque événement est traité dans un try/catch indépendant. Un courriel
     *   injoignable ne remet PAS en cause la commande déjà enregistrée ; l'échec
     *   est journalisé et l'événement est marqué pour réessai (recul progressif).
     *
     * @param callable $emetteur  callable(array $evt): ?string — null si succès,
     *                            message d'erreur sinon. Fourni par l'appelant
     *                            pour éviter que Outbox dépende des modèles de
     *                            courriel (séparation des responsabilités).
     * @param int      $limite    Nombre maximal d'événements à traiter (cf. LIMITE_EN_SORTIE).
     */
    public function enregistrerVidageEnSortie(callable $emetteur, int $limite = self::LIMITE_EN_SORTIE): void
    {
        // On capture l'instance ($this) et l'émetteur dans la closure pour que
        // la shutdown function puisse y accéder sans état global.
        $outbox = $this;

        register_shutdown_function(static function () use ($outbox, $emetteur, $limite): void {
            // ---- Libération de la connexion HTTP ----------------------------
            //
            // fastcgi_finish_request() est disponible sous PHP-FPM et LiteSpeed.
            // Elle ferme la connexion HTTP vers le navigateur IMMÉDIATEMENT, sans
            // attendre la fin du script. Le client voit sa réponse sans délai ;
            // l'envoi du courriel se fait dans la foulée, côté serveur uniquement.
            //
            // Sous le serveur intégré `php -S` (développement), cette fonction
            // n'existe pas : on continue quand même, mais le client attendra la
            // fin du script. En simulation SMTP, c'est imperceptible (< 10 ms).
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            }

            // ---- Récupération des abandons ---------------------------------
            // Des événements peuvent être restés en « processing » si un
            // précédent processus a été tué. On les remet en file avant de
            // réserver notre lot.
            try {
                $outbox->restaurerProcessingExpires();
            } catch (\Throwable $e) {
                // Non bloquant : si la restauration échoue, les événements
                // abandonnés seront récupérés au prochain appel ou par le CRON.
                Db::journaliserStatique(
                    '[outbox] Avertissement — restaurerProcessingExpires() a échoué : ' . $e->getMessage()
                );
            }

            // ---- Réservation atomique --------------------------------------
            // Deux requêtes simultanées ne prennent jamais le même événement :
            // reserverEvenements() pose status='processing' de façon atomique.
            try {
                $evenements = $outbox->reserverEvenements($limite);
            } catch (\Throwable $e) {
                Db::journaliserStatique(
                    '[outbox] Impossible de réserver les événements : ' . $e->getMessage()
                );

                return;
            }

            if ($evenements === []) {
                return;
            }

            // ---- Traitement borné -----------------------------------------
            // On traite au plus $limite événements (LIMITE_EN_SORTIE = 5) pour
            // ne pas bloquer la fin de script indéfiniment. Le reste sera traité
            // lors de la prochaine commande ou par le CRON manuel.
            foreach ($evenements as $evt) {
                $id        = (int) $evt['id'];
                $tentatives = (int) $evt['attempts'];

                try {
                    $erreur = $emetteur($evt);
                } catch (\Throwable $e) {
                    // L'émetteur ne doit pas lancer d'exception, mais par sécurité.
                    $erreur = $e->getMessage();
                }

                try {
                    if ($erreur === null) {
                        $outbox->marquerEmis($id);
                    } else {
                        $outbox->marquerEchec($id, $tentatives, $erreur);
                        Db::journaliserStatique(
                            "[outbox] Échec #{$id} : {$erreur}"
                        );
                    }
                } catch (\Throwable $e) {
                    // Le marquage a échoué : l'événement reste en « processing »
                    // et sera récupéré par restaurerProcessingExpires() plus tard.
                    Db::journaliserStatique(
                        "[outbox] Impossible de marquer l'événement #{$id} : " . $e->getMessage()
                    );
                }
            }
        });
    }
}
