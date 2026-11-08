import { Hero } from "@/components/Hero";
import { FlashSale } from "@/components/FlashSale";
import { CategoryCards } from "@/components/CategoryCards";
import { UseChips } from "@/components/UseChips";
import { BestSellers } from "@/components/BestSellers";
import { FeaturedTabs } from "@/components/FeaturedTabs";
import { BrandsMarquee } from "@/components/BrandsMarquee";
import { WhyUs } from "@/components/WhyUs";
import { BuilderTeaser } from "@/components/BuilderTeaser";
import { Reviews } from "@/components/Reviews";
import { ContactCTA } from "@/components/ContactCTA";
import { Ticker } from "@/components/Ticker";
import { PromoBanner } from "@/components/PromoBanner";
import { useSiteContent, useSiteSettings, useProductList } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import type { SiteContent } from "@/lib/site-content";

export function HeroBannerBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.hero?.enabled === false) return null;
  return <Hero override={config.props as Partial<SiteContent["hero"]>} />;
}

export function FlashSaleBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.flashSale?.enabled === false) return null;
  return <FlashSale override={config.props as Partial<SiteContent["flashSale"]>} />;
}

export function CategoryCardsBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.categories?.enabled === false) return null;
  const p = config.props || {};
  const max = typeof p.max === "number" ? p.max : 4;
  return <CategoryCards max={max} />;
}

export function UseChipsBlock({ config: _config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { data: products } = useProductList();
  const L = useLocalize();
  if (siteContent.useChips?.enabled === false) return null;
  const hasProductsWithUse = (products || []).some((p) => Array.isArray(p.use) && p.use.length > 0);
  if (!hasProductsWithUse) return null;

  return (
    <section className="container-page pb-4">
      {siteContent.useChips?.title && (
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">{L(siteContent.useChips.title)}</h2>
      )}
      <UseChips />
    </section>
  );
}

export function BestSellersBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.bestSellers?.enabled === false) return null;
  return <BestSellers override={config.props as Partial<SiteContent["bestSellers"]>} />;
}

export function FeaturedTabsBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.featuredTabs?.enabled === false) return null;
  return <FeaturedTabs override={config.props as Partial<SiteContent["featuredTabs"]>} />;
}

export function BrandsMarqueeBlock({ config: _config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.brandsMarquee?.enabled === false) return null;
  return <BrandsMarquee />;
}

export function WhyUsBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.whyUs?.enabled === false) return null;
  return <WhyUs override={config.props as Partial<SiteContent["whyUs"]>} />;
}

export function BuilderTeaserBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  if (siteContent.builderTeaser?.enabled === false || siteSettings.builderEnabled === false) {
    return null;
  }
  return (
    <BuilderTeaser
      override={config.props as Partial<SiteContent["builderTeaser"] & { bannerSrc?: string }>}
    />
  );
}

export function ReviewsGridBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.reviews?.enabled === false) return null;
  return <Reviews override={config.props as Partial<SiteContent["reviews"]>} />;
}

export function ContactCtaBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.contactCta?.enabled === false) return null;
  return <ContactCTA override={config.props as Partial<SiteContent["contactCta"]>} />;
}

export function TickerBarBlock({ config }: { config: BlockConfig }) {
  const p = config.props || {};
  return (
    <Ticker
      override={{
        messages: Array.isArray(p.messages) ? (p.messages as string[]) : undefined,
        speed: (p.speed as "normal" | "slow" | "fast") || undefined,
      }}
    />
  );
}

export function PromoBannerBlock({ config }: { config: BlockConfig }) {
  const { data: siteSettings } = useSiteSettings();
  if (siteSettings.showPromoBanner === false && !config.props?.text) return null;
  const p = config.props || {};
  return (
    <PromoBanner
      override={
        p.text || p.code
          ? {
              text: String(p.text || ""),
              label: p.label ? String(p.label) : undefined,
              href: p.href ? String(p.href) : undefined,
              code: p.code ? String(p.code) : undefined,
            }
          : undefined
      }
    />
  );
}
