import { useSyncExternalStore } from "react";
import { products as seedProducts, categoryMeta, type Product, type Category } from "@/data/products";
import { WILAYAS } from "@/data/wilayas";
import { seedSiteContent, mergeSiteContent, type SiteContent } from "./site-content";
export type { SiteContent } from "./site-content";

// ---------- Types ----------
export type AdminCategory = {
  slug: string;
  label: string;
  description: string;
  cover?: string;
};

export type AdminBrand = {
  id: string;
  name: string;
  description?: string;
  country?: string;
};

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type OrderStatusEvent = { status: OrderStatus; at: string; note?: string };
export type OrderItem = { productId: string; name: string; price: number; qty: number; image?: string };
export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  total: number;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  paymentMethod: string; // id of a PaymentMethod
  paymentLabel?: string;
  wilaya: string;
  deliveryKind: "home" | "desk";
  address: string;
  phone: string;
  createdAt: string; // ISO
  note?: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  wilaya: string;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
};

export type Coupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minPurchase: number;
  expiresAt: string; // ISO
  usageCount: number;
  usageLimit: number;
  active: boolean;
};

export type ReviewStatus = "pending" | "approved" | "rejected";
export type Review = {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
};

export type AdminUserRole = "owner" | "admin" | "editor" | "viewer";
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover?: string;
  author: string;
  tags: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type HomeReview = {
  id: string;
  name: string;
  city: string;
  productId: string;
  text: string;
  rating: number;
  gradient: string;
};

export type TickerMessage = { id: string; text: string };

export type AboutValue = {
  id: string;
  icon: "shield" | "truck" | "headphones" | "award" | "star" | "heart";
  title: string;
  description: string;
};

export type BuilderPart = { id: string; name: string; price: number };
export type BuilderStep = {
  id: string;
  label: string;
  icon: "case" | "mb" | "cpu" | "ram" | "ssd" | "gpu" | "psu" | "cool";
  options: BuilderPart[];
};

export type SiteSettings = {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  address: string;
  hours: string;
  maintenance: boolean;
  emailNotifications: boolean;
  showPromoBanner: boolean;
  lowStockThreshold: number;
  outOfStockThreshold: number;
};


// A single shipping rate: either specific wilaya code, or "*" for default.
export type ShippingRate = { wilayaCode: string; home: number; desk: number };
export type ShippingSettings = { freeShippingThreshold: number; homeEnabled: boolean; deskEnabled: boolean };

export type PaymentMethod = {
  id: string;
  label: string;
  instructions: string;
  active: boolean;
};

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  createdAt: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  src: string; // data:URL or absolute URL
  mime: string;
  size: number; // bytes
  createdAt: string;
  tag?: string;
};

export type NotificationLevel = "info" | "success" | "warning" | "error";
export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  level: NotificationLevel;
  read: boolean;
  createdAt: string;
  link?: string;
};

export type AuditLog = {
  id: string;
  actor: string; // user email or "système"
  action: string; // e.g. "order.status.update"
  entity: string; // e.g. "order KA100234"
  detail?: string;
  createdAt: string;
};

export type AdminState = {
  products: Product[];
  categories: AdminCategory[];
  brands: AdminBrand[];
  orders: Order[];
  customers: Customer[];
  coupons: Coupon[];
  reviews: Review[];
  users: AdminUser[];
  blogPosts: BlogPost[];
  homeReviews: HomeReview[];
  tickerMessages: TickerMessage[];
  marqueeBrands: string[];
  aboutValues: AboutValue[];
  builderSteps: BuilderStep[];
  shippingRates: ShippingRate[];
  paymentMethods: PaymentMethod[];
  stockMovements: StockMovement[];
  mediaAssets: MediaAsset[];
  notifications: AdminNotification[];
  auditLogs: AuditLog[];
  siteSettings: SiteSettings;
  shippingSettings: ShippingSettings;
  siteContent: SiteContent;
};

export const ARRAY_KEYS = [
  "products", "categories", "brands", "orders", "customers", "coupons",
  "reviews", "users", "blogPosts", "homeReviews", "tickerMessages",
  "marqueeBrands", "aboutValues", "builderSteps",
  "shippingRates", "paymentMethods", "stockMovements",
  "mediaAssets", "notifications", "auditLogs",
] as const;
export type ArrayKey = typeof ARRAY_KEYS[number];

// ---------- Seed helpers ----------
const CAT_LABELS: Record<Category, string> = {
  laptops: "Ordinateurs portables",
  desktops: "Ordinateurs de bureau",
  builds: "Configurations PC",
  phones: "Smartphones",
};
const CAT_DESC: Record<Category, string> = {
  laptops: "Laptops pour le travail, les études et le gaming.",
  desktops: "Tours et mini-PC de bureau.",
  builds: "Configurations sur-mesure KA Build.",
  phones: "Smartphones Android et iOS.",
};

function seedCategories(): AdminCategory[] {
  return (Object.keys(categoryMeta) as Category[]).map((slug) => ({
    slug,
    label: CAT_LABELS[slug],
    description: CAT_DESC[slug],
    cover: seedProducts.find((p) => p.category === slug)?.image,
  }));
}

function seedBrands(): AdminBrand[] {
  const set = new Map<string, AdminBrand>();
  for (const p of seedProducts) {
    if (!set.has(p.brand)) {
      set.set(p.brand, {
        id: p.brand.toLowerCase().replace(/\s+/g, "-"),
        name: p.brand,
        description: `Marque ${p.brand} distribuée par KA Tech.`,
        country: brandCountry(p.brand),
      });
    }
  }
  return Array.from(set.values());
}
function brandCountry(name: string): string {
  const map: Record<string, string> = {
    ASUS: "Taïwan", HP: "États-Unis", Lenovo: "Chine", Apple: "États-Unis",
    Dell: "États-Unis", Samsung: "Corée du Sud", Xiaomi: "Chine", "KA Build": "Algérie",
  };
  return map[name] ?? "International";
}

