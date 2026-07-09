import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { products, formatDZD, categoryMeta, type SpecKey } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { Heart, ShoppingCart, Check, AlertTriangle, ChevronRight, Shield, Truck, Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n, type TKey } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const specKeyMap: Record<SpecKey, TKey> = {
  cpu: "spec.cpu", ram: "spec.ram", storage: "spec.storage", gpu: "spec.gpu",
  screen: "spec.screen", os: "spec.os", battery: "spec.battery", weight: "spec.weight",
  form: "spec.form", motherboard: "spec.motherboard", psu: "spec.psu", camera: "spec.camera",
};

export default function Product() {
  const { id } = useParams();
  const p = products.find((x) => x.id === id);
  useEffect(() => { document.title = p ? `${p.name} — KA Tech` : "Produit introuvable — KA Tech"; }, [p]);
  if (!p) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Produit introuvable</h1>
        <Link to="/category" className="mt-4 inline-block text-primary hover:underline">Voir le catalogue</Link>
      </div>
    );
  }
  const cat = categoryMeta[p.category];
  const [tab, setTab] = useState("specs");
  const { t } = useI18n();
  const { user } = useAuth();
  const { addToCart, toggleFavorite, isFavorite } = useStore();
  const navigate = useNavigate();
  const liked = isFavorite(p.id);
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const name = p.name;
  const tabs: { id: string; key: TKey }[] = [
    { id: "specs", key: "pd.tab.specs" }, { id: "desc", key: "pd.tab.desc" },
    { id: "rev", key: "pd.tab.rev" }, { id: "ship", key: "pd.tab.ship" },
  ];

  type LocalReview = { id: string; name: string; rating: number; comment: string; date: string };
  const reviewsKey = `kt-reviews-${p.id}`;
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  useEffect(() => {
    try { setReviews(JSON.parse(localStorage.getItem(reviewsKey) ?? "[]")); } catch { /* */ }
  }, [reviewsKey]);

  const handleAddCart = async () => {
    if (!user) { navigate("/auth"); return; }
    await addToCart(p.id);
    toast.success(t("pd.added"), { description: name });
  };
  const handleToggleFav = async () => {
    if (!user) { navigate("/auth"); return; }
    await toggleFavorite(p.id);
    toast.success(liked ? "Retiré des favoris" : "Ajouté aux favoris");
  };
  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!comment.trim()) { toast.error("Écrivez un commentaire"); return; }
    const r: LocalReview = {
      id: crypto.randomUUID(),
      name: user.user_metadata?.name ?? user.email ?? "Client",
      rating, comment: comment.trim(),
      date: new Date().toISOString(),
    };
    const next = [r, ...reviews];
    setReviews(next);
    localStorage.setItem(reviewsKey, JSON.stringify(next));
    setComment(""); setRating(5);
    toast.success("Merci, votre avis a été enregistré");
  };

  return (
    <div className="container-page py-8 lg:py-12">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5 mb-6">
        <Link to="/" className="hover:text-foreground">{t("common.home")}</Link>
        <ChevronRight className="size-3" />
        <Link to={`/category/${p.category}`} className="hover:text-foreground">{t(cat.labelKey)}</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground line-clamp-1">{name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-border bg-card relative overflow-hidden aspect-square">
          <div className="absolute inset-0 blur-3xl opacity-30" style={{ background: "var(--gradient-glow)" }} aria-hidden />
          <img src={p.image} alt={name} width={1024} height={1024} className="relative size-full object-contain p-10" />
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-card border border-border">{p.brand}</span>
            {discount > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-destructive text-destructive-foreground">-{discount}%</span>
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">{name}</h1>
          <p className="text-muted-foreground">{p.specLine}</p>

          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-4xl font-bold">{formatDZD(p.price)}</span>
            {p.oldPrice && <span className="text-lg text-muted-foreground line-through">{formatDZD(p.oldPrice)}</span>}
          </div>

          <div className={`inline-flex items-center gap-1.5 text-sm ${p.stock === "in" ? "text-success" : p.stock === "low" ? "text-warning" : "text-destructive"}`}>
            {p.stock === "in" ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
            {p.stock === "in" ? t("pd.inStockReady") : p.stock === "low" ? t("pd.lowStockOnly") : t("pd.outNow")}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handleAddCart} className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)] flex-1 sm:flex-none justify-center">
              <ShoppingCart className="size-4" /> {t("pd.addCart")}
            </button>
            <button onClick={handleToggleFav} className={`inline-flex items-center gap-2 h-12 px-6 rounded-md border transition-colors ${liked ? "border-destructive/60 text-destructive" : "border-border hover:border-primary/60"}`}>
              <Heart className={`size-4 ${liked ? "fill-current" : ""}`} /> {liked ? "Dans les favoris" : t("pc.fav")}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Shield className="size-5 text-primary shrink-0" />
              <div className="text-xs"><div className="font-semibold text-sm">{t("pd.warranty")}</div><div className="text-muted-foreground">{t("pd.warranty.sub")}</div></div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Truck className="size-5 text-primary shrink-0" />
              <div className="text-xs"><div className="font-semibold text-sm">{t("pd.delivery")}</div><div className="text-muted-foreground">{t("pd.delivery.sub")}</div></div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)} className={`h-11 px-5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === tb.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t(tb.key)}</button>
          ))}
        </div>
        <div className="py-8">
          {tab === "specs" && (
            <dl className="grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {Object.entries(p.specs).map(([k, v]) => (
                <div key={k} className="bg-card flex justify-between gap-4 px-5 py-3.5">
                  <dt className="text-sm text-muted-foreground">{t(specKeyMap[k as SpecKey])}</dt>
                  <dd className="text-sm font-medium text-foreground text-right">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {tab === "desc" && <p className="text-muted-foreground leading-relaxed max-w-3xl">{name} — {t("pd.desc")}</p>}
          {tab === "rev" && (
            <div className="max-w-3xl space-y-6">
              {reviews.length === 0 && <p className="text-muted-foreground">{t("pd.noRev")}</p>}
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="font-semibold text-sm">{r.name}</span>
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                      ))}</div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                  </li>
                ))}
              </ul>
              {user ? (
                <form onSubmit={submitReview} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h3 className="font-semibold text-sm">Ajouter votre avis</h3>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} étoiles`}>
                        <Star className={`size-6 transition ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3} placeholder="Partagez votre avis sur ce produit..." className="w-full rounded-md bg-background border border-border focus:border-primary outline-none p-3 text-sm" />
                  <button type="submit" className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Envoyer l'avis</button>
                </form>
              ) : (
                <Link to="/auth" className="inline-flex h-10 px-5 items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">Connectez-vous pour ajouter un avis</Link>
              )}
            </div>
          )}
          {tab === "ship" && <p className="text-muted-foreground leading-relaxed max-w-3xl">{t("pd.shipText")}</p>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold mb-6">{t("pd.related")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((x) => <ProductCard key={x.id} p={x} />)}
        </div>
      </section>
    </div>
  );
}
