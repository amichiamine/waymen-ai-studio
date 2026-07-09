import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useProducts } from "@/lib/useProducts";
import { useAdminState } from "@/lib/admin-store";
import { useMemo } from "react";

export function BestSellers() {
  const products = useProducts();
  const { siteContent } = useAdminState();
  const cfg = siteContent.bestSellers;
  const list = useMemo(() => products.filter((p) => p.bestSeller).slice(0, 4), [products]);
  return (
    <section className="container-page py-16">
      <SectionHead title={cfg.title} sub={cfg.subtitle} />
      <div className="mt-8 grid gap-5 grid-cols-2 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
