<?php

/**
 * Client HTTP de l'API Notion — sans aucune dépendance Composer.
 *
 * `PLAN.md` interdit `vendor/` : pas de Guzzle. Deux transports sont donc
 * implémentés ici, et l'ordre n'est pas arbitraire :
 *   1. cURL quand l'extension est là (le cas général, y compris chez les
 *      mutualisés) : elle donne les en-têtes de réponse proprement, gère les
 *      délais séparément pour la connexion et pour la lecture, et ne dépend
 *      pas de `allow_url_fopen` ;
 *   2. le wrapper de flux `https://` sinon. Certains hébergeurs désactivent
 *      cURL ; refuser de fonctionner dans ce cas serait une panne évitable.
 * Aucun autre fichier du projet n'a à savoir lequel des deux a servi.
 *
 * FAITS D'API TENUS POUR ACQUIS (relevés en août 2026, cf. docs/NOTION.md §2) :
 *   - en-tête `Notion-Version: 2026-03-11` obligatoire sur chaque appel ;
 *   - depuis 2025-09-03 une base est un CONTENEUR de « data sources » :
 *       créer une base      POST  /v1/databases        (parent = page_id,
 *                                                       colonnes dans
 *                                                       initial_data_source.properties)
 *       créer une ligne     POST  /v1/pages            (parent = data_source_id)
 *       modifier une ligne  PATCH /v1/pages/{page_id}
 *       interroger          POST  /v1/data_sources/{id}/query
 *     `POST /v1/databases/{id}/query` est DÉPRÉCIÉE et n'est appelée nulle part ;
 *   - débit : 3 requêtes/seconde en moyenne par connexion. Dépassement → 429
 *     avec `Retry-After` en SECONDES ; 529 = Notion saturé, à traiter comme un 429 ;
 *   - taille maximale d'une requête : 500 Ko ; texte riche : 2000 caractères ;
 *     100 options par liste de choix ;
 *   - AUCUNE transaction, AUCUNE écriture groupée : une ligne = un appel. C'est
 *     précisément pourquoi la base reste maîtresse et Notion un miroir.
 *
 * CE QUE CE CLIENT NE FAIT PAS, VOLONTAIREMENT :
 *   - il ne réessaie pas indéfiniment. Sur 429/529 il attend le délai annoncé
 *     et retente un nombre BORNÉ de fois (`MAX_REESSAIS`), puis rend la main.
 *     Le vrai mécanisme de réessai est l'outbox (5 tentatives, recul
 *     exponentiel) : dupliquer sa logique ici produirait des attentes de
 *     plusieurs minutes à l'intérieur d'une requête HTTP ;
 *   - il n'écrit rien en base et ne connaît ni `settings` ni `notion_links`.
 */

declare(strict_types=1);

namespace KaTech\Notion;

use KaTech\Db;
use Throwable;

final class ClientNotion
{
    /** Version d'API épinglée. La changer est une décision, pas une mise à jour de routine. */
    public const VERSION_API = '2026-03-11';

    public const BASE_PAR_DEFAUT = 'https://api.notion.com';

    /**
     * Débit autorisé : 3 requêtes par seconde en moyenne. On vise
     * délibérément un intervalle un peu plus large que le minimum théorique
     * (1/3 s ≈ 334 ms) : la moyenne étant calculée côté Notion sur une
     * fenêtre glissante, coller à la limite garantit de la franchir.
     */
    private const INTERVALLE_MINIMAL_US = 360_000;

    /** Nombre de réessais immédiats sur 429/529, en plus de la tentative initiale. */
    private const MAX_REESSAIS = 2;

    /**
     * Plafond de l'attente honorée sur un `Retry-After`.
     *
     * Notion annonce rarement plus de quelques secondes, mais rien n'interdit
     * une valeur énorme. Dormir 10 minutes dans une requête HTTP est un déni
     * de service qu'on s'inflige : au-delà du plafond, on rend la main à
     * l'outbox, qui sait attendre sans bloquer personne.
     */
    private const ATTENTE_MAX_SECONDES = 8;

    private const TIMEOUT_CONNEXION = 8;
    private const TIMEOUT_TOTAL = 20;

