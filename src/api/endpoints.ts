/**
 * Table centrale des endpoints REST.
 * Un seul endroit à modifier si le backend change de nommage.
 */
export const endpoints = {
  auth: {
    signUp: () => `/auth/register`,
    signIn: () => `/auth/login`,
    signOut: () => `/auth/logout`,
    me: () => `/auth/me`,
    refresh: () => `/auth/refresh`,
    forgotPassword: () => `/auth/forgot-password`,
    resetPassword: () => `/auth/reset-password`,
    changePassword: () => `/auth/change-password`,
    profile: () => `/auth/profile`,
  },

  products: {
    list: () => `/products`,
    detail: (id: string) => `/products/${id}`,
    create: () => `/products`,
    update: (id: string) => `/products/${id}`,
    remove: (id: string) => `/products/${id}`,
    stock: (id: string) => `/products/${id}/stock`,
  },

  /**
   * Configurateur PC. Une seule écriture, ouverte au client CONNECTÉ : le corps
   * ne porte que les pièces choisies (`{ picks }`) et le serveur recalcule le
   * prix. Volontairement distinct de `products.create`, gardé par la permission
   * `create` (rôle `editor`), qui répondait 403 au visiteur du configurateur.
   */
  builds: {
    create: () => `/builds`,
  },

  categories: {
    list: () => `/categories`,
    detail: (slug: string) => `/categories/${slug}`,
    create: () => `/categories`,
    update: (slug: string) => `/categories/${slug}`,
    remove: (slug: string) => `/categories/${slug}`,
  },

  brands: {
    list: () => `/brands`,
    detail: (id: string) => `/brands/${id}`,
    create: () => `/brands`,
    update: (id: string) => `/brands/${id}`,
    remove: (id: string) => `/brands/${id}`,
  },

  orders: {
    list: () => `/orders`,
    detail: (id: string) => `/orders/${id}`,
    create: () => `/orders`,
    updateStatus: (id: string) => `/orders/${id}/status`,
    remove: (id: string) => `/orders/${id}`,
    mine: () => `/me/orders`,
    track: () => `/orders/track`,
  },

  customers: {
    list: () => `/customers`,
    detail: (id: string) => `/customers/${id}`,
  },

  coupons: {
    list: () => `/coupons`,
    detail: (code: string) => `/coupons/${code}`,
    create: () => `/coupons`,
    update: (code: string) => `/coupons/${code}`,
    remove: (code: string) => `/coupons/${code}`,
    validate: () => `/coupons/validate`,
  },

  reviews: {
    list: () => `/reviews`,
    byProduct: (productId: string) => `/products/${productId}/reviews`,
    create: (productId: string) => `/products/${productId}/reviews`,
    moderate: (id: string) => `/reviews/${id}/status`,
    remove: (id: string) => `/reviews/${id}`,
  },

  blog: {
    list: () => `/blog`,
    detail: (slug: string) => `/blog/${slug}`,
    create: () => `/blog`,
    update: (slug: string) => `/blog/${slug}`,
    remove: (slug: string) => `/blog/${slug}`,
  },

  content: {
    get: () => `/content`,
    update: () => `/content`,
    homeReviews: () => `/content/home-reviews`,
    resetSection: (section: string) => `/content/${section}/reset`,
  },

  settings: {
    site: () => `/settings/site`,
    shipping: () => `/settings/shipping`,
    shippingRates: () => `/settings/shipping/rates`,
    shippingRateUpsert: (wilayaCode: string) => `/settings/shipping/rates/${wilayaCode}`,
    shippingRateRemove: (wilayaCode: string) => `/settings/shipping/rates/${wilayaCode}`,
    payments: () => `/settings/payments`,
    paymentMethodUpsert: (id: string) => `/settings/payments/${id}`,
    paymentMethodRemove: (id: string) => `/settings/payments/${id}`,
  },

  inventory: {
    movements: () => `/inventory/movements`,
    adjust: (productId: string) => `/inventory/${productId}/adjust`,
  },

  media: {
    list: () => `/media`,
    upload: () => `/media`,
    remove: (id: string) => `/media/${id}`,
  },

  crm: {
    messages: () => `/messages`,
    message: (id: string) => `/messages/${id}`,
    subscribers: () => `/subscribers`,
    subscriber: (id: string) => `/subscribers/${id}`,
  },

  users: {
    list: () => `/admin/users`,
    create: () => `/admin/users`,
    update: (id: string) => `/admin/users/${id}`,
    remove: (id: string) => `/admin/users/${id}`,
    setPassword: (id: string) => `/admin/users/${id}/password`,
  },

  analytics: {
    dashboard: () => `/analytics/dashboard`,
    reports: () => `/analytics/reports`,
    audit: () => `/analytics/audit`,
  },

  /**
   * Intégration Notion — miroir des commandes.
   * Toutes ces routes sont réservées au rang `owner`, sauf `webhook` (public).
   * Contrat complet : docs/NOTION.md §7.
   */
  notion: {
    status: () => `/notion/status`,
    token: () => `/notion/token`,
    pages: () => `/notion/pages`,
    base: () => `/notion/base`,
    parametres: () => `/notion/parametres`,
    renvoyer: () => `/notion/renvoyer`,
  },

  notifications: {
    list: () => `/notifications`,
    detail: (id: string) => `/notifications/${id}`,
    create: () => `/notifications`,
    update: (id: string) => `/notifications/${id}`,
    remove: (id: string) => `/notifications/${id}`,
  },

  /**
   * Maintenance — réservé au rang `owner`.
   * Ces routes permettent au propriétaire de consulter et gérer sa base
   * sans accès SSH.
   */
  maintenance: {
    status: () => `/maintenance/status`,
    backup: () => `/maintenance/backup`,
    migrate: () => `/maintenance/migrate`,
    importCatalogue: () => `/maintenance/import-catalogue`,
  },
} as const;
