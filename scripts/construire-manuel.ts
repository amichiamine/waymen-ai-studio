/**
 * construire-manuel.ts — fabrique `MANUEL.html`, le manuel du propriétaire.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * À QUI S'ADRESSE LE DOCUMENT PRODUIT
 *
 *   Au commerçant qui exploite la boutique, pas à celui qui l'installe.
 *   `GUIDE.html` couvre l'installation et la mise en ligne ; `MANUEL.html`
 *   couvre le travail quotidien, à la souris, dans l'administration. La
 *   frontière est nette et se tient : tout ce qui relève de l'outillage du
 *   développeur reste en dehors. Une phrase qu'un commerçant ne pourrait pas
 *   exécuter seul n'a rien à faire dans ce fichier.
 *
 *   Les deux documents sont indépendants : `MANUEL.html` ne renvoie jamais à
 *   `GUIDE.html`, et s'ouvre seul, hors connexion, sur n'importe quelle machine.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'IL FAUT LANCER AVANT
 *
 *   1. Les dépendances :
 *        export PATH="$HOME/.bun/bin:$PATH" && bun install
 *
 *   2. La pile complète en mode « http ». Les captures sont prises sur
 *      l'application qui tourne : sans elle, il n'y a rien à photographier.
 *        API_PORT=8370 PORT=8170 DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/f1.sqlite \
 *        NOTION_API_BASE=http://127.0.0.1:8371 bun run dev &
 *
 *      Vite prend le port suivant si 8170 est occupé : lire la ligne
 *      « ➜ Local: http://localhost:XXXX/ » et passer l'adresse réelle par
 *      MANUEL_BASE si ce n'est pas 8170.
 *
 *   3. Recommandé — la doublure Notion, pour que l'écran Notion montre une
 *      connexion réellement établie plutôt qu'un formulaire vide :
 *        php -S 127.0.0.1:8371 api/tools/faux-notion.php &
 *
 *   4. Les polices arabes du SYSTÈME. Sans elles, Chromium dessine des carrés
 *      à la place des lettres et les captures arabes sont bonnes à jeter. Le
 *      script les installe lui-même dans `~/.local/share/fonts` si elles
 *      manquent (téléchargement unique, mis en cache) ; il le dit s'il échoue.
 *
 * LANCEMENT
 *   bun run construire-manuel
 *   MANUEL_BASE=http://127.0.0.1:8171 bun run construire-manuel
 *   bun run construire-manuel -- --sans-captures   (réutilise les WebP du cache)
 *
 * CE QU'IL FAUT VÉRIFIER APRÈS
 *   · Le script imprime la taille finale, le nombre de captures retenues, celles
 *     en arabe, et celles qui ont été ÉCARTÉES. Une capture écartée n'est jamais
 *     remplacée par un cadre vide : la figure disparaît et le compte l'annonce.
 *   · Il REFUSE d'écrire le fichier si une URL externe s'y est glissée, si les
 *     deux langues n'ont pas le même nombre de sections, ou si un mot de la
 *     liste noire (outillage de développeur) a franchi la barrière.
 *   · Ouvrir `MANUEL.html` d'un double-clic, réseau coupé : le sommaire doit
 *     naviguer, le bouton FR / العربية doit basculer la page en `dir="rtl"`,
 *     aucune image ne doit être cassée, la console doit rester muette.
 *
 * POURQUOI CE SCRIPT EXISTE
 *   `MANUEL.html` est un produit, pas une source. Le corriger à la main le
 *   condamne : personne ne saura le régénérer dans six mois. Tout le texte, les
 *   deux langues et la mise en page vivent ici ; le HTML committé est ce que ce
 *   fichier produit. Les deux vont ensemble dans le même commit.
 *
 *   La mécanique (capture, jugement de contraste, compression WebP, contrôle de
 *   parité entre langues) est reprise de `scripts/construire-guide.ts`, éprouvée.
 *   Le document produit, lui, ne partage rien avec `GUIDE.html`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

// ── Réglages ────────────────────────────────────────────────────────────────

const BASE = process.env.MANUEL_BASE ?? "http://127.0.0.1:8170";
const API = `${BASE}/api/v1`;
const PROPRIETAIRE = {
  email: process.env.MANUEL_ADMIN_EMAIL ?? "admin@katech.dz",
  motDePasse: process.env.MANUEL_ADMIN_MDP ?? "katech-dev-2026",
};

/** Cache des captures : hors du dépôt, pour ne jamais salir l'arbre de travail. */
const CACHE = join(tmpdir(), "katech-manuel-captures");
/** Cache des polices : téléchargement unique, réutilisé d'une exécution à l'autre. */
const CACHE_POLICES = join(tmpdir(), "katech-manuel-polices");
/** Largeur des images intégrées. Au-delà, on paie des octets sans gagner en lisibilité. */
const LARGEUR_MAX = 1180;
/** Qualité WebP. 78 garde le texte des captures net sans faire enfler le fichier. */
const QUALITE_WEBP = 78;

const SANS_CAPTURES = process.argv.includes("--sans-captures");

const journal = { retenues: [] as string[], ecartees: [] as string[], remarques: [] as string[] };
const dire = (m: string) => console.log(`[manuel] ${m}`);

// ── Polices arabes ──────────────────────────────────────────────────────────
//
// Deux besoins distincts, servis par la même source :
//   · Noto Sans Arabic doit être installée DANS LE SYSTÈME, sinon Chromium
//     dessine des carrés vides sur les captures arabes.
//   · Noto Naskh Arabic est sous-ensemblée puis intégrée DANS le HTML, pour que
//     le manuel se lise correctement même sur un poste dépourvu de police arabe.
//
// Les deux sont sous licence SIL Open Font License 1.1 (redistribution et
// intégration autorisées ; la mention de licence figure au pied du document).

const POLICES = [
  {
    nom: "NotoSansArabic",
    url: "https://github.com/notofonts/arabic/releases/download/NotoSansArabic-v2.011/NotoSansArabic-v2.011.zip",
  },
  {
    nom: "NotoNaskhArabic",
    url: "https://github.com/notofonts/arabic/releases/download/NotoNaskhArabic-v2.020/NotoNaskhArabic-v2.020.zip",
  },
];

/** Plage de caractères conservée : arabe, ponctuation, latin de base. */
const PLAGES =
  "U+0020-007E,U+00A0-00FF,U+0600-06FF,U+0750-077F,U+08A0-08FF," +
  "U+2000-206F,U+2190-21FF,U+FB50-FDFF,U+FE70-FEFF";

/** Télécharge et déballe une archive de police. Rend le dossier des TTF, ou null. */
function obtenirPolice(nom: string, url: string): string | null {
  const racine = join(CACHE_POLICES, nom);
  const ttf = join(racine, nom, "unhinted", "ttf");
  if (existsSync(ttf)) return ttf;
  try {
    mkdirSync(racine, { recursive: true });
    const zip = join(CACHE_POLICES, `${nom}.zip`);
    if (!existsSync(zip)) {
      execFileSync("curl", ["-sSL", "--max-time", "120", "-o", zip, url], { stdio: "pipe" });
    }
    execFileSync("unzip", ["-qo", zip, "-d", racine], { stdio: "pipe" });
    return existsSync(ttf) ? ttf : null;
  } catch {
    return null;
  }
}

/**
 * Installe les polices arabes dans le dossier utilisateur pour que Chromium les
 * trouve. Sans elles, les captures arabes ne montrent que des carrés — mieux
 * vaut ne pas les prendre du tout que de livrer des figures illisibles.
 */
function installerPolicesSysteme(): boolean {
  try {
    const deja = execFileSync("fc-list", [], { encoding: "utf8" });
    if (/Noto Sans Arabic/i.test(deja)) return true;
  } catch {
    journal.remarques.push("fontconfig absent : impossible de vérifier les polices arabes.");
    return false;
  }
  const cible = join(homedir(), ".local", "share", "fonts");
  let pose = 0;
  for (const { nom, url } of POLICES) {
    const dossier = obtenirPolice(nom, url);
    if (!dossier) continue;
    mkdirSync(cible, { recursive: true });
    for (const f of readdirSync(dossier).filter((f) => f.endsWith(".ttf"))) {
      writeFileSync(join(cible, f), readFileSync(join(dossier, f)));
      pose++;
    }
  }
  if (pose === 0) {
    journal.remarques.push(
      "polices arabes indisponibles (réseau ?) : les captures arabes risquent d'être illisibles.",
    );
    return false;
  }
  try {
    execFileSync("fc-cache", ["-f"], { stdio: "pipe" });
  } catch {
    /* fc-cache absent : certaines distributions lisent le dossier directement. */
  }
  dire(`polices arabes installées pour le navigateur (${pose} fichiers)`);
  return true;
}

/**
 * Sous-ensemble de Noto Naskh Arabic, converti en WOFF2 et rendu en data-URI.
 * `null` si l'outillage manque : le document se rabat alors sur les polices du
 * système, et le script le dit clairement plutôt que de laisser croire.
 */
function policeIntegree(): { regular: string; bold: string } | null {
  const dossier = obtenirPolice("NotoNaskhArabic", POLICES[1].url);
  if (!dossier) return null;
  const sortie: Record<string, string> = {};
  for (const [cle, fichier] of [
    ["regular", "NotoNaskhArabic-Regular.ttf"],
    ["bold", "NotoNaskhArabic-Bold.ttf"],
  ]) {
    const source = join(dossier, fichier);
    const cible = join(CACHE_POLICES, `${cle}.woff2`);
    if (!existsSync(cible)) {
      try {
        execFileSync(
          "pyftsubset",
          [
            source,
            `--unicodes=${PLAGES}`,
            "--layout-features=*",
            "--flavor=woff2",
            `--output-file=${cible}`,
          ],
          { stdio: "pipe" },
        );
      } catch {
        journal.remarques.push(
          "pyftsubset (fontTools + brotli) indisponible : aucune police arabe intégrée, " +
            "le rendu arabe dépendra du système.",
        );
        return null;
      }
    }
    sortie[cle] = `data:font/woff2;base64,${readFileSync(cible).toString("base64")}`;
  }
  return { regular: sortie.regular, bold: sortie.bold };
}

// ── Phase 1 : peupler la boutique ───────────────────────────────────────────
//
// Une capture d'un tableau vide est une capture ratée : elle n'apprend rien et
// décrédibilise le reste. On met donc la boutique en situation — de vraies
// commandes, de vrais clients, un coupon, des avis, des messages — avant de
// photographier quoi que ce soit.
//
// La mise en scène est IDEMPOTENTE : si des commandes existent déjà, elle ne
// rejoue rien. Relancer le script reproduit donc le même fichier.

type Json = Record<string, unknown>;

let cookie = "";

async function appel(methode: string, chemin: string, corps?: Json): Promise<Json | null> {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const setCookie = r.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const texte = await r.text();
  if (!r.ok) return null;
  try {
    return JSON.parse(texte) as Json;
  } catch {
    return null;
  }
}

/** Décale la date d'une commande pour que la courbe des 30 jours ait un relief. */
function antidater(commandes: { id: string; joursAvant: number }[]): void {
  const base = process.env.DB_SQLITE_PATH ?? "/tmp/f1.sqlite";
  if (!existsSync(base)) {
    journal.remarques.push(
      "base non trouvée : les commandes gardent la date du jour, la courbe du tableau de bord reste plate.",
    );
    return;
  }
  try {
    // `node:sqlite` fait partie de Node ≥ 22 : aucune dépendance à ajouter.
    const exiger = createRequire(import.meta.url);
    const { DatabaseSync } = exiger("node:sqlite") as {
      DatabaseSync: new (p: string) => {
        prepare: (s: string) => { run: (...a: unknown[]) => void };
        close: () => void;
      };
    };
    const db = new DatabaseSync(base);
    const req = db.prepare("UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?");
    for (const { id, joursAvant } of commandes) {
      const d = new Date(Date.now() - joursAvant * 86_400_000)
        .toISOString()
        .replace(/\.\d+Z$/, "+00:00");
      req.run(d, d, id);
    }
    db.close();
  } catch {
    journal.remarques.push("antidatage impossible : la courbe du tableau de bord restera plate.");
  }
}

const CLIENTS = [
  {
    name: "Yacine Belkacem",
    email: "yacine.belkacem@exemple.dz",
    phone: "0551 23 45 67",
    wilaya: "16",
  },
  { name: "Nadia Cherif", email: "nadia.cherif@exemple.dz", phone: "0661 78 12 90", wilaya: "31" },
  { name: "Samir Haddad", email: "samir.haddad@exemple.dz", phone: "0770 45 66 21", wilaya: "25" },
  {
    name: "Lila Mansouri",
    email: "lila.mansouri@exemple.dz",
    phone: "0555 90 34 78",
    wilaya: "09",
  },
  {
    name: "Karim Ould Ali",
    email: "karim.ouldali@exemple.dz",
    phone: "0698 11 22 33",
    wilaya: "06",
  },
];

const COMMANDES = [
  {
    produits: [["macbook-air-m3", 1]] as [string, number][],
    client: 0,
    ville: "Cité des Palmiers, bâtiment C, 3e étage — Bab Ezzouar",
    paiement: "cod",
    statut: "delivered",
    jours: 24,
  },
  {
    produits: [
      ["rog-strix-g16", 1],
      ["redmi-note-13-pro", 1],
    ] as [string, number][],
    client: 1,
    ville: "12, rue Larbi Ben M'hidi — Oran centre",
    paiement: "bank",
    statut: "delivered",
    jours: 17,
  },
  {
    produits: [["dell-optiplex-5000", 2]] as [string, number][],
    client: 2,
    ville: "Zone d'activité El Khroub, local 8 — Constantine",
    paiement: "bank",
    statut: "shipped",
    jours: 9,
  },
  {
    produits: [["galaxy-s25-ultra", 1]] as [string, number][],
    client: 3,
    ville: "Bureau de retrait Yalidine — Tlemcen",
    paiement: "cod",
    statut: "processing",
    jours: 4,
    bureau: true,
  },
  {
    produits: [
      ["xiaomi-14t-pro", 1],
      ["hp-pavilion-15", 1],
    ] as [string, number][],
    client: 4,
    ville: "Lotissement Sidi Yahia, villa 14 — Béjaïa",
    paiement: "card",
    statut: "pending",
    jours: 1,
  },
  {
    produits: [["build-mid-gaming", 1]] as [string, number][],
    client: 1,
    ville: "12, rue Larbi Ben M'hidi — Oran centre",
    paiement: "cod",
    statut: "pending",
    jours: 0,
  },
  {
    produits: [["redmi-note-13-pro", 1]] as [string, number][],
    client: 2,
    ville: "Zone d'activité El Khroub, local 8 — Constantine",
    paiement: "cod",
    statut: "cancelled",
    jours: 12,
  },
];