    /**
     * Horodatage (microsecondes) du dernier appel émis par CE processus.
     * Partagé par toutes les instances : deux clients construits dans la même
     * requête ne doivent pas doubler le débit.
     */
    private static float $dernierAppelUs = 0.0;

    /** Somme des attentes imposées par le limiteur — sert aux preuves et au journal. */
    private static float $attenteCumuleeSecondes = 0.0;

    private readonly string $base;

    /**
     * @param string $token Jeton d'intégration interne (préfixe « ntn_ », sans expiration).
     *                      Il n'est JAMAIS journalisé, JAMAIS renvoyé, JAMAIS mis dans un message.
     * @param string|null $base URL de base. Sert au faux Notion local
     *                          (api/tools/faux-notion.php) et aux tests ; en
     *                          production, laisser null.
     */
    public function __construct(
        private readonly string $token,
        ?string $base = null,
    ) {
        $this->base = rtrim($base ?? self::BASE_PAR_DEFAUT, '/');
    }

    // =====================================================================
    // Surface publique — pensée pour les routes /notion/* d'un autre agent
    // =====================================================================

    /**
     * Sonde de disponibilité, EN LECTURE SEULE (SKILLS.md S3 : jamais de sonde
     * en écriture, qui laisserait des pages fantômes dans l'espace du client).
     *
     * `GET /v1/users/me` rend le robot associé à la connexion : c'est le seul
     * appel qui valide le jeton sans supposer qu'une page ait déjà été partagée.
     *
     * @return array{nom:string,espace:?string} Nom du robot et de l'espace de travail.
     */
    public function verifierToken(): array
    {
        $r = $this->appeler('GET', '/v1/users/me');

        $bot = is_array($r['bot'] ?? null) ? $r['bot'] : [];
        $espace = $bot['workspace_name'] ?? null;

        return [
            'nom' => (string) ($r['name'] ?? 'Connexion Notion'),
            'espace' => is_string($espace) ? $espace : null,
        ];
    }

    /**
     * Pages auxquelles la connexion a accès — alimente `GET /notion/pages`.
     *
     * L'intégration ne voit QUE ce qu'on lui a explicitement partagé : une
     * liste vide n'est pas une panne, c'est « vous n'avez encore invité la
     * connexion sur aucune page ». L'écran doit le dire ainsi.
     *
     * @return array<int,array{id:string,titre:string,url:?string}>
     */
    public function listerPages(int $limite = 50): array
    {
        $r = $this->appeler('POST', '/v1/search', [
            'filter' => ['value' => 'page', 'property' => 'object'],
            'page_size' => max(1, min(100, $limite)),
        ]);

        $pages = [];
        foreach ((array) ($r['results'] ?? []) as $item) {
            if (!is_array($item) || ($item['object'] ?? '') !== 'page') {
                continue;
            }
            $pages[] = [
                'id' => (string) ($item['id'] ?? ''),
                'titre' => self::titreDePage($item),
                'url' => isset($item['url']) ? (string) $item['url'] : null,
            ];
        }

        return $pages;
    }

    /**
     * Crée la base des commandes SOUS une page existante — alimente `POST /notion/base`.
     *
     * Depuis la version 2025-09-03, `POST /v1/databases` crée un CONTENEUR ;
     * les colonnes se déclarent dans `initial_data_source.properties` et la
     * réponse porte la liste des data sources. C'est l'identifiant de la DATA
     * SOURCE — pas celui de la base — qui sert ensuite à créer des lignes.
     *
     * @param array<string,mixed> $proprietes Schéma de colonnes (cf. SchemaCommandes::proprietes()).
     * @return array{databaseId:string,dataSourceId:string,url:?string}
     */
    public function creerBase(string $pageParenteId, string $titre, array $proprietes): array
    {
        $r = $this->appeler('POST', '/v1/databases', [
            'parent' => ['type' => 'page_id', 'page_id' => $pageParenteId],
            'title' => [['type' => 'text', 'text' => ['content' => self::texteBorne($titre)]]],
            'initial_data_source' => ['properties' => $proprietes],
        ]);

        $dataSourceId = self::premierDataSourceId($r);
        if ($dataSourceId === null) {
            throw ErreurNotion::reponseIllisible(
                'POST /v1/databases : réponse sans data_sources exploitable.'
            );
        }

        return [
            'databaseId' => (string) ($r['id'] ?? ''),
            'dataSourceId' => $dataSourceId,
            'url' => isset($r['url']) ? (string) $r['url'] : null,
        ];
    }

