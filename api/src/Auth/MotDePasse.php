<?php

/**
 * Hachage des mots de passe — Argon2id, avec repli mesuré sur bcrypt.
 *
 * POURQUOI CE FICHIER EXISTE SOUS CETTE FORME
 *
 * `PASSWORD_ARGON2ID` n'est pas une garantie : la constante n'existe que si PHP
 * a été compilé avec libsodium ou libargon2. Elle est ABSENTE du PHP de
 * l'environnement de développement de ce projet (vérifié : `defined(...)` rend
 * `false`), et elle le sera chez une partie des hébergeurs mutualisés visés.
 *
 * Trois exigences en découlent, toutes implémentées ici :
 *
 *   1. DÉTECTION ET REPLI PROPRE. Argon2id si disponible, bcrypt (coût 12)
 *      sinon. Jamais d'échec, jamais d'affaiblissement muet : le repli est
 *      journalisé UNE FOIS par processus (pas à chaque requête, sinon le
 *      journal serveur devient illisible et l'information se noie).
 *
 *   2. VISIBILITÉ. `diagnostic()` rend l'état de la décision sous forme de
 *      tableau destiné à la réponse de `/health` : un exploitant doit pouvoir
 *      savoir quel algorithme protège les mots de passe de ses clients sans
 *      lire le code ni le journal.
 *
 *   3. RÉVERSIBILITÉ. Un mot de passe haché en bcrypt sur un hébergeur sans
 *      Argon2id doit se re-hacher tout seul en Argon2id le jour où l'extension
 *      apparaît. `verifierEtRehacher()` s'en charge à la connexion suivante :
 *      c'est le seul moment où le mot de passe en clair est disponible.
 *
 * PIÈGE DU REPLI — la limite des 72 octets de bcrypt.
 * bcrypt tronque silencieusement au-delà de 72 octets : « motdepassetrèslong… »
 * et « motdepassetrèslong…XXXX » deviennent le même secret. Un utilisateur
 * croirait avoir une phrase de passe de 90 caractères et n'en aurait que 72.
 * `valider()` REFUSE donc explicitement au-delà de la limite quand bcrypt est
 * actif, plutôt que de laisser la troncature se produire dans le dos.
 *
 * Le hachage produit ici ne sort JAMAIS de la base (AGENTS.md §6) : aucune
 * route ne sélectionne `password_hash` autrement que pour le vérifier.
 */

declare(strict_types=1);

namespace KaTech\Auth;

use KaTech\ApiException;
use KaTech\Db;

final class MotDePasse
{
    /** Longueur minimale imposée, alignée sur celle de `api/install.php`. */
    public const LONGUEUR_MINIMALE = 10;

    /**
     * Plafond général. Sans plafond, un mot de passe d'un mégaoctet transforme
     * chaque tentative de connexion en déni de service (le coût du hachage est
     * linéaire en la taille de l'entrée avant dérivation).
     */
    public const LONGUEUR_MAXIMALE = 200;

    /** Au-delà, bcrypt tronque. Ce n'est pas négociable, c'est le format. */
    private const LONGUEUR_MAXIMALE_BCRYPT = 72;

    /**
     * Coût bcrypt. 12 ≈ 200 ms sur un cœur de mutualisé : assez lent pour
     * décourager une attaque hors ligne, assez rapide pour une connexion.
     */
    private const COUT_BCRYPT = 12;

    /** Vrai une fois que le repli a été signalé dans le journal du serveur. */
    private static bool $repliJournalise = false;

    /** Leurre de comparaison, calculé au plus une fois par processus. */
    private static ?string $leurre = null;

    private function __construct()
    {
    }

    // ------------------------------------------------------------------
    // Détection de l'algorithme
    // ------------------------------------------------------------------

    /** Vrai si ce PHP sait produire de l'Argon2id. */
    public static function argon2idDisponible(): bool
    {
        // `defined()` seul ne suffit pas en théorie : la constante peut exister
        // sans que l'algorithme soit enregistré. `password_algos()` liste les
        // algorithmes RÉELLEMENT utilisables — c'est la source de vérité.
        return defined('PASSWORD_ARGON2ID')
            && in_array((string) PASSWORD_ARGON2ID, password_algos(), true);
    }

    /**
     * Algorithme effectivement retenu, au format attendu par `password_hash()`.
     *
     * Journalise le repli à la première résolution du processus, jamais plus :
     * une ligne de journal par requête HTTP noierait l'information utile.
     */
    public static function algorithme(): string
    {
        if (self::argon2idDisponible()) {
            return (string) PASSWORD_ARGON2ID;
        }

        if (!self::$repliJournalise) {
            self::$repliJournalise = true;
            Db::journaliserStatique(
                'Hachage des mots de passe : Argon2id INDISPONIBLE sur ce PHP '
                . '(ni libsodium ni libargon2 compilés) — repli sur bcrypt coût ' . self::COUT_BCRYPT . '. '
                . 'Les mots de passe restent correctement protégés, mais pour obtenir Argon2id, '
                . 'demandez à l\'hébergeur un PHP compilé avec --with-password-argon2. '
                . 'Le repli est visible dans la réponse de /health (champ « passwordHashing »). '
                . 'Aucune migration ne sera nécessaire : chaque compte sera re-haché automatiquement '
                . 'à sa connexion suivante dès que l\'extension apparaîtra.'
            );
        }

        return (string) PASSWORD_BCRYPT;
    }

