#!/usr/bin/env node
/**
 * Parcours automatisé de l'application dans un vrai navigateur.
 *
 *   bun run parcours          (l'API et le frontend doivent tourner)
 *
 * Ce que fait ce script et que rien d'autre ne fait : il ouvre les pages, clique,
 * remplit des formulaires, et surtout **écoute la console du navigateur**. Le
 * typage, le lint et le harnais de conformité ne voient pas un composant qui
 * plante au rendu, une image manquante, ou un appel réseau en échec.
 *
 * Toute erreur de console, toute requête en échec inattendu et tout écran vide
 * sont rapportés. Sortie 0 si le parcours est propre, 1 sinon.
 */

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.APP_URL ?? "http://127.0.0.1:8080";

// Le site est deployable dans un SOUS-DOSSIER (public_html/ma-boutique/). Les
// appels d'API doivent donc etre prefixes comme le fait l'application, sinon le
// parcours vise la racine du domaine et echoue pour une raison qui n'a rien a
// voir avec le produit. `APP_URL=http://hote/ma-boutique` suffit a le dire.
const PREFIXE = new URL(BASE).pathname.replace(/\/+$/, "");
const API = `${PREFIXE}/api/v1`;
// =====================================================================
// LE COMPTE DU PARCOURS NE DOIT JAMAIS ÊTRE UN COMPTE DU JEU DE DÉMONSTRATION
// =====================================================================
//
// Ce parcours a longtemps visité 36 écrans d'administration « au vert » alors
// que le back-office était inaccessible à toute installation neuve. Il
// s'authentifiait avec `admin@katech.dz`, adresse justement semée dans le
// magasin mock (`seedUsers()`). L'interface cherchait alors le rôle dans ce
// magasin local au lieu de la session : la correspondance réussissait **par
// homonymie**, sur une coïncidence d'adresse. Le commanditaire, lui, a installé
// sa boutique avec sa propre adresse et s'est retrouvé dehors.
//
// Un harnais qui valide une coïncidence est pire qu'un harnais absent : il
// donne confiance. Le compte par défaut est donc un compte que l'INSTALLATEUR
// crée en base et que le jeu de démonstration ne contient pas — et la garde
// ci-dessous rend le retour en arrière structurellement impossible.
const EMAIL = process.env.APP_EMAIL ?? "patron@boutique-test.dz";
const MOTDEPASSE = process.env.APP_PASSWORD ?? "Patron-2026!xY";

const V = "\x1b[32m",
  R = "\x1b[31m",
  J = "\x1b[33m",
  G = "\x1b[90m",
  F = "\x1b[0m";

const anomalies = [];
const etapes = [];
let pageCourante = "(démarrage)";

/** Erreurs réseau attendues : un 401 sur une route protégée sans session en est une. */
const ECHECS_ATTENDUS = [/\/auth\/login/];

/** Chemin d'un fichier du dépôt, depuis `scripts/`. */
const fichier = (relatif) => new URL(`../${relatif}`, import.meta.url);

/**
 * Adresses semées dans le magasin mock, LUES DANS LA SOURCE plutôt que
 * recopiées ici. Recopier une liste, c'est la laisser diverger : le jour où
 * quelqu'un ajoute un compte au jeu de démonstration, une copie figée
 * continuerait d'affirmer que tout va bien. La garde ci-dessous reste donc
 * exacte sans que personne ait à y penser.
 */
function emailsDuJeuDeDemonstration() {
  const source = readFileSync(fichier("src/lib/admin-store.tsx"), "utf8");
  const debut = source.indexOf("function seedUsers()");
  if (debut === -1) {
    throw new Error(
      "seedUsers() introuvable dans src/lib/admin-store.tsx : la garde anti-homonymie " +
        "ne peut plus lire le jeu de démonstration. Corrigez-la plutôt que de la retirer.",
    );
  }
  const bloc = source.slice(debut, source.indexOf("\n}\n", debut));
  return [...bloc.matchAll(/email:\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase());
}

/**
 * Refus d'accès au back-office, dans TOUTES les langues de l'interface.
 *
 * Deuxième raison — la plus sournoise — pour laquelle ce parcours ne voyait
 * rien : il ne cherchait que la formule FRANÇAISE « Zone réservée ». Or
 * Playwright démarre en `en-US`, l'application suit la langue du navigateur, et
 * l'écran de refus s'affichait donc en anglais. Le test cherchait une phrase qui
 * ne pouvait pas apparaître : même avec un compte non semé, il restait vert.
 *
 * Les libellés sont lus dans les dictionnaires, jamais recopiés : une
 * traduction retouchée ne doit pas rendre le harnais aveugle à nouveau.
 */
function formulesDeRefus() {
  const formules = [];
  for (const langue of ["fr", "en", "ar"]) {
    const source = readFileSync(fichier(`src/lib/i18n/${langue}.ts`), "utf8");
    const trouve = source.match(/"admin\.restricted\.title":\s*"([^"]+)"/);
    if (!trouve) {
      throw new Error(
        `admin.restricted.title introuvable dans src/lib/i18n/${langue}.ts : ` +
          "le parcours ne saurait plus reconnaître un refus d'accès.",
      );
    }
    formules.push(trouve[1]);
  }
  return formules;
}

