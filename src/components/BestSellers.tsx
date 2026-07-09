import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useI18n } from "@/lib/i18n";
import { useProducts } from "@/lib/useProducts";
import { useMemo } from "react";

export function BestSellers() {
  const { t } = useI18n();
  const products = useProducts();
  const list = useMemo(() => products.filter((p) => p.bestSeller).slice(0, 4), [products]);
  return (
    <section className="container-page py-16">
      <SectionHead title={t("best.title")} sub={t("best.sub")} />
      <div className="mt-8 grid gap-5 grid-cols-2 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
