/**
 * Types souverains pour le Moteur Universel de Pages & Blocs Composables
 * (StacGate Composable Engine — Phase 37).
 */
import type { Localized } from "@/lib/i18n";

export type BlockFamily = "commerce" | "identity" | "social" | "interaction";

export type BlockType =
  // 🛍️ Famille Commerce & Vitrine
  | "hero_banner"
  | "flash_sale"
  | "category_cards"
  | "use_chips"
  | "best_sellers"
  | "featured_tabs"
  | "brands_marquee"
  | "why_us"
  | "builder_teaser"
  // 👤 Famille Identité, Projets & CV
  | "profile_hero"
  | "timeline"
  | "skills_matrix"
  | "projects_grid"
  | "company_history"
  | "values_grid"
  | "brand_banner"
  | "markdown_section"
  // 🤝 Famille Confiance & Preuve Sociale
  | "reviews_grid"
  | "latest_blog_posts"
  // 💬 Famille Interaction & Contact
  | "contact_form"
  | "contact_cta"
  | "direct_contact_cards"
  | "faq_accordion"
  | "ticker_bar"
  | "promo_banner"
  // 🌟 Nouveaux Blocs Majuscules Phase 41
  | "features_grid"
  | "pricing_table"
  | "quote_star"
  | "full_width_banner"
  | "visual_spacer";

export interface BlockStyleConfig {
  padding?: "compact" | "normal" | "ample";
  bg?: "transparent" | "surface" | "muted" | "accent" | "dark";
  align?: "start" | "center";
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  shadow?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "accent";
  border?: "none" | "subtle" | "accent" | "top_bottom" | "dashed";
  maxWidth?: "full" | "7xl" | "5xl" | "3xl" | "prose";
  margin?: "none" | "compact" | "normal" | "ample";
  anchorId?: string;
  customClassName?: string;
  // ⚙️ Emplacement pour Vues Systèmes (Phase 46)
  placement?: "top" | "bottom";
  // 🎛️ Sous-éléments Atomiques (Phase 43)
  cardStyle?: "default" | "flat" | "elevated" | "bordered" | "glass" | "gradient";
  cardHover?: "none" | "lift" | "glow" | "zoom" | "border-accent";
  gridColsDesktop?: 1 | 2 | 3 | 4 | 5 | 6;
  gridColsMobile?: 1 | 2;
  gridGap?: "none" | "compact" | "normal" | "ample";
  ctaVariant?: "default" | "secondary" | "outline" | "ghost" | "gradient" | "glow";
  ctaSize?: "sm" | "md" | "lg";
  headerBadge?: Localized<string>;
  headerBadgeIcon?: string;
  headerTitleSize?: "h1" | "h2" | "h3" | "h4";
  headerTitleGradient?: boolean;
}

export interface BlockConfig {
  id: string;
  type: BlockType;
  enabled: boolean;
  props?: Record<string, unknown>;
  style?: BlockStyleConfig;
}

export interface PageLayoutConfig {
  hideHeader?: boolean;
  transparentHeader?: boolean;
  hideFooter?: boolean;
  hideTicker?: boolean;
  hideFloatingContact?: boolean;
  pageBg?: "default" | "dark" | "surface" | "gradient" | "muted";
}

export interface PageSeoConfig {
  metaTitle?: Localized<string>;
  metaDescription?: Localized<string>;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export type SystemViewKey =
  | "blog"
  | "track"
  | "builder"
  | "cart"
  | "checkout_success"
  | "not_found";

export interface CustomPageDefinition {
  id: string;
  slug: string; // e.g. "cv", "projets", "solutions"
  title: Localized<string>;
  description?: Localized<string>;
  blocks: BlockConfig[];
  isPublished: boolean;
  inNavbar: boolean;
  inFooter?: boolean;
  navOrder: number;
  layout?: PageLayoutConfig;
  seo?: PageSeoConfig;
  createdAt: string;
  updatedAt: string;
  // ⚙️ Vues Systèmes & Fonctionnelles (Phase 46)
  isSystem?: boolean;
  systemKey?: SystemViewKey;
}

export interface BlockMeta {
  type: BlockType;
  family: BlockFamily;
  label: Localized<string>;
  description: Localized<string>;
  icon: string;
  defaultProps?: Record<string, unknown>;
}
