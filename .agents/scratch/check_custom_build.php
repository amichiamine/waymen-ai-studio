<?php
$pdo = new PDO('sqlite:C:/xampp/htdocs/waymen/katech-data/dev-a97b6b98a368.sqlite');
foreach ($pdo->query("SELECT id, category, custom_build FROM products") as $r) {
    echo "{$r['id']} | cat={$r['category']} | custom=" . var_export($r['custom_build'], true) . "\n";
}

