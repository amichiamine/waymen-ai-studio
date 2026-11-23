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
import { Badge } from "@/components/ui/badge";
import { useSiteContent, useSiteSettings, useProductList } from "@/data-provider";
import { useLocalize, type Localized } from "@/lib/i18n";
import { catalogProducts } from "@/data/products";
import type { BlockConfig } from "@/types/pages";
import type { SiteContent } from "@/lib/site-content";

export function HeroBannerBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.hero?.enabled === false) return null;
  const p = (config.props || {}) as Record<string, unknown>;

  // Normalisation intelligente : support des props plates du Studio ET des props structurées
  const primaryCta =
    (p.primaryCta as { label?: unknown; href?: string }) ||
    (p.primaryCtaText || p.primaryCtaHref
      ? {
          label: p.primaryCtaText || siteContent.hero.primaryCta.label,
          href:
            typeof p.primaryCtaHref === "string"
              ? p.primaryCtaHref
              : siteContent.hero.primaryCta.href,
        }
      : siteContent.hero.primaryCta);

  const secondaryCta =
    (p.secondaryCta as { label?: unknown; href?: string }) ||
    (p.secondaryCtaText || p.secondaryCtaHref
      ? {
          label: p.secondaryCtaText || siteContent.hero.secondaryCta.label,
          href:
            typeof p.secondaryCtaHref === "string"
              ? p.secondaryCtaHref
              : siteContent.hero.secondaryCta.href,
        }
      : siteContent.hero.secondaryCta);

  const kpis = Array.isArray(p.kpis) && p.kpis.length > 0 ? p.kpis : siteContent.hero.kpis;
  const showImage =
    typeof p.showImage === "boolean" ? p.showImage : (siteContent.hero.showImage ?? true);
  const imageSrc =
    typeof p.imageSrc === "string" && p.imageSrc ? p.imageSrc : siteContent.hero.imageSrc;

  const override: Partial<SiteContent["hero"]> = {
    badge: (p.badge as Localized<string>) || siteContent.hero.badge,
    title1: (p.title1 as Localized<string>) || siteContent.hero.title1,
    title2: (p.title2 as Localized<string>) || siteContent.hero.title2,
    subtitle: (p.subtitle as Localized<string>) || siteContent.hero.subtitle,
    primaryCta: primaryCta as SiteContent["hero"]["primaryCta"],
    secondaryCta: secondaryCta as SiteContent["hero"]["secondaryCta"],
    kpis: kpis as SiteContent["hero"]["kpis"],
    showImage,
    imageSrc,
  };

  return <Hero override={override} />;
}

export function FlashSaleBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { data: products } = useProductList();
  if (siteContent.flashSale?.enabled === false && !config.props?.title) return null;
  const hasSale = catalogProducts(products || []).some((p) => p.sale);
  if (!hasSale) {
    return (
      <section className="container-page py-6">
        <div className="border border-dashed border-amber-500/40 bg-amber-500/5 rounded-2xl p-6 text-center space-y-2">
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs font-semibold">
            ⚡ Vente Flash (Aperçu Studio)
          </Badge>
          <p className="text-xs text-muted-foreground">
            Ce bloc s'affichera automatiquement dès que des produits seront marqués en promotion
            (sale: true) dans votre catalogue.
          </p>
        </div>
      </section>
    );
  }

  const p = (config.props || {}) as Record<string, unknown>;
  const override: Partial<SiteContent["flashSale"]> = {
    badge: (p.badge as Localized<string>) || siteContent.flashSale.badge,
    title: (p.title as Localized<string>) || siteContent.flashSale.title,
    subtitle: (p.subtitle as Localized<string>) || siteContent.flashSale.subtitle,
    viewAllLabel: (p.viewAllLabel as Localized<string>) || siteContent.flashSale.viewAllLabel,
    viewAllHref:
      typeof p.viewAllHref === "string" ? p.viewAllHref : siteContent.flashSale.viewAllHref,
    countdownHours:
      typeof p.countdownHours === "number"
        ? p.countdownHours
        : siteContent.flashSale.countdownHours || 72,
    endsAt: typeof p.endsAt === "string" && p.endsAt ? p.endsAt : siteContent.flashSale.endsAt,
  };

  return <FlashSale override={override} />;
}

