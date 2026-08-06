<?php

/**
 * Migrateur — copie l'intégralité des données d'une base vers une autre,
 * entre les pilotes `sqlite`, `mysql` et `pgsql`, dans n'importe quel sens.
 *
 * POURQUOI CETTE CLASSE N'UTILISE PAS `KaTech\Db`
 * ------------------------------------------------
 * `Db` sert LA base configurée de l'application. Migrer consiste précisément à
 * écrire dans une base qui n'est PAS encore celle-là — souvent une base vide
 * créée cinq minutes plus tôt dans le panneau de l'hébergeur. Le migrateur
 * établit donc ses deux connexions lui-même, à partir de DSN. C'est aussi ce
 * qui permet de migrer depuis une ancienne base après avoir déjà rebasculé la
 * configuration.
 *
 * CE QUE LE MOTEUR GARANTIT (et refuse de faire sans preuve)
 * ----------------------------------------------------------
 *  1. Le CONTENU est comparé, pas le nombre de lignes. Chaque table produit
 *     une empreinte calculée sur des valeurs NORMALISÉES : un booléen `1`
 *     (SQLite/MySQL) et `true` (Postgres) donnent la même empreinte, un objet
 *     JSON dont `jsonb` a réordonné les clés aussi, un `NULL` et une chaîne
 *     vide JAMAIS. Cette empreinte est ré-calculée côté cible et comparée.
 *  2. La comparaison a lieu DANS la transaction d'écriture : une divergence
 *     provoque un `ROLLBACK`, pas un rapport d'échec sur une base déjà sale.
 *  3. Mode SIMULATION par défaut. Il lit tout, contrôle tout, n'écrit rien.
 *  4. Une cible non vide est refusée, sauf `remplacer` explicite.
 *  5. Une interruption ne laisse pas de base à moitié remplie : tout le
 *     chargement tient dans UNE transaction, et une table témoin
 *     `_katech_migration` reste sur l'état « en_cours » si le processus est
 *     tué — la migration suivante le voit et le dit.
 *  6. Aucune table n'est jamais chargée en mémoire : lecture par lots avec
 *     pagination par clé (voir `lireLot()`), écriture par lots bornés au
 *     nombre de variables liées supporté par SQLite.
 *
 * LIMITE ASSUMÉE — hébergement mutualisé
 * ---------------------------------------
 * `max_execution_time` (souvent 30 s) peut interrompre une migration volumineuse.
 * Le moteur ne fait PAS semblant que cela n'arrivera pas : il travaille sous un
 * budget de temps (`budget_s`) et, s'il l'épuise, il ANNULE tout et le dit,
 * plutôt que de valider une base à moitié remplie. Le mode simulation mesure la
 * durée de la passe de lecture et permet donc de savoir AVANT d'écrire si la
 * migration tient dans le budget.
 *
 * Usage :
 *   $rapport = (new Migrateur($pdoSource, $pdoCible, ['mode' => Rapport::MODE_REELLE]))->executer();
 */

declare(strict_types=1);

namespace KaTech\Migration;

use PDO;
use PDOException;
use RuntimeException;
use Throwable;

final class Migrateur
{
    /** Table témoin déposée dans la CIBLE — jamais migrée elle-même. */
    public const TABLE_TEMOIN = '_katech_migration';

    /** @var array<string,mixed> */
    private array $options;

    private string $piloteSource;

    private string $piloteCible;

    private Rapport $rapport;

    /** Instant au-delà duquel on annule plutôt que de risquer une coupure. */
    private float $echeance = INF;

    private bool $transactionOuverte = false;

    private ?string $jetonTemoin = null;

    /** @var array<string,string> table → empreinte de la source */
    private array $empreintesSource = [];

    /** @param array<string,mixed> $options */
    public function __construct(
        private PDO $source,
        private PDO $cible,
        array $options = [],
    ) {
        $this->options = $options + [
            'mode' => Rapport::MODE_SIMULATION,
            'remplacer' => false,
            'creer_schema' => false,
            'budget_s' => 25.0,
            'lignes_par_lot' => 500,
            // SQLite refuse au-delà de 999 variables liées sur les vieilles
            // compilations : c'est ce plafond-là qui borne les lots d'écriture.
            'variables_max' => 900,
            'tables' => [],
            'dossier_schema' => dirname(__DIR__, 2) . '/schema',
            'etiquette_source' => null,
            'etiquette_cible' => null,
        ];

        $this->piloteSource = (string) $source->getAttribute(PDO::ATTR_DRIVER_NAME);
        $this->piloteCible = (string) $cible->getAttribute(PDO::ATTR_DRIVER_NAME);
    }