    /**
     * Rattache une base EXISTANTE : lit son conteneur et rend sa première data
     * source. Permet à `POST /notion/base` d'accepter une base déjà créée à la
     * main par le commerçant plutôt que d'en imposer une nouvelle.
     *
     * @return array{databaseId:string,dataSourceId:string,titre:string}
     */
    public function rattacherBase(string $databaseId): array
    {
        $r = $this->appeler('GET', '/v1/databases/' . rawurlencode($databaseId));

        $dataSourceId = self::premierDataSourceId($r);
        if ($dataSourceId === null) {
            throw ErreurNotion::reponseIllisible(
                'GET /v1/databases/{id} : réponse sans data_sources exploitable.'
            );
        }

        return [
            'databaseId' => (string) ($r['id'] ?? $databaseId),
            'dataSourceId' => $dataSourceId,
            'titre' => self::titreDeBase($r),
        ];
    }

    /**
     * Colonnes réellement présentes dans la data source.
     *
     * Sert à `GET /notion/status` pour dire « le tableau existe toujours et il
     * a bien ses colonnes » — et à diagnostiquer un refus d'écriture dû à une
     * colonne renommée à la main dans Notion.
     *
     * @return array<string,string> nom de colonne → type Notion
     */
    public function colonnesDataSource(string $dataSourceId): array
    {
        $r = $this->appeler('GET', '/v1/data_sources/' . rawurlencode($dataSourceId));

        $colonnes = [];
        foreach ((array) ($r['properties'] ?? []) as $nom => $def) {
            if (is_array($def) && isset($def['type'])) {
                $colonnes[(string) $nom] = (string) $def['type'];
            }
        }

        return $colonnes;
    }

    /**
     * Crée une ligne. Le parent est une DATA SOURCE, pas une base.
     *
     * @param array<string,mixed> $proprietes
     * @return string Identifiant de la page créée.
     */
    public function creerPage(string $dataSourceId, array $proprietes): string
    {
        $r = $this->appeler('POST', '/v1/pages', [
            'parent' => ['type' => 'data_source_id', 'data_source_id' => $dataSourceId],
            'properties' => $proprietes,
        ]);

        $id = (string) ($r['id'] ?? '');
        if ($id === '') {
            throw ErreurNotion::reponseIllisible('POST /v1/pages : réponse sans identifiant de page.');
        }

        return $id;
    }

    /**
     * Met à jour une ligne existante.
     *
     * @param array<string,mixed> $proprietes
     */
    public function majPage(string $pageId, array $proprietes): void
    {
        $this->appeler('PATCH', '/v1/pages/' . rawurlencode($pageId), ['properties' => $proprietes]);
    }

    /**
     * Lit une ligne — le webhook n'apporte qu'un identifiant de page, il faut
     * aller chercher l'état réel plutôt que de faire confiance au corps reçu.
     *
     * @return array<string,mixed> La page brute (clé `properties` incluse).
     */
    public function lirePage(string $pageId): array
    {
        return $this->appeler('GET', '/v1/pages/' . rawurlencode($pageId));
    }

    /**
     * Interroge la data source. Route moderne UNIQUEMENT
     * (`POST /v1/data_sources/{id}/query`) : l'ancienne
     * `POST /v1/databases/{id}/query` est dépréciée.
     *
     * @param array<string,mixed> $corps filter / sorts / start_cursor / page_size
     * @return array<string,mixed>
     */
    public function interroger(string $dataSourceId, array $corps = []): array
    {
        return $this->appeler('POST', '/v1/data_sources/' . rawurlencode($dataSourceId) . '/query', $corps);
    }

    /** Attente cumulée imposée par le limiteur de débit dans ce processus (preuve d). */
    public static function attenteCumuleeSecondes(): float
    {
        return self::$attenteCumuleeSecondes;
    }

