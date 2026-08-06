/**
 * Extracteur de données du frontend — OUTIL DE DÉVELOPPEMENT.
 *
 * Lit les données de démonstration définies dans les modules TypeScript du
 * frontend et les sérialise en JSON versionné dans api/tools/donnees-front.json.
 * Ce JSON est la source d'entrée de api/tools/importer-donnees-front.php.
 *
 * Voie retenue : extraction Node/bun → JSON → import PHP.
 * Justification : le frontend est en TypeScript avec des imports d'assets
 * relatifs (images webp) et une logique de seed centralisée. Exécuter ce script
 * produit un artefact versionnable et rejouable sans jamais dupliquer les
 * données dans deux fichiers sources.
 *
 * Usage :
 *   bunx tsx scripts/extraire-donnees-front.ts
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

// Données produits
import { products } from "@/data/products";
import { WILAYAS } from "@/data/wilayas";

// Données admin-store
import { categoryMeta } from "@/data/products";

// Contenu de la vitrine
import { seedSiteContent } from "@/lib/site-content";

// -------------------------------------------------------------------
// Types — reproduits localement pour éviter des imports React
// -------------------------------------------------------------------
type Localized<T = string> = T | { fr: T; en?: T; ar?: T };

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
const now = new Date().toISOString();

/** Langue de référence pour les empreintes historiques. */
const LANG_REF = "fr";

/** Résout un Localized<string> en chaîne simple dans la langue de référence. */
function localiser(v: Localized<string> | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  return v[LANG_REF] ?? v.en ?? "";
}

// -------------------------------------------------------------------
// Catégories (tirées de categoryMeta + libellés déjà en français)
// -------------------------------------------------------------------
const CAT_LABELS: Record<string, string> = {
  laptops: "Ordinateurs portables",
  desktops: "Ordinateurs de bureau",
  builds: "Configurations PC",
  phones: "Smartphones",
};
const CAT_DESC: Record<string, string> = {
  laptops: "Laptops pour le travail, les études et le gaming.",
  desktops: "Tours et mini-PC de bureau.",
  builds: "Configurations sur-mesure KA Build.",
  phones: "Smartphones Android et iOS.",
};

const categories = (Object.keys(categoryMeta) as (keyof typeof categoryMeta)[]).map((slug, i) => ({
  slug,
  label: CAT_LABELS[slug] ?? slug,
  description: CAT_DESC[slug] ?? "",
  cover: `/assets/p-${products.find((p) => p.category === slug)?.id ?? slug}.webp`,
  position: i,
  created_at: now,
  updated_at: now,
}));

// -------------------------------------------------------------------
// Marques (déduites des produits)
// -------------------------------------------------------------------
const brandCountry: Record<string, string> = {
  ASUS: "Taïwan",
  HP: "États-Unis",
  Lenovo: "Chine",
  Apple: "États-Unis",
  Dell: "États-Unis",
  Samsung: "Corée du Sud",
  Xiaomi: "Chine",
  "KA Build": "Algérie",
};

const brandsMap = new Map<
  string,
  {
    id: string;
    name: string;
    description: string;
    country: string;
    created_at: string;
    updated_at: string;
  }
>();
for (const p of products) {
  if (!brandsMap.has(p.brand)) {
    brandsMap.set(p.brand, {
      id: p.brand.toLowerCase().replace(/\s+/g, "-"),
      name: p.brand,
      description: `Marque ${p.brand} distribuée par KA Tech.`,
      country: brandCountry[p.brand] ?? "International",
      created_at: now,
      updated_at: now,
    });
  }
}
const brands = Array.from(brandsMap.values());

// -------------------------------------------------------------------
// Produits (12 produits avec champs Localized conservés)
// -------------------------------------------------------------------
function defaultQtyForLabel(stock: string): number {
  return stock === "in" ? 50 : stock === "low" ? 3 : 0;
}

const produitsExtraits = products.map((p) => ({
  id: p.id,
  name: p.name, // Localized<string> conservé — stocké en JSON
  brand: p.brand,
  category: p.category,
  use_tags: p.use,
  spec_line: p.specLine, // Localized<string> conservé
  specs: p.specs, // Partial<Record<SpecKey, Localized<string>>> conservé
  price: p.price,
  old_price: p.oldPrice ?? null,
  stock: p.stock,
  stock_qty: p.stockQty ?? defaultQtyForLabel(p.stock),
  image: `/assets/${p.id}.webp`,
  best_seller: p.bestSeller ? 1 : 0,
  sale: p.sale ? 1 : 0,
  custom_build: p.customBuild ? 1 : 0,
  created_at: now,
  updated_at: now,
}));

