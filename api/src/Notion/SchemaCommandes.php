<?php

/**
 * Le CONTRAT commande ↔ page Notion : noms de colonnes, types, conversions.
 *
 * Tout ce qui décide « à quoi ressemble le tableau Notion » vit ICI, et nulle
 * part ailleurs. Les trois agents qui suivent (routes, écran, webhook) doivent
 * appeler ces méthodes plutôt que réécrire des noms de colonnes en dur : une
 * colonne écrite « Téléphone » d'un côté et « Telephone » de l'autre produit un
 * refus de Notion incompréhensible pour le commerçant.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE CHOIX DU TYPE POUR LE STATUT : `select`, PAS `status`.
 *
 * Notion propose un type `status` (avec ses groupes « À faire / En cours /
 * Terminé »), et c'est visuellement le plus proche de ce qu'on veut. Il est
 * pourtant écarté, pour une raison technique dirimante : l'API ne sait NI
 * créer NI modifier une propriété de type `status`. Ses options et ses groupes
 * ne se définissent qu'à la main dans l'interface Notion. Retenir `status`
 * signifierait donc demander au commerçant de fabriquer lui-même la colonne,
 * d'y saisir exactement nos cinq libellés, sans faute de frappe, avant que le
 * miroir puisse fonctionner — soit précisément le genre d'étape manuelle qui
 * casse chez tout le monde.
 *
 * `select` est créable par l'API avec ses options, modifiable par l'API,
 * modifiable à la souris par le commerçant, et lisible dans le webhook. Il
 * perd le regroupement visuel ; c'est le prix, il est faible. La limite de 100
 * options par liste de choix est hors de portée : nous en déclarons cinq.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * QUI POSSÈDE QUOI (la règle qui empêche Notion de devenir la source de vérité) :
 *   - la BASE possède : identifiant, client, contact, montants, articles,
 *     adresse, date. Notion les reçoit, ne les décide pas. Un commerçant qui
 *     les modifie dans Notion verra sa modification écrasée à la prochaine
 *     synchronisation — c'est voulu, et c'est écrit dans docs/NOTION.md ;
 *   - NOTION pilote : statut, transporteur, numéro de colis, note de suivi.
 *     Ces quatre-là remontent vers la base par le webhook.
 *   Le statut est le seul champ réellement bidirectionnel (l'administration
 *   peut aussi le changer) : c'est lui qui justifie les deux empreintes
 *   `pushed_hash` / `pulled_hash` de la table `notion_links`.
 */

declare(strict_types=1);

namespace KaTech\Notion;

final class SchemaCommandes
{
    /** Titre par défaut du tableau créé dans Notion. */
    public const TITRE_BASE = 'Commandes — KA Tech Hub';

    // Noms de colonnes. Écrits UNE fois, lus partout.
    public const COL_REFERENCE = 'Commande';
    public const COL_STATUT = 'Statut';
    public const COL_CLIENT = 'Client';
    public const COL_TELEPHONE = 'Téléphone';
    public const COL_COURRIEL = 'Courriel';
    public const COL_WILAYA = 'Wilaya';
    public const COL_LIVRAISON = 'Livraison';
    public const COL_ADRESSE = 'Adresse';
    public const COL_TOTAL = 'Total (DA)';
    public const COL_PAIEMENT = 'Paiement';
    public const COL_ARTICLES = 'Articles';
    public const COL_TRANSPORTEUR = 'Transporteur';
    public const COL_COLIS = 'Numéro de colis';
    public const COL_NOTE = 'Note de suivi';
    public const COL_DATE = 'Passée le';

    /**
     * Statut interne → libellé Notion.
     *
     * Les clés sont EXACTEMENT `ControleurCommandes::STATUTS`. Un libellé en
     * français parce que la colonne est lue par le commerçant, pas par un
     * développeur ; la valeur interne, elle, ne bouge pas.
     */
    public const STATUTS = [
        'pending' => 'En attente',
        'processing' => 'En préparation',
        'shipped' => 'Expédiée',
        'delivered' => 'Livrée',
        'cancelled' => 'Annulée',
    ];

    /** Couleurs Notion des options de statut — purement cosmétique, mais gratuit. */
    private const COULEURS_STATUT = [
        'pending' => 'yellow',
        'processing' => 'blue',
        'shipped' => 'purple',
        'delivered' => 'green',
        'cancelled' => 'red',
    ];

    private const LIVRAISONS = [
        'home' => 'À domicile',
        'desk' => 'Point de retrait',
    ];

