import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Search as SearchIcon, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { catalogProducts, categoryMeta, type Category } from "@/data/products";
import { useProductList } from "@/data-provider";
import { useI18n, type Localized } from "@/lib/i18n";

/** Toutes les variantes d'un champ localisé, en minuscules — base de recherche. */
const haystack = (v: Localized<string> | undefined): string =>
  (typeof v === "object" && v !== null ? [v.fr, v.en, v.ar] : [v])
    .filter((s): s is string => typeof s === "string")
    .join(" ")
    .toLowerCase();

import { ProductCard } from "@/components/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

const CATS: Category[] = ["laptops", "desktops", "builds", "phones"];

export default function Search() {
  const { t, lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const term = q.trim().toLowerCase();

  const [cat, setCat] = useState<Category | "">((searchParams.get("cat") as Category) ?? "");
  const [brand, setBrand] = useState<string[]>(
    (searchParams.get("brands") ?? "").split(",").filter(Boolean),
  );
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get("max")) || 500_000);
  const [sort, setSort] = useState(searchParams.get("sort") ?? "relevance");
  const [inStock, setInStock] = useState(searchParams.get("stock") === "1");

  const SORTS = [
    { id: "relevance", label: t("search.sort.relevance") },
    { id: "low", label: t("search.sort.low") },
    { id: "high", label: t("search.sort.high") },
    { id: "new", label: t("search.sort.new") },
  ];

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

  // Lecture via le fournisseur de données : cette page est le pilote de la
  // migration des 62 fichiers UI (cf. docs/DATA-PROVIDER.md). Les trois états
  // sont traités bien qu'ils soient inertes en mode mock — `loading` y est faux
  // dès le premier rendu et `error` reste nul. C'est précisément l'intérêt : le
  // jour où VITE_API_MODE=http, ce fichier n'a pas une ligne à changer.
  //
  // On ne passe AUCUN filtre au fournisseur : le tri, la fourchette de prix et
  // la sélection de marques sont manipulés en continu par le visiteur. Les
  // déléguer au serveur déclencherait une requête par mouvement de curseur.
  // La recherche reste donc côté client, sur un catalogue chargé une fois.
  const { data: allProducts, loading, error } = useProductList();

  // Base de recherche = catalogue seul. Les configurations composées dans
  // /builder vivent dans la même liste (elles doivent rester résolubles par le
  // panier) mais ne sont ni indexables ni affichables ici.
  const products = useMemo(() => catalogProducts(allProducts), [allProducts]);
  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );

  const results = useMemo(() => {
    let r = products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (brand.length && !brand.includes(p.brand)) return false;
      if (p.price > maxPrice) return false;
      if (inStock && p.stock === "out") return false;
      if (!term) return true;
      return (
        haystack(p.name).includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.category.includes(term) ||
        haystack(p.specLine).includes(term)
      );
    });
    if (sort === "low") r = [...r].sort((a, b) => a.price - b.price);
    else if (sort === "high") r = [...r].sort((a, b) => b.price - a.price);
    else if (sort === "new") r = [...r].sort((a, b) => Number(!!b.sale) - Number(!!a.sale));
    return r;
  }, [products, term, cat, brand, maxPrice, inStock, sort]);

  const PAGE = 12;
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => {
    setVisible(PAGE);
  }, [q, cat, brand, maxPrice, sort, inStock]);
  const shown = results.slice(0, visible);
  const hasMore = visible < results.length;
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasMore,
    // On relaie `loading` : pendant le premier chargement réseau la liste est
    // vide, la sentinelle serait visible et déclencherait des pages inutiles.
    loading,
    onLoadMore: () => setVisible((v) => v + PAGE),
  });

  const suggestions = useMemo(() => products.filter((p) => p.bestSeller).slice(0, 4), [products]);
  const active = cat || brand.length || maxPrice !== 500_000 || inStock || sort !== "relevance";

  const nfLocale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";
  const pageTitle = q ? t("search.page.titleQ").replace("{q}", q) : t("search.page.title");
  const pageDesc = t("search.page.desc").replace("{n}", String(products.length));

  return (
    <section className="container-page py-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={`${window.location.origin}/search`} />
      </Helmet>

      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">
          {t("search.title")}{" "}
          {q && <span className="text-muted-foreground font-normal">« {q} »</span>}
        </h1>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("search.category")}</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={!cat}
                    onChange={() => setCat("")}
                    className="size-4 accent-primary"
                  />{" "}
                  {t("search.all")}
                </label>
                {CATS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={cat === c}
                      onChange={() => setCat(c)}
                      className="size-4 accent-primary"
                    />
                    {t(categoryMeta[c].labelKey)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("search.priceMax")}</h3>
              <input
                type="range"
                min={20000}
                max={500000}
                step={5000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-xs text-muted-foreground mt-2">
                {t("search.upTo").replace("{v}", new Intl.NumberFormat(nfLocale).format(maxPrice))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">{t("search.brand")}</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="size-4 accent-primary"
              />
              {t("search.inStockOnly")}
            </label>
            {active && (
              <button
                onClick={() => {
                  setCat("");
                  setBrand([]);
                  setMaxPrice(500_000);
                  setInStock(false);
                  setSort("relevance");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <X className="size-3" /> {t("search.reset")}
              </button>
            )}
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            {/*
              Pendant le chargement, le compteur vaudrait « 0 résultat(s) » —
              une information fausse. On le remplace par un gabarit de la même
              hauteur pour ne pas décaler les boutons de tri.
            */}
            {loading ? (
              <span className="h-4 w-28 animate-pulse rounded bg-muted" aria-hidden="true" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("search.results").replace("{n}", String(results.length))}
              </span>
            )}
            <div className="flex items-center gap-1 p-1 rounded-md bg-card border border-border">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`h-8 px-3 rounded text-xs font-medium ${sort === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/*
            Ordre imposé par docs/DATA-PROVIDER.md §5.3 : chargement, puis
            erreur, puis état vide. L'erreur ne remplace PAS la page — `data`
            reste exploitable (liste vide), donc le bandeau se superpose au
            contenu habituel. Un « return » ici priverait le visiteur de ses
            filtres et de l'état vide, et transformerait une panne partielle en
            écran mort (AGENTS.md §7).
          */}
          {error && (
            <p
              role="status"
              className="mb-5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {/*
                Message issu du serveur, déjà lisible et localisé côté backend.
                Aucune clé i18n « ressource indisponible » / « réessayer »
                n'existe dans src/lib/i18n/*.ts et cette vague n'a pas le droit
                d'en créer : d'où l'absence de bouton de nouvelle tentative.
                `refetch()` est prêt côté fournisseur — il suffira de l'étiqueter.
              */}
              {error.message}
            </p>
          )}

          {loading ? (
            /*
              Squelette de la MÊME forme que la grille finale : même nombre de
              colonnes, même gouttière, hauteur fixe. Un écran vide ou un
              spinner centré provoquerait un décalage de mise en page à
              l'arrivée des données. Inerte en mode mock (`loading` y est faux).
            */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4" aria-busy="true">
              <span className="sr-only">{t("app.loading")}</span>
              {Array.from({ length: PAGE }, (_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {q ? t("search.emptyQ").replace("{q}", q) : t("search.empty")}
              </p>
              <p className="text-sm font-semibold mb-3">{t("search.suggestions")}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {suggestions.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
              <Link
                to="/"
                className="mt-6 inline-flex h-10 px-5 items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold"
              >
                {t("search.backHome")}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shown.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="h-16 mt-6 flex items-center justify-center text-xs text-muted-foreground"
                >
                  …
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
