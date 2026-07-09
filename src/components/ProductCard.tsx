import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Check, AlertTriangle, Star, Zap } from "lucide-react";
import { type Product, formatDZD } from "@/data/products";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { productRatingStats, useAdminState } from "@/lib/admin-store";

export function ProductCard({ p }: { p: Product }) {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite, addToCart } = useStore();
  const { reviews } = useAdminState();
  const liked = isFavorite(p.id);
  const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const name = p.name;
  const stats = useMemo(() => productRatingStats(p.id), [p.id, reviews]);
  const avgRounded = Math.round(stats.avg * 2) / 2; // half-star precision

  return (
    <article className="group relative flex flex-col rounded-lg bg-card border border-border overflow-hidden transition-all duration-300 hover:border-primary/50 hover:-translate-y-1.5 hover:shadow-[var(--shadow-card)] animate-fade-in-up">
      <Link to={`/product/${p.id}`} className="block relative aspect-square bg-gradient-to-br from-background to-card overflow-hidden">
        <img src={p.image} alt={name} width={512} height={512} loading="lazy" className="size-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-110" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-background/80 backdrop-blur border border-border text-muted-foreground">{p.brand}</span>
          {discount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[44px] px-2.5 py-1 rounded-full text-[11px] font-bold bg-destructive text-destructive-foreground shadow-md transition-transform group-hover:scale-110">-{discount}%</span>
          )}
        </div>
        <button aria-label={t("pc.fav")} onClick={(e) => { e.preventDefault(); toggleFavorite(p.id); }} className={`absolute top-3 right-3 size-9 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border transition-all duration-200 hover:scale-110 active:scale-95 md:opacity-0 md:group-hover:opacity-100 ${liked ? "!opacity-100 text-destructive border-destructive/40" : "text-muted-foreground hover:text-foreground"}`}>
          <Heart className={`size-4 transition-transform ${liked ? "fill-current scale-110" : ""}`} />
        </button>
      </Link>
      <div className="flex flex-col gap-2 p-4">
        <Link to={`/product/${p.id}`} className="text-sm font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors min-h-[2.5em]">{name}</Link>
        <div className="flex items-center gap-1 text-warning">
          {[0,1,2,3].map((i) => <Star key={i} className="size-3 fill-current" />)}
          <Star className="size-3 fill-current opacity-50" />
          <span className="text-[11px] text-muted-foreground ms-1">(128)</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{p.specLine}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base font-bold text-foreground">{formatDZD(p.price)}</span>
          {p.oldPrice && <span className="text-xs text-muted-foreground line-through">{formatDZD(p.oldPrice)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          {p.stock === "low" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
              <Zap className="size-3 fill-current" />
              {t("pc.lowStock")}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${p.stock === "in" ? "text-success" : "text-destructive"}`}>
              {p.stock === "in" ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
              {p.stock === "in" ? t("pc.inStock") : t("pc.outStock")}
            </span>
          )}
        </div>
        <button onClick={async () => { await addToCart(p.id); toast.success(t("pc.added"), { description: name }); }} className="mt-2 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-95">
          <ShoppingCart className="size-4" />
          {t("pc.add")}
        </button>
      </div>
    </article>
  );
}
