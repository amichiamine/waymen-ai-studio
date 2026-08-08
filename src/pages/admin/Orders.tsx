import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDZD } from "@/data/products";
import { useOrderList } from "@/data-provider";
import type { OrderStatus } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

/**
 * Les valeurs techniques (`pending`, `processing`…) viennent de l'API et ne
 * changent JAMAIS. Seul leur libellé d'affichage est traduit, via des clés i18n.
 * Motif calqué sur Products.tsx (STOCK_LABEL_KEY).
 */
const STATUS_KEY: Record<OrderStatus, string> = {
  pending: "admin.ventes.commun.statut_pending",
  processing: "admin.ventes.commun.statut_processing",
  shipped: "admin.ventes.commun.statut_shipped",
  delivered: "admin.ventes.commun.statut_delivered",
  cancelled: "admin.ventes.commun.statut_cancelled",
};

const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "outline",
  shipped: "outline",
  delivered: "default",
  cancelled: "destructive",
};

// Squelette d'une ligne de tableau commande.
function OrderRowSkeleton() {
  return (
    <TableRow>
      {[60, 120, 80, 80, 80, 70, 40].map((w, i) => (
        <TableCell key={i}>
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w}px` }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function AdminOrders() {
  // Lecture via le fournisseur de données — remplace useAdminState().orders.
  // En mode mock, `loading` est faux dès le premier rendu et `error` reste nul.
  const { data: orders, loading, error } = useOrderList();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can } = usePermissions();
  const { t } = useI18n();
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return orders
      .filter((o) => tab === "all" || o.status === tab)
      .filter(
        (o) =>
          !n ||
          o.id.toLowerCase().includes(n) ||
          o.customerName.toLowerCase().includes(n) ||
          o.wilaya.toLowerCase().includes(n),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, tab, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of ["pending", "processing", "shipped", "delivered", "cancelled"] as OrderStatus[])
      c[s] = orders.filter((o) => o.status === s).length;
    return c;
  }, [orders]);

  // En-têtes — `text-start` explicite pour contrer le `text-left` en dur dans
  // `ui/table.tsx` (voir §7 de la convention i18n).
  const COLONNES: { key: string; align?: "end"; width?: string }[] = [
    { key: "admin.ventes.commandes.col_numero" },
    { key: "admin.ventes.commandes.col_client" },
    { key: "admin.ventes.commandes.col_wilaya" },
    { key: "admin.ventes.commandes.col_date" },
    { key: "admin.ventes.commandes.col_total", align: "end" },
    { key: "admin.ventes.commandes.col_statut" },
    { key: "admin.socle.commun.actions", align: "end", width: "w-[60px]" },
  ];

  return (
    <AdminPageShell
      title={t("admin.ventes.commandes.titre")}
      description={t("admin.ventes.commandes.description", { n: orders.length })}
    >
      {/* Ordre §5.3 : erreur au-dessus du contenu, sans remplacer la page. */}
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | OrderStatus)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">
            {t("admin.ventes.commandes.onglet_toutes", { n: counts.all })}
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t("admin.ventes.commandes.onglet_pending", { n: counts.pending })}
          </TabsTrigger>
          <TabsTrigger value="processing">
            {t("admin.ventes.commandes.onglet_processing", { n: counts.processing })}
          </TabsTrigger>
          <TabsTrigger value="shipped">
            {t("admin.ventes.commandes.onglet_shipped", { n: counts.shipped })}
          </TabsTrigger>
          <TabsTrigger value="delivered">
            {t("admin.ventes.commandes.onglet_delivered", { n: counts.delivered })}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t("admin.ventes.commandes.onglet_cancelled", { n: counts.cancelled })}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("admin.ventes.commandes.recherche_placeholder")}
          aria-label={t("admin.socle.commun.rechercher")}
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLONNES.map((c) => (
                <TableHead
                  key={c.key}
                  className={[c.width, c.align === "end" ? "text-end" : "text-start"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {t(c.key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Chargement : squelettes de lignes, même nombre que les données attendues. */}
            {loading ? (
              <>
                <tr className="sr-only" aria-busy="true">
                  <td>{t("admin.ventes.commandes.chargement")}</td>
                </tr>
                {Array.from({ length: 6 }, (_, i) => (
                  <OrderRowSkeleton key={i} />
                ))}
              </>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLONNES.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {t("admin.ventes.commandes.vide")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>{o.customerName}</TableCell>
                  <TableCell className="text-sm">{o.wilaya}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-end font-medium">{formatDZD(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status]}>{t(STATUS_KEY[o.status])}</Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    {/* Niveau 1 — la consultation du détail est un `read`, toujours permis. */}
                    {can("read") ? (
                      <Link to={`/admin/orders/${o.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("admin.ventes.commandes.voir_commande")}
                          aria-label={t("admin.ventes.commandes.voir_commande")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        aria-label={t("admin.ventes.commandes.voir_commande")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
