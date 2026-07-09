import { Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, MemoryStick, HardDrive, Zap } from "lucide-react";
import banner from "@/assets/builder-banner.jpg";
import { useI18n, type TKey } from "@/lib/i18n";

export function BuilderTeaser() {
  const { t } = useI18n();
  const items: { Icon: typeof Cpu; tk: TKey; nk: TKey }[] = [
    { Icon: Cpu, tk: "bt.cpu", nk: "bt.cpu.n" },
    { Icon: MemoryStick, tk: "bt.ram", nk: "bt.ram.n" },
    { Icon: HardDrive, tk: "bt.storage", nk: "bt.storage.n" },
    { Icon: Zap, tk: "bt.cooling", nk: "bt.cooling.n" },
  ];
  return (
    <section className="container-page py-16">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <img src={banner} alt="KA Tech build" width={1280} height={600} loading="lazy" className="absolute inset-0 size-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="relative grid lg:grid-cols-2 gap-8 p-8 lg:p-14">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium">
              <Cpu className="size-3.5" /> {t("bt.badge")}
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">{t("bt.title")}</h2>
            <p className="text-muted-foreground max-w-md">{t("bt.sub")}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/builder" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]">
                {t("bt.cta")} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            {items.map((it) => (
              <div key={it.tk} className="rounded-lg bg-card/80 backdrop-blur border border-border p-4">
                <it.Icon className="size-5 text-primary mb-2" />
                <div className="text-sm font-semibold">{t(it.tk)}</div>
                <div className="text-xs text-muted-foreground">{t(it.nk)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
