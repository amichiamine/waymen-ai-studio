<?php

/**
 * Rapport de migration — STRUCTURE DE DONNÉES, jamais du texte.
 *
 * Pourquoi une classe et pas un `echo` : ce rapport sera rendu dans une page
 * d'administration (un autre agent s'en charge) autant que sur une console.
 * Toute mise en forme ici condamnerait l'un des deux usages. `versTableau()`
 * est donc le seul contrat de sortie ; `api/tools/migrer.php` n'est qu'un
 * habillage de ce tableau.
 *
 * Le rapport est utilisable MÊME EN CAS D'ÉCHEC : il est renseigné au fil de
 * l'eau, et une migration interrompue laisse un rapport qui dit précisément
 * où elle s'est arrêtée. Un rapport qui n'existerait qu'en cas de succès
 * serait exactement l'échec silencieux que la doctrine interdit.
 */

declare(strict_types=1);

namespace KaTech\Migration;

final class Rapport
{
    /** Migration blanche : on lit tout, on contrôle tout, on n'écrit rien. */
    public const MODE_SIMULATION = 'simulation';

    /** Migration réelle : écriture dans la base cible. */
    public const MODE_REELLE = 'reelle';

    /** Anomalie bloquante : la migration ne peut pas être validée. */
    public const ERREUR = 'erreur';

    /** Anomalie non bloquante, mais qui doit rester visible. */
    public const AVERTISSEMENT = 'avertissement';

    /** Information de traçabilité (ni faute ni risque). */
    public const INFO = 'info';

    /** @var array<string,array<string,mixed>> nom de table → compteurs */
    private array $tables = [];

    /** @var list<array<string,mixed>> */
    private array $anomalies = [];

    /** @var list<array<string,mixed>> */
    private array $journal = [];

    /** @var list<array<string,mixed>> */
    private array $sequences = [];

    private float $depart;

    private ?float $fin = null;

    private bool $ok = false;

    private ?string $motif = null;

    /**
     * @param array<string,mixed> $source descripteur de la base lue
     * @param array<string,mixed> $cible  descripteur de la base écrite
     */
    public function __construct(
        private string $mode,
        private array $source,
        private array $cible,
    ) {
        $this->depart = microtime(true);
    }

    public function mode(): string
    {
        return $this->mode;
    }

    public function estSimulation(): bool
    {
        return $this->mode === self::MODE_SIMULATION;
    }

    // =================================================================
    // Alimentation
    // =================================================================

    /** Déclare une table à traiter. Appelé avant toute lecture. */
    public function declarerTable(string $table): void
    {
        $this->tables[$table] ??= [
            'table' => $table,
            'lues' => 0,
            'ecrites' => 0,
            'empreinte_source' => null,
            'empreinte_cible' => null,
            'identique' => null,
            'duree_s' => 0.0,
            'anomalies' => 0,
        ];
    }

    /**
     * Met à jour les compteurs d'une table.
     *
     * @param array<string,mixed> $champs
     */
    public function majTable(string $table, array $champs): void
    {
        $this->declarerTable($table);
        foreach ($champs as $cle => $valeur) {
            $this->tables[$table][$cle] = $valeur;
        }
    }

    /**
     * Enregistre une anomalie.
     *
     * `$contexte` porte de quoi la corriger sans relire les journaux :
     * table, colonne, clé de la ligne fautive. Une anomalie sans contexte
     * oblige à chercher — ce qui revient à ne rien signaler.
     *
     * @param array<string,mixed> $contexte
     */
    public function anomalie(string $gravite, string $message, array $contexte = []): void
    {
        $this->anomalies[] = [
            'gravite' => $gravite,
            'message' => $message,
        ] + $contexte;

        $table = $contexte['table'] ?? null;
        if (is_string($table) && isset($this->tables[$table])) {
            $this->tables[$table]['anomalies']++;
        }
    }

    /** Trace une étape. Le journal raconte le déroulé, pas les fautes. */
    public function noter(string $message): void
    {
        $this->journal[] = [
            'a' => round(microtime(true) - $this->depart, 3),
            'message' => $message,
        ];
    }

    /** Résultat du repositionnement d'une séquence / d'un auto-incrément. */
    public function sequence(string $table, string $colonne, ?int $valeur, string $note): void
    {
        $this->sequences[] = [
            'table' => $table,
            'colonne' => $colonne,
            'valeur' => $valeur,
            'note' => $note,
        ];
    }

    /** Clôt le rapport. `$motif` explique un échec, ou reste nul. */
    public function conclure(bool $ok, ?string $motif = null): void
    {
        $this->ok = $ok;
        $this->motif = $motif;
        $this->fin = microtime(true);
    }

    // =================================================================
    // Lecture
    // =================================================================

    public function estSucces(): bool
    {
        return $this->ok;
    }

    /** @return list<array<string,mixed>> */
    public function erreurs(): array
    {
        return array_values(array_filter(
            $this->anomalies,
            static fn (array $a): bool => $a['gravite'] === self::ERREUR,
        ));
    }

    public function secondesEcoulees(): float
    {
        return ($this->fin ?? microtime(true)) - $this->depart;
    }

    /**
     * Le contrat de sortie. Tout consommateur (console, page web, test)
     * ne lit que ceci.
     *
     * @return array<string,mixed>
     */
    public function versTableau(): array
    {
        $tables = array_values($this->tables);

        return [
            'ok' => $this->ok,
            'mode' => $this->mode,
            'motif' => $this->motif,
            'source' => $this->source,
            'cible' => $this->cible,
            'demarre_a' => gmdate('c', (int) $this->depart),
            'duree_s' => round($this->secondesEcoulees(), 3),
            'totaux' => [
                'tables' => count($tables),
                'lues' => array_sum(array_column($tables, 'lues')),
                'ecrites' => array_sum(array_column($tables, 'ecrites')),
                'erreurs' => count($this->erreurs()),
                'avertissements' => count(array_filter(
                    $this->anomalies,
                    static fn (array $a): bool => $a['gravite'] === self::AVERTISSEMENT,
                )),
                'tables_identiques' => count(array_filter(
                    $tables,
                    static fn (array $t): bool => $t['identique'] === true,
                )),
            ],
            'tables' => $tables,
            'sequences' => $this->sequences,
            'anomalies' => $this->anomalies,
            'journal' => $this->journal,
        ];
    }
}
