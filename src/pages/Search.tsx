import { Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { useEffect, useState } from "react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

export default function Search() {
  useEffect(() => { document.title = `Recherche — KA Tech`; }, []);
  const { q } = Route.useSearch();
  const term = q.trim().toLowerCase();
  const results = term
    ? products.filter((p) => {
        return (
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.category.includes(term) ||
          p.specLine.toLowerCase().includes(term)
        );
      })
    : [];

  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => { setVisible(PAGE); }, [q]);
  const shown = results.slice(0, visible);
  const hasMore = visible < results.length;
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasMore, loading: false, onLoadMore: () => setVisible((v) => v + PAGE),
  });

  return (
    <section className="container-page py-12">
      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Résultats de recherche {q && <span className="text-muted-foreground font-normal">pour "{q}"</span>}</h1>
      </div>
      {!term ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Saisissez un mot dans la barre de recherche pour commencer.</div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">Aucun résultat pour "{q}".</p>
          <Link to="/" className="inline-flex h-10 px-5 items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">Retour à l'accueil</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{results.length} produit(s)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="h-16 mt-6 flex items-center justify-center text-xs text-muted-foreground">…</div>
          )}
        </>
      )}
    </section>
  );
}
