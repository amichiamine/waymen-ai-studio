import { useMemo } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  Package,
  Users as UsersIcon,
  ShoppingBag,
  Boxes,
  Ticket,
  Star,
} from "lucide-react";
import { useAdminState } from "@/lib/admin-store";
import { formatDZD } from "@/data/products";
import { toast } from "sonner";

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? "");
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
function download(name: string, csv: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${name} téléchargé`);
}

export default function AdminReports() {
  const { orders, customers, products, stockMovements, coupons, reviews } = useAdminState();

  const summaries = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    return {
      revenue: active.reduce((s, o) => s + o.total, 0),
      ordersCount: orders.length,
      customersCount: customers.length,
      productsCount: products.length,
      movementsCount: stockMovements.length,
    };
  }, [orders, customers, products, stockMovements]);

  const exportOrders = () => {
    const rows: (string | number)[][] = [
      [
        "ID",
        "Date",
        "Client",
        "Email",
        "Téléphone",
        "Wilaya",
        "Livraison",
        "Sous-total",
        "Remise",
        "Livraison DA",
        "Total",
        "Statut",
        "Paiement",
        "Coupon",
        "Articles",
      ],
    ];
    for (const o of orders) {
      rows.push([
        o.id,
        o.createdAt,
        o.customerName,
        o.customerEmail ?? "",
        o.phone,
        o.wilaya,
        o.deliveryKind,
        o.subtotal,
        o.discount,
        o.shipping,
        o.total,
        o.status,
        o.paymentLabel ?? o.paymentMethod,
        o.couponCode ?? "",
        o.items.map((i) => `${i.qty}× ${i.name}`).join(" | "),
      ]);
    }
    download(`ka-commandes-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportCustomers = () => {
    const rows: (string | number)[][] = [
      ["ID", "Nom", "Email", "Téléphone", "Wilaya", "Inscrit", "Commandes", "Dépensé DA"],
    ];
    for (const c of customers)
      rows.push([
        c.id,
        c.name,
        c.email,
        c.phone,
        c.wilaya,
        c.createdAt,
        c.ordersCount,
        c.totalSpent,
      ]);
    download(`ka-clients-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportInventory = () => {
    const rows: (string | number)[][] = [
      ["ID", "Nom", "Marque", "Catégorie", "Prix DA", "Stock", "Best-seller"],
    ];
    for (const p of products)
      rows.push([
        p.id,
        p.name,
        p.brand,
        p.category,
        p.price,
        p.stock,
        p.bestSeller ? "oui" : "non",
      ]);
    download(`ka-stock-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportMovements = () => {
    const rows: (string | number)[][] = [["ID", "Date", "Produit", "Delta", "Raison"]];
    for (const m of stockMovements)
      rows.push([m.id, m.createdAt, m.productName, m.delta, m.reason]);
    download(`ka-mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportCoupons = () => {
    const rows: (string | number)[][] = [
      ["Code", "Type", "Valeur", "Achat min", "Expire", "Utilisations", "Limite", "Actif"],
    ];
    for (const c of coupons)
      rows.push([
        c.code,
        c.type,
        c.value,
        c.minPurchase,
        c.expiresAt,
        c.usageCount,
        c.usageLimit,
        c.active ? "oui" : "non",
      ]);
    download(`ka-coupons-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportReviews = () => {
    const rows: (string | number)[][] = [
      ["ID", "Date", "Produit", "Client", "Note", "Titre", "Corps", "Statut"],
    ];
    for (const r of reviews)
      rows.push([
        r.id,
        r.createdAt,
        r.productName,
        r.customerName,
        r.rating,
        r.title,
        r.body,
        r.status,
      ]);
    download(`ka-avis-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const cards = [
    {
      title: "Ventes",
      desc: `${summaries.ordersCount} commandes · ${formatDZD(summaries.revenue)}`,
      Icon: ShoppingBag,
      action: exportOrders,
    },
    {
      title: "Clients",
      desc: `${summaries.customersCount} clients enregistrés`,
      Icon: UsersIcon,
      action: exportCustomers,
    },
    {
      title: "Stock",
      desc: `${summaries.productsCount} produits au catalogue`,
      Icon: Package,
      action: exportInventory,
    },
    {
      title: "Mouvements de stock",
      desc: `${summaries.movementsCount} mouvements journalisés`,
      Icon: Boxes,
      action: exportMovements,
    },
    {
      title: "Coupons",
      desc: `${coupons.length} codes promotionnels`,
      Icon: Ticket,
      action: exportCoupons,
    },
    { title: "Avis", desc: `${reviews.length} avis clients`, Icon: Star, action: exportReviews },
  ];

  return (
    <AdminPageShell
      title="Rapports"
      description="Exports CSV des données de la boutique (compatibles Excel / Google Sheets)."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <c.Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{c.title}</h2>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={c.action} className="self-start">
                <Download className="mr-2 h-4 w-4" /> Exporter CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            Les fichiers sont générés côté navigateur à partir de vos données locales. Ouvrez-les
            directement dans Excel, LibreOffice ou Google Sheets — l'encodage UTF-8 avec BOM
            préserve les accents.
          </p>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
