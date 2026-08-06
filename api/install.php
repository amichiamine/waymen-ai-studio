<?php

/**
 * Installateur — à ouvrir UNE SEULE FOIS.
 *
 * Crée les tables depuis le schéma correspondant à `DB_DRIVER`, puis dépose un
 * témoin `installed.lock` et refuse tout appel ultérieur.
 *
 * Utilisable en HTTP (`https://…/api/install.php`) ou en CLI
 * (`php api/install.php`). Après succès, SUPPRIMEZ ce fichier du serveur :
 * le témoin protège, mais un fichier absent protège mieux.
 *
 * Réinstaller volontairement : effacer `api/installed.lock`.
 */

declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';

use KaTech\ApiException;
use KaTech\Auth\MotDePasse;
use KaTech\Db;
use KaTech\Env;

const TEMOIN = __DIR__ . '/installed.lock';

$cli = PHP_SAPI === 'cli';
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    // Sortie tamponnée : le code de statut HTTP doit encore être modifiable
    // au moment où l'on conclut, après avoir déjà écrit le rapport.
    ob_start();
}

try {
    if (is_file(TEMOIN)) {
        echoLigne('INSTALLATION DÉJÀ EFFECTUÉE.');
        echoLigne('');
        echoLigne('Le témoin ' . TEMOIN . ' existe (' . trim((string) file_get_contents(TEMOIN)) . ').');
        echoLigne('Ce script refuse de s\'exécuter une seconde fois : il détruirait la configuration');
        echoLigne('en place sans prévenir.');
        echoLigne('');
        echoLigne('Pour réinstaller volontairement : supprimez ce fichier témoin, puis relancez.');
        terminer(409);
    }

    $db = Db::instance();
    $pilote = $db->pilote();

    echoLigne('== Installation KA Tech Hub ==');
    echoLigne('Pilote : ' . $pilote);
    if ($pilote === Db::PILOTE_SQLITE) {
        echoLigne('Fichier : ' . (string) $db->cheminSqlite());
    }
    echoLigne('');

    $fichierSchema = __DIR__ . '/schema/schema.' . $pilote . '.sql';
    if (!is_file($fichierSchema)) {
        throw ApiException::baseIndisponible(
            "Fichier de schéma introuvable : {$fichierSchema}. "
            . 'Le dossier api/schema/ n\'a pas été téléversé entièrement.'
        );
    }

    // Connexion vérifiée AVANT d'écrire quoi que ce soit : si elle échoue, le
    // message de Db dit déjà quoi corriger, et aucun témoin n'est posé.
    $db->pdo();

    $instructions = decouperSql((string) file_get_contents($fichierSchema));
    $executees = 0;
    foreach ($instructions as $sql) {
        $db->pdo()->exec($sql);
        $executees++;
    }

    $tables = compterTables($db);
    echoLigne("Schéma appliqué : {$executees} instructions, {$tables} tables présentes.");

    // ------------------------------------------------------------------
    // Compte propriétaire — VAGUE 4.3
    //
    // Le mot de passe est HACHÉ par `Auth\MotDePasse`, seul endroit du projet
    // qui décide de l'algorithme (Argon2id, ou bcrypt si l'hébergeur ne
    // fournit pas Argon2id). Dupliquer ici un `password_hash()` ferait diverger
    // les paramètres, et `password_needs_rehash()` re-hacherait le compte
    // propriétaire à chacune de ses connexions.
    //
    // AUCUN MOT DE PASSE PAR DÉFAUT, JAMAIS. Un installateur qui invente un
    // « admin/admin » en cas de variable manquante crée un compte `owner`
    // ouvert à quiconque connaît le projet — et personne ne le change jamais.
    // Ici, l'absence ou la faiblesse de INSTALL_OWNER_PASSWORD ARRÊTE
    // l'installation, sans poser de témoin, avec un message qui dit quoi faire.
    // ------------------------------------------------------------------
    $email = Env::get('INSTALL_OWNER_EMAIL');
    $motDePasse = Env::get('INSTALL_OWNER_PASSWORD');

    if ($email === null && $motDePasse === null) {
        // Les deux absentes : installation du schéma seul, choix légitime.
        echoLigne('Compte propriétaire NON créé : renseignez INSTALL_OWNER_EMAIL et '
            . 'INSTALL_OWNER_PASSWORD dans api/.env puis relancez après avoir effacé le témoin.');
        echoLigne('AVERTISSEMENT : sans compte propriétaire, personne ne peut administrer le site.');
    } else {
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
        } else {
            // Politique unique, partagée avec /auth/register et /auth/reset-password.
            $refus = MotDePasse::valider($motDePasse);
            if ($refus !== []) {
                $erreurs['INSTALL_OWNER_PASSWORD'] = $refus;
            } elseif (motDePasseTropPrevisible($motDePasse)) {
                $erreurs['INSTALL_OWNER_PASSWORD'] = [
                    'Mot de passe trop prévisible (suite de caractères identiques, ou terme figurant '
                    . 'dans toutes les listes d\'attaque). Choisissez une phrase de passe.',
                ];
            }
        }

        if ($erreurs !== []) {
            throw ApiException::validation(
                'Le compte propriétaire ne peut pas être créé avec ces valeurs.',
                $erreurs
            );
        }

        $email = strtolower(trim((string) $email));
        $maintenant = gmdate('c');

        $db->upsert('users', [
            'id' => 'usr-owner',
            'name' => (string) Env::get('INSTALL_OWNER_NAME', 'Propriétaire'),
            'email' => $email,
            'password_hash' => MotDePasse::hacher((string) $motDePasse),
            'role' => 'owner',
            'active' => 1,
            'phone' => null,
            'last_login' => null,
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ], ['email']);

        echoLigne('Compte propriétaire créé : ' . $email);
        echoLigne('Mot de passe haché avec : ' . MotDePasse::nomAlgorithme()
            . (MotDePasse::argon2idDisponible()
                ? '.'
                : ' (Argon2id indisponible sur ce PHP — repli automatique, et re-hachage'
                    . ' en Argon2id à la première connexion si l\'extension apparaît).'));
        echoLigne('Effacez maintenant INSTALL_OWNER_PASSWORD de api/.env : le mot de passe est en base,');
        echoLigne('haché ; le laisser en clair dans un fichier du serveur annule tout le bénéfice.');
    }

    file_put_contents(TEMOIN, 'installé le ' . gmdate('c') . ' — pilote ' . $pilote . PHP_EOL);

    echoLigne('');
    echoLigne('TERMINÉ.');
    echoLigne('Étape suivante OBLIGATOIRE : supprimez api/install.php du serveur.');
    terminer(200);
} catch (ApiException $e) {
    echoLigne('ÉCHEC DE L\'INSTALLATION');
    echoLigne('');
    echoLigne($e->getMessage());
    foreach ($e->champs() as $champ => $messages) {
        echoLigne('  ' . $champ . ' : ' . implode(' ', $messages));
    }
    echoLigne('');
    echoLigne('Aucun témoin n\'a été posé : corrigez, puis relancez ce script.');
    terminer($e->statut() >= 500 ? 500 : $e->statut());
} catch (Throwable $e) {
    Db::journaliserStatique('install.php : ' . $e->getMessage() . ' (' . $e->getFile() . ':' . $e->getLine() . ')');
    echoLigne('ÉCHEC DE L\'INSTALLATION');
    echoLigne('');
    echoLigne(katech_est_production()
        ? 'Erreur interne. Le détail a été écrit dans le journal d\'erreurs PHP du serveur.'
        : $e::class . ' : ' . $e->getMessage() . ' (' . $e->getFile() . ':' . $e->getLine() . ')');
    echoLigne('');
    echoLigne('Aucun témoin n\'a été posé : corrigez, puis relancez ce script.');
    terminer(500);
}