const REFUS = formulesDeRefus();

/** Vrai si l'écran affiché est le refus d'accès au back-office, quelle que soit la langue. */
const estUnRefusDAcces = (texte) => REFUS.some((f) => texte.includes(f));

// ---- Garde anti-homonymie, avant même d'ouvrir le navigateur ----------
{
  const semees = emailsDuJeuDeDemonstration();
  if (semees.includes(EMAIL.toLowerCase())) {
    console.error(
      `\n${R}PARCOURS REFUSÉ${F} — le compte « ${EMAIL} » appartient au jeu de\n` +
        `démonstration du magasin mock (${semees.join(", ")}).\n\n` +
        "S'authentifier avec cette adresse ne prouve RIEN : l'interface peut lui\n" +
        "accorder le back-office par simple coïncidence d'adresse avec un compte\n" +
        "local, sans jamais lire la session. C'est exactement le défaut qui a\n" +
        "laissé un propriétaire légitime enfermé dehors de sa boutique.\n\n" +
        "Installez la base avec une adresse À VOUS, puis relancez :\n" +
        "  INSTALL_OWNER_EMAIL=patron@boutique-test.dz \\\n" +
        "  INSTALL_OWNER_PASSWORD='Patron-2026!xY' php api/install.php\n" +
        "  APP_EMAIL=patron@boutique-test.dz APP_PASSWORD='Patron-2026!xY' bun run parcours\n",
    );
    process.exit(1);
  }
}

function noter(gravite, message) {
  anomalies.push({ gravite, page: pageCourante, message });
}

async function etape(nom, fn) {
  pageCourante = nom;
  const debut = Date.now();
  try {
    await fn();
    const ms = Date.now() - debut;
    etapes.push({ nom, ok: true, ms });
    console.log(`${V}  ✓${F} ${nom} ${G}(${ms} ms)${F}`);
  } catch (e) {
    etapes.push({ nom, ok: false });
    console.log(`${R}  ✗${F} ${nom} — ${e.message.split("\n")[0]}`);
    noter("bloquant", `étape échouée : ${e.message.split("\n")[0]}`);
  }
}

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({ viewport: { width: 1400, height: 900 } });
const page = await contexte.newPage();

page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // Les 401 attendus produisent aussi un message de console : on les filtre ici.
  if (ECHECS_ATTENDUS.some((r) => r.test(t))) return;
  if (t.includes("Failed to load resource") && ECHECS_ATTENDUS.some((r) => r.test(t))) return;
  noter("console", t.slice(0, 220));
});

page.on("pageerror", (e) =>
  noter("bloquant", `exception non capturée : ${e.message.slice(0, 220)}`),
);

page.on("response", (r) => {
  const url = r.url();
  if (!url.includes("/api/")) return;
  if (r.status() < 400) return;
  if (ECHECS_ATTENDUS.some((re) => re.test(url))) return;
  noter("reseau", `${r.status()} ${r.request().method()} ${url.replace(BASE, "")}`);
});

/** Vérifie que la page a réellement rendu quelque chose, pas un écran blanc. */
async function pageNonVide(minimum = 200) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const texte = await page.locator("body").innerText();
  if (texte.trim().length < minimum) {
    throw new Error(`écran quasi vide (${texte.trim().length} caractères)`);
  }
  return texte;
}

console.log(`\n${G}Parcours de ${BASE}${F}\n`);
console.log("VITRINE");

await etape("Accueil", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const t = await pageNonVide(400);
  if (!/KA ?Tech/i.test(t)) throw new Error("le nom de la boutique n'apparaît pas");
});