const SEED_WILAYAS = ["Alger", "Oran", "Constantine", "Annaba", "Sétif", "Blida", "Batna", "Tlemcen", "Béjaïa", "Tizi Ouzou"];
const FIRST_NAMES = ["Yacine", "Amine", "Sarah", "Nassim", "Lina", "Karim", "Sofia", "Omar", "Mehdi", "Rania", "Anis", "Nadia", "Riad", "Imane", "Hakim"];
const LAST_NAMES = ["Benali", "Boudjemaa", "Cherif", "Khelifi", "Meziane", "Zerrouki", "Belkacem", "Hadj", "Sahraoui", "Amrani", "Ouarab", "Bouzid"];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }
function seedCustomers(): Customer[] {
  const list: Customer[] = [];
  for (let i = 0; i < 24; i++) {
    const fn = pick(FIRST_NAMES, i * 3);
    const ln = pick(LAST_NAMES, i * 5 + 1);
    const created = new Date(Date.now() - (i * 3 + 5) * 86400000).toISOString();
    list.push({
      id: `cus_${1000 + i}`,
      name: `${fn} ${ln}`,
      email: `${fn}.${ln}`.toLowerCase() + "@example.dz",
      phone: `05${(50000000 + i * 137891).toString().slice(0, 8)}`,
      wilaya: pick(SEED_WILAYAS, i),
      createdAt: created,
      ordersCount: 0,
      totalSpent: 0,
    });
  }
  return list;
}

function seedOrders(customers: Customer[]): Order[] {
  const orders: Order[] = [];
  for (let i = 0; i < 32; i++) {
    const cust = pick(customers, i * 7 + 3);
    const nItems = 1 + (i % 3);
    const items: OrderItem[] = [];
    for (let j = 0; j < nItems; j++) {
      const p = pick(seedProducts, i * 5 + j * 2);
      items.push({ productId: p.id, name: p.name, price: p.price, qty: 1 + ((i + j) % 2), image: p.image });
    }
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = subtotal > 100000 ? 0 : 800;
    const status: OrderStatus = i < 4 ? "pending" : i < 10 ? "processing" : i < 20 ? "shipped" : i < 28 ? "delivered" : "cancelled";
    const createdAt = new Date(Date.now() - i * 43200000).toISOString();
    const flow: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];
    const idx = flow.indexOf(status);
    const statusHistory: OrderStatusEvent[] = status === "cancelled"
      ? [{ status: "pending", at: createdAt }, { status: "cancelled", at: createdAt, note: "Annulée par le client" }]
      : flow.slice(0, Math.max(1, idx + 1)).map((s, k) => ({ status: s, at: new Date(Date.parse(createdAt) + k * 6 * 3600000).toISOString() }));
    const pm = i % 3 === 0 ? "card" : i % 3 === 1 ? "cod" : "bank";
    orders.push({
      id: `KA${(24001 + i).toString()}`,
      customerId: cust.id,
      customerName: cust.name,
      customerEmail: cust.email,
      items,
      subtotal,
      discount: 0,
      shipping,
      total: subtotal + shipping,
      status,
      statusHistory,
      paymentMethod: pm,
      paymentLabel: pm === "cod" ? "Paiement à la livraison" : pm === "card" ? "CIB / Edahabia" : "Virement bancaire",
      wilaya: cust.wilaya,
      deliveryKind: i % 2 === 0 ? "home" : "desk",
      address: `Rue ${100 + i}, ${cust.wilaya}`,
      phone: cust.phone,
      createdAt,
      note: i % 5 === 0 ? "Livraison rapide demandée" : undefined,
    });
  }
  const map = new Map(customers.map((c) => [c.id, c] as const));
  for (const o of orders) {
    const c = map.get(o.customerId);
    if (c && o.status !== "cancelled") {
      c.ordersCount += 1;
      c.totalSpent += o.total;
    }
  }
  return orders;
}

function seedCoupons(): Coupon[] {
  const now = Date.now();
  const d = (days: number) => new Date(now + days * 86400000).toISOString();
  return [
    { code: "BIENVENUE10", type: "percent", value: 10, minPurchase: 20000, expiresAt: d(45), usageCount: 27, usageLimit: 500, active: true },
    { code: "RENTREE2026", type: "percent", value: 15, minPurchase: 50000, expiresAt: d(20), usageCount: 84, usageLimit: 300, active: true },
    { code: "FREESHIP", type: "fixed", value: 800, minPurchase: 30000, expiresAt: d(90), usageCount: 156, usageLimit: 1000, active: true },
    { code: "FLASH5000", type: "fixed", value: 5000, minPurchase: 100000, expiresAt: d(7), usageCount: 12, usageLimit: 100, active: true },
    { code: "OLDPROMO", type: "percent", value: 20, minPurchase: 0, expiresAt: d(-15), usageCount: 210, usageLimit: 250, active: false },
    { code: "VIP25", type: "percent", value: 25, minPurchase: 200000, expiresAt: d(60), usageCount: 3, usageLimit: 50, active: true },
  ];
}

function seedReviews(): Review[] {
  const list: Review[] = [];
  const samples = [
    { rating: 5, title: "Excellent produit", body: "Livraison rapide, parfaitement conforme à la description." },
    { rating: 4, title: "Très bon", body: "Bon rapport qualité/prix, quelques détails à améliorer." },
    { rating: 5, title: "Parfait !", body: "Je recommande KA Tech, service client au top." },
    { rating: 3, title: "Correct", body: "Produit correct mais délai un peu long." },
    { rating: 2, title: "Déçu", body: "L'emballage était abîmé à réception." },
    { rating: 5, title: "Rapide et pro", body: "Commande arrivée en 2 jours à Alger." },
    { rating: 4, title: "Fidèle à la fiche", body: "Performances conformes aux specs annoncées." },
  ];
  for (let i = 0; i < 18; i++) {
    const p = pick(seedProducts, i * 3);
    const s = pick(samples, i);
    const fn = pick(FIRST_NAMES, i * 2);
    const ln = pick(LAST_NAMES, i);
    list.push({
      id: `rev_${2000 + i}`,
      productId: p.id,
      productName: p.name,
      customerName: `${fn} ${ln}`,
      rating: s.rating,
      title: s.title,
      body: s.body,
      status: i < 4 ? "pending" : i < 15 ? "approved" : "rejected",
      createdAt: new Date(Date.now() - i * 172800000).toISOString(),
    });
  }
  return list;
}

