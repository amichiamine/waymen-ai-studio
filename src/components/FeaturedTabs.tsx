import { useMemo, useState, useEffect } from "react";
import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useProducts } from "@/lib/useProducts";
import { useSiteContent, useCategoryList } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import { catalogProducts } from "@/data/products";

import type { SiteContent } from "@/lib/site-content";

export function FeaturedTabs({
  override,
}: { override?: Partial<SiteContent["featuredTabs"]> } = {}) {
  const products = useProducts();
  const { data: siteContent } = useSiteContent();
  const { data: categories } = useCategoryList();
  const cfg = override ? { ...siteContent.featuredTabs, ...override } : siteContent.featuredTabs;
  const L = useLocalize();

  const tabs = useMemo(() => {
    const existingSlugs = new Set(categories.map((c) => c.slug));
    const matching = cfg.tabs.filter((tb) => existingSlugs.has(tb.categorySlug));
    if (matching.length > 0) return matching;
    return categories.slice(0, 4).map((c) => ({
      id: `dyn_${c.slug}`,
      categorySlug: c.slug,
      label: c.label,
    }));
  }, [categories, cfg.tabs]);

  const [active, setActive] = useState<string>(() => tabs[0]?.categorySlug ?? "");

  useEffect(() => {
    if (!tabs.some((tb) => tb.categorySlug === active) && tabs.length > 0) {
      setActive(tabs[0].categorySlug);
    }
  }, [tabs, active]);

  const list = useMemo(
    () =>
      catalogProducts(products)
        .filter((p) => p.category === active)
        .slice(0, 4),
    [products, active],
  );

  if (tabs.length === 0 || list.length === 0) {
    return null;
  }

  return (
    <section className="container-page py-16">
      <SectionHead title={L(cfg.title) ?? ""} sub={L(cfg.subtitle) ?? ""} />
      <div className="mt-6 inline-flex gap-1 p-1 rounded-lg bg-card border border-border">
        {tabs.map((tb) => (
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