    // =====================================================================
    // Coeur : débit, réessais, normalisation des erreurs
    // =====================================================================

    /**
     * Exécute un appel, en respectant le débit et en honorant `Retry-After`.
     *
     * @param array<string,mixed>|null $corps
     * @return array<string,mixed> Corps JSON décodé (tableau vide si 204).
     * @throws ErreurNotion toujours normalisée — jamais d'exception brute
     *                      ni de code HTTP qui remonterait au commerçant.
     */
    private function appeler(string $methode, string $chemin, ?array $corps = null): array
    {
        $tentative = 0;

        while (true) {
            $this->respecterDebit();

            $reponse = $this->emettre($methode, $this->base . $chemin, $corps);
            $statut = $reponse['statut'];

            if ($statut >= 200 && $statut < 300) {
                return $reponse['json'];
            }

            // ---- 429 / 529 : le SEUL cas où l'on attend et où l'on retente ----
            //
            // 429 = débit dépassé, 529 = Notion saturé. Notion documente le
            // second comme équivalent au premier du point de vue de l'appelant.
            // On honore `Retry-After` À LA SECONDE PRÈS : marteler avant le
            // délai annoncé aggrave la limitation au lieu de la lever.
            if ($statut === 429 || $statut === 529) {
                $attente = self::delaiAnnonce($reponse['entetes']);

                if ($tentative >= self::MAX_REESSAIS || $attente > self::ATTENTE_MAX_SECONDES) {
                    // On rend la main SANS dormir : l'outbox rejouera plus tard.
                    throw ErreurNotion::debitDepasse($attente, $methode . ' ' . $chemin);
                }

                Db::journaliserStatique(sprintf(
                    '[notion] Débit dépassé sur %s %s — attente de %d s avant réessai (%d/%d).',
                    $methode,
                    $chemin,
                    $attente,
                    $tentative + 1,
                    self::MAX_REESSAIS,
                ));

                self::$attenteCumuleeSecondes += $attente;
                usleep((int) ($attente * 1_000_000));
                $tentative++;

                continue;
            }

            throw $this->traduire($statut, $reponse['json'], $methode . ' ' . $chemin);
        }
    }

    /**
     * Limiteur de débit — 3 requêtes/seconde.
     *
     * HONNÊTETÉ SUR SA PORTÉE : ce limiteur est PAR PROCESSUS. PHP n'ayant pas
     * de mémoire partagée en mutualisé, deux requêtes HTTP simultanées peuvent
     * chacune émettre à 3 req/s, soit 6 au total. Trois garde-fous rendent le
     * dépassement improbable et, s'il survient, inoffensif :
     *   1. le miroir n'émet QUE depuis la fin de requête d'une commande et
     *      depuis le CRON, avec un lot borné (5 événements) ;
     *   2. un dépassement réel produit un 429 que la branche ci-dessus honore ;
     *   3. l'outbox reprend l'événement plus tard, avec recul exponentiel.
     * Un verrou inter-processus (fichier dans le dossier temporaire) a été
     * écarté : sur un mutualisé, ce dossier est parfois partagé entre comptes
     * et le verrou devient une porte de blocage entre boutiques voisines.
     */
    private function respecterDebit(): void
    {
        $maintenant = microtime(true) * 1_000_000;

        if (self::$dernierAppelUs > 0.0) {
            $ecoule = $maintenant - self::$dernierAppelUs;
            if ($ecoule < self::INTERVALLE_MINIMAL_US) {
                $attente = (int) (self::INTERVALLE_MINIMAL_US - $ecoule);
                self::$attenteCumuleeSecondes += $attente / 1_000_000;
                usleep($attente);
            }
        }

        self::$dernierAppelUs = microtime(true) * 1_000_000;
    }

    /**
     * Lecture de `Retry-After`. Notion l'exprime en SECONDES (entier), pas en
     * date HTTP. Une valeur absente ou aberrante retombe sur 1 s : attendre un
     * peu vaut mieux que rejouer immédiatement.
     *
     * @param array<string,string> $entetes en-têtes en minuscules
     */
    private static function delaiAnnonce(array $entetes): int
    {
        $brut = $entetes['retry-after'] ?? '';
        $secondes = is_numeric($brut) ? (int) ceil((float) $brut) : 0;

        return $secondes > 0 ? $secondes : 1;
    }