    /**
     * Schéma de colonnes passé à `initial_data_source.properties` lors de la
     * création de la base.
     *
     * AUCUNE propriété non inscriptible n'y figure — ni `formula`, ni
     * `rollup`, ni `unique_id`, ni `created_time`, `last_edited_time`,
     * `created_by`, `last_edited_by`. L'API les refuserait à l'écriture, et
     * une colonne qu'on ne peut pas remplir n'a rien à faire dans un miroir.
     * `Passée le` est donc une vraie colonne `date` que nous alimentons, et
     * non un `created_time` (qui daterait la création de la PAGE, pas celle de
     * la commande — deux dates différentes dès qu'un rattrapage a lieu).
     *
     * @return array<string,mixed>
     */
    public static function proprietes(): array
    {
        $options = [];
        foreach (self::STATUTS as $interne => $libelle) {
            $options[] = ['name' => $libelle, 'color' => self::COULEURS_STATUT[$interne]];
        }

        return [
            // Exactement UNE propriété `title` est obligatoire dans Notion.
            self::COL_REFERENCE => ['title' => (object) []],
            self::COL_STATUT => ['select' => ['options' => $options]],
            self::COL_CLIENT => ['rich_text' => (object) []],
            self::COL_TELEPHONE => ['phone_number' => (object) []],
            self::COL_COURRIEL => ['email' => (object) []],
            self::COL_WILAYA => ['rich_text' => (object) []],
            self::COL_LIVRAISON => ['select' => ['options' => [
                ['name' => self::LIVRAISONS['home'], 'color' => 'default'],
                ['name' => self::LIVRAISONS['desk'], 'color' => 'default'],
            ]]],
            self::COL_ADRESSE => ['rich_text' => (object) []],
            // Montants en dinars ENTIERS (règle du projet : jamais de décimale).
            self::COL_TOTAL => ['number' => ['format' => 'number']],
            self::COL_PAIEMENT => ['rich_text' => (object) []],
            self::COL_ARTICLES => ['rich_text' => (object) []],
            self::COL_TRANSPORTEUR => ['rich_text' => (object) []],
            self::COL_COLIS => ['rich_text' => (object) []],
            self::COL_NOTE => ['rich_text' => (object) []],
            self::COL_DATE => ['date' => (object) []],
        ];
    }

    /**
     * Ligne `orders` (+ lignes d'articles, + suivi connu) → propriétés Notion.
     *
     * @param array<string,mixed> $commande Ligne SQL de `orders`.
     * @param array<int,array<string,mixed>> $articles Lignes SQL de `order_items`.
     * @param array{carrier:?string,tracking_number:?string} $suivi Suivi déjà connu (notion_links).
     * @return array<string,mixed>
     */
    public static function versNotion(array $commande, array $articles, array $suivi): array
    {
        $statut = (string) ($commande['status'] ?? 'pending');
        $livraison = (string) ($commande['delivery_kind'] ?? 'home');

        $props = [
            self::COL_REFERENCE => ['title' => self::texte((string) ($commande['id'] ?? ''))],
            self::COL_STATUT => ['select' => ['name' => self::STATUTS[$statut] ?? self::STATUTS['pending']]],
            self::COL_CLIENT => ['rich_text' => self::texte((string) ($commande['customer_name'] ?? ''))],
            self::COL_WILAYA => ['rich_text' => self::texte((string) ($commande['wilaya'] ?? ''))],
            self::COL_ADRESSE => ['rich_text' => self::texte((string) ($commande['address'] ?? ''))],
            self::COL_TOTAL => ['number' => (int) ($commande['total'] ?? 0)],
            self::COL_PAIEMENT => ['rich_text' => self::texte(
                (string) ($commande['payment_label'] ?? $commande['payment_method'] ?? '')
            )],
            self::COL_ARTICLES => ['rich_text' => self::texte(self::resumerArticles($articles))],
            self::COL_TRANSPORTEUR => ['rich_text' => self::texte((string) ($suivi['carrier'] ?? ''))],
            self::COL_COLIS => ['rich_text' => self::texte((string) ($suivi['tracking_number'] ?? ''))],
            self::COL_NOTE => ['rich_text' => self::texte((string) ($commande['note'] ?? ''))],
            self::COL_LIVRAISON => ['select' => ['name' => self::LIVRAISONS[$livraison] ?? self::LIVRAISONS['home']]],
        ];

        // Champs typés : Notion REFUSE une chaîne vide sur `email` et
        // `phone_number` (« validation_error »), alors qu'il accepte `null`.
        // Ce détail a un coût réel : sans lui, toute commande sans courriel
        // ferait échouer la synchronisation entière.
        $tel = trim((string) ($commande['phone'] ?? ''));
        $props[self::COL_TELEPHONE] = ['phone_number' => $tel === '' ? null : $tel];

        $mail = trim((string) ($commande['customer_email'] ?? ''));
        $props[self::COL_COURRIEL] = ['email' => $mail === '' ? null : $mail];

        $date = trim((string) ($commande['created_at'] ?? ''));
        $props[self::COL_DATE] = ['date' => $date === '' ? null : ['start' => $date]];

        return $props;
    }

