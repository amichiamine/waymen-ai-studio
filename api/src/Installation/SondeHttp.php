<?php

/**
 * Preuve que le dossier de données n'est pas téléchargeable depuis Internet.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 * ─────────────────────────────────────────────────────────────────────────
 * Tout le monde POSE des protections ; presque personne ne les ÉPROUVE. Or une
 * protection supposée ne vaut rien : `.htaccess` non téléversé (les
 * gestionnaires de fichiers sautent les fichiers commençant par un point),
 * `AllowOverride None`, migration vers nginx qui ignore les `.htaccess`,
 * `DOCUMENT_ROOT` fixé un cran trop haut — chacun de ces accidents rend la base
 * publique sans le moindre message d'erreur.
 *
 * L'installateur va donc chercher SA PROPRE base par HTTP, depuis le serveur,
 * comme le ferait un visiteur, et rapporte ce qu'il obtient.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * COMMENT LE CONTRÔLE SAIT DIRE « OUI » ET « NON »
 * ─────────────────────────────────────────────────────────────────────────
 * Un contrôle qui répond toujours « vert » est un contrôle inutile. Deux
 * précautions le rendent falsifiable :
 *
 *   1. UN TÉMOIN PLUTÔT QU'UNE DEVINETTE. On écrit dans le dossier de données un
 *      petit fichier contenant un jeton aléatoire, puis on tente de le
 *      télécharger. Le verdict « exposé » n'est prononcé QUE si la réponse
 *      contient ce jeton exact. Un 200 servi par une page d'erreur maison, une
 *      page de parking ou un portail captif ne peut donc pas produire un faux
 *      rouge — et un 404 sur un chemin qui n'existe pas ne peut pas produire un
 *      faux vert, puisque le fichier, lui, existe bel et bien.
 *
 *   2. TROIS ISSUES, PAS DEUX. « protégé », « EXPOSÉ », et « non vérifié »
 *      quand la requête sortante est impossible (hébergeur qui bloque les
 *      appels réseau sortants, `allow_url_fopen` désactivé, DNS interne qui ne
 *      résout pas le domaine public). Dans ce dernier cas on le DIT :
 *      l'installation continue, mais aucun vert n'est affiché.
 *
 * Les URL candidates sont celles qu'un attaquant essaierait : le dossier de
 * données sous la racine du domaine, et — déploiement en sous-dossier — sous
 * le sous-dossier du site. Quand le dossier est réellement sous la racine web
 * (cas du repli), son URL exacte est calculée et testée en plus : c'est le cas
 * où la protection est la plus fragile, et donc celui qu'il faut éprouver le
 * plus sérieusement.
 */

declare(strict_types=1);

namespace KaTech\Installation;

final class SondeHttp
{
    public const PROTEGE = 'protege';
    public const EXPOSE = 'expose';
    public const NON_VERIFIE = 'non_verifie';

    /** Une requête sortante ne doit pas faire attendre l'écran plus que ça. */
    private const DELAI_SECONDES = 5;

    /**
     * @param string      $verdict     PROTEGE | EXPOSE | NON_VERIFIE
     * @param list<array{url:string,resultat:string}> $essais
     */
    private function __construct(
        public readonly string $verdict,
        public readonly array $essais,
        public readonly string $explication,
    ) {
    }

    public function estProtege(): bool
    {
        return $this->verdict === self::PROTEGE;
    }

    public function estExpose(): bool
    {
        return $this->verdict === self::EXPOSE;
    }

