import { products } from "@/data/products";
import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useI18n } from "@/lib/i18n";

export function BestSellers() {
  const { t } = useI18n();
  const list = products.filter((p) => p.bestSeller).slice(0, 4);
  return (
    <section className="container-page py-16">
      <SectionHead title={t("best.title")} sub={t("best.sub")} />
      <div className="mt-8 grid gap-5 grid-cols-2 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
