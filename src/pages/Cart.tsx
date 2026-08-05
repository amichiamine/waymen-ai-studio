import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trash2, Minus, Plus, ShoppingBag, Tag, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useProducts } from "@/lib/useProducts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCouponMutations } from "@/data-provider";
import type { CouponCheckResult } from "@/api/types";
import { useI18n } from "@/lib/i18n";

const fmt = (n: number) => `⁦${n.toLocaleString("fr-FR")} DA⁩`;
const COUPON_KEY = "ka-cart-coupon";

/** Forme réduite d'un coupon validé — issu de `CouponCheckResult` (branche `valid: true`). */
type AppliedCoupon = Extract<CouponCheckResult, { valid: true }>;

export default function Cart() {
  const { t } = useI18n();
  const { cart, updateQty, removeFromCart } = useStore();
  const products = useProducts();
  const { validate: validateCoupon } = useCouponMutations();

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);

  const lines = cart
    .map((c) => {
      const p = products.find((x) => x.id === c.product_id);
      return p ? { ...c, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const subtotal = lines.reduce((a, l) => a + l.product.price * l.quantity, 0);

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

  const hasOutOfStock = lines.some((l) => l.product.stock === "out");
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

      {lines.length === 0 ? (
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
            {lines.map((l) => (
              <Card key={l.product_id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <img
                    src={l.product.image}
                    alt={l.product.name}
                    className="h-20 w-20 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.product.name}</p>
                    <p className="text-xs text-muted-foreground">{l.product.specLine}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary">{fmt(l.product.price)}</p>
                      {l.product.stock === "out" && (
                        <Badge variant="destructive" className="text-[10px]">
                          {t("cart.badge.out")}
                        </Badge>
                      )}
                      {l.product.stock === "low" && (
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
                      onClick={() => updateQty(l.product_id, l.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{l.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQty(l.product_id, l.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeFromCart(l.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
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