function seedUsers(): AdminUser[] {
  const now = Date.now();
  return [
    { id: "usr_1", name: "Yacine Admin", email: "admin@katech.dz", role: "owner", active: true, lastLogin: new Date(now - 3600000).toISOString(), createdAt: new Date(now - 365 * 86400000).toISOString() },
    { id: "usr_2", name: "Sarah Boudjemaa", email: "sarah@katech.dz", role: "admin", active: true, lastLogin: new Date(now - 86400000).toISOString(), createdAt: new Date(now - 200 * 86400000).toISOString() },
    { id: "usr_3", name: "Karim Cherif", email: "karim@katech.dz", role: "editor", active: true, lastLogin: new Date(now - 4 * 86400000).toISOString(), createdAt: new Date(now - 120 * 86400000).toISOString() },
    { id: "usr_4", name: "Lina Meziane", email: "lina@katech.dz", role: "editor", active: false, lastLogin: new Date(now - 30 * 86400000).toISOString(), createdAt: new Date(now - 90 * 86400000).toISOString() },
    { id: "usr_5", name: "Omar Sahraoui", email: "omar@katech.dz", role: "viewer", active: true, lastLogin: new Date(now - 2 * 86400000).toISOString(), createdAt: new Date(now - 45 * 86400000).toISOString() },
  ];
}

function seedBlogPosts(): BlogPost[] {
  const now = Date.now();
  const d = (days: number) => new Date(now - days * 86400000).toISOString();
  const base = [
    { slug: "guide-achat-laptop-2026", title: "Guide d'achat : bien choisir son ordinateur portable en 2026", excerpt: "CPU, GPU, RAM, écran — les critères qui comptent vraiment selon votre usage.", content: "# Bien choisir son laptop en 2026\n\nEn 2026, l'offre laptop est plus riche que jamais. Voici les 5 critères à ne pas négliger :\n\n1. **Le processeur** : privilégiez un Intel Core Ultra ou un AMD Ryzen 7000+.\n2. **La RAM** : 16 Go minimum, 32 Go pour la création.\n3. **Le SSD** : NVMe Gen4, 512 Go minimum.\n4. **L'écran** : dalle IPS ou OLED, 100 % sRGB pour la couleur juste.\n5. **La garantie** : chez KA Tech, tous nos laptops sont sous garantie officielle.", tags: ["laptop", "guide"] },
    { slug: "gaming-pc-vs-console", title: "PC gaming vs console : le match 2026", excerpt: "Prix, catalogue, mods, longévité — on compare les deux univers.", content: "Le débat PC vs console revient chaque génération. En 2026, le PC prend l'avantage sur la modularité, le catalogue Steam et la longévité — mais la console reste imbattable sur le plug-and-play.", tags: ["gaming", "comparatif"] },
    { slug: "smartphone-photo-2026", title: "Top 3 smartphones photo début 2026", excerpt: "iPhone 16 Pro Max, Galaxy S25 Ultra, Xiaomi 14T Pro : notre verdict.", content: "Trois flagships, trois philosophies photo. L'iPhone mise sur la constance vidéo, le Samsung sur la polyvalence zoom, le Xiaomi sur la signature Leica. À vous de choisir.", tags: ["smartphone", "photo", "top"] },
    { slug: "monter-son-pc-configurateur", title: "Monter son PC : nos conseils du configurateur KA Tech", excerpt: "Pourquoi passer par un PC sur-mesure et comment éviter les pièges classiques.", content: "Notre configurateur PC vous guide étape par étape. Avant de valider votre config, vérifiez : la compatibilité socket CPU/carte-mère, le TDP de l'alim (+30 % de marge), et la ventilation du boîtier.", tags: ["pc-sur-mesure", "conseil"] },
    { slug: "livraison-58-wilayas", title: "Livraison en Algérie : ce qu'il faut savoir", excerpt: "Délais, tarifs, paiement à la livraison — on répond à vos questions.", content: "KA Tech livre dans les 58 wilayas. Comptez 2 à 5 jours ouvrés selon votre région. Le paiement à la livraison est disponible pour la majorité des produits.", tags: ["livraison", "faq"] },
  ];
  return base.map((b, i) => ({
    id: `blog_${100 + i}`,
    ...b,
    cover: seedProducts[i % seedProducts.length]?.image,
    author: i % 2 === 0 ? "Équipe KA Tech" : "Yacine B.",
    status: "published",
    createdAt: d(30 - i * 4),
    updatedAt: d(30 - i * 4),
    publishedAt: d(30 - i * 4),
  }));
}

function seedHomeReviews(): HomeReview[] {
  return [
    { id: "hrev_1", name: "Amine Bensalah", city: "Alger", productId: "rog-strix-g16", text: "Excellente expérience d'achat, livraison rapide et produit authentique avec facture.", rating: 5, gradient: "linear-gradient(135deg,#3b82f6,#1e40af)" },
    { id: "hrev_2", name: "Yasmine A.", city: "Oran", productId: "macbook-air-m3", text: "Service client vraiment réactif, ils m'ont aidé à choisir le bon modèle.", rating: 5, gradient: "linear-gradient(135deg,#a855f7,#6d28d9)" },
    { id: "hrev_3", name: "Karim Haddad", city: "Constantine", productId: "build-mid-gaming", text: "Config puissante à un prix juste, fonctionnelle dès la première utilisation.", rating: 5, gradient: "linear-gradient(135deg,#10b981,#047857)" },
  ];
}

