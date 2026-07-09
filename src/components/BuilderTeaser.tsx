import { Link } from "react-router-dom";
import { ArrowRight, Cpu } from "lucide-react";
import banner from "@/assets/builder-banner.jpg";
import { useAdminState } from "@/lib/admin-store";
import { getIcon } from "@/lib/site-content";

export function BuilderTeaser() {
  const { siteContent } = useAdminState();
  const b = siteContent.builderTeaser;
  return (
    <section className="container-page py-16">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <img src={banner} alt="KA Tech build" width={1280} height={600} loading="lazy" className="absolute inset-0 size-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="relative grid lg:grid-cols-2 gap-8 p-8 lg:p-14">
          <div className="space-y-5">
            {b.badge && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium">
                <Cpu className="size-3.5" /> {b.badge}
              </span>
            )}
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">{b.title}</h2>
            {b.subtitle && <p className="text-muted-foreground max-w-md">{b.subtitle}</p>}
            <div className="flex flex-wrap gap-3">
              <Link to={b.cta.href} className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]">
                {b.cta.label} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {b.items.map((it) => {
              const Icon = getIcon(it.icon);
              return (
                <div key={it.id} className="rounded-lg bg-card/80 backdrop-blur border border-border p-4">
                  <Icon className="size-5 text-primary mb-2" />
                  <div className="text-sm font-semibold">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.subtitle}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