    /**
     * Ouvre une connexion PDO à partir d'un DSN, avec les attributs qu'exige
     * une migration fidèle.
     *
     * `ATTR_EMULATE_PREPARES = false` n'est pas cosmétique : en émulation,
     * MySQL renvoie TOUTES les colonnes en chaînes et accepte des liaisons
     * approximatives. On veut les types réels, et un refus net sinon.
     */
    public static function connecter(string $dsn, ?string $utilisateur = null, ?string $motDePasse = null): PDO
    {
        $dsn = trim($dsn);
        if ($dsn === '') {
            throw new RuntimeException('DSN vide : indiquez par exemple « sqlite:/chemin/base.sqlite ».');
        }

        $pilote = strtolower(substr($dsn, 0, (int) strpos($dsn . ':', ':')));
        if (!in_array($pilote, ['sqlite', 'mysql', 'pgsql'], true)) {
            throw new RuntimeException(
                "Pilote « {$pilote} » non supporté. DSN attendu : sqlite:… , mysql:… ou pgsql:… ."
            );
        }

        try {
            $pdo = new PDO($dsn, $utilisateur, $motDePasse, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            throw new RuntimeException(
                "Connexion impossible à « " . self::masquer($dsn) . " » : " . $e->getMessage(),
                0,
                $e
            );
        }

        // Réglages de session indispensables à une copie fidèle.
        if ($pilote === 'mysql') {
            $pdo->exec('SET NAMES utf8mb4');
            // Sans mode strict, MySQL TRONQUE une chaîne trop longue au lieu de
            // refuser : une déformation silencieuse, exactement ce qu'on interdit.
            $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
        } elseif ($pilote === 'pgsql') {
            $pdo->exec("SET client_encoding TO 'UTF8'");
        } elseif ($pilote === 'sqlite') {
            $pdo->exec('PRAGMA foreign_keys = ON');
        }

        return $pdo;
    }

    /** Retire le mot de passe d'un DSN avant de le faire figurer dans un rapport. */
    public static function masquer(string $dsn): string
    {
        return (string) preg_replace('/(password|pwd)=[^;]*/i', '$1=***', $dsn);
    }

    // =================================================================
    // Point d'entrée
    // =================================================================

    /**
     * Exécute la migration (ou sa simulation) et rend le rapport.
     *
     * Ne lève JAMAIS : toute erreur est convertie en rapport en échec. Un
     * appelant web doit pouvoir afficher le rapport dans tous les cas.
     *
     * @return array<string,mixed>
     */
    public function executer(): array
    {
        $this->rapport = new Rapport(
            (string) $this->options['mode'],
            $this->descripteur($this->source, $this->piloteSource, $this->options['etiquette_source']),
            $this->descripteur($this->cible, $this->piloteCible, $this->options['etiquette_cible']),
        );

        $this->echeance = microtime(true) + (float) $this->options['budget_s'];

        try {
            $this->deroulerMigration();
            $this->rapport->conclure($this->rapport->erreurs() === [], null);
        } catch (Throwable $e) {
            $this->annulerTransaction();
            // Un échec PROPRE (annulation réussie) n'a pas laissé la cible à
            // moitié remplie : le témoin passe donc à « annulee ». Seule une
            // mort brutale du processus laisse « en_cours » — et c'est bien
            // le seul cas où la migration suivante doit exiger un arbitrage.
            $this->marquerTemoin('annulee', $e->getMessage());
            $this->rapport->anomalie(Rapport::ERREUR, $e->getMessage(), [
                'origine' => basename($e->getFile()) . ':' . $e->getLine(),
            ]);
            $this->rapport->conclure(false, $e->getMessage());
        }

        return $this->rapport->versTableau();
    }

    // =================================================================
    // Déroulé
    // =================================================================

    private function deroulerMigration(): void
    {
        $reelle = $this->options['mode'] === Rapport::MODE_REELLE;

        if ($this->options['creer_schema'] === true) {
            // SEULE écriture admise en simulation, et elle est annoncée.
            // Créer des tables VIDES ne détruit rien (« IF NOT EXISTS »), et
            // sans cela une simulation vers une base fraîchement créée serait
            // impossible — donc la première migration réelle se ferait sans
            // répétition générale, ce qui est bien pire.
            if (!$reelle) {
                $this->rapport->anomalie(
                    Rapport::INFO,
                    "Simulation : les tables absentes de la cible ont été CRÉÉES (vides) pour pouvoir "
                    . "contrôler les types. Aucune donnée n'est écrite.",
                );
            }
            $this->appliquerSchema();
        }

        $plan = $this->construirePlan();
        if ($plan === []) {
            throw new RuntimeException(
                'Aucune table commune entre la source et la cible. La cible a-t-elle été installée '
                . '(/api/install.php, ou option « creer_schema ») ?'
            );
        }

        $this->rapport->noter(count($plan) . ' table(s) au plan : ' . implode(', ', array_keys($plan)));

        $occupation = $this->inventorierCible(array_keys($plan));

        if ($reelle) {
            $this->refuserCibleOccupee($occupation);
            $this->refuserMigrationInterrompue();
            $this->ouvrirTemoin();

            $this->cible->beginTransaction();
            $this->transactionOuverte = true;
            $this->relacherContraintes();

            if ($this->options['remplacer'] === true) {
                $this->viderCible(array_keys($plan));
            }
        }

        // --- Passe 1 : lecture de la source (+ écriture si mode réel) -----
        foreach ($plan as $table => $descripteur) {
            $this->transferer($table, $descripteur);
        }

        // --- Passe 2 : empreintes de la cible et comparaison --------------
        // En mode réel elle a lieu AVANT le commit : une divergence annule
        // tout. En simulation, elle n'a de sens que sur une table cible déjà
        // peuplée — et elle offre alors gratuitement le contrôle d'après-coup
        // de deux bases censées être identiques.
        foreach ($plan as $table => $descripteur) {
            if ($reelle || ($occupation[$table] ?? 0) > 0) {
                $this->controlerEmpreinte($table, $descripteur);
            }
        }

        if (!$reelle) {
            $this->rapport->noter(sprintf(
                'SIMULATION terminée en %.2f s — aucune écriture. Prévoyez un budget au moins équivalent '
                . 'pour la migration réelle.',
                $this->rapport->secondesEcoulees(),
            ));

            return;
        }

        if ($this->rapport->erreurs() !== []) {
            throw new RuntimeException(
                count($this->rapport->erreurs()) . ' anomalie(s) bloquante(s) : la transaction est annulée, '
                . "la base cible reste dans l'état où elle était."
            );
        }

        $this->cible->commit();
        $this->transactionOuverte = false;
        $this->rapport->noter('Transaction validée.');

        // Après le commit seulement : en MySQL, « ALTER TABLE … AUTO_INCREMENT »
        // est du DDL et validerait implicitement la transaction en cours.
        $this->rejouerSequences($plan);

        $this->cloreTemoin();
    }

    // =================================================================
    // Plan de migration
    // =================================================================

    /**
     * Construit, pour chaque table à migrer, tout ce dont les passes ont besoin.
     *
     * @return array<string,array<string,mixed>>
     */
    private function construirePlan(): array
    {
        $tablesSource = $this->listerTables($this->source, $this->piloteSource);
        $tablesCible = $this->listerTables($this->cible, $this->piloteCible);

        $demandees = (array) $this->options['tables'];
        $communes = array_values(array_intersect($tablesSource, $tablesCible));

        foreach (array_diff($tablesSource, $tablesCible) as $absente) {
            $this->rapport->anomalie(
                Rapport::ERREUR,
                "La table « {$absente} » existe dans la source mais pas dans la cible : ses données "
                . 'seraient perdues. Installez le schéma complet dans la cible avant de migrer.',
                ['table' => $absente],
            );
        }
        foreach (array_diff($tablesCible, $tablesSource) as $enTrop) {
            $this->rapport->anomalie(
                Rapport::AVERTISSEMENT,
                "La table « {$enTrop} » existe dans la cible mais pas dans la source : elle restera vide.",
                ['table' => $enTrop],
            );
        }

        if ($demandees !== []) {
            $communes = array_values(array_intersect($communes, $demandees));
        }

        $ordonnees = $this->ordonner($communes);

        $plan = [];
        foreach ($ordonnees as $table) {
            $plan[$table] = $this->planifierTable($table);
        }

        return $plan;
    }

    /**
     * Ordre d'insertion : ordre de déclaration du schéma de référence, puis
     * tri topologique sur les clés étrangères réellement déclarées.
     *
     * Le schéma actuel du projet n'en déclare aucune (contrôlé par
     * `api/tools/verifier-parite-schema.php`, qui refuse même les contraintes
     * de table) : le tri est donc aujourd'hui neutre. Il est écrit quand même,
     * car le jour où une clé étrangère apparaîtra, une migration qui insère
     * dans le désordre échouera de façon spectaculaire et incompréhensible.
     *
     * @param list<string> $tables
     * @return list<string>
     */
    private function ordonner(array $tables): array
    {
        $reference = $this->ordreDeReference();
        $rang = array_flip($reference);

        usort($tables, static function (string $a, string $b) use ($rang): int {
            $ra = $rang[$a] ?? PHP_INT_MAX;
            $rb = $rang[$b] ?? PHP_INT_MAX;

            return $ra === $rb ? strcmp($a, $b) : $ra <=> $rb;
        });

        // Dépendances : table → tables dont elle dépend (parents).
        $dependances = [];
        foreach ($tables as $t) {
            $dependances[$t] = array_values(array_intersect(
                $this->clesEtrangeres($this->cible, $this->piloteCible, $t),
                $tables,
            ));
        }

        $resultat = [];
        $vus = [];
        $enCours = [];

        $visiter = function (string $t) use (&$visiter, &$resultat, &$vus, &$enCours, $dependances): void {
            if (isset($vus[$t])) {
                return;
            }
            if (isset($enCours[$t])) {
                // Cycle : aucun ordre ne satisfait les contraintes. On le dit
                // au lieu de choisir au hasard un ordre qui échouera.
                $this->rapport->anomalie(
                    Rapport::AVERTISSEMENT,
                    "Cycle de clés étrangères détecté autour de « {$t} » : l'ordre d'insertion ne peut pas "
                    . 'satisfaire toutes les contraintes. Elles sont relâchées le temps du chargement.',
                    ['table' => $t],
                );

                return;
            }
            $enCours[$t] = true;
            foreach ($dependances[$t] ?? [] as $parent) {
                if ($parent !== $t) {
                    $visiter($parent);
                }
            }
            unset($enCours[$t]);
            $vus[$t] = true;
            $resultat[] = $t;
        };

        foreach ($tables as $t) {
            $visiter($t);
        }

        return $resultat;
    }

    /**
     * Ordre de déclaration lu dans le fichier de schéma de la cible (à défaut
     * celui de la source, à défaut n'importe lequel). Les schémas du projet
     * sont des jumeaux : n'importe lequel donne le même ordre.
     *
     * @return list<string>
     */
    private function ordreDeReference(): array
    {
        $dossier = (string) $this->options['dossier_schema'];
        foreach ([$this->piloteCible, $this->piloteSource, 'sqlite', 'mysql', 'pgsql'] as $pilote) {
            $fichier = $dossier . '/schema.' . $pilote . '.sql';
            if (!is_file($fichier)) {
                continue;
            }
            $sql = (string) file_get_contents($fichier);
            if (preg_match_all(
                '/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z0-9_]+)[`"]?/i',
                $sql,
                $m
            ) > 0) {
                return array_map('strtolower', $m[1]);
            }
        }

        return [];
    }

    /**
     * Descripteur d'une table : colonnes retenues, type logique de chacune,
     * clé de pagination, colonne auto-incrémentée.
     *
     * @return array<string,mixed>
     */
    private function planifierTable(string $table): array
    {
        $this->rapport->declarerTable($table);

        $colSource = $this->colonnes($this->source, $this->piloteSource, $table);
        $colCible = $this->colonnes($this->cible, $this->piloteCible, $table);

        $jsonDeclarees = $this->colonnesJsonDeclarees($table);

        $retenues = [];
        foreach ($colSource as $nom => $descSource) {
            if (!isset($colCible[$nom])) {
                $this->rapport->anomalie(
                    Rapport::ERREUR,
                    "Colonne « {$table}.{$nom} » présente dans la source, absente de la cible : "
                    . 'ses valeurs seraient perdues.',
                    ['table' => $table, 'colonne' => $nom],
                );

                continue;
            }
            $retenues[$nom] = [
                'source' => $descSource,
                'cible' => $colCible[$nom],
                'type' => $this->typeLogiqueCombine(
                    $descSource['type'],
                    $colCible[$nom]['type'],
                    isset($jsonDeclarees[$nom]),
                ),
            ];
        }

        foreach (array_diff(array_keys($colCible), array_keys($colSource)) as $enTrop) {
            $gravite = ($colCible[$enTrop]['nullable'] || $colCible[$enTrop]['defaut'] !== null)
                ? Rapport::AVERTISSEMENT
                : Rapport::ERREUR;
            $this->rapport->anomalie(
                $gravite,
                "Colonne « {$table}.{$enTrop} » présente dans la cible mais pas dans la source"
                . ($gravite === Rapport::ERREUR
                    ? ' ; elle est NOT NULL sans valeur par défaut, l\'insertion échouera.'
                    : ' ; elle prendra sa valeur par défaut.'),
                ['table' => $table, 'colonne' => $enTrop],
            );
        }

        if ($retenues === []) {
            throw new RuntimeException("Aucune colonne exploitable pour la table « {$table} ».");
        }

        return [
            'colonnes' => $retenues,
            'cle' => $this->clePrimaire($this->source, $this->piloteSource, $table),
            'cle_cible' => $this->clePrimaire($this->cible, $this->piloteCible, $table),
            'auto_cible' => $this->colonneAuto($colCible),
        ];
    }

    // =================================================================
    // Contrôles préalables sur la cible
    // =================================================================

    /**
     * @param list<string> $tables
     * @return array<string,int> table → nombre de lignes déjà présentes
     */
    private function inventorierCible(array $tables): array
    {
        $occupation = [];
        foreach ($tables as $table) {
            $occupation[$table] = (int) $this->cible
                ->query('SELECT COUNT(*) FROM ' . $this->q($this->piloteCible, $table))
                ?->fetchColumn();
        }

        return $occupation;
    }

    /** @param array<string,int> $occupation */
    private function refuserCibleOccupee(array $occupation): void
    {
        $occupees = array_filter($occupation, static fn (int $n): bool => $n > 0);
        if ($occupees === []) {
            return;
        }

        $total = array_sum($occupees);
        $detail = implode(', ', array_map(
            static fn (string $t, int $n): string => "{$t}={$n}",
            array_keys($occupees),
            $occupees,
        ));

        if ($this->options['remplacer'] !== true) {
            throw new RuntimeException(
                "REFUS : la base cible n'est pas vide ({$total} ligne(s) dans " . count($occupees)
                . " table(s) : {$detail}). Écraser ces données doit être demandé explicitement "
                . "(option « remplacer »). Sauvegardez d'abord : api/tools/sauvegarder.php."
            );
        }

        $this->rapport->anomalie(
            Rapport::AVERTISSEMENT,
            "Remplacement demandé : {$total} ligne(s) existantes seront supprimées ({$detail}).",
        );
    }

    /**
     * Une migration précédente tuée en plein vol a laissé son témoin sur
     * « en_cours ». La transaction ayant été annulée par le serveur, la base
     * est en principe intacte — mais « en principe » ne suffit pas : on exige
     * une décision humaine.
     */
    private function refuserMigrationInterrompue(): void
    {
        if (!$this->temoinExiste()) {
            return;
        }

        $ligne = $this->cible->query(
            'SELECT id, etat, demarre_a FROM ' . $this->q($this->piloteCible, self::TABLE_TEMOIN)
            . " WHERE etat = 'en_cours' ORDER BY demarre_a DESC"
        )?->fetch(PDO::FETCH_ASSOC);

        if (!is_array($ligne)) {
            return;
        }

        if ($this->options['remplacer'] !== true) {
            throw new RuntimeException(
                "REFUS : une migration démarrée le {$ligne['demarre_a']} (jeton {$ligne['id']}) n'a jamais "
                . "été menée à son terme. La base cible peut être incomplète ALORS QU'ELLE SEMBLE PLEINE. "
                . 'Vérifiez-la, puis relancez avec l\'option « remplacer » pour repartir d\'une cible nette.'
            );
        }

        $this->rapport->anomalie(
            Rapport::AVERTISSEMENT,
            "Migration précédente inachevée du {$ligne['demarre_a']} : elle sera écrasée.",
        );
    }

    // =================================================================
    // Transfert d'une table
    // =================================================================

    /** @param array<string,mixed> $descripteur */
    private function transferer(string $table, array $descripteur): void
    {
        $depart = microtime(true);
        $colonnes = $descripteur['colonnes'];
        $noms = array_keys($colonnes);
        $reelle = $this->options['mode'] === Rapport::MODE_REELLE;

        $agregat = $this->nouvelAgregat();
        $lues = 0;
        $ecrites = 0;
        $tampon = [];
        $parLot = max(1, (int) floor((int) $this->options['variables_max'] / max(1, count($noms))));

        $parcours = $this->parcourir(
            $this->source,
            $this->piloteSource,
            $table,
            $noms,
            $descripteur['cle'],
            $this->textuelles($colonnes, 'source'),
        );

        foreach ($parcours as $ligne) {
            $lues++;
            $this->cumuler($agregat, $this->empreinteLigne($ligne, $colonnes, $table));
            $this->controlerLigne($table, $ligne, $colonnes, $descripteur['cle']);

            if ($reelle) {
                $tampon[] = $ligne;
                if (count($tampon) >= $parLot) {
                    $ecrites += $this->insererLot($table, $noms, $colonnes, $tampon);
                    $tampon = [];
                }
            }

            $this->verifierBudget($table, $lues);
        }

        if ($tampon !== []) {
            $ecrites += $this->insererLot($table, $noms, $colonnes, $tampon);
        }

        $this->empreintesSource[$table] = $this->condenser($agregat);

        $this->rapport->majTable($table, [
            'lues' => $lues,
            'ecrites' => $ecrites,
            'empreinte_source' => $this->empreintesSource[$table],
            'duree_s' => round(microtime(true) - $depart, 3),
        ]);
    }

    /**
     * Recalcule l'empreinte côté cible et la compare à celle de la source.
     *
     * @param array<string,mixed> $descripteur
     */
    private function controlerEmpreinte(string $table, array $descripteur): void
    {
        $colonnes = $descripteur['colonnes'];
        $noms = array_keys($colonnes);

        $agregat = $this->nouvelAgregat();
        $nb = 0;
        $parcours = $this->parcourir(
            $this->cible,
            $this->piloteCible,
            $table,
            $noms,
            $descripteur['cle_cible'],
            $this->textuelles($colonnes, 'cible'),
        );

        foreach ($parcours as $ligne) {
            $nb++;
            $this->cumuler($agregat, $this->empreinteLigne($ligne, $colonnes, $table));
        }

        $empreinteCible = $this->condenser($agregat);
        $empreinteSource = $this->empreintesSource[$table] ?? null;
        $identique = $empreinteSource !== null && $empreinteSource === $empreinteCible;
        $this->rapport->majTable($table, [
            'empreinte_cible' => $empreinteCible,
            'identique' => $identique,
        ]);

        if ($identique) {
            return;
        }

        // En simulation, une cible différente est un CONSTAT, pas une faute :
        // c'est même le résultat attendu d'une simulation avant migration.
        $gravite = $this->options['mode'] === Rapport::MODE_REELLE
            ? Rapport::ERREUR
            : Rapport::AVERTISSEMENT;

        $this->rapport->anomalie(
            $gravite,
            "Table « {$table} » : le contenu de la cible ne correspond pas à celui de la source "
            . "(source {$empreinteSource}, cible {$empreinteCible}, {$nb} ligne(s) relues).",
            ['table' => $table],
        );
    }

    // =================================================================
    // Lecture par lots — jamais de table entière en mémoire
    // =================================================================

    /**
     * Parcourt une table par lots, avec pagination PAR CLÉ (« keyset »).
     *
     * Pourquoi pas un simple curseur : le pilote PostgreSQL de PDO rapatrie la
     * TOTALITÉ du résultat côté client avant la première ligne. Un
     * `SELECT * FROM orders` y coûte donc autant de mémoire que la table. La
     * pagination par clé borne la mémoire au lot, quel que soit le pilote.
     *
     * Pourquoi pas LIMIT/OFFSET : au-delà de quelques milliers de lignes,
     * l'OFFSET relit tout depuis le début à chaque lot (coût quadratique), et
     * il n'est correct que si l'ordre est stable.
     *
     * Le tri est forcé en collation BINAIRE. Sans cela, MySQL trie en
     * `utf8mb4_unicode_ci`, où « a » et « A » sont ÉGAUX : deux lignes de clés
     * différentes mais équivalentes peuvent alors être sautées ou relues à la
     * frontière d'un lot.
     *
     * @param list<string> $noms
     * @param list<string> $cle
     * @param array<string,bool> $textuelles colonne → est-elle textuelle de ce côté
     * @return \Generator<int,array<string,mixed>>
     */
    private function parcourir(
        PDO $pdo,
        string $pilote,
        string $table,
        array $noms,
        array $cle,
        array $textuelles,
    ): \Generator {
        $projection = implode(', ', array_map(fn (string $c): string => $this->q($pilote, $c), $noms));
        $qTable = $this->q($pilote, $table);
        $taille = (int) $this->options['lignes_par_lot'];

        // Clé simple : pagination par clé. Sinon (clé composite ou absente) :
        // repli LIMIT/OFFSET, correct mais plus coûteux — et signalé.
        $keyset = count($cle) === 1 && in_array($cle[0], $noms, true);
        if (!$keyset) {
            $this->rapport->anomalie(
                Rapport::AVERTISSEMENT,
                "Table « {$table} » : pas de clé primaire simple exploitable, lecture par LIMIT/OFFSET "
                . '(plus lente, et sensible à une écriture concurrente).',
                ['table' => $table],
            );

            yield from $this->parcourirParOffset(
                $pdo,
                $pilote,
                $qTable,
                $projection,
                $noms,
                $textuelles,
                $taille
            );

            return;
        }

        $colonneCle = $cle[0];
        $texteCle = $textuelles[$colonneCle] ?? true;
        $ordre = $this->exprOrdre($pilote, $colonneCle, $texteCle);
        $borne = null;

        while (true) {
            if ($borne === null) {
                $sql = "SELECT {$projection} FROM {$qTable} ORDER BY {$ordre} LIMIT {$taille}";
                $st = $pdo->prepare($sql);
                $st->execute();
            } else {
                $sql = "SELECT {$projection} FROM {$qTable} WHERE {$ordre} > "
                    . $this->exprBorne($pilote, $texteCle) . " ORDER BY {$ordre} LIMIT {$taille}";
                $st = $pdo->prepare($sql);
                $st->execute([$borne]);
            }

            $nb = 0;
            $dernier = null;
            while (($ligne = $st->fetch(PDO::FETCH_ASSOC)) !== false) {
                $nb++;
                $dernier = $ligne[$colonneCle] ?? null;
                yield $this->deverserFlux($ligne);
            }
            $st->closeCursor();

            if ($nb < $taille) {
                return;
            }
            if ($dernier === null) {
                throw new RuntimeException(
                    "Table « {$table} » : la clé « {$colonneCle} » vaut NULL, la pagination ne peut pas "
                    . 'progresser. Corrigez la donnée avant de migrer.'
                );
            }
            $borne = is_bool($dernier) ? (int) $dernier : $dernier;
        }
    }

    /**
     * @param list<string> $noms
     * @param array<string,bool> $textuelles
     * @return \Generator<int,array<string,mixed>>
     */
    private function parcourirParOffset(
        PDO $pdo,
        string $pilote,
        string $qTable,
        string $projection,
        array $noms,
        array $textuelles,
        int $taille,
    ): \Generator {
        $ordre = implode(', ', array_map(
            fn (string $c): string => $this->exprOrdre($pilote, $c, $textuelles[$c] ?? true),
            $noms
        ));
        $decalage = 0;
        while (true) {
            $st = $pdo->prepare(
                "SELECT {$projection} FROM {$qTable} ORDER BY {$ordre} LIMIT {$taille} OFFSET {$decalage}"
            );
            $st->execute();
            $nb = 0;
            while (($ligne = $st->fetch(PDO::FETCH_ASSOC)) !== false) {
                $nb++;
                yield $this->deverserFlux($ligne);
            }
            $st->closeCursor();
            if ($nb < $taille) {
                return;
            }
            $decalage += $taille;
        }
    }

    /**
     * PostgreSQL rend les colonnes `bytea` sous forme de ressource de flux.
     * Non déversée ici, elle serait consommée par le calcul d'empreinte puis
     * vide au moment de l'écriture — une perte de données silencieuse.
     *
     * @param array<string,mixed> $ligne
     * @return array<string,mixed>
     */
    private function deverserFlux(array $ligne): array
    {
        foreach ($ligne as $cle => $valeur) {
            if (is_resource($valeur)) {
                $ligne[$cle] = stream_get_contents($valeur);
            }
        }

        return $ligne;
    }

    // =================================================================
    // Écriture par lots
    // =================================================================

    /**
     * @param list<string> $noms
     * @param array<string,array<string,mixed>> $colonnes
     * @param list<array<string,mixed>> $lignes
     */
    private function insererLot(string $table, array $noms, array $colonnes, array $lignes): int
    {
        $qTable = $this->q($this->piloteCible, $table);
        $liste = implode(', ', array_map(fn (string $c): string => $this->q($this->piloteCible, $c), $noms));
        $motif = '(' . implode(', ', array_fill(0, count($noms), '?')) . ')';
        $sql = "INSERT INTO {$qTable} ({$liste}) VALUES " . implode(', ', array_fill(0, count($lignes), $motif));

        $st = $this->cible->prepare($sql);
        $position = 1;
        foreach ($lignes as $ligne) {
            foreach ($noms as $nom) {
                [$valeur, $typePdo] = $this->convertirPourEcriture(
                    $ligne[$nom] ?? null,
                    $colonnes[$nom],
                    $table,
                    $nom,
                    $ligne,
                );
                $st->bindValue($position++, $valeur, $typePdo);
            }
        }

        try {
            $st->execute();
        } catch (PDOException $e) {
            throw new RuntimeException(
                "Échec de l'insertion dans « {$table} » (lot de " . count($lignes) . ' ligne(s)) : '
                . $e->getMessage() . ' — la transaction est annulée, rien n\'est écrit.',
                0,
                $e
            );
        }

        return count($lignes);
    }

    /**
     * Convertit une valeur lue à la forme attendue par la colonne cible.
     *
     * @param array<string,mixed> $colonne
     * @param array<string,mixed> $ligne
     * @return array{0:mixed,1:int}
     */
    private function convertirPourEcriture(
        mixed $valeur,
        array $colonne,
        string $table,
        string $nom,
        array $ligne,
    ): array {
        if ($valeur === null) {
            return [null, PDO::PARAM_NULL];
        }

        switch ($colonne['type']) {
            case 'json':
                $canonique = $this->canoniserJson($valeur);
                if ($canonique === null) {
                    throw new RuntimeException(sprintf(
                        'Valeur non-JSON dans une colonne JSON : %s.%s (ligne %s) contient « %s ». '
                        . 'Le migrateur refuse de la réécrire à votre place : corrigez la source '
                        . '(api/tools/importer-donnees-front.php sait rattraper ce cas).',
                        $table,
                        $nom,
                        $this->etiquetteLigne($ligne),
                        mb_substr((string) $valeur, 0, 60),
                    ));
                }

                // Une colonne TEXTE côté cible (SQLite) reçoit le JSON canonique
                // en texte ; une colonne JSON/jsonb le reçoit aussi en texte,
                // le serveur le range dans sa représentation interne.
                return [$canonique, PDO::PARAM_STR];

            case 'booleen':
                $vrai = $this->versBooleen($valeur);
                if ($this->estTypeBooleenNatif($colonne['cible']['type'])) {
                    return [$vrai, PDO::PARAM_BOOL];
                }

                return [$vrai ? 1 : 0, PDO::PARAM_INT];

            case 'entier':
                return [(int) $valeur, PDO::PARAM_INT];

            case 'reel':
                // Lié en chaîne : un float PHP passé en paramètre perdrait des
                // décimales sur une colonne DECIMAL (montants).
                return [$this->normaliserNombre($valeur), PDO::PARAM_STR];

            case 'binaire':
                return [(string) $valeur, PDO::PARAM_LOB];

            default:
                return [is_bool($valeur) ? ($valeur ? '1' : '0') : (string) $valeur, PDO::PARAM_STR];
        }
    }

    // =================================================================
    // Contrôles de valeur (actifs AUSSI en simulation)
    // =================================================================

    /**
     * @param array<string,mixed> $ligne
     * @param array<string,array<string,mixed>> $colonnes
     * @param list<string> $cle
     */
    private function controlerLigne(string $table, array $ligne, array $colonnes, array $cle): void
    {
        foreach ($colonnes as $nom => $colonne) {
            $valeur = $ligne[$nom] ?? null;
            $cibleDesc = $colonne['cible'];

            if ($valeur === null) {
                if (!$cibleDesc['nullable'] && $cibleDesc['defaut'] === null) {
                    $this->rapport->anomalie(
                        Rapport::ERREUR,
                        "{$table}.{$nom} vaut NULL dans la source alors que la colonne cible est NOT NULL "
                        . 'sans valeur par défaut.',
                        ['table' => $table, 'colonne' => $nom, 'ligne' => $this->etiquetteLigne($ligne, $cle)],
                    );
                }

                continue;
            }

            if ($colonne['type'] === 'json' && $this->canoniserJson($valeur) === null) {
                $this->rapport->anomalie(
                    Rapport::ERREUR,
                    "{$table}.{$nom} n'est pas du JSON valide alors que la colonne cible l'exige : «  "
                    . mb_substr((string) $valeur, 0, 60) . ' ».',
                    ['table' => $table, 'colonne' => $nom, 'ligne' => $this->etiquetteLigne($ligne, $cle)],
                );

                continue;
            }

            // Débordement d'entier. SQLite stocke un INTEGER sur 64 bits sans
            // le déclarer ; MySQL et PostgreSQL bornent INT à 2 147 483 647.
            // Une valeur qui tient en SQLite peut donc être refusée ailleurs —
            // ou pire, écrêtée en silence par un MySQL non strict.
            if ($colonne['type'] === 'entier' && is_numeric($valeur) && $this->piloteCible !== 'sqlite') {
                // SQLite exclu : son INTEGER est un entier signé 64 bits, quel
                // que soit le mot écrit dans le CREATE TABLE.
                $bornes = $this->bornesEntier((string) $cibleDesc['type_complet']);
                $entier = (int) $valeur;
                if ($bornes !== null && ($entier < $bornes[0] || $entier > $bornes[1])) {
                    $this->rapport->anomalie(
                        Rapport::ERREUR,
                        "{$table}.{$nom} vaut {$entier}, hors des bornes de la colonne cible "
                        . "« {$cibleDesc['type_complet']} » ({$bornes[0]} … {$bornes[1]}). "
                        . 'La valeur serait refusée ou écrêtée.',
                        ['table' => $table, 'colonne' => $nom, 'ligne' => $this->etiquetteLigne($ligne, $cle)],
                    );
                }
            }

            // Longueur : MySQL en mode non strict TRONQUE, PostgreSQL refuse,
            // SQLite ignore la limite. Trois comportements, une seule règle :
            // on le signale AVANT d'écrire.
            $max = $cibleDesc['longueur'];
            if (is_int($max) && $max > 0 && is_string($valeur) && mb_strlen($valeur) > $max) {
                $this->rapport->anomalie(
                    Rapport::ERREUR,
                    "{$table}.{$nom} : la valeur fait " . mb_strlen($valeur) . " caractères pour une colonne "
                    . "cible limitée à {$max}. Elle serait tronquée ou refusée.",
                    ['table' => $table, 'colonne' => $nom, 'ligne' => $this->etiquetteLigne($ligne, $cle)],
                );
            }
        }
    }

    /**
     * @param array<string,mixed> $ligne
     * @param list<string> $cle
     */
    private function etiquetteLigne(array $ligne, array $cle = []): string
    {
        foreach ($cle as $c) {
            if (isset($ligne[$c])) {
                return $c . '=' . (string) $ligne[$c];
            }
        }
        foreach (['id', 'slug', 'code', 'section', 'scope'] as $candidat) {
            if (isset($ligne[$candidat])) {
                return $candidat . '=' . (string) $ligne[$candidat];
            }
        }

        return '(ligne sans clé identifiable)';
    }

    private function verifierBudget(string $table, int $lues): void
    {
        if ($lues % 200 !== 0 || microtime(true) <= $this->echeance) {
            return;
        }

        throw new RuntimeException(sprintf(
            'Budget de temps de %.0f s épuisé pendant « %s » (%d ligne(s) traitées). Tout est annulé : '
            . "la base cible n'a pas été modifiée. Relancez en ligne de commande, ou augmentez le budget "
            . 'si votre hébergeur le permet.',
            (float) $this->options['budget_s'],
            $table,
            $lues,
        ));
    }

    // =================================================================
    // Empreintes de contenu
    // =================================================================

    /**
     * Accumulateur d'empreinte COMMUTATIF.
     *
     * Pourquoi commutatif : rien ne garantit que deux moteurs rendent les
     * lignes dans le même ordre (les collations diffèrent, et « ORDER BY id »
     * ne classe pas « Éclair » au même endroit en `utf8mb4_unicode_ci` et en
     * `C`). Une empreinte dépendant de l'ordre déclarerait des faux écarts.
     *
     * Le simple OU-exclusif ne suffit pas : deux lignes identiques
     * s'annuleraient. On lui adjoint donc une somme (modulo 2^32 par mot) et
     * le nombre de lignes, tous deux sensibles à la duplication.
     *
     * @return array{xor:string,somme:array<int,int>,nb:int}
     */
    private function nouvelAgregat(): array
    {
        return ['xor' => str_repeat("\0", 16), 'somme' => [0, 0, 0, 0], 'nb' => 0];
    }

    /** @param array{xor:string,somme:array<int,int>,nb:int} $agregat */
    private function cumuler(array &$agregat, string $digest): void
    {
        $agregat['xor'] ^= $digest;
        $mots = array_values((array) unpack('N4', $digest));
        foreach ($mots as $i => $mot) {
            $agregat['somme'][$i] = ($agregat['somme'][$i] + $mot) % 4294967296;
        }
        $agregat['nb']++;
    }

    /** @param array{xor:string,somme:array<int,int>,nb:int} $agregat */
    private function condenser(array $agregat): string
    {
        return substr(md5(sprintf(
            '%s|%08x%08x%08x%08x|%d',
            bin2hex($agregat['xor']),
            $agregat['somme'][0],
            $agregat['somme'][1],
            $agregat['somme'][2],
            $agregat['somme'][3],
            $agregat['nb'],
        )), 0, 24) . '.' . $agregat['nb'];
    }

    /**
     * Empreinte d'une ligne, calculée sur des valeurs NORMALISÉES.
     *
     * C'est ici que se joue toute la fidélité de la migration : deux moteurs
     * ne rendent pas la même valeur pour la même donnée.
     *
     * @param array<string,mixed> $ligne
     * @param array<string,array<string,mixed>> $colonnes
     */
    private function empreinteLigne(array $ligne, array $colonnes, string $table): string
    {
        $morceaux = [];
        foreach ($colonnes as $nom => $colonne) {
            $morceaux[] = $nom . '=' . $this->normaliser($ligne[$nom] ?? null, $colonne['type']);
        }

        return md5($table . "\x1e" . implode("\x1f", $morceaux), true);
    }

    /**
     * Forme canonique d'une valeur, indépendante du moteur qui l'a rendue.
     *
     * Divergences absorbées :
     *   - NULL       : marqueur dédié, JAMAIS confondu avec la chaîne vide ;
     *   - booléens   : 0/1 (SQLite, MySQL) et t/f, true/false (PostgreSQL) ;
     *   - JSON       : `jsonb` réordonne les clés et supprime les espaces —
     *                  on compare donc une forme canonique (clés triées), pas
     *                  le texte ;
     *   - nombres    : « 10 », « 10.00 » et « 1.0E+1 » sont la même valeur ;
     *   - dates      : normalisées en ISO-8601 UTC quand le type est temporel.
     */
    private function normaliser(mixed $valeur, string $type): string
    {
        if ($valeur === null) {
            return "\x00NUL";
        }
        if (is_resource($valeur)) {
            $valeur = stream_get_contents($valeur);
        }

        switch ($type) {
            case 'json':
                $canonique = $this->canoniserJson($valeur);

                // Une valeur illisible n'est pas normalisée « au mieux » : elle
                // est marquée. Deux JSON invalides différents ne doivent pas
                // produire la même empreinte.
                return $canonique ?? "\x00JSON-INVALIDE:" . (string) $valeur;

            case 'booleen':
                return $this->versBooleen($valeur) ? '1' : '0';

            case 'entier':
            case 'reel':
                return $this->normaliserNombre($valeur);

            case 'horodatage':
                return $this->normaliserHorodatage($valeur);

            default:
                if (is_bool($valeur)) {
                    return $valeur ? '1' : '0';
                }

                return (string) $valeur;
        }
    }

    /**
     * Rend le JSON sous forme canonique, ou null s'il est invalide.
     *
     * Les clés d'objet sont triées : `jsonb` (PostgreSQL) les réordonne à
     * l'insertion, MySQL aussi. Sans tri, un aller-retour ferait diverger
     * l'empreinte alors que la donnée est intacte.
     *
     * Le décodage est fait en OBJETS et non en tableaux associatifs :
     * `json_decode('{}', true)` et `json_decode('[]', true)` rendent tous deux
     * `[]`, ce qui confondrait un objet vide et une liste vide.
     */
    private function canoniserJson(mixed $valeur): ?string
    {
        if (is_bool($valeur)) {
            return $valeur ? 'true' : 'false';
        }
        if (is_int($valeur) || is_float($valeur)) {
            return (string) json_encode($valeur);
        }

        $texte = (string) $valeur;
        $decode = json_decode($texte, false);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        $encode = json_encode(
            $this->trierRecursivement($decode),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION,
        );

        return $encode === false ? null : $encode;
    }

    private function trierRecursivement(mixed $noeud): mixed
    {
        if (is_array($noeud)) {
            return array_map(fn (mixed $v): mixed => $this->trierRecursivement($v), $noeud);
        }
        if ($noeud instanceof \stdClass) {
            $champs = get_object_vars($noeud);
            ksort($champs, SORT_STRING);
            $trie = new \stdClass();
            foreach ($champs as $cle => $valeur) {
                $trie->{$cle} = $this->trierRecursivement($valeur);
            }

            return $trie;
        }

        return $noeud;
    }

    /** Écriture décimale canonique : « 10 », « 10.00 » et « 1.0E1 » convergent. */
    private function normaliserNombre(mixed $valeur): string
    {
        if (is_bool($valeur)) {
            return $valeur ? '1' : '0';
        }
        $texte = trim((string) $valeur);
        if ($texte === '') {
            return '';
        }
        if (!is_numeric($texte)) {
            return $texte; // Ni un nombre ni normalisable : on ne devine pas.
        }
        if (stripos($texte, 'e') !== false) {
            $texte = rtrim(rtrim(sprintf('%.12F', (float) $texte), '0'), '.');
        }

        $negatif = str_starts_with($texte, '-');
        $texte = ltrim($texte, '+-');
        if (str_contains($texte, '.')) {
            $texte = rtrim(rtrim($texte, '0'), '.');
        }
        $texte = ltrim($texte, '0');
        if ($texte === '' || str_starts_with($texte, '.')) {
            $texte = '0' . $texte;
        }

        return ($negatif && $texte !== '0' ? '-' : '') . $texte;
    }

    /** ISO-8601 UTC, quel que soit le format rendu par le moteur. */
    private function normaliserHorodatage(mixed $valeur): string
    {
        $texte = trim((string) $valeur);
        if ($texte === '') {
            return '';
        }
        try {
            $date = new \DateTimeImmutable($texte, new \DateTimeZone('UTC'));
        } catch (Throwable) {
            return $texte;
        }
        $utc = $date->setTimezone(new \DateTimeZone('UTC'));
        $micro = $utc->format('u');

        return $utc->format('Y-m-d\TH:i:s')
            . ($micro === '000000' ? '' : '.' . rtrim($micro, '0'))
            . 'Z';
    }

    /**
     * Interprétation d'un booléen tel que chaque moteur le rend.
     * PostgreSQL rend « t »/« f » via PDO, SQLite et MySQL des entiers.
     */
    private function versBooleen(mixed $valeur): bool
    {
        if (is_bool($valeur)) {
            return $valeur;
        }
        if (is_int($valeur) || is_float($valeur)) {
            return (float) $valeur !== 0.0;
        }
        $texte = strtolower(trim((string) $valeur));

        return in_array($texte, ['1', 't', 'true', 'y', 'yes', 'on'], true);
    }

    // =================================================================
    // Séquences et auto-incréments
    // =================================================================

    /**
     * Repositionne les séquences après un chargement d'identifiants explicites.
     *
     * PIÈGE CLASSIQUE, et la raison d'être de cette méthode : en PostgreSQL,
     * insérer `id = 42` ne touche pas la séquence, qui reste à 1. La première
     * création faite par l'application échoue alors en doublon de clé — des
     * jours après la migration, quand plus personne ne fait le lien.
     *
     * @param array<string,array<string,mixed>> $plan
     */
    private function rejouerSequences(array $plan): void
    {
        foreach ($plan as $table => $descripteur) {
            $colonne = $descripteur['auto_cible'];
            if ($colonne === null) {
                continue;
            }

            $max = $this->cible->query(
                'SELECT MAX(' . $this->q($this->piloteCible, $colonne) . ') FROM '
                . $this->q($this->piloteCible, $table)
            )?->fetchColumn();
            $max = ($max === null || $max === false) ? 0 : (int) $max;

            try {
                $note = $this->repositionner($table, $colonne, $max);
                $this->rapport->sequence($table, $colonne, $max, $note);
            } catch (Throwable $e) {
                // Non fatal : les données sont écrites et validées. Mais tu, ce
                // serait une bombe à retardement — donc anomalie visible.
                $this->rapport->anomalie(
                    Rapport::AVERTISSEMENT,
                    "Séquence de {$table}.{$colonne} NON repositionnée ({$e->getMessage()}). "
                    . "La prochaine création risque d'échouer en doublon : corrigez-la à la main "
                    . '(voir docs/MIGRATION.md).',
                    ['table' => $table, 'colonne' => $colonne],
                );
            }
        }
    }

    private function repositionner(string $table, string $colonne, int $max): string
    {
        switch ($this->piloteCible) {
            case 'pgsql':
                $st = $this->cible->prepare(
                    'SELECT setval(pg_get_serial_sequence(?, ?), ?, false)'
                );
                $st->execute([$table, $colonne, max(1, $max + 1)]);

                return 'setval → prochaine valeur ' . max(1, $max + 1);

            case 'mysql':
                // DDL : validerait implicitement une transaction ouverte, d'où
                // l'appel après le commit uniquement.
                $this->cible->exec(
                    'ALTER TABLE ' . $this->q('mysql', $table) . ' AUTO_INCREMENT = ' . max(1, $max + 1)
                );

                return 'AUTO_INCREMENT → ' . max(1, $max + 1);

            case 'sqlite':
                // SQLite tient sa séquence dans `sqlite_sequence`, alimentée
                // automatiquement par les insertions d'id explicites. On le
                // vérifie tout de même : la table n'existe que si au moins une
                // table AUTOINCREMENT a déjà reçu une ligne.
                $existe = (int) $this->cible->query(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
                )?->fetchColumn();
                if ($existe === 0) {
                    return 'aucune séquence SQLite à repositionner';
                }
                $st = $this->cible->prepare('UPDATE sqlite_sequence SET seq = ? WHERE name = ?');
                $st->execute([$max, $table]);
                if ($st->rowCount() === 0 && $max > 0) {
                    $st = $this->cible->prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)');
                    $st->execute([$table, $max]);
                }

                return 'sqlite_sequence → ' . $max;
        }

        return 'pilote sans séquence connue';
    }

