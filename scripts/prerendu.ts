/**
 * Prérendu au build — les robots voient enfin le contenu.
 *
 * =====================================================================
 * LE DÉFAUT MESURÉ
 * =====================================================================
 * `dist/index.html` contient 0 caractère de texte une fois le JavaScript
 * retiré : le corps du document est `<div id="root"></div>`. Le sitemap est
 * pourtant juste (27 URL, dont 12 fiches produit et 5 articles) — il envoie
 * donc des robots vers des pages vides. Pour une boutique, ce n'est pas une
 * question de style : c'est du chiffre d'affaires non indexé.
 *
 * =====================================================================
 * LA CONTRAINTE, ET CE QU'ELLE INTERDIT
 * =====================================================================
 * L'hébergeur cible est un mutualisé PHP (voir docs/DEPLOIEMENT.md). Pas de
 * SSR, pas de runtime Node en production. Le prérendu doit donc se faire AU
 * BUILD et ne produire que des fichiers statiques.
 *
 * Méthode : après `vite build`, on sert `dist/` (et l'API si elle répond) sur
 * un serveur local éphémère, on fait visiter chaque URL du sitemap par
 * Chromium, on attend le rendu, et on écrit le HTML obtenu dans
 * `dist/<route>/index.html`.
 *
 * =====================================================================
 * TROIS POINTS DÉLICATS, ET LEUR TRAITEMENT
 * =====================================================================
 *
 * 1. LA BALISE <base> — c'est ici que tout se joue.
 *
 *    `vite.config.ts` construit en base relative (`base: "./"`), et
 *    `public/index.php` insère une balise `<base>` calculée à l'exécution,
 *    ce qui rend le dossier de build renommable et déplaçable. Une page
 *    prérendue, elle, est servie par Apache SANS passer par PHP : personne
 *    n'insère la balise, et `./assets/index-XXXX.js` se résoudrait contre
 *    l'URL du document (`/product/rog-strix-g16/…`) — 404 garantie.
 *
 *    On insère donc la balise NOUS-MÊMES, à l'écriture du fichier, avec une
 *    valeur RELATIVE déduite de la profondeur de la route : `./` pour
 *    `/about`, `../` pour `/product/rog-strix-g16`. Relative, elle reste
 *    juste quel que soit le dossier de dépôt : le dossier demeure
 *    renommable et déplaçable, exactement comme avant.
 *
 *    Cette valeur suppose une SEULE forme d'URL, celle du sitemap : sans
 *    barre finale. `public/.htaccess` la garantit par une règle explicite
 *    (§1, « Pages prérendues ») au lieu de s'en remettre à `DirectorySlash`,
 *    que `src/main.tsx` a déjà de bonnes raisons de ne pas croire.
 *
 *    À vérifier : `deduireCheminBase()` (src/api/config.ts) lit
 *    `HTMLBaseElement.href`, donc l'URL DÉJÀ RÉSOLUE — `../` y devient
 *    `https://hôte/` ou `https://hôte/boutique/`. Le routeur et l'adresse de
 *    l'API restent donc justes, sans rien modifier dans `src/`.
 *
 * 2. LE SORT DU HTML PRÉRENDU AU CHARGEMENT.
 *
 *    `src/main.tsx` monte l'application avec `createRoot()`, pas
 *    `hydrateRoot()`. React REMPLACE donc le contenu prérendu par son propre
 *    rendu au lieu de l'hydrater. C'est un choix assumé, et pas seulement
 *    parce que `src/` est hors du périmètre de ce chantier : une vraie
 *    hydratation exigerait que le premier rendu client soit identique au
 *    HTML gelé, alors que la langue (i18n FR/EN/AR), le thème, le panier et
 *    la session vivent dans `localStorage`. Le moindre écart produirait des
 *    erreurs d'hydratation en console — précisément ce qu'on ne veut pas.
 *
 *    Conséquence à connaître : le prérendu est un INSTANTANÉ pour les
 *    robots et pour le premier coup d'œil du visiteur. L'application reste
 *    ce qu'elle était, avec son rendu client habituel.
 *
 * 3. LE REPLI GÉNÉRIQUE, ET POURQUOI IL N'ÉCRIT RIEN.
 *
 *    Une page ne devient un fichier que si elle passe un contrôle de
 *    qualité (assez de texte, aucune erreur de page, pas de titre d'échec du
 *    type « Produit introuvable »). Sans ce garde-fou, une API absente au
 *    build ferait geler des pages d'erreur DANS LE LIVRABLE, et Google les
 *    indexerait — bien pire que pas de prérendu du tout.
 *
 *    Une page recalée n'est simplement pas écrite : l'URL retombe sur le
 *    repli SPA de `public/.htaccess`, donc sur `index.php` et la page
 *    générique d'avant ce chantier. La dégradation est visible dans la
 *    sortie du build (récapitulatif chiffré + avertissements nommés), jamais
 *    silencieuse, et elle ne fait PAS échouer le build (AGENTS.md §6,
 *    « Dégradation gracieuse »). `--strict` inverse cette dernière règle
 *    pour un usage en intégration continue.
 *
 * =====================================================================
 * USAGE
 * =====================================================================
 *   bun run build                  # prérendu inclus (étape `postbuild`)
 *   bunx tsx scripts/prerendu.ts   # sur un dist/ déjà construit
 *
 *   PRERENDU=0                     désactive l'étape (build nu)
 *   PRERENDU_API_URL=http://127.0.0.1:8160   API à mandater pour /api
 *   SITE_URL=https://www.katech.dz           domaine des URL canoniques
 *   PRERENDU_MIN_CARACTERES=400    seuil du contrôle de qualité
 *   PRERENDU_ROUTES=/,/product/x   restreint aux routes listées (diagnostic)
 *   PRERENDU_PARALLELE=4           pages rendues en parallèle (1 = séquentiel)
 *   PRERENDU_LANGUE=fr-FR          langue du navigateur, donc du HTML gelé
 *   --strict                       code de sortie 1 si une page est recalée
 *   --mesurer                      ne rien écrire : mesurer et comparer
 *
 * Le script n'a besoin NI de réseau NI de l'API pour réussir sur les pages
 * statiques : toute requête sortante est neutralisée (polices Google
 * comprises), ce qui rend le prérendu reproductible hors ligne.
 *
 * =====================================================================
 * COÛT ET REPRODUCTIBILITÉ — MESURÉ
 * =====================================================================
 * Sur les 27 URL du sitemap : `bun run build` passe de 6,5 s à 17,6 s
 * (29,5 s en séquentiel avant la parallélisation à 4). C'est le prix d'un
 * Chromium par page ; `PRERENDU=0` le rend nul quand on n'en veut pas.
 *
 * En `VITE_API_MODE=http` — le mode d'un vrai déploiement — deux builds
 * consécutifs produisent les 27 pages OCTET POUR OCTET identiques. En mode
 * `mock`, les 5 articles de blog diffèrent d'un build à l'autre : le jeu de
 * démonstration de `src/lib/admin-store.tsx` datant ses articles par rapport
 * à `Date.now()`, leur `datePublished` bouge de quelques secondes. C'est une
 * propriété des données de démonstration, pas du prérendu.
 *
 * Pour vérifier le résultat dans un navigateur sans Apache :
 * `scripts/servir-dist.php` rejoue les règles de `public/.htaccess`.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { argv, env, exit, stdout } from "node:process";

import { chromium, type Browser, type ConsoleMessage, type Page } from "playwright";

// =====================================================================
// 1. Configuration
// =====================================================================

const RACINE = resolve(env.PRERENDU_DIST ?? "dist");
const SITE_URL = (env.SITE_URL || "https://katech.dz").replace(/\/+$/, "");
const API_URL = (env.PRERENDU_API_URL ?? "").replace(/\/+$/, "");
const MIN_CARACTERES = Number(env.PRERENDU_MIN_CARACTERES ?? 400);
const LANGUE = env.PRERENDU_LANGUE ?? "fr-FR";
const PARALLELE = Math.max(1, Number(env.PRERENDU_PARALLELE ?? 4));
const DELAI_MS = Number(env.PRERENDU_TIMEOUT_MS ?? 20000);
const STRICT = argv.includes("--strict");
const MESURER = argv.includes("--mesurer");

/** Marqueur écrit dans chaque page produite — sert au diagnostic et aux preuves. */
const MARQUEUR = "prerendu-katech";

