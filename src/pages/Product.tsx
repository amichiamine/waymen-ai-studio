import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { formatDZD, getCategoryMeta, catalogProducts, type SpecKey } from "@/data/products";
import { useProducts } from "@/lib/useProducts";
import {
  useCategoryList,
  useProductReviewList,
  useReviewMutations,
  useSiteSettings,
} from "@/data-provider";

import { ProductCard } from "@/components/ProductCard";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { urlMediaAbsolue } from "@/components/media-url";
import {
  Heart,
  ShoppingCart,
  Check,
  AlertTriangle,
  ChevronRight,
  Shield,
  Truck,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n, useLocalize, type TKey } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const specKeyMap: Record<SpecKey, TKey> = {
  cpu: "spec.cpu",
  ram: "spec.ram",
  storage: "spec.storage",
  gpu: "spec.gpu",
  screen: "spec.screen",
  os: "spec.os",
  battery: "spec.battery",
  weight: "spec.weight",
  form: "spec.form",
  motherboard: "spec.motherboard",
  psu: "spec.psu",
  camera: "spec.camera",
};

export default function Product() {
  const { id } = useParams();
  const products = useProducts();
  const { data: siteSettings } = useSiteSettings();
  const brand = siteSettings.storeName?.trim() || "Boutique";
  // La comparaison porte sur l'identifiant technique, qui n'est **pas**
  // localisé : la résolution d'un produit ne dépend jamais de la langue.
  const p = products.find((x) => x.id === id);
  const L = useLocalize();
  const localizedName = L(p?.name) ?? "";
  useEffect(() => {
    document.title = p ? `${localizedName} — ${brand}` : `Produit introuvable — ${brand}`;
  }, [p, localizedName, brand]);
  if (!p) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Produit introuvable</h1>
        <Link to="/category" className="mt-4 inline-block text-primary hover:underline">
          Voir le catalogue
        </Link>
      </div>
    );
  }
  return <ProductView p={p} />;
}

import type { Product as ProductType } from "@/data/products";

