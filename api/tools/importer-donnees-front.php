#!/usr/bin/env php
<?php

/**
 * Importeur des données de démonstration du frontend — OUTIL DE DÉVELOPPEMENT.
 *
 * Charge le fichier JSON produit par `bun run scripts/extraire-donnees-front.ts`
 * et insère les données dans la base de données active (SQLite ou MySQL).
 *
 * Voie retenue : extraction Node/bun → artefact JSON versionné → import PHP.
 * Justification : le frontend est en TypeScript avec des imports d'assets non
 * exécutables depuis PHP. L'extraction Node produit une seule source de vérité
 * rejouable si les données du frontend évoluent. Le PHP lit ce JSON neutre,
 * évitant toute dépendance à la chaîne de build JS.
 *
 * LOGIQUE PORTÉE PAR `ImporteurDonneesFront`
 *
 * Cet outil est le point d'entrée CLI. La logique réelle (upserts, rattrapage
 * JSON, rapport) est dans `api/src/Installation/ImporteurDonneesFront.php`,
 * une classe PHP pure. Elle est aussi appelée directement par l'assistant
 * d'installation web — aucun sous-processus nécessaire, aucune dépendance à
 * `proc_open` ou au binaire PHP en ligne de commande.
 *
 * Garanties (tenues par ImporteurDonneesFront) :
 *  - Idempotent : peut être relancé sans créer de doublon (upsert par clé).
 *  - Multilingue : les champs Localized<string> sont stockés en JSON, sans
 *    aplatissement (conformément à docs/LOCALIZED-DATA.md) — TOUJOURS encodés,
 *    y compris quand la valeur est une chaîne simple (`"texte"`, guillemets
 *    compris).
 *  - Rattrapage : les bases déjà remplies avec des valeurs brutes sont
 *    réencodées au passage.
 *  - Requêtes préparées exclusivement.
 *  - Fonctionne sur SQLite et MySQL (Db::upsert() absorbe la divergence).
 *
 * Usage :
 *   DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/katech.sqlite php api/tools/importer-donnees-front.php
 *   DB_DRIVER=mysql php api/tools/importer-donnees-front.php
 *
 * Prérequis : `bun run scripts/extraire-donnees-front.ts` doit avoir été
 * exécuté au préalable pour générer api/tools/donnees-front.json.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script est réservé à la ligne de commande.\n");
}

require_once __DIR__ . '/../src/bootstrap.php';

use KaTech\Db;
use KaTech\Installation\ImporteurDonneesFront;

$cheminJson = __DIR__ . '/donnees-front.json';

if (!is_file($cheminJson)) {
    fwrite(STDERR, "ERREUR : {$cheminJson} introuvable.\n");
    fwrite(STDERR, "Lancez d'abord : bun run scripts/extraire-donnees-front.ts\n");
    exit(1);
}

$db      = Db::instance();
$importeur = new ImporteurDonneesFront($cheminJson, $db);
$resultat  = $importeur->importer();

if (!$resultat['ok']) {
    fwrite(STDERR, "ERREUR : " . ($resultat['erreur'] ?? 'Import échoué.') . "\n");
    exit(1);
}

// Afficher le rapport complet (identique à l'ancienne sortie).
echo $resultat['details'] . "\n";