    // =================================================================
    // Témoin d'exécution
    // =================================================================

    private function temoinExiste(): bool
    {
        return in_array(
            self::TABLE_TEMOIN,
            $this->listerTables($this->cible, $this->piloteCible, true),
            true
        );
    }

    /**
     * Dépose le témoin AVANT la transaction, et le valide immédiatement.
     *
     * C'est volontaire : s'il faisait partie de la transaction, il
     * disparaîtrait avec elle et ne témoignerait de rien. Validé d'avance, il
     * survit à la mort du processus et signale à la migration suivante que la
     * précédente n'a jamais abouti.
     */
    private function ouvrirTemoin(): void
    {
        // MySQL refuse un TEXT en clé primaire sans longueur de préfixe : les
        // colonnes courtes sont donc déclarées VARCHAR partout sauf en SQLite.
        $court = $this->piloteCible === 'sqlite' ? 'TEXT' : 'VARCHAR(64)';

        $this->cible->exec(
            'CREATE TABLE IF NOT EXISTS ' . $this->q($this->piloteCible, self::TABLE_TEMOIN) . ' ('
            . "id {$court} NOT NULL PRIMARY KEY, "
            . "etat {$court} NOT NULL, "
            . 'source TEXT NOT NULL, '
            . "demarre_a {$court} NOT NULL, "
            . "termine_a {$court} NULL, "
            . 'detail TEXT NULL)'
        );

        $this->jetonTemoin = bin2hex(random_bytes(8));
        $st = $this->cible->prepare(
            'INSERT INTO ' . $this->q($this->piloteCible, self::TABLE_TEMOIN)
            . ' (id, etat, source, demarre_a) VALUES (?, ?, ?, ?)'
        );
        $st->execute([
            $this->jetonTemoin,
            'en_cours',
            (string) ($this->options['etiquette_source'] ?? $this->piloteSource),
            gmdate('c'),
        ]);

        $this->rapport->noter("Témoin « {$this->jetonTemoin} » déposé : la cible est marquée « en_cours ».");
    }

