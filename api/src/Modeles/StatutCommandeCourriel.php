<?php

/**
 * Gabarit d'e-mail — Notification de mise à jour du statut d'une commande.
 *
 * Envoyé au CLIENT lorsqu'un administrateur fait avancer le statut de la commande
 * (pending -> processing -> shipped -> delivered -> cancelled).
 */

declare(strict_types=1);

namespace KaTech\Modeles;

final class StatutCommandeCourriel
{
    private const LABELS_FR = [
        'pending'    => 'En attente de confirmation',
        'processing' => 'En cours de préparation',
        'shipped'    => 'Expédiée / En cours de livraison',
        'delivered'  => 'Livrée',
        'cancelled'  => 'Annulée',
    ];

    private const LABELS_AR = [
        'pending'    => 'في انتظار التأكيد',
        'processing' => 'قيد التحضير',
        'shipped'    => 'تم الشحن / في طريق التوصيل',
        'delivered'  => 'تم التسليم',
        'cancelled'  => 'ملغاة',
    ];

    private const LABELS_EN = [
        'pending'    => 'Pending confirmation',
        'processing' => 'Processing',
        'shipped'    => 'Shipped / In transit',
        'delivered'  => 'Delivered',
        'cancelled'  => 'Cancelled',
    ];

    /**
     * @param array<string,mixed> $payload
     * @return array{sujet: string, texte: string, html: string}
     */
    public static function generer(array $payload, string $appUrl): array
    {
        $lang        = strtolower(trim((string) ($payload['lang'] ?? 'fr')));
        $commandeId  = (string) ($payload['commandeId'] ?? '');
        $statut      = (string) ($payload['nouveauStatut'] ?? 'pending');
        $note        = (string) ($payload['note'] ?? '');
        $nomClient   = (string) ($payload['clientNom'] ?? '');
        $telClient   = (string) ($payload['clientTel'] ?? '');
        $total       = number_format((int) ($payload['total'] ?? 0), 0, ',', ' ') . ' DZD';
        $lienSuivi   = rtrim($appUrl, '/') . '/track?id=' . urlencode($commandeId) . '&phone=' . urlencode($telClient);

        if ($lang === 'ar') {
            return self::arabe($commandeId, $statut, $note, $nomClient, $total, $lienSuivi);
        }

        if ($lang === 'en') {
            return self::anglais($commandeId, $statut, $note, $nomClient, $total, $lienSuivi);
        }

        return self::francais($commandeId, $statut, $note, $nomClient, $total, $lienSuivi);
    }

    private static function francais(
        string $commandeId,
        string $statut,
        string $note,
        string $nomClient,
        string $total,
        string $lienSuivi
    ): array {
        $libelleStatut = self::LABELS_FR[$statut] ?? $statut;
        $sujet = "Mise à jour de votre commande #{$commandeId} : {$libelleStatut} — KA Tech";

        $texte = "Bonjour {$nomClient},\n\n"
            . "Le statut de votre commande #{$commandeId} a été mis à jour.\n\n"
            . "Nouveau statut : {$libelleStatut}\n"
            . ($note !== '' ? "Note de notre équipe : {$note}\n" : '')
            . "Montant total : {$total}\n\n"
            . "Vous pouvez suivre l'avancement de votre colis en temps réel à tout moment via le lien suivant :\n"
            . "{$lienSuivi}\n\n"
            . "Merci pour votre confiance,\nL'équipe KA Tech";

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
            . '<body style="font-family: sans-serif; color: #222; background: #f8fafc; padding: 20px;">'
            . '<div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 28px;">'
            . '<h2 style="color: #0f172a; margin-top: 0;">Mise à jour de votre commande</h2>'
            . '<p>Bonjour <strong>' . htmlspecialchars($nomClient) . '</strong>,</p>'
            . '<p>Votre commande <strong>#' . htmlspecialchars($commandeId) . '</strong> est désormais :</p>'
            . '<div style="background: #f1f5f9; padding: 14px 18px; border-radius: 6px; font-size: 16px; font-weight: bold; color: #1e293b; margin: 16px 0;">'
            . htmlspecialchars($libelleStatut)
            . '</div>'
            . ($note !== '' ? '<p style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; color: #92400e;"><strong>Note de notre équipe :</strong> ' . htmlspecialchars($note) . '</p>' : '')
            . '<p style="color: #64748b; font-size: 14px;">Montant total : ' . htmlspecialchars($total) . '</p>'
            . '<div style="text-align: center; margin: 26px 0;">'
            . '<a href="' . htmlspecialchars($lienSuivi) . '" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Suivre ma commande en direct</a>'
            . '</div>'
            . '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">'
            . '<p style="font-size: 12px; color: #94a3b8; text-align: center;">KA Tech — La puissance tech entre vos mains</p>'
            . '</div></body></html>';

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }

