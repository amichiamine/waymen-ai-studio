<?php

/**
 * Socle de persistance — double pilote SQLite / MySQL derrière PDO.
 *
 * Toute la divergence de dialecte du projet est concentrée ICI (cf. PLAN.md,
 * section « Double pilote SQLite / MySQL »). Un contrôleur ne doit jamais
 * tester `DB_DRIVER` : il appelle `beginWrite()` et `upsert()`.
 *
 * Règles non négociables :
 *  - requêtes préparées exclusivement, jamais de concaténation de valeurs ;
 *  - les seuls fragments interpolés sont des identifiants (table, colonnes),
 *    et ils sont validés puis échappés par `identifiant()` ;
 *  - une base injoignable produit un message qui dit quoi vérifier.
 */

declare(strict_types=1);

namespace KaTech;

use PDO;
use PDOException;
use PDOStatement;

final class Db
{
    public const PILOTE_SQLITE = 'sqlite';
    public const PILOTE_MYSQL = 'mysql';

    private static ?self $instance = null;

    private ?PDO $pdo = null;

    private bool $transactionOuverte = false;

    private function __construct(
        private readonly string $pilote,
        private readonly array $config,
    ) {
    }

    /** Instance partagée pour la durée de la requête HTTP. */
    public static function instance(): self
    {
        return self::$instance ??= self::depuisEnv();
    }

    /** Réinitialise l'instance — réservé aux scripts d'installation et aux tests. */
    public static function reinitialiser(): void
    {
        self::$instance = null;
    }

    /** Construit la configuration à partir des variables d'environnement. */
    public static function depuisEnv(): self
    {
        Env::charger();
        $pilote = strtolower((string) Env::get('DB_DRIVER', self::PILOTE_SQLITE));

        if (!in_array($pilote, [self::PILOTE_SQLITE, self::PILOTE_MYSQL], true)) {
            throw ApiException::baseIndisponible(
                "Pilote de base inconnu : « {$pilote} ». Vérifiez DB_DRIVER dans api/.env : "
                . 'les seules valeurs acceptées sont « sqlite » et « mysql ».'
            );
        }

        if ($pilote === self::PILOTE_SQLITE) {
            $chemin = (string) Env::get('DB_SQLITE_PATH', dirname(__DIR__) . '/var/katech.sqlite');

            return new self(self::PILOTE_SQLITE, ['path' => $chemin]);
        }

        return new self(self::PILOTE_MYSQL, [
            'host' => (string) Env::get('DB_HOST', '127.0.0.1'),
            'port' => Env::int('DB_PORT', 3306),
            'name' => (string) Env::get('DB_NAME', 'katech'),
            'user' => (string) Env::get('DB_USER', ''),
            'pass' => (string) Env::get('DB_PASSWORD', ''),
        ]);
    }

    public function pilote(): string
    {
        return $this->pilote;
    }

    public function estSqlite(): bool
    {
        return $this->pilote === self::PILOTE_SQLITE;
    }

    /** Chemin du fichier SQLite, ou null en MySQL. */
    public function cheminSqlite(): ?string
    {
        return $this->estSqlite() ? (string) $this->config['path'] : null;
    }

    // ---- Connexion -------------------------------------------------------

    /**
     * Connexion paresseuse. Chaque mode d'échec produit un message qui nomme
     * la cause probable ET le geste correctif (AGENTS.md §7).
     */
    public function pdo(): PDO
    {
        if ($this->pdo !== null) {
            return $this->pdo;
        }

        $this->pdo = $this->estSqlite() ? $this->connecterSqlite() : $this->connecterMysql();

        return $this->pdo;
    }

    private function connecterSqlite(): PDO
    {
        if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
            throw ApiException::baseIndisponible(
                "L'extension PHP « pdo_sqlite » n'est pas activée sur ce serveur. "
                . 'Activez-la dans le panneau de l\'hébergeur, ou basculez DB_DRIVER=mysql dans api/.env.'
            );
        }

        $chemin = (string) $this->config['path'];
        $dossier = dirname($chemin);

        if (!is_dir($dossier) && !@mkdir($dossier, 0775, true) && !is_dir($dossier)) {
            throw ApiException::baseIndisponible(
                "Le dossier de données « {$dossier} » n'existe pas et n'a pas pu être créé. "
                . 'Créez-le manuellement et rendez-le inscriptible par PHP, ou corrigez DB_SQLITE_PATH dans api/.env.'
            );
        }
        if (!is_writable($dossier)) {
            throw ApiException::baseIndisponible(
                "Le dossier de données « {$dossier} » n'est pas inscriptible par PHP. "
                . 'Passez-le en droits 0775 (ou 0755 s\'il appartient à l\'utilisateur PHP). '
                . 'SQLite a besoin d\'écrire dans le DOSSIER, pas seulement dans le fichier (journaux -wal et -shm).'
            );
        }
        if (is_file($chemin) && !is_writable($chemin)) {
            throw ApiException::baseIndisponible(
                "Le fichier de base « {$chemin} » existe mais n'est pas inscriptible par PHP. "
                . 'Corrigez ses droits (0664) et son propriétaire.'
            );
        }

