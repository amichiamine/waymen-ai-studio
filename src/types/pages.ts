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
  | "promo_banner";

export interface BlockStyleConfig {
  padding?: "compact" | "normal" | "ample";
  bg?: "transparent" | "surface" | "muted" | "accent" | "dark";
  align?: "start" | "center";
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface BlockConfig {
  id: string;
  type: BlockType;
  enabled: boolean;
  props?: Record<string, unknown>;
  style?: BlockStyleConfig;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface BlockMeta {
  type: BlockType;
  family: BlockFamily;
  label: Localized<string>;
  description: Localized<string>;
  icon: string;
  defaultProps?: Record<string, unknown>;
}
