import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { useAdminState, type OrderStatus } from "@/lib/admin-store";
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

export default function AdminOrders() {
  const { orders } = useAdminState();
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
            {rows.map((o) => (
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
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  Aucune commande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