    private function cloreTemoin(): void
    {
        $resume = (string) json_encode(
            $this->rapport->versTableau()['totaux'],
            JSON_UNESCAPED_UNICODE
        );
        $this->marquerTemoin('terminee', $resume);
    }

    /**
     * Fait passer le témoin dans son état final. Best-effort : si la connexion
     * est morte, on ne masque pas l'erreur d'origine derrière celle-ci.
     */
    private function marquerTemoin(string $etat, string $detail): void
    {
        if ($this->jetonTemoin === null) {
            return;
        }

        try {
            $st = $this->cible->prepare(
                'UPDATE ' . $this->q($this->piloteCible, self::TABLE_TEMOIN)
                . ' SET etat = ?, termine_a = ?, detail = ? WHERE id = ?'
            );
            $st->execute([$etat, gmdate('c'), mb_substr($detail, 0, 2000), $this->jetonTemoin]);
            $this->rapport->noter("Témoin clos : la cible est marquée « {$etat} ».");
        } catch (Throwable $e) {
            $this->rapport->anomalie(
                Rapport::AVERTISSEMENT,
                "Témoin non mis à jour ({$e->getMessage()}) : la cible restera marquée « en_cours » "
                . 'et la prochaine migration demandera un arbitrage.',
            );
        }
    }