function ProductView({ p }: { p: ProductType }) {
  const products = useProducts();
  const { data: siteSettings } = useSiteSettings();
  const { data: categoryList } = useCategoryList();
  const brand = siteSettings.storeName?.trim() || "Boutique";

  const dynamicCat = categoryList.find((c) => c.slug === p.category);
  const catMeta = getCategoryMeta(p.category, dynamicCat);
  const hasSpecs = Boolean(p.specs && Object.keys(p.specs).length > 0);
  const [tab, setTab] = useState("desc");
  const { t, lang } = useI18n();
  const L = useLocalize();
  const catLabel = catMeta.labelKey ? t(catMeta.labelKey) : L(catMeta.labelText) || p.category;
  const isService = p.productType === "service";
  const { user } = useAuth();
  const { addToCart, toggleFavorite, isFavorite } = useStore();
  const navigate = useNavigate();
  const liked = isFavorite(p.id);

  // `catalogProducts()` préserve le filtrage des builds personnalisés — ne pas
  // régresser ce comportement (phase 1).
  const related = catalogProducts(products)
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);
  const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  /**
   * Localisation faite **une seule fois par champ**, en tête de composant :
   * `name` et `specLine` sont des `string` garantis, réutilisables partout —
   * y compris dans les métadonnées et le JSON-LD, qui refusent les objets.
   */
  const name = L(p.name) ?? "";
  const specLine = L(p.specLine) ?? "";
  const tabs: { id: string; key: TKey }[] = [
    { id: "desc", key: "pd.tab.desc" },
    ...(hasSpecs ? [{ id: "specs", key: "pd.tab.specs" as TKey }] : []),
    { id: "rev", key: "pd.tab.rev" },
    ...(!isService ? [{ id: "ship", key: "pd.tab.ship" as TKey }] : []),
  ];

  // Lecture des avis via le provider : useProductReviewList filtre déjà sur
  // productId et status === "approved". Le hook reste toujours monté.
  const { data: approvedReviews } = useProductReviewList(p.id);
  const { create: createProductReview } = useReviewMutations();

  const stats = useMemo(() => {
    const count = approvedReviews.length;
    const avg = count ? approvedReviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { avg, count, approved: approvedReviews };
  }, [approvedReviews]);

  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleAddCart = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    await addToCart(p.id);
    toast.success(t("pd.added"), { description: name });
  };
  const handleToggleFav = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    await toggleFavorite(p.id);
    toast.success(liked ? t("pd.favRemoved") : t("pd.favAdded"));
  };
  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!comment.trim()) {
      toast.error(t("pd.commentRequired"));
      return;
    }
    try {
      await createProductReview(p.id, {
        // Instantané textuel : l'avis conserve le nom tel que le client l'a lu.
        // L'avis reste rattaché au produit par `p.id`, pas par ce libellé.
        productName: name,
        customerName: user.name ?? user.email ?? "Client",
        rating,
        title: reviewTitle.trim() || t("pd.defaultReviewTitle"),
        body: comment.trim(),
      });
      setComment("");
      setReviewTitle("");
      setRating(5);
      setSubmitted(true);
      toast.success(t("pd.reviewSuccess"));
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Erreur lors de l'envoi";
      toast.error(msg);
    }
  };

  const distribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    stats.approved.forEach((r) => {
      dist[Math.min(4, Math.max(0, r.rating - 1))]++;
    });
    return dist;
  }, [stats.approved]);

  // Canonique absolue et JSON-LD Product — conservés depuis la phase 1.
  //
  // Règle non négociable : `name`, `description` et `brand.name` doivent être
  // des **chaînes**. Y interpoler un `Localized` non résolu écrirait
  // `{"fr":"…","en":"…"}` dans le balisage, et Google invaliderait la fiche.
  // D'où l'usage des variables déjà localisées plutôt que de `p.name` brut.
  const absoluteUrl = `${window.location.origin}/product/${p.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    brand: { "@type": "Brand", name: p.brand },
    category: catLabel,
    // schema.org est lu par un moteur, hors du contexte de la page : la balise
    // `<base>` ne s'y applique pas. C'est le seul consommateur qui exige une URL
    // ABSOLUE — d'où `urlMediaAbsolue` et non la résolution ordinaire.
    image: urlMediaAbsolue(p.image),
    description: specLine,
    url: absoluteUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: "DZD",
      price: p.price,
      availability:
        p.stock === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: absoluteUrl,
    },
    aggregateRating:
      stats.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: stats.avg.toFixed(1),
            reviewCount: stats.count,
          }
        : undefined,
  };

  return (
    <div className="container-page py-8 lg:py-12">
      <Helmet>
        <title>{`${name} — ${brand}`}</title>
        <meta
          name="description"
          content={`${name} — ${specLine}. ${formatDZD(p.price)}. Garantie officielle ${brand}.`}
        />
        <link rel="canonical" href={absoluteUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={name} />
        <meta property="og:description" content={specLine} />
        <meta property="og:url" content={absoluteUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5 mb-6">
        <Link to="/" className="hover:text-foreground">
          {t("common.home")}
        </Link>
        <ChevronRight className="size-3" />
        <Link to={`/category/${p.category}`} className="hover:text-foreground">
          {catLabel}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground line-clamp-1">{name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-border bg-card relative overflow-hidden aspect-square">
          <div
            className="absolute inset-0 blur-3xl opacity-30"
            style={{ background: "var(--gradient-glow)" }}
            aria-hidden
          />
          <ImageCatalogue
            src={p.image}
            alt={name}
            width={1024}
            height={1024}
            className="relative size-full object-contain p-10"
          />
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-card border border-border">
              {p.brand}
            </span>
            {isService && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Prestation de service
              </span>
            )}
            {discount > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-destructive text-destructive-foreground">
                -{discount}%
              </span>
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">{name}</h1>
          <p className="text-muted-foreground">{specLine}</p>
          {stats.count > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-4 ${i < Math.round(stats.avg) ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                  />
                ))}
              </div>
              <span className="font-semibold">{stats.avg.toFixed(1)}</span>
              <span className="text-muted-foreground">· {stats.count} avis</span>
            </div>
          )}

          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-4xl font-bold">{formatDZD(p.price)}</span>
            {p.oldPrice && (
              <span className="text-lg text-muted-foreground line-through">
                {formatDZD(p.oldPrice)}
              </span>
            )}
          </div>

          <div
            className={`inline-flex items-center gap-1.5 text-sm ${p.stock === "in" ? "text-success" : p.stock === "low" ? "text-warning" : "text-destructive"}`}
          >
            {p.stock === "in" ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
            {p.stock === "in"
              ? t("pd.inStockReady")
              : p.stock === "low"
                ? t("pd.lowStockOnly")
                : t("pd.outNow")}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleAddCart}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)] flex-1 sm:flex-none justify-center"
            >
              <ShoppingCart className="size-4" /> {t("pd.addCart")}
            </button>
            <button
              onClick={handleToggleFav}
              className={`inline-flex items-center gap-2 h-12 px-6 rounded-md border transition-colors ${liked ? "border-destructive/60 text-destructive" : "border-border hover:border-primary/60"}`}
            >
              <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />{" "}
              {liked ? t("pd.inFavorites") : t("pc.fav")}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Shield className="size-5 text-primary shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-sm">
                  {isService ? t("pd.serviceWarranty") : t("pd.warranty")}
                </div>
                <div className="text-muted-foreground">
                  {isService ? t("pd.serviceWarrantySub") : t("pd.warranty.sub")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Truck className="size-5 text-primary shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-sm">
                  {isService ? t("pd.serviceDelivery") : t("pd.delivery")}
                </div>
                <div className="text-muted-foreground">
                  {isService ? t("pd.serviceDeliverySub") : t("pd.delivery.sub")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`h-11 px-5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tb.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t(tb.key)}
            </button>
          ))}
        </div>
        <div className="py-8">
          {tab === "specs" && (
            <dl className="grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {p.specs &&
                Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="bg-card flex justify-between gap-4 px-5 py-3.5">
                    <dt className="text-sm text-muted-foreground capitalize">
                      {k in specKeyMap ? t(specKeyMap[k as SpecKey]) : k}
                    </dt>
                    <dd className="text-sm font-medium text-foreground text-end">{L(v)}</dd>
                  </div>
                ))}
            </dl>
          )}
          {tab === "desc" && (
            <div className="space-y-4 max-w-3xl">
              {specLine && specLine !== name && (
                <div className="rounded-lg border bg-muted/30 p-3.5 text-sm font-medium">
                  {specLine}
                </div>
              )}
              <p className="text-muted-foreground leading-relaxed">
                {name} — {t("pd.desc", { storeName: brand })}
              </p>
            </div>
          )}
          {tab === "rev" && (
            <div className="max-w-3xl space-y-6">
              {stats.count > 0 && (
                <div className="rounded-xl border border-border bg-card p-5 grid gap-5 sm:grid-cols-[auto_1fr] items-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{stats.avg.toFixed(1)}</div>
                    <div className="flex justify-center mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${i < Math.round(stats.avg) ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{stats.count} avis</div>
                  </div>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const c = distribution[n - 1];
                      const pct = stats.count ? (c / stats.count) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-muted-foreground">{n}★</span>
                          <div className="flex-1 h-1.5 rounded bg-muted overflow-hidden">
                            <div className="h-full bg-warning" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-end text-muted-foreground">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {stats.approved.length === 0 && (
                <p className="text-muted-foreground">{t("pd.noRev")}</p>
              )}
              <ul className="space-y-3">
                {stats.approved.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="font-semibold text-sm">{r.customerName}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.title && <p className="text-sm font-medium">{r.title}</p>}
                    <p className="text-sm text-muted-foreground">{r.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Intl.DateTimeFormat(
                        lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR",
                      ).format(new Date(r.createdAt))}
                    </p>
                  </li>
                ))}
              </ul>
              {user ? (
                <form
                  onSubmit={submitReview}
                  className="rounded-xl border border-border bg-card p-5 space-y-3"
                >
                  <h3 className="font-semibold text-sm">{t("pd.addRev")}</h3>
                  {submitted && <p className="text-xs text-primary">{t("pd.reviewPending")}</p>}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        aria-label={t("pd.starsLabel", { n: String(n) })}
                      >
                        <Star
                          className={`size-6 transition ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    maxLength={80}
                    placeholder={t("pd.reviewTitlePlaceholder")}
                    className="w-full h-10 rounded-md bg-background border border-border focus:border-primary outline-none px-3 text-sm"
                  />
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder={t("pd.reviewBodyPlaceholder")}
                    className="w-full rounded-md bg-background border border-border focus:border-primary outline-none p-3 text-sm"
                  />
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                  >
                    {t("pd.reviewSubmit")}
                  </button>
                </form>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex h-10 px-5 items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {t("pd.reviewLogin")}
                </Link>
              )}
            </div>
          )}
          {tab === "ship" && (
            <p className="text-muted-foreground leading-relaxed max-w-3xl">{t("pd.shipText")}</p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-6">{t("pd.related")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((x) => (
            <ProductCard key={x.id} p={x} />
          ))}
        </div>
      </section>
    </div>
  );
}
