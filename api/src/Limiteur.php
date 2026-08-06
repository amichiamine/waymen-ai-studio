<?php

/**
 * Limiteur de débit — protection contre les attaques par force brute.
 *
 * Utilisé sur :
 *   POST /auth/login          (tentatives de connexion)
 *   POST /auth/forgot-password (envoi massif d'emails)
 *
 * Deux axes de limitation indépendants :
 *   1. Par adresse IP    — protège contre les attaques distribuées.
 *   2. Par cible (email) — protège un compte contre le pistage de son existence.
 *
 * Règles de sécurité :
 *   - Le message de refus ne révèle PAS si la cible (email) existe : il est
 *     identique à celui des échecs de connexion normaux. La discrétion obtenue
 *     sur /auth/login ne doit pas être cassée par la porte du limiteur.
 *   - Le verrouillage est TEMPORAIRE (configurable, défaut 15 minutes).
 *     Un client légitime qui se trompe plusieurs fois n'est pas banni définitivement.
 *   - Les compteurs survivent entre requêtes PHP car ils sont stockés EN BASE,
 *     pas en mémoire de processus.
 *
 * Table `login_attempts` :
 *   Voir §23 des TROIS schémas — api/schema/schema.{sqlite,mysql,pgsql}.sql.
 *
 * Configuration (variables d'environnement) :
 *   RATE_LIMIT_MAX_IP      Tentatives par IP avant verrouillage    (défaut 20)
 *   RATE_LIMIT_MAX_CIBLE   Tentatives par cible avant verrouillage (défaut 10)
 *   RATE_LIMIT_FENETRE     Fenêtre de comptage en secondes         (défaut 900 = 15 min)
 *   RATE_LIMIT_VERROU      Durée du verrouillage en secondes       (défaut 900 = 15 min)
 */

declare(strict_types=1);

namespace KaTech;

final class Limiteur
{
    /** Clé d'axe : adresse IP. */
    public const AXE_IP = 'ip';

    /** Clé d'axe : identifiant de la cible (email, normalisé). */
    public const AXE_CIBLE = 'cible';

    // Paramètres par défaut — surchargés par variables d'environnement.
    private const MAX_IP_DEFAUT    = 20;
    private const MAX_CIBLE_DEFAUT = 10;
    private const FENETRE_DEFAUT   = 900;  // 15 minutes
    private const VERROU_DEFAUT    = 900;  // 15 minutes

    /** Vrai une fois la table vérifiée dans ce processus. */
    private static bool $tableVerifiee = false;

    public function __construct(private readonly Db $db)
    {
        $this->assurerTable();
    }

    // =========================================================================
    // Interface publique
    // =========================================================================

    /**
     * Vérifie si une action est autorisée et enregistre la tentative.
     *
     * Cette méthode est appelée AVANT de tenter l'action (connexion, reset…).
     * Elle lève une `ApiException` 429 si le plafond est dépassé.
     *
     * Le message de refus est VOLONTAIREMENT identique à celui des échecs
     * normaux de connexion : un message différent permettrait de déduire
     * qu'une limite est atteinte, révélant indirectement que la cible existe
     * (puisque les tentatives précédentes ont été enregistrées).
     *
     * @param string $ip     Adresse IP du client (IPv4 ou IPv6)
     * @param string $cible  Email ou toute chaîne identifiant la cible,
     *                       normalisée avant appel (LOWER, trim)
     * @param string $action Action auditée (ex. 'login', 'forgot-password')
     * @throws ApiException  429 si le plafond est atteint
     */
    public function verifier(string $ip, string $cible, string $action = 'login'): void
    {
        $maintenant = time();
        $fenetre    = Env::int('RATE_LIMIT_FENETRE', self::FENETRE_DEFAUT);
        $verrou     = Env::int('RATE_LIMIT_VERROU',  self::VERROU_DEFAUT);
        $maxIp      = Env::int('RATE_LIMIT_MAX_IP',    self::MAX_IP_DEFAUT);
        $maxCible   = Env::int('RATE_LIMIT_MAX_CIBLE', self::MAX_CIBLE_DEFAUT);

        $depuis = gmdate('c', $maintenant - $fenetre);
        $verrouilleDepuis = gmdate('c', $maintenant - $verrou);

        // ---- Axe IP -------------------------------------------------------
        $nbIp = (int) $this->db->valeur(
            "SELECT COUNT(*) FROM login_attempts
             WHERE axe = 'ip' AND cle = :cle AND action = :action
               AND created_at >= :depuis",
            [':cle' => $this->hacher($ip), ':action' => $action, ':depuis' => $depuis],
        );

        // ---- Axe cible ----------------------------------------------------
        $nbCible = (int) $this->db->valeur(
            "SELECT COUNT(*) FROM login_attempts
             WHERE axe = 'cible' AND cle = :cle AND action = :action
               AND created_at >= :depuis",
            [':cle' => $this->hacher($cible), ':action' => $action, ':depuis' => $depuis],
        );

        if ($nbIp >= $maxIp || $nbCible >= $maxCible) {
            // Journalise le refus (avec l'IP hashée) mais ne révèle rien au client.
            Db::journaliserStatique(sprintf(
                '[limiteur] Refus %s — IP_hash=%s nbIp=%d nbCible=%d',
                $action,
                $this->hacher($ip),
                $nbIp,
                $nbCible,
            ));

            throw ApiException::trop(
                'Identifiants invalides.'
            );
        }

        // ---- Enregistrement de la tentative (hors transaction) ------------
        // On insère APRÈS la vérification, pas avant : sinon la première
        // tentative serait toujours comptée avant d'être vérifiée.
        $now = gmdate('c', $maintenant);

        $this->db->inserer('login_attempts', [
            'axe'        => self::AXE_IP,
            'cle'        => $this->hacher($ip),
            'action'     => $action,
            'created_at' => $now,
        ]);
        $this->db->inserer('login_attempts', [
            'axe'        => self::AXE_CIBLE,
            'cle'        => $this->hacher($cible),
            'action'     => $action,
            'created_at' => $now,
        ]);
    }

