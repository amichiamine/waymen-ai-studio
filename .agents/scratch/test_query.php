<?php
require_once __DIR__ . '/../../api/src/bootstrap.php';
$db = KaTech\Db::instance();

$req = new KaTech\Requete('GET', '/products', ['category' => 'llm-assistants']);
$ctrl = new KaTech\Controllers\ControleurProduits($db);
$resp = $ctrl->lister($req);
echo $resp->corps . "\n";
