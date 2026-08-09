/**
 * construire-guide.ts — fabrique `GUIDE.html`, le guide illustré en un seul fichier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'IL FAUT LANCER AVANT
 *
 *   1. Les dépendances :
 *        export PATH="$HOME/.bun/bin:$PATH" && bun install
 *
 *   2. La pile complète en mode `http` (l'API PHP + le frontend). Les captures
 *      sont prises sur l'application qui tourne : sans elle, il n'y a rien à
 *      photographier.
 *        API_PORT=8360 PORT=8160 DB_DRIVER=sqlite DB_SQLITE_PATH=/tmp/f1.sqlite bun run dev &
 *
 *      Vite prend le port suivant si 8160 est occupé : lire la ligne
 *      « ➜ Local: http://localhost:XXXX/ » et passer l'adresse réelle par
 *      GUIDE_BASE si ce n'est pas 8160.
 *
 *   3. Facultatif mais recommandé — la doublure Notion, pour que l'écran Notion
 *      montre une connexion réellement établie plutôt qu'un écran vide :
 *        php -S 127.0.0.1:8361 api/tools/faux-notion.php &
 *      et, dans `api/.env` (le fichier doit exister, sinon le coffre refuse
 *      d'écrire sa clé) :
 *        NOTION_API_BASE=http://127.0.0.1:8361
 *
 * LANCEMENT
 *   bun run construire-guide
 *   GUIDE_BASE=http://127.0.0.1:8161 bun run construire-guide
 *   bun run construire-guide -- --sans-captures   (réutilise les PNG du cache)
 *
 * CE QU'IL FAUT VÉRIFIER APRÈS
 *   · Le script imprime la taille finale, le nombre de captures retenues et
 *     celles qui ont été ÉCARTÉES. Une capture écartée n'est jamais remplacée
 *     par un cadre vide : la figure disparaît, et le compte l'annonce.
 *   · Il refuse d'écrire le fichier si une URL externe s'y est glissée.
 *   · Ouvrir `GUIDE.html` d'un double-clic, réseau coupé : le sommaire doit
 *     naviguer, le bouton FR / العربية doit basculer la page en `dir="rtl"`,
 *     aucune image ne doit être cassée, la console doit rester muette.
 *
 * POURQUOI CE SCRIPT EXISTE
 *   `GUIDE.html` est un produit, pas une source. Le corriger à la main le
 *   condamne : personne ne saura le régénérer dans six mois. Tout le texte, les
 *   deux langues et la mise en page vivent ici ; le HTML committé est ce que ce
 *   fichier produit. Les deux vont ensemble dans le même commit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

// ── Réglages ────────────────────────────────────────────────────────────────

const BASE = process.env.GUIDE_BASE ?? "http://127.0.0.1:8160";
const PROPRIETAIRE = {
  email: process.env.GUIDE_ADMIN_EMAIL ?? "admin@katech.dz",
  motDePasse: process.env.GUIDE_ADMIN_MDP ?? "katech-dev-2026",
};
const CLIENT = {
  nom: "Yacine Belkacem",
  email: "yacine.demo@katech.dz",
  motDePasse: "Boutique-2026!xY",
};

/** Cache des captures : hors du dépôt, pour ne jamais salir l'arbre de travail. */
const CACHE = join(tmpdir(), "katech-guide-captures");
/** Largeur des images intégrées. Au-delà, on paie des octets sans gagner en lisibilité. */
const LARGEUR_MAX = 1180;
/** Qualité WebP. 80 garde le texte des captures net sans faire enfler le fichier. */
const QUALITE_WEBP = 80;

const SANS_CAPTURES = process.argv.includes("--sans-captures");

// ── Journal ─────────────────────────────────────────────────────────────────

const journal = { retenues: [] as string[], ecartees: [] as string[] };
const dire = (m: string) => console.log(`[guide] ${m}`);

// ── Phase 1 : les captures ──────────────────────────────────────────────────
//
// Playwright est importé dynamiquement : avec `--sans-captures`, le script doit
// pouvoir tourner sur une machine où le navigateur n'est pas téléchargé.

type Cliche = { cle: string; hauteur?: number };