    /**
     * Traduit un statut HTTP et un corps d'erreur Notion en `ErreurNotion`.
     *
     * Le corps porte `code` (chaîne stable : `unauthorized`,
     * `object_not_found`, `restricted_resource`, `validation_error`…) et
     * `message` (anglais, technique). On se sert du `code` pour DÉCIDER et on
     * range le `message` dans le détail technique — jamais dans ce que lit le
     * commerçant.
     *
     * @param array<string,mixed> $json
     */
    private function traduire(int $statut, array $json, string $ou): ErreurNotion
    {
        $codeNotion = (string) ($json['code'] ?? '');
        $detail = trim($ou . ' — ' . $codeNotion . ' ' . (string) ($json['message'] ?? ''));
        $detail = $this->expurger($detail);

        // 401 : jeton absent, mal formé, ou révoqué.
        if ($statut === 401 || $codeNotion === 'unauthorized') {
            return ErreurNotion::tokenInvalide($detail);
        }

        // 403 : le jeton est bon, mais la connexion n'a pas le droit d'agir ici.
        if ($statut === 403 || $codeNotion === 'restricted_resource') {
            return ErreurNotion::nonPartage('cet élément', $detail);
        }

        // 404 : PIÈGE MAJEUR. Notion répond « object_not_found » AUSSI quand
        // l'objet existe mais n'a pas été partagé avec la connexion — c'est
        // volontaire de leur part (ne pas révéler l'existence d'une page
        // privée). Dire au commerçant « votre tableau a été supprimé » alors
        // qu'il a seulement oublié de partager serait un message qui MENT, et
        // AGENTS.md §7 dit qu'un message qui ment coûte plus cher que pas de
        // message. On nomme donc les DEUX causes, dans l'ordre de probabilité.
        if ($statut === 404 || $codeNotion === 'object_not_found') {
            return new ErreurNotion(
                ErreurNotion::INTROUVABLE,
                'Notion ne trouve pas l\'élément demandé. Deux causes possibles, et Notion ne '
                . 'permet pas de les distinguer : soit la connexion n\'a pas été invitée sur la '
                . 'page (dans Notion : « ••• » → « Connexions » → ajoutez votre connexion), soit '
                . 'le tableau des commandes a été supprimé ou mis à la corbeille — dans ce cas, '
                . 'recréez-le depuis l\'écran Notion. Commencez par vérifier le partage.',
                null,
                $detail,
            );
        }

        // 400/409/422 : Notion a compris et refuse. Presque toujours un schéma
        // de colonnes qui ne correspond plus.
        if ($statut === 400 || $statut === 409 || $statut === 422 || $codeNotion === 'validation_error') {
            return ErreurNotion::refuse($detail);
        }

        // 5xx (hors 529) : panne côté Notion. Réessayable.
        if ($statut >= 500) {
            return ErreurNotion::injoignable($detail);
        }

        // Tout le reste : on ne prétend pas savoir. Message honnête, détail au journal.
        return ErreurNotion::injoignable($detail);
    }

    /**
     * Filet de sécurité S13 : retire toute séquence ressemblant à un jeton
     * d'un texte destiné au journal. Le jeton ne devrait jamais s'y trouver —
     * mais un message d'erreur renvoyé par un proxy peut recopier l'en-tête
     * `Authorization`, et un journal est un fichier qui se partage.
     */
    private function expurger(string $texte): string
    {
        if ($this->token !== '') {
            $texte = str_replace($this->token, '[jeton masqué]', $texte);
        }

        return (string) preg_replace('/\bntn_[A-Za-z0-9]+/', '[jeton masqué]', $texte);
    }

    // =====================================================================
    // Transport
    // =====================================================================

