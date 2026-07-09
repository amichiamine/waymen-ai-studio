import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { products, categoryMeta, type Category } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

const CATS: Category[] = ["laptops", "desktops", "builds", "phones"];
const SORTS = [
  { id: "relevance", label: "Pertinence" },
  { id: "low", label: "Prix ↑" },
  { id: "high", label: "Prix ↓" },
  { id: "new", label: "Nouveautés" },
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const term = q.trim().toLowerCase();

  const [cat, setCat] = useState<Category | "">((searchParams.get("cat") as Category) ?? "");
  const [brand, setBrand] = useState<string[]>((searchParams.get("brands") ?? "").split(",").filter(Boolean));
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get("max")) || 500_000);
  const [sort, setSort] = useState(searchParams.get("sort") ?? "relevance");
  const [inStock, setInStock] = useState(searchParams.get("stock") === "1");

  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("cat", cat);
    if (brand.length) p.set("brands", brand.join(","));
    if (maxPrice !== 500_000) p.set("max", String(maxPrice));
    if (sort !== "relevance") p.set("sort", sort);
    if (inStock) p.set("stock", "1");
    setSearchParams(p, { replace: true });
  }, [q, cat, brand, maxPrice, sort, inStock, setSearchParams]);

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), []);

  const results = useMemo(() => {
    let r = products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (brand.length && !brand.includes(p.brand)) return false;
      if (p.price > maxPrice) return false;
      if (inStock && p.stock === "out") return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.category.includes(term) ||
        p.specLine.toLowerCase().includes(term)
      );
    });
    if (sort === "low") r = [...r].sort((a, b) => a.price - b.price);
    else if (sort === "high") r = [...r].sort((a, b) => b.price - a.price);
    else if (sort === "new") r = [...r].sort((a, b) => Number(!!b.sale) - Number(!!a.sale));
    return r;
  }, [term, cat, brand, maxPrice, inStock, sort]);

  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => { setVisible(PAGE); }, [q, cat, brand, maxPrice, sort, inStock]);
  const shown = results.slice(0, visible);
  const hasMore = visible < results.length;
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasMore, loading: false, onLoadMore: () => setVisible((v) => v + PAGE),
  });

  const suggestions = useMemo(() => products.filter((p) => p.bestSeller).slice(0, 4), []);
  const active = cat || brand.length || maxPrice !== 500_000 || inStock || sort !== "relevance";

  return (
    <section className="container-page py-12">
      <Helmet>
        <title>{q ? `Recherche « ${q} » — KA Tech` : "Recherche — KA Tech"}</title>
        <meta name="description" content={`Rechercher parmi ${products.length} produits KA Tech : laptops, desktops, PC sur-mesure et smartphones.`} />
        <link rel="canonical" href="/search" />
      </Helmet>

      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Recherche {q && <span className="text-muted-foreground font-normal">« {q} »</span>}</h1>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3">Catégorie</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={!cat} onChange={() => setCat("")} className="size-4 accent-primary" /> Toutes
                </label>
                {CATS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={cat === c} onChange={() => setCat(c)} className="size-4 accent-primary" />
                    {categoryMeta[c].labelKey.replace("nav.", "").replace(/^./, (m) => m.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Prix max</h3>
              <input type="range" min={20000} max={500000} step={5000} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-primary" />
              <div className="text-xs text-muted-foreground mt-2">jusqu'à {new Intl.NumberFormat("fr-FR").format(maxPrice)} DA</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Marque</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {brands.map((b) => (
                  <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={brand.includes(b)} onChange={(e) => setBrand((s) => e.target.checked ? [...s, b] : s.filter((x) => x !== b))} className="size-4 accent-primary" />
                    {b}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="size-4 accent-primary" />
              En stock uniquement
            </label>
            {active && (
              <button onClick={() => { setCat(""); setBrand([]); setMaxPrice(500_000); setInStock(false); setSort("relevance"); }} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <X className="size-3" /> Réinitialiser les filtres
              </button>
            )}
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <span className="text-sm text-muted-foreground">{results.length} résultat(s)</span>
            <div className="flex items-center gap-1 p-1 rounded-md bg-card border border-border">
              {SORTS.map((s) => (
                <button key={s.id} onClick={() => setSort(s.id)} className={`h-8 px-3 rounded text-xs font-medium ${sort === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.label}</button>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground mb-4">Aucun résultat{q ? ` pour « ${q} »` : ""}.</p>
              <p className="text-sm font-semibold mb-3">Vous pourriez aimer :</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {suggestions.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              <Link to="/" className="mt-6 inline-flex h-10 px-5 items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">Retour à l'accueil</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shown.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="h-16 mt-6 flex items-center justify-center text-xs text-muted-foreground">…</div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