function seedTickerMessages(): TickerMessage[] {
  return [
    { id: "tick_1", text: "🚚 Livraison rapide dans toutes les wilayas" },
    { id: "tick_2", text: "✅ Garantie officielle sur tous les produits" },
    { id: "tick_3", text: "🔧 Support technique 7j/7" },
    { id: "tick_4", text: "💳 Paiement sécurisé à la livraison" },
    { id: "tick_5", text: "🎁 Cadeau pour toute config au-dessus de 200 000 DA" },
  ];
}

function seedMarqueeBrands(): string[] {
  return ["HP", "Dell", "Lenovo", "ASUS", "Apple", "Samsung", "Xiaomi", "MSI", "Acer", "Intel", "AMD", "NVIDIA"];
}

function seedAboutValues(): AboutValue[] {
  return [
    { id: "val_1", icon: "shield", title: "Garantie officielle", description: "Tous nos produits sont authentiques et sous garantie des revendeurs agréés." },
    { id: "val_2", icon: "truck", title: "Livraison en Algérie", description: "Livraison rapide et sécurisée dans les 58 wilayas." },
    { id: "val_3", icon: "headphones", title: "Support dédié", description: "Notre équipe est disponible avant et après votre achat." },
    { id: "val_4", icon: "award", title: "Expérience et confiance", description: "Des années au service de milliers de clients satisfaits." },
  ];
}

function seedBuilderSteps(): BuilderStep[] {
  return [
    { id: "case", label: "Boîtier", icon: "case", options: [
      { id: "case-a", name: "NZXT H5 Flow", price: 14000 },
      { id: "case-b", name: "Lian Li Lancool 216", price: 18500 },
      { id: "case-c", name: "Corsair 4000D Airflow", price: 16000 },
    ]},
    { id: "mb", label: "Carte mère", icon: "mb", options: [
      { id: "mb-a", name: "MSI B650 Tomahawk", price: 28000 },
      { id: "mb-b", name: "ASUS X670E-Plus", price: 52000 },
      { id: "mb-c", name: "Gigabyte B760 Aorus", price: 24000 },
    ]},
    { id: "cpu", label: "Processeur", icon: "cpu", options: [
      { id: "cpu-a", name: "AMD Ryzen 5 7600", price: 32000 },
      { id: "cpu-b", name: "AMD Ryzen 7 7700X", price: 52000 },
      { id: "cpu-c", name: "Intel Core i7-14700K", price: 65000 },
    ]},
    { id: "ram", label: "Mémoire RAM", icon: "ram", options: [
      { id: "ram-a", name: "16GB DDR5 6000", price: 14000 },
      { id: "ram-b", name: "32GB DDR5 6000", price: 26000 },
      { id: "ram-c", name: "64GB DDR5 6000", price: 52000 },
    ]},
    { id: "ssd", label: "SSD", icon: "ssd", options: [
      { id: "ssd-a", name: "500GB NVMe Gen4", price: 9000 },
      { id: "ssd-b", name: "1TB NVMe Gen4", price: 16000 },
      { id: "ssd-c", name: "2TB NVMe Gen4", price: 32000 },
    ]},
    { id: "gpu", label: "Carte graphique", icon: "gpu", options: [
      { id: "gpu-a", name: "RTX 4060 8GB", price: 60000 },
      { id: "gpu-b", name: "RTX 4070 Super 12GB", price: 110000 },
      { id: "gpu-c", name: "RTX 4080 Super 16GB", price: 200000 },
    ]},
    { id: "psu", label: "Alimentation", icon: "psu", options: [
      { id: "psu-a", name: "650W 80+ Bronze", price: 9500 },
      { id: "psu-b", name: "750W 80+ Gold", price: 14500 },
      { id: "psu-c", name: "850W 80+ Gold", price: 19000 },
    ]},
    { id: "cool", label: "Refroidissement", icon: "cool", options: [
      { id: "cool-a", name: "DeepCool AK620", price: 9000 },
      { id: "cool-b", name: "Arctic LF II 280", price: 18000 },
      { id: "cool-c", name: "NZXT Kraken X73", price: 28000 },
    ]},
  ];
}

function seedSiteSettings(): SiteSettings {
  return {
    storeName: "KA Tech",
    contactEmail: "contact@katech.dz",
    contactPhone: "+213 555 00 00 00",
    whatsapp: "213555000000",
    address: "Alger, Algérie",
    hours: "Dimanche → Jeudi, 9h – 19h",
    maintenance: false,
    emailNotifications: true,
    showPromoBanner: true,
    lowStockThreshold: 5,
    outOfStockThreshold: 0,
  };
}

function emptySiteSettings(): SiteSettings {
  return {
    storeName: "", contactEmail: "", contactPhone: "", whatsapp: "",
    address: "", hours: "",
    maintenance: false, emailNotifications: false, showPromoBanner: false,
    lowStockThreshold: 5, outOfStockThreshold: 0,
  };
}


// Shipping seeds: default rate + tier by wilaya (north / centre / hauts-plateaux / sud).
const NORTH = new Set(["16", "09", "35", "42", "15", "06", "18", "21", "23", "25", "43", "36", "24", "31", "27", "22", "46", "13"]);
const CENTRE_HP = new Set(["02", "10", "26", "44", "38", "14", "20", "29", "48", "05", "19", "34", "40", "41", "28", "03", "17"]);
// remaining codes are considered Sud.

function seedShippingRates(): ShippingRate[] {
  const list: ShippingRate[] = [{ wilayaCode: "*", home: 800, desk: 400 }];
  for (const w of WILAYAS) {
    let home = 1500, desk = 800; // sud default
    if (NORTH.has(w.code)) { home = 600; desk = 350; }
    else if (CENTRE_HP.has(w.code)) { home = 900; desk = 500; }
    list.push({ wilayaCode: w.code, home, desk });
  }
  return list;
}

function seedShippingSettings(): ShippingSettings {
  return { freeShippingThreshold: 150000, homeEnabled: true, deskEnabled: true };
}

