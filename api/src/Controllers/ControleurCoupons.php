<?php

/**
 * Coupons — `/coupons` et `/coupons/validate`.
 *
 * Calqué sur le pilote `ControleurProduits` (docs/BACKEND.md, « Ajouter une
 * ressource »). Points structurants :
 *
 *   1. La clé primaire est le CODE, insensible à la casse à la lecture
 *      (`UPPER(code) = :code`) mais stocké en majuscules : « ka10 », « KA10 »
 *      et « Ka10 » désignent le même coupon, sinon un client peut contourner
 *      une limite d'utilisation en changeant la casse.
 *   2. `usage_count` n'est PAS modifiable par une écriture cliente : il est
 *      incrémenté de façon conditionnelle par la création de commande
 *      (`ControleurCommandes::consommerCoupon`). Le laisser éditable revient à
 *      offrir une remise illimitée.
 *   3. `usage_limit = 0` vaut « illimité » — c'est la valeur par défaut du
 *      schéma, et un coupon fraîchement créé doit être utilisable.
 *   4. Les règles d'éligibilité (actif, expiration, limite, achat minimum) et
 *      le calcul de la remise vivent dans `ControleurCommandes` et sont
 *      RÉUTILISÉES ici. Deux implémentations de la même règle finiraient par
 *      diverger, et le tunnel d'achat accepterait un coupon que l'écran de
 *      panier refuse.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurCoupons
{
    /** Alias public (contrat) → colonne réelle. Rien d'autre n'est triable. */
    private const TRIS = [
        'code' => 'code',
        'value' => 'value',
        'minPurchase' => 'min_purchase',
        'expiresAt' => 'expires_at',
        'usageCount' => 'usage_count',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
    ];

    private const TYPES = ['percent', 'fixed'];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /coupons
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where = [];
        $params = [];

        if (($v = $r->query('search')) !== null) {
            $where[] = 'LOWER(code) LIKE :search';
            $params[':search'] = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
        }
        if (($v = $r->queryBool('active')) !== null) {
            $where[] = 'active = :actif';
            $params[':actif'] = $v ? 1 : 0;
        }
        if (($v = $r->query('type')) !== null) {
            if (!in_array($v, self::TYPES, true)) {
                throw ApiException::validation('Filtre invalide.', [
                    'type' => ['Valeurs acceptées : ' . implode(', ', self::TYPES) . '.'],
                ]);
            }
            $where[] = 'type = :type';
            $params[':type'] = $v;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $pagination = Pagination::depuis($r);

        // Le total utilise EXACTEMENT le même WHERE que la page.
        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM coupons{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM coupons{$clause} ORDER BY {$colonne} {$sens}, code ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $pagination->perPage, ':decalage' => $pagination->offset()],
        );

        return Reponse::page(
            array_map([$this, 'enDto'], $lignes),
            $total,
            $pagination->page,
            $pagination->perPage,
        );
    }

    /** GET /coupons/:code → { data: Coupon } ou 404 enveloppé. */
    public function detail(Requete $r): Reponse
    {
        return Reponse::ok($this->enDto($this->exigerCoupon($r->param('code'))));
    }

    /** POST /coupons → 201 { data: Coupon }. */
    public function creer(Requete $r): Reponse
    {
        $code = mb_strtoupper(trim((string) $r->corps('code', '')));
        $type = (string) $r->corps('type', 'percent');
        $valeur = $r->corps('value');

        $champs = [];
        if ($code === '') {
            $champs['code'] = ['Champ obligatoire.'];
        } elseif (preg_match('/^[A-Z0-9_-]{2,40}$/', $code) !== 1) {
            $champs['code'] = ['2 à 40 caractères parmi lettres, chiffres, tiret et souligné.'];
        }
        if (!in_array($type, self::TYPES, true)) {
            $champs['type'] = ['Valeurs acceptées : ' . implode(', ', self::TYPES) . '.'];
        }
        if (!is_numeric($valeur) || (int) $valeur < 0) {
            $champs['value'] = ['Entier positif attendu.'];
        } elseif ($type === 'percent' && (int) $valeur > 100) {
            $champs['value'] = ['Un pourcentage ne dépasse pas 100.'];
        }
        if ($champs !== []) {
            throw ApiException::validation('Coupon invalide.', $champs);
        }

        $maintenant = gmdate('c');

        $this->db->beginWrite();

        try {
            $existe = $this->db->valeur(
                'SELECT code FROM coupons WHERE UPPER(code) = :code',
                [':code' => $code],
            );
            if ($existe !== null) {
                throw ApiException::conflit("Le code promo « {$code} » existe déjà.");
            }

            $this->db->inserer('coupons', [
                'code' => $code,
                'type' => $type,
                'value' => (int) $valeur,
                'min_purchase' => $this->entierPositif($r->corps('minPurchase'), 0),
                'expires_at' => $this->expiration($r->corps('expiresAt')),
                // `usage_count` appartient aux commandes : il démarre à zéro.
                'usage_count' => 0,
                'usage_limit' => $this->entierPositif($r->corps('usageLimit'), 0),
                'active' => $this->booleen($r->corps('active'), true) ? 1 : 0,
                'created_at' => $maintenant,
                'updated_at' => $maintenant,
            ]);

            Journal::consigner($this->db, 'coupon_cree', 'coupon', ['code' => $code, 'type' => $type]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        return Reponse::cree($this->enDto($this->exigerCoupon($code)));
    }

    /**
     * PATCH /coupons/:code → { data: Coupon }
     *
     * Mise à jour PARTIELLE. Le code lui-même n'est pas renommable (c'est la
     * clé imprimée sur les supports de communication), et `usageCount` est
     * ignoré : il n'appartient pas à l'appelant.
     */
    public function majPartielle(Requete $r): Reponse
    {
        $code = $r->param('code');

        $affectations = [];
        $params = [];

        if (array_key_exists('type', $r->corps)) {
            $type = (string) $r->corps('type', '');
            if (!in_array($type, self::TYPES, true)) {
                throw ApiException::validation('Coupon invalide.', [
                    'type' => ['Valeurs acceptées : ' . implode(', ', self::TYPES) . '.'],
                ]);
            }
            $affectations[] = 'type = :type';
            $params[':type'] = $type;
        }
        if (array_key_exists('value', $r->corps)) {
            $valeur = $r->corps('value');
            if (!is_numeric($valeur) || (int) $valeur < 0) {
                throw ApiException::validation('Coupon invalide.', [
                    'value' => ['Entier positif attendu.'],
                ]);
            }
            $affectations[] = 'value = :valeur';
            $params[':valeur'] = (int) $valeur;
        }
        if (array_key_exists('minPurchase', $r->corps)) {
            $affectations[] = 'min_purchase = :minimum';
            $params[':minimum'] = $this->entierPositif($r->corps('minPurchase'), 0);
        }
        if (array_key_exists('usageLimit', $r->corps)) {
            $affectations[] = 'usage_limit = :limite';
            $params[':limite'] = $this->entierPositif($r->corps('usageLimit'), 0);
        }
        if (array_key_exists('expiresAt', $r->corps)) {
            $affectations[] = 'expires_at = :expiration';
            $params[':expiration'] = $this->expiration($r->corps('expiresAt'));
        }
        if (array_key_exists('active', $r->corps)) {
            $affectations[] = 'active = :actif';
            $params[':actif'] = $this->booleen($r->corps('active'), true) ? 1 : 0;
        }

        if ($affectations === []) {
            throw ApiException::validation(
                'Aucun champ modifiable fourni. Champs acceptés : type, value, minPurchase, usageLimit, '
                . 'expiresAt, active (le code et usageCount ne sont pas modifiables).'
            );
        }

        $this->db->beginWrite();

        try {
            $existant = $this->exigerCoupon($code);

            // Cohérence pourcentage : le type effectif après mise à jour.
            $typeFinal = (string) ($params[':type'] ?? $existant['type']);
            $valeurFinale = (int) ($params[':valeur'] ?? $existant['value']);
            if ($typeFinal === 'percent' && $valeurFinale > 100) {
                throw ApiException::validation('Coupon invalide.', [
                    'value' => ['Un pourcentage ne dépasse pas 100.'],
                ]);
            }

            $affectations[] = 'updated_at = :maj';
            $params[':maj'] = gmdate('c');
            $params[':code'] = (string) $existant['code'];

            $this->db->run(
                'UPDATE coupons SET ' . implode(', ', $affectations) . ' WHERE code = :code',
                $params,
            );

            Journal::consigner($this->db, 'coupon_modifie', 'coupon', ['code' => $code]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();

            throw $e;
        }

        return Reponse::ok($this->enDto($this->exigerCoupon($code)));
    }

    /**
     * DELETE /coupons/:code → 204, sans corps.
     *
     * Les commandes déjà passées gardent `coupon_code` en empreinte : supprimer
     * le coupon n'efface pas la remise appliquée sur une facture.
     */
    public function supprimer(Requete $r): Reponse
    {
        $code = $r->param('code');

        $n = $this->db->run(
            'DELETE FROM coupons WHERE UPPER(code) = :code',
            [':code' => mb_strtoupper($code)],
        )->rowCount();

        if ($n === 0) {
            throw ApiException::introuvable("Aucun code promo « {$code} » n'existe.");
        }

        Journal::consigner($this->db, 'coupon_supprime', 'coupon', ['code' => $code]);

        return Reponse::vide();
    }

    /**
     * POST /coupons/validate → 200 { data: CouponCheckResult }
     *
     * Corps : { code, subtotal }.
     *
     * C'est une VÉRIFICATION, pas une consommation : elle n'incrémente rien.
     * Un code refusé n'est pas une erreur de requête — l'appelant a posé une
     * question légitime et reçoit une réponse négative structurée
     * (`{ valid: false, reason }`, cf. `CouponCheckResult` de
     * src/api/types.ts), en 200. Les 4xx restent réservés aux requêtes
     * malformées, ce qui laisse le frontend distinguer « code refusé » de
     * « appel cassé ».
     *
     * La remise réellement appliquée est RECALCULÉE à la création de commande,
     * à partir du sous-total serveur : le montant rendu ici est indicatif et ne
     * lie pas la caisse.
     */
    public function valider(Requete $r): Reponse
    {
        $code = trim((string) $r->corps('code', ''));
        $sousTotal = $r->corps('subtotal', 0);

        if ($code === '') {
            throw ApiException::validation('Code promo manquant.', ['code' => ['Champ obligatoire.']]);
        }
        if (!is_numeric($sousTotal) || (int) $sousTotal < 0) {
            throw ApiException::validation('Sous-total invalide.', [
                'subtotal' => ['Entier positif en DZD attendu.'],
            ]);
        }
        $sousTotal = (int) $sousTotal;

        $coupon = $this->db->un(
            'SELECT * FROM coupons WHERE UPPER(code) = :code',
            [':code' => mb_strtoupper($code)],
        );

        if ($coupon === null) {
            return Reponse::ok(['valid' => false, 'reason' => 'Code inconnu.']);
        }

        $refus = ControleurCommandes::refusCoupon($coupon, $sousTotal);
        if ($refus !== null) {
            return Reponse::ok(['valid' => false, 'reason' => $refus]);
        }

        return Reponse::ok([
            'valid' => true,
            'code' => (string) $coupon['code'],
            'discount' => ControleurCommandes::remise($coupon, $sousTotal),
            'type' => (string) $coupon['type'],
        ]);
    }

    // -----------------------------------------------------------------
    // Utilitaires
    // -----------------------------------------------------------------

    /** @return array<string,mixed> */
    private function exigerCoupon(string $code): array
    {
        $ligne = $this->db->un(
            'SELECT * FROM coupons WHERE UPPER(code) = :code',
            [':code' => mb_strtoupper($code)],
        );

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun code promo « {$code} » n'existe.");
        }

        return $ligne;
    }

    private function entierPositif(mixed $brut, int $defaut): int
    {
        return (is_numeric($brut) && (int) $brut >= 0) ? (int) $brut : $defaut;
    }

    private function booleen(mixed $brut, bool $defaut): bool
    {
        if ($brut === null) {
            return $defaut;
        }
        if (is_bool($brut)) {
            return $brut;
        }

        return in_array(strtolower((string) $brut), ['1', 'true', 'on', 'yes'], true);
    }

    /** Date d'expiration en ISO-8601 UTC, ou null. Une date illisible est refusée. */
    private function expiration(mixed $brut): ?string
    {
        if ($brut === null || trim((string) $brut) === '') {
            return null;
        }

        $horodatage = strtotime((string) $brut);
        if ($horodatage === false) {
            throw ApiException::validation('Coupon invalide.', [
                'expiresAt' => ['Date illisible : ISO-8601 attendu (ex. 2026-12-31T23:59:59Z).'],
            ]);
        }

        return gmdate('c', $horodatage);
    }

    /**
     * Rend EXACTEMENT le type `Coupon` de src/lib/admin-store.tsx.
     * `expiresAt` y est déclaré `string` : une absence d'expiration rend une
     * chaîne vide, jamais `null`.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        return [
            'code' => (string) $l['code'],
            'type' => (string) $l['type'],
            'value' => (int) $l['value'],
            'minPurchase' => (int) $l['min_purchase'],
            'expiresAt' => $l['expires_at'] === null ? '' : (string) $l['expires_at'],
            'usageCount' => (int) $l['usage_count'],
            'usageLimit' => (int) $l['usage_limit'],
            'active' => (int) $l['active'] === 1,
        ];
    }
}
