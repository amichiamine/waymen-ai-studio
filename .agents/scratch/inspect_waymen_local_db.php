<?php
$pdo = new PDO('sqlite:C:/xampp/htdocs/waymen/katech-data/dev-a97b6b98a368.sqlite');
$h = json_decode($pdo->query("SELECT payload FROM site_content WHERE section = 'hero'")->fetchColumn(), true);
print_r($h);
