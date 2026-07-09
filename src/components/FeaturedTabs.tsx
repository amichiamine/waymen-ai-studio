import { useMemo, useState } from "react";
import { type Category } from "@/data/products";
import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useI18n, type TKey } from "@/lib/i18n";
import { useProducts } from "@/lib/useProducts";

const tabs: { id: Category; key: TKey }[] = [
  { id: "laptops", key: "feat.tab.laptops" },
  { id: "desktops", key: "feat.tab.desktops" },
  { id: "builds", key: "feat.tab.builds" },
  { id: "phones", key: "feat.tab.phones" },
];

export function FeaturedTabs() {
  const [active, setActive] = useState<Category>("laptops");
  const { t } = useI18n();
  const products = useProducts();
  const list = useMemo(() => products.filter((p) => p.category === active).slice(0, 4), [products, active]);
  return (
    <section className="container-page py-16">
      <SectionHead title={t("feat.title")} sub={t("feat.sub")} />
      <div className="mt-6 inline-flex gap-1 p-1 rounded-lg bg-card border border-border">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setActive(tb.id)} className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${active === tb.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t(tb.key)}</button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-8">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
