<?php

/**
 * Client SMTP minimal — sans aucune dépendance Composer.
 *
 * Protocole implémenté : EHLO → STARTTLS → AUTH LOGIN → MAIL FROM →
 * RCPT TO → DATA → QUIT.  Toutes les commandes sont documentées dans
 * la RFC 5321 (SMTP) et la RFC 2822 (format de message).
 *
 * Encodage :
 *   - Corps en UTF-8, transféré en quoted-printable (RFC 2045) pour
 *     garantir la lisibilité sur les relais 7-bits.
 *   - Sujets encodés en RFC 2047 (encoded-word Base64) : les agents de
 *     messagerie qui ne décodent pas le QP décoderaient quand même le sujet.
 *     Obligatoire pour l'arabe : un sujet brut en UTF-8 arrive illisible
 *     dans Outlook et certains clients webmail.
 *
 * Comportement sans SMTP configuré :
 *   Si SMTP_HOST est absent ou vide, la classe journalise l'absence de
 *   configuration et rend la main immédiatement — le site continue de
 *   fonctionner.
 *
 * Mode simulation (SMTP_SIMULATE=1) :
 *   Au lieu d'ouvrir une connexion réseau, écrit le message complet
 *   (en-têtes + corps) dans SMTP_SIMULATE_DIR (par défaut /tmp/katech-mail).
 *   Utile pour les tests et le développement.
 *
 * Variables d'environnement :
 *   SMTP_HOST         Nom d'hôte du serveur SMTP (ex. smtp.gmail.com)
 *   SMTP_PORT         Port (465 SSL, 587 STARTTLS — défaut 587)
 *   SMTP_USER         Identifiant d'authentification
 *   SMTP_PASSWORD     Mot de passe
 *   SMTP_ENCRYPTION   « tls » (STARTTLS sur 587) | « ssl » (SSL sur 465) | « none »
 *   SMTP_FROM_EMAIL   Adresse expéditeur (ex. noreply@monsite.com)
 *   SMTP_FROM_NAME    Nom d'affichage de l'expéditeur
 *   SMTP_SIMULATE     « 1 » pour activer le mode simulation
 *   SMTP_SIMULATE_DIR Répertoire de sortie en simulation (défaut /tmp/katech-mail)
 */

declare(strict_types=1);

namespace KaTech;

final class Courriel
{
    /** Délai de lecture en secondes sur le socket. */
    private const TIMEOUT = 15;

    // =========================================================================
    // Interface publique
    // =========================================================================

    /**
     * Envoie un email ou l'écrit en simulation.
     *
     * @param string      $destinataire  Adresse e-mail du destinataire
     * @param string      $nomDest       Nom d'affichage du destinataire (peut être vide)
     * @param string      $sujet         Sujet du message (UTF-8, sera encodé RFC 2047)
     * @param string      $texte         Corps en texte brut (UTF-8)
     * @param string|null $html          Corps HTML facultatif (UTF-8)
     * @throws \RuntimeException         Si l'envoi échoue (SMTP ou IO)
     */
    public static function envoyer(
        string $destinataire,
        string $nomDest,
        string $sujet,
        string $texte,
        ?string $html = null,
    ): void {
        Env::charger();

        $hote = (string) Env::get('SMTP_HOST', '');

        // ---- SMTP absent : journaliser et rendre la main --------------------
        if ($hote === '') {
            Db::journaliserStatique(
                '[courriel] Envoi désactivé : SMTP_HOST absent. '
                . 'Configurez les variables SMTP_* dans api/.env pour activer les emails.'
            );

            return;
        }

        // ---- Mode simulation ------------------------------------------------
        $simulation = Env::bool('SMTP_SIMULATE', false);
        if ($simulation) {
            self::simuler($destinataire, $nomDest, $sujet, $texte, $html);

            return;
        }

        // ---- Envoi réel -----------------------------------------------------
        self::envoyerSmtp($destinataire, $nomDest, $sujet, $texte, $html, $hote);
    }

    // =========================================================================
    // Encodage RFC 2047 (en-têtes) et Quoted-Printable (corps)
    // =========================================================================