    /**
     * Éprouve l'accès HTTP au dossier de données.
     *
     * @param array<string,mixed> $serveur  Copie de `$_SERVER`.
     */
    public static function eprouver(Emplacement $emplacement, array $serveur): self
    {
        $base = self::baseUrl($serveur);
        if ($base === null) {
            return new self(
                self::NON_VERIFIE,
                [],
                'Impossible de reconstituer l\'adresse publique du site (en-tête Host absent). '
                . 'La vérification n\'a PAS été faite : ne considérez pas la base comme protégée '
                . 'tant que vous n\'avez pas ouvert vous-même l\'adresse du dossier de données '
                . 'dans votre navigateur.',
            );
        }

        $moyen = self::moyenDisponible();
        if ($moyen === null) {
            return new self(
                self::NON_VERIFIE,
                [],
                'Cet hébergeur interdit à PHP d\'émettre des requêtes réseau sortantes '
                . '(extension curl absente et allow_url_fopen désactivé). La vérification n\'a PAS '
                . 'pu être faite. Vérifiez-la à la main : ouvrez l\'adresse du dossier de données '
                . 'dans votre navigateur, vous devez obtenir une erreur 403 ou 404.',
            );
        }

        // ---- Le témoin : un fichier réel, un jeton unique -----------------
        $jeton = 'katech-temoin-' . bin2hex(random_bytes(16));
        $nomTemoin = 'temoin-acces-' . bin2hex(random_bytes(6)) . '.txt';
        $cheminTemoin = $emplacement->chemin . '/' . $nomTemoin;

        if (@file_put_contents($cheminTemoin, $jeton) === false) {
            return new self(
                self::NON_VERIFIE,
                [],
                'Le fichier témoin nécessaire au contrôle n\'a pas pu être écrit dans le dossier '
                . 'de données. La vérification n\'a PAS été faite.',
            );
        }

        try {
            $essais = [];
            $expose = false;
            $auMoinsUneReponse = false;

            foreach (self::urlsCandidates($base, $emplacement, $nomTemoin) as $url) {
                $reponse = self::telecharger($url, $moyen);

                if ($reponse === null) {
                    $essais[] = ['url' => $url, 'resultat' => 'aucune réponse (requête sortante impossible)'];
                    continue;
                }

                $auMoinsUneReponse = true;

                if (str_contains($reponse['corps'], $jeton)) {
                    $expose = true;
                    $essais[] = [
                        'url' => $url,
                        'resultat' => 'TÉLÉCHARGÉ (HTTP ' . $reponse['statut'] . ') — le contenu du '
                            . 'dossier de données sort par Internet',
                    ];
                    continue;
                }

                $essais[] = [
                    'url' => $url,
                    'resultat' => 'refusé (HTTP ' . $reponse['statut'] . ') — le fichier existe '
                        . 'pourtant sur le disque',
                ];
            }
        } finally {
            @unlink($cheminTemoin);
        }

        if ($expose) {
            return new self(
                self::EXPOSE,
                $essais,
                'ALERTE : un fichier déposé dans le dossier de données a été TÉLÉCHARGÉ depuis '
                . 'Internet. Tout ce que ce dossier contiendra — la base, donc les noms, '
                . 'téléphones, adresses et empreintes de mots de passe de vos clients — est '
                . 'accessible à qui en devine l\'adresse.',
            );
        }

        if (!$auMoinsUneReponse) {
            return new self(
                self::NON_VERIFIE,
                $essais,
                'Aucune des adresses testées n\'a répondu : cet hébergeur empêche le serveur '
                . 'd\'appeler son propre site (pare-feu sortant, ou nom de domaine non résolu '
                . 'depuis l\'intérieur). La vérification n\'a PAS été faite — refaites-la '
                . 'vous-même depuis votre navigateur.',
            );
        }

        return new self(
            self::PROTEGE,
            $essais,
            'Un fichier a réellement été déposé dans le dossier de données, puis réclamé par '
            . 'Internet : le serveur a refusé de le livrer. La protection n\'est pas supposée, '
            . 'elle est éprouvée.',
        );
    }

    /**
     * Adresses qu'un curieux essaierait, et celle qui existe vraiment.
     *
     * @return list<string>
     */
    private static function urlsCandidates(string $base, Emplacement $emplacement, string $fichier): array
    {
        $urls = [];

        // 1. L'URL EXACTE, quand le dossier est réellement servi par le serveur
        //    web. C'est le cas du repli : la protection y repose entièrement sur
        //    le .htaccess, et c'est précisément lui qu'il faut éprouver.
        if ($emplacement->racineWeb !== null && Emplacement::estSous($emplacement->chemin, $emplacement->racineWeb)) {
            $relatif = trim(substr($emplacement->chemin, strlen($emplacement->racineWeb)), '/');
            $urls[] = $base . '/' . self::encoderChemin($relatif . '/' . $fichier);
        }

        // 2. À la racine du domaine — l'essai le plus évident.
        $urls[] = $base . '/' . Emplacement::NOM_DOSSIER . '/' . rawurlencode($fichier);

        // 3. Sous le sous-dossier du site, quand il y en a un : un
        //    DOCUMENT_ROOT mal réglé y ferait apparaître le dossier de données.
        if ($emplacement->sousDossier !== '') {
            $urls[] = $base . '/' . self::encoderChemin($emplacement->sousDossier)
                . '/' . Emplacement::NOM_DOSSIER . '/' . rawurlencode($fichier);
        }

        return array_values(array_unique($urls));
    }

