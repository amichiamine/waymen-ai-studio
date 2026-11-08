import { ShieldCheck, Truck, Headphones, Award, Star, Heart } from "lucide-react";
import { useAboutValueList, useSiteContent } from "@/data-provider";
import type { AboutValue } from "@/lib/admin-store";
import { useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

const ICONS: Record<AboutValue["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck,
  truck: Truck,
  headphones: Headphones,
  award: Award,
  star: Star,
  heart: Heart,
};

interface ValueItem {
  id?: string;
  icon?: AboutValue["icon"] | string;
  title: Localized<string>;
  description: Localized<string>;
}

export function ValuesGridBlock({ config }: { config: BlockConfig }) {
  const { data: aboutValues } = useAboutValueList();
  const { data: siteContent } = useSiteContent();
  const L = useLocalize();
  const p = config.props || {};

  const about = siteContent?.about;
  const rawValues =
    p.values || (about?.values && about.values.length > 0 ? about.values : aboutValues);
  const displayedValues = (Array.isArray(rawValues) ? rawValues : []) as ValueItem[];

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayedValues.map((v, idx: number) => {
          const Icon = (v.icon && ICONS[v.icon as AboutValue["icon"]]) || ShieldCheck;
          const title = L(v.title);
          const description = L(v.description);

          return (
            <div
              key={v.id || idx}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs hover:border-primary/40 transition-all flex flex-col items-start"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