async function capturer(): Promise<void> {
  const { chromium } = await import("playwright");
  mkdirSync(CACHE, { recursive: true });

  const nav = await chromium.launch();
  const erreurs: string[] = [];

  /** Un contexte par langue : la langue est posée avant le premier rendu. */
  async function contexte(langue: "fr" | "ar", hauteur = 1000) {
    const ctx = await nav.newContext({
      viewport: { width: 1440, height: hauteur },
      locale: langue === "ar" ? "ar-DZ" : "fr-FR",
    });
    await ctx.addInitScript(
      `try { window.localStorage.setItem("ka-tech.lang", ${JSON.stringify(langue)}); } catch {}`,
    );
    const page = await ctx.newPage();
    page.on("pageerror", (e) => erreurs.push(`${langue}: ${String(e).slice(0, 120)}`));
    return { ctx, page };
  }

  type Page = Awaited<ReturnType<typeof contexte>>["page"];

  /** Laisse le rendu se poser et referme le bandeau promotionnel qui mange l'en-tête. */
  async function poser(page: Page) {
    await page.waitForTimeout(1400);
    const fermer = page.locator('button[aria-label*="ermer"], button[aria-label*="إغلاق"]').first();
    if (await fermer.count()) await fermer.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  /**
   * Prend une capture et la juge. Une image quasi uniforme (page blanche, écran
   * de chargement) est ÉCARTÉE : une figure vide décrédibilise tout le document.
   */
  async function tirer(page: Page, cle: string, hauteur?: number) {
    if (hauteur) await page.setViewportSize({ width: 1440, height: hauteur });
    await page.waitForTimeout(hauteur ? 700 : 0);
    const png = await page.screenshot({ type: "png" });
    if (hauteur) await page.setViewportSize({ width: 1440, height: 1000 });

    const stats = await sharp(png).stats();
    const contraste = Math.max(...stats.channels.map((c) => c.stdev));
    if (contraste < 8) {
      journal.ecartees.push(`${cle} (image sans contenu exploitable)`);
      dire(`ÉCARTÉE ${cle} — rendu vide (écart-type ${contraste.toFixed(1)})`);
      return;
    }
    writeFileSync(join(CACHE, `${cle}.png`), png);
    journal.retenues.push(cle);
    dire(`capture ${cle}`);
  }

  async function aller(page: Page, url: string) {
    await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await poser(page);
  }

  // ── 1a. Mise en scène : un vrai client, un vrai achat ────────────────────
  // Sans commande réelle, le tableau de bord, la liste des commandes et le
  // journal d'audit ne montrent que des écrans vides. On joue donc le parcours.

  const pub = await contexte("fr");
  let commandeId = "";

  async function connecterClient(page: Page) {
    await aller(page, "/auth");
    await page.getByPlaceholder("E-mail").fill(CLIENT.email);
    await page.getByPlaceholder("Mot de passe").fill(CLIENT.motDePasse);
    await page
      .getByRole("button", { name: /^Se connecter$/ })
      .last()
      .click();
    await page.waitForTimeout(2500);
    return page.url().includes("/account");
  }

  if (!(await connecterClient(pub.page))) {
    await aller(pub.page, "/auth");
    await pub.page
      .getByRole("button", { name: /Créez-en un|Pas encore/i })
      .first()
      .click()
      .catch(() => {});
    await pub.page.waitForTimeout(600);
    await pub.page.getByPlaceholder("Nom complet").fill(CLIENT.nom);
    await pub.page.getByPlaceholder("E-mail").fill(CLIENT.email);
    await pub.page.getByPlaceholder("Mot de passe").fill(CLIENT.motDePasse);
    await pub.page
      .getByRole("button", { name: /^Créer un compte$/ })
      .last()
      .click();
    await pub.page.waitForTimeout(2800);
  }

  // ── 1b. Côté client, en français ─────────────────────────────────────────
  await aller(pub.page, "/");
  await tirer(pub.page, "accueil");

  await aller(pub.page, "/category/laptops");
  await tirer(pub.page, "categorie");

  await aller(pub.page, "/product/thinkpad-x1-carbon");
  await tirer(pub.page, "produit");
  await pub.page
    .getByRole("button", { name: /Ajouter au panier/i })
    .first()
    .click()
    .catch(() => {});
  await pub.page.waitForTimeout(1200);

  await aller(pub.page, "/builder");
  await tirer(pub.page, "configurateur", 1250);

  await aller(pub.page, "/cart");
  await tirer(pub.page, "panier");

  await aller(pub.page, "/checkout");
  await pub.page
    .locator("#name")
    .fill(CLIENT.nom)
    .catch(() => {});
  await pub.page
    .locator("#phone")
    .fill("0551 23 45 67")
    .catch(() => {});
  await pub.page.getByRole("combobox").first().click();
  await pub.page.waitForTimeout(500);
  await pub.page
    .getByRole("option", { name: /Alger/ })
    .first()
    .click()
    .catch(() => {});
  await pub.page.waitForTimeout(800);
  await pub.page
    .locator("#address")
    .fill("Cité des Palmiers, bâtiment C, 3e étage — Bab Ezzouar")
    .catch(() => {});
  const radios = pub.page.locator('input[type="radio"]');
  await radios
    .nth(0)
    .check()
    .catch(() => {});
  await pub.page.waitForTimeout(400);
  await radios
    .nth(2)
    .check()
    .catch(() => {});
  await pub.page.waitForTimeout(700);
  await tirer(pub.page, "paiement", 1400);

  await pub.page.getByRole("button", { name: /Confirmer la commande/i }).click();
  await pub.page.waitForTimeout(3500);
  commandeId = new URL(pub.page.url()).searchParams.get("id") ?? "";
  await tirer(pub.page, "confirmation");

  await aller(pub.page, "/account");
  await pub.page
    .getByRole("tab", { name: /Commandes/ })
    .first()
    .click()
    .catch(() => {});
  await pub.page.waitForTimeout(1200);
  await tirer(pub.page, "compte-client");
  await pub.ctx.close();

  // ── 1c. Côté administration, en français ─────────────────────────────────
  const adm = await contexte("fr");
  await aller(adm.page, "/auth");
  await adm.page.getByPlaceholder("E-mail").fill(PROPRIETAIRE.email);
  await adm.page.getByPlaceholder("Mot de passe").fill(PROPRIETAIRE.motDePasse);
  await adm.page
    .getByRole("button", { name: /^Se connecter$/ })
    .last()
    .click();
  await adm.page.waitForTimeout(3000);

  // Notion : on branche la doublure pour que l'écran montre autre chose qu'un
  // formulaire vide. Si la doublure n'écoute pas, l'écran reste à l'étape 1 —
  // ce qui est aussi une vue honnête, et la capture est conservée telle quelle.
  await aller(adm.page, "/admin/notion");
  const champJeton = adm.page.locator('input[placeholder^="ntn_"]');
  if (await champJeton.count()) {
    await champJeton.fill("ntn_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0").catch(() => {});
    await adm.page
      .getByRole("button", { name: /Tester et enregistrer/i })
      .click()
      .catch(() => {});
    await adm.page.waitForTimeout(5000);
  }
  await tirer(adm.page, "notion", 1300);

  const ecrans: [string, string, number?][] = [
    ["tableau-de-bord", "/admin", 1250],
    ["commandes", "/admin/orders"],
    ["produits", "/admin/products", 1150],
    ["stock", "/admin/inventory", 1150],
    ["contenu", "/admin/content", 1150],
    ["reglages", "/admin/settings", 1250],
    ["utilisateurs", "/admin/users"],
    ["journal-audit", "/admin/audit"],
    ["developpeur", "/admin/developpeur", 1400],
  ];
  for (const [cle, url, hauteur] of ecrans) {
    await aller(adm.page, url);
    await tirer(adm.page, cle, hauteur);
  }

  if (commandeId) {
    await aller(adm.page, `/admin/orders/${commandeId}`);
    await tirer(adm.page, "fiche-commande", 1250);
  } else {
    journal.ecartees.push("fiche-commande (aucune commande n'a pu être créée)");
  }
  await adm.ctx.close();

  // ── 1d. En arabe : la preuve que le RTL n'est pas qu'une affaire de texte ─
  const ar = await contexte("ar");
  await aller(ar.page, "/");
  await tirer(ar.page, "accueil-ar");

  await aller(ar.page, "/builder");
  await tirer(ar.page, "configurateur-ar", 1250);

  await aller(ar.page, "/auth");
  await ar.page.locator('input[type="email"]').first().fill(PROPRIETAIRE.email);
  await ar.page.locator('input[type="password"]').first().fill(PROPRIETAIRE.motDePasse);
  await ar.page
    .locator("button")
    .filter({ hasText: /تسجيل الدخول/ })
    .last()
    .click()
    .catch(() => {});
  await ar.page.waitForTimeout(3000);
  await aller(ar.page, "/admin/orders");
  await tirer(ar.page, "commandes-ar");
  await ar.ctx.close();

  await nav.close();
  if (erreurs.length) dire(`erreurs de page pendant les captures : ${erreurs.join(" | ")}`);
}

// ── Phase 2 : compression et intégration ────────────────────────────────────

/** Compresse un PNG du cache en WebP et le rend en data-URI. `null` si absent. */
async function integrer(cle: string): Promise<string | null> {
  const chemin = join(CACHE, `${cle}.png`);
  if (!existsSync(chemin)) return null;
  const webp = await sharp(readFileSync(chemin))
    .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
    .webp({ quality: QUALITE_WEBP, effort: 6 })
    .toBuffer();
  return `data:image/webp;base64,${webp.toString("base64")}`;
}

// ── Le modèle du document ───────────────────────────────────────────────────
//
// Chaque bloc porte ses deux langues côte à côte. Ce n'est pas une coquetterie :
// c'est ce qui rend structurellement impossible qu'une section existe en
// français et manque en arabe. Le compte des sections est le même par
// construction, et le script le vérifie tout de même avant d'écrire.

type Bi = { fr: string; ar: string };
type BiListe = { fr: string[]; ar: string[] };

type Bloc =
  | { t: "p"; fr: string; ar: string }
  | { t: "liste"; fr: string[]; ar: string[] }
  | { t: "etapes"; fr: string[]; ar: string[] }
  | { t: "code"; texte: string; sous?: Bi }
  | { t: "tableau"; entetes: BiListe; lignes: { fr: string[][]; ar: string[][] } }
  | { t: "encadre"; genre: "note" | "attention" | "danger"; titre: Bi; fr: string; ar: string }
  | { t: "figure"; cle: string; legende: Bi }
  | { t: "renvoi"; docs: { fichier: string; fr: string; ar: string }[] };

type Section = { id: string; titre: Bi; chapeau: Bi; blocs: Bloc[] };

const SECTIONS: Section[] = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: "ce-quest-ce-site",
    titre: { fr: "Ce qu'est ce site", ar: "ما هو هذا الموقع" },
    chapeau: {
      fr: "Une vitrine et une boutique, dans le même site, en trois langues.",
      ar: "واجهة عرض ومتجر إلكتروني في موقع واحد، بثلاث لغات.",
    },
    blocs: [
      {
        t: "p",
        fr: "KA Tech vend des ordinateurs, des téléphones et des configurations sur mesure, avec livraison dans les 58 wilayas. Le site a **deux faces** : la face publique, que voient vos clients, et l'administration, où votre équipe travaille. C'est le même site : ce qu'un client commande apparaît immédiatement du côté administration.",
        ar: "يبيع «كا تك» أجهزة الكمبيوتر والهواتف والتجميعات المخصّصة، مع التوصيل إلى الولايات الثماني والخمسين. للموقع **وجهان**: الوجه العمومي الذي يراه زبائنك، والإدارة التي يعمل فيها فريقك. وهو موقع واحد: ما يطلبه الزبون يظهر فورًا في جهة الإدارة.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Côté public", "Côté administration"],
          ar: ["الجهة العمومية", "جهة الإدارة"],
        },
        lignes: {
          fr: [
            [
              "Accueil, catégories, fiches produits, blog, pages À propos et Contact",
              "Tableau de bord, analytique, rapports",
            ],
            [
              "Recherche, filtres par prix, marque et usage",
              "Produits, catégories, marques, stock, médias",
            ],
            [
              "Configurateur de PC en huit étapes",
              "Commandes, clients, coupons, livraison, paiements",
            ],
            [
              "Panier, commande, suivi dans « Mon compte »",
              "Contenu du site, blog, avis, messages, newsletter",
            ],
            [
              "Trois langues : français, anglais, arabe",
              "Utilisateurs et rôles, journal d'audit, réglages, sauvegarde",
            ],
          ],
          ar: [
            [
              "الصفحة الرئيسية، الفئات، بطاقات المنتجات، المدونة، صفحتا «من نحن» و«اتصل بنا»",
              "لوحة التحكم، التحليلات، التقارير",
            ],
            [
              "البحث، التصفية حسب السعر والماركة والاستعمال",
              "المنتجات، الفئات، الماركات، المخزون، الوسائط",
            ],
            ["مجمِّع الحاسوب في ثماني خطوات", "الطلبات، العملاء، قسائم الخصم، التوصيل، المدفوعات"],
            [
              "السلة، الطلب، المتابعة في «حسابي»",
              "محتوى الموقع، المدونة، التقييمات، الرسائل، النشرة البريدية",
            ],
            [
              "ثلاث لغات: الفرنسية والإنجليزية والعربية",
              "المستخدمون والأدوار، سجل التدقيق، الإعدادات، النسخ الاحتياطي",
            ],
          ],
        },
      },
      {
        t: "figure",
        cle: "accueil",
        legende: {
          fr: "La page d'accueil telle qu'un visiteur la découvre : le bandeau d'offres, la barre de recherche, le bouton **Configurez votre PC** et le sélecteur de langue. La pastille « http » en bas à droite n'apparaît qu'en développement : elle indique que les données viennent bien de la base et non d'un jeu de démonstration.",
          ar: "الصفحة الرئيسية كما يكتشفها الزائر: شريط العروض، وشريط البحث، وزر **جمّع حاسوبك**، ومُبدِّل اللغة. أما الشارة «http» أسفل اليمين فلا تظهر إلا في وضع التطوير: وهي تدلّ على أن البيانات تأتي فعلًا من قاعدة البيانات لا من مجموعة تجريبية.",
        },
      },
      {
        t: "p",
        fr: "**Les trois langues.** Un sélecteur dans l'en-tête bascule entre le français, l'anglais et l'arabe, et le choix reste mémorisé dans le navigateur du client. En arabe, toute la mise en page se retourne et se lit de droite à gauche — ce n'est pas seulement le texte qui change. À la première visite, la langue est déduite de celle du navigateur : un client dont le navigateur est en anglais verra le site en anglais, même en Algérie.",
        ar: "**اللغات الثلاث.** يوجد في الترويسة مُبدِّل ينتقل بين الفرنسية والإنجليزية والعربية، ويبقى الاختيار محفوظًا في متصفّح الزبون. وفي العربية تنقلب الصفحة بأكملها وتُقرأ من اليمين إلى اليسار — فالتغيير لا يطال النصّ وحده. وعند أول زيارة تُستنتج اللغة من لغة المتصفّح: فالزبون الذي يستعمل متصفّحًا بالإنجليزية سيرى الموقع بالإنجليزية، ولو كان في الجزائر.",
      },
      {
        t: "figure",
        cle: "accueil-ar",
        legende: {
          fr: "La même page d'accueil en arabe. Le menu, la recherche, les boutons et jusqu'à l'ordre des cartes de chiffres sont inversés : la page passe réellement en `dir=\"rtl\"`.",
          ar: 'الصفحة الرئيسية نفسها بالعربية. القائمة والبحث والأزرار، بل وحتى ترتيب بطاقات الأرقام، كلّها معكوسة: فالصفحة تنتقل فعليًا إلى الوضع `dir="rtl"`.',
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Le configurateur", ar: "المجمِّع" },
        fr: "Le client assemble sa machine en huit étapes — boîtier, carte mère, processeur, mémoire, SSD, carte graphique, alimentation, refroidissement — puis l'ajoute au panier comme un produit ordinaire. **Le prix affiché à l'écran est indicatif : c'est le serveur qui recalcule le total** à partir de ses propres fiches de composants. Personne ne peut modifier un prix depuis son navigateur.",
        ar: "يجمّع الزبون جهازه في ثماني خطوات — الصندوق، اللوحة الأم، المعالج، الذاكرة، قرص SSD، بطاقة الرسوميات، مزوّد الطاقة، التبريد — ثم يضيفه إلى السلة كأيّ منتج عادي. **والسعر المعروض على الشاشة إرشاديّ فقط: الخادم هو من يعيد حساب المجموع** انطلاقًا من بطاقات المكوّنات الخاصة به. فلا يستطيع أحد تعديل سعر من متصفّحه.",
      },
      {
        t: "p",
        fr: "**Sous le capot, en une phrase.** Le site public est un ensemble de fichiers statiques (produits par React et Vite) ; l'administration et les données passent par une API écrite en PHP 8.2 ; les données vivent dans une base au choix — SQLite, MySQL ou PostgreSQL. Aucun de ces éléments n'exige un serveur exotique : un hébergement mutualisé ordinaire suffit.",
        ar: "**تحت الغطاء، في جملة واحدة.** الموقع العمومي مجموعة ملفات ثابتة (من إنتاج React وVite)؛ أما الإدارة والبيانات فتمرّ عبر واجهة برمجية مكتوبة بلغة PHP 8.2؛ وتُخزَّن البيانات في قاعدة يقع اختيارها بين SQLite أو MySQL أو PostgreSQL. ولا يتطلّب أيٌّ من هذه العناصر خادمًا استثنائيًا: تكفي استضافة مشتركة عادية.",
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "README.md",
            fr: "la vue d'ensemble du projet et les commandes de développement.",
            ar: "نظرة عامة على المشروع وأوامر التطوير.",
          },
          {
            fichier: "docs/MANUEL-UTILISATION.md",
            fr: "le manuel complet, écran par écran (1 085 lignes).",
            ar: "الدليل الكامل، شاشةً بشاشة (1085 سطرًا).",
          },
        ],
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: "configuration",
    titre: { fr: "Configuration", ar: "الإعداد" },
    chapeau: {
      fr: "Deux fichiers de réglages, et quelques lignes dont dépend tout le reste.",
      ar: "ملفّا إعدادات، وبضعة أسطر يتوقّف عليها كلّ ما تبقّى.",
    },
    blocs: [
      {
        t: "p",
        fr: "Le site se règle par des **variables d'environnement**, réparties dans deux fichiers. Le premier, à la racine du projet, n'agit qu'au moment de la compilation, sur la machine du développeur. Le second, `api/.env`, vit sur le serveur et gouverne l'API.",
        ar: "يُضبَط الموقع بواسطة **متغيّرات البيئة**، الموزَّعة على ملفّين. الأول، في جذر المشروع، لا يعمل إلا لحظة التجميع، على جهاز المطوّر. والثاني، `api/.env`، يقيم على الخادم ويتحكّم في الواجهة البرمجية.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Variable", "Où", "Obligatoire", "Ce qu'elle décide"],
          ar: ["المتغيّر", "أين", "إلزامي", "ما الذي يقرّره"],
        },
        lignes: {
          fr: [
            [
              "`VITE_API_MODE`",
              "compilation",
              "oui — `http`",
              "Si elle ne vaut pas exactement `http`, le site compilé n'appelle jamais l'API et affiche des données de démonstration. Rien ne l'indique à l'écran.",
            ],
            [
              "`VITE_API_BASE_URL`",
              "compilation",
              "oui — **vide**",
              "Laissée vide, l'adresse de l'API est calculée là où le site est déposé. Lui donner une valeur casse le déploiement en sous-dossier.",
            ],
            [
              "`SITE_URL`",
              "compilation",
              "recommandé",
              "Le domaine écrit dans le plan du site (`sitemap.xml`).",
            ],
            [
              "`APP_ENV`",
              "`api/.env`",
              "oui — `production`",
              "En `dev`, les messages d'erreur, chemins de fichiers et numéros de ligne seraient renvoyés au visiteur.",
            ],
            [
              "`CORS_ORIGINS`",
              "`api/.env`",
              "oui — **vide**",
              "Le site et l'API partagent le domaine : aucune valeur n'est nécessaire. Y écrire quelque chose ouvre l'API à un autre domaine.",
            ],
            [
              "`DB_DRIVER` et `DB_*`",
              "`api/.env`",
              "oui",
              "Le moteur de base retenu et ses identifiants.",
            ],
            [
              "`INSTALL_OWNER_*`",
              "`api/.env`",
              "à l'installation",
              "Le nom, l'e-mail et le mot de passe du compte propriétaire. **Lus une seule fois, puis à effacer.**",
            ],
            [
              "`BACKUP_DIR`, `BACKUP_KEEP`",
              "`api/.env`",
              "oui",
              "Où sont écrites les sauvegardes, et combien on en garde.",
            ],
            [
              "`NOTION_CRYPTO_KEY`",
              "`api/.env`",
              "non",
              "Générée toute seule à la première connexion Notion. **Ne jamais la saisir ni la recopier d'une installation à l'autre.**",
            ],
          ],
          ar: [
            [
              "`VITE_API_MODE`",
              "التجميع",
              "نعم — `http`",
              "إن لم تساوِ `http` بالضبط، فلن يتّصل الموقع المُجمَّع بالواجهة البرمجية أبدًا، وسيعرض بيانات تجريبية. ولا شيء على الشاشة يشير إلى ذلك.",
            ],
            [
              "`VITE_API_BASE_URL`",
              "التجميع",
              "نعم — **فارغة**",
              "إذا تُركت فارغة، يُحسَب عنوان الواجهة البرمجية انطلاقًا من موضع إيداع الموقع. وإعطاؤها قيمة يُفسد النشر داخل مجلّد فرعي.",
            ],
            [
              "`SITE_URL`",
              "التجميع",
              "مُستحسَن",
              "النطاق الذي يُكتَب في خريطة الموقع (`sitemap.xml`).",
            ],
            [
              "`APP_ENV`",
              "`api/.env`",
              "نعم — `production`",
              "في وضع `dev` تُرسَل رسائل الأخطاء ومسارات الملفات وأرقام الأسطر إلى الزائر.",
            ],
            [
              "`CORS_ORIGINS`",
              "`api/.env`",
              "نعم — **فارغة**",
              "الموقع والواجهة البرمجية يتقاسمان النطاق نفسه، فلا حاجة إلى أي قيمة. وكتابة شيء فيها تفتح الواجهة أمام نطاق آخر.",
            ],
            [
              "`DB_DRIVER` و`DB_*`",
              "`api/.env`",
              "نعم",
              "محرّك قاعدة البيانات المعتمَد ومعرّفاته.",
            ],
            [
              "`INSTALL_OWNER_*`",
              "`api/.env`",
              "عند التثبيت",
              "اسم حساب المالك وبريده وكلمة مروره. **تُقرأ مرّة واحدة، ثم تُمحى.**",
            ],
            [
              "`BACKUP_DIR` و`BACKUP_KEEP`",
              "`api/.env`",
              "نعم",
              "أين تُكتَب النسخ الاحتياطية، وكم نسخة نحتفظ بها.",
            ],
            [
              "`NOTION_CRYPTO_KEY`",
              "`api/.env`",
              "لا",
              "تُولَّد تلقائيًا عند أول اتصال بنوشن. **لا تُدخِلها يدويًا ولا تنسخها من تثبيت إلى آخر.**",
            ],
          ],
        },
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "Jamais de secret dans une variable « VITE_ »",
          ar: "لا تضع سرًّا أبدًا في متغيّر يبدأ بـ «VITE_»",
        },
        fr: "L'outil de compilation **remplace ces variables dans le fichier JavaScript envoyé au navigateur**. Une clé placée là est visible par n'importe quel visiteur, en trois clics. Les variables de `api/.env` n'ont pas ce préfixe et ne quittent jamais le serveur.",
        ar: "أداة التجميع **تستبدل هذه المتغيّرات داخل ملف الجافاسكريبت المُرسَل إلى المتصفّح**. فأيّ مفتاح يوضع هناك يصبح مرئيًا لأيّ زائر بثلاث نقرات. أما متغيّرات `api/.env` فلا تحمل هذه البادئة ولا تغادر الخادم أبدًا.",
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Un piège connu du fichier d'exemple", ar: "فخّ معروف في ملف المثال" },
        fr: "Le `.env.example` de la racine contient la ligne `VITE_API_BASE_URL=/api/v1`. Recopié tel quel en `.env` avant de compiler, il fige l'adresse de l'API à la racine du domaine : un site déposé dans un sous-dossier n'obtiendra plus aucune donnée. **Videz cette valeur.**",
        ar: "يحتوي ملف `.env.example` في الجذر على السطر `VITE_API_BASE_URL=/api/v1`. وإذا نُسِخ كما هو إلى `.env` قبل التجميع، فإنه يُثبِّت عنوان الواجهة البرمجية على جذر النطاق: عندئذٍ لن يحصل موقع مُودَع في مجلّد فرعي على أيّ بيانات. **أفرِغ هذه القيمة.**",
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "api/.env.example",
            fr: "toutes les variables du serveur, commentées une par une (270 lignes).",
            ar: "جميع متغيّرات الخادم، معلَّقٌ عليها واحدًا واحدًا (270 سطرًا).",
          },
          {
            fichier: "docs/DEPLOIEMENT.md",
            fr: "le chapitre 7 détaille chaque bloc de `api/.env` selon le moteur retenu.",
            ar: "يفصّل الفصل السابع كل كتلة من `api/.env` حسب المحرّك المعتمَد.",
          },
        ],
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: "compilation",
    titre: { fr: "Compilation", ar: "التجميع" },
    chapeau: {
      fr: "Transformer le projet en fichiers prêts à téléverser — et pourquoi cela prend dix-sept secondes plutôt que six.",
      ar: "تحويل المشروع إلى ملفات جاهزة للرفع — ولماذا يستغرق ذلك سبع عشرة ثانية لا ستًّا.",
    },
    blocs: [
      {
        t: "p",
        fr: "La compilation se fait **sur votre ordinateur**, pas sur le serveur. L'hébergeur ne reçoit que le résultat : des fichiers statiques et du PHP. Il n'a besoin ni de Node.js, ni de Composer.",
        ar: "يجري التجميع **على جهازك**، لا على الخادم. فالمستضيف لا يتلقّى سوى النتيجة: ملفات ثابتة وشيفرة PHP. وهو لا يحتاج إلى Node.js ولا إلى Composer.",
      },
      {
        t: "code",
        texte: `bun install
VITE_API_MODE=http SITE_URL=https://votre-domaine.dz bun run build`,
        sous: {
          fr: "Remplacez le domaine par le vôtre, avec `https://` et sans barre oblique finale.",
          ar: "استبدل النطاق بنطاقك، مع `https://` ودون شرطة مائلة في النهاية.",
        },
      },
      {
        t: "p",
        fr: "La commande se déroule en **deux temps**. D'abord la compilation proprement dite, environ six secondes. Ensuite le **prérendu** : un navigateur sans écran visite les vingt-sept adresses du plan du site et enregistre, pour chacune, une page HTML déjà remplie. Total : environ dix-sept secondes.",
        ar: "يجري الأمر على **مرحلتين**. أولًا التجميع بمعناه الدقيق، نحو ستّ ثوانٍ. ثم **التصيير المسبق**: يزور متصفّح بلا شاشة العناوين السبعة والعشرين المدرَجة في خريطة الموقع، ويحفظ لكلٍّ منها صفحة HTML مملوءة سلفًا. المجموع: نحو سبع عشرة ثانية.",
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "À quoi sert le prérendu", ar: "ما فائدة التصيير المسبق" },
        fr: "Sans lui, un moteur de recherche qui visite le site reçoit une page vide : le contenu n'apparaît qu'une fois le JavaScript exécuté, ce que tous les robots ne font pas. Avec lui, **le contenu est déjà dans la page** — Google le lit, et les aperçus de partage sur les réseaux sociaux affichent le bon titre et la bonne image. Si une page échoue au prérendu, elle reste accessible normalement : la compilation n'échoue pas pour autant.",
        ar: "بدونه، يتلقّى محرّك البحث الذي يزور الموقع صفحةً فارغة: إذ لا يظهر المحتوى إلا بعد تنفيذ الجافاسكريبت، وليست كل العناكب تفعل ذلك. أما معه فإنّ **المحتوى موجود في الصفحة سلفًا** — فتقرأه غوغل، وتَعرِض معاينات المشاركة على الشبكات الاجتماعية العنوانَ والصورة الصحيحين. وإذا أخفق التصيير المسبق في صفحة ما، تظلّ تلك الصفحة متاحة كالمعتاد: فالتجميع لا يفشل بسبب ذلك.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "Ne laissez pas l'hébergeur construire",
          ar: "لا تدَع المستضيف يجمِّع",
        },
        fr: "**Le site est statique : la compilation se fait sur votre ordinateur, pas chez l'hébergeur.** Vous téléversez ensuite le dossier `dist/` tout prêt. L'API est en PHP — l'hébergeur n'a rien à construire.\n\nSi vous déclenchez la construction directement chez l'hébergeur (bouton « Build » ou pipeline CI), son serveur n'a **pas de navigateur** : le prérendu est silencieusement ignoré. La compilation aboutit, le site semble fonctionner — mais les moteurs de recherche reçoivent des pages vides. Pour une boutique en ligne, c'est une perte de visibilité organique, donc une perte de ventes, **sans qu'aucun message d'erreur ne l'annonce**.\n\nLa marche à suivre complète, geste par geste, est dans `docs/GUIDE-DEPLOIEMENT-HOSTINGER.md`.",
        ar: "**الموقع ثابت: يجري التجميع على جهازك، لا لدى المستضيف.** وبعدها ترفع مجلّد `dist/` جاهزًا. والواجهة البرمجية بلغة PHP — فالمستضيف ليس لديه ما يجمِّعه.\n\nإن شغّلتَ البناء مباشرةً لدى المستضيف (زرّ «Build» أو خطّ CI)، فإنّ خادمه لا يملك **متصفّحًا**: ويُتجاهَل التصيير المسبق في صمت تامّ. يكتمل التجميع، ويبدو الموقع يعمل — لكنّ محرّكات البحث تتلقّى صفحات فارغة. وبالنسبة إلى متجر إلكتروني، يعني ذلك فقدان الظهور في نتائج البحث، وبالتالي خسارة في المبيعات، **دون أن تُصدر أيّ رسالة خطأ تنبّه إلى ذلك**.\n\nالإجراء الكامل، خطوةً بخطوة، موجود في `docs/GUIDE-DEPLOIEMENT-HOSTINGER.md`.",
      },
      {
        t: "p",
        fr: "**Trois vérifications avant d'aller plus loin.** Aucune n'est facultative.",
        ar: "**ثلاثة فحوص قبل المضيّ قدمًا.** ولا واحد منها اختياري.",
      },
      {
        t: "etapes",
        fr: [
          "Le dossier `dist` existe et contient `index.html` et `index.php`.",
          "Le fichier `dist/.htaccess` existe. Il commence par un point, et beaucoup d'outils de copie l'ignorent. S'il manque : `cp public/.htaccess dist/.htaccess`. **Sans lui, seule la page d'accueil fonctionnera.**",
          "La commande `grep -rl 'VITE_API_MODE===' dist/assets/` ne doit **rien** afficher. Si elle affiche un nom de fichier, la compilation est restée en mode démonstration : recommencez.",
        ],
        ar: [
          "المجلّد `dist` موجود ويحتوي على `index.html` و`index.php`.",
          "الملف `dist/.htaccess` موجود. وهو يبدأ بنقطة، وكثير من أدوات النسخ تتجاهله. وإن كان مفقودًا: `cp public/.htaccess dist/.htaccess`. **وبدونه لن تعمل سوى الصفحة الرئيسية.**",
          "الأمر `grep -rl 'VITE_API_MODE===' dist/assets/` يجب ألّا يعرض **شيئًا**. فإن عرض اسم ملف، فمعنى ذلك أن التجميع بقي في الوضع التجريبي: أعِد الكرّة.",
        ],
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/GUIDE-DEPLOIEMENT-HOSTINGER.md",
            fr: "l'étape 3 explique les deux variables qui décident de tout, avec les lignes de code responsables.",
            ar: "تشرح الخطوة الثالثة المتغيّرين اللذين يقرّران كلّ شيء، مع أسطر الشيفرة المسؤولة.",
          },
        ],
      },
    ],
  },
  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: "installation",
    titre: { fr: "Installation", ar: "التثبيت" },
    chapeau: {
      fr: "Choisir une base de données, laisser l'installateur créer les tables, puis refermer la porte derrière soi.",
      ar: "اختيار قاعدة بيانات، وترك المثبِّت يُنشئ الجداول، ثم إغلاق الباب خلفك.",
    },
    blocs: [
      {
        t: "p",
        fr: "**Le choix de la base, d'abord.** Trois moteurs sont pris en charge, et les trois fonctionnent réellement. Le tableau ci-dessous donne la décision, pas seulement les critères.",
        ar: "**اختيار القاعدة أوّلًا.** ثلاثة محرّكات مدعومة، وثلاثتها تعمل فعلًا. والجدول التالي يعطي القرار، لا المعايير وحدها.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Votre situation", "Prenez", "Pourquoi"],
          ar: ["حالتك", "اختر", "لماذا"],
        },
        lignes: {
          fr: [
            [
              "Hébergement mutualisé ordinaire, une boutique",
              "**MySQL**",
              "Toujours fourni, sans supplément, avec phpMyAdmin et une sauvegarde côté hébergeur en plus de la vôtre.",
            ],
            [
              "L'hébergeur ne propose pas de base MySQL, ou son quota est épuisé",
              "**SQLite**",
              "N'exige rien : toute la base tient dans un fichier.",
            ],
            [
              "Vous essayez le projet sur votre ordinateur",
              "**SQLite**",
              "Aucun serveur à installer.",
            ],
            [
              "Vous voulez une console en ligne et des sauvegardes gérées par un tiers",
              "**PostgreSQL** (Supabase)",
              "Base hébergée ailleurs, accessible depuis plusieurs machines.",
            ],
            [
              "Vous n'êtes pas sûr",
              "**MySQL**",
              "Le choix par défaut, et le migrateur permet de changer d'avis plus tard sans rien réécrire.",
            ],
          ],
          ar: [
            [
              "استضافة مشتركة عادية، متجر واحد",
              "**MySQL**",
              "مُتوفّر دائمًا وبلا تكلفة إضافية، مع phpMyAdmin ونسخة احتياطية لدى المستضيف تُضاف إلى نسختك.",
            ],
            [
              "المستضيف لا يوفّر قاعدة MySQL، أو استُنفدت حصّته",
              "**SQLite**",
              "لا تتطلّب شيئًا: القاعدة كلّها في ملف واحد.",
            ],
            ["تجرّب المشروع على جهازك", "**SQLite**", "لا خادم يُثبَّت."],
            [
              "تريد لوحة تحكّم على الإنترنت ونسخًا احتياطية يديرها طرف ثالث",
              "**PostgreSQL** (سوبابيز)",
              "قاعدة مستضافة في مكان آخر، يمكن الوصول إليها من عدّة أجهزة.",
            ],
            [
              "لست متأكّدًا",
              "**MySQL**",
              "الخيار الافتراضي، وأداة الترحيل تتيح تغيير الرأي لاحقًا دون إعادة كتابة شيء.",
            ],
          ],
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Le seul risque propre à SQLite", ar: "الخطر الوحيد الخاص بـ SQLite" },
        fr: "Toute la base tient dans un fichier, et **ce fichier doit être placé hors de la racine web**, dans un dossier inscriptible par PHP — par exemple `katech-data/`, à côté de `public_html/` et non dedans. Déposé dans `public_html`, il est téléchargeable par n'importe qui : clients, commandes et mots de passe hachés compris.",
        ar: "القاعدة كلّها في ملف واحد، و**يجب وضع هذا الملف خارج جذر الويب**، في مجلّد قابل للكتابة من طرف PHP — مثل `katech-data/` بجوار `public_html/` لا داخله. فإن وُضِع داخل `public_html` صار بإمكان أيّ شخص تنزيله: بما فيه العملاء والطلبات وكلمات المرور المُجزَّأة.",
      },
      {
        t: "p",
        fr: "**Ensuite, l'installateur.** Une fois `api/.env` renseigné, ouvrez `https://votre-domaine.dz/api/install.php` dans un navigateur. Le script crée les tables, importe le catalogue et crée le compte propriétaire à partir des trois lignes `INSTALL_OWNER_*`. Le mot de passe est haché — il n'est jamais conservé en clair — et l'installateur **refuse** un mot de passe faible ou prévisible.",
        ar: "**ثم يأتي المثبِّت.** بعد ملء `api/.env`، افتح `https://votre-domaine.dz/api/install.php` في المتصفّح. ينشئ البرنامج الجداول، ويستورد الكتالوج، وينشئ حساب المالك انطلاقًا من الأسطر الثلاثة `INSTALL_OWNER_*`. وتُجزَّأ كلمة المرور — فلا تُحفَظ أبدًا بصيغة مقروءة — كما **يرفض** المثبِّت كلمة مرور ضعيفة أو متوقَّعة.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "Les trois gestes à ne jamais oublier après l'installation",
          ar: "الإجراءات الثلاثة التي لا يجوز نسيانها بعد التثبيت",
        },
        fr: "**1.** Supprimer le fichier `api/install.php`. Il se protège déjà par un témoin, mais un fichier absent protège mieux qu'un fichier protégé : il suffirait d'un téléversement futur effaçant le témoin pour rouvrir la porte. **2.** Vider la valeur de `INSTALL_OWNER_PASSWORD` dans `api/.env` — gardez la ligne, effacez la valeur. **3.** Supprimer `sonde-hebergeur.php` s'il a été téléversé : il publie la version de PHP, la liste des extensions et les chemins absolus du serveur. Les deux adresses correspondantes doivent ensuite renvoyer une erreur 404.",
        ar: "**1.** احذف الملف `api/install.php`. صحيحٌ أنه يحمي نفسه بعلامة، لكنّ ملفًا غائبًا يحمي أفضل من ملف محميّ: إذ يكفي رفعٌ لاحق يمحو تلك العلامة حتى يُفتَح الباب من جديد. **2.** أفرِغ قيمة `INSTALL_OWNER_PASSWORD` في `api/.env` — أبقِ السطر وامحُ القيمة. **3.** احذف `sonde-hebergeur.php` إن كان قد رُفِع: فهو ينشر إصدار PHP وقائمة الامتدادات والمسارات المطلقة للخادم. وينبغي بعد ذلك أن يُرجِع العنوانان المعنيّان الخطأ 404.",
      },
      {
        t: "figure",
        cle: "developpeur",
        legende: {
          fr: "L'écran **Développeur** (réservé au propriétaire) est la preuve que l'installation a réussi : le moteur en service, le fichier ou la base utilisée, sa taille, et le nombre de lignes table par table. Une installation saine annonce **24 tables**.",
          ar: "شاشة **المطوّر** (المخصَّصة للمالك) هي الدليل على نجاح التثبيت: المحرّك العامل، والملف أو القاعدة المستعمَلة، وحجمها، وعدد الأسطر جدولًا جدولًا. والتثبيت السليم يعلن عن **24 جدولًا**.",
        },
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/GUIDE-BASES-DE-DONNEES.md",
            fr: "le mode d'emploi complet des trois moteurs, la migration de l'un à l'autre et la garantie anti-survente (1 453 lignes).",
            ar: "دليل الاستعمال الكامل للمحرّكات الثلاثة، والترحيل من أحدها إلى الآخر، وضمان منع البيع الزائد (1453 سطرًا).",
          },
          {
            fichier: "docs/DEPLOIEMENT.md",
            fr: "les chapitres 6 à 9 : choix du pilote, `api/.env`, installation, suppressions obligatoires.",
            ar: "الفصول من السادس إلى التاسع: اختيار المحرّك، و`api/.env`، والتثبيت، والحذف الإلزامي.",
          },
        ],
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: "deploiement",
    titre: { fr: "Déploiement", ar: "النشر" },
    chapeau: {
      fr: "Mettre le site en ligne chez un hébergeur mutualisé, sans ligne de commande et sans accès SSH.",
      ar: "نشر الموقع لدى مستضيف مشترك، دون سطر أوامر ودون وصول SSH.",
    },
    blocs: [
      {
        t: "p",
        fr: "Tout se fait depuis le gestionnaire de fichiers du panneau de l'hébergeur, ou par FTP. Neuf étapes, dans cet ordre.",
        ar: "كلّ شيء يتمّ من مدير الملفات في لوحة المستضيف، أو عبر FTP. تسع خطوات، بهذا الترتيب.",
      },
      {
        t: "etapes",
        fr: [
          "**Sonder l'hébergement.** Téléverser `scripts/sonde-hebergeur.php` dans `public_html/`, l'ouvrir dans le navigateur, lire le verdict — version de PHP, extensions disponibles, dossiers inscriptibles — **puis supprimer le fichier**.",
          "**Compiler** sur votre ordinateur (chapitre précédent).",
          "**Téléverser deux ensembles.** Le contenu de `dist/` va dans `public_html/`. Le dossier `api/` va dans `public_html/api/`. Vérifiez que les fichiers commençant par un point ont bien été copiés.",
          "**Créer les dossiers hors racine.** `katech-data/` et `katech-data/backups/`, à côté de `public_html/` et non dedans. C'est là que vivront la base SQLite, s'il y a lieu, et les sauvegardes.",
          "**Renseigner `api/.env`** à partir de `api/.env.example`.",
          "**Lancer l'installateur** à l'adresse `/api/install.php`.",
          "**Verrouiller** : supprimer l'installateur, vider le mot de passe d'installation, supprimer la sonde, vérifier que le certificat HTTPS est actif et que la redirection depuis `http://` fonctionne.",
          "**Recette.** Ouvrir l'accueil, une fiche produit, rafraîchir une page profonde (elle ne doit pas donner d'erreur 404), passer une commande d'essai, la retrouver dans l'administration.",
          "**Programmer la sauvegarde** par tâche CRON (chapitre Entretien).",
        ],
        ar: [
          "**فحص الاستضافة.** ارفع `scripts/sonde-hebergeur.php` إلى `public_html/`، وافتحه في المتصفّح، واقرأ الحكم — إصدار PHP، والامتدادات المتاحة، والمجلّدات القابلة للكتابة — **ثم احذف الملف**.",
          "**التجميع** على جهازك (الفصل السابق).",
          "**رفع مجموعتين.** محتوى `dist/` يذهب إلى `public_html/`. والمجلّد `api/` يذهب إلى `public_html/api/`. وتأكّد من أن الملفات التي تبدأ بنقطة قد نُسِخت فعلًا.",
          "**إنشاء المجلّدات خارج الجذر.** `katech-data/` و`katech-data/backups/`، بجوار `public_html/` لا داخله. هناك ستقيم قاعدة SQLite، عند الاقتضاء، والنسخ الاحتياطية.",
          "**ملء `api/.env`** انطلاقًا من `api/.env.example`.",
          "**تشغيل المثبِّت** على العنوان `/api/install.php`.",
          "**الإقفال**: احذف المثبِّت، وأفرِغ كلمة مرور التثبيت، واحذف أداة الفحص، وتأكّد من أن شهادة HTTPS فعّالة وأن التحويل من `http://` يعمل.",
          "**الاستلام.** افتح الصفحة الرئيسية، ثم بطاقة منتج، وأعِد تحميل صفحة عميقة (يجب ألّا تعطي الخطأ 404)، ومرِّر طلبًا تجريبيًا، ثم اعثر عليه في الإدارة.",
          "**برمجة النسخ الاحتياطي** بمهمة CRON (فصل الصيانة).",
        ],
      },
      {
        t: "encadre",
        genre: "attention",
        titre: { fr: "Le fichier qui commence par un point", ar: "الملف الذي يبدأ بنقطة" },
        fr: "`dist/.htaccess` est le fichier qui indique au serveur que toutes les adresses doivent être servies par la même page. Les clients FTP et les outils de copie le sautent volontiers, parce qu'il est masqué. **S'il manque, l'accueil s'affichera et toutes les autres pages donneront une erreur 404.** C'est, de loin, la panne la plus fréquente à la mise en ligne.",
        ar: "الملف `dist/.htaccess` هو الذي يخبر الخادم بأن جميع العناوين يجب أن تُقدَّم من الصفحة نفسها. وبرامج FTP وأدوات النسخ كثيرًا ما تتخطّاه لأنه مخفيّ. **وإن غاب، ستظهر الصفحة الرئيسية وحدها وستعطي كلّ الصفحات الأخرى الخطأ 404.** وهذا، بفارق كبير، أكثر الأعطال شيوعًا عند النشر.",
      },
      {
        t: "p",
        fr: "**Ce qui doit être refusé après le verrouillage.** Ouvrez ces trois adresses : elles doivent toutes échouer.",
        ar: "**ما ينبغي أن يُرفَض بعد الإقفال.** افتح هذه العناوين الثلاثة: يجب أن تُخفق كلّها.",
      },
      {
        t: "code",
        texte: `https://votre-domaine.dz/api/install.php        → 404
https://votre-domaine.dz/sonde-hebergeur.php    → 404
https://votre-domaine.dz/api/.env               → 403 ou 404`,
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/GUIDE-DEPLOIEMENT-HOSTINGER.md",
            fr: "les neuf étapes détaillées geste par geste, le cas du sous-dossier, et les défauts connus constatés à la rédaction (1 015 lignes).",
            ar: "الخطوات التسع مفصَّلةً إجراءً إجراءً، وحالة المجلّد الفرعي، والعيوب المعروفة التي رُصِدت عند التحرير (1015 سطرًا).",
          },
          {
            fichier: "docs/DEPLOIEMENT.md",
            fr: "l'arborescence cible exacte et la liste de vérification après déploiement.",
            ar: "الشجرة المستهدَفة بدقّة وقائمة التحقّق بعد النشر.",
          },
        ],
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: "utilisation",
    titre: { fr: "Utilisation au quotidien", ar: "الاستعمال اليومي" },
    chapeau: {
      fr: "Ce que vit le client, et ce que fait votre équipe — les deux côtés du même écran.",
      ar: "ما يعيشه الزبون، وما يفعله فريقك — وجهان لشاشة واحدة.",
    },
    blocs: [
      {
        t: "p",
        fr: "**Côté client.** Quatre chemins mènent à un produit : la recherche, le menu Catégories, la page d'accueil et le blog. Dans une catégorie, le client filtre par prix maximum, par marque et par usage, puis trie.",
        ar: "**عند الزبون.** أربعة مسالك تؤدّي إلى المنتج: البحث، وقائمة الفئات، والصفحة الرئيسية، والمدوّنة. وداخل الفئة، يُصفّي الزبون حسب السعر الأقصى والماركة والاستعمال، ثم يرتّب النتائج.",
      },
      {
        t: "figure",
        cle: "categorie",
        legende: {
          fr: "La page d'une catégorie : les filtres à gauche, le tri en haut, et le nombre de résultats annoncé. Ce sont les mêmes produits que ceux de l'écran **Produits** de l'administration.",
          ar: "صفحة فئة: المرشِّحات على الجانب، والترتيب في الأعلى، وعدد النتائج معلَنٌ. وهي المنتجات نفسها الموجودة في شاشة **المنتجات** في الإدارة.",
        },
      },
      {
        t: "figure",
        cle: "produit",
        legende: {
          fr: "Une fiche produit. Le prix, l'état du stock — **En stock**, **Dernières pièces disponibles** ou **Rupture** — et quatre onglets : Caractéristiques, Description, Avis, Livraison & garantie. Un avis déposé par un client n'apparaît qu'après votre modération.",
          ar: "بطاقة منتج. السعر، وحالة المخزون — **متوفّر** أو **آخر القطع المتاحة** أو **غير متوفّر** — وأربعة تبويبات: المواصفات، والوصف، والتقييمات، والتوصيل والضمان. والتقييم الذي يتركه الزبون لا يظهر إلا بعد مراجعتك.",
        },
      },
      {
        t: "figure",
        cle: "configurateur",
        legende: {
          fr: "Le configurateur. À droite, le récapitulatif suit l'avancement et le total se met à jour à chaque clic ; tant que les huit étapes ne sont pas remplies, le message **Complétez votre sélection** liste ce qui manque. Le bouton est désactivé pour un visiteur non connecté.",
          ar: "المجمِّع. على الجانب، يتابع الملخّص التقدّم ويتحدّث المجموع مع كل نقرة؛ وما دامت الخطوات الثماني غير مكتملة، تعرض رسالة **أكمِل اختيارك** ما ينقص. والزر معطَّل بالنسبة إلى زائر غير مسجَّل الدخول.",
        },
      },
      {
        t: "figure",
        cle: "configurateur-ar",
        legende: {
          fr: "Le même configurateur en arabe : les étapes numérotées, le récapitulatif et le total basculent à droite. La mise en page suit réellement le sens de lecture.",
          ar: "المجمِّع نفسه بالعربية: الخطوات المرقَّمة والملخّص والمجموع تنتقل إلى الجهة المقابلة. فالتخطيط يتبع فعليًا اتجاه القراءة.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Un compte est obligatoire pour acheter", ar: "الحساب إلزامي للشراء" },
        fr: "Le panier, les favoris et la commande sont réservés aux clients connectés. Un visiteur qui clique sur le panier arrive sur l'écran de connexion. **C'est l'explication la plus fréquente d'un client qui « n'arrive pas à commander » :** il n'a pas encore créé son compte. La création demande trois informations — nom complet, adresse électronique, mot de passe de six caractères au minimum.",
        ar: "السلة والمفضّلة والطلب محجوزة للزبائن المسجَّلين. والزائر الذي ينقر على السلة ينتقل إلى شاشة تسجيل الدخول. **وهذا أكثر تفسير شائع لزبون «لا يستطيع إتمام الطلب»:** فهو لم ينشئ حسابه بعد. ويتطلّب الإنشاء ثلاث معلومات — الاسم الكامل، والبريد الإلكتروني، وكلمة مرور من ستّة محارف على الأقل.",
      },
      {
        t: "figure",
        cle: "panier",
        legende: {
          fr: "Le panier : quantités ajustables, champ **Code promo** avec son bouton **Appliquer**, sous-total, et la mention « Livraison : calculée à l'étape suivante ».",
          ar: "السلة: كمّيات قابلة للتعديل، وحقل **رمز ترويجي** مع زرّ **تطبيق**، والمجموع الفرعي، وعبارة «التوصيل: يُحسب في الخطوة التالية».",
        },
      },
      {
        t: "figure",
        cle: "paiement",
        legende: {
          fr: "L'écran **Finaliser ma commande** : coordonnées avec les 58 wilayas, choix entre livraison à domicile et retrait au bureau Yalidine, modes de paiement activés, notes, récapitulatif. Ici le seuil de franco de port est atteint : la mention **Livraison offerte appliquée** apparaît et la livraison passe à zéro.",
          ar: "شاشة **إتمام طلبي**: بيانات الاتصال مع الولايات الثماني والخمسين، والاختيار بين التوصيل إلى المنزل والاستلام من مكتب Yalidine، ووسائل الدفع المفعَّلة، والملاحظات، والملخّص. وهنا بُلِغَت عتبة التوصيل المجاني: فتظهر عبارة **تم تطبيق التوصيل المجاني** وينزل سعر التوصيل إلى الصفر.",
        },
      },
      {
        t: "figure",
        cle: "confirmation",
        legende: {
          fr: "La confirmation. Le numéro de commande — ici `KA330042` — est affiché, avec le récapitulatif et le mode de paiement retenu. Le client retrouvera cette commande dans **Mon compte › Commandes**.",
          ar: "التأكيد. رقم الطلب — هنا `KA330042` — معروضٌ مع الملخّص ووسيلة الدفع المعتمَدة. وسيجد الزبون هذا الطلب في **حسابي ‹ الطلبات**.",
        },
      },
      {
        t: "figure",
        cle: "compte-client",
        legende: {
          fr: "L'onglet **Commandes** de l'espace client : numéro, date, nombre d'articles, montant et statut. C'est exactement la même information que celle que voit votre équipe — le client n'a pas besoin de téléphoner pour savoir où en est sa commande.",
          ar: "تبويب **الطلبات** في فضاء الزبون: الرقم، والتاريخ، وعدد المنتجات، والمبلغ، والحالة. وهي المعلومة نفسها التي يراها فريقك تمامًا — فلا يحتاج الزبون إلى الاتصال هاتفيًا ليعرف أين وصل طلبه.",
        },
      },
      {
        t: "p",
        fr: "**Côté administration.** Le menu est découpé en six sections — Vue d'ensemble, Catalogue, Ventes, Relation client, Contenu, Système. Les entrées interdites au rôle en cours **ne s'affichent pas** : un lecteur voit un menu plus court qu'un propriétaire, ce n'est pas une panne.",
        ar: "**في جهة الإدارة.** القائمة مقسَّمة إلى ستّة أقسام — نظرة عامة، والكتالوج، والمبيعات، وعلاقات العملاء، والمحتوى، والنظام. والمداخل الممنوعة على الدور الحالي **لا تظهر**: فالمُشاهد يرى قائمة أقصر من قائمة المالك، وليس هذا عطلًا.",
      },
      {
        t: "figure",
        cle: "tableau-de-bord",
        legende: {
          fr: "Le tableau de bord : nombre de produits, valeur du catalogue, chiffre d'affaires, commandes en attente, avis à modérer, stock faible. En dessous, la courbe des trente derniers jours et les dernières commandes reçues.",
          ar: "لوحة التحكّم: عدد المنتجات، وقيمة الكتالوج، ورقم الأعمال، والطلبات قيد الانتظار، والتقييمات التي تنتظر المراجعة، والمخزون المنخفض. وتحتها منحنى الثلاثين يومًا الأخيرة وآخر الطلبات الواردة.",
        },
      },
      {
        t: "figure",
        cle: "commandes",
        legende: {
          fr: "La liste des commandes, filtrable par statut : En attente, En traitement, Expédiée, Livrée, Annulée. Chaque onglet porte son compte. C'est l'écran le plus visité de la journée.",
          ar: "قائمة الطلبات، قابلة للتصفية حسب الحالة: قيد الانتظار، وقيد المعالجة، ومشحونة، ومسلَّمة، وملغاة. ويحمل كلّ تبويب عدده. وهي الشاشة الأكثر زيارةً في اليوم.",
        },
      },
      {
        t: "figure",
        cle: "commandes-ar",
        legende: {
          fr: "La même liste en arabe. Les libellés sont ceux de l'application — الطلبات، قيد الانتظار، مشحونة — et la table entière se lit de droite à gauche : la colonne du numéro passe à droite, celle des actions à gauche.",
          ar: "القائمة نفسها بالعربية. التسميات هي تسميات التطبيق — الطلبات، قيد الانتظار، مشحونة — والجدول كلّه يُقرأ من اليمين إلى اليسار: فعمود الرقم ينتقل إلى اليمين، وعمود الإجراءات إلى اليسار.",
        },
      },
      {
        t: "figure",
        cle: "fiche-commande",
        legende: {
          fr: "Une fiche commande : le client, ses coordonnées, la wilaya, les articles, les totaux et le contrôle qui fait avancer le statut. Changer le statut ici est ce que le client verra dans son espace.",
          ar: "بطاقة طلب: الزبون، وبيانات اتصاله، والولاية، والمنتجات، والمجاميع، وأداة التحكّم التي تُقدِّم الحالة. وتغيير الحالة هنا هو ما سيراه الزبون في فضائه.",
        },
      },
      {
        t: "figure",
        cle: "produits",
        legende: {
          fr: "L'écran **Produits** : recherche, filtres, et pour chaque ligne le prix, le stock et les actions. C'est ici qu'on ajoute un produit, qu'on corrige un prix, qu'on retire un article du catalogue.",
          ar: "شاشة **المنتجات**: البحث، والمرشِّحات، ولكلّ سطر السعر والمخزون والإجراءات. وهنا يُضاف المنتج، ويُصحَّح السعر، ويُسحَب صنفٌ من الكتالوج.",
        },
      },
      {
        t: "figure",
        cle: "stock",
        legende: {
          fr: "L'écran **Stock** répond à la question « il me reste combien ? ». Toute correction de quantité y est tracée : le journal d'audit en garde l'auteur, la date et l'écart.",
          ar: "شاشة **المخزون** تجيب عن سؤال «كم بقي لديّ؟». وكلّ تصحيح للكمّية يُسجَّل هناك: إذ يحتفظ سجل التدقيق بصاحبه وتاريخه وقيمة الفارق.",
        },
      },
      {
        t: "figure",
        cle: "contenu",
        legende: {
          fr: "**Contenu du site** : les textes affichés au public — bandeau, accroches, pages — se modifient ici, sans toucher au code. C'est aussi ici que se règlent les étapes du configurateur.",
          ar: "**محتوى الموقع**: النصوص المعروضة على الجمهور — الشريط، والعبارات، والصفحات — تُعدَّل من هنا دون المساس بالشيفرة. ومن هنا أيضًا تُضبَط خطوات المجمِّع.",
        },
      },
      {
        t: "figure",
        cle: "reglages",
        legende: {
          fr: "Les **Paramètres** : coordonnées de la boutique, livraison, paiements, notifications. Les réglages courants sont accessibles à l'administrateur ; ceux qui coupent le site public — mode maintenance, données de démonstration — sont réservés au propriétaire.",
          ar: "**الإعدادات**: بيانات المتجر، والتوصيل، والمدفوعات، والإشعارات. الإعدادات الجارية متاحة للمدير؛ أما تلك التي توقف الموقع العمومي — وضع الصيانة، والبيانات التجريبية — فمحجوزة للمالك.",
        },
      },
      {
        t: "p",
        fr: "**Les cinq rôles.** Ils sont hiérarchiques : chaque rôle possède tous les droits du précédent, plus les siens.",
        ar: "**الأدوار الخمسة.** وهي هرمية: كل دور يملك جميع صلاحيات الدور الذي قبله، مضافًا إليها صلاحياته.",
      },
      {
        t: "tableau",
        entetes: {
          fr: ["Action", "Lecteur", "Éditeur", "Administrateur", "Propriétaire"],
          ar: ["الإجراء", "مُشاهد", "محرِّر", "مدير", "المالك"],
        },
        lignes: {
          fr: [
            ["Consulter listes, fiches, tableaux, historiques", "oui", "oui", "oui", "oui"],
            ["Créer un produit, une catégorie, un article", "non", "oui", "oui", "oui"],
            ["Modifier un contenu, un prix, un stock, un statut", "non", "oui", "oui", "oui"],
            ["**Supprimer** quoi que ce soit", "non", "non", "oui", "oui"],
            ["Régler la livraison, les paiements, les paramètres", "non", "non", "oui", "oui"],
            ["Créer un compte, changer un rôle", "non", "non", "non", "oui"],
            ["Mode maintenance et réglages critiques", "non", "non", "non", "oui"],
            ["Sauvegarde, migration, réinitialisation", "non", "non", "non", "oui"],
          ],
          ar: [
            ["الاطّلاع على القوائم والبطاقات والجداول والسجلّات", "نعم", "نعم", "نعم", "نعم"],
            ["إنشاء منتج أو فئة أو مقال", "لا", "نعم", "نعم", "نعم"],
            ["تعديل محتوى أو سعر أو مخزون أو حالة", "لا", "نعم", "نعم", "نعم"],
            ["**حذف** أيّ شيء", "لا", "لا", "نعم", "نعم"],
            ["ضبط التوصيل والمدفوعات والإعدادات", "لا", "لا", "نعم", "نعم"],
            ["إنشاء حساب أو تغيير دور", "لا", "لا", "لا", "نعم"],
            ["وضع الصيانة والإعدادات الحسّاسة", "لا", "لا", "لا", "نعم"],
            ["النسخ الاحتياطي والترحيل وإعادة التعيين", "لا", "لا", "لا", "نعم"],
          ],
        },
      },
      {
        t: "figure",
        cle: "utilisateurs",
        legende: {
          fr: "**Utilisateurs et rôles.** Un administrateur peut consulter cet annuaire, mais seul le propriétaire crée un compte ou change un rôle — sans quoi un administrateur se promouvrait propriétaire en deux clics.",
          ar: "**المستخدمون والأدوار.** يستطيع المدير الاطّلاع على هذا الدليل، لكنّ المالك وحده هو من ينشئ حسابًا أو يغيّر دورًا — وإلّا لرقّى مديرٌ نفسَه إلى مالك بنقرتين.",
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Un refus n'est jamais une panne", ar: "الرفض ليس عطلًا أبدًا" },
        fr: "Quand une action est interdite, le bouton est désactivé et une infobulle explique pourquoi. Si l'action est tentée malgré tout, **c'est le serveur qui refuse**, avec un message qui nomme le rôle requis et le rôle en cours : « Action réservée au rôle Administrateur ou supérieur. Votre rôle : Éditeur. » Le collaborateur sait alors exactement quoi demander.",
        ar: "حين يكون الإجراء ممنوعًا، يُعطَّل الزر وتشرح تلميحةٌ السبب. وإن حُوِل الإجراء رغم ذلك، **فالخادم هو من يرفض**، برسالة تسمّي الدور المطلوب والدور الحالي: «إجراء محجوز لدور المدير أو ما فوقه. دورك: محرِّر.» عندئذٍ يعرف الزميل بالضبط ما ينبغي أن يطلبه.",
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/MANUEL-UTILISATION.md",
            fr: "chaque écran, chaque geste, chapitre par chapitre — traiter une commande, tenir le stock, animer la boutique, sortir les rapports.",
            ar: "كلّ شاشة وكلّ إجراء، فصلًا بفصل — معالجة الطلبات، وإدارة المخزون، وتنشيط المتجر، واستخراج التقارير.",
          },
          {
            fichier: "docs/PERMISSIONS.md",
            fr: "la matrice complète des permissions et la justification de chaque seuil.",
            ar: "المصفوفة الكاملة للصلاحيات ومبرِّر كل عتبة.",
          },
        ],
      },
    ],
  },
  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: "notion",
    titre: { fr: "Notion, en option", ar: "نوشن، خيار اختياري" },
    chapeau: {
      fr: "Suivre ses commandes depuis un tableau Notion — et ce que la boutique continue de faire quand Notion tombe.",
      ar: "متابعة الطلبات من جدول في نوشن — وما يواصل المتجر فعله حين يتعطّل نوشن.",
    },
    blocs: [
      {
        t: "p",
        fr: "Notion est un outil de tableaux collaboratifs, consultable depuis un téléphone. Le site sait y recopier vos commandes, pour que vous suiviez leur avancement de n'importe où et que vous y ajoutiez le transporteur et le numéro de colis. **C'est entièrement facultatif** : la boutique fonctionne sans, et n'en coûte rien si vous ne l'activez pas.",
        ar: "نوشن أداةُ جداول تعاونية، يمكن الاطّلاع عليها من الهاتف. ويعرف الموقع كيف ينسخ إليها طلباتك، لتتابع تقدّمها من أيّ مكان ولتضيف إليها الناقل ورقم الطرد. **وهذا اختياريّ تمامًا**: فالمتجر يعمل بدونه، ولا يكلّف شيئًا إن لم تُفعِّله.",
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "La règle qui gouverne tout le reste", ar: "القاعدة التي تحكم كلّ ما تبقّى" },
        fr: "**Notion est un miroir, jamais la source de vérité.** La base de données reste maîtresse du stock, des prix et des paiements. Notion ne pilote que le suivi : statut, transporteur, numéro de colis, note.",
        ar: "**نوشن مرآةٌ، وليس مصدرَ الحقيقة أبدًا.** فقاعدة البيانات تبقى سيّدةَ المخزون والأسعار والمدفوعات. ولا يتحكّم نوشن إلا في المتابعة: الحالة، والناقل، ورقم الطرد، والملاحظة.",
      },
      {
        t: "tableau",
        entetes: { fr: ["Question", "Réponse"], ar: ["السؤال", "الجواب"] },
        lignes: {
          fr: [
            [
              "Notion est éteint, peut-on encore vendre ?",
              "**Oui.** La commande est enregistrée dans la base avant tout appel réseau.",
            ],
            [
              "Vous changez un prix dans Notion ?",
              "**Rien.** La valeur sera écrasée à la synchronisation suivante.",
            ],
            [
              "Vous passez une commande en « Expédiée » dans Notion ?",
              "**C'est pris en compte** : le statut redescend dans la base.",
            ],
            [
              "Notion peut-il créer une commande ?",
              "**Non.** Rien n'est jamais créé depuis Notion.",
            ],
            [
              "Notion n'est pas configuré, que coûte ce module ?",
              "**Rien** : aucun appel, aucune erreur, aucune trace.",
            ],
          ],
          ar: [
            [
              "نوشن متوقّف، هل يمكن مواصلة البيع؟",
              "**نعم.** فالطلب يُسجَّل في القاعدة قبل أيّ اتصال بالشبكة.",
            ],
            ["غيّرتَ سعرًا داخل نوشن؟", "**لا شيء.** ستُستبدل القيمة عند المزامنة التالية."],
            [
              "حوّلتَ طلبًا إلى «مشحون» داخل نوشن؟",
              "**يُؤخَذ بعين الاعتبار**: إذ تنزل الحالة إلى القاعدة.",
            ],
            ["هل يستطيع نوشن إنشاء طلب؟", "**لا.** لا يُنشَأ شيء انطلاقًا من نوشن أبدًا."],
            [
              "إن لم يكن نوشن مُعدًّا، فما تكلفة هذه الوحدة؟",
              "**لا شيء**: لا اتصال، ولا خطأ، ولا أثر.",
            ],
          ],
        },
      },
      {
        t: "figure",
        cle: "notion",
        legende: {
          fr: "L'écran **Notion** de l'administration, réservé au propriétaire. La mise en service se fait en trois étapes : coller le jeton de connexion, choisir la page Notion d'accueil, créer le tableau des commandes. Ici la connexion est établie et vérifiée ; l'état de la synchronisation est rappelé en haut.",
          ar: "شاشة **نوشن** في الإدارة، وهي محجوزة للمالك. ويتمّ التشغيل في ثلاث خطوات: لصق رمز الاتصال، ثم اختيار صفحة نوشن المُضيفة، ثم إنشاء جدول الطلبات. وهنا الاتصال قائم ومُتحقَّق منه؛ وحالة المزامنة مذكورة في الأعلى.",
        },
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "Le jeton est chiffré, et sa clé n'est pas dans la sauvegarde",
          ar: "الرمز مشفَّر، ومفتاحه ليس في النسخة الاحتياطية",
        },
        fr: "Le jeton de connexion est chiffré avant d'être écrit en base, avec une clé qui vit dans `api/.env` — **et que la sauvegarde ne contient pas**, exprès : une archive volée ne livre ainsi qu'un jeton illisible. La contrepartie est expliquée au chapitre suivant.",
        ar: "يُشفَّر رمز الاتصال قبل كتابته في القاعدة، بمفتاح يقيم في `api/.env` — **ولا تتضمّنه النسخة الاحتياطية**، وذلك عن قصد: فالأرشيف المسروق لا يسلّم بذلك سوى رمز غير مقروء. أما المقابل فمشروحٌ في الفصل التالي.",
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/NOTION.md",
            fr: "le contrat complet : colonnes du tableau, gestion des pannes, webhook, et ce qui n'a pas été livré.",
            ar: "العقد الكامل: أعمدة الجدول، ومعالجة الأعطال، وخطّاف الويب، وما لم يُسلَّم بعد.",
          },
        ],
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: "entretien",
    titre: { fr: "Entretien", ar: "الصيانة" },
    chapeau: {
      fr: "Sauvegarder, savoir que la sauvegarde vaut quelque chose, restaurer, et surveiller sans être devin.",
      ar: "النسخ الاحتياطي، والتيقّن من أن النسخة تساوي شيئًا، والاستعادة، والمراقبة دون تكهّن.",
    },
    blocs: [
      {
        t: "p",
        fr: "**Deux chemins produisent la même sauvegarde**, par le même outil. Le bouton de l'écran Développeur télécharge un fichier dans votre navigateur ; la tâche CRON écrit un fichier compressé dans `katech-data/backups`. Le bouton ne réimplémente rien : il lance le même script, lui demande de **rejuger** le fichier produit, et n'envoie le téléchargement que si les deux étapes ont réussi.",
        ar: "**مساران يُنتجان النسخة الاحتياطية نفسها**، بالأداة نفسها. فزرّ شاشة المطوّر يُنزّل ملفًا في متصفّحك؛ ومهمّة CRON تكتب ملفًا مضغوطًا في `katech-data/backups`. والزرّ لا يعيد بناء شيء: إنه يشغّل البرنامج نفسه، ويطلب منه **إعادة الحكم** على الملف المنتَج، ولا يرسل التنزيل إلا إذا نجحت المرحلتان.",
      },
      {
        t: "code",
        texte: `# À la main, depuis le terminal de l'hébergeur
php ~/domains/votre-domaine/public_html/api/tools/sauvegarder.php

# Rejuger une archive, même ancienne, sans la restaurer
php api/tools/sauvegarder.php --verifier=/chemin/vers/archive.sql.gz`,
      },
      {
        t: "p",
        fr: "**Ce que « vérifiée » veut dire ici.** La vérification ne porte pas sur la structure du fichier mais sur son **contenu** : une empreinte est calculée table par table sur la base vivante, puis recalculée depuis le fichier produit ; les deux doivent coïncider. Un simple contrôle de structure validerait une sauvegarde de vingt-trois tables toutes vides.",
        ar: "**ما معنى «مُتحقَّق منها» هنا.** لا يتناول التحقّق بنية الملف بل **محتواه**: إذ تُحسَب بصمةٌ جدولًا جدولًا على القاعدة الحيّة، ثم يُعاد حسابها انطلاقًا من الملف المنتَج؛ ويجب أن تتطابق البصمتان. فالتحقّق البنيوي وحده كان سيصادق على نسخة من ثلاثة وعشرين جدولًا كلّها فارغة.",
      },
      {
        t: "encadre",
        genre: "attention",
        titre: {
          fr: "Lire les nombres, pas le mot « succès »",
          ar: "اقرأ الأرقام، لا كلمة «نجاح»",
        },
        fr: "Une sauvegarde d'une base vide est parfaitement fidèle — et parfaitement inutile. **La vérification compare la sauvegarde à la base ; elle ne peut pas savoir que la base elle-même a été perdue.** Une installation saine annonce **24 tables** et un nombre de lignes qui ne diminue jamais brutalement. Une archive de quelques kilo-octets est une alerte, pas une réussite.",
        ar: "نسخةُ قاعدةٍ فارغة تكون أمينةً تمامًا — وعديمة الجدوى تمامًا. **فالتحقّق يقارن النسخة بالقاعدة؛ ولا يمكنه أن يعلم أن القاعدة نفسها قد ضاعت.** والتثبيت السليم يعلن **24 جدولًا** وعددًا من الأسطر لا ينخفض فجأةً أبدًا. وأرشيفٌ لا يتعدّى بضعة كيلوبايتات إنذارٌ لا إنجاز.",
      },
      {
        t: "encadre",
        genre: "danger",
        titre: {
          fr: "`api/.env` n'est PAS dans la sauvegarde",
          ar: "الملف `api/.env` ليس داخل النسخة الاحتياطية",
        },
        fr: "L'archive contient toute la base, y compris le jeton Notion chiffré — mais **pas** le fichier `api/.env`, où vit la clé qui le déchiffre. Restaurer la base sur un serveur dont le `.env` diffère rend le jeton illisible : l'écran Notion affichera « non configuré », comme si rien n'avait jamais été saisi. La boutique, elle, continue de fonctionner normalement. **Sauvegardez `api/.env` séparément, dans un coffre de mots de passe** — et jamais dans une archive téléchargeable, car c'est précisément sa valeur de sécurité qu'il reste hors de la base.",
        ar: "يحتوي الأرشيف على القاعدة كاملةً، بما فيها رمز نوشن المشفَّر — لكنّه **لا** يحتوي على الملف `api/.env` حيث يقيم المفتاح الذي يفكّ تشفيره. واستعادةُ القاعدة على خادم يختلف فيه `.env` تجعل الرمز غير مقروء: فتعرض شاشة نوشن «غير مُعَدّ»، كأن شيئًا لم يُدخَل قطّ. أما المتجر فيواصل عمله بشكل طبيعي. **احفظ `api/.env` على حدة، في خزنة كلمات مرور** — ولا تضعه أبدًا في أرشيف قابل للتنزيل، لأن قيمته الأمنية تكمن تحديدًا في بقائه خارج القاعدة.",
      },
      {
        t: "p",
        fr: "**Restaurer.** Une sauvegarde qui n'a jamais été restaurée est une hypothèse, pas une garantie. Faites l'essai une fois, sur une base d'entraînement.",
        ar: "**الاستعادة.** نسخةٌ لم تُستعَد قطّ هي فرضية لا ضمانة. جرِّب ذلك مرّةً واحدة، على قاعدة تدريب.",
      },
      {
        t: "tableau",
        entetes: { fr: ["Moteur", "Le geste"], ar: ["المحرّك", "الإجراء"] },
        lignes: {
          fr: [
            [
              "SQLite",
              "Arrêter les écritures, remplacer le fichier de base par la copie décompressée, contrôler dans **Développeur**.",
            ],
            [
              "MySQL / MariaDB",
              "Créer une base vide (ou vider la cible), charger le `.sql` décompressé, contrôler.",
            ],
            ["PostgreSQL", "Même principe : base vide, chargement, contrôle."],
          ],
          ar: [
            [
              "SQLite",
              "أوقِف الكتابة، واستبدل ملف القاعدة بالنسخة المفكوكة، ثم تحقّق في شاشة **المطوّر**.",
            ],
            [
              "MySQL / MariaDB",
              "أنشئ قاعدة فارغة (أو أفرِغ القاعدة الهدف)، وحمِّل ملف `.sql` المفكوك، ثم تحقّق.",
            ],
            ["PostgreSQL", "المبدأ نفسه: قاعدة فارغة، ثم تحميل، ثم تحقّق."],
          ],
        },
      },
      {
        t: "p",
        fr: "**Surveiller, sans y passer ses journées.** Quatre points suffisent : l'état de la base dans **Développeur** (le nombre de lignes doit croître), la file d'attente `outbox` des courriels et des envois Notion (elle doit se vider), l'espace disque, et le journal d'audit.",
        ar: "**المراقبة، دون أن تستهلك يومك.** أربع نقاط تكفي: حالة القاعدة في شاشة **المطوّر** (يجب أن يتزايد عدد الأسطر)، وطابور `outbox` الخاص بالبريد وبإرساليات نوشن (يجب أن يُفرَّغ)، والمساحة القرصية، وسجلّ التدقيق.",
      },
      {
        t: "figure",
        cle: "journal-audit",
        legende: {
          fr: "Le **journal d'audit** répond à une seule question : qui a fait quoi, et quand. Date, acteur, action, entité, détail. C'est lui qu'on ouvre le jour où un prix a changé sans qu'on sache pourquoi. Le bouton **CSV** exporte la liste filtrée ; le sous-titre annonce le nombre d'événements conservés.",
          ar: "يجيب **سجلّ التدقيق** عن سؤال واحد: مَن فعل ماذا، ومتى. التاريخ، والفاعل، والإجراء، والكيان، والتفصيل. وهو ما نفتحه يوم يتغيّر سعرٌ دون أن نعرف السبب. وزرّ **CSV** يصدّر القائمة المُصفّاة؛ والعنوان الفرعي يعلن عدد الأحداث المحفوظة.",
        },
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/GUIDE-EXPLOITATION.md",
            fr: "sauvegardes, restauration, surveillance, mise à jour, mot de passe perdu, et les vérifications de fin d'intervention (1 696 lignes).",
            ar: "النسخ الاحتياطي، والاستعادة، والمراقبة، والتحديث، وكلمة المرور المفقودة، وفحوص نهاية التدخّل (1696 سطرًا).",
          },
          {
            fichier: "docs/GUIDE-BASES-DE-DONNEES.md",
            fr: "le chapitre 7 pour sauvegarder et restaurer selon le moteur, et le chapitre 12 pour la clé de chiffrement Notion.",
            ar: "الفصل السابع للنسخ والاستعادة حسب المحرّك، والفصل الثاني عشر لمفتاح تشفير نوشن.",
          },
        ],
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: "problemes",
    titre: { fr: "En cas de problème", ar: "عند حدوث عطل" },
    chapeau: {
      fr: "Les pannes les plus probables, et le premier geste pour chacune.",
      ar: "الأعطال الأكثر احتمالًا، والإجراء الأول لكلٍّ منها.",
    },
    blocs: [
      {
        t: "tableau",
        entetes: {
          fr: ["Ce que vous voyez", "Le premier geste"],
          ar: ["ما تراه", "الإجراء الأول"],
        },
        lignes: {
          fr: [
            [
              "L'accueil s'affiche, **toutes les autres pages donnent une erreur 404**",
              "`dist/.htaccess` manque sur le serveur. Le recopier depuis `public/.htaccess`.",
            ],
            [
              "**Page entièrement blanche**",
              "Une erreur PHP arrêtée en silence. Regarder le journal d'erreurs de l'hébergeur, et vérifier que `api/.env` existe et est lisible.",
            ],
            [
              "Le site s'affiche mais **aucune donnée n'apparaît**, rien ne s'enregistre",
              "La compilation est restée en mode démonstration. Recompiler avec `VITE_API_MODE=http`, puis revérifier avec la commande `grep` du chapitre Compilation.",
            ],
            [
              "**L'API renvoie du HTML** au lieu du JSON",
              "Une erreur du serveur est interceptée par une page d'hébergeur. Vérifier `api/.htaccess` et les droits du dossier `api/`.",
            ],
            [
              "Toutes les adresses en `/api/...` donnent **404**",
              "Le dossier `api/` n'a pas été téléversé au bon endroit, ou son `.htaccess` manque.",
            ],
            [
              "**Les images ne s'affichent pas**",
              "Le dossier `media` n'a pas suivi le téléversement, ou ses droits interdisent la lecture.",
            ],
            [
              "**« Erreur de base de données »** sans autre détail",
              "Identifiants de `api/.env` erronés, ou extension PHP absente (`pdo_mysql`, `pdo_sqlite`, `pdo_pgsql`). La sonde d'hébergement le dit en une page.",
            ],
            [
              "**Connexion impossible** avec le bon mot de passe",
              "Le compte peut être verrouillé après des tentatives échouées, ou le mot de passe d'installation a été effacé avant la première connexion.",
            ],
            [
              "**« INSTALLATION DÉJÀ EFFECTUÉE »**",
              "Message normal : l'installateur refuse de tourner deux fois. Si l'installation avait échoué, suivre la procédure du guide d'exploitation.",
            ],
            [
              "**Une modification n'apparaît pas** après une mise à jour",
              "Le navigateur sert l'ancienne version. Vider le cache, et vérifier que les fichiers de `dist/assets/` ont bien été remplacés.",
            ],
          ],
          ar: [
            [
              "الصفحة الرئيسية تظهر، و**كل الصفحات الأخرى تعطي الخطأ 404**",
              "الملف `dist/.htaccess` مفقود على الخادم. أعِد نسخه من `public/.htaccess`.",
            ],
            [
              "**صفحة بيضاء تمامًا**",
              "خطأ في PHP أُوقِف في صمت. راجع سجلّ الأخطاء لدى المستضيف، وتأكّد من أن `api/.env` موجود وقابل للقراءة.",
            ],
            [
              "الموقع يظهر لكن **لا تظهر أيّ بيانات**، ولا يُسجَّل شيء",
              "بقي التجميع في الوضع التجريبي. أعِد التجميع بـ `VITE_API_MODE=http`، ثم أعِد الفحص بأمر `grep` الوارد في فصل التجميع.",
            ],
            [
              "**الواجهة البرمجية تُرجِع HTML** بدل JSON",
              "خطأٌ في الخادم اعترضته صفحةٌ من صفحات المستضيف. تحقّق من `api/.htaccess` ومن صلاحيات المجلّد `api/`.",
            ],
            [
              "كلّ العناوين `/api/...` تعطي **404**",
              "لم يُرفَع المجلّد `api/` إلى الموضع الصحيح، أو أن ملف `.htaccess` الخاص به مفقود.",
            ],
            ["**الصور لا تظهر**", "لم يُرفَع المجلّد `media`، أو أن صلاحياته تمنع القراءة."],
            [
              "**«خطأ في قاعدة البيانات»** دون تفصيل آخر",
              "معرّفات `api/.env` خاطئة، أو امتداد PHP غائب (`pdo_mysql` أو `pdo_sqlite` أو `pdo_pgsql`). وأداة فحص الاستضافة تكشف ذلك في صفحة واحدة.",
            ],
            [
              "**تعذّر تسجيل الدخول** بكلمة المرور الصحيحة",
              "قد يكون الحساب مقفلًا بعد محاولات فاشلة، أو أن كلمة مرور التثبيت مُحيت قبل أول دخول.",
            ],
            [
              "**«التثبيت تمّ من قبل»**",
              "رسالة طبيعية: فالمثبِّت يرفض العمل مرّتين. وإن كان التثبيت قد أخفق، اتّبع الإجراء الوارد في دليل الاستغلال.",
            ],
            [
              "**تعديلٌ لا يظهر** بعد التحديث",
              "المتصفّح يقدّم النسخة القديمة. أفرِغ الذاكرة المؤقّتة، وتأكّد من أن ملفات `dist/assets/` قد استُبدِلت فعلًا.",
            ],
          ],
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Avant d'appeler à l'aide", ar: "قبل طلب المساعدة" },
        fr: "Notez trois choses : l'adresse exacte qui échoue, le message affiché mot pour mot, et ce que dit l'écran **Développeur** sur l'état de la base. Ces trois éléments suffisent presque toujours à identifier la cause, et ils épargnent une demi-journée d'aller-retour.",
        ar: "دوِّن ثلاثة أمور: العنوان الدقيق الذي يُخفق، والرسالة المعروضة حرفيًا، وما تقوله شاشة **المطوّر** عن حالة القاعدة. وهذه العناصر الثلاثة تكفي في أغلب الحالات لتحديد السبب، وتوفّر نصف يوم من الأخذ والردّ.",
      },
      {
        t: "renvoi",
        docs: [
          {
            fichier: "docs/GUIDE-EXPLOITATION.md",
            fr: "le chapitre 5 traite onze pannes, avec le diagnostic et le geste correspondant.",
            ar: "يعالج الفصل الخامس أحد عشر عطلًا، مع التشخيص والإجراء المقابل.",
          },
          {
            fichier: "docs/DEPLOIEMENT.md",
            fr: "le chapitre 13 liste les messages d'erreur de l'installateur, un par un.",
            ar: "يُعدّد الفصل الثالث عشر رسائل خطأ المثبِّت، واحدةً واحدة.",
          },
        ],
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: "pour-aller-plus-loin",
    titre: { fr: "Où lire la suite", ar: "أين تتابع القراءة" },
    chapeau: {
      fr: "Ce guide oriente ; les documents ci-dessous font foi. Ils vivent dans le dépôt et suivent le code.",
      ar: "هذا الدليل يوجِّه؛ أما الوثائق أدناه فهي المعتمَدة. وهي تقيم في المستودع وتتبع الشيفرة.",
    },
    blocs: [
      {
        t: "p",
        fr: "Le guide que vous lisez tient en dix chapitres. La documentation du dépôt en compte plus de onze mille lignes. **Ce guide ne la remplace pas** : il ne recopie rien, exprès. Un document qui recopierait divergerait dès la semaine suivante ; un document qui oriente reste juste.",
        ar: "الدليل الذي تقرؤه يقع في عشرة فصول. أما وثائق المستودع فتتجاوز أحد عشر ألف سطر. **وهذا الدليل لا يحلّ محلّها**: فهو لا ينسخ منها شيئًا، عن قصد. إذ إنّ وثيقةً تنسخ ستتباعد عن أصلها في الأسبوع التالي؛ أما وثيقةٌ توجِّه فتبقى صحيحة.",
      },
      {
        t: "tableau",
        entetes: { fr: ["Document", "Quand l'ouvrir"], ar: ["الوثيقة", "متى تفتحها"] },
        lignes: {
          fr: [
            ["`README.md`", "La vue d'ensemble et les commandes de développement."],
            [
              "`docs/MANUEL-UTILISATION.md`",
              "Vous cherchez comment faire quelque chose dans l'administration.",
            ],
            [
              "`docs/GUIDE-DEPLOIEMENT-HOSTINGER.md`",
              "Vous mettez le site en ligne pour la première fois.",
            ],
            [
              "`docs/DEPLOIEMENT.md`",
              "Vous voulez l'arborescence cible exacte et la liste de vérification.",
            ],
            [
              "`docs/GUIDE-BASES-DE-DONNEES.md`",
              "Vous choisissez un moteur, ou vous changez d'avis et migrez.",
            ],
            [
              "`docs/GUIDE-EXPLOITATION.md`",
              "Le site est en ligne et quelque chose doit être entretenu, surveillé ou réparé.",
            ],
            [
              "`docs/PERMISSIONS.md`",
              "Vous vous demandez qui a le droit de faire quoi, et pourquoi.",
            ],
            ["`docs/NOTION.md`", "Vous activez le miroir Notion, ou vous en cherchez les limites."],
            [
              "`docs/BACKEND.md`, `docs/API-CONTRACT.md`",
              "Vous êtes développeur et vous touchez au serveur.",
            ],
            [
              "`PLAN.md`",
              "Vous voulez savoir ce qui est fait, ce qui reste, et ce qui a été écarté.",
            ],
          ],
          ar: [
            ["`README.md`", "النظرة العامة وأوامر التطوير."],
            ["`docs/MANUEL-UTILISATION.md`", "تبحث عن كيفية إنجاز أمرٍ ما داخل الإدارة."],
            ["`docs/GUIDE-DEPLOIEMENT-HOSTINGER.md`", "تنشر الموقع على الإنترنت لأول مرة."],
            ["`docs/DEPLOIEMENT.md`", "تريد الشجرة المستهدَفة بدقّة وقائمة التحقّق."],
            ["`docs/GUIDE-BASES-DE-DONNEES.md`", "تختار محرّكًا، أو تغيّر رأيك وترحّل بياناتك."],
            [
              "`docs/GUIDE-EXPLOITATION.md`",
              "الموقع منشور وثمّة ما يجب صيانته أو مراقبته أو إصلاحه.",
            ],
            ["`docs/PERMISSIONS.md`", "تتساءل عمّن يحقّ له فعل ماذا، ولماذا."],
            ["`docs/NOTION.md`", "تُفعِّل مرآة نوشن، أو تبحث عن حدودها."],
            ["`docs/BACKEND.md` و`docs/API-CONTRACT.md`", "أنت مطوّر وتتعامل مع الخادم."],
            ["`PLAN.md`", "تريد معرفة ما أُنجز، وما تبقّى، وما استُبعِد."],
          ],
        },
      },
      {
        t: "encadre",
        genre: "note",
        titre: { fr: "Régénérer ce guide", ar: "إعادة توليد هذا الدليل" },
        fr: "Ce fichier est produit par `scripts/construire-guide.ts`, qui prend lui-même les captures sur l'application en fonctionnement. Après une évolution du site : démarrer la pile en mode `http`, puis lancer `bun run construire-guide`. Le texte des deux langues vit dans ce script — c'est là qu'on le corrige, jamais dans le HTML.",
        ar: "هذا الملف من إنتاج `scripts/construire-guide.ts`، وهو نفسه من يلتقط الصور من التطبيق أثناء عمله. وبعد أيّ تطوير للموقع: شغّل المنظومة في وضع `http`، ثم نفّذ `bun run construire-guide`. ونصّ اللغتين يقيم داخل هذا البرنامج — وهناك يُصحَّح، لا في ملف HTML أبدًا.",
      },
    ],
  },
];

// ── Phase 3 : le rendu HTML ─────────────────────────────────────────────────

const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Texte destiné à un attribut : le balisage léger est retiré (il n'a pas de
 * sens hors du corps du document) et les guillemets sont neutralisés. Une
 * légende contenant `dir="rtl"` cassait sinon l'attribut `alt` — constaté.
 */
const attribut = (s: string) => echapper(s.replace(/\*\*/g, "").replace(/`/g, ""));

/**
 * Balisage léger, volontairement minuscule : `**gras**`, `` `code` ``.
 * Le texte des sections reste lisible dans ce fichier, ce qui est la première
 * condition pour qu'il soit tenu à jour.
 */
function riche(s: string): string {
  return echapper(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const GENRES: Record<string, { fr: string; ar: string }> = {
  note: { fr: "À savoir", ar: "معلومة" },
  attention: { fr: "Attention", ar: "تنبيه" },
  danger: { fr: "Geste irréversible", ar: "إجراء لا رجعة فيه" },
};

function rendreBloc(b: Bloc, l: "fr" | "ar", figures: Map<string, string>): string {
  switch (b.t) {
    case "p":
      return `<p>${riche(b[l])}</p>`;
    case "liste":
      return `<ul>${b[l].map((i) => `<li>${riche(i)}</li>`).join("")}</ul>`;
    case "etapes":
      return `<ol>${b[l].map((i) => `<li>${riche(i)}</li>`).join("")}</ol>`;
    case "code":
      return (
        `<pre dir="ltr"><code>${echapper(b.texte)}</code></pre>` +
        (b.sous ? `<p class="sous-code">${riche(b.sous[l])}</p>` : "")
      );
    case "tableau": {
      const th = b.entetes[l].map((h) => `<th>${riche(h)}</th>`).join("");
      const tr = b.lignes[l]
        .map((r) => `<tr>${r.map((c) => `<td>${riche(c)}</td>`).join("")}</tr>`)
        .join("");
      return `<div class="cadre-tableau"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
    }
    case "encadre":
      return `<aside class="encadre ${b.genre}"><p class="encadre-titre">${riche(b.titre[l])}</p><p>${riche(b[l])}</p></aside>`;
    case "figure": {
      // Une capture écartée ne laisse pas de cadre vide : la figure disparaît.
      if (!figures.has(b.cle)) return "";
      return `<figure><img data-cle="${b.cle}" alt="${attribut(b.legende[l])}" /><figcaption>${riche(b.legende[l])}</figcaption></figure>`;
    }
    case "renvoi": {
      const intro = l === "fr" ? "Le détail complet est dans :" : "التفاصيل الكاملة موجودة في:";
      const items = b.docs
        .map((d) => `<li><code>${echapper(d.fichier)}</code> — ${riche(d[l])}</li>`)
        .join("");
      return `<aside class="renvoi"><p class="renvoi-titre">${intro}</p><ul>${items}</ul></aside>`;
    }
  }
}

