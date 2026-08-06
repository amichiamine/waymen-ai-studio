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
 *
 * ---------------------------------------------------------------------------
 * LES TROIS PILOTES
 * ---------------------------------------------------------------------------
 * Par défaut SQLite, qui ne demande rien. Mais le projet en supporte trois, et
 * une portabilité qu'on ne peut pas essayer en développement est une
 * portabilité qu'on croit acquise jusqu'au jour de la mise en ligne :
 *
 *   DB_DRIVER=mysql DB_NAME=katech DB_USER=katech DB_PASSWORD=… bun run dev:api
 *   DB_DRIVER=pgsql DB_NAME=katech DB_USER=katech DB_PASSWORD=… bun run dev:api
 *
 * Sous Windows (cmd) : `set DB_DRIVER=pgsql && bun run dev:api`.
 *
 * Différence avec SQLite : la base n'est PAS créée par ce script. MySQL comme
 * PostgreSQL veulent une base existante — c'est aussi vrai en développement que
 * chez l'hébergeur. Le script détecte si elle est vide et lance l'installation ;
 * si elle est injoignable, il le DIT et s'arrête au lieu de démarrer un serveur
 * qui répondrait 500 à chaque requête.
 */

import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const racine = resolve(import.meta.dirname, "..");
const port = Number(process.env.API_PORT ?? 8160);

// Chemin explicite si l'utilisateur en fournit un : PHP_BIN prime sur tout.
const phpImpose = process.env.PHP_BIN;

// Les trois valeurs acceptées, identiques à Db::PILOTES côté PHP. Une faute de
// frappe doit s'arrêter ici, avec la liste, plutôt que de partir en SQLite en
// silence et de laisser croire que MySQL a été essayé.
const PILOTES = ["sqlite", "mysql", "pgsql"];
const pilote = (process.env.DB_DRIVER ?? "sqlite").toLowerCase();

if (!PILOTES.includes(pilote)) {
  console.error(
    `\nDB_DRIVER vaut « ${pilote} », qui n'est pas un pilote connu.\n` +
      `  Valeurs acceptées : ${PILOTES.join(", ")}.\n`,
  );
  process.exit(1);
}

const estSqlite = pilote === "sqlite";

/**
 * Emplacement de la base de développement : `katech-data/` DANS le projet.
 *
 * ---------------------------------------------------------------------------
 * HISTORIQUE — à lire avant de déplacer quoi que ce soit
 * ---------------------------------------------------------------------------
 * 1. La base a d'abord vécu dans le dossier PARENT du projet. Mauvais choix :
 *    un projet cloné dans `C:\xampp\htdocs\ka-tech` a pour parent `htdocs`, la
 *    racine web d'Apache. La base était téléchargeable à
 *    `http://localhost/katech-data/dev.sqlite` — comptes, commandes et
 *    empreintes de mots de passe servis en HTTP. C'est réellement arrivé.
 * 2. Elle a donc été exilée dans le dossier de données de l'utilisateur
 *    (%LOCALAPPDATA%, ~/Library/Application Support, ~/.local/share), qu'aucun
 *    serveur web ne sert. Sûr, mais invisible : on oublie qu'elle existe, on ne
 *    la sauvegarde pas, on ne la retrouve pas.
 * 3. Aujourd'hui, à la demande explicite du client, elle revient DANS le
 *    projet : `<projet>/katech-data/`. Visible, déplacée avec le dépôt,
 *    sauvegardée avec lui.
 *
 * ---------------------------------------------------------------------------
 * CE RETOUR RÉINTRODUIT LE RISQUE DE 2018 — d'où les protections
 * ---------------------------------------------------------------------------
 * Sous XAMPP, `C:\xampp\htdocs\ka-tech\katech-data\` est bel et bien servi à
 * `http://localhost/ka-tech/katech-data/`. Le `public/.htaccess` du dépôt ne
 * protège PAS ce cas : Vite le copie dans `dist/`, il n'atterrit qu'à la racine
 * du SITE déployé (`public_html/.htaccess`), jamais à la racine du dépôt cloné.
 * Vérifié, pas supposé — il n'existe aucun `.htaccess` à la racine du dépôt.
 *
 * On empile donc trois protections, de la plus fragile à la plus solide :
 *   1. `katech-data/.htaccess` — refus total. Ne vaut QUE sur Apache et
 *      LiteSpeed. nginx ignore totalement les .htaccess.
 *   2. `katech-data/index.html` — empêche le listage du dossier partout, mais
 *      n'empêche pas de télécharger un fichier dont on devine le nom.
 *   3. NOM DE FICHIER NON DEVINABLE — `dev-<12 hexa>.sqlite` au lieu de
 *      `dev.sqlite`. C'est la seule des trois qui tienne sur n'importe quel
 *      serveur, y compris nginx : on ne télécharge pas ce qu'on ne peut pas
 *      nommer. Ce n'est pas de la cryptographie, c'est ce qui reste quand les
 *      deux autres barrières sont absentes.
 *
 * `DB_SQLITE_PATH` reste prioritaire pour qui veut choisir lui-même — mais un
 * chemin imposé n'est pas un dossier que nous gérons : s'il tombe sous une
 * racine web, le refus de démarrer d'origine s'applique toujours.
 */