    private static function encoderChemin(string $chemin): string
    {
        return implode('/', array_map('rawurlencode', array_filter(explode('/', $chemin), 'strlen')));
    }

    /** Racine publique du site, reconstituée depuis la requête en cours. */
    private static function baseUrl(array $serveur): ?string
    {
        $hote = (string) ($serveur['HTTP_HOST'] ?? $serveur['SERVER_NAME'] ?? '');
        $hote = trim($hote);
        if ($hote === '' || preg_match('/^[A-Za-z0-9.\-:\[\]]+$/', $hote) !== 1) {
            return null;
        }

        $https = ((string) ($serveur['HTTPS'] ?? '')) !== ''
            && strtolower((string) $serveur['HTTPS']) !== 'off';
        // Derrière le répartiteur de charge d'un mutualisé, HTTPS n'est pas posé :
        // l'en-tête transmis par le proxy est la seule information disponible.
        $transmis = strtolower(trim((string) ($serveur['HTTP_X_FORWARDED_PROTO'] ?? '')));
        if ($transmis !== '') {
            $https = $transmis === 'https';
        }

        return ($https ? 'https://' : 'http://') . $hote;
    }

    /** « curl », « fopen », ou null si aucune requête sortante n'est possible. */
    private static function moyenDisponible(): ?string
    {
        if (function_exists('curl_init')) {
            return 'curl';
        }
        if (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL)) {
            return 'fopen';
        }

        return null;
    }

    /**
     * @return array{statut:int,corps:string}|null null si la requête n'a pas abouti
     */
    private static function telecharger(string $url, string $moyen): ?array
    {
        // Le bootstrap du projet promeut tout avertissement PHP en exception.
        // C'est une bonne règle — mais ici, un incident réseau ne doit pas faire
        // tomber la page d'installation : il doit produire « non vérifié ».
        try {
            return $moyen === 'curl' ? self::telechargerCurl($url) : self::telechargerFopen($url);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Requête sortante à usage général, pour l'écran de diagnostic (qui a besoin
     * de savoir si les `.htaccess` sont réellement pris en compte). Rend null
     * quand aucune requête n'est possible — l'appelant doit alors dire « non
     * vérifié », jamais « tout va bien ».
     *
     * @return array{statut:int,corps:string}|null
     */
    public static function requete(string $url): ?array
    {
        $moyen = self::moyenDisponible();

        return $moyen === null ? null : self::telecharger($url, $moyen);
    }

    /** Racine publique du site (`https://domaine`), ou null si indéterminable. */
    public static function racinePublique(array $serveur): ?string
    {
        return self::baseUrl($serveur);
    }

    private static function telechargerCurl(string $url): ?array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::DELAI_SECONDES,
            CURLOPT_CONNECTTIMEOUT => self::DELAI_SECONDES,
            CURLOPT_FOLLOWLOCATION => false,
            // Un certificat auto-signé ou expiré ne doit pas transformer un
            // « exposé » en « non vérifié » : on éprouve un contrôle d'accès,
            // pas la chaîne TLS. Le contenu attendu est un jeton public
            // à usage unique, effacé aussitôt.
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_USERAGENT => 'KaTech-Installateur/1.0 (verification-acces)',
        ]);

        $corps = curl_exec($ch);
        $statut = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        // Pas de `curl_close()` : sans effet depuis PHP 8.0, et DÉPRÉCIÉ depuis
        // PHP 8.5. Comme `api/src/bootstrap.php` transforme tout avertissement en
        // exception, l'appeler faisait tomber la page d'installation entière sur
        // un PHP récent. La ressource est libérée par le ramasse-miettes.
        unset($ch);

        if ($corps === false || $statut === 0) {
            return null;
        }

        return ['statut' => $statut, 'corps' => (string) $corps];
    }

    private static function telechargerFopen(string $url): ?array
    {
        $contexte = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => self::DELAI_SECONDES,
                'ignore_errors' => true,   // sans quoi un 403 ne rend aucun corps
                'follow_location' => 0,
                'user_agent' => 'KaTech-Installateur/1.0 (verification-acces)',
            ],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);

        $corps = @file_get_contents($url, false, $contexte);
        if ($corps === false) {
            return null;
        }

        $statut = 0;
        foreach ($http_response_header ?? [] as $entete) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $entete, $m) === 1) {
                $statut = (int) $m[1];
            }
        }

        return $statut === 0 ? null : ['statut' => $statut, 'corps' => $corps];
    }
}