    /**
     * Encode un en-tête textuel en RFC 2047 « encoded-word » Base64.
     *
     * Format : =?UTF-8?B?<base64>?=
     *
     * Découpe en mots si la chaîne dépasse 45 octets une fois encodée, pour
     * respecter la limite de longueur de ligne des en-têtes (RFC 5321 : 998 car.)
     * tout en gérant les caractères multioctets (arabe, accent) correctement.
     */
    public static function encoderEntete(string $valeur): string
    {
        // Chaîne ASCII pure : pas besoin d'encoder.
        if (mb_check_encoding($valeur, 'ASCII') && preg_match('/[\x00-\x1F\x7F]/', $valeur) === 0) {
            return $valeur;
        }

        // Découpe en morceaux d'au plus 45 octets UTF-8 (limite courante des MUA).
        $morceaux = [];
        $longueur = mb_strlen($valeur, 'UTF-8');
        $debut = 0;

        while ($debut < $longueur) {
            // Prend un morceau qui tient dans 45 octets UTF-8.
            $taille = 45;
            while ($taille > 0) {
                $morceau = mb_substr($valeur, $debut, $taille, 'UTF-8');
                if (strlen($morceau) <= 45) {
                    break;
                }
                $taille--;
            }
            $morceaux[] = '=?UTF-8?B?' . base64_encode($morceau) . '?=';
            $debut += $taille;
        }

        // Les mots encodés adjacents sont séparés par un espace (RFC 2047 §5).
        return implode(' ', $morceaux);
    }

    /**
     * Encode le corps en Quoted-Printable (RFC 2045).
     *
     * PHP fournit `quoted_printable_encode()` depuis 5.3. On normalise les fins
     * de ligne en CRLF après encodage (exigence SMTP).
     */
    private static function encoderQP(string $texte): string
    {
        $qp = quoted_printable_encode($texte);
        // `quoted_printable_encode` produit des LF seuls sur certaines
        // plateformes ; on normalise en CRLF pour SMTP.
        $qp = str_replace("\r\n", "\n", $qp);
        $qp = str_replace("\n", "\r\n", $qp);

        return $qp;
    }

    // =========================================================================
    // Construction du message RFC 2822
    // =========================================================================

    /**
     * Construit le message complet (en-têtes + corps) sous forme de chaîne.
     *
     * @return array{entetes: string, corps: string, brut: string}
     */
    private static function construireMessage(
        string $expediteurEmail,
        string $expediteurNom,
        string $destinataire,
        string $nomDest,
        string $sujet,
        string $texte,
        ?string $html,
    ): array {
        $messageId = '<' . bin2hex(random_bytes(16)) . '@katech>';
        $date = gmdate('r'); // Format RFC 2822

        $sujetEncode = self::encoderEntete($sujet);
        $expediteurChaine = $expediteurNom !== ''
            ? self::encoderEntete($expediteurNom) . ' <' . $expediteurEmail . '>'
            : $expediteurEmail;
        $destinataireChaine = $nomDest !== ''
            ? self::encoderEntete($nomDest) . ' <' . $destinataire . '>'
            : $destinataire;

        if ($html !== null) {
            // Message multipart : texte brut + HTML.
            $limite = 'katech-' . bin2hex(random_bytes(8));
            $corps =
                '--' . $limite . "\r\n"
                . "Content-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: quoted-printable\r\n"
                . "\r\n"
                . self::encoderQP($texte) . "\r\n"
                . '--' . $limite . "\r\n"
                . "Content-Type: text/html; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: quoted-printable\r\n"
                . "\r\n"
                . self::encoderQP($html) . "\r\n"
                . '--' . $limite . "--\r\n";

            $entetes =
                "From: {$expediteurChaine}\r\n"
                . "To: {$destinataireChaine}\r\n"
                . "Subject: {$sujetEncode}\r\n"
                . "Date: {$date}\r\n"
                . "Message-ID: {$messageId}\r\n"
                . "MIME-Version: 1.0\r\n"
                . "Content-Type: multipart/alternative; boundary=\"{$limite}\"\r\n"
                . "X-Mailer: KaTech-Courriel/1.0\r\n";
        } else {
            // Message texte brut seul.
            $corps = self::encoderQP($texte) . "\r\n";
            $entetes =
                "From: {$expediteurChaine}\r\n"
                . "To: {$destinataireChaine}\r\n"
                . "Subject: {$sujetEncode}\r\n"
                . "Date: {$date}\r\n"
                . "Message-ID: {$messageId}\r\n"
                . "MIME-Version: 1.0\r\n"
                . "Content-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: quoted-printable\r\n"
                . "X-Mailer: KaTech-Courriel/1.0\r\n";
        }

        return [
            'entetes' => $entetes,
            'corps'   => $corps,
            'brut'    => $entetes . "\r\n" . $corps,
        ];
    }

