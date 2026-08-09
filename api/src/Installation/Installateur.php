<?php

/**
 * Noyau d'installation — application du schéma, compte propriétaire, témoin.
 *
 * POURQUOI CETTE CLASSE EXISTE
 *
 * `api/install.php` sait faire deux choses depuis toujours : appliquer le
 * schéma du pilote choisi, et créer le compte propriétaire. Ce travail est
 * désormais déclenché par DEUX chemins — la ligne de commande (CI, agents,
 * `scripts/conformite-api.ts`) et l'assistant par navigateur. Le dupliquer
 * aurait garanti la divergence : une correction faite d'un côté, oubliée de
 * l'autre, et une installation par le navigateur qui n'aurait plus rien à voir
 * avec celle de la CI.
 *
 * Les messages sont émis par un CALLBACK et non par `echo` : la ligne de
 * commande les imprime telles quelles (sortie identique à l'octet près à celle
 * d'avant l'assistant — c'est la contrainte de non-régression), l'assistant les
 * collecte pour les afficher dans son écran de résultat.
 *
 * Rien ici ne connaît HTML, HTTP ni formulaire. C'est délibéré : ce fichier
 * doit rester lisible comme la description de ce que fait une installation.
 */

declare(strict_types=1);

namespace KaTech\Installation;

use KaTech\ApiException;
use KaTech\Auth\MotDePasse;
use KaTech\Db;
use KaTech\Env;

final class Installateur
{
    /** @var callable(string):void */
    private $ligne;

    private bool $transactionOuverte = false;

    /**
     * @param callable(string):void $ligne  Reçoit chaque ligne de compte rendu.
     */
    public function __construct(
        private readonly Db $db,
        private readonly string $racineApi,
        callable $ligne,
    ) {
        $this->ligne = $ligne;
    }

    /**
     * MySQL ne sait pas annuler du DDL : chaque `CREATE TABLE` y valide
     * implicitement la transaction en cours. Ouvrir une transaction y donnerait
     * une fausse garantie ; on ne l'ouvre donc pas, et on DIT quoi faire en cas
     * d'échec (voir `annulerEtDecrire()`).
     */
    public function ddlTransactionnel(): bool
    {
        return $this->db->pilote() !== Db::PILOTE_MYSQL;
    }

    /** Chemin du témoin qui interdit une seconde installation. */
    public function cheminTemoin(): string
    {
        return $this->racineApi . '/installed.lock';
    }

    /**
     * Applique le fichier de schéma correspondant au pilote.
     *
     * TOUT OU RIEN quand le moteur le permet : une installation qui échoue à
     * mi-parcours laisse une base à demi peuplée, le témoin n'est pas posé,
     * l'exploitant relance, et `CREATE TABLE IF NOT EXISTS` ne recrée pas ce qui
     * existe déjà — la base reste bancale sans que rien ne le dise.
     */
    public function appliquerSchema(): void
    {
        $pilote = $this->db->pilote();
        $fichierSchema = $this->racineApi . '/schema/schema.' . $pilote . '.sql';

        if (!is_file($fichierSchema)) {
            throw ApiException::baseIndisponible(
                "Fichier de schéma introuvable : {$fichierSchema}. "
                . 'Le dossier api/schema/ n\'a pas été téléversé entièrement.'
            );
        }

        // Connexion vérifiée AVANT d'écrire quoi que ce soit : si elle échoue, le
        // message de Db dit déjà quoi corriger, et aucun témoin n'est posé.
        $this->db->pdo();

        if ($this->ddlTransactionnel()) {
            $this->db->beginWrite();
            $this->transactionOuverte = true;
        }

        $executees = 0;
        foreach (self::decouperSql((string) file_get_contents($fichierSchema)) as $sql) {
            $this->db->pdo()->exec($sql);
            $executees++;
        }

        $tables = self::compterTables($this->db);
        ($this->ligne)("Schéma appliqué : {$executees} instructions, {$tables} tables présentes.");
    }

