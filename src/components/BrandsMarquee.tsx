import { useMarqueeBrandList, useBrandList, useSiteContent } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import { resoudreUrlMedia } from "@/components/media-url";

export function BrandsMarquee() {
  const { data: marqueeBrands } = useMarqueeBrandList();
  const { data: allBrands } = useBrandList();
  const { data: siteContent } = useSiteContent();
  const L = useLocalize();

  // Si la liste marqueeBrands est vide, repli sur les marques du catalogue ou une liste officielle
  const brandsToDisplay =
    marqueeBrands.length > 0
      ? marqueeBrands
      : allBrands.length > 0
        ? allBrands.map((b) => b.name)
        : ["ASUS", "MSI", "Corsair", "Intel", "AMD", "Gigabyte", "Logitech", "Razer"];

  const brandsMap = new Map(allBrands.map((b) => [b.name.toLowerCase(), b]));

  return (
    <section className="border-y border-border bg-card/30 overflow-hidden py-8">
      <div className="container-page mb-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {L(siteContent.brandsMarquee?.title) || "Marques & Partenaires Officiels"}
        </p>
      </div>
      <div
        dir="ltr"
        className="group relative flex w-max animate-marquee-fast whitespace-nowrap pause-on-hover motion-reduce:animate-none"
      >
        {[0, 1].map((half) => (
          <ul key={half} aria-hidden={half === 1} className="flex shrink-0 items-center">
            {brandsToDisplay.map((b, i) => {
              const matched = brandsMap.get(b.toLowerCase());
              return (
                <li
                  key={`${half}-${i}`}
                  className="shrink-0 mx-8 flex items-center justify-center text-2xl font-bold text-muted-foreground/60 hover:text-foreground transition-colors"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {matched?.logo ? (
                    <img
                      src={resoudreUrlMedia(matched.logo)}
                      alt={b}
                      className="h-8 max-w-[120px] object-contain opacity-70 hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span>{b}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </section>
  );
}
