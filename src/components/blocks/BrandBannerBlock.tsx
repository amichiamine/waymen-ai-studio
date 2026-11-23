import defaultBannerSrc from "@/assets/waymen-og-banner.webp";
import type { BlockConfig } from "@/types/pages";
import { useLocalize, type Localized } from "@/lib/i18n";
import { resoudreUrlMedia } from "@/components/media-url";

export function BrandBannerBlock({ config }: { config: BlockConfig }) {
  const L = useLocalize();
  const p = config.props || {};
  const rawBannerSrc =
    typeof p.bannerSrc === "string" && p.bannerSrc ? p.bannerSrc : defaultBannerSrc;
  const bannerSrc = resoudreUrlMedia(rawBannerSrc);
  const altText = p.altText
    ? typeof p.altText === "string"
      ? p.altText
      : L(p.altText as Localized<string>)
    : "WaYmen AI Studio — Abonnements, Activations & Formations IA";

  return (
    <section className="container-page py-6 md:py-10">
      <div className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md">
        <img src={bannerSrc} alt={altText} className="w-full h-auto object-cover" loading="lazy" />
      </div>
    </section>
  );
}