    private static function arabe(
        string $commandeId,
        string $statut,
        string $note,
        string $nomClient,
        string $total,
        string $lienSuivi
    ): array {
        $libelleStatut = self::LABELS_AR[$statut] ?? $statut;
        $sujet = "تحديث طلبكم #{$commandeId} : {$libelleStatut} — KA Tech";

        $texte = "مرحبًا {$nomClient}،\n\n"
            . "تم تحديث حالة طلبكم رقم #{$commandeId}.\n\n"
            . "الحالة الجديدة : {$libelleStatut}\n"
            . ($note !== '' ? "ملاحظة من فريقنا : {$note}\n" : '')
            . "المبلغ الإجمالي : {$total}\n\n"
            . "يمكنكم متابعة حالة طلبيتكم مباشرة عبر الرابط التالي:\n"
            . "{$lienSuivi}\n\n"
            . "شكرًا لثقتكم بنا،\nفريق KA Tech";

        $html = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"></head>'
            . '<body style="font-family: sans-serif; color: #222; background: #f8fafc; padding: 20px; direction: rtl; text-align: right;">'
            . '<div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 28px;">'
            . '<h2 style="color: #0f172a; margin-top: 0;">تحديث حالة طلبكم</h2>'
            . '<p>مرحبًا <strong>' . htmlspecialchars($nomClient) . '</strong>،</p>'
            . '<p>أصبح طلبكم رقم <strong>#' . htmlspecialchars($commandeId) . '</strong> بحالة :</p>'
            . '<div style="background: #f1f5f9; padding: 14px 18px; border-radius: 6px; font-size: 16px; font-weight: bold; color: #1e293b; margin: 16px 0;">'
            . htmlspecialchars($libelleStatut)
            . '</div>'
            . ($note !== '' ? '<p style="background: #fffbeb; border-right: 4px solid #f59e0b; padding: 10px 14px; color: #92400e;"><strong>ملاحظة من فريقنا :</strong> ' . htmlspecialchars($note) . '</p>' : '')
            . '<div style="text-align: center; margin: 26px 0;">'
            . '<a href="' . htmlspecialchars($lienSuivi) . '" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">متابعة حالة الطلبية مباشرة</a>'
            . '</div>'
            . '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">'
            . '<p style="font-size: 12px; color: #94a3b8; text-align: center;">KA Tech — القوة التكنولوجية بين يديك</p>'
            . '</div></body></html>';

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }

    private static function anglais(
        string $commandeId,
        string $statut,
        string $note,
        string $nomClient,
        string $total,
        string $lienSuivi
    ): array {
        $libelleStatut = self::LABELS_EN[$statut] ?? $statut;
        $sujet = "Update on your order #{$commandeId}: {$libelleStatut} — KA Tech";

        $texte = "Hello {$nomClient},\n\n"
            . "Your order #{$commandeId} status has been updated.\n\n"
            . "New status: {$libelleStatut}\n"
            . ($note !== '' ? "Note from our team: {$note}\n" : '')
            . "Total amount: {$total}\n\n"
            . "You can track your package progress in real time here:\n"
            . "{$lienSuivi}\n\n"
            . "Thank you for your business,\nKA Tech Team";

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
            . '<body style="font-family: sans-serif; color: #222; background: #f8fafc; padding: 20px;">'
            . '<div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 28px;">'
            . '<h2 style="color: #0f172a; margin-top: 0;">Order Status Update</h2>'
            . '<p>Hello <strong>' . htmlspecialchars($nomClient) . '</strong>,</p>'
            . '<p>Your order <strong>#' . htmlspecialchars($commandeId) . '</strong> is now:</p>'
            . '<div style="background: #f1f5f9; padding: 14px 18px; border-radius: 6px; font-size: 16px; font-weight: bold; color: #1e293b; margin: 16px 0;">'
            . htmlspecialchars($libelleStatut)
            . '</div>'
            . ($note !== '' ? '<p style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; color: #92400e;"><strong>Note:</strong> ' . htmlspecialchars($note) . '</p>' : '')
            . '<div style="text-align: center; margin: 26px 0;">'
            . '<a href="' . htmlspecialchars($lienSuivi) . '" style="background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Track my order live</a>'
            . '</div>'
            . '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">'
            . '<p style="font-size: 12px; color: #94a3b8; text-align: center;">KA Tech — Technology in your hands</p>'
            . '</div></body></html>';

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }
}
