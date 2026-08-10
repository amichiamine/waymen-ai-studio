<?php

/**
 * Importateur du catalogue de démonstration — appelable depuis le web ou la CLI.
 *
 * PROBLÈME RÉSOLU
 *
 * La version précédente lançait `api/tools/importer-donnees-front.php` comme
 * sous-processus via `proc_open`. Sur les hébergements mutualisés (Hostinger,
 * o2switch, PlanetHoster…), `proc_open` est désactivé par `disable_functions`
 * et le binaire `php` est absent du PATH du serveur web. Conséquence : code 255,
 * boutique vide, aucun remède sans SSH.
 *
 * SOLUTION
 *
 * La logique d'import est désormais dans `ImporteurDonneesFront`, une classe
 * PHP pure. Ce fichier l'appelle DIRECTEMENT, sans processus. Aucune dépendance
 * à `proc_open`, aucun binaire PHP requis.
 *
 * L'outil en ligne de commande `api/tools/importer-donnees-front.php` appelle
 * lui aussi cette classe : une seule logique, deux points d'entrée.
 *
 * POLITIQUE D'ÉCHEC
 *
 * Un import raté NE DOIT JAMAIS faire échouer l'installation. Le compte
 * propriétaire et les 24 tables sont l'essentiel — le catalogue est un bonus.
 * Ce code retourne un résultat structuré : l'assistant l'affiche, sans lever
 * d'exception si l'import n'a pas abouti.
 */

declare(strict_types=1);

namespace KaTech\Installation;

use KaTech\Db;

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
     * @param Db     $db        Instance de base de données déjà initialisée.
     */
    public function __construct(
        private readonly string $racineApi,
        private readonly Db $db,
    ) {
    }

    /**
     * Importe le catalogue et retourne un résultat structuré.
     *
     * Appelle directement `ImporteurDonneesFront` — aucun sous-processus,
     * aucune dépendance à `proc_open` ou au binaire PHP en ligne de commande.
     *
     * @return ResultatImport
     */
    public function importer(): array
    {
        $json = $this->racineApi . '/tools/donnees-front.json';

        if (!is_file($json)) {
            return $this->echec(
                "Le fichier {$json} est introuvable. L'import ne peut pas avoir lieu. "
                . "Il est normalement inclus dans le paquet d'installation."
            );
        }

        $importeur = new ImporteurDonneesFront($json, $this->db);
        $resultat  = $importeur->importer();

        if (!$resultat['ok']) {
            // L'import a échoué mais ne doit pas bloquer l'installation.
            return array_merge($resultat, [
                'erreur' => ($resultat['erreur'] ?? "L'import a échoué.")
                    . ' Votre boutique est installée, mais le catalogue est vide. '
                    . 'Pour importer plus tard : '
                    . 'DB_DRIVER=… php api/tools/importer-donnees-front.php',
            ]);
        }

        return $resultat;
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
     * Conservé pour rétro-compatibilité (utilisé nulle part en interne).
     *
     * @deprecated Utiliser directement les champs du tableau retourné par importer().
     */
    private static function extraireCompteur(string $sortie, string $table): int
    {
        if (preg_match('/\b' . preg_quote($table, '/') . '\s*:\s*(\d+)\b/', $sortie, $m)) {
            return (int) $m[1];
        }

        return 0;
    }
}