// -------------------------------------------------------------------
// Articles de blog (5 articles, champs Localized conservés)
// -------------------------------------------------------------------
const BASE_BLOG_DATE = Date.now();
const blogBase = [
  {
    slug: "guide-achat-laptop-2026",
    title: {
      fr: "Guide d'achat : bien choisir son ordinateur portable en 2026",
      en: "Buying guide: how to choose the right laptop in 2026",
      ar: "دليل الشراء: كيف تختار حاسوبك المحمول في 2026",
    },
    excerpt: {
      fr: "CPU, GPU, RAM, écran — les critères qui comptent vraiment selon votre usage.",
      en: "CPU, GPU, RAM, screen — the criteria that truly matter for your use case.",
      ar: "CPU، GPU، RAM، الشاشة — المعايير التي تهم فعلاً حسب استخدامك.",
    },
    content: {
      fr: "# Bien choisir son laptop en 2026\n\nEn 2026, l'offre laptop est plus riche que jamais. Voici les 5 critères à ne pas négliger :\n\n1. **Le processeur** : privilégiez un Intel Core Ultra ou un AMD Ryzen 7000+.\n2. **La RAM** : 16 Go minimum, 32 Go pour la création.\n3. **Le SSD** : NVMe Gen4, 512 Go minimum.\n4. **L'écran** : dalle IPS ou OLED, 100 % sRGB pour la couleur juste.\n5. **La garantie** : chez KA Tech, tous nos laptops sont sous garantie officielle.",
      en: "# Choosing the right laptop in 2026\n\nIn 2026, the laptop market is richer than ever. Here are the 5 criteria you should not overlook:\n\n1. **The processor**: go for an Intel Core Ultra or an AMD Ryzen 7000+.\n2. **RAM**: 16 GB minimum, 32 GB for creative work.\n3. **The SSD**: NVMe Gen4, 512 GB minimum.\n4. **The screen**: IPS or OLED panel, 100% sRGB for accurate colour.\n5. **The warranty**: at KA Tech, all our laptops come with an official warranty.",
      ar: "# كيف تختار حاسوبك المحمول في 2026\n\nفي 2026، سوق الحواسيب المحمولة أثرى من أي وقت مضى. إليك 5 معايير لا ينبغي إغفالها:\n\n1. **المعالج**: اختر Intel Core Ultra أو AMD Ryzen 7000+.\n2. **الذاكرة RAM**: 16 غيغابايت كحد أدنى، و32 غيغابايت للإبداع والمونتاج.\n3. **القرص SSD**: NVMe Gen4، 512 غيغابايت كحد أدنى.\n4. **الشاشة**: لوحة IPS أو OLED، 100% sRGB لدقة الألوان.\n5. **الضمان**: في KA Tech، جميع حواسيبنا المحمولة تأتي مع ضمان رسمي.",
    },
    tags: ["laptop", "guide"],
    author: "Équipe KA Tech",
    daysAgo: 30,
  },
  {
    slug: "gaming-pc-vs-console",
    title: {
      fr: "PC gaming vs console : le match 2026",
      en: "Gaming PC vs console: the 2026 showdown",
      ar: "PC للألعاب مقابل الكونسول: مقارنة 2026",
    },
    excerpt: {
      fr: "Prix, catalogue, mods, longévité — on compare les deux univers.",
      en: "Price, game library, mods, longevity — we compare both worlds.",
      ar: "السعر، مكتبة الألعاب، الإضافات، العمر الافتراضي — نقارن بين العالمين.",
    },
    content: {
      fr: "Le débat PC vs console revient chaque génération. En 2026, le PC prend l'avantage sur la modularité, le catalogue Steam et la longévité — mais la console reste imbattable sur le plug-and-play.",
      en: "The PC vs console debate comes back every generation. In 2026, the PC has the edge on modularity, the Steam library and longevity — but the console remains unbeatable for plug-and-play simplicity.",
      ar: "نقاش PC مقابل الكونسول يعود مع كل جيل. في 2026، يتفوق PC على صعيد المرونة ومكتبة Steam والعمر الافتراضي — لكن الكونسول يبقى لا يُضاهى في سهولة التشغيل الفوري.",
    },
    tags: ["gaming", "comparatif"],
    author: "Yacine B.",
    daysAgo: 26,
  },
  {
    slug: "smartphone-photo-2026",
    title: {
      fr: "Top 3 smartphones photo début 2026",
      en: "Top 3 camera smartphones of early 2026",
      ar: "أفضل 3 هواتف للتصوير في مطلع 2026",
    },
    excerpt: {
      fr: "iPhone 16 Pro Max, Galaxy S25 Ultra, Xiaomi 14T Pro : notre verdict.",
      en: "iPhone 16 Pro Max, Galaxy S25 Ultra, Xiaomi 14T Pro: our verdict.",
      ar: "iPhone 16 Pro Max، Galaxy S25 Ultra، Xiaomi 14T Pro: حكمنا النهائي.",
    },
    content: {
      fr: "Trois flagships, trois philosophies photo. L'iPhone mise sur la constance vidéo, le Samsung sur la polyvalence zoom, le Xiaomi sur la signature Leica. À vous de choisir.",
      en: "Three flagships, three photography philosophies. The iPhone bets on video consistency, Samsung on zoom versatility, and Xiaomi on the Leica signature. The choice is yours.",
      ar: "ثلاثة هواتف رائدة، ثلاث فلسفات تصوير. iPhone يراهن على ثبات الفيديو، Samsung على تعدد استخدامات الزووم، Xiaomi على توقيع Leica. لك أن تختار.",
    },
    tags: ["smartphone", "photo", "top"],
    author: "Équipe KA Tech",
    daysAgo: 22,
  },
  {
    slug: "monter-son-pc-configurateur",
    title: {
      fr: "Monter son PC : nos conseils du configurateur KA Tech",
      en: "Building your PC: tips from the KA Tech configurator",
      ar: "تجميع حاسوبك: نصائح من مُجمِّع KA Tech",
    },
    excerpt: {
      fr: "Pourquoi passer par un PC sur-mesure et comment éviter les pièges classiques.",
      en: "Why go for a custom-built PC and how to avoid the classic pitfalls.",
      ar: "لماذا تختار حاسوباً مخصصاً وكيف تتجنب الأخطاء الشائعة.",
    },
    content: {
      fr: "Notre configurateur PC vous guide étape par étape. Avant de valider votre config, vérifiez : la compatibilité socket CPU/carte-mère, le TDP de l'alim (+30 % de marge), et la ventilation du boîtier.",
      en: "Our PC configurator walks you through every step. Before confirming your build, check: CPU/motherboard socket compatibility, the PSU TDP (+30% headroom), and the case airflow.",
      ar: "يرشدك مُجمِّع PC الخاص بنا خطوة بخطوة. قبل تأكيد تجميعتك، تحقق من: توافق socket المعالج مع اللوحة الأم، TDP مزود الطاقة (+30% هامش)، وتهوية الصندوق.",
    },
    tags: ["pc-sur-mesure", "conseil"],
    author: "Yacine B.",
    daysAgo: 18,
  },
  {
    slug: "livraison-58-wilayas",
    title: {
      fr: "Livraison en Algérie : ce qu'il faut savoir",
      en: "Delivery across Algeria: what you need to know",
      ar: "التوصيل في الجزائر: ما تحتاج معرفته",
    },
    excerpt: {
      fr: "Délais, tarifs, paiement à la livraison — on répond à vos questions.",
      en: "Lead times, rates, cash on delivery — we answer your questions.",
      ar: "آجال التسليم، التعريفات، الدفع عند الاستلام — نجيب على أسئلتك.",
    },
    content: {
      fr: "KA Tech livre dans les 58 wilayas. Comptez 2 à 5 jours ouvrés selon votre région. Le paiement à la livraison est disponible pour la majorité des produits.",
      en: "KA Tech delivers to all 58 wilayas. Allow 2 to 5 business days depending on your region. Cash on delivery is available for the majority of products.",
      ar: "KA Tech يوصّل إلى جميع الولايات الـ58. توقع من 2 إلى 5 أيام عمل حسب منطقتك: الجزائر، وهران، قسنطينة، عنابة، سطيف، تيزي وزو، البليدة، باتنة، وجميع الولايات الأخرى. الدفع عند الاستلام متاح لغالبية المنتجات.",
      ar: "KA Tech يوصّل إلى جميع الولايات الـ58. الدفع عند الاستلام متاح لغالبية المنتجات.",
    },
    tags: ["livraison", "faq"],
    author: "Équipe KA Tech",
    daysAgo: 14,
  },
];

