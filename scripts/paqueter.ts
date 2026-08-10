/**
 * paqueter.ts — Assemble katech-site.zip : un seul fichier à téléverser.
 *
 * =====================================================================
 * POURQUOI CE SCRIPT EXISTE
 * =====================================================================
 * Déployer demandait six gestes manuels séparés : (1) téléverser dist/,
 * (2) téléverser api/ depuis un autre endroit, (3) vérifier à la main
 * que les fichiers cachés (dont .htaccess) n'ont pas été silencieusement
 * exclus par le client FTP. L'oubli de api/.htaccess rend toute l'API
 * muette (renvoie du HTML au lieu du JSON).
 *
 * Ce script produit un seul zip contenant dist/ ET api/. Déposé dans
 * public_html et extrait, il donne exactement l'arborescence décrite
 * dans docs/DEPLOIEMENT.md §4.
 *
 * =====================================================================
 * ENCHAÎNEMENT AU BUILD — DEUX BESOINS CONCILIÉS
 * =====================================================================
 * `bun run build` déclenche maintenant ce script en `postbuild`, juste
 * après le prérendu, SAUF dans les deux cas suivants :
 *
 *   CI=true (ou CI=1) : posé automatiquement par GitHub Actions, Lovable
 *   CI, et la plupart des pipelines. La CI veut un dist/ statique, pas
 *   une archive de 10 Mo — la détection évite d'alourdir chaque push.
 *
 *   PAQUET=0 : sortie explicite pour qui lance le build localement mais
 *   n'a pas besoin du zip (tests rapides, mesure du prerendu…).
 *
 * Pour un humain qui déploie : `bun run build` produit dist/ ET
 * katech-site.zip en une seule commande.
 * Pour la CI : aucun changement de comportement, aucune archive produite.
 * `bun run paqueter` reste disponible pour un paquetage isolé.
 *
 * =====================================================================
 * CE QUI EST EXCLU DE api/ ET POURQUOI
 * =====================================================================
 *
 * - api/.env          : secret réel (clés DB, APP_SECRET…). Le
 *   commanditaire s'envoie ce zip par e-mail — un secret ne voyage
 *   jamais dans une archive. L'hébergeur crée son propre .env depuis
 *   api/.env.example.
 *
 * - api/installed.lock : témoin d'installation. Sa présence dans le zip
 *   empêcherait l'exécution de install.php sur un nouveau serveur.
 *
 * - api/var/          : dossier de données de développement local
 *   (base SQLite, journaux WAL/SHM). En production, ce dossier vit
 *   HORS de public_html — katech-data/ au niveau supérieur.
 *
 * - api/vendor/       : dépendances Composer de développement. L'API
 *   tourne sans Composer en production (voir docs/BACKEND.md).
 *
 * - uploads/ (dist)   : médias téléversés par la boutique. Ce sont des
 *   données d'exécution, pas du code. Le dossier est créé vide par
 *   l'hébergeur, ou conservé entre deux déploiements.
 *
 * =====================================================================
 * COMPATIBILITÉ bun ET npm
 * =====================================================================
 * Ce script est exécuté via `tsx` (déjà présent en devDependencies).
 * Il utilise uniquement l'API Node.js standard (fs, path, child_process)
 * et n'appelle aucune API spécifique à bun. La commande dans package.json
 * utilise `tsx` (bun) et `npx tsx` (npm) — voir le script "paqueter".
 *
 * Pour la création du ZIP, `zip` n'est pas garanti disponible en
 * mutualisé ni en CI. On délègue à Python 3 (disponible partout) via
 * un script inline qui préserve les fichiers commençant par un point,
 * contrairement à de nombreux clients zip graphiques.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ── Chemins ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const API_SRC = path.join(ROOT, "api");
const API_DEST = path.join(DIST, "api");
const ZIP_OUT = path.join(ROOT, "katech-site.zip");

// ── Fichiers et dossiers à NE PAS copier depuis api/ ─────────────────────────
// Voir l'en-tête pour les justifications détaillées.
const API_EXCLUSIONS = new Set([
  ".env", // secret réel
  "installed.lock", // témoin d'installation
  "var", // données locales (sqlite, WAL…)
  "vendor", // dépendances Composer de dev
]);

// ── Utilitaires ───────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(`[paqueter] ${msg}\n`);
}

function abort(msg: string): never {
  process.stderr.write(`[paqueter] ERREUR : ${msg}\n`);
  process.exit(1);
}

/**
 * Copie récursive d'un dossier en respectant les exclusions et les fichiers
 * cachés (noms commençant par un point).
 * fs.cpSync avec { recursive: true } est disponible depuis Node 16.7.
 */