export function CategoryCardsBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.categories?.enabled === false) return null;
  const p = config.props || {};
  const max = typeof p.max === "number" ? p.max : 4;
  return <CategoryCards max={max} />;
}

export function UseChipsBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { data: products } = useProductList();
  const L = useLocalize();
  if (siteContent.useChips?.enabled === false && !config.props?.title) return null;
  const hasProductsWithUse = (products || []).some((p) => Array.isArray(p.use) && p.use.length > 0);
  if (!hasProductsWithUse) {
    return (
      <section className="container-page py-6">
        <div className="border border-dashed border-muted-foreground/30 bg-muted/20 rounded-2xl p-6 text-center space-y-2">
          <Badge variant="outline" className="text-xs font-semibold">
            🏷️ Usages & Filtres Rapides (Aperçu Studio)
          </Badge>
          <p className="text-xs text-muted-foreground">
            Ce bloc s'affichera dès que des usages (Gaming, Bureautique, Création...) seront
            associés à des produits du catalogue.
          </p>
        </div>
      </section>
    );
  }

  const rawTitle = config.props?.title;
  let displayTitle = "";
  if (typeof rawTitle === "string") {
    displayTitle = rawTitle;
  } else if (rawTitle && typeof rawTitle === "object") {
    displayTitle = L(rawTitle as Localized<string>) || "";
  } else if (siteContent.useChips?.title) {
    displayTitle = L(siteContent.useChips.title) || "";
  }

  return (
    <section className="container-page pb-4">
      {displayTitle ? (
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">{displayTitle}</h2>
      ) : null}
      <UseChips />
    </section>
  );
}

export function BestSellersBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { data: products } = useProductList();
  if (siteContent.bestSellers?.enabled === false && !config.props?.title) return null;
  const hasBest = catalogProducts(products || []).some((p) => p.bestSeller);
  if (!hasBest) {
    return (
      <section className="container-page py-6">
        <div className="border border-dashed border-primary/40 bg-primary/5 rounded-2xl p-6 text-center space-y-2">
          <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold">
            ⭐ Meilleures Ventes (Aperçu Studio)
          </Badge>
          <p className="text-xs text-muted-foreground">
            Ce bloc s'affichera automatiquement dès que des produits seront marqués comme meilleures
            ventes dans votre catalogue.
          </p>
        </div>
      </section>
    );
  }
  return <BestSellers override={config.props as Partial<SiteContent["bestSellers"]>} />;
}

export function FeaturedTabsBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  if (siteContent.featuredTabs?.enabled === false) return null;
  return <FeaturedTabs override={config.props as Partial<SiteContent["featuredTabs"]>} />;
}

export function BrandsMarqueeBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const L = useLocalize();
  if (siteContent.brandsMarquee?.enabled === false && !config.props?.title) return null;
  const rawTitle = config.props?.title;
  let displayTitle: string | undefined;
  if (typeof rawTitle === "string") {
    displayTitle = rawTitle;
  } else if (rawTitle && typeof rawTitle === "object") {
    displayTitle = L(rawTitle as Localized<string>);
  }

  const speed =
    config.props?.speed === "slow" ||
    config.props?.speed === "normal" ||
    config.props?.speed === "fast"
      ? config.props.speed
      : undefined;

  return <BrandsMarquee override={{ title: displayTitle, speed }} />;
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
  const p = (config.props || {}) as Record<string, unknown>;
  const speed =
    p.speed === "slow" || p.speed === "normal" || p.speed === "fast"
      ? (p.speed as "normal" | "slow" | "fast")
      : undefined;

  return (
    <Ticker
      override={{
        messages:
          Array.isArray(p.messages) && p.messages.length > 0 ? (p.messages as string[]) : undefined,
        speed,
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
