<?php

/**
 * Travailleur CRON — vide l'outbox.
 *
 * Ce script lit les événements en attente, les émet, et marque le résultat.
 *
 * Utilisation :
 *   php api/tools/vider-outbox.php
 *
 * Exemple de CRON (toutes les 5 minutes) :
 *   *\/5 * * * * php /chemin/vers/api/tools/vider-outbox.php >> /var/log/katech-outbox.log 2>&1
 *
 * Variables d'environnement supplémentaires (api/.env) :
 *   OUTBOX_WEBHOOK_URL   URL cible générique pour tous les événements.
 *                        Optionnelle : si absente, le script tourne sans rien
 *                        émettre et le dit clairement.
 *   OUTBOX_WEBHOOK_SECRET  Secret partagé pour le header `X-Katech-Signature`.
 *                          Optionnel.
 *   OUTBOX_BATCH_SIZE    Nombre d'événements traités par exécution (défaut 50).
 *
 * Garanties :
 *   1. Réessai avec recul progressif (géré par Outbox::marquerEchec).
 *   2. Abandon définitif après Outbox::MAX_TENTATIVES — visible via last_error.
 *   3. Verrou d'exécution : deux CRON concurrents ne dépilent pas le même événement
 *      (SELECT … FOR UPDATE en MySQL, ou traitement sérialisé via le verrou SQLite).
 *   4. Aucune transaction longue : le marquage est fait APRÈS l'appel réseau, hors
 *      transaction.
 *   5. Sortie lisible : un exploitant qui lance le script à la main comprend ce qui
 *      s'est passé ligne par ligne.
 *
 * Structure de destination :
 *   OUTBOX_WEBHOOK_URL reçoit un POST JSON :
 *   {
 *     "id": 42,
 *     "topic": "order.created",
 *     "payload": { … },
 *     "createdAt": "2026-08-06T…"
 *   }
 *   avec l'en-tête `X-Katech-Signature: sha256=<hmac>` si OUTBOX_WEBHOOK_SECRET
 *   est défini.
 *
 * Extension aux intégrations nommées (Telegram, Notion…) :
 *   Ajouter un bloc `case 'order.created':` dans emettre() ci-dessous, qui
 *   appelle le handler approprié. Le webhook générique reste le repli par défaut.
 */

declare(strict_types=1);

// ---- Autoloader et bootstrap ------------------------------------------------
// Ce script est appelé en CLI, depuis n'importe quel répertoire.
$racineApi = dirname(__DIR__);
require $racineApi . '/src/bootstrap.php';

use KaTech\Db;
use KaTech\Env;
use KaTech\Outbox;

$depart = microtime(true);

// ---- Verrou d'exécution -----------------------------------------------------
// Empêche deux instances CRON qui se chevauchent de dépiler les mêmes événements.
// Le verrou est un fichier : léger, portable, sans dépendance.
$verrouChemin = sys_get_temp_dir() . '/katech-outbox.lock';
$verrou = fopen($verrouChemin, 'c+');
if ($verrou === false) {
    sortirErreur("Impossible de créer le fichier de verrou : {$verrouChemin}");
}

if (!flock($verrou, LOCK_EX | LOCK_NB)) {
    // Une autre instance tourne déjà : on sort proprement sans rien faire.
    echo '[outbox] Une autre instance est déjà en cours. Sortie.\n';
    fclose($verrou);
    exit(0);
}

// ---- Configuration ----------------------------------------------------------
Env::charger();

$webhookUrl    = (string) Env::get('OUTBOX_WEBHOOK_URL', '');
$webhookSecret = (string) Env::get('OUTBOX_WEBHOOK_SECRET', '');
$tailleLot     = max(1, min(500, (int) Env::get('OUTBOX_BATCH_SIZE', '50')));

if ($webhookUrl === '') {
    echo "[outbox] Aucune destination configurée (OUTBOX_WEBHOOK_URL absent).\n";
    echo "[outbox] Les événements restent en attente jusqu'à ce qu'une destination soit ajoutée.\n";
    libererVerrouEtSortir($verrou, 0);
}

// ---- Initialisation ---------------------------------------------------------
$db     = Db::instance();
$outbox = new Outbox($db);

// ---- Traitement -------------------------------------------------------------
$evenements = $outbox->enAttente($tailleLot);
$nbTotal    = count($evenements);

if ($nbTotal === 0) {
    echo "[outbox] Aucun événement en attente.\n";
    libererVerrouEtSortir($verrou, 0);
}

echo "[outbox] {$nbTotal} événement(s) à traiter.\n";

$nbSucces = 0;
$nbEchec  = 0;