    /** Nom lisible de l'algorithme retenu, pour /health et les journaux. */
    public static function nomAlgorithme(): string
    {
        return self::argon2idDisponible() ? 'argon2id' : 'bcrypt';
    }

    /**
     * Options passées à `password_hash()` ET à `password_needs_rehash()`.
     * Les deux DOIVENT recevoir exactement les mêmes, sinon `needs_rehash`
     * rend vrai à chaque appel et l'on re-hache en boucle sans fin.
     *
     * @return array<string,int>
     */
    private static function options(): array
    {
        // Argon2id : on garde les défauts de PHP (memory_cost 64 Mio,
        // time_cost 4, threads 1). Les surcharger réclamerait de mesurer la
        // RAM disponible chez l'hébergeur, information dont on ne dispose pas.
        return self::argon2idDisponible() ? [] : ['cost' => self::COUT_BCRYPT];
    }

    /**
     * État du hachage, destiné à la réponse de `/health`.
     *
     * À câbler dans `api/routes.php` (hors périmètre de cette vague) :
     *     'passwordHashing' => MotDePasse::diagnostic(),
     *
     * @return array<string,mixed>
     */
    public static function diagnostic(): array
    {
        $argon = self::argon2idDisponible();

        return [
            'algorithm' => self::nomAlgorithme(),
            'preferred' => 'argon2id',
            'fallback' => !$argon,
            'cost' => $argon ? null : self::COUT_BCRYPT,
            'maxPasswordBytes' => self::longueurMaximale(),
            'note' => $argon
                ? 'Argon2id actif.'
                : 'Argon2id indisponible sur ce PHP : repli sur bcrypt. Les comptes seront '
                    . 're-hachés automatiquement en Argon2id à leur connexion suivante si '
                    . 'l\'extension devient disponible.',
        ];
    }

    /** Plafond de longueur applicable à l'algorithme courant, en octets. */
    public static function longueurMaximale(): int
    {
        return self::argon2idDisponible() ? self::LONGUEUR_MAXIMALE : self::LONGUEUR_MAXIMALE_BCRYPT;
    }

    // ------------------------------------------------------------------
    // Politique de mot de passe
    // ------------------------------------------------------------------

    /**
     * Contrôle la recevabilité d'un mot de passe en clair.
     *
     * Rend la liste des motifs de refus, vide si le mot de passe convient.
     * Volontairement sobre : longueur et absence d'octet nul. Les règles de
     * composition (« une majuscule, un chiffre, un caractère spécial ») sont
     * connues pour produire des mots de passe plus courts et plus prévisibles ;
     * la longueur est le seul levier qui compte réellement.
     *
     * @return string[]
     */
    public static function valider(?string $clair): array
    {
        $erreurs = [];

        if ($clair === null || $clair === '') {
            return ['Champ obligatoire.'];
        }

        // Un octet nul tronque la chaîne côté C : bcrypt lèverait une
        // `ValueError`, Argon2id accepterait un secret amputé. Refus net.
        if (str_contains($clair, "\0")) {
            return ['Caractère interdit (octet nul).'];
        }

        // On compte en CARACTÈRES pour le minimum (ce que voit l'utilisateur)
        // et en OCTETS pour le maximum (ce que voit l'algorithme).
        $caracteres = mb_strlen($clair);
        $octets = strlen($clair);

        if ($caracteres < self::LONGUEUR_MINIMALE) {
            $erreurs[] = 'Trop court : ' . self::LONGUEUR_MINIMALE . ' caractères minimum.';
        }

        $max = self::longueurMaximale();
        if ($octets > $max) {
            $erreurs[] = self::argon2idDisponible()
                ? "Trop long : {$max} octets maximum."
                : "Trop long : {$max} octets maximum. Cet hébergeur ne fournit pas Argon2id ; "
                    . 'bcrypt, qui le remplace, ignore silencieusement tout ce qui dépasse '
                    . 'cette limite — le mot de passe est refusé plutôt que tronqué à votre insu.';
        }

        return $erreurs;
    }

    /**
     * Valide puis lève une `ApiException` 422 si le mot de passe est refusé.
     * Raccourci pour les contrôleurs, qui rendent tous la même forme d'erreur.
     */
    public static function exigerValide(?string $clair, string $champ = 'password'): string
    {
        $erreurs = self::valider($clair);
        if ($erreurs !== []) {
            throw ApiException::validation('Mot de passe invalide.', [$champ => $erreurs]);
        }

        return (string) $clair;
    }

    // ------------------------------------------------------------------
    // Hachage et vérification
    // ------------------------------------------------------------------

