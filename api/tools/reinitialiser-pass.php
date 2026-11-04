#!/usr/bin/env php
<?php

/**
 * Réinitialisation d'urgence de mot de passe utilisateur en CLI.
 *
 * Permet à l'administrateur système ou propriétaire de redéfinir en toute
 * sécurité le mot de passe d'un utilisateur (Owner, Admin, Editor ou Client)
 * sans dépendre d'un serveur SMTP ou de l'envoi d'e-mails.
 *
 * Usage :
 *   php api/tools/reinitialiser-pass.php <email> [nouveau_mot_de_passe]
 *
 * Exemple :
 *   php api/tools/reinitialiser-pass.php admin@ka-tech.dz Constantine26**
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Ce script est réservé à la ligne de commande.\n");
}

require_once __DIR__ . '/../src/bootstrap.php';

use KaTech\Auth\MotDePasse;
use KaTech\Db;
use KaTech\Journal;

$db = Db::instance();

$email = $argv[1] ?? null;
$nouveauMdp = $argv[2] ?? null;

if ($email === null || trim($email) === '') {
    echo "Usage : php api/tools/reinitialiser-pass.php <email> [nouveau_mot_de_passe]\n";
    echo "Exemple : php api/tools/reinitialiser-pass.php admin@ka-tech.dz Alger2026**\n";
    exit(1);
}

$email = strtolower(trim($email));

// Vérifier l'existence de l'utilisateur
$user = $db->un('SELECT id, name, email, role FROM users WHERE LOWER(email) = :email', [':email' => $email]);

if ($user === null) {
    echo "ERREUR : Aucun utilisateur trouvé avec l'adresse « {$email} ».\n";
    exit(1);
}

// Si aucun mot de passe n'est spécifié, en générer un fort aléatoire
if ($nouveauMdp === null || trim($nouveauMdp) === '') {
    $nouveauMdp = 'KaTech-' . bin2hex(random_bytes(4)) . '*9';
    echo "Génération automatique d'un mot de passe temporaire...\n";
}

// Validation stricte de la politique de sécurité (minimum 10 caractères)
$erreurs = MotDePasse::valider($nouveauMdp);
if ($erreurs !== []) {
    echo "ERREUR : Le mot de passe ne respecte pas la politique de sécurité :\n";
    foreach ($erreurs as $champ => $messages) {
        foreach ($messages as $msg) {
            echo " - {$msg}\n";
        }
    }
    exit(1);
}

// Hachage cryptographique sécurisé (Argon2id ou Bcrypt selon configuration)
$hash = MotDePasse::hacher($nouveauMdp);
$maintenant = gmdate('c');

$db->executer(
    'UPDATE users SET password_hash = :hash, updated_at = :now WHERE id = :id',
    [
        ':hash' => $hash,
        ':now'  => $maintenant,
        ':id'   => $user['id'],
    ]
);

Journal::consigner(
    $db,
    'mot_de_passe_reinitialise_cli',
    'user',
    [
        'id'    => $user['id'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'par'   => 'cli_urgence',
    ]
);

echo "========================================================\n";
echo "SUCCÈS : Mot de passe réinitialisé avec succès !\n";
echo "========================================================\n";
echo "Utilisateur : {$user['name']} ({$user['role']})\n";
echo "Email       : {$user['email']}\n";
echo "Nouveau MDP : {$nouveauMdp}\n";
echo "========================================================\n";
exit(0);
