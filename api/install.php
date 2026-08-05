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

    // Compte propriétaire, optionnel. Argon2id conformément à PLAN.md §1.
    $email = Env::get('INSTALL_OWNER_EMAIL');
    $motDePasse = Env::get('INSTALL_OWNER_PASSWORD');

    if ($email !== null && $motDePasse !== null) {
        if (strlen($motDePasse) < 10) {
            throw ApiException::validation(
                'INSTALL_OWNER_PASSWORD doit faire au moins 10 caractères.',
                ['INSTALL_OWNER_PASSWORD' => ['Trop court.']]
            );
        }
        $maintenant = gmdate('c');
        $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
        $db->upsert('users', [
            'id' => 'usr-owner',
            'name' => (string) Env::get('INSTALL_OWNER_NAME', 'Propriétaire'),
            'email' => strtolower($email),
            'password_hash' => (string) password_hash($motDePasse, $algo),
            'role' => 'owner',
            'active' => 1,
            'phone' => null,
            'last_login' => null,
            'created_at' => $maintenant,
            'updated_at' => $maintenant,
        ], ['email']);
        echoLigne('Compte propriétaire créé : ' . strtolower($email)
            . ($algo === PASSWORD_DEFAULT ? ' (Argon2id indisponible, repli sur l\'algorithme par défaut)' : ' (Argon2id)'));
    } else {
        echoLigne('Compte propriétaire NON créé : renseignez INSTALL_OWNER_EMAIL et '
            . 'INSTALL_OWNER_PASSWORD dans api/.env puis relancez après avoir effacé le témoin.');
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