/**
 * Titres et textes qui signent un rendu RATÉ. Une page qui en contient ne
 * doit pas être gelée dans le livrable : c'est le symptôme d'une donnée
 * absente (API muette au build), pas une page à indexer.
 */
const SIGNES_ECHEC = [
  /introuvable/i,
  /not\s*found/i,
  /page\s+404/i,
  /une\s+erreur\s+est\s+survenue/i,
  /something\s+went\s+wrong/i,
];

// =====================================================================
// 2. Routes — lues dans le sitemap, source de vérité unique
// =====================================================================

/**
 * Chemins à prérendre, extraits de `dist/sitemap.xml`.
 *
 * Lire le sitemap plutôt que de redéclarer une liste ici garantit qu'aucune
 * URL annoncée aux robots ne reste sans contenu, et que `SITE_URL` continue
 * de piloter l'ensemble : le sitemap reste l'unique endroit où les routes
 * publiques sont énumérées (`scripts/generate-sitemap.ts`).
 */
function lireRoutesDuSitemap(): string[] {
  const fichier = join(RACINE, "sitemap.xml");
  if (!existsSync(fichier)) {
    throw new Error(
      `${fichier} est absent : le prérendu ne saurait pas quelles URL visiter. ` +
        `L'étape « prebuild » (scripts/generate-sitemap.ts) a-t-elle tourné ?`,
    );
  }

  const xml = readFileSync(fichier, "utf8");
  const chemins = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => {
    // Le sitemap porte des URL absolues bâties sur SITE_URL. On n'en garde
    // que le chemin : le prérendu tourne sur un serveur local.
    try {
      return new URL(m[1]).pathname;
    } catch {
      return m[1].startsWith("/") ? m[1] : `/${m[1]}`;
    }
  });

  const uniques = [...new Set(chemins.map((c) => (c === "/" ? "/" : c.replace(/\/+$/, ""))))];

  const filtre = (env.PRERENDU_ROUTES ?? "").trim();
  if (filtre === "") return uniques;

  const demandees = new Set(filtre.split(",").map((c) => c.trim()));
  return uniques.filter((c) => demandees.has(c));
}

