import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Hero } from "@/components/Hero";
import { CategoryCards } from "@/components/CategoryCards";
import { UseChips } from "@/components/UseChips";
import { BestSellers } from "@/components/BestSellers";
import { BrandsMarquee } from "@/components/BrandsMarquee";
import { FlashSale } from "@/components/FlashSale";
import { WhyUs } from "@/components/WhyUs";
import { BuilderTeaser } from "@/components/BuilderTeaser";
import { Reviews } from "@/components/Reviews";
import { ContactCTA } from "@/components/ContactCTA";
import { useSiteContent, useSiteSettings, useProductList } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";

export default function Index() {
  const { data: siteContent } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  const { data: products } = useProductList();
  const storeName = siteSettings.storeName?.trim() || "";
  const L = useLocalize();

  const tagline =
    L(siteContent.hero.subtitle) || "Boutique en ligne officielle avec livraison 58 wilayas.";
  const title1 = L(siteContent.hero.title1) || "";
  const title2 = L(siteContent.hero.title2) || "";
  const metaTitle = storeName
    ? `${storeName} — ${title1} ${title2}`.trim()
    : `${title1} ${title2}`.trim() || "Boutique officielle";

  const hasProductsWithUse = useMemo(() => {
    return products.some((p) => Array.isArray(p.use) && p.use.length > 0);
  }, [products]);

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={tagline} />
        <link rel="canonical" href={window.location.origin} />
        <meta property="og:url" content={window.location.origin} />
      </Helmet>
      <Hero />
      <FlashSale />
      <CategoryCards max={4} />
      {hasProductsWithUse && (
        <section className="container-page pb-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{L(siteContent.useChips.title)}</h2>
          <UseChips />
        </section>
      )}
      <BestSellers />
      <BrandsMarquee />
      <WhyUs />
      {siteSettings.builderEnabled !== false && <BuilderTeaser />}
      <Reviews />
      <ContactCTA />
    </>
  );
}
