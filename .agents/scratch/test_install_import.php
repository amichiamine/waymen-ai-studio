<?php
require __DIR__ . '/../../api/src/bootstrap.php';
putenv('DB_DRIVER=sqlite');
putenv('DB_SQLITE_PATH=' . __DIR__ . '/test_install.sqlite');
if (file_exists(__DIR__ . '/test_install.sqlite')) unlink(__DIR__ . '/test_install.sqlite');
KaTech\Db::reinitialiser();
$db = KaTech\Db::instance();
$inst = new KaTech\Installation\Installateur($db, dirname(__DIR__, 2) . '/api', fn($l) => null);
$inst->appliquerSchema();
$imp = new KaTech\Installation\ImporteurDonneesFront(dirname(__DIR__, 2) . '/api/tools/donnees-front.json', $db);
$res = $imp->importer();
var_dump($res);
