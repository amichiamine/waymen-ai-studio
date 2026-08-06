#!/usr/bin/env node
/**
 * Démarre l'API PHP en développement — Windows, macOS et Linux.
 *
 *   bun run dev:api        installe la base si besoin, importe les données,
 *                          puis sert l'API sur le port 8160
 *
 * Ensuite, dans un SECOND terminal :
 *
 *   bun run dev:mock       le frontend seul, sur le localStorage
 *
 * En pratique, `bun run dev` lance les DEUX (voir scripts/dev.mjs) : ce script
 * n'est utile que pour sonder l'API isolément, au curl par exemple.
 *
 * Si PHP n'est pas dans le PATH, on le cherche aux emplacements usuels
 * (XAMPP, Laragon, WAMP). `PHP_BIN` force un chemin précis.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const racine = resolve(import.meta.dirname, "..");
const port = Number(process.env.API_PORT ?? 8160);

// Chemin explicite si l'utilisateur en fournit un : PHP_BIN prime sur tout.
const phpImpose = process.env.PHP_BIN;

/**
 * Emplacement de la base de développement.
 *
 * Elle vivait dans le dossier PARENT du projet. Mauvais choix : quand le projet
 * est cloné dans `C:\xampp\htdocs\ka-tech`, le parent est `htdocs` — la racine
 * web d'Apache. La base devenait téléchargeable à
 * `http://localhost/katech-data/dev.sqlite` : comptes, commandes et empreintes
 * de mots de passe servis en HTTP. C'est arrivé.
 *
 * On la place désormais dans le dossier de données de l'utilisateur, qu'aucun
 * serveur web ne sert jamais :
 *   Windows : %LOCALAPPDATA%\ka-tech
 *   macOS   : ~/Library/Application Support/ka-tech
 *   Linux   : ~/.local/share/ka-tech
 *
 * `DB_SQLITE_PATH` reste prioritaire pour qui veut choisir.
 */
function dossierDonnees() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA ?? process.env.APPDATA;
    if (base) return resolve(base, "ka-tech");
  } else if (process.platform === "darwin") {
    if (homedir()) return resolve(homedir(), "Library", "Application Support", "ka-tech");
  } else {
    const xdg = process.env.XDG_DATA_HOME;
    if (xdg) return resolve(xdg, "ka-tech");
    if (homedir()) return resolve(homedir(), ".local", "share", "ka-tech");
  }
  // Dernier recours : à côté du projet, avec l'avertissement ci-dessous.
  return resolve(racine, "..", "katech-data");
}

const base = process.env.DB_SQLITE_PATH ?? resolve(dossierDonnees(), "dev.sqlite");

/**
 * Garde-fou : refuse de créer la base sous une racine web connue.
 *
 * Un `DB_SQLITE_PATH` mal choisi, ou un repli malheureux, rendrait la base
 * téléchargeable. Mieux vaut un refus explicite qu'une fuite silencieuse
 * (AGENTS.md §7).
 */
function souRacineWeb(chemin) {
  const normalise = chemin.replace(/\\/g, "/").toLowerCase();
  return ["/htdocs/", "/www/", "/public_html/", "/wwwroot/"].some((r) => normalise.includes(r));
}

