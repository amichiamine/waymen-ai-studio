import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { catalogProducts, getCategoryMeta, type Category } from "@/data/products";
import { useProducts } from "@/lib/useProducts";

import { ProductCard } from "@/components/ProductCard";
import { UseChips } from "@/components/UseChips";
import { ChevronRight } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useCategoryList, useSiteSettings } from "@/data-provider";
import { useFormatPrice } from "@/lib/format-price";
import type { AdminCategory } from "@/api/types";

const BUILTIN_CATEGORIES = ["laptops", "desktops", "builds", "phones"];

const SORTS: { id: string; key: TKey }[] = [
  { id: "popular", key: "cp.sort.popular" },
  { id: "new", key: "cp.sort.new" },
  { id: "low", key: "cp.sort.low" },
  { id: "high", key: "cp.sort.high" },
];

export default function CategoryDetail() {
  const { slug } = useParams();
  const { data: categories } = useCategoryList();
  const { data: siteSettings } = useSiteSettings();
  const { t } = useI18n();
  const brand = siteSettings.storeName?.trim() || "Boutique";

  const currentCat = categories.find((c) => c.slug === slug);
  const isValid = Boolean(currentCat || (slug && slug.length > 0));

  useEffect(() => {
    document.title = `${brand} — ${slug ?? ""}`;
  }, [slug, brand]);

  if (!isValid || !slug) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">{t("cp.notFound")}</h1>
        <Link to="/category" className="mt-4 inline-block text-primary hover:underline">
          {t("cp.seeAllCategories")}
        </Link>
      </div>
    );
  }
  return <CategoryView cat={slug as Category} dynamicCat={currentCat} />;
}

function CategoryView({ cat, dynamicCat }: { cat: Category; dynamicCat?: AdminCategory }) {
  const meta = getCategoryMeta(cat, dynamicCat);
  const { t } = useI18n();
  const formatPrice = useFormatPrice();

  const products = useProducts();
  const all = useMemo(
    () => catalogProducts(products).filter((p) => p.category === cat),
    [products, cat],
  );

  const maxCatalogPrice = useMemo(() => {
    if (all.length === 0) return 100_000;
    const max = Math.max(...all.map((p) => p.price));
    return Math.ceil(max / 1000) * 1000 || 50_000;
  }, [all]);

  const [brand, setBrand] = useState<string[]>([]);
  const [use, setUse] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(maxCatalogPrice);
  const [sort, setSort] = useState("popular");
  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    setMaxPrice(maxCatalogPrice);
  }, [maxCatalogPrice]);

  const brands = useMemo(() => Array.from(new Set(all.map((p) => p.brand))), [all]);
  const hasUseTags = useMemo(
    () => all.some((p) => Array.isArray(p.use) && p.use.length > 0),
    [all],
  );

  const list = useMemo(() => {
    let r = all.filter((p) => p.price <= maxPrice);
    if (brand.length) r = r.filter((p) => brand.includes(p.brand));
    if (use) r = r.filter((p) => p.use.includes(use as never));
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    else if (sort === "high") r.sort((a, b) => b.price - a.price);
    else if (sort === "popular") r.sort((a, b) => Number(!!b.bestSeller) - Number(!!a.bestSeller));
    return r;
  }, [all, brand, use, maxPrice, sort]);

  useEffect(() => {
    setVisible(PAGE);
  }, [brand, use, maxPrice, sort, cat]);

  const shown = list.slice(0, visible);
  const hasMore = visible < list.length;
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasMore,
    loading: false,
    onLoadMore: () => setVisible((v) => v + PAGE),
  });

  const label = meta.labelKey ? t(meta.labelKey) : meta.labelText || cat;
  const desc = meta.descKey ? t(meta.descKey) : meta.descText || "";

  return (
    <div className="container-page py-8 lg:py-12">
      <Helmet>
        <title>{`${label} — ${brand}`}</title>
        <meta
          name="description"
          content={`${desc} ${list.length} produits disponibles chez ${brand}.`}
        />
        <link rel="canonical" href={`${window.location.origin}/category/${cat}`} />
        <meta property="og:url" content={`${window.location.origin}/category/${cat}`} />
      </Helmet>
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5 mb-6">
        <Link to="/" className="hover:text-foreground">
          {t("common.home")}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{label}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold">{label}</h1>
        <p className="text-muted-foreground mt-1">
          {desc} · {list.length} {t("cp.product")}
        </p>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("cp.maxPrice")}</h3>
              <input
                type="range"
                min={0}
                max={maxCatalogPrice}
                step={Math.max(100, Math.round(maxCatalogPrice / 100))}
                value={Math.min(maxPrice, maxCatalogPrice)}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-xs text-muted-foreground mt-2">
                {t("cp.upTo")} {formatPrice(maxPrice)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("cp.brand")}</h3>
              <div className="space-y-2">
                {brands.map((b) => (
                  <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={brand.includes(b)}
                      onChange={(e) =>
                        setBrand((s) => (e.target.checked ? [...s, b] : s.filter((x) => x !== b)))
                      }
                      className="size-4 accent-primary"
                    />
                    {b}
                  </label>
                ))}
              </div>
            </div>
            {hasUseTags && (
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("cp.use")}</h3>
                <UseChips value={use} onChange={setUse} />
              </div>
            )}
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {list.length} {t("cp.results")}
            </span>
            <div className="flex items-center gap-1 p-1 rounded-md bg-card border border-border">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`h-8 px-3 rounded text-xs font-medium ${sort === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
          </div>

          {list.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="h-16 mt-6 flex items-center justify-center text-xs text-muted-foreground"
                >
                  {t("cp.results")}…
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              {t("cp.empty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
