import { useI18n } from "@/lib/i18n";
import { useAdminState } from "@/lib/admin-store";

export function BrandsMarquee() {
  const { t } = useI18n();
  const { marqueeBrands } = useAdminState();
  if (marqueeBrands.length === 0) return null;
  return (
    <section className="border-y border-border bg-card/30 overflow-hidden py-8">
      <div className="container-page mb-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("brands.title")}</p>
      </div>
      <div dir="ltr" className="group relative flex w-max animate-marquee-fast whitespace-nowrap pause-on-hover motion-reduce:animate-none">
        {[0, 1].map((half) => (
          <ul key={half} aria-hidden={half === 1} className="flex shrink-0 items-center">
            {marqueeBrands.map((b, i) => (
              <li key={`${half}-${i}`} className="shrink-0 mx-8 text-2xl font-bold text-muted-foreground/60 hover:text-foreground transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                {b}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
