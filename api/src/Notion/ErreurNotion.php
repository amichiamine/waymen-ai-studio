<?php

/**
 * Erreur normalisée du miroir Notion.
 *
 * POURQUOI UNE CLASSE À PART plutôt que `ApiException` :
 * `ApiException` est le vocabulaire du CONTRAT HTTP de notre API (400, 404,
 * 409…). Une panne Notion n'est pas une erreur du client de notre API : le
 * commerçant a bien envoyé sa requête, c'est le miroir qui ne suit pas. Les
 * routes `/notion/*` (écrites par un autre agent) traduiront ces erreurs en
 * réponses HTTP comme elles l'entendent ; le consommateur d'outbox, lui, ne
 * veut qu'un message à ranger dans `outbox.last_error`.
 *
 * RÈGLE ABSOLUE (AGENTS.md §7) : le message est destiné à un COMMERÇANT NON
 * TECHNIQUE. Il nomme la cause ET le geste correctif. Il ne contient jamais :
 *   - de code HTTP brut (« erreur 401 » ne dit rien à personne) ;
 *   - de jargon (« unauthorized », « object_not_found », « payload ») ;
 *   - le jeton, ni aucun fragment du jeton.
 * Le détail technique existe quand même — dans `$detailTechnique`, qui part
 * au journal serveur, jamais vers le navigateur.
 */

declare(strict_types=1);

namespace KaTech\Notion;

use RuntimeException;
use Throwable;

final class ErreurNotion extends RuntimeException
{
    /** Aucun jeton enregistré : l'intégration n'a jamais été mise en service. */
    public const NON_CONFIGURE = 'NOTION_NON_CONFIGURE';

    /** Jeton refusé, révoqué ou mal recopié. */
    public const TOKEN_INVALIDE = 'NOTION_TOKEN_INVALIDE';

    /** La page ou la base existe, mais l'intégration n'y a pas été invitée. */
    public const NON_PARTAGE = 'NOTION_NON_PARTAGE';

    /** L'objet visé n'existe plus (supprimé, mis à la corbeille). */
    public const INTROUVABLE = 'NOTION_INTROUVABLE';

    /** Débit dépassé (429) ou Notion saturé (529). Réessayable tel quel. */
    public const DEBIT_DEPASSE = 'NOTION_DEBIT_DEPASSE';

    /** Réseau coupé, DNS muet, TLS refusé, délai dépassé, panne Notion. */
    public const INJOIGNABLE = 'NOTION_INJOIGNABLE';

    /** Notion a compris la demande et l'a refusée (colonne renommée, valeur hors liste…). */
    public const REFUSE = 'NOTION_REFUSE';

    /** Réponse illisible : ce n'est pas du JSON, ou pas la forme attendue. */
    public const REPONSE_ILLISIBLE = 'NOTION_REPONSE_ILLISIBLE';

    /**
     * @param string   $codeNotion      Une des constantes ci-dessus. Le nom évite la collision
     *                                  avec `Exception::$code`, qui n'est pas readonly.
     * @param string   $message         Phrase destinée au commerçant.
     * @param int|null $attendreSecondes Délai annoncé par Notion (`Retry-After`), en secondes.
     * @param string   $detailTechnique Pour le journal serveur UNIQUEMENT. Déjà expurgé du jeton.
     */
    public function __construct(
        public readonly string $codeNotion,
        string $message,
        public readonly ?int $attendreSecondes = null,
        public readonly string $detailTechnique = '',
        ?Throwable $precedente = null,
    ) {
        parent::__construct($message, 0, $precedente);
    }

    /**
     * Vrai si réessayer plus tard a une chance d'aboutir sans intervention
     * humaine. Le consommateur d'outbox s'en sert pour choisir entre « je
     * repose l'événement en file » et « je le laisse échouer visiblement ».
     */
    public function estTemporaire(): bool
    {
        return in_array($this->codeNotion, [self::DEBIT_DEPASSE, self::INJOIGNABLE], true);
    }

