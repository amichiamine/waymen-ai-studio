<?php

/**
 * `POST /notion/webhook` — la SEULE porte publique et non authentifiée de l'API.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * À LIRE PAR QUI CHERCHE UNE FAILLE ICI. C'est l'unique route que n'importe
 * qui sur Internet peut appeler sans session, sans cookie et sans jeton. Tout
 * ce fichier n'existe que pour une raison : faire en sorte qu'un appel
 * quelconque n'obtienne RIEN — ni écriture, ni information.
 *
 * CE QUE CETTE CLASSE EST : une porte. Elle vérifie l'authenticité, borne le
 * travail, dédoublonne, trace, et délègue.
 *
 * CE QUE CETTE CLASSE N'EST PAS : de la logique métier. Elle ne lit pas une
 * propriété Notion, ne décide pas d'un statut, n'écrit pas dans `orders`.
 * `KaTech\Notion\MiroirCommandes::appliquerPageEntrante()` le fait déjà, et
 * c'est lui — et lui seul — qui borne les écritures aux quatre champs de suivi
 * (statut, transporteur, numéro de colis, note). Zéro duplication (SKILLS.md
 * S6, AGENTS.md §6).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * LES SEPT GARANTIES DE LA PORTE, ET COMMENT CHACUNE EST TENUE
 *
 * 1. SIGNATURE D'ABORD, TOUJOURS. Aucun traitement — pas même une lecture de
 *    `notion_links` — n'a lieu avant que `Webhook::signatureValide()` ait
 *    rendu vrai sur le corps BRUT (`php://input`, jamais un tableau
 *    ré-encodé : l'ordre des clés changerait et le HMAC ne tomberait jamais
 *    juste). La comparaison est à temps constant, dans `Webhook`.
 *
 * 2. AUCUN ORACLE. Toute requête authentique reçoit exactement la même
 *    réponse — `200 { "data": { "recu": true } }` — que la page soit connue,
 *    inconnue, hors périmètre, ou que le statut soit refusé. Le travail réel
 *    étant DIFFÉRÉ après l'envoi de la réponse (garantie 5), même la DURÉE de
 *    la réponse ne dit rien de ce qui existe côté boutique. Toute requête
 *    refusée reçoit, elle aussi, une réponse unique et muette : 401
 *    « Requête refusée. », que la signature soit absente, fausse, calculée
 *    sur un corps modifié, ou qu'aucun secret ne soit encore enregistré.
 *
 * 3. PÉRIMÈTRE DES ÉCRITURES. Notion ne pilote que le suivi. Le miroir ne lit
 *    que quatre propriétés ; tout le reste de la page — prix, total, quantité,
 *    client, stock — est ignoré même modifié. Cette porte y ajoute une
 *    couche : elle INSPECTE le corps reçu et TRACE toute tentative de piloter
 *    un champ interdit (§ `champsInterdits()`). Un champ non autorisé n'est
 *    pas une erreur, c'est un refus tracé.
 *
 * 4. AUCUNE CRÉATION, AUCUNE SUPPRESSION. Un événement `page.deleted` ne
 *    supprime rien : Notion est un miroir, jamais la source de vérité. Une
 *    page inconnue de `notion_links` n'en crée pas non plus (le miroir la
 *    laisse tomber sans erreur).
 *
 * 5. RÉPONSE RAPIDE. Notion attend un accusé court, et un événement
 *    `page.content_updated` peut grouper plusieurs pages, donc plusieurs
 *    lectures réseau. Le traitement est donc enregistré en fin de script, tout
 *    comme le vidage de l'outbox (`Outbox::enregistrerVidageEnSortie()`) :
 *    la réponse part d'abord, le travail suit.
 *
 * 6. IDEMPOTENCE. `page.content_updated` est AGRÉGÉ, arrive avec ~1 minute de
 *    retard, et plusieurs envois peuvent concerner la même page. Deux
 *    protections se superposent : le dédoublonnage des livraisons déjà vues
 *    (ci-dessous), et le fait que le miroir est convergent — il ne réécrit que
 *    ce qui diffère réellement.
 *
 * 7. ANTI-ÉCHO. Cette porte n'émet JAMAIS de poussée vers Notion. Elle
 *    n'appelle pas `synchroniser()`. `appliquerPageEntrante()` inscrit
 *    `pulled_hash` : la prochaine poussée, d'où qu'elle vienne, comparera
 *    cette empreinte et n'émettra aucun appel. La boucle
 *    « webhook → base → poussée → webhook » ne peut pas démarrer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI 401 SUR UNE SIGNATURE INVALIDE, alors que docs/NOTION.md §7.1
 * demande « 200 même quand on ignore l'événement » ?
 *
 * Ces deux règles ne parlent pas de la même chose. Le 200 systématique
 * protège contre les REJEUX INFINIS de Notion : un événement authentique
 * qu'on choisit d'ignorer (page hors périmètre, statut inconnu, commande
 * supprimée) doit être acquitté, sinon Notion le renvoie indéfiniment. Cette
 * règle est tenue à la lettre — voir `traiterPages()`.
 *
 * Une requête à la signature invalide, elle, ne vient PAS de Notion : aucun
 * rejeu n'est en jeu. L'acquitter par un 200 rendrait le refus invisible,
 * donc intestable, donc indémontrable — et un jour indétectable. Le 401 est
 * uniforme, muet sur sa cause, et n'est jamais servi à un appel légitime.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * OÙ VA LA TRACE, ET POURQUOI PAS TOUJOURS AU MÊME ENDROIT (AGENTS.md §7)
 *
 *   - `audit_logs` (via `KaTech\Journal`) reçoit ce qui a une valeur MÉTIER et
 *     dont le volume est maîtrisé : la mise en service de l'abonnement, et
 *     toute tentative AUTHENTIFIÉE de piloter un champ interdit. Le changement
 *     appliqué y est déjà consigné par le miroir (`notion_suivi_recu`) : on ne
 *     le consigne pas deux fois.
 *   - le journal serveur (`Db::journaliserStatique`) reçoit tout ce qui est
 *     déclenché par un appelant NON authentifié : signature absente ou fausse,
 *     corps illisible, corps hors gabarit. Écrire ces refus dans `audit_logs`
 *     offrirait à n'importe qui une écriture illimitée en base depuis une
 *     route publique — le journal d'audit du commerçant deviendrait une
 *     poubelle, et la table un vecteur de saturation. Le refus reste tracé,
 *     mais là où son volume ne coûte rien à la boutique.
 *
 * AUCUN SECRET NULLE PART : ni le jeton de vérification, ni la signature reçue
 * n'apparaissent dans une réponse, un journal ou un message d'erreur. Seules
 * des empreintes tronquées sont écrites, pour pouvoir corréler deux lignes.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Session;
use KaTech\Db;
use KaTech\Journal;
use KaTech\Limiteur;
use KaTech\Notion\Configuration;
use KaTech\Notion\MiroirCommandes;
use KaTech\Notion\Webhook;
use KaTech\Reponse;
use KaTech\Requete;
use Throwable;

final class ControleurNotionWebhook
{
    /**
     * Actions du limiteur. DEUX compteurs distincts, et c'est délibéré : la
     * poignée de main ne doit pas être verrouillée par un martèlement de
     * signatures fausses, sinon un attaquant empêcherait la mise en service.
     */
    public const ACTION_LIMITEUR = 'notion-webhook';
    public const ACTION_LIMITEUR_ABONNEMENT = 'notion-webhook-abonnement';

    /**
     * Gabarit maximal du corps : la même limite que Notion s'impose (500 Ko).
     * Au-delà, on ne calcule même pas le HMAC — faire hacher un gigaoctet à un
     * serveur mutualisé est une attaque à part entière.
     */
    private const TAILLE_MAX = 500_000;

    /**
     * Plafond de pages traitées par livraison. Un envoi agrégé légitime en
     * contient quelques-unes ; un envoi qui en contiendrait mille ferait mille
     * lectures réseau à 3 req/s. On borne, et on le dit dans le journal.
     */
    private const PAGES_MAX = 25;

    /**
     * Mémoire des livraisons déjà acquittées (idempotence).
     *
     * POURQUOI DANS `settings` ET PAS DANS UNE NOUVELLE TABLE : le schéma est
     * hors de mon périmètre, et il n'a pas à changer pour un cache de quinze
     * minutes. POURQUOI PAS DANS LE SCOPE `notion` : ce scope appartient à
     * `KaTech\Notion\Configuration` ; y écrire depuis ici créerait deux
     * propriétaires pour une même ligne (AGENTS.md §6 — souveraineté).
     */
    private const SCOPE_RECEPTIONS = 'notion_webhook';
    private const TTL_RECEPTION = 900;
    private const MEMOIRE_RECEPTIONS = 200;

    /**
     * Noms de champs que Notion n'a JAMAIS le droit de piloter.
     *
     * Cette liste ne PROTÈGE rien à elle seule — la protection réelle est que
     * le miroir ne lit que quatre propriétés, et qu'il les relit depuis Notion
     * plutôt que de croire le corps du webhook. Elle sert à RENDRE VISIBLE une
     * tentative : sans elle, une charge utile qui essaie de changer un prix
     * serait ignorée en silence, et personne ne saurait jamais que quelqu'un a
     * essayé. Un faux positif ne coûte qu'une ligne de journal ; un silence
     * coûte l'incident qu'on ne voit pas venir.
     */
    private const CHAMPS_INTERDITS = [
        'price', 'prix', 'unit_price', 'subtotal', 'total', 'amount', 'montant',
        'qty', 'quantity', 'quantite', 'stock', 'inventory', 'discount', 'remise',
        'coupon', 'payment_status', 'paid', 'paye', 'customer_id', 'customer_email',
        'customer_name', 'user_id', 'role', 'password', 'delete', 'supprimer', 'create_order',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    // =====================================================================
    // POST /notion/webhook — route PUBLIQUE, déclarée SANS garde
    // =====================================================================

    /**
     * Reçoit une livraison Notion.
     *
     * @return Reponse 200 muet si authentique, 401 muet sinon, 429 si martelée.
     */
    public function recevoir(Requete $r): Reponse
    {
        $brut = self::corpsBrut();

        // ---- Gabarit ----------------------------------------------------
        // Avant tout calcul : refuser un corps démesuré coûte une comparaison
        // d'entiers, le hacher coûterait le CPU du serveur.
        if (strlen($brut) > self::TAILLE_MAX) {
            return $this->refuser($r, 'corps hors gabarit (' . strlen($brut) . ' octets)');
        }

        $corps = self::decoder($brut);
        if ($corps === null) {
            return $this->refuser($r, 'corps illisible');
        }

        $signature = Webhook::signatureRecue($_SERVER);
        $config = Configuration::charger($this->db);

        // ---- Poignée de main d'abonnement --------------------------------
        // Le seul appel légitimement NON signé : Notion transmet le secret,
        // il ne peut donc pas encore s'en servir pour signer.
        $jeton = Webhook::jetonDeVerification($corps);
        if ($jeton !== null && $signature === null) {
            return $this->poigneeDeMain($r, $config, $jeton);
        }

        // ---- Signature : la seule authentification de cette route ---------
        // Sur le corps BRUT, à temps constant, dans `Webhook`. Rien avant.
        if (!Webhook::signatureValide($brut, $signature, $config->secretWebhook())) {
            return $this->refuser($r, 'signature invalide ou absente');
        }

        // ================= À PARTIR D'ICI, LA REQUÊTE EST AUTHENTIQUE ======

        // Tentative de piloter un champ interdit : tracée, jamais appliquée.
        $interdits = self::champsInterdits($corps);
        if ($interdits !== []) {
            $this->tracerChampsInterdits($corps, $interdits);
        }

        $type = strtolower((string) ($corps['type'] ?? ''));

        // Une suppression côté Notion ne supprime RIEN côté boutique. On
        // acquitte (200) pour que Notion cesse de la renvoyer, et on le dit.
        if (str_contains($type, 'deleted')) {
            Db::journaliserStatique(
                '[notion-webhook] Événement « ' . $type . ' » acquitté sans effet : '
                . 'Notion ne supprime jamais une commande.'
            );

            return self::accuse();
        }

        // ---- Idempotence, au niveau de la LIVRAISON -----------------------
        // Marquée AVANT le traitement : deux rejeux qui se chevauchent ne
        // doivent pas partir tous les deux en lecture réseau. Un rejeu écarté
        // ne perd rien — le miroir est convergent et `POST /notion/renvoyer`
        // rattrape tout ce qui aurait été manqué.
        if (!$this->premiereReception($corps, $brut)) {
            return self::accuse();
        }

        $pages = Webhook::pagesConcernees($corps);
        if (count($pages) > self::PAGES_MAX) {
            Db::journaliserStatique(sprintf(
                '[notion-webhook] Livraison de %d pages écrêtée à %d ; le reste sera '
                . 'rattrapé par POST /notion/renvoyer.',
                count($pages),
                self::PAGES_MAX,
            ));
            $pages = array_slice($pages, 0, self::PAGES_MAX);
        }

        // ---- Réponse d'abord, travail ensuite -----------------------------
        if ($pages !== []) {
            $this->prechaufferJournal();
            $this->differer($pages);
        }

        return self::accuse();
    }

    // =====================================================================
    // Traitement — appelé APRÈS l'envoi de la réponse
    // =====================================================================

    /**
     * Applique les pages reçues. Public pour être éprouvable directement en
     * ligne de commande, sans serveur HTTP ; le chemin HTTP passe par
     * `differer()`.
     *
     * AUCUNE exception ne remonte : ce code s'exécute quand la réponse est
     * déjà partie, une exception n'aurait plus personne à qui parler et
     * disparaîtrait. Chaque page est isolée des autres.
     *
     * @param array<int,string> $pages
     * @return array<string,string> pageId → raison, pour le journal et les preuves
     */
    public function traiterPages(array $pages): array
    {
        $miroir = new MiroirCommandes($this->db);
        $resultats = [];

        foreach ($pages as $pageId) {
            try {
                // Le miroir relit la page chez Notion et n'en retient que les
                // quatre champs de suivi. C'est LUI qui refuse un statut
                // inconnu et qui ignore une page hors périmètre — cette porte
                // ne redécide rien.
                $issue = $miroir->appliquerPageEntrante($pageId);
                $resultats[$pageId] = (string) $issue['raison'];

                if ($issue['applique'] !== true) {
                    // Rendre visible ce qui n'a pas été appliqué : une
                    // dégradation silencieuse masque ses pannes (AGENTS.md §7).
                    Db::journaliserStatique(sprintf(
                        '[notion-webhook] Page %s non appliquée — %s.',
                        self::abreger($pageId),
                        $issue['raison'],
                    ));
                }
            } catch (Throwable $e) {
                $resultats[$pageId] = 'anomalie';
                Db::journaliserStatique(sprintf(
                    '[notion-webhook] Anomalie sur la page %s — %s',
                    self::abreger($pageId),
                    $e->getMessage(),
                ));
            }
        }

        return $resultats;
    }

    // =====================================================================
    // Poignée de main d'abonnement
    // =====================================================================

    /**
     * Premier appel de Notion : `{"verification_token": "…"}`, sans signature.
     *
     * DÉCISION DE SÉCURITÉ, la plus importante de ce fichier après la
     * signature. Cet appel n'est PAS authentifié — par construction, puisqu'il
     * transporte le secret qui servira à authentifier les suivants. Accepter
     * de le rejouer n'importe quand reviendrait à offrir à n'importe qui le
     * droit de REMPLACER notre secret par le sien, donc de signer ensuite des
     * changements de statut parfaitement valides. Ce serait la faille.
     *
     * La porte n'accepte donc un jeton que s'il n'y en a AUCUN d'enregistré.
     * Le remplacement existe, mais il passe par une action authentifiée du
     * propriétaire (l'écran Notion, `Configuration::oublier()`), jamais par un
     * inconnu qui frappe l'URL.
     *
     * La réponse est la MÊME dans les deux cas (200 muet) : un attaquant ne
     * doit pas pouvoir déduire de sa tentative qu'un abonnement est déjà en
     * place. Le refus, lui, est tracé côté serveur.
     *
     * OÙ EST RANGÉ LE JETON : `Configuration::enregistrerSecretWebhook()`, donc
     * `settings.notion.webhookSecret`, CHIFFRÉ par `Coffre` (AES-256-GCM,
     * préfixe `ntnc1:`) exactement comme le jeton d'API. C'est ce qui le tient
     * hors d'une sauvegarde téléchargeable (docs/NOTION.md §5). Il est relu par
     * `Configuration::secretWebhook()`, que `GET /notion/status` peut appeler
     * pour l'afficher au commerçant — l'affichage est le travail de l'autre
     * agent, le rangement est le mien.
     */
    private function poigneeDeMain(Requete $r, Configuration $config, string $jeton): Reponse
    {
        // Une route publique qui écrit en base : elle se plafonne, comme les
        // autres (compteur distinct, cf. ACTION_LIMITEUR_ABONNEMENT).
        $this->limiter($r, self::ACTION_LIMITEUR_ABONNEMENT);

        if ($config->secretWebhook() !== null) {
            Db::journaliserStatique(
                '[notion-webhook] Poignée de main refusée : un secret est déjà enregistré. '
                . 'Pour re-créer l\'abonnement, effacer d\'abord la configuration Notion '
                . 'depuis l\'écran d\'administration.'
            );

            return self::accuse();
        }

        $config->enregistrerSecretWebhook($jeton);

        // Audit : la mise en service est un fait métier, son volume est borné
        // par le limiteur. Le jeton lui-même n'y figure évidemment pas — et
        // `Journal` filtrerait de toute façon toute clé contenant « token ».
        Journal::consigner($this->db, 'notion_webhook_abonnement', 'notion', [
            'enregistre' => true,
            // Empreinte tronquée : permet de vérifier qu'on parle du même
            // jeton que celui affiché dans Notion, sans jamais le divulguer.
            'empreinte' => substr(hash('sha256', $jeton), 0, 12),
        ]);

        return self::accuse();
    }

    // =====================================================================
    // Refus
    // =====================================================================

    /**
     * Refus uniforme. Même statut, même code, même message, quelle que soit la
     * cause : signature absente, fausse, corps modifié d'un octet, secret pas
     * encore enregistré. La cause n'est écrite QUE dans le journal serveur.
     *
     * Le limiteur est appelé ICI et nulle part ailleurs sur le chemin
     * authentique : il ne compte donc que les échecs. Une boutique très
     * active ne peut pas se faire verrouiller son propre webhook par le
     * volume de ses commandes — seul quelqu'un qui échoue est ralenti.
     */
    private function refuser(Requete $r, string $cause): Reponse
    {
        // Peut lever un 429 : c'est voulu, et c'est la seule différence
        // observable — elle ne dépend que du comportement de l'appelant.
        $this->limiter($r, self::ACTION_LIMITEUR);

        Db::journaliserStatique(sprintf(
            '[notion-webhook] Refus — %s | IP_hash=%s',
            $cause,
            // L'IP n'est pas écrite en clair, comme dans `Limiteur` : une
            // trace de sécurité ne doit pas devenir une base d'adresses.
            substr(hash('sha256', $r->ip()), 0, 16),
        ));

        throw ApiException::nonAuthentifie('Requête refusée.');
    }

    /**
     * Applique `KaTech\Limiteur` en reformulant son refus.
     *
     * `Limiteur` sert « Identifiants invalides. » par défaut — discrétion utile
     * sur `/auth/login`, hors sujet ici. On garde le 429 (l'appelant DOIT
     * savoir qu'il doit ralentir) sans nommer ce qui est protégé.
     *
     * L'axe « cible » est une constante et non l'IP : c'est un plafond GLOBAL
     * sur les échecs, qui tient donc aussi face à une attaque distribuée où
     * chaque adresse reste sous son propre quota.
     */
    private function limiter(Requete $r, string $action): void
    {
        try {
            (new Limiteur($this->db))->verifier($r->ip(), $action, $action);
        } catch (ApiException $e) {
            if ($e->statut() !== 429) {
                throw $e;
            }

            throw new ApiException(429, 'TROP_DE_REQUETES', 'Trop de requêtes. Réessayez plus tard.');
        }
    }

    // =====================================================================
    // Champs interdits
    // =====================================================================

    /**
     * Cherche, dans TOUT le corps (clés et valeurs textuelles, à n'importe
     * quelle profondeur), la trace d'une tentative de piloter un champ que
     * Notion ne possède pas.
     *
     * On inspecte aussi les VALEURS parce qu'une livraison Notion nomme les
     * propriétés modifiées dans des valeurs, pas dans des clés :
     * `{"data":{"updated_properties":["Total (DA)"]}}`.
     *
     * @param array<string,mixed> $corps
     * @return array<int,string> les termes interdits rencontrés, dédoublonnés
     */
    public static function champsInterdits(array $corps): array
    {
        $mots = [];
        self::aplatir($corps, $mots);

        $trouves = [];
        foreach ($mots as $mot) {
            foreach (self::CHAMPS_INTERDITS as $interdit) {
                if (str_contains($mot, $interdit)) {
                    $trouves[$interdit] = true;
                }
            }
        }

        return array_keys($trouves);
    }

    /**
     * Récolte clés et valeurs scalaires, normalisées (minuscules, accents et
     * séparateurs retirés) : « Total (DA) », « TOTAL_DA » et « total-da »
     * doivent tous tomber sur le même terme.
     *
     * @param mixed $noeud
     * @param array<int,string> $mots
     */
    private static function aplatir(mixed $noeud, array &$mots, int $profondeur = 0): void
    {
        // Un corps profondément imbriqué est aussi une attaque : on borne.
        if ($profondeur > 8 || count($mots) > 500) {
            return;
        }

        if (is_array($noeud)) {
            foreach ($noeud as $cle => $valeur) {
                if (is_string($cle)) {
                    $mots[] = self::normaliser($cle);
                }
                self::aplatir($valeur, $mots, $profondeur + 1);
            }

            return;
        }

        if (is_string($noeud) && $noeud !== '' && strlen($noeud) <= 120) {
            $mots[] = self::normaliser($noeud);
        }
    }

    private static function normaliser(string $v): string
    {
        $v = strtolower($v);
        $v = strtr($v, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'à' => 'a', 'ç' => 'c', 'û' => 'u', 'î' => 'i', 'ô' => 'o']);

        return (string) preg_replace('/[^a-z0-9_]+/', '_', $v);
    }

    /**
     * Trace la tentative dans le journal d'audit du commerçant.
     *
     * Ici — et seulement ici — `audit_logs` est le bon endroit : la requête est
     * AUTHENTIFIÉE (signature valide), son volume est donc celui de Notion, et
     * « quelqu'un a essayé de changer un prix depuis Notion » est exactement le
     * genre de fait qu'un commerçant doit pouvoir retrouver six mois plus tard.
     *
     * @param array<string,mixed> $corps
     * @param array<int,string> $interdits
     */
    private function tracerChampsInterdits(array $corps, array $interdits): void
    {
        $liste = implode(', ', $interdits);
        $pages = Webhook::pagesConcernees($corps);

        Db::journaliserStatique(
            '[notion-webhook] Champs refusés (Notion ne pilote que le suivi) : ' . $liste
            . ' | pages=' . implode(',', array_map(self::abreger(...), $pages))
        );

        Journal::consigner($this->db, 'notion_webhook_champ_refuse', 'order', [
            // Attention : `Journal` filtre toute clé contenant « hash »,
            // « token » ou « secret ». D'où « champs » et « pages », des noms
            // qui disent ce qu'ils portent et qui traversent le filtre.
            'champs' => $interdits,
            'pages' => array_map(self::abreger(...), $pages),
            'applique' => false,
        ]);
    }

    // =====================================================================
    // Idempotence
    // =====================================================================

    /**
     * Vrai si cette livraison n'a jamais été acquittée ; la mémorise au passage.
     *
     * CLÉ : l'identifiant de livraison quand Notion en fournit un (chaque envoi
     * en a un, distinct même pour deux événements sur la même page), sinon
     * l'empreinte du corps brut. Deux livraisons authentiques différentes ont
     * donc toujours deux clés différentes : on n'écarte jamais un vrai
     * changement, seulement un rejeu à l'octet près.
     *
     * La mémoire est bornée dans le temps (15 min) ET en taille (200 entrées) :
     * une route publique ne doit pas pouvoir faire grossir une ligne de
     * `settings` indéfiniment.
     *
     * @param array<string,mixed> $corps
     */
    private function premiereReception(array $corps, string $brut): bool
    {
        $id = $corps['id'] ?? null;
        $cle = is_string($id) && $id !== ''
            ? substr(hash('sha256', 'id:' . $id), 0, 32)
            : substr(hash('sha256', 'corps:' . $brut), 0, 32);

        $maintenant = time();

        try {
            $ligne = $this->db->un(
                'SELECT payload FROM settings WHERE scope = :scope',
                [':scope' => self::SCOPE_RECEPTIONS],
            );
            $payload = $ligne === null ? [] : Db::dejson($ligne['payload'] ?? null, []);
            $vues = is_array($payload) && is_array($payload['vues'] ?? null) ? $payload['vues'] : [];

            // Purge par âge, puis par nombre : les plus anciennes d'abord.
            foreach ($vues as $k => $t) {
                if (!is_int($t) || $t < $maintenant - self::TTL_RECEPTION) {
                    unset($vues[$k]);
                }
            }

            if (isset($vues[$cle])) {
                Db::journaliserStatique('[notion-webhook] Rejeu écarté (livraison déjà acquittée).');

                return false;
            }

            $vues[$cle] = $maintenant;
            if (count($vues) > self::MEMOIRE_RECEPTIONS) {
                asort($vues);
                $vues = array_slice($vues, -self::MEMOIRE_RECEPTIONS, null, true);
            }

            $this->db->upsert(
                'settings',
                [
                    'scope' => self::SCOPE_RECEPTIONS,
                    'payload' => Db::json(['vues' => $vues]),
                    'updated_at' => gmdate('c'),
                ],
                ['scope'],
                ['payload', 'updated_at'],
            );
        } catch (Throwable $e) {
            // Le dédoublonnage est une OPTIMISATION de sûreté, pas la sûreté
            // elle-même : le miroir est convergent, un rejeu traité deux fois
            // ne produit pas deux effets. Si la mémoire est indisponible, on
            // traite — perdre un événement serait pire que le voir deux fois.
            Db::journaliserStatique('[notion-webhook] Mémoire des livraisons indisponible : ' . $e->getMessage());
        }

        return true;
    }

    // =====================================================================
    // Outillage
    // =====================================================================

    /**
     * Ouvre la session AVANT l'envoi de la réponse, pour que le journal
     * d'audit reste possible APRÈS.
     *
     * CE N'EST PAS UNE PRÉCAUTION THÉORIQUE — c'est un défaut mesuré, puis
     * corrigé. `Journal::consigner()` résout son acteur par
     * `Auth\Session::utilisateur()`, qui appelle `session_start()`, qui pose un
     * cookie, donc un EN-TÊTE. Or le traitement est différé après l'envoi de la
     * réponse : les en-têtes sont partis, `Session::demarrer()` lève, et
     * `Journal` — qui n'a pas le droit de faire échouer l'opération métier —
     * avale l'exception. Résultat observé avant ce correctif : la commande
     * était bien mise à jour, mais la ligne `notion_suivi_recu` du journal
     * d'audit N'ÉTAIT JAMAIS ÉCRITE. Un changement venu de Notion devenait
     * invisible — exactement l'échec silencieux qu'AGENTS.md §7 interdit.
     *
     * Réchauffer la session ici la rend ACTIVE ; `Session::demarrer()` sort
     * alors immédiatement pendant le traitement différé, sans toucher aux
     * en-têtes, et l'audit passe.
     *
     * Appelé UNIQUEMENT sur le chemin authentifié : une route publique ne doit
     * pas pouvoir faire créer un fichier de session par requête anonyme.
     */
    private function prechaufferJournal(): void
    {
        try {
            Session::demarrer();
        } catch (Throwable $e) {
            // Sessions indisponibles sur cet hébergement : le suivi reste
            // appliqué, seule la ligne d'audit manquera. On le dit.
            Db::journaliserStatique(
                '[notion-webhook] Journal d\'audit indisponible pour cette livraison : ' . $e->getMessage()
            );
        }
    }

    /**
     * Enregistre le traitement en fin de script (garantie 5).
     *
     * Même mécanique que `Outbox::enregistrerVidageEnSortie()`, et mêmes
     * limites : sous FastCGI/LiteSpeed (production) `fastcgi_finish_request()`
     * rend la main au client avant le premier appel réseau ; sous le serveur
     * intégré `php -S`, qui n'a pas cette fonction, le client attend la fin du
     * script. C'est une limite connue du serveur de développement, pas un
     * défaut de conception.
     *
     * @param array<int,string> $pages
     */
    private function differer(array $pages): void
    {
        $controleur = $this;

        register_shutdown_function(static function () use ($controleur, $pages): void {
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            } elseif (!headers_sent()) {
                flush();
            }

            $controleur->traiterPages($pages);
        });
    }

    /**
     * Accusé de réception. Réponse UNIQUE de tout le chemin authentique : rien
     * dans ce corps ne dépend de ce qui existe côté boutique.
     */
    private static function accuse(): Reponse
    {
        return Reponse::ok(['recu' => true]);
    }

    /**
     * Les OCTETS reçus, jamais un tableau ré-encodé. `php://input` est
     * relisible depuis PHP 5.6, y compris après `Requete::depuisGlobals()`.
     */
    private static function corpsBrut(): string
    {
        return (string) file_get_contents('php://input');
    }

    /**
     * Décodage défensif. Rend null — jamais une exception — sur un corps
     * illisible : la décision de refuser appartient à `recevoir()`, qui la
     * rendra muette comme toutes les autres.
     *
     * @return array<string,mixed>|null
     */
    private static function decoder(string $brut): ?array
    {
        if (trim($brut) === '') {
            return null;
        }

        $decode = json_decode($brut, true, 32);

        return is_array($decode) ? $decode : null;
    }

    /** Identifiant abrégé : suffisant pour corréler deux lignes de journal. */
    private static function abreger(string $id): string
    {
        return strlen($id) > 12 ? substr($id, 0, 8) . '…' : $id;
    }
}