// =====================================================================
// 3. Le coquillage — index.html débarrassé de tout rendu antérieur
// =====================================================================

/**
 * `dist/index.html` sert deux rôles : document d'amorçage de la SPA, et page
 * prérendue de l'accueil. Le second écrase le premier — il faut donc pouvoir
 * retrouver le coquillage vide, sinon un second passage prérendrait
 * par-dessus son propre résultat et le fichier grossirait à chaque build.
 *
 * On vide `#root` : l'opération est idempotente et ne dépend d'aucune copie
 * de sauvegarde à maintenir dans `dist/`.
 */
function coquillage(html: string): string {
  return html
    .replace(/(<div id="root">)[\s\S]*?(<\/div>\s*<script)/, "$1$2")
    .replace(/\n?\s*<base [^>]*>/i, "")
    .replace(new RegExp(`\\s*<!--\\s*${MARQUEUR}[^>]*-->`, "g"), "");
}

// =====================================================================
// 4. Serveur local — imite public/.htaccess et public/index.php
// =====================================================================

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".mjs": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=UTF-8",
  ".txt": "text/plain; charset=UTF-8",
  ".woff2": "font/woff2",
};

/**
 * Sert `dist/` comme le fera Apache, à trois nuances près, toutes voulues :
 *
 *  - le document d'amorçage est TOUJOURS le coquillage vide, jamais une page
 *    déjà prérendue : le prérendu ne doit pas se nourrir de sa propre sortie ;
 *  - `<base href="/">` est inséré comme le fait `public/index.php`, pour que
 *    `deduireCheminBase()` trouve sa balise et n'écrive pas en console
 *    l'erreur qu'il réserve à un déploiement sans PHP ;
 *  - `/api` est mandaté vers l'API PHP si `PRERENDU_API_URL` est renseignée,
 *    et répond 503 sinon — jamais du HTML, qui ferait échouer le décodage
 *    JSON du client sur un message incompréhensible.
 */
function demarrerServeur(html: string): Promise<{ origine: string; fermer: () => Promise<void> }> {
  const document = html.replace(/<head(\s[^>]*)?>/i, '$&\n    <base href="/" />');

  const serveur = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chemin = decodeURIComponent((req.url ?? "/").split("?")[0]);

    if (chemin.startsWith("/api/") || chemin === "/api") {
      void mandater(chemin, req, res);
      return;
    }

    // Fichier réel : servi tel quel. `join` normalise, et on refuse toute
    // sortie de `dist/` (« ../ » dans l'URL).
    const cible = join(RACINE, chemin);
    if (cible.startsWith(RACINE) && existsSync(cible) && !cible.endsWith("/")) {
      try {
        const corps = readFileSync(cible);
        res.writeHead(200, {
          "Content-Type": TYPES[extname(cible).toLowerCase()] ?? "application/octet-stream",
        });
        res.end(corps);
        return;
      } catch {
        // Un dossier : on retombe sur le repli SPA ci-dessous.
      }
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
    res.end(document);
  });

  return new Promise((ok) => {
    serveur.listen(0, "127.0.0.1", () => {
      const adresse = serveur.address();
      const port = typeof adresse === "object" && adresse ? adresse.port : 0;
      ok({
        origine: `http://127.0.0.1:${port}`,
        fermer: () => new Promise<void>((fini) => serveur.close(() => fini())),
      });
    });
  });
}

