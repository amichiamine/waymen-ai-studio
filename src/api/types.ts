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
