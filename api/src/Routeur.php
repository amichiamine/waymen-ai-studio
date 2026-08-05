<?php

/**
 * Routeur maison — motif d'URL + méthode, paramètres nommés `:nom`.
 *
 * Aucune dépendance Composer (décision d'architecture, PLAN.md §1 révisé) :
 * 70 routes REST ne justifient pas un `vendor/` de plusieurs mégaoctets dont
 * la compatibilité avec la version PHP de l'hébergeur est un pari.
 *
 * Distingue 404 (aucun motif) et 405 (motif connu, autre méthode) : un client
 * qui reçoit 404 sur un verbe mal choisi perd un temps fou.
 */

declare(strict_types=1);

namespace KaTech;

final class Routeur
{
    /** @var array<int,array{methode:string,regex:string,noms:string[],handler:callable,motif:string}> */
    private array $routes = [];

    /** Enregistre une route. `$handler` reçoit la `Requete` et rend une `Reponse`. */
    public function ajouter(string $methode, string $motif, callable $handler): self
    {
        [$regex, $noms] = self::compiler($motif);
        $this->routes[] = [
            'methode' => strtoupper($methode),
            'regex' => $regex,
            'noms' => $noms,
            'handler' => $handler,
            'motif' => $motif,
        ];

        return $this;
    }

    public function get(string $motif, callable $h): self
    {
        return $this->ajouter('GET', $motif, $h);
    }

    public function post(string $motif, callable $h): self
    {
        return $this->ajouter('POST', $motif, $h);
    }

    public function patch(string $motif, callable $h): self
    {
        return $this->ajouter('PATCH', $motif, $h);
    }

    public function put(string $motif, callable $h): self
    {
        return $this->ajouter('PUT', $motif, $h);
    }

    public function delete(string $motif, callable $h): self
    {
        return $this->ajouter('DELETE', $motif, $h);
    }

    /**
     * `/products/:id/reviews` → `#^/products/(?P<id>[^/]+)/reviews$#`
     *
     * @return array{0:string,1:string[]}
     */
    private static function compiler(string $motif): array
    {
        $noms = [];
        $regex = preg_replace_callback(
            '#:([A-Za-z_][A-Za-z0-9_]*)#',
            static function (array $m) use (&$noms): string {
                $noms[] = $m[1];

                return '(?P<' . $m[1] . '>[^/]+)';
            },
            // Échappe tout sauf ce que la substitution réintroduit.
            str_replace('#', '\#', $motif)
        );

        return ['#^' . $regex . '$#', $noms];
    }

    /**
     * Résout la requête. Lève `ApiException` en 404 / 405.
     */
    public function dispatcher(Requete $requete): Reponse
    {
        $methodesConnues = [];

        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $requete->chemin, $m) !== 1) {
                continue;
            }
            $methodesConnues[] = $route['methode'];

            if ($route['methode'] !== $requete->methode) {
                continue;
            }

            $params = [];
            foreach ($route['noms'] as $nom) {
                $params[$nom] = (string) $m[$nom];
            }
            $requete->params = $params;

            $reponse = ($route['handler'])($requete);
            if (!$reponse instanceof Reponse) {
                throw new ApiException(
                    500,
                    'INTERNAL_ERROR',
                    "Le gestionnaire de « {$route['methode']} {$route['motif']} » n'a pas rendu de Reponse."
                );
            }

            return $reponse;
        }

        if ($methodesConnues !== []) {
            // CORS/preflight : OPTIONS est traité en amont par index.php.
            throw ApiException::methodeNonAutorisee(sprintf(
                'La méthode %s n\'est pas autorisée sur %s. Méthodes acceptées : %s.',
                $requete->methode,
                $requete->chemin,
                implode(', ', array_unique($methodesConnues)),
            ));
        }

        throw ApiException::introuvable("Aucune route ne correspond à {$requete->methode} {$requete->chemin}.");
    }

    /** Vrai si un motif quelconque correspond au chemin — utilisé pour le préflight CORS. */
    public function cheminConnu(string $chemin): bool
    {
        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $chemin) === 1) {
                return true;
            }
        }

        return false;
    }

    /** @return string[] Méthodes autorisées sur un chemin. */
    public function methodesPour(string $chemin): array
    {
        $m = [];
        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $chemin) === 1) {
                $m[] = $route['methode'];
            }
        }

        return array_values(array_unique($m));
    }

    public function nombreDeRoutes(): int
    {
        return count($this->routes);
    }
}
