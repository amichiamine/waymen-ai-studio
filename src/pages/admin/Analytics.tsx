import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminState } from "@/lib/admin-store";
import { formatDZD } from "@/data/products";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 80% 55%))", "hsl(var(--chart-3, 340 75% 55%))", "hsl(var(--chart-4, 45 90% 55%))", "hsl(var(--chart-5, 160 65% 45%))"];

export default function AdminAnalytics() {
  const { orders, products, categories, customers } = useAdminState();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const days = parseInt(range, 10);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; revenue: number }>();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), orders: 0, revenue: 0 });
    }
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.createdAt.slice(0, 10);
      const row = map.get(key);
      if (row) { row.orders += 1; row.revenue += o.total; }
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
    return Array.from(acc.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
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
    return categories.map((c) => ({ name: c.label, value: acc[c.slug] ?? 0 })).filter((x) => x.value > 0);
  }, [orders, products, categories]);

  const funnel = useMemo(() => {
    // simulated funnel derived from real orders
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const paid = orders.filter((o) => o.status !== "cancelled").length;
    const carts = Math.round(paid * 2.6);
    const visitors = Math.round(carts * 5.4);
    return [
      { step: "Visiteurs", value: visitors },
      { step: "Paniers", value: carts },
      { step: "Commandes", value: paid },
      { step: "Livrées", value: delivered },
    ];
  }, [orders]);

  const kpis = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const revenue = active.reduce((s, o) => s + o.total, 0);
    const aov = active.length ? Math.round(revenue / active.length) : 0;
    const conv = funnel[0].value ? ((funnel[2].value / funnel[0].value) * 100).toFixed(1) : "0";
    return { revenue, count: active.length, aov, conv, customers: customers.length };
  }, [orders, funnel, customers]);

  return (
    <AdminPageShell title="Analytique" description="Tendances de trafic et de ventes (données locales).">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Chiffre d'affaires", value: formatDZD(kpis.revenue) },
            { label: "Commandes", value: kpis.count.toString() },
            { label: "Panier moyen", value: formatDZD(kpis.aov) },
            { label: "Conversion", value: `${kpis.conv}%` },
            { label: "Clients", value: kpis.customers.toString() },
          ].map((k) => (
            <Card key={k.label}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-lg font-semibold">{k.value}</p>
            </CardContent></Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">Chiffre d'affaires par jour</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatDZD(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">Commandes par jour</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="orders" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">Répartition CA par catégorie</h2>
          <div className="h-64">
            {byCategory.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatDZD(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune vente enregistrée</div>}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">Entonnoir de conversion</h2>
          <div className="space-y-3">
            {funnel.map((f, i) => {
              const pct = funnel[0].value ? (f.value / funnel[0].value) * 100 : 0;
              return (
                <div key={f.step}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{f.step}</span>
                    <span className="text-muted-foreground">{f.value.toLocaleString("fr-FR")} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-6">
        <h2 className="mb-4 text-sm font-semibold">Top 8 des produits vendus</h2>
        {topProducts.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatDZD(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="revenue" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted-foreground">Aucune vente.</p>}
      </CardContent></Card>
    </AdminPageShell>
  );
}
