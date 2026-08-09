<?php

/**
 * faux-notion.php — doublure locale de l'API Notion.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AVERTISSEMENT, À LIRE AVANT DE S'EN SERVIR COMME D'UNE PREUVE.
 *
 * Ceci est une DOUBLURE. Elle rejoue les endpoints que notre client appelle,
 * avec les codes d'erreur et les en-têtes documentés en août 2026. Elle ne
 * prouve PAS que la vraie API Notion répondra pareil : elle ne connaît ni les
 * subtilités de validation de Notion, ni son quota par espace de travail, ni
 * ses évolutions. Elle prouve UNE chose, et c'est déjà beaucoup : que notre
 * code se comporte correctement face aux réponses que Notion dit produire —
 * y compris face à un 429 et à une panne.
 *
 * La preuve finale appartient à l'utilisateur, avec son vrai jeton, dans
 * l'écran Notion que construira un autre agent.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * LANCEMENT
 *   php -S 127.0.0.1:8261 api/tools/faux-notion.php
 *
 * puis, pour l'API KA Tech :
 *   NOTION_API_BASE=http://127.0.0.1:8261
 *
 * MODES DE PANNE (variables d'environnement du faux serveur)
 *   FAUX_NOTION_MODE=429          → répond 429 avec `Retry-After`, puis se
 *                                   comporte normalement après
 *                                   FAUX_NOTION_429_FOIS refus (défaut 1).
 *                                   C'est ce qui permet de vérifier que le
 *                                   client ATTEND le délai annoncé et réessaie
 *                                   au lieu de marteler.
 *   FAUX_NOTION_MODE=529          → même chose avec 529 (Notion saturé).
 *   FAUX_NOTION_MODE=injoignable  → 502 avec une page HTML, comme une
 *                                   passerelle d'hébergeur en vrac.
 *   FAUX_NOTION_RETRY_AFTER=3     → valeur de l'en-tête `Retry-After`, en
 *                                   secondes (défaut 2).
 *   FAUX_NOTION_ETAT=/tmp/x.json  → fichier d'état (défaut /tmp/faux-notion.json).
 *
 * Pour une VRAIE injoignabilité (connexion TCP refusée, le cas d'un Notion
 * éteint), il suffit d'arrêter ce processus : c'est plus fidèle que n'importe
 * quelle simulation, et c'est ce que fait la preuve de dégradation gracieuse.
 *
 * CE QUI EST REJOUÉ FIDÈLEMENT
 *   - `Notion-Version` obligatoire → 400 `missing_version` si absent ;
 *   - `Authorization: Bearer ntn_…` → 401 `unauthorized` si absent ou mal formé ;
 *   - base = CONTENEUR de data sources : `POST /v1/databases` prend les
 *     colonnes dans `initial_data_source.properties` et rend `data_sources[]` ;
 *   - `POST /v1/pages` exige `parent.type = "data_source_id"` ;
 *   - `POST /v1/databases/{id}/query` (route DÉPRÉCIÉE) répond 400 pour que
 *     personne ne la rappelle par mégarde ;
 *   - une propriété non inscriptible (`formula`, `rollup`, `unique_id`,
 *     `created_time`, `last_edited_time`, `created_by`, `last_edited_by`)
 *     envoyée à l'écriture → 400 `validation_error` ;
 *   - texte riche au-delà de 2000 caractères → 400 `validation_error` ;
 *   - corps au-delà de 500 Ko → 400 `validation_error` ;
 *   - AUCUNE écriture groupée : une page par appel, comme chez Notion.
 */

declare(strict_types=1);

// Ce script est un serveur de développement : il ne doit jamais être servi par
// l'API de production. Le point d'entrée public est api/index.php.
if (PHP_SAPI === 'fpm-fcgi' || PHP_SAPI === 'apache2handler') {
    http_response_code(404);
    exit;
}

const FICHIER_ETAT_DEFAUT = '/tmp/faux-notion.json';
const VERSION_ATTENDUE = '2026-03-11';

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$chemin = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
$corpsBrut = (string) file_get_contents('php://input');

// ---------------------------------------------------------------------
// Modes de panne — évalués AVANT toute logique métier, comme le ferait la
// passerelle de Notion.
// ---------------------------------------------------------------------
$mode = strtolower((string) getenv('FAUX_NOTION_MODE'));

if ($mode === 'injoignable') {
    // Corps HTML volontaire : c'est ce que rend une passerelle en panne, et
    // c'est justement le cas que le client doit savoir ne PAS confondre avec
    // une réponse de Notion.
    http_response_code(502);
    header('Content-Type: text/html; charset=utf-8');
    echo "<html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>";
    exit;
}

