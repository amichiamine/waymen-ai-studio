<?php

/**
 * Configuration du miroir Notion — lecture/écriture de `settings` (scope « notion »).
 *
 * POURQUOI `settings` ET PAS UNE TABLE DÉDIÉE : `settings` existe déjà, porte
 * exactement cette responsabilité (`scope` + `payload` JSON) et n'impose aucun
 * changement de schéma. La seule chose qui manquait, c'est la protection du
 * secret — d'où `Coffre` (S13).
 *
 * INVARIANT DE SÉCURITÉ, à ne jamais relâcher :
 *   - `payload.token` contient une valeur CHIFFRÉE, jamais le jeton en clair ;
 *   - `etat()` — ce que verra `GET /notion/status` — ne contient AUCUN champ
 *     dérivé du jeton Notion (API), pas même tronqué. Le `jetonVerification`
 *     présent dans `etat()` est un SECRET DIFFÉRENT : le jeton de poignée de
 *     main webhook, renvoyé uniquement au rang owner pour la saisie unique dans
 *     le portail Notion. Il ne dérive pas du jeton Notion.
 *
 * INVARIANT D'ADDITIVITÉ : tant qu'aucune ligne « notion » n'existe dans
 * `settings`, TOUT ce module se comporte comme s'il n'était pas là. Aucune
 * requête réseau, aucune écriture, aucune trace au journal. C'est la
 * condition posée par la consigne (« Notion non configuré → aucun effet de
 * bord ») et c'est aussi ce qui rend la mise à jour sans risque pour une
 * boutique qui n'utilisera jamais Notion.
 */

declare(strict_types=1);

namespace KaTech\Notion;

use KaTech\Db;
use KaTech\Env;

final class Configuration
{
    /** Valeur de `settings.scope`. */
    public const SCOPE = 'notion';

    /**
     * URL de base de l'API, surchargeable par `NOTION_API_BASE`.
     *
     * C'est le point d'entrée du faux Notion (api/tools/faux-notion.php) : en
     * développement on pointe vers http://127.0.0.1:8261 et rien d'autre ne
     * change dans le code. En production, la variable reste vide.
     */
    public static function baseApi(): string
    {
        $v = trim((string) Env::get('NOTION_API_BASE', ''));

        return $v !== '' ? rtrim($v, '/') : ClientNotion::BASE_PAR_DEFAUT;
    }

    /** @param array<string,mixed> $payload */
    private function __construct(
        private readonly Db $db,
        private array $payload,
    ) {
    }

    /**
     * Charge la configuration. N'échoue jamais : une absence de ligne donne
     * une configuration vide, c'est-à-dire « Notion n'est pas branché ».
     */
    public static function charger(Db $db): self
    {
        $ligne = $db->un(
            'SELECT payload FROM settings WHERE scope = :scope',
            [':scope' => self::SCOPE],
        );

        $payload = $ligne === null ? [] : Db::dejson($ligne['payload'] ?? null, []);

        return new self($db, is_array($payload) ? $payload : []);
    }

    // ---- Lecture --------------------------------------------------------

    /** Un jeton est enregistré ET déchiffrable. */
    public function estConfigure(): bool
    {
        return $this->token() !== null;
    }

    /** Le tableau des commandes est créé (ou rattaché) : on sait où écrire. */
    public function estRelie(): bool
    {
        return $this->estConfigure() && $this->dataSourceId() !== null;
    }

    /**
     * Interrupteur marche/arrêt (`PATCH /notion/parametres`).
     *
     * Le défaut est VRAI : quelqu'un qui vient d'enregistrer un jeton et de
     * créer un tableau s'attend à ce que ça marche, pas à devoir armer un
     * second interrupteur. L'arrêt est un geste explicite.
     */
    public function estActif(): bool
    {
        return (bool) ($this->payload['actif'] ?? true);
    }

    /** Le miroir doit-il vraiment écrire ? Le seul test à faire avant d'agir. */
    public function miroirOperationnel(): bool
    {
        return $this->estRelie() && $this->estActif();
    }

    /** Jeton en clair, ou null. Ne JAMAIS le renvoyer au navigateur ni le journaliser. */
    public function token(): ?string
    {
        $ferme = $this->payload['token'] ?? null;

        return Coffre::ouvrir(is_string($ferme) ? $ferme : null);
    }

    public function dataSourceId(): ?string
    {
        $v = $this->payload['dataSourceId'] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }

    public function databaseId(): ?string
    {
        $v = $this->payload['databaseId'] ?? null;

        return is_string($v) && $v !== '' ? $v : null;
    }

    /** Secret de vérification du webhook, en clair. Chiffré au repos comme le jeton. */
    public function secretWebhook(): ?string
    {
        $ferme = $this->payload['webhookSecret'] ?? null;

        return Coffre::ouvrir(is_string($ferme) ? $ferme : null);
    }

