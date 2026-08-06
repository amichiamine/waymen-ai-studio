#!/usr/bin/env php
<?php

/**
 * Migration de base à base — habillage console de `KaTech\Migration\Migrateur`.
 *
 * Ce fichier ne contient AUCUNE logique de migration : il lit des arguments,
 * ouvre deux connexions PDO et met en forme le rapport (qui est une structure
 * de données, cf. `KaTech\Migration\Rapport`). La même classe sert la page
 * d'administration : ce qui est vérifié ici l'est aussi là-bas.
 *
 * MODE PAR DÉFAUT : SIMULATION. Rien n'est écrit tant que `--reelle` n'est pas
 * passé explicitement. Une migration destructrice ne doit jamais partir d'une
 * commande tapée à moitié.
 *
 * Utilisation :
 *   # 1. Répétition générale — lit tout, contrôle tout, n'écrit rien
 *   php api/tools/migrer.php \
 *       --source='sqlite:/home/monuser/katech-data/katech.sqlite' \
 *       --cible='mysql:host=localhost;dbname=katech' \
 *       --cible-utilisateur=katech --cible-mdp-env=MDP_CIBLE
 *
 *   # 2. Migration réelle, une fois la simulation verte
 *   php api/tools/migrer.php --source=… --cible=… --reelle
 *
 *   # 3. Cible déjà peuplée : il faut le demander
 *   php api/tools/migrer.php --source=… --cible=… --reelle --remplacer
 *
 *   # 4. Cible vierge : créer les tables au passage
 *   php api/tools/migrer.php --source=… --cible=… --reelle --creer-schema
 *
 *   # 5. Contrôle d'après-coup : deux bases déjà remplies, on compare
 *   php api/tools/migrer.php --source=… --cible=… --json | grep identique
 *
 * DSN acceptés :
 *   sqlite:/chemin/absolu/base.sqlite
 *   mysql:host=127.0.0.1;port=3306;dbname=katech;charset=utf8mb4
 *   pgsql:host=127.0.0.1;port=5432;dbname=katech
 *
 * Mots de passe : préférez `--cible-mdp-env=NOM_DE_VARIABLE` à `--cible-mdp=…`.
 * Un mot de passe passé en argument est lisible par tout le monde dans la
 * liste des processus (`ps aux`).
 *
 * Codes de sortie : 0 = succès, 1 = échec (rien n'a été validé côté cible).
 */

declare(strict_types=1);

// =====================================================================
// GARDE D'EXÉCUTION — même barrière que api/tools/sauvegarder.php
// =====================================================================
// Ce script porte des identifiants de connexion et peut effacer une base
// entière. Il ne doit jamais s'exécuter parce que quelqu'un a tapé son URL.
// L'interface web du propriétaire n'appelle PAS ce fichier : elle instancie
// directement `KaTech\Migration\Migrateur`, qui n'a pas ce pouvoir de purge
// sans options explicites.
$sapiWeb = in_array(PHP_SAPI, [
    'apache', 'apache2handler', 'apache2filter', 'litespeed', 'fpm-fcgi', 'uwsgi', 'srv',
], true);
$signauxHttp = isset($_SERVER['REQUEST_METHOD']) || isset($_SERVER['REQUEST_URI']) || isset($_SERVER['HTTP_HOST']);

if ($sapiWeb || $signauxHttp) {
    if (!headers_sent()) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
    }
    echo "Acces refuse : ce script est un outil d'administration en ligne de commande.\n";
    error_log('[katech-migration] Tentative d\'appel par HTTP refusée.');
    exit(1);
}

require_once dirname(__DIR__) . '/src/bootstrap.php';

use KaTech\Migration\Migrateur;
use KaTech\Migration\Rapport;

$options = lireArguments($argv);

if (isset($options['aide']) || isset($options['help'])) {
    echo aide();
    exit(0);
}

foreach (['source', 'cible'] as $requis) {
    if (!isset($options[$requis]) || !is_string($options[$requis]) || trim($options[$requis]) === '') {
        echoErreur("L'option --{$requis}=DSN est obligatoire.");
        echo aide();
        exit(1);
    }
}

