import { useSyncExternalStore } from "react";
import { products as seedProducts, categoryMeta, type Product, type Category } from "@/data/products";

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
export type OrderItem = { productId: string; name: string; price: number; qty: number; image?: string };
export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  paymentMethod: "cod" | "card" | "bank";
  wilaya: string;
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

export type AdminState = {
  products: Product[];
  categories: AdminCategory[];
  brands: AdminBrand[];
  orders: Order[];
  customers: Customer[];
  coupons: Coupon[];
  reviews: Review[];
  users: AdminUser[];
};

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

const WILAYAS = ["Alger", "Oran", "Constantine", "Annaba", "Sétif", "Blida", "Batna", "Tlemcen", "Béjaïa", "Tizi Ouzou"];
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
      wilaya: pick(WILAYAS, i),
      createdAt: created,
      ordersCount: 0,
      totalSpent: 0,
    });
  }
  return list;
}

const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
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
    orders.push({
      id: `KA${(24001 + i).toString()}`,
      customerId: cust.id,
      customerName: cust.name,
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      status,
      paymentMethod: i % 3 === 0 ? "card" : i % 3 === 1 ? "cod" : "bank",
      wilaya: cust.wilaya,
      address: `Rue ${100 + i}, ${cust.wilaya}`,
      phone: cust.phone,
      createdAt: new Date(Date.now() - i * 43200000).toISOString(),
      note: i % 5 === 0 ? "Livraison rapide demandée" : undefined,
    });
  }
  // aggregate stats
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

function seedAll(): AdminState {
  const customers = seedCustomers();
  const orders = seedOrders(customers);
  return {
    products: seedProducts.map((p) => ({ ...p, specs: { ...p.specs } })),
    categories: seedCategories(),
    brands: seedBrands(),
    orders,
    customers,
    coupons: seedCoupons(),
    reviews: seedReviews(),
    users: seedUsers(),
  };
}

// ---------- Store (localStorage + subscribers) ----------
const LS_KEY = "katech.admin.state.v1";

function loadState(): AdminState {
  if (typeof window === "undefined") return seedAll();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return seedAll();
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    const seed = seedAll();
    // Ensure product images are the imported URLs — restore from seed if missing.
    const products = (parsed.products ?? seed.products).map((p) => {
      const src = seed.products.find((sp) => sp.id === p.id);
      return src ? { ...p, image: p.image?.startsWith("/") || p.image?.startsWith("http") || p.image?.startsWith("data:") ? p.image : src.image } : p;
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
export function updateOrderStatus(id: string, status: OrderStatus) {
  set("orders", state.orders.map((o) => o.id === id ? { ...o, status } : o));
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

// Reviews
export function updateReviewStatus(id: string, status: ReviewStatus) {
  set("reviews", state.reviews.map((r) => r.id === id ? { ...r, status } : r));
}
export function deleteReview(id: string) {
  set("reviews", state.reviews.filter((r) => r.id !== id));
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

// ---------- Reset ----------
export type ResetKey = keyof AdminState | "all";
export function resetData(key: ResetKey) {
  const seed = seedAll();
  if (key === "all") {
    state = seed;
  } else {
    state = { ...state, [key]: seed[key] };
  }
  emit();
}
export function clearData(key: keyof AdminState) {
  const empty: AdminState = { ...state, [key]: [] as unknown as AdminState[typeof key] };
  state = empty;
  emit();
}

// ---------- Export / Import JSON ----------
export function exportState(): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importState(json: string): { ok: true; counts: Record<keyof AdminState, number> } | { ok: false; error: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { ok: false, error: "JSON invalide" }; }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "Format inattendu" };
  const raw = (parsed as { state?: unknown }).state ?? parsed;
  const keys: (keyof AdminState)[] = ["products", "categories", "brands", "orders", "customers", "coupons", "reviews", "users"];
  const obj = raw as Partial<AdminState>;
  for (const k of keys) {
    if (obj[k] !== undefined && !Array.isArray(obj[k])) return { ok: false, error: `Champ « ${k} » invalide (tableau attendu)` };
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
  };
  state = next;
  emit();
  const counts = {
    products: next.products.length, categories: next.categories.length, brands: next.brands.length,
    orders: next.orders.length, customers: next.customers.length, coupons: next.coupons.length,
    reviews: next.reviews.length, users: next.users.length,
  } as Record<keyof AdminState, number>;
  return { ok: true, counts };
}

export { CAT_LABELS };