        try {
            $pdo = new PDO('sqlite:' . $chemin, null, null, $this->optionsPdo());
        } catch (PDOException $e) {
            $this->journaliser('Connexion SQLite impossible', $e);

            throw ApiException::baseIndisponible(
                "Impossible d'ouvrir la base SQLite « {$chemin} ». "
                . 'Vérifiez DB_SQLITE_PATH dans api/.env, l\'existence du dossier et ses droits d\'écriture.',
                $e
            );
        }

        // Réglages propres à SQLite, appliqués à CHAQUE connexion : ils ne sont
        // pas persistés dans le fichier (sauf journal_mode, qui l'est).
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = 5000');
        $pdo->exec('PRAGMA synchronous = NORMAL');

        // WAL peut être refusé par certains systèmes de fichiers réseau des
        // hébergements mutualisés. Ce n'est pas fatal : on retombe sur le
        // journal par défaut, mais on le DIT dans le journal serveur plutôt
        // que d'échouer silencieusement.
        $mode = $pdo->query('PRAGMA journal_mode = WAL')?->fetchColumn();
        if (is_string($mode) && strtolower($mode) !== 'wal') {
            $this->journaliserMessage(
                "PRAGMA journal_mode=WAL refusé par le système de fichiers (mode obtenu : « {$mode} »). "
                . 'La base reste fonctionnelle mais moins concurrente.'
            );
        }