function emptyShippingSettings(): ShippingSettings {
  return { freeShippingThreshold: 0, homeEnabled: false, deskEnabled: false };
}

function seedPaymentMethods(): PaymentMethod[] {
  return [
    { id: "cod", label: "Paiement à la livraison", instructions: "Réglez votre commande en espèces au livreur.", active: true },
    { id: "bank", label: "Virement bancaire", instructions: "Un RIB vous sera envoyé après validation. La commande est expédiée dès réception du virement.", active: true },
    { id: "card", label: "CIB / Edahabia", instructions: "Paiement en ligne sécurisé via la plateforme SATIM (redirection après validation).", active: true },
    { id: "store", label: "Paiement en boutique", instructions: "Retirez et réglez votre commande à notre point de vente d'Alger.", active: false },
  ];
}

function seedStockMovements(): StockMovement[] { return []; }
function seedMediaAssets(): MediaAsset[] { return []; }
function seedAuditLogs(): AuditLog[] { return []; }
function seedNotifications(): AdminNotification[] {
  const now = Date.now();
  const d = (h: number) => new Date(now - h * 3600000).toISOString();
  return [
    { id: "notif_1", title: "Bienvenue sur KA Tech Admin", body: "Explorez le tableau de bord pour un aperçu complet.", level: "info", read: false, createdAt: d(0.5) },
    { id: "notif_2", title: "Stock faible", body: "Plusieurs produits ont un stock faible — pensez à réapprovisionner.", level: "warning", read: false, createdAt: d(6), link: "/admin/inventory" },
    { id: "notif_3", title: "Nouveau coupon actif", body: "Le code BIENVENUE10 est actif jusqu'au mois prochain.", level: "success", read: true, createdAt: d(48), link: "/admin/coupons" },
  ];
}

function defaultQtyForLabel(stock: Product["stock"]): number {
  return stock === "in" ? 50 : stock === "low" ? 3 : 0;
}

export function resolveStockLevel(qty: number, settings: Pick<SiteSettings, "lowStockThreshold" | "outOfStockThreshold">): Product["stock"] {
  if (qty <= settings.outOfStockThreshold) return "out";
  if (qty <= settings.lowStockThreshold) return "low";
  return "in";
}

function seedAll(): AdminState {
  const customers = seedCustomers();
  const orders = seedOrders(customers);
  return {
    products: seedProducts.map((p) => ({
      ...p,
      specs: { ...p.specs },
      stockQty: p.stockQty ?? defaultQtyForLabel(p.stock),
    })),
    categories: seedCategories(),
    brands: seedBrands(),
    orders,
    customers,
    coupons: seedCoupons(),
    reviews: seedReviews(),
    users: seedUsers(),
    blogPosts: seedBlogPosts(),
    homeReviews: seedHomeReviews(),
    tickerMessages: seedTickerMessages(),
    marqueeBrands: seedMarqueeBrands(),
    aboutValues: seedAboutValues(),
    builderSteps: seedBuilderSteps(),
    shippingRates: seedShippingRates(),
    paymentMethods: seedPaymentMethods(),
    stockMovements: seedStockMovements(),
    mediaAssets: seedMediaAssets(),
    notifications: seedNotifications(),
    auditLogs: seedAuditLogs(),
    siteSettings: seedSiteSettings(),
    shippingSettings: seedShippingSettings(),
  };
}


// ---------- Store ----------
const LS_KEY = "katech.admin.state.v1";

function loadState(): AdminState {
  if (typeof window === "undefined") return seedAll();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return seedAll();
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    const seed = seedAll();
    const products = (parsed.products ?? seed.products).map((p) => {
      const src = seed.products.find((sp) => sp.id === p.id);
      const image = src ? (p.image?.startsWith("/") || p.image?.startsWith("http") || p.image?.startsWith("data:") ? p.image : src.image) : p.image;
      const stockQty = typeof p.stockQty === "number" ? p.stockQty : defaultQtyForLabel(p.stock);
      return { ...p, image, stockQty };
    });

    return {
      products,
      categories: parsed.categories ?? seed.categories,
      brands: parsed.brands ?? seed.brands,
      orders: parsed.orders ?? seed.orders,
      customers: parsed.customers ?? seed.customers,
      coupons: parsed.coupons ?? seed.coupons,
      reviews: parsed.reviews ?? seed.reviews,
      users: parsed.users ?? seed.users,
      blogPosts: parsed.blogPosts ?? seed.blogPosts,
      homeReviews: parsed.homeReviews ?? seed.homeReviews,
      tickerMessages: parsed.tickerMessages ?? seed.tickerMessages,
      marqueeBrands: parsed.marqueeBrands ?? seed.marqueeBrands,
      aboutValues: parsed.aboutValues ?? seed.aboutValues,
      builderSteps: parsed.builderSteps ?? seed.builderSteps,
      shippingRates: parsed.shippingRates ?? seed.shippingRates,
      paymentMethods: parsed.paymentMethods ?? seed.paymentMethods,
      stockMovements: parsed.stockMovements ?? seed.stockMovements,
      mediaAssets: parsed.mediaAssets ?? seed.mediaAssets,
      notifications: parsed.notifications ?? seed.notifications,
      auditLogs: parsed.auditLogs ?? seed.auditLogs,
      siteSettings: { ...seed.siteSettings, ...(parsed.siteSettings ?? {}) },
      shippingSettings: { ...seed.shippingSettings, ...(parsed.shippingSettings ?? {}) },
    };
  } catch {
    return seedAll();
  }
}

function saveState(s: AdminState) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

let state: AdminState = loadState();
const listeners = new Set<() => void>();

