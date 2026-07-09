import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, Users, DollarSign, Tag, Layers, AlertTriangle, Star, MessageSquare, Ticket } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useAdminState } from "@/lib/admin-store";

export default function AdminDashboard() {
  const { products, categories, brands, orders, customers, coupons, reviews } = useAdminState();

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stock === "in").length;
    const low = products.filter((p) => p.stock === "low").length;
    const bestsellers = products.filter((p) => p.bestSeller).length;
    const catalogValue = products.reduce((s, p) => s + p.price, 0);
    const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const pendingReviews = reviews.filter((r) => r.status === "pending").length;
    const activeCoupons = coupons.filter((c) => c.active && new Date(c.expiresAt).getTime() > Date.now()).length;
    return { total, inStock, low, bestsellers, catalogValue, revenue, pendingOrders, pendingReviews, activeCoupons };
  }, [products, orders, reviews, coupons]);

  const byCategory = useMemo(() => categories.map((c) => ({
    slug: c.slug, label: c.label, count: products.filter((p) => p.category === c.slug).length,
  })), [categories, products]);

  const KPIS = [
    { label: "Produits", value: stats.total.toString(), Icon: Package, to: "/admin/products" },
    { label: "Catégories", value: categories.length.toString(), Icon: Layers, to: "/admin/categories" },
    { label: "Marques", value: brands.length.toString(), Icon: Tag, to: "/admin/brands" },
    { label: "Valeur catalogue", value: formatDZD(stats.catalogValue), Icon: DollarSign, to: "/admin/products" },
    { label: "Chiffre d'affaires", value: formatDZD(stats.revenue), Icon: DollarSign, to: "/admin/orders" },
    { label: "Commandes en attente", value: stats.pendingOrders.toString(), Icon: ShoppingBag, to: "/admin/orders" },
    { label: "Clients", value: customers.length.toString(), Icon: Users, to: "/admin/customers" },
    { label: "Avis à modérer", value: stats.pendingReviews.toString(), Icon: MessageSquare, to: "/admin/reviews" },
    { label: "Coupons actifs", value: stats.activeCoupons.toString(), Icon: Ticket, to: "/admin/coupons" },
    { label: "Stock faible", value: stats.low.toString(), Icon: AlertTriangle, to: "/admin/inventory" },
    { label: "En stock", value: stats.inStock.toString(), Icon: ShoppingBag, to: "/admin/inventory" },
    { label: "Best-sellers", value: stats.bestsellers.toString(), Icon: Star, to: "/admin/products" },
  ];

  const recentOrders = useMemo(() => orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [orders]);

  return (
    <AdminPageShell title="Tableau de bord" description="Vue d'ensemble de la boutique KA Tech (données locales).">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Link key={k.label} to={k.to}>
            <Card className="transition hover:border-primary/50 hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><k.Icon className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="truncate text-lg font-semibold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">Produits par catégorie</h2>
            <div className="space-y-3">
              {byCategory.map((c) => {
                const pct = stats.total ? Math.round((c.count / stats.total) * 100) : 0;
                return (
                  <div key={c.slug}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <Link to={`/admin/products`} className="hover:text-primary">{c.label}</Link>
                      <span className="text-muted-foreground">{c.count} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">Dernières commandes</h2>
            <ul className="divide-y divide-border">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to={`/admin/orders/${o.id}`} className="min-w-0 truncate hover:text-primary">
                    <span className="font-mono text-xs">{o.id}</span> · {o.customerName}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">{formatDZD(o.total)}</span>
                </li>
              ))}
              {recentOrders.length === 0 && <li className="py-2 text-sm text-muted-foreground">Aucune commande.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
