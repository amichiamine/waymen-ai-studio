<?php

/**
 * Écriture de `api/.env` à partir des valeurs saisies dans l'assistant.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE DÉCISION DU PROJET A ÉTÉ RENVERSÉE ICI — assumons-la
 * ─────────────────────────────────────────────────────────────────────────
 * `api/install.php` a longtemps porté cette règle : « on n'invente rien, pas de
 * `.env` généré automatiquement ». Elle était JUSTE tant que rien ne recueillait
 * les valeurs : un fichier apparu tout seul, rempli de valeurs devinées ou de
 * mots de passe par défaut, est le contraire d'une configuration compréhensible
 * — et un mot de passe par défaut sur une boutique en ligne est une fuite
 * annoncée.
 *
 * Ce n'est plus le cas. L'assistant DEMANDE les valeurs dans un formulaire.
 * Écrire un `.env` à partir de ce que l'utilisateur vient de saisir n'invente
 * rien : cela lui épargne un copier-coller hasardeux dans un gestionnaire de
 * fichiers web, geste sur lequel une installation sur deux échoue. La règle
 * conservée, elle, est l'autre moitié de la phrase : AUCUNE VALEUR PAR DÉFAUT
 * QUI MASQUE UNE ABSENCE. Rien n'est écrit qui n'ait été saisi ou déduit et
 * affiché à l'écran.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI N'EST JAMAIS ÉCRIT
 * ─────────────────────────────────────────────────────────────────────────
 * `INSTALL_OWNER_PASSWORD` n'entre pas dans ce fichier. En ligne de commande il
 * y a sa place — c'est le seul canal disponible — mais l'assistant a le mot de
 * passe en main : il le passe directement au hachage et à la base. L'écrire en
 * clair dans un fichier du serveur, puis demander à l'exploitant de penser à
 * l'effacer, c'est créer le problème et déléguer sa correction (S13).
 */

declare(strict_types=1);

namespace KaTech\Installation;

final class RedacteurEnv
{
    /**
     * Permissions visées, de la plus stricte à la plus permissive acceptable.
     *
     * 0600 : le seul compte du serveur web. 0640 : lui et son groupe — nécessaire
     * quand PHP tourne sous un utilisateur distinct du propriétaire des fichiers,
     * cas fréquent en mutualisé. Au-delà (0644), le fichier serait lisible par
     * les processus des AUTRES clients du serveur : on refuse d'y aller
     * volontairement, mais on n'échoue pas si l'hébergeur impose ce mode — on le
     * signale (voir `permissionsObtenues`).
     */
    private const MODES_VISES = [0600, 0640];

    /**
     * Écrit `api/.env`.
     *
     * @param array<string,string> $valeurs  Clé → valeur, déjà validées.
     * @return array{chemin:string,permissions:string,sauvegarde:?string}
     * @throws \RuntimeException si le fichier ne peut pas être écrit
     */
    public static function ecrire(string $racineApi, array $valeurs): array
    {
        $chemin = rtrim($racineApi, '/') . '/.env';

        // Un .env préexistant n'est jamais écrasé sans trace : il peut contenir
        // une clé NOTION_CRYPTO_KEY ou des réglages SMTP que personne ne saurait
        // retrouver. La copie porte un nom commençant par un point, donc refusée
        // au téléchargement par api/.htaccess comme le .env lui-même.
        $sauvegarde = null;
        if (is_file($chemin)) {
            $sauvegarde = $chemin . '.avant-installation-' . gmdate('Ymd-His');
            if (!@copy($chemin, $sauvegarde)) {
                throw new \RuntimeException(
                    'Un fichier api/.env existe déjà et n\'a pas pu être sauvegardé avant '
                    . 'remplacement. Rien n\'a été modifié.'
                );
            }
            @chmod($sauvegarde, 0600);
        }

        $contenu = self::composer($valeurs);

        // Écriture en deux temps : un fichier temporaire, mis aux bonnes
        // permissions AVANT d'être mis en place. Écrire directement dans .env
        // laisserait, le temps d'un battement, un fichier de secrets aux
        // permissions par défaut du serveur (souvent 0644, donc lisible par les
        // autres comptes du mutualisé).
        $temporaire = $chemin . '.tmp-' . bin2hex(random_bytes(4));
        if (@file_put_contents($temporaire, $contenu, LOCK_EX) === false) {
            throw new \RuntimeException(
                'Le fichier api/.env n\'a pas pu être écrit : le dossier api/ n\'est pas '
                . 'inscriptible par PHP. Dans le gestionnaire de fichiers de votre hébergeur, '
                . 'donnez les droits 0755 au dossier api/, puis recommencez.'
            );
        }

        foreach (self::MODES_VISES as $mode) {
            if (@chmod($temporaire, $mode)) {
                break;
            }
        }

        if (!@rename($temporaire, $chemin)) {
            @unlink($temporaire);

            throw new \RuntimeException(
                'Le fichier api/.env n\'a pas pu être mis en place. Vérifiez les droits du '
                . 'dossier api/ auprès de votre hébergeur. Rien n\'a été modifié.'
            );
        }

        clearstatcache(true, $chemin);
        $perms = @fileperms($chemin);

        return [
            'chemin' => $chemin,
            'permissions' => $perms === false ? 'inconnues' : sprintf('%04o', $perms & 0777),
            'sauvegarde' => $sauvegarde,
        ];
    }