/** Relaie une requête `/api/...` vers l'API PHP, ou répond 503 en JSON. */
async function mandater(chemin: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (API_URL === "") {
    res.writeHead(503, { "Content-Type": "application/json; charset=UTF-8" });
    res.end(
      JSON.stringify({
        error: {
          code: "api_absente_au_prerendu",
          message: "PRERENDU_API_URL n'est pas renseignée : aucune API à interroger au build.",
        },
      }),
    );
    return;
  }

  try {
    // `api/.htaccess` monte l'API sous /api ; le serveur de développement PHP
    // a pour racine le dossier api/ lui-même. On retire donc le préfixe,
    // exactement comme le proxy de vite.config.ts.
    const amont = `${API_URL}${chemin.replace(/^\/api/, "")}${(req.url ?? "").includes("?") ? `?${(req.url ?? "").split("?")[1]}` : ""}`;
    const reponse = await fetch(amont, { headers: { Accept: "application/json" } });
    const corps = Buffer.from(await reponse.arrayBuffer());
    res.writeHead(reponse.status, {
      "Content-Type": reponse.headers.get("content-type") ?? "application/json",
    });
    res.end(corps);
  } catch (cause) {
    res.writeHead(503, { "Content-Type": "application/json; charset=UTF-8" });
    res.end(
      JSON.stringify({
        error: {
          code: "api_injoignable",
          message: cause instanceof Error ? cause.message : "API injoignable",
        },
      }),
    );
  }
}

// =====================================================================
// 5. Mise en forme du HTML capturé
// =====================================================================

/**
 * Clé d'unicité d'une balise de `<head>` : deux balises de même clé décrivent
 * la même chose et ne doivent pas coexister dans le document livré.
 */
function cleDeBalise(balise: string): string | null {
  if (/^<title[\s>]/i.test(balise)) return "title";

  const nom = /\bname="([^"]+)"/i.exec(balise)?.[1];
  const propriete = /\bproperty="([^"]+)"/i.exec(balise)?.[1];
  const relation = /\brel="([^"]+)"/i.exec(balise)?.[1];

  if (/^<meta[\s>]/i.test(balise)) {
    if (nom !== undefined) return `meta:name:${nom.toLowerCase()}`;
    if (propriete !== undefined) return `meta:property:${propriete.toLowerCase()}`;
    return null;
  }
  if (/^<link[\s>]/i.test(balise) && relation?.toLowerCase() === "canonical")
    return "link:canonical";

  return null;
}

/**
 * Retire du `<head>` les balises STATIQUES d'index.html qu'une balise de
 * `react-helmet-async` vient contredire.
 *
 * `Helmet` n'enlève pas ce qu'il ne possède pas : il AJOUTE ses balises à
 * côté. Le document capturé portait donc deux `<title>` — celui de la fiche
 * produit et celui, générique, d'index.html — plus deux `description`, deux
 * `og:title`, deux `og:url`. Tant que React tourne, le navigateur retient la
 * première ; gelé dans un fichier, ce doublon devient une invitation à ce que
 * Google retienne la mauvaise.
 *
 * On identifie les balises à retirer par comparaison EXACTE avec le
 * coquillage : seules celles qui viennent d'index.html sont candidates, et
 * seulement si une autre balise de même clé existe. Les balises présentes
 * uniquement dans index.html (og:image, og:locale, twitter:*) sont conservées
 * telles quelles — elles ne sont contredites par personne.
 */
function dedupliquerTetes(html: string, coquille: string): string {
  const tete = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  if (tete === null) return html;

  // Comparaison sur une forme NORMALISÉE. index.html écrit ses balises longues
  // sur plusieurs lignes (`<meta\n  name="description"\n  content="…" />`) là
  // où le navigateur les resérialise sur une seule, avec `>` au lieu de ` />`.
  // Sans cette normalisation, la description générique survivait au
  // dédoublonnage — deux `name="description"` dans le fichier livré.
  const normaliser = (balise: string): string =>
    balise
      .replace(/\s+/g, " ")
      .replace(/\s*\/?>$/, ">")
      .trim();

  const balisesDuCoquillage = new Set(
    [...coquille.matchAll(/<title[^>]*>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>/gi)].map((m) =>
      normaliser(m[0]),
    ),
  );

  const balises = [...tete[1].matchAll(/<title[^>]*>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>/gi)];
  const comptes = new Map<string, number>();
  for (const m of balises) {
    const cle = cleDeBalise(m[0]);
    if (cle !== null) comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
  }

  let corrigee = tete[1];
  for (const m of balises) {
    const cle = cleDeBalise(m[0]);
    if (cle === null || (comptes.get(cle) ?? 0) < 2) continue;
    if (!balisesDuCoquillage.has(normaliser(m[0]))) continue;

    corrigee = corrigee.replace(m[0], "");
    comptes.set(cle, (comptes.get(cle) ?? 0) - 1);
  }

  return html.replace(tete[1], corrigee);
}

/** Nombre de « ../ » pour remonter de la route jusqu'à la racine de l'application. */
function baseRelative(route: string): string {
  const segments = route.split("/").filter(Boolean);
  return segments.length <= 1 ? "./" : "../".repeat(segments.length - 1);
}

/** Fichier de destination : `dist/index.html` pour `/`, `dist/<route>/index.html` sinon. */
function destination(route: string): string {
  return route === "/"
    ? join(RACINE, "index.html")
    : join(RACINE, ...route.split("/").filter(Boolean), "index.html");
}

