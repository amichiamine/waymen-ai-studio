import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminState } from "@/lib/admin-store";
import { useI18n } from "@/lib/i18n";

const fmt = (n: number) => `\u2066${n.toLocaleString("fr-FR")} DA\u2069`;

export default function CheckoutSuccess() {
  const { t } = useI18n();
  useEffect(() => { document.title = t("success.page.title"); }, [t]);
  const [params] = useSearchParams();
  const id = params.get("id");
  const { orders } = useAdminState();
  const order = id ? orders.find((o) => o.id === id) : undefined;

  return (
    <div className="container mx-auto max-w-xl px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">{t("success.title")}</h1>
      {order ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{order.id}</span>
          </p>
          <p className="text-sm text-muted-foreground">{t("success.generic")}</p>
          <Card className="mt-6 text-start">
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Package className="h-4 w-4" /> {t("success.summary")}
              </div>
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="truncate">{it.name} × {it.qty}</span>
                  <span>{fmt(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="border-t pt-2 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.subtotal")}</span><span>{fmt(order.subtotal)}</span></div>
                {order.discount > 0 && <div className="flex justify-between text-primary"><span>{t("cart.discount")} {order.couponCode}</span><span>− {fmt(order.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.shipping")}</span><span>{order.shipping === 0 ? t("common.free") : fmt(order.shipping)}</span></div>
                <div className="flex justify-between text-sm font-semibold"><span>{t("cart.total")}</span><span>{fmt(order.total)}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">{t("success.payment")} : {order.paymentLabel ?? order.paymentMethod}</p>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{t("success.generic")}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/account"><Button variant="outline">{t("success.myOrders")}</Button></Link>
        <Link to="/"><Button>{t("success.backHome")}</Button></Link>
      </div>
    </div>
  );
}
