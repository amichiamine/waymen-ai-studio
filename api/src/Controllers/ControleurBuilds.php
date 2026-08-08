<?php

/**
 * Configurateur PC — `POST /builds`.
 *
 * POURQUOI CETTE ROUTE EXISTE.
 * Le configurateur (`src/pages/Builder.tsx`) matérialisait sa configuration en
 * appelant `POST /products`, route gardée par la permission `create` (rôle
 * `editor` minimum). En session client, la réponse était donc :
 *   403 « Action réservée au rôle Éditeur ou supérieur. Votre rôle : Client. »
 * Le bouton « Ajouter au panier » ne faisait rien, sans un mot à l'utilisateur.
 * Une fonctionnalité phare du site était muette et morte.
 *
 * LE CONTRAT DE CETTE ROUTE — c'est sa raison d'être.
 * Le corps ne contient QUE les pièces choisies :
 *
 *     { "picks": { "case": "case-a", "mb": "mb-a", …, "cool": "cool-b" } }
 *
 * Aucun prix, aucun libellé, aucun identifiant ne vient du navigateur. Le
 * serveur relit les étapes dans `site_content` (section `builder`), refuse toute
 * étape manquante ou toute pièce inconnue, puis **RECALCULE** le prix comme la
 * somme des options retenues. Un client qui poste `{"picks":…,"price":1}` obtient
 * le vrai prix : le champ n'est jamais lu. C'est exactement l'inverse de
 * `POST /products`, où le prix est une donnée d'entrée — d'où une route distincte
 * plutôt qu'un assouplissement de la garde du catalogue.
 *
 * AUTORISATION. `Garde::protegeConnecte` (posée dans `api/routes.php`) : un
 * client authentifié suffit, comme pour `/me/orders`. Pas d'accès anonyme —
 * une route d'écriture ouverte à tous remplirait la table `products` sans
 * recours possible.
 *
 * ZÉRO DUPLICATION. Le contrôleur ne fabrique pas de SQL : il compose le corps
 * d'un produit, puis délègue à `ControleurProduits::creer()` via une `Requete`
 * interne. Validation, encodage JSON localisé, upsert et mapping vers le DTO
 * `Product` restent à un seul endroit (AGENTS.md §6, « les handlers appellent
 * les méthodes existantes »).
 *
 * IDEMPOTENCE. L'identifiant est dérivé des pièces choisies, côté serveur
 * uniquement. Reposter la même configuration met à jour la même ligne au lieu
 * d'en créer une seconde : le panier incrémente alors la quantité, ce qui est le
 * comportement attendu par `src/lib/store.tsx`.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Garde;
use KaTech\Db;
use KaTech\Limiteur;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurBuilds
{
    /** Section de `site_content` qui porte les étapes du configurateur. */
    private const SECTION = 'builder';

    /** Catégorie du produit matérialisé — elle existe déjà dans le modèle. */
    private const CATEGORIE = 'builds';

    /** Action auditée par le limiteur de débit. */
    private const ACTION_LIMITEUR = 'builds';

    /**
     * Icône d'étape → clé de `specs` du contrat (`SpecKey` de
     * `src/data/products.ts`). Miroir de `STEP_SPEC_KEY` dans `Builder.tsx`.
     * `cool` n'a délibérément pas d'équivalent : le refroidissement reste
     * dans `specLine`, faute de `SpecKey` correspondante.
     */
    private const SPEC_PAR_ICONE = [
        'case' => 'form',
        'mb' => 'motherboard',
        'cpu' => 'cpu',
        'ram' => 'ram',
        'ssd' => 'storage',
        'gpu' => 'gpu',
        'psu' => 'psu',
    ];

    /**
     * Libellé de la catégorie dans les trois langues — miroir de la clé
     * `nav.builds` de `src/lib/i18n/{fr,en,ar}.ts`. `products.name` est une
     * colonne JSON localisée (docs/BACKEND.md §6) : on la renseigne dans les
     * trois langues pour que la fiche, le panier et la facture suivent la langue
     * de l'utilisateur.
     */
    private const NOM_CATEGORIE = [
        'fr' => 'Configurations',
        'en' => 'Builds',
        'ar' => 'التجميعات',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * POST /builds
     * Corps : { "picks": { "<stepId>": "<partId>", … } }
     * → 201 { data: Product }
     */
    public function creer(Requete $r): Reponse
    {
        // La garde de `routes.php` a déjà exigé une session : on récupère
        // l'utilisateur pour donner au limiteur un axe « cible » plus fin que
        // l'adresse IP (un réseau d'entreprise partage une seule IP).
        $utilisateur = Garde::exigerConnexion();
        $this->limiter($r, $utilisateur['id']);

        $picks = $this->picks($r);
        $etapes = $this->etapes();

        // -- Validation et RECALCUL, en une seule passe sur les étapes -------
        // L'ordre de parcours est celui des étapes du configurateur, jamais
        // celui des clés envoyées par le client : le libellé et le `specLine`
        // doivent être stables d'un appel à l'autre.
        $erreurs = [];
        $choisies = [];
        $prix = 0;

        foreach ($etapes as $etape) {
            $idEtape = (string) $etape['id'];
            $partId = $picks[$idEtape] ?? null;

            if (!is_string($partId) || trim($partId) === '') {
                $erreurs[$idEtape] = [sprintf('Étape obligatoire : « %s ».', (string) $etape['label'])];
                continue;
            }

            $option = $this->option($etape, trim($partId));
            if ($option === null) {
                $erreurs[$idEtape] = [sprintf(
                    'Pièce inconnue « %s » pour l\'étape « %s ».',
                    trim($partId),
                    (string) $etape['label'],
                )];
                continue;
            }

            $choisies[] = ['etape' => $etape, 'option' => $option];
            // Le prix vient du référentiel serveur, jamais du corps de requête.
            $prix += (int) $option['price'];
        }

        // Une clé qui ne correspond à aucune étape est refusée plutôt
        // qu'ignorée : elle signale un client désynchronisé du référentiel, et
        // l'ignorer en silence produirait une configuration incomplète vendue
        // au prix des seules étapes reconnues.
        $idsEtapes = array_map(static fn (array $e): string => (string) $e['id'], $etapes);
        foreach (array_keys($picks) as $cle) {
            if (!in_array((string) $cle, $idsEtapes, true)) {
                $erreurs[(string) $cle] = ['Étape inconnue du configurateur.'];
            }
        }

        if ($erreurs !== []) {
            throw ApiException::validation('Configuration invalide.', $erreurs);
        }

        // -- Composition du produit -----------------------------------------
        $corps = [
            // Identifiant généré ICI. Jamais lu dans le corps de la requête :
            // un client ne doit pas pouvoir écraser un produit du catalogue en
            // choisissant son identifiant.
            'id' => $this->identifiant($choisies),
            'name' => $this->nom($choisies),
            'brand' => $this->nomBoutique(),
            'category' => self::CATEGORIE,
            'use' => [],
            'specLine' => $this->specLine($choisies),
            'specs' => $this->specs($choisies),
            'price' => $prix,
            // Une configuration est assemblée à la commande : le stock n'est pas
            // suivi (`stockQty` absent), mais l'étiquette « in » est nécessaire,
            // car `POST /orders` refuse un article marqué « out ».
            'stock' => 'in',
            'image' => $this->illustration(),
            // Marque la ligne comme privée : résoluble par identifiant (panier,
            // paiement, fiche produit) et signalée comme telle au back-office.
            'customBuild' => true,
        ];

        // Délégation au contrôleur du catalogue : c'est lui qui valide, encode
        // les colonnes JSON localisées, écrit dans `products` et rend le DTO
        // `Product` complet dans l'enveloppe habituelle (201 { data }).
        // La `Requete` interne ne transporte rien du client : uniquement le
        // corps que nous venons de composer.
        $interne = new Requete('POST', '/products', [], $corps);

        return (new ControleurProduits($this->db))->creer($interne);
    }

    // =====================================================================
    // Lecture du corps de requête
    // =====================================================================

    /**
     * Extrait `picks` du corps. Tout autre champ est ignoré sans distinction —
     * y compris un `price` ou un `id` que le client aurait glissé : ils ne sont
     * simplement jamais lus.
     *
     * @return array<string,mixed>
     */
    private function picks(Requete $r): array
    {
        $picks = $r->corps('picks');

        if (!is_array($picks) || $picks === []) {
            throw ApiException::validation('Configuration invalide.', [
                'picks' => ['Champ obligatoire : un objet { "<idEtape>": "<idPiece>" } non vide.'],
            ]);
        }

        /** @var array<string,mixed> $picks */
        return $picks;
    }

    // =====================================================================
    // Référentiel des étapes
    // =====================================================================

    /**
     * Étapes du configurateur, lues dans `site_content` (section `builder`).
     *
     * Forme attendue, vérifiée et non supposée :
     *   { "steps": [ { id, label, icon, options: [ { id, name, price } … ] } … ] }
     *
     * Une section absente ou malformée n'est pas une erreur du client : c'est le
     * référentiel du site qui manque. On répond 503 avec la cause nommée plutôt
     * qu'un 500 opaque ou un tableau vide silencieux (AGENTS.md §7).
     *
     * @return list<array{id:string,label:string,icon:string,options:list<array<string,mixed>>}>
     */
    private function etapes(): array
    {
        $ligne = $this->db->un(
            'SELECT payload FROM site_content WHERE section = :section',
            [':section' => self::SECTION],
        );

        $payload = $ligne === null ? null : Db::dejson($ligne['payload'], null);
        $brutes = is_array($payload) && isset($payload['steps']) && is_array($payload['steps'])
            ? $payload['steps']
            : null;

        if ($brutes === null || $brutes === []) {
            throw new ApiException(
                503,
                'CONFIGURATEUR_INDISPONIBLE',
                'Le configurateur n\'est pas paramétré : la section « builder » du contenu de '
                . 'site ne contient aucune étape. Renseignez-la dans /admin avant d\'accepter '
                . 'des configurations.',
            );
        }

        $etapes = [];
        foreach ($brutes as $brute) {
            if (
                !is_array($brute)
                || !isset($brute['id'], $brute['options'])
                || !is_array($brute['options'])
            ) {
                continue;
            }

            $etapes[] = [
                'id' => (string) $brute['id'],
                // Le libellé sert les messages d'erreur et le `specLine` :
                // son absence ne doit pas faire tomber la route.
                'label' => isset($brute['label']) ? (string) $brute['label'] : (string) $brute['id'],
                'icon' => isset($brute['icon']) ? (string) $brute['icon'] : '',
                'options' => array_values(array_filter(
                    $brute['options'],
                    static fn (mixed $o): bool => is_array($o) && isset($o['id'], $o['price']),
                )),
            ];
        }

        if ($etapes === []) {
            throw new ApiException(
                503,
                'CONFIGURATEUR_INDISPONIBLE',
                'Le configurateur est paramétré mais aucune étape n\'est exploitable '
                . '(un identifiant ou une liste d\'options manque).',
            );
        }

        return $etapes;
    }

    /**
     * Option d'une étape par son identifiant, ou `null` si elle n'existe pas.
     *
     * @param array{options:list<array<string,mixed>>} $etape
     * @return array<string,mixed>|null
     */
    private function option(array $etape, string $partId): ?array
    {
        foreach ($etape['options'] as $option) {
            if ((string) $option['id'] === $partId) {
                return $option;
            }
        }

        return null;
    }

    // =====================================================================
    // Composition des champs du produit
    // =====================================================================

    /**
     * Identifiant du produit, dérivé des pièces choisies (voir « IDEMPOTENCE »
     * en tête de fichier). Réduit à `[a-z0-9-]` : c'est un segment d'URL
     * (`GET /products/:id`), il ne doit rien contenir qui exige un encodage.
     *
     * @param list<array{etape:array<string,mixed>,option:array<string,mixed>}> $choisies
     */
    private function identifiant(array $choisies): string
    {
        $morceaux = array_map(
            static fn (array $c): string => (string) $c['option']['id'],
            $choisies,
        );

        $brut = 'build-' . implode('-', $morceaux);
        $normalise = strtolower((string) preg_replace('/[^a-z0-9-]+/i', '-', $brut));
        $normalise = trim((string) preg_replace('/-{2,}/', '-', $normalise), '-');

        // Garde-fou de longueur : `products.id` est un VARCHAR(96) en MySQL et
        // en PostgreSQL (les trois schémas sont jumeaux). Au-delà, on tronque et
        // on suffixe par une empreinte de la forme complète — l'identifiant
        // reste déterministe, donc idempotent, et ne collisionne pas.
        if (strlen($normalise) > 96) {
            $empreinte = substr(hash('sha256', $normalise), 0, 12);
            $normalise = substr($normalise, 0, 96 - 13) . '-' . $empreinte;
        }

        return $normalise;
    }

    /**
     * Nom localisé de la configuration : « <catégorie> — <CPU> · <GPU> ».
     *
     * Les noms de pièces sont des références commerciales, identiques dans les
     * trois langues ; seul le préfixe de catégorie est traduit.
     *
     * @param list<array{etape:array<string,mixed>,option:array<string,mixed>}> $choisies
     * @return array<string,string>
     */
    private function nom(array $choisies): array
    {
        $tete = array_values(array_filter([
            $this->nomParIcone($choisies, 'cpu'),
            $this->nomParIcone($choisies, 'gpu'),
        ], static fn (string $v): bool => $v !== ''));

        $suffixe = $tete === [] ? '' : ' — ' . implode(' · ', $tete);

        $nom = [];
        foreach (self::NOM_CATEGORIE as $langue => $libelle) {
            $nom[$langue] = $libelle . $suffixe;
        }

        return $nom;
    }

    /**
     * Résumé d'une ligne : toutes les pièces, dans l'ordre des étapes.
     * Chaîne nue et non objet localisé : ce sont des références commerciales
     * (docs/LOCALIZED-DATA.md — le type nu fait partie de l'union).
     *
     * @param list<array{etape:array<string,mixed>,option:array<string,mixed>}> $choisies
     */
    private function specLine(array $choisies): string
    {
        return implode(' · ', array_map(
            static fn (array $c): string => (string) ($c['option']['name'] ?? $c['option']['id']),
            $choisies,
        ));
    }

    /**
     * Fiche technique indexée par `SpecKey`, composée depuis les icônes
     * d'étapes. Une étape sans `SpecKey` (le refroidissement) n'apparaît qu'ici
     * dans `specLine` — jamais sous une clé inventée.
     *
     * @param list<array{etape:array<string,mixed>,option:array<string,mixed>}> $choisies
     * @return array<string,string>
     */
    private function specs(array $choisies): array
    {
        $specs = [];
        foreach ($choisies as $choix) {
            $icone = (string) ($choix['etape']['icon'] ?? '');
            $cle = self::SPEC_PAR_ICONE[$icone] ?? null;
            if ($cle !== null) {
                $specs[$cle] = (string) ($choix['option']['name'] ?? $choix['option']['id']);
            }
        }

        return $specs;
    }

    /**
     * Nom de la pièce retenue pour la première étape portant cette icône.
     *
     * @param list<array{etape:array<string,mixed>,option:array<string,mixed>}> $choisies
     */
    private function nomParIcone(array $choisies, string $icone): string
    {
        foreach ($choisies as $choix) {
            if ((string) ($choix['etape']['icon'] ?? '') === $icone) {
                return (string) ($choix['option']['name'] ?? '');
            }
        }

        return '';
    }

    /**
     * Visuel de la configuration : emprunté à un assemblage du CATALOGUE.
     *
     * Une configuration client n'est pas une source d'illustration valable, et
     * `products.image` ne peut pas être nulle. `ORDER BY id` rend le choix
     * déterministe. Aucune illustration disponible → chaîne vide, la carte
     * produit sait déjà l'afficher.
     */
    private function illustration(): string
    {
        $image = $this->db->valeur(
            "SELECT image FROM products
              WHERE category = :categorie AND custom_build = 0 AND image <> ''
              ORDER BY id ASC LIMIT 1",
            [':categorie' => self::CATEGORIE],
        );

        return $image === null ? '' : (string) $image;
    }

    /**
     * Raison sociale de la boutique, utilisée comme marque de la configuration
     * — c'est bien elle qui assemble la machine. Réglage absent → repli sur un
     * libellé neutre plutôt qu'une marque vide.
     */
    private function nomBoutique(): string
    {
        $ligne = $this->db->un(
            'SELECT payload FROM settings WHERE scope = :scope',
            [':scope' => 'site'],
        );

        $payload = $ligne === null ? null : Db::dejson($ligne['payload'], null);
        $nom = is_array($payload) ? ($payload['storeName'] ?? null) : null;

        return is_string($nom) && trim($nom) !== '' ? trim($nom) : 'KA Tech';
    }

    // =====================================================================
    // Limitation de débit
    // =====================================================================

    /**
     * `POST /builds` est une route d'ÉCRITURE ouverte aux clients : elle crée
     * une ligne dans `products` à chaque appel. Sans plafond, un compte suffirait
     * à gonfler la table indéfiniment. Deux axes, comme pour la connexion :
     * l'adresse IP et l'identifiant de l'utilisateur.
     *
     * Le message de refus est REFORMULÉ : `Limiteur` sert par défaut
     * « Identifiants invalides. », discrétion utile sur `/auth/login` mais
     * incompréhensible ici. On garde le code HTTP et on nomme la vraie cause.
     */
    private function limiter(Requete $r, string $idUtilisateur): void
    {
        try {
            (new Limiteur($this->db))->verifier($r->ip(), $idUtilisateur, self::ACTION_LIMITEUR);
        } catch (ApiException $e) {
            if ($e->statut() !== 429) {
                throw $e;
            }

            throw new ApiException(
                429,
                'TROP_DE_CONFIGURATIONS',
                'Trop de configurations enregistrées coup sur coup. Patientez quelques '
                . 'minutes, puis réessayez.',
            );
        }
    }
}