function emit() {
  saveState(state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return state; }

export function useAdminState(): AdminState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getAdminSnapshot(): AdminState { return state; }

// ---------- Mutations ----------
function set<T extends keyof AdminState>(key: T, value: AdminState[T]) {
  state = { ...state, [key]: value };
  emit();
}

// Products
export function upsertProduct(p: Product) {
  const list = state.products.slice();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.unshift(p);
  set("products", list);
}
export function deleteProduct(id: string) {
  set("products", state.products.filter((p) => p.id !== id));
}
export function getProduct(id: string) { return state.products.find((p) => p.id === id); }

// Categories
export function upsertCategory(c: AdminCategory) {
  const list = state.categories.slice();
  const idx = list.findIndex((x) => x.slug === c.slug);
  if (idx >= 0) list[idx] = c; else list.push(c);
  set("categories", list);
}
export function deleteCategory(slug: string) {
  set("categories", state.categories.filter((c) => c.slug !== slug));
}
export function getCategory(slug: string) { return state.categories.find((c) => c.slug === slug); }

// Brands
export function upsertBrand(b: AdminBrand) {
  const list = state.brands.slice();
  const idx = list.findIndex((x) => x.id === b.id);
  if (idx >= 0) list[idx] = b; else list.push(b);
  set("brands", list);
}
export function deleteBrand(id: string) {
  set("brands", state.brands.filter((b) => b.id !== id));
}
export function getBrand(id: string) { return state.brands.find((b) => b.id === id); }

// Orders
export function updateOrderStatus(id: string, status: OrderStatus, note?: string) {
  set("orders", state.orders.map((o) => {
    if (o.id !== id) return o;
    const ev: OrderStatusEvent = { status, at: new Date().toISOString(), note };
    return { ...o, status, statusHistory: [...(o.statusHistory ?? []), ev] };
  }));
  logAudit(`commande ${id}`, "order.status.update", status);
  if (status === "cancelled" || status === "delivered") {
    addNotification({
      title: status === "delivered" ? `Commande ${id} livrée` : `Commande ${id} annulée`,
      body: note ?? "",
      level: status === "delivered" ? "success" : "warning",
      link: `/admin/orders/${id}`,
    });
  }
}

export function createOrder(input: {
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentLabel?: string;
  wilaya: string;
  deliveryKind: "home" | "desk";
  address: string;
  phone: string;
  note?: string;
}): Order {
  const now = new Date().toISOString();
  const id = `KA${Math.floor(100000 + Math.random() * 900000)}`;
  const order: Order = {
    id,
    customerId: input.customerId ?? `guest_${Date.now()}`,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    items: input.items,
    subtotal: input.subtotal,
    discount: input.discount,
    couponCode: input.couponCode,
    shipping: input.shipping,
    total: input.total,
    status: "pending",
    statusHistory: [{ status: "pending", at: now, note: "Commande passée" }],
    paymentMethod: input.paymentMethod,
    paymentLabel: input.paymentLabel,
    wilaya: input.wilaya,
    deliveryKind: input.deliveryKind,
    address: input.address,
    phone: input.phone,
    createdAt: now,
    note: input.note,
  };
  // Log stock movements per item
  const movements: StockMovement[] = input.items.map((it, i) => ({
    id: `mov_${Date.now()}_${i}`,
    productId: it.productId,
    productName: it.name,
    delta: -it.qty,
    reason: `Commande ${id}`,
    createdAt: now,
  }));
  // Increment coupon usage
  const coupons = input.couponCode
    ? state.coupons.map((c) => c.code === input.couponCode ? { ...c, usageCount: c.usageCount + 1 } : c)
    : state.coupons;
  // Update customer aggregates if matched by id or email
  const customers = state.customers.map((c) => {
    const match = (input.customerId && c.id === input.customerId) || (input.customerEmail && c.email.toLowerCase() === input.customerEmail.toLowerCase());
    if (!match) return c;
    return { ...c, ordersCount: c.ordersCount + 1, totalSpent: c.totalSpent + order.total };
  });
  // Decrement product qty and refresh stock label from thresholds
  const qtyMap = new Map<string, number>();
  for (const it of input.items) qtyMap.set(it.productId, (qtyMap.get(it.productId) ?? 0) + it.qty);
  const products = state.products.map((p) => {
    const dec = qtyMap.get(p.id);
    if (!dec) return p;
    const nextQty = Math.max(0, (p.stockQty ?? defaultQtyForLabel(p.stock)) - dec);
    return { ...p, stockQty: nextQty, stock: resolveStockLevel(nextQty, state.siteSettings) };
  });
  state = {
    ...state,
    orders: [order, ...state.orders],
    stockMovements: [...movements, ...state.stockMovements],
    coupons,
    customers,
    products,
  };
  emit();

  addNotification({
    title: `Nouvelle commande ${order.id}`,
    body: `${order.customerName} — ${order.total.toLocaleString("fr-FR")} DA`,
    level: "success",
    link: `/admin/orders/${order.id}`,
  });
  logAudit(`commande ${order.id}`, "order.create", `${order.items.length} article(s) · ${order.total} DA`, order.customerEmail);
  return order;
}

// Coupons
export function upsertCoupon(c: Coupon) {
  const list = state.coupons.slice();
  const idx = list.findIndex((x) => x.code === c.code);
  if (idx >= 0) list[idx] = c; else list.unshift(c);
  set("coupons", list);
}
export function deleteCoupon(code: string) {
  set("coupons", state.coupons.filter((c) => c.code !== code));
}

export type CouponValidation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

export function validateCoupon(code: string, subtotal: number): CouponValidation {
  const c = state.coupons.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!c) return { ok: false, error: "Code inconnu" };
  if (!c.active) return { ok: false, error: "Ce code est désactivé" };
  if (new Date(c.expiresAt).getTime() < Date.now()) return { ok: false, error: "Ce code a expiré" };
  if (c.usageCount >= c.usageLimit) return { ok: false, error: "Ce code a atteint sa limite d'utilisation" };
  if (subtotal < c.minPurchase) return { ok: false, error: `Achat minimum de ${c.minPurchase.toLocaleString("fr-FR")} DA requis` };
  const discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
  return { ok: true, coupon: c, discount: Math.min(discount, subtotal) };
}