if ($mode === '429' || $mode === '529') {
    $etat = lireEtat();
    $refusMax = (int) (getenv('FAUX_NOTION_429_FOIS') ?: 1);
    $dejaRefuses = (int) ($etat['refus'] ?? 0);

    if ($dejaRefuses < $refusMax) {
        $etat['refus'] = $dejaRefuses + 1;
        // Trace horodatée : c'est elle qui prouve, à la lecture, que le client
        // a bien ATTENDU entre les deux tentatives au lieu de marteler.
        $etat['journalRefus'][] = ['at' => microtime(true), 'chemin' => $chemin];
        ecrireEtat($etat);

        $retryAfter = max(1, (int) (getenv('FAUX_NOTION_RETRY_AFTER') ?: 2));
        header('Retry-After: ' . $retryAfter);

        repondre((int) $mode, [
            'object' => 'error',
            'status' => (int) $mode,
            'code' => $mode === '429' ? 'rate_limited' : 'service_unavailable',
            'message' => $mode === '429'
                ? 'You have been rate limited. Please try again in a few minutes.'
                : 'Notion is unavailable. Please try again later.',
            'additional_data' => ['rate_limit_reason' => 'workspace_rate_limit'],
        ]);
    }
    // Quota de refus épuisé : la requête suivante passe normalement. C'est ce
    // qui permet de vérifier que le réessai ABOUTIT.
}

// ---------------------------------------------------------------------
// Contrôles communs à tous les endpoints
// ---------------------------------------------------------------------
$entetes = entetesRecus();

if (($entetes['notion-version'] ?? '') === '') {
    repondre(400, erreur('missing_version', 'Notion-Version header failed validation: Notion-Version header should be defined.'));
}
if (($entetes['notion-version'] ?? '') !== VERSION_ATTENDUE) {
    repondre(400, erreur(
        'invalid_request',
        'Notion-Version ' . $entetes['notion-version'] . ' is not supported by this stub (expected ' . VERSION_ATTENDUE . ').'
    ));
}

$autorisation = (string) ($entetes['authorization'] ?? '');
if (!preg_match('/^Bearer\s+ntn_[A-Za-z0-9_-]+$/', $autorisation)) {
    // Message calqué sur Notion : ni le jeton reçu, ni sa longueur ne sont
    // renvoyés — une doublure qui fuiterait le secret serait un mauvais exemple.
    repondre(401, erreur('unauthorized', 'API token is invalid.'));
}

if (strlen($corpsBrut) > 500_000) {
    repondre(400, erreur('validation_error', 'body failed validation: body should be ≤ 500KB.'));
}

$corps = [];
if ($corpsBrut !== '') {
    $decode = json_decode($corpsBrut, true);
    if (!is_array($decode)) {
        repondre(400, erreur('invalid_json', 'Error parsing JSON body.'));
    }
    $corps = $decode;
}

$etat = lireEtat();

// ---------------------------------------------------------------------
// Routage
// ---------------------------------------------------------------------

// -- Identité de la connexion -----------------------------------------
if ($methode === 'GET' && $chemin === '/v1/users/me') {
    repondre(200, [
        'object' => 'user',
        'id' => 'bot-faux-notion',
        'name' => 'Miroir KA Tech (faux Notion)',
        'type' => 'bot',
        'bot' => [
            'workspace_name' => 'Espace de démonstration KA Tech',
            'owner' => ['type' => 'workspace', 'workspace' => true],
        ],
    ]);
}

// -- Recherche de pages partagées --------------------------------------
if ($methode === 'POST' && $chemin === '/v1/search') {
    $resultats = [];
    foreach ($etat['pagesRacine'] as $id => $page) {
        $resultats[] = [
            'object' => 'page',
            'id' => $id,
            'url' => 'https://notion.so/' . str_replace('-', '', $id),
            'properties' => [
                'title' => [
                    'id' => 'title',
                    'type' => 'title',
                    'title' => [['type' => 'text', 'text' => ['content' => $page['titre']], 'plain_text' => $page['titre']]],
                ],
            ],
        ];
    }

    repondre(200, ['object' => 'list', 'results' => $resultats, 'has_more' => false, 'next_cursor' => null]);
}