if (souRacineWeb(base)) {
  console.error(
    `\nLa base « ${base} » se trouve sous une racine web.\n` +
      `Elle serait téléchargeable par HTTP : comptes, commandes, empreintes de\n` +
      `mots de passe. Choisissez un autre emplacement :\n\n` +
      `  set DB_SQLITE_PATH=C:\\katech-data\\dev.sqlite && bun run dev\n`,
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DB_DRIVER: process.env.DB_DRIVER ?? "sqlite",
  DB_SQLITE_PATH: base,
  // `production` masque les traces d'erreur. Pour les voir pendant une mise au
  // point, lance avec APP_ENV=development.
  APP_ENV: process.env.APP_ENV ?? "production",
  // Le serveur intégré de PHP a pour racine `api/` : le préfixe `/api` n'existe
  // pas côté serveur, c'est le proxy Vite qui le retire (voir vite.config.ts).
  API_BASE_PATH: "/",
  SMTP_SIMULATE: process.env.SMTP_SIMULATE ?? "1",
  INSTALL_OWNER_EMAIL: process.env.INSTALL_OWNER_EMAIL ?? "admin@katech.dz",
  // UN SEUL mot de passe de développement, identique en mock et en http :
  // celui que `admin-store` sème pour les comptes de démonstration
  // (`devDefaultSeedPassword()`). Ce script créait auparavant le propriétaire
  // avec « Mdp-Dev-2026! » : passer de `mock` à `http` changeait donc le mot de
  // passe sans le dire, et la connexion était refusée sans raison visible.
  //
  // Ceci ne concerne QUE le développement. `api/install.php` continue d'exiger
  // INSTALL_OWNER_PASSWORD, sans aucune valeur par défaut, lors d'une vraie
  // installation : c'est ce script de dev qui la fournit, pas l'installateur qui
  // l'invente.
  INSTALL_OWNER_PASSWORD: process.env.INSTALL_OWNER_PASSWORD ?? "katech-dev-2026",
  INSTALL_OWNER_NAME: process.env.INSTALL_OWNER_NAME ?? "Propriétaire",
};

/**
 * Localise l'exécutable PHP.
 *
 * On essaie d'abord le `PATH`, puis les emplacements usuels d'installation —
 * sous Windows, XAMPP et Laragon n'ajoutent PAS PHP au `PATH` par défaut, et
 * c'est la première chose qui bloque. Autant le trouver nous-mêmes plutôt que
 * de renvoyer l'utilisateur à sa configuration système.
 */
function trouverPhp() {
  if (phpImpose) {
    const essai = spawnSync(phpImpose, ["-v"], { stdio: "ignore" });
    if (!essai.error && essai.status === 0) return phpImpose;
    console.error(`\nPHP_BIN pointe sur « ${phpImpose} », qui ne répond pas à « php -v ».\n`);
    return null;
  }
  const candidats = [
    "php",
    ...(process.platform === "win32"
      ? [
          "C:\\xampp\\php\\php.exe",
          "C:\\laragon\\bin\\php\\php.exe",
          "C:\\wamp64\\bin\\php\\php.exe",
        ]
      : ["/usr/bin/php", "/usr/local/bin/php", "/opt/homebrew/bin/php"]),
  ];
  for (const candidat of candidats) {
    const essai = spawnSync(candidat, ["-v"], { stdio: "ignore" });
    if (!essai.error && essai.status === 0) return candidat;
  }
  return null;
}

const PHP = trouverPhp();

if (PHP === null) {
  console.error(
    "\nPHP est introuvable.\n\n" +
      (process.platform === "win32"
        ? "  XAMPP le fournit. Deux solutions :\n" +
          "    · ajouter C:\\xampp\\php au PATH de Windows, ou\n" +
          "    · lancer avec un chemin explicite :\n" +
          "        set PHP_BIN=C:\\chemin\\vers\\php.exe && bun run dev\n"
        : "  Installez PHP 8.2 ou plus récent, puis vérifiez avec : php -v\n"),
  );
  process.exit(1);
}

if (PHP !== "php") {
  console.log(`> PHP trouvé hors du PATH : ${PHP}`);
}

function php(args, options = {}) {
  return spawnSync(PHP, args, { cwd: racine, env, stdio: "inherit", ...options });
}

mkdirSync(dirname(base), { recursive: true });

// L'installation ne s'exécute qu'une fois : `install.php` pose un témoin dans
// `api/` et refuse de recommencer, ce qui protège une base de production.
//
// Mais ce témoin est lié au DÉPÔT, pas à la base. En développement, on change
// de base sans y penser (fichier supprimé, chemin différent, essai d'un autre
// pilote) : le témoin devient alors orphelin et bloque une installation
// pourtant légitime. On le retire dans ce seul cas — base absente, témoin
// présent — et on le dit.
if (!existsSync(base)) {
  const temoin = resolve(racine, "api", "installed.lock");
  if (existsSync(temoin)) {
    console.log(`\n> Témoin d'installation orphelin (la base ${base} n'existe pas) — retiré.`);
    rmSync(temoin);
  }
  console.log(`\n> Première exécution — création de la base : ${base}`);
  if (php(["api/install.php"]).status !== 0) {
    console.error("\nL'installation a échoué. Rien n'a été démarré.\n");
    process.exit(1);
  }
  console.log("\n> Import des données du frontend (catalogue, blog, contenu)");
  php(["api/tools/importer-donnees-front.php"]);
}

console.log(
  `\n  API KA Tech — http://127.0.0.1:${port}\n` +
    `  pilote : ${env.DB_DRIVER}\n` +
    `  base   : ${base}\n` +
    `  compte : ${env.INSTALL_OWNER_EMAIL} / ${env.INSTALL_OWNER_PASSWORD}\n\n` +
    `  Pour l'API ET le frontend d'un coup : bun run dev\n\n` +
    `  Ctrl+C pour arrêter.\n`,
);

const serveur = spawn(PHP, ["-S", `127.0.0.1:${port}`, "-t", "api"], {
  cwd: racine,
  env,
  stdio: "inherit",
});

const arreter = () => {
  serveur.kill();
  process.exit(0);
};
process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
serveur.on("exit", (code) => process.exit(code ?? 0));