function rendreLangue(l: "fr" | "ar", figures: Map<string, string>): string {
  const numero = (i: number) => (l === "fr" ? `${i + 1}.` : `${i + 1}.`);
  const sommaire = SECTIONS.map(
    (s, i) =>
      `<li><a href="#${s.id}-${l}"><span class="num">${numero(i)}</span> ${riche(s.titre[l])}</a></li>`,
  ).join("");

  const corps = SECTIONS.map(
    (s, i) => `<section id="${s.id}-${l}" class="section">
      <h2><span class="num">${numero(i)}</span> ${riche(s.titre[l])}</h2>
      <p class="chapeau">${riche(s.chapeau[l])}</p>
      ${s.blocs.map((b) => rendreBloc(b, l, figures)).join("\n")}
      <p class="retour"><a href="#sommaire-${l}">${l === "fr" ? "↑ Revenir au sommaire" : "↑ العودة إلى الفهرس"}</a></p>
    </section>`,
  ).join("\n");

  return `<div class="doc" id="doc-${l}" lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}">
    <header class="couverture">
      <p class="marque">KA Tech</p>
      <h1>${l === "fr" ? "Guide complet du site" : "الدليل الكامل للموقع"}</h1>
      <p class="accroche">${
        l === "fr"
          ? "Vitrine et boutique en ligne — de la première compilation à l'entretien quotidien. Un seul fichier, à ouvrir hors connexion."
          : "متجر إلكتروني وواجهة عرض — من أول عملية تجميع إلى الصيانة اليومية. ملف واحد، يُفتح دون اتصال بالإنترنت."
      }</p>
      <p class="avert">${
        l === "fr"
          ? "Ce guide est la porte d'entrée, pas la référence. Pour chaque sujet, il donne ce qu'il faut pour agir et nomme le document du dépôt qui fait foi. La vérité normative est dans le code et dans <code>docs/</code>."
          : "هذا الدليل هو المدخل، وليس المرجع. يقدّم لكل موضوع ما يلزم للعمل، ويحيل إلى الوثيقة المعتمدة في المستودع. الحقيقة المُلزِمة موجودة في الشيفرة وفي <code>docs/</code>."
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
          ? "Document produit par <code>scripts/construire-guide.ts</code>. Pour le régénérer après une évolution du site : relancer la pile puis <code>bun run construire-guide</code>."
          : "وثيقة من إنتاج <code>scripts/construire-guide.ts</code>. لإعادة توليدها بعد أي تطوير للموقع: شغّل المنظومة ثم نفّذ <code>bun run construire-guide</code>."
      }</p>
    </footer>
  </div>`;
}

