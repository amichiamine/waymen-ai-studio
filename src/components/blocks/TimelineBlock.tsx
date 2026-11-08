import { Badge } from "@/components/ui/badge";
import { useLocalize } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { Briefcase, Calendar, CheckCircle2 } from "lucide-react";

import type { Localized } from "@/lib/i18n";

interface TimelineItem {
  id?: string;
  role?: Localized<string>;
  title?: string;
  company?: string;
  period?: string;
  description?: Localized<string>;
  tags?: string[];
}

interface TimelineBlockProps {
  config: BlockConfig;
}

export function TimelineBlock({ config }: TimelineBlockProps) {
  const L = useLocalize();
  const p = config.props || {};

  const title = L(p.title as Localized<string>) || "Parcours Professionnel & Jalons";
  const subtitle =
    L(p.subtitle as Localized<string>) || "Historique des réalisations et projets d'ingénierie.";
  const items = (Array.isArray(p.items) ? p.items : []) as TimelineItem[];

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="max-w-3xl mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground text-base sm:text-lg">{subtitle}</p>}
      </div>

      <div className="relative border-s-2 border-border/80 ms-4 md:ms-6 space-y-10">
        {items.map((item, idx: number) => {
          const role = L(item.role) || item.title || "";
          const company = item.company || "";
          const period = item.period || "";
          const description = L(item.description) || "";
          const tags = Array.isArray(item.tags) ? item.tags : [];

          return (
            <div key={item.id || idx} className="relative ps-6 md:ps-8 group">
              {/* Point de jalon */}
              <div className="absolute -start-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background transition-colors group-hover:bg-primary" />

              <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs hover:border-primary/40 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">{role}</h3>
                    {company && (
                      <span className="text-sm font-semibold text-muted-foreground">
                        @ {company}
                      </span>
                    )}
                  </div>

                  {period && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {period}
                    </Badge>
                  )}
                </div>

                {description && (
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mt-2 whitespace-pre-line">
                    {description}
                  </p>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border/40">
                    {tags.map((tag: string, tIdx: number) => (
                      <Badge
                        key={tIdx}
                        variant="outline"
                        className="text-xs bg-muted/40 font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
