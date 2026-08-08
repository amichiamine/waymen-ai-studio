import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useOrderList, useProductList, useCategoryList, useCustomerList } from "@/data-provider";
import type { OrderStatus } from "@/lib/admin-store";
import { formatDZD } from "@/data/products";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Stratégie de combinaison pour Analytics (page d'agrégation) :
//
// - `loading` global = true si AU MOINS une source charge encore — on attend
//   que toutes les sources soient disponibles avant d'afficher les KPI, car
//   un KPI partiel (ex. revenus sans commandes) induirait en erreur.
// - Les graphiques sont rendus indépendamment : si `orders` est disponible mais
//   pas `products`, le graphique de CA par jour s'affiche quand même. Un bloc
//   en erreur affiche un message contextuel sans masquer les autres.
// - `Analytics.tsx` ne réintroduit aucune métrique inventée : l'entonnoir est
//   fondé sur `statusHistory` réel, le KPI est « Taux de livraison ».

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 80% 55%))",
  "hsl(var(--chart-3, 340 75% 55%))",
  "hsl(var(--chart-4, 45 90% 55%))",
  "hsl(var(--chart-5, 160 65% 45%))",
];

export default function AdminAnalytics() {
  const { t } = useI18n();
  const { data: orders, loading: lOrd, error: eOrd } = useOrderList();
  const { data: products, loading: lProd, error: eProd } = useProductList();
  const { data: categories, loading: lCat, error: eCat } = useCategoryList();
  const { data: customers, loading: lCust, error: eCust } = useCustomerList();

  // Écran de lecture seule — aucune mutation, pas de garde d'action requise.
  const { can } = usePermissions();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const days = parseInt(range, 10);

  // Chargement global : on attend toutes les sources avant d'afficher les KPI.
  const loading = lOrd || lProd || lCat || lCust;

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; revenue: number }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), orders: 0, revenue: 0 });
    }
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.createdAt.slice(0, 10);
      const row = map.get(key);
      if (row) {
        row.orders += 1;
        row.revenue += o.total;
      }
    }
    return Array.from(map.values());
  }, [orders, days]);

  const topProducts = useMemo(() => {
    const acc = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      for (const it of o.items) {
        const cur = acc.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price;
        acc.set(it.productId, cur);
      }
    }
    return Array.from(acc.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders]);

  const byCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      for (const it of o.items) {
        const p = products.find((x) => x.id === it.productId);
        if (!p) continue;
        acc[p.category] = (acc[p.category] ?? 0) + it.qty * it.price;
      }
    }
    return categories
      .map((c) => ({ name: c.label, value: acc[c.slug] ?? 0 }))
      .filter((x) => x.value > 0);
  }, [orders, products, categories]);

  // Entonnoir strictement mesuré : chaque étage correspond à une étape du cycle de
  // vie des commandes réellement enregistrée dans `statusHistory`.
  const funnel = useMemo(() => {
    const flow: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];
    // Les libellés viennent du dictionnaire i18n — pas de chaînes en dur.
    const labels = [
      t("admin.systeme.analytique.entonnoir_recues"),
      t("admin.systeme.analytique.entonnoir_preparation"),
      t("admin.systeme.analytique.entonnoir_expediees"),
      t("admin.systeme.analytique.entonnoir_livrees"),
    ];
    const reached = flow.map(() => 0);
    let cancelled = 0;
    for (const o of orders) {
      if (o.status === "cancelled") cancelled += 1;
      const seen = new Set<OrderStatus>([
        o.status,
        ...(o.statusHistory ?? []).map((e) => e.status),
      ]);
      let last = 0;
      flow.forEach((s, i) => {
        if (seen.has(s) && i > last) last = i;
      });
      for (let i = 0; i <= last; i++) reached[i] += 1;
    }
    return {
      steps: labels.map((step, i) => ({ step, value: reached[i] })),
      cancelled,
    };
  }, [orders, t]);

  const kpis = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const revenue = active.reduce((s, o) => s + o.total, 0);
    const aov = active.length ? Math.round(revenue / active.length) : 0;
    const received = funnel.steps[0].value;
    const delivered = funnel.steps[3].value;
    const delivery = received ? ((delivered / received) * 100).toFixed(1) : "0";
    return { revenue, count: active.length, aov, delivery, customers: customers.length };
  }, [orders, funnel, customers]);

  // Écran de lecture — seul `read` est requis, toujours accordé dans le back-office.
  if (!can("read")) return null;

  // Squelette global pendant le chargement initial (inerte en mode mock).
  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.systeme.analytique.titre")}
        description={t("admin.systeme.analytique.description")}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-busy="true">
          <span className="sr-only">{t("admin.socle.commun.chargement")}</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.systeme.analytique.titre")}
      description={t("admin.systeme.analytique.description")}
    >
      {/* Bandeaux d'erreur par source — dégradation gracieuse : les blocs
          alimentés par d'autres sources restent affichés. */}
      {eOrd && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("admin.systeme.analytique.erreur_commandes", { message: eOrd.message })}
        </p>
      )}
      {(eProd || eCat) && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("admin.systeme.analytique.erreur_produits_categories", {
            message: (eProd ?? eCat)!.message,
          })}
        </p>
      )}
      {eCust && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("admin.systeme.analytique.erreur_clients", { message: eCust.message })}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: t("admin.systeme.analytique.kpi_chiffre_affaires"),
              value: formatDZD(kpis.revenue),
            },
            { label: t("admin.systeme.analytique.kpi_commandes"), value: kpis.count.toString() },
            { label: t("admin.systeme.analytique.kpi_panier_moyen"), value: formatDZD(kpis.aov) },
            {
              label: t("admin.systeme.analytique.kpi_taux_livraison"),
              value: `${kpis.delivery}%`,
            },
            {
              label: t("admin.systeme.analytique.kpi_clients"),
              value: kpis.customers.toString(),
            },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-lg font-semibold">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("admin.systeme.analytique.periode_7j")}</SelectItem>
            <SelectItem value="30">{t("admin.systeme.analytique.periode_30j")}</SelectItem>
            <SelectItem value="90">{t("admin.systeme.analytique.periode_90j")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">
              {t("admin.systeme.analytique.graphe_ca_par_jour")}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => formatDZD(v)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">
              {t("admin.systeme.analytique.graphe_commandes_par_jour")}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="orders" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">
              {t("admin.systeme.analytique.graphe_ca_par_categorie")}
            </h2>
            <div className="h-64">
              {eProd || eCat ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("admin.systeme.analytique.donnees_indisponibles")}
                </div>
              ) : byCategory.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      innerRadius={45}
                    >
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatDZD(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("admin.systeme.analytique.aucune_vente")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold">
              {t("admin.systeme.analytique.graphe_traitement")}
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              {t("admin.systeme.analytique.graphe_traitement_note")}
            </p>
            {eOrd ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("admin.systeme.analytique.donnees_indisponibles")}
              </div>
            ) : funnel.steps[0].value ? (
              <>
                <div className="space-y-3">
                  {funnel.steps.map((f, i) => {
                    const pct = (f.value / funnel.steps[0].value) * 100;
                    return (
                      <div key={f.step}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{f.step}</span>
                          <span className="text-muted-foreground">
                            {f.value.toLocaleString("fr-FR")} · {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {funnel.cancelled > 0 && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {t("admin.systeme.analytique.entonnoir_annulees", { n: funnel.cancelled })}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm">
                <p className="font-medium">{t("admin.systeme.analytique.entonnoir_vide_titre")}</p>
                <p className="mt-1 text-muted-foreground">
                  {t("admin.systeme.analytique.entonnoir_vide_desc")}
                </p>
                <Link
                  to="/admin/orders"
                  className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4"
                >
                  {t("admin.systeme.analytique.entonnoir_voir_commandes")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">
            {t("admin.systeme.analytique.graphe_top8")}
          </h2>
          {eOrd ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.socle.commun.donnees_indisponibles")}
            </p>
          ) : topProducts.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => formatDZD(v)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="revenue" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("admin.systeme.analytique.aucune_vente_texte")}
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