// -- Création d'une base (conteneur + data source initiale) ------------
if ($methode === 'POST' && $chemin === '/v1/databases') {
    $parent = (array) ($corps['parent'] ?? []);
    $pageParente = (string) ($parent['page_id'] ?? '');

    if (($parent['type'] ?? '') !== 'page_id' || $pageParente === '') {
        repondre(400, erreur('validation_error', 'body.parent should be a page_id parent.'));
    }
    if (!isset($etat['pagesRacine'][$pageParente])) {
        // Notion répond « object_not_found » aussi bien pour une page absente
        // que pour une page non partagée : la doublure fait pareil.
        repondre(404, erreur('object_not_found', 'Could not find page with ID ' . $pageParente . '.'));
    }

    $proprietes = (array) ($corps['initial_data_source']['properties'] ?? []);
    if ($proprietes === []) {
        repondre(400, erreur('validation_error', 'body.initial_data_source.properties should be defined.'));
    }
    verifierProprietesInscriptibles($proprietes);

    $databaseId = uuid();
    $dataSourceId = uuid();
    $titre = texteDeRichText((array) ($corps['title'] ?? [])) ?: 'Sans titre';

    $etat['databases'][$databaseId] = [
        'titre' => $titre,
        'parent' => $pageParente,
        'dataSources' => [$dataSourceId],
    ];
    $etat['dataSources'][$dataSourceId] = ['databaseId' => $databaseId, 'proprietes' => $proprietes, 'pages' => []];
    ecrireEtat($etat);

    repondre(200, [
        'object' => 'database',
        'id' => $databaseId,
        'title' => [['type' => 'text', 'text' => ['content' => $titre], 'plain_text' => $titre]],
        'url' => 'https://notion.so/' . str_replace('-', '', $databaseId),
        'data_sources' => [['id' => $dataSourceId, 'name' => $titre]],
    ]);
}

// -- Lecture d'une base ------------------------------------------------
if ($methode === 'GET' && preg_match('#^/v1/databases/([^/]+)$#', $chemin, $m) === 1) {
    $id = urldecode($m[1]);
    if (!isset($etat['databases'][$id])) {
        repondre(404, erreur('object_not_found', 'Could not find database with ID ' . $id . '.'));
    }
    $base = $etat['databases'][$id];

    repondre(200, [
        'object' => 'database',
        'id' => $id,
        'title' => [['type' => 'text', 'text' => ['content' => $base['titre']], 'plain_text' => $base['titre']]],
        'url' => 'https://notion.so/' . str_replace('-', '', $id),
        'data_sources' => array_map(
            static fn (string $ds): array => ['id' => $ds, 'name' => $base['titre']],
            $base['dataSources'],
        ),
    ]);
}

// -- Route DÉPRÉCIÉE : refus explicite ---------------------------------
if ($methode === 'POST' && preg_match('#^/v1/databases/([^/]+)/query$#', $chemin) === 1) {
    repondre(400, erreur(
        'invalid_request_url',
        'POST /v1/databases/{id}/query is deprecated since 2025-09-03. Use POST /v1/data_sources/{id}/query.'
    ));
}

// -- Lecture d'une data source ----------------------------------------
if ($methode === 'GET' && preg_match('#^/v1/data_sources/([^/]+)$#', $chemin, $m) === 1) {
    $id = urldecode($m[1]);
    if (!isset($etat['dataSources'][$id])) {
        repondre(404, erreur('object_not_found', 'Could not find data source with ID ' . $id . '.'));
    }

    repondre(200, [
        'object' => 'data_source',
        'id' => $id,
        'database_parent' => ['type' => 'database_id', 'database_id' => $etat['dataSources'][$id]['databaseId']],
        'properties' => $etat['dataSources'][$id]['proprietes'],
    ]);
}

// -- Interrogation d'une data source (route moderne) -------------------
if ($methode === 'POST' && preg_match('#^/v1/data_sources/([^/]+)/query$#', $chemin, $m) === 1) {
    $id = urldecode($m[1]);
    if (!isset($etat['dataSources'][$id])) {
        repondre(404, erreur('object_not_found', 'Could not find data source with ID ' . $id . '.'));
    }

    $resultats = [];
    foreach ($etat['dataSources'][$id]['pages'] as $pageId) {
        if (isset($etat['pages'][$pageId])) {
            $resultats[] = pageEnReponse($pageId, $etat['pages'][$pageId]);
        }
    }

    repondre(200, ['object' => 'list', 'results' => $resultats, 'has_more' => false, 'next_cursor' => null]);
}