        return $pdo;
    }

    private function connecterMysql(): PDO
    {
        if (!in_array('mysql', PDO::getAvailableDrivers(), true)) {
            throw ApiException::baseIndisponible(
                "L'extension PHP « pdo_mysql » n'est pas activée sur ce serveur. "
                . 'Activez-la dans le panneau de l\'hébergeur, ou basculez DB_DRIVER=sqlite dans api/.env.'
            );
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $this->config['host'],
            $this->config['port'],
            $this->config['name'],
        );

        try {
            $pdo = new PDO($dsn, (string) $this->config['user'], (string) $this->config['pass'], $this->optionsPdo());
        } catch (PDOException $e) {
            $this->journaliser('Connexion MySQL impossible', $e);

            throw ApiException::baseIndisponible(
                sprintf(
                    'Connexion MySQL refusée sur %s:%d, base « %s », utilisateur « %s ». Vérifiez dans api/.env : '
                    . 'DB_HOST (souvent « localhost » chez un mutualisé, pas « 127.0.0.1 »), DB_PORT, DB_NAME, '
                    . 'DB_USER et DB_PASSWORD — et que la base a bien été créée dans le panneau de l\'hébergeur.',
                    $this->config['host'],
                    $this->config['port'],
                    $this->config['name'],
                    $this->config['user'],
                ),
                $e
            );
        }

        // Jeu de caractères complet (émojis, arabe) et mode strict : une valeur
        // tronquée doit lever une erreur, jamais être silencieusement rognée.
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        $pdo->exec("SET SESSION time_zone = '+00:00'");

        return $pdo;
    }

    /** @return array<int,mixed> */
    private function optionsPdo(): array
    {
        return [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Requêtes réellement préparées côté serveur en MySQL : l'émulation
            // reconvertit les paramètres en chaînes et fausse les types entiers.
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ];
    }

    // ---- Requêtes --------------------------------------------------------

    /**
     * Exécute une requête préparée. Unique porte d'entrée SQL du projet.
     *
     * @param array<string|int,mixed> $params
     */
    public function run(string $sql, array $params = []): PDOStatement
    {
        try {
            $st = $this->pdo()->prepare($sql);
            $st->execute($this->normaliserParams($params));

            return $st;
        } catch (PDOException $e) {
            $this->journaliser('Échec SQL : ' . $sql, $e);

            throw new ApiException(500, 'DATABASE_ERROR', 'Erreur de base de données.', [], $e);
        }
    }

    /**
     * PDO refuse les booléens et les tableaux en paramètre lorsque l'émulation
     * est désactivée. On normalise ici, une fois, plutôt que sur 70 routes.
     *
     * @param array<string|int,mixed> $params
     * @return array<string|int,mixed>
     */
    private function normaliserParams(array $params): array
    {
        foreach ($params as $k => $v) {
            if (is_bool($v)) {
                $params[$k] = $v ? 1 : 0;
            } elseif (is_array($v)) {
                $params[$k] = self::json($v);
            }
        }

        return $params;
    }

    /**
     * @param array<string|int,mixed> $params
     * @return array<int,array<string,mixed>>
     */
    public function tous(string $sql, array $params = []): array
    {
        /** @var array<int,array<string,mixed>> $r */
        $r = $this->run($sql, $params)->fetchAll();

        return $r;
    }

    /**
     * @param array<string|int,mixed> $params
     * @return array<string,mixed>|null
     */
    public function un(string $sql, array $params = []): ?array
    {
        $r = $this->run($sql, $params)->fetch();

        return $r === false ? null : $r;
    }

    /** @param array<string|int,mixed> $params */
    public function valeur(string $sql, array $params = []): mixed
    {
        $v = $this->run($sql, $params)->fetchColumn();

        return $v === false ? null : $v;
    }

    // ---- Transactions ----------------------------------------------------

    /**
     * Ouvre une transaction d'ÉCRITURE.
     *
     * C'est la couture du double pilote : SQLite doit prendre le verrou
     * d'écriture immédiatement (`BEGIN IMMEDIATE`), sinon deux transactions
     * commencées en lecture peuvent lire le même stock puis échouer en
     * `SQLITE_BUSY` à la promotion — exactement la survente qu'on veut
     * empêcher. MySQL prend le verrou de ligne au premier UPDATE, un `BEGIN`
     * ordinaire suffit.
     */
    public function beginWrite(): void
    {
        if ($this->transactionOuverte) {
            throw new ApiException(500, 'DATABASE_ERROR', 'Transaction déjà ouverte.');
        }

        try {
            if ($this->estSqlite()) {
                $this->pdo()->exec('BEGIN IMMEDIATE');
            } else {
                $this->pdo()->exec('BEGIN');
            }
            $this->transactionOuverte = true;
        } catch (PDOException $e) {
            $this->journaliser('Ouverture de transaction impossible', $e);

            throw ApiException::baseIndisponible(
                'La base est verrouillée par une autre écriture et n\'a pas répondu dans le délai imparti. '
                . 'Réessayez ; si le problème persiste, vérifiez qu\'aucun processus ne bloque le fichier de base.',
                $e
            );
        }
    }

    public function commit(): void
    {
        if (!$this->transactionOuverte) {
            return;
        }
        $this->pdo()->exec('COMMIT');
        $this->transactionOuverte = false;
    }

    public function rollback(): void
    {
        if (!$this->transactionOuverte) {
            return;
        }
        try {
            $this->pdo()->exec('ROLLBACK');
        } catch (PDOException) {
            // Un ROLLBACK qui échoue signifie que la transaction est déjà close.
        }
        $this->transactionOuverte = false;
    }

    /**
     * Exécute `$travail` dans une transaction d'écriture, avec annulation
     * automatique sur exception. À préférer systématiquement aux appels
     * manuels beginWrite/commit.
     *
     * @template T
     * @param callable(self):T $travail
     * @return T
     */
    public function transaction(callable $travail): mixed
    {
        $this->beginWrite();
        try {
            $resultat = $travail($this);
            $this->commit();

            return $resultat;
        } catch (\Throwable $e) {
            $this->rollback();

            throw $e;
        }
    }

    // ---- Upsert ----------------------------------------------------------

    /**
     * Insertion-ou-mise-à-jour, seul endroit du projet qui connaît la
     * divergence `ON CONFLICT ... DO UPDATE` (SQLite) /
     * `ON DUPLICATE KEY UPDATE` (MySQL).
     *
     * @param string        $table    Nom de table (identifiant, validé).
     * @param array<string,mixed> $donnees Colonnes → valeurs.
     * @param string[]      $cleConflit Colonnes de la contrainte unique.
     * @param string[]|null $majColonnes Colonnes à écraser en cas de conflit ;
     *                                   par défaut toutes sauf la clé.
     * @return int Nombre de lignes affectées.
     */
    public function upsert(string $table, array $donnees, array $cleConflit, ?array $majColonnes = null): int
    {
        if ($donnees === []) {
            throw new ApiException(500, 'DATABASE_ERROR', 'upsert() appelé sans aucune colonne.');
        }
        if ($cleConflit === []) {
            throw new ApiException(500, 'DATABASE_ERROR', 'upsert() appelé sans clé de conflit.');
        }

        $table = self::identifiant($table);
        $colonnes = array_keys($donnees);
        $maj = $majColonnes ?? array_values(array_diff($colonnes, $cleConflit));

        $listeColonnes = implode(', ', array_map([self::class, 'identifiant'], $colonnes));
        $placeholders = implode(', ', array_map(static fn (string $c): string => ':' . $c, $colonnes));

        $sql = "INSERT INTO {$table} ({$listeColonnes}) VALUES ({$placeholders})";

        if ($maj === []) {
            // Aucune colonne à écraser : l'upsert dégénère en « ignorer si présent ».
            $sql .= $this->estSqlite()
                ? ' ON CONFLICT (' . implode(', ', array_map([self::class, 'identifiant'], $cleConflit)) . ') DO NOTHING'
                : ' ON DUPLICATE KEY UPDATE ' . self::identifiant($cleConflit[0]) . ' = ' . self::identifiant($cleConflit[0]);
        } elseif ($this->estSqlite()) {
            $cible = implode(', ', array_map([self::class, 'identifiant'], $cleConflit));
            $affect = implode(', ', array_map(
                static fn (string $c): string => self::identifiant($c) . ' = excluded.' . self::identifiant($c),
                $maj
            ));
            $sql .= " ON CONFLICT ({$cible}) DO UPDATE SET {$affect}";
        } else {
            $affect = implode(', ', array_map(
                static fn (string $c): string => self::identifiant($c) . ' = VALUES(' . self::identifiant($c) . ')',
                $maj
            ));
            $sql .= " ON DUPLICATE KEY UPDATE {$affect}";
        }

        $params = [];
        foreach ($donnees as $c => $v) {
            $params[':' . $c] = $v;
        }

        return $this->run($sql, $params)->rowCount();
    }

    /**
     * Insertion simple, préparée.
     *
     * @param array<string,mixed> $donnees
     */
    public function inserer(string $table, array $donnees): void
    {
        $table = self::identifiant($table);
        $colonnes = array_keys($donnees);
        $listeColonnes = implode(', ', array_map([self::class, 'identifiant'], $colonnes));
        $placeholders = implode(', ', array_map(static fn (string $c): string => ':' . $c, $colonnes));

        $params = [];
        foreach ($donnees as $c => $v) {
            $params[':' . $c] = $v;
        }

        $this->run("INSERT INTO {$table} ({$listeColonnes}) VALUES ({$placeholders})", $params);
    }

    // ---- Identifiants et JSON -------------------------------------------

    /**
     * Valide puis échappe un identifiant SQL (table ou colonne).
     *
     * Les guillemets doubles sont acceptés par SQLite ET par MySQL en mode
     * ANSI_QUOTES uniquement — on utilise donc le backtick pour MySQL et le
     * guillemet double pour SQLite. La liste blanche de caractères rend de
     * toute façon l'injection impossible : seul `[A-Za-z0-9_]` passe.
     */
    public static function identifiant(string $nom): string
    {
        if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $nom) !== 1) {
            throw new ApiException(500, 'DATABASE_ERROR', "Identifiant SQL invalide : « {$nom} ».");
        }

        return $nom;
    }

    /**
     * Valide une colonne de tri contre une liste blanche.
     * Un `sort` venant de l'URL ne doit JAMAIS atteindre le SQL sans passer ici.
     *
     * @param array<string,string> $autorisees Alias public → colonne réelle.
     */
    public static function colonneTri(?string $demande, array $autorisees, string $defaut): string
    {
        if ($demande !== null && isset($autorisees[$demande])) {
            return self::identifiant($autorisees[$demande]);
        }

        return self::identifiant($defaut);
    }

    /** Normalise `order` en `ASC`/`DESC` — jamais interpolé depuis l'URL brute. */
    public static function sens(?string $demande, string $defaut = 'DESC'): string
    {
        $d = strtoupper((string) $demande);

        return in_array($d, ['ASC', 'DESC'], true) ? $d : $defaut;
    }

    /**
     * Encodage JSON commun aux deux pilotes : colonne `JSON` en MySQL,
     * `TEXT` en SQLite, mais la chaîne stockée est rigoureusement la même.
     */
    public static function json(mixed $valeur): ?string
    {
        if ($valeur === null) {
            return null;
        }
        $encode = json_encode($valeur, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return $encode === false ? null : $encode;
    }

    /**
     * Décodage d'une colonne JSON. Une valeur illisible ne fait pas tomber la
     * requête : on rend le repli et on journalise (dégradation gracieuse
     * accompagnée d'une trace, AGENTS.md §7).
     */
    public static function dejson(mixed $brut, mixed $repli = null): mixed
    {
        if ($brut === null || $brut === '') {
            return $repli;
        }
        if (!is_string($brut)) {
            return $brut;
        }
        $v = json_decode($brut, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            self::journaliserStatique('Colonne JSON illisible, repli appliqué : ' . substr($brut, 0, 200));

            return $repli;
        }

        return $v;
    }

    // ---- Journalisation --------------------------------------------------

    private function journaliser(string $contexte, \Throwable $e): void
    {
        self::journaliserStatique($contexte . ' — ' . $e->getMessage());
    }

    private function journaliserMessage(string $message): void
    {
        self::journaliserStatique($message);
    }

    public static function journaliserStatique(string $message): void
    {
        error_log('[katech-api] ' . $message);
    }
}
