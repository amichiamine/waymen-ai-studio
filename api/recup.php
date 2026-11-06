<?php

/**
 * Script d'urgence : Réinitialisation du mot de passe Administrateur / Propriétaire.
 *
 * Ce script permet de redéfinir en urgence le mot de passe du compte administrateur
 * via le navigateur web sans accès terminal SSH.
 *
 * SÉCURITÉ :
 * Ce script doit être SUPPRIMÉ immédiatement après usage.
 * Il propose un bouton d'auto-suppression dès que le mot de passe est réinitialisé.
 */

declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';

use KaTech\Auth\MotDePasse;
use KaTech\Db;
use KaTech\Journal;

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

$message = null;
$erreur = null;
$succes = false;
$admin = null;

try {
    $db = Db::instance();

    // Trouver le compte propriétaire ou premier administrateur
    $admin = $db->un("SELECT id, name, email, role FROM users WHERE role IN ('owner', 'admin') ORDER BY CASE role WHEN 'owner' THEN 1 ELSE 2 END ASC LIMIT 1");

    if ($admin === null) {
        $erreur = "Aucun compte administrateur ou propriétaire trouvé en base de données.";
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'supprimer') {
            @unlink(__FILE__);
            if (!is_file(__FILE__)) {
                echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Script supprimé</title>"
                    . "<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}"
                    . ".box{background:#1e293b;padding:32px;border-radius:12px;max-width:480px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);}"
                    . "a{display:inline-block;margin-top:20px;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;}</style></head>"
                    . "<body><div class='box'><h1 style='color:#10b981;'>Script supprimé</h1><p>Le fichier <code>api/recup.php</code> a été effacé avec succès du serveur.</p>"
                    . "<a href='../admin'>Aller à l'administration &rarr;</a></div></body></html>";
                exit;
            } else {
                $erreur = "Impossible de supprimer automatiquement le fichier. Veuillez l'effacer manuellement depuis votre gestionnaire de fichiers.";
            }
        } elseif ($action === 'reinitialiser') {
            $nouveauMdp = trim((string)($_POST['password'] ?? ''));

            if (empty($nouveauMdp)) {
                $erreur = "Le mot de passe ne peut pas être vide.";
            } else {
                $erreursValidation = MotDePasse::valider($nouveauMdp);
                if (!empty($erreursValidation)) {
                    $erreur = "Le mot de passe doit comporter au moins 10 caractères et respecter la politique de sécurité.";
                } else {
                    $hash = MotDePasse::hacher($nouveauMdp);
                    $now = gmdate('c');

                    $db->run(
                        "UPDATE users SET password_hash = :hash, updated_at = :now WHERE id = :id",
                        [
                            ':hash' => $hash,
                            ':now'  => $now,
                            ':id'   => $admin['id'],
                        ]
                    );

                    Journal::consigner($db, 'mot_de_passe_reinitialise_urgence', 'user', [
                        'user_id' => $admin['id'],
                        'email'   => $admin['email'],
                    ]);

                    $succes = true;
                    $message = "Le mot de passe de l'administrateur « " . htmlspecialchars($admin['email']) . " » a été mis à jour avec succès !";
                }
            }
        }
    }
} catch (\Throwable $e) {
    $erreur = "Erreur système : " . $e->getMessage();
}

$suggereMdp = 'Admin-' . bin2hex(random_bytes(3)) . '!2026';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Récupération Administrateur — StacGate Platform</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #090d16;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: #131b2e;
            border: 1px solid #1e293b;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            padding: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        h1 { font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 8px; color: #fff; }
        p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-top: 0; }
        .alert {
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 20px;
        }
        .alert-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
        .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; }
        .badge {
            display: inline-block;
            background: #1e293b;
            color: #38bdf8;
            padding: 4px 10px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
        }
        .field { margin-bottom: 20px; }
        label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #cbd5e1; }
        input[type="text"] {
            width: 100%;
            padding: 10px 14px;
            background: #0a0f1d;
            border: 1px solid #334155;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
        }
        input[type="text"]:focus { border-color: #3b82f6; }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-primary { background: #3b82f6; color: #fff; }
        .btn-primary:hover { background: #2563eb; }
        .btn-danger { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); margin-top: 12px; }
        .btn-danger:hover { background: rgba(239, 68, 68, 0.3); }
        .btn-success { background: #10b981; color: #fff; }
        .btn-success:hover { background: #059669; }
        .actions { margin-top: 24px; display: flex; flex-direction: column; gap: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔑 Récupération du Mot de Passe Admin</h1>
        <p>Utilisez cet outil d'urgence pour redéfinir l'accès propriétaire de votre boutique.</p>

        <?php if ($erreur !== null): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($erreur) ?></div>
        <?php endif; ?>

        <?php if ($succes): ?>
            <div class="alert alert-success"><?= htmlspecialchars((string)$message) ?></div>
            <div class="actions">
                <a href="../admin" class="btn btn-success">Accéder à l'administration &rarr;</a>
                <form method="post" action="">
                    <input type="hidden" name="action" value="supprimer">
                    <button type="submit" class="btn btn-danger">Supprimer ce fichier <code>recup.php</code> du serveur</button>
                </form>
            </div>
        <?php elseif (is_array($admin)): ?>
            <form method="post" action="">
                <input type="hidden" name="action" value="reinitialiser">
                <div class="field">
                    <label>Compte administrateur détecté :</label>
                    <span class="badge"><?= htmlspecialchars($admin['email']) ?> (<?= htmlspecialchars($admin['role']) ?>)</span>
                </div>
                <div class="field">
                    <label for="password">Nouveau mot de passe souhaité :</label>
                    <input type="text" id="password" name="password" value="<?= htmlspecialchars($suggereMdp) ?>" required minlength="10">
                    <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Min. 10 caractères avec majuscules, minuscules, chiffres et symboles.</p>
                </div>
                <button type="submit" class="btn btn-primary">Valider le nouveau mot de passe</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>

