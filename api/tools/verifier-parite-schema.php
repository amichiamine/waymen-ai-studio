#!/usr/bin/env php
<?php

/**
 * Vérificateur de parité des deux schémas — garde-fou de la CI.
 *
 * Deux schémas maintenus à la main finissent toujours par diverger (PLAN.md).
 * Ce script compare `schema.sqlite.sql` et `schema.mysql.sql` sur :
 *   - la liste des tables ET leur ordre ;
 *   - pour chaque table, la liste des colonnes, leur ordre, leur type
 *     canonique, leur nullabilité, leur clé, leur valeur par défaut ;
 *   - la liste des index, leur table et leurs colonnes.
 *
 * Il sort en code 1 à la moindre divergence, avec la liste des écarts.
 *
 * Usage :
 *   php api/tools/verifier-parite-schema.php
 *
 * Correspondance de types — la seule tolérance admise :
 *   sqlite TEXT             <-> mysql VARCHAR(n) | TEXT | LONGTEXT | MEDIUMTEXT
 *   sqlite TEXT /* JSON *\/ <-> mysql JSON
 *   sqlite INTEGER          <-> mysql INT | BIGINT | TINYINT | SMALLINT
 *   sqlite REAL             <-> mysql DOUBLE | FLOAT | DECIMAL(n,m)
 * Les longueurs VARCHAR ne sont pas comparées : SQLite n'en a pas.
 */

declare(strict_types=1);

$racine = dirname(__DIR__);
$fichierSqlite = $racine . '/schema/schema.sqlite.sql';
$fichierMysql = $racine . '/schema/schema.mysql.sql';

foreach ([$fichierSqlite, $fichierMysql] as $f) {
    if (!is_file($f)) {
        fwrite(STDERR, "ERREUR : fichier de schéma introuvable : {$f}\n");
        exit(1);
    }
}

$sqlite = analyser((string) file_get_contents($fichierSqlite), 'sqlite');
$mysql = analyser((string) file_get_contents($fichierMysql), 'mysql');

$ecarts = comparer($sqlite, $mysql);

if ($ecarts !== []) {
    fwrite(STDERR, "PARITÉ DE SCHÉMA ROMPUE — " . count($ecarts) . " écart(s) :\n");
    foreach ($ecarts as $e) {
        fwrite(STDERR, "  - {$e}\n");
    }
    fwrite(STDERR, "\nCorrigez les deux fichiers de schema/ puis relancez.\n");
    exit(1);
}

$nbTables = count($sqlite['tables']);
$nbColonnes = array_sum(array_map(static fn (array $t): int => count($t), $sqlite['tables']));
$nbIndex = count($sqlite['index']);

echo "PARITÉ OK — {$nbTables} tables, {$nbColonnes} colonnes, {$nbIndex} index identiques des deux côtés.\n";
exit(0);

// =====================================================================
// Analyse
// =====================================================================

/**
 * @return array{tables: array<string,array<string,array<string,mixed>>>, ordreTables: string[], index: array<string,array{table:string,colonnes:string[]}>}
 */
function analyser(string $sql, string $dialecte): array
{
    // Les commentaires de ligne `--` disparaissent, mais PAS les blocs
    // `/* JSON */` qui portent l'intention de type côté SQLite.
    $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;

    $tables = [];
    $ordreTables = [];
    $index = [];

    // ---- Tables ----
    $offset = 0;
    while (preg_match(
        '/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z0-9_]+)[`"]?\s*\(/i',
        $sql,
        $m,
        PREG_OFFSET_CAPTURE,
        $offset
    ) === 1) {
        $nom = strtolower($m[1][0]);
        $debut = $m[0][1] + strlen($m[0][0]); // juste après la parenthèse ouvrante
        $fin = trouverParentheseFermante($sql, $debut);
        if ($fin === null) {
            fwrite(STDERR, "ERREUR d'analyse ({$dialecte}) : parenthèse non fermée pour la table « {$nom} ».\n");
            exit(1);
        }
        $corps = substr($sql, $debut, $fin - $debut);
        $tables[$nom] = analyserColonnes($corps, $dialecte, $nom);
        $ordreTables[] = $nom;
        $offset = $fin + 1;
    }

    // ---- Index ----
    if (preg_match_all(
        '/CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z0-9_]+)[`"]?\s+ON\s+[`"]?([A-Za-z0-9_]+)[`"]?\s*\(([^)]*)\)/i',
        $sql,
        $tous,
        PREG_SET_ORDER
    ) > 0) {
        foreach ($tous as $m) {
            $nomIndex = strtolower($m[2]);
            $colonnes = array_map(
                static fn (string $c): string => strtolower(trim($c, " \t\n`\"")),
                explode(',', $m[4])
            );
            $index[$nomIndex] = [
                'table' => strtolower($m[3]),
                'colonnes' => $colonnes,
                'unique' => trim($m[1]) !== '',
            ];
        }
    }

    return ['tables' => $tables, 'ordreTables' => $ordreTables, 'index' => $index];
}