/** Rend l'identifiant d'une commande représentative, à photographier en détail. */
async function peupler(): Promise<{ vitrine: string; secondaire: string }> {
  await appel("POST", "/auth/login", {
    email: PROPRIETAIRE.email,
    password: PROPRIETAIRE.motDePasse,
  });

  const existantes = (await appel("GET", "/orders?perPage=50")) as {
    data?: { items?: { id: string; status: string }[] };
  } | null;
  const deja = existantes?.data?.items ?? [];
  if (deja.length >= COMMANDES.length) {
    dire(`boutique déjà peuplée (${deja.length} commandes) — mise en scène ignorée`);
    const expediee = deja.find((o) => o.status === "shipped") ?? deja[0];
    const attente = deja.find((o) => o.status === "pending") ?? deja[0];
    return { vitrine: expediee.id, secondaire: attente.id };
  }

  dire("mise en scène de la boutique…");
  for (const c of CLIENTS) await appel("POST", "/customers", c);

  const ids: string[] = [];
  const dates: { id: string; joursAvant: number }[] = [];
  for (const cmd of COMMANDES) {
    const cl = CLIENTS[cmd.client];
    const rep = (await appel("POST", "/orders", {
      items: cmd.produits.map(([productId, qty]) => ({ productId, qty })),
      customer: { name: cl.name, email: cl.email, phone: cl.phone },
      shipping: {
        wilayaCode: cl.wilaya,
        method: cmd.bureau ? "desk" : "home",
        address: cmd.ville,
      },
      paymentMethod: cmd.paiement,
    })) as { data?: { id?: string } } | null;
    const id = rep?.data?.id;
    if (!id) continue;
    ids.push(id);
    dates.push({ id, joursAvant: cmd.jours });
    if (cmd.statut !== "pending") {
      // On fait progresser le statut par la porte officielle : chaque passage
      // laisse sa trace dans le suivi et dans le journal, exactement comme
      // lorsque le propriétaire clique.
      const chemin: Record<string, string[]> = {
        processing: ["processing"],
        shipped: ["processing", "shipped"],
        delivered: ["processing", "shipped", "delivered"],
        cancelled: ["cancelled"],
      };
      for (const etape of chemin[cmd.statut] ?? []) {
        await appel("PATCH", `/orders/${id}/status`, { status: etape });
      }
    }
  }
  antidater(dates);

  // Une date d'expiration est TOUJOURS posée : sans elle, la colonne « Expire »
  // de l'écran affiche « Invalid Date », et une capture qui montre un défaut
  // d'affichage enseigne le défaut.
  const dansNJours = (n: number) =>
    new Date(Date.now() + n * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");

  for (const c of [
    {
      expiresAt: dansNJours(45),
      code: "RENTREE15",
      type: "percent",
      value: 15,
      minPurchase: 50000,
      active: true,
      usageLimit: 100,
    },
    {
      expiresAt: dansNJours(90),
      code: "BIENVENUE5000",
      type: "fixed",
      value: 5000,
      minPurchase: 80000,
      active: true,
    },
    { expiresAt: dansNJours(-20), code: "AID2026", type: "percent", value: 10, active: false },
  ]) {
    await appel("POST", "/coupons", c as unknown as Json);
  }

  for (const a of [
    {
      p: "macbook-air-m3",
      customerName: "Yacine B.",
      rating: 5,
      body: "Reçu en deux jours à Alger, emballage impeccable. La machine était déjà chargée, rien à redire.",
    },
    {
      p: "rog-strix-g16",
      customerName: "Nadia C.",
      rating: 4,
      body: "Très bonne machine pour le montage vidéo. Le ventilateur se fait entendre en pleine charge, mais rien d'anormal.",
    },
    {
      p: "redmi-note-13-pro",
      customerName: "Samir H.",
      rating: 5,
      body: "Excellent rapport qualité-prix, et la livraison à Constantine a été plus rapide qu'annoncé.",
    },
    {
      p: "dell-optiplex-5000",
      customerName: "Lila M.",
      rating: 3,
      body: "Le poste fonctionne bien mais je m'attendais à davantage de mémoire pour ce prix.",
    },
  ]) {
    await appel("POST", `/products/${a.p}/reviews`, {
      customerName: a.customerName,
      rating: a.rating,
      body: a.body,
    });
  }

  for (const m of [
    {
      name: "Samir Haddad",
      email: "samir.haddad@exemple.dz",
      subject: "Disponibilité du ThinkPad X1",
      message:
        "Bonjour, le ThinkPad X1 Carbon est-il disponible avec 32 Go de mémoire ? Et livrez-vous à Constantine sous 48 h ?",
    },
    {
      name: "Amine Ferhat",
      email: "amine.ferhat@exemple.dz",
      subject: "Facture pour mon entreprise",
      message:
        "Bonjour, je souhaite commander cinq postes de bureau pour ma société. Pouvez-vous établir une facture au nom de l'entreprise ?",
    },
    {
      name: "Sofia Belhadj",
      email: "sofia.belhadj@exemple.dz",
      subject: "Garantie d'un écran",
      message:
        "Bonsoir, l'écran que j'ai acheté le mois dernier présente un pixel mort. Quelle est la marche à suivre pour la garantie ?",
    },
  ]) {
    await appel("POST", "/messages", m);
  }

  for (const e of [
    "nadia.cherif@exemple.dz",
    "karim.ouldali@exemple.dz",
    "sofia.belhadj@exemple.dz",
    "amine.ferhat@exemple.dz",
    "lila.mansouri@exemple.dz",
  ]) {
    await appel("POST", "/subscribers", { email: e });
  }

  for (const u of [
    { name: "Amel Bouzid", email: "amel.bouzid@katech.dz", role: "editor", active: true },
    { name: "Riad Slimani", email: "riad.slimani@katech.dz", role: "admin", active: true },
    { name: "Hakim Tounsi", email: "hakim.tounsi@katech.dz", role: "viewer", active: true },
  ]) {
    await appel("POST", "/admin/users", u);
  }

  for (const n of [
    {
      title: "Nouvelle commande à traiter",
      body: "Karim Ould Ali — 123 000 DA — Béjaïa",
      level: "info",
    },
    {
      title: "Stock faible : HP OMEN 45L",
      body: "Il ne reste que 3 unités en stock.",
      level: "warning",
    },
    {
      title: "Un avis attend votre modération",
      body: "Lila M. a noté le Dell OptiPlex 5000.",
      level: "info",
    },
  ]) {
    await appel("POST", "/notifications", n);
  }

  dire(`mise en scène terminée — ${ids.length} commandes créées`);
  const apres = (await appel("GET", "/orders?perPage=50")) as {
    data?: { items?: { id: string; status: string }[] };
  } | null;
  const liste = apres?.data?.items ?? [];
  return {
    vitrine: (liste.find((o) => o.status === "shipped") ?? liste[0]).id,
    secondaire: (liste.find((o) => o.status === "pending") ?? liste[0]).id,
  };
}

// ── Phase 2 : les captures ──────────────────────────────────────────────────
//
// Playwright est importé dynamiquement : avec `--sans-captures`, le script doit
// pouvoir tourner sur une machine où le navigateur n'est pas téléchargé.

async function capturer(vitrine: string, secondaire: string): Promise<void> {
  const { chromium } = await import("playwright");
  mkdirSync(CACHE, { recursive: true });

  const nav = await chromium.launch();
  const erreurs: string[] = [];

  async function contexte(langue: "fr" | "ar", hauteur = 1000) {
    const ctx = await nav.newContext({
      viewport: { width: 1440, height: hauteur },
      locale: langue === "ar" ? "ar-DZ" : "fr-FR",
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript(
      `try { window.localStorage.setItem("ka-tech.lang", ${JSON.stringify(langue)}); } catch {}`,
    );
    const page = await ctx.newPage();
    page.on("pageerror", (e) => erreurs.push(`${langue}: ${String(e).slice(0, 120)}`));
    return { ctx, page };
  }

  type Page = Awaited<ReturnType<typeof contexte>>["page"];

  /** Laisse le rendu se poser et referme le bandeau promotionnel du site public. */
  async function poser(page: Page) {
    await page.waitForTimeout(1500);
    const fermer = page.locator('button[aria-label*="ermer"], button[aria-label*="إغلاق"]').first();
    if (await fermer.count()) await fermer.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  /**
   * Prend une capture et la JUGE. Une image quasi uniforme (page blanche, écran
   * de chargement) est ÉCARTÉE : une figure vide décrédibilise tout le document.
   * `selecteur` permet de cadrer sur une carte précise plutôt que sur l'écran
   * entier — indispensable quand un écran mêle ce qui concerne le propriétaire
   * et ce qui ne le concerne pas.
   */
  async function tirer(
    page: Page,
    cle: string,
    opts: { hauteur?: number; selecteur?: string; carte?: string } = {},
  ) {
    const { hauteur, selecteur, carte } = opts;
    if (hauteur) {
      await page.setViewportSize({ width: 1440, height: hauteur });
      await page.waitForTimeout(800);
    }
    let png: Buffer;
    try {
      if (selecteur || carte) {
        // `carte` cadre sur LA carte de l'interface qui porte ce titre : c'est
        // ainsi qu'on isole ce qui concerne le propriétaire sur un écran qui
        // mêle plusieurs sujets.
        const cible = carte
          ? page.locator("div.rounded-xl.bg-card").filter({ hasText: carte }).last()
          : page.locator(selecteur as string).first();
        await cible.waitFor({ state: "visible", timeout: 8000 });
        await cible.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        png = await cible.screenshot({ type: "png" });
      } else {
        png = await page.screenshot({ type: "png" });
      }
    } catch (e) {
      journal.ecartees.push(`${cle} (cadrage introuvable : ${String(e).slice(0, 60)})`);
      dire(`ÉCARTÉE ${cle} — cadrage introuvable`);
      if (hauteur) await page.setViewportSize({ width: 1440, height: 1000 });
      return;
    }
    if (hauteur) await page.setViewportSize({ width: 1440, height: 1000 });

    const stats = await sharp(png).stats();
    const contraste = Math.max(...stats.channels.map((c) => c.stdev));
    if (contraste < 8) {
      journal.ecartees.push(`${cle} (image sans contenu exploitable)`);
      dire(`ÉCARTÉE ${cle} — rendu vide (écart-type ${contraste.toFixed(1)})`);
      return;
    }
    // Compression immédiate : le cache ne garde que ce qui sera intégré.
    const webp = await sharp(png)
      .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
      .webp({ quality: QUALITE_WEBP, effort: 6 })
      .toBuffer();
    writeFileSync(join(CACHE, `${cle}.webp`), webp);
    journal.retenues.push(cle);
    dire(`capture ${cle} — ${(webp.length / 1024).toFixed(0)} Ko`);
  }

  async function aller(page: Page, url: string) {
    await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await poser(page);
  }

  async function connecter(page: Page, langue: "fr" | "ar") {
    await aller(page, "/auth");
    await page.locator('input[type="email"]').first().fill(PROPRIETAIRE.email);
    await page.locator('input[type="password"]').first().fill(PROPRIETAIRE.motDePasse);
    const nom = langue === "fr" ? /^Se connecter$/ : /تسجيل الدخول/;
    await page
      .locator("button")
      .filter({ hasText: nom })
      .last()
      .click()
      .catch(() => {});
    await page.waitForTimeout(3200);
  }

  // ── 2a. L'écran de connexion, avant toute saisie ──────────────────────────
  const porte = await contexte("fr");
  await aller(porte.page, "/auth");
  await tirer(porte.page, "connexion", { hauteur: 860 });
  await porte.ctx.close();

  // ── 2b. L'administration, en français ─────────────────────────────────────
  const adm = await contexte("fr");
  await connecter(adm.page, "fr");

  await aller(adm.page, "/admin");
  await tirer(adm.page, "tableau-de-bord", { hauteur: 1320 });
  // Le menu seul : c'est la carte du back-office, elle mérite sa propre figure.
  await tirer(adm.page, "menu", { hauteur: 1320, selecteur: "aside, nav[aria-label], .w-64" });

  const ecrans: [string, string, number?][] = [
    ["commandes", "/admin/orders", 1000],
    ["clients", "/admin/customers", 1000],
    ["coupons", "/admin/coupons", 1000],
    ["produits", "/admin/products", 1180],
    ["produit-fiche", "/admin/products/macbook-air-m3/view", 1250],
    ["produit-formulaire", "/admin/products/macbook-air-m3", 1400],
    ["categories", "/admin/categories", 1000],
    ["marques", "/admin/brands", 1000],
    ["stock", "/admin/inventory", 1180],
    ["medias", "/admin/media", 1100],
    ["avis", "/admin/reviews", 1050],
    ["contenu", "/admin/content", 1250],
    ["blog", "/admin/blog", 1000],
    ["parametres", "/admin/settings", 1450],
    ["livraison", "/admin/shipping", 1250],
    ["paiements", "/admin/payments", 1100],
    ["messages", "/admin/messages", 1000],
    ["abonnes", "/admin/subscribers", 950],
    ["notifications", "/admin/notifications", 1000],
    ["utilisateurs", "/admin/users", 1000],
    ["journal", "/admin/audit", 1150],
    ["analytique", "/admin/analytics", 1300],
    ["rapports", "/admin/reports", 1200],
  ];
  for (const [cle, url, hauteur] of ecrans) {
    await aller(adm.page, url);
    await tirer(adm.page, cle, { hauteur });
  }

  // La fiche d'une commande, puis le cadre qui sert à en changer le statut.
  await aller(adm.page, `/admin/orders/${vitrine}`);
  await tirer(adm.page, "commande-fiche", { hauteur: 1400 });
  await tirer(adm.page, "commande-statut", {
    hauteur: 1400,
    carte: "Changer le statut",
  });

  await aller(adm.page, `/admin/orders/${secondaire}`);
  await tirer(adm.page, "commande-nouvelle", { hauteur: 1250 });

  // Le formulaire d'un compte d'employé — le champ mot de passe reste vide.
  await aller(adm.page, "/admin/users");
  await adm.page
    .getByRole("button", { name: /^Inviter$/ })
    .first()
    .click()
    .catch(() => {});
  await adm.page.waitForTimeout(1200);
  await tirer(adm.page, "utilisateur-formulaire", { selecteur: '[role="dialog"]' });

  // La copie de sauvegarde : on cadre UNIQUEMENT sur la carte concernée.
  // Le reste de cet écran ne s'adresse pas au propriétaire.
  await aller(adm.page, "/admin/developpeur");
  await tirer(adm.page, "sauvegarde", {
    hauteur: 1500,
    carte: "Télécharger la sauvegarde",
  });

  // Notion : on branche la doublure pour que l'écran montre une connexion
  // établie. Le champ du jeton est effacé par l'application dès l'envoi : aucune
  // valeur secrète n'apparaît sur la capture.
  await aller(adm.page, "/admin/notion");
  const champ = adm.page.locator('input[placeholder^="ntn_"]');
  if (await champ.count()) {
    await champ.fill("ntn_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0").catch(() => {});
    await adm.page
      .getByRole("button", { name: /Tester et enregistrer/i })
      .click()
      .catch(() => {});
    await adm.page.waitForTimeout(5000);
  }
  await tirer(adm.page, "notion", { hauteur: 1350 });
  await adm.ctx.close();

  // ── 2c. En arabe : la preuve que le RTL n'est pas qu'une affaire de texte ─
  const ar = await contexte("ar");
  await connecter(ar.page, "ar");
  const ecransAr: [string, string, number?][] = [
    ["tableau-de-bord-ar", "/admin", 1320],
    ["commandes-ar", "/admin/orders", 1000],
    ["produits-ar", "/admin/products", 1180],
    ["avis-ar", "/admin/reviews", 1050],
    ["utilisateurs-ar", "/admin/users", 1000],
    ["livraison-ar", "/admin/shipping", 1250],
  ];
  for (const [cle, url, hauteur] of ecransAr) {
    await aller(ar.page, url);
    await tirer(ar.page, cle, { hauteur });
  }
  await aller(ar.page, `/admin/orders/${vitrine}`);
  await tirer(ar.page, "commande-fiche-ar", { hauteur: 1400 });
  await ar.ctx.close();

  await nav.close();
  if (erreurs.length) dire(`erreurs de page pendant les captures : ${erreurs.join(" | ")}`);
}

// ── Phase 3 : intégration ───────────────────────────────────────────────────

/** Rend une capture du cache en data-URI WebP. `null` si absente. */
function integrer(cle: string): string | null {
  const chemin = join(CACHE, `${cle}.webp`);
  if (!existsSync(chemin)) return null;
  return `data:image/webp;base64,${readFileSync(chemin).toString("base64")}`;
}

// ── Le modèle du document ───────────────────────────────────────────────────
//
// Chaque bloc porte ses deux langues côte à côte. Ce n'est pas une coquetterie :
// c'est ce qui rend structurellement impossible qu'une section existe en
// français et manque en arabe. Le compte des sections est le même par
// construction, et le script le vérifie tout de même avant d'écrire.
//
// Le bloc `procedure` impose sa discipline : une tâche = des étapes numérotées,
// et TOUJOURS une phrase qui dit comment savoir que ça a marché. Sans elle,
// l'utilisateur reste seul devant son écran à se demander s'il a réussi.

type Bi = { fr: string; ar: string };
type BiListe = { fr: string[]; ar: string[] };

type Bloc =
  | { t: "p"; fr: string; ar: string }
  | { t: "liste"; fr: string[]; ar: string[] }
  | { t: "procedure"; titre: Bi; etapes: BiListe; reussi: Bi }
  | { t: "tableau"; entetes: BiListe; lignes: { fr: string[][]; ar: string[][] } }
  | { t: "encadre"; genre: "note" | "attention" | "danger"; titre: Bi; fr: string; ar: string }
  | { t: "figure"; cle: string; legende: Bi };

type Section = { id: string; titre: Bi; chapeau: Bi; blocs: Bloc[] };

const SECTIONS: Section[] = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: "bienvenue",
    titre: { fr: "Bienvenue dans votre boutique", ar: "مرحبًا بك في متجرك" },
    chapeau: {
      fr: "Ce manuel vous apprend à tenir votre boutique. Rien d'autre.",
      ar: "يعلّمك هذا الدليل كيف تدير متجرك. لا أكثر.",
    },
    blocs: [
      {
        t: "p",
        fr: "Votre site a **deux faces**. La face publique, c'est ce que voient vos clients : l'accueil, les fiches produits, le panier. L'**administration**, c'est votre atelier : vous y ajoutez vos produits, vous y traitez vos commandes, vous y répondez à vos clients. C'est le même site, et tout communique : dès qu'un client valide sa commande, elle apparaît de votre côté.",
        ar: "لموقعك **وجهان**. الوجه العمومي هو ما يراه زبائنك: الصفحة الرئيسية، وبطاقات المنتجات، والسلة. أما **الإدارة** فهي ورشتك: فيها تضيف منتجاتك، وتعالج طلباتك، وتردّ على زبائنك. وهو موقع واحد، وكل شيء فيه متّصل: فما إن يؤكّد الزبون طلبه حتى يظهر عندك.",
      },
      {
        t: "p",
        fr: "Tout ce qui suit se fait **à la souris**, dans votre navigateur. Vous n'aurez jamais besoin d'écrire une ligne de commande, ni d'appeler un informaticien. Si une manipulation vous semble compliquée, c'est probablement que ce manuel l'a mal expliquée.",
        ar: "كل ما يلي يُنجَز **بالفأرة**، داخل متصفّحك. لن تحتاج أبدًا إلى كتابة أيّ أمر، ولا إلى الاستعانة بمختصّ في المعلوماتية. وإذا بدت لك خطوة معقّدة، فالأرجح أن هذا الدليل هو الذي أساء شرحها.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Ce que voient vos clients", "Ce que vous faites, vous"],
          ar: ["ما يراه زبائنك", "ما تفعله أنت"],
        },
        lignes: {
          fr: [
            [
              "Ils parcourent vos produits et les ajoutent au panier",
              "Vous créez et modifiez ces produits, leurs photos et leurs prix",
            ],
            [
              "Ils passent commande et choisissent la livraison",
              "Vous recevez la commande, la préparez et suivez son acheminement",
            ],
            [
              "Ils laissent un avis sur ce qu'ils ont acheté",
              "Vous lisez l'avis et décidez s'il s'affiche",
            ],
            [
              "Ils vous écrivent par le formulaire de contact",
              "Vous lisez leurs messages et y répondez",
            ],
            [
              "Ils lisent votre blog et vos pages de présentation",
              "Vous écrivez ces textes et changez ces images",
            ],
          ],
          ar: [
            [
              "يتصفّحون منتجاتك ويضيفونها إلى السلة",
              "تُنشئ هذه المنتجات وتعدّلها، بصورها وأسعارها",
            ],
            ["يقدّمون الطلب ويختارون طريقة التوصيل", "تستقبل الطلب وتُحضّره وتتابع إيصاله"],
            ["يتركون تقييمًا لما اشتروه", "تقرأ التقييم وتقرّر إن كان يُعرَض"],
            ["يراسلونك عبر استمارة الاتصال", "تقرأ رسائلهم وتردّ عليها"],
            ["يقرؤون مدوّنتك وصفحات التعريف بك", "تكتب هذه النصوص وتغيّر هذه الصور"],
          ],
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Comment lire ce manuel", ar: "كيف تقرأ هذا الدليل" },
        fr: "Vous n'avez pas à le lire d'un bout à l'autre. Le **sommaire** en haut vous emmène directement au chapitre dont vous avez besoin. Chaque tâche est décrite en étapes numérotées, et chaque procédure se termine par une phrase qui vous dit **comment savoir que ça a marché** — pour que vous ne restiez jamais dans le doute.",
        ar: "لستَ مضطرًّا إلى قراءته من أوّله إلى آخره. فـ**الفهرس** في الأعلى ينقلك مباشرةً إلى الفصل الذي تحتاجه. وكلّ مهمّة موصوفة في خطوات مرقّمة، وكلّ إجراء ينتهي بجملة تخبرك **كيف تعرف أن العملية نجحت** — حتى لا تبقى في شكّ أبدًا.",
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Le document est autonome", ar: "الوثيقة مستقلّة بذاتها" },
        fr: "Ce fichier contient tout : le texte, les images, les deux langues. Vous pouvez le copier sur une clé USB, l'envoyer par courriel, l'ouvrir sans connexion Internet. Il n'a besoin de rien d'autre. Le bouton **FR / العربية** en haut change de langue, et votre choix est retenu la prochaine fois que vous l'ouvrez.",
        ar: "يحتوي هذا الملف على كلّ شيء: النصّ والصور واللغتين. يمكنك نسخه على مفتاح USB، أو إرساله بالبريد الإلكتروني، أو فتحه دون اتصال بالإنترنت. فهو لا يحتاج إلى أيّ شيء آخر. والزرّ **FR / العربية** في الأعلى يبدّل اللغة، ويُحفَظ اختيارك للمرّة القادمة التي تفتحه فيها.",
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: "connexion",
    titre: { fr: "Se connecter et protéger son compte", ar: "تسجيل الدخول وحماية حسابك" },
    chapeau: {
      fr: "Votre compte est la clé de la boutique. Traitez-le comme la clé du magasin.",
      ar: "حسابك هو مفتاح المتجر. تعامل معه كما تتعامل مع مفتاح المحلّ.",
    },
    blocs: [
      {
        t: "procedure",
        titre: { fr: "Entrer dans l'administration", ar: "الدخول إلى الإدارة" },
        etapes: {
          fr: [
            "Ouvrez votre site, puis ajoutez `/auth` à la fin de son adresse (par exemple `votre-boutique.dz/auth`).",
            "Saisissez votre adresse électronique et votre mot de passe.",
            "Cliquez sur **Se connecter**.",
            "Ajoutez ensuite `/admin` à l'adresse de votre site pour arriver au tableau de bord. Mettez cette page en favori : vous y reviendrez tous les jours.",
          ],
          ar: [
            "افتح موقعك، ثم أضِف `/auth` في آخر عنوانه (مثلًا `votre-boutique.dz/auth`).",
            "أدخِل بريدك الإلكتروني وكلمة مرورك.",
            "انقر على **تسجيل الدخول**.",
            "ثم أضِف `/admin` إلى عنوان موقعك للوصول إلى لوحة التحكم. واجعل هذه الصفحة في المفضّلة: فستعود إليها كلّ يوم.",
          ],
        },
        reussi: {
          fr: "Vous voyez le tableau de bord, avec vos chiffres, et votre initiale en haut à droite de l'écran.",
          ar: "ترى لوحة التحكم بأرقامها، وتظهر الحرف الأول من اسمك أعلى يسار الشاشة.",
        },
      },
      {
        t: "figure",
        cle: "connexion",
        legende: {
          fr: "L'écran de connexion. Le lien **Mot de passe oublié** vous envoie un message pour en choisir un nouveau — utilisez-le plutôt que de multiplier les tentatives.",
          ar: "شاشة تسجيل الدخول. ورابط **نسيت كلمة المرور** يُرسل إليك رسالة لاختيار كلمة جديدة — استعمله بدل تكرار المحاولات.",
        },
      },
      {
        t: "p",
        fr: "**Changer votre mot de passe.** Cela se fait depuis l'écran **Utilisateurs et rôles** : vous ouvrez votre propre fiche, vous saisissez le nouveau mot de passe, vous enregistrez. Le chapitre consacré à votre équipe détaille cet écran.",
        ar: "**تغيير كلمة مرورك.** يتمّ ذلك من شاشة **المستخدمون والأدوار**: تفتح بطاقتك الخاصة، وتُدخِل كلمة المرور الجديدة، ثم تحفظ. ويفصّل الفصل المخصّص لفريقك هذه الشاشة.",
      },
      {
        t: "liste",
        fr: [
          "**Un bon mot de passe est long avant d'être compliqué.** Quatre mots sans rapport entre eux — « olive-marteau-Tlemcen-42 » — valent mieux qu'un mot court hérissé de symboles.",
          "**Il ne sert qu'ici.** Ne réutilisez jamais le mot de passe de votre boîte de courriel ou de votre banque.",
          "**Il ne se prête pas.** Si un employé a besoin d'entrer, créez-lui son propre compte : c'est gratuit, immédiat, et vous saurez ensuite qui a fait quoi.",
          "**Il ne s'écrit pas sur un papier collé à l'écran.** Un carnet rangé dans un tiroir fermé, ou un gestionnaire de mots de passe, font très bien l'affaire.",
        ],
        ar: [
          "**كلمة المرور الجيّدة طويلة قبل أن تكون معقّدة.** فأربع كلمات لا رابط بينها — «olive-marteau-Tlemcen-42» — خير من كلمة قصيرة مكتظّة بالرموز.",
          "**لا تُستعمل إلا هنا.** لا تُعِد أبدًا استعمال كلمة مرور بريدك الإلكتروني أو مصرفك.",
          "**لا تُعار.** إن احتاج أحد موظفيك إلى الدخول، فأنشئ له حسابه الخاص: فذلك مجّاني وفوريّ، وستعرف بعدها من فعل ماذا.",
          "**لا تُكتب على ورقة ملصقة بالشاشة.** يكفي دفتر في درج مقفل، أو برنامج لحفظ كلمات المرور.",
        ],
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "Si vous pensez qu'un mot de passe a fuité",
          ar: "إذا ظننتَ أن كلمة مرور قد تسرّبت",
        },
        fr: "Agissez tout de suite, dans cet ordre : **1)** changez votre propre mot de passe ; **2)** ouvrez **Utilisateurs et rôles** et désactivez tout compte que vous ne reconnaissez pas ; **3)** changez le mot de passe des comptes concernés ; **4)** ouvrez le **journal** et regardez ce qui a été fait dans les jours précédents. Ne supprimez rien avant d'avoir regardé le journal : il est votre seule mémoire de ce qui s'est passé.",
        ar: "تصرّف فورًا، وبهذا الترتيب: **1)** غيّر كلمة مرورك أنت؛ **2)** افتح **المستخدمون والأدوار** وعطّل كلّ حساب لا تعرفه؛ **3)** غيّر كلمات مرور الحسابات المعنيّة؛ **4)** افتح **سجل التدقيق** وانظر ما الذي جرى في الأيام السابقة. ولا تحذف شيئًا قبل مطالعة السجل: فهو ذاكرتك الوحيدة لما حدث.",
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Fermez votre session", ar: "أغلِق جلستك" },
        fr: "Sur un ordinateur partagé — un poste de la boutique, un cybercafé — pensez à cliquer sur votre initiale en haut de l'écran puis sur **Déconnexion** en partant. Fermer l'onglet ne suffit pas toujours.",
        ar: "على حاسوب مشترك — جهاز في المحلّ أو في مقهى إنترنت — تذكّر أن تنقر على الحرف الأول من اسمك أعلى الشاشة ثم على **تسجيل الخروج** قبل المغادرة. فإغلاق التبويب لا يكفي دائمًا.",
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: "tableau-de-bord",
    titre: { fr: "Le tableau de bord", ar: "لوحة التحكم" },
    chapeau: {
      fr: "L'état de votre boutique en un coup d'œil, chaque matin.",
      ar: "حالة متجرك في لمحة واحدة، كلّ صباح.",
    },
    blocs: [
      {
        t: "p",
        fr: "C'est la première page qui s'affiche quand vous entrez dans l'administration. Elle ne vous demande rien : elle vous **raconte** où en est votre boutique. Prenez l'habitude de la regarder en arrivant ; trois chiffres suffisent à savoir si votre journée sera calme ou chargée.",
        ar: "هي أول صفحة تظهر لك عند دخولك الإدارة. لا تطلب منك شيئًا: بل **تحكي** لك أين وصل متجرك. اعتد النظر إليها عند وصولك؛ فثلاثة أرقام تكفي لتعرف إن كان يومك هادئًا أم حافلًا.",
      },
      {
        t: "figure",
        cle: "tableau-de-bord",
        legende: {
          fr: "Le tableau de bord. En haut, les cartes de chiffres ; au milieu, la courbe des ventes des trente derniers jours ; en bas, la répartition de vos produits et les dernières commandes reçues.",
          ar: "لوحة التحكم. في الأعلى بطاقات الأرقام؛ وفي الوسط منحنى المبيعات في الثلاثين يومًا الأخيرة؛ وفي الأسفل توزيع منتجاتك وآخر الطلبات الواردة.",
        },
      },
      {
        t: "tableau",
        entetes: {
          fr: ["La carte", "Ce qu'elle vous dit", "Ce que vous en faites"],
          ar: ["البطاقة", "ماذا تخبرك", "ماذا تفعل بها"],
        },
        lignes: {
          fr: [
            [
              "Commandes en attente",
              "Le nombre de commandes que personne n'a encore traitées.",
              "Si ce chiffre monte, ouvrez l'écran **Commandes** sans tarder.",
            ],
            [
              "Chiffre d'affaires",
              "Le total encaissé sur la période.",
              "Comparez-le d'une semaine à l'autre, c'est là qu'il parle.",
            ],
            [
              "Stock faible",
              "Le nombre de produits dont il reste très peu d'unités.",
              "Réapprovisionnez avant la rupture, ou masquez le produit.",
            ],
            [
              "Avis à modérer",
              "Des clients ont écrit, personne n'a encore validé.",
              "Un avis en attente ne s'affiche pas sur le site : traitez-le vite.",
            ],
            [
              "Clients",
              "Le nombre de comptes clients enregistrés.",
              "Il grandit lentement, c'est normal ; une chute est anormale.",
            ],
            [
              "Coupons actifs",
              "Les codes de réduction en cours de validité.",
              "Vérifiez qu'aucune promotion oubliée ne tourne encore.",
            ],
          ],
          ar: [
            [
              "الطلبات المعلّقة",
              "عدد الطلبات التي لم يعالجها أحد بعد.",
              "إذا ارتفع هذا الرقم فافتح شاشة **الطلبات** دون تأخير.",
            ],
            [
              "رقم الأعمال",
              "مجموع ما تمّ تحصيله خلال المدة.",
              "قارنه من أسبوع إلى آخر، فعندئذٍ يصبح ذا دلالة.",
            ],
            [
              "مخزون منخفض",
              "عدد المنتجات التي لم يبقَ منها إلا القليل.",
              "أعِد التموين قبل نفاد المخزون، أو أخفِ المنتج.",
            ],
            [
              "تقييمات في انتظار المراجعة",
              "كتب زبائن تقييمات ولم يصادق عليها أحد بعد.",
              "التقييم المعلّق لا يظهر في الموقع: عالجه سريعًا.",
            ],
            [
              "العملاء",
              "عدد حسابات الزبائن المسجّلة.",
              "ينمو ببطء، وهذا طبيعي؛ أما انخفاضه فغير طبيعي.",
            ],
            [
              "قسائم نشطة",
              "رموز الخصم السارية حاليًا.",
              "تحقّق من ألّا يكون هناك عرض منسيّ لا يزال يعمل.",
            ],
          ],
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Deux écrans pour aller plus loin", ar: "شاشتان للتعمّق أكثر" },
        fr: "**Analytique** montre les mêmes ventes sous forme de courbes détaillées : produits les plus vendus, wilayas qui commandent le plus. **Rapports** transforme chacune de vos listes — ventes, clients, stock, coupons, avis — en fichier tableur que vous ouvrez dans Excel ou LibreOffice. Aucun des deux n'est nécessaire au quotidien : ils servent quand vous vous posez une question précise, ou en fin de mois.",
        ar: "تعرض **التحليلات** المبيعات نفسها في شكل منحنيات مفصّلة: أكثر المنتجات مبيعًا، والولايات الأكثر طلبًا. أما **التقارير** فتحوّل كلّ قائمة من قوائمك — المبيعات والعملاء والمخزون والقسائم والتقييمات — إلى ملفّ جداول تفتحه في Excel أو LibreOffice. وليست أيّ منهما ضرورية في العمل اليومي: بل تُستعمَلان حين يخطر لك سؤال محدّد، أو في نهاية الشهر.",
      },
      {
        t: "figure",
        cle: "analytique",
        legende: {
          fr: "L'écran **Analytique** : l'évolution des ventes, les produits qui partent le mieux et la répartition géographique de vos commandes.",
          ar: "شاشة **التحليلات**: تطوّر المبيعات، والمنتجات الأكثر رواجًا، والتوزيع الجغرافي لطلباتك.",
        },
      },
      {
        t: "figure",
        cle: "rapports",
        legende: {
          fr: "L'écran **Rapports** : une carte par liste, un bouton par carte. Le fichier obtenu s'ouvre directement dans un tableur, accents compris.",
          ar: "شاشة **التقارير**: بطاقة لكلّ قائمة، وزرّ لكلّ بطاقة. والملفّ الناتج يُفتَح مباشرةً في برنامج الجداول، بحروفه المشكولة كاملةً.",
        },
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: "reperes",
    titre: { fr: "Se repérer dans l'administration", ar: "التنقّل داخل الإدارة" },
    chapeau: {
      fr: "Un menu, six familles. Une fois la logique comprise, vous ne cherchez plus.",
      ar: "قائمة واحدة، وستّ عائلات. ومتى فهمتَ المنطق لن تبحث بعدها عن شيء.",
    },
    blocs: [
      {
        t: "p",
        fr: "Toute l'administration tient dans le menu de gauche. Il est rangé en six familles, de la plus large à la plus technique. Vous passerez l'essentiel de votre temps dans **Ventes** et **Catalogue**.",
        ar: "تتلخّص الإدارة كلّها في القائمة الجانبية. وهي مرتّبة في ستّ عائلات، من الأوسع إلى الأكثر تخصّصًا. وستقضي معظم وقتك في **المبيعات** و**الكتالوج**.",
      },
      {
        t: "figure",
        cle: "menu",
        legende: {
          fr: "Le menu de l'administration, dans son entier. Sur un téléphone ou une petite fenêtre, il se replie derrière un bouton en haut à gauche.",
          ar: "قائمة الإدارة كاملةً. وعلى الهاتف أو في نافذة صغيرة تنطوي خلف زرّ أعلى اليمين.",
        },
      },
      {
        t: "tableau",
        entetes: { fr: ["Famille", "Ce qu'on y trouve"], ar: ["العائلة", "ما تجده فيها"] },
        lignes: {
          fr: [
            ["Vue d'ensemble", "Tableau de bord, Analytique, Rapports."],
            ["Catalogue", "Produits, Catégories, Marques, Stock, Médias."],
            ["Ventes", "Commandes, Clients, Coupons, Livraison, Paiements."],
            ["Relation client", "Messages de contact, Newsletter."],
            ["Contenu", "Contenu du site, Blog, Avis."],
            ["Système", "Utilisateurs et rôles, Notifications, Journal d'audit, Paramètres."],
          ],
          ar: [
            ["نظرة عامة", "لوحة التحكم، التحليلات، التقارير."],
            ["الكتالوج", "المنتجات، الفئات، الماركات، المخزون، الوسائط."],
            ["المبيعات", "الطلبات، العملاء، قسائم الخصم، التوصيل، المدفوعات."],
            ["علاقات العملاء", "رسائل التواصل، النشرة البريدية."],
            ["المحتوى", "محتوى الموقع، المدونة، التقييمات."],
            ["النظام", "المستخدمون والأدوار، الإشعارات، سجل التدقيق، الإعدادات."],
          ],
        },
      },
      {
        t: "liste",
        fr: [
          "**Le fil en haut de page** vous rappelle où vous êtes et vous ramène en arrière d'un clic.",
          "**La cloche** signale les événements qui vous attendent : une commande, un stock qui baisse.",
          "**Votre initiale**, tout en haut, ouvre le menu de votre compte et le bouton de déconnexion.",
          "**Le sélecteur « Simuler un rôle »** est un outil de mise au point : il permet seulement de vous rétrograder pour voir l'écran comme le verrait un employé. Il n'accorde jamais de droit supplémentaire à personne. Vous pouvez l'ignorer.",
        ],
        ar: [
          "**مسار التصفح** أعلى الصفحة يذكّرك بموضعك ويعيدك إلى الوراء بنقرة واحدة.",
          "**الجرس** ينبّهك إلى الأحداث التي تنتظرك: طلبٌ جديد، أو مخزون يتناقص.",
          "**الحرف الأول من اسمك** في الأعلى يفتح قائمة حسابك وزرّ تسجيل الخروج.",
          "**مُبدِّل «محاكاة دور»** أداة للضبط: لا يتيح إلا تخفيض دورك أنت لترى الشاشة كما يراها موظّف. وهو لا يمنح أحدًا أيّ صلاحية إضافية أبدًا. ويمكنك تجاهله.",
        ],
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: "produits",
    titre: { fr: "Vos produits", ar: "منتجاتك" },
    chapeau: {
      fr: "Ajouter, corriger, photographier, fixer un prix : le cœur du métier.",
      ar: "الإضافة والتصحيح والتصوير وتحديد السعر: جوهر المهنة.",
    },
    blocs: [
      {
        t: "figure",
        cle: "produits",
        legende: {
          fr: "La liste des produits. La recherche et les filtres en haut, le prix et le stock sur chaque ligne, et les actions à droite de chacune.",
          ar: "قائمة المنتجات. البحث والمرشّحات في الأعلى، والسعر والمخزون في كلّ سطر، والإجراءات على جانب كلّ سطر.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Ajouter un produit", ar: "إضافة منتج" },
        etapes: {
          fr: [
            "Menu **Catalogue → Produits**, puis le bouton **Nouveau produit** en haut à droite.",
            "Renseignez le **nom** dans les trois langues. Si vous ne parlez pas anglais, recopiez le nom français : il vaut mieux un nom compréhensible qu'une case vide.",
            "Choisissez la **catégorie** et la **marque** dans les listes déroulantes. Si celle qu'il vous faut n'existe pas, créez-la d'abord (voir le chapitre suivant).",
            "Saisissez le **prix** en dinars, sans espace ni virgule. Pour afficher un prix barré, remplissez aussi le champ **ancien prix**.",
            "Indiquez la **quantité en stock**. C'est elle qui empêchera de vendre un article que vous n'avez plus.",
            "Ajoutez une **photo** : glissez le fichier dans la zone prévue, ou choisissez une image déjà présente dans vos médias.",
            "Complétez la **description** et les **caractéristiques** — c'est ce que le client lit avant d'acheter.",
            "Cliquez sur **Enregistrer**.",
          ],
          ar: [
            "القائمة **الكتالوج ← المنتجات**، ثم زرّ **منتج جديد** في الأعلى.",
            "أدخِل **الاسم** باللغات الثلاث. وإن كنتَ لا تتقن الإنجليزية فانسخ الاسم الفرنسي: فاسمٌ مفهوم خير من خانة فارغة.",
            "اختر **الفئة** و**الماركة** من القوائم المنسدلة. وإن لم تكن الفئة التي تريدها موجودة فأنشئها أولًا (انظر الفصل التالي).",
            "أدخِل **السعر** بالدينار، دون فراغ ولا فاصلة. ولعرض سعر مشطوب، املأ أيضًا خانة **السعر القديم**.",
            "حدّد **الكمية المتوفّرة في المخزون**. فهي التي تمنع بيع سلعة لم تعد لديك.",
            "أضِف **صورة**: اسحب الملف إلى المساحة المخصّصة، أو اختر صورة موجودة سلفًا في وسائطك.",
            "أكمِل **الوصف** و**الخصائص** — فهذا ما يقرأه الزبون قبل الشراء.",
            "انقر على **حفظ**.",
          ],
        },
        reussi: {
          fr: "Le produit apparaît en tête de la liste, et vous le retrouvez sur la face publique du site en ouvrant sa catégorie.",
          ar: "يظهر المنتج في أعلى القائمة، وتجده في الوجه العمومي للموقع عند فتح فئته.",
        },
      },
      {
        t: "figure",
        cle: "produit-formulaire",
        legende: {
          fr: "Le formulaire d'un produit. Les trois onglets de langue pour le nom et la description, le prix, le stock, la photo et les caractéristiques techniques.",
          ar: "استمارة المنتج. ألسنة اللغات الثلاث للاسم والوصف، ثم السعر والمخزون والصورة والخصائص التقنية.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Changer un prix", ar: "تغيير سعر" },
        etapes: {
          fr: [
            "Ouvrez **Produits**, trouvez l'article — la barre de recherche accepte le nom ou une partie du nom.",
            "Cliquez sur l'icône de modification au bout de la ligne.",
            "Modifiez le champ **prix**. Pour annoncer une promotion, mettez l'ancien montant dans **ancien prix** et le nouveau dans **prix**.",
            "Enregistrez.",
          ],
          ar: [
            "افتح **المنتجات**، وابحث عن السلعة — يقبل شريط البحث الاسم أو جزءًا منه.",
            "انقر على أيقونة التعديل في آخر السطر.",
            "عدّل خانة **السعر**. وللإعلان عن تخفيض، ضع المبلغ القديم في **السعر القديم** والجديد في **السعر**.",
            "احفظ.",
          ],
        },
        reussi: {
          fr: "Le nouveau prix s'affiche dans la liste et, en rafraîchissant la fiche publique du produit, le client voit l'ancien prix barré à côté du nouveau.",
          ar: "يظهر السعر الجديد في القائمة، وعند تحديث البطاقة العمومية للمنتج يرى الزبون السعر القديم مشطوبًا إلى جانب الجديد.",
        },
      },
      {
        t: "figure",
        cle: "produit-fiche",
        legende: {
          fr: "La fiche récapitulative d'un produit, telle que vous la voyez côté administration : ses informations, son stock et son historique.",
          ar: "البطاقة الموجزة لمنتج كما تراها في جهة الإدارة: معلوماته ومخزونه وتاريخه.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Vos photos", ar: "صورك" },
        fr: "Une bonne photo de produit est **nette, cadrée sur l'objet, sur fond clair et uni**. Évitez les images très lourdes : au-delà de quelques centaines de kilo-octets, la page met du temps à s'afficher et le client s'en va. L'écran **Médias** rassemble toutes les images que vous avez déposées ; vous pouvez y réutiliser une photo sans la renvoyer deux fois.",
        ar: "الصورة الجيّدة للمنتج **واضحة، مؤطّرة على الشيء نفسه، بخلفية فاتحة وموحّدة**. وتجنّب الصور الثقيلة جدًّا: فما تجاوز بضع مئات من الكيلوبايت يُبطئ ظهور الصفحة فينصرف الزبون. وتجمع شاشة **الوسائط** كلّ الصور التي رفعتَها؛ ويمكنك إعادة استعمال صورة منها دون رفعها مرّتين.",
      },
      {
        t: "figure",
        cle: "medias",
        legende: {
          fr: "L'écran **Médias** : toutes vos images au même endroit, réutilisables d'un produit à l'autre.",
          ar: "شاشة **الوسائط**: كلّ صورك في مكان واحد، قابلة لإعادة الاستعمال من منتج إلى آخر.",
        },
      },
      {
        t: "encadre",
        genre: "danger",
        titre: { fr: "Supprimer un produit", ar: "حذف منتج" },
        fr: "La suppression est **définitive** : ni le produit, ni sa description, ni ses avis ne reviendront. Dans presque tous les cas, vous ne voulez pas supprimer — vous voulez **retirer de la vente**. Mettez le stock à zéro, ou passez le produit en indisponible : il disparaît de la boutique, mais son historique et ses anciennes commandes restent intacts.",
        ar: "الحذف **نهائي**: فلن يعود المنتج ولا وصفه ولا تقييماته. وفي جميع الحالات تقريبًا أنت لا تريد الحذف — بل تريد **سحب المنتج من البيع**. اجعل المخزون صفرًا، أو حوّل المنتج إلى غير متوفّر: عندئذٍ يختفي من المتجر، لكن تاريخه وطلباته السابقة تبقى سليمة.",
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: "stock",
    titre: { fr: "Le stock", ar: "المخزون" },
    chapeau: {
      fr: "Savoir ce qu'il vous reste, et ne jamais vendre ce que vous n'avez plus.",
      ar: "أن تعرف ما بقي لديك، وألّا تبيع أبدًا ما لم يعد عندك.",
    },
    blocs: [
      {
        t: "p",
        fr: "Chaque produit porte une quantité. Elle **baisse toute seule** à chaque commande : vous n'avez rien à faire. Vous n'intervenez que dans deux cas — quand vous recevez une livraison de votre fournisseur, et quand vous constatez un écart entre le compte et la réalité de vos étagères.",
        ar: "يحمل كلّ منتج كمّية. وهي **تنقص تلقائيًا** مع كلّ طلب: فليس عليك أن تفعل شيئًا. ولا تتدخّل إلا في حالتين — عند استلامك شحنة من مورّدك، وعند ملاحظتك فرقًا بين الحساب وواقع رفوفك.",
      },
      {
        t: "figure",
        cle: "stock",
        legende: {
          fr: "L'écran **Stock**. Les articles en tension apparaissent signalés : c'est votre liste de courses.",
          ar: "شاشة **المخزون**. تظهر السلع الشحيحة موسومةً بتنبيه: وهي قائمة مشترياتك.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Corriger une quantité", ar: "تصحيح كمّية" },
        etapes: {
          fr: [
            "Menu **Catalogue → Stock**.",
            "Trouvez l'article concerné.",
            "Saisissez l'ajustement : un nombre positif quand vous recevez de la marchandise, négatif quand vous constatez une perte ou une casse.",
            "Indiquez brièvement la raison — « réception fournisseur », « inventaire du mois », « article endommagé ». Vous vous remercierez dans six mois.",
            "Validez.",
          ],
          ar: [
            "القائمة **الكتالوج ← المخزون**.",
            "ابحث عن السلعة المعنيّة.",
            "أدخِل التعديل: عددًا موجبًا عند استلامك بضاعة، وسالبًا عند معاينة ضياع أو تلف.",
            "اذكر السبب باختصار — «استلام من المورّد»، «جرد الشهر»، «سلعة تالفة». ستشكر نفسك بعد ستّة أشهر.",
            "أكِّد.",
          ],
        },
        reussi: {
          fr: "La nouvelle quantité s'affiche immédiatement, et le mouvement apparaît dans l'historique de l'écran avec la raison que vous avez saisie.",
          ar: "تظهر الكمّية الجديدة فورًا، وتُدرَج الحركة في سجلّ الشاشة مصحوبةً بالسبب الذي أدخلتَه.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Le seuil d'alerte", ar: "عتبة التنبيه" },
        fr: "Dans **Paramètres**, vous fixez à partir de quelle quantité un article est considéré « en tension ». Cinq unités est un bon point de départ pour du matériel informatique ; ajustez selon vos délais de réapprovisionnement. Les articles sous le seuil remontent sur le tableau de bord et dans la cloche des notifications.",
        ar: "في **الإعدادات** تحدّد الكمّية التي تُعتبَر السلعة دونها «شحيحة». وخمس وحدات نقطةُ انطلاق مناسبة للعتاد المعلوماتي؛ عدّلها بحسب مُهَل تموينك. والسلع التي تنزل تحت العتبة تظهر في لوحة التحكم وفي جرس الإشعارات.",
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "La règle qui vous protège", ar: "القاعدة التي تحميك" },
        fr: "Si deux clients commandent en même temps le dernier exemplaire, **un seul des deux passera**. Le second reçoit un refus clair au lieu d'une commande impossible à honorer. C'est voulu : mieux vaut une vente perdue qu'un client déçu et une commande à annuler.",
        ar: "إذا طلب زبونان في الوقت نفسه آخر نسخة متوفّرة، فإنّ **واحدًا منهما فقط سيمرّ**. ويتلقّى الثاني رفضًا واضحًا بدل طلب يستحيل الوفاء به. وهذا مقصود: فخسارة بيعة خير من زبون خائب وطلبٍ يُلغى.",
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: "categories-marques",
    titre: { fr: "Catégories et marques", ar: "الفئات والماركات" },
    chapeau: {
      fr: "Les rayons de votre magasin. Peu nombreux, clairs, stables.",
      ar: "أقسام محلّك. قليلة العدد، واضحة، ثابتة.",
    },
    blocs: [
      {
        t: "p",
        fr: "Une **catégorie** est un rayon : ordinateurs portables, téléphones, postes de bureau. Une **marque** est un fabricant : ASUS, Apple, Samsung. Vos clients s'en servent pour filtrer, et votre menu public s'appuie dessus. Restez sobre : sept ou huit catégories bien nommées valent mieux que trente qui se chevauchent.",
        ar: "**الفئة** هي رفّ: حواسيب محمولة، هواتف، حواسيب مكتبية. و**الماركة** هي الصانع: ASUS، Apple، Samsung. يستعملهما زبائنك في التصفية، وتقوم عليهما قائمتك العمومية. فتوخَّ الاقتصاد: سبع أو ثماني فئات حسنة التسمية خير من ثلاثين متداخلة.",
      },
      {
        t: "figure",
        cle: "categories",
        legende: {
          fr: "Les catégories, avec le nombre de produits que chacune contient. Une catégorie vide ne sert à rien : soit vous la remplissez, soit vous la retirez.",
          ar: "الفئات، ومعها عدد المنتجات في كلّ واحدة. والفئة الفارغة لا فائدة منها: فإمّا أن تملأها وإمّا أن تحذفها.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Créer une catégorie", ar: "إنشاء فئة" },
        etapes: {
          fr: [
            "Menu **Catalogue → Catégories**, puis **Nouvelle catégorie**.",
            "Saisissez le nom dans les trois langues.",
            "Ajoutez une image d'illustration si vous en avez une : elle habille la page de la catégorie.",
            "Enregistrez, puis rattachez-y vos produits depuis leur fiche.",
          ],
          ar: [
            "القائمة **الكتالوج ← الفئات**، ثم **فئة جديدة**.",
            "أدخِل الاسم باللغات الثلاث.",
            "أضِف صورة توضيحية إن توفّرت لديك: فهي تزيّن صفحة الفئة.",
            "احفظ، ثم اربط بها منتجاتك من بطاقة كلّ منتج.",
          ],
        },
        reussi: {
          fr: "La catégorie apparaît dans la liste, et le compteur de produits passe de zéro à un dès que vous y rattachez le premier article.",
          ar: "تظهر الفئة في القائمة، ويتحوّل عدّاد المنتجات من صفر إلى واحد بمجرّد ربطك أول سلعة بها.",
        },
      },
      {
        t: "figure",
        cle: "marques",
        legende: {
          fr: "Les marques. Le logo que vous déposez ici est celui qui défile sur la page d'accueil de votre site.",
          ar: "الماركات. والشعار الذي ترفعه هنا هو الذي يمرّ في الصفحة الرئيسية لموقعك.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "Renommer plutôt que recréer",
          ar: "أعِد التسمية بدل إعادة الإنشاء",
        },
        fr: "Si le nom d'un rayon ne vous convient plus, **modifiez-le** : les produits qui s'y trouvent suivent tout seuls. Créer une nouvelle catégorie et déplacer les produits un par un vous fera perdre une heure pour le même résultat.",
        ar: "إن لم يعُد اسم أحد الأرفف يناسبك، فـ**عدّله**: فالمنتجات التي فيه تتبعه تلقائيًا. أما إنشاء فئة جديدة ونقل المنتجات واحدًا واحدًا فيضيّع عليك ساعة من أجل النتيجة نفسها.",
      },
    ],
  },
];

// La suite du document. Découpée en plusieurs poussées pour que chaque famille
// de sujets reste lisible dans ce fichier — c'est la première condition pour
// que le texte soit tenu à jour.

SECTIONS.push(
  // ── 8 ───────────────────────────────────────────────────────────────────
  {
    id: "commandes",
    titre: { fr: "Les commandes", ar: "الطلبات" },
    chapeau: {
      fr: "De la réception à la livraison : le chapitre que vous ouvrirez le plus souvent.",
      ar: "من الاستلام إلى التسليم: الفصل الذي ستفتحه أكثر من غيره.",
    },
    blocs: [
      {
        t: "p",
        fr: "Quand un client valide son panier, sa commande arrive immédiatement dans l'écran **Ventes → Commandes**, avec le statut **En attente**. Elle vous attend. Le stock des articles a déjà été décompté : personne d'autre ne peut acheter ce que ce client vient de réserver.",
        ar: "عندما يؤكّد الزبون سلّته، يصل طلبه فورًا إلى شاشة **المبيعات ← الطلبات**، بالحالة **قيد الانتظار**. وهو ينتظرك. وقد خُصِم مخزون السلع سلفًا: فلا يستطيع أحد آخر شراء ما حجزه هذا الزبون للتوّ.",
      },
      {
        t: "figure",
        cle: "commandes",
        legende: {
          fr: "La liste des commandes. Les onglets du haut comptent les commandes par statut : c'est le moyen le plus rapide de voir ce qui reste à traiter.",
          ar: "قائمة الطلبات. وتُحصي الألسنة في الأعلى الطلبات حسب الحالة: وهي أسرع وسيلة لمعرفة ما تبقّى للمعالجة.",
        },
      },
      {
        t: "p",
        fr: "**Les cinq statuts.** Ils racontent le voyage d'une commande, et le client voit exactement le même mot que vous depuis son espace « Mon compte ». Changer le statut, ce n'est donc pas seulement ranger : c'est **informer votre client**.",
        ar: "**الحالات الخمس.** تحكي رحلة الطلب، ويرى الزبون الكلمة نفسها التي تراها أنت من فضاء «حسابي». فتغيير الحالة ليس ترتيبًا فحسب: بل هو **إخبار لزبونك**.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Statut", "Ce qu'il signifie", "Quand le poser"],
          ar: ["الحالة", "ماذا تعني", "متى تضعها"],
        },
        lignes: {
          fr: [
            [
              "En attente",
              "La commande est arrivée, personne ne l'a encore regardée.",
              "C'est le statut de départ, posé tout seul.",
            ],
            [
              "En traitement",
              "Vous avez vu la commande et vous préparez le colis.",
              "Dès que vous commencez à la préparer.",
            ],
            [
              "Expédiée",
              "Le colis est parti chez le transporteur.",
              "Le jour où vous remettez le colis.",
            ],
            [
              "Livrée",
              "Le client a reçu sa commande.",
              "À la confirmation du transporteur, ou du client.",
            ],
            [
              "Annulée",
              "La commande ne sera pas honorée.",
              "Rupture, client injoignable, demande d'annulation.",
            ],
          ],
          ar: [
            [
              "قيد الانتظار",
              "وصل الطلب ولم ينظر فيه أحد بعد.",
              "هي حالة البداية، وتُوضَع تلقائيًا.",
            ],
            ["قيد المعالجة", "اطّلعتَ على الطلب وأنت تحضّر الطرد.", "بمجرّد شروعك في التحضير."],
            ["تم الشحن", "غادر الطرد إلى شركة النقل.", "في اليوم الذي تسلّم فيه الطرد."],
            ["تم التسليم", "استلم الزبون طلبه.", "عند تأكيد الناقل أو الزبون."],
            ["ملغى", "لن يُنفَّذ الطلب.", "نفاد المخزون، تعذّر الاتصال بالزبون، أو طلب إلغاء."],
          ],
        },
      },
      {
        t: "figure",
        cle: "commande-nouvelle",
        legende: {
          fr: "Une commande qui vient d'arriver, encore **En attente** : le détail des articles, le total, les coordonnées du client et l'adresse de livraison.",
          ar: "طلب وصل للتوّ، ولا يزال **قيد الانتظار**: تفصيل السلع، والمجموع، وبيانات الزبون، وعنوان التسليم.",
        },
      },
      {
        t: "procedure",
        titre: {
          fr: "Traiter une commande, du début à la fin",
          ar: "معالجة طلب من أوّله إلى آخره",
        },
        etapes: {
          fr: [
            "Menu **Ventes → Commandes**. Cliquez sur l'onglet **En attente** pour ne voir que le travail à faire.",
            "Ouvrez la commande d'un clic sur sa ligne. Vérifiez les articles, le total, le mode de paiement et l'adresse.",
            "Appelez le client au numéro indiqué pour confirmer — en Algérie, c'est ce qui fait chuter les colis refusés.",
            "Passez le statut à **En traitement**, puis préparez le colis.",
            "Une fois le colis remis au transporteur, passez le statut à **Expédiée** et notez le numéro de suivi dans la commande.",
            "Quand la livraison est confirmée, passez le statut à **Livrée**.",
          ],
          ar: [
            "القائمة **المبيعات ← الطلبات**. انقر على لسان **قيد الانتظار** لترى العمل المطلوب وحده.",
            "افتح الطلب بنقرة على سطره. تحقّق من السلع والمجموع وطريقة الدفع والعنوان.",
            "اتّصل بالزبون على الرقم المذكور للتأكيد — ففي الجزائر هذا ما يقلّص الطرود المرفوضة.",
            "حوّل الحالة إلى **قيد المعالجة**، ثم حضّر الطرد.",
            "بعد تسليم الطرد إلى الناقل، حوّل الحالة إلى **تم الشحن** ودوّن رقم التتبّع في الطلب.",
            "وعند تأكيد التسليم، حوّل الحالة إلى **تم التسليم**.",
          ],
        },
        reussi: {
          fr: "Le suivi de la commande affiche chaque étape avec sa date, l'onglet **En attente** a perdu une unité, et le client voit le nouveau statut depuis son compte.",
          ar: "يعرض تتبّع الطلب كلّ مرحلة بتاريخها، ويَنقص لسان **قيد الانتظار** وحدةً واحدة، ويرى الزبون الحالة الجديدة من حسابه.",
        },
      },
      {
        t: "figure",
        cle: "commande-fiche",
        legende: {
          fr: "La fiche complète d'une commande expédiée. À gauche les articles et les montants, à droite le client, la livraison et l'historique des statuts, daté étape par étape.",
          ar: "البطاقة الكاملة لطلب تمّ شحنه. في جهةٍ السلع والمبالغ، وفي الأخرى الزبون والتوصيل وتاريخ الحالات مؤرَّخًا مرحلةً مرحلة.",
        },
      },
      {
        t: "figure",
        cle: "commande-statut",
        legende: {
          fr: "Le cadre qui sert à faire avancer une commande : choisissez le nouveau statut dans la liste, confirmez, et l'étape s'inscrit dans le suivi.",
          ar: "الإطار الذي يُستعمَل لتقديم الطلب خطوةً: اختر الحالة الجديدة من القائمة، وأكِّد، فتُسجَّل المرحلة في التتبّع.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Suivre une livraison", ar: "متابعة عملية توصيل" },
        fr: "Le numéro que votre transporteur vous remet se note dans la commande, au moment où vous la passez en **Expédiée**. Le client le retrouve dans son espace personnel et peut suivre son colis lui-même — c'est autant d'appels téléphoniques que vous ne recevrez pas.",
        ar: "الرقم الذي يسلّمه لك الناقل يُدوَّن في الطلب لحظة تحويله إلى **تم الشحن**. ويجده الزبون في فضائه الشخصي فيتابع طرده بنفسه — وهذا يوفّر عليك مكالمات هاتفية كثيرة.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: { fr: "Annuler n'est pas supprimer", ar: "الإلغاء ليس حذفًا" },
        fr: "**Annuler** une commande la garde dans vos registres avec la mention « Annulée » : vous savez ce qui s'est passé, et vos totaux restent justes. **Supprimer** l'efface pour toujours — la vente disparaît de votre historique et de vos chiffres. Dans une boutique, on annule ; on ne supprime qu'une commande de test.",
        ar: "**إلغاء** الطلب يُبقيه في سجلّاتك بعبارة «ملغى»: فتعرف ما جرى، وتبقى مجاميعك صحيحة. أما **الحذف** فيمحوه إلى الأبد — فتختفي البيعة من تاريخك ومن أرقامك. وفي المتجر يُلغى الطلب؛ ولا يُحذف إلا طلب تجريبي.",
      },
    ],
  },

  // ── 9 ───────────────────────────────────────────────────────────────────
  {
    id: "clients",
    titre: { fr: "Vos clients", ar: "زبائنك" },
    chapeau: {
      fr: "Qui achète chez vous, combien, et depuis quand.",
      ar: "من يشتري منك، وبكم، ومنذ متى.",
    },
    blocs: [
      {
        t: "p",
        fr: "Chaque personne qui commande chez vous a une fiche : ses coordonnées, sa wilaya, le nombre de commandes passées et le total dépensé. Vous n'avez rien à saisir — la fiche se crée toute seule à la première commande.",
        ar: "لكلّ شخص يطلب منك بطاقة: بياناته، وولايته، وعدد طلباته، ومجموع ما أنفقه. ولستَ مطالبًا بإدخال شيء — إذ تُنشَأ البطاقة تلقائيًا عند أول طلب.",
      },
      {
        t: "figure",
        cle: "clients",
        legende: {
          fr: "La liste des clients, triable par nombre de commandes ou par montant dépensé. C'est ainsi qu'on repère ses meilleurs acheteurs.",
          ar: "قائمة العملاء، قابلة للترتيب حسب عدد الطلبات أو المبلغ المُنفَق. وهكذا تُعرَف أفضل المشترين.",
        },
      },
      {
        t: "liste",
        fr: [
          "**Cliquez sur un client** pour voir toutes ses commandes réunies : pratique avant de rappeler quelqu'un.",
          "**Triez par montant dépensé** pour identifier les clients à qui offrir un geste commercial.",
          "**Corrigez un numéro de téléphone** directement dans la fiche quand un client vous signale une erreur.",
        ],
        ar: [
          "**انقر على زبون** لترى كلّ طلباته مجتمعة: وهذا مفيد قبل معاودة الاتصال بأحدهم.",
          "**رتّب حسب المبلغ المُنفَق** لتحديد الزبائن الذين يستحقّون لفتة تجارية.",
          "**صحّح رقم هاتف** مباشرةً في البطاقة عندما ينبّهك زبون إلى خطأ.",
        ],
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Les données de vos clients", ar: "بيانات زبائنك" },
        fr: "Un nom, un numéro et une adresse sont des informations personnelles. Ne les transmettez à personne en dehors de ce dont votre transporteur a besoin pour livrer, et n'exportez pas la liste sur une clé USB qui traîne. Un client dont les coordonnées circulent ne revient pas.",
        ar: "الاسم والرقم والعنوان معلومات شخصية. فلا تُسلِّمها لأحد خارج ما يحتاجه ناقلك للتوصيل، ولا تصدّر القائمة إلى مفتاح USB متروك في أيّ مكان. فالزبون الذي تنتشر بياناته لا يعود.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: { fr: "Supprimer un client", ar: "حذف زبون" },
        fr: "Vous ne pourrez pas supprimer un client dont une commande est encore en cours — le site vous en empêchera, et il a raison. Pour les autres, la suppression est définitive : ses commandes passées perdent leur rattachement. Ne le faites que sur demande explicite de la personne.",
        ar: "لن تتمكّن من حذف زبون له طلب لا يزال جاريًا — سيمنعك الموقع من ذلك، وهو محقّ. أما الباقون فالحذف بشأنهم نهائي: إذ تفقد طلباته السابقة ارتباطها به. فلا تفعل ذلك إلا بطلب صريح من الشخص نفسه.",
      },
    ],
  },

  // ── 10 ──────────────────────────────────────────────────────────────────
  {
    id: "coupons",
    titre: { fr: "Les coupons de réduction", ar: "قسائم الخصم" },
    chapeau: {
      fr: "Un code, une remise, des limites que vous fixez vous-même.",
      ar: "رمز، وخصم، وحدود تضعها أنت بنفسك.",
    },
    blocs: [
      {
        t: "p",
        fr: "Un coupon est un mot que le client tape dans son panier pour obtenir une remise. Vous décidez du mot, du montant, et surtout des **garde-fous** : montant minimum d'achat, nombre d'utilisations, date de fin.",
        ar: "القسيمة كلمة يكتبها الزبون في سلّته ليحصل على خصم. وأنت تقرّر الكلمة والمبلغ، والأهمّ من ذلك **الضوابط**: الحدّ الأدنى للشراء، وعدد الاستعمالات، وتاريخ الانتهاء.",
      },
      {
        t: "figure",
        cle: "coupons",
        legende: {
          fr: "Les coupons, avec pour chacun sa remise, son compteur d'utilisations et son état — actif, expiré ou désactivé.",
          ar: "القسائم، ولكلّ واحدة خصمها وعدّاد استعمالاتها وحالتها — نشطة أو منتهية أو معطّلة.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Créer un coupon", ar: "إنشاء قسيمة" },
        etapes: {
          fr: [
            "Menu **Ventes → Coupons**, puis **Nouveau coupon**.",
            "Choisissez un **code** court, en majuscules, facile à dicter au téléphone : `RENTREE15` se retient, `xY7-b2` non.",
            "Choisissez le type de remise : un **pourcentage** du panier, ou un **montant fixe** en dinars.",
            "Fixez un **montant minimum d'achat**. Sans lui, quelqu'un utilisera votre remise de 5 000 DA sur un article à 6 000 DA.",
            "Fixez un **nombre maximum d'utilisations** et une **date de fin**. Un coupon sans limite finit toujours par circuler sur les réseaux sociaux.",
            "Enregistrez.",
          ],
          ar: [
            "القائمة **المبيعات ← قسائم الخصم**، ثم **قسيمة جديدة**.",
            "اختر **رمزًا** قصيرًا بحروف كبيرة يسهل إملاؤه هاتفيًا: `RENTREE15` يُحفَظ، أما `xY7-b2` فلا.",
            "اختر نوع الخصم: **نسبة مئوية** من السلّة، أو **مبلغ ثابت** بالدينار.",
            "حدّد **حدًّا أدنى للشراء**. فبدونه سيستعمل أحدهم خصمك البالغ 5000 دج على سلعة بـ6000 دج.",
            "حدّد **عددًا أقصى للاستعمالات** و**تاريخ انتهاء**. فالقسيمة بلا حدّ ينتهي بها الأمر دائمًا إلى الانتشار على الشبكات الاجتماعية.",
            "احفظ.",
          ],
        },
        reussi: {
          fr: "Le coupon apparaît dans la liste avec l'état **Actif**. Pour en avoir le cœur net, ajoutez un article à votre panier sur la face publique et saisissez le code : la remise doit s'afficher dans le total.",
          ar: "تظهر القسيمة في القائمة بحالة **نشطة**. وللتأكّد التامّ، أضِف سلعة إلى سلّتك في الوجه العمومي وأدخِل الرمز: فينبغي أن يظهر الخصم في المجموع.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Arrêter une promotion", ar: "إيقاف عرض ترويجي" },
        fr: "Ne supprimez pas le coupon : **désactivez-le**. Il cesse aussitôt de fonctionner, mais vous gardez son compteur d'utilisations — et donc la mesure de ce que la promotion vous a rapporté. Vous pourrez le réactiver l'année prochaine.",
        ar: "لا تحذف القسيمة: بل **عطّلها**. فتتوقّف عن العمل فورًا، لكنك تحتفظ بعدّاد استعمالاتها — أي بمقياس ما جلبه لك العرض. وسيمكنك إعادة تفعيلها العام المقبل.",
      },
    ],
  },

  // ── 11 ──────────────────────────────────────────────────────────────────
  {
    id: "avis",
    titre: { fr: "Les avis des clients", ar: "تقييمات الزبائن" },
    chapeau: {
      fr: "Rien ne s'affiche sans votre accord — et tout affichage vous engage.",
      ar: "لا يُنشَر شيء دون موافقتك — وكلّ نشرٍ يُلزمك.",
    },
    blocs: [
      {
        t: "p",
        fr: "Quand un client note un produit, son avis arrive **en attente**. Il n'est visible de personne tant que vous ne l'avez pas approuvé. C'est votre filet de sécurité contre les insultes et les messages publicitaires — pas contre les critiques.",
        ar: "عندما يقيّم زبون منتجًا يصل تقييمه **قيد الانتظار**. ولا يراه أحد ما لم تصادق عليه. وهذه شبكة أمانك ضدّ الشتائم والرسائل الإعلانية — لا ضدّ الانتقادات.",
      },
      {
        t: "figure",
        cle: "avis",
        legende: {
          fr: "Les avis en attente de modération. Pour chacun : le produit noté, la note, le texte, et les deux boutons qui décident de son sort.",
          ar: "التقييمات في انتظار المراجعة. ولكلّ واحد: المنتج المقيَّم، والنقطة، والنصّ، والزرّان اللذان يقرّران مصيره.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Modérer les avis du jour", ar: "مراجعة تقييمات اليوم" },
        etapes: {
          fr: [
            "Menu **Contenu → Avis**.",
            "Lisez les avis en attente, du plus ancien au plus récent.",
            "**Approuvez** tout ce qui est sincère, y compris les avis à deux ou trois étoiles.",
            "**Rejetez** uniquement les insultes, les messages publicitaires et les textes sans rapport avec le produit.",
            "Pour un avis négatif mais fondé : approuvez-le, puis appelez le client. Un problème réglé publiquement vaut dix avis flatteurs.",
          ],
          ar: [
            "القائمة **المحتوى ← التقييمات**.",
            "اقرأ التقييمات المعلّقة، من الأقدم إلى الأحدث.",
            "**صادِق** على كلّ ما هو صادق، بما في ذلك تقييمات النجمتين أو الثلاث.",
            "**ارفض** الشتائم والرسائل الإعلانية والنصوص التي لا صلة لها بالمنتج فقط.",
            "أما التقييم السلبي لكنّه وجيه: فصادِق عليه ثم اتّصل بالزبون. فمشكلة تُحلّ علنًا تعادل عشرة تقييمات مادحة.",
          ],
        },
        reussi: {
          fr: "L'avis approuvé apparaît sous la fiche du produit sur la face publique, et le compteur « Avis à modérer » du tableau de bord diminue d'autant.",
          ar: "يظهر التقييم المُصادَق عليه أسفل بطاقة المنتج في الوجه العمومي، وينقص عدّاد «تقييمات في انتظار المراجعة» في لوحة التحكم بالقدر نفسه.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "N'affichez pas que des cinq étoiles",
          ar: "لا تعرض تقييمات الخمس نجوم وحدها",
        },
        fr: "Une page où tous les avis sont parfaits n'inspire pas confiance : les acheteurs la lisent comme une page truquée. Quelques avis mesurés, avec une réponse de votre part, vendent davantage qu'une rangée impeccable d'étoiles.",
        ar: "الصفحة التي تكون فيها كلّ التقييمات مثالية لا تبعث على الثقة: إذ يقرؤها المشترون بوصفها صفحة مزوّرة. وبضعة تقييمات معتدلة، مصحوبة بردٍّ منك، تبيع أكثر من صفٍّ لا تشوبه شائبة من النجوم.",
      },
    ],
  },

  // ── 12 ──────────────────────────────────────────────────────────────────
  {
    id: "contenu",
    titre: { fr: "Le contenu du site et le blog", ar: "محتوى الموقع والمدونة" },
    chapeau: {
      fr: "Les textes et les images que vos clients lisent avant d'acheter.",
      ar: "النصوص والصور التي يقرؤها زبائنك قبل الشراء.",
    },
    blocs: [
      {
        t: "p",
        fr: "L'écran **Contenu du site** rassemble tout ce qui n'est pas un produit : la grande image d'accueil, le bandeau de promotion qui défile en haut, les textes de la page « À propos », vos coordonnées, les questions fréquentes. Chaque bloc s'écrit dans les trois langues.",
        ar: "تجمع شاشة **محتوى الموقع** كلّ ما ليس منتجًا: الصورة الكبيرة في الصفحة الرئيسية، وشريط العروض المتحرّك في الأعلى، ونصوص صفحة «من نحن»، وبيانات الاتصال بك، والأسئلة الشائعة. ويُكتَب كلّ مقطع باللغات الثلاث.",
      },
      {
        t: "figure",
        cle: "contenu",
        legende: {
          fr: "L'écran **Contenu du site**, section par section. Chaque bloc se modifie et s'enregistre séparément : vous ne risquez pas de tout casser en corrigeant une phrase.",
          ar: "شاشة **محتوى الموقع**، قسمًا قسمًا. ويُعدَّل كلّ مقطع ويُحفَظ على حدة: فلا تخاطر بإفساد كلّ شيء وأنت تصحّح جملة واحدة.",
        },
      },
      {
        t: "procedure",
        titre: {
          fr: "Changer un texte de la page d'accueil",
          ar: "تغيير نصّ في الصفحة الرئيسية",
        },
        etapes: {
          fr: [
            "Menu **Contenu → Contenu du site**.",
            "Choisissez l'onglet correspondant à la partie que vous voulez retoucher : **En-tête**, **Hero** pour la grande image du haut, **Ventes flash**, **Pourquoi nous**, **Pied de page**…",
            "Modifiez les champs. Chaque champ porte trois petites pastilles **fr / en / ar** : cliquez-les pour passer d'une langue à l'autre.",
            "Cliquez sur **Enregistrer**, en haut du bloc — chaque onglet a le sien.",
            "Le bouton **Réinitialiser**, juste à côté, remet ce bloc dans son état d'origine si vous vous êtes égaré.",
          ],
          ar: [
            "القائمة **المحتوى ← محتوى الموقع**.",
            "اختر اللسان المقابل للجزء الذي تريد تعديله: **الترويسة**، أو **Hero** للصورة الكبيرة في الأعلى، أو **العروض السريعة**، أو **لماذا نحن**، أو **التذييل**…",
            "عدّل الخانات. وتحمل كلّ خانة ثلاث شارات صغيرة **fr / en / ar**: انقرها للانتقال من لغة إلى أخرى.",
            "انقر على **حفظ** أعلى المقطع — فلكلّ لسان زرّه الخاص.",
            "وزرّ **إعادة التعيين** بجانبه يُعيد هذا المقطع إلى حالته الأصلية إن تُهتَ.",
          ],
        },
        reussi: {
          fr: "Ouvrez la page d'accueil de votre site dans un autre onglet et rafraîchissez : votre nouveau texte y est.",
          ar: "افتح الصفحة الرئيسية لموقعك في تبويب آخر وحدِّثها: فتجد نصّك الجديد فيها.",
        },
      },
      {
        t: "p",
        fr: "**Le blog** sert à écrire des articles : un comparatif de deux modèles, un conseil d'entretien, l'annonce d'une nouvelle marque. Un article bien écrit continue d'attirer des visiteurs des mois après sa publication — c'est le travail le plus rentable que vous puissiez faire un jour creux.",
        ar: "أما **المدونة** فتُستعمَل لكتابة المقالات: مقارنة بين طرازين، أو نصيحة للصيانة، أو الإعلان عن ماركة جديدة. والمقال الجيّد يظلّ يجلب الزوّار بعد نشره بأشهر — وهو أجدى عمل يمكنك القيام به في يوم راكد.",
      },
      {
        t: "figure",
        cle: "blog",
        legende: {
          fr: "La liste des articles du blog. Un article reste invisible tant que vous ne l'avez pas publié : vous pouvez l'écrire en plusieurs fois.",
          ar: "قائمة مقالات المدونة. ويبقى المقال غير مرئيّ ما لم تنشره: فيمكنك كتابته على دفعات.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Écrire pour être trouvé", ar: "أن تكتب لتُوجَد" },
        fr: "Donnez à votre article un titre qui ressemble à une question qu'on tape dans un moteur de recherche : « Quel ordinateur portable choisir pour des études d'architecture ? » attire plus de monde que « Nos nouveautés ». Une image en tête d'article, un texte d'au moins quelques paragraphes, et vous avez fait l'essentiel.",
        ar: "أعطِ مقالك عنوانًا يشبه سؤالًا يُكتَب في محرّك بحث: فـ«أيّ حاسوب محمول أختار لدراسة الهندسة المعمارية؟» يجذب أكثر من «جديدنا». وصورة في صدر المقال، ونصّ من بضع فقرات على الأقلّ، وتكون قد أنجزتَ الجوهري.",
      },
    ],
  },

  // ── 13 ──────────────────────────────────────────────────────────────────
  {
    id: "reglages",
    titre: { fr: "Les réglages de votre boutique", ar: "إعدادات متجرك" },
    chapeau: {
      fr: "L'écran qu'on règle une fois, puis qu'on oublie — jusqu'au jour où l'on change de numéro.",
      ar: "الشاشة التي تُضبَط مرّة ثم تُنسى — إلى أن يتغيّر رقم هاتفك يومًا.",
    },
    blocs: [
      {
        t: "p",
        fr: "**Système → Paramètres** rassemble les réglages généraux : votre raison sociale, vos coordonnées, la façon d'écrire les prix, le bandeau qui défile en haut du site, et le mode maintenance. Prenez dix minutes pour tout vérifier le jour de l'ouverture ; ensuite vous n'y reviendrez que rarement.",
        ar: "تجمع **النظام ← الإعدادات** الضبطَ العامّ: اسمك التجاري، وبيانات الاتصال بك، وطريقة كتابة الأسعار، والشريط الذي يمرّ أعلى الموقع، ووضع الصيانة. خصّص عشر دقائق لمراجعة كلّ شيء يوم الافتتاح؛ ثم لن تعود إليها إلا نادرًا.",
      },
      {
        t: "figure",
        cle: "parametres",
        legende: {
          fr: "L'écran **Paramètres**, carte par carte : la boutique et ses coordonnées, les options, le mode maintenance, le bandeau promotionnel, la devise et le format des prix.",
          ar: "شاشة **الإعدادات**، بطاقةً بطاقة: المتجر وبيانات الاتصال به، والخيارات، ووضع الصيانة، والشريط الترويجي، والعملة وصيغة الأسعار.",
        },
      },
      {
        t: "tableau",
        entetes: { fr: ["La carte", "Ce qu'elle règle"], ar: ["البطاقة", "ما الذي تضبطه"] },
        lignes: {
          fr: [
            [
              "Boutique",
              "Le nom affiché, l'e-mail de contact, le téléphone, le numéro WhatsApp, l'adresse et les horaires. Ce sont ces valeurs que voient vos clients sur la page Contact.",
            ],
            [
              "Options",
              "Le seuil à partir duquel un article est « en tension », celui de la rupture, et l'affichage du sélecteur de langue.",
            ],
            [
              "Mode maintenance",
              "Ferme temporairement la boutique aux visiteurs, avec le message de votre choix.",
            ],
            [
              "Bandeau promotionnel",
              "Le message qui défile tout en haut du site, son bouton et sa destination.",
            ],
            [
              "Devise & format des prix",
              "Le symbole (DA), sa place avant ou après le nombre, et le séparateur des milliers. Un aperçu vous montre le résultat en direct.",
            ],
          ],
          ar: [
            [
              "المتجر",
              "الاسم المعروض، وبريد الاتصال، والهاتف، ورقم واتساب، والعنوان، وأوقات العمل. وهذه هي القيم التي يراها زبائنك في صفحة الاتصال.",
            ],
            [
              "الخيارات",
              "العتبة التي تُعَدّ السلعة دونها «شحيحة»، وعتبة النفاد، وإظهار مُبدِّل اللغة.",
            ],
            ["وضع الصيانة", "يغلق المتجر مؤقّتًا أمام الزوّار، مع الرسالة التي تختارها."],
            ["الشريط الترويجي", "الرسالة التي تمرّ أعلى الموقع، وزرّها ووجهتها."],
            [
              "العملة وصيغة الأسعار",
              "الرمز (دج)، وموضعه قبل الرقم أو بعده، وفاصل الآلاف. وتُظهر لك معاينةٌ النتيجةَ مباشرةً.",
            ],
          ],
        },
      },
      {
        t: "procedure",
        titre: { fr: "Annoncer une promotion en haut du site", ar: "الإعلان عن عرض أعلى الموقع" },
        etapes: {
          fr: [
            "Menu **Système → Paramètres**.",
            "Descendez jusqu'à la carte **Bandeau promotionnel** et activez l'interrupteur **Afficher le bandeau promo**.",
            "Écrivez le message — court, une phrase suffit : « Livraison offerte dès 150 000 DA jusqu'au 31 août ».",
            "Si le bandeau doit mener quelque part, remplissez le libellé du bouton et son lien.",
            "Cliquez sur **Enregistrer**, en bas de l'écran.",
          ],
          ar: [
            "القائمة **النظام ← الإعدادات**.",
            "انزل إلى بطاقة **الشريط الترويجي** وفعّل مفتاح **إظهار الشريط الترويجي**.",
            "اكتب الرسالة — قصيرة، تكفيها جملة: «توصيل مجاني ابتداءً من 150000 دج إلى غاية 31 أوت».",
            "وإن كان الشريط يُفضي إلى مكان ما، فاملأ عنوان الزرّ ورابطه.",
            "انقر على **حفظ** أسفل الشاشة.",
          ],
        },
        reussi: {
          fr: "Ouvrez la page d'accueil dans un autre onglet et rafraîchissez : le message défile tout en haut. Pensez à le désactiver quand la promotion se termine.",
          ar: "افتح الصفحة الرئيسية في تبويب آخر وحدِّثها: فتمرّ الرسالة في أعلى الصفحة. وتذكّر تعطيلها عند انتهاء العرض.",
        },
      },
      {
        t: "encadre",
        genre: "danger",
        titre: { fr: "Le mode maintenance ferme la boutique", ar: "وضع الصيانة يغلق المتجر" },
        fr: "Activé, **plus aucun visiteur ne peut acheter** : tout le monde voit votre message d'attente à la place du site. C'est utile une heure, le temps de reprendre tous vos prix. Ce ne l'est plus si vous oubliez de le désactiver — et rien ne viendra vous le rappeler.",
        ar: "عند تفعيله **لا يعود أيّ زائر قادرًا على الشراء**: بل يرى الجميع رسالة الانتظار مكان الموقع. وهذا مفيد لساعة واحدة، ريثما تراجع كلّ أسعارك. أما إن نسيتَ تعطيله فلم يعد مفيدًا — ولن يذكّرك به شيء.",
      },
    ],
  },

  // ── 14 ──────────────────────────────────────────────────────────────────
  {
    id: "livraison",
    titre: { fr: "Les tarifs de livraison", ar: "تعريفات التوصيل" },
    chapeau: {
      fr: "Wilaya par wilaya, à domicile ou au bureau de retrait.",
      ar: "ولايةً ولاية، إلى المنزل أو إلى مكتب الاستلام.",
    },
    blocs: [
      {
        t: "p",
        fr: "L'écran **Ventes → Livraison** contient la grille de vos frais de port. Pour chaque wilaya, deux prix : la livraison **à domicile** et le retrait au **bureau** du transporteur. C'est ce tableau que le site consulte pour calculer le total du panier.",
        ar: "تحتوي شاشة **المبيعات ← التوصيل** على جدول رسوم الشحن لديك. ولكلّ ولاية سعران: التوصيل **إلى المنزل** والاستلام من **مكتب** الناقل. وهذا الجدول هو ما يراجعه الموقع لحساب مجموع السلّة.",
      },
      {
        t: "figure",
        cle: "livraison",
        legende: {
          fr: "La grille des tarifs. La première ligne est le **tarif par défaut** : il s'applique à toute wilaya que vous n'avez pas réglée individuellement.",
          ar: "جدول التعريفات. والسطر الأول هو **التعريفة الافتراضية**: وتُطبَّق على كلّ ولاية لم تضبطها على حدة.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Fixer le tarif d'une wilaya", ar: "تحديد تعريفة ولاية" },
        etapes: {
          fr: [
            "Menu **Ventes → Livraison**.",
            "Trouvez la wilaya dans la liste — la recherche accepte le nom ou le numéro.",
            "Saisissez le prix de la livraison à domicile, puis celui du retrait au bureau.",
            "Enregistrez la ligne.",
            "Vérifiez en même temps le **seuil de livraison gratuite** en haut de l'écran : au-dessus de ce montant, le client ne paie plus de frais de port.",
          ],
          ar: [
            "القائمة **المبيعات ← التوصيل**.",
            "ابحث عن الولاية في القائمة — يقبل البحث الاسم أو الرقم.",
            "أدخِل سعر التوصيل إلى المنزل، ثم سعر الاستلام من المكتب.",
            "احفظ السطر.",
            "وتحقّق في الوقت نفسه من **عتبة التوصيل المجاني** أعلى الشاشة: فوق هذا المبلغ لا يدفع الزبون رسوم شحن.",
          ],
        },
        reussi: {
          fr: "Placez un article dans un panier sur la face publique, choisissez cette wilaya à l'étape de la commande : le montant des frais affiché est celui que vous venez de saisir.",
          ar: "ضَع سلعة في سلّة على الوجه العمومي، واختر هذه الولاية عند مرحلة الطلب: فيكون مبلغ الرسوم المعروض هو ما أدخلتَه للتوّ.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "Le tarif par défaut n'est pas un détail",
          ar: "التعريفة الافتراضية ليست تفصيلًا",
        },
        fr: "Vous n'avez pas besoin de renseigner les cinquante-huit wilayas une par une. Réglez d'abord un **tarif par défaut** raisonnable, puis corrigez seulement celles qui s'en écartent — le grand Sud, en général. Mais ne laissez jamais le tarif par défaut à un montant que vous perdriez à chaque envoi.",
        ar: "لستَ مضطرًّا إلى ضبط الولايات الثماني والخمسين واحدةً واحدة. اضبط أولًا **تعريفة افتراضية** معقولة، ثم صحّح ما يشذّ عنها فحسب — الجنوب الكبير عادةً. لكن لا تترك أبدًا التعريفة الافتراضية عند مبلغ تخسر فيه مع كلّ إرسالية.",
      },
    ],
  },

  // ── 15 ──────────────────────────────────────────────────────────────────
  {
    id: "paiements",
    titre: { fr: "Les modes de paiement", ar: "طرق الدفع" },
    chapeau: {
      fr: "Ce que le client peut choisir au moment de valider.",
      ar: "ما يمكن للزبون اختياره لحظة التأكيد.",
    },
    blocs: [
      {
        t: "p",
        fr: "L'écran **Ventes → Paiements** liste les façons de payer que vous acceptez. Pour chacune : un libellé, un texte d'explication que le client lit au moment de choisir, et un interrupteur pour l'activer ou non.",
        ar: "تعرض شاشة **المبيعات ← المدفوعات** طرق الدفع التي تقبلها. ولكلّ واحدة: عنوان، ونصّ توضيحي يقرأه الزبون لحظة الاختيار، ومفتاح لتفعيلها أو تعطيلها.",
      },
      {
        t: "figure",
        cle: "paiements",
        legende: {
          fr: "Les modes de paiement. Le texte d'explication est important : c'est lui qui répond à la question « et concrètement, je paie comment ? ».",
          ar: "طرق الدفع. والنصّ التوضيحي مهمّ: فهو الذي يجيب عن سؤال «وعمليًّا، كيف أدفع؟».",
        },
      },
      {
        t: "procedure",
        titre: {
          fr: "Modifier ou désactiver un mode de paiement",
          ar: "تعديل طريقة دفع أو تعطيلها",
        },
        etapes: {
          fr: [
            "Menu **Ventes → Paiements**.",
            "Choisissez le mode à modifier.",
            "Corrigez le libellé et surtout le texte d'explication : dites exactement ce que le client doit faire, et sous quel délai.",
            "Pour cesser de proposer un mode, basculez son interrupteur sur inactif plutôt que de le supprimer.",
            "Enregistrez.",
          ],
          ar: [
            "القائمة **المبيعات ← المدفوعات**.",
            "اختر الطريقة المراد تعديلها.",
            "صحّح العنوان، وخصوصًا النصّ التوضيحي: قل بالضبط ما على الزبون فعله، وفي أيّ أجل.",
            "وللتوقّف عن اقتراح طريقة، حوّل مفتاحها إلى غير مفعّلة بدل حذفها.",
            "احفظ.",
          ],
        },
        reussi: {
          fr: "Allez jusqu'à l'étape de paiement sur la face publique : le mode désactivé n'apparaît plus dans la liste, et le texte que vous avez écrit s'affiche sous celui que vous avez gardé.",
          ar: "اذهب إلى مرحلة الدفع في الوجه العمومي: فلا تعود الطريقة المعطّلة تظهر في القائمة، ويظهر النصّ الذي كتبتَه تحت الطريقة التي أبقيتَها.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Le paiement à la livraison", ar: "الدفع عند التسليم" },
        fr: "C'est le mode le plus utilisé en Algérie, et le plus exposé aux colis refusés. L'appel de confirmation avant l'expédition, décrit au chapitre des commandes, est la seule parade qui fonctionne vraiment.",
        ar: "هو الأكثر استعمالًا في الجزائر، والأكثر عرضةً لرفض الطرود. ومكالمة التأكيد قبل الشحن، الموصوفة في فصل الطلبات، هي الوقاية الوحيدة التي تنفع فعلًا.",
      },
    ],
  },
);

SECTIONS.push(
  // ── 16 ──────────────────────────────────────────────────────────────────
  {
    id: "relation",
    titre: { fr: "Messages, abonnés et notifications", ar: "الرسائل والمشتركون والإشعارات" },
    chapeau: {
      fr: "Trois écrans discrets qu'il vaut mieux ouvrir tous les jours.",
      ar: "ثلاث شاشات هادئة يُستحسَن فتحها كلّ يوم.",
    },
    blocs: [
      {
        t: "p",
        fr: "**Messages de contact.** Tout ce que vos visiteurs vous écrivent par le formulaire du site atterrit ici. Un message non lu est signalé ; une fois traité, marquez-le comme lu pour ne pas repasser dessus.",
        ar: "**رسائل التواصل.** كلّ ما يكتبه لك زوّارك عبر استمارة الموقع يصل إلى هنا. وتُوسَم الرسالة غير المقروءة؛ وبعد معالجتها ضَعها كمقروءة حتى لا تعود إليها.",
      },
      {
        t: "figure",
        cle: "messages",
        legende: {
          fr: "Les messages reçus par le formulaire de contact : l'expéditeur, l'objet et la date. On répond depuis sa propre messagerie, à l'adresse indiquée.",
          ar: "الرسائل الواردة عبر استمارة الاتصال: المرسِل، والموضوع، والتاريخ. ويكون الردّ من بريدك الخاصّ إلى العنوان المذكور.",
        },
      },
      {
        t: "p",
        fr: "**Newsletter.** La liste des personnes qui ont accepté de recevoir vos nouvelles. Elle ne sert qu'à cela : ce sont des gens qui ont dit oui, ne les inscrivez jamais d'office et n'achetez jamais une liste toute faite.",
        ar: "**النشرة البريدية.** قائمة الأشخاص الذين قبِلوا تلقّي أخبارك. وهي لهذا الغرض وحده: فهؤلاء أناس قالوا نعم، فلا تسجّلهم قطّ من تلقاء نفسك ولا تشترِ قائمة جاهزة أبدًا.",
      },
      {
        t: "figure",
        cle: "abonnes",
        legende: {
          fr: "Les abonnés à la newsletter, avec leur date d'inscription. Un abonné qui demande à sortir se retire d'ici, immédiatement.",
          ar: "المشتركون في النشرة البريدية، وتاريخ اشتراك كلّ منهم. والمشترك الذي يطلب الخروج يُحذَف من هنا، فورًا.",
        },
      },
      {
        t: "p",
        fr: "**Notifications.** C'est la mémoire de la cloche en haut de l'écran : commandes reçues, stocks bas, avis à modérer. Rien ne s'y perd, même si vous n'avez pas ouvert le site pendant trois jours.",
        ar: "**الإشعارات.** هي ذاكرة الجرس أعلى الشاشة: الطلبات الواردة، والمخزون المنخفض، والتقييمات المنتظِرة. ولا يضيع منها شيء، ولو لم تفتح الموقع ثلاثة أيام.",
      },
      {
        t: "figure",
        cle: "notifications",
        legende: {
          fr: "L'historique complet des notifications. Le bouton **Tout marquer comme lu** remet le compteur de la cloche à zéro.",
          ar: "التاريخ الكامل للإشعارات. وزرّ **تحديد الكل كمقروء** يعيد عدّاد الجرس إلى الصفر.",
        },
      },
    ],
  },

  // ── 17 ──────────────────────────────────────────────────────────────────
  {
    id: "equipe",
    titre: { fr: "Votre équipe et ses droits", ar: "فريقك وصلاحياته" },
    chapeau: {
      fr: "Chacun son compte, chacun ses droits. C'est ainsi qu'on dort tranquille.",
      ar: "لكلٍّ حسابه، ولكلٍّ صلاحياته. وهكذا ينام المرء مطمئنًّا.",
    },
    blocs: [
      {
        t: "p",
        fr: "Dès que quelqu'un d'autre que vous travaille sur la boutique, **créez-lui un compte**. Ce n'est pas de la bureaucratie : sans cela, le journal ne dira jamais qui a changé un prix, et le jour où cette personne s'en va, vous devrez changer votre propre mot de passe.",
        ar: "ما إن يعمل على المتجر شخص غيرك حتى **تُنشئ له حسابًا**. وهذا ليس بيروقراطية: فبدونه لن يقول السجلّ أبدًا من غيّر سعرًا، ويوم يغادر ذلك الشخص ستضطرّ إلى تغيير كلمة مرورك أنت.",
      },
      {
        t: "figure",
        cle: "utilisateurs",
        legende: {
          fr: "Les comptes du back-office. Chacun porte son rôle et son état — actif ou désactivé. C'est aussi ici que vous changez votre propre mot de passe.",
          ar: "حسابات الإدارة. ويحمل كلّ حساب دوره وحالته — مفعّل أو معطّل. ومن هنا أيضًا تغيّر كلمة مرورك أنت.",
        },
      },
      {
        t: "p",
        fr: "**Quatre rôles, du plus limité au plus puissant.** Donnez toujours le rôle le plus faible qui permette de faire le travail — on peut toujours l'élever plus tard.",
        ar: "**أربعة أدوار، من الأضيق إلى الأوسع صلاحية.** أعطِ دائمًا أضعف دور يسمح بإنجاز العمل — فبالإمكان رفعه لاحقًا دائمًا.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Rôle", "Ce qu'il peut faire", "Pour qui"],
          ar: ["الدور", "ما يستطيع فعله", "لمن"],
        },
        lignes: {
          fr: [
            [
              "Lecteur",
              "Regarder, sans jamais rien modifier.",
              "Un comptable, un stagiaire, un associé qui veut suivre les chiffres.",
            ],
            [
              "Éditeur",
              "Tout ce qui précède, plus : créer et modifier produits, articles, coupons, et faire avancer les commandes.",
              "La personne qui tient la boutique au quotidien.",
            ],
            [
              "Administrateur",
              "Tout ce qui précède, plus : supprimer, et régler la boutique, la livraison et les paiements.",
              "Un responsable de confiance.",
            ],
            [
              "Propriétaire",
              "Tout, sans exception : les comptes de l'équipe, les réglages sensibles et la copie de sauvegarde.",
              "Vous. Et personne d'autre.",
            ],
          ],
          ar: [
            [
              "مُشاهد",
              "الاطّلاع، دون تعديل أيّ شيء.",
              "محاسب، أو متربّص، أو شريك يريد متابعة الأرقام.",
            ],
            [
              "محرِّر",
              "كلّ ما سبق، إضافةً إلى: إنشاء وتعديل المنتجات والمقالات والقسائم، وتقديم الطلبات في مراحلها.",
              "الشخص الذي يدير المتجر يوميًّا.",
            ],
            [
              "مدير",
              "كلّ ما سبق، إضافةً إلى: الحذف، وضبط المتجر والتوصيل والمدفوعات.",
              "مسؤول موثوق.",
            ],
            [
              "المالك",
              "كلّ شيء دون استثناء: حسابات الفريق، والإعدادات الحسّاسة، والنسخة الاحتياطية.",
              "أنت. ولا أحد غيرك.",
            ],
          ],
        },
      },
      {
        t: "procedure",
        titre: { fr: "Créer le compte d'un employé", ar: "إنشاء حساب موظّف" },
        etapes: {
          fr: [
            "Menu **Système → Utilisateurs et rôles**, puis le bouton **Inviter** en haut à droite.",
            "Saisissez son nom et son adresse électronique — une adresse par personne, jamais une adresse partagée.",
            "Choisissez son **rôle** dans la liste, en vous appuyant sur le tableau ci-dessus.",
            "Donnez-lui un mot de passe de départ d'au moins six caractères, et demandez-lui d'en choisir un autre à sa première connexion.",
            "Enregistrez, puis transmettez-lui ses identifiants de vive voix ou par un canal privé — jamais dans un groupe de discussion.",
          ],
          ar: [
            "القائمة **النظام ← المستخدمون والأدوار**، ثم زرّ **دعوة** في الأعلى.",
            "أدخِل اسمه وبريده الإلكتروني — بريد لكلّ شخص، ولا بريد مشترك أبدًا.",
            "اختر **دوره** من القائمة، مستعينًا بالجدول أعلاه.",
            "أعطِه كلمة مرور أوّلية لا تقلّ عن ستّة محارف، واطلب منه اختيار غيرها عند أول دخول.",
            "احفظ، ثم سلّمه بياناته شفويًّا أو عبر قناة خاصّة — ولا تفعل ذلك أبدًا في مجموعة محادثة.",
          ],
        },
        reussi: {
          fr: "Le compte apparaît dans la liste avec son rôle et l'état **Actif**. Demandez à la personne de se connecter devant vous : elle doit voir le tableau de bord, et les écrans hors de son rôle doivent lui être refusés.",
          ar: "يظهر الحساب في القائمة بدوره وبحالة **مفعّل**. واطلب من الشخص أن يسجّل الدخول أمامك: ينبغي أن يرى لوحة التحكم، وأن تُرفَض له الشاشات الخارجة عن دوره.",
        },
      },
      {
        t: "figure",
        cle: "utilisateur-formulaire",
        legende: {
          fr: "Le formulaire d'un compte : nom, adresse, rôle, état, et le champ de mot de passe. Laissé vide lors d'une modification, le mot de passe existant est conservé.",
          ar: "استمارة الحساب: الاسم، والعنوان، والدور، والحالة، وخانة كلمة المرور. وإذا تُركت فارغة عند التعديل، بقيت كلمة المرور الحالية على حالها.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Quand quelqu'un s'en va", ar: "حين يغادر أحدهم" },
        fr: "**Désactivez son compte le jour même.** L'interrupteur d'état suffit : la personne ne peut plus entrer, mais tout ce qu'elle a fait reste inscrit au journal, avec son nom. Supprimer le compte effacerait ce lien — c'est exactement ce que vous ne voulez pas.",
        ar: "**عطّل حسابه في اليوم نفسه.** ويكفي مفتاح الحالة: فلا يعود الشخص قادرًا على الدخول، لكن كلّ ما فعله يبقى مسجَّلًا في السجلّ باسمه. أما حذف الحساب فيمحو هذه الصلة — وهو بالضبط ما لا تريده.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "Ne restez jamais sans propriétaire",
          ar: "لا تبقَ أبدًا بلا مالك",
        },
        fr: "Le rôle **Propriétaire** est le seul qui donne accès aux comptes de l'équipe et à la copie de sauvegarde. Ne rétrogradez pas votre propre compte et ne le désactivez pas : vous vous enfermeriez dehors, et personne dans l'équipe ne pourrait vous rouvrir la porte.",
        ar: "دور **المالك** هو الوحيد الذي يتيح الوصول إلى حسابات الفريق وإلى النسخة الاحتياطية. فلا تخفض رتبة حسابك أنت ولا تعطّله: إذ ستحبس نفسك في الخارج، ولن يستطيع أحد في الفريق أن يفتح لك الباب.",
      },
    ],
  },

  // ── 18 ──────────────────────────────────────────────────────────────────
  {
    id: "journal",
    titre: { fr: "Le journal : qui a fait quoi", ar: "السجلّ: من فعل ماذا" },
    chapeau: {
      fr: "La mémoire de votre boutique. On ne s'en sert qu'en cas de doute — et ce jour-là, rien ne le remplace.",
      ar: "ذاكرة متجرك. لا تُستعمَل إلا عند الشكّ — وفي ذلك اليوم لا شيء يعوّضها.",
    },
    blocs: [
      {
        t: "p",
        fr: "Chaque action importante — un prix modifié, une commande annulée, un compte créé — laisse une ligne dans le **journal d'audit** : qui, quoi, quand. Personne ne peut effacer une de ces lignes, pas même vous. C'est précisément ce qui lui donne sa valeur.",
        ar: "كلّ إجراء مهمّ — سعر عُدّل، أو طلب أُلغي، أو حساب أُنشئ — يترك سطرًا في **سجل التدقيق**: من، وماذا، ومتى. ولا يستطيع أحد محو أيّ سطر منها، ولا أنت. وهذا بالضبط ما يمنحه قيمته.",
      },
      {
        t: "figure",
        cle: "journal",
        legende: {
          fr: "Le journal d'audit. Les pastilles du haut filtrent par type d'action ; la barre de recherche accepte un nom, un numéro de commande ou une adresse.",
          ar: "سجل التدقيق. تُصفّي الأزرار في الأعلى حسب نوع الإجراء؛ ويقبل شريط البحث اسمًا أو رقم طلب أو عنوانًا.",
        },
      },
      {
        t: "liste",
        fr: [
          "**« Ce prix était différent hier. »** Filtrez sur le produit et remontez : vous verrez qui l'a changé et quand.",
          "**« Cette commande a disparu. »** Le journal garde la trace de l'annulation ou de la suppression, avec son auteur.",
          "**« Je ne reconnais pas cette connexion. »** Comparez les dates avec les absences de votre équipe.",
        ],
        ar: [
          "**«هذا السعر كان مختلفًا أمس.»** صفِّ حسب المنتج وعُد إلى الوراء: سترى من غيّره ومتى.",
          "**«هذا الطلب اختفى.»** يحتفظ السجلّ بأثر الإلغاء أو الحذف، ومعه صاحبه.",
          "**«لا أعرف عملية الدخول هذه.»** قارِن التواريخ بأوقات غياب فريقك.",
        ],
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Un réflexe utile", ar: "عادة نافعة" },
        fr: "Avant d'accuser qui que ce soit, ouvrez le journal. Neuf fois sur dix, l'explication est banale : une erreur de saisie, une manipulation faite par quelqu'un qui avait oublié de vous prévenir. Le journal évite les fausses querelles autant qu'il révèle les vrais problèmes.",
        ar: "قبل أن تتّهم أحدًا، افتح السجلّ. ففي تسع حالات من عشر يكون التفسير عاديًّا: خطأ في الإدخال، أو تصرّف من شخص نسي أن يُعلمك. والسجلّ يجنّبك الخصومات الباطلة بقدر ما يكشف المشكلات الحقيقية.",
      },
    ],
  },

  // ── 19 ──────────────────────────────────────────────────────────────────
  {
    id: "langues",
    titre: { fr: "Les trois langues de votre site", ar: "لغات موقعك الثلاث" },
    chapeau: {
      fr: "Français, anglais, arabe — et une mise en page qui se retourne vraiment.",
      ar: "الفرنسية والإنجليزية والعربية — وتخطيطٌ ينقلب فعلًا.",
    },
    blocs: [
      {
        t: "p",
        fr: "Votre site parle trois langues. Le visiteur choisit la sienne dans l'en-tête, et son choix est retenu. En arabe, **toute la page se retourne** : le menu passe à droite, les tableaux se lisent de droite à gauche, les boutons changent de côté. Ce n'est pas seulement le texte qui est traduit.",
        ar: "يتكلّم موقعك ثلاث لغات. ويختار الزائر لغته من الترويسة، ويُحفَظ اختياره. وفي العربية **تنقلب الصفحة بأكملها**: فتنتقل القائمة إلى اليمين، وتُقرأ الجداول من اليمين إلى اليسار، وتتبدّل جهة الأزرار. فليس النصّ وحده هو المترجَم.",
      },
      {
        t: "figure",
        cle: "commandes-ar",
        legende: {
          fr: "L'écran des commandes en arabe. Le menu est passé à droite, les colonnes du tableau sont inversées, les statuts sont traduits : c'est la même application, retournée.",
          ar: "شاشة الطلبات بالعربية. انتقلت القائمة إلى اليمين، وانعكست أعمدة الجدول، وتُرجِمت الحالات: إنه التطبيق نفسه، مقلوبًا.",
        },
      },
      {
        t: "figure",
        cle: "tableau-de-bord-ar",
        legende: {
          fr: "Le tableau de bord en arabe : les cartes de chiffres, la courbe et les listes suivent le même sens de lecture.",
          ar: "لوحة التحكم بالعربية: بطاقات الأرقام والمنحنى والقوائم تتّبع اتجاه القراءة نفسه.",
        },
      },
      {
        t: "p",
        fr: "**Ce que cela vous demande.** Quand vous créez un produit, une catégorie ou un article, vous voyez trois onglets de langue. Remplissez-les tous les trois. Si vous ne maîtrisez pas l'anglais, recopiez le français : un client anglophone comprendra un nom français, il ne comprendra pas une case vide.",
        ar: "**ما الذي يتطلّبه ذلك منك.** عندما تُنشئ منتجًا أو فئة أو مقالًا، ترى ثلاثة ألسنة للغات. املأها كلّها. وإن كنتَ لا تتقن الإنجليزية فانسخ الفرنسية: فالزبون الناطق بالإنجليزية سيفهم اسمًا فرنسيًّا، ولن يفهم خانة فارغة.",
      },
      {
        t: "figure",
        cle: "produits-ar",
        legende: {
          fr: "La liste des produits en arabe. Les noms que vous avez saisis dans l'onglet arabe s'affichent ici : ce que vous écrivez est ce que voit votre client arabophone.",
          ar: "قائمة المنتجات بالعربية. وتظهر هنا الأسماء التي أدخلتَها في لسان العربية: فما تكتبه هو ما يراه زبونك الناطق بالعربية.",
        },
      },
      {
        t: "figure",
        cle: "avis-ar",
        legende: {
          fr: "La modération des avis en arabe. Les boutons d'action sont passés de l'autre côté de la ligne, à la place où l'œil les cherche naturellement en lecture de droite à gauche.",
          ar: "مراجعة التقييمات بالعربية. انتقلت أزرار الإجراءات إلى الجهة الأخرى من السطر، إلى الموضع الذي تبحث عنه العين طبيعيًّا في القراءة من اليمين إلى اليسار.",
        },
      },
      {
        t: "figure",
        cle: "livraison-ar",
        legende: {
          fr: "La grille des tarifs de livraison en arabe. Les nombres restent en chiffres latins, comme le veut l'usage algérien pour les prix.",
          ar: "جدول تعريفات التوصيل بالعربية. وتبقى الأعداد بالأرقام اللاتينية، جريًا على العادة الجزائرية في الأسعار.",
        },
      },
      {
        t: "figure",
        cle: "utilisateurs-ar",
        legende: {
          fr: "Les comptes de l'équipe en arabe : les rôles portent leur nom arabe — المالك pour Propriétaire, محرِّر pour Éditeur.",
          ar: "حسابات الفريق بالعربية: وتحمل الأدوار أسماءها العربية — «المالك» و«مدير» و«محرِّر» و«مُشاهد».",
        },
      },
      {
        t: "figure",
        cle: "commande-fiche-ar",
        legende: {
          fr: "Une fiche de commande en arabe : le détail des articles, les montants et le suivi des statuts, dans le sens de lecture arabe.",
          ar: "بطاقة طلب بالعربية: تفصيل السلع، والمبالغ، وتتبّع الحالات، وفق اتجاه القراءة العربية.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "La langue de vos factures", ar: "لغة فواتيرك" },
        fr: "Le libellé des articles d'une commande est **figé au moment de l'achat**, dans la langue où le client a commandé. Si vous traduisez un nom de produit six mois plus tard, les anciennes commandes gardent le nom d'origine — c'est voulu : une facture ne change pas après coup.",
        ar: "يُثبَّت عنوان السلعة في الطلب **لحظة الشراء**، باللغة التي طلب بها الزبون. فإن ترجمتَ اسم منتج بعد ستّة أشهر، بقيت الطلبات القديمة على الاسم الأصلي — وهذا مقصود: فالفاتورة لا تتغيّر بأثر رجعي.",
      },
    ],
  },

  // ── 20 ──────────────────────────────────────────────────────────────────
  {
    id: "sauvegarde",
    titre: { fr: "Télécharger une copie de votre boutique", ar: "تنزيل نسخة من متجرك" },
    chapeau: {
      fr: "Cinq secondes par semaine. C'est le meilleur investissement de ce manuel.",
      ar: "خمس ثوانٍ في الأسبوع. وهي أفضل استثمار في هذا الدليل.",
    },
    blocs: [
      {
        t: "p",
        fr: "Un bouton produit un **fichier unique** qui contient tout le contenu de votre boutique : vos produits, vos commandes, vos clients, vos textes, vos réglages. Vous le rangez chez vous. Si un jour quelque chose tourne mal, c'est ce fichier qui permet de tout remettre en place.",
        ar: "زرٌّ واحد يُنتج **ملفًّا وحيدًا** يحتوي على كلّ محتوى متجرك: منتجاتك، وطلباتك، وزبائنك، ونصوصك، وإعداداتك. تحفظه أنت عندك. وإذا ساء شيء يومًا ما، فهذا الملف هو ما يتيح إعادة كلّ شيء إلى نصابه.",
      },
      {
        t: "procedure",
        titre: { fr: "Faire une copie de sauvegarde", ar: "أخذ نسخة احتياطية" },
        etapes: {
          fr: [
            "Ajoutez `/admin/developpeur` à l'adresse de votre site. Cet écran est réservé au **Propriétaire** : personne d'autre n'y entrera.",
            "Repérez le cadre **Sauvegarde** et cliquez sur **Télécharger la sauvegarde**.",
            "Confirmez dans la fenêtre qui s'ouvre.",
            "Le fichier se télécharge comme n'importe quel autre. Rangez-le dans un dossier daté — par exemple « Sauvegardes boutique / 2026-08 ».",
            "Faites-en une copie ailleurs : un disque externe, ou votre espace de stockage en ligne. Une sauvegarde qui dort sur l'ordinateur qui peut tomber en panne ne sauve rien.",
          ],
          ar: [
            "أضِف `/admin/developpeur` إلى عنوان موقعك. هذه الشاشة محجوزة لـ**المالك**: فلن يدخلها أحد سواه.",
            "ابحث عن إطار **النسخ الاحتياطي** وانقر على **تنزيل النسخة الاحتياطية**.",
            "أكِّد في النافذة التي تُفتَح.",
            "يُنزَّل الملف كأيّ ملف آخر. ضَعه في مجلّد مؤرَّخ — مثلًا «نسخ المتجر / 2026-08».",
            "واحتفظ بنسخة منه في مكان آخر: قرص خارجي، أو مساحة تخزينك على الإنترنت. فالنسخة النائمة على الحاسوب الذي قد يتعطّل لا تنقذ شيئًا.",
          ],
        },
        reussi: {
          fr: "Un fichier apparaît dans vos téléchargements, et la ligne **Dernière sauvegarde** de cet écran affiche la date et l'heure de maintenant.",
          ar: "يظهر ملف في تنزيلاتك، ويعرض سطر **آخر نسخة احتياطية** في هذه الشاشة تاريخ الآن وساعته.",
        },
      },
      {
        t: "figure",
        cle: "sauvegarde",
        legende: {
          fr: "Le cadre de la sauvegarde. Le texte de l'écran emploie un mot d'informaticien, « dump » : il désigne simplement le fichier de copie décrit ici. Le fichier vous est remis directement, sans passer par un tiers.",
          ar: "إطار النسخ الاحتياطي. ويستعمل نصّ الشاشة كلمةً من مفردات المعلوماتيين، «dump»: وهي لا تعني سوى ملفّ النسخة الموصوف هنا. ويُسلَّم إليك الملف مباشرةً دون وسيط.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "À quelle fréquence", ar: "بأيّ وتيرة" },
        fr: "**Une fois par semaine** si vous recevez quelques commandes par jour. **Tous les jours** en période de forte activité — rentrée, fêtes, soldes. Et **toujours juste avant** de faire un grand changement : une refonte de vos prix, un import de nouveaux produits. Gardez les quatre dernières copies et jetez les plus anciennes.",
        ar: "**مرّة في الأسبوع** إن كنتَ تتلقّى بضعة طلبات يوميًّا. و**كلّ يوم** في فترات النشاط الكثيف — الدخول المدرسي، والأعياد، والتخفيضات. و**دائمًا قُبيل** أيّ تغيير كبير: كمراجعة شاملة لأسعارك، أو إدخال دفعة منتجات جديدة. واحتفظ بآخر أربع نسخ واتلف الأقدم.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "Ce fichier contient tout — protégez-le",
          ar: "هذا الملف يحوي كلّ شيء — فاحمِه",
        },
        fr: "Il renferme les coordonnées de tous vos clients. Ne l'envoyez pas par messagerie instantanée, ne le laissez pas sur un ordinateur partagé, ne le confiez à personne. Le perdre est ennuyeux ; le laisser traîner est bien pire.",
        ar: "فهو يضمّ بيانات جميع زبائنك. لا ترسله عبر تطبيقات المحادثة الفورية، ولا تتركه على حاسوب مشترك، ولا تعهد به إلى أحد. فضياعه مزعج؛ أما تركه في متناول الجميع فأسوأ بكثير.",
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Et pour restaurer ?", ar: "وماذا عن الاستعادة؟" },
        fr: "Remettre une copie en place n'est pas une manœuvre de tous les jours, et elle ne se fait pas depuis cet écran. Le jour où vous en aurez besoin, transmettez le fichier à la personne qui s'occupe de votre site : elle saura quoi en faire. Votre rôle à vous, c'est d'avoir le fichier — et c'est le rôle décisif.",
        ar: "إعادة نسخة إلى مكانها ليست عملية يومية، ولا تتمّ من هذه الشاشة. ويوم تحتاج إليها، سلّم الملف إلى من يتولّى موقعك: فهو يعرف ما يصنع به. أما دورك أنت فهو أن يكون الملف بحوزتك — وهو الدور الحاسم.",
      },
    ],
  },

  // ── 21 ──────────────────────────────────────────────────────────────────
  {
    id: "notion",
    titre: { fr: "Notion, si vous l'utilisez", ar: "نوشن، إن كنتَ تستعمله" },
    chapeau: {
      fr: "Un confort en option. Votre boutique vend très bien sans.",
      ar: "راحة اختيارية. ومتجرك يبيع جيّدًا من دونها.",
    },
    blocs: [
      {
        t: "p",
        fr: "Notion est un carnet en ligne que beaucoup d'entreprises utilisent pour s'organiser. Si vous en avez un, votre boutique peut y **recopier vos commandes au fil de l'eau**. Vous les retrouvez alors dans un tableau Notion, à côté de vos autres notes, sans avoir à ouvrir l'administration.",
        ar: "نوشن دفتر على الإنترنت تستعمله شركات كثيرة للتنظيم. فإن كان لديك واحد، فبإمكان متجرك أن **ينسخ إليه طلباتك أوّلًا بأوّل**. عندئذٍ تجدها في جدول داخل نوشن، إلى جانب ملاحظاتك الأخرى، دون الحاجة إلى فتح الإدارة.",
      },
      {
        t: "encadre",
        genre: "note",
        titre: {
          fr: "C'est facultatif, et sans conséquence",
          ar: "الأمر اختياري، وبلا تبعات",
        },
        fr: "**Votre boutique vend même si Notion tombe.** Si le service est indisponible, les commandes continuent d'arriver normalement dans votre administration ; seule la recopie prend du retard, et elle se rattrape ensuite toute seule. Vous n'avez rien à surveiller.",
        ar: "**متجرك يبيع حتى لو تعطّل نوشن.** فإن كانت الخدمة غير متاحة، ظلّت الطلبات تصل إلى إدارتك كالمعتاد؛ ولا يتأخّر إلا النسخ، وهو يستدرك تأخّره تلقائيًا بعد ذلك. فليس عليك مراقبة أيّ شيء.",
      },
      {
        t: "figure",
        cle: "notion",
        legende: {
          fr: "L'écran Notion, une fois la connexion établie. Il se parcourt en étapes numérotées : se connecter, choisir la page d'accueil, créer le tableau, puis régler ce qui est recopié.",
          ar: "شاشة نوشن بعد إتمام الاتصال. وتُقطَع في خطوات مرقّمة: الاتصال، ثم اختيار الصفحة، ثم إنشاء الجدول، ثم ضبط ما يُنسَخ.",
        },
      },
      {
        t: "procedure",
        titre: { fr: "Relier votre carnet Notion", ar: "ربط دفترك في نوشن" },
        etapes: {
          fr: [
            "Ajoutez `/admin/notion` à l'adresse de votre site.",
            "**Étape 1** — collez la clé de connexion que Notion vous a donnée. C'est une longue suite de caractères que Notion génère pour vous ; elle joue le rôle d'un mot de passe, ne le communiquez à personne. Une fois enregistré, le champ se vide : le site ne vous le réaffichera jamais.",
            "**Étape 2** — choisissez la page de votre carnet Notion dans laquelle le tableau doit être créé.",
            "**Étape 3** — cliquez pour créer le tableau. Notion s'en charge, vous n'avez rien à préparer.",
            "**Étape 4**, facultative — indiquez ce qui doit être recopié et à quelle fréquence.",
          ],
          ar: [
            "أضِف `/admin/notion` إلى عنوان موقعك.",
            "**الخطوة 1** — الصق مفتاح الاتصال الذي منحك إياه نوشن. وهو سلسلة طويلة من المحارف يولّدها نوشن لك؛ وتقوم مقام كلمة المرور، فلا تُطلِع عليه أحدًا. وبمجرّد حفظه تُفرَّغ الخانة: فلن يعرضه الموقع عليك مرّة أخرى أبدًا.",
            "**الخطوة 2** — اختر صفحة دفترك في نوشن التي يُنشَأ الجدول داخلها.",
            "**الخطوة 3** — انقر لإنشاء الجدول. يتولّى نوشن ذلك، ولا شيء عليك تحضيره.",
            "**الخطوة 4**، اختيارية — حدّد ما يجب نسخه وبأيّ وتيرة.",
          ],
        },
        reussi: {
          fr: "L'écran affiche la connexion comme établie, et un nouveau tableau est apparu dans votre carnet Notion. Passez une commande d'essai : elle doit s'y inscrire dans la minute.",
          ar: "تعرض الشاشة الاتصال على أنه قائم، ويكون جدول جديد قد ظهر في دفترك بنوشن. جرّب طلبًا تجريبيًّا: فينبغي أن يُسجَّل فيه خلال دقيقة.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Si vous n'avez pas de Notion", ar: "إن لم يكن لديك نوشن" },
        fr: "N'ouvrez pas cet écran, et n'y pensez plus. Rien dans votre boutique n'en dépend, aucun message ne vous le réclamera. C'est un confort pour ceux qui travaillent déjà dans Notion, pas une étape d'installation.",
        ar: "لا تفتح هذه الشاشة، ولا تشغل بالك بها. فلا شيء في متجرك يتوقّف عليها، ولن تطالبك بها أيّ رسالة. إنها راحة لمن يعملون في نوشن أصلًا، لا خطوةً من خطوات التركيب.",
      },
    ],
  },

  // ── 22 ──────────────────────────────────────────────────────────────────
  {
    id: "soucis",
    titre: { fr: "Quand quelque chose ne va pas", ar: "حين لا تسير الأمور على ما يُرام" },
    chapeau: {
      fr: "Les pannes courantes, et ce que vous pouvez faire vous-même avant d'appeler.",
      ar: "الأعطال الشائعة، وما يمكنك فعله بنفسك قبل أن تتّصل بأحد.",
    },
    blocs: [
      {
        t: "p",
        fr: "Avant tout, **trois gestes** qui règlent la moitié des problèmes : rafraîchir la page ; se déconnecter puis se reconnecter ; essayer depuis un autre navigateur ou un autre appareil. Si le souci disparaît sur l'autre appareil, il venait du premier.",
        ar: "قبل كلّ شيء، **ثلاث حركات** تحلّ نصف المشكلات: تحديث الصفحة؛ ثم تسجيل الخروج وإعادة الدخول؛ ثم المحاولة من متصفّح آخر أو جهاز آخر. فإن اختفى العطل على الجهاز الآخر، فمصدره كان الأول.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Ce que vous constatez", "La cause la plus fréquente", "Ce que vous faites"],
          ar: ["ما تلاحظه", "السبب الأكثر شيوعًا", "ما تفعله"],
        },
        lignes: {
          fr: [
            [
              "Un écran m'est refusé",
              "Votre rôle ne permet pas cette action.",
              "Vérifiez votre rôle dans **Utilisateurs et rôles**. Si vous êtes Propriétaire, vérifiez que le sélecteur « Simuler un rôle » de l'en-tête n'est pas resté sur un rôle inférieur.",
            ],
            [
              "Un produit n'apparaît pas sur le site",
              "Il est en rupture, ou il n'a pas de catégorie.",
              "Ouvrez sa fiche : la quantité en stock est-elle supérieure à zéro ? une catégorie est-elle bien choisie ?",
            ],
            [
              "Le prix affiché n'est pas le bon",
              "Un coupon actif s'applique, ou l'ancien prix a été laissé rempli.",
              "Regardez l'écran **Coupons**, puis la fiche du produit.",
            ],
            [
              "Une commande n'arrive pas",
              "Elle est arrivée, mais l'onglet filtré la cache.",
              "Cliquez sur l'onglet **Toutes** de l'écran des commandes.",
            ],
            [
              "Le client dit n'avoir rien reçu",
              "Le message est dans ses indésirables.",
              "Demandez-lui de vérifier ce dossier ; renvoyez-lui l'information depuis votre propre messagerie.",
            ],
            [
              "Une image ne s'affiche pas",
              "Le fichier était trop lourd ou dans un format inhabituel.",
              "Reprenez la photo en JPEG ou PNG, redimensionnée, et redéposez-la.",
            ],
            [
              "Un avis n'est pas visible",
              "Il n'a pas été approuvé.",
              "Écran **Avis** : approuvez-le.",
            ],
            [
              "Tout le site est lent",
              "Souvent le réseau, parfois des images trop lourdes.",
              "Testez depuis une autre connexion ; allégez les photos les plus récentes.",
            ],
          ],
          ar: [
            [
              "تُرفَض لي شاشة",
              "دورك لا يسمح بهذا الإجراء.",
              "تحقّق من دورك في **المستخدمون والأدوار**. وإن كنتَ المالك، فتأكّد أن مُبدِّل «محاكاة دور» في الترويسة لم يبقَ على دور أدنى.",
            ],
            [
              "منتج لا يظهر في الموقع",
              "نفد مخزونه، أو ليست له فئة.",
              "افتح بطاقته: هل الكمّية في المخزون أكبر من صفر؟ وهل اختيرت له فئة فعلًا؟",
            ],
            [
              "السعر المعروض ليس الصحيح",
              "قسيمة نشطة تُطبَّق، أو تُرك السعر القديم مملوءًا.",
              "انظر شاشة **قسائم الخصم**، ثم بطاقة المنتج.",
            ],
            [
              "طلب لا يصل",
              "لقد وصل، لكن اللسان المُصفّى يخفيه.",
              "انقر على لسان **الكل** في شاشة الطلبات.",
            ],
            [
              "الزبون يقول إنه لم يتلقَّ شيئًا",
              "الرسالة في مجلّد الرسائل غير المرغوبة عنده.",
              "اطلب منه مراجعة ذلك المجلّد؛ وأعِد إرسال المعلومة من بريدك الخاص.",
            ],
            [
              "صورة لا تظهر",
              "كان الملف ثقيلًا جدًّا أو بصيغة غير مألوفة.",
              "أعِد الصورة بصيغة JPEG أو PNG بحجم مناسب، وارفعها من جديد.",
            ],
            ["تقييم غير مرئي", "لم تتمّ المصادقة عليه.", "شاشة **التقييمات**: صادِق عليه."],
            [
              "الموقع كلّه بطيء",
              "الشبكة غالبًا، والصور الثقيلة أحيانًا.",
              "جرّب من اتصال آخر؛ وخفّف أحدث الصور.",
            ],
          ],
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "Avant d'appeler à l'aide",
          ar: "قبل أن تطلب المساعدة",
        },
        fr: "Notez **trois choses** et vous ferez gagner une heure à tout le monde : à quelle adresse étiez-vous (le contenu de la barre du navigateur), qu'avez-vous cliqué juste avant, et quel message exact s'est affiché. Une capture d'écran vaut mieux qu'un récit.",
        ar: "دوّن **ثلاثة أشياء** فتوفّر على الجميع ساعةً كاملة: في أيّ عنوان كنتَ (ما في شريط المتصفّح)، وعلى ماذا نقرتَ قبلها مباشرةً، وما نصّ الرسالة التي ظهرت بالضبط. ولقطة شاشة خير من سرد طويل.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "Deux choses à ne jamais faire dans la panique",
          ar: "أمران لا تفعلهما أبدًا في لحظة الذعر",
        },
        fr: "**Ne supprimez rien** pour « voir si ça règle le problème » : la suppression est définitive, et elle n'a jamais réparé quoi que ce soit. **Ne donnez votre mot de passe à personne**, pas même à quelqu'un qui affirme vouloir vous aider — créez-lui plutôt un compte avec le rôle qui convient, et désactivez-le après.",
        ar: "**لا تحذف شيئًا** «لترى إن كان ذلك يحلّ المشكلة»: فالحذف نهائي، ولم يُصلِح شيئًا قطّ. و**لا تعطِ كلمة مرورك لأحد**، ولو ادّعى أنه يريد مساعدتك — بل أنشئ له حسابًا بالدور المناسب، ثم عطّله بعد ذلك.",
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Le réflexe qui sauve", ar: "العادة التي تُنقذ" },
        fr: "Quel que soit le problème, **votre copie de sauvegarde de la semaine est votre filet**. Si vous l'avez, aucune erreur n'est vraiment irréparable. Si vous ne l'avez pas, faites-la maintenant : le chapitre est deux pages plus haut.",
        ar: "مهما تكن المشكلة، فإنّ **نسختك الاحتياطية الأسبوعية هي شبكة أمانك**. فإن كانت لديك، فلا خطأ غير قابل للإصلاح حقًّا. وإن لم تكن لديك، فخذها الآن: الفصل يبعد صفحتين إلى الأعلى.",
      },
    ],
  },
);

// ── Phase 4 : le rendu HTML ─────────────────────────────────────────────────

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Texte destiné à un attribut : le balisage léger est retiré (il n'a pas de sens
 * hors du corps du document) et les guillemets sont neutralisés.
 */
const attribut = (s: string) => echapper(s.replace(/\*\*/g, "").replace(/`/g, ""));

/** Balisage léger, volontairement minuscule : `**gras**` et `` `littéral` ``. */
function riche(s: string): string {
  return echapper(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const GENRES: Record<string, Bi> = {
  note: { fr: "À savoir", ar: "معلومة" },
  attention: { fr: "Attention", ar: "تنبيه" },
  danger: { fr: "Geste irréversible", ar: "إجراء لا رجعة فيه" },
};

const REUSSI: Bi = {
  fr: "Comment savoir que ça a marché",
  ar: "كيف تعرف أن العملية نجحت",
};

function rendreBloc(b: Bloc, l: "fr" | "ar", figures: Map<string, string>): string {
  switch (b.t) {
    case "p":
      return `<p>${riche(b[l])}</p>`;
    case "liste":
      return `<ul>${b[l].map((i) => `<li>${riche(i)}</li>`).join("")}</ul>`;
    case "procedure":
      return (
        `<div class="procedure">` +
        `<p class="procedure-titre">${riche(b.titre[l])}</p>` +
        `<ol>${b.etapes[l].map((i) => `<li>${riche(i)}</li>`).join("")}</ol>` +
        `<p class="reussi"><span class="reussi-titre">${riche(REUSSI[l])}</span> ${riche(b.reussi[l])}</p>` +
        `</div>`
      );
    case "tableau": {
      const th = b.entetes[l].map((h) => `<th>${riche(h)}</th>`).join("");
      const tr = b.lignes[l]
        .map((r) => `<tr>${r.map((c) => `<td>${riche(c)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="cadre-tableau"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
    }
    case "encadre":
      return (
        `<aside class="encadre ${b.genre}">` +
        `<p class="encadre-genre">${riche(GENRES[b.genre][l])}</p>` +
        `<p class="encadre-titre">${riche(b.titre[l])}</p>` +
        `<p>${riche(b[l])}</p></aside>`
      );
    case "figure": {
      // Une capture écartée ne laisse pas de cadre vide : la figure disparaît.
      if (!figures.has(b.cle)) return "";
      return (
        `<figure><img data-cle="${b.cle}" alt="${attribut(b.legende[l])}" />` +
        `<figcaption>${riche(b.legende[l])}</figcaption></figure>`
      );
    }
  }
}

function rendreLangue(l: "fr" | "ar", figures: Map<string, string>): string {
  const sommaire = SECTIONS.map(
    (s, i) =>
      `<li><a href="#${s.id}-${l}"><span class="num">${i + 1}.</span> ${riche(s.titre[l])}</a></li>`,
  ).join("");

  const corps = SECTIONS.map(
    (s, i) => `<section id="${s.id}-${l}" class="section">
      <h2><span class="num">${i + 1}.</span> ${riche(s.titre[l])}</h2>
      <p class="chapeau">${riche(s.chapeau[l])}</p>
      ${s.blocs.map((b) => rendreBloc(b, l, figures)).join("\n")}
      <p class="retour"><a href="#sommaire-${l}">${l === "fr" ? "↑ Revenir au sommaire" : "↑ العودة إلى الفهرس"}</a></p>
    </section>`,
  ).join("\n");

  return `<div class="doc" id="doc-${l}" lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}">
    <header class="couverture">
      <p class="marque">KA Tech</p>
      <h1>${l === "fr" ? "Manuel du propriétaire" : "دليل المالك"}</h1>
      <p class="accroche">${
        l === "fr"
          ? "Tenir votre boutique en ligne au quotidien : les produits, les commandes, les clients, votre équipe. Un seul fichier, à ouvrir hors connexion."
          : "إدارة متجرك الإلكتروني يوميًّا: المنتجات والطلبات والزبائن وفريقك. ملفّ واحد، يُفتَح دون اتصال بالإنترنت."
      }</p>
      <p class="avert">${
        l === "fr"
          ? "Ce manuel ne parle que de ce que vous faites à la souris, dans votre navigateur. Il ne suppose aucune connaissance en informatique et ne vous demandera jamais d'en acquérir."
          : "لا يتحدّث هذا الدليل إلا عمّا تفعله بالفأرة، داخل متصفّحك. وهو لا يفترض فيك أيّ معرفة بالمعلوماتية ولن يطلب منك اكتسابها أبدًا."
      }</p>
    </header>
    <nav id="sommaire-${l}" class="sommaire">
      <h2>${l === "fr" ? "Sommaire" : "الفهرس"}</h2>
      <ol>${sommaire}</ol>
    </nav>
    ${corps}
    <footer class="pied">
      <p>${
        l === "fr"
          ? "Manuel illustré du propriétaire — KA Tech. Les captures proviennent de l'application réelle."
          : "دليل المالك المصوَّر — كا تك. واللقطات مأخوذة من التطبيق الحقيقي."
      }</p>
      <p class="licence">${
        l === "fr"
          ? "Composé avec Noto Naskh Arabic, sous licence SIL Open Font License 1.1."
          : "صُفَّ بخطّ Noto Naskh Arabic، بموجب رخصة SIL Open Font License 1.1."
      }</p>
    </footer>
  </div>`;
}

// ── La feuille de style ─────────────────────────────────────────────────────
//
// Tout est intégré : aucune requête ne sort du fichier. La police arabe est
// glissée dans `@font-face` sous forme de données, si le sous-ensemble a pu
// être produit ; sinon on se rabat sur la pile de polices du système.

function feuilleDeStyle(police: { regular: string; bold: string } | null): string {
  const fontFace = police
    ? `
@font-face{font-family:"Manuel Arabe";font-style:normal;font-weight:400;font-display:swap;
  src:url(${police.regular}) format("woff2")}
@font-face{font-family:"Manuel Arabe";font-style:normal;font-weight:700;font-display:swap;
  src:url(${police.bold}) format("woff2")}
`
    : "";
  const pileArabe = police
    ? `"Manuel Arabe","Noto Naskh Arabic","Noto Sans Arabic","Geeza Pro","Segoe UI",serif`
    : `"Noto Naskh Arabic","Noto Sans Arabic","Geeza Pro","Al Bayan","Traditional Arabic",Amiri,"Segoe UI","DejaVu Sans",sans-serif`;

  return `${fontFace}
:root{
  --encre:#15181f; --encre-douce:#4c5566; --papier:#faf9f7; --carte:#ffffff;
  --trait:#e3e1dc; --accent:#0f6f4f; --accent-doux:#e9f4ef;
  --alerte:#95590a; --alerte-fond:#fdf4e5; --peril:#9d2222; --peril-fond:#fceded;
  --etape-fond:#f2f4f7;
  --sans:"Segoe UI",Roboto,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --arabe:${pileArabe};
  --mono:"Cascadia Mono",Consolas,"SF Mono",Menlo,"DejaVu Sans Mono",monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--papier);color:var(--encre);
  font-family:var(--sans);font-size:17px;line-height:1.72;
  -webkit-text-size-adjust:100%}
[dir="rtl"]{font-family:var(--arabe);line-height:2.05;font-size:18.5px}

/* ── Barre de langue ───────────────────────────────────────────────── */
.barre{position:sticky;top:0;z-index:20;background:rgba(250,249,247,.95);
  backdrop-filter:blur(6px);border-bottom:1px solid var(--trait)}
.barre-int{max-width:940px;margin:0 auto;padding:.7rem 5%;
  display:flex;align-items:center;justify-content:space-between;gap:1rem}
.barre-titre{font-weight:700;font-size:.95rem;letter-spacing:.02em}
.bascule{display:flex;border:1px solid var(--trait);border-radius:999px;
  overflow:hidden;background:var(--carte)}
.bascule button{border:0;background:transparent;padding:.42rem 1.1rem;
  font:inherit;font-size:.9rem;font-weight:600;color:var(--encre-douce);cursor:pointer}
.bascule button[aria-pressed="true"]{background:var(--accent);color:#fff}
.bascule button:last-child{font-family:var(--arabe)}

/* ── Structure ─────────────────────────────────────────────────────── */
.doc{max-width:940px;margin:0 auto;padding:0 5% 5rem}
.doc[hidden]{display:none}
.couverture{padding:3.4rem 0 2.2rem;border-bottom:3px solid var(--encre)}
.marque{margin:0;font-size:.82rem;letter-spacing:.22em;text-transform:uppercase;
  color:var(--accent);font-weight:700}
[dir="rtl"] .marque{letter-spacing:.08em}
.couverture h1{margin:.5rem 0 .7rem;font-size:2.7rem;line-height:1.14;letter-spacing:-.02em}
[dir="rtl"] .couverture h1{letter-spacing:0;line-height:1.5}
.accroche{margin:0 0 1rem;font-size:1.14rem;color:var(--encre-douce)}
.avert{margin:0;font-size:.95rem;color:var(--encre-douce);
  border-inline-start:3px solid var(--accent);padding-inline-start:.9rem}

.sommaire{margin:2.4rem 0 1rem;background:var(--carte);border:1px solid var(--trait);
  border-radius:12px;padding:1.4rem 1.6rem}
.sommaire h2{margin:0 0 .7rem;font-size:1rem;text-transform:uppercase;
  letter-spacing:.1em;color:var(--encre-douce)}
[dir="rtl"] .sommaire h2{letter-spacing:0;text-transform:none;font-size:1.1rem}
.sommaire ol{margin:0;padding:0;list-style:none}
.sommaire li{border-top:1px solid var(--trait)}
.sommaire li:first-child{border-top:0}
.sommaire a{display:block;padding:.5rem 0;color:var(--encre);text-decoration:none;font-weight:500}
.sommaire a:hover{color:var(--accent)}
.num{display:inline-block;min-width:2rem;color:var(--accent);font-weight:700}

.section{padding-top:2.7rem;scroll-margin-top:4.2rem}
.section h2{font-size:1.75rem;line-height:1.28;margin:0 0 .3rem;
  padding-bottom:.5rem;border-bottom:2px solid var(--trait)}
[dir="rtl"] .section h2{line-height:1.6}
.chapeau{margin:.7rem 0 1.3rem;color:var(--encre-douce);font-size:1.05rem;font-style:italic}
[dir="rtl"] .chapeau{font-style:normal}
.section p{margin:0 0 1rem}
.section > ul{margin:0 0 1.2rem;padding-inline-start:1.4rem}
.section li{margin-bottom:.45rem}
.retour{margin:1.8rem 0 0;font-size:.88rem}
.retour a{color:var(--encre-douce);text-decoration:none}
.retour a:hover{color:var(--accent)}

code{font-family:var(--mono);font-size:.87em;background:#eceef2;
  padding:.1em .36em;border-radius:4px;direction:ltr;display:inline-block}

/* ── Procédures ────────────────────────────────────────────────────── */
.procedure{margin:0 0 1.5rem;background:var(--carte);border:1px solid var(--trait);
  border-radius:12px;padding:1.1rem 1.4rem .3rem}
.procedure-titre{font-weight:700;font-size:1.06rem;margin:0 0 .6rem !important}
.procedure ol{margin:0 0 1rem;padding-inline-start:1.35rem}
.procedure li{margin-bottom:.5rem}
.procedure li::marker{color:var(--accent);font-weight:700}
.reussi{background:var(--accent-doux);border-inline-start:4px solid var(--accent);
  border-radius:0 8px 8px 0;padding:.7rem .95rem;margin:0 -1.4rem 1.1rem !important;
  font-size:.96rem}
[dir="rtl"] .reussi{border-radius:8px 0 0 8px}
.reussi-titre{display:block;font-weight:700;color:var(--accent);
  font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}
[dir="rtl"] .reussi-titre{text-transform:none;letter-spacing:0;font-size:.92rem}

/* ── Tableaux ──────────────────────────────────────────────────────── */
.cadre-tableau{overflow-x:auto;margin:0 0 1.4rem;border:1px solid var(--trait);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:.94rem;background:var(--carte)}
th,td{padding:.62rem .85rem;text-align:start;border-bottom:1px solid var(--trait);
  vertical-align:top}
th{background:#f3f4f7;font-weight:700;font-size:.86rem;
  text-transform:uppercase;letter-spacing:.05em;color:var(--encre-douce)}
[dir="rtl"] th{text-transform:none;letter-spacing:0;font-size:.94rem}
tbody tr:last-child td{border-bottom:0}

/* ── Encadrés ──────────────────────────────────────────────────────── */
.encadre{margin:0 0 1.4rem;padding:.95rem 1.2rem;border-radius:10px;
  border-inline-start:4px solid var(--accent);background:var(--accent-doux)}
.encadre p{margin:0}
.encadre-genre{font-weight:700;font-size:.72rem;text-transform:uppercase;
  letter-spacing:.12em;margin-bottom:.15rem !important;color:var(--accent);opacity:.85}
[dir="rtl"] .encadre-genre{text-transform:none;letter-spacing:0;font-size:.85rem}
.encadre-titre{font-weight:700;font-size:1.02rem;margin-bottom:.35rem !important}
.encadre.attention{border-color:var(--alerte);background:var(--alerte-fond)}
.encadre.attention .encadre-genre{color:var(--alerte)}
.encadre.danger{border-color:var(--peril);background:var(--peril-fond)}
.encadre.danger .encadre-genre{color:var(--peril)}
.encadre.danger .encadre-titre{color:var(--peril)}

/* ── Figures ───────────────────────────────────────────────────────── */
figure{margin:0 0 1.8rem}
figure img{display:block;width:100%;height:auto;border:1px solid var(--trait);
  border-radius:10px;background:#11151c}
figcaption{margin-top:.55rem;font-size:.9rem;color:var(--encre-douce);
  border-inline-start:3px solid var(--trait);padding-inline-start:.75rem}

.pied{margin-top:3.5rem;padding-top:1.3rem;border-top:1px solid var(--trait);
  font-size:.88rem;color:var(--encre-douce)}
.licence{margin:.3rem 0 0;font-size:.8rem;opacity:.8}

@media (max-width:640px){
  body{font-size:16px}
  .couverture h1{font-size:2rem}
  .section h2{font-size:1.4rem}
  .doc{padding:0 6% 3rem}
  .procedure{padding:1rem 1rem .3rem}
  .reussi{margin-inline:-1rem !important}
}
@media print{
  .barre{display:none}
  body{background:#fff}
  .section{page-break-inside:auto}
  figure,table,.encadre,.procedure{page-break-inside:avoid}
}
`;
}

// Le script embarqué. Il fait trois choses et rien d'autre : poser les images
// depuis la table (une seule copie par capture, partagée par les deux langues),
// basculer la langue, s'en souvenir d'une ouverture à l'autre.
const JS = `
(function(){
  var IMAGES = window.__MANUEL_IMAGES__ || {};
  var imgs = document.querySelectorAll("img[data-cle]");
  for (var i = 0; i < imgs.length; i++) {
    var src = IMAGES[imgs[i].getAttribute("data-cle")];
    if (src) { imgs[i].src = src; } else { imgs[i].closest("figure").remove(); }
  }
  var CLE = "katech.manuel.langue";
  var boutons = document.querySelectorAll(".bascule button");
  function appliquer(langue){
    document.documentElement.lang = langue;
    document.documentElement.dir = langue === "ar" ? "rtl" : "ltr";
    document.getElementById("doc-fr").hidden = langue !== "fr";
    document.getElementById("doc-ar").hidden = langue !== "ar";
    document.getElementById("barre-titre").textContent =
      langue === "fr" ? "KA Tech \\u2014 Manuel du propri\\u00E9taire"
                      : "\\u0643\\u0627 \\u062A\\u0643 \\u2014 \\u062F\\u0644\\u064A\\u0644 \\u0627\\u0644\\u0645\\u0627\\u0644\\u0643";
    for (var j = 0; j < boutons.length; j++) {
      boutons[j].setAttribute("aria-pressed", String(boutons[j].dataset.langue === langue));
    }
    try { localStorage.setItem(CLE, langue); } catch (e) {}
  }
  for (var k = 0; k < boutons.length; k++) {
    boutons[k].addEventListener("click", function(){ appliquer(this.dataset.langue); window.scrollTo(0,0); });
  }
  var memoire = null;
  try { memoire = localStorage.getItem(CLE); } catch (e) {}
  appliquer(memoire === "ar" ? "ar" : "fr");
})();
`;

// ── Phase 5 : assemblage et preuves ─────────────────────────────────────────

/**
 * La ligne de partage, vérifiée par la machine plutôt que par la bonne volonté.
 * Ces mots appartiennent au monde du développeur ; s'ils apparaissent dans le
 * texte rendu, le manuel a franchi sa propre frontière et le script refuse
 * d'écrire. Le contrôle porte sur le TEXTE LU, jamais sur les données d'image.
 */
const LIGNE_DE_PARTAGE = [
  /\bbun\b/i,
  /\bnpm\b/i,
  /\.env\b/i,
  /\bAPI\b/,
  /\bSQLite\b/i,
  /\bMySQL\b/i,
  /\bPostgreSQL\b/i,
  /\bPHP\b/i,
  /\bdéploiement\b/i,
  /\bdeploiement\b/i,
  /\bdist\b/i,
  /\bHMAC\b/i,
  /\bprérendu\b/i,
];

/** Retire les données binaires et les balises : ne reste que ce qu'un œil lit. */
function texteLu(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");
}

function assembler(police: { regular: string; bold: string } | null): void {
  const figures = new Map<string, string>();
  const cles = [
    ...new Set(
      SECTIONS.flatMap((s) =>
        s.blocs.filter((b) => b.t === "figure").map((b) => (b as { cle: string }).cle),
      ),
    ),
  ];
  for (const cle of cles) {
    const uri = integrer(cle);
    if (uri) figures.set(cle, uri);
    else if (!journal.ecartees.some((e) => e.startsWith(cle)))
      journal.ecartees.push(`${cle} (aucune capture dans le cache)`);
  }

  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KA Tech — Manuel du propriétaire / دليل المالك</title>
<meta name="description" content="Manuel illustré du propriétaire de la boutique KA Tech, en français et en arabe : produits, commandes, clients, équipe, sauvegarde." />
<style>${feuilleDeStyle(police)}</style>
</head>
<body>
<div class="barre"><div class="barre-int">
  <span class="barre-titre" id="barre-titre">KA Tech — Manuel du propriétaire</span>
  <div class="bascule" role="group" aria-label="Langue / اللغة">
    <button type="button" data-langue="fr" aria-pressed="true">FR</button>
    <button type="button" data-langue="ar" aria-pressed="false">العربية</button>
  </div>
</div></div>
${rendreLangue("fr", figures)}
${rendreLangue("ar", figures)}
<script>window.__MANUEL_IMAGES__=${JSON.stringify(Object.fromEntries(figures))};</script>
<script>${JS}</script>
</body>
</html>
`;

  // Preuve a) — aucune ressource externe. Toute URL http(s) portée par un
  // attribut de chargement condamne le fichier : il ne s'ouvrirait plus hors
  // connexion, ce qui est sa première promesse.
  const externes = [
    ...html.matchAll(/(?:src|href|url\(|@import)\s*=?\s*["'(]?\s*(https?:\/\/[^"')\s]+)/gi),
  ].map((m) => m[1]);
  if (externes.length) {
    console.error(`[manuel] REFUS : ressources externes détectées → ${externes.join(", ")}`);
    process.exit(1);
  }

  // Preuve c) — autant de sections d'un côté que de l'autre.
  const nFr = (html.match(/id="[a-z0-9-]+-fr" class="section"/g) ?? []).length;
  const nAr = (html.match(/id="[a-z0-9-]+-ar" class="section"/g) ?? []).length;
  if (nFr !== nAr || nFr !== SECTIONS.length) {
    console.error(`[manuel] REFUS : sections fr=${nFr} ar=${nAr} attendu=${SECTIONS.length}`);
    process.exit(1);
  }

  // Preuve d) — la ligne de partage.
  const lu = texteLu(html);
  const fuites = LIGNE_DE_PARTAGE.map((r) => lu.match(r)?.[0]).filter(Boolean);
  if (fuites.length) {
    console.error(
      `[manuel] REFUS : vocabulaire d'informaticien dans le texte → ${[...new Set(fuites)].join(", ")}`,
    );
    process.exit(1);
  }

  writeFileSync("MANUEL.html", html, "utf8");
  const octets = statSync("MANUEL.html").size;
  const enArabe = [...figures.keys()].filter((c) => c.endsWith("-ar")).length;
  dire("─".repeat(60));
  dire(`MANUEL.html écrit — ${(octets / 1024 / 1024).toFixed(2)} Mo (${octets} octets)`);
  dire(`captures intégrées : ${figures.size} (dont ${enArabe} en arabe)`);
  dire(`sections : ${nFr} en français, ${nAr} en arabe`);
  dire(`aucune URL externe : vérifié`);
  dire(`ligne de partage : aucun mot d'outillage dans le texte lu`);
  dire(
    police
      ? "police arabe intégrée (Noto Naskh Arabic sous-ensemblée)"
      : "AUCUNE police arabe intégrée",
  );
  if (journal.ecartees.length) dire(`ÉCARTÉES : ${journal.ecartees.join(" ; ")}`);
  for (const r of journal.remarques) dire(`remarque : ${r}`);
  if (octets > 8 * 1024 * 1024) dire("AVERTISSEMENT : le fichier dépasse 8 Mo.");
}

// ── Point d'entrée ──────────────────────────────────────────────────────────

if (!SANS_CAPTURES) {
  installerPolicesSysteme();
  dire(`mise en scène puis captures depuis ${BASE} — la pile doit tourner en mode http`);
  const { vitrine, secondaire } = await peupler();
  await capturer(vitrine, secondaire);
} else {
  dire(`--sans-captures : réutilisation du cache ${CACHE}`);
}
assembler(policeIntegree());
