import { Link } from "react-router-dom";
import { ArrowRight, Cpu } from "lucide-react";
import banner from "@/assets/builder-banner.webp";
import { useSiteContent, useSiteSettings } from "@/data-provider";
import { getIcon } from "@/lib/site-content";
import { Reveal } from "@/components/Reveal";
import { useLocalize } from "@/lib/i18n";

export function BuilderTeaser() {
  const { data: siteContent } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  const storeName = siteSettings.storeName?.trim() || "Boutique";
  const b = siteContent.builderTeaser;
  const L = useLocalize();
  return (
    <section className="container-page py-16">
      <Reveal variant="up">
        <div className="group relative overflow-hidden rounded-2xl border border-border transition-all duration-500 hover:border-primary/50">
          <img
            src={banner}
            alt={storeName}
            width={1280}
            height={600}
            loading="lazy"
            className="absolute inset-0 size-full object-cover opacity-40 transition-transform duration-[1200ms] ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="relative grid lg:grid-cols-2 gap-8 p-8 lg:p-14">
            <div className="space-y-5">
              {b.badge && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium">
                  <Cpu className="size-3.5" /> {L(b.badge)}
                </span>
              )}
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight">{L(b.title)}</h2>
              {b.subtitle && <p className="text-muted-foreground max-w-md">{L(b.subtitle)}</p>}
              <div className="flex flex-wrap gap-3">
                <Link
                  to={b.cta.href}
                  className="group/cta inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] active:scale-95 shadow-[var(--shadow-glow)]"
                >
                  {L(b.cta.label)}{" "}
                  <ArrowRight className="size-4 rtl:rotate-180 transition-transform duration-300 group-hover/cta:translate-x-1 rtl:group-hover/cta:-translate-x-1" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 self-end">
              {b.items.map((it, i) => {
                const Icon = getIcon(it.icon);
                return (
                  <Reveal key={it.id} variant="up" delay={150 + i * 90}>
                    <div className="group/card rounded-lg bg-card/80 backdrop-blur border border-border p-4 transition-all duration-500 hover:border-primary/50 hover:-translate-y-1 hover:bg-card">
                      <Icon className="size-5 text-primary mb-2 transition-transform duration-500 group-hover/card:scale-110" />
                      <div className="text-sm font-semibold">{L(it.title)}</div>
                      <div className="text-xs text-muted-foreground">{L(it.subtitle)}</div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
