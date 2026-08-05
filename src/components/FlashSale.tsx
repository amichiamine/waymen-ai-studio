import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useI18n, useLocalize } from "@/lib/i18n";
import { useProducts } from "@/lib/useProducts";
import { useAdminState } from "@/lib/admin-store";
import { Reveal } from "@/components/Reveal";

function useCountdown(targetMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, targetMs - now);
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff / 3_600_000) % 24),
    m: Math.floor((diff / 60_000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

export function FlashSale() {
  const { siteContent } = useAdminState();
  const cfg = siteContent.flashSale;
  const [target] = useState(() => Date.now() + Math.max(1, cfg.countdownHours) * 3_600_000);
  const t = useCountdown(target);
  const { t: tr } = useI18n();
  const L = useLocalize();
  const products = useProducts();
  const sale = useMemo(() => products.filter((p) => p.sale).slice(0, 4), [products]);

  return (
    <section className="py-16" style={{ background: "#0f172a" }}>
      <div className="container-page text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between items-center text-center lg:text-start gap-6 mb-8">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-semibold">
              <Flame className="size-3.5" /> {L(cfg.badge)}
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">{L(cfg.title)}</h2>
          </div>
          <div
            className="flex items-center justify-center gap-1.5 md:gap-2 mx-auto lg:mx-0"
            dir="ltr"
          >
            <TimeBox v={t.d} l={tr("flash.days")} />
            <Sep />
            <TimeBox v={t.h} l={tr("flash.hrs")} />
            <Sep />
            <TimeBox v={t.m} l={tr("flash.min")} />
            <Sep />
            <TimeBox v={t.s} l={tr("flash.sec")} />
          </div>
        </div>
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {sale.map((p, i) => (
            <Reveal key={p.id} variant="up" delay={i * 80}>
              <ProductCard p={p} />
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            to={cfg.viewAllHref}
            className="group inline-flex items-center gap-2 h-11 px-5 rounded-md border border-white/20 bg-white/5 text-white transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 hover:border-white/40"
          >
            {L(cfg.viewAllLabel)}{" "}
            <ArrowRight className="size-4 rtl:rotate-180 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TimeBox({ v, l }: { v: number; l: string }) {
  return (
    <div className="min-w-[56px] sm:min-w-[72px] md:min-w-[88px] rounded-xl bg-white/5 border border-white/10 p-2 sm:p-3 text-center">
      <div className="text-2xl sm:text-4xl md:text-6xl font-bold tabular-nums text-white leading-none">
        {String(v).padStart(2, "0")}
      </div>
      <div className="text-[9px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 tracking-widest text-white/60 uppercase">
        {l}
      </div>
    </div>
  );
}
function Sep() {
  return <span className="text-xl sm:text-3xl md:text-5xl text-white/40 font-bold">:</span>;
}