try {
    $source = Migrateur::connecter(
        (string) $options['source'],
        isset($options['source-utilisateur']) ? (string) $options['source-utilisateur'] : null,
        motDePasse($options, 'source'),
    );
    $cible = Migrateur::connecter(
        (string) $options['cible'],
        isset($options['cible-utilisateur']) ? (string) $options['cible-utilisateur'] : null,
        motDePasse($options, 'cible'),
    );
} catch (Throwable $e) {
    echoErreur($e->getMessage());
    exit(1);
}

$mode = isset($options['reelle']) ? Rapport::MODE_REELLE : Rapport::MODE_SIMULATION;

$migrateur = new Migrateur($source, $cible, [
    'mode' => $mode,
    'remplacer' => isset($options['remplacer']),
    'creer_schema' => isset($options['creer-schema']),
    'budget_s' => isset($options['budget']) ? (float) $options['budget'] : 300.0,
    'lignes_par_lot' => isset($options['lot']) ? max(1, (int) $options['lot']) : 500,
    'tables' => isset($options['tables'])
        ? array_values(array_filter(array_map('trim', explode(',', (string) $options['tables']))))
        : [],
    'etiquette_source' => Migrateur::masquer((string) $options['source']),
    'etiquette_cible' => Migrateur::masquer((string) $options['cible']),
]);

$rapport = $migrateur->executer();

