import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Palette,
  Code2,
  Cloud,
  GraduationCap,
  Boxes,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useCategoryList, useSiteContent } from "@/data-provider";
import { Reveal } from "@/components/Reveal";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { useLocalize, useI18n } from "@/lib/i18n";
import { categoryMeta, type BuiltinCategory } from "@/data/products";

const DEFAULT_ICON: Record<string, LucideIcon> = {
  "llm-assistants": Bot,
  "creative-media": Palette,
  "code-engineering": Code2,
  "productivity-cloud": Cloud,
  "formations-academy": GraduationCap,
  "packs-bundles": Boxes,
};

export function CategoryCards({ max }: { max?: number } = {}) {
  const { data: categories } = useCategoryList();
  const { data: siteContent } = useSiteContent();
  const cfg = siteContent.categories;
  const L = useLocalize();
  const { t } = useI18n();
  const cats = typeof max === "number" ? categories.slice(0, max) : categories;
  // Ne jamais afficher de titre de section au-dessus d'une grille vide.
  if (cats.length === 0) return null;

  return (
    <section className="container-page py-16 lg:py-20">
      <Reveal variant="up">
        <SectionHead title={L(cfg.title) ?? ""} sub={L(cfg.subtitle) ?? ""} />
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-10">
        {cats.map((c, i) => {
          const Icon = DEFAULT_ICON[c.slug] ?? LayoutGrid;
          const img = c.cover;
          const label =
            L(c.label) ||
            (c.slug in categoryMeta
              ? t(categoryMeta[c.slug as BuiltinCategory].labelKey)
              : typeof c.label === "string"
                ? c.label
                : c.slug);
          const desc =
            L(c.description) ||
            (c.slug in categoryMeta
              ? t(categoryMeta[c.slug as BuiltinCategory].descKey)
              : typeof c.description === "string"
                ? c.description
                : "");

          return (
            <Reveal key={c.slug} variant="up" delay={i * 90}>
              <Link
                to={`/category/${c.slug}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card aspect-[4/5] flex flex-col justify-end p-6 transition-all duration-500 hover:border-primary/60 hover:-translate-y-1.5 hover:shadow-[var(--shadow-glow)]"
              >
                {img ? (
                  <ImageCatalogue
                    src={img}
                    alt={label}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover opacity-90 transition-all duration-700 group-hover:opacity-100 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 size-full bg-gradient-to-br from-card via-muted/40 to-primary/10 flex items-center justify-center">
                    <Icon className="size-20 text-muted-foreground/20 group-hover:text-primary/30 transition-colors" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/40 to-transparent transition-opacity duration-500 group-hover:from-card/80" />
                <div className="relative space-y-2">
                  <Icon className="size-6 text-primary transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                  <h3 className="text-xl font-bold text-foreground">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-2">
                    {L(cfg.browseLabel)}{" "}
                    <ArrowRight className="size-4 rtl:rotate-180 transition-transform duration-300 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function SectionHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
        {sub && <p className="text-muted-foreground text-sm mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