/**
 * Rend le HTML capturé indépendant du serveur de prérendu ET du dossier de
 * dépôt. L'ordre des quatre retouches est porteur de la correction.
 *
 *  1. LES SEULES URL QUI ONT LE DROIT D'ÊTRE ABSOLUES le deviennent, avec
 *     `SITE_URL` : la canonique, `og:url`/`og:image`, `twitter:*` et le bloc
 *     JSON-LD. Les pages calculent leur canonique avec
 *     `window.location.origin` (src/pages/Product.tsx) : sans cette étape,
 *     `dist/` annoncerait `http://127.0.0.1:41337/product/x` à Google.
 *     `SITE_URL` pilote déjà le sitemap — les deux restent donc cohérents.
 *
 *  2. TOUTES LES AUTRES URL portant l'origine locale deviennent RELATIVES.
 *
 *     C'est le correctif d'un défaut qu'aucun check n'aurait vu, et que seul
 *     le parcours navigateur (`bun run parcours`) a levé : la première
 *     version remplaçait l'origine locale par `SITE_URL` PARTOUT. Or Vite
 *     insère à l'exécution des `<link rel="modulepreload">` dont l'URL est
 *     déjà résolue en absolu. Le fichier livré réclamait donc
 *     `https://katech.dz/assets/products-XXXX.js` — bloqué par CORS depuis
 *     tout autre domaine, et par la CSP `script-src 'self'` de
 *     `public/.htaccess`. Build vert, `tsc` vert, `lint` vert, site cassé.
 *
 *  3. la balise `<base>` du serveur local est retirée, remplacée par la
 *     valeur relative correspondant à la profondeur de la route.
 *
 *  4. les liens internes absolus (`href="/product/x"`, produits par React
 *     Router) deviennent relatifs à cette base : un robot qui les suit reste
 *     dans le dossier de dépôt, même en sous-dossier.
 *
 * Ce qui n'est PAS touché : les URL de repli `https://katech.dz` d'index.html
 * quand `SITE_URL` n'est pas renseignée. `public/index.php` les réécrit à
 * l'exécution avec l'origine réelle ; les figer ici supprimerait cette
 * portabilité (voir public/index.php, « BALISES OG ET JSON-LD »).
 */
function mettreEnForme(
  html: string,
  route: string,
  origineLocale: string,
  coquille: string,
): string {
  let sortie = dedupliquerTetes(html, coquille);

  // 1. Les URL qui DOIVENT être absolues : canonique, partage social, JSON-LD.
  sortie = sortie.replace(
    /<link\b[^>]*\brel="canonical"[^>]*>|<meta\b[^>]*\b(?:property|name)="(?:og:[a-z:]+|twitter:[a-z:]+)"[^>]*>/gi,
    (balise) => balise.split(origineLocale).join(SITE_URL),
  );
  sortie = sortie.replace(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
    (bloc) => bloc.split(origineLocale).join(SITE_URL),
  );

  // 2. Tout le reste : relatif. Une URL relative sans barre initiale se
  //    résout contre la balise <base> posée à l'étape 3, donc contre la
  //    racine de l'application, où qu'elle soit déposée.
  sortie = sortie.split(`${origineLocale}/`).join("");
  sortie = sortie.split(origineLocale).join(SITE_URL);

  // 3. Base relative à la profondeur de la route
  const base = baseRelative(route);
  sortie = sortie.replace(/\n?\s*<base [^>]*>/i, "");
  if (route !== "/") {
    sortie = sortie.replace(
      /<head(\s[^>]*)?>/i,
      `$&\n    <base href="${base}" />\n    <!-- ${MARQUEUR} ${route} -->`,
    );
  } else {
    // À la racine, `public/index.php` pose la balise lui-même et les URL
    // relatives d'index.html sont déjà justes : on n'ajoute que le marqueur.
    sortie = sortie.replace(/<head(\s[^>]*)?>/i, `$&\n    <!-- ${MARQUEUR} ${route} -->`);
  }

  // 4. Liens internes absolus → relatifs à la base
  sortie = sortie.replace(/href="\/([^"/][^"]*)?"/g, (_t, reste: string | undefined) =>
    reste === undefined ? `href="${base}"` : `href="${base}${reste}"`,
  );

  return sortie;
}

/**
 * Garde-fou : refuse d'écrire un fichier qui trahirait la machine de build ou
 * réclamerait ses scripts sur un autre domaine.
 *
 * Ces deux défauts sont exactement ceux rencontrés en écrivant ce script. Ils
 * passent le lint, le typage et le build, et ne se voient que dans un
 * navigateur — donc trop tard. Une assertion vaut mieux qu'un souvenir.
 */