if (isset($options['json'])) {
    echo json_encode($rapport, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
} else {
    echo rendre($rapport);
}

exit($rapport['ok'] === true ? 0 : 1);

// =====================================================================
// Mise en forme — la seule responsabilité de ce fichier
// =====================================================================

/** @param array<string,mixed> $r */
function rendre(array $r): string
{
    $s = "\n";
    $s .= "==========================================================================\n";
    $s .= ' MIGRATION KA TECH — ' . strtoupper((string) $r['mode']) . "\n";
    $s .= "==========================================================================\n";
    $s .= ' Source : ' . descripteur($r['source']) . "\n";
    $s .= ' Cible  : ' . descripteur($r['cible']) . "\n";
    $s .= ' Durée  : ' . $r['duree_s'] . " s\n\n";

    $s .= sprintf(" %-20s %8s %8s %-27s %s\n", 'TABLE', 'LUES', 'ÉCRITES', 'EMPREINTE SOURCE', 'CONTENU');
    $s .= ' ' . str_repeat('-', 72) . "\n";

    foreach ($r['tables'] as $t) {
        $verdict = match ($t['identique']) {
            true => 'identique',
            false => 'DIVERGENT',
            default => '—',
        };
        $s .= sprintf(
            " %-20s %8d %8d %-27s %s%s\n",
            $t['table'],
            $t['lues'],
            $t['ecrites'],
            (string) ($t['empreinte_source'] ?? '—'),
            $verdict,
            $t['anomalies'] > 0 ? '  (' . $t['anomalies'] . ' anomalie(s))' : '',
        );
    }

    $tot = $r['totaux'];
    $s .= ' ' . str_repeat('-', 72) . "\n";
    $s .= sprintf(
        " %-20s %8d %8d  %d/%d table(s) au contenu identique\n\n",
        'TOTAL (' . $tot['tables'] . ' tables)',
        $tot['lues'],
        $tot['ecrites'],
        $tot['tables_identiques'],
        $tot['tables'],
    );

    if ($r['sequences'] !== []) {
        $s .= " Séquences / auto-incréments repositionnés :\n";
        foreach ($r['sequences'] as $sq) {
            $s .= "   - {$sq['table']}.{$sq['colonne']} (max {$sq['valeur']}) : {$sq['note']}\n";
        }
        $s .= "\n";
    }

    if ($r['anomalies'] !== []) {
        $s .= ' ANOMALIES (' . $tot['erreurs'] . ' bloquante(s), ' . $tot['avertissements'] . " avertissement(s)) :\n";
        foreach ($r['anomalies'] as $a) {
            $contexte = [];
            foreach (['table', 'colonne', 'ligne', 'origine'] as $cle) {
                if (isset($a[$cle])) {
                    $contexte[] = $cle . '=' . $a[$cle];
                }
            }
            $s .= '   [' . strtoupper((string) $a['gravite']) . '] ' . $a['message']
                . ($contexte === [] ? '' : ' {' . implode(' ', $contexte) . '}') . "\n";
        }
        $s .= "\n";
    }

    if ($r['ok'] === true) {
        $s .= $r['mode'] === Rapport::MODE_SIMULATION
            ? " SIMULATION RÉUSSIE — rien n'a été écrit. Relancez avec --reelle pour migrer.\n"
            : " MIGRATION RÉUSSIE — contenu vérifié table par table, transaction validée.\n";
    } else {
        $s .= " ÉCHEC : " . ($r['motif'] ?? 'voir les anomalies ci-dessus') . "\n";
        $s .= $r['mode'] === Rapport::MODE_REELLE
            ? " La transaction a été annulée : la base cible n'a pas été modifiée.\n"
            : " Corrigez les anomalies avant d'envisager une migration réelle.\n";
    }

    return $s . "\n";
}

/** @param array<string,mixed> $d */
function descripteur(array $d): string
{
    return ($d['etiquette'] ?? $d['pilote'])
        . ' [' . $d['pilote'] . ($d['version'] !== null ? ' ' . $d['version'] : '') . ']';
}

// =====================================================================
// Arguments
// =====================================================================

/**
 * @param array<int,string> $argv
 * @return array<string,string|true>
 */
function lireArguments(array $argv): array
{
    $connues = [
        'source', 'source-utilisateur', 'source-mdp', 'source-mdp-env',
        'cible', 'cible-utilisateur', 'cible-mdp', 'cible-mdp-env',
        'reelle', 'remplacer', 'creer-schema', 'budget', 'lot', 'tables', 'json', 'aide', 'help',
    ];

    $options = [];
    foreach (array_slice($argv, 1) as $arg) {
        if (!str_starts_with($arg, '--')) {
            echoErreur("Argument non reconnu : « {$arg} ».");
            echo aide();
            exit(1);
        }
        $arg = substr($arg, 2);
        $pos = strpos($arg, '=');
        if ($pos === false) {
            $options[$arg] = true;
        } else {
            $options[substr($arg, 0, $pos)] = substr($arg, $pos + 1);
        }
    }

    foreach (array_keys($options) as $cle) {
        if (!in_array($cle, $connues, true)) {
            echoErreur("Option inconnue : « --{$cle} ».");
            echo aide();
            exit(1);
        }
    }

    return $options;
}

/**
 * Mot de passe d'un côté, par variable d'environnement de préférence.
 *
 * @param array<string,string|true> $options
 */
function motDePasse(array $options, string $cote): ?string
{
    $viaEnv = $options[$cote . '-mdp-env'] ?? null;
    if (is_string($viaEnv) && $viaEnv !== '') {
        $valeur = getenv($viaEnv);
        if ($valeur === false) {
            echoErreur("La variable d'environnement « {$viaEnv} » n'est pas définie.");
            exit(1);
        }

        return $valeur;
    }

    $direct = $options[$cote . '-mdp'] ?? null;

    return is_string($direct) ? $direct : null;
}

function echoErreur(string $message): void
{
    fwrite(STDERR, "[migration] ÉCHEC : {$message}\n");
}

function aide(): string
{
    return <<<TXT

    Usage : php api/tools/migrer.php --source=DSN --cible=DSN [options]

      --source=DSN              Base LUE.    sqlite:/chemin | mysql:host=…;dbname=… | pgsql:host=…;dbname=…
      --cible=DSN               Base ÉCRITE. Même syntaxe.
      --source-utilisateur=NOM  Identifiant de connexion (inutile en SQLite).
      --cible-utilisateur=NOM
      --source-mdp-env=VAR      Mot de passe lu dans une variable d'environnement (recommandé).
      --cible-mdp-env=VAR
      --source-mdp=…            Mot de passe en clair — visible dans « ps aux », à éviter.
      --cible-mdp=…

      --reelle                  Écrit réellement. SANS cette option : simulation, aucune écriture.
      --remplacer               Autorise l'effacement d'une cible non vide. Sauvegardez d'abord.
      --creer-schema            Applique api/schema/schema.<pilote>.sql à la cible avant de migrer.
      --budget=SECONDES         Annule tout au-delà (défaut 300 en CLI ; visez 25 derrière une requête HTTP).
      --lot=N                   Lignes lues par aller-retour (défaut 500).
      --tables=a,b,c            Restreint la migration à ces tables.
      --json                    Rend le rapport brut, pour un autre programme.
      --aide                    Ce message.

    Ordre recommandé : simulation → lecture des anomalies → --reelle.

    TXT;
}
