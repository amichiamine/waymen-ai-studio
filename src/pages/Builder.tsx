import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Zap,
  Box,
  CircuitBoard,
  Monitor,
  Snowflake,
  Check,
  MessageCircle,
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { formatDZD, categoryMeta, isCustomBuild, type Product } from "@/data/products";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  useAdminState,
  upsertProduct,
  type BuilderStep,
  type BuilderPart,
} from "@/lib/admin-store";

const ICONS: Record<BuilderStep["icon"], typeof Cpu> = {
  case: Box,
  mb: CircuitBoard,
  cpu: Cpu,
  ram: MemoryStick,
  ssd: HardDrive,
  gpu: Monitor,
  psu: Zap,
  cool: Snowflake,
};

/**
 * Correspondance étape → clé de specs du catalogue. Permet de matérialiser une
 * configuration sous la forme d'un `Product` normal (voir `buildProduct`).
 * `cool` n'a pas d'équivalent dans `SpecKey` : il reste dans le `specLine`.
 */
const STEP_SPEC_KEY: Partial<Record<BuilderStep["icon"], keyof Product["specs"]>> = {
  case: "form",
  mb: "motherboard",
  cpu: "cpu",
  ram: "ram",
  ssd: "storage",
  gpu: "gpu",
  psu: "psu",
};

/* -------------------------------------------------------------------------- */
/*  Contrôles de compatibilité                                                */
/* -------------------------------------------------------------------------- */

/**
 * IMPORTANT — limites du modèle de données actuel.
 *
 * `BuilderPart` vaut exactement `{ id: string; name: string; price: number }` :
 * aucun champ socket, TDP, format (ATX/mATX/ITX), génération de mémoire ni
 * hauteur de ventirad. Les contrôles ci-dessous *infèrent* donc ce qu'ils
 * peuvent depuis le libellé commercial de la pièce, et **restent silencieux dès
 * que le libellé n'est pas reconnu** : mieux vaut ne rien affirmer que produire
 * un faux positif sur une pièce saisie librement depuis /admin.
 *
 * Contrôles impossibles en l'état, à rouvrir quand `BuilderPart` portera de
 * vrais attributs (phase 4) : format carte mère ↔ boîtier, socket du
 * refroidisseur, hauteur du ventirad ↔ largeur du boîtier, longueur du GPU,
 * nombre et type de connecteurs PCIe de l'alimentation.
 */

type Platform = "am4" | "am5" | "lga1700";

const PLATFORM_LABEL: Record<Platform, string> = {
  am4: "AMD AM4",
  am5: "AMD AM5",
  lga1700: "Intel LGA1700",
};

/** Générations de mémoire acceptées par chaque plateforme. */
const PLATFORM_MEMORY: Record<Platform, readonly ("ddr4" | "ddr5")[]> = {
  am4: ["ddr4"],
  am5: ["ddr5"],
  lga1700: ["ddr4", "ddr5"],
};

/** Socket déduit du nom commercial d'un processeur. `null` si non reconnu. */
function cpuPlatform(name: string): Platform | null {
  const n = name.toLowerCase();
  const ryzen = n.match(/ryzen\s*\d\s*(\d)\d{3}/);
  if (ryzen) {
    const series = Number(ryzen[1]);
    if (series >= 7) return "am5";
    if (series >= 3) return "am4";
    return null;
  }
  const intel = n.match(/core\s*(?:ultra\s*)?i\d[\s-]*(\d{4,5})/);
  if (intel) {
    const model = intel[1];
    const gen = model.length === 5 ? Number(model.slice(0, 2)) : Number(model.slice(0, 1));
    if (gen >= 12 && gen <= 14) return "lga1700";
    return null;
  }
  return null;
}

/**
 * Chipsets connus, par plateforme. Une liste explicite vaut mieux qu'une
 * expression générique : `X670` (AM5) et `H670` (LGA1700) ne diffèrent que
 * d'une lettre, et une règle trop large se tromperait de socket.
 */
const BOARD_CHIPSETS: Record<Platform, readonly string[]> = {
  am5: ["A620", "B650", "B840", "B850", "X670", "X870"],
  lga1700: ["H610", "B660", "H670", "Z690", "B760", "H770", "Z790"],
  am4: ["A320", "A520", "B350", "B450", "B550", "X370", "X470", "X570"],
};

