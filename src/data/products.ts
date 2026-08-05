import type { Localized } from "@/lib/i18n";

import rog from "@/assets/p-rog.webp";
import pavilion from "@/assets/p-pavilion.webp";
import thinkpad from "@/assets/p-thinkpad.webp";
import macbook from "@/assets/p-macbook.webp";
import optiplex from "@/assets/p-optiplex.webp";
import omen from "@/assets/p-omen.webp";
import buildMid from "@/assets/p-build-mid.webp";
import buildPro from "@/assets/p-build-pro.webp";
import galaxy from "@/assets/p-galaxy.webp";
import iphone from "@/assets/p-iphone.webp";
import xiaomi from "@/assets/p-xiaomi.webp";
import redmi from "@/assets/p-redmi.webp";

export type Category = "laptops" | "desktops" | "builds" | "phones";
export type UseTag = "gaming" | "work" | "study" | "edit" | "home";
export type SpecKey =
  | "cpu"
  | "ram"
  | "storage"
  | "gpu"
  | "screen"
  | "os"
  | "battery"
  | "weight"
  | "form"
  | "motherboard"
  | "psu"
  | "camera";

/**
 * Champs textuels du produit exprimés en `Localized<string>` (phase 3).
 *
 * `Localized<T> = T | { fr: T; en?: T; ar?: T }` **inclut le type nu** : les
 * douze produits seed ci-dessous restent donc valides sans une seule
 * modification, et un champ resté en chaîne simple est traité comme du
 * français avec repli automatique. C'est la migration douce de la skill S11 —
 * on élargit le type, on ne casse aucune donnée existante.
 *
 * Côté rendu, ne jamais interpoler ces champs directement : ce sont
 * potentiellement des objets. Passer par `useLocalize()` dans un composant ou
 * par `localize(v, lang)` hors composant — recette complète dans
 * `docs/LOCALIZED-DATA.md`.
 *
 * Règle de discernement appliquée en vague 3.3 :
 *   - Les noms commerciaux et marques (« ASUS ROG Strix G16 », « MacBook Air M3 »)
 *     sont invariants dans les trois langues — chaîne nue conservée.
 *   - Les références techniques pures (« Intel Core i9-13980HX », « 32GB DDR5 »,
 *     « NVIDIA RTX 4070 8GB », « 1TB NVMe SSD », « 90Wh », etc.) ne se
 *     traduisent pas — chaîne nue conservée.
 *   - Seul du langage naturel justifie un objet `{ fr, en, ar }` : les noms
 *     de builds contenant des mots descriptifs français, et les valeurs de
 *     batterie rédigées en prose française (« Jusqu'à N heures »).
 */
export type Product = {
  /** Identifiant technique — jamais localisé, jamais traduit, sert de clé. */
  id: string;
  name: Localized<string>;
  /** Marque commerciale : nom propre, identique dans les trois langues. */
  brand: string;
  category: Category;
  use: UseTag[];
  specLine: Localized<string>;
  /**
   * Les **clés** restent techniques (`SpecKey`, traduites par `t()` via le
   * dictionnaire), seules les **valeurs** sont localisées.
   */
  specs: Partial<Record<SpecKey, Localized<string>>>;
  price: number;
  oldPrice?: number;
  stock: "in" | "low" | "out";
  stockQty?: number; // quantité numérique optionnelle (dérive `stock` selon seuils)
  image: string;
  bestSeller?: boolean;
  sale?: boolean;
  /**
   * Configuration assemblée par un visiteur dans /builder, matérialisée en
   * `Product` uniquement pour que le panier et le paiement puissent la
   * résoudre par identifiant. Ce n'est PAS un article du catalogue : elle doit
   * rester hors de toutes les surfaces publiques de listing (catégorie,
   * recherche, accueil). Champ optionnel et additif — un produit sans ce
   * marqueur est un produit de catalogue ordinaire.
   */
  customBuild?: boolean;
};

/** Vrai pour une configuration client, jamais catalogable. */
export const isCustomBuild = (p: Product): boolean => p.customBuild === true;

/**
 * Restreint une liste aux produits réellement vendus en boutique.
 * À appliquer sur toute surface publique qui *liste* des produits ; la
 * résolution par identifiant (fiche produit, panier, paiement) doit au
 * contraire continuer de voir la liste complète.
 */
