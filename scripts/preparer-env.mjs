#!/usr/bin/env node
/**
 * Prépare api/.env à partir de api/.env.example — sans jamais l'écraser.
 *
 * Usage : bun run preparer-env
 *
 * Ce script s'adresse aux DÉVELOPPEURS qui ont accès à la ligne de commande.
 * Il copie api/.env.example vers api/.env si ce dernier est absent.
 *
 * Il ne remplace PAS la démarche manuelle requise en déploiement sur
 * hébergeur mutualisé : le commerçant copie .env.example via le
 * gestionnaire de fichiers de son hébergeur (hPanel…), remplit les valeurs,
 * puis ouvre api/install.php. Ce script ne lui est pas destiné.
 *
 * Règles :
 *  - N'ÉCRASE JAMAIS un .env existant. Si le fichier est là, même vide,
 *    on s'arrête. C'est délibéré : un écrasement silencieux ferait perdre
 *    une configuration en cours.
 *  - Ne génère aucune valeur. Le fichier produit est une copie exacte de
 *    l'exemple : les champs obligatoires restent vides, c'est intentionnel.
 *    Un mot de passe inventé est pire que pas de mot de passe.
 *  - Tente de passer le .env en 0640 (propriétaire + groupe). Sous Windows
 *    et sur certains systèmes de fichiers, chmod n'a pas d'effet — c'est
 *    acceptable en développement local.
 */

import { copyFileSync, chmodSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const racine = resolve(import.meta.dirname, "..");
const source = resolve(racine, "api", ".env.example");
const destination = resolve(racine, "api", ".env");

// ── 1. L'exemple doit exister ──────────────────────────────────────────────

if (!existsSync(source)) {
  console.error(
    "\nErreur : api/.env.example est introuvable.\n" +
      "  Vérifiez que le projet est complet (git status).\n",
  );
  process.exit(1);
}

// ── 2. Ne jamais écraser ───────────────────────────────────────────────────

if (existsSync(destination)) {
  const taille = statSync(destination).size;
  console.log(
    `\napi/.env existe déjà (${taille} octets) — aucune modification.\n` +
      "  Pour repartir d'un fichier vierge : supprimez api/.env manuellement,\n" +
      "  puis relancez cette commande.\n",
  );
  process.exit(0);
}

// ── 3. Copier l'exemple ────────────────────────────────────────────────────

copyFileSync(source, destination);
console.log("\napi/.env créé depuis api/.env.example.");

// ── 4. Tenter de restreindre les permissions ───────────────────────────────
//
// Mode 0640 : propriétaire (lecture/écriture) + groupe (lecture seule).
// Sous Windows, chmod est ignoré par Node.js — ce n'est pas un problème
// en développement local, où aucun autre utilisateur ne partage le serveur.

try {
  chmodSync(destination, 0o640);
  console.log("Permissions : 0640 (autres processus : accès interdit).");
} catch {
  // Pas fatal : on avertit seulement.
  console.warn(
    "Avertissement : impossible de restreindre les permissions de api/.env.\n" +
      "  En développement local, ce n'est généralement pas un problème.",
  );
}

// ── 5. Rappel des variables obligatoires ──────────────────────────────────

console.log(`
Prochaine étape : ouvrez api/.env et renseignez au minimum :

  DB_DRIVER        mysql | pgsql | sqlite
  DB_NAME          nom de votre base de données
  DB_USER          utilisateur de la base
  DB_PASSWORD      mot de passe de la base

  INSTALL_OWNER_EMAIL     votre adresse e-mail (compte administrateur)
  INSTALL_OWNER_PASSWORD  mot de passe fort (10 caractères minimum)

En DÉVELOPPEMENT, ces valeurs ne sont pas nécessaires : scripts/api-dev.mjs
les injecte par l'environnement. Ce fichier est utile uniquement pour un
déploiement sur serveur (sans accès SSH, via le gestionnaire de fichiers).
`);