function verifierSortie(html: string, origineLocale: string): string | null {
  if (html.includes(origineLocale) || /127\.0\.0\.1:\d+|localhost:\d+/.test(html)) {
    return "l'adresse du serveur de prérendu subsiste dans le HTML produit";
  }
  // Ancré sur l'ATTRIBUT, et non sur la simple présence de la chaîne : le bloc
  // JSON-LD, lui, DOIT porter une URL d'image absolue (« image »: « …/assets/
  // rog-strix-XXXX.webp »), c'est la donnée structurée que Google attend.
  // Ce qui est interdit, c'est de CHARGER une ressource depuis un autre
  // domaine — script, feuille de style, préchargement.
  if (
    new RegExp(`(?:src|href)="${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/assets/`).test(
      html,
    )
  ) {
    return `des ressources sont chargées en absolu depuis ${SITE_URL}/assets/ (CORS et CSP script-src 'self' les refuseront)`;
  }

  return null;
}

// =====================================================================
// 6. Mesure — le chiffre que ce chantier doit déplacer
// =====================================================================

/**
 * Nombre de caractères de texte visibles dans le HTML, JavaScript retiré.
 *
 * C'est la mesure du défaut initial (0 caractère) et donc celle du résultat.
 * Volontairement calculée sur le FICHIER, sans navigateur : c'est ce que voit
 * un robot qui n'exécute pas de script.
 */
export function texteSansJs(html: string): string {
  const corps = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? "";
  return corps
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z#0-9]+;/gi, "x")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================================
// 7. Prérendu d'une route
// =====================================================================

type Resultat = {
  route: string;
  caracteres: number;
  ecrit: boolean;
  raison?: string;
  erreurs: string[];
};

/**
 * Attend que le rendu se STABILISE, et non qu'un seuil soit franchi.
 *
 * Première version de ce script : « attendre que #root dépasse N caractères ».
 * Elle gelait l'en-tête et le pied de page SANS le contenu de la route, et le
 * résultat était le même chiffre — 872 caractères — sur 25 des 27 pages, avec
 * deux exceptions au hasard selon la charge de la machine. La cause : les
 * pages sont en `React.lazy` derrière un `<Suspense>` (src/App.tsx), donc le
 * chrome du site franchit le seuil AVANT que le module de la route n'arrive.
 *
 * Un seuil ne peut pas distinguer « rendu partiel » de « page courte ». La
 * stabilité, si : on relève la longueur du texte jusqu'à ce que trois relevés
 * consécutifs soient identiques. Le squelette de chargement disparaît, le
 * contenu s'installe, la mesure se fige — et le tout sans délai fixe, qui
 * coûterait 27 fois son propre pari.
 */
async function attendreRenduStable(page: Page): Promise<void> {
  const PAS_MS = 150;
  const RELEVES_IDENTIQUES = 3;
  const limite = Date.now() + DELAI_MS;

  let precedent = -1;
  let stables = 0;

  while (Date.now() < limite) {
    const longueur = await page
      .evaluate(() => document.getElementById("root")?.innerText.trim().length ?? 0)
      .catch(() => 0);

    stables = longueur === precedent && longueur > 0 ? stables + 1 : 0;
    precedent = longueur;

    if (stables >= RELEVES_IDENTIQUES) break;
    await page.waitForTimeout(PAS_MS);
  }

  // Court répit pour les effets qui suivent la peinture : `Helmet` écrit le
  // <title> et les métas dans un effet, donc après le texte qu'on vient de
  // voir se stabiliser.
  await page.waitForTimeout(150);
}

async function prerendre(
  navigateur: Browser,
  route: string,
  origine: string,
  coquille: string,
  titreGenerique: string,
): Promise<Resultat> {
  // Un contexte NEUF par route : le panier, la langue, le thème et la session
  // vivent dans localStorage. Réutiliser le contexte gèlerait dans chaque page
  // l'état laissé par la précédente (un badge « 1 article » sur tout le site).
  //
  // LOCALE IMPOSÉE. `readInitialLang()` (src/lib/i18n.tsx) lit
  // `navigator.language` quand rien n'est persisté. Chromium annonce `en-US`
  // par défaut : sans cette ligne, le prérendu gelait des pages EN sous un
  // `<html lang="fr">` — mesuré sur /blog/livraison-58-wilayas, dont le titre
  // sortait en anglais. La langue par défaut du site est le français
  // (index.html, `lang="fr"`), c'est donc celle qui doit être indexée.
  const contexte = await navigateur.newContext({
    javaScriptEnabled: true,
    locale: LANGUE,
    extraHTTPHeaders: { "Accept-Language": `${LANGUE},${LANGUE.slice(0, 2)};q=0.9` },
  });
  const page = await contexte.newPage();
  const erreurs: string[] = [];

  page.on("pageerror", (e) => erreurs.push(`pageerror: ${e.message}`));
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") erreurs.push(`console: ${m.text()}`);
  });

  // Aucune requête sortante : le prérendu doit être reproductible hors ligne.
  // Les polices Google ne changent pas un caractère du texte rendu.
  //
  // On répond 200 vide au lieu d'ABORT : un `abort()` fait écrire au
  // navigateur « Failed to load resource » en console, et ce bruit noierait
  // les VRAIES erreurs que ce script est censé rapporter (une page par ligne,
  // 27 fois — c'est ainsi qu'on cesse de lire les avertissements).
  await page.route("**/*", (voie) => {
    const url = voie.request().url();
    if (url.startsWith(origine) || url.startsWith("data:") || url.startsWith("blob:")) {
      void voie.continue();
      return;
    }
    void voie.fulfill({ status: 200, contentType: "text/css", body: "" });
  });

  try {
    await page.goto(`${origine}${route}`, { waitUntil: "domcontentloaded", timeout: DELAI_MS });
    await attendreRenduStable(page);

    const html = await page.content();
    const enForme = mettreEnForme(html, route, origine, coquille);
    const texte = texteSansJs(enForme);
    const titre = await page.title();

    // ---- Contrôle de qualité -------------------------------------------
    // Trois refus, chacun payé par un essai raté de ce script :
    //
    //  a) trop peu de texte — le rendu n'a pas eu lieu ;
    //  b) TITRE ENCORE GÉNÉRIQUE — le chrome du site (en-tête + pied) est
    //     rendu mais pas la route : c'est exactement ce que produisait la
    //     première version, 872 caractères de menu et de pied de page sur 25
    //     pages sur 27. Toute page routée pose son propre titre (`Helmet` ou
    //     `document.title`), l'accueil excepté : il garde celui d'index.html ;
    //  c) titre ou texte d'échec (« Produit introuvable ») — la donnée
    //     manquait au build. Geler ça, c'est demander à Google d'indexer une
    //     erreur.
    const signe = SIGNES_ECHEC.find((r) => r.test(titre) || r.test(texte.slice(0, 400)));
    let raison: string | undefined;

    if (texte.length < MIN_CARACTERES) {
      raison = `${texte.length} caractère(s) rendus, seuil ${MIN_CARACTERES} — page laissée au repli SPA`;
    } else if (route !== "/" && titre.trim() === titreGenerique) {
      raison = `titre encore générique (« ${titre} ») — la route n'a pas fini de rendre`;
    } else if (signe) {
      raison = `page d'échec détectée (« ${titre} ») — donnée probablement absente au build`;
    } else if (erreurs.some((e) => e.startsWith("pageerror"))) {
      raison = `erreur JavaScript pendant le rendu : ${erreurs[0]}`;
    } else {
      const suspect = verifierSortie(enForme, origine);
      if (suspect !== null) raison = `garde-fou : ${suspect}`;
    }

    if (raison === undefined && !MESURER) {
      const fichier = destination(route);
      mkdirSync(join(fichier, ".."), { recursive: true });
      writeFileSync(fichier, enForme);
    }

    return {
      route,
      caracteres: texte.length,
      ecrit: raison === undefined && !MESURER,
      raison,
      erreurs,
    };
  } catch (cause) {
    return {
      route,
      caracteres: 0,
      ecrit: false,
      raison: cause instanceof Error ? cause.message : String(cause),
      erreurs,
    };
  } finally {
    await contexte.close();
  }
}