    /**
     * Crée le compte propriétaire — VAGUE 4.3.
     *
     * Le mot de passe est HACHÉ par `Auth\MotDePasse`, seul endroit du projet
     * qui décide de l'algorithme (Argon2id, ou bcrypt si l'hébergeur ne fournit
     * pas Argon2id). Dupliquer ici un `password_hash()` ferait diverger les
     * paramètres, et `password_needs_rehash()` re-hacherait le compte
     * propriétaire à chacune de ses connexions.
     *
     * AUCUN MOT DE PASSE PAR DÉFAUT, JAMAIS. Un installateur qui invente un
     * « admin/admin » en cas de valeur manquante crée un compte `owner` ouvert à
     * quiconque connaît le projet — et personne ne le change jamais.
     *
     * @param bool $rappelerEffacementEnv Vrai en ligne de commande, où le mot de
     *        passe a été lu dans l'environnement ou dans `api/.env` et doit en
     *        être effacé. L'assistant, lui, ne l'écrit nulle part : le rappel y
     *        serait un contresens.
     */
    public function creerProprietaire(
        ?string $email,
        ?string $motDePasse,
        ?string $nom = null,
        bool $rappelerEffacementEnv = true,
    ): void {
        if ($email === null && $motDePasse === null) {
            // Les deux absentes : installation du schéma seul, choix légitime.
            ($this->ligne)('Compte propriétaire NON créé : renseignez INSTALL_OWNER_EMAIL et '
                . 'INSTALL_OWNER_PASSWORD dans api/.env puis relancez après avoir effacé le témoin.');
            ($this->ligne)('AVERTISSEMENT : sans compte propriétaire, personne ne peut administrer le site.');

            return;
        }

        $erreurs = self::validerIdentifiants($email, $motDePasse);
        if ($erreurs !== []) {
            throw ApiException::validation(
                'Le compte propriétaire ne peut pas être créé avec ces valeurs.',
                $erreurs
            );
        }

        $email = strtolower(trim((string) $email));
        $maintenant = gmdate('c');

        $this->db->upsert('users', [
            'id' => 'usr-owner',
            'name' => $nom ?? (string) Env::get('INSTALL_OWNER_NAME', 'Propriétaire'),
            'email' => $email,
            'password_hash' => MotDePasse::hacher((string) $motDePasse),
            'role' => 'owner',
            'active' => 1,
            'phone' => null,
            'last_login' => null,
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ], ['email']);

        ($this->ligne)('Compte propriétaire créé : ' . $email);
        ($this->ligne)('Mot de passe haché avec : ' . MotDePasse::nomAlgorithme()
            . (MotDePasse::argon2idDisponible()
                ? '.'
                : ' (Argon2id indisponible sur ce PHP — repli automatique, et re-hachage'
                    . ' en Argon2id à la première connexion si l\'extension apparaît).'));

        if ($rappelerEffacementEnv) {
            ($this->ligne)('Effacez maintenant INSTALL_OWNER_PASSWORD de api/.env : '
                . 'le mot de passe est en base,');
            ($this->ligne)('haché ; le laisser en clair dans un fichier du serveur annule tout le bénéfice.');
        }
    }

    /**
     * Valide e-mail et mot de passe du propriétaire.
     *
     * Politique de mot de passe UNIQUE, partagée avec `/auth/register` et
     * `/auth/reset-password` : `MotDePasse::valider()`. L'assistant appelle
     * cette méthode AVANT d'écrire quoi que ce soit, pour afficher les refus
     * dans le formulaire plutôt qu'après une installation à moitié faite.
     *
     * @return array<string,list<string>> champ → messages, vide si tout va bien
     */
    public static function validerIdentifiants(?string $email, ?string $motDePasse): array
    {
        $erreurs = [];

        if ($email === null || trim($email) === '') {
            $erreurs['INSTALL_OWNER_EMAIL'] = ['Variable obligatoire dès lors qu\'un mot de passe est fourni.'];
        } elseif (!filter_var(trim($email), FILTER_VALIDATE_EMAIL)) {
            $erreurs['INSTALL_OWNER_EMAIL'] = ['Adresse e-mail invalide : « ' . trim($email) . ' ».'];
        }

        if ($motDePasse === null || $motDePasse === '') {
            $erreurs['INSTALL_OWNER_PASSWORD'] = [
                'Variable obligatoire, et sans valeur par défaut : l\'installateur refuse de créer un '
                . 'compte propriétaire dont le mot de passe serait devinable.',
            ];

            return $erreurs;
        }

        $refus = MotDePasse::valider($motDePasse);
        if ($refus !== []) {
            $erreurs['INSTALL_OWNER_PASSWORD'] = $refus;
        } elseif (self::motDePasseTropPrevisible($motDePasse)) {
            $erreurs['INSTALL_OWNER_PASSWORD'] = [
                'Mot de passe trop prévisible (suite de caractères identiques, ou terme figurant '
                . 'dans toutes les listes d\'attaque). Choisissez une phrase de passe.',
            ];
        }

        return $erreurs;
    }

    /**
     * Pose le témoin — APRÈS validation seulement.
     *
     * Un témoin déposé sur une transaction annulée interdirait de réinstaller
     * une base vide.
     */
    public function conclure(): void
    {
        if ($this->transactionOuverte) {
            $this->db->commit();
            $this->transactionOuverte = false;
        }

        file_put_contents(
            $this->cheminTemoin(),
            'installé le ' . gmdate('c') . ' — pilote ' . $this->db->pilote() . PHP_EOL
        );
    }

    /**
     * Annule l'installation en cours si le moteur le permet, et rend la phrase
     * exacte à afficher — l'exploitant doit savoir dans quel état est SA base,
     * pas lire une formule générale.
     */
    public static function annulerEtDecrire(?Db $db, bool $ddlTransactionnel): string
    {
        if ($db === null) {
            return 'Rien n\'a été écrit : l\'échec a eu lieu avant la connexion à la base.';
        }

        if ($ddlTransactionnel) {
            $db->rollback();

            return 'La transaction a été ANNULÉE : la base est revenue exactement à son état d\'avant.';
        }

        return 'ATTENTION : MySQL ne sait pas annuler la création de tables. Des tables ont pu être '
            . 'créées avant l\'erreur. Videz la base (phpMyAdmin : « Opérations » → supprimer les tables) '
            . 'AVANT de relancer, sinon l\'installation repartira sur un schéma partiel.';
    }