await etape("Catalogue", async () => {
  await page.goto(`${BASE}/category`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
});

await etape("Recherche", async () => {
  await page.goto(`${BASE}/search?q=laptop`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
});

let idProduit = null;
await etape("Fiche produit", async () => {
  await page.goto(`${BASE}/category/laptops`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
  // Le lien porte le prefixe de deploiement : `/depot/product/xyz` en
  // sous-dossier, `/product/xyz` a la racine. On vise donc les deux.
  const lien = page.locator('a[href*="/product/"]').first();
  await lien.waitFor({ timeout: 10000 });
  idProduit = (await lien.getAttribute("href")).split("/product/")[1];
  await lien.click();
  await pageNonVide(300);
});

await etape("Ajout au panier", async () => {
  const bouton = page
    .locator("button")
    .filter({ hasText: /panier|cart|أضف/i })
    .first();
  await bouton.waitFor({ timeout: 10000 });
  await bouton.click();
  await page.waitForTimeout(1200);
});

await etape("Panier", async () => {
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  const t = await pageNonVide();
  if (/panier est vide|cart is empty/i.test(t)) throw new Error("le panier est vide après l'ajout");
});

await etape("Blog", async () => {
  await page.goto(`${BASE}/blog`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
});

await etape("Configurateur", async () => {
  await page.goto(`${BASE}/builder`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
});

await etape("À propos et contact", async () => {
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
  await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
});

console.log("\nAUTHENTIFICATION");

await etape("Refus d'un mauvais mot de passe", async () => {
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  await pageNonVide();
  // Le formulaire de connexion est celui qui CONTIENT le champ mot de passe.
  // Viser `button[type=submit]` en premier attrapait la recherche de l'en-tête :
  // le test échouait alors que l'application allait bien.
  const form = page
    .locator("form")
    .filter({ has: page.locator('input[type="password"]') })
    .first();
  await form.locator('input[type="email"]').fill(EMAIL);
  await form.locator('input[type="password"]').fill("mauvais-mot-de-passe");
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
  const visible = await page.locator("body").innerText();
  if (!/invalide|incorrect|erreur|échou/i.test(visible)) {
    throw new Error("aucun message d'erreur affiché après un mot de passe faux");
  }
  if (!page.url().includes("/auth")) throw new Error("redirection malgré l'échec de connexion");
});

await etape("Connexion", async () => {
  const form = page
    .locator("form")
    .filter({ has: page.locator('input[type="password"]') })
    .first();
  await form.locator('input[type="email"]').fill(EMAIL);
  await form.locator('input[type="password"]').fill(MOTDEPASSE);
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  if (page.url().includes("/auth")) throw new Error("toujours sur la page de connexion");
  // Preuve que la session est réelle : le serveur nous reconnaît.
  const moi = await page.evaluate(async (API) => {
    const r = await fetch(`${API}/auth/me`, { credentials: "include" });
    const u = (await r.json())?.data?.user ?? null;
    return { email: u?.email ?? null, role: u?.role ?? null };
  }, API);
  if (moi.email !== EMAIL) throw new Error(`session non reconnue par le serveur (${moi.email})`);

  // Le rôle que le SERVEUR attribue à cette session. Les écrans d'administration
  // qui suivent ne valent que par lui : le compte n'existe pas dans le jeu de
  // démonstration (garde en tête de fichier), donc aucune correspondance locale
  // ne peut plus expliquer un accès accordé.
  if (!["owner", "admin", "editor"].includes(moi.role)) {
    throw new Error(
      `le serveur attribue le rôle « ${moi.role} » à cette session : il n'ouvre pas ` +
        "le back-office, les écrans suivants ne prouveraient rien",
    );
  }
});

console.log("\nADMINISTRATION");

const pagesAdmin = [
  ["Tableau de bord", "/admin"],
  ["Produits", "/admin/products"],
  ["Nouveau produit", "/admin/products/new"],
  ["Catégories", "/admin/categories"],
  ["Marques", "/admin/brands"],
  ["Inventaire", "/admin/inventory"],
  ["Médias", "/admin/media"],
  ["Commandes", "/admin/orders"],
  ["Clients", "/admin/customers"],
  ["Coupons", "/admin/coupons"],
  ["Avis", "/admin/reviews"],
  ["Blog", "/admin/blog"],
  ["Contenu", "/admin/content"],
  ["Réglages", "/admin/settings"],
  ["Livraison", "/admin/shipping"],
  ["Paiements", "/admin/payments"],
  ["Messages", "/admin/messages"],
  ["Abonnés", "/admin/subscribers"],
  ["Notifications", "/admin/notifications"],
  ["Utilisateurs", "/admin/users"],
  ["Analytique", "/admin/analytics"],
  ["Rapports", "/admin/reports"],
  ["Journal", "/admin/audit"],
  ["Réinitialisation", "/admin/reset"],
  ["Développeur", "/admin/developpeur"],
];

for (const [nom, chemin] of pagesAdmin) {
  await etape(nom, async () => {
    await page.goto(BASE + chemin, { waitUntil: "domcontentloaded" });
    const t = await pageNonVide(120);
    // Contrôle fort : sans lui, une redirection vers /auth passerait pour un
    // succès puisque la page de connexion est, elle aussi, « non vide ».
    if (!page.url().includes(chemin))
      throw new Error(`redirigé vers ${page.url().replace(BASE, "")}`);
    if (estUnRefusDAcces(t))
      throw new Error(
        "accès refusé alors que la session porte un rôle du back-office " +
          "— l'interface ne lit pas le rôle au bon endroit",
      );
    // Une page qui plante au rendu affiche le repli de l'ErrorBoundary : elle
    // est « non vide », donc indétectable sans ce contrôle. C'est ainsi que le
    // plantage de /admin/media est passé pour un succès au premier passage.
    if (/Une erreur est survenue|réessayer|recharger la page/i.test(t) && /erreur/i.test(t)) {
      throw new Error("ErrorBoundary déclenché : la page a planté au rendu");
    }
  });
}

console.log("\nMAINTENANCE");

// Ces trois routes sont le seul acces du proprietaire a ses donnees sur un
// hebergement mutualise, ou il n'a ni SSH ni phpMyAdmin. Une page qui S'AFFICHE
// ne prouve pas qu'elles repondent : on les appelle depuis la session reelle du
// navigateur, cookie compris.
await etape("Etat de la base", async () => {
  const etat = await page.evaluate(async (API) => {
    const r = await fetch(`${API}/maintenance/status`, { credentials: "include" });
    return { status: r.status, corps: await r.json().catch(() => null) };
  }, API);
  if (etat.status !== 200) throw new Error(`HTTP ${etat.status}`);
  const d = etat.corps?.data;
  if (!d?.driver) throw new Error("aucun pilote annonce");
  if (!Array.isArray(d.tables) || d.tables.length === 0) {
    throw new Error("aucune table remontee — la forme du contrat a change ?");
  }
});

await etape("Simulation de migration", async () => {
  const res = await page.evaluate(async (API) => {
    const r = await fetch(`${API}/maintenance/migrate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      // `simulation: true` : cette etape ne doit RIEN ecrire nulle part.
      body: JSON.stringify({
        cible: "mysql",
        dsn: "mysql:host=127.0.0.1;port=3306;dbname=katech_restore",
        utilisateur: "katech",
        motDePasse: "katech",
        simulation: true,
      }),
    });
    return { status: r.status, corps: await r.json().catch(() => null) };
  }, API);
  // MySQL peut ne pas tourner sur la machine qui lance ce parcours : un refus
  // de connexion est alors un resultat legitime, pas un echec du produit. Ce
  // qu'on exige, c'est que la route reponde et que la simulation reste vraie.
  if (![200, 422, 503].includes(res.status)) throw new Error(`HTTP ${res.status}`);
  if (res.status === 200 && res.corps?.data?.simulation !== true) {
    throw new Error("la reponse ne se declare pas en simulation — risque d'ecriture reelle");
  }
});

await navigateur.close();

// ----------------------------------------------------------------- Bilan
const bloquants = anomalies.filter((a) => a.gravite === "bloquant");
const reseau = anomalies.filter((a) => a.gravite === "reseau");
const console_ = anomalies.filter((a) => a.gravite === "console");
const ok = etapes.filter((e) => e.ok).length;

console.log(`\n${"=".repeat(70)}`);
console.log(`  étapes réussies : ${ok} / ${etapes.length}`);
console.log(
  `  bloquants : ${bloquants.length} · réseau : ${reseau.length} · console : ${console_.length}`,
);
console.log("=".repeat(70));

const grouper = (liste, titre, couleur) => {
  if (liste.length === 0) return;
  console.log(`\n${couleur}${titre}${F}`);
  const vus = new Set();
  for (const a of liste) {
    const cle = a.page + a.message;
    if (vus.has(cle)) continue;
    vus.add(cle);
    console.log(`  [${a.page}] ${a.message}`);
  }
};

grouper(bloquants, "BLOQUANTS", R);
grouper(reseau, "APPELS EN ÉCHEC", R);
grouper(console_, "ERREURS DE CONSOLE", J);

const echec = bloquants.length > 0 || reseau.length > 0 || ok < etapes.length;
console.log(echec ? `\n${R}PARCOURS EN ÉCHEC${F}\n` : `\n${V}PARCOURS PROPRE${F}\n`);
process.exit(echec ? 1 : 0);
