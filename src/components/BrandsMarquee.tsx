import { useMemo } from "react";
import { useMarqueeBrandList, useBrandList, useSiteContent } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import { resoudreUrlMedia } from "@/components/media-url";

export interface BrandsMarqueeProps {
  override?: {
    title?: string;
    speed?: "fast" | "normal" | "slow";
  };
}

export function BrandsMarquee({ override }: BrandsMarqueeProps = {}) {
  const { data: marqueeBrands } = useMarqueeBrandList();
  const { data: allBrands } = useBrandList();
  const { data: siteContent } = useSiteContent();
  const L = useLocalize();

  // Priorité absolue aux marques de la base de données avec leurs logos SVG officiels
  const brandsToDisplay = useMemo(() => {
    if (allBrands && allBrands.length > 0) {
      return allBrands.map((b) => ({
        id: b.id,
        name: b.name,
        logo: b.logo || `media/brands/${b.id}.svg`,
      }));
    }
    // Repli de sécurité si l'API n'a pas encore répondu
    const fallbackNames =
      marqueeBrands.length > 0
        ? marqueeBrands
        : [
            "OpenAI",
            "Anthropic",
            "Google",
            "Midjourney",
            "Cursor",
            "Microsoft",
            "Perplexity",
            "ElevenLabs",
            "Runway",
            "Canva",
            "Notion",
            "WaYmen Academy",
            "WaYmen VIP",
          ];
    return fallbackNames.map((name) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return {
        id: slug,
        name,
        logo: `media/brands/${slug}.svg`,
      };
    });
  }, [allBrands, marqueeBrands]);

  const speedClass =
    override?.speed === "slow"
      ? "animate-marquee-slow"
      : override?.speed === "normal"
        ? "animate-marquee"
        : "animate-marquee-fast";

  const displayTitle =
    override?.title ||
    L(siteContent.brandsMarquee?.title) ||
    "Partenaires & Écosystèmes IA Officiels";

  return (
    <section className="border-y border-border bg-card/40 backdrop-blur-sm overflow-hidden py-8">
      <div className="container-page mb-6">
        <p className="text-center text-xs uppercase tracking-[0.25em] font-bold text-muted-foreground">
          {displayTitle}
        </p>
      </div>
      <div
        dir="ltr"
        className={`group relative flex w-max ${speedClass} whitespace-nowrap pause-on-hover motion-reduce:animate-none`}
      >
        {[0, 1].map((half) => (
          <ul key={half} aria-hidden={half === 1} className="flex shrink-0 items-center">
            {brandsToDisplay.map((b, i) => (
              <li
                key={`${half}-${b.id || i}`}
                className="shrink-0 mx-6 sm:mx-8 flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all duration-200 select-none group/brand"
              >
                {b.logo && (
                  <img
                    src={resoudreUrlMedia(b.logo)}
                    alt={b.name}
                    className="size-7 sm:size-8 object-contain opacity-85 group-hover/brand:opacity-100 transition-opacity drop-shadow-sm"
                    loading="lazy"
                  />
                )}
                <span className="text-sm sm:text-base font-bold text-foreground/80 group-hover/brand:text-foreground transition-colors tracking-wide">
                  {b.name}
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