const blogPosts = blogBase.map((b, i) => {
  const ts = new Date(BASE_BLOG_DATE - b.daysAgo * 86400000).toISOString();
  const cover = products[i % products.length]?.id ?? "rog-strix-g16";
  return {
    id: `blog_${100 + i}`,
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt,
    content: b.content,
    cover: `/assets/p-${cover}.webp`,
    author: b.author,
    tags: b.tags,
    status: "published",
    published_at: ts,
    created_at: ts,
    updated_at: ts,
  };
});

// -------------------------------------------------------------------
// Tarifs de livraison (58 wilayas + défaut)
// -------------------------------------------------------------------
const NORTH = new Set([
  "16",
  "09",
  "35",
  "42",
  "15",
  "06",
  "18",
  "21",
  "23",
  "25",
  "43",
  "36",
  "24",
  "31",
  "27",
  "22",
  "46",
  "13",
]);
const CENTRE_HP = new Set([
  "02",
  "10",
  "26",
  "44",
  "38",
  "14",
  "20",
  "29",
  "48",
  "05",
  "19",
  "34",
  "40",
  "41",
  "28",
  "03",
  "17",
]);

const shippingRates = [{ wilaya_code: "*", home: 800, desk: 400, updated_at: now }];
for (const w of WILAYAS) {
  let home = 1500,
    desk = 800;
  if (NORTH.has(w.code)) {
    home = 600;
    desk = 350;
  } else if (CENTRE_HP.has(w.code)) {
    home = 900;
    desk = 500;
  }
  shippingRates.push({ wilaya_code: w.code, home, desk, updated_at: now });
}