    /**
     * Client HTTP prêt à l'emploi, ou null si aucun jeton n'est enregistré.
     * Rendre null plutôt que lever : l'appelant normal est un consommateur
     * d'outbox qui doit se taire quand Notion n'est pas configuré.
     */
    public function client(): ?ClientNotion
    {
        $token = $this->token();

        return $token === null ? null : new ClientNotion($token, self::baseApi());
    }

    /**
     * État destiné à `GET /notion/status`. Aucun secret d'API, par construction.
     *
     * Le jeton de vérification du webhook (`webhookSecret`) est un secret
     * DIFFÉRENT du jeton Notion : il sert à confirmer l'abonnement webhook une
     * seule fois dans le portail Notion. Il est exposé ici UNIQUEMENT au rang
     * `owner` (la garde `resetData` dans `api/routes.php` l'impose).
     *
     * Invariants maintenus :
     *   - Le jeton Notion (API) n'est JAMAIS dans cet état.
     *   - `jetonVerification` n'est que le secret de poignée de main initiale.
     *   - Renvoyé sur session authentifiée owner uniquement (garde dans routes.php).
     *
     * @param int $enAttente Nombre d'événements Notion en attente (fourni par l'appelant :
     *                       la Configuration ne connaît pas l'outbox).
     * @return array<string,mixed>
     */
    public function etat(int $enAttente = 0): array
    {
        return [
            'configure' => $this->estConfigure(),
            'relie' => $this->estRelie(),
            'actif' => $this->estActif(),
            'espace' => $this->payload['espace'] ?? null,
            'baseTitre' => $this->payload['baseTitre'] ?? null,
            'baseUrl' => $this->payload['baseUrl'] ?? null,
            'databaseId' => $this->databaseId(),
            'dataSourceId' => $this->dataSourceId(),
            'derniereVerification' => $this->payload['verifieAt'] ?? null,
            'derniereErreur' => $this->payload['derniereErreur'] ?? null,
            'enAttente' => $enAttente,
            // Jeton de vérification webhook : uniquement au rang owner, pour
            // la saisie unique dans le portail Notion lors de la poignée de main.
            'jetonVerification' => $this->secretWebhook(),
        ];
    }

    // ---- Écriture -------------------------------------------------------

    /**
     * Enregistre le jeton, CHIFFRÉ. À n'appeler qu'APRÈS l'avoir testé
     * (`ClientNotion::verifierToken()`) : enregistrer un jeton faux ne rend
     * service à personne et ferait échouer toutes les commandes suivantes.
     */
    public function enregistrerToken(string $token, ?string $espace): void
    {
        $this->payload['token'] = Coffre::fermer(trim($token));
        $this->payload['espace'] = $espace;
        $this->payload['verifieAt'] = gmdate('c');
        $this->payload['derniereErreur'] = null;
        $this->ecrire();
    }

    public function enregistrerBase(string $databaseId, string $dataSourceId, ?string $titre, ?string $url): void
    {
        $this->payload['databaseId'] = $databaseId;
        $this->payload['dataSourceId'] = $dataSourceId;
        $this->payload['baseTitre'] = $titre;
        $this->payload['baseUrl'] = $url;
        $this->payload['derniereErreur'] = null;
        $this->ecrire();
    }

    public function enregistrerSecretWebhook(string $secret): void
    {
        $this->payload['webhookSecret'] = Coffre::fermer(trim($secret));
        $this->ecrire();
    }

    public function definirActif(bool $actif): void
    {
        $this->payload['actif'] = $actif;
        $this->ecrire();
    }

    /**
     * Mémorise la dernière erreur pour que l'écran Notion l'affiche.
     *
     * AGENTS.md §7 : une dégradation gracieuse SILENCIEUSE masque ses pannes.
     * Le journal seul ne suffit pas — un commerçant ne lit pas les journaux du
     * serveur. Cette valeur est ce qui rend l'échec visible dans l'interface.
     */
    public function noterErreur(?string $message): void
    {
        $this->payload['derniereErreur'] = $message;
        $this->payload['derniereErreurAt'] = $message === null ? null : gmdate('c');
        $this->ecrire();
    }

    /**
     * Efface tout — utile à une route de déconnexion et aux tests.
     * On supprime la LIGNE : « non configuré » doit être un état sans résidu.
     */
    public function oublier(): void
    {
        $this->payload = [];
        $this->db->run('DELETE FROM settings WHERE scope = :scope', [':scope' => self::SCOPE]);
    }

    private function ecrire(): void
    {
        $this->db->upsert(
            'settings',
            [
                'scope' => self::SCOPE,
                'payload' => Db::json($this->payload),
                'updated_at' => gmdate('c'),
            ],
            ['scope'],
            ['payload', 'updated_at'],
        );
    }
}
