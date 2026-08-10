import { ProductCard } from "./ProductCard";
import { SectionHead } from "./CategoryCards";
import { useProducts } from "@/lib/useProducts";
import { useSiteContent } from "@/data-provider";
import { useMemo } from "react";
import { Reveal } from "@/components/Reveal";
import { useLocalize } from "@/lib/i18n";
import { catalogProducts } from "@/data/products";

export function BestSellers() {
  const products = useProducts();
  const { data: siteContent } = useSiteContent();
  const cfg = siteContent.bestSellers;
  const L = useLocalize();
  // Vitrine publique : jamais de configuration client (voir `catalogProducts`).
  const list = useMemo(
    () =>
      catalogProducts(products)
        .filter((p) => p.bestSeller)
        .slice(0, 4),
    [products],
  );
  // Même règle que `FlashSale` : pas de titre « Meilleures ventes » au-dessus
  // d'une grille vide. Sur une base sans produit la vitrine reste propre ;
  // c'est `BandeauBoutiqueVide` qui dit la vérité au commerçant.
  if (list.length === 0) return null;

  return (
    <section className="container-page py-16">
      <Reveal variant="up">
        <SectionHead title={L(cfg.title) ?? ""} sub={L(cfg.subtitle) ?? ""} />
      </Reveal>
      <div className="mt-8 grid gap-5 grid-cols-2 lg:grid-cols-4">
        {list.map((p, i) => (
          <Reveal key={p.id} variant="up" delay={i * 80}>
            <ProductCard p={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