function dossierDonnees() {
  return resolve(racine, "katech-data");
}

/**
 * Anciens emplacements de la base, dans l'ordre chronologique inverse.
 *
 * Sert uniquement à prévenir l'utilisateur qui en avait une : voir plus bas.
 */
function anciensEmplacements() {
  const chemins = [];
  if (process.platform === "win32") {
    const donnees = process.env.LOCALAPPDATA ?? process.env.APPDATA;
    if (donnees) chemins.push(resolve(donnees, "ka-tech", "dev.sqlite"));
  } else if (process.platform === "darwin") {
    if (homedir()) {
      chemins.push(resolve(homedir(), "Library", "Application Support", "ka-tech", "dev.sqlite"));
    }
  } else {
    if (process.env.XDG_DATA_HOME) {
      chemins.push(resolve(process.env.XDG_DATA_HOME, "ka-tech", "dev.sqlite"));
    }
    if (homedir()) chemins.push(resolve(homedir(), ".local", "share", "ka-tech", "dev.sqlite"));
  }
  // Le tout premier emplacement, à côté du projet.
  chemins.push(resolve(racine, "..", "katech-data", "dev.sqlite"));
  return chemins.filter((chemin) => existsSync(chemin));
}

/**
 * Détecte un chemin situé sous une racine web connue.
 *
 * Le garde-fou d'origine refusait purement et simplement de démarrer dans ce
 * cas. Il ne disparaît pas : il sert maintenant à DISTINGUER un emplacement
 * voulu et protégé (notre `katech-data/`) d'un emplacement dangereux
 * (un `DB_SQLITE_PATH` posé n'importe où sous `htdocs`).
 */
function souRacineWeb(chemin) {
  const normalise = chemin.replace(/\\/g, "/").toLowerCase();
  return ["/htdocs/", "/www/", "/public_html/", "/wwwroot/"].some((r) => normalise.includes(r));
}

// Marqueur cherché dans un .htaccess existant : s'il a disparu, le fichier a
// été vidé ou remplacé, et on le réécrit. Sans marqueur, on ne saurait pas
// distinguer « protection en place » de « fichier vide de 0 octet ».
const MARQUEUR_PROTECTION = "# katech-data:protection-v1";

