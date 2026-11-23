<?php
$db = new PDO('sqlite:katech-data/dev-a97b6b98a368.sqlite');
$stmt = $db->query("SELECT payload FROM site_content WHERE section = 'customPages'");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$pages = json_decode($row['payload'], true);

foreach ($pages as &$p) {
    if ($p['id'] === 'page_home' || $p['slug'] === '') {
        foreach ($p['blocks'] as &$b) {
            if ($b['type'] === 'flash_sale') {
                $b['props']['subtitle'] = [
                    'fr' => "Remises exceptionnelles sur une sélection d'abonnements IA et formations.",
                    'en' => "Instant discounts on selected AI subscriptions and masterclasses.",
                    'ar' => "خصومات استثنائية على اشتراكات الذكاء الاصطناعي والدورات المختارة."
                ];
                $b['props']['viewAllLabel'] = [
                    'fr' => "Voir Toutes les Promos",
                    'en' => "View All Deals",
                    'ar' => "عرض جميع العروض"
                ];
                $b['props']['viewAllHref'] = "/catalogue";
                $b['props']['countdownHours'] = 72;
                echo "Bloc flash_sale mis à jour dans page_home !" . PHP_EOL;
            }
        }
    }
}

$up = $db->prepare("UPDATE site_content SET payload = :p, updated_at = :u WHERE section = 'customPages'");
$up->execute([
    ':p' => json_encode($pages, JSON_UNESCAPED_UNICODE),
    ':u' => gmdate('c')
]);

echo "Base SQLite locale mise à jour avec succès !" . PHP_EOL;
