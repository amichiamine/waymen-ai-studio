import { Link } from "react-router-dom";
import { ArrowRight, Laptop, Monitor, Cpu, Smartphone, type LucideIcon } from "lucide-react";
import laptopsImg from "@/assets/cat-laptops.webp";
import desktopsImg from "@/assets/cat-desktops.webp";
import buildsImg from "@/assets/cat-builds.webp";
import phonesImg from "@/assets/cat-phones.webp";
import { useCategoryList, useSiteContent } from "@/data-provider";
import type { Category } from "@/data/products";
import { Reveal } from "@/components/Reveal";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { useLocalize } from "@/lib/i18n";

const DEFAULT_IMG: Record<string, string> = {
  laptops: laptopsImg,
  desktops: desktopsImg,
  builds: buildsImg,
  phones: phonesImg,
};
const DEFAULT_ICON: Record<string, LucideIcon> = {
  laptops: Laptop,
  desktops: Monitor,
  builds: Cpu,
  phones: Smartphone,
};

export function CategoryCards() {
  const { data: categories } = useCategoryList();
  const { data: siteContent } = useSiteContent();
  const cfg = siteContent.categories;
  const L = useLocalize();
  const cats = categories.filter((c) =>
    (["laptops", "desktops", "builds", "phones"] as Category[]).includes(c.slug as Category),
  );
  return (
    <section className="container-page py-16 lg:py-20">
      <Reveal variant="up">
        <SectionHead title={L(cfg.title) ?? ""} sub={L(cfg.subtitle) ?? ""} />
      </Reveal>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        {cats.map((c, i) => {
          const Icon = DEFAULT_ICON[c.slug] ?? Laptop;
          const img = c.cover || DEFAULT_IMG[c.slug];
          return (
            <Reveal key={c.slug} variant="up" delay={i * 90}>
              <Link
                to={`/category/${c.slug}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card aspect-[4/5] flex flex-col justify-end p-6 transition-all duration-500 hover:border-primary/60 hover:-translate-y-1.5 hover:shadow-[var(--shadow-glow)]"
              >
                {img && (
                  <ImageCatalogue
                    src={img}
                    alt={c.label}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover opacity-90 transition-all duration-700 group-hover:opacity-100 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/40 to-transparent transition-opacity duration-500 group-hover:from-card/80" />
                <div className="relative space-y-2">
                  <Icon className="size-6 text-primary transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                  <h3 className="text-xl font-bold text-foreground">{c.label}</h3>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
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