    // =================================================================
    // Transaction, contraintes, purge
    // =================================================================

    /**
     * Relâche les contraintes le temps du chargement.
     *
     * Le schéma du projet n'en déclare aucune aujourd'hui, mais une cible
     * installée à la main peut en porter, et l'ordre topologique ne suffit pas
     * en cas de cycle.
     */
    private function relacherContraintes(): void
    {
        try {
            if ($this->piloteCible === 'mysql') {
                $this->cible->exec('SET FOREIGN_KEY_CHECKS = 0');
            } elseif ($this->piloteCible === 'pgsql') {
                // N'agit que sur les contraintes DEFERRABLE — sans effet
                // sinon, et c'est très bien : on ne veut pas d'un privilège
                // superutilisateur pour migrer une boutique.
                $this->cible->exec('SET CONSTRAINTS ALL DEFERRED');
            }
            // SQLite : « PRAGMA foreign_keys » est ignoré dans une transaction.
            // L'ordre topologique reste donc la seule garantie de ce côté.
        } catch (Throwable $e) {
            $this->rapport->anomalie(
                Rapport::AVERTISSEMENT,
                'Contraintes non relâchées (' . $e->getMessage() . ') : le chargement compte sur '
                . "l'ordre d'insertion seul.",
            );
        }
    }

