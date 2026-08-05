import { useSiteContent } from "@/data-provider";
import { getIcon } from "@/lib/site-content";
import { Reveal } from "@/components/Reveal";
import { useLocalize } from "@/lib/i18n";

export function WhyUs() {
  // loading inerte en mode mock. En http, on rend la section avec les valeurs
  // de repli (tableau vide) le temps du premier aller-retour — pas de
  // squelette : la section est secondaire, l'absence de cartes est invisible.
  const { data: siteContent } = useSiteContent();
  const w = siteContent.whyUs;
  const L = useLocalize();
  return (
    <section className="bg-surface-offset py-16 lg:py-20">
      <div className="container-page space-y-10">
        <Reveal variant="up">
          <div className="space-y-3 max-w-2xl">
            {w.kicker && (
              <span className="text-xs uppercase tracking-[0.25em] text-primary">
                {L(w.kicker)}
              </span>
            )}
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
              {L(w.title1)}
              {w.title2 && (
                <>
                  <br />
                  {L(w.title2)}
                </>
              )}
            </h2>
            {w.subtitle && <p className="text-muted-foreground">{L(w.subtitle)}</p>}
          </div>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {w.items.map((it, i) => {
            const Icon = getIcon(it.icon);
            return (
              <Reveal key={it.id} variant="up" delay={i * 90}>
                <div className="group rounded-2xl bg-card border border-border p-5 lg:p-6 space-y-3 transition-all duration-500 hover:border-primary/50 hover:-translate-y-1.5 hover:shadow-[var(--shadow-card)]">
                  <div className="size-11 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base lg:text-lg font-semibold">{L(it.title)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {L(it.description)}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
