import { Link } from "react-router-dom";
import { ArrowRight, Laptop, Monitor, Cpu, Smartphone, type LucideIcon } from "lucide-react";
import laptopsImg from "@/assets/cat-laptops.jpg";
import desktopsImg from "@/assets/cat-desktops.jpg";
import buildsImg from "@/assets/cat-builds.jpg";
import phonesImg from "@/assets/cat-phones.jpg";
import { useAdminState } from "@/lib/admin-store";
import type { Category } from "@/data/products";

const DEFAULT_IMG: Record<string, string> = {
  laptops: laptopsImg, desktops: desktopsImg, builds: buildsImg, phones: phonesImg,
};
const DEFAULT_ICON: Record<string, LucideIcon> = {
  laptops: Laptop, desktops: Monitor, builds: Cpu, phones: Smartphone,
};

export function CategoryCards() {
  const { siteContent, categories } = useAdminState();
  const cfg = siteContent.categories;
  const cats = categories.filter((c) => (["laptops","desktops","builds","phones"] as Category[]).includes(c.slug as Category));
  return (
    <section className="container-page py-16 lg:py-20">
      <SectionHead title={cfg.title} sub={cfg.subtitle} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        {cats.map((c) => {
          const Icon = DEFAULT_ICON[c.slug] ?? Laptop;
          const img = c.cover || DEFAULT_IMG[c.slug];
          return (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group relative overflow-hidden rounded-xl border border-border bg-card aspect-[4/5] flex flex-col justify-end p-6 transition-all hover:border-primary/60 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
              {img && <img src={img} alt={c.label} width={800} height={600} loading="lazy" className="absolute inset-0 size-full object-cover opacity-90 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/30 to-transparent" />
              <div className="relative space-y-2">
                <Icon className="size-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">{c.label}</h3>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-2">
                  {cfg.browseLabel} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
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