function trouverParentheseFermante(string $sql, int $depuis): ?int
{
    $profondeur = 1;
    $len = strlen($sql);
    for ($i = $depuis; $i < $len; $i++) {
        $c = $sql[$i];
        if ($c === "'") {
            // Saute la chaîne littérale (les DEFAULT '' et 'pending').
            $i++;
            while ($i < $len && $sql[$i] !== "'") {
                $i++;
            }
            continue;
        }
        if ($c === '(') {
            $profondeur++;
        } elseif ($c === ')') {
            $profondeur--;
            if ($profondeur === 0) {
                return $i;
            }
        }
    }

    return null;
}

/**
 * @return array<string,array<string,mixed>> colonne → descripteur canonique
 */
function analyserColonnes(string $corps, string $dialecte, string $table): array
{
    $colonnes = [];
    foreach (decouperNiveauUn($corps) as $ligne) {
        $ligne = trim($ligne);
        if ($ligne === '') {
            continue;
        }
        // Contraintes de table (PRIMARY KEY (...), FOREIGN KEY, UNIQUE (...)) :
        // aucune n'est utilisée dans ce projet, on refuse pour rester lisible.
        if (preg_match('/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE\s*\(|CONSTRAINT|KEY\s|INDEX\s)/i', $ligne) === 1) {
            fwrite(STDERR, "ERREUR ({$dialecte}, table {$table}) : contrainte de table non supportée par le "
                . "vérificateur : « {$ligne} ». Déclarez-la en ligne sur la colonne.\n");
            exit(1);
        }

        // Marqueur d'intention JSON côté SQLite, puis retrait des commentaires.
        $marqueJson = stripos($ligne, '/* JSON */') !== false;
        $ligne = trim((string) preg_replace('#/\*.*?\*/#s', ' ', $ligne));

        if (preg_match('/^[`"]?([A-Za-z0-9_]+)[`"]?\s+(.*)$/s', $ligne, $m) !== 1) {
            continue;
        }
        $nom = strtolower($m[1]);
        $reste = trim((string) preg_replace('/\s+/', ' ', $m[2]));

        // Type : premier jeton, éventuellement suivi de (n) ou (n,m).
        if (preg_match('/^([A-Za-z]+)(\s*\([0-9,\s]*\))?\s*(.*)$/s', $reste, $t) !== 1) {
            continue;
        }
        $typeBrut = strtoupper($t[1]);
        $drapeaux = strtoupper(trim($t[3]));

        $colonnes[$nom] = [
            'type' => typeCanonique($typeBrut, $marqueJson, $dialecte, $table, $nom),
            'nullable' => stripos($drapeaux, 'NOT NULL') === false,
            'pk' => stripos($drapeaux, 'PRIMARY KEY') !== false,
            'unique' => (bool) preg_match('/\bUNIQUE\b/i', $drapeaux),
            'auto' => (bool) preg_match('/\bAUTO_?INCREMENT\b/i', $drapeaux),
            'defaut' => extraireDefaut($drapeaux),
        ];
    }

    return $colonnes;
}

/** Découpe sur les virgules de niveau 1 (hors parenthèses et hors chaînes). */
function decouperNiveauUn(string $corps): array
{
    $parts = [];
    $courant = '';
    $profondeur = 0;
    $len = strlen($corps);
    for ($i = 0; $i < $len; $i++) {
        $c = $corps[$i];
        if ($c === "'") {
            $courant .= $c;
            $i++;
            while ($i < $len && $corps[$i] !== "'") {
                $courant .= $corps[$i];
                $i++;
            }
            $courant .= "'";
            continue;
        }
        if ($c === '(') {
            $profondeur++;
        } elseif ($c === ')') {
            $profondeur--;
        }
        if ($c === ',' && $profondeur === 0) {
            $parts[] = $courant;
            $courant = '';
            continue;
        }
        $courant .= $c;
    }
    if (trim($courant) !== '') {
        $parts[] = $courant;
    }

    return $parts;
}

function typeCanonique(string $type, bool $marqueJson, string $dialecte, string $table, string $colonne): string
{
    if ($dialecte === 'sqlite') {
        if ($marqueJson) {
            if ($type !== 'TEXT') {
                fwrite(STDERR, "ERREUR (sqlite, {$table}.{$colonne}) : marqueur /* JSON */ posé sur un "
                    . "type « {$type} » ; il doit l'être sur TEXT.\n");
                exit(1);
            }

            return 'json';
        }

        return match ($type) {
            'TEXT' => 'text',
            'INTEGER' => 'int',
            'REAL' => 'real',
            'BLOB' => 'blob',
            default => erreurType($dialecte, $table, $colonne, $type),
        };
    }

    return match ($type) {
        'JSON' => 'json',
        'VARCHAR', 'CHAR', 'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT' => 'text',
        'INT', 'INTEGER', 'BIGINT', 'TINYINT', 'SMALLINT', 'MEDIUMINT' => 'int',
        'DOUBLE', 'FLOAT', 'DECIMAL', 'NUMERIC' => 'real',
        'BLOB', 'LONGBLOB', 'MEDIUMBLOB' => 'blob',
        default => erreurType($dialecte, $table, $colonne, $type),
    };
}

