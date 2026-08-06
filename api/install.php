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

// Chemin de référence : le fichier d'exemple livré avec le projet.
const EXEMPLE_ENV = __DIR__ . '/.env.example';

$cli = PHP_SAPI === 'cli';
if (!$cli) {
    header('Content-Type: text/plain; charset=utf-8');
    // Sortie tamponnée : le code de statut HTTP doit encore être modifiable
    // au moment où l'on conclut, après avoir déjà écrit le rapport.
    ob_start();
}

try {
    // ------------------------------------------------------------------
    // Vérification du fichier .env — AVANT toute tentative de connexion.
    //
    // Si .env est absent, le message est la PREMIÈRE chose que lit le
    // commerçant. Il doit dire quoi faire exactement, pas « configuration
    // invalide » : le commerçant est devant le panneau hPanel de son
    // hébergeur, avec un nom de base, un utilisateur et un mot de passe
    // sous les yeux, et il ne sait pas où les mettre.
    //
    // On n'invente rien : pas de .env généré automatiquement, pas de
    // valeur par défaut qui masque une absence.
    // ------------------------------------------------------------------
    $cheminEnv = __DIR__ . '/.env';
    if (!is_file($cheminEnv)) {
        echoLigne('');
        echoLigne('ÉTAPE MANQUANTE : le fichier api/.env n\'existe pas encore.');
        echoLigne('');
        echoLigne('Ce fichier contient vos identifiants de base de données. Il doit');
        echoLigne('être créé AVANT l\'installation — personne d\'autre ne peut le');
        echoLigne('remplir à votre place, car lui seul connaît votre mot de passe.');
        echoLigne('');
        echoLigne('── Marche à suivre ──────────────────────────────────────────────');
        echoLigne('');
        echoLigne('1. Dans le gestionnaire de fichiers de votre hébergeur (hPanel →');
        echoLigne('   « Fichiers » → « Gestionnaire de fichiers »), ouvrez le dossier');
        echoLigne('   api/ de votre site.');
        echoLigne('');
        echoLigne('2. Cherchez le fichier « .env.example » — il est déjà là, téléversé');
        echoLigne('   avec le projet. Copiez-le et nommez la copie « .env » (sans');
        echoLigne('   guillemets). Chez Hostinger : clic droit → Copier → coller dans');
        echoLigne('   le même dossier → renommer en « .env ».');
        echoLigne('');
        echoLigne('3. Ouvrez « .env » avec l\'éditeur de texte du gestionnaire de');
        echoLigne('   fichiers. Renseignez les six lignes suivantes avec les valeurs');
        echoLigne('   que vous trouvez dans hPanel → « Bases de données » :');
        echoLigne('');
        echoLigne('     DB_DRIVER=mysql');
        echoLigne('     DB_HOST=localhost');
        echoLigne('     DB_PORT=3306');
        echoLigne('     DB_NAME=  ← nom de votre base');
        echoLigne('     DB_USER=  ← utilisateur de la base');
        echoLigne('     DB_PASSWORD=  ← mot de passe de la base');
        echoLigne('');
        echoLigne('4. Plus bas dans « .env », renseignez aussi :');
        echoLigne('');
        echoLigne('     INSTALL_OWNER_EMAIL=  ← votre adresse e-mail');
        echoLigne('     INSTALL_OWNER_PASSWORD=  ← mot de passe FORT (10 car. min.)');
        echoLigne('');
        echoLigne('   Ce sera le compte administrateur du site.');
        echoLigne('');
        echoLigne('5. Enregistrez « .env », puis rechargez cette page.');
        echoLigne('');
        echoLigne('── Si le fichier « .env.example » est introuvable ─────────────────');
        echoLigne('');
        echoLigne('Il n\'a peut-être pas été téléversé. Téléchargez le projet complet');
        echoLigne('depuis GitHub, vérifiez que le dossier api/ contient bien');
        echoLigne('« .env.example », puis téléversez-le entièrement.');
        echoLigne('');
        terminer(503);
    }

    // ------------------------------------------------------------------
    // Vérification des variables minimales — après chargement du .env.
    //
    // Un .env vide (copié mais non rempli) donne les mêmes symptômes
    // qu'une absence : la connexion échoue, mais avec un message parlant
    // de « connexion refusée » qui n'oriente pas vers la vraie cause.
    // On détecte ici les champs obligatoires vides AVANT de tenter PDO.
    // ------------------------------------------------------------------
    $variantesAbsentes = [];
    $piloteDecide = strtolower((string) Env::get('DB_DRIVER', ''));

    if ($piloteDecide === '' || $piloteDecide === 'mysql' || $piloteDecide === 'pgsql') {
        // SQLite n'a pas besoin de DB_NAME/USER/PASSWORD.
        foreach (['DB_NAME', 'DB_USER'] as $cle) {
            if (Env::get($cle) === null || trim((string) Env::get($cle)) === '') {
                $variantesAbsentes[] = $cle;
            }
        }
        // DB_PASSWORD peut légitimement être vide pour certains PostgreSQL
        // locaux, mais chez un hébergeur mutualisé c'est presque toujours
        // un oubli — on avertit sans bloquer.
    }

    if ($variantesAbsentes !== []) {
        echoLigne('');
        echoLigne('CONFIGURATION INCOMPLÈTE : le fichier api/.env existe mais des');
        echoLigne('variables obligatoires sont vides ou absentes.');
        echoLigne('');
        echoLigne('Variables à renseigner dans api/.env :');
        foreach ($variantesAbsentes as $cle) {
            echoLigne('  ' . $cle . '=  ← valeur manquante');
        }
        echoLigne('');
        echoLigne('Ouvrez api/.env dans le gestionnaire de fichiers de votre');
        echoLigne('hébergeur, complétez ces valeurs, enregistrez, puis rechargez');
        echoLigne('cette page.');
        echoLigne('');
        terminer(503);
    }

    // ------------------------------------------------------------------
    // Permissions du .env — défense en profondeur sur serveur mutualisé.
    //
    // Sur un mutualisé, plusieurs comptes client cohabitent sous le même
    // serveur Apache/Nginx. Si .env est lisible par « other » (mode 644
    // ou plus large), un processus tournant sous un autre compte client
    // peut le lire. Le mode cible est 640 (propriétaire + groupe PHP)
    // ou 600 (propriétaire seul).
    //
    // On tente la restriction. Si elle échoue (NFS, SELinux…), on
    // AVERTIT sans bloquer : un .env accessible vaut mieux qu'une
    // installation impossible. Le message est explicite pour que le
    // commerçant sache quoi demander à son hébergeur.
    // ------------------------------------------------------------------
    $permsActuelles = fileperms($cheminEnv);
    if ($permsActuelles !== false) {
        $permsOctal = $permsActuelles & 0777;
        // Le bit « other readable » (0004) est la menace principale.
        if ($permsOctal & 0004) {
            $apres = @chmod($cheminEnv, 0640);
            if ($apres) {
                echoLigne('Permissions de api/.env corrigées : 0640 (groupe-lisible, autres : aucun).');
            } else {
                echoLigne('AVERTISSEMENT : api/.env est lisible par tous les processus du serveur');
                echoLigne('(mode ' . sprintf('%04o', $permsOctal) . '). Tentative de restriction à 0640 échouée.');
                echoLigne('Signalez-le à votre hébergeur ou passez le fichier en 0640 via le gestionnaire');
                echoLigne('de fichiers (hPanel → clic droit sur .env → Permissions → 640).');
                echoLigne('');
                // On ne stoppe pas : mieux vaut installer avec un avertissement
                // que refuser d'installer pour un problème de droits hors contrôle.
            }
        }
    }

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

    // TOUT OU RIEN quand le moteur le permet.
    //
    // Une installation qui échoue à mi-parcours laisse une base à demi peuplée :
    // le témoin n'est pas posé, l'exploitant relance, et `CREATE TABLE IF NOT
    // EXISTS` ne recrée pas ce qui existe déjà — la base reste bancale sans que
    // rien ne le dise. SQLite et PostgreSQL savent annuler du DDL : on englobe
    // schéma ET compte propriétaire dans une seule transaction, si bien qu'un
    // échec quelconque rend la base exactement telle qu'elle était.
    //
    // MySQL en est incapable : chaque `CREATE TABLE` y valide implicitement la
    // transaction en cours. Ouvrir une transaction y donnerait une fausse
    // garantie ; on ne l'ouvre donc pas, et on DIT quoi faire en cas d'échec.
    $ddlTransactionnel = $pilote !== Db::PILOTE_MYSQL;
    if ($ddlTransactionnel) {
        $db->beginWrite();
    }

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

    // Le témoin n'est posé qu'APRÈS validation : un témoin déposé sur une
    // transaction annulée interdirait de réinstaller une base vide.
    if ($ddlTransactionnel) {
        $db->commit();
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
    echoLigne(annulerEtDecrire($db ?? null, $ddlTransactionnel ?? false));
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
    echoLigne(annulerEtDecrire($db ?? null, $ddlTransactionnel ?? false));
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

/**
 * Compte les tables réellement présentes après application du schéma.
 *
 * TROIS branches EXPLICITES, une par pilote, et surtout PAS un « sinon, donc
 * MySQL ». Ce raccourci — légitime tant qu'il n'y avait que deux pilotes — a
 * produit la pire panne possible à l'arrivée de `pgsql` : `DATABASE()` n'existe
 * pas en PostgreSQL, l'installation créait donc les 23 tables PUIS échouait
 * ICI, c'est-à-dire AVANT la création du compte propriétaire et AVANT la pose
 * du témoin. Le commerçant se retrouvait avec une base à moitié installée et un
 * message qui ne parlait pas d'installation.
 *
 * Le `match` sans branche par défaut est volontaire : un quatrième pilote
 * ajouté un jour à `Db::PILOTES` fera lever une `UnhandledMatchError` ici, à
 * l'installation, plutôt que de retomber en silence sur le dialecte d'un autre
 * moteur.
 */
function compterTables(Db $db): int
{
    $sql = match ($db->pilote()) {
        Db::PILOTE_SQLITE => "SELECT COUNT(*) FROM sqlite_master "
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
 * Annule l'installation en cours si le moteur le permet, et rend la phrase
 * exacte à afficher — l'exploitant doit savoir dans quel état est SA base, pas
 * lire une formule générale.
 */
function annulerEtDecrire(?Db $db, bool $ddlTransactionnel): string
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
