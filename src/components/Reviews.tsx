import { Star } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";

export function Reviews() {
  const { homeReviews, products, siteContent } = useAdminState();
  if (homeReviews.length === 0) return null;
  const cfg = siteContent.reviews;
  return (
    <section className="container-page py-16">
      <h2 className="text-3xl font-bold mb-2">{cfg.title}</h2>
      <p className="text-muted-foreground mb-10">{cfg.subtitle}</p>
      <div dir="ltr" className="relative overflow-hidden -mx-4 px-4 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="flex w-max gap-5 animate-marquee-slow pause-on-hover motion-reduce:animate-none">
          {[0, 1].map((half) => (
            <div key={half} aria-hidden={half === 1} className="flex gap-5 shrink-0">
              {homeReviews.map((r, idx) => {
                const product = products.find((p) => p.id === r.productId)?.name ?? "";
                return (
                  <article key={`${half}-${r.id}-${idx}`} className="w-[320px] sm:w-[380px] shrink-0 rounded-xl border border-border bg-card p-6 space-y-4">
                    <div className="flex gap-0.5 text-warning">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-5 ${i < r.rating ? "fill-current" : "opacity-30"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed min-h-[4em]">"{r.text}"</p>
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <div className="size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md" style={{ background: r.gradient }}>{r.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.city}{product ? ` · ${product}` : ""}</div>
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