function erreurType(string $dialecte, string $table, string $colonne, string $type): string
{
    fwrite(STDERR, "ERREUR ({$dialecte}, {$table}.{$colonne}) : type « {$type} » non reconnu par le "
        . "vérificateur de parité. Ajoutez-le à la table de correspondance de ce script si c'est voulu.\n");
    exit(1);
}

/** Extrait et normalise la valeur par défaut, ou null s'il n'y en a pas. */
function extraireDefaut(string $drapeaux): ?string
{
    if (preg_match("/\bDEFAULT\s+('(?:[^']*)'|[A-Za-z0-9_.\-+]+)/i", $drapeaux, $m) !== 1) {
        return null;
    }
    $v = trim($m[1]);
    if (str_starts_with($v, "'")) {
        return "'" . trim($v, "'") . "'";
    }

    return strtoupper($v);
}

// =====================================================================
// Comparaison
// =====================================================================

/** @return string[] liste lisible des écarts */
function comparer(array $a, array $b): array
{
    $ecarts = [];

    // ---- Tables : présence ET ordre ----
    $manquantesMysql = array_diff($a['ordreTables'], $b['ordreTables']);
    $manquantesSqlite = array_diff($b['ordreTables'], $a['ordreTables']);
    foreach ($manquantesMysql as $t) {
        $ecarts[] = "table « {$t} » présente en SQLite, absente en MySQL";
    }
    foreach ($manquantesSqlite as $t) {
        $ecarts[] = "table « {$t} » présente en MySQL, absente en SQLite";
    }
    if ($manquantesMysql === [] && $manquantesSqlite === [] && $a['ordreTables'] !== $b['ordreTables']) {
        $ecarts[] = 'les tables ne sont pas déclarées dans le même ordre dans les deux fichiers ('
            . implode(', ', $a['ordreTables']) . ' vs ' . implode(', ', $b['ordreTables']) . ')';
    }

    // ---- Colonnes ----
    foreach ($a['tables'] as $table => $colsA) {
        if (!isset($b['tables'][$table])) {
            continue;
        }
        $colsB = $b['tables'][$table];

        foreach (array_diff(array_keys($colsA), array_keys($colsB)) as $c) {
            $ecarts[] = "{$table}.{$c} : présente en SQLite, absente en MySQL";
        }
        foreach (array_diff(array_keys($colsB), array_keys($colsA)) as $c) {
            $ecarts[] = "{$table}.{$c} : présente en MySQL, absente en SQLite";
        }
        if (array_keys($colsA) === array_keys($colsB)) {
            // Ordre identique attendu — même liste, même séquence.
            foreach ($colsA as $nom => $descA) {
                $descB = $colsB[$nom];
                foreach (['type', 'nullable', 'pk', 'unique', 'auto', 'defaut'] as $attr) {
                    if ($descA[$attr] !== $descB[$attr]) {
                        $ecarts[] = sprintf(
                            '%s.%s : %s diverge (sqlite=%s, mysql=%s)',
                            $table,
                            $nom,
                            $attr,
                            formater($descA[$attr]),
                            formater($descB[$attr]),
                        );
                    }
                }
            }
        } elseif (array_diff(array_keys($colsA), array_keys($colsB)) === []
            && array_diff(array_keys($colsB), array_keys($colsA)) === []) {
            $ecarts[] = "{$table} : mêmes colonnes mais ordre différent entre les deux schémas";
        }
    }

    // ---- Index ----
    foreach (array_diff(array_keys($a['index']), array_keys($b['index'])) as $i) {
        $ecarts[] = "index « {$i} » présent en SQLite, absent en MySQL";
    }
    foreach (array_diff(array_keys($b['index']), array_keys($a['index'])) as $i) {
        $ecarts[] = "index « {$i} » présent en MySQL, absent en SQLite";
    }
    foreach ($a['index'] as $nom => $defA) {
        if (!isset($b['index'][$nom])) {
            continue;
        }
        $defB = $b['index'][$nom];
        if ($defA['table'] !== $defB['table']) {
            $ecarts[] = "index « {$nom} » : table différente ({$defA['table']} vs {$defB['table']})";
        }
        if ($defA['colonnes'] !== $defB['colonnes']) {
            $ecarts[] = sprintf(
                'index « %s » : colonnes différentes (%s vs %s)',
                $nom,
                implode('+', $defA['colonnes']),
                implode('+', $defB['colonnes']),
            );
        }
        if ($defA['unique'] !== $defB['unique']) {
            $ecarts[] = "index « {$nom} » : unicité divergente";
        }
    }

    return $ecarts;
}

function formater(mixed $v): string
{
    if (is_bool($v)) {
        return $v ? 'oui' : 'non';
    }

    return $v === null ? '(aucun)' : (string) $v;
}
