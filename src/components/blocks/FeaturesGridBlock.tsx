import {
  Sparkles,
  CheckCircle2,
  Layers,
  Cpu,
  Zap,
  ShieldCheck,
  Globe,
  Rocket,
  Code,
  Laptop,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

const ICON_MAP: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  check: CheckCircle2,
  layers: Layers,
  cpu: Cpu,
  zap: Zap,
  shield: ShieldCheck,
  globe: Globe,
  rocket: Rocket,
  code: Code,
  laptop: Laptop,
};

export interface FeatureItem {
  id?: string;
  icon?: string;
  title: Localized<string> | string;
  description: Localized<string> | string;
  link?: string;
}

const DEFAULT_ITEMS: FeatureItem[] = [
  {
    id: "f1",
    icon: "rocket",
    title: {
      fr: "Haute Performance & Vélocité",
      en: "High Performance & Speed",
      ar: "أداء عالٍ وسرعة فائقة",
    },
    description: {
      fr: "Une architecture optimisée garantissant des temps de réponse instantanés.",
      en: "Optimized architecture ensuring instantaneous response times.",
      ar: "بنية برمجية محسّنة تضمن سرعة استجابة فورية.",
    },
  },
  {
    id: "f2",
    icon: "shield",
    title: {
      fr: "Sécurité & Souveraineté",
      en: "Security & Sovereignty",
      ar: "أمان وسيادة تقنية",
    },
    description: {
      fr: "Isolation stricte, chiffrement avancé et hébergement sous votre contrôle total.",
      en: "Strict isolation, advanced encryption and hosting under your total control.",
      ar: "عزل محكم، تشفير متقدم واستضافة تحت سيطرتك الكاملة.",
    },
  },
  {
    id: "f3",
    icon: "cpu",
    title: {
      fr: "Technologies de Pointe",
      en: "Cutting-Edge Technologies",
      ar: "تقنيات متقدمة وحديثة",
    },
    description: {
      fr: "Composants modernes, scalables et interopérables sans compromis technique.",
      en: "Modern, scalable and interoperable components without technical compromise.",
      ar: "مكونات عصرية، قابلة للتطوير ومتكاملة بدون أي تنازل تقني.",
    },
  },
];

export function FeaturesGridBlock({ config }: { config: BlockConfig }) {
  const L = useLocalize();
  const p = config.props || {};

  const title = p.title ? String(L(p.title as Localized<string>) || "") : "";
  const subtitle = p.subtitle ? String(L(p.subtitle as Localized<string>) || "") : "";
  const rawItems = (
    Array.isArray(p.items) && p.items.length > 0 ? p.items : DEFAULT_ITEMS
  ) as FeatureItem[];
  const cols = Number(p.columns) || 3;

  const gridColsClass =
    cols === 2
      ? "md:grid-cols-2"
      : cols === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="container-page py-10 md:py-16 text-start">
      {(title || subtitle) && (
        <div className="max-w-2xl mb-10">
          {title && (
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground text-base leading-relaxed">{subtitle}</p>
          )}
        </div>
      )}

      <div className={`grid gap-6 ${gridColsClass}`}>
        {rawItems.map((item, idx) => {
          const Icon = (item.icon && ICON_MAP[item.icon.toLowerCase()]) || Sparkles;
          const itemTitle = String(L(item.title as Localized<string>) || "");
          const itemDesc = String(L(item.description as Localized<string>) || "");

          return (
            <div
              key={item.id || idx}
              className="group rounded-2xl border border-border/70 bg-card/60 p-6 shadow-xs hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 mb-5">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {itemTitle}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{itemDesc}</p>
              </div>

              {item.link && (
                <div className="mt-5 pt-3 border-t border-border/40">
                  <Link
                    to={item.link}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>{L({ fr: "En savoir plus", en: "Learn more", ar: "اكتشف المزيد" })}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
