<?php

/**
 * Notion — configuration de l'intégration miroir.
 *
 * Routes câblées ici :
 *   GET   /notion/status     → etat()
 *   POST  /notion/token      → enregistrerToken()
 *   GET   /notion/pages      → listerPages()
 *   POST  /notion/base       → creerBase()
 *   PATCH /notion/parametres → parametres()
 *   POST  /notion/renvoyer   → renvoyer()
 *
 * La route POST /notion/webhook est publique et gérée par ControleurNotionWebhook.
 *
 * Toutes les routes ci-dessus sont réservées au rang `owner`.
 * La garde est posée dans api/routes.php (visible, comme pour /maintenance/*).
 *
 * INVARIANT DE SÉCURITÉ (docs/NOTION.md §5) :
 *   - Le jeton n'est JAMAIS renvoyé au navigateur, ni en clair, ni tronqué.
 *   - etat() délègue à Configuration::etat() qui ne contient aucun champ dérivé du jeton.
 *   - enregistrerToken() vérifie d'abord, enregistre ensuite — un jeton invalide
 *     n'écrase jamais un jeton qui fonctionnait.
 *
 * STRATÉGIE ERREURS (docs/NOTION.md §7.2) :
 *   ErreurNotion::getMessage() est déjà rédigé pour un commerçant non technique.
 *   Les routes le renvoient tel quel, sans reformuler ni ajouter de code HTTP brut.
 *   Seules les erreurs temporaires (débit, injoignabilité) rendent 503 ;
 *   les erreurs définitives rendent 422.
 *
 * ZÉRO DUPLICATION : chaque handler appelle les classes du namespace KaTech\Notion.
 * Aucune logique métier n'est réimplémentée ici.
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Auth\Garde;
use KaTech\Db;
use KaTech\Notion\ClientNotion;
use KaTech\Notion\Configuration;
use KaTech\Notion\ErreurNotion;
use KaTech\Notion\MiroirCommandes;
use KaTech\Notion\SchemaCommandes;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurNotion
{
    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /notion/status
     *
     * État synthétique de l'intégration : configuré, relié, actif, espace de
     * travail, identifiant de la base, envois en attente, date de la dernière
     * vérification, dernière erreur connue.
     *
     * JAMAIS le jeton, ni en clair, ni tronqué, ni masqué.
     * Configuration::etat() garantit cette propriété par construction.
     *
     * → { data: { configure, relie, actif, espace, baseTitre, baseUrl,
     *             databaseId, dataSourceId, derniereVerification, derniereErreur, enAttente } }
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     */
    public function etat(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $config = Configuration::charger($this->db);
        $miroir = new MiroirCommandes($this->db);

        return Reponse::ok($config->etat($miroir->nombreEnAttente()));
    }

    /**
     * POST /notion/token
     *
     * Corps attendu : { token: string }
     *
     * PROTOCOLE EN DEUX TEMPS :
     *   1. Vérification auprès de Notion (GET /v1/users/me) — sans écriture.
     *   2. Enregistrement chiffré via Coffre seulement si la vérification réussit.
     *
     * Un jeton invalide n'écrase jamais un jeton qui fonctionnait : la vérification
     * utilise un client construit avec le jeton ENTRANT, et le payload stocké
     * reste intact en cas d'échec.
     *
     * Réponse en cas de succès : l'état complet, incluant le nom de l'espace.
     * JAMAIS le jeton, sous aucune forme.
     *
     * @throws ApiException 422 si le jeton est absent ou invalide
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 503 si Notion est injoignable
     */
    public function enregistrerToken(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $tokenBrut = trim((string) ($r->corps('token', '') ?? ''));
        if ($tokenBrut === '') {
            throw ApiException::validation('Le jeton de connexion Notion est obligatoire.', [
                'token' => ['Ce champ est obligatoire.'],
            ]);
        }

        // Vérification auprès de Notion AVANT tout enregistrement.
        // On construit un client éphémère avec le jeton entrant — aucune écriture en base.
        $client = new ClientNotion($tokenBrut, Configuration::baseApi());

        try {
            $info = $client->verifierToken();
        } catch (ErreurNotion $e) {
            // Traduction : jamais de code HTTP brut ni de détail technique vers le navigateur.
            $statut = $e->estTemporaire() ? 503 : 422;

            return Reponse::erreur($statut, $e->codeNotion, $e->getMessage());
        }

        // Vérification réussie : enregistrement chiffré.
        $config = Configuration::charger($this->db);
        $config->enregistrerToken($tokenBrut, $info['espace'] ?? null);

        $miroir = new MiroirCommandes($this->db);

        return Reponse::ok($config->etat($miroir->nombreEnAttente()));
    }

    /**
     * GET /notion/pages
     *
     * Liste les pages auxquelles la connexion a accès.
     *
     * UNE LISTE VIDE N'EST PAS UNE ERREUR TECHNIQUE : cela signifie que le
     * commerçant n'a pas encore partagé de page avec sa connexion. La réponse
     * doit le dire en clair et guider le geste à faire — c'est le point où un
     * commerçant non technique se perd le plus souvent.
     *
     * → { data: { pages: [{id, titre, url}], message?: string } }
     *
     * @throws ApiException 422 si Notion n'est pas configuré
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 503 si Notion est injoignable
     */
    public function listerPages(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $config = Configuration::charger($this->db);
        $client = $config->client();

        if ($client === null) {
            return Reponse::erreur(
                422,
                ErreurNotion::NON_CONFIGURE,
                'Notion n\'est pas encore relié à votre boutique. Enregistrez d\'abord '
                . 'la clé de connexion dans cet écran.',
            );
        }

        try {
            $pages = $client->listerPages();
        } catch (ErreurNotion $e) {
            $statut = $e->estTemporaire() ? 503 : 422;

            return Reponse::erreur($statut, $e->codeNotion, $e->getMessage());
        }

        if ($pages === []) {
            // La connexion est valide, mais aucune page ne lui a été partagée.
            // Ce n'est pas une panne : c'est un geste à faire dans Notion.
            return Reponse::ok([
                'pages' => [],
                'message' => 'Aucune page n\'est encore accessible depuis votre connexion Notion. '
                    . 'Pour y remédier : ouvrez Notion, accédez à la page sous laquelle vous voulez '
                    . 'créer le tableau des commandes, cliquez sur « ••• » (menu en haut à droite de '
                    . 'la page), choisissez « Connexions », puis ajoutez votre connexion KA Tech Hub. '
                    . 'Revenez ensuite ici et actualisez la liste.',
            ]);
        }

        return Reponse::ok(['pages' => $pages]);
    }

    /**
     * POST /notion/base
     *
     * Corps attendu :
     *   { pageId: string }     → crée une nouvelle base sous cette page
     *   { databaseId: string } → se rattache à une base existante
     *
     * IDEMPOTENCE : un second appel avec le même databaseId déjà enregistré ne
     * crée pas de doublon — il retourne l'état tel quel.
     *
     * RATTACHEMENT : si { databaseId } est fourni, on lit la base existante et
     * on vérifie que toutes les colonnes attendues sont présentes. Les colonnes
     * manquantes sont nommées en clair dans l'avertissement de la réponse.
     *
     * → { data: état + avertissement? }
     *
     * @throws ApiException 422 si les paramètres sont invalides ou si Notion n'est pas configuré
     * @throws ApiException 403 si l'appelant n'est pas owner
     * @throws ApiException 503 si Notion est injoignable
     */
    public function creerBase(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $pageId = trim((string) ($r->corps('pageId', '') ?? ''));
        $databaseId = trim((string) ($r->corps('databaseId', '') ?? ''));

        if ($pageId === '' && $databaseId === '') {
            throw ApiException::validation(
                'Indiquez l\'identifiant de la page parente (pageId) ou d\'une base existante (databaseId).',
                [
                    'pageId'     => ['L\'un de pageId ou databaseId est obligatoire.'],
                    'databaseId' => ['L\'un de pageId ou databaseId est obligatoire.'],
                ],
            );
        }

        $config = Configuration::charger($this->db);
        $client = $config->client();

        if ($client === null) {
            return Reponse::erreur(
                422,
                ErreurNotion::NON_CONFIGURE,
                'Notion n\'est pas encore relié à votre boutique. Enregistrez d\'abord la clé de connexion.',
            );
        }

        // --- IDEMPOTENCE -------------------------------------------------
        // Si pageId est fourni mais qu'une base est déjà enregistrée, on signale
        // sans créer de doublon. Le commerçant peut forcer avec databaseId.
        if ($databaseId === '' && $config->databaseId() !== null) {
            $miroir = new MiroirCommandes($this->db);

            return Reponse::ok(array_merge(
                $config->etat($miroir->nombreEnAttente()),
                [
                    'info' => 'Une base est déjà enregistrée pour cette boutique. '
                        . 'Pour la remplacer par une base existante, fournissez son databaseId. '
                        . 'Pour recréer une nouvelle base, déconnectez d\'abord l\'intégration.',
                ],
            ));
        }

        // Même databaseId que celui déjà enregistré : réponse idempotente.
        if ($databaseId !== '' && $databaseId === $config->databaseId()) {
            $miroir = new MiroirCommandes($this->db);

            return Reponse::ok($config->etat($miroir->nombreEnAttente()));
        }

        $avertissement = null;

        try {
            if ($databaseId !== '') {
                // Rattachement à une base existante.
                $resultat = $client->rattacherBase($databaseId);

                // Vérification des colonnes attendues (S13 : on dit lesquelles manquent).
                $colonnesPresentes = $client->colonnesDataSource($resultat['dataSourceId']);
                $attendues = array_keys(SchemaCommandes::proprietes());
                $manquantes = [];

                foreach ($attendues as $nom) {
                    if (!array_key_exists($nom, $colonnesPresentes)) {
                        $manquantes[] = $nom;
                    }
                }

                if ($manquantes !== []) {
                    $avertissement = 'Les colonnes suivantes sont absentes de la base Notion et '
                        . 'empêcheront le miroir de fonctionner correctement : '
                        . implode(', ', $manquantes)
                        . '. Créez-les dans Notion, ou recréez la base depuis cet écran '
                        . 'en fournissant un pageId (sans databaseId) pour qu\'elle soit '
                        . 'créée automatiquement avec toutes les colonnes requises.';
                }

                $config->enregistrerBase(
                    $resultat['databaseId'],
                    $resultat['dataSourceId'],
                    $resultat['titre'],
                    null,
                );
            } else {
                // Création d'une nouvelle base sous la page parente.
                $resultat = $client->creerBase(
                    $pageId,
                    SchemaCommandes::TITRE_BASE,
                    SchemaCommandes::proprietes(),
                );

                $config->enregistrerBase(
                    $resultat['databaseId'],
                    $resultat['dataSourceId'],
                    SchemaCommandes::TITRE_BASE,
                    $resultat['url'] ?? null,
                );
            }
        } catch (ErreurNotion $e) {
            $statut = $e->estTemporaire() ? 503 : 422;

            return Reponse::erreur($statut, $e->codeNotion, $e->getMessage());
        }

        $miroir = new MiroirCommandes($this->db);
        $etat = $config->etat($miroir->nombreEnAttente());

        if ($avertissement !== null) {
            $etat['avertissement'] = $avertissement;
        }

        return Reponse::ok($etat);
    }

    /**
     * PATCH /notion/parametres
     *
     * Corps attendu : { actif: bool }
     *
     * Éteindre le miroir ne détruit rien : le jeton, la base et les liens
     * restent intacts. Rallumer suffit pour reprendre.
     *
     * → { data: état }
     *
     * @throws ApiException 422 si le corps est invalide
     * @throws ApiException 403 si l'appelant n'est pas owner
     */
    public function parametres(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $actifBrut = $r->corps('actif');
        if (!is_bool($actifBrut)) {
            throw ApiException::validation('Le champ actif doit être un booléen JSON (true ou false).', [
                'actif' => ['Ce champ est obligatoire et doit valoir true ou false.'],
            ]);
        }

        $config = Configuration::charger($this->db);
        $config->definirActif($actifBrut);

        $miroir = new MiroirCommandes($this->db);

        return Reponse::ok($config->etat($miroir->nombreEnAttente()));
    }

    /**
     * POST /notion/renvoyer
     *
     * Relance les envois en retard : commandes sans page Notion, ou dont la
     * dernière poussée a échoué.
     *
     * → { data: { traitees, echecs, reste, messages } }
     *   - traitees : commandes recopiées avec succès ce tour
     *   - echecs   : commandes en échec ce tour
     *   - reste    : true s'il en reste après le lot (il faudra recliquer)
     *   - messages : liste des messages d'erreur distincts
     *
     * @throws ApiException 403 si l'appelant n'est pas owner
     */
    public function renvoyer(Requete $r): Reponse
    {
        Garde::exiger('owner');

        $miroir = new MiroirCommandes($this->db);
        $resultat = $miroir->renvoyer();

        return Reponse::ok($resultat);
    }
}