function copierDossier(src: string, dest: string, exclusions: Set<string>) {
  if (!fs.existsSync(src)) {
    abort(`Le dossier source n'existe pas : ${src}`);
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entree of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclusions.has(entree.name)) {
      log(`  exclus : ${entree.name}`);
      continue;
    }

    const srcPath = path.join(src, entree.name);
    const destPath = path.join(dest, entree.name);

    if (entree.isDirectory()) {
      // Récursion sans exclusions de premier niveau (les exclusions ne
      // s'appliquent qu'à la racine de api/).
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Crée le zip via Python 3 (zipfile stdlib).
 * Python garantit :
 *   - la présence des fichiers commençant par un point (.htaccess…)
 *   - l'absence d'un dossier racine supplémentaire dans l'archive
 *     (le contenu de dist/ est à la racine du zip, pas dist/…)
 *   - la disponibilité de l'outil : Python 3 est présent sur tout
 *     environnement Linux, macOS et Windows WSL.
 *
 * Le script Python est écrit dans un fichier temporaire pour éviter
 * les problèmes d'échappement des sauts de ligne dans les arguments
 * shell (-c interprète la chaîne après expansion du shell).
 */
function creerZip(dossierSource: string, zipDest: string) {
  const tmpDir = os.tmpdir();

  // Écrire le script Python dans un fichier temporaire
  const tmpScript = path.join(tmpDir, "katech-paqueter.py");

  const scriptPython = [
    "import zipfile, os, sys",
    "",
    "source = sys.argv[1]",
    "dest   = sys.argv[2]",
    "",
    "count = 0",
    "with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:",
    "    for racine, dossiers, fichiers in os.walk(source):",
    "        # os.walk inclut deja les fichiers caches (noms en point).",
    "        # On retri toutes les entrees pour etre certain de ne rien",
    "        # manquer, meme sur des systemes qui filtreraient les points.",
    "        toutes_entrees = os.listdir(racine)",
    "        dossiers[:] = [e for e in toutes_entrees",
    "                       if os.path.isdir(os.path.join(racine, e))]",
    "        fichiers     = [e for e in toutes_entrees",
    "                        if os.path.isfile(os.path.join(racine, e))]",
    "        for fichier in fichiers:",
    "            chemin_abs = os.path.join(racine, fichier)",
    "            chemin_arc = os.path.relpath(chemin_abs, source)",
    "            zf.write(chemin_abs, chemin_arc)",
    "            count += 1",
    "",
    "print(count)",
  ].join("\n");

  fs.writeFileSync(tmpScript, scriptPython, "utf8");

  try {
    const countStr = execSync(
      `python3 ${JSON.stringify(tmpScript)} ${JSON.stringify(dossierSource)} ${JSON.stringify(zipDest)}`,
      { encoding: "utf8" },
    ).trim();
    return parseInt(countStr, 10);
  } finally {
    fs.unlinkSync(tmpScript);
  }
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

function main() {
  // 0. Sortie rapide si le paquetage n'est pas voulu.
  //
  //    Deux conditions, par ordre de priorité :
  //
  //    a) CI=true (ou CI=1) — variable posée automatiquement par GitHub Actions,
  //       Lovable CI et la plupart des pipelines d'intégration continue. La CI
  //       veut un dist/ statique, pas une archive binaire de 10 Mo — relier le
  //       zip au postbuild alourdirait chaque push sans bénéfice et ralentirait
  //       le feedback. Mais `bun run build` hors CI le produit désormais, ce
  //       qui est ce que le commanditaire demandait.
  //
  //    b) PAQUET=0 — sortie explicite pour qui lance le build localement mais
  //       n'a pas besoin du zip (tests rapides, mesures de prerendu…).
  //
  //    Dans les deux cas la sortie est affichée, jamais silencieuse, pour que
  //    l'absence du zip s'explique d'elle-même dans les logs.
  const envCI = (process.env.CI ?? "").toLowerCase();
  const estCI = envCI === "true" || envCI === "1";
  const paquet = (process.env.PAQUET ?? "").toLowerCase();
  const paquetDesactive = paquet === "0";

  if (estCI) {
    log("CI détecté (CI=" + process.env.CI + ") — paquetage ignoré.");
    return;
  }
  if (paquetDesactive) {
    log("PAQUET=0 — paquetage ignoré à la demande.");
    return;
  }

  // 1. Vérifications préalables
  if (!fs.existsSync(DIST)) {
    abort("dist/ est absent. Lance d'abord : bun run build (ou npm run build).");
  }
  if (!fs.existsSync(path.join(DIST, ".htaccess"))) {
    abort(
      "dist/.htaccess est absent — le repli SPA ne fonctionnera pas. " +
        "Vérifie que public/.htaccess existe et que Vite l'a bien copié.",
    );
  }

  // 2. Vérification de sécurité : aucun .env réel dans dist/ avant de zipper
  //    (le build ne devrait pas en produire, mais on ne fait pas confiance
  //    au passé — le zip part par e-mail.)
  const envDansDist = path.join(DIST, ".env");
  if (fs.existsSync(envDansDist)) {
    abort(
      "Un fichier .env a été trouvé dans dist/ — il ne doit JAMAIS être " +
        "dans le zip. Supprime dist/.env avant de relancer.",
    );
  }

  // 3. Copie de api/ dans dist/api/ (avec exclusions)
  log("Copie de api/ dans dist/api/ …");
  if (fs.existsSync(API_DEST)) {
    fs.rmSync(API_DEST, { recursive: true, force: true });
  }
  copierDossier(API_SRC, API_DEST, API_EXCLUSIONS);

  // 4. Vérification explicite que les fichiers cachés sont bien là
  const htaccessApi = path.join(API_DEST, ".htaccess");
  const envExampleApi = path.join(API_DEST, ".env.example");
  if (!fs.existsSync(htaccessApi)) {
    abort("api/.htaccess est absent de dist/api/ — problème de copie.");
  }
  if (!fs.existsSync(envExampleApi)) {
    abort("api/.env.example est absent de dist/api/ — problème de copie.");
  }

  // Vérification que le .env réel N'est PAS dans dist/api/
  const envReel = path.join(API_DEST, ".env");
  if (fs.existsSync(envReel)) {
    abort(
      "api/.env a été copié dans dist/api/ malgré l'exclusion — " +
        "vérifier la logique d'exclusion.",
    );
  }

  log("  dist/api/.htaccess     : présent");
  log("  dist/api/.env.example  : présent");
  log("  dist/api/.env          : absent (correct)");
  log(
    "  dist/api/installed.lock: " +
      (fs.existsSync(path.join(API_DEST, "installed.lock"))
        ? "PRÉSENT (erreur !)"
        : "absent (correct)"),
  );

  // 5. Création du zip
  log(`Création de ${path.basename(ZIP_OUT)} …`);
  if (fs.existsSync(ZIP_OUT)) {
    fs.unlinkSync(ZIP_OUT);
  }

  const nbFichiers = creerZip(DIST, ZIP_OUT);
  const taille = fs.statSync(ZIP_OUT).size;
  const tailleKo = (taille / 1024).toFixed(0);
  const tailleMo = (taille / (1024 * 1024)).toFixed(2);

  log(`\n  Terminé.`);
  log(`  Fichiers dans le zip : ${nbFichiers}`);
  log(`  Taille               : ${tailleKo} Ko (${tailleMo} Mo)`);
  log(`  Chemin               : ${ZIP_OUT}`);
  log(``);
  log(`Pour déployer :`);
  log(`  1. Dans hPanel → Gestionnaire de fichiers, déposer katech-site.zip dans public_html.`);
  log(`  2. Extraire sur place (clic droit → Extraire).`);
  log(`  3. Ouvrir https://votre-domaine/api/install.php et suivre les trois écrans.`);
  log(`  4. Cliquer le bouton « Supprimer ce fichier » à la fin de l'assistant.`);
}

main();
