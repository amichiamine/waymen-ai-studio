<?php

/**
 * Service central d'émission des notifications applicatives in-app.
 *
 * Permet aux contrôleurs métier (Commandes, CRM, Stock, etc.) d'émettre
 * des notifications immédiatement visibles dans la cloche d'en-tête du
 * back-office (/admin) et dans la table `notifications`.
 */

declare(strict_types=1);

namespace KaTech\Services;

use KaTech\Db;
use KaTech\Journal;

final class NotificationService
{
    /** Niveaux valides autorisés par le contrat du projet. */
    private const NIVEAUX = ['info', 'success', 'warning', 'error'];

    /**
     * Émet et enregistre une notification in-app dans la table `notifications`.
     *
     * @param Db          $db     Instance active de la base de données
     * @param string      $title  Titre synthétique de la notification (max 200 car.)
     * @param string      $body   Corps explicatif détaillé (max 2000 car.)
     * @param string      $level  Niveau : info, success, warning, error (défaut 'info')
     * @param string|null $link   Lien de navigation optionnel (ex: '/admin/orders/cmd_123')
     * @return string Identifiant de la notification créée
     */
    public static function emettre(
        Db $db,
        string $title,
        string $body,
        string $level = 'info',
        ?string $link = null
    ): string {
        $id = sprintf(
            'notif_%s_%s',
            date('Ymd_His'),
            bin2hex(random_bytes(4))
        );
        $maintenant = gmdate('c');
        $levelValide = in_array($level, self::NIVEAUX, true) ? $level : 'info';

        $db->inserer('notifications', [
            'id'         => $id,
            'title'      => mb_substr(trim($title), 0, 200),
            'body'       => mb_substr(trim($body), 0, 2000),
            'level'      => $levelValide,
            'is_read'    => 0,
            'link'       => $link !== null && trim($link) !== '' ? mb_substr(trim($link), 0, 500) : null,
            'created_at' => $maintenant,
        ]);

        Journal::consigner($db, 'notification_systeme_creee', 'notification', [
            'id'    => $id,
            'title' => $title,
            'level' => $levelValide,
        ]);

        return $id;
    }
}