    // =========================================================================
    // Mode simulation
    // =========================================================================

    private static function simuler(
        string $destinataire,
        string $nomDest,
        string $sujet,
        string $texte,
        ?string $html,
    ): void {
        Env::charger();

        $expediteurEmail = (string) Env::get('SMTP_FROM_EMAIL', 'noreply@katech.local');
        $expediteurNom   = (string) Env::get('SMTP_FROM_NAME', 'KaTech');

        $message = self::construireMessage(
            $expediteurEmail,
            $expediteurNom,
            $destinataire,
            $nomDest,
            $sujet,
            $texte,
            $html,
        );

        $dossier = (string) Env::get('SMTP_SIMULATE_DIR', '/tmp/katech-mail');
        if (!is_dir($dossier)) {
            @mkdir($dossier, 0770, true);
        }

        $fichier = $dossier . '/courriel-' . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.eml';
        file_put_contents($fichier, $message['brut']);

        Db::journaliserStatique(
            "[courriel] [SIMULATION] Email écrit dans : {$fichier} — "
            . "À: {$destinataire} — Sujet encodé: " . self::encoderEntete($sujet)
        );
    }

    // =========================================================================
    // Envoi SMTP
    // =========================================================================

    private static function envoyerSmtp(
        string $destinataire,
        string $nomDest,
        string $sujet,
        string $texte,
        ?string $html,
        string $hote,
    ): void {
        Env::charger();

        $port            = Env::int('SMTP_PORT', 587);
        $utilisateur     = (string) Env::get('SMTP_USER', '');
        $motDePasse      = (string) Env::get('SMTP_PASSWORD', '');
        $chiffrement     = strtolower((string) Env::get('SMTP_ENCRYPTION', 'tls'));
        $expediteurEmail = (string) Env::get('SMTP_FROM_EMAIL', $utilisateur);
        $expediteurNom   = (string) Env::get('SMTP_FROM_NAME', '');

        if ($expediteurEmail === '') {
            throw new \RuntimeException(
                'SMTP_FROM_EMAIL absent. Configurez-le dans api/.env.'
            );
        }

        $message = self::construireMessage(
            $expediteurEmail,
            $expediteurNom,
            $destinataire,
            $nomDest,
            $sujet,
            $texte,
            $html,
        );

        // ---- Ouverture du socket -------------------------------------------
        if ($chiffrement === 'ssl') {
            // Connexion SSL directe (port 465).
            $uri = "ssl://{$hote}:{$port}";
        } else {
            // Connexion en clair ou STARTTLS (port 587 par défaut).
            $uri = "tcp://{$hote}:{$port}";
        }

        $errno  = 0;
        $errstr = '';
        $socket = @stream_socket_client($uri, $errno, $errstr, self::TIMEOUT);

        if ($socket === false) {
            throw new \RuntimeException(
                "SMTP : impossible de se connecter à {$uri} — {$errstr} (errno {$errno})."
            );
        }

        stream_set_timeout($socket, self::TIMEOUT);

        try {
            // ---- Session SMTP -------------------------------------------
            self::lire($socket, 220, 'Bannière initiale');

            $domaine = (string) (parse_url('http://' . $hote, PHP_URL_HOST) ?: 'localhost');
            self::ecrire($socket, "EHLO {$domaine}");
            $ehloReponse = self::lireMulti($socket, 250, 'EHLO');

            // ---- STARTTLS (port 587 / encryption=tls) -------------------
            if ($chiffrement === 'tls') {
                if (!str_contains($ehloReponse, 'STARTTLS')) {
                    throw new \RuntimeException(
                        "SMTP : le serveur {$hote} ne supporte pas STARTTLS. "
                        . 'Essayez SMTP_ENCRYPTION=ssl et SMTP_PORT=465.'
                    );
                }
                self::ecrire($socket, 'STARTTLS');
                self::lire($socket, 220, 'STARTTLS');

                // Activation du chiffrement sur le socket existant.
                $ok = stream_socket_enable_crypto(
                    $socket,
                    true,
                    STREAM_CRYPTO_METHOD_TLS_CLIENT,
                );
                if ($ok === false) {
                    throw new \RuntimeException(
                        "SMTP : négociation TLS échouée avec {$hote}."
                    );
                }

                // Après STARTTLS, on ré-envoie EHLO (RFC 3207 §4).
                self::ecrire($socket, "EHLO {$domaine}");
                self::lireMulti($socket, 250, 'EHLO post-STARTTLS');
            }

            // ---- Authentification LOGIN ----------------------------------
            if ($utilisateur !== '' && $motDePasse !== '') {
                self::ecrire($socket, 'AUTH LOGIN');
                self::lire($socket, 334, 'AUTH LOGIN prompt utilisateur');
                self::ecrire($socket, base64_encode($utilisateur));
                self::lire($socket, 334, 'AUTH LOGIN prompt mot de passe');
                self::ecrire($socket, base64_encode($motDePasse));
                self::lire($socket, 235, 'AUTH LOGIN résultat');
            }

            // ---- Enveloppe ----------------------------------------------
            self::ecrire($socket, "MAIL FROM:<{$expediteurEmail}>");
            self::lire($socket, 250, 'MAIL FROM');

            self::ecrire($socket, "RCPT TO:<{$destinataire}>");
            self::lire($socket, 250, 'RCPT TO');

            // ---- Corps du message ---------------------------------------
            self::ecrire($socket, 'DATA');
            self::lire($socket, 354, 'DATA invite');

            // Le corps SMTP se termine par CRLF.CRLF.
            // Les lignes commençant par un point sont doublées (RFC 5321 §4.5.2).
            $donneesSmtp = preg_replace('/^\.$/m', '..', $message['brut']) ?? $message['brut'];
            fwrite($socket, $donneesSmtp . "\r\n.\r\n");

            self::lire($socket, 250, 'DATA fin');

            // ---- Fermeture propre ---------------------------------------
            self::ecrire($socket, 'QUIT');
            // On tolère l'absence de 221 (certains serveurs ferment avant).
            @fgets($socket, 512);
        } finally {
            fclose($socket);
        }

        Db::journaliserStatique("[courriel] Envoyé à {$destinataire} via {$hote}:{$port}.");
    }

