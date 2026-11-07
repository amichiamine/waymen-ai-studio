import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  Tag,
  Layers,
  AlertTriangle,
  Star,
  MessageSquare,
  Ticket,
} from "lucide-react";
import { formatDZD } from "@/data/products";
import {
  useProductList,
  useCategoryList,
  useBrandList,
  useOrderList,
  useCustomerList,
  useCouponList,
  useReviewList,
} from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n, useLocalize } from "@/lib/i18n";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Stratégie de combinaison de plusieurs sources (Dashboard, Analytics, Reports) :
//
// La page agrège 7 entités indépendantes. Pour une dégradation gracieuse :
//   - `loading` global = true si AU MOINS une source charge encore
//     (on n'affiche pas de données partielles pendant le chargement initial).
//   - `error` par bloc = chaque section affiche ses propres données ou son
//     propre bandeau d'erreur. Une source en erreur n'efface pas les blocs
//     alimentés par d'autres sources (skill S3).
//   - En mode mock, toutes les sources ont `loading: false` au premier rendu —
//     le squelette est donc inerte et rien ne change visuellement.

export default function AdminDashboard() {
  const { data: products, loading: lProd, error: eProd } = useProductList();
  const { data: categories, loading: lCat, error: eCat } = useCategoryList();
  const { data: brands, loading: lBrand, error: eBrand } = useBrandList();
  const { data: orders, loading: lOrd, error: eOrd } = useOrderList();
  const { data: customers, loading: lCust, error: eCust } = useCustomerList();
  const { data: coupons, loading: lCoup, error: eCoup } = useCouponList();
  const { data: reviews, loading: lRev, error: eRev } = useReviewList();

  const { t } = useI18n();
  const L = useLocalize();

  // Niveau 1 — lecture uniquement : aucune garde d'action n'est requise sur ce
  // tableau de bord. Le hook est présent pour cohérence et évolution future.
  const { can } = usePermissions();

  // Chargement global : on attend que toutes les sources principales soient prêtes
  // avant d'afficher les KPI pour éviter des valeurs « 0 » transitoires.
  const loading = lProd || lCat || lBrand || lOrd || lCust || lCoup || lRev;

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stock === "in").length;
    const low = products.filter((p) => p.stock === "low").length;
    const bestsellers = products.filter((p) => p.bestSeller).length;
    const catalogValue = products.reduce((s, p) => s + p.price, 0);
    const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const pendingReviews = reviews.filter((r) => r.status === "pending").length;
    const activeCoupons = coupons.filter(
      (c) => c.active && new Date(c.expiresAt).getTime() > Date.now(),
    ).length;
    return {
      total,
      inStock,
      low,
      bestsellers,
      catalogValue,
      revenue,
      pendingOrders,
      pendingReviews,
      activeCoupons,
    };
  }, [products, orders, reviews, coupons]);

  const byCategory = useMemo(
    () =>
      categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        count: products.filter((p) => p.category === c.slug).length,
      })),
    [categories, products],
  );

  // `labelKey` plutôt que `label` : le libellé est résolu au rendu, dans la
  // langue courante. `id` sert de clé React — un libellé traduit changerait
  // d'une langue à l'autre et remonterait toute la liste à chaque bascule.
  const KPIS: { id: string; labelKey: string; value: string; Icon: typeof Package; to: string }[] =
    [
      {
        id: "produits",
        labelKey: "admin.socle.tableau.kpi_produits",
        value: stats.total.toString(),
        Icon: Package,
        to: "/admin/products",
      },
      {
        id: "categories",
        labelKey: "admin.socle.tableau.kpi_categories",
        value: categories.length.toString(),
        Icon: Layers,
        to: "/admin/categories",
      },
      {
        id: "marques",
        labelKey: "admin.socle.tableau.kpi_marques",
        value: brands.length.toString(),
        Icon: Tag,
        to: "/admin/brands",
      },
      {
        id: "valeur_catalogue",
        labelKey: "admin.socle.tableau.kpi_valeur_catalogue",
        value: formatDZD(stats.catalogValue),
        Icon: DollarSign,
        to: "/admin/products",
      },
      {
        id: "chiffre_affaires",
        labelKey: "admin.socle.tableau.kpi_chiffre_affaires",
        value: formatDZD(stats.revenue),
        Icon: DollarSign,
        to: "/admin/orders",
      },
      {
        id: "commandes_attente",
        labelKey: "admin.socle.tableau.kpi_commandes_attente",
        value: stats.pendingOrders.toString(),
        Icon: ShoppingBag,
        to: "/admin/orders",
      },
      {
        id: "clients",
        labelKey: "admin.socle.tableau.kpi_clients",
        value: customers.length.toString(),
        Icon: Users,
        to: "/admin/customers",
      },
      {
        id: "avis_moderer",
        labelKey: "admin.socle.tableau.kpi_avis_moderer",
        value: stats.pendingReviews.toString(),
        Icon: MessageSquare,
        to: "/admin/reviews",
      },
      {
        id: "coupons_actifs",
        labelKey: "admin.socle.tableau.kpi_coupons_actifs",
        value: stats.activeCoupons.toString(),
        Icon: Ticket,
        to: "/admin/coupons",
      },
      {
        id: "stock_faible",
        labelKey: "admin.socle.tableau.kpi_stock_faible",
        value: stats.low.toString(),
        Icon: AlertTriangle,
        to: "/admin/inventory",
      },
      {
        id: "en_stock",
        labelKey: "admin.socle.tableau.kpi_en_stock",
        value: stats.inStock.toString(),
        Icon: ShoppingBag,
        to: "/admin/inventory",
      },
      {
        id: "bestsellers",
        labelKey: "admin.socle.tableau.kpi_bestsellers",
        value: stats.bestsellers.toString(),
        Icon: Star,
        to: "/admin/products",
      },
    ];

  const recentOrders = useMemo(
    () =>
      orders
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [orders],
  );

  const trend = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), revenue: 0 });
    }
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const row = map.get(o.createdAt.slice(0, 10));
      if (row) row.revenue += o.total;
    }
    return Array.from(map.values());
  }, [orders]);

  // `can("read")` est toujours vrai pour quiconque entre dans le back-office
  // (les viewers sont bloqués en amont par App.tsx). Ce garde ne masque rien :
  // il documente que l'écran est intégralement en lecture seule.
  if (!can("read")) return null;

  // Squelette global pendant le chargement initial (inerte en mode mock).
  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.socle.tableau.titre")}
        description={t("admin.socle.tableau.description")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          <span className="sr-only">{t("admin.socle.commun.chargement")}</span>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  // Erreurs par source — affichées en bandeau au-dessus des blocs concernés.
  // Une source en erreur ne supprime pas les données des autres sources.
  const errors = [eProd, eCat, eBrand, eOrd, eCust, eCoup, eRev].filter(Boolean);

  return (
    <AdminPageShell
      title={t("admin.socle.tableau.titre")}
      description={t("admin.socle.tableau.description")}
    >
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err, i) => (
            <p
              key={i}
              role="status"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {err!.message}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Link key={k.id} to={k.to}>
            <Card className="transition hover:border-primary/50 hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <k.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t(k.labelKey)}</p>
                  <p className="truncate text-lg font-semibold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold">{t("admin.socle.tableau.ca_30_jours")}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">
              {t("admin.socle.tableau.produits_par_categorie")}
            </h2>
            {eCat || eProd ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.socle.commun.donnees_indisponibles")}
              </p>
            ) : (
              <div className="space-y-3">
                {byCategory.map((c) => {
                  const pct = stats.total ? Math.round((c.count / stats.total) * 100) : 0;
                  return (
                    <div key={c.slug}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <Link to={`/admin/products`} className="hover:text-primary">
                          {L(c.label)}
                        </Link>
                        <span className="text-muted-foreground">
                          {c.count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">
              {t("admin.socle.tableau.dernieres_commandes")}
            </h2>
            {eOrd ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.socle.commun.donnees_indisponibles")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="min-w-0 truncate hover:text-primary"
                    >
                      <span className="font-mono text-xs">{o.id}</span> · {o.customerName}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">{formatDZD(o.total)}</span>
                  </li>
                ))}
                {recentOrders.length === 0 && (
                  <li className="py-2 text-sm text-muted-foreground">
                    {t("admin.socle.tableau.aucune_commande")}
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sceau officiel d'architecture R&D */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-primary/20 bg-card/60 p-4 text-xs text-muted-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/media/stacgate-archisys-badge.webp"
            alt={t("admin.socle.archisys.alt")}
            className="size-10 rounded-lg border border-border object-contain shadow-xs"
          />
          <div>
            <p className="font-semibold text-foreground">{t("admin.socle.archisys.badge")}</p>
            <p className="text-[11px]">
              {t("admin.socle.archisys.desc", { auteur: "ArchiSys3.0" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("admin.socle.archisys.noyau_valide")}
          </span>
        </div>
      </div>
    </AdminPageShell>
  );
}
