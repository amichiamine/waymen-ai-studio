import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trash2, Minus, Plus, ShoppingBag, Tag, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCouponMutations, useProductDetail } from "@/data-provider";
import type { CouponCheckResult } from "@/api/types";
import type { Product } from "@/data/products";
import { useI18n, useLocalize } from "@/lib/i18n";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { formatPriceRaw } from "@/lib/format-price";

const fmt = (n: number) => formatPriceRaw(n);
const COUPON_KEY = "ka-cart-coupon";

/** Forme réduite d'un coupon validé — issu de `CouponCheckResult` (branche `valid: true`). */
type AppliedCoupon = Extract<CouponCheckResult, { valid: true }>;

/**
 * Contribution d'une ligne au total du panier.
 * Transmise au parent via `onContribution` dès que le produit est résolu.
 */
type LineContribution = {
  product_id: string;
  price: number; // 0 si introuvable (la ligne s'affiche mais ne contribue pas au total)
  quantity: number;
  stock: Product["stock"] | null;
};

type CartLineProps = {
  product_id: string;
  quantity: number;
  onContribution: (c: LineContribution) => void;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
};

/**
 * Ligne de panier autonome — résout son propre produit via `useProductDetail`.
 *
 * Raison d'être : après l'exclusion des `custom_build` du listing public, un
 * article de configuration n'est plus renvoyé par `GET /products?perPage=100`
 * mais reste accessible via `GET /products/:id`. Cette résolution individuelle
 * garantit qu'aucune ligne ne disparaît silencieusement du panier.
 *
 * Le mode mock n'est pas impacté : `useProductDetail` lit le store local, qui
 * contient toujours les configurations.
 */
function CartLine({ product_id, quantity, onContribution, onQtyChange, onRemove }: CartLineProps) {
  const { data: product, loading, error } = useProductDetail(product_id);
  const { t } = useI18n();
  const L = useLocalize();

  useEffect(() => {
    if (loading) return;
    onContribution({
      product_id,
      price: product ? product.price : 0,
      quantity,
      stock: product ? product.stock : null,
    });
  }, [product_id, product, loading, quantity, onContribution]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="h-20 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="flex-1 text-sm text-destructive">
            {error ? error.message : t("cart.badge.out")} — {product_id}
          </p>
          <Button size="icon" variant="ghost" onClick={() => onRemove(product_id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <ImageCatalogue
          src={product.image}
          alt={L(product.name) ?? ""}
          className="h-20 w-20 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{L(product.name) ?? ""}</p>
          <p className="text-xs text-muted-foreground">{L(product.specLine)}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm font-semibold text-primary">{fmt(product.price)}</p>
            {product.stock === "out" && (
              <Badge variant="destructive" className="text-[10px]">
                {t("cart.badge.out")}
              </Badge>
            )}
            {product.stock === "low" && (
              <Badge variant="secondary" className="text-[10px]">
                {t("cart.badge.low")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => onQtyChange(product_id, quantity - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{quantity}</span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onQtyChange(product_id, quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onRemove(product_id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Cart() {
  const { t } = useI18n();
  const { cart, updateQty, removeFromCart } = useStore();
  const { validate: validateCoupon } = useCouponMutations();

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);

  /**
   * Contributions résumées par identifiant de produit.
   * Mise à jour par chaque ligne dès que son produit est résolu.
   */
  const [contributions, setContributions] = useState<Map<string, LineContribution>>(
    () => new Map(),
  );

  const handleContribution = useCallback((c: LineContribution) => {
    setContributions((prev) => {
      const next = new Map(prev);
      next.set(c.product_id, c);
      return next;
    });
  }, []);

  // Nettoyer les contributions des articles retirés du panier.
  const prevCartRef = useRef(cart);
  useEffect(() => {
    const currentIds = new Set(cart.map((c) => c.product_id));
    const prevIds = new Set(prevCartRef.current.map((c) => c.product_id));
    const removed = [...prevIds].filter((id) => !currentIds.has(id));
    if (removed.length > 0) {
      setContributions((prev) => {
        const next = new Map(prev);
        removed.forEach((id) => next.delete(id));
        return next;
      });
    }
    prevCartRef.current = cart;
  }, [cart]);

  const subtotal = cart.reduce((acc, entry) => {
    const c = contributions.get(entry.product_id);
    return acc + (c ? c.price * c.quantity : 0);
  }, 0);

  const hasOutOfStock = [...contributions.values()].some(
    (c) => c.stock === "out" || c.stock === null,
  );

  // `validateCoupon` est stable (mémoïsé dans useCouponMutations) — on peut
  // l'inclure dans les deps sans risquer de boucle.
  const tryApplyStored = useCallback(
    async (code: string, amount: number) => {
      try {
        const result = await validateCoupon(code, amount);
        if (result.valid) {
          setApplied(result);
        } else {
          window.localStorage.removeItem(COUPON_KEY);
        }
      } catch {
        window.localStorage.removeItem(COUPON_KEY);
      }
    },
    [validateCoupon],
  );

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(COUPON_KEY) : null;
    if (stored && subtotal > 0) {
      void tryApplyStored(stored, subtotal);
    }
    // On ne dépend pas de subtotal ici : on ne veut exécuter ce chemin
    // qu'au montage, pour restaurer le coupon enregistré.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!applied) return;
    validateCoupon(applied.code, subtotal)
      .then((v) => {
        if (!v.valid) {
          setApplied(null);
          window.localStorage.removeItem(COUPON_KEY);
          toast.error(v.reason);
        } else if (v.discount !== applied.discount) {
          setApplied(v);
        }
      })
      .catch(() => {
        // Une erreur réseau ne doit pas retirer le coupon silencieusement.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  async function apply() {
    if (!couponInput.trim()) return;
    try {
      const v = await validateCoupon(couponInput, subtotal);
      if (!v.valid) {
        toast.error(v.reason);
        return;
      }
      setApplied(v);
      window.localStorage.setItem(COUPON_KEY, v.code);
      setCouponInput("");
      toast.success(v.code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("cart.coupon.apply");
      toast.error(msg);
    }
  }

  function removeCoupon() {
    setApplied(null);
    window.localStorage.removeItem(COUPON_KEY);
  }

  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>{t("cart.page.title")}</title>
        <meta name="description" content={t("cart.page.desc")} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <h1 className="mb-6 text-2xl font-bold">{t("cart.title")}</h1>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t("cart.empty")}</p>
          <Link to="/category" className="text-primary hover:underline">
            {t("cart.discover")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.map((entry) => (
              <CartLine
                key={entry.product_id}
                product_id={entry.product_id}
                quantity={entry.quantity}
                onContribution={handleContribution}
                onQtyChange={updateQty}
                onRemove={removeFromCart}
              />
            ))}
          </div>

          <Card className="h-fit">
            <CardContent className="space-y-4 p-6">
              {applied ? (
                <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-mono font-medium">{applied.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {`−${fmt(applied.discount)}`}
                    </span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={removeCoupon}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("cart.coupon.label")}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="BIENVENUE10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void apply();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => void apply()}>
                      {t("cart.coupon.apply")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.discount")}</span>
                  <span className="text-primary">− {fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span>{t("cart.shipping.calc")}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>{t("cart.total")}</span>
                <span className="text-primary">{fmt(total)}</span>
              </div>

              {hasOutOfStock && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t("cart.oos.warn")}</span>
                </div>
              )}

              <Link to="/checkout" className={hasOutOfStock ? "pointer-events-none" : ""}>
                <Button className="w-full" disabled={hasOutOfStock}>
                  {t("cart.checkout")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
