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
import type { BlockConfig } from "@/types/pages";

export function HeroBannerBlock({ config }: { config: BlockConfig }) {
  return <Hero />;
}

export function FlashSaleBlock({ config }: { config: BlockConfig }) {
  return <FlashSale />;
}

export function CategoryCardsBlock({ config }: { config: BlockConfig }) {
  const p = config.props || {};
  const max = typeof p.max === "number" ? p.max : 4;
  return <CategoryCards max={max} />;
}

export function UseChipsBlock({ config }: { config: BlockConfig }) {
  return (
    <section className="container-page pb-4">
      <UseChips />
    </section>
  );
}

export function BestSellersBlock({ config }: { config: BlockConfig }) {
  return <BestSellers />;
}

export function FeaturedTabsBlock({ config }: { config: BlockConfig }) {
  return <FeaturedTabs />;
}

export function BrandsMarqueeBlock({ config }: { config: BlockConfig }) {
  return <BrandsMarquee />;
}

export function WhyUsBlock({ config }: { config: BlockConfig }) {
  return <WhyUs />;
}

export function BuilderTeaserBlock({ config }: { config: BlockConfig }) {
  return <BuilderTeaser />;
}

export function ReviewsGridBlock({ config }: { config: BlockConfig }) {
  return <Reviews />;
}

export function ContactCtaBlock({ config }: { config: BlockConfig }) {
  return <ContactCTA />;
}

export function TickerBarBlock({ config }: { config: BlockConfig }) {
  return <Ticker />;
}

export function PromoBannerBlock({ config }: { config: BlockConfig }) {
  return <PromoBanner />;
}