// Reviews
export function updateReviewStatus(id: string, status: ReviewStatus) {
  set("reviews", state.reviews.map((r) => r.id === id ? { ...r, status } : r));
}
export function deleteReview(id: string) {
  set("reviews", state.reviews.filter((r) => r.id !== id));
}

export function createProductReview(input: {
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  title: string;
  body: string;
}): Review {
  const r: Review = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    productId: input.productId,
    productName: input.productName,
    customerName: input.customerName,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    title: input.title || "Avis client",
    body: input.body,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  set("reviews", [r, ...state.reviews]);
  addNotification({
    title: `Nouvel avis en attente`,
    body: `${r.customerName} · ${r.productName} (${r.rating}/5)`,
    level: "info",
    link: "/admin/reviews",
  });
  logAudit(`avis ${r.id}`, "review.create", `${r.rating}/5 sur ${r.productName}`, r.customerName);
  return r;
}

export function productRatingStats(productId: string): { avg: number; count: number; approved: Review[] } {
  const approved = state.reviews.filter((r) => r.productId === productId && r.status === "approved");
  const count = approved.length;
  const avg = count ? approved.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { avg, count, approved };
}

// Users
export function upsertUser(u: AdminUser) {
  const list = state.users.slice();
  const idx = list.findIndex((x) => x.id === u.id);
  if (idx >= 0) list[idx] = u; else list.unshift(u);
  set("users", list);
}
export function deleteUser(id: string) {
  set("users", state.users.filter((u) => u.id !== id));
}

// Blog
export function upsertBlogPost(p: BlogPost) {
  const list = state.blogPosts.slice();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.unshift(p);
  set("blogPosts", list);
}
export function deleteBlogPost(id: string) {
  set("blogPosts", state.blogPosts.filter((p) => p.id !== id));
}
export function getBlogPost(id: string) { return state.blogPosts.find((p) => p.id === id); }
export function getBlogPostBySlug(slug: string) { return state.blogPosts.find((p) => p.slug === slug); }

// Home reviews
export function upsertHomeReview(r: HomeReview) {
  const list = state.homeReviews.slice();
  const idx = list.findIndex((x) => x.id === r.id);
  if (idx >= 0) list[idx] = r; else list.push(r);
  set("homeReviews", list);
}
export function deleteHomeReview(id: string) {
  set("homeReviews", state.homeReviews.filter((r) => r.id !== id));
}

// Ticker / marquee / about / builder
export function setTickerMessages(list: TickerMessage[]) { set("tickerMessages", list); }
export function setMarqueeBrands(list: string[]) { set("marqueeBrands", list); }
export function setAboutValues(list: AboutValue[]) { set("aboutValues", list); }
export function setBuilderSteps(list: BuilderStep[]) { set("builderSteps", list); }

// Site settings
export function updateSiteSettings(patch: Partial<SiteSettings>) {
  const nextSettings = { ...state.siteSettings, ...patch };
  const thresholdChanged = ("lowStockThreshold" in patch || "outOfStockThreshold" in patch);
  const products = thresholdChanged
    ? state.products.map((p) => {
        const qty = p.stockQty ?? defaultQtyForLabel(p.stock);
        return { ...p, stock: resolveStockLevel(qty, nextSettings) };
      })
    : state.products;
  state = { ...state, siteSettings: nextSettings, products };
  emit();
}


// Shipping
export function upsertShippingRate(r: ShippingRate) {
  const list = state.shippingRates.slice();
  const idx = list.findIndex((x) => x.wilayaCode === r.wilayaCode);
  if (idx >= 0) list[idx] = r; else list.push(r);
  set("shippingRates", list);
}
export function deleteShippingRate(wilayaCode: string) {
  if (wilayaCode === "*") return; // default rate cannot be removed
  set("shippingRates", state.shippingRates.filter((r) => r.wilayaCode !== wilayaCode));
}
export function updateShippingSettings(patch: Partial<ShippingSettings>) {
  set("shippingSettings", { ...state.shippingSettings, ...patch });
}

export function computeShipping(wilayaCode: string, kind: "home" | "desk", subtotal: number): number {
  const s = state.shippingSettings;
  if (s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold) return 0;
  const rate = state.shippingRates.find((r) => r.wilayaCode === wilayaCode)
    ?? state.shippingRates.find((r) => r.wilayaCode === "*");
  if (!rate) return 0;
  return kind === "home" ? rate.home : rate.desk;
}

// Payments
export function upsertPaymentMethod(m: PaymentMethod) {
  const list = state.paymentMethods.slice();
  const idx = list.findIndex((x) => x.id === m.id);
  if (idx >= 0) list[idx] = m; else list.push(m);
  set("paymentMethods", list);
}
export function deletePaymentMethod(id: string) {
  set("paymentMethods", state.paymentMethods.filter((m) => m.id !== id));
}

// Stock
export function adjustStock(productId: string, delta: number, reason: string) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const mov: StockMovement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    productId,
    productName: p.name,
    delta,
    reason,
    createdAt: new Date().toISOString(),
  };
  const currentQty = p.stockQty ?? defaultQtyForLabel(p.stock);
  const nextQty = Math.max(0, currentQty + delta);
  const nextLevel = resolveStockLevel(nextQty, state.siteSettings);
  const products = state.products.map((x) => x.id === productId ? { ...x, stockQty: nextQty, stock: nextLevel } : x);
  state = { ...state, stockMovements: [mov, ...state.stockMovements], products };
  emit();
  logAudit(`produit ${p.name}`, "stock.adjust", `${delta > 0 ? "+" : ""}${delta} — ${reason} (→ ${nextQty})`);
}
export function setProductStockLevel(productId: string, level: Product["stock"]) {
  set("products", state.products.map((p) => p.id === productId ? { ...p, stock: level } : p));
}
export function setProductStockQty(productId: string, qty: number, reason = "Ajustement manuel") {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const currentQty = p.stockQty ?? defaultQtyForLabel(p.stock);
  const delta = qty - currentQty;
  if (delta === 0) return;
  adjustStock(productId, delta, reason);
}