/** Socket déduit du chipset présent dans le nom d'une carte mère. */
function boardPlatform(name: string): Platform | null {
  // Le suffixe `E` (X670E, X870E) désigne la même plateforme que le chipset nu.
  const codes = name.toUpperCase().match(/\b[ABHXZ]\d{3}E?\b/g);
  if (!codes) return null;
  for (const raw of codes) {
    const code = raw.endsWith("E") ? raw.slice(0, -1) : raw;
    for (const platform of Object.keys(BOARD_CHIPSETS) as Platform[]) {
      if (BOARD_CHIPSETS[platform].includes(code)) return platform;
    }
  }
  return null;
}

/** Génération de mémoire lue dans le nom d'un kit RAM. */
function memoryGeneration(name: string): "ddr4" | "ddr5" | null {
  const m = name.toLowerCase().match(/\bddr([45])\b/);
  if (!m) return null;
  return m[1] === "5" ? "ddr5" : "ddr4";
}

/** Puissance nominale lue dans le nom d'une alimentation, en watts. */
function psuWatts(name: string): number | null {
  const m = name.toLowerCase().match(/(\d{3,4})\s*w\b/);
  if (!m) return null;
  const w = Number(m[1]);
  return Number.isFinite(w) && w > 0 ? w : null;
}

/**
 * Alimentation minimale conseillée par le constructeur pour la classe de carte
 * graphique détectée. Ce sont les recommandations « système » publiées par
 * NVIDIA/AMD, pas un TDP calculé : les pièces ne portant aucun TDP, c'est le
 * seul seuil défendable sans inventer de données. À remplacer par un vrai
 * cumul de TDP quand `BuilderPart` exposera le champ.
 */
const GPU_MIN_PSU: readonly { pattern: RegExp; watts: number }[] = [
  { pattern: /\brtx\s*4090\b/, watts: 850 },
  { pattern: /\brtx\s*4080\b/, watts: 750 },
  { pattern: /\brtx\s*40?70\b/, watts: 650 },
  { pattern: /\brtx\s*40?60\b/, watts: 550 },
  { pattern: /\brx\s*7900\b/, watts: 800 },
  { pattern: /\brx\s*78\d0\b/, watts: 700 },
];

function recommendedPsu(gpuName: string): number | null {
  const n = gpuName.toLowerCase();
  for (const rule of GPU_MIN_PSU) {
    if (rule.pattern.test(n)) return rule.watts;
  }
  return null;
}

type Issue = {
  id: string;
  /** `error` bloque l'ajout au panier, `warning` informe sans bloquer. */
  severity: "error" | "warning";
  /** Étapes concernées, pour que le visiteur sache quoi corriger. */
  steps: string[];
  detail: string;
};

/**
 * Applique tous les contrôles réalisables sur la sélection courante.
 * Une pièce manquante ou un libellé non reconnu n'émet jamais d'anomalie.
 */
function checkCompatibility(steps: BuilderStep[], picks: Record<string, BuilderPart>): Issue[] {
  const issues: Issue[] = [];
  const byIcon = new Map<BuilderStep["icon"], { step: BuilderStep; part: BuilderPart }>();
  for (const step of steps) {
    const part = picks[step.id];
    if (part) byIcon.set(step.icon, { step, part });
  }

  const cpu = byIcon.get("cpu");
  const mb = byIcon.get("mb");
  const ram = byIcon.get("ram");
  const psu = byIcon.get("psu");
  const gpu = byIcon.get("gpu");

  // 1. Socket processeur ↔ chipset de la carte mère.
  if (cpu && mb) {
    const a = cpuPlatform(cpu.part.name);
    const b = boardPlatform(mb.part.name);
    if (a && b && a !== b) {
      issues.push({
        id: "socket",
        severity: "error",
        steps: [cpu.step.label, mb.step.label],
        detail: `${cpu.part.name} (${PLATFORM_LABEL[a]}) ≠ ${mb.part.name} (${PLATFORM_LABEL[b]})`,
      });
    }
  }

  // 2. Génération de mémoire ↔ plateforme (déduite du CPU, sinon de la carte mère).
  if (ram) {
    const gen = memoryGeneration(ram.part.name);
    const host = cpu ? cpuPlatform(cpu.part.name) : null;
    const platform = host ?? (mb ? boardPlatform(mb.part.name) : null);
    const anchor = host ? cpu : mb;
    if (gen && platform && anchor && !PLATFORM_MEMORY[platform].includes(gen)) {
      issues.push({
        id: "memory",
        severity: "error",
        steps: [ram.step.label, anchor.step.label],
        detail: `${ram.part.name} (${gen.toUpperCase()}) ≠ ${PLATFORM_LABEL[platform]}`,
      });
    }
  }

  // 3. Puissance de l'alimentation ↔ recommandation constructeur du GPU.
  if (psu && gpu) {
    const watts = psuWatts(psu.part.name);
    const needed = recommendedPsu(gpu.part.name);
    if (watts !== null && needed !== null && watts < needed) {
      issues.push({
        id: "psu",
        severity: "warning",
        steps: [psu.step.label, gpu.step.label],
        detail: `${psu.part.name} < ${needed} W — ${gpu.part.name}`,
      });
    }
  }

  return issues;
}

