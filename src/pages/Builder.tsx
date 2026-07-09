import { useState, useEffect } from "react";
import { Cpu, MemoryStick, HardDrive, Zap, Box, CircuitBoard, Monitor, Snowflake, Check, MessageCircle } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useI18n } from "@/lib/i18n";
import { useAdminState, type BuilderStep, type BuilderPart } from "@/lib/admin-store";

const ICONS: Record<BuilderStep["icon"], typeof Cpu> = {
  case: Box, mb: CircuitBoard, cpu: Cpu, ram: MemoryStick,
  ssd: HardDrive, gpu: Monitor, psu: Zap, cool: Snowflake,
};

export default function Builder() {
  useEffect(() => { document.title = `KA Tech — Configurateur PC`; }, []);
  const { t } = useI18n();
  const { builderSteps: STEPS, siteSettings } = useAdminState();
  const [picks, setPicks] = useState<Record<string, BuilderPart>>({});
  const total = Object.values(picks).reduce((s, p) => s + p.price, 0);
  const completion = STEPS.length === 0 ? 0 : Math.round((Object.keys(picks).length / STEPS.length) * 100);
  const missing = STEPS.filter((s) => !picks[s.id]);
  const remainingLabel = missing.length === 0
    ? t("bp.send")
    : `Choisissez ${missing.length} pièce(s) pour terminer votre config`;

  const waMsg = encodeURIComponent(
    `${t("bp.wa.greeting")}\n\n${STEPS.map((s) => {
      const p = picks[s.id];
      return p ? `• ${s.label}: ${p.name} (${formatDZD(p.price)})` : `• ${s.label}: —`;
    }).join("\n")}\n\n${t("bp.wa.total")}: ${formatDZD(total)}`
  );

  const waHref = siteSettings.whatsapp ? `https://wa.me/${siteSettings.whatsapp}?text=${waMsg}` : "#";

  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8 max-w-2xl">
        <span className="text-xs uppercase tracking-[0.25em] text-primary">{t("bp.kicker")}</span>
        <h1 className="text-3xl lg:text-4xl font-bold mt-2">{t("bp.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("bp.sub")}</p>
      </header>

      {STEPS.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Aucune étape de configuration disponible.
        </div>
      ) : (
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const picked = picks[step.id];
            const Icon = ICONS[step.icon] ?? Cpu;
            return (
              <section key={step.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <span className="size-8 rounded-md bg-primary/15 text-primary inline-flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <Icon className="size-5 text-muted-foreground" />
                  <h2 className="text-base font-semibold flex-1">{step.label}</h2>
                  {picked && <span className="text-xs text-success inline-flex items-center gap-1"><Check className="size-3.5" /> {t("bp.picked")}</span>}
                </div>
                <div className="grid sm:grid-cols-3 gap-px bg-border">
                  {step.options.map((opt) => {
                    const active = picked?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setPicks((s) => ({ ...s, [step.id]: opt }))}
                        className={`bg-card text-left p-4 transition-colors hover:bg-card/60 ${active ? "ring-2 ring-primary -ring-offset-1 bg-primary/5" : ""}`}
                      >
                        <div className="text-sm font-medium">{opt.name}</div>
                        <div className="text-sm font-bold text-primary mt-1">{formatDZD(opt.price)}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="sticky top-4 lg:top-20 self-start space-y-4 z-20">
          <div className="rounded-xl border border-border bg-card p-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t("bp.summary")}</h3>
              <span className="text-xs text-muted-foreground">{completion}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden mb-5">
              <div className="h-full transition-all" style={{ width: `${completion}%`, background: "var(--gradient-glow)" }} />
            </div>
            <ul className="space-y-2 text-sm">
              {STEPS.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="text-foreground line-clamp-1 text-right">{picks[s.id]?.name ?? "—"}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border mt-5 pt-5 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t("bp.total")}</span>
              <span className="text-2xl font-bold">{formatDZD(total)}</span>
            </div>
            <a
              href={waHref}
              target="_blank" rel="noopener noreferrer"
              className={`mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-md font-semibold transition-colors ${completion === 100 && siteSettings.whatsapp ? "bg-success text-background hover:opacity-90" : "bg-card border border-border text-muted-foreground pointer-events-none"}`}
            >
              <MessageCircle className="size-4" />
              {remainingLabel}
            </a>
            {missing.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li className="font-medium text-foreground">Pièces restantes :</li>
                {missing.map((s) => (<li key={s.id}>• {s.label}</li>))}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{t("bp.note")}</p>
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}