// -- Création d'une ligne ---------------------------------------------
if ($methode === 'POST' && $chemin === '/v1/pages') {
    $parent = (array) ($corps['parent'] ?? []);
    $dataSourceId = (string) ($parent['data_source_id'] ?? '');

    if (($parent['type'] ?? '') !== 'data_source_id' || $dataSourceId === '') {
        // Depuis 2025-09-03, une page de base a pour parent une DATA SOURCE.
        repondre(400, erreur('validation_error', 'body.parent should be a data_source_id parent.'));
    }
    if (!isset($etat['dataSources'][$dataSourceId])) {
        repondre(404, erreur('object_not_found', 'Could not find data source with ID ' . $dataSourceId . '.'));
    }

    $proprietes = (array) ($corps['properties'] ?? []);
    verifierProprietesConnues($proprietes, $etat['dataSources'][$dataSourceId]['proprietes']);
    verifierLongueurs($proprietes);

    $pageId = uuid();
    $etat['pages'][$pageId] = [
        'dataSourceId' => $dataSourceId,
        'proprietes' => $proprietes,
        'creeeA' => gmdate('c'),
        'modifieeA' => gmdate('c'),
    ];
    $etat['dataSources'][$dataSourceId]['pages'][] = $pageId;
    ecrireEtat($etat);

    repondre(200, pageEnReponse($pageId, $etat['pages'][$pageId]));
}

// -- Lecture / mise à jour d'une ligne ---------------------------------
if (preg_match('#^/v1/pages/([^/]+)$#', $chemin, $m) === 1) {
    $pageId = urldecode($m[1]);
    if (!isset($etat['pages'][$pageId])) {
        repondre(404, erreur('object_not_found', 'Could not find page with ID ' . $pageId . '.'));
    }

    if ($methode === 'GET') {
        repondre(200, pageEnReponse($pageId, $etat['pages'][$pageId]));
    }

    if ($methode === 'PATCH') {
        $proprietes = (array) ($corps['properties'] ?? []);
        $dataSourceId = $etat['pages'][$pageId]['dataSourceId'];
        verifierProprietesConnues($proprietes, $etat['dataSources'][$dataSourceId]['proprietes']);
        verifierLongueurs($proprietes);

        // Fusion, pas remplacement : Notion ne touche qu'aux propriétés
        // fournies et laisse les autres intactes.
        foreach ($proprietes as $nom => $valeur) {
            $etat['pages'][$pageId]['proprietes'][$nom] = $valeur;
        }
        $etat['pages'][$pageId]['modifieeA'] = gmdate('c');
        ecrireEtat($etat);

        repondre(200, pageEnReponse($pageId, $etat['pages'][$pageId]));
    }

    repondre(405, erreur('invalid_request', 'Method not supported on this endpoint.'));
}

repondre(404, erreur('invalid_request_url', 'Invalid request URL: ' . $chemin));

// =====================================================================
// Fonctions
// =====================================================================

/** @return array<string,string> en-têtes reçus, noms en minuscules */
function entetesRecus(): array
{
    $out = [];
    foreach ($_SERVER as $cle => $valeur) {
        if (str_starts_with((string) $cle, 'HTTP_')) {
            $out[strtolower(str_replace('_', '-', substr((string) $cle, 5)))] = (string) $valeur;
        }
    }

    return $out;
}

/** @return array<string,mixed> */
function erreur(string $code, string $message): array
{
    return ['object' => 'error', 'code' => $code, 'message' => $message];
}

/**
 * @param array<string,mixed> $charge
 * @return never
 */