foreach ($evenements as $evt) {
    $id        = (int) $evt['id'];
    $topic     = (string) $evt['topic'];
    $tentatives = (int) $evt['attempts'];

    echo "[outbox] #{$id} topic={$topic} tentative=" . ($tentatives + 1) . '/' . Outbox::MAX_TENTATIVES . ' … ';

    $erreur = emettre($id, $topic, $evt['payload'], $evt['created_at'], $webhookUrl, $webhookSecret);

    if ($erreur === null) {
        $outbox->marquerEmis($id);
        $nbSucces++;
        echo "OK\n";
    } else {
        $outbox->marquerEchec($id, $tentatives, $erreur);
        $nbEchec++;
        $definitif = ($tentatives + 1) >= Outbox::MAX_TENTATIVES;
        $suffixe   = $definitif ? ' → ABANDON DÉFINITIF (status=failed)' : ' → réessai planifié';
        echo "ÉCHEC{$suffixe} : {$erreur}\n";
    }
}

$duree = round(microtime(true) - $depart, 2);
echo "[outbox] Terminé en {$duree} s : {$nbSucces} émis, {$nbEchec} échoué(s).\n";

libererVerrouEtSortir($verrou, 0);

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Tente d'émettre un événement vers le webhook générique.
 *
 * Structure extensible : ajoutez ici des `case` pour Telegram, Notion, etc.
 * Le webhook générique est le repli par défaut pour tous les topics non gérés.
 *
 * Aucune transaction n'est ouverte ici. Le marquage (marquerEmis / marquerEchec)
 * est fait par l'appelant, APRÈS le retour de cette fonction.
 *
 * @return string|null  null si succès, message d'erreur sinon
 */
function emettre(
    int $id,
    string $topic,
    mixed $payloadBrut,
    mixed $createdAt,
    string $webhookUrl,
    string $webhookSecret,
): ?string {
    // Intégrations nommées — à étoffer au fur et à mesure.
    // Exemple :
    //   case 'order.created':
    //       return emettreVersTelegram($id, $payload, $config);
    //
    // Pour l'instant : toujours le webhook générique.

    return emettreWebhookGenerique($id, $topic, $payloadBrut, $createdAt, $webhookUrl, $webhookSecret);
}

/**
 * Envoie un POST JSON au webhook générique.
 *
 * @return string|null  null si HTTP 2xx, message d'erreur sinon
 */
function emettreWebhookGenerique(
    int $id,
    string $topic,
    mixed $payloadBrut,
    mixed $createdAt,
    string $webhookUrl,
    string $webhookSecret,
): ?string {
    $payload = is_string($payloadBrut)
        ? json_decode($payloadBrut, true)
        : $payloadBrut;

    $corps = json_encode([
        'id'        => $id,
        'topic'     => $topic,
        'payload'   => $payload,
        'createdAt' => (string) $createdAt,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($corps === false) {
        return 'Impossible de sérialiser le payload en JSON.';
    }

    $entetes = [
        'Content-Type: application/json',
        'User-Agent: KaTech-Outbox/1.0',
    ];

    if ($webhookSecret !== '') {
        $signature = hash_hmac('sha256', $corps, $webhookSecret);
        $entetes[] = "X-Katech-Signature: sha256={$signature}";
    }

    $contexte = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => implode("\r\n", $entetes),
            'content'       => $corps,
            'timeout'       => 10,          // secondes — pas de blocage indéfini
            'ignore_errors' => true,        // pour récupérer le code HTTP même en 4xx/5xx
        ],
    ]);

    // `file_get_contents` avec un contexte HTTP : c'est le seul appel réseau du
    // script, et il est entièrement HORS transaction.
    $reponse = @file_get_contents($webhookUrl, false, $contexte);

    if ($reponse === false) {
        return "Impossible de joindre le webhook ({$webhookUrl}) : " . (error_get_last()['message'] ?? 'erreur inconnue');
    }

    // Le code HTTP est dans les métadonnées de la réponse.
    if (!isset($http_response_header) || !is_array($http_response_header)) {
        return 'Réponse HTTP illisible.';
    }

    // La première ligne de $http_response_header est « HTTP/1.1 200 OK ».
    if (!preg_match('/HTTP\/[\d.]+ (\d{3})/', $http_response_header[0], $m)) {
        return 'En-tête HTTP illisible : ' . $http_response_header[0];
    }

    $code = (int) $m[1];
    if ($code < 200 || $code >= 300) {
        return "Le webhook a répondu HTTP {$code}.";
    }

    return null;
}

/**
 * Libère le verrou, ferme le fichier, et sort avec le code donné.
 *
 * @param resource $verrou
 */
function libererVerrouEtSortir(mixed $verrou, int $code): never
{
    flock($verrou, LOCK_UN);
    fclose($verrou);
    exit($code);
}

/** Affiche une erreur fatale et sort avec le code 1. */
function sortirErreur(string $message): never
{
    fwrite(STDERR, "[outbox] ERREUR FATALE : {$message}\n");
    exit(1);
}
