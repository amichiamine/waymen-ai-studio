import { useAdminState } from "@/lib/admin-store";
import { getIcon } from "@/lib/site-content";

export function WhyUs() {
  const { siteContent } = useAdminState();
  const w = siteContent.whyUs;
  return (
    <section className="bg-surface-offset py-16 lg:py-20">
      <div className="container-page space-y-10">
        <div className="space-y-3 max-w-2xl">
          {w.kicker && <span className="text-xs uppercase tracking-[0.25em] text-primary">{w.kicker}</span>}
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight">{w.title1}{w.title2 && (<><br />{w.title2}</>)}</h2>
          {w.subtitle && <p className="text-muted-foreground">{w.subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {w.items.map((it) => {
            const Icon = getIcon(it.icon);
            return (
              <div key={it.id} className="rounded-2xl bg-card border border-border p-5 lg:p-6 space-y-3 hover:border-primary/40 hover:-translate-y-1 transition-all">
                <div className="size-11 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold">{it.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{it.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