function repondre(int $statut, array $charge): void
{
    http_response_code($statut);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($charge, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Propriétés NON inscriptibles par l'API. Les déclarer à la création d'une
 * base est accepté par Notion, mais tenter de les ÉCRIRE ne l'est pas. La
 * doublure refuse les deux : un miroir qui déclare une colonne qu'il ne peut
 * pas remplir est un piège pour la vague suivante.
 *
 * @param array<string,mixed> $proprietes
 */
function verifierProprietesInscriptibles(array $proprietes): void
{
    $interdites = ['formula', 'rollup', 'unique_id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by'];

    foreach ($proprietes as $nom => $definition) {
        foreach ($interdites as $type) {
            if (is_array($definition) && array_key_exists($type, $definition)) {
                repondre(400, erreur(
                    'validation_error',
                    'body.properties.' . $nom . ' is of type "' . $type . '", which cannot be written by the API.'
                ));
            }
        }
    }
}

/**
 * @param array<string,mixed> $proprietes
 * @param array<string,mixed> $schema
 */
function verifierProprietesConnues(array $proprietes, array $schema): void
{
    foreach (array_keys($proprietes) as $nom) {
        if (!array_key_exists($nom, $schema)) {
            // Cas réel : une colonne renommée à la main dans Notion. Le client
            // doit traduire ça en « une colonne a été renommée », pas en
            // « erreur inconnue ».
            repondre(400, erreur(
                'validation_error',
                $nom . ' is not a property that exists in this data source.'
            ));
        }
    }
    verifierProprietesInscriptibles($proprietes);
}

/**
 * Limite de 2000 caractères par bloc de texte riche.
 *
 * @param array<string,mixed> $proprietes
 */
function verifierLongueurs(array $proprietes): void
{
    foreach ($proprietes as $nom => $valeur) {
        foreach (['rich_text', 'title'] as $genre) {
            foreach ((array) ($valeur[$genre] ?? []) as $bloc) {
                $contenu = (string) ($bloc['text']['content'] ?? '');
                if (mb_strlen($contenu) > 2000) {
                    repondre(400, erreur(
                        'validation_error',
                        'body.properties.' . $nom . '.' . $genre . '[0].text.content.length should be ≤ 2000.'
                    ));
                }
            }
        }
    }
}

/**
 * Ajoute `plain_text` aux blocs de texte, comme le fait Notion en lecture :
 * un client qui ne lirait que `text.content` marcherait avec la doublure et
 * casserait en vrai. La doublure doit donc rendre les DEUX.
 *
 * @param array<string,mixed> $page
 * @return array<string,mixed>
 */
function pageEnReponse(string $id, array $page): array
{
    $props = [];
    foreach ($page['proprietes'] as $nom => $valeur) {
        foreach (['rich_text', 'title'] as $genre) {
            if (isset($valeur[$genre]) && is_array($valeur[$genre])) {
                foreach ($valeur[$genre] as $i => $bloc) {
                    $valeur[$genre][$i]['plain_text'] = (string) ($bloc['text']['content'] ?? '');
                }
            }
        }
        $valeur['type'] = typeDeValeur($valeur);
        $props[$nom] = $valeur;
    }

    return [
        'object' => 'page',
        'id' => $id,
        'created_time' => $page['creeeA'],
        'last_edited_time' => $page['modifieeA'],
        'parent' => ['type' => 'data_source_id', 'data_source_id' => $page['dataSourceId']],
        'url' => 'https://notion.so/' . str_replace('-', '', $id),
        'properties' => $props,
    ];
}

/** @param array<string,mixed> $valeur */
function typeDeValeur(array $valeur): string
{
    foreach (['title', 'rich_text', 'select', 'number', 'date', 'email', 'phone_number', 'checkbox', 'url'] as $t) {
        if (array_key_exists($t, $valeur)) {
            return $t;
        }
    }

    return 'rich_text';
}

/** @param array<int,mixed> $richText */
function texteDeRichText(array $richText): string
{
    $out = '';
    foreach ($richText as $bloc) {
        $out .= (string) ($bloc['text']['content'] ?? $bloc['plain_text'] ?? '');
    }

    return trim($out);
}

/** UUID v4 au format Notion. */
function uuid(): string
{
    $o = random_bytes(16);
    $o[6] = chr((ord($o[6]) & 0x0f) | 0x40);
    $o[8] = chr((ord($o[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($o), 4));
}

function fichierEtat(): string
{
    $v = (string) getenv('FAUX_NOTION_ETAT');

    return $v !== '' ? $v : FICHIER_ETAT_DEFAUT;
}

/**
 * État persistant. Semé au premier appel avec UNE page racine, pour que
 * `POST /v1/search` ait quelque chose à rendre et que la création de base
 * puisse s'y accrocher — c'est le pendant du « partagez une page avec votre
 * connexion » de la vraie mise en service.
 *
 * @return array<string,mixed>
 */
function lireEtat(): array
{
    $chemin = fichierEtat();
    if (is_file($chemin)) {
        $brut = json_decode((string) file_get_contents($chemin), true);
        if (is_array($brut)) {
            return $brut + ['pagesRacine' => [], 'databases' => [], 'dataSources' => [], 'pages' => [], 'refus' => 0, 'journalRefus' => []];
        }
    }

    $etat = [
        'pagesRacine' => ['11111111-2222-3333-4444-555555555555' => ['titre' => 'Boutique KA Tech']],
        'databases' => [],
        'dataSources' => [],
        'pages' => [],
        'refus' => 0,
        'journalRefus' => [],
    ];
    ecrireEtat($etat);

    return $etat;
}

/** @param array<string,mixed> $etat */
function ecrireEtat(array $etat): void
{
    file_put_contents(
        fichierEtat(),
        (string) json_encode($etat, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX,
    );
}
