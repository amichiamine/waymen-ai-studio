<?php

/**
 * Médias — gestion des fichiers téléversés.
 *
 * Sécurité du téléversement :
 *   1. Le type RÉEL est vérifié par finfo (magic bytes), jamais par l'extension
 *      ni par le Content-Type déclaré par le client : les deux se falsifient.
 *   2. Le nom du fichier est entièrement généré côté serveur (UUID + extension
 *      issue du type MIME vérifié). Le nom fourni par le client est ignoré.
 *   3. La taille maximale est configurable (UPLOAD_MAX_BYTES) ; le refus est
 *      explicite et indique la limite.
 *   4. À la suppression, le fichier physique est effacé pour éviter les orphelins.
 *   5. Seules les images sont acceptées (liste blanche de types MIME).
 */

declare(strict_types=1);

namespace KaTech\Controllers;

use KaTech\ApiException;
use KaTech\Db;
use KaTech\Env;
use KaTech\Journal;
use KaTech\Pagination;
use KaTech\Reponse;
use KaTech\Requete;

final class ControleurMedias
{
    /** Taille maximale par défaut : 5 Mo */
    private const TAILLE_MAX_DEFAUT = 5 * 1024 * 1024;

    /** Liste blanche des types MIME d'image acceptés → extension de fichier. */
    private const MIME_IMAGES = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg',
        'image/avif' => 'avif',
    ];

    /** Alias de tri public → colonne réelle. */
    private const TRIS = [
        'name'      => 'name',
        'size'      => 'size',
        'createdAt' => 'created_at',
    ];

    public function __construct(private readonly Db $db)
    {
    }

    /**
     * GET /media
     * → { data: { items, total, page, perPage } }
     */
    public function lister(Requete $r): Reponse
    {
        $where  = [];
        $params = [];

        if (($v = $r->query('search')) !== null) {
            $where[] = 'LOWER(name) LIKE :search1';
            $params[':search1'] = '%' . $this->echapperLike(mb_strtolower($v)) . '%';
        }

        if (($v = $r->query('tag')) !== null) {
            $where[] = 'tag = :tag';
            $params[':tag'] = $v;
        }

        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);
        $p      = Pagination::depuis($r);

        $total = (int) $this->db->valeur("SELECT COUNT(*) FROM media_assets{$clause}", $params);

        $colonne = Db::colonneTri($r->query('sort'), self::TRIS, 'created_at');
        $sens    = Db::sens($r->query('order'), 'DESC');

        $lignes = $this->db->tous(
            "SELECT * FROM media_assets{$clause} ORDER BY {$colonne} {$sens}, id ASC LIMIT :limite OFFSET :decalage",
            $params + [':limite' => $p->perPage, ':decalage' => $p->offset()],
        );

        return Reponse::page(array_map([$this, 'enDto'], $lignes), $total, $p->page, $p->perPage);
    }

    /**
     * GET /media/:id
     * → { data: MediaAsset } ou 404.
     */
    public function detail(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM media_assets WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun média ne porte l'identifiant « {$id} ».");
        }

        return Reponse::ok($this->enDto($ligne));
    }

    /**
     * POST /media  (multipart/form-data, champ « file »)
     * → 201 { data: MediaAsset }
     *
     * Sécurité :
     *   - Taille vérifiée avant toute écriture (UPLOAD_MAX_BYTES, défaut 5 Mo).
     *   - Type MIME vérifié par finfo sur le contenu réel, jamais sur l'extension.
     *   - Nom généré côté serveur : le nom original n'est JAMAIS utilisé comme
     *     identifiant de fichier. Une entrée comme « ../../index.php » ou
     *     « malware.php.jpg » n'atteint jamais le système de fichiers.
     */
    public function televerser(Requete $r): Reponse
    {
        /* ---- 1. Vérification de la présence du fichier ---- */
        if (!isset($_FILES['file'])) {
            throw ApiException::validation('Aucun fichier reçu.', [
                'file' => ['Le champ « file » est obligatoire (multipart/form-data).'],
            ]);
        }

        $fichier = $_FILES['file'];

        /* ---- 2. Erreur PHP d'upload ---- */
        if ((int) $fichier['error'] !== UPLOAD_ERR_OK) {
            $message = $this->messageErreurUpload((int) $fichier['error']);
            throw ApiException::validation($message, ['file' => [$message]]);
        }

        /* ---- 3. Vérification de la taille AVANT lecture ---- */
        $tailleMax = (int) Env::get('UPLOAD_MAX_BYTES', (string) self::TAILLE_MAX_DEFAUT);
        $tailleMax = $tailleMax > 0 ? $tailleMax : self::TAILLE_MAX_DEFAUT;

        $tailleFichier = (int) $fichier['size'];
        if ($tailleFichier > $tailleMax) {
            $limiteHumaine = $this->tailleHumaine($tailleMax);
            $tailleHumaine = $this->tailleHumaine($tailleFichier);
            $msg = "Fichier trop volumineux : {$tailleHumaine} reçu, limite : {$limiteHumaine}.";
            throw ApiException::validation($msg, ['file' => [$msg]]);
        }
        if ($tailleFichier === 0) {
            throw ApiException::validation('Fichier vide.', ['file' => ['Le fichier ne doit pas être vide.']]);
        }

        /* ---- 4. Vérification du type RÉEL par magic bytes ---- */
        // L'extension et le Content-Type déclarés par le client sont ignorés.
        // finfo lit les premiers octets du fichier temporaire pour déterminer le
        // type réel. Un fichier PHP renommé en .jpg est rejeté ici.
        $cheminTmp = (string) $fichier['tmp_name'];

        if (!is_uploaded_file($cheminTmp)) {
            throw ApiException::validation('Fichier invalide.', ['file' => ['Source de fichier non autorisée.']]);
        }

        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $mimeReel = $finfo->file($cheminTmp);

        if ($mimeReel === false || !isset(self::MIME_IMAGES[$mimeReel])) {
            $acceptes = implode(', ', array_keys(self::MIME_IMAGES));
            $msg = "Type de fichier non autorisé : « {$mimeReel} ». Types acceptés : {$acceptes}.";
            throw ApiException::validation($msg, ['file' => [$msg]]);
        }

        /* ---- 5. Génération d'un nom de fichier sûr ---- */
        $extension  = self::MIME_IMAGES[$mimeReel];
        $nomFichier = $this->genererNom() . '.' . $extension;

        /* ---- 6. Dossier de destination ---- */
        $dossierUploads = rtrim(
            (string) Env::get('UPLOAD_DIR', dirname(__DIR__, 3) . '/public_html/uploads'),
            '/'
        );

        if (!is_dir($dossierUploads) && !@mkdir($dossierUploads, 0775, true) && !is_dir($dossierUploads)) {
            throw new ApiException(500, 'UPLOAD_ERROR', "Impossible de créer le dossier d'upload « {$dossierUploads} ».");
        }

        $cheminDest = $dossierUploads . '/' . $nomFichier;

        /* ---- 7. Déplacement du fichier temporaire ---- */
        if (!move_uploaded_file($cheminTmp, $cheminDest)) {
            throw new ApiException(500, 'UPLOAD_ERROR', 'Échec du déplacement du fichier vers sa destination.');
        }

        /* ---- 8. Construction de l'URL publique ---- */
        $urlFichier = $this->baseUrlUploads() . '/' . $nomFichier;

        /* ---- 9. Persistance en base ---- */
        $nomOriginal = basename((string) $fichier['name']);
        // Nom original stocké pour affichage uniquement — jamais utilisé comme
        // chemin. On tronque à 255 caractères par sécurité.
        $nomOriginal = mb_substr($nomOriginal, 0, 255);

        $id        = $this->genererUuid();
        $maintenant = gmdate('c');
        $tag        = trim((string) ($r->corps('tag') ?? ''));

        $this->db->transaction(function (Db $d) use ($id, $nomOriginal, $urlFichier, $mimeReel, $tailleFichier, $tag, $maintenant): void {
            $d->inserer('media_assets', [
                'id'         => $id,
                'name'       => $nomOriginal,
                'src'        => $urlFichier,
                'mime'       => $mimeReel,
                'size'       => $tailleFichier,
                'tag'        => $tag !== '' ? $tag : null,
                'created_at' => $maintenant,
            ]);
        });

        Journal::consigner($this->db, 'media_televerse', 'media', ['id' => $id, 'name' => $nomOriginal, 'mime' => $mimeReel]);

        $ligne = $this->db->un('SELECT * FROM media_assets WHERE id = :id', [':id' => $id]);

        return Reponse::cree($this->enDto((array) $ligne));
    }

    /**
     * PATCH /media/:id
     * → 200 { data: MediaAsset }
     *
     * Accepte `name` (obligatoire) et `tag` (optionnel).
     * Pattern identique à ControleurMarques::modifier() (S2 — vague 4).
     * Piège de dialecte §4 piège n°1 : chaque placeholder porte un nom distinct
     * (:name_val, :tag_val, :id_val) — ATTR_EMULATE_PREPARES=false refuse
     * les paramètres nommés réutilisés en MySQL.
     */
    public function renommer(Requete $r): Reponse
    {
        $id    = $r->param('id');

        // Vérifier l'existence avant la mise à jour — 404 explicite si absent.
        $existant = $this->db->un('SELECT * FROM media_assets WHERE id = :id', [':id' => $id]);
        if ($existant === null) {
            throw ApiException::introuvable("Aucun média ne porte l'identifiant « {$id} ».");
        }

        // Fusion PATCH : name obligatoire, tag optionnel (null conserve l'existant).
        $nom = trim((string) $r->corps('name', $existant['name']));
        if ($nom === '') {
            throw ApiException::validation('Média invalide.', ['name' => ['Champ obligatoire.']]);
        }

        // Piège de dialecte §4 piège n°1 : placeholders distincts pour :name_val,
        // :tag_val, :id_val — MySQL rejette tout placeholder réutilisé avec
        // ATTR_EMULATE_PREPARES=false.
        $tagFourni = $r->corps('tag');
        $tag = $tagFourni !== null ? trim((string) $tagFourni) : $existant['tag'];
        $tag = ($tag !== null && $tag !== '') ? $tag : null;

        // media_assets n'a pas de colonne updated_at (schéma § 11).
        $this->db->run(
            'UPDATE media_assets SET name = :name_val, tag = :tag_val WHERE id = :id_val',
            [
                ':name_val' => $nom,
                ':tag_val'  => $tag,
                ':id_val'   => $id,
            ],
        );

        Journal::consigner($this->db, 'media_renomme', 'media', ['id' => $id, 'name' => $nom]);

        return Reponse::ok($this->enDto(
            (array) $this->db->un('SELECT * FROM media_assets WHERE id = :id', [':id' => $id])
        ));
    }

    /**
     * DELETE /media/:id
     * → 204, sans corps. Efface également le fichier du disque.
     */
    public function supprimer(Requete $r): Reponse
    {
        $id    = $r->param('id');
        $ligne = $this->db->un('SELECT * FROM media_assets WHERE id = :id', [':id' => $id]);

        if ($ligne === null) {
            throw ApiException::introuvable("Aucun média ne porte l'identifiant « {$id} ».");
        }

        /* ---- Effacement du fichier physique ---- */
        $src = (string) $ligne['src'];
        $this->supprimerFichier($src);

        $this->db->run('DELETE FROM media_assets WHERE id = :id', [':id' => $id]);

        Journal::consigner($this->db, 'media_supprime', 'media', ['id' => $id, 'src' => $src]);

        return Reponse::vide();
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    /**
     * Supprime le fichier physique correspondant à une URL stockée.
     * Un échec est journalisé mais ne fait pas échouer la suppression en base :
     * un enregistrement orphelin est pire qu'un fichier orphelin.
     */
    private function supprimerFichier(string $src): void
    {
        $baseUrl     = $this->baseUrlUploads();
        $dossierUploads = rtrim(
            (string) Env::get('UPLOAD_DIR', dirname(__DIR__, 3) . '/public_html/uploads'),
            '/'
        );

        // Tolérance à la barre initiale : les enregistrements créés avant que
        // l'URL ne devienne relative valent « /uploads/xxx.webp ». Sans cette
        // normalisation, leur fichier resterait sur le disque à la suppression
        // — un orphelin muet de plus.
        $src = ltrim($src, '/');

        // Reconstitution du chemin local depuis l'URL stockée.
        if (str_starts_with($src, $baseUrl . '/')) {
            $nomFichier = basename(substr($src, strlen($baseUrl) + 1));
            // basename() garantit qu'il n'y a pas de traversal.
            $chemin = $dossierUploads . '/' . $nomFichier;

            if (is_file($chemin) && !@unlink($chemin)) {
                Db::journaliserStatique("Échec de suppression du fichier « {$chemin} ».");
            }
        }
    }

    /**
     * Préfixe des URL de médias téléversés, sans barre initiale ni finale.
     *
     * POURQUOI « uploads » ET NON « /uploads ». Le site est déployable dans un
     * sous-dossier (`public_html/ma-boutique/`) : le chemin de dépôt n'est connu
     * qu'à l'exécution, côté navigateur, par la balise `<base>` que
     * `public/index.php` calcule depuis `SCRIPT_NAME`. Une URL ABSOLUE stockée en
     * base viserait la racine du DOMAINE — `https://domaine.dz/uploads/…` — donc
     * hors du dossier livré, et tout média téléversé par le commerçant
     * disparaîtrait. C'est le défaut qui frappait déjà les images du catalogue.
     *
     * Le chemin relatif est résolu côté client par `src/components/media-url.ts`,
     * exactement comme « media/… », et reste juste à la racine comme en
     * sous-dossier. Un exploitant qui sert ses médias ailleurs (CDN, autre
     * domaine) renseigne UPLOAD_BASE_URL avec une URL absolue : elle est alors
     * transmise telle quelle.
     */
    private function baseUrlUploads(): string
    {
        $base = trim((string) Env::get('UPLOAD_BASE_URL', 'uploads'));

        // Une valeur explicitement absolue (URL complète) est respectée ; sinon
        // on retire la barre initiale, qui est précisément ce qui casse le
        // déploiement en sous-dossier.
        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $base) === 1) {
            return rtrim($base, '/');
        }

        return trim($base, '/');
    }

    /** Génère un nom de fichier unique non prédictible, sans extension. */
    private function genererNom(): string
    {
        return bin2hex(random_bytes(16));
    }

    /** Génère un UUID v4 simple. */
    private function genererUuid(): string
    {
        $octets = random_bytes(16);
        $octets[6] = chr((ord($octets[6]) & 0x0f) | 0x40); // version 4
        $octets[8] = chr((ord($octets[8]) & 0x3f) | 0x80); // variante RFC 4122
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($octets), 4));
    }

    /** Message d'erreur lisible pour un code d'erreur PHP d'upload. */
    private function messageErreurUpload(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE
                => 'Fichier trop volumineux (limite du serveur atteinte).',
            UPLOAD_ERR_PARTIAL
                => 'Téléversement interrompu : fichier reçu partiellement.',
            UPLOAD_ERR_NO_FILE
                => 'Aucun fichier reçu.',
            UPLOAD_ERR_NO_TMP_DIR
                => 'Erreur serveur : dossier temporaire absent.',
            UPLOAD_ERR_CANT_WRITE
                => 'Erreur serveur : écriture du fichier temporaire impossible.',
            UPLOAD_ERR_EXTENSION
                => 'Téléversement bloqué par une extension PHP.',
            default
                => "Erreur de téléversement inconnue (code {$code}).",
        };
    }

    /** Convertit un nombre d'octets en chaîne lisible (ko, Mo). */
    private function tailleHumaine(int $octets): string
    {
        if ($octets >= 1024 * 1024) {
            return round($octets / (1024 * 1024), 1) . ' Mo';
        }
        if ($octets >= 1024) {
            return round($octets / 1024, 1) . ' ko';
        }
        return $octets . ' o';
    }

    /** Neutralise les jokers d'un LIKE fourni par l'utilisateur. */
    private function echapperLike(string $v): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v);
    }

    /**
     * Ligne SQL → DTO du contrat.
     *
     * @param array<string,mixed> $l
     * @return array<string,mixed>
     */
    private function enDto(array $l): array
    {
        $dto = [
            'id'        => (string) $l['id'],
            'name'      => (string) $l['name'],
            'src'       => (string) $l['src'],
            'mime'      => (string) $l['mime'],
            'size'      => (int)    $l['size'],
            'createdAt' => (string) $l['created_at'],
        ];

        if ($l['tag'] !== null) {
            $dto['tag'] = (string) $l['tag'];
        }

        return $dto;
    }
}