// ── La feuille de style — intégrée, aucune police distante ──────────────────
//
// Aucune `@font-face`, aucun CDN : le fichier doit s'ouvrir réseau coupé. On
// s'appuie donc sur les polices du système, avec une pile qui nomme
// explicitement les polices arabes des trois systèmes courants.

const CSS = `
:root{
  --encre:#141821; --encre-douce:#4a5468; --papier:#fbfaf8; --carte:#ffffff;
  --trait:#e2e0da; --accent:#1f5fd4; --accent-doux:#eef3fd;
  --alerte:#9a5b00; --alerte-fond:#fff6e6; --peril:#a12020; --peril-fond:#fdeeee;
  --renvoi-fond:#f1f3f7;
  --sans:"Segoe UI",Roboto,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --arabe:"Segoe UI","Noto Naskh Arabic","Noto Sans Arabic","Geeza Pro","Al Bayan",
          "Traditional Arabic",Amiri,"Scheherazade New","DejaVu Sans",sans-serif;
  --mono:"Cascadia Mono",Consolas,"SF Mono",Menlo,"DejaVu Sans Mono",monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--papier);color:var(--encre);
  font-family:var(--sans);font-size:17px;line-height:1.72;
  -webkit-text-size-adjust:100%}
[dir="rtl"]{font-family:var(--arabe);line-height:2.0;font-size:18px}

/* ── Barre de langue ───────────────────────────────────────────────── */
.barre{position:sticky;top:0;z-index:20;background:rgba(251,250,248,.94);
  backdrop-filter:blur(6px);border-bottom:1px solid var(--trait)}
.barre-int{max-width:920px;margin:0 auto;padding:.7rem 5%;
  display:flex;align-items:center;justify-content:space-between;gap:1rem}
.barre-titre{font-weight:700;font-size:.95rem;letter-spacing:.02em}
.bascule{display:flex;border:1px solid var(--trait);border-radius:999px;
  overflow:hidden;background:var(--carte)}
.bascule button{border:0;background:transparent;padding:.42rem 1.05rem;
  font:inherit;font-size:.9rem;font-weight:600;color:var(--encre-douce);cursor:pointer}
.bascule button[aria-pressed="true"]{background:var(--accent);color:#fff}
.bascule button:last-child{font-family:var(--arabe)}

/* ── Structure ─────────────────────────────────────────────────────── */
.doc{max-width:920px;margin:0 auto;padding:0 5% 5rem}
.doc[hidden]{display:none}
.couverture{padding:3.4rem 0 2.2rem;border-bottom:3px solid var(--encre)}
.marque{margin:0;font-size:.82rem;letter-spacing:.22em;text-transform:uppercase;
  color:var(--accent);font-weight:700}
.couverture h1{margin:.5rem 0 .7rem;font-size:2.65rem;line-height:1.14;letter-spacing:-.02em}
[dir="rtl"] .couverture h1{letter-spacing:0;line-height:1.5}
.accroche{margin:0 0 1rem;font-size:1.13rem;color:var(--encre-douce)}
.avert{margin:0;font-size:.94rem;color:var(--encre-douce);
  border-inline-start:3px solid var(--accent);padding-inline-start:.9rem}

.sommaire{margin:2.4rem 0 1rem;background:var(--carte);border:1px solid var(--trait);
  border-radius:12px;padding:1.4rem 1.6rem}
.sommaire h2{margin:0 0 .7rem;font-size:1.02rem;text-transform:uppercase;
  letter-spacing:.1em;color:var(--encre-douce)}
[dir="rtl"] .sommaire h2{letter-spacing:0}
.sommaire ol{margin:0;padding:0;list-style:none}
.sommaire li{border-top:1px solid var(--trait)}
.sommaire li:first-child{border-top:0}
.sommaire a{display:block;padding:.5rem 0;color:var(--encre);text-decoration:none;font-weight:500}
.sommaire a:hover{color:var(--accent)}
.num{display:inline-block;min-width:1.9rem;color:var(--accent);font-weight:700}

.section{padding-top:2.6rem;scroll-margin-top:4.2rem}
.section h2{font-size:1.72rem;line-height:1.28;margin:0 0 .3rem;
  padding-bottom:.5rem;border-bottom:2px solid var(--trait)}
[dir="rtl"] .section h2{line-height:1.6}
.chapeau{margin:.7rem 0 1.2rem;color:var(--encre-douce);font-size:1.04rem}
.section p{margin:0 0 1rem}
.section ul,.section ol{margin:0 0 1.15rem;padding-inline-start:1.4rem}
.section li{margin-bottom:.42rem}
.retour{margin:1.6rem 0 0;font-size:.88rem}
.retour a{color:var(--encre-douce);text-decoration:none}
.retour a:hover{color:var(--accent)}

code{font-family:var(--mono);font-size:.87em;background:#eceef2;
  padding:.1em .36em;border-radius:4px;direction:ltr;display:inline-block}
pre{background:#1b2029;color:#e8eaf0;padding:1rem 1.15rem;border-radius:10px;
  overflow-x:auto;font-family:var(--mono);font-size:.86rem;line-height:1.62;
  margin:0 0 .6rem;text-align:left}
pre code{background:none;padding:0;color:inherit;font-size:1em;display:inline}
.sous-code{font-size:.9rem;color:var(--encre-douce);margin:0 0 1.15rem !important}

.cadre-tableau{overflow-x:auto;margin:0 0 1.3rem;border:1px solid var(--trait);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:.94rem;background:var(--carte)}
th,td{padding:.6rem .8rem;text-align:start;border-bottom:1px solid var(--trait);
  vertical-align:top}
th{background:#f4f5f8;font-weight:700;font-size:.86rem;
  text-transform:uppercase;letter-spacing:.05em;color:var(--encre-douce)}
[dir="rtl"] th{text-transform:none;letter-spacing:0;font-size:.92rem}
tbody tr:last-child td{border-bottom:0}

.encadre{margin:0 0 1.3rem;padding:.95rem 1.15rem;border-radius:10px;
  border-inline-start:4px solid var(--accent);background:var(--accent-doux)}
.encadre p{margin:0}
.encadre-titre{font-weight:700;font-size:.8rem;text-transform:uppercase;
  letter-spacing:.09em;margin-bottom:.3rem !important;color:var(--accent)}
[dir="rtl"] .encadre-titre{text-transform:none;letter-spacing:0;font-size:.95rem}
.encadre.attention{border-color:var(--alerte);background:var(--alerte-fond)}
.encadre.attention .encadre-titre{color:var(--alerte)}
.encadre.danger{border-color:var(--peril);background:var(--peril-fond)}
.encadre.danger .encadre-titre{color:var(--peril)}

.renvoi{margin:0 0 1.3rem;padding:.9rem 1.1rem;background:var(--renvoi-fond);
  border-radius:10px;font-size:.93rem}
.renvoi-titre{font-weight:700;margin:0 0 .35rem !important;color:var(--encre-douce)}
.renvoi ul{margin:0;padding-inline-start:1.2rem}
.renvoi li{margin-bottom:.25rem}

figure{margin:0 0 1.7rem}
figure img{display:block;width:100%;height:auto;border:1px solid var(--trait);
  border-radius:10px;background:#11151c}
figcaption{margin-top:.55rem;font-size:.9rem;color:var(--encre-douce);
  border-inline-start:3px solid var(--trait);padding-inline-start:.75rem}

.pied{margin-top:3.5rem;padding-top:1.3rem;border-top:1px solid var(--trait);
  font-size:.88rem;color:var(--encre-douce)}

@media (max-width:640px){
  body{font-size:16px}
  .couverture h1{font-size:2rem}
  .section h2{font-size:1.4rem}
  .doc{padding:0 6% 3rem}
}
@media print{
  .barre{display:none}
  body{background:#fff}
  .section{page-break-inside:auto}
  figure,table,.encadre{page-break-inside:avoid}
}
`;