export const catalogProducts = (list: Product[]): Product[] =>
  list.filter((p) => !isCustomBuild(p));

// Compatibilité avec l'appel `tr(value, lang)` de la version originale.
export const tr = (v: string | undefined): string => v ?? "";

export const products: Product[] = [
  // ── Lot 1 : produits 1-4 ─────────────────────────────────────────────────
  // ASUS ROG Strix G16 : nom commercial + références techniques pures → chaînes nues.
  {
    id: "rog-strix-g16",
    name: "ASUS ROG Strix G16",
    brand: "ASUS",
    category: "laptops",
    use: ["gaming", "edit"],
    specLine: "Intel i9 · RTX 4070 · 32GB · 1TB",
    specs: {
      cpu: "Intel Core i9-13980HX",
      ram: "32GB DDR5",
      storage: "1TB NVMe SSD",
      gpu: "NVIDIA RTX 4070 8GB",
      screen: '16" QHD+ 240Hz',
      os: "Windows 11 Pro",
      battery: "90Wh",
      weight: "2.5 kg",
    },
    price: 289000,
    oldPrice: 319000,
    stock: "in",
    image: rog,
    bestSeller: true,
    sale: true,
  },
  // HP Pavilion 15 : nom commercial + références techniques pures → chaînes nues.
  {
    id: "hp-pavilion-15",
    name: "HP Pavilion 15",
    brand: "HP",
    category: "laptops",
    use: ["study", "home"],
    specLine: "Intel i5 · 8GB · 512GB SSD",
    specs: {
      cpu: "Intel Core i5-1335U",
      ram: "8GB DDR4",
      storage: "512GB NVMe SSD",
      gpu: "Intel Iris Xe",
      screen: '15.6" FHD IPS',
      os: "Windows 11",
      battery: "41Wh",
      weight: "1.75 kg",
    },
    price: 89000,
    stock: "in",
    image: pavilion,
    bestSeller: true,
  },
  // Lenovo ThinkPad X1 Carbon : nom commercial + références pures → chaînes nues.
  {
    id: "thinkpad-x1-carbon",
    name: "Lenovo ThinkPad X1 Carbon",
    brand: "Lenovo",
    category: "laptops",
    use: ["work"],
    specLine: "Intel i7 · 16GB · 1TB SSD",
    specs: {
      cpu: "Intel Core i7-1365U vPro",
      ram: "16GB LPDDR5",
      storage: "1TB NVMe SSD",
      gpu: "Intel Iris Xe",
      screen: '14" 2.8K OLED',
      os: "Windows 11 Pro",
      battery: "57Wh",
      weight: "1.12 kg",
    },
    price: 195000,
    stock: "low",
    image: thinkpad,
    bestSeller: true,
  },
  // MacBook Air M3 : nom commercial → chaîne nue.
  // battery « Jusqu'à 18 heures » : prose française → objet Localized.
  // screen « 13.6" Liquid Retina » : nom de technologie Apple → chaîne nue.
  // ram « 16GB Unified » : référence technique → chaîne nue.
  {
    id: "macbook-air-m3",
    name: "MacBook Air M3",
    brand: "Apple",
    category: "laptops",
    use: ["work", "study", "edit"],
    specLine: "Apple M3 · 16GB · 512GB",
    specs: {
      cpu: "Apple M3 (8-core)",
      ram: "16GB Unified",
      storage: "512GB SSD",
      gpu: "10-core GPU",
      screen: '13.6" Liquid Retina',
      os: "macOS Sonoma",
      battery: {
        fr: "Jusqu'à 18 heures",
        en: "Up to 18 hours",
        ar: "حتى 18 ساعة",
      },
      weight: "1.24 kg",
    },
    price: 245000,
    oldPrice: 265000,
    stock: "in",
    image: macbook,
    bestSeller: true,
    sale: true,
  },
  // ── Lot 2 : produits 5-8 ─────────────────────────────────────────────────
  // Dell OptiPlex 5000 : nom commercial + références pures → chaînes nues.
  // form « Mini Tower » : terminologie informatique universelle → chaîne nue.
  {
    id: "dell-optiplex-5000",
    name: "Dell OptiPlex 5000",
    brand: "Dell",
    category: "desktops",
    use: ["work", "home"],
    specLine: "Core i5 · 8GB · 256GB SSD",
    specs: {
      cpu: "Intel Core i5-12500",
      ram: "8GB DDR4",
      storage: "256GB NVMe SSD",
      gpu: "Intel UHD 770",
      form: "Mini Tower",
      os: "Windows 11 Pro",
    },
    price: 75000,
    stock: "in",
    image: optiplex,
    bestSeller: true,
  },
  // HP Omen 45L : nom commercial + références pures → chaînes nues.
  // form « Full Tower » : terminologie informatique universelle → chaîne nue.
  {
    id: "hp-omen-45l",
    name: "HP Omen 45L",
    brand: "HP",
    category: "desktops",
    use: ["gaming", "edit"],
    specLine: "Ryzen 9 · RTX 4080 · 32GB",
    specs: {
      cpu: "AMD Ryzen 9 7900X",
      ram: "32GB DDR5",
      storage: "1TB SSD + 2TB HDD",
      gpu: "NVIDIA RTX 4080 16GB",
      form: "Full Tower",
      os: "Windows 11",
    },
    price: 420000,
    oldPrice: 460000,
    stock: "low",
    image: omen,
    sale: true,
  },
  // Configuration Gaming Mid-Range : nom contenant des mots descriptifs français
  // (« Configuration », « Gaming », « Mid-Range ») → objet Localized.
  // specLine : références techniques pures → chaîne nue.
  // specs : toutes références pures → chaînes nues.
  {
    id: "build-mid-gaming",
    name: {
      fr: "Configuration Gaming Mid-Range",
      en: "Mid-Range Gaming Build",
      ar: "تجميعة ألعاب متوسطة المستوى",
    },
    brand: "KA Build",
    category: "builds",
    use: ["gaming"],
    specLine: "Ryzen 5 · RX 6600 · 16GB · 500GB",
    specs: {
      cpu: "AMD Ryzen 5 5600",
      ram: "16GB DDR4 3200",
      storage: "500GB NVMe SSD",
      gpu: "AMD RX 6600 8GB",
      motherboard: "B550M",
      psu: "650W 80+ Bronze",
    },
    price: 120000,
    stock: "in",
    image: buildMid,
    bestSeller: true,
  },
  // Configuration Montage Pro : nom contenant des mots descriptifs français
  // (« Configuration », « Montage », « Pro ») → objet Localized.
  // specLine : références techniques pures → chaîne nue.
  // specs : toutes références pures → chaînes nues.
  {
    id: "build-pro-editing",
    name: {
      fr: "Configuration Montage Pro",
      en: "Pro Editing Build",
      ar: "تجميعة مونتاج احترافية",
    },
    brand: "KA Build",
    category: "builds",
    use: ["edit", "work"],
    specLine: "Ryzen 9 · RTX 4070 Ti · 64GB · 2TB",
    specs: {
      cpu: "AMD Ryzen 9 7950X",
      ram: "64GB DDR5 6000",
      storage: "2TB NVMe Gen4",
      gpu: "NVIDIA RTX 4070 Ti 12GB",
      motherboard: "X670E",
      psu: "850W 80+ Gold",
    },
    price: 380000,
    stock: "in",
    image: buildPro,
  },
  // ── Lot 3 : produits 9-12 ────────────────────────────────────────────────
  // Samsung Galaxy S25 Ultra : nom commercial + références pures → chaînes nues.
  {
    id: "galaxy-s25-ultra",
    name: "Samsung Galaxy S25 Ultra",
    brand: "Samsung",
    category: "phones",
    use: ["work", "edit"],
    specLine: "12GB · 256GB · 200MP",
    specs: {
      cpu: "Snapdragon 8 Gen 4",
      ram: "12GB",
      storage: "256GB",
      screen: '6.9" Dynamic AMOLED 2X',
      camera: "200MP + 50MP + 12MP",
      battery: "5000 mAh",
      os: "Android 15 / One UI 7",
    },
    price: 135000,
    oldPrice: 145000,
    stock: "in",
    image: galaxy,
    bestSeller: true,
    sale: true,
  },
  // iPhone 16 Pro Max : nom commercial → chaîne nue.
  // battery « Jusqu'à 33h de vidéo » : prose française → objet Localized.
  // screen « 6.9" Super Retina XDR » : nom de technologie Apple → chaîne nue.
  {
    id: "iphone-16-pro-max",
    name: "iPhone 16 Pro Max",
    brand: "Apple",
    category: "phones",
    use: ["work", "edit"],
    specLine: "256GB · A18 Pro · Titanium",
    specs: {
      cpu: "Apple A18 Pro",
      ram: "8GB",
      storage: "256GB",
      screen: '6.9" Super Retina XDR',
      camera: "48MP + 48MP UW + 12MP",
      battery: {
        fr: "Jusqu'à 33h de vidéo",
        en: "Up to 33h video playback",
        ar: "حتى 33 ساعة تشغيل فيديو",
      },
      os: "iOS 18",
    },
    price: 175000,
    stock: "low",
    image: iphone,
    bestSeller: true,
  },
  // Xiaomi 14T Pro : nom commercial + références pures → chaînes nues.
  {
    id: "xiaomi-14t-pro",
    name: "Xiaomi 14T Pro",
    brand: "Xiaomi",
    category: "phones",
    use: ["work", "home"],
    specLine: "12GB · 512GB · Leica",
    specs: {
      cpu: "MediaTek Dimensity 9300+",
      ram: "12GB",
      storage: "512GB",
      screen: '6.67" CrystalRes AMOLED',
      camera: "Leica 50MP + 50MP + 12MP",
      battery: "5000 mAh + 120W",
      os: "Android 14 / HyperOS",
    },
    price: 85000,
    stock: "in",
    image: xiaomi,
  },
  // Redmi Note 13 Pro : nom commercial + références pures → chaînes nues.
  {
    id: "redmi-note-13-pro",
    name: "Redmi Note 13 Pro",
    brand: "Xiaomi",
    category: "phones",
    use: ["study", "home"],
    specLine: "8GB · 256GB · 200MP",
    specs: {
      cpu: "Snapdragon 7s Gen 2",
      ram: "8GB",
      storage: "256GB",
      screen: '6.67" AMOLED 120Hz',
      camera: "200MP + 8MP + 2MP",
      battery: "5100 mAh + 67W",
      os: "Android 13 / MIUI 14",
    },
    price: 38000,
    oldPrice: 45000,
    stock: "in",
    image: redmi,
    sale: true,
  },
];

