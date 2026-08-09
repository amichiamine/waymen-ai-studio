/**
 * DTO partagés entre le frontend et le futur backend.
 * Ces types réutilisent les modèles déjà présents côté client pour garantir
 * que le câblage backend ne casse aucune vue.
 */
import type { Product, Category } from "@/data/products";
import type {
  AdminBrand,
  AdminCategory,
  AdminUser,
  AdminUserRole,
  BlogPost,
  ContactMessage,
  Coupon,
  Customer,
  HomeReview,
  MediaAsset,
  Order,
  OrderStatus,
  PaymentMethod,
  Review,
  ReviewStatus,
  ShippingRate,
  ShippingSettings,
  SiteContent,
  SiteSettings,
  StockMovement,
  Subscriber,
} from "@/lib/admin-store";

export type {
  Product,
  Category,
  AdminBrand,
  AdminCategory,
  AdminUser,
  AdminUserRole,
  BlogPost,
  ContactMessage,
  Coupon,
  Customer,
  HomeReview,
  MediaAsset,
  Order,
  OrderStatus,
  PaymentMethod,
  Review,
  ReviewStatus,
  ShippingRate,
  ShippingSettings,
  SiteContent,
  SiteSettings,
  StockMovement,
  Subscriber,
};

/** Enveloppe standard de réponse (succès). */
export type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown> };

/** Enveloppe standard d'erreur renvoyée par le backend. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    /** Erreurs de validation champ par champ (format Zod flatten). */
    fields?: Record<string, string[]>;
  };
};

/** Pagination cursorless (offset) — simple et suffisante pour l'admin. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
};

export type ListQuery = {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type ProductQuery = ListQuery & {
  category?: Category;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  stock?: "in" | "low" | "out";
  use?: string;
  bestSeller?: boolean;
  sale?: boolean;
};

export type OrderQuery = ListQuery & {
  status?: OrderStatus;
  from?: string;
  to?: string;
};

export type CreateOrderInput = {
  items: { productId: string; qty: number }[];
  customer: { name: string; phone: string; email?: string };
  shipping: {
    wilayaCode: string;
    commune?: string;
    address?: string;
    method: "home" | "desk";
  };
  couponCode?: string;
  paymentMethodId?: string;
  note?: string;
};

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    role: AdminUserRole | "customer";
  };
  /** Présent uniquement en stratégie bearer. */
  accessToken?: string;
  expiresAt?: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
};

export type SignInInput = { email: string; password: string };

export type CouponCheckResult =
  | { valid: true; code: string; discount: number; type: "percent" | "fixed" }
  | { valid: false; reason: string };

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  averageBasket: number;
  lowStock: number;
  pendingReviews: number;
  series: { date: string; revenue: number; orders: number }[];
};

// ── Notion ────────────────────────────────────────────────────────────────────

/**
 * État de l'intégration Notion — réponse de GET /notion/status.
 *
 * Champs extraits de Configuration::etat() dans ControleurNotion.php.
 * Le jeton n'apparaît jamais ici, ni en clair, ni tronqué (NOTION.md §5).
 */
export type NotionEtat = {
  /** Un jeton est enregistré et déchiffrable. */
  configure: boolean;
  /** Le jeton est configuré ET la base est créée/rattachée. */
  relie: boolean;
  /** Interrupteur marche/arrêt. */
  actif: boolean;
  /** Nom de l'espace de travail Notion (null si non configuré). */
  espace: string | null;
  /** Titre de la base Notion des commandes (null si non créée). */
  baseTitre: string | null;
  /** URL directe vers la base dans Notion (null si non disponible). */
  baseUrl: string | null;
  /** Identifiant de la base Notion (null si non créée). */
  databaseId: string | null;
  /** Identifiant de la data source (null si non créée). */
  dataSourceId: string | null;
  /** ISO 8601 — date de la dernière vérification du jeton (null si jamais vérifiée). */
  derniereVerification: string | null;
  /** Dernier message d'erreur connu (null si aucun). */
  derniereErreur: string | null;
  /** Nombre de commandes en attente de poussée vers Notion. */
  enAttente: number;
  /**
   * Jeton de vérification webhook — renvoyé uniquement au rang `owner`.
   * Valeur reçue lors de la poignée de main initiale de Notion
   * (`{"verification_token":"…"}`), à recopier une fois dans le portail
   * Notion pour confirmer l'abonnement. `null` si aucune poignée de main
   * n'a encore eu lieu.
   *
   * NE PAS stocker dans localStorage. NE PAS afficher dans un journal.
   */
  jetonVerification: string | null;
  /**
   * Avertissement optionnel : colonnes manquantes lors d'un rattachement
   * (`POST /notion/base` avec `databaseId`).
   */
  avertissement?: string;
  /**
   * Info optionnel : base déjà enregistrée, demande idempotente.
   */
  info?: string;
};

/** Une page Notion accessible via la connexion. */
export type NotionPage = {
  id: string;
  titre: string;
  url: string;
};

/**
 * Réponse de GET /notion/pages.
 * `message` est présent uniquement quand la liste est vide — c'est le guide
 * que le serveur fournit pour aider le commerçant à partager une page.
 */
export type NotionPages = {
  pages: NotionPage[];
  message?: string;
};

/** Résultat de POST /notion/renvoyer. */
export type NotionRenvoiResultat = {
  traitees: number;
  echecs: number;
  reste: boolean;
  messages: string[];
};