    /**
     * @param array<string,mixed>|null $corps
     * @return array{statut:int,entetes:array<string,string>,json:array<string,mixed>}
     */
    private function emettre(string $methode, string $url, ?array $corps): array
    {
        $charge = $corps === null ? null : (string) json_encode($corps, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        // Garde-fou de taille : Notion refuse au-delà de 500 Ko. Mieux vaut le
        // dire ici, avec un message compréhensible, que d'encaisser un refus
        // opaque après avoir consommé un appel du quota.
        if ($charge !== null && strlen($charge) > 500_000) {
            throw ErreurNotion::refuse('Corps de requête supérieur à 500 Ko (limite Notion).');
        }

        $entetes = [
            'Authorization: Bearer ' . $this->token,
            'Notion-Version: ' . self::VERSION_API,
            'Accept: application/json',
        ];
        if ($charge !== null) {
            $entetes[] = 'Content-Type: application/json; charset=utf-8';
        }

        $brut = function_exists('curl_init')
            ? $this->emettreCurl($methode, $url, $entetes, $charge)
            : $this->emettreFlux($methode, $url, $entetes, $charge);

        $json = [];
        if (trim($brut['corps']) !== '') {
            $decode = json_decode($brut['corps'], true);
            if (!is_array($decode)) {
                // Une passerelle qui rend du HTML (« 502 Bad Gateway », page de
                // maintenance de l'hébergeur, portail captif) tombe ici.
                //
                // DISTINCTION QUI COMPTE : si le statut est un 5xx, la cause
                // n'est pas « réponse incompréhensible » mais « Notion ou le
                // chemin réseau est en panne ». Dire au commerçant de faire
                // débloquer son pare-feu alors que c'est Notion qui est tombé
                // serait un message qui ment. On laisse donc le corps vide et
                // c'est `traduire()` qui conclut à l'injoignabilité.
                if ($brut['statut'] >= 500) {
                    return ['statut' => $brut['statut'], 'entetes' => $brut['entetes'], 'json' => []];
                }

                throw ErreurNotion::reponseIllisible(
                    $methode . ' ' . $url . ' — réponse non JSON : ' . substr($brut['corps'], 0, 200)
                );
            }
            $json = $decode;
        }

        return ['statut' => $brut['statut'], 'entetes' => $brut['entetes'], 'json' => $json];
    }

    /**
     * @param string[] $entetes
     * @return array{statut:int,entetes:array<string,string>,corps:string}
     */
    private function emettreCurl(string $methode, string $url, array $entetes, ?string $charge): array
    {
        $entetesRecus = [];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_CUSTOMREQUEST => $methode,
            CURLOPT_HTTPHEADER => $entetes,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => self::TIMEOUT_CONNEXION,
            CURLOPT_TIMEOUT => self::TIMEOUT_TOTAL,
            // Pas de redirection suivie : l'API Notion n'en émet pas, et suivre
            // une redirection inattendue enverrait l'en-tête Authorization —
            // donc le jeton — vers un hôte qu'on n'a pas choisi.
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_HEADERFUNCTION => static function ($_ch, string $ligne) use (&$entetesRecus): int {
                $taille = strlen($ligne);
                $pos = strpos($ligne, ':');
                if ($pos !== false) {
                    $entetesRecus[strtolower(trim(substr($ligne, 0, $pos)))] = trim(substr($ligne, $pos + 1));
                }

                return $taille;
            },
        ]);
        if ($charge !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $charge);
        }

        $corps = curl_exec($ch);
        $erreur = curl_error($ch);
        $statut = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        // Pas de `curl_close()` : sans effet depuis PHP 8.0, et DÉPRÉCIÉ depuis
        // PHP 8.5 — or bootstrap.php transforme les avertissements en
        // exceptions, ce qui ferait tomber tout appel réseau sur PHP 8.5. La
        // ressource est libérée par le ramasse-miettes à la sortie de méthode.
        unset($ch);

        if ($corps === false || $statut === 0) {
            throw ErreurNotion::injoignable($this->expurger($methode . ' ' . $url . ' — cURL : ' . $erreur));
        }

        return ['statut' => $statut, 'entetes' => $entetesRecus, 'corps' => (string) $corps];
    }

    /**
     * Repli sans cURL. `ignore_errors` est indispensable : sans lui, un 4xx
     * ferait rendre `false` au wrapper et on perdrait le corps d'erreur — donc
     * la seule information qui permet de distinguer « jeton invalide » de
     * « page non partagée ».
     *
     * @param string[] $entetes
     * @return array{statut:int,entetes:array<string,string>,corps:string}
     */
    private function emettreFlux(string $methode, string $url, array $entetes, ?string $charge): array
    {
        $contexte = stream_context_create(['http' => [
            'method' => $methode,
            'header' => implode("\r\n", $entetes),
            'content' => $charge ?? '',
            'timeout' => self::TIMEOUT_TOTAL,
            'ignore_errors' => true,
            'follow_location' => 0,
        ]]);

        // `@` assumé : bootstrap.php transforme les warnings en exceptions, et
        // un hôte injoignable en produit un. On veut le traduire nous-mêmes.
        try {
            $corps = @file_get_contents($url, false, $contexte);
        } catch (Throwable $e) {
            throw ErreurNotion::injoignable($this->expurger($methode . ' ' . $url . ' — ' . $e->getMessage()));
        }

        if ($corps === false) {
            throw ErreurNotion::injoignable($this->expurger($methode . ' ' . $url . ' — connexion impossible.'));
        }

        $statut = 0;
        $entetesRecus = [];
        foreach ($http_response_header ?? [] as $ligne) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $ligne, $m) === 1) {
                // Une réponse peut enchaîner plusieurs blocs d'en-têtes
                // (100-continue) : c'est le DERNIER statut qui compte.
                $statut = (int) $m[1];
                $entetesRecus = [];

                continue;
            }
            $pos = strpos($ligne, ':');
            if ($pos !== false) {
                $entetesRecus[strtolower(trim(substr($ligne, 0, $pos)))] = trim(substr($ligne, $pos + 1));
            }
        }

        if ($statut === 0) {
            throw ErreurNotion::reponseIllisible($methode . ' ' . $url . ' — aucun statut HTTP lisible.');
        }

        return ['statut' => $statut, 'entetes' => $entetesRecus, 'corps' => (string) $corps];
    }

    // =====================================================================
    // Utilitaires de lecture des réponses
    // =====================================================================

    /** @param array<string,mixed> $reponse */
    private static function premierDataSourceId(array $reponse): ?string
    {
        foreach ((array) ($reponse['data_sources'] ?? []) as $ds) {
            if (is_array($ds) && isset($ds['id']) && (string) $ds['id'] !== '') {
                return (string) $ds['id'];
            }
        }

        return null;
    }

    /** @param array<string,mixed> $page */
    private static function titreDePage(array $page): string
    {
        foreach ((array) ($page['properties'] ?? []) as $prop) {
            if (is_array($prop) && ($prop['type'] ?? '') === 'title') {
                $texte = self::concatener((array) ($prop['title'] ?? []));
                if ($texte !== '') {
                    return $texte;
                }
            }
        }

        return 'Page sans titre';
    }

    /** @param array<string,mixed> $base */
    private static function titreDeBase(array $base): string
    {
        $texte = self::concatener((array) ($base['title'] ?? []));

        return $texte !== '' ? $texte : 'Base sans titre';
    }

    /** @param array<int,mixed> $richText */
    private static function concatener(array $richText): string
    {
        $morceaux = [];
        foreach ($richText as $bloc) {
            if (is_array($bloc) && isset($bloc['plain_text'])) {
                $morceaux[] = (string) $bloc['plain_text'];
            } elseif (is_array($bloc) && isset($bloc['text']['content'])) {
                $morceaux[] = (string) $bloc['text']['content'];
            }
        }

        return trim(implode('', $morceaux));
    }

    /**
     * Tronque à la limite de 2000 caractères d'un texte riche Notion.
     * Publique : les mappings (SchemaCommandes) en ont besoin, et il ne doit
     * exister qu'UNE définition de cette limite dans le projet.
     */
    public static function texteBorne(string $texte, int $max = 2000): string
    {
        return mb_strlen($texte) <= $max ? $texte : mb_substr($texte, 0, $max - 1) . '…';
    }
}
