import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, Users, DollarSign, Tag, Layers, AlertTriangle, Star } from "lucide-react";
import { products, categoryMeta, formatDZD } from "@/data/products";

export default function AdminDashboard() {
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stock === "in").length;
    const low = products.filter((p) => p.stock === "low").length;
    const out = products.filter((p) => p.stock === "out").length;
    const brands = new Set(products.map((p) => p.brand)).size;
    const categories = Object.keys(categoryMeta).length;
    const bestsellers = products.filter((p) => p.bestSeller).length;
    const onSale = products.filter((p) => p.sale).length;
    const catalogValue = products.reduce((sum, p) => sum + p.price, 0);
    const avgPrice = total ? Math.round(catalogValue / total) : 0;
    return { total, inStock, low, out, brands, categories, bestsellers, onSale, catalogValue, avgPrice };
  }, []);

  const byCategory = useMemo(() => {
    return (Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map((slug) => ({
      slug,
      count: products.filter((p) => p.category === slug).length,
    }));
  }, []);

  const KPIS = [
    { label: "Produits", value: stats.total.toString(), Icon: Package, to: "/admin/products" },
    { label: "Catégories", value: stats.categories.toString(), Icon: Layers, to: "/admin/categories" },
    { label: "Marques", value: stats.brands.toString(), Icon: Tag, to: "/admin/brands" },
    { label: "Valeur catalogue", value: formatDZD(stats.catalogValue), Icon: DollarSign, to: "/admin/products" },
    { label: "En stock", value: stats.inStock.toString(), Icon: ShoppingBag, to: "/admin/inventory" },
    { label: "Stock faible", value: stats.low.toString(), Icon: AlertTriangle, to: "/admin/inventory" },
    { label: "Best-sellers", value: stats.bestsellers.toString(), Icon: Star, to: "/admin/products" },
    { label: "Clients", value: "—", Icon: Users, to: "/admin/customers" },
  ];

  return (
    <AdminPageShell title="Tableau de bord" description="Vue d'ensemble du catalogue KA Tech (données locales — phase 1).">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Link key={k.label} to={k.to}>
            <Card className="transition hover:border-primary/50 hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <k.Icon className="h-5 w-5" />
                </div>
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
                      <Link to={`/admin/products?category=${c.slug}`} className="capitalize hover:text-primary">
                        {c.slug}
                      </Link>
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
            <h2 className="mb-4 text-sm font-semibold">Derniers produits ajoutés</h2>
            <ul className="divide-y divide-border">
              {products.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to={`/admin/products/${p.id}`} className="min-w-0 truncate hover:text-primary">
                    {p.name}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">{formatDZD(p.price)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 text-sm font-semibold">Commandes & clients</h2>
          <p className="text-sm text-muted-foreground">
            En attente de la phase 2 (backend Bun + SQLite). Les commandes, clients et revenus s'afficheront ici une fois l'API branchée.
          </p>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
