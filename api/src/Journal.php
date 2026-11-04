<?php

/**
 * Consignation d'audit — classe utilitaire SANS état.
 *
 * Usage dans un contrôleur :
 *
 *     Journal::consigner($this->db, 'commande_creee', 'order', ['id' => $id, 'total' => $total]);
 *
 * RÈGLES ABSOLUES (voir consigne §5a) :
 *
 *   1. L'acteur vient TOUJOURS de la session PHP, jamais d'un paramètre de
 *      requête. Une écriture non authentifiée est consignée comme « invité »,
 *      jamais attribuée à quelqu'un d'autre.
 *
 *   2. Le champ `detail` est du JSON. Les clés sensibles (mot de passe, jeton,
 *      empreinte) en sont explicitement filtrées avant sérialisation (S13).
 *
 *   3. Si une transaction est déjà ouverte, l'insertion en fait partie.
 *      Cette méthode n'ouvre JAMAIS de transaction imbriquée.
 *
 *   4. Une consignation qui échoue ne doit pas faire échouer l'opération
 *      métier. L'exception est interceptée et l'erreur est journalisée dans
 *      le journal PHP (error_log) pour rester visible (AGENTS.md §7).
 *
 *   5. Piège de dialecte (docs/BACKEND.md §4, piège 1) : chaque paramètre
 *      nommé a un identifiant unique. On n'utilise jamais deux fois le même
 *      placeholder dans une requête.
 */

declare(strict_types=1);

namespace KaTech;

use KaTech\Auth\Session;

final class Journal
{
    /**
     * Clés filtrées de `$detail` avant sérialisation JSON.
     * Insensible à la casse : 'Password', 'PASSWORD', 'password' sont tous filtrés.
     */
    private const CLES_SENSIBLES = [
        'password',
        'mot_de_passe',
        'motdepasse',
        'pass',
        'password_hash',
        'hash',
        'token',
        'access_token',
        'refresh_token',
        'secret',
        'api_key',
        'apikey',
        'authorization',
        'bearer',
    ];

    /** Constructeur privé : classe 100 % statique, pas d'instance. */
    private function __construct()
    {
    }

    /**
     * Consigne une action dans `audit_logs`.
     *
     * @param Db                   $db     Instance PDO du contrôleur appelant.
     * @param string               $action Verbe métier (ex. « commande_creee », « statut_modifie »).
     * @param string               $entity Entité concernée (ex. « order », « product »).
     * @param array<string,mixed>  $detail Données contextuelles. Les clés sensibles sont filtrées.
     *
     * L'acteur est résolu depuis la session courante. Si la session est absente,
     * l'acteur est « invité ». La valeur n'est JAMAIS fournie par l'appelant.
     */
    public static function consigner(Db $db, string $action, string $entity, array $detail = []): void
    {
        try {
            // Résolution de l'acteur depuis la SESSION (ou 'cli' en mode ligne de commande).
            $utilisateur = PHP_SAPI === 'cli' ? null : Session::utilisateur();
            $actor       = $utilisateur !== null
                ? (string) ($utilisateur['email'] ?? $utilisateur['id'] ?? 'session')
                : (PHP_SAPI === 'cli' ? 'cli' : 'invité');

            // Filtrage des clés sensibles (S13).
            $detailFiltre = self::filtrerSensibles($detail);

            // Sérialisation JSON du détail.
            $detailJson = $detailFiltre !== [] ? Db::json($detailFiltre) : null;

            $maintenant = gmdate('c');

            // Identifiant : timestamp (µs) + entropie hexadécimale = pas de collision.
            $id = 'aud-' . str_replace('.', '', sprintf('%.6f', microtime(true)))
                . '-' . bin2hex(random_bytes(4));

            // Insertion directe — aucune transaction imbriquée. Si une transaction
            // est déjà ouverte (beginWrite), cette écriture en fait partie.
            // Piège MySQL (docs/BACKEND.md §4) : chaque paramètre a un nom unique.
            $db->run(
                'INSERT INTO audit_logs (id, actor, action, entity, detail, created_at)'
                . ' VALUES (:aud_id, :aud_actor, :aud_action, :aud_entity, :aud_detail, :aud_created_at)',
                [
                    ':aud_id'         => $id,
                    ':aud_actor'      => $actor,
                    ':aud_action'     => $action,
                    ':aud_entity'     => $entity,
                    ':aud_detail'     => $detailJson,
                    ':aud_created_at' => $maintenant,
                ],
            );
        } catch (\Throwable $e) {
            // Une consignation qui échoue ne doit PAS faire échouer l'opération
            // métier. On rend l'échec visible dans le journal PHP (AGENTS.md §7).
            Db::journaliserStatique(
                '[journal] Échec de consignation audit_logs — action=' . $action
                . ' entity=' . $entity
                . ' — ' . $e->getMessage()
            );
        }
    }

    /**
     * Filtre récursivement les clés sensibles d'un tableau.
     *
     * @param array<string,mixed> $donnees
     * @return array<string,mixed>
     */
    private static function filtrerSensibles(array $donnees): array
    {
        $resultat = [];

        foreach ($donnees as $cle => $valeur) {
            $cleNorm = strtolower((string) $cle);

            // Vérifie si la clé contient un terme sensible.
            foreach (self::CLES_SENSIBLES as $terme) {
                if (str_contains($cleNorm, $terme)) {
                    // Clé sensible : exclure du résultat.
                    continue 2;
                }
            }

            // Récursion sur les tableaux imbriqués.
            if (is_array($valeur)) {
                $resultat[$cle] = self::filtrerSensibles($valeur);
            } else {
                $resultat[$cle] = $valeur;
            }
        }

        return $resultat;
    }
}
