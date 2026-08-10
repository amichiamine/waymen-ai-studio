<?php

/**
 * Logique d'import des données de démonstration du frontend — appelable en PHP pur.
 *
 * POURQUOI CETTE CLASSE EXISTE
 *
 * `api/tools/importer-donnees-front.php` était jusqu'ici le SEUL porteur de la
 * logique d'import. L'appeler depuis un contexte web exigeait un sous-processus
 * (`proc_open`) — mécanisme interdit par `disable_functions` sur la plupart des
 * hébergements mutualisés. Résultat : code 255, boutique vide, aucun remède sans
 * SSH.
 *
 * Ce fichier extrait le cœur de cet outil en une classe appelable directement
 * depuis PHP, quelle que soit la pile d'exécution (web ou CLI). L'outil en ligne
 * de commande continue de fonctionner à l'identique — il instancie simplement
 * cette classe au lieu d'embarquer la logique lui-même.
 *
 * GARANTIES PRÉSERVÉES
 *
 * · Idempotence : les upserts par clé garantissent qu'un second passage ne
 *   double rien. Rejouer l'import produit les mêmes compteurs.
 * · Rattrapage JSON : les colonnes laissées en clair par une version antérieure
 *   sont réencodées au passage, sans jamais réencoder une valeur déjà valide.
 * · Multilingue : les champs Localized<string> sont stockés en JSON, guillemets
 *   compris (conformément à docs/LOCALIZED-DATA.md).
 * · Requêtes préparées exclusivement, via Db::upsert() et Db::run().
 * · Fonctionne sur SQLite, MySQL et PostgreSQL.
 *
 * POLITIQUE D'ÉCHEC
 *
 * La méthode `importer()` ne lève jamais d'exception : elle retourne un tableau
 * structuré. L'appelant décide d'afficher l'erreur ou de laisser l'installation
 * continuer (le catalogue est un bonus, pas un prérequis).
 */

declare(strict_types=1);

namespace KaTech\Installation;

use KaTech\Db;

/**
 * @phpstan-type ResultatImport array{
 *   ok: bool,
 *   produits: int,
 *   categories: int,
 *   marques: int,
 *   details: string,
 *   erreur: string|null,
 * }
 */
final class ImporteurDonneesFront
{
    /**
     * @param string $cheminJson Chemin absolu vers `api/tools/donnees-front.json`.
     * @param Db     $db         Instance de base de données déjà initialisée.
     */
    public function __construct(
        private readonly string $cheminJson,
        private readonly Db $db,
    ) {
    }

