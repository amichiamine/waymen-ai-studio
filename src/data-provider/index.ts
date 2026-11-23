/**
 * Fournisseur de données — interface publique.
 *
 * Les composants importent **uniquement** depuis `@/data-provider`. Ils
 * n'importent ni `@/api`, ni `@/lib/admin-store`, ni `@/api/config` : c'est
 * cette règle qui rend la bascule `VITE_API_MODE=mock|http` réellement
 * transparente, et elle sera outillée par une règle ESLint en vague 2.6.
 *
 * Spécification et tableau de correspondance : `docs/DATA-PROVIDER.md`.
 */

// Socle — utile aux nouveaux hooks d'entité, pas aux composants.
export { useResource, runMutation } from "./use-resource";
export type { ResourceState, ResourceSource } from "./types";
export { DATA_MODE, isHttpData } from "./mode";
export { invalidateResource, invalidateAll } from "./cache";
export { toApiError } from "./errors";
export { getResourceFailures, clearResourceFailures } from "./log";
export type { ResourceFailure } from "./log";
export {
  estObjetSingleton,
  extraireItems,
  normaliserListe,
  normaliserSingleton,
} from "./normalisation";

// Ressources.
export {
  PRODUCTS_RESOURCE,
  applyProductQuery,
  useProductDetail,
  useProductList,
  useProductMutations,
} from "./products";
export type { ProductMutations } from "./products";

// Ressources livrées en vague 2.3 — voir docs/DATA-PROVIDER.md §3.
export { ABOUT_VALUES_RESOURCE, useAboutValueList, useAboutValueMutations } from "./about-values";
export type { AboutValueMutations } from "./about-values";
export { AUDIT_LOGS_RESOURCE, useAuditLogList } from "./audit-logs";
export { BLOG_RESOURCE, useBlogPostDetail, useBlogPostList, useBlogPostMutations } from "./blog";
export type { BlogPostMutations } from "./blog";
export { BRANDS_RESOURCE, useBrandDetail, useBrandList, useBrandMutations } from "./brands";
export type { BrandMutations } from "./brands";
export {
  BUILDER_STEPS_RESOURCE,
  useBuilderStepList,
  useBuilderStepMutations,
} from "./builder-steps";
export type { BuilderStepMutations } from "./builder-steps";
export {
  CATEGORIES_RESOURCE,
  useCategoryDetail,
  useCategoryList,
  useCategoryMutations,
} from "./categories";
export type { CategoryMutations } from "./categories";
export {
  CONTACT_MESSAGES_RESOURCE,
  useContactMessageList,
  useContactMessageMutations,
} from "./contact-messages";
export type { ContactMessageMutations } from "./contact-messages";
export { COUPONS_RESOURCE, useCouponDetail, useCouponList, useCouponMutations } from "./coupons";
export type { CouponMutations } from "./coupons";
export {
  CUSTOMERS_RESOURCE,
  useCustomerDetail,
  useCustomerList,
  useCustomerMutations,
} from "./customers";
export type { CustomerMutations } from "./customers";
export { HOME_REVIEWS_RESOURCE, useHomeReviewList, useHomeReviewMutations } from "./home-reviews";
export type { HomeReviewMutations } from "./home-reviews";
export {
  MARQUEE_BRANDS_RESOURCE,
  useMarqueeBrandList,
  useMarqueeBrandMutations,
} from "./marquee-brands";
export type { MarqueeBrandMutations } from "./marquee-brands";
export {
  MEDIA_RESOURCE,
  useMediaAssetDetail,
  useMediaAssetList,
  useMediaAssetMutations,
} from "./media-assets";
export type { MediaAssetMutations } from "./media-assets";
export {
  NOTIFICATIONS_RESOURCE,
  useNotificationList,
  useNotificationMutations,
} from "./notifications";
export type { NotificationInput, NotificationMutations } from "./notifications";
export {
  ORDERS_RESOURCE,
  useMyOrderList,
  useOrderDetail,
  useOrderList,
  useOrderMutations,
} from "./orders";
export type { OrderMutations } from "./orders";
export {
  PAYMENT_METHODS_RESOURCE,
  usePaymentMethodList,
  usePaymentMethodMutations,
} from "./payment-methods";
export type { PaymentMethodMutations } from "./payment-methods";
export {
  REVIEWS_RESOURCE,
  useProductRating,
  useProductReviewList,
  useReviewList,
  useReviewMutations,
} from "./reviews";
export type { ReviewMutations } from "./reviews";
export {
  SHIPPING_RATES_RESOURCE,
  useShippingRateList,
  useShippingRateMutations,
} from "./shipping-rates";
export type { ShippingRateMutations } from "./shipping-rates";
export {
  SHIPPING_SETTINGS_RESOURCE,
  useShippingSettings,
  useShippingSettingsMutations,
} from "./shipping-settings";
export type { ShippingSettingsMutations } from "./shipping-settings";
export { SITE_CONTENT_RESOURCE, useSiteContent, useSiteContentMutations } from "./site-content";
export type { SiteContentMutations } from "./site-content";
export {
  SITE_SETTINGS_RESOURCE,
  useSiteSettings,
  useSiteSettingsMutations,
  purgerCacheClientSiteSettings,
} from "./site-settings";
export type { SiteSettingsMutations } from "./site-settings";
export {
  STOCK_MOVEMENTS_RESOURCE,
  useInventoryMutations,
  useStockMovementList,
} from "./stock-movements";
export type { InventoryMutations } from "./stock-movements";
export { SUBSCRIBERS_RESOURCE, useSubscriberList, useSubscriberMutations } from "./subscribers";
export type { SubscriberMutations } from "./subscribers";
export {
  TICKER_RESOURCE,
  useTickerMessageList,
  useTickerMessageMutations,
} from "./ticker-messages";
export type { TickerMessageMutations } from "./ticker-messages";
export { USERS_RESOURCE, useUserDetail, useUserList, useUserMutations } from "./users";
export type { UserMutations } from "./users";

// Maintenance — phase 4 (état de la base, sauvegarde, migration).
export {
  MAINTENANCE_RESOURCE,
  useEtatBase,
  useSauvegarde,
  useMigrationMutations,
  reinitialiserServeur,
} from "./maintenance";
export type {
  EtatBase,
  TableStat,
  MigrationInput,
  MigrationResult,
  MigrationResultTable,
  MigrationMutations,
  ResultatReinitialisationServeur,
} from "./maintenance";

// Authentification — vague 2.5.
export { AUTH_RESOURCE, authProvider } from "./auth";
export type {
  AuthOutcome,
  AuthUser,
  ResetFailure,
  ResetOutcome,
  ResetPasswordInput,
  UpdateProfileInput,
} from "./auth";
