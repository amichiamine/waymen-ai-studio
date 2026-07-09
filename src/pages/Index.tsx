
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
import { useI18n } from "@/lib/i18n";

export default function Index() {
  const { t } = useI18n();
  return (
    <>
      <Helmet>
        <title>KA Tech — La puissance tech entre vos mains</title>
        <meta name="description" content="Ordinateurs portables, ordinateurs de bureau, configurations sur mesure et smartphones avec garantie officielle et livraison partout en Algérie." />
        <link rel="canonical" href="/" />
        <meta property="og:url" content="/" />
      </Helmet>
      <Hero />
      <FlashSale />
      <CategoryCards />
      <section className="container-page pb-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t("use.title")}</h2>
        <UseChips />
      </section>
      <BestSellers />
      <BrandsMarquee />
      <WhyUs />
      <BuilderTeaser />
      <Reviews />
      <ContactCTA />
    </>
  );
}
// touched at Thu Jul  9 10:40:16 UTC 2026
