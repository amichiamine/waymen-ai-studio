<?php

/**
 * Gabarit — confirmation de commande.
 *
 * Envoyé au CLIENT après la création d'une commande.
 * La langue est celle de la commande (champ `lang` du payload) :
 *   « fr » → français (défaut)
 *   « ar » → arabe
 *
 * Aucun montant ne sort en clair dans le sujet pour ne pas contraindre
 * les filtres anti-spam ; les détails sont dans le corps.
 */

declare(strict_types=1);

namespace KaTech\Modeles;

final class ConfirmationCommande
{
    /**
     * Retourne sujet, corps texte et corps HTML selon la langue.
     *
     * @param array<string,mixed> $payload  Payload de l'événement order.created
     * @return array{sujet: string, texte: string, html: string}
     */
    public static function generer(array $payload): array
    {
        $lang         = strtolower(trim((string) ($payload['lang'] ?? 'fr')));
        $refCommande  = (string) ($payload['orderId'] ?? '');
        $nomClient    = (string) ($payload['customerName'] ?? '');
        $totalCentimes = (int)   ($payload['total'] ?? 0);
        $total        = number_format($totalCentimes, 0, ',', ' ') . ' DZD';
        $articles     = (array)  ($payload['items'] ?? []);

        if ($lang === 'ar') {
            return self::arabe($refCommande, $nomClient, $total, $articles);
        }

        return self::francais($refCommande, $nomClient, $total, $articles);
    }

    // =========================================================================
    // Version française
    // =========================================================================

    /**
     * @param array<int,mixed> $articles
     * @return array{sujet: string, texte: string, html: string}
     */
    private static function francais(
        string $refCommande,
        string $nomClient,
        string $total,
        array $articles,
    ): array {
        $sujet = "Votre commande {$refCommande} est confirmée — KA Tech Hub";

        $lignesTexte = self::lignesArticlesTexte($articles);
        $lignesHtml  = self::lignesArticlesHtml($articles);

        $texte = <<<TXT
Bonjour {$nomClient},

Nous avons bien reçu votre commande {$refCommande}.

{$lignesTexte}
Total : {$total}

Notre équipe prépare votre colis. Vous recevrez une notification dès l'expédition.

Pour toute question, répondez directement à cet email.

Merci de votre confiance,
L'équipe KA Tech Hub
TXT;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Confirmation de commande</title></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#1a56db">Commande confirmée ✓</h2>
  <p>Bonjour <strong>{$nomClient}</strong>,</p>
  <p>Nous avons bien reçu votre commande <strong>{$refCommande}</strong>.</p>
  {$lignesHtml}
  <p style="font-size:1.1em"><strong>Total : {$total}</strong></p>
  <p>Notre équipe prépare votre colis. Vous recevrez une notification dès l'expédition.</p>
  <p style="color:#666;font-size:.9em">Pour toute question, répondez directement à cet email.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#888;font-size:.8em">KA Tech Hub</p>
</body>
</html>
HTML;

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }

    // =========================================================================
    // Version arabe
    // =========================================================================

    /**
     * @param array<int,mixed> $articles
     * @return array{sujet: string, texte: string, html: string}
     */
    private static function arabe(
        string $refCommande,
        string $nomClient,
        string $total,
        array $articles,
    ): array {
        // Le sujet arabe sera encodé en RFC 2047 par Courriel::encoderEntete().
        $sujet = "تأكيد الطلب {$refCommande} — KA Tech Hub";

        $lignesTexte = self::lignesArticlesTexte($articles);
        $lignesHtml  = self::lignesArticlesHtml($articles, 'rtl');

        $texte = <<<TXT
مرحباً {$nomClient}،

لقد استلمنا طلبك رقم {$refCommande}.

{$lignesTexte}
المجموع : {$total}

فريقنا يجهّز طردك. ستصلك إشعار عند الشحن.

لأي استفسار، يمكنك الرد مباشرة على هذا البريد الإلكتروني.

شكراً لثقتكم،
فريق KA Tech Hub
TXT;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>تأكيد الطلب</title></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px;direction:rtl;text-align:right">
  <h2 style="color:#1a56db">تم تأكيد الطلب ✓</h2>
  <p>مرحباً <strong>{$nomClient}</strong>،</p>
  <p>لقد استلمنا طلبك رقم <strong>{$refCommande}</strong>.</p>
  {$lignesHtml}
  <p style="font-size:1.1em"><strong>المجموع : {$total}</strong></p>
  <p>فريقنا يجهّز طردك. ستصلك إشعار عند الشحن.</p>
  <p style="color:#666;font-size:.9em">لأي استفسار، يمكنك الرد مباشرة على هذا البريد الإلكتروني.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#888;font-size:.8em">KA Tech Hub</p>
</body>
</html>
HTML;

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }

    // =========================================================================
    // Rendu des lignes d'articles
    // =========================================================================

    /** @param array<int,mixed> $articles */
    private static function lignesArticlesTexte(array $articles): string
    {
        if ($articles === []) {
            return '';
        }

        $lignes = [];
        foreach ($articles as $art) {
            if (!is_array($art)) {
                continue;
            }
            $nom = (string) ($art['name'] ?? '?');
            $qte = (int)    ($art['qty']  ?? 1);
            $prix = number_format((int) ($art['price'] ?? 0), 0, ',', ' ') . ' DZD';
            $lignes[] = "  - {$nom} × {$qte}  ({$prix})";
        }

        return implode("\n", $lignes) . "\n";
    }

    /**
     * @param array<int,mixed> $articles
     * @param string $direction 'ltr' ou 'rtl'
     */
    private static function lignesArticlesHtml(array $articles, string $direction = 'ltr'): string
    {
        if ($articles === []) {
            return '';
        }

        $alignPrix = $direction === 'rtl' ? 'text-align:left' : 'text-align:right';

        $lignes = '';
        foreach ($articles as $art) {
            if (!is_array($art)) {
                continue;
            }
            $nom = htmlspecialchars((string) ($art['name'] ?? '?'), ENT_QUOTES, 'UTF-8');
            $qte = (int) ($art['qty'] ?? 1);
            $prix = htmlspecialchars(
                number_format((int) ($art['price'] ?? 0), 0, ',', ' ') . ' DZD',
                ENT_QUOTES,
                'UTF-8'
            );
            $lignes .= "<tr><td style='padding:4px 8px'>{$nom}</td>"
                . "<td style='padding:4px 8px;text-align:center'>{$qte}</td>"
                . "<td style='padding:4px 8px;{$alignPrix}'>{$prix}</td></tr>\n";
        }

        return '<table style="border-collapse:collapse;width:100%;margin:16px 0">'
            . '<thead><tr style="background:#f5f5f5">'
            . '<th style="padding:6px 8px;text-align:left">Article</th>'
            . '<th style="padding:6px 8px">Qté</th>'
            . '<th style="padding:6px 8px;text-align:right">Prix</th>'
            . "</tr></thead><tbody>{$lignes}</tbody></table>";
    }
}