// -------------------------------------------------------------------
// Modes de paiement
// -------------------------------------------------------------------
const paymentMethods = [
  {
    id: "cod",
    label: "Paiement à la livraison",
    instructions: "Réglez votre commande en espèces au livreur.",
    active: 1,
    position: 0,
    updated_at: now,
  },
  {
    id: "bank",
    label: "Virement bancaire",
    instructions:
      "Un RIB vous sera envoyé après validation. La commande est expédiée dès réception du virement.",
    active: 1,
    position: 1,
    updated_at: now,
  },
  {
    id: "card",
    label: "CIB / Edahabia",
    instructions:
      "Paiement en ligne sécurisé via la plateforme SATIM (redirection après validation).",
    active: 1,
    position: 2,
    updated_at: now,
  },
  {
    id: "store",
    label: "Paiement en boutique",
    instructions: "Retirez et réglez votre commande à notre point de vente d'Alger.",
    active: 0,
    position: 3,
    updated_at: now,
  },
];

// -------------------------------------------------------------------
// Pièces du configurateur (builder_steps → section site_content)
// -------------------------------------------------------------------
const builderSteps = [
  {
    id: "case",
    label: "Boîtier",
    icon: "case",
    options: [
      { id: "case-a", name: "NZXT H5 Flow", price: 14000 },
      { id: "case-b", name: "Lian Li Lancool 216", price: 18500 },
      { id: "case-c", name: "Corsair 4000D Airflow", price: 16000 },
    ],
  },
  {
    id: "mb",
    label: "Carte mère",
    icon: "mb",
    options: [
      { id: "mb-a", name: "MSI B650 Tomahawk", price: 28000 },
      { id: "mb-b", name: "ASUS X670E-Plus", price: 52000 },
      { id: "mb-c", name: "Gigabyte B760 Aorus", price: 24000 },
    ],
  },
  {
    id: "cpu",
    label: "Processeur",
    icon: "cpu",
    options: [
      { id: "cpu-a", name: "AMD Ryzen 5 7600", price: 32000 },
      { id: "cpu-b", name: "AMD Ryzen 7 7700X", price: 52000 },
      { id: "cpu-c", name: "Intel Core i7-14700K", price: 65000 },
    ],
  },
  {
    id: "ram",
    label: "Mémoire RAM",
    icon: "ram",
    options: [
      { id: "ram-a", name: "16GB DDR5 6000", price: 14000 },
      { id: "ram-b", name: "32GB DDR5 6000", price: 26000 },
      { id: "ram-c", name: "64GB DDR5 6000", price: 52000 },
    ],
  },
  {
    id: "ssd",
    label: "SSD",
    icon: "ssd",
    options: [
      { id: "ssd-a", name: "500GB NVMe Gen4", price: 9000 },
      { id: "ssd-b", name: "1TB NVMe Gen4", price: 16000 },
      { id: "ssd-c", name: "2TB NVMe Gen4", price: 32000 },
    ],
  },
  {
    id: "gpu",
    label: "Carte graphique",
    icon: "gpu",
    options: [
      { id: "gpu-a", name: "RTX 4060 8GB", price: 60000 },
      { id: "gpu-b", name: "RTX 4070 Super 12GB", price: 110000 },
      { id: "gpu-c", name: "RTX 4080 Super 16GB", price: 200000 },
    ],
  },
  {
    id: "psu",
    label: "Alimentation",
    icon: "psu",
    options: [
      { id: "psu-a", name: "650W 80+ Bronze", price: 9500 },
      { id: "psu-b", name: "750W 80+ Gold", price: 14500 },
      { id: "psu-c", name: "850W 80+ Gold", price: 19000 },
    ],
  },
  {
    id: "cool",
    label: "Refroidissement",
    icon: "cool",
    options: [
      { id: "cool-a", name: "DeepCool AK620", price: 9000 },
      { id: "cool-b", name: "Arctic LF II 280", price: 18000 },
      { id: "cool-c", name: "NZXT Kraken X73", price: 28000 },
    ],
  },
];

