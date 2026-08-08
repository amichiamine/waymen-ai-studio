<?php

/**
 * Contenu de site (`site_content`) et réglages (`settings`).
 *
 * === site_content ===
 *
 * Une ligne par section (`home`, `about`, `footer`, `home-reviews`, `ticker`,
 * `builder`…). La colonne `payload` est du JSON semi-structuré.
 *
 * `home-reviews` n'est PAS une table : c'est la section `section = 'home-reviews'`
 * de `site_content` (docs/BACKEND.md §9). On l'expose via les routes dédiées
 * du contrat (`GET|PATCH /content/home-reviews`) en lisant et en écrivant
 * cette seule ligne.
 *
 * Mise à jour partielle multilingue : une mise à jour de section ne doit
 * écraser que les champs fournis. Si seule la variante française est envoyée,
 * les variantes anglaise et arabe survivent — même principe que `mergeLocalized()`
 * côté client (phase 3).
 *
 * === settings ===
 *
 * Une ligne par portée (`site`, `shipping`). Les modes de paiement sont dans
 * la table `payment_methods` (une ligne par mode).
 *
 * === Piège MySQL (§4-1) ===
 *
 * Un paramètre nommé ne peut pas être réutilisé dans la même requête avec
 * ATTR_EMULATE_PREPARES=false. Chaque occurrence reçoit son propre placeholder.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurContenu
{
    public function __construct(private readonly Db $db)
    {
    }

    // =====================================================================
    // Contenu de site — GET|PATCH /content
    // =====================================================================

    /**
     * GET /content
     * → { data: { [section]: payload, … } }
     *
     * Retourne toutes les sections sous forme d'un objet indexé par section.
     */
    public function lireContenu(Requete $r): Reponse
    {
        $lignes = $this->db->tous('SELECT section, payload FROM site_content ORDER BY section ASC');

        $resultat = [];
        foreach ($lignes as $l) {
            $resultat[(string) $l['section']] = Db::dejson($l['payload'], (object) []);
        }

        return Reponse::ok($resultat);
    }

    /**
     * PATCH /content
     * Corps : { [section]: payload_partiel, … }
     * → 200 { data: { [section]: payload, … } }
     *
     * Pour chaque section fournie, fusionne profondément le payload entrant
     * avec le payload existant. Les sections non mentionnées sont intactes.
     * Les champs localisés sont préservés variante par variante.
     */
    public function mettreAJourContenu(Requete $r): Reponse
    {
        $corps = $r->corps;

        if (!is_array($corps) || $corps === []) {
            throw ApiException::requeteInvalide('Le corps doit être un objet de sections.');
        }

        $maintenant = gmdate('c');

        foreach ($corps as $section => $payloadEntrant) {
            if (!is_string($section) || $section === '') {
                continue;
            }

            // Lecture de la valeur existante pour la fusion.
            $ligne = $this->db->un(
                'SELECT payload FROM site_content WHERE section = :section',
                [':section' => $section],
            );

            $existant = $ligne !== null ? Db::dejson($ligne['payload'], []) : [];

            // Fusion profonde : les clés absentes du payload entrant sont conservées.
            $fusionne = $this->fusionnerPayload(
                is_array($existant) ? $existant : [],
                is_array($payloadEntrant) ? $payloadEntrant : (array) $payloadEntrant,
            );

            $this->db->upsert(
                'site_content',
                [
                    'section'    => $section,
                    'payload'    => Db::json($fusionne),
                    'updated_at' => $maintenant,
                ],
                ['section'],
                ['payload', 'updated_at'],
            );
        }

        Journal::consigner($this->db, 'contenu_mis_a_jour', 'site_content', ['sections' => array_keys($corps)]);

        return $this->lireContenu($r);
    }

    /**
     * POST /content/:section/reset — Réinitialise une section à sa valeur par défaut.
     * → 204
     *
     * « Valeur par défaut » = suppression de la ligne : à la prochaine lecture,
     * la section sera absente de l'objet renvoyé, ce qui signifie que le
     * frontend retombera sur ses valeurs initiales codées en dur.
     *
     * Une approche alternative (table `site_content_defaults`) n'est pas dans
     * le schéma actuel ; la suppression est donc la réinitialisation la plus
     * simple et la plus correcte.
     */
    public function reinitialiserSection(Requete $r): Reponse
    {
        $section = $r->param('section');

        $n = $this->db->run(
            'DELETE FROM site_content WHERE section = :section',
            [':section' => $section],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Section « {$section} » introuvable.");
        }

        Journal::consigner($this->db, 'section_reinitalisee', 'site_content', ['section' => $section]);

        return Reponse::vide();
    }

    // =====================================================================
    // home-reviews — GET|PATCH /content/home-reviews
    //
    // « home_reviews n'est pas une table » (docs/BACKEND.md §9) : c'est la
    // section `home-reviews` de site_content.
    // =====================================================================

    /**
     * GET /content/home-reviews
     * → { data: payload_de_la_section_home-reviews }
     */
    public function lireHomeReviews(Requete $r): Reponse
    {
        $ligne = $this->db->un(
            "SELECT payload FROM site_content WHERE section = 'home-reviews'",
        );

        $payload = $ligne !== null ? Db::dejson($ligne['payload'], []) : [];

        return Reponse::ok($payload);
    }

    /**
     * PATCH /content/home-reviews
     * Corps : payload partiel de la section home-reviews.
     * → 200 { data: payload_mis_à_jour }
     *
     * Fusion profonde : les clés non fournies (et les variantes linguistiques
     * non envoyées) sont préservées.
     */
    public function mettreAJourHomeReviews(Requete $r): Reponse
    {
        $corps = $r->corps;

        if (!is_array($corps)) {
            throw ApiException::requeteInvalide('Le corps doit être un objet.');
        }

        $ligne = $this->db->un(
            "SELECT payload FROM site_content WHERE section = 'home-reviews'",
        );

        $existant = $ligne !== null ? Db::dejson($ligne['payload'], []) : [];
        $fusionne = $this->fusionnerPayload(
            is_array($existant) ? $existant : [],
            $corps,
        );

        $this->db->upsert(
            'site_content',
            [
                'section'    => 'home-reviews',
                'payload'    => Db::json($fusionne),
                'updated_at' => gmdate('c'),
            ],
            ['section'],
            ['payload', 'updated_at'],
        );

        Journal::consigner($this->db, 'home_reviews_mises_a_jour', 'site_content', ['section' => 'home-reviews']);

        $ligne = $this->db->un(
            "SELECT payload FROM site_content WHERE section = 'home-reviews'",
        );

        return Reponse::ok(Db::dejson($ligne['payload'] ?? null, []));
    }

    // =====================================================================
    // Réglages — GET|PATCH /settings/site, /settings/shipping, /settings/payments
    // =====================================================================

    /**
     * GET /settings/site
     * → { data: payload }
     */
    public function lireReglagesSite(Requete $r): Reponse
    {
        return Reponse::ok($this->lireReglage('site'));
    }

    /**
     * PATCH /settings/site
     * Corps : champs à mettre à jour.
     * → 200 { data: payload_mis_à_jour }
     */
    public function mettreAJourReglagesSite(Requete $r): Reponse
    {
        $result = $this->mettreAJourReglage('site', $r->corps);
        Journal::consigner($this->db, 'reglages_mis_a_jour', 'settings', ['scope' => 'site']);

        return Reponse::ok($result);
    }

    /**
     * GET /settings/shipping
     * → { data: payload }
     */
    public function lireReglagesLivraison(Requete $r): Reponse
    {
        return Reponse::ok($this->lireReglage('shipping'));
    }

    /**
     * PATCH /settings/shipping
     * Corps : champs à mettre à jour.
     * → 200 { data: payload_mis_à_jour }
     */
    public function mettreAJourReglagesLivraison(Requete $r): Reponse
    {
        $result = $this->mettreAJourReglage('shipping', $r->corps);
        Journal::consigner($this->db, 'reglages_mis_a_jour', 'settings', ['scope' => 'shipping']);

        return Reponse::ok($result);
    }

    // ---------------------------------------------------------------
    // ARBITRAGE DE L'ORCHESTRATEUR — vague 4.2
    //
    // Les tarifs de livraison et les modes de paiement étaient implémentés
    // ici ET dans ControleurLivraison / ControleurPaiements : deux agents
    // travaillant en parallèle ont couvert le même périmètre.
    //
    // Le routage désigne les contrôleurs DÉDIÉS, plus cohérents que des
    // méthodes noyées dans le contenu éditorial. Les doublons ont été retirés
    // d'ici pour qu'aucune divergence ne puisse s'installer entre deux
    // implémentations de la même règle.
    //
    // Ce contrôleur conserve les RÉGLAGES de livraison (franco de port,
    // modes activables), qui sont bien du contenu de configuration.
    // ---------------------------------------------------------------

    /**
     * Lit le payload d'une portée de réglage.
     *
     * @return mixed
     */
    private function lireReglage(string $scope): mixed
    {
        $ligne = $this->db->un(
            'SELECT payload FROM settings WHERE scope = :scope',
            [':scope' => $scope],
        );

        return $ligne !== null ? Db::dejson($ligne['payload'], (object) []) : (object) [];
    }

    /**
     * Fusionne et persiste les réglages d'une portée.
     *
     * @param array<string,mixed> $entrant
     * @return mixed
     */
    private function mettreAJourReglage(string $scope, array $entrant): mixed
    {
        if ($entrant === []) {
            return $this->lireReglage($scope);
        }

        $ligne    = $this->db->un(
            'SELECT payload FROM settings WHERE scope = :scope',
            [':scope' => $scope],
        );
        $existant = $ligne !== null ? Db::dejson($ligne['payload'], []) : [];

        $fusionne = $this->fusionnerPayload(
            is_array($existant) ? $existant : [],
            $entrant,
        );

        $this->db->upsert(
            'settings',
            [
                'scope'      => $scope,
                'payload'    => Db::json($fusionne),
                'updated_at' => gmdate('c'),
            ],
            ['scope'],
            ['payload', 'updated_at'],
        );

        $ligne = $this->db->un(
            'SELECT payload FROM settings WHERE scope = :scope',
            [':scope' => $scope],
        );

        return Db::dejson($ligne['payload'] ?? null, (object) []);
    }

    /**
     * Fusion profonde de deux tableaux associatifs.
     *
     * Pour les champs localisés (`{ fr, en?, ar? }`), seules les variantes
     * présentes dans `$entrant` sont écrasées ; les autres sont conservées.
     *
     * Exemples :
     *   fusionner(["fr" => "A", "en" => "B"], ["fr" => "C"])
     *     → ["fr" => "C", "en" => "B"]
     *
     *   fusionner(["title" => ["fr" => "A", "en" => "B"], "active" => true],
     *             ["title" => ["fr" => "C"]])
     *     → ["title" => ["fr" => "C", "en" => "B"], "active" => true]
     *
     * @param array<string,mixed> $base    Données existantes.
     * @param array<string,mixed> $dessus  Données entrantes (prioritaires).
     * @return array<string,mixed>
     */
    private function fusionnerPayload(array $base, array $dessus): array
    {
        foreach ($dessus as $cle => $valeurDessus) {
            if (
                isset($base[$cle])
                && is_array($base[$cle])
                && is_array($valeurDessus)
            ) {
                // Fusion récursive : les tableaux imbriqués (y compris localisés)
                // sont fusionnés clé par clé plutôt qu'écrasés.
                $base[$cle] = $this->fusionnerPayload($base[$cle], $valeurDessus);
            } else {
                $base[$cle] = $valeurDessus;
            }
        }

        return $base;
    }

}
