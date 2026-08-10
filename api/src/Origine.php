<?php

/**
 * Déduction de l'URL d'origine de l'application — côté API.
 *
 * =====================================================================
 * POURQUOI CE FICHIER EXISTE
 * =====================================================================
 * Les liens de réinitialisation de mot de passe et les notifications par
 * email doivent contenir l'URL RÉELLE du site sur lequel tourne l'API,
 * quel que soit le domaine d'hébergement. Écrire « https://www.katech.dz »
 * en dur forcerait chaque déploiement à éditer le code — exactement ce
 * que le reste du livrable a supprimé.
 *
 * =====================================================================
 * SÉCURITÉ — POURQUOI APP_URL L'EMPORTE TOUJOURS SUR HTTP_HOST
 * =====================================================================
 * L'en-tête `Host` vient du NAVIGATEUR, pas du serveur. Un attaquant peut
 * en envoyer un forgé :
 *
 *   curl -X POST https://victime.dz/api/auth/forgot-password \
 *        -H "Host: attaquant.dz" \
 *        --data '{"email":"cible@victime.dz"}'
 *
 * Sans protection, l'API construirait un lien « https://attaquant.dz/
 * reinitialiser-mot-de-passe?token=… » et l'enverrait à la cible — le
 * jeton atterrit chez l'attaquant, le compte est compromis. C'est
 * l'attaque dite « empoisonnement d'en-tête d'hôte » (Host Header
 * Injection), classée OWASP A03:2021.
 *
 * Parade en deux niveaux :
 *
 *  1. APP_URL renseignée (recommandé en production) : valeur gravée dans
 *     le fichier .env, lue par le serveur, INACCESSIBLE au client.
 *     Aucun en-tête HTTP ne peut la modifier. L'attaque est impossible.
 *
 *  2. APP_URL absente (optionnel, usage de HTTP_HOST) : le format de
 *     l'en-tête est validé par un masque strict — seuls les noms d'hôte
 *     DNS et les adresses IPv6 entre crochets sont acceptés. Les valeurs
 *     contenant des espaces, guillemets, chevrons ou plusieurs en-têtes
 *     concaténés sont rejetées. Si l'en-tête est absent ou invalide,
 *     `deduireUrl()` renvoie null et le lien dans l'email reste vide —
 *     état détectable, jamais silencieusement dangereux.
 *
 * Ce masque est copié fidèlement de `public/origine.php` :
 * `katech_hote_valide()`. Un seul endroit possède la logique de
 * validation — ne pas réinventer.
 *
 * =====================================================================
 * CE FICHIER N'ÉMET RIEN ET N'A PAS D'EFFET DE BORD
 * =====================================================================
 * Il ne définit qu'une classe utilitaire statique appelée par
 * `ControleurAuth` et `vider-outbox.php`.
 */

declare(strict_types=1);

namespace KaTech;

final class Origine
{
    /**
     * URL racine de l'application, sans barre finale.
     * Exemple : « https://www.katech.dz » ou « http://localhost:8080 ».
     *
     * Règle de priorité :
     *
     *  1. `APP_URL` dans `.env` : si renseignée, elle fait AUTORITÉ.
     *     Aucun en-tête HTTP ne peut la contourner — l'empoisonnement
     *     d'en-tête d'hôte est alors impossible par construction.
     *
     *  2. `HTTP_HOST` validé : si `APP_URL` est absente, on déduit
     *     l'origine de l'en-tête `Host` de la requête en cours, APRÈS
     *     validation stricte du format (copie de `public/origine.php`).
     *     Retourne null si l'en-tête est absent, invalide ou si PHP ne
     *     tourne pas dans un contexte HTTP (CLI, CRON).
     *
     * Un retour null est un signal explicite : l'appelant doit soit
     * refuser d'envoyer le lien, soit l'envoyer vide — jamais forger
     * un domaine à l'aveugle.
     */
    public static function deduireUrl(): ?string
    {
        // Niveau 1 — APP_URL gravée côté serveur : inaccessible au client.
        $configure = Env::get('APP_URL');
        if ($configure !== null && $configure !== '') {
            return rtrim($configure, '/');
        }

        // Niveau 2 — HTTP_HOST de la requête en cours, validé.
        $hote = self::hoteValide();
        if ($hote === null) {
            return null;
        }

        return (self::estHttps() ? 'https' : 'http') . '://' . $hote;
    }

    // =========================================================================
    // Méthodes privées — validation de HTTP_HOST
    // =========================================================================

    /**
     * Hôte HTTP validé, ou null si absent ou invalide.
     *
     * Format accepté : lettres, chiffres, tirets, points, deux-points
     * (port optionnel), entre 1 et 253 caractères. Les crochets IPv6 sont
     * aussi tolérés. Tout le reste est refusé — copie fidèle de
     * `public/origine.php::katech_hote_valide()`.
     */
    private static function hoteValide(): ?string
    {
        $hote = (string) ($_SERVER['HTTP_HOST'] ?? '');
        if ($hote === '') {
            return null;
        }

        if (strlen($hote) > 253) {
            return null;
        }

        if (
            !preg_match(
                '/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(:\d{1,5})?$/',
                $hote,
            )
            && !preg_match('/^\[[\da-fA-F:]+\](:\d{1,5})?$/', $hote)
        ) {
            return null;
        }

        return $hote;
    }

    /**
     * Vrai si la requête courante arrive en HTTPS.
     *
     * Copie fidèle de `public/origine.php::katech_est_https()` et de
     * `api/src/Auth/Session.php::estHttps()` : le projet a une position
     * documentée sur ce sujet, ne pas diverger.
     */
    private static function estHttps(): bool
    {
        $https = (string) ($_SERVER['HTTPS'] ?? '');
        if ($https !== '' && strtolower($https) !== 'off') {
            return true;
        }

        if ((int) ($_SERVER['SERVER_PORT'] ?? 0) === 443) {
            return true;
        }

        $transmis = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));

        return str_contains($transmis, 'https');
    }
}
