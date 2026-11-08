import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useOrderMutations, useSiteContent } from "@/data-provider";
import { useFormatPrice } from "@/lib/format-price";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { renderBlock } from "@/components/blocks";
import type { Order, OrderStatus } from "@/api/types";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; labelKey: string; icon: typeof Clock }[] = [
  { status: "pending", labelKey: "track.step.pending", icon: Clock },
  { status: "processing", labelKey: "track.step.processing", icon: Package },
  { status: "shipped", labelKey: "track.step.shipped", icon: Truck },
  { status: "delivered", labelKey: "track.step.delivered", icon: CheckCircle2 },
];

export default function TrackOrder({
  suppressCustomBlocks = false,
}: {
  suppressCustomBlocks?: boolean;
} = {}) {
  const { t, lang } = useI18n();
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";
  const formatPrice = useFormatPrice();
  const { track } = useOrderMutations();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orderId, setOrderId] = useState(searchParams.get("id") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const fetchOrder = async (id: string, contact: string) => {
    if (!id.trim() || !contact.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await track(id.trim(), contact.trim());
      setOrder(res);
      setSearchParams({ id: id.trim(), phone: contact.trim() }, { replace: true });
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : t("track.not_found"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlId = searchParams.get("id");
    const urlPhone = searchParams.get("phone");
    if (urlId && urlPhone) {
      setOrderId(urlId);
      setPhone(urlPhone);
      fetchOrder(urlId, urlPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderId, phone);
  };

  const getStepIndex = (status: OrderStatus) => {
    if (status === "cancelled") return -1;
    switch (status) {
      case "pending":
        return 0;
      case "processing":
        return 1;
      case "shipped":
        return 2;
      case "delivered":
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;

  const { data: siteContent } = useSiteContent();
  const systemPage = siteContent?.customPages?.find(
    (p) => p.isSystem && (p.systemKey === "track" || p.slug === "track"),
  );
  const blocks = suppressCustomBlocks ? [] : systemPage?.blocks?.filter((b) => b.enabled) || [];
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
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Helmet>
          <title>{t("track.page.title")}</title>
          <meta name="description" content={t("track.page.desc")} />
          <link rel="canonical" href={`${window.location.origin}/track`} />
        </Helmet>

        {/* En-tête */}
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-sm">
            <Truck className="size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("track.title")}</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{t("track.subtitle")}</p>
        </div>

        {/* Formulaire de recherche */}
        <Card className="mb-8 border-border/80 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-5 items-end">
              <div className="sm:col-span-2 space-y-1.5 text-start">
                <Label htmlFor="track-id">{t("track.order_id")}</Label>
                <Input
                  id="track-id"
                  required
                  placeholder={t("track.order_id_placeholder")}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5 text-start">
                <Label htmlFor="track-phone">{t("track.phone")}</Label>
                <Input
                  id="track-phone"
                  required
                  placeholder={t("track.phone_placeholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <Button type="submit" disabled={loading} className="w-full gap-2">
                  <Search className="size-4" />
                  {loading ? t("track.searching") : t("track.btn_search")}
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-start text-sm text-destructive animate-fade-in-up">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résultat de suivi */}
        {order && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Progression Visuelle */}
            <Card className="border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <span>#{order.id}</span>
                      {order.status === "cancelled" ? (
                        <Badge variant="destructive">{t("order.status.cancelled")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {t(`order.status.${order.status}`)}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="size-3.5" />
                      <span>{new Date(order.createdAt).toLocaleString(locale)}</span>
                    </CardDescription>
                  </div>
                  <div className="text-end">
                    <span className="text-xs text-muted-foreground block">{t("cart.total")}</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {order.status === "cancelled" ? (
                  <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
                    <AlertCircle className="size-6 shrink-0" />
                    <div>
                      <p className="font-semibold">{t("order.status.cancelled")}</p>
                      <p className="text-xs opacity-90 mt-0.5">{t("track.cancelledNotice")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative py-4">
                    {/* Stepper horizontal */}
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isDone = idx <= currentStep;
                        const isCurrent = idx === currentStep;

                        return (
                          <div key={step.status} className="flex flex-col items-center relative">
                            <div
                              className={cn(
                                "size-10 rounded-full flex items-center justify-center transition-all duration-300 z-10",
                                isCurrent
                                  ? "bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 scale-110"
                                  : isDone
                                    ? "bg-primary/90 text-primary-foreground"
                                    : "bg-muted text-muted-foreground border border-border",
                              )}
                            >
                              <Icon className="size-5" />
                            </div>
                            <span
                              className={cn(
                                "mt-2 text-xs font-medium transition-colors",
                                isDone ? "text-foreground font-semibold" : "text-muted-foreground",
                              )}
                            >
                              {t(step.labelKey)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Note marchand si présente */}
                {order.note && (
                  <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-start text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-semibold flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
                      <ShieldCheck className="size-4" /> {t("track.teamMessage")}
                    </p>
                    <p className="leading-relaxed">{order.note}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Détails : Articles & Livraison */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Articles */}
              <Card className="border-border/80">
                <CardHeader className="pb-3 text-start">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="size-4 text-primary" />
                    {t("track.articles")} ({order.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="divide-y divide-border/60">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2.5 text-start">
                        {item.image ? (
                          <ImageCatalogue
                            src={item.image}
                            alt={item.name}
                            className="size-12 rounded-md object-contain border border-border/60 bg-muted/20 p-1 shrink-0"
                          />
                        ) : (
                          <div className="size-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="size-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.qty} × {formatPrice(item.price)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold shrink-0">
                          {formatPrice(item.price * item.qty)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-1.5 text-xs text-muted-foreground text-start">
                    <div className="flex justify-between">
                      <span>{t("cart.subtotal")}</span>
                      <span className="font-medium text-foreground">
                        {formatPrice(order.subtotal)}
                      </span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>
                          {t("account.discount")} {order.couponCode ? `(${order.couponCode})` : ""}
                        </span>
                        <span className="font-medium">− {formatPrice(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t("cart.shipping")}</span>
                      <span className="font-medium text-foreground">
                        {order.shipping === 0 ? t("common.free") : formatPrice(order.shipping)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-foreground border-t pt-2">
                      <span>{t("cart.total")}</span>
                      <span className="text-primary">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expédition & Adresse */}
              <Card className="border-border/80">
                <CardHeader className="pb-3 text-start">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    {t("track.destination")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-start text-sm">
                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-1">
                    <p className="font-semibold text-foreground">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.phone}</p>
                    {order.customerEmail && (
                      <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t("track.deliveryModeAndPlace")}
                    </span>
                    <p className="font-medium">
                      {order.deliveryKind === "desk"
                        ? t("track.deliveryDesk")
                        : t("track.deliveryHome")}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {order.address} · {t("account.wilayaLabel")} {order.wilaya}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t pt-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t("track.paymentMode")}
                    </span>
                    <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="size-3.5" />
                      <span>{order.paymentLabel || order.paymentMethod}</span>
                    </p>
                  </div>

                  {/* Historique chronologique */}
                  {order.statusHistory && order.statusHistory.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        {t("track.historySteps")}
                      </span>
                      <div className="space-y-1.5">
                        {order.statusHistory.map((ev, i) => (
                          <div key={i} className="flex items-start justify-between text-xs">
                            <span className="font-medium">
                              {t(`order.status.${ev.status}`)}
                              {ev.note && (
                                <span className="text-muted-foreground"> — {ev.note}</span>
                              )}
                            </span>
                            <span className="text-muted-foreground shrink-0 ms-2">
                              {new Date(ev.at).toLocaleDateString(locale)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      {bottomBlocks.map(renderBlock)}
    </div>
  );
}
