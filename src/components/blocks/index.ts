import React from "react";
import type { BlockConfig, BlockType } from "@/types/pages";
import {
  HeroBannerBlock,
  FlashSaleBlock,
  CategoryCardsBlock,
  UseChipsBlock,
  BestSellersBlock,
  FeaturedTabsBlock,
  BrandsMarqueeBlock,
  WhyUsBlock,
  BuilderTeaserBlock,
  ReviewsGridBlock,
  ContactCtaBlock,
  TickerBarBlock,
  PromoBannerBlock,
} from "./CommerceBlocks";
import { ProfileHeroBlock } from "./ProfileHeroBlock";
import { TimelineBlock } from "./TimelineBlock";
import { SkillsMatrixBlock } from "./SkillsMatrixBlock";
import { ProjectsGridBlock } from "./ProjectsGridBlock";
import { CompanyHistoryBlock } from "./CompanyHistoryBlock";
import { ValuesGridBlock } from "./ValuesGridBlock";
import { BrandBannerBlock } from "./BrandBannerBlock";
import { MarkdownSectionBlock } from "./MarkdownSectionBlock";
import { LatestBlogPostsBlock } from "./LatestBlogPostsBlock";
import { ContactFormBlock } from "./ContactFormBlock";
import { DirectContactCardsBlock } from "./DirectContactCardsBlock";
import { FaqAccordionBlock } from "./FaqAccordionBlock";

export { BLOCK_REGISTRY, getBlockMeta } from "./registry";

export const BLOCK_COMPONENTS: Record<BlockType, React.ComponentType<{ config: BlockConfig }>> = {
  // 🛍️ Famille Commerce & Vitrine
  hero_banner: HeroBannerBlock,
  flash_sale: FlashSaleBlock,
  category_cards: CategoryCardsBlock,
  use_chips: UseChipsBlock,
  best_sellers: BestSellersBlock,
  featured_tabs: FeaturedTabsBlock,
  brands_marquee: BrandsMarqueeBlock,
  why_us: WhyUsBlock,
  builder_teaser: BuilderTeaserBlock,

  // 👤 Famille Identité, Projets & CV
  profile_hero: ProfileHeroBlock,
  timeline: TimelineBlock,
  skills_matrix: SkillsMatrixBlock,
  projects_grid: ProjectsGridBlock,
  company_history: CompanyHistoryBlock,
  values_grid: ValuesGridBlock,
  brand_banner: BrandBannerBlock,
  markdown_section: MarkdownSectionBlock,

  // 🤝 Famille Confiance & Preuve Sociale
  reviews_grid: ReviewsGridBlock,
  latest_blog_posts: LatestBlogPostsBlock,

  // 💬 Famille Interaction & Contact
  contact_form: ContactFormBlock,
  contact_cta: ContactCtaBlock,
  direct_contact_cards: DirectContactCardsBlock,
  faq_accordion: FaqAccordionBlock,
  ticker_bar: TickerBarBlock,
  promo_banner: PromoBannerBlock,
};

export function renderBlock(config: BlockConfig) {
  if (!config.enabled) return null;
  const Component = BLOCK_COMPONENTS[config.type];
  if (!Component) return null;
  return React.createElement(Component, { key: config.id, config });
}
