import archisysBannerSrc from "@/assets/stacgate-archisys-banner.webp";
import type { BlockConfig } from "@/types/pages";

export function BrandBannerBlock({ config }: { config: BlockConfig }) {
  const p = config.props || {};
  const bannerSrc = typeof p.bannerSrc === "string" ? p.bannerSrc : archisysBannerSrc;
  const altText =
    typeof p.altText === "string"
      ? p.altText
      : "StacGate Platform — Conçu et Validé par ArchiSys3.0";

  return (
    <section className="container-page py-6 md:py-10">
      <div className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md">
        <img src={bannerSrc} alt={altText} className="w-full h-auto object-cover" loading="lazy" />
      </div>
    </section>
  );
}