// =====================================================================

/**
 * Découpe un fichier SQL en instructions.
 *
 * Nécessaire pour MySQL : avec `ATTR_EMULATE_PREPARES=false`, `PDO::exec()`
 * n'accepte qu'une instruction à la fois. Le découpage respecte les chaînes
 * littérales et ignore les commentaires.
 *
 * @return string[]
 */
function decouperSql(string $sql): array
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
 * Refuse les mots de passe qui satisfont la règle de longueur tout en étant
 * les premiers essayés par n'importe quel outil d'attaque.
 *
 * Ce n'est pas un contrôle de robustesse générale — impossible sans
 * dictionnaire embarqué, et la longueur reste le vrai levier. C'est un garde-
 * fou contre le réflexe « je mets `changeme123` le temps de l'installation »,
 * sur le SEUL compte qui a tous les droits et qui, par expérience, n'est jamais
 * changé ensuite.
 */
function motDePasseTropPrevisible(string $motDePasse): bool
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

function compterTables(Db $db): int
{
    if ($db->estSqlite()) {
        return (int) $db->valeur(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        );
    }

    return (int) $db->valeur(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()'
    );
}

function echoLigne(string $l): void
{
    echo $l . PHP_EOL;
}

function terminer(int $statut): never
{
    if (PHP_SAPI !== 'cli') {
        if (!headers_sent()) {
            http_response_code($statut);
        }
        while (ob_get_level() > 0) {
            ob_end_flush();
        }
    }

    exit($statut === 200 ? 0 : 1);
}