// Le script embarqué. Il fait trois choses et rien d'autre : poser les images
// depuis la table (une seule copie base64 par capture, partagée par les deux
// langues), basculer la langue, s'en souvenir d'une ouverture à l'autre.
const JS = `
(function(){
  var IMAGES = window.__GUIDE_IMAGES__ || {};
  var imgs = document.querySelectorAll("img[data-cle]");
  for (var i = 0; i < imgs.length; i++) {
    var src = IMAGES[imgs[i].getAttribute("data-cle")];
    if (src) { imgs[i].src = src; } else { imgs[i].closest("figure").remove(); }
  }
  var CLE = "katech.guide.langue";
  var boutons = document.querySelectorAll(".bascule button");
  function appliquer(langue){
    document.documentElement.lang = langue;
    document.documentElement.dir = langue === "ar" ? "rtl" : "ltr";
    document.getElementById("doc-fr").hidden = langue !== "fr";
    document.getElementById("doc-ar").hidden = langue !== "ar";
    document.getElementById("barre-titre").textContent =
      langue === "fr" ? "KA Tech — Guide complet" : "\\u0643\\u0627 \\u062A\\u0643 \\u2014 \\u0627\\u0644\\u062F\\u0644\\u064A\\u0644 \\u0627\\u0644\\u0643\\u0627\\u0645\\u0644";
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

// ── Assemblage et preuves ───────────────────────────────────────────────────

async function assembler(): Promise<void> {
  const figures = new Map<string, string>();
  const cles = [
    ...new Set(
      SECTIONS.flatMap((s) =>
        s.blocs.filter((b) => b.t === "figure").map((b) => (b as { cle: string }).cle),
      ),
    ),
  ];
  for (const cle of cles) {
    const uri = await integrer(cle);
    if (uri) figures.set(cle, uri);
    else if (!journal.ecartees.some((e) => e.startsWith(cle)))
      journal.ecartees.push(`${cle} (aucune capture dans le cache)`);
  }

  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KA Tech — Guide complet du site / الدليل الكامل</title>
<meta name="description" content="Guide illustré, français et arabe, du site KA Tech : configuration, compilation, installation, déploiement, utilisation, entretien." />
<style>${CSS}</style>
</head>
<body>
<div class="barre"><div class="barre-int">
  <span class="barre-titre" id="barre-titre">KA Tech — Guide complet</span>
  <div class="bascule" role="group" aria-label="Langue / اللغة">
    <button type="button" data-langue="fr" aria-pressed="true">FR</button>
    <button type="button" data-langue="ar" aria-pressed="false">العربية</button>
  </div>
</div></div>
${rendreLangue("fr", figures)}
${rendreLangue("ar", figures)}
<script>window.__GUIDE_IMAGES__=${JSON.stringify(Object.fromEntries(figures))};</script>
<script>${JS}</script>
</body>
</html>
`;

  // Preuve a) — aucune ressource externe. On cherche toute URL http(s) qui
  // resterait dans le fichier, en excluant les mentions purement textuelles.
  const externes = [
    ...html.matchAll(/(?:src|href|url\(|@import)\s*=?\s*["'(]?\s*(https?:\/\/[^"')\s]+)/gi),
  ]
    .map((m) => m[1])
    .filter((u) => !u.startsWith("http://127.0.0.1") && !u.startsWith("http://localhost"));
  if (externes.length) {
    console.error(`[guide] REFUS : ressources externes détectées → ${externes.join(", ")}`);
    process.exit(1);
  }

  // Preuve c) — autant de sections d'un côté que de l'autre.
  const nFr = (html.match(/id="[a-z0-9-]+-fr" class="section"/g) ?? []).length;
  const nAr = (html.match(/id="[a-z0-9-]+-ar" class="section"/g) ?? []).length;
  if (nFr !== nAr || nFr !== SECTIONS.length) {
    console.error(`[guide] REFUS : sections fr=${nFr} ar=${nAr} attendu=${SECTIONS.length}`);
    process.exit(1);
  }

  writeFileSync("GUIDE.html", html, "utf8");
  const octets = statSync("GUIDE.html").size;
  dire("─".repeat(58));
  dire(`GUIDE.html écrit — ${(octets / 1024 / 1024).toFixed(2)} Mo (${octets} octets)`);
  dire(
    `captures intégrées : ${figures.size} (dont ${[...figures.keys()].filter((c) => c.endsWith("-ar")).length} en arabe)`,
  );
  dire(`sections : ${nFr} en français, ${nAr} en arabe`);
  dire(`aucune URL externe : vérifié`);
  if (journal.ecartees.length) dire(`ÉCARTÉES : ${journal.ecartees.join(" ; ")}`);
  if (octets > 8 * 1024 * 1024) dire("AVERTISSEMENT : le fichier dépasse 8 Mo.");
}

// ── Point d'entrée ──────────────────────────────────────────────────────────

if (!SANS_CAPTURES) {
  dire(`captures depuis ${BASE} — la pile doit tourner en mode http`);
  await capturer();
} else {
  dire(`--sans-captures : réutilisation du cache ${CACHE}`);
}
await assembler();