    /** @param list<string> $tables */
    private function viderCible(array $tables): void
    {
        // Ordre inverse de l'insertion : on supprime les enfants avant les
        // parents. DELETE et non TRUNCATE : en MySQL, TRUNCATE est du DDL et
        // validerait implicitement la transaction — la purge deviendrait
        // irréversible avant même la première insertion.
        foreach (array_reverse($tables) as $table) {
            $supprimees = $this->cible->exec('DELETE FROM ' . $this->q($this->piloteCible, $table));
            if ($supprimees) {
                $this->rapport->noter("Purge de « {$table} » : {$supprimees} ligne(s).");
            }
        }
    }

    private function annulerTransaction(): void
    {
        if (!$this->transactionOuverte) {
            return;
        }
        try {
            $this->cible->rollBack();
            $this->rapport->noter('Transaction ANNULÉE : la base cible est revenue à son état initial.');
        } catch (Throwable $e) {
            $this->rapport->anomalie(
                Rapport::ERREUR,
                "L'annulation de la transaction a elle-même échoué (" . $e->getMessage()
                . ') : VÉRIFIEZ LA BASE CIBLE À LA MAIN avant de vous en servir.',
            );
        }
        $this->transactionOuverte = false;
    }

    // =================================================================
    // Schéma de la cible
    // =================================================================

