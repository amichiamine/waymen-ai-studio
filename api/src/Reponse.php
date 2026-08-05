<?php

/**
 * Production de l'enveloppe du contrat — UNIQUE endroit qui écrit sur la
 * sortie. Aucun contrôleur ne fait `echo`.
 *
 * Contrat (docs/API-CONTRACT.md) :
 *   succès    → 200/201  { "data": ... }
 *   vide      → 204      (aucun corps)
 *   erreur    → 4xx/5xx  { "error": { "code", "message", "fields" } }
 *   liste     → 200      { "data": { "items", "total", "page", "perPage" } }
 */

declare(strict_types=1);

namespace KaTech;

final class Reponse
{
    private const OPTIONS_JSON = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

    /** @param array<string,string> $entetes */
    private function __construct(
        public readonly int $statut,
        public readonly ?string $corps,
        private readonly array $entetes = [],
    ) {
    }

    /** Succès enveloppé : `{ "data": ... }`. */
    public static function ok(mixed $donnees, int $statut = 200): self
    {
        return new self($statut, self::encoder(['data' => $donnees]));
    }

    /** Création : 201 + `{ "data": ... }`. */
    public static function cree(mixed $donnees): self
    {
        return self::ok($donnees, 201);
    }

    /** Réponse vide : 204, sans le moindre octet de corps. */
    public static function vide(): self
    {
        return new self(204, null);
    }

    /**
     * Liste paginée : `{ "data": { items, total, page, perPage } }`.
     *
     * @param array<int,mixed> $items
     */
    public static function page(array $items, int $total, int $page, int $perPage): self
    {
        return self::ok([
            'items' => array_values($items),
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
        ]);
    }

    /** @param array<string,string[]> $champs */
    public static function erreur(int $statut, string $code, string $message, array $champs = []): self
    {
        $erreur = ['code' => $code, 'message' => $message];
        if ($champs !== []) {
            $erreur['fields'] = $champs;
        }

        return new self($statut, self::encoder(['error' => $erreur]));
    }

    public static function depuisException(ApiException $e): self
    {
        return self::erreur($e->statut(), $e->codeErreur(), $e->getMessage(), $e->champs());
    }

    private static function encoder(mixed $v): string
    {
        $s = json_encode($v, self::OPTIONS_JSON);

        // Une valeur non encodable (récursion, UTF-8 invalide) ne doit pas
        // produire une page blanche : on renvoie une erreur bien formée.
        if ($s === false) {
            Db::journaliserStatique('Encodage JSON de la réponse impossible : ' . json_last_error_msg());

            return '{"error":{"code":"SERIALIZATION_ERROR","message":"Réponse non sérialisable."}}';
        }

        return $s;
    }

    /** Écrit la réponse. Appelé une seule fois, par index.php. */
    public function envoyer(): void
    {
        if (!headers_sent()) {
            http_response_code($this->statut);
            foreach ($this->entetes as $nom => $valeur) {
                header($nom . ': ' . $valeur);
            }
            if ($this->corps !== null) {
                header('Content-Type: application/json; charset=utf-8');
            }
            header('X-Content-Type-Options: nosniff');
        }

        if ($this->corps !== null) {
            echo $this->corps;
        }
    }
}
