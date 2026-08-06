<?php

/**
 * Gabarit — réinitialisation de mot de passe.
 *
 * Envoyé au CLIENT lorsqu'il demande un lien de réinitialisation.
 * Le message contient UNIQUEMENT le lien (jeton à usage unique) ; aucun
 * mot de passe n'apparaît ni dans le sujet ni dans le corps.
 *
 * Langue : française par défaut, arabe si demandé.
 */

declare(strict_types=1);

namespace KaTech\Modeles;

final class ReinitialisationMotDePasse
{
    /**
     * @param array<string,mixed> $payload
     *   Champs attendus :
     *     email     : adresse destinataire
     *     token     : jeton « identifiant.secret » en clair (usage unique)
     *     expiresAt : date ISO 8601 UTC d'expiration
     *     appUrl    : URL racine du frontend (ex. https://www.katech.dz)
     *     lang      : « fr » | « ar » (défaut « fr »)
     *
     * @return array{sujet: string, texte: string, html: string}
     */
    public static function generer(array $payload): array
    {
        $lang      = strtolower(trim((string) ($payload['lang']      ?? 'fr')));
        $jeton     = (string)  ($payload['token']     ?? '');
        $expiresAt = (string)  ($payload['expiresAt'] ?? '');
        $appUrl    = rtrim((string) ($payload['appUrl'] ?? ''), '/');

        // Construction du lien de réinitialisation.
        // L'URL cible est la page front-end ; le jeton est transmis en
        // paramètre — aucun mot de passe, aucune donnée sensible mis à part
        // le jeton à usage unique lui-même.
        $lien = $appUrl . '/reinitialiser-mot-de-passe?token=' . urlencode($jeton);

        // Durée de validité lisible.
        $duree = '';
        if ($expiresAt !== '') {
            $secondes = strtotime($expiresAt) - time();
            if ($secondes > 0) {
                $minutes = (int) ceil($secondes / 60);
                $duree = $minutes >= 60
                    ? (int) ceil($minutes / 60) . ' heure(s)'
                    : "{$minutes} minute(s)";
            }
        }

        if ($lang === 'ar') {
            return self::arabe($lien, $duree);
        }

        return self::francais($lien, $duree);
    }

    // =========================================================================
    // Version française
    // =========================================================================

    /** @return array{sujet: string, texte: string, html: string} */
    private static function francais(string $lien, string $duree): array
    {
        $sujet = 'Réinitialisation de votre mot de passe — KA Tech Hub';

        $expiration = $duree !== ''
            ? "Ce lien est valable {$duree}."
            : 'Ce lien a une durée de validité limitée.';

        $texte = <<<TXT
Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :
{$lien}

{$expiration} Il ne peut être utilisé qu'une seule fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez simplement
cet email — votre mot de passe actuel reste inchangé.

L'équipe KA Tech Hub
TXT;

        $lienEscape = htmlspecialchars($lien, ENT_QUOTES, 'UTF-8');
        $expirationHtml = htmlspecialchars($expiration, ENT_QUOTES, 'UTF-8');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Réinitialisation de mot de passe</title></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#1a56db">Réinitialisation de mot de passe</h2>
  <p>Bonjour,</p>
  <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
  <p style="margin:24px 0">
    <a href="{$lienEscape}"
       style="background:#1a56db;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block">
      Réinitialiser mon mot de passe
    </a>
  </p>
  <p style="color:#555;font-size:.9em">{$expirationHtml} Il ne peut être utilisé qu'une seule fois.</p>
  <p style="color:#555;font-size:.9em">
    Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email —
    votre mot de passe actuel reste inchangé.
  </p>
  <p style="color:#999;font-size:.8em;word-break:break-all">
    Lien direct : <a href="{$lienEscape}" style="color:#1a56db">{$lienEscape}</a>
  </p>
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

    /** @return array{sujet: string, texte: string, html: string} */
    private static function arabe(string $lien, string $duree): array
    {
        $sujet = 'إعادة تعيين كلمة المرور — KA Tech Hub';

        $expiration = $duree !== ''
            ? "هذا الرابط صالح لمدة {$duree}."
            : 'هذا الرابط له مدة صلاحية محدودة.';

        $texte = <<<TXT
مرحباً،

لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.

انقر على الرابط التالي لاختيار كلمة مرور جديدة :
{$lien}

{$expiration} لا يمكن استخدامه إلا مرة واحدة.

إذا لم تطلب ذلك، تجاهل هذا البريد الإلكتروني — كلمة مرورك الحالية تبقى دون تغيير.

فريق KA Tech Hub
TXT;

        $lienEscape = htmlspecialchars($lien, ENT_QUOTES, 'UTF-8');
        $expirationHtml = htmlspecialchars($expiration, ENT_QUOTES, 'UTF-8');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>إعادة تعيين كلمة المرور</title></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px;direction:rtl;text-align:right">
  <h2 style="color:#1a56db">إعادة تعيين كلمة المرور</h2>
  <p>مرحباً،</p>
  <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.</p>
  <p style="margin:24px 0">
    <a href="{$lienEscape}"
       style="background:#1a56db;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block">
      إعادة تعيين كلمة المرور
    </a>
  </p>
  <p style="color:#555;font-size:.9em">{$expirationHtml} لا يمكن استخدامه إلا مرة واحدة.</p>
  <p style="color:#555;font-size:.9em">
    إذا لم تطلب ذلك، تجاهل هذا البريد الإلكتروني — كلمة مرورك الحالية تبقى دون تغيير.
  </p>
  <p style="color:#999;font-size:.8em;word-break:break-all;direction:ltr;text-align:left">
    <a href="{$lienEscape}" style="color:#1a56db">{$lienEscape}</a>
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#888;font-size:.8em">KA Tech Hub</p>
</body>
</html>
HTML;

        return ['sujet' => $sujet, 'texte' => $texte, 'html' => $html];
    }
}