    /**
     * Réinitialise les compteurs pour une IP et une cible données.
     *
     * À appeler après une connexion réussie pour libérer un client légitime
     * qui avait fait plusieurs tentatives erronées avant de réussir.
     *
     * @param string $ip
     * @param string $cible
     * @param string $action
     */
    public function reinitialiser(string $ip, string $cible, string $action = 'login'): void
    {
        $this->db->run(
            "DELETE FROM login_attempts
             WHERE action = :action
               AND ((axe = 'ip' AND cle = :ip) OR (axe = 'cible' AND cle = :cible))",
            [
                ':action' => $action,
                ':ip'     => $this->hacher($ip),
                ':cible'  => $this->hacher($cible),
            ],
        );
    }

    /**
     * Purge les tentatives expirées (à appeler périodiquement depuis le CRON).
     *
     * Les tentatives anciennes n'ont plus de rôle fonctionnel et alourdir
     * la table dégrade les performances.
     *
     * @param int $retention Durée de conservation en secondes (défaut 24 h)
     * @return int Nombre de lignes supprimées
     */
    public function purger(int $retention = 86400): int
    {
        $limite = gmdate('c', time() - $retention);

        return $this->db->run(
            'DELETE FROM login_attempts WHERE created_at < :limite',
            [':limite' => $limite],
        )->rowCount();
    }

    // =========================================================================
    // Outillage interne
    // =========================================================================

    /**
     * Hache la valeur sensible (IP, email) avant stockage.
     *
     * On ne stocke PAS l'IP ni l'email en clair : une fuite de la table
     * `login_attempts` ne doit pas révéler l'identité des tentatives.
     * SHA-256 est suffisant ici (pas besoin d'Argon2 : on ne reconstruit pas
     * un secret, on compare un compteur).
     */
    private function hacher(string $valeur): string
    {
        return hash('sha256', strtolower(trim($valeur)));
    }

    /**
     * Garantit l'existence de la table `login_attempts`.
     *
     * La table est déclarée dans LES TROIS schémas. Ce filet ne sert qu'aux
     * bases installées avant la vague 4.5.
     *
     * UNE BRANCHE PAR PILOTE, jamais de « sinon, donc MySQL ». Ce raccourci —
     * correct tant qu'il n'existait que deux pilotes — envoyait du DDL MySQL
     * (`AUTO_INCREMENT`, `INDEX …` dans le corps de la table, `ENGINE=InnoDB`)
     * à PostgreSQL, qui le refuse. Comme ce constructeur est appelé sur le
     * chemin de `/auth/login`, toute connexion répondait 500 en pgsql.
     *
     * Le `match` sans branche par défaut est délibéré : un pilote ajouté un
     * jour sans passer ici lèvera une `UnhandledMatchError` visible, au lieu de
     * retomber en silence sur le dialecte du voisin.
     */
    private function assurerTable(): void
    {
        if (self::$tableVerifiee) {
            return;
        }
        self::$tableVerifiee = true;

        $instructions = match ($this->db->pilote()) {
            Db::PILOTE_SQLITE => [
                'CREATE TABLE IF NOT EXISTS login_attempts ('
                . ' id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,'
                . ' axe TEXT NOT NULL,'
                . ' cle TEXT NOT NULL,'
                . ' action TEXT NOT NULL DEFAULT \'login\','
                . ' created_at TEXT NOT NULL)',
                'CREATE INDEX IF NOT EXISTS idx_login_attempts_axe_cle'
                . ' ON login_attempts (axe, cle, action, created_at)',
            ],
            // MySQL accepte l'index DANS le corps de la table ; les deux autres
            // moteurs exigent un CREATE INDEX séparé.
            Db::PILOTE_MYSQL => [
                'CREATE TABLE IF NOT EXISTS login_attempts ('
                . ' id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,'
                . ' axe VARCHAR(16) NOT NULL,'
                . ' cle VARCHAR(64) NOT NULL,'
                . ' action VARCHAR(64) NOT NULL DEFAULT \'login\','
                . ' created_at VARCHAR(32) NOT NULL,'
                . ' INDEX idx_login_attempts_axe_cle (axe, cle, action, created_at)'
                . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
            ],
            // `GENERATED BY DEFAULT AS IDENTITY` et non `BIGSERIAL` : c'est la
            // forme du schéma de référence (api/schema/schema.pgsql.sql §23), et
            // « BY DEFAULT » laisse une insertion explicite d'`id` possible, ce
            // dont le migrateur a besoin.
            Db::PILOTE_PGSQL => [
                'CREATE TABLE IF NOT EXISTS login_attempts ('
                . ' id BIGINT NOT NULL GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,'
                . ' axe VARCHAR(16) NOT NULL,'
                . ' cle VARCHAR(64) NOT NULL,'
                . ' action VARCHAR(64) NOT NULL DEFAULT \'login\','
                . ' created_at VARCHAR(32) NOT NULL)',
                'CREATE INDEX IF NOT EXISTS idx_login_attempts_axe_cle'
                . ' ON login_attempts (axe, cle, action, created_at)',
            ],
        };

        foreach ($instructions as $sql) {
            $this->db->pdo()->exec($sql);
        }
    }
}