// =====================================================================
// 8. Enchaînement
// =====================================================================

async function principal(): Promise<void> {
  if (env.PRERENDU === "0") {
    stdout.write("[prerendu] PRERENDU=0 — étape désactivée, dist/ reste un build nu.\n");
    return;
  }

  const amorce = join(RACINE, "index.html");
  if (!existsSync(amorce)) {
    stdout.write(`[prerendu] ${amorce} est absent : rien à prérendre. Lancer « bun run build ».\n`);
    exit(STRICT ? 1 : 0);
  }

  const routes = lireRoutesDuSitemap();
  const html = coquillage(readFileSync(amorce, "utf8"));
  const texteAvant = texteSansJs(html).length;
  const titreGenerique = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();

  stdout.write(
    `[prerendu] ${routes.length} route(s) du sitemap — ` +
      `document d'amorçage : ${texteAvant} caractère(s) de texte sans JS.\n` +
      `[prerendu] API : ${API_URL === "" ? "aucune (PRERENDU_API_URL vide)" : API_URL} — ` +
      `canoniques sur ${SITE_URL}.\n`,
  );

  // Le cas le plus coûteux à diagnostiquer : un build `VITE_API_MODE=http`
  // sans API en face. Les pages statiques sortent, les fiches produit et les
  // articles non — et la seule trace, sans cet avertissement, serait 500
  // lignes de 503 en console. On le dit AVANT, en une phrase.
  if (env.VITE_API_MODE === "http" && API_URL === "") {
    stdout.write(
      "[prerendu] AVERTISSEMENT — build en VITE_API_MODE=http mais PRERENDU_API_URL est vide.\n" +
        "           Les pages qui dépendent de données (fiches produit, articles) ne pourront\n" +
        "           pas être prérendues et resteront servies par le repli SPA. Pour les obtenir :\n" +
        "           PRERENDU_API_URL=http://127.0.0.1:8160 VITE_API_MODE=http bun run build\n",
    );
  }

  const { origine, fermer } = await demarrerServeur(html);
  const navigateur = await chromium.launch();
  const resultats: Resultat[] = [];

  try {
    // Séquentiel, 27 pages coûtaient 29,5 s sur les 36,0 s du build. Chaque
    // route a son propre contexte de navigateur — elles sont indépendantes par
    // construction, donc parallélisables sans partage d'état. Le parallélisme
    // reste BORNÉ : au-delà, la machine se dispute le CPU et le rendu met plus
    // longtemps à se stabiliser, ce qui rapproche du seuil de détection d'un
    // rendu partiel. `PRERENDU_PARALLELE=1` revient au séquentiel.
    const file = [...routes];
    const parN: Resultat[][] = [];

    await Promise.all(
      Array.from({ length: Math.max(1, Math.min(PARALLELE, file.length)) }, async () => {
        const miens: Resultat[] = [];
        parN.push(miens);
        for (let route = file.shift(); route !== undefined; route = file.shift()) {
          miens.push(await prerendre(navigateur, route, origine, html, titreGenerique));
        }
      }),
    );

    // Réordonné comme le sitemap : une sortie dont l'ordre dépend de
    // l'ordonnancement du système ne se compare pas d'un build à l'autre.
    const parRoute = new Map(parN.flat().map((r) => [r.route, r]));
    for (const route of routes) {
      const r = parRoute.get(route);
      if (r === undefined) continue;
      resultats.push(r);
      stdout.write(
        `  ${r.ecrit ? "ecrit " : MESURER ? "mesure" : "REPLI "} ${route.padEnd(34)} ` +
          `${String(r.caracteres).padStart(6)} car.` +
          `${r.raison ? `  — ${r.raison}` : ""}\n`,
      );
    }
  } finally {
    await navigateur.close();
    await fermer();
  }

  // ---- Récapitulatif ---------------------------------------------------
  const ecrites = resultats.filter((r) => r.ecrit);
  const recalees = resultats.filter((r) => !r.ecrit && !MESURER);
  const median =
    ecrites.length === 0
      ? 0
      : Math.round(ecrites.reduce((s, r) => s + r.caracteres, 0) / ecrites.length);

  stdout.write(
    `[prerendu] ${ecrites.length}/${resultats.length} page(s) écrites, ` +
      `${median} caractère(s) de texte en moyenne (avant : ${texteAvant}).\n`,
  );

  if (recalees.length > 0) {
    // Une dégradation gracieuse silencieuse masque ses pannes (AGENTS.md §7).
    stdout.write(
      `[prerendu] ATTENTION — ${recalees.length} page(s) NON prérendues, laissées au repli SPA :\n`,
    );
    for (const r of recalees) stdout.write(`           ${r.route} : ${r.raison}\n`);
    stdout.write(
      "           Ces URL restent servies par index.php et fonctionnent normalement,\n" +
        "           mais les robots n'y verront aucun texte. Cause la plus fréquente :\n" +
        "           API absente au build — renseigner PRERENDU_API_URL.\n",
    );
  }

  // Regroupé, et non déroulé : une API absente produit le même message des
  // centaines de fois (mesuré : 522 lignes). Une liste de 522 lignes ne se lit
  // pas, donc ne se lit plus du tout — et c'est ainsi qu'un avertissement
  // devient invisible.
  const bruit = new Map<string, number>();
  for (const r of resultats) {
    for (const e of r.erreurs) bruit.set(e, (bruit.get(e) ?? 0) + 1);
  }
  if (bruit.size > 0) {
    const total = [...bruit.values()].reduce((s, n) => s + n, 0);
    stdout.write(
      `[prerendu] ${total} message(s) d'erreur en console pendant le rendu, ` +
        `${bruit.size} distinct(s) :\n`,
    );
    for (const [message, nombre] of [...bruit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      stdout.write(`           ×${String(nombre).padStart(3)} ${message.slice(0, 150)}\n`);
    }
  }

  if (STRICT && recalees.length > 0) exit(1);
}

principal().catch((cause) => {
  // Le prérendu est un ENRICHISSEMENT : son échec ne doit pas priver le
  // projet d'un `dist/` déployable. On le dit fort, et on sort en 0.
  stdout.write(
    `[prerendu] ÉCHEC de l'étape de prérendu : ${cause instanceof Error ? cause.message : String(cause)}\n` +
      "[prerendu] Le build reste valide : dist/ est déployable, sans prérendu.\n",
  );
  exit(STRICT ? 1 : 0);
});
