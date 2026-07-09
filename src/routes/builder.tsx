import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cpu, MemoryStick, HardDrive, Zap, Box, CircuitBoard, Monitor, Snowflake, Check, MessageCircle } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/builder")({
  component: BuilderPage,
  head: () => ({
    meta: [
      { title: "KA Tech — Configurateur PC" },
      { property: "og:title", content: "KA Tech — Configurateur PC" },
      { property: "og:url", content: "/builder" },
    ],
    links: [{ rel: "canonical", href: "/builder" }],
  }),
});

type Part = { id: string; name: string; price: number };
type Step = { id: string; labelKey: TKey; Icon: typeof Cpu; options: Part[] };

const STEPS: Step[] = [
  { id: "case", labelKey: "bp.step.case", Icon: Box, options: [
    { id: "case-a", name: "NZXT H5 Flow", price: 14000 },
    { id: "case-b", name: "Lian Li Lancool 216", price: 18500 },
    { id: "case-c", name: "Corsair 4000D Airflow", price: 16000 },
  ]},
  { id: "mb", labelKey: "bp.step.mb", Icon: CircuitBoard, options: [
    { id: "mb-a", name: "MSI B650 Tomahawk", price: 28000 },
    { id: "mb-b", name: "ASUS X670E-Plus", price: 52000 },
    { id: "mb-c", name: "Gigabyte B760 Aorus", price: 24000 },
  ]},
  { id: "cpu", labelKey: "bp.step.cpu", Icon: Cpu, options: [
    { id: "cpu-a", name: "AMD Ryzen 5 7600", price: 32000 },
    { id: "cpu-b", name: "AMD Ryzen 7 7700X", price: 52000 },
    { id: "cpu-c", name: "Intel Core i7-14700K", price: 65000 },
  ]},
  { id: "ram", labelKey: "bp.step.ram", Icon: MemoryStick, options: [
    { id: "ram-a", name: "16GB DDR5 6000", price: 14000 },
    { id: "ram-b", name: "32GB DDR5 6000", price: 26000 },
    { id: "ram-c", name: "64GB DDR5 6000", price: 52000 },
  ]},
  { id: "ssd", labelKey: "bp.step.ssd", Icon: HardDrive, options: [
    { id: "ssd-a", name: "500GB NVMe Gen4", price: 9000 },
    { id: "ssd-b", name: "1TB NVMe Gen4", price: 16000 },
    { id: "ssd-c", name: "2TB NVMe Gen4", price: 32000 },
  ]},
  { id: "gpu", labelKey: "bp.step.gpu", Icon: Monitor, options: [
    { id: "gpu-a", name: "RTX 4060 8GB", price: 60000 },
    { id: "gpu-b", name: "RTX 4070 Super 12GB", price: 110000 },
    { id: "gpu-c", name: "RTX 4080 Super 16GB", price: 200000 },
  ]},
  { id: "psu", labelKey: "bp.step.psu", Icon: Zap, options: [
    { id: "psu-a", name: "650W 80+ Bronze", price: 9500 },
    { id: "psu-b", name: "750W 80+ Gold", price: 14500 },
    { id: "psu-c", name: "850W 80+ Gold", price: 19000 },
  ]},
  { id: "cool", labelKey: "bp.step.cool", Icon: Snowflake, options: [
    { id: "cool-a", name: "DeepCool AK620", price: 9000 },
    { id: "cool-b", name: "Arctic LF II 280", price: 18000 },
    { id: "cool-c", name: "NZXT Kraken X73", price: 28000 },
  ]},
];

function BuilderPage() {
  const [picks, setPicks] = useState<Record<string, Part>>({});
  const { t } = useI18n();
  const total = Object.values(picks).reduce((s, p) => s + p.price, 0);
  const completion = Math.round((Object.keys(picks).length / STEPS.length) * 100);
  const missing = STEPS.filter((s) => !picks[s.id]);
  const remainingLabel = missing.length === 0
    ? t("bp.send")
    : `Choisissez ${missing.length} pièce(s) pour terminer votre config`;

  const waMsg = encodeURIComponent(
    `${t("bp.wa.greeting")}\n\n${STEPS.map((s) => {
      const p = picks[s.id];
      return p ? `• ${t(s.labelKey)}: ${p.name} (${formatDZD(p.price)})` : `• ${t(s.labelKey)}: —`;
    }).join("\n")}\n\n${t("bp.wa.total")}: ${formatDZD(total)}`
  );

  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8 max-w-2xl">
        <span className="text-xs uppercase tracking-[0.25em] text-primary">{t("bp.kicker")}</span>
        <h1 className="text-3xl lg:text-4xl font-bold mt-2">{t("bp.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("bp.sub")}</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const picked = picks[step.id];
            return (
              <section key={step.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <span className="size-8 rounded-md bg-primary/15 text-primary inline-flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <step.Icon className="size-5 text-muted-foreground" />
                  <h2 className="text-base font-semibold flex-1">{t(step.labelKey)}</h2>
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
                  <span className="text-muted-foreground">{t(s.labelKey)}</span>
                  <span className="text-foreground line-clamp-1 text-right">{picks[s.id]?.name ?? "—"}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border mt-5 pt-5 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t("bp.total")}</span>
              <span className="text-2xl font-bold">{formatDZD(total)}</span>
            </div>
            <a
              href={`https://wa.me/213000000000?text=${waMsg}`}
              target="_blank" rel="noopener noreferrer"
              className={`mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-md font-semibold transition-colors ${completion === 100 ? "bg-success text-background hover:opacity-90" : "bg-card border border-border text-muted-foreground pointer-events-none"}`}
            >
              <MessageCircle className="size-4" />
              {remainingLabel}
            </a>
            {missing.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li className="font-medium text-foreground">Pièces restantes :</li>
                {missing.map((s) => (<li key={s.id}>• {t(s.labelKey)}</li>))}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{t("bp.note")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