    /**
     * Hache un mot de passe avec le meilleur algorithme disponible.
     *
     * Ne valide PAS la politique : appeler `exigerValide()` avant, pour que le
     * message d'erreur porte le nom du champ concerné.
     */
    public static function hacher(string $clair): string
    {
        $hache = password_hash($clair, self::algorithme(), self::options());

        // `password_hash()` ne rend plus `false` en PHP 8, mais une chaîne vide
        // signerait une bibliothèque cassée. On refuse d'écrire ça en base :
        // un `password_hash` vide ferait échouer toute vérification ultérieure
        // sans que personne comprenne pourquoi.
        if ($hache === '') {
            Db::journaliserStatique(
                'password_hash() a rendu une chaîne vide (algorithme : ' . self::nomAlgorithme() . '). '
                . 'Installation PHP anormale.'
            );

            throw new ApiException(500, 'INTERNAL_ERROR', 'Le hachage du mot de passe a échoué.');
        }

        return $hache;
    }

    /**
     * Vérifie un mot de passe contre un hachage stocké.
     *
     * Un hachage absent, vide ou non reconnu (comptes créés par
     * `ControleurUtilisateurs::creer()` avec le marqueur `!!non-defini!!`, par
     * exemple) rend `false` — MAIS après avoir consommé le même temps de calcul
     * qu'une vérification réelle. Sans ce leurre, la durée de la réponse
     * distingue « compte inexistant » de « mot de passe faux », et l'API
     * redevient un outil d'énumération malgré un message identique.
     */
    public static function verifier(?string $clair, ?string $hache): bool
    {
        if ($clair === null || $clair === '') {
            return false;
        }

        if ($hache === null || $hache === '' || !self::ressembleAUnHachage($hache)) {
            self::consommerLeurre($clair);

            return false;
        }

        return password_verify($clair, $hache);
    }

    /**
     * Vérifie, puis re-hache si l'algorithme ou ses paramètres ont changé.
     *
     * C'est le mécanisme de réversibilité du repli : le jour où Argon2id
     * apparaît sur l'hébergeur, chaque compte encore en bcrypt bascule à sa
     * connexion suivante, sans intervention et sans réinitialisation.
     *
     * `$enregistrer` reçoit le nouveau hachage et le persiste. Il n'est appelé
     * QUE si la vérification a réussi : le mot de passe en clair n'est
     * disponible qu'à cet instant précis, et on ne réécrit jamais la base sur
     * une tentative infructueuse.
     *
     * Une panne d'écriture pendant le re-hachage ne doit pas refuser une
     * connexion par ailleurs légitime : elle est journalisée, et l'ancien
     * hachage reste valable. La tentative recommencera à la connexion suivante.
     *
     * @param callable(string):void $enregistrer
     */
    public static function verifierEtRehacher(?string $clair, ?string $hache, callable $enregistrer): bool
    {
        if (!self::verifier($clair, $hache)) {
            return false;
        }

        if (self::doitEtreRehache((string) $hache)) {
            try {
                $enregistrer(self::hacher((string) $clair));
            } catch (\Throwable $e) {
                Db::journaliserStatique(
                    'Re-hachage opportuniste impossible (la connexion reste acceptée, '
                    . 'l\'ancien hachage demeure valide) : ' . $e->getMessage()
                );
            }
        }

        return true;
    }

    /**
     * Vrai si le hachage stocké n'est plus conforme à l'algorithme courant :
     * bcrypt alors qu'Argon2id est désormais là, ou coût bcrypt relevé.
     */
    public static function doitEtreRehache(string $hache): bool
    {
        if ($hache === '' || !self::ressembleAUnHachage($hache)) {
            return false;
        }

        return password_needs_rehash($hache, self::algorithme(), self::options());
    }

    /**
     * Identifie l'algorithme d'un hachage stocké — pour le diagnostic, jamais
     * pour une décision d'authentification.
     */
    public static function algorithmeDe(string $hache): ?string
    {
        $info = password_get_info($hache);
        $nom = $info['algoName'] ?? 'unknown';

        return ($nom === 'unknown' || $nom === '') ? null : (string) $nom;
    }

    // ------------------------------------------------------------------
    // Interne
    // ------------------------------------------------------------------

    /** Vrai si la chaîne est un hachage reconnu par `password_*`. */
    private static function ressembleAUnHachage(string $hache): bool
    {
        return self::algorithmeDe($hache) !== null;
    }

    /**
     * Brûle le même temps qu'une vérification réelle.
     *
     * Le leurre est haché une seule fois par processus puis conservé : le
     * premier appel paie un hachage complet, les suivants ne paient qu'une
     * vérification — soit exactement le coût du chemin nominal.
     */
    private static function consommerLeurre(string $clair): void
    {
        self::$leurre ??= self::hacher(
            // Valeur fixe et sans usage : elle ne protège rien, elle occupe le
            // processeur. Elle n'est jamais écrite en base ni comparée à un
            // secret réel.
            'leurre-de-comparaison-temps-constant-katech'
        );

        password_verify($clair, self::$leurre);
    }
}
