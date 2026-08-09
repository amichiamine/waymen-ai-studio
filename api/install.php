<?php

/**
 * Installateur — à ouvrir UNE SEULE FOIS.
 *
 * DEUX VISAGES, UN SEUL NOYAU
 *
 *   · Dans un NAVIGATEUR (`https://…/api/install.php`) : un assistant en trois
 *     écrans — diagnostic de l'hébergement, formulaire, résultat. Il écrit
 *     `api/.env` à partir de ce qui a été saisi, crée le dossier de données hors
 *     de la racine web, applique le schéma, crée le compte propriétaire, PROUVE
 *     que la base n'est pas téléchargeable, et sait se supprimer lui-même.
 *     Tout cela vit dans `api/src/Installation/`.
 *
 *   · En LIGNE DE COMMANDE (`php api/install.php`) : le comportement historique,
 *     inchangé. La configuration vient de l'environnement ou de `api/.env`
 *     (`INSTALL_OWNER_EMAIL` / `INSTALL_OWNER_PASSWORD`), la sortie est du texte.
 *     La CI, `scripts/conformite-api.ts` et les agents s'en servent : toute
 *     divergence ici casse les harnais. Le noyau partagé
 *     (`KaTech\Installation\Installateur`) garantit que les deux chemins font
 *     exactement le même travail sur la base.
 *
 * Après succès, SUPPRIMEZ ce fichier du serveur : le témoin `installed.lock`
 * protège, mais un fichier absent protège mieux. L'assistant propose un bouton
 * qui le fait à votre place et vérifie qu'il a réussi.
 *
 * Réinstaller volontairement : effacer `api/installed.lock`.
 */

declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Env;
use KaTech\Installation\Assistant;
use KaTech\Installation\Installateur;

const TEMOIN = __DIR__ . '/installed.lock';

$cli = PHP_SAPI === 'cli';

if (!$cli) {
    // Sortie tamponnée : le code de statut HTTP doit encore être modifiable au
    // moment où l'on conclut, après avoir déjà composé la page.
    ob_start();

    // L'assistant ne rend jamais la main : il répond, puis termine.
    (new Assistant(__DIR__, $_SERVER))->repondre();
}

// =====================================================================
// À PARTIR D'ICI : LIGNE DE COMMANDE UNIQUEMENT.
//
// Ce chemin est un CONTRAT vis-à-vis de la CI et des harnais. Sa sortie ne
// change pas, et son enchaînement non plus.
// =====================================================================

try {
    // ------------------------------------------------------------------
    // Vérification de la configuration — AVANT toute tentative de connexion.
    //
    // CE QUI A CHANGÉ ICI, ET POURQUOI — à lire avant de rétablir l'ancien
    // comportement en croyant bien faire.
    //
    // Ce bloc portait la règle « on n'invente rien : pas de .env généré
    // automatiquement ». Elle était JUSTE tant que RIEN ne recueillait les
    // valeurs : un fichier apparu tout seul, rempli de valeurs devinées — ou
    // pire, d'un mot de passe par défaut — est le contraire d'une configuration
    // compréhensible, et un mot de passe par défaut sur une boutique en ligne
    // est une fuite annoncée.
    //
    // CE N'EST PLUS LE CAS. L'assistant par navigateur DEMANDE ces valeurs dans
    // un formulaire, puis écrit le fichier lui-même (voir
    // `KaTech\Installation\RedacteurEnv`). Écrire ce que l'utilisateur vient de
    // saisir n'invente rien : cela lui épargne un copier-coller hasardeux dans
    // un gestionnaire de fichiers web, geste sur lequel une installation sur
    // deux échouait — et sur lequel le commanditaire s'est lui-même trompé.
    //
    // La moitié de la règle qui SURVIT est la vraie : AUCUNE VALEUR PAR DÉFAUT
    // QUI MASQUE UNE ABSENCE, et jamais de mot de passe inventé. Le mot de passe
    // du propriétaire, en particulier, n'est jamais écrit dans le fichier par
    // l'assistant : il part directement en base, haché.
    //
    // En ligne de commande il n'y a personne à qui demander : on continue donc
    // d'exiger une configuration existante, et l'on oriente vers l'assistant.
    // ------------------------------------------------------------------
    $cheminEnv = __DIR__ . '/.env';

    // Un `.env` n'est pas la SEULE façon de configurer l'API : `Env::get()` lit
    // d'abord les vraies variables d'environnement, et c'est ainsi que
    // `scripts/api-dev.mjs` travaille depuis toujours — aucun fichier, tout
    // injecté au lancement. Exiger le fichier a cassé `bun run dev`, qui ne
    // démarrait plus du tout. Constaté, pas supposé.
    //
    // Ce qui compte n'est donc pas l'existence d'un fichier mais celle d'une
    // CONFIGURATION. On ne réclame le `.env` que si rien n'est configuré par
    // ailleurs.
    $configureParEnvironnement = Env::get('DB_DRIVER') !== null
        && (Env::get('DB_NAME') !== null || Env::get('DB_SQLITE_PATH') !== null);

    if (!is_file($cheminEnv) && !$configureParEnvironnement) {
        echoLigne('');
        echoLigne('ÉTAPE MANQUANTE : le fichier api/.env n\'existe pas encore.');
        echoLigne('');
        echoLigne('LE PLUS SIMPLE : ouvrez https://votre-domaine/api/install.php dans');
        echoLigne('un navigateur. L\'assistant vous demandera vos identifiants de base');
        echoLigne('de données et écrira ce fichier lui-même — rien à copier à la main.');
        echoLigne('');
        echoLigne('── Marche à suivre pour le faire à la main ──────────────────────');
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
        echoLigne('5. Enregistrez « .env », puis relancez cette commande.');
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
        echoLigne('hébergeur, complétez ces valeurs, enregistrez, puis relancez');
        echoLigne('cette commande.');
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
    // `is_file` d'abord : sans lui, `fileperms()` sur un fichier absent émet un
    // avertissement, que le bootstrap du projet promeut en exception. En
    // développement il n'y a pas de `.env` du tout — l'installation entière
    // échouait donc ici, après avoir créé les tables.
    $permsActuelles = is_file($cheminEnv) ? fileperms($cheminEnv) : false;
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

    // Le noyau partagé avec l'assistant : schéma, compte propriétaire, témoin.
    // `echoLigne` lui sert de sortie, ce qui rend le compte rendu identique à
    // celui d'avant l'assistant.
    $installateur = new Installateur($db, __DIR__, echoLigne(...));
    $ddlTransactionnel = $installateur->ddlTransactionnel();

    $installateur->appliquerSchema();
    $installateur->creerProprietaire(
        Env::get('INSTALL_OWNER_EMAIL'),
        Env::get('INSTALL_OWNER_PASSWORD'),
    );
    $installateur->conclure();

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
    echoLigne(Installateur::annulerEtDecrire($db ?? null, $ddlTransactionnel ?? false));
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
    echoLigne(Installateur::annulerEtDecrire($db ?? null, $ddlTransactionnel ?? false));
    echoLigne('Aucun témoin n\'a été posé : corrigez, puis relancez ce script.');
    terminer(500);
}

// =====================================================================

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