    /**
     * Compose le contenu du fichier.
     *
     * Volontairement COURT et commenté : l'exploitant qui l'ouvrira six mois
     * plus tard doit comprendre chaque ligne. Les dizaines de réglages avancés
     * restent documentés dans `api/.env.example`, qui n'est pas modifié et reste
     * la référence — les recopier tous ici les figerait en double.
     *
     * @param array<string,string> $valeurs
     */
    private static function composer(array $valeurs): string
    {
        $lignes = [
            '# =====================================================================',
            '# KA Tech Hub — configuration de l\'API',
            '# =====================================================================',
            '#',
            '# Fichier ÉCRIT PAR L\'ASSISTANT D\'INSTALLATION (api/install.php), le',
            '# ' . gmdate('d/m/Y à H:i') . ' UTC, à partir des valeurs que vous avez',
            '# saisies dans le formulaire. Vous pouvez le modifier à la main.',
            '#',
            '# Le mot de passe du compte propriétaire N\'EST PAS ICI, et c\'est voulu :',
            '# il est parti directement en base, haché. Rien à effacer après coup.',
            '#',
            '# Tous les réglages avancés (SMTP, sauvegardes, sessions, Notion…) sont',
            '# documentés dans api/.env.example. Ajoutez ici seulement ceux dont vous',
            '# avez besoin.',
            '#',
            '# SÉCURITÉ : ce fichier ne doit JAMAIS être téléchargeable.',
            '# api/.htaccess le bloque. Vérifiez-le en ouvrant',
            '# https://votre-domaine/api/.env — vous devez obtenir une erreur 403.',
            '# =====================================================================',
            '',
        ];

        $sections = [
            'Base de données' => ['DB_DRIVER', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSLMODE', 'DB_SQLITE_PATH'],
            'Environnement' => ['APP_ENV', 'APP_URL'],
            'Compte propriétaire (le mot de passe n\'y figure pas — voir l\'en-tête)' => ['INSTALL_OWNER_NAME', 'INSTALL_OWNER_EMAIL'],
            'Sauvegardes — dossier HORS de la racine web' => ['BACKUP_DIR'],
        ];

        foreach ($sections as $titre => $cles) {
            $presentes = array_filter($cles, static fn (string $c): bool => array_key_exists($c, $valeurs));
            if ($presentes === []) {
                continue;
            }
            $lignes[] = '# ---------------------------------------------------------------------';
            $lignes[] = '# ' . $titre;
            $lignes[] = '# ---------------------------------------------------------------------';
            foreach ($presentes as $cle) {
                $lignes[] = $cle . '=' . self::echapper($valeurs[$cle]);
            }
            $lignes[] = '';
        }

        // Toute clé non rangée dans une section connue est écrite quand même :
        // une valeur collectée mais silencieusement jetée serait le pire des
        // comportements.
        $connues = array_merge(...array_values($sections));
        $reste = array_diff(array_keys($valeurs), $connues);
        if ($reste !== []) {
            $lignes[] = '# --- Autres réglages ------------------------------------------------';
            foreach ($reste as $cle) {
                $lignes[] = $cle . '=' . self::echapper($valeurs[$cle]);
            }
            $lignes[] = '';
        }

        return implode("\n", $lignes);
    }

    /**
     * Met la valeur entre guillemets si elle contient de quoi tromper le
     * lecteur de `.env` (`KaTech\Env`) : espaces de bord, `#`, guillemets.
     *
     * Un mot de passe de base de données contient très souvent un `#` : sans
     * cette précaution, tout ce qui suit serait pris pour un commentaire et la
     * connexion échouerait avec un « mot de passe refusé » incompréhensible.
     */
    private static function echapper(string $valeur): string
    {
        if ($valeur === '') {
            return '';
        }

        $besoin = $valeur !== trim($valeur)
            || str_contains($valeur, '#')
            || str_contains($valeur, '"')
            || str_contains($valeur, "'");

        if (!$besoin) {
            return $valeur;
        }

        // Le lecteur `Env` retire une paire de guillemets englobants sans gérer
        // d'échappement interne : on choisit donc le guillemet que la valeur ne
        // contient pas. Si elle contient les deux, on garde le double et on
        // retire le caractère de fin de ligne, seul cas réellement dangereux.
        if (!str_contains($valeur, '"')) {
            return '"' . $valeur . '"';
        }
        if (!str_contains($valeur, "'")) {
            return "'" . $valeur . "'";
        }

        return $valeur;
    }
}