// -------------------------------------------------------------------
// Contenu du site — toutes les sections de SiteContent (src/lib/site-content.ts)
// -------------------------------------------------------------------

/**
 * Les avis de la section « home-reviews » vivent dans un contenu éditorial
 * à part (section dédiée « home-reviews » de site_content). On les conserve
 * dans le seed de la vitrine pour que /content/home-reviews soit alimenté.
 *
 * La seed complète est produite par seedSiteContent() ; on n'en extrait que
 * les données pures (sans les icônes React non sérialisables).
 */
const siteContentSeed = seedSiteContent();

// section « home-reviews » : liste éditoriale d'avis (maintenue séparément)
const homeReviewsSection = {
  items: [
    {
      id: "hrev_1",
      name: "Amine Bensalah",
      city: "Alger",
      productId: "rog-strix-g16",
      text: "Excellente expérience d'achat, livraison rapide et produit authentique avec facture.",
      rating: 5,
      gradient: "linear-gradient(135deg,#3b82f6,#1e40af)",
    },
    {
      id: "hrev_2",
      name: "Yasmine A.",
      city: "Oran",
      productId: "macbook-air-m3",
      text: "Service client vraiment réactif, ils m'ont aidé à choisir le bon modèle.",
      rating: 5,
      gradient: "linear-gradient(135deg,#a855f7,#6d28d9)",
    },
    {
      id: "hrev_3",
      name: "Karim Haddad",
      city: "Constantine",
      productId: "build-mid-gaming",
      text: "Config puissante à un prix juste, fonctionnelle dès la première utilisation.",
      rating: 5,
      gradient: "linear-gradient(135deg,#10b981,#047857)",
    },
  ],
};

// section « ticker » : messages du bandeau défilant
const tickerSection = {
  items: [
    { id: "tick_1", text: "🚚 Livraison rapide dans toutes les wilayas" },
    { id: "tick_2", text: "✅ Garantie officielle sur tous les produits" },
    { id: "tick_3", text: "🔧 Support technique 7j/7" },
    { id: "tick_4", text: "💳 Paiement sécurisé à la livraison" },
    { id: "tick_5", text: "🎁 Cadeau pour toute config au-dessus de 200 000 DA" },
  ],
};

// section « marquee » : marques du bandeau défilant
const marqueeSection = {
  brands: [
    "HP",
    "Dell",
    "Lenovo",
    "ASUS",
    "Apple",
    "Samsung",
    "Xiaomi",
    "MSI",
    "Acer",
    "Intel",
    "AMD",
    "NVIDIA",
  ],
};

