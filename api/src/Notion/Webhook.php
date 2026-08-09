<?php

/**
 * Réception des changements Notion — vérification de signature et lecture.
 *
 * La route `POST /notion/webhook` est écrite par un AUTRE agent (cf.
 * docs/NOTION.md §7). Ce fichier lui donne les deux briques qu'elle ne doit
 * surtout pas réinventer : la vérification HMAC et la lecture du corps.
 *
 * POURQUOI CETTE ROUTE EST PUBLIQUE, ET POURQUOI CE N'EST PAS UN TROU.
 * Notion appelle depuis ses propres serveurs : il n'a ni session ni cookie de
 * la boutique. Exiger le rang `owner` rendrait le webhook inutilisable. Ce qui
 * remplace l'authentification, c'est la SIGNATURE : Notion calcule
 * HMAC-SHA256 du corps BRUT avec un secret de vérification connu de lui seul
 * et de nous, et le pose dans l'en-tête `X-Notion-Signature`. Sans signature
 * valide, la requête est rejetée avant d'avoir touché la base.
 *
 * TROIS PIÈGES, TOUS CLASSIQUES, TOUS ÉVITÉS ICI :
 *
 *   1. SIGNER LE CORPS REPARSÉ. Le HMAC porte sur les OCTETS reçus. Décoder le
 *      JSON puis le ré-encoder change l'ordre des clés et les espaces : la
 *      signature ne correspondra plus jamais. La route DOIT lire
 *      `file_get_contents('php://input')` et passer cette chaîne telle quelle.
 *
 *   2. COMPARER AVEC `===`. Une comparaison de chaînes s'arrête au premier
 *      octet différent : sa durée révèle le nombre d'octets corrects, ce qui
 *      permet de reconstruire une signature valide octet par octet.
 *      `hash_equals()` compare en temps constant. C'est une ligne, elle n'est
 *      pas négociable.
 *
 *   3. TRAITER LE WEBHOOK COMME UNE SOURCE DE VÉRITÉ. Le corps annonce QU'IL
 *      s'est passé quelque chose, pas QUOI exactement. `MiroirCommandes`
 *      relit donc la page par l'API avant d'écrire quoi que ce soit. Un corps
 *      falsifié — à supposer qu'il passe la signature — ne peut donc pas
 *      injecter une valeur arbitraire en base.
 */

declare(strict_types=1);

namespace KaTech\Notion;

final class Webhook
{
    /** En-tête portant la signature. Comparé sans tenir compte de la casse. */
    public const ENTETE_SIGNATURE = 'X-Notion-Signature';

    /**
     * Vérifie la signature d'une requête entrante.
     *
     * @param string      $corpsBrut Les OCTETS reçus (php://input), jamais un tableau ré-encodé.
     * @param string|null $signature Valeur de l'en-tête `X-Notion-Signature`.
     * @param string|null $secret    Secret de vérification enregistré (Configuration::secretWebhook()).
     */
    public static function signatureValide(string $corpsBrut, ?string $signature, ?string $secret): bool
    {
        if ($secret === null || $secret === '' || $signature === null || $signature === '') {
            // Pas de secret enregistré = webhook non mis en service. On refuse,
            // plutôt que d'accepter n'importe quoi « en attendant ».
            return false;
        }

        // Notion préfixe la valeur par « sha256= ». On tolère les deux formes :
        // un préfixe qui apparaît ou disparaît d'une version à l'autre ne doit
        // pas mettre le suivi des commandes en panne.
        $attendu = 'sha256=' . hash_hmac('sha256', $corpsBrut, $secret);
        $recu = trim($signature);

        return hash_equals($attendu, $recu)
            || hash_equals(substr($attendu, 7), $recu);
    }

    /**
     * Jeton de la poignée de main initiale.
     *
     * À la création de l'abonnement, Notion envoie UNE fois un corps
     * `{"verification_token": "..."}` — sans signature, puisque le secret est
     * justement ce qu'il transmet. La route doit alors : enregistrer ce jeton
     * via `Configuration::enregistrerSecretWebhook()`, répondre 200, et
     * l'afficher au commerçant pour qu'il le recopie dans Notion. Sans cette
     * étape, aucune signature ne sera jamais valide.
     *
     * @param array<string,mixed> $corps
     */
    public static function jetonDeVerification(array $corps): ?string
    {
        $v = $corps['verification_token'] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }

    /**
     * Identifiants des pages concernées par l'événement.
     *
     * Notion a fait évoluer la forme du corps plusieurs fois ; on lit les
     * emplacements connus plutôt que d'en supposer un seul, et on rend un
     * tableau — un même envoi peut grouper plusieurs entités.
     *
     * @param array<string,mixed> $corps
     * @return array<int,string>
     */
    public static function pagesConcernees(array $corps): array
    {
        $ids = [];

        $entite = $corps['entity'] ?? null;
        if (is_array($entite) && ($entite['type'] ?? '') === 'page' && isset($entite['id'])) {
            $ids[] = (string) $entite['id'];
        }

        // Forme historique : `{ "page": { "id": … } }` ou `{ "page_id": … }`.
        if (isset($corps['page']['id'])) {
            $ids[] = (string) $corps['page']['id'];
        }
        if (isset($corps['page_id'])) {
            $ids[] = (string) $corps['page_id'];
        }

        // Envoi groupé.
        foreach ((array) ($corps['entities'] ?? []) as $e) {
            if (is_array($e) && ($e['type'] ?? '') === 'page' && isset($e['id'])) {
                $ids[] = (string) $e['id'];
            }
        }

        return array_values(array_unique(array_filter($ids, static fn (string $i): bool => $i !== '')));
    }

    /**
     * Lit l'en-tête de signature quelle que soit la façon dont le serveur l'a
     * exposé. `getallheaders()` n'existe pas sous tous les SAPI ; `$_SERVER`
     * est le repli universel (les tirets deviennent des tirets bas).
     *
     * @param array<string,mixed> $serveur Typiquement `$_SERVER`.
     */
    public static function signatureRecue(array $serveur): ?string
    {
        $cle = 'HTTP_' . strtoupper(str_replace('-', '_', self::ENTETE_SIGNATURE));
        $v = $serveur[$cle] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }
}
