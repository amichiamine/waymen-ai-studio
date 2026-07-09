import { Link } from "react-router-dom";
import { ArrowRight, Laptop, Monitor, Cpu, Smartphone } from "lucide-react";
import laptopsImg from "@/assets/cat-laptops.jpg";
import desktopsImg from "@/assets/cat-desktops.jpg";
import buildsImg from "@/assets/cat-builds.jpg";
import phonesImg from "@/assets/cat-phones.jpg";
import { useI18n, type TKey } from "@/lib/i18n";

const cats: { slug: "laptops" | "desktops" | "builds" | "phones"; labelKey: TKey; descKey: TKey; img: string; Icon: typeof Laptop }[] = [
  { slug: "laptops", labelKey: "nav.laptops", descKey: "cat.laptops.desc", img: laptopsImg, Icon: Laptop },
  { slug: "desktops", labelKey: "nav.desktops", descKey: "cat.desktops.desc", img: desktopsImg, Icon: Monitor },
  { slug: "builds", labelKey: "nav.builds", descKey: "cat.builds.desc", img: buildsImg, Icon: Cpu },
  { slug: "phones", labelKey: "nav.phones", descKey: "cat.phones.desc", img: phonesImg, Icon: Smartphone },
];

export function CategoryCards() {
  const { t } = useI18n();
  return (
    <section className="container-page py-16 lg:py-20">
      <SectionHead title={t("cat.title")} sub={t("cat.sub")} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-10">
        {cats.map((c) => (
          <Link key={c.slug} to={`/category/${c.slug}`} className="group relative overflow-hidden rounded-xl border border-border bg-card aspect-[4/5] flex flex-col justify-end p-6 transition-all hover:border-primary/60 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
            <img src={c.img} alt={t(c.labelKey)} width={800} height={600} loading="lazy" className="absolute inset-0 size-full object-cover opacity-90 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/30 to-transparent" />
            <div className="relative space-y-2">
              <c.Icon className="size-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">{t(c.labelKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(c.descKey)}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-2">
                {t("cat.browse")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
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
