<?php

/**
 * Preuve anti-survente : N commandes simultanées sur un stock de S unités.
 *
 * POURQUOI CE FICHIER EXISTE. C'est la garantie centrale du produit — deux
 * clients qui achètent le dernier article dans la même seconde ne doivent pas
 * repartir tous les deux avec une confirmation. Elle a été prouvée plusieurs
 * fois pendant le développement, chaque fois par un script jetable écrit dans
 * /tmp, et chaque fois perdu ensuite. Une garantie qu'on ne peut pas rejouer
 * n'est plus une garantie : c'est un souvenir.
 *
 * CE QU'IL VÉRIFIE. Exactement S commandes acceptées (201), N−S refusées (409),
 * aucun autre code, stock final à zéro, et autant de lignes de commande et de
 * mouvements de stock que de commandes acceptées. Ce dernier point compte
 * autant que le premier : accepter le bon nombre de commandes tout en écrivant
 * un mouvement de stock de travers serait une comptabilité fausse.
 *
 * USAGE
 *   php api/tools/preuve-concurrence.php --base=http://127.0.0.1:8160
 *
 *   --base=URL       racine de l'API (défaut http://127.0.0.1:8160)
 *   --produit=ID     produit visé (défaut : le premier trouvé en base)
 *   --concurrents=N  nombre de processus simultanés (défaut 6)
 *   --stock=S        stock initial à poser (défaut 2)
 *
 * Le pilote et les identifiants viennent de l'environnement, comme partout
 * ailleurs (DB_DRIVER, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_SQLITE_PATH) :
 * le même script prouve donc sqlite, mysql et pgsql sans être modifié.
 *
 * AVERTISSEMENT — CE SCRIPT ÉCRIT. Il vide `orders`, `order_items` et
 * `stock_movements`, et force le stock du produit visé. À ne lancer que sur une
 * base de recette. Il refuse de démarrer si la base contient des commandes,
 * précisément pour ne pas effacer celles d'une vraie boutique.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script ne s'exécute qu'en ligne de commande.\n");
}

require_once __DIR__ . '/../src/bootstrap.php';

use KaTech\Db;

// ---------------------------------------------------------------- enfant
//
// Le rôle « enfant » est traité AVANT toute autre chose : un enfant ne doit ni
// relire les options, ni toucher à la base, ni afficher quoi que ce soit
// d'autre que son résultat.
if (($argv[1] ?? '') === 'enfant') {
    [$base, $produit, $top] = [$argv[2], $argv[3], (float) $argv[4]];

    // Attente active jusqu'au top commun. Sans elle, les requêtes partent en
    // file indienne et il n'y a aucune concurrence à prouver — le test
    // passerait au vert en ne testant rien.
    while (microtime(true) < $top) {
        usleep(200);
    }

    $ch = curl_init(rtrim($base, '/') . '/orders');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS     => json_encode([
            'items'           => [['productId' => $produit, 'qty' => 1]],
            'customer'        => ['name' => 'Client concurrent', 'phone' => '0555 11 22 33'],
            'shipping'        => ['wilayaCode' => '16', 'method' => 'home', 'address' => 'Recette'],
            'paymentMethodId' => 'cod',
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $corps = (string) curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    // Pas de curl_close() : déprécié depuis PHP 8.5 et sans effet depuis 8.0.
    // Le bootstrap du projet promeut les avertissements en exceptions, si bien
    // que l'appeler faisait planter l'enfant APRÈS l'envoi de sa commande — le
    // test rendait « 6 réponses ni 201 ni 409 » alors que le serveur avait
    // parfaitement fait son travail. La ressource est libérée à la sortie.

    echo json_encode(['code' => $code, 'corps' => substr($corps, 0, 160)]);
    exit(0);
}

// ------------------------------------------------------------- options
function option(array $argv, string $nom, ?string $defaut = null): ?string
{
    foreach ($argv as $a) {
        if (str_starts_with($a, "--{$nom}=")) {
            return substr($a, strlen($nom) + 3);
        }
    }

    return $defaut;
}

$base         = (string) option($argv, 'base', 'http://127.0.0.1:8160');
$concurrents  = max(2, (int) option($argv, 'concurrents', '6'));
$stockInitial = max(1, (int) option($argv, 'stock', '2'));

if ($stockInitial >= $concurrents) {
    fwrite(STDERR, "Le stock ({$stockInitial}) doit être INFÉRIEUR au nombre de processus "
        . "({$concurrents}) : sans cela il n'y a rien à refuser, et le test ne peut pas échouer.\n");
    exit(2);
}

$db  = Db::instance();
$pdo = $db->pdo();

// ------------------------------------------------------- garde-fou
$commandesExistantes = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
if ($commandesExistantes > 0 && (string) option($argv, 'forcer', '') !== 'oui') {
    fwrite(STDERR, "REFUS : la base contient déjà {$commandesExistantes} commande(s).\n"
        . "Ce script les EFFACERAIT. S'il s'agit bien d'une base de recette, relancez avec\n"
        . "--forcer=oui. Sur une base de production, ne le lancez pas du tout.\n");
    exit(2);
}

$produit = option($argv, 'produit');
if ($produit === null) {
    $produit = (string) $pdo->query('SELECT id FROM products ORDER BY id LIMIT 1')->fetchColumn();
    if ($produit === '') {
        fwrite(STDERR, "Aucun produit en base. Lancez api/tools/importer-donnees-front.php.\n");
        exit(2);
    }
}

// PRÉ-VOL. Sans lui, une base d'essai à laquelle il manque simplement un moyen
// de paiement rend « 6 réponses ni 201 ni 409 » et laisse croire à une faille
// de concurrence. C'est arrivé pendant la mise au point de ce script, et le
// diagnostic a coûté plus cher que le défaut. Un test doit dire POURQUOI il
// échoue, sinon il envoie chercher au mauvais endroit.
$paiements = (int) $pdo->query("SELECT COUNT(*) FROM payment_methods WHERE id = 'cod'")->fetchColumn();
if ($paiements === 0) {
    fwrite(STDERR, "Le moyen de paiement « cod » (paiement à la livraison) n'existe pas dans cette\n"
        . "base : toute commande serait refusée en 422, pour une raison étrangère à la\n"
        . "concurrence. Lancez api/tools/importer-donnees-front.php sur cette base.\n");
    exit(2);
}

$pdo->exec('DELETE FROM order_items');
$pdo->exec('DELETE FROM orders');
$pdo->exec('DELETE FROM stock_movements');
$maj = $pdo->prepare('UPDATE products SET stock_qty = :q WHERE id = :p');
$maj->execute([':q' => $stockInitial, ':p' => $produit]);

printf(
    "Pilote %s — produit « %s », stock posé à %d.\n%d processus simultanés, 1 unité chacun.\n\n",
    $db->pilote(),
    $produit,
    $stockInitial,
    $concurrents
);

// ------------------------------------------------------------ lancement
// Deux secondes de marge : le temps que les N processus PHP démarrent tous et
// atteignent leur boucle d'attente. Trop court, et les premiers seraient partis
// avant que les derniers ne soient nés.
$top = microtime(true) + 2.0;
$processus = [];
foreach (range(1, $concurrents) as $i) {
    $tubes = [];
    $p = proc_open(
        [PHP_BINARY, __FILE__, 'enfant', $base, $produit, (string) $top],
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $tubes
    );
    if ($p === false) {
        fwrite(STDERR, "Impossible de lancer le processus {$i}.\n");
        exit(2);
    }
    $processus[$i] = [$p, $tubes];
}

$codes = [];
foreach ($processus as $i => [$p, $tubes]) {
    $sortie = stream_get_contents($tubes[1]);
    fclose($tubes[1]);
    fclose($tubes[2]);
    proc_close($p);
    $r = json_decode((string) $sortie, true);
    $code = is_array($r) ? (int) $r['code'] : 0;
    $codes[] = $code;
    printf("  processus %d : HTTP %d — %s\n", $i, $code, is_array($r) ? $r['corps'] : trim((string) $sortie));
}
$dureeTotale = microtime(true) - $top;

// -------------------------------------------------------------- verdict
$reussites = count(array_filter($codes, static fn (int $c): bool => $c === 201));
$refus     = count(array_filter($codes, static fn (int $c): bool => $c === 409));
$autres    = count($codes) - $reussites - $refus;

$stockFinal = (int) $pdo->query('SELECT stock_qty FROM products WHERE id = '
    . $pdo->quote($produit))->fetchColumn();
$commandes  = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$lignes     = (int) $pdo->query('SELECT COUNT(*) FROM order_items')->fetchColumn();
$mouvements = (int) $pdo->query('SELECT COUNT(*) FROM stock_movements')->fetchColumn();

printf(
    "\n  201 acceptées : %d   409 refusées : %d   autres : %d\n"
    . "  stock final   : %d\n"
    . "  orders=%d order_items=%d stock_movements=%d\n",
    $reussites,
    $refus,
    $autres,
    $stockFinal,
    $commandes,
    $lignes,
    $mouvements
);

$echecs = [];
if ($reussites !== $stockInitial) {
    $echecs[] = "{$reussites} commande(s) acceptée(s) pour un stock de {$stockInitial}"
        . ($reussites > $stockInitial ? ' — SURVENTE' : ' — refus injustifié');
}
if ($refus !== $concurrents - $stockInitial) {
    $echecs[] = 'nombre de refus inattendu : ' . $refus;
}
if ($autres !== 0) {
    $echecs[] = "{$autres} réponse(s) ni 201 ni 409 — une erreur serveur sous concurrence "
        . 'est un échec, pas un aléa';
}
if ($stockFinal !== 0) {
    $echecs[] = "stock final {$stockFinal} au lieu de 0";
}
// La comptabilité doit suivre : accepter le bon nombre de commandes tout en
// écrivant un mouvement de stock de travers serait une fausse réussite.
if ($commandes !== $stockInitial || $lignes !== $stockInitial || $mouvements !== $stockInitial) {
    $echecs[] = 'écritures incohérentes avec le nombre de commandes acceptées';
}

// LE PIÈGE À NE PAS MANQUER. `php -S` ne sert qu'UNE requête à la fois s'il
// n'a pas de travailleurs. Les six commandes sont alors traitées en file
// indienne : le résultat est parfait, et il ne prouve strictement rien — le
// verrou testé n'a jamais été sollicité. C'est le pire cas possible ici, un
// test qui ne peut pas échouer.
//
// On ne peut pas interroger le serveur là-dessus, mais on peut mesurer : sous
// vraie concurrence les six requêtes se recouvrent et finissent presque
// ensemble ; sérialisées, le temps total croît avec leur nombre. Un doute est
// signalé plutôt qu'ignoré.
$moyenneSiSerialise = $dureeTotale / max(1, $concurrents);
if ($dureeTotale > 0.25 * $concurrents) {
    printf(
        "\nATTENTION — %d requêtes en %.2f s (%.0f ms chacune en moyenne). Ce profil est celui\n"
        . "d'un serveur qui les traite UNE PAR UNE. Si c'est le cas, ce test n'a rien prouvé :\n"
        . "le verrou n'a jamais été mis en concurrence. Avec le serveur intégré de PHP, relancez\n"
        . "l'API avec PHP_CLI_SERVER_WORKERS=%d.\n",
        $concurrents,
        $dureeTotale,
        $moyenneSiSerialise * 1000,
        $concurrents + 2
    );
}

if ($echecs === []) {
    echo "\nVERDICT : OK — aucune survente, le stock n'est jamais passé sous zéro.\n";
    exit(0);
}

echo "\nVERDICT : ÉCHEC\n";
foreach ($echecs as $e) {
    echo "  · {$e}\n";
}
exit(1);
