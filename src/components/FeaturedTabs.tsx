import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useProducts } from "@/lib/useProducts";
import { useAdminState } from "@/lib/admin-store";
import { useLocalize } from "@/lib/i18n";
import { catalogProducts } from "@/data/products";

export function FeaturedTabs() {
  const products = useProducts();
  const { siteContent } = useAdminState();
  const cfg = siteContent.featuredTabs;
  const L = useLocalize();
  const first = cfg.tabs[0]?.categorySlug ?? "laptops";
  const [active, setActive] = useState<string>(first);
  // L'onglet « builds » listerait sinon les configurations des visiteurs.
  const list = useMemo(
    () =>
      catalogProducts(products)
        .filter((p) => p.category === active)
        .slice(0, 4),
    [products, active],
  );
  return (
    <section className="container-page py-16">
      <SectionHead title={L(cfg.title) ?? ""} sub={L(cfg.subtitle) ?? ""} />
      <div className="mt-6 inline-flex gap-1 p-1 rounded-lg bg-card border border-border">
        {cfg.tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setActive(tb.categorySlug)}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${active === tb.categorySlug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {L(tb.label)}
          </button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-8">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