    /**
     * Découpe un fichier SQL en instructions.
     *
     * Nécessaire pour MySQL : avec `ATTR_EMULATE_PREPARES=false`, `PDO::exec()`
     * n'accepte qu'une instruction à la fois. Le découpage respecte les chaînes
     * littérales et ignore les commentaires.
     *
     * @return string[]
     */
    public static function decouperSql(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;

        $instructions = [];
        $courant = '';
        $len = strlen($sql);

        for ($i = 0; $i < $len; $i++) {
            $c = $sql[$i];

            if ($c === "'" || $c === '"' || $c === '`') {
                $delim = $c;
                $courant .= $c;
                $i++;
                while ($i < $len) {
                    $courant .= $sql[$i];
                    if ($sql[$i] === $delim) {
                        break;
                    }
                    $i++;
                }
                continue;
            }

            if ($c === ';') {
                if (trim($courant) !== '') {
                    $instructions[] = trim($courant);
                }
                $courant = '';
                continue;
            }

            $courant .= $c;
        }

        if (trim($courant) !== '') {
            $instructions[] = trim($courant);
        }

        return $instructions;
    }

    /**
     * Compte les tables réellement présentes après application du schéma.
     *
     * TROIS branches EXPLICITES, une par pilote, et surtout PAS un « sinon, donc
     * MySQL ». Ce raccourci — légitime tant qu'il n'y avait que deux pilotes — a
     * produit la pire panne possible à l'arrivée de `pgsql` : `DATABASE()`
     * n'existe pas en PostgreSQL, l'installation créait donc les tables PUIS
     * échouait ICI, c'est-à-dire AVANT la création du compte propriétaire et
     * AVANT la pose du témoin.
     *
     * Le `match` sans branche par défaut est volontaire : un quatrième pilote
     * ajouté un jour à `Db::PILOTES` fera lever une `UnhandledMatchError` ici, à
     * l'installation, plutôt que de retomber en silence sur le dialecte d'un
     * autre moteur.
     */
    public static function compterTables(Db $db): int
    {
        $sql = match ($db->pilote()) {
            Db::PILOTE_SQLITE => 'SELECT COUNT(*) FROM sqlite_master '
                . "WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
            Db::PILOTE_MYSQL => 'SELECT COUNT(*) FROM information_schema.tables '
                . "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
            // `current_schemas(false)` suit le `search_path` réel de la connexion :
            // écrire « public » en dur casserait sur un Supabase dont le schéma est
            // personnalisé, et compterait les tables d'un autre schéma sur un
            // serveur mutualisé où plusieurs applications cohabitent.
            Db::PILOTE_PGSQL => 'SELECT COUNT(*) FROM pg_catalog.pg_tables '
                . 'WHERE schemaname = ANY (current_schemas(false))',
        };

        return (int) $db->valeur($sql);
    }

    /**
     * Refuse les mots de passe qui satisfont la règle de longueur tout en étant
     * les premiers essayés par n'importe quel outil d'attaque.
     *
     * Ce n'est pas un contrôle de robustesse générale — impossible sans
     * dictionnaire embarqué, et la longueur reste le vrai levier. C'est un
     * garde-fou contre le réflexe « je mets `changeme123` le temps de
     * l'installation », sur le SEUL compte qui a tous les droits et qui, par
     * expérience, n'est jamais changé ensuite.
     */
    public static function motDePasseTropPrevisible(string $motDePasse): bool
    {
        $normalise = strtolower(trim($motDePasse));

        // Un seul caractère répété : « aaaaaaaaaa » passe la règle des 10.
        if (preg_match('/^(.)\1+$/u', $normalise) === 1) {
            return true;
        }

        // Suites de clavier ou de chiffres contiguës.
        foreach (['0123456789', 'azertyuiop', 'qwertyuiop'] as $suite) {
            if (str_contains($suite, $normalise) || str_contains(strrev($suite), $normalise)) {
                return true;
            }
        }

        $interdits = [
            'motdepasse', 'password', 'passw0rd', 'changeme', 'change-me', 'administrateur',
            'administrator', 'proprietaire', 'katechkatech', 'katech2024', 'katech2025',
            'katech2026', 'azerty123', 'qwerty123', 'motdepasse1', 'password1', 'password123',
            'admin12345', 'administrateur1',
        ];

        if (in_array($normalise, $interdits, true)) {
            return true;
        }

        // Terme interdit suivi de chiffres et/ou d'un point d'exclamation :
        // « password2026 », « admin1234! »… Le motif le plus courant.
        foreach (['motdepasse', 'password', 'admin', 'katech', 'azerty', 'qwerty', 'bonjour'] as $racine) {
            if (preg_match('/^' . preg_quote($racine, '/') . '[0-9!@#*.\-_]*$/', $normalise) === 1) {
                return true;
            }
        }

        return false;
    }
}
