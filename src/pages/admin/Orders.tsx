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

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "En attente",
  processing: "En traitement",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
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

  return (
    <AdminPageShell title="Commandes" description={`${orders.length} commandes enregistrées.`}>
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
          <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="processing">En traitement ({counts.processing})</TabsTrigger>
          <TabsTrigger value="shipped">Expédiées ({counts.shipped})</TabsTrigger>
          <TabsTrigger value="delivered">Livrées ({counts.delivered})</TabsTrigger>
          <TabsTrigger value="cancelled">Annulées ({counts.cancelled})</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher (n°, client, wilaya)…"
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Wilaya</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Chargement : squelettes de lignes, même nombre que les données attendues. */}
            {loading ? (
              <>
                <tr className="sr-only" aria-busy="true">
                  <td>Chargement des commandes…</td>
                </tr>
                {Array.from({ length: 6 }, (_, i) => (
                  <OrderRowSkeleton key={i} />
                ))}
              </>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  Aucune commande.
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
                    <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {/* Niveau 1 — la consultation du détail est un `read`, toujours permis. */}
                    {can("read") ? (
                      <Link to={`/admin/orders/${o.id}`}>
                        <Button variant="ghost" size="icon" title="Voir la commande">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="icon" disabled aria-label="Voir la commande">
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