// section « about » : valeurs de la page À propos
const aboutSection = {
  values: [
    {
      id: "val_1",
      icon: "shield",
      title: "Garantie officielle",
      description: "Tous nos produits sont authentiques et sous garantie des revendeurs agréés.",
    },
    {
      id: "val_2",
      icon: "truck",
      title: "Livraison en Algérie",
      description: "Livraison rapide et sécurisée dans les 58 wilayas.",
    },
    {
      id: "val_3",
      icon: "headphones",
      title: "Support dédié",
      description: "Notre équipe est disponible avant et après votre achat.",
    },
    {
      id: "val_4",
      icon: "award",
      title: "Expérience et confiance",
      description: "Des années au service de milliers de clients satisfaits.",
    },
  ],
};

// section « builder » : étapes du configurateur PC
const builderSection = { steps: builderSteps };

/**
 * siteContent : toutes les sections de SiteContent + les sections éditoriales.
 *
 * Les 15 sections de SiteContent sont extraites directement de seedSiteContent().
 * Les Localized<string> sont conservés tels quels (objets {fr,en,ar}) — jamais aplatis.
 * Les 5 sections éditoriales sont conservées pour la compatibilité de l'import.
 */
const siteContent = {
  // 15 sections de SiteContent (src/lib/site-content.ts → type SiteContent)
  header: siteContentSeed.header,
  footer: siteContentSeed.footer,
  hero: siteContentSeed.hero,
  categories: siteContentSeed.categories,
  useChips: siteContentSeed.useChips,
  bestSellers: siteContentSeed.bestSellers,
  featuredTabs: siteContentSeed.featuredTabs,
  flashSale: siteContentSeed.flashSale,
  brandsMarquee: siteContentSeed.brandsMarquee,
  whyUs: siteContentSeed.whyUs,
  builderTeaser: siteContentSeed.builderTeaser,
  reviews: siteContentSeed.reviews,
  contactCta: siteContentSeed.contactCta,
  floatingWhatsApp: siteContentSeed.floatingWhatsApp,
  mobileBottomBar: siteContentSeed.mobileBottomBar,
  // 5 sections éditoriales (listes gérées séparément par l'admin)
  "home-reviews": homeReviewsSection,
  ticker: tickerSection,
  marquee: marqueeSection,
  about: aboutSection,
  builder: builderSection,
};

// -------------------------------------------------------------------
// Réglages du site (settings.scope = 'site' et 'shipping')
// -------------------------------------------------------------------
const siteSettings = {
  storeName: "KA Tech",
  contactEmail: "contact@katech.dz",
  contactPhone: "+213 555 00 00 00",
  whatsapp: "213555000000",
  address: "Alger, Algérie",
  hours: "Dimanche → Jeudi, 9h – 19h",
  maintenance: false,
  maintenanceMessage: "Nous revenons très vite ! Le site est en cours de mise à jour.",
  emailNotifications: true,
  showPromoBanner: true,
  promoBannerText: "Livraison offerte dès 60 000 DA — jusqu'à dimanche.",
  promoBannerLabel: "Découvrir",
  promoBannerHref: "/category/laptops",
  lowStockThreshold: 5,
  outOfStockThreshold: 0,
  currencySymbol: "DA",
  currencyPosition: "suffix",
  currencyThousandSeparator: " ",
  languageSelectorEnabled: false,
  hideRatingWhenNoReviews: true,
};

const shippingSettings = {
  freeShippingThreshold: 150000,
  homeEnabled: true,
  deskEnabled: true,
};

// -------------------------------------------------------------------
// Assemblage final
// -------------------------------------------------------------------
const payload = {
  generatedAt: now,
  categories,
  brands,
  products: produitsExtraits,
  blogPosts,
  shippingRates,
  paymentMethods,
  siteContent,
  siteSettings,
  shippingSettings,
};

const dest = resolve(import.meta.dir, "../api/tools/donnees-front.json");
writeFileSync(dest, JSON.stringify(payload, null, 2), "utf8");

console.log(`Extraction terminée → ${dest}`);
console.log(`  catégories  : ${categories.length}`);
console.log(`  marques     : ${brands.length}`);
console.log(`  produits    : ${produitsExtraits.length}`);
console.log(`  articles    : ${blogPosts.length}`);
console.log(`  tarifs liv. : ${shippingRates.length}`);
console.log(`  paiements   : ${paymentMethods.length}`);
console.log(`  site_content: ${Object.keys(siteContent).length} sections`);
