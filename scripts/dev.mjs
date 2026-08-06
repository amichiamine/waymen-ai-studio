#!/usr/bin/env node
/**
 * `bun run dev` — démarre TOUT : l'API PHP et le frontend, en une commande.
 *
 * Aucun fichier de configuration à créer. Le mode `http` est injecté par
 * l'environnement : Vite lit les variables `VITE_*` de `process.env` au même
 * titre que celles d'un `.env` (vérifié, deux bundles différents selon qu'elle
 * est présente ou non).
 *
 * Les deux autres entrées restent disponibles :
 *   bun run dev:mock   frontend seul, données dans le localStorage
 *   bun run dev:api    l'API seule, pour la sonder au curl
 *
 * Ctrl+C arrête les deux processus.
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const racine = resolve(import.meta.dirname, "..");
const portApi = Number(process.env.API_PORT ?? 8160);

const COULEURS = { api: "\x1b[36m", web: "\x1b[35m", gris: "\x1b[90m", fin: "\x1b[0m" };

/** Préfixe chaque ligne, pour qu'on sache toujours qui parle. */
function brancher(nom, flux) {
  let reste = "";
  flux.on("data", (bloc) => {
    const lignes = (reste + bloc.toString()).split("\n");
    reste = lignes.pop() ?? "";
    for (const l of lignes) {
      if (l.trim() !== "") console.log(`${COULEURS[nom]}[${nom}]${COULEURS.fin} ${l}`);
    }
  });
}

const enfants = [];

function lancer(nom, commande, args, env) {
  const p = spawn(commande, args, {
    cwd: racine,
    env: { ...process.env, ...env },
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  brancher(nom, p.stdout);
  brancher(nom, p.stderr);
  p.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${COULEURS[nom]}[${nom}]${COULEURS.fin} arrêté (code ${code})`);
      arreter(code);
    }
  });
  enfants.push(p);
  return p;
}

let arretEnCours = false;
function arreter(code = 0) {
  if (arretEnCours) return;
  arretEnCours = true;
  for (const p of enfants) p.kill();
  setTimeout(() => process.exit(code), 200);
}
process.on("SIGINT", () => arreter(0));
process.on("SIGTERM", () => arreter(0));

/** Attend que l'API réponde, plutôt que de parier sur un délai fixe. */
async function attendreApi(limiteMs = 45000) {
  const debut = Date.now();
  while (Date.now() - debut < limiteMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${portApi}/health`);
      if (r.ok) return true;
    } catch {
      // Pas encore prête : c'est attendu au démarrage.
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

console.log(`${COULEURS.gris}Démarrage de l'API puis du frontend…${COULEURS.fin}\n`);

lancer("api", process.execPath, [resolve(racine, "scripts", "api-dev.mjs")], {});

const prete = await attendreApi();

if (!prete) {
  console.log(
    `\n${COULEURS.gris}L'API n'a pas répondu sur le port ${portApi}.${COULEURS.fin}\n` +
      `Le frontend démarre quand même, en mode « mock » : il fonctionnera sur le\n` +
      `localStorage, sans base. Regarde les lignes [api] ci-dessus pour la cause\n` +
      `— le plus souvent, PHP absent du PATH (Windows : ajoute C:\\xampp\\php).\n`,
  );
  lancer("web", "bunx", ["vite"], { VITE_API_MODE: "mock" });
} else {
  console.log(`\n${COULEURS.gris}API prête. Frontend en mode « http ».${COULEURS.fin}\n`);
  lancer("web", "bunx", ["vite"], { VITE_API_MODE: "http" });
}