const HTACCESS_PROTECTION = `${MARQUEUR_PROTECTION}
# =====================================================================
# katech-data/.htaccess — ce dossier ne sort JAMAIS par HTTP
# =====================================================================
# Écrit automatiquement par scripts/api-dev.mjs. Ne pas supprimer.
#
# POURQUOI : ce dossier contient la base de développement (comptes,
# commandes, empreintes de mots de passe) et vit à l'intérieur du projet.
# Si le projet est cloné dans C:\\xampp\\htdocs\\ka-tech, Apache le sert à
# http://localhost/ka-tech/katech-data/. Ce fichier l'en empêche.
#
# PORTÉE RÉELLE : Apache et LiteSpeed seulement, et seulement si
# AllowOverride autorise ces directives. nginx IGNORE les .htaccess :
# sur nginx, ce fichier ne protège RIEN. C'est pourquoi la base porte
# aussi un nom non devinable (voir scripts/api-dev.mjs).
#
# Deux barrières redondantes À DESSEIN : si un module manque, l'autre tient.
# =====================================================================

Options -Indexes

<IfModule mod_negotiation.c>
  Options -MultiViews
</IfModule>

# --- Barrière 1 : refus du dossier entier (mod_authz_core) -----------
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Order allow,deny
  Deny from all
</IfModule>

# --- Barrière 2 : refus par réécriture, si mod_authz_core manquait ---
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^ - [F,L]
</IfModule>

# --- Barrière 3 : refus par nom de fichier ---------------------------
# Redondant avec la barrière 1, mais survit à un « Require all granted »
# hérité d'une configuration de VirtualHost trop permissive.
<FilesMatch "(^\\.|\\.(sqlite|sqlite-wal|sqlite-shm|db|sql|env|log|bak|old|gz|zip|tar)$)">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>

ErrorDocument 403 "Acces refuse."
`;

const INDEX_PROTECTION = `<!doctype html>
<!-- ${MARQUEUR_PROTECTION} -->
<!--
  Écrit automatiquement par scripts/api-dev.mjs. Ne pas supprimer.

  Rôle : empêcher le LISTAGE du dossier sur les serveurs où « Options -Indexes »
  ne s'applique pas (nginx avec autoindex, par exemple). Cette page est alors
  servie à la place de la liste des fichiers.

  Ce fichier n'empêche PAS de télécharger un fichier dont on connaît le nom.
  C'est le .htaccess (Apache/LiteSpeed) et le nom non devinable de la base qui
  s'en chargent.
-->
<meta charset="utf-8" />
<title>Acces refuse</title>
<p>Rien a voir ici.</p>
`;

/**
 * Pose les fichiers de protection dans le dossier de données.
 *
 * Idempotent : n'écrit que si le fichier manque ou a perdu son marqueur, pour
 * ne pas se battre avec la copie versionnée ni polluer `git status`.
 *
 * Ne LANCE PAS d'exception : le résultat est rendu à l'appelant, qui décide si
 * l'échec est fatal (dossier sous racine web) ou seulement bruyant. Un échec
 * silencieux ici serait exactement le scénario que ce script existe pour éviter
 * (AGENTS.md §7 — rendre les échecs visibles).
 *
 * `dossierAbsent` distingue les deux échecs possibles, qui n'ont pas la même
 * gravité : ne pas pouvoir CRÉER le dossier condamne la suite (aucune base ne
 * pourra y naître), alors que ne pas pouvoir y ÉCRIRE le `.htaccess` n'est
 * dangereux que sous une racine web.
 *
 * @returns {{ok: true} | {ok: false, raison: string, dossierAbsent: boolean}}
 */
function poserProtections(dossier) {
  try {
    mkdirSync(dossier, { recursive: true });
  } catch (erreur) {
    return { ok: false, raison: erreur.message, dossierAbsent: true };
  }

  const aEcrire = [
    [".htaccess", HTACCESS_PROTECTION],
    ["index.html", INDEX_PROTECTION],
  ];
  try {
    for (const [nom, contenu] of aEcrire) {
      const chemin = resolve(dossier, nom);
      if (existsSync(chemin) && readFileSync(chemin, "utf8").includes(MARQUEUR_PROTECTION)) {
        continue;
      }
      writeFileSync(chemin, contenu, "utf8");
    }
    return { ok: true };
  } catch (erreur) {
    return { ok: false, raison: erreur.message, dossierAbsent: false };
  }
}

/**
 * Nom du fichier de base, non devinable.
 *
 * `dev.sqlite` se devine du premier coup ; `dev-3f9a1c07b2e5.sqlite` non. Le
 * suffixe est tiré une seule fois puis RETROUVÉ par balayage du dossier : sans
 * cela, chaque démarrage créerait une base neuve et l'utilisateur perdrait ses
 * données à chaque lancement.
 *
 * @returns {{chemin: string, nouveau: boolean}}
 */
