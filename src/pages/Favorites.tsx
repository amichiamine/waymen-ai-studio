import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useStore } from "@/lib/store";
import { useProducts } from "@/lib/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { useI18n } from "@/lib/i18n";

export default function Favorites() {
  const { t } = useI18n();
  useEffect(() => { document.title = t("favorites.page.title"); }, [t]);
  const { favorites } = useStore();
  const products = useProducts();
  const items = products.filter((p) => favorites.has(p.id));

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">{t("favorites.title")}</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
          <Heart className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t("favorites.empty")}</p>
          <Link to="/category" className="text-primary hover:underline">{t("favorites.browse")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
