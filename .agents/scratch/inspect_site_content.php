<?php
$db = new PDO('sqlite:katech-data/dev-a97b6b98a368.sqlite');
$stmt = $db->query('SELECT section, length(payload) as len, substr(payload, 1, 120) as snippet FROM site_content');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['section'] . ' (' . $row['len'] . ' octets): ' . $row['snippet'] . PHP_EOL;
}
