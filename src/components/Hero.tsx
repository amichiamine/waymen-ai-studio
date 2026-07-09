import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import heroImg from "@/assets/hero-laptop.jpg";
import { useAdminState } from "@/lib/admin-store";
import { getIcon, type IconName } from "@/lib/site-content";

export function Hero() {
  const { siteContent } = useAdminState();
  const h = siteContent.hero;
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} aria-hidden />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, oklch(0.58 0.22 262 / 0.18), transparent 50%), radial-gradient(circle at 20% 80%, oklch(0.68 0.22 262 / 0.12), transparent 50%)",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.62 0.19 255) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.19 255) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      <div className="container-page flex flex-col items-center py-16 lg:py-24">
        <div className="space-y-6 text-center max-w-3xl mx-auto">
          {h.badge && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium animate-fade-in-up">
              <Flame className="size-3.5" /> {h.badge}
            </span>
          )}
          <h1
            className="font-bold leading-[1.05] animate-fade-in-up delay-100"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            {h.title1}
            <br />
            <span
              className="inline-block bg-clip-text text-transparent text-glow"
              style={{ backgroundImage: "var(--gradient-glow)" }}
            >
              {h.title2}
            </span>
          </h1>
          {h.subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in-up delay-200">
              {h.subtitle}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up delay-300">
            {h.primaryCta.label && (
              <Link
                to={h.primaryCta.href}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]"
              >
                {h.primaryCta.label} <ArrowRight className="size-4" />
              </Link>
            )}
            {h.secondaryCta.label && (
              <Link
                to={h.secondaryCta.href}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-md border border-border text-foreground hover:border-primary/60 hover:bg-card transition-colors"
              >
                {h.secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
        {h.kpis.length > 0 && (
          <div
            className="w-full max-w-2xl mx-auto grid gap-3 pt-8 animate-fade-in-up delay-300"
            style={{ gridTemplateColumns: `repeat(${Math.min(h.kpis.length, 4)}, minmax(0,1fr))` }}
          >
            {h.kpis.map((k) => <Kpi key={k.id} icon={k.icon} n={k.value} l={k.label} />)}
          </div>
        )}
        {h.showImage && (
          <div className="relative w-full max-w-[700px] mx-auto aspect-[16/9] mt-10 animate-fade-in-up delay-300">
            <div
              className="absolute inset-0 blur-3xl animate-glow-strong"
              style={{ background: "var(--gradient-glow)" }}
              aria-hidden
            />
            <div className="relative w-full h-full overflow-hidden rounded-2xl border border-border shadow-2xl shadow-[var(--shadow-card)]">
              <img
                src={heroImg}
                alt="KA Tech"
                width={1600}
                height={900}
                className="w-full h-full object-cover animate-hero-zoom"
              />
              <div className="pointer-events-none absolute inset-y-0 -inset-x-1/3 w-1/3 animate-hero-shine" aria-hidden />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Kpi({ icon, n, l }: { icon: IconName; n: string; l: string }) {
  const Icon = getIcon(icon);
  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-3 sm:p-4 text-start hover:border-primary/40 hover:-translate-y-0.5 transition-all">
      <Icon className="size-5 text-primary mb-2" />
      <div className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{n}</div>
      <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{l}</div>
    </div>
  );
}
