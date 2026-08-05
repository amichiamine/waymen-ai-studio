<?php

/**
 * Chargement du fichier `.env` — sans dépendance Composer.
 *
 * Format accepté : `CLE=valeur`, commentaires `#`, guillemets simples ou
 * doubles optionnels. Les valeurs déjà présentes dans l'environnement réel
 * (variables système, `SetEnv` Apache) ont la priorité : elles ne sont jamais
 * écrasées par le fichier.
 */

declare(strict_types=1);

namespace KaTech;

final class Env
{
    /** @var array<string,string> */
    private static array $valeurs = [];

    private static bool $charge = false;

    /**
     * Charge le fichier `.env` situé à la racine de `api/`.
     * L'absence de fichier n'est pas une erreur : on peut tout configurer par
     * variables d'environnement (utile en CI et pour les tests).
     */
    public static function charger(?string $chemin = null): void
    {
        if (self::$charge) {
            return;
        }
        self::$charge = true;

        $chemin ??= dirname(__DIR__) . '/.env';
        if (!is_file($chemin) || !is_readable($chemin)) {
            return;
        }

        $lignes = file($chemin, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lignes === false) {
            return;
        }

        foreach ($lignes as $ligne) {
            $ligne = trim($ligne);
            if ($ligne === '' || str_starts_with($ligne, '#')) {
                continue;
            }
            $pos = strpos($ligne, '=');
            if ($pos === false) {
                continue;
            }
            $cle = trim(substr($ligne, 0, $pos));
            $val = trim(substr($ligne, $pos + 1));

            // Retrait des guillemets englobants éventuels.
            $len = strlen($val);
            if ($len >= 2) {
                $premier = $val[0];
                $dernier = $val[$len - 1];
                if (($premier === '"' && $dernier === '"') || ($premier === "'" && $dernier === "'")) {
                    $val = substr($val, 1, -1);
                }
            }

            if ($cle !== '') {
                self::$valeurs[$cle] = $val;
            }
        }
    }

    /** Lit une clé : environnement réel d'abord, puis `.env`, puis défaut. */
    public static function get(string $cle, ?string $defaut = null): ?string
    {
        self::charger();

        $systeme = getenv($cle);
        if ($systeme !== false && $systeme !== '') {
            return $systeme;
        }
        if (isset($_ENV[$cle]) && $_ENV[$cle] !== '') {
            return (string) $_ENV[$cle];
        }
        if (isset(self::$valeurs[$cle]) && self::$valeurs[$cle] !== '') {
            return self::$valeurs[$cle];
        }

        return $defaut;
    }

    /** Lit une clé booléenne (`1`, `true`, `on`, `yes` → vrai). */
    public static function bool(string $cle, bool $defaut = false): bool
    {
        $v = self::get($cle);
        if ($v === null) {
            return $defaut;
        }

        return in_array(strtolower($v), ['1', 'true', 'on', 'yes'], true);
    }

    /** Lit une clé entière. */
    public static function int(string $cle, int $defaut = 0): int
    {
        $v = self::get($cle);

        return $v === null ? $defaut : (int) $v;
    }
}