    // ---------------------------------------------------------------------
    // Fabriques — un seul endroit décide de la formulation, pour que les trois
    // agents suivants n'aient pas à réinventer (et à dégrader) les messages.
    // ---------------------------------------------------------------------

    public static function nonConfigure(): self
    {
        return new self(
            self::NON_CONFIGURE,
            'Notion n\'est pas encore relié à votre boutique. Ouvrez l\'écran Notion de '
            . 'l\'administration et enregistrez la clé de connexion pour activer le miroir.',
        );
    }

    public static function tokenInvalide(string $detail = ''): self
    {
        return new self(
            self::TOKEN_INVALIDE,
            'Notion refuse la clé de connexion enregistrée. Elle a peut-être été recopiée '
            . 'incomplètement, ou révoquée depuis Notion. Dans Notion, ouvrez « Paramètres » → '
            . '« Connexions » → votre connexion, copiez la clé interne en entier (elle commence '
            . 'par « ntn_ »), puis enregistrez-la de nouveau dans l\'écran Notion.',
            null,
            $detail,
        );
    }

    public static function nonPartage(string $quoi, string $detail = ''): self
    {
        return new self(
            self::NON_PARTAGE,
            sprintf(
                'Notion connaît %s mais interdit à votre boutique d\'y toucher : la connexion '
                . 'n\'y a pas été invitée. Dans Notion, ouvrez la page concernée, cliquez sur '
                . '« ••• » en haut à droite, puis « Connexions » → ajoutez votre connexion. '
                . 'Revenez ensuite ici et réessayez.',
                $quoi,
            ),
            null,
            $detail,
        );
    }

    public static function introuvable(string $quoi, string $detail = ''): self
    {
        return new self(
            self::INTROUVABLE,
            sprintf(
                '%s n\'existe plus dans Notion : la page a été supprimée ou mise à la corbeille. '
                . 'Depuis l\'écran Notion de l\'administration, recréez le tableau des commandes '
                . 'ou rattachez-en un autre.',
                ucfirst($quoi),
            ),
            null,
            $detail,
        );
    }

    public static function debitDepasse(?int $attendreSecondes, string $detail = ''): self
    {
        $delai = $attendreSecondes !== null && $attendreSecondes > 0
            ? sprintf(' La synchronisation reprend automatiquement dans %d seconde(s).', $attendreSecondes)
            : ' La synchronisation reprend automatiquement dans quelques instants.';

        return new self(
            self::DEBIT_DEPASSE,
            'Notion demande de ralentir : trop de modifications lui ont été envoyées coup sur coup.'
            . $delai . ' Vos commandes sont enregistrées et rien n\'est perdu.',
            $attendreSecondes,
            $detail,
        );
    }

    public static function injoignable(string $detail = ''): self
    {
        return new self(
            self::INJOIGNABLE,
            'Notion ne répond pas pour le moment. Vos commandes continuent d\'être enregistrées '
            . 'normalement ; elles seront recopiées dans Notion dès qu\'il répondra de nouveau. '
            . 'Si cela dure, vérifiez l\'état de Notion sur status.notion.so.',
            null,
            $detail,
        );
    }

    public static function refuse(string $detail = ''): self
    {
        return new self(
            self::REFUSE,
            'Notion a refusé la modification du tableau des commandes. C\'est généralement le '
            . 'signe qu\'une colonne du tableau a été renommée ou supprimée à la main dans Notion. '
            . 'Rétablissez les colonnes d\'origine, ou recréez le tableau depuis l\'écran Notion.',
            null,
            $detail,
        );
    }

    public static function reponseIllisible(string $detail = ''): self
    {
        return new self(
            self::REPONSE_ILLISIBLE,
            'La réponse reçue de Notion est incompréhensible. Cela arrive quand un équipement du '
            . 'réseau (pare-feu, proxy de l\'hébergeur) s\'intercale sur la connexion. Réessayez ; '
            . 'si le problème persiste, demandez à l\'hébergeur d\'autoriser les appels sortants '
            . 'en HTTPS vers api.notion.com.',
            null,
            $detail,
        );
    }
}
