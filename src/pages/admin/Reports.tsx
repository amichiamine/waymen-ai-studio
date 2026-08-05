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
  AlertTriangle,
} from "lucide-react";
import {
  useOrderList,
  useCustomerList,
  useProductList,
  useStockMovementList,
  useCouponList,
  useReviewList,
} from "@/data-provider";
import { formatDZD } from "@/data/products";
import { usePermissions } from "@/lib/admin-auth";
import { toast } from "sonner";

// Les exports CSV sont des opérations de LECTURE : ils ne mutent aucune donnée.
// La clé requise est donc `read`, accordée à tous les rôles présents dans le
// back-office. Si, à l'avenir, certains exports contiennent des données
// réellement sensibles (e.g. mots de passe, tokens), il suffira de monter la
// clé à `manageSettings` ou `manageCriticalSettings` sans modifier la structure.
//
// Stratégie de combinaison (Reports) :
// Chaque carte de rapport est indépendante. Si une source est en cours de
// chargement ou en erreur, le bouton d'export de CETTE carte est désactivé
// avec un message explicite — les autres cartes restent opérationnelles.
// Un export ne s'exécute jamais silencieusement sur données vides (AGENTS.md §7).

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
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${name} téléchargé`);
}

export default function AdminReports() {
  const { data: orders, loading: lOrd, error: eOrd } = useOrderList();
  const { data: customers, loading: lCust, error: eCust } = useCustomerList();
  const { data: products, loading: lProd, error: eProd } = useProductList();
  const { data: stockMovements, loading: lMov, error: eMov } = useStockMovementList();
  const { data: coupons, loading: lCoup, error: eCoup } = useCouponList();
  const { data: reviews, loading: lRev, error: eRev } = useReviewList();

  const { can, guard, denyReason } = usePermissions();

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
    // Niveau 2 — vérification dans l'action avant toute opération.
    if (!guard("read", "Exporter les ventes")) return;
    // Refuser silencieusement si les données ne sont pas chargées (AGENTS.md §7).
    if (lOrd) {
      toast.error("Export impossible : données en cours de chargement");
      return;
    }
    if (eOrd) {
      toast.error("Export impossible : " + eOrd.message);
      return;
    }
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
    if (!guard("read", "Exporter les clients")) return;
    if (lCust) {
      toast.error("Export impossible : données en cours de chargement");
      return;
    }
    if (eCust) {
      toast.error("Export impossible : " + eCust.message);
      return;
    }
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
    if (!guard("read", "Exporter le stock")) return;
    if (lProd) {
      toast.error("Export impossible : données en cours de chargement");
      return;
    }
    if (eProd) {
      toast.error("Export impossible : " + eProd.message);
      return;
    }
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
    if (!guard("read", "Exporter les mouvements")) return;
    if (lMov) {
      toast.error("Export impossible : données en cours de chargement");
      return;
    }
    if (eMov) {
      toast.error("Export impossible : " + eMov.message);
      return;
    }
    const rows: (string | number)[][] = [["ID", "Date", "Produit", "Delta", "Raison"]];
    for (const m of stockMovements)
      rows.push([m.id, m.createdAt, m.productName, m.delta, m.reason]);
    download(`ka-mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportCoupons = () => {
    if (!guard("read", "Exporter les coupons")) return;
    if (lCoup) {
      toast.error("Export impossible : données en cours de chargement");
      return;
    }
    if (eCoup) {
      toast.error("Export impossible : " + eCoup.message);
      return;
    }
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
    if (!guard("read", "Exporter les avis")) return;
    if (lRev) {
      toast.error("Export impossible : données en cours de chargement");
      return;
    }
    if (eRev) {
      toast.error("Export impossible : " + eRev.message);
      return;
    }
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

  // Chaque carte porte son état de chargement/erreur indépendamment pour
  // permettre la dégradation gracieuse (skill S3).
  const cards = [
    {
      title: "Ventes",
      desc: `${summaries.ordersCount} commandes · ${formatDZD(summaries.revenue)}`,
      Icon: ShoppingBag,
      action: exportOrders,
      loading: lOrd,
      error: eOrd,
    },
    {
      title: "Clients",
      desc: `${summaries.customersCount} clients enregistrés`,
      Icon: UsersIcon,
      action: exportCustomers,
      loading: lCust,
      error: eCust,
    },
    {
      title: "Stock",
      desc: `${summaries.productsCount} produits au catalogue`,
      Icon: Package,
      action: exportInventory,
      loading: lProd,
      error: eProd,
    },
    {
      title: "Mouvements de stock",
      desc: `${summaries.movementsCount} mouvements journalisés`,
      Icon: Boxes,
      action: exportMovements,
      loading: lMov,
      error: eMov,
    },
    {
      title: "Coupons",
      desc: `${coupons.length} codes promotionnels`,
      Icon: Ticket,
      action: exportCoupons,
      loading: lCoup,
      error: eCoup,
    },
    {
      title: "Avis",
      desc: `${reviews.length} avis clients`,
      Icon: Star,
      action: exportReviews,
      loading: lRev,
      error: eRev,
    },
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
              {/* Bandeau d'erreur par carte — dégradation gracieuse. */}
              {c.error && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  {c.error.message}
                </p>
              )}
              {/* Niveau 1 — affichage. Niveau 3 — infobulle sur le <span>
                  car un bouton disabled a pointer-events-none. */}
              {can("read") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={c.action}
                  className="self-start"
                  disabled={c.loading || !!c.error}
                  title={
                    c.loading
                      ? "Données en cours de chargement"
                      : c.error
                        ? "Données indisponibles"
                        : undefined
                  }
                >
                  <Download className="me-2 h-4 w-4" /> Exporter CSV
                </Button>
              ) : (
                <span title={denyReason("read")} className="inline-flex self-start">
                  <Button variant="outline" size="sm" disabled>
                    <Download className="me-2 h-4 w-4" /> Exporter CSV
                  </Button>
                </span>
              )}
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