function fichierBase(dossier) {
  let existants = [];
  try {
    existants = readdirSync(dossier)
      .filter((nom) => /^dev-[0-9a-f]{12}\.sqlite$/.test(nom))
      .map((nom) => resolve(dossier, nom))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  } catch {
    // Dossier absent ou illisible : on retombe sur la création ci-dessous, et
    // c'est le mkdir/l'écriture qui produira l'erreur parlante.
  }

  if (existants.length > 1) {
    // Deux bases dans le même dossier : on prend la plus récente, mais on le
    // DIT. Sinon l'utilisateur travaille sur l'une en croyant lire l'autre.
    console.warn(
      `\n> Plusieurs bases de développement dans ${dossier} :\n` +
        existants.map((c) => `    ${c}`).join("\n") +
        `\n  La plus récente est utilisée. Supprimez les autres pour lever le doute.\n`,
    );
  }
  if (existants.length > 0) return { chemin: existants[0], nouveau: false };

  return {
    chemin: resolve(dossier, `dev-${randomBytes(6).toString("hex")}.sqlite`),
    nouveau: true,
  };
}

// Uniquement pertinent en SQLite : les deux autres pilotes n'ont pas de fichier.
let base = null;
// Vrai quand la base vit dans le dossier que NOUS gérons et protégeons.
let dossierGere = false;

if (estSqlite && process.env.DB_SQLITE_PATH) {
  // Chemin imposé par l'utilisateur : il reste prioritaire, mais nous n'y
  // posons aucune protection — ce n'est pas notre dossier, et écrire un
  // .htaccess chez quelqu'un d'autre serait une surprise. Le garde-fou
  // d'origine s'applique donc intégralement : refus pur et simple.
  base = resolve(process.env.DB_SQLITE_PATH);
  if (souRacineWeb(base)) {
    console.error(
      `\nDB_SQLITE_PATH pointe sur « ${base} », sous une racine web.\n` +
        `Ce fichier serait téléchargeable par HTTP : comptes, commandes,\n` +
        `empreintes de mots de passe.\n\n` +
        `Deux issues :\n` +
        `  · choisir un emplacement hors racine web, par exemple\n` +
        `      set DB_SQLITE_PATH=C:\\katech-data\\dev.sqlite && bun run dev\n` +
        `  · ou ne PAS définir DB_SQLITE_PATH : la base ira dans\n` +
        `      ${dossierDonnees()}\n` +
        `    que ce script protège lui-même (.htaccess + nom non devinable).\n\n` +
        `Rien n'a été démarré.\n`,
    );
    process.exit(1);
  }
} else if (estSqlite) {
  const dossier = dossierDonnees();

  // Les protections AVANT la base : on ne crée pas un fichier sensible dans un
  // dossier dont on n'a pas encore vérifié qu'on peut le fermer.
  const protection = poserProtections(dossier);
  const exposeParHttp = souRacineWeb(dossier);

  if (!protection.ok) {
    // Sous racine web, une protection absente est une fuite : on refuse. Le
    // client a demandé le dossier ICI, pas au prix d'une base téléchargeable.
    if (exposeParHttp) {
      console.error(
        `\nImpossible de protéger ${dossier} :\n  ${protection.raison}\n\n` +
          `Ce dossier est sous une racine web : sans .htaccess, la base serait\n` +
          `téléchargeable par HTTP. Rien n'a été démarré.\n\n` +
          `  · rendez le dossier inscriptible, ou\n` +
          `  · placez la base ailleurs :\n` +
          `      set DB_SQLITE_PATH=C:\\katech-data\\dev.sqlite && bun run dev\n`,
      );
      process.exit(1);
    }
    // Dossier impossible à créer : la suite ne peut pas fonctionner (aucune
    // base ne naîtra là), autant s'arrêter ici avec la vraie cause plutôt que
    // de laisser une trace d'exception ENOTDIR quinze lignes plus loin.
    if (protection.dossierAbsent) {
      console.error(
        `\nImpossible de créer le dossier de données ${dossier} :\n  ${protection.raison}\n\n` +
          `Un fichier porte peut-être déjà ce nom. Rien n'a été démarré.\n`,
      );
      process.exit(1);
    }
    // Hors racine web, l'absence de .htaccess ne fuit rien aujourd'hui — mais
    // elle fuirait le jour où le dépôt est déplacé sous htdocs. On le dit fort
    // plutôt que de le taire.
    console.warn(
      `\n> ATTENTION : protections non posées dans ${dossier}\n` +
        `    ${protection.raison}\n` +
        `  Sans risque tant que le projet reste hors racine web. Le jour où il\n` +
        `  est déplacé sous htdocs/www/public_html, la base devient publique.\n`,
    );
  }

  const fichier = fichierBase(dossier);
  base = fichier.chemin;

  if (exposeParHttp && protection.ok) {
    // Emplacement voulu par le client, protégé — mais l'honnêteté impose de
    // dire ce que la protection ne couvre pas.
    console.warn(
      `\n> Le projet est sous une racine web : ${dossier}\n` +
        `  est accessible par HTTP. Protections posées :\n` +
        `    · .htaccess (refus total) — Apache et LiteSpeed UNIQUEMENT,\n` +
        `      nginx ignore les .htaccess et ne serait pas protégé par lui ;\n` +
        `    · index.html (pas de listage du dossier) ;\n` +
        `    · nom de base non devinable, qui lui vaut sur tout serveur.\n` +
        `  Pour une sécurité qui ne dépend d'aucune de ces trois : sortez la\n` +
        `  base de la racine web avec DB_SQLITE_PATH.\n`,
    );
  }

  // Une base héritée d'un ancien emplacement ne « disparaît » pas en silence :
  // on ne la déplace pas d'autorité (copier des données sans le dire est pire),
  // mais on refuse de laisser croire qu'elle n'a jamais existé.
  if (fichier.nouveau) {
    const anciennes = anciensEmplacements();
    if (anciennes.length > 0) {
      console.warn(
        `\n> Une base de développement existe à l'ANCIEN emplacement :\n` +
          anciennes.map((c) => `    ${c}`).join("\n") +
          `\n\n  Le dossier de données a déménagé dans le projet : ${dossier}\n` +
          `  Une base NEUVE et vide va être créée là-bas. L'ancienne n'est ni\n` +
          `  déplacée ni supprimée — vos données sont intactes.\n\n` +
          `  Pour les récupérer, au choix :\n` +
          `    · copier l'ancien fichier vers ${base}\n` +
          `    · ou continuer à l'utiliser :\n` +
          `        DB_SQLITE_PATH="${anciennes[0]}" bun run dev\n`,
      );
    }
  }

  dossierGere = true;
}