    /** Applique api/schema/schema.<pilote>.sql à la cible. */
    private function appliquerSchema(): void
    {
        $fichier = (string) $this->options['dossier_schema'] . '/schema.' . $this->piloteCible . '.sql';
        if (!is_file($fichier)) {
            throw new RuntimeException(
                "Schéma « {$fichier} » introuvable : impossible de créer les tables de la cible. "
                . 'Installez-les manuellement, puis relancez sans l\'option « creer_schema ».'
            );
        }

        $sql = (string) file_get_contents($fichier);
        $nb = 0;
        foreach ($this->decouperInstructions($sql) as $instruction) {
            $this->cible->exec($instruction);
            $nb++;
        }

        $this->rapport->noter("Schéma appliqué à la cible depuis « " . basename($fichier) . " » ({$nb} instructions).");
    }

    /**
     * Découpe un fichier SQL sur les « ; » de niveau supérieur, en ignorant
     * ceux qui se trouvent dans une chaîne ou un commentaire.
     *
     * @return list<string>
     */
    private function decouperInstructions(string $sql): array
    {
        $instructions = [];
        $courante = '';
        $longueur = strlen($sql);

        for ($i = 0; $i < $longueur; $i++) {
            $c = $sql[$i];

            if ($c === '-' && ($sql[$i + 1] ?? '') === '-') {
                while ($i < $longueur && $sql[$i] !== "\n") {
                    $i++;
                }
                $courante .= "\n";
                continue;
            }
            if ($c === '/' && ($sql[$i + 1] ?? '') === '*') {
                $fin = strpos($sql, '*/', $i);
                $i = $fin === false ? $longueur : $fin + 1;
                $courante .= ' ';
                continue;
            }
            if ($c === "'" || $c === '"' || $c === '`') {
                $delimiteur = $c;
                $courante .= $c;
                $i++;
                while ($i < $longueur) {
                    $courante .= $sql[$i];
                    if ($sql[$i] === $delimiteur) {
                        break;
                    }
                    $i++;
                }
                continue;
            }
            if ($c === ';') {
                if (trim($courante) !== '') {
                    $instructions[] = trim($courante);
                }
                $courante = '';
                continue;
            }
            $courante .= $c;
        }

        if (trim($courante) !== '') {
            $instructions[] = trim($courante);
        }

        return $instructions;
    }

    // =================================================================
    // Introspection
    // =================================================================

    /** @return list<string> */
    private function listerTables(PDO $pdo, string $pilote, bool $inclureTechniques = false): array
    {
        switch ($pilote) {
            case 'sqlite':
                $sql = "SELECT name FROM sqlite_master WHERE type = 'table' "
                    . "AND name NOT LIKE 'sqlite_%' ORDER BY name";
                break;
            case 'mysql':
                $sql = 'SELECT table_name FROM information_schema.tables '
                    . "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' ORDER BY table_name";
                break;
            case 'pgsql':
                $sql = 'SELECT tablename FROM pg_catalog.pg_tables '
                    . "WHERE schemaname = ANY (current_schemas(false)) ORDER BY tablename";
                break;
            default:
                throw new RuntimeException("Pilote « {$pilote} » non supporté.");
        }

        $tables = array_map(
            'strtolower',
            (array) $pdo->query($sql)?->fetchAll(PDO::FETCH_COLUMN)
        );

        if ($inclureTechniques) {
            return array_values($tables);
        }

        // La table témoin appartient au migrateur : la migrer produirait une
        // cible qui prétend avoir été migrée par quelqu'un d'autre.
        return array_values(array_filter(
            $tables,
            static fn (string $t): bool => $t !== self::TABLE_TEMOIN && !str_starts_with($t, '_katech_'),
        ));
    }

    /**
     * @return array<string,array<string,mixed>> colonne → descripteur
     */
    private function colonnes(PDO $pdo, string $pilote, string $table): array
    {
        $colonnes = [];

        if ($pilote === 'sqlite') {
            $st = $pdo->prepare('SELECT * FROM pragma_table_info(?)');
            $st->execute([$table]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $c) {
                $type = strtolower((string) $c['type']);
                $colonnes[(string) $c['name']] = [
                    'type' => $type,
                    'type_complet' => $type,
                    'nullable' => ((int) $c['notnull']) === 0,
                    'defaut' => $c['dflt_value'],
                    'longueur' => $this->longueurDeclaree($type),
                    'auto' => false,
                    'pk' => ((int) $c['pk']) > 0,
                ];
            }

            // AUTOINCREMENT n'apparaît pas dans pragma_table_info : il faut
            // relire le CREATE TABLE d'origine.
            $st = $pdo->prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?");
            $st->execute([$table]);
            $ddl = (string) $st->fetchColumn();
            if (stripos($ddl, 'AUTOINCREMENT') !== false) {
                foreach ($colonnes as $nom => $desc) {
                    if ($desc['pk'] && str_contains(strtolower($desc['type']), 'int')) {
                        $colonnes[$nom]['auto'] = true;
                        break;
                    }
                }
            }

            return $colonnes;
        }

        if ($pilote === 'mysql') {
            // `column_type` en plus de `data_type` : lui seul porte le
            // « unsigned », qui double la borne haute d'un entier.
            $st = $pdo->prepare(
                'SELECT column_name, data_type, column_type AS type_complet, is_nullable, column_default, '
                . 'character_maximum_length, extra '
                . 'FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? '
                . 'ORDER BY ordinal_position'
            );
        } else {
            $st = $pdo->prepare(
                'SELECT column_name, data_type, data_type AS type_complet, is_nullable, column_default, '
                . 'character_maximum_length, '
                . "COALESCE(is_identity, 'NO') AS extra "
                . 'FROM information_schema.columns '
                . 'WHERE table_schema = ANY (current_schemas(false)) AND table_name = ? '
                . 'ORDER BY ordinal_position'
            );
        }
        $st->execute([$table]);

        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $c) {
            $c = array_change_key_case($c, CASE_LOWER);
            $defaut = $c['column_default'];
            $extra = strtolower((string) $c['extra']);
            $auto = str_contains($extra, 'auto_increment')
                || $extra === 'yes'
                || (is_string($defaut) && stripos($defaut, 'nextval(') !== false);

            $colonnes[(string) $c['column_name']] = [
                'type' => strtolower((string) $c['data_type']),
                'type_complet' => strtolower((string) $c['type_complet']),
                'nullable' => strtoupper((string) $c['is_nullable']) === 'YES',
                'defaut' => $defaut,
                'longueur' => $c['character_maximum_length'] === null
                    ? null
                    : (int) $c['character_maximum_length'],
                'auto' => $auto,
                'pk' => false,
            ];
        }