/* -------------------------------------------------------------------------- */

export default function Builder() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useStore();
  const { builderSteps: STEPS, siteSettings, products } = useAdminState();
  const [picks, setPicks] = useState<Record<string, BuilderPart>>({});

  const total = Object.values(picks).reduce((s, p) => s + p.price, 0);
  const completion =
    STEPS.length === 0 ? 0 : Math.round((Object.keys(picks).length / STEPS.length) * 100);
  const missing = STEPS.filter((s) => !picks[s.id]);
  const complete = STEPS.length > 0 && missing.length === 0;

  const issues = useMemo(() => checkCompatibility(STEPS, picks), [STEPS, picks]);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const blocked = errors.length > 0;

  const remainingLabel = complete ? t("bp.send") : t("bp.complete");

  // Le parcours WhatsApp est inchangé : il reste ouvert même en cas d'anomalie,
  // c'est justement le canal où un conseiller tranche un cas limite.
  const waMsg = encodeURIComponent(
    `${t("bp.wa.greeting")}\n\n${STEPS.map((s) => {
      const p = picks[s.id];
      return p ? `• ${s.label}: ${p.name} (${formatDZD(p.price)})` : `• ${s.label}: —`;
    }).join("\n")}\n\n${t("bp.wa.total")}: ${formatDZD(total)}`,
  );

  const waHref = siteSettings.whatsapp
    ? `https://wa.me/${siteSettings.whatsapp}?text=${waMsg}`
    : "#";

  /**
   * Représentation d'une configuration dans le panier.
   *
   * Le panier de `store.tsx` est une liste de `{ product_id, quantity }`, et
   * `Cart`/`Checkout` résolvent chaque `product_id` dans le catalogue puis
   * **écartent silencieusement** les lignes non résolues. Pousser un
   * identifiant synthétique ferait donc disparaître la configuration sans
   * message (AGENTS.md §7). Plutôt que d'étendre `store.tsx` (hors périmètre),
   * on matérialise l'assemblage comme un vrai `Product` de la catégorie
   * `builds` — qui existe déjà dans le modèle — via `upsertProduct`, puis on
   * ajoute son identifiant au panier comme n'importe quel article.
   *
   * L'identifiant est dérivé des pièces choisies, donc stable : réajouter la
   * même configuration incrémente la quantité au lieu de créer un doublon, et
   * la commande reste résoluble côté panier, paiement et back-office.
   */
  function buildProduct(): Product {
    const ordered = STEPS.map((s) => ({ step: s, part: picks[s.id] }));
    const id = `build-${ordered.map(({ part }) => part.id).join("-")}`;
    const specs: Product["specs"] = {};
    for (const { step, part } of ordered) {
      const key = STEP_SPEC_KEY[step.icon];
      if (key) specs[key] = part.name;
    }
    const headline = [byIconName(ordered, "cpu"), byIconName(ordered, "gpu")].filter(Boolean);
    // Visuel emprunté à un assemblage du *catalogue* : une configuration
    // client n'est pas une source d'illustration valable.
    const cover = products.find((p) => p.category === "builds" && !isCustomBuild(p))?.image ?? "";
    return {
      id,
      name: `${t(categoryMeta.builds.labelKey)} — ${headline.join(" · ")}`,
      brand: siteSettings.storeName,
      category: "builds",
      use: [],
      specLine: ordered.map(({ part }) => part.name).join(" · "),
      specs,
      price: total,
      stock: "in",
      image: cover,
      // Marque la ligne comme privée : résoluble par identifiant (panier,
      // paiement, fiche produit) mais exclue de tous les listings publics.
      customBuild: true,
    };
  }

  async function handleAddToCart() {
    if (!complete || blocked) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    const product = buildProduct();
    upsertProduct(product);
    await addToCart(product.id);
    toast.success(t("pd.added"), { description: product.specLine });
  }

  return (
    <div className="container-page py-8 lg:py-12">
      <Helmet>
        <title>{t("bp.title")}</title>
        <meta name="description" content={t("bp.sub")} />
        <link rel="canonical" href="/builder" />
      </Helmet>

      <header className="mb-8 max-w-2xl">
        <span className="text-xs uppercase tracking-[0.25em] text-primary">{t("bp.kicker")}</span>
        <h1 className="text-3xl lg:text-4xl font-bold mt-2">{t("bp.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("bp.sub")}</p>
      </header>

      {STEPS.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {t("bp.complete")}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const picked = picks[step.id];
              const Icon = ICONS[step.icon] ?? Cpu;
              const flagged = issues.some((issue) => issue.steps.includes(step.label));
              return (
                <section
                  key={step.id}
                  className={`rounded-xl border bg-card overflow-hidden ${flagged ? "border-destructive" : "border-border"}`}
                >
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <span className="size-8 rounded-md bg-primary/15 text-primary inline-flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <Icon className="size-5 text-muted-foreground" />
                    <h2 className="text-base font-semibold flex-1">{step.label}</h2>
                    {flagged && <AlertTriangle className="size-4 text-destructive" />}
                    {picked && (
                      <span className="text-xs text-success inline-flex items-center gap-1">
                        <Check className="size-3.5" /> {t("bp.picked")}
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-px bg-border">
                    {step.options.map((opt) => {
                      const active = picked?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setPicks((s) => ({ ...s, [step.id]: opt }))}
                          className={`bg-card text-start p-4 transition-colors hover:bg-card/60 ${active ? "ring-2 ring-primary -ring-offset-1 bg-primary/5" : ""}`}
                        >
                          <div className="text-sm font-medium">{opt.name}</div>
                          <div className="text-sm font-bold text-primary mt-1">
                            {formatDZD(opt.price)}
                          </div>
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
                <div
                  className="h-full transition-all"
                  style={{ width: `${completion}%`, background: "var(--gradient-glow)" }}
                />
              </div>
              <ul className="space-y-2 text-sm">
                {STEPS.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="text-foreground line-clamp-1 text-end">
                      {picks[s.id]?.name ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>

              {issues.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {errors.concat(warnings).map((issue) => (
                    <li
                      key={issue.id}
                      className={`rounded-md border p-3 text-xs leading-relaxed ${
                        issue.severity === "error"
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-warning/50 bg-warning/10 text-warning"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        {issue.severity === "error" ? (
                          <AlertCircle className="size-3.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="size-3.5 shrink-0" />
                        )}
                        {issue.steps.join(" + ")}
                      </span>
                      <span className="mt-1 block text-foreground/80">{issue.detail}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-border mt-5 pt-5 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t("bp.total")}</span>
                <span className="text-2xl font-bold">{formatDZD(total)}</span>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!complete || blocked}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-md font-semibold transition-colors bg-primary text-primary-foreground hover:opacity-90 disabled:bg-card disabled:border disabled:border-border disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:opacity-100"
              >
                <ShoppingCart className="size-4" />
                {complete ? t("pd.addCart") : t("bp.complete")}
              </button>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 w-full inline-flex items-center justify-center gap-2 h-12 rounded-md font-semibold transition-colors ${complete && siteSettings.whatsapp ? "bg-success text-background hover:opacity-90" : "bg-card border border-border text-muted-foreground pointer-events-none"}`}
              >
                <MessageCircle className="size-4" />
                {remainingLabel}
              </a>

              {missing.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li className="font-medium text-foreground">{t("bp.complete")}</li>
                  {missing.map((s) => (
                    <li key={s.id}>• {s.label}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                {t("bp.note")}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Nom de la pièce choisie pour une étape donnée, chaîne vide si absente. */
function byIconName(
  ordered: { step: BuilderStep; part: BuilderPart }[],
  icon: BuilderStep["icon"],
): string {
  return ordered.find((o) => o.step.icon === icon)?.part.name ?? "";
}
