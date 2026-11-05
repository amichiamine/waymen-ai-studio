<?php

/**
 * Erreur métier destinée à être rendue telle quelle dans l'enveloppe du
 * contrat : `{ error: { code, message, fields } }`.
 *
 * Toute exception qui n'est PAS une `ApiException` est considérée comme une
 * panne interne : elle est journalisée côté serveur et rendue en 500 générique
 * sans jamais exposer de trace (AGENTS.md §7 — échec visible mais non bavard).
 */

declare(strict_types=1);

namespace KaTech;

use RuntimeException;
use Throwable;

class ApiException extends RuntimeException
{
    /** @param array<string,string[]> $champs */
    public function __construct(
        private readonly int $statut,
        private readonly string $codeErreur,
        string $message,
        private readonly array $champs = [],
        ?Throwable $precedente = null,
    ) {
        parent::__construct($message, 0, $precedente);
    }

    public function statut(): int
    {
        return $this->statut;
    }

    public function codeErreur(): string
    {
        return $this->codeErreur;
    }

    /** @return array<string,string[]> */
    public function champs(): array
    {
        return $this->champs;
    }

    // ---- Fabriques des cas courants -------------------------------------

    /** @param array<string,string[]> $champs */
    public static function validation(string $message = 'Requête invalide.', array $champs = []): self
    {
        return new self(422, 'VALIDATION_ERROR', $message, $champs);
    }

    public static function requeteInvalide(string $message = 'Requête invalide.'): self
    {
        return new self(400, 'BAD_REQUEST', $message);
    }

    /** Alias court pour requeteInvalide. */
    public static function invalide(string $message = 'Requête invalide.'): self
    {
        return self::requeteInvalide($message);
    }

    public static function nonAuthentifie(string $message = 'Authentification requise.'): self
    {
        return new self(401, 'UNAUTHORIZED', $message);
    }

    public static function interdit(string $message = 'Accès refusé.'): self
    {
        return new self(403, 'FORBIDDEN', $message);
    }

    public static function introuvable(string $message = 'Ressource introuvable.'): self
    {
        return new self(404, 'NOT_FOUND', $message);
    }

    public static function methodeNonAutorisee(string $message = 'Méthode non autorisée.'): self
    {
        return new self(405, 'METHOD_NOT_ALLOWED', $message);
    }

    public static function conflit(string $message = 'Conflit avec l\'état actuel.'): self
    {
        return new self(409, 'CONFLICT', $message);
    }

    /**
     * Trop de requêtes — limite de débit dépassée (HTTP 429).
     *
     * Le message par défaut est identique à celui des échecs de connexion :
     * un message distinct trahirait qu'un compte a été visé assez souvent
     * pour déclencher le limiteur, révélant ainsi son existence.
     */
    public static function trop(string $message = 'Identifiants invalides.'): self
    {
        return new self(429, 'TOO_MANY_REQUESTS', $message);
    }

    /**
     * Base injoignable ou mal configurée. Le message doit dire QUOI VÉRIFIER,
     * jamais recracher la trace PDO.
     */
    public static function baseIndisponible(string $message, ?Throwable $precedente = null): self
    {
        return new self(503, 'DATABASE_UNAVAILABLE', $message, [], $precedente);
    }
}