        return $colonnes;
    }

    private function longueurDeclaree(string $type): ?int
    {
        return preg_match('/\((\d+)\)/', $type, $m) === 1 ? (int) $m[1] : null;
    }

    /**
     * @param array<string,array<string,mixed>> $colonnes
     */
    private function colonneAuto(array $colonnes): ?string
    {
        foreach ($colonnes as $nom => $desc) {
            if ($desc['auto'] === true) {
                return $nom;
            }
        }

        return null;
    }

    /** @return list<string> */
    private function clePrimaire(PDO $pdo, string $pilote, string $table): array
    {
        if ($pilote === 'sqlite') {
            $st = $pdo->prepare('SELECT name, pk FROM pragma_table_info(?) WHERE pk > 0 ORDER BY pk');
            $st->execute([$table]);

            return array_map('strval', (array) $st->fetchAll(PDO::FETCH_COLUMN));
        }

        if ($pilote === 'mysql') {
            $st = $pdo->prepare(
                'SELECT column_name FROM information_schema.key_column_usage '
                . "WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = 'PRIMARY' "
                . 'ORDER BY ordinal_position'
            );
            $st->execute([$table]);

            return array_map('strval', (array) $st->fetchAll(PDO::FETCH_COLUMN));
        }

        $st = $pdo->prepare(
            'SELECT a.attname FROM pg_index i '
            . 'JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey) '
            . 'WHERE i.indrelid = ?::regclass AND i.indisprimary'
        );
        $st->execute([$table]);

        return array_map('strval', (array) $st->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Tables référencées par les clés étrangères de `$table`.
     *
     * @return list<string>
     */
    private function clesEtrangeres(PDO $pdo, string $pilote, string $table): array
    {
        try {
            if ($pilote === 'sqlite') {
                $st = $pdo->prepare('SELECT "table" FROM pragma_foreign_key_list(?)');
                $st->execute([$table]);
            } elseif ($pilote === 'mysql') {
                $st = $pdo->prepare(
                    'SELECT DISTINCT referenced_table_name FROM information_schema.key_column_usage '
                    . 'WHERE table_schema = DATABASE() AND table_name = ? AND referenced_table_name IS NOT NULL'
                );
                $st->execute([$table]);
            } else {
                $st = $pdo->prepare(
                    'SELECT DISTINCT ccu.table_name FROM information_schema.table_constraints tc '
                    . 'JOIN information_schema.constraint_column_usage ccu '
                    . '  ON ccu.constraint_name = tc.constraint_name '
                    . "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ?"
                );
                $st->execute([$table]);
            }

            return array_map('strtolower', array_map('strval', (array) $st->fetchAll(PDO::FETCH_COLUMN)));
        } catch (Throwable) {
            // Pas de droit de lecture sur le catalogue : on n'en fait pas un
            // échec, l'ordre de déclaration du schéma reste applicable.
            return [];
        }
    }

    /**
     * Colonnes déclarées JSON dans le schéma de référence SQLite.
     *
     * Indispensable : côté SQLite, une colonne JSON est un simple TEXT.
     * L'introspection ne peut pas la distinguer, alors que MySQL et PostgreSQL
     * la normalisent (ordre des clés, espaces). Sans ce registre, un
     * aller-retour SQLite → MySQL → SQLite déclarerait un faux écart.
     *
     * @return array<string,true>
     */
    private function colonnesJsonDeclarees(string $table): array
    {
        static $registre = null;

        if ($registre === null) {
            $registre = [];
            $fichier = (string) $this->options['dossier_schema'] . '/schema.sqlite.sql';
            if (is_file($fichier)) {
                $sql = (string) file_get_contents($fichier);
                if (preg_match_all(
                    '/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z0-9_]+)[`"]?\s*\((.*?)\n\);/is',
                    $sql,
                    $tous,
                    PREG_SET_ORDER
                ) > 0) {
                    foreach ($tous as $m) {
                        $nomTable = strtolower($m[1]);
                        foreach (explode("\n", $m[2]) as $ligne) {
                            if (stripos($ligne, '/* JSON */') === false) {
                                continue;
                            }
                            if (preg_match('/^\s*[`"]?([A-Za-z0-9_]+)[`"]?\s/', $ligne, $c) === 1) {
                                $registre[$nomTable][strtolower($c[1])] = true;
                            }
                        }
                    }
                }
            }
        }

        return $registre[strtolower($table)] ?? [];
    }

    // =================================================================
    // Types
    // =================================================================

    /**
     * Type logique retenu pour une colonne, en combinant les deux moteurs.
     *
     * Le type le plus « exigeant » l'emporte : si la cible est `jsonb` et la
     * source un TEXT, la colonne est du JSON et doit être comparée comme tel.
     * Si l'un des deux côtés est un booléen natif, 0/1 et true/false désignent
     * la même valeur.
     */
    private function typeLogiqueCombine(string $natifSource, string $natifCible, bool $declareeJson): string
    {
        $a = $this->typeLogique($natifSource);
        $b = $this->typeLogique($natifCible);

        if ($declareeJson || $a === 'json' || $b === 'json') {
            return 'json';
        }
        foreach (['booleen', 'horodatage', 'reel', 'binaire'] as $prioritaire) {
            if ($a === $prioritaire || $b === $prioritaire) {
                return $prioritaire;
            }
        }
        if ($a === 'entier' && $b === 'entier') {
            return 'entier';
        }
        // Types mixtes (entier d'un côté, texte de l'autre) : comparaison
        // textuelle, la plus littérale — on ne convertit rien en douce.
        return $a === $b ? $a : 'texte';
    }

    private function typeLogique(string $natif): string
    {
        $natif = strtolower(trim($natif));
        $base = preg_replace('/\(.*$/', '', $natif) ?? $natif;
        $base = trim($base);

        if (in_array($base, ['json', 'jsonb'], true)) {
            return 'json';
        }
        if (in_array($base, ['bool', 'boolean'], true)) {
            return 'booleen';
        }
        if (str_starts_with($base, 'timestamp') || in_array($base, ['date', 'datetime', 'time', 'timetz'], true)) {
            return 'horodatage';
        }
        if (in_array($base, [
            'real', 'double', 'double precision', 'float', 'float4', 'float8',
            'decimal', 'numeric', 'money',
        ], true)) {
            return 'reel';
        }
        if (in_array($base, [
            'int', 'integer', 'bigint', 'smallint', 'tinyint', 'mediumint',
            'int2', 'int4', 'int8', 'serial', 'bigserial', 'smallserial',
        ], true)) {
            return 'entier';
        }
        if (in_array($base, ['blob', 'longblob', 'mediumblob', 'tinyblob', 'bytea', 'varbinary', 'binary'], true)) {
            return 'binaire';
        }

        return 'texte';
    }

    /**
     * Bornes d'un type entier, ou null si le type ne les impose pas (SQLite
     * range tout sur 64 bits).
     *
     * @return array{0:int,1:int}|null
     */
    private function bornesEntier(string $typeComplet): ?array
    {
        $typeComplet = strtolower($typeComplet);
        $nonSigne = str_contains($typeComplet, 'unsigned');
        $base = trim((string) preg_replace('/[\s(].*$/', '', $typeComplet));

        $bornes = match ($base) {
            'tinyint' => [-128, 127],
            'smallint', 'int2' => [-32768, 32767],
            'mediumint' => [-8388608, 8388607],
            'int', 'integer', 'int4' => [-2147483648, 2147483647],
            'bigint', 'int8' => [PHP_INT_MIN, PHP_INT_MAX],
            default => null,
        };

        if ($bornes === null) {
            return null;
        }
        if ($nonSigne) {
            return [0, $bornes[1] === PHP_INT_MAX ? PHP_INT_MAX : $bornes[1] * 2 + 1];
        }

        return $bornes;
    }

    private function estTypeBooleenNatif(string $natif): bool
    {
        return $this->typeLogique($natif) === 'booleen';
    }

    // =================================================================
    // SQL : identifiants et ordres
    // =================================================================

    private function q(string $pilote, string $identifiant): string
    {
        if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $identifiant) !== 1) {
            // Aucun identifiant du projet n'est exotique. Si l'un l'était, le
            // laisser passer ouvrirait une injection par nom de table.
            throw new RuntimeException("Identifiant SQL refusé : « {$identifiant} ».");
        }

        return $pilote === 'mysql' ? '`' . $identifiant . '`' : '"' . $identifiant . '"';
    }

    /**
     * Expression de tri en collation binaire — voir `parcourir()`.
     *
     * La collation ne s'applique QU'AUX colonnes textuelles : PostgreSQL
     * refuse net « ORDER BY id COLLATE "C" » sur un bigint (« collations are
     * not supported by type bigint »), et forcer un entier en binaire côté
     * MySQL trierait 50 avant 7.
     */
    private function exprOrdre(string $pilote, string $colonne, bool $texte): string
    {
        $q = $this->q($pilote, $colonne);
        if (!$texte) {
            return $q;
        }

        return match ($pilote) {
            'mysql' => "CAST({$q} AS BINARY)",
            'pgsql' => "{$q} COLLATE \"C\"",
            default => "{$q} COLLATE BINARY",
        };
    }

    /** Côté droit de la comparaison de pagination, cohérent avec `exprOrdre()`. */
    private function exprBorne(string $pilote, bool $texte): string
    {
        return ($pilote === 'mysql' && $texte) ? 'CAST(? AS BINARY)' : '?';
    }

    /**
     * Nature textuelle de chaque colonne, du côté demandé (« source » ou
     * « cible ») : la même colonne peut être JSON ici et TEXT là.
     *
     * @param array<string,array<string,mixed>> $colonnes
     * @return array<string,bool>
     */
    private function textuelles(array $colonnes, string $cote): array
    {
        $carte = [];
        foreach ($colonnes as $nom => $colonne) {
            $carte[$nom] = $this->estColonneTexte($colonne[$cote] ?? null);
        }

        return $carte;
    }

    /**
     * @param array<string,mixed>|null $descripteur
     */
    private function estColonneTexte(?array $descripteur): bool
    {
        if ($descripteur === null) {
            return true; // Prudence : la collation binaire est sans risque sur du texte.
        }

        return in_array($this->typeLogique((string) $descripteur['type']), ['texte', 'json'], true);
    }

    /**
     * @return array<string,mixed>
     */
    private function descripteur(PDO $pdo, string $pilote, ?string $etiquette): array
    {
        $version = null;
        try {
            $version = (string) $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
        } catch (Throwable) {
            // Certains pilotes ne l'exposent pas : information manquante, pas
            // une erreur.
        }

        return [
            'pilote' => $pilote,
            'version' => $version,
            'etiquette' => $etiquette,
        ];
    }
}