    /**
     * Empreinte de l'état synchronisé — le coeur de l'anti-écho.
     *
     * Calculée sur les propriétés SORTANTES sérialisées : deux états qui
     * produiraient le même appel Notion ont la même empreinte, donc le second
     * appel n'est pas émis. C'est ce qui coupe la boucle
     * « webhook → base → push → webhook » et ce qui économise le quota de
     * 3 requêtes/seconde quand rien n'a changé.
     *
     * @param array<string,mixed> $proprietes
     */
    public static function empreinte(array $proprietes): string
    {
        return hash('sha256', (string) json_encode($proprietes, JSON_UNESCAPED_UNICODE));
    }

    /**
     * Page Notion → champs de suivi exploitables par la base (sens entrant).
     *
     * On ne lit QUE les quatre champs que Notion a le droit de piloter. Tout
     * le reste de la page est ignoré, même modifié : la base reste maîtresse.
     *
     * @param array<string,mixed> $page Réponse de `GET /v1/pages/{id}`.
     * @return array{statut:?string,transporteur:?string,colis:?string,note:?string,reference:?string}
     */
    public static function depuisNotion(array $page): array
    {
        $props = (array) ($page['properties'] ?? []);

        return [
            'reference' => self::lireTexte($props[self::COL_REFERENCE] ?? null),
            'statut' => self::statutInterne(self::lireSelect($props[self::COL_STATUT] ?? null)),
            'transporteur' => self::lireTexte($props[self::COL_TRANSPORTEUR] ?? null),
            'colis' => self::lireTexte($props[self::COL_COLIS] ?? null),
            'note' => self::lireTexte($props[self::COL_NOTE] ?? null),
        ];
    }

    /** Libellé Notion → statut interne. Null si le libellé n'est pas des nôtres. */
    public static function statutInterne(?string $libelle): ?string
    {
        if ($libelle === null || $libelle === '') {
            return null;
        }
        foreach (self::STATUTS as $interne => $connu) {
            if ($connu === $libelle) {
                return $interne;
            }
        }

        // Un statut inventé à la main dans Notion n'est PAS reporté en base :
        // `orders.status` est contraint par le contrat d'API et une valeur
        // inconnue casserait le back-office. L'appelant le journalise.
        return null;
    }

    // ---- Fabrication / lecture des valeurs Notion -----------------------

    /**
     * Bloc de texte riche. La limite est de 2000 caractères par bloc :
     * `ClientNotion::texteBorne()` la fait respecter en un seul endroit.
     *
     * @return array<int,array<string,mixed>>
     */
    private static function texte(string $valeur): array
    {
        if ($valeur === '') {
            // Tableau vide = « efface le contenu ». Notion l'accepte partout où
            // du texte riche est attendu, y compris sur la propriété `title`.
            return [];
        }

        return [['type' => 'text', 'text' => ['content' => ClientNotion::texteBorne($valeur)]]];
    }

    /**
     * Résumé lisible des articles, dans une seule cellule.
     *
     * Pourquoi pas une relation vers une base « Articles » ? Parce qu'il
     * faudrait alors créer une seconde base, une page par ligne de commande, et
     * autant d'appels — or Notion n'a AUCUNE écriture groupée. Une commande de
     * six articles coûterait sept appels au lieu d'un, à 3 req/s. Le miroir
     * sert à suivre des commandes, pas à refaire le catalogue.
     *
     * @param array<int,array<string,mixed>> $articles
     */
    private static function resumerArticles(array $articles): string
    {
        $lignes = [];
        foreach ($articles as $a) {
            $lignes[] = sprintf(
                '%d × %s (%d DA)',
                (int) ($a['qty'] ?? 1),
                (string) ($a['name'] ?? '?'),
                (int) ($a['price'] ?? 0),
            );
        }

        return implode("\n", $lignes);
    }

    /** @param mixed $prop */
    private static function lireTexte($prop): ?string
    {
        if (!is_array($prop)) {
            return null;
        }
        $blocs = $prop['rich_text'] ?? $prop['title'] ?? null;
        if (!is_array($blocs)) {
            return null;
        }

        $morceaux = [];
        foreach ($blocs as $bloc) {
            if (is_array($bloc) && isset($bloc['plain_text'])) {
                $morceaux[] = (string) $bloc['plain_text'];
            } elseif (is_array($bloc) && isset($bloc['text']['content'])) {
                $morceaux[] = (string) $bloc['text']['content'];
            }
        }

        return implode('', $morceaux);
    }

    /** @param mixed $prop */
    private static function lireSelect($prop): ?string
    {
        if (!is_array($prop) || !is_array($prop['select'] ?? null)) {
            return null;
        }
        $nom = $prop['select']['name'] ?? null;

        return is_string($nom) ? $nom : null;
    }
}
