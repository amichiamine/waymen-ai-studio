<?php
$variantes = [
    'Constantine25**',
    'constantine25**',
    'Constantine25*',
    'Constantine25',
    'Constantine2025**',
    'Constantine2026**',
];

foreach ($variantes as $mdp) {
    $payload = json_encode(['email' => 'a@a.a', 'password' => $mdp]);
    $ch = curl_init('https://waymen.stacgate.com/api/v1/auth/login');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "Test MDP: '$mdp' -> Code HTTP: $code\n";
    if ($code === 200) {
        echo ">>> SUCCES AVEC LE MOT DE PASSE : $mdp <<<\n";
        break;
    }
}
