/**
 * paqueter-data.ts — Assemble katech-data.zip : archive séparée des données.
 *
 * =====================================================================
 * POURQUOI CE SCRIPT EXISTE
 * =====================================================================
 * Pour des raisons impératives de cybersécurité, le dossier `katech-data/`
 * (qui contient la base de données SQLite `dev-*.sqlite` et ses configurations)
 * doit impérativement résider HORS de la racine web (`public_html/`).
 *
 * Ce script permet de paqueter isolément `katech-data/` pour le transférer
 * facilement sur le serveur (ex. au niveau racine à côté de `public_html/`).
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const DATA_SRC = path.join(ROOT, "katech-data");

function obtenirNomArchiveHorodatee(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const jj = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const aaaa = d.getFullYear();
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `katech-data-${jj}${mm}${aaaa}-${hh}${min}.zip`;
}

function log(msg: string) {
  process.stdout.write(`[paqueter-data] ${msg}\n`);
}

function abort(msg: string): never {
  process.stderr.write(`[paqueter-data] ERREUR : ${msg}\n`);
  process.exit(1);
}

function creerZip(dossierSource: string, zipDest: string): number {
  const tmpDir = os.tmpdir();
  const tmpScript = path.join(tmpDir, "katech-paqueter-data.py");

  const scriptPython = [
    "import zipfile, os, sys",
    "",
    "source = sys.argv[1]",
    "dest   = sys.argv[2]",
    "",
    "count = 0",
    "with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:",
    "    for racine, dossiers, fichiers in os.walk(source):",
    "        toutes_entrees = os.listdir(racine)",
    "        dossiers[:] = [e for e in toutes_entrees if os.path.isdir(os.path.join(racine, e))]",
    "        fichiers     = [e for e in toutes_entrees if os.path.isfile(os.path.join(racine, e))]",
    "        for fichier in fichiers:",
    "            if fichier.endswith('.sqlite-wal') or fichier.endswith('.sqlite-shm'):",
    "                continue",
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
    if (fs.existsSync(tmpScript)) {
      fs.unlinkSync(tmpScript);
    }
  }
}

function main() {
  if (!fs.existsSync(DATA_SRC)) {
    abort(`Le dossier source n'existe pas : ${DATA_SRC}`);
  }

  log(`Vérification du dossier katech-data …`);
  const fichiers = fs.readdirSync(DATA_SRC);
  log(`  Fichiers trouvés : ${fichiers.join(", ")}`);

  const nomHorodate = obtenirNomArchiveHorodatee();
  const zipHorodate = path.join(ROOT, nomHorodate);

  log(`Création de ${nomHorodate} …`);
  if (fs.existsSync(zipHorodate)) {
    fs.unlinkSync(zipHorodate);
  }

  const nbFichiers = creerZip(DATA_SRC, zipHorodate);

  const taille = fs.statSync(zipHorodate).size;
  const tailleKo = (taille / 1024).toFixed(0);
  const tailleMo = (taille / (1024 * 1024)).toFixed(2);

  log(`\n  ✔ Terminé avec succès.`);
  log(`  Fichiers dans le zip : ${nbFichiers}`);
  log(`  Taille               : ${tailleKo} Ko (${tailleMo} Mo)`);
  log(`  Archive horodatée    : ${zipHorodate}`);
  log(``);
  log(`Pour déployer vos données :`);
  log(`  1. Déposer ${nomHorodate} HORS de public_html (ex. à la racine utilisateur).`);
  log(`  2. Extraire dans un dossier nommé katech-data.`);
  log(`  3. Vérifier que DB_SQLITE_PATH dans api/.env pointe bien vers ce dossier.`);
}

main();
