<?php

/**
 * Gabarit — notification au commerçant pour une nouvelle commande.
 *
 * Envoyé au COMMERÇANT (propriétaire) lorsqu'une commande est créée.
 * Toujours en français (langue de gestion du back-office).
 *
 * Contient :
 *   - référence et montant total
 *   - coordonnées du client
 *   - liste des articles
 *   - wilaya et mode de paiement
 */

declare(strict_types=1);

namespace KaTech\Modeles;

final class NouvelleCommande
{
    /**
     * @param array<string,mixed> $payload  Payload de l'événement order.created
     * @return array{sujet: string, texte: string, html: string}
     */
    public static function generer(array $payload): array
    {
        $refCommande    = (string) ($payload['orderId']       ?? '');
        $nomClient      = (string) ($payload['customerName']  ?? '');
        $emailClient    = (string) ($payload['customerEmail'] ?? '');
        $telephone      = (string) ($payload['customerPhone'] ?? '');
        $wilaya         = (string) ($payload['wilaya']        ?? '');
        $paiement       = (string) ($payload['paymentMethod'] ?? '');
        $totalCentimes  = (int)    ($payload['total']         ?? 0);
        $total          = number_format($totalCentimes, 0, ',', ' ') . ' DZD';
        $articles       = (array)  ($payload['items']         ?? []);

        $sujet = "Nouvelle commande {$refCommande} — {$total}";

        $lignesTexte = self::lignesArticlesTexte($articles);
        $lignesHtml  = self::lignesArticlesHtml($articles);

        $infoClient = "Client : {$nomClient}";
        if ($emailClient !== '') {
            $infoClient .= "\nEmail  : {$emailClient}";
        }
        if ($telephone !== '') {
            $infoClient .= "\nTél.   : {$telephone}";
        }
        if ($wilaya !== '') {
            $infoClient .= "\nWilaya : {$wilaya}";
        }
        if ($paiement !== '') {
            $infoClient .= "\nPaiement : {$paiement}";
        }

        $texte = <<<TXT
Nouvelle commande reçue !

Référence : {$refCommande}

{$infoClient}

Articles :
{$lignesTexte}
Total : {$total}

Connectez-vous au panneau d'administration pour traiter cette commande.
TXT;

        // Construction des infos client en HTML
        $lignesInfoHtml = '';
        foreach ([
            'Client'   => $nomClient,
            'Email'    => $emailClient,
            'Tél.'     => $telephone,
            'Wilaya'   => $wilaya,
            'Paiement' => $paiement,
        ] as $label => $valeur) {
            if ($valeur === '') {
                continue;
            }
            $valEnc = htmlspecialchars($valeur, ENT_QUOTES, 'UTF-8');
            $lignesInfoHtml .= "<tr><td style='padding:4px 8px;color:#555;white-space:nowrap'>{$label}</td>"
                . "<td style='padding:4px 8px'><strong>{$valEnc}</strong></td></tr>\n";
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Nouvelle commande</title></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#059669">Nouvelle commande reçue !</h2>
  <p style="font-size:1.1em">Référence : <strong>{$refCommande}</strong></p>
  <table style="border-collapse:collapse;margin:16px 0">
    {$lignesInfoHtml}
  </table>
  <h3 style="margin-top:24px">Articles commandés</h3>
  {$lignesHtml}
  <p style="font-size:1.1em"><strong>Total : {$total}</strong></p>
  <p>
    <a href="#" style="background:#059669;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block">
      Voir dans l'administration
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#888;font-size:.8em">KA Tech Hub — notification automatique</p>
</body>
</html>
HTML;

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }

    // =========================================================================
    // Rendu des articles
    // =========================================================================

    /** @param array<int,mixed> $articles */
    private static function lignesArticlesTexte(array $articles): string
    {
        if ($articles === []) {
            return "  (aucun article)\n";
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

    /** @param array<int,mixed> $articles */
    private static function lignesArticlesHtml(array $articles): string
    {
        if ($articles === []) {
            return '<p style="color:#888">(aucun article)</p>';
        }

        $lignes = '';
        foreach ($articles as $art) {
            if (!is_array($art)) {
                continue;
            }
            $nom  = htmlspecialchars((string) ($art['name'] ?? '?'), ENT_QUOTES, 'UTF-8');
            $qte  = (int) ($art['qty'] ?? 1);
            $prix = htmlspecialchars(
                number_format((int) ($art['price'] ?? 0), 0, ',', ' ') . ' DZD',
                ENT_QUOTES,
                'UTF-8'
            );
            $lignes .= "<tr><td style='padding:4px 8px'>{$nom}</td>"
                . "<td style='padding:4px 8px;text-align:center'>{$qte}</td>"
                . "<td style='padding:4px 8px;text-align:right'>{$prix}</td></tr>\n";
        }

        return '<table style="border-collapse:collapse;width:100%;margin:16px 0">'
            . '<thead><tr style="background:#f5f5f5">'
            . '<th style="padding:6px 8px;text-align:left">Article</th>'
            . '<th style="padding:6px 8px">Qté</th>'
            . '<th style="padding:6px 8px;text-align:right">Prix</th>'
            . "</tr></thead><tbody>{$lignes}</tbody></table>";
    }
}