// --- Currency formatter (paramétrable depuis /admin/settings) ---
export type CurrencyConfig = {
  symbol: string;
  position: "prefix" | "suffix";
  thousandSeparator: " " | "," | "." | "'" | "";
};

const _currency: CurrencyConfig = {
  symbol: "DA",
  position: "suffix",
  thousandSeparator: " ",
};

export function setCurrencyConfig(cfg: Partial<CurrencyConfig>) {
  Object.assign(_currency, cfg);
}

export function getCurrencyConfig(): CurrencyConfig {
  return { ..._currency };
}

export const formatDZD = (n: number) => {
  const abs = Math.round(Math.abs(n));
  const raw = String(abs);
  const sep = _currency.thousandSeparator;
  const grouped = sep ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : raw;
  const signed = (n < 0 ? "-" : "") + grouped;
  const body =
    _currency.position === "prefix"
      ? `${_currency.symbol} ${signed}`
      : `${signed} ${_currency.symbol}`;
  // Isole le prix du contexte bidi (évite l'inversion visuelle en RTL/arabe).
  return `⁦${body}⁩`;
};

export const categoryMeta: Record<
  Category,
  {
    slug: Category;
    labelKey: "nav.laptops" | "nav.desktops" | "nav.builds" | "nav.phones";
    descKey: "cat.laptops.desc" | "cat.desktops.desc" | "cat.builds.desc" | "cat.phones.desc";
  }
> = {
  laptops: { slug: "laptops", labelKey: "nav.laptops", descKey: "cat.laptops.desc" },
  desktops: { slug: "desktops", labelKey: "nav.desktops", descKey: "cat.desktops.desc" },
  builds: { slug: "builds", labelKey: "nav.builds", descKey: "cat.builds.desc" },
  phones: { slug: "phones", labelKey: "nav.phones", descKey: "cat.phones.desc" },
};
