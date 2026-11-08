import { Check, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { Button } from "@/components/ui/button";

export interface PricingPlan {
  id?: string;
  name: Localized<string> | string;
  price: string;
  period?: Localized<string> | string;
  badge?: Localized<string> | string;
  popular?: boolean;
  features: Array<Localized<string> | string>;
  ctaText?: Localized<string> | string;
  ctaLink?: string;
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "p1",
    name: { fr: "Essentiel", en: "Starter", ar: "الأساسي" },
    price: "49 000 DZD",
    period: { fr: "/ projet", en: "/ project", ar: "/ مشروع" },
    popular: false,
    features: [
      {
        fr: "Architecture socle optimisée",
        en: "Optimized core architecture",
        ar: "بنية أساسية محسّنة",
      },
      {
        fr: "Interface responsive Mobile/Desktop",
        en: "Responsive Mobile/Desktop UI",
        ar: "واجهة متجاوبة للهاتف والحاسوب",
      },
      {
        fr: "Documentation technique standard",
        en: "Standard technical docs",
        ar: "توثيق تقني قياسي",
      },
      {
        fr: "Support garanti 30 jours",
        en: "30-day guaranteed support",
        ar: "دعم فني مضمون 30 يوماً",
      },
    ],
    ctaText: { fr: "Démarrer", en: "Get Started", ar: "ابدأ الآن" },
    ctaLink: "/contact",
  },
  {
    id: "p2",
    name: { fr: "Professionnel", en: "Professional", ar: "المحترف" },
    price: "129 000 DZD",
    period: { fr: "/ projet", en: "/ project", ar: "/ مشروع" },
    badge: { fr: "Le Plus Recommandé", en: "Most Popular", ar: "الأكثر طلباً" },
    popular: true,
    features: [
      {
        fr: "Tout de l'offre Essentiel",
        en: "Everything in Starter",
        ar: "كل ميزات العرض الأساسي",
      },
      {
        fr: "Personnalisation avancée & Blocs 360°",
        en: "Advanced customization & 360° blocks",
        ar: "تخصيص متقدم وقوالب 360°",
      },
      {
        fr: "Multi-devises & Multi-langues",
        en: "Multi-currency & Multi-language",
        ar: "متعدد العملات واللغات",
      },
      {
        fr: "Support prioritaire & Accompagnement",
        en: "Priority support & assistance",
        ar: "دعم ذو أولوية ومرافقة مخصصة",
      },
    ],
    ctaText: { fr: "Commander cette Offre", en: "Order This Plan", ar: "طلب هذا العرض" },
    ctaLink: "/contact",
  },
  {
    id: "p3",
    name: { fr: "Sur Mesure R&D", en: "Custom Enterprise", ar: "مخصص للمؤسسات" },
    price: "Sur Devis",
    period: { fr: "/ architecture", en: "/ architecture", ar: "/ هندسة معمارية" },
    popular: false,
    features: [
      {
        fr: "Cahier des charges sur mesure",
        en: "Custom technical specifications",
        ar: "دفتر شروط مخصص بالكامل",
      },
      {
        fr: "Audit d'architecture & Intégrations API",
        en: "Architecture audit & API integrations",
        ar: "تدقيق معماري وربط برمجي كامل",
      },
      {
        fr: "Déploiement haute disponibilité",
        en: "High-availability deployment",
        ar: "نشر على بنية عالية الجاهزية",
      },
      {
        fr: "SLA & Maintenance R&D dédiée",
        en: "Dedicated R&D SLA & Maintenance",
        ar: "اتفاقية مستوى خدمة وصيانة متقدمة",
      },
    ],
    ctaText: { fr: "Demander une Étude", en: "Request a Study", ar: "طلب دراسة مخصصة" },
    ctaLink: "/contact",
  },
];

export function PricingTableBlock({ config }: { config: BlockConfig }) {
  const L = useLocalize();
  const p = config.props || {};

  const title = p.title ? String(L(p.title as Localized<string>) || "") : "";
  const subtitle = p.subtitle ? String(L(p.subtitle as Localized<string>) || "") : "";
  const plans = (
    Array.isArray(p.plans) && p.plans.length > 0 ? p.plans : DEFAULT_PLANS
  ) as PricingPlan[];

  return (
    <section className="container-page py-12 md:py-20 text-start">
      {(title || subtitle) && (
        <div className="max-w-2xl mx-auto text-center mb-12">
          {title && (
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">{title}</h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">{subtitle}</p>
          )}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch max-w-6xl mx-auto">
        {plans.map((plan, idx) => {
          const isPop = Boolean(plan.popular);
          const planName = String(L(plan.name as Localized<string>) || "");
          const period = plan.period ? String(L(plan.period as Localized<string>) || "") : "";
          const badge = plan.badge ? String(L(plan.badge as Localized<string>) || "") : "";
          const cta = plan.ctaText
            ? String(L(plan.ctaText as Localized<string>) || "")
            : String(
                L({ fr: "Choisir cette offre", en: "Choose plan", ar: "اختيار هذا العرض" }) || "",
              );

          return (
            <div
              key={plan.id || idx}
              className={`relative flex flex-col justify-between rounded-3xl border p-8 transition-all ${
                isPop
                  ? "border-primary shadow-xl bg-card/90 ring-2 ring-primary/20 scale-[1.02]"
                  : "border-border/70 bg-card/50 shadow-sm hover:border-primary/40"
              }`}
            >
              {isPop && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-sm flex items-center gap-1">
                  <Zap className="h-3 w-3 fill-current" />
                  <span>
                    {badge || String(L({ fr: "Recommandé", en: "Popular", ar: "موصى به" }) || "")}
                  </span>
                </div>
              )}

              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{planName}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                      {plan.price}
                    </span>
                    {period && <span className="text-xs text-muted-foreground">{period}</span>}
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6 mb-8 space-y-3">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-sm">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span className="text-muted-foreground leading-snug">
                        {String(L(feat as Localized<string>) || "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/30">
                <Button
                  asChild
                  variant={isPop ? "default" : "outline"}
                  className="w-full rounded-xl py-6 font-semibold"
                >
                  <Link
                    to={plan.ctaLink || "/contact"}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>{cta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
