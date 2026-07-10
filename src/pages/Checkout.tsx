import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useProducts } from "@/lib/useProducts";
import { WILAYAS } from "@/data/wilayas";
import { useAuth } from "@/lib/auth";
import {
  useAdminState, validateCoupon, computeShipping, createOrder,
} from "@/lib/admin-store";
import { useAddresses } from "@/lib/addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Tag, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const fmt = (n: number) => n.toLocaleString("fr-FR") + " DA";
const COUPON_KEY = "ka-cart-coupon";

export default function Checkout() {
  const { user } = useAuth();
  const { cart, clearCart } = useStore();
  const { paymentMethods, shippingSettings } = useAdminState();
  const products = useProducts();
  const { t } = useI18n();

  const { list: addresses, defaultAddress } = useAddresses(user?.id);
  const navigate = useNavigate();

  const activePayments = useMemo(() => paymentMethods.filter((p) => p.active), [paymentMethods]);

  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [name, setName] = useState(defaultAddress?.fullName ?? user?.user_metadata?.name ?? "");
  const [phone, setPhone] = useState(defaultAddress?.phone ?? user?.user_metadata?.phone ?? "");
  const [wilaya, setWilaya] = useState(defaultAddress?.wilaya ?? "");
  const [address, setAddress] = useState(defaultAddress?.address ?? "");
  const [delivery, setDelivery] = useState<"home" | "desk">(shippingSettings.homeEnabled ? "home" : "desk");
  const [paymentId, setPaymentId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!paymentId && activePayments.length) setPaymentId(activePayments[0].id);
  }, [activePayments, paymentId]);

  useEffect(() => {
    if (addressId === "new") return;
    const a = addresses.find((x) => x.id === addressId);
    if (a) { setName(a.fullName); setPhone(a.phone); setWilaya(a.wilaya); setAddress(a.address); }
  }, [addressId, addresses]);

  const lines = cart
    .map((c) => {
      const p = products.find((x) => x.id === c.product_id);
      return p ? { ...c, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const subtotal = lines.reduce((a, l) => a + l.product.price * l.quantity, 0);

  const storedCode = typeof window !== "undefined" ? window.localStorage.getItem(COUPON_KEY) : null;
  const couponEval = storedCode ? validateCoupon(storedCode, subtotal) : null;
  const discount = couponEval && couponEval.ok ? couponEval.discount : 0;
  const couponCode = couponEval && couponEval.ok ? couponEval.coupon.code : undefined;

  const shipping = wilaya ? computeShipping(wilaya, delivery, subtotal - discount) : 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const outOfStock = lines.filter((l) => l.product.stock === "out");
  const canSubmit = !!wilaya && !!paymentId && outOfStock.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (outOfStock.length > 0) { toast.error(t("checkout.err.oos")); return; }
    if (!paymentId) { toast.error(t("checkout.err.pm")); return; }
    setBusy(true);
    const pm = activePayments.find((p) => p.id === paymentId);
    const order = createOrder({
      customerName: name,
      customerEmail: user?.email,
      customerId: user?.id,
      items: lines.map((l) => ({
        productId: l.product_id,
        name: l.product.name,
        price: l.product.price,
        qty: l.quantity,
        image: l.product.image,
      })),
      subtotal, discount, couponCode, shipping, total,
      paymentMethod: paymentId, paymentLabel: pm?.label,
      wilaya, deliveryKind: delivery, address, phone,
      note: notes || undefined,
    });
    if (couponCode) window.localStorage.removeItem(COUPON_KEY);
    await clearCart();
    navigate(`/checkout/success?id=${order.id}`);
  };

  if (lines.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("checkout.empty")}</p>
        <Link to="/category" className="mt-4 inline-block text-primary hover:underline">{t("checkout.seeProducts")}</Link>
      </div>
    );
  }

  const selectedPayment = activePayments.find((p) => p.id === paymentId);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <Helmet>
        <title>{t("checkout.page.title")}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="mb-6 text-2xl font-bold">{t("checkout.title")}</h1>
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {addresses.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {t("checkout.savedAddr")}</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={addressId} onValueChange={setAddressId}>
                  {addresses.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded border p-3">
                      <RadioGroupItem value={a.id} id={`a-${a.id}`} className="mt-1" />
                      <div className="text-sm text-start">
                        <p className="font-medium">{a.label} · {a.fullName}</p>
                        <p className="text-xs text-muted-foreground">{a.phone} — {WILAYAS.find((w) => w.code === a.wilaya)?.name_fr}, {a.address}</p>
                      </div>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 rounded border border-dashed p-3">
                    <RadioGroupItem value="new" id="a-new" />
                    <span className="text-sm">{t("checkout.newAddr")}</span>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>{t("checkout.contact.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">{t("checkout.name")}</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">{t("checkout.phone")}</Label>
                  <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t("checkout.wilaya")}</Label>
                <Select value={wilaya} onValueChange={setWilaya}>
                  <SelectTrigger><SelectValue placeholder={t("checkout.wilaya.placeholder")} /></SelectTrigger>
                  <SelectContent>
                    {WILAYAS.map((w) => (
                      <SelectItem key={w.code} value={w.code}>{w.code} — {w.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">{t("checkout.address")}</Label>
                <Textarea id="address" required value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("checkout.delivery.title")}</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={delivery} onValueChange={(v) => setDelivery(v as "home" | "desk")}>
                {shippingSettings.homeEnabled && (
                  <label className="flex cursor-pointer items-center justify-between rounded border p-3">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="home" id="d-home" />
                      <span>{t("checkout.delivery.home")}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {wilaya ? fmt(computeShipping(wilaya, "home", subtotal - discount)) : t("checkout.wilaya.choose")}
                    </span>
                  </label>
                )}
                {shippingSettings.deskEnabled && (
                  <label className="flex cursor-pointer items-center justify-between rounded border p-3">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="desk" id="d-desk" />
                      <span>{t("checkout.delivery.desk")}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {wilaya ? fmt(computeShipping(wilaya, "desk", subtotal - discount)) : t("checkout.wilaya.choose")}
                    </span>
                  </label>
                )}
              </RadioGroup>
              {shippingSettings.freeShippingThreshold > 0 && subtotal - discount >= shippingSettings.freeShippingThreshold && (
                <Badge variant="secondary" className="mt-3">{t("checkout.delivery.freeApplied")}</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("checkout.payment.title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("checkout.payment.none")}</p>
              ) : (
                <RadioGroup value={paymentId} onValueChange={setPaymentId}>
                  {activePayments.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded border p-3">
                      <RadioGroupItem value={m.id} id={`pm-${m.id}`} className="mt-1" />
                      <div className="text-start">
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.instructions}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}
              {selectedPayment && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  ℹ️ {selectedPayment.instructions}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("checkout.notes.title")}</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("checkout.notes.placeholder")} />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>{t("checkout.summary.title")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l) => (
              <div key={l.product_id} className="flex items-center gap-3 text-sm">
                <img src={l.product.image} alt="" className="h-12 w-12 rounded object-cover" />
                <div className="min-w-0 flex-1 text-start">
                  <p className="truncate">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">× {l.quantity}</p>
                </div>
                <span className="whitespace-nowrap">{fmt(l.product.price * l.quantity)}</span>
              </div>
            ))}
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.subtotal")}</span><span>{fmt(subtotal)}</span></div>
              {discount > 0 && couponCode && (
                <div className="flex justify-between text-primary">
                  <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {couponCode}</span>
                  <span>− {fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span>{wilaya ? (shipping === 0 ? t("common.free") : fmt(shipping)) : "—"}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>{t("cart.total")}</span><span className="text-primary">{fmt(total)}</span>
              </div>
            </div>

            {outOfStock.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{outOfStock.map((l) => l.product.name).join(", ")}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy || !canSubmit}>
              {busy ? t("checkout.submitting") : t("checkout.submit")}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