    // =========================================================================
    // Primitives de socket
    // =========================================================================

    /**
     * Lit une réponse mono-ligne et vérifie le code.
     *
     * @param resource $socket
     * @throws \RuntimeException si le code reçu ≠ attendu
     */
    private static function lire(mixed $socket, int $codeAttendu, string $contexte): string
    {
        $ligne = (string) @fgets($socket, 1024);
        $ligne = rtrim($ligne, "\r\n");

        if ($ligne === '') {
            throw new \RuntimeException("SMTP [{$contexte}] : connexion fermée prématurément.");
        }

        $code = (int) substr($ligne, 0, 3);
        if ($code !== $codeAttendu) {
            throw new \RuntimeException(
                "SMTP [{$contexte}] : code {$code} inattendu (attendu {$codeAttendu}) — {$ligne}"
            );
        }

        return $ligne;
    }

    /**
     * Lit une réponse potentiellement multi-lignes (EHLO).
     *
     * Format multi-lignes : « 250-EXTENSION\r\n » (tiret = suite).
     * Dernière ligne     : « 250 EXTENSION\r\n » (espace = fin).
     *
     * @param resource $socket
     */
    private static function lireMulti(mixed $socket, int $codeAttendu, string $contexte): string
    {
        $accumulateur = '';

        while (true) {
            $ligne = (string) @fgets($socket, 1024);
            $ligne = rtrim($ligne, "\r\n");

            if ($ligne === '') {
                throw new \RuntimeException("SMTP [{$contexte}] : connexion fermée dans une réponse multi-lignes.");
            }

            $code = (int) substr($ligne, 0, 3);
            if ($code !== $codeAttendu) {
                throw new \RuntimeException(
                    "SMTP [{$contexte}] : code {$code} inattendu (attendu {$codeAttendu}) — {$ligne}"
                );
            }

            $accumulateur .= $ligne . "\n";

            // Un espace après le code indique la dernière ligne.
            if (substr($ligne, 3, 1) === ' ') {
                break;
            }
        }

        return $accumulateur;
    }

    /**
     * Envoie une commande SMTP (ajoute CRLF).
     *
     * @param resource $socket
     */
    private static function ecrire(mixed $socket, string $commande): void
    {
        fwrite($socket, $commande . "\r\n");
    }
}
