<?php

/**
 * Normalisation des paramètres de liste communs à toutes les ressources :
 * `page`, `perPage`, `search`, `sort`, `order` (docs/API-CONTRACT.md).
 *
 * Mutualisé pour que les 70 routes se comportent RIGOUREUSEMENT pareil : une
 * ressource qui plafonnerait `perPage` différemment est un bug de contrat.
 */

declare(strict_types=1);

namespace KaTech;

final class Pagination
{
    public const PAR_PAGE_DEFAUT = 20;
    public const PAR_PAGE_MAX = 200;

    private function __construct(
        public readonly int $page,
        public readonly int $perPage,
    ) {
    }

    public static function depuis(Requete $r, int $parPageDefaut = self::PAR_PAGE_DEFAUT): self
    {
        $page = max(1, $r->queryInt('page', 1) ?? 1);
        $perPage = $r->queryInt('perPage', $parPageDefaut) ?? $parPageDefaut;
        // Un perPage absurde (0, négatif, 10 000) ne doit ni vider la liste ni
        // faire tomber le serveur : on borne, on ne rejette pas.
        $perPage = max(1, min(self::PAR_PAGE_MAX, $perPage));

        return new self($page, $perPage);
    }

    public function offset(): int
    {
        return ($this->page - 1) * $this->perPage;
    }
}