    /**
     * Importe les données du frontend dans la base et retourne un rapport.
     *
     * JAMAIS d'exception levée : le catalogue est non-bloquant pour l'installation.
     *
     * @return ResultatImport
     */
    public function importer(): array
    {
        if (!is_file($this->cheminJson)) {
            return $this->echec(
                "Le fichier {$this->cheminJson} est introuvable. "
                . "Il est normalement inclus dans le paquet d'installation."
            );
        }

        $contenuBrut = @file_get_contents($this->cheminJson);
        if ($contenuBrut === false) {
            return $this->echec("Impossible de lire {$this->cheminJson}.");
        }

        try {
            /** @var array<string,mixed> $donnees */
            $donnees = json_decode($contenuBrut, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return $this->echec("Le fichier JSON est invalide : " . $e->getMessage());
        }

        try {
            $rapport = $this->executer($donnees);
        } catch (\Throwable $e) {
            return $this->echec("L'import a échoué : " . $e->getMessage());
        }

        return $rapport;
    }

    /**
     * Exécute les upserts et le rattrapage JSON, retourne le rapport chiffré.
     *
     * @param array<string,mixed> $donnees
     * @return ResultatImport
     */
    private function executer(array $donnees): array
    {
        $maintenant = gmdate('c');
        $compteurs  = [];

        // ---- Catégories -------------------------------------------------------
        $categories = (array) ($donnees['categories'] ?? []);
        foreach ($categories as $cat) {
            $this->db->upsert('categories', [
                'slug'        => (string) $cat['slug'],
                'label'       => (string) $cat['label'],
                'description' => (string) $cat['description'],
                'cover'       => isset($cat['cover']) ? (string) $cat['cover'] : null,
                'position'    => (int) ($cat['position'] ?? 0),
                'created_at'  => $maintenant,
                'updated_at'  => $maintenant,
            ], ['slug']);
        }
        $compteurs['categories'] = (int) $this->db->valeur('SELECT COUNT(*) FROM categories');

        // ---- Marques ----------------------------------------------------------
        $marques = (array) ($donnees['brands'] ?? []);
        foreach ($marques as $m) {
            $this->db->upsert('brands', [
                'id'          => (string) $m['id'],
                'name'        => (string) $m['name'],
                'description' => isset($m['description']) ? (string) $m['description'] : null,
                'country'     => isset($m['country']) ? (string) $m['country'] : null,
                'created_at'  => $maintenant,
                'updated_at'  => $maintenant,
            ], ['id']);
        }
        $compteurs['brands'] = (int) $this->db->valeur('SELECT COUNT(*) FROM brands');

        // ---- Produits ---------------------------------------------------------
        $produits = (array) ($donnees['products'] ?? []);
        foreach ($produits as $p) {
            $name     = Db::json($p['name']);
            $specLine = isset($p['spec_line']) ? Db::json($p['spec_line']) : null;
            $specs    = isset($p['specs']) && is_array($p['specs']) ? Db::json($p['specs']) : null;
            $useTags  = Db::json($p['use_tags'] ?? []);

            $this->db->upsert('products', [
                'id'           => (string) $p['id'],
                'name'         => $name,
                'brand'        => (string) ($p['brand'] ?? ''),
                'category'     => (string) ($p['category'] ?? ''),
                'use_tags'     => $useTags,
                'spec_line'    => $specLine,
                'specs'        => $specs,
                'price'        => (int) ($p['price'] ?? 0),
                'old_price'    => isset($p['old_price']) && $p['old_price'] !== null ? (int) $p['old_price'] : null,
                'stock'        => (string) ($p['stock'] ?? 'in'),
                'stock_qty'    => isset($p['stock_qty']) ? (int) $p['stock_qty'] : null,
                'image'        => (string) ($p['image'] ?? ''),
                'best_seller'  => (int) ($p['best_seller'] ?? 0),
                'sale'         => (int) ($p['sale'] ?? 0),
                'custom_build' => (int) ($p['custom_build'] ?? 0),
                'created_at'   => $maintenant,
                'updated_at'   => $maintenant,
            ], ['id']);
        }
        $compteurs['products'] = (int) $this->db->valeur('SELECT COUNT(*) FROM products');

        // ---- Articles de blog -------------------------------------------------
        $articles = (array) ($donnees['blogPosts'] ?? []);
        foreach ($articles as $a) {
            $title   = Db::json($a['title']);
            $excerpt = isset($a['excerpt']) ? Db::json($a['excerpt']) : null;
            $content = isset($a['content']) ? Db::json($a['content']) : null;
            $tags    = Db::json($a['tags'] ?? []);

            $this->db->upsert('blog_posts', [
                'id'           => (string) $a['id'],
                'slug'         => (string) $a['slug'],
                'title'        => $title,
                'excerpt'      => $excerpt,
                'content'      => $content,
                'cover'        => isset($a['cover']) ? (string) $a['cover'] : null,
                'author'       => (string) ($a['author'] ?? ''),
                'tags'         => $tags,
                'status'       => (string) ($a['status'] ?? 'published'),
                'published_at' => isset($a['published_at']) ? (string) $a['published_at'] : null,
                'created_at'   => $maintenant,
                'updated_at'   => $maintenant,
            ], ['id']);
        }
        $compteurs['blog_posts'] = (int) $this->db->valeur('SELECT COUNT(*) FROM blog_posts');

        // ---- Tarifs de livraison ----------------------------------------------
        $tarifs = (array) ($donnees['shippingRates'] ?? []);
        foreach ($tarifs as $t) {
            $this->db->upsert('shipping_rates', [
                'wilaya_code' => (string) $t['wilaya_code'],
                'home'        => (int) ($t['home'] ?? 0),
                'desk'        => (int) ($t['desk'] ?? 0),
                'updated_at'  => $maintenant,
            ], ['wilaya_code']);
        }
        $compteurs['shipping_rates'] = (int) $this->db->valeur('SELECT COUNT(*) FROM shipping_rates');

        // ---- Modes de paiement ------------------------------------------------
        $paiements = (array) ($donnees['paymentMethods'] ?? []);
        foreach ($paiements as $pm) {
            $this->db->upsert('payment_methods', [
                'id'           => (string) $pm['id'],
                'label'        => (string) $pm['label'],
                'instructions' => (string) ($pm['instructions'] ?? ''),
                'active'       => (int) ($pm['active'] ?? 1),
                'position'     => (int) ($pm['position'] ?? 0),
                'updated_at'   => $maintenant,
            ], ['id']);
        }
        $compteurs['payment_methods'] = (int) $this->db->valeur('SELECT COUNT(*) FROM payment_methods');

        // ---- Contenu du site --------------------------------------------------
        $contenu = (array) ($donnees['siteContent'] ?? []);
        foreach ($contenu as $section => $payload) {
            $this->db->upsert('site_content', [
                'section'    => (string) $section,
                'payload'    => Db::json($payload),
                'updated_at' => $maintenant,
            ], ['section']);
        }
        $compteurs['site_content'] = (int) $this->db->valeur('SELECT COUNT(*) FROM site_content');

        // ---- Réglages ---------------------------------------------------------
        $siteSettings     = $donnees['siteSettings']     ?? null;
        $shippingSettings = $donnees['shippingSettings'] ?? null;

        if ($siteSettings !== null) {
            $this->db->upsert('settings', [
                'scope'      => 'site',
                'payload'    => Db::json($siteSettings),
                'updated_at' => $maintenant,
            ], ['scope']);
        }
        if ($shippingSettings !== null) {
            $this->db->upsert('settings', [
                'scope'      => 'shipping',
                'payload'    => Db::json($shippingSettings),
                'updated_at' => $maintenant,
            ], ['scope']);
        }
        $compteurs['settings'] = (int) $this->db->valeur('SELECT COUNT(*) FROM settings');

        // ---- Rattrapage des colonnes JSON -------------------------------------
        $rattrapees = 0;
        $rattrapees += $this->rattraperColonnesJson('products',  'id',      ['name', 'use_tags', 'spec_line', 'specs']);
        $rattrapees += $this->rattraperColonnesJson('blog_posts', 'id',     ['title', 'excerpt', 'content', 'tags']);
        $rattrapees += $this->rattraperColonnesJson('site_content', 'section', ['payload']);
        $rattrapees += $this->rattraperColonnesJson('settings',  'scope',   ['payload']);

        // ---- Rapport ----------------------------------------------------------
        $pilote = $this->db->pilote();
        $lignes = [];
        $lignes[] = "╔══════════════════════════════════════════════════════════════╗";
        $lignes[] = "║  Importation des données du frontend — pilote : {$pilote}"
            . str_repeat(' ', max(0, 15 - strlen($pilote))) . "║";
        $lignes[] = "╠══════════════════════════════════════════════════════════════╣";
        foreach ($compteurs as $table => $nb) {
            $ligne = "  {$table} : {$nb} ligne(s) en base";
            $lignes[] = "║" . $ligne . str_repeat(' ', max(0, 62 - strlen($ligne))) . "║";
        }
        $lignes[] = "╠══════════════════════════════════════════════════════════════╣";
        $ligneRattrapage = "  rattrapage JSON : {$rattrapees} ligne(s) réencodée(s)";
        $lignes[] = "║" . $ligneRattrapage . str_repeat(' ', max(0, 62 - mb_strlen($ligneRattrapage))) . "║";
        $lignes[] = "╚══════════════════════════════════════════════════════════════╝";
        $lignes[] = "";
        $lignes[] = "Importation terminée sans erreur. Rejouable (idempotent).";

        $details = implode("\n", $lignes);

        return [
            'ok'         => true,
            'produits'   => $compteurs['products'],
            'categories' => $compteurs['categories'],
            'marques'    => $compteurs['brands'],
            'details'    => $details,
            'erreur'     => null,
        ];
    }

    /**
     * Rattrapage : réencode les colonnes JSON restées en clair (héritage).
     *
     * IDEMPOTENT PAR CONSTRUCTION : une valeur déjà JSON valide est laissée intacte.
     *
     * @param string[] $colonnes
     */
    private function rattraperColonnesJson(string $table, string $cle, array $colonnes): int
    {
        $projection = implode(', ', array_map(
            [Db::class, 'identifiant'],
            array_merge([$cle], $colonnes),
        ));

        $lignes    = $this->db->tous('SELECT ' . $projection . ' FROM ' . Db::identifiant($table));
        $corrigees = 0;

        foreach ($lignes as $ligne) {
            $set    = [];
            $params = [':cle_rattrapage' => $ligne[$cle]];

            foreach ($colonnes as $colonne) {
                $brut = $ligne[$colonne];
                if (!is_string($brut) || $brut === '') {
                    continue;
                }
                json_decode($brut, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    continue;
                }
                $set[]               = Db::identifiant($colonne) . ' = :' . $colonne;
                $params[':' . $colonne] = Db::json($brut);
            }

            if ($set === []) {
                continue;
            }

            $this->db->run(
                'UPDATE ' . Db::identifiant($table) . ' SET ' . implode(', ', $set)
                    . ' WHERE ' . Db::identifiant($cle) . ' = :cle_rattrapage',
                $params,
            );
            $corrigees++;
        }

        return $corrigees;
    }

    /**
     * @return ResultatImport
     */
    private function echec(string $message): array
    {
        return [
            'ok'         => false,
            'produits'   => 0,
            'categories' => 0,
            'marques'    => 0,
            'details'    => '',
            'erreur'     => $message,
        ];
    }
}