/**
 * Réglages de connexion propres aux pilotes serveur.
 *
 * Le port par défaut suit le PILOTE, jamais une valeur unique : un 3306
 * conservé en PostgreSQL produit un « connexion refusée » dont rien, dans le
 * message, ne dit que le port est en cause.
 */
const connexionServeur = estSqlite
  ? {}
  : {
      DB_HOST: process.env.DB_HOST ?? "127.0.0.1",
      DB_PORT: process.env.DB_PORT ?? (pilote === "pgsql" ? "5432" : "3306"),
      DB_NAME: process.env.DB_NAME ?? "katech",
      DB_USER: process.env.DB_USER ?? "katech",
      DB_PASSWORD: process.env.DB_PASSWORD ?? "",
      // Vide = défaut de libpq (« prefer »), ce qui convient à un PostgreSQL
      // local. Un service hébergé exige DB_SSLMODE=require.
      ...(pilote === "pgsql" && process.env.DB_SSLMODE
        ? { DB_SSLMODE: process.env.DB_SSLMODE }
        : {}),
    };

const env = {
  ...process.env,
  DB_DRIVER: pilote,
  ...(estSqlite ? { DB_SQLITE_PATH: base } : connexionServeur),
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
  // Le serveur intégré de PHP ne sert QU'UNE requête à la fois par défaut.
  // Deux conséquences fâcheuses : la navigation se fige dès qu'une page
  // déclenche plusieurs appels, et surtout la concurrence devient intestable en
  // local — six commandes simultanées sur le dernier article passeraient en
  // file indienne et donneraient un résultat parfait qui ne prouverait rien.
  // Voir api/tools/preuve-concurrence.php, qui signale ce profil.
  PHP_CLI_SERVER_WORKERS: process.env.PHP_CLI_SERVER_WORKERS ?? "8",
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

if (estSqlite) {
  mkdirSync(dirname(base), { recursive: true });
}

/**
 * La base est-elle déjà installée ?
 *
 * En SQLite, la question se réduit à « le fichier existe-t-il ». Pas en MySQL
 * ni en PostgreSQL : la base existe forcément (on ne la crée pas), la vraie
 * question est « contient-elle le schéma ». On la pose à PHP, qui sait déjà se
 * connecter — dupliquer ici la lecture de api/.env et la construction du DSN
 * ferait diverger deux configurations pour la même connexion.
 *
 * La sonde est en LECTURE SEULE (AGENTS.md §6) : un simple COUNT sur `users`.
 * Aucun dialecte n'est nécessaire, et la table est présente sur toute
 * installation valide.
 *
 * @returns {"installee"|"vide"|"injoignable"}
 */
function etatBase() {
  if (estSqlite) {
    return existsSync(base) ? "installee" : "vide";
  }

  const code = [
    "require 'api/src/bootstrap.php';",
    "try { KaTech\\Db::instance()->pdo(); }",
    "catch (Throwable $e) { fwrite(STDERR, $e->getMessage()); exit(2); }",
    "try { KaTech\\Db::instance()->valeur('SELECT COUNT(*) FROM users'); echo 'installee'; }",
    "catch (Throwable $e) { echo 'vide'; }",
  ].join(" ");

  const sonde = spawnSync(PHP, ["-r", code], { cwd: racine, env, encoding: "utf8" });
  if (sonde.status === 2) {
    console.error(
      `\nLa base ${pilote} est injoignable.\n\n` +
        `  hôte  : ${env.DB_HOST}:${env.DB_PORT}\n` +
        `  base  : ${env.DB_NAME}\n` +
        `  user  : ${env.DB_USER}\n\n` +
        `${(sonde.stderr ?? "").trim()}\n\n` +
        `Rien n'a été démarré : un serveur qui répond 500 à chaque requête\n` +
        `est plus difficile à diagnostiquer qu'un refus de démarrer.\n`,
    );
    process.exit(1);
  }

  return (sonde.stdout ?? "").trim() === "installee" ? "installee" : "vide";
}

// L'installation ne s'exécute qu'une fois : `install.php` pose un témoin dans
// `api/` et refuse de recommencer, ce qui protège une base de production.
//
// Mais ce témoin est lié au DÉPÔT, pas à la base. En développement, on change
// de base sans y penser (fichier supprimé, chemin différent, essai d'un autre
// pilote) : le témoin devient alors orphelin et bloque une installation
// pourtant légitime. C'est le cas le PLUS fréquent dès qu'on essaie les trois
// pilotes tour à tour depuis le même dépôt. On le retire dans ce seul cas —
// base vide, témoin présent — et on le dit.
const emplacementBase = estSqlite ? base : `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

if (etatBase() === "vide") {
  const temoin = resolve(racine, "api", "installed.lock");
  if (existsSync(temoin)) {
    console.log(
      `\n> Témoin d'installation orphelin (la base ${emplacementBase} est vide) — retiré.`,
    );
    rmSync(temoin);
  }
  console.log(`\n> Première exécution — installation du schéma dans : ${emplacementBase}`);
  if (php(["api/install.php"]).status !== 0) {
    console.error("\nL'installation a échoué. Rien n'a été démarré.\n");
    process.exit(1);
  }
  console.log("\n> Import des données du frontend (catalogue, blog, contenu)");
  php(["api/tools/importer-donnees-front.php"]);
}

// Le chemin affiché est le chemin réel : le nom du fichier étant tiré au sort,
// c'est la seule façon pour l'utilisateur de savoir quoi sauvegarder ou copier.
console.log(
  `\n  API KA Tech — http://127.0.0.1:${port}\n` +
    `  pilote : ${env.DB_DRIVER}\n` +
    `  base   : ${emplacementBase}\n` +
    (dossierGere ? `  garde  : .htaccess + index.html + nom non devinable\n` : "") +
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
