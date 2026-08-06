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
  },

  products: {
    list: () => `/products`,
    detail: (id: string) => `/products/${id}`,
    create: () => `/products`,
    update: (id: string) => `/products/${id}`,
    remove: (id: string) => `/products/${id}`,
    stock: (id: string) => `/products/${id}/stock`,
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
  },

  analytics: {
    dashboard: () => `/analytics/dashboard`,
    reports: () => `/analytics/reports`,
    audit: () => `/analytics/audit`,
  },

  notifications: {
    list: () => `/notifications`,
    detail: (id: string) => `/notifications/${id}`,
    create: () => `/notifications`,
    update: (id: string) => `/notifications/${id}`,
    remove: (id: string) => `/notifications/${id}`,
  },
} as const;
