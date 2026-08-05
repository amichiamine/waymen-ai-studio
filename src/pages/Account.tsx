import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMyOrderList } from "@/data-provider";
// Import de type uniquement : aucune fonction de `admin-store` n'est appelée
// depuis cette page — les données passent par le fournisseur.
import type { OrderStatus } from "@/lib/admin-store";
import { useAddresses, newAddressId, type UserAddress } from "@/lib/addresses";
import { WILAYAS } from "@/data/wilayas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, User, Package, MapPin, Plus, Trash2, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const fmt = (n: number) => `⁦${n.toLocaleString("fr-FR")} DA⁩`;

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "outline",
  shipped: "outline",
  delivered: "default",
  cancelled: "destructive",
};

export default function Account() {
  const { user, signOut, updateProfile } = useAuth();
  const { data: orders, loading, error } = useMyOrderList();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const { list: addresses, upsert, remove, setDefault } = useAddresses(user?.id);
  const [editing, setEditing] = useState<UserAddress | null>(null);

  const STATUS_LABEL: Record<OrderStatus, string> = {
    pending: t("order.status.pending"),
    processing: t("order.status.processing"),
    shipped: t("order.status.shipped"),
    delivered: t("order.status.delivered"),
    cancelled: t("order.status.cancelled"),
  };

  // useMyOrderList() filtre déjà par client connecté côté provider.
  const myOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // La persistance est entièrement déléguée au contexte d'authentification,
    // qui écrit via le fournisseur puis rafraîchit la session (correctif de la
    // phase 1 : `handleSave` enregistre réellement, il ne se contente pas
    // d'afficher un succès). Note : le téléphone n'est porté que par la
    // session — `AdminUser` n'a pas ce champ ; le backend de la phase 4 le
    // renverra dans `AuthSession.user`.
    try {
      const { error: saveError } = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      if (saveError) return toast.error(t("account.saveError"));
    } catch {
      // Échec visible plutôt que silencieux (AGENTS.md §7).
      return toast.error(t("account.saveError"));
    }
    toast.success(t("account.savedToast"));
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  function startNewAddress() {
    setEditing({
      id: newAddressId(),
      label: t("account.addr.labelPh").split(",")[0]?.trim() || "Home",
      fullName: user?.name ?? "",
      phone: user?.phone ?? "",
      wilaya: WILAYAS[15]?.code ?? "16",
      address: "",
      isDefault: addresses.length === 0,
    });
  }

  function saveAddress() {
    if (!editing) return;
    if (!editing.fullName.trim() || !editing.phone.trim() || !editing.address.trim()) {
      toast.error(t("account.addr.err.required"));
      return;
    }
    upsert(editing);
    toast.success(t("account.addr.saveOk"));
    setEditing(null);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <Helmet>
        <title>{t("account.page.title")}</title>
        <meta name="description" content={t("account.page.desc")} />
        <link rel="canonical" href={`${window.location.origin}/account`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="text-start">
          <h1 className="text-2xl font-bold">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("account.tab.profile")}</TabsTrigger>
          <TabsTrigger value="addresses">
            {t("account.tab.addresses")} ({addresses.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            {t("account.tab.orders")} ({loading ? "…" : myOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("account.profile.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("account.fullName")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">{t("account.phone")}</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">{t("account.save")}</Button>
                  <Button type="button" variant="outline" onClick={handleLogout}>
                    <LogOut className="me-2 h-4 w-4" /> {t("account.logout")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={startNewAddress}>
              <Plus className="me-2 h-4 w-4" /> {t("account.addr.newBtn")}
            </Button>
          </div>
          {addresses.length === 0 && !editing && (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                <MapPin className="mx-auto mb-3 h-10 w-10 opacity-40" />
                {t("account.addr.none")}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {addresses.map((a) => (
              <Card key={a.id} className={a.isDefault ? "border-primary" : ""}>
                <CardContent className="p-4 space-y-2 text-start">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{a.label}</span>
                    {a.isDefault && (
                      <Badge variant="default">
                        <Star className="h-3 w-3 me-1" />
                        {t("account.addr.default")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    {a.fullName} · {a.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {WILAYAS.find((w) => w.code === a.wilaya)?.name_fr ?? a.wilaya} — {a.address}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                      {t("common.edit")}
                    </Button>
                    {!a.isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => setDefault(a.id)}>
                        {t("account.addr.setDefault")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        remove(a.id);
                        toast.success(t("account.addr.delOk"));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {editing && (
            <Card className="border-primary/60">
              <CardHeader>
                <CardTitle className="text-base">
                  {addresses.find((a) => a.id === editing.id)
                    ? t("account.addr.editing")
                    : t("account.addr.new")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>{t("account.addr.label")}</Label>
                  <Input
                    value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    placeholder={t("account.addr.labelPh")}
                  />
                </div>
                <div>
                  <Label>{t("account.addr.fullName")}</Label>
                  <Input
                    value={editing.fullName}
                    onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("account.addr.phone")}</Label>
                  <Input
                    value={editing.phone}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("account.addr.wilaya")}</Label>
                  <Select
                    value={editing.wilaya}
                    onValueChange={(v) => setEditing({ ...editing, wilaya: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WILAYAS.map((w) => (
                        <SelectItem key={w.code} value={w.code}>
                          {w.code} — {w.name_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>{t("account.addr.address")}</Label>
                  <Textarea
                    rows={2}
                    value={editing.address}
                    onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  />
                </div>
                <label className="md:col-span-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.isDefault}
                    onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                  {t("account.addr.markDefault")}
                </label>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={saveAddress}>{t("common.save")}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {/* 1. Chargement */}
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">{t("app.loading")}</span>
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : (
            <>
              {/* 2. Erreur */}
              {error && (
                <p
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error.message}
                </p>
              )}

              {/* 3. Vide / contenu */}
              {myOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center text-sm text-muted-foreground">
                    <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    {t("account.orders.none")}
                    <div className="mt-3">
                      <Link to="/category" className="text-primary hover:underline">
                        {t("account.orders.discover")}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {myOrders.map((o) => (
                    <Card key={o.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-start">
                            <p className="font-mono text-sm font-semibold">{o.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.createdAt).toLocaleString(locale)} · {o.items.length}{" "}
                              {t("account.order.articles")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{fmt(o.total)}</span>
                            <Badge variant={STATUS_VARIANT[o.status]}>
                              {STATUS_LABEL[o.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {o.items
                            .slice(0, 4)
                            .map(
                              (it, i) =>
                                it.image && (
                                  <img
                                    key={i}
                                    src={it.image}
                                    alt=""
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ),
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          {(o.statusHistory ?? [])
                            .map((ev, i) => (
                              <span key={i}>
                                {STATUS_LABEL[ev.status]} ·{" "}
                                {new Date(ev.at).toLocaleDateString(locale)}
                              </span>
                            ))
                            .reduce<React.ReactNode[]>(
                              (acc, cur, i) => (i === 0 ? [cur] : [...acc, " → ", cur]),
                              [],
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
