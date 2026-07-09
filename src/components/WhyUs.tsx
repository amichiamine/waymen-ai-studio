import { ShieldCheck, Truck, Headphones, CreditCard } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

const items: { Icon: typeof ShieldCheck; titleKey: TKey; descKey: TKey }[] = [
  { Icon: ShieldCheck, titleKey: "why.1.title", descKey: "why.1.desc" },
  { Icon: Truck, titleKey: "why.2.title", descKey: "why.2.desc" },
  { Icon: Headphones, titleKey: "why.3.title", descKey: "why.3.desc" },
  { Icon: CreditCard, titleKey: "why.4.title", descKey: "why.4.desc" },
];

export function WhyUs() {
  const { t } = useI18n();
  return (
    <section className="bg-surface-offset py-16 lg:py-20">
      <div className="container-page space-y-10">
        <div className="space-y-3 max-w-2xl">
          <span className="text-xs uppercase tracking-[0.25em] text-primary">{t("why.kicker")}</span>
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight">{t("why.title.1")}<br />{t("why.title.2")}</h2>
          <p className="text-muted-foreground">{t("why.sub")}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {items.map((it) => (
            <div key={it.titleKey} className="rounded-2xl bg-card border border-border p-5 lg:p-6 space-y-3 hover:border-primary/40 hover:-translate-y-1 transition-all">
              <div className="size-11 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <it.Icon className="size-5" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold">{t(it.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(it.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
