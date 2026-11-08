import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOrderDetail, useSiteContent } from "@/data-provider";
import { useI18n } from "@/lib/i18n";
import { renderBlock } from "@/components/blocks";

const fmt = (n: number) => `⁦${n.toLocaleString("fr-FR")} DA⁩`;

export default function CheckoutSuccess() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const id = params.get("id") ?? undefined;

  // Le hook reste toujours monté — `id` peut être undefined (hook inactif).
  const { data: order } = useOrderDetail(id);
  const { data: siteContent } = useSiteContent();

  const systemPage = siteContent?.customPages?.find(
    (p) => p.isSystem && (p.systemKey === "checkout_success" || p.slug === "checkout-success"),
  );
  const blocks = systemPage?.blocks?.filter((b) => b.enabled) || [];
  const topBlocks = blocks.filter((b) => (b.style?.placement || "top") === "top");
  const bottomBlocks = blocks.filter((b) => b.style?.placement === "bottom");

  const pageBgClass =
    systemPage?.layout?.pageBg === "dark"
      ? "bg-[#0a0f1d] text-white min-h-[80vh]"
      : systemPage?.layout?.pageBg === "surface"
        ? "bg-card min-h-[80vh]"
        : systemPage?.layout?.pageBg === "muted"
          ? "bg-muted/30 min-h-[80vh]"
          : systemPage?.layout?.pageBg === "gradient"
            ? "bg-gradient-to-b from-background via-muted/20 to-background min-h-[80vh]"
            : undefined;

  return (
    <div className={pageBgClass}>
      {topBlocks.map(renderBlock)}
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <Helmet>
          <title>{t("success.page.title")}</title>
          <meta name="description" content={t("success.page.desc")} />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
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
                    <span className="truncate">
                      {it.name} × {it.qty}
                    </span>
                    <span>{fmt(it.price * it.qty)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                    <span>{fmt(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>
                        {t("cart.discount")} {order.couponCode}
                      </span>
                      <span>− {fmt(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.shipping")}</span>
                    <span>{order.shipping === 0 ? t("common.free") : fmt(order.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{t("cart.total")}</span>
                    <span>{fmt(order.total)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("success.payment")} : {order.paymentLabel ?? order.paymentMethod}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("success.generic")}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/account">
            <Button variant="outline">{t("success.myOrders")}</Button>
          </Link>
          <Link to="/">
            <Button>{t("success.backHome")}</Button>
          </Link>
        </div>
      </div>
      {bottomBlocks.map(renderBlock)}
    </div>
  );
}
