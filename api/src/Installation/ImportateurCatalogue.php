<?php

/**
 * Importateur du catalogue de démonstration — pont entre l'assistant HTTP et
 * l'outil existant `api/tools/importer-donnees-front.php`.
 *
 * RÈGLE DE RÉUTILISATION SANS DUPLICATION
 *
 * `api/tools/importer-donnees-front.php` contient toute la logique d'import :
 * upserts idempotents, rattrapage JSON, rapport. Ce fichier ne duplique RIEN :
 * il l'appelle en sous-processus CLI.
 *
 * POURQUOI UN SOUS-PROCESSUS
 *
 * L'outil vérife `PHP_SAPI !== 'cli'` et répond 403 s'il est appelé en HTTP.
 * C'est intentionnel : il s'exécute avec les variables d'environnement de la
 * base, pas via une requête HTTP. On l'appelle donc en ligne de commande depuis
 * ce processus parent (qui, lui, est HTTP), en transmettant les bonnes variables
 * d'environnement.
 *
 * POLITIQUE D'ÉCHEC
 *
 * Un import raté NE DOIT JAMAIS faire échouer l'installation. Le compte
 * propriétaire et les 24 tables sont l'essentiel — le catalogue est un bonus.
 * Ce code retourne un résultat structuré : l'assistant l'affiche, sans lever
 * d'exception si l'import n'a pas abouti.
 *
 * MODE CLI
 *
 * Cette classe n'est PAS utilisée en ligne de commande : `install.php` CLI
 * n'appelle pas l'import. Le CLI reste inchangé. C'est volontaire : la CI et
 * les harnais contrôlent l'import séparément (voir les instructions de
 * `scripts/conformite-api.ts`).
 */

declare(strict_types=1);

namespace KaTech\Installation;

/**
 * @phpstan-type ResultatImport array{
 *   ok: bool,
 *   produits: int,
 *   categories: int,
 *   marques: int,
 *   details: string,
 *   erreur: string|null,
 * }
 */
final class ImportateurCatalogue
{
    /**
     * @param string $racineApi Chemin absolu vers le dossier `api/`.
     * @param array<string,string> $env Variables d'environnement de la base (DB_DRIVER, etc.).
     */
    public function __construct(
        private readonly string $racineApi,
        private readonly array $env,
    ) {
    }

    /**
     * Lance l'import en sous-processus et retourne le résultat.
     *
     * @return ResultatImport
     */
    public function importer(): array
    {
        $script = $this->racineApi . '/tools/importer-donnees-front.php';
        $json   = $this->racineApi . '/tools/donnees-front.json';

        if (!is_file($script)) {
            return $this->echec(
                "Le fichier {$script} est introuvable. L'import ne peut pas avoir lieu."
            );
        }

        if (!is_file($json)) {
            return $this->echec(
                "Le fichier {$json} est introuvable. L'import ne peut pas avoir lieu. "
                . 'Il est normalement inclus dans le paquet d\'installation.'
            );
        }

        // Environnement transmis au sous-processus : uniquement les variables
        // nécessaires, plus celles déjà dans l'environnement courant.
        $envSousProcessus = array_merge(
            // Variables de base du serveur PHP courant (PATH, HOME…)
            array_filter($_ENV, static fn ($v) => is_string($v)),
            // Variables de base de données passées par l'assistant
            $this->env,
        );

        // `php` doit être accessible dans le PATH du serveur web. Sur Hostinger
        // et la plupart des mutualisés, c'est le cas. S'il ne l'est pas,
        // `proc_open` échouera et on renvoie un résultat d'échec.
        $commande = [PHP_BINARY, $script];

        $descripteurs = [
            0 => ['pipe', 'r'],   // stdin
            1 => ['pipe', 'w'],   // stdout
            2 => ['pipe', 'w'],   // stderr
        ];

        $process = @proc_open($commande, $descripteurs, $pipes, $this->racineApi, $envSousProcessus);

        if ($process === false) {
            return $this->echec(
                'Impossible de lancer le sous-processus PHP. '
                . 'L\'import n\'a pas eu lieu, mais votre boutique est installée et fonctionnelle.'
            );
        }

        fclose($pipes[0]);
        $stdout = (string) stream_get_contents($pipes[1]);
        $stderr = (string) stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($process);

        if ($code !== 0) {
            $erreur = $stderr !== '' ? $stderr : 'Code de sortie : ' . $code;

            return $this->echec(
                'L\'import a rencontré une erreur (code ' . $code . '). '
                . 'Votre boutique est installée, mais le catalogue est vide. '
                . 'Pour importer plus tard : '
                . 'DB_DRIVER=… php api/tools/importer-donnees-front.php',
                $erreur,
            );
        }

        // Extraire les compteurs depuis la sortie de l'outil.
        $produits   = self::extraireCompteur($stdout, 'products');
        $categories = self::extraireCompteur($stdout, 'categories');
        $marques    = self::extraireCompteur($stdout, 'brands');

        return [
            'ok'         => true,
            'produits'   => $produits,
            'categories' => $categories,
            'marques'    => $marques,
            'details'    => $stdout,
            'erreur'     => null,
        ];
    }

    /**
     * @return ResultatImport
     */
    private function echec(string $message, string $details = ''): array
    {
        return [
            'ok'         => false,
            'produits'   => 0,
            'categories' => 0,
            'marques'    => 0,
            'details'    => $details,
            'erreur'     => $message,
        ];
    }

    /**
     * Extrait un compteur depuis la sortie texte de l'outil d'import.
     *
     * Exemple de ligne : "  products : 12 ligne(s) en base"
     */
    private static function extraireCompteur(string $sortie, string $table): int
    {
        if (preg_match('/\b' . preg_quote($table, '/') . '\s*:\s*(\d+)\b/', $sortie, $m)) {
            return (int) $m[1];
        }

        return 0;
    }
}