// Media
export function upsertMediaAsset(m: MediaAsset) {
  const list = state.mediaAssets.slice();
  const idx = list.findIndex((x) => x.id === m.id);
  if (idx >= 0) list[idx] = m; else list.unshift(m);
  set("mediaAssets", list);
  logAudit("média", m.id === list[idx]?.id ? "media.update" : "media.upload", m.name);
}
export function deleteMediaAsset(id: string) {
  const m = state.mediaAssets.find((x) => x.id === id);
  set("mediaAssets", state.mediaAssets.filter((x) => x.id !== id));
  if (m) logAudit("média", "media.delete", m.name);
}
export function renameMediaAsset(id: string, name: string, tag?: string) {
  set("mediaAssets", state.mediaAssets.map((x) => x.id === id ? { ...x, name, tag } : x));
}

// Notifications
export function addNotification(n: Omit<AdminNotification, "id" | "createdAt" | "read"> & { read?: boolean }) {
  const notif: AdminNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    read: n.read ?? false,
    title: n.title, body: n.body, level: n.level, link: n.link,
  };
  set("notifications", [notif, ...state.notifications]);
}
export function updateNotification(id: string, patch: Partial<AdminNotification>) {
  set("notifications", state.notifications.map((n) => n.id === id ? { ...n, ...patch } : n));
}
export function deleteNotification(id: string) {
  set("notifications", state.notifications.filter((n) => n.id !== id));
}
export function markAllNotificationsRead() {
  set("notifications", state.notifications.map((n) => ({ ...n, read: true })));
}

// Audit
export function logAudit(entity: string, action: string, detail?: string, actor?: string) {
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actor: actor ?? getActiveActor(),
    action,
    entity,
    detail,
    createdAt: new Date().toISOString(),
  };
  state = { ...state, auditLogs: [log, ...state.auditLogs].slice(0, 500) };
  emit();
}

// ---------- Active admin role (demo) ----------
const ROLE_KEY = "katech.admin.activeRole.v1";
export function getActiveRole(): AdminUserRole {
  if (typeof window === "undefined") return "owner";
  const v = window.localStorage.getItem(ROLE_KEY) as AdminUserRole | null;
  return v ?? "owner";
}
export function setActiveRole(role: AdminUserRole) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_KEY, role);
  window.dispatchEvent(new Event("katech:role-changed"));
}
export function getActiveActor(): string {
  const role = getActiveRole();
  const u = state.users.find((x) => x.role === role) ?? state.users[0];
  return u?.email ?? "système";
}
const ROLE_RANK: Record<AdminUserRole, number> = { owner: 4, admin: 3, editor: 2, viewer: 1 };
export function canPerform(min: AdminUserRole, role: AdminUserRole = getActiveRole()): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}


// ---------- Reset ----------
export type ResetKey = ArrayKey | "siteSettings" | "shippingSettings" | "all";
export function resetData(key: ResetKey) {
  const seed = seedAll();
  if (key === "all") {
    state = seed;
  } else {
    state = { ...state, [key]: seed[key] } as AdminState;
  }
  emit();
}
export function clearData(key: ArrayKey | "siteSettings" | "shippingSettings") {
  if (key === "siteSettings") {
    state = { ...state, siteSettings: emptySiteSettings() };
  } else if (key === "shippingSettings") {
    state = { ...state, shippingSettings: emptyShippingSettings() };
  } else {
    state = { ...state, [key]: [] } as AdminState;
  }
  emit();
}

// ---------- Export / Import ----------
export function exportState(): string {
  return JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importState(json: string): { ok: true; counts: Record<string, number> } | { ok: false; error: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { ok: false, error: "JSON invalide" }; }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "Format inattendu" };
  const raw = (parsed as { state?: unknown }).state ?? parsed;
  const obj = raw as Partial<AdminState>;
  for (const k of ARRAY_KEYS) {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) return { ok: false, error: `Champ « ${k} » invalide (tableau attendu)` };
  }
  if (obj.siteSettings !== undefined && (typeof obj.siteSettings !== "object" || Array.isArray(obj.siteSettings))) {
    return { ok: false, error: "Champ « siteSettings » invalide (objet attendu)" };
  }
  const seed = seedAll();
  const next: AdminState = {
    products: obj.products ?? seed.products,
    categories: obj.categories ?? seed.categories,
    brands: obj.brands ?? seed.brands,
    orders: obj.orders ?? seed.orders,
    customers: obj.customers ?? seed.customers,
    coupons: obj.coupons ?? seed.coupons,
    reviews: obj.reviews ?? seed.reviews,
    users: obj.users ?? seed.users,
    blogPosts: obj.blogPosts ?? seed.blogPosts,
    homeReviews: obj.homeReviews ?? seed.homeReviews,
    tickerMessages: obj.tickerMessages ?? seed.tickerMessages,
    marqueeBrands: obj.marqueeBrands ?? seed.marqueeBrands,
    aboutValues: obj.aboutValues ?? seed.aboutValues,
    builderSteps: obj.builderSteps ?? seed.builderSteps,
    shippingRates: obj.shippingRates ?? seed.shippingRates,
    paymentMethods: obj.paymentMethods ?? seed.paymentMethods,
    stockMovements: obj.stockMovements ?? seed.stockMovements,
    mediaAssets: obj.mediaAssets ?? seed.mediaAssets,
    notifications: obj.notifications ?? seed.notifications,
    auditLogs: obj.auditLogs ?? seed.auditLogs,
    siteSettings: { ...seed.siteSettings, ...(obj.siteSettings ?? {}) },
    shippingSettings: { ...seed.shippingSettings, ...(obj.shippingSettings ?? {}) },
  };
  state = next;
  emit();
  const counts: Record<string, number> = {};
  for (const k of ARRAY_KEYS) counts[k] = (next[k] as unknown[]).length;
  counts.siteSettings = 1;
  counts.shippingSettings = 1;
  return { ok: true, counts };
}

export { CAT_LABELS };
