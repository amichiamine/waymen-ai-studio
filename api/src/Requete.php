<?php

/**
 * Requête HTTP entrante, normalisée.
 *
 * Résout notamment le chemin « logique » de la route : l'URL publique est
 * `/api/v1/products`, mais le routeur ne connaît que `/products`. Le préfixe
 * est déduit de l'emplacement réel du script, ou forcé par `API_BASE_PATH`.
 */

declare(strict_types=1);

namespace KaTech;

final class Requete
{
    /**
     * @param array<string,string>  $query
     * @param array<string,mixed>   $corps
     * @param array<string,string>  $params  Paramètres nommés de la route.
     */
    public function __construct(
        public readonly string $methode,
        public readonly string $chemin,
        public readonly array $query = [],
        public readonly array $corps = [],
        public array $params = [],
    ) {
    }

    public static function depuisGlobals(): self
    {
        $methode = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $chemin = (string) (parse_url($uri, PHP_URL_PATH) ?? '/');
        $chemin = self::retirerPrefixe(rawurldecode($chemin));

        /** @var array<string,string> $query */
        $query = $_GET;

        return new self($methode, $chemin, $query, self::lireCorps());
    }

    /**
     * Retire le préfixe de montage puis la version d'API.
     * `/api/v1/products` → `/products` quel que soit le sous-dossier.
     */
    private static function retirerPrefixe(string $chemin): string
    {
        $force = Env::get('API_BASE_PATH');
        if ($force !== null) {
            $base = '/' . trim($force, '/');
        } else {
            // Dossier contenant index.php : « /api » en mutualisé, « / » avec
            // le serveur intégré de PHP.
            $base = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php')));
        }

        if ($base !== '' && $base !== '/' && str_starts_with($chemin, $base)) {
            $chemin = substr($chemin, strlen($base));
        }

        // Version d'API, optionnelle : le contrat annonce /api/v1.
        if (preg_match('#^/v\d+(?=/|$)#', $chemin, $m) === 1) {
            $chemin = substr($chemin, strlen($m[0]));
        }

        $chemin = '/' . ltrim($chemin, '/');

        // Pas de barre oblique finale, sauf pour la racine.
        return $chemin === '/' ? '/' : rtrim($chemin, '/');
    }

    /**
     * Décode le corps JSON. Un corps présent mais illisible est une erreur
     * explicite (400), jamais un tableau vide silencieux.
     *
     * @return array<string,mixed>
     */
    private static function lireCorps(): array
    {
        $type = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));

        // Le multipart (upload de média) est laissé à $_POST / $_FILES.
        if (str_contains($type, 'multipart/form-data')) {
            /** @var array<string,mixed> $post */
            $post = $_POST;

            return $post;
        }
        if (str_contains($type, 'application/x-www-form-urlencoded')) {
            /** @var array<string,mixed> $post */
            $post = $_POST;

            return $post;
        }

        $brut = (string) file_get_contents('php://input');
        if (trim($brut) === '') {
            return [];
        }

        $decode = json_decode($brut, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw ApiException::requeteInvalide(
                'Corps de requête JSON illisible : ' . json_last_error_msg() . '.'
            );
        }
        if (!is_array($decode)) {
            throw ApiException::requeteInvalide('Le corps de requête doit être un objet JSON.');
        }

        /** @var array<string,mixed> $decode */
        return $decode;
    }

    // ---- Lecture des paramètres ----------------------------------------

    /** Paramètre nommé de la route (`:id`). */
    public function param(string $nom): string
    {
        return $this->params[$nom] ?? '';
    }

    public function query(string $nom, ?string $defaut = null): ?string
    {
        $v = $this->query[$nom] ?? null;

        return ($v === null || $v === '') ? $defaut : (string) $v;
    }

    public function queryInt(string $nom, ?int $defaut = null): ?int
    {
        $v = $this->query($nom);

        return ($v === null || !is_numeric($v)) ? $defaut : (int) $v;
    }

    /** `?sale=1`, `?sale=true` → vrai ; absent → null (pas de filtre). */
    public function queryBool(string $nom): ?bool
    {
        $v = $this->query($nom);
        if ($v === null) {
            return null;
        }

        return in_array(strtolower($v), ['1', 'true', 'on', 'yes'], true);
    }

    public function corps(string $nom, mixed $defaut = null): mixed
    {
        return $this->corps[$nom] ?? $defaut;
    }

    /**
     * Adresse IP du client, aussi fiable que possible.
     *
     * En production derrière un proxy de confiance (Cloudflare, Nginx…),
     * l'IP réelle est dans `X-Forwarded-For` ou `X-Real-IP`. On ne lit ces
     * en-têtes QUE si la requête vient d'une adresse de loopback ou privée,
     * pour éviter qu'un client quelconque ne forge l'en-tête et contourne
     * la limitation de débit.
     *
     * Si aucune IP n'est lisible, on retourne « 0.0.0.0 » : un cas
     * impossible en production, mais qui évite un null inattendu en CLI.
     */
    public function ip(): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

        // Proxy de confiance (loopback ou RFC 1918) : on accepte X-Forwarded-For.
        if ($this->estIpPrivee($remote)) {
            $xff = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))[0]);
            if ($xff !== '' && filter_var($xff, FILTER_VALIDATE_IP)) {
                return $xff;
            }
            $xri = trim((string) ($_SERVER['HTTP_X_REAL_IP'] ?? ''));
            if ($xri !== '' && filter_var($xri, FILTER_VALIDATE_IP)) {
                return $xri;
            }
        }

        return $remote !== '' ? $remote : '0.0.0.0';
    }

    /** Vrai si l'adresse est une loopback ou une plage RFC 1918. */
    private function estIpPrivee(string $ip): bool
    {
        if ($ip === '' || $ip === '::1' || $ip === '127.0.0.1') {
            return true;
        }

        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        ) === false;
    }
}
