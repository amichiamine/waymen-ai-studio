#!/usr/bin/env node
/**
 * Démarre l'API PHP en développement — Windows, macOS et Linux.
 *
 *   bun run dev:api        installe la base si besoin, importe les données,
 *                          puis sert l'API sur le port 8160
 *
 * Ensuite, dans un SECOND terminal :
 *
 *   bun run dev            le frontend, qui proxifie /api vers cette API
 *
 * Le mode de données se choisit dans `.env.local` :
 *   VITE_API_MODE=http     parle à cette API
 *   VITE_API_MODE=mock     revient au localStorage (défaut)
 *
 * Vite lit `.env.local` AU DÉMARRAGE : après modification, redémarre `bun run dev`.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const racine = resolve(import.meta.dirname, "..");
const port = Number(process.env.API_PORT ?? 8160);

// Base de développement : hors du dépôt, pour ne jamais être commitée ni servie.
const baseParDefaut = resolve(racine, "..", "katech-data", "dev.sqlite");
const base = process.env.DB_SQLITE_PATH ?? baseParDefaut;

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
  INSTALL_OWNER_PASSWORD: process.env.INSTALL_OWNER_PASSWORD ?? "Mdp-Dev-2026!",
  INSTALL_OWNER_NAME: process.env.INSTALL_OWNER_NAME ?? "Propriétaire",
};

function php(args, options = {}) {
  return spawnSync("php", args, { cwd: racine, env, stdio: "inherit", ...options });
}

const verifierPhp = spawnSync("php", ["-v"], { stdio: "ignore" });
if (verifierPhp.error) {
  console.error(
    "\nPHP est introuvable.\n" +
      "  Windows : XAMPP fournit PHP — ajoute C:\\xampp\\php à ton PATH.\n" +
      "  Vérifie ensuite avec : php -v\n",
  );
  process.exit(1);
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
    `  Dans un second terminal : bun run dev\n` +
    `  (avec VITE_API_MODE=http dans .env.local)\n\n` +
    `  Ctrl+C pour arrêter.\n`,
);

const serveur = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", "api"], {
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
