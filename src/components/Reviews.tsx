import { Star } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { products } from "@/data/products";

const reviews: { nameKey: TKey; cityKey: TKey; productId: string; textKey: TKey; stars: number; gradient: string }[] = [
  { nameKey: "rev.1.name", cityKey: "city.algiers", productId: "rog-strix-g16", textKey: "rev.1.text", stars: 5, gradient: "linear-gradient(135deg,#3b82f6,#1e40af)" },
  { nameKey: "rev.2.name", cityKey: "city.oran", productId: "macbook-air-m3", textKey: "rev.2.text", stars: 5, gradient: "linear-gradient(135deg,#a855f7,#6d28d9)" },
  { nameKey: "rev.3.name", cityKey: "city.constantine", productId: "build-mid-gaming", textKey: "rev.3.text", stars: 5, gradient: "linear-gradient(135deg,#10b981,#047857)" },
];

export function Reviews() {
  const { t } = useI18n();
  return (
    <section className="container-page py-16">
      <h2 className="text-3xl font-bold mb-2">{t("rev.title")}</h2>
      <p className="text-muted-foreground mb-10">{t("rev.sub")}</p>
      <div dir="ltr" className="relative overflow-hidden -mx-4 px-4 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="flex w-max gap-5 animate-marquee-slow pause-on-hover motion-reduce:animate-none">
          {[0, 1].map((half) => (
            <div key={half} aria-hidden={half === 1} className="flex gap-5 shrink-0">
              {reviews.map((r, idx) => {
                const name = t(r.nameKey);
                const product = products.find((p) => p.id === r.productId)?.name ?? "";
                return (
                  <article key={`${half}-${r.nameKey}-${idx}`} className="w-[320px] sm:w-[380px] shrink-0 rounded-xl border border-border bg-card p-6 space-y-4">
                    <div className="flex gap-0.5 text-warning">
                      {Array.from({ length: 5 }).map((_, i) => (<Star key={i} className="size-5 fill-current" />))}
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed min-h-[4em]">"{t(r.textKey)}"</p>
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <div className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md" style={{ background: r.gradient }}>{name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-semibold">{name}</div>
                        <div className="text-xs text-muted-foreground">{t(r.cityKey)} · {product}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
