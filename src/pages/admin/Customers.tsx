import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, MapPin, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDZD } from "@/data/products";
import { useAdminState, type Customer, type Order } from "@/lib/admin-store";
import { Link } from "react-router-dom";

// Cette page est en lecture seule (vague 1.2). Un CRUD sera ajouté en vague 1.3
// par un autre agent. Aucune action mutative ici : le motif de permissions ne
// s'applique donc qu'à la correction des classes RTL (text-right → text-end,
// left- → start-, pl- → ps-). La page se comporte identiquement pour tous
// les rôles — conforme à la règle d'additivité.

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "En attente",
  processing: "En traitement",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};
const STATUS_VARIANT: Record<Order["status"], "default" | "secondary" | "destructive" | "outline"> =
  {
    pending: "outline",
    processing: "secondary",
    shipped: "secondary",
    delivered: "default",
    cancelled: "destructive",
  };

export default function AdminCustomers() {
  const { customers, orders } = useAdminState();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  // Derive live stats from orders (overrides seed aggregates as source of truth)
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; spent: number; last?: string }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const cur = map.get(o.customerId) ?? { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += o.total;
      if (!cur.last || cur.last < o.createdAt) cur.last = o.createdAt;
      map.set(o.customerId, cur);
    }
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return customers
      .map((c) => {
        const s = stats.get(c.id);
        return {
          ...c,
          ordersCount: s?.count ?? c.ordersCount,
          totalSpent: s?.spent ?? c.totalSpent,
          lastOrderAt: s?.last,
        };
      })
      .filter(
        (c) =>
          !n ||
          c.name.toLowerCase().includes(n) ||
          c.email.toLowerCase().includes(n) ||
          c.wilaya.toLowerCase().includes(n) ||
          c.phone.includes(n),
      )
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, q, stats]);

  const detailOrders = useMemo(
    () =>
      selected
        ? orders
            .filter((o) => o.customerId === selected.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [selected, orders],
  );
  const detailStats = useMemo(() => {
    const active = detailOrders.filter((o) => o.status !== "cancelled");
    return {
      ltv: active.reduce((s, o) => s + o.total, 0),
      count: active.length,
      aov: active.length ? Math.round(active.reduce((s, o) => s + o.total, 0) / active.length) : 0,
      last: detailOrders[0]?.createdAt,
    };
  }, [detailOrders]);

  return (
    <AdminPageShell
      title="Clients"
      description={`${customers.length} clients enregistrés — statistiques dérivées des commandes.`}
    >
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, email, wilaya, tél)…"
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Wilaya</TableHead>
              <TableHead className="text-end">Commandes</TableHead>
              <TableHead className="text-end">Dépensé (LTV)</TableHead>
              <TableHead>Dernière commande</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm">{c.email}</TableCell>
                <TableCell className="text-sm">{c.phone}</TableCell>
                <TableCell className="text-sm">{c.wilaya}</TableCell>
                <TableCell className="text-end">{c.ordersCount}</TableCell>
                <TableCell className="text-end font-medium">{formatDZD(c.totalSpent)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                <TableCell className="text-end">
                  <Button variant="outline" size="sm" onClick={() => setSelected(c)}>
                    Détails
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                  Aucun client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {selected.email}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {selected.wilaya}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" /> Inscrit le{" "}
                  {new Date(selected.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "LTV", value: formatDZD(detailStats.ltv) },
                  { label: "Commandes", value: detailStats.count.toString() },
                  { label: "Panier moyen", value: formatDZD(detailStats.aov) },
                  {
                    label: "Dernière",
                    value: detailStats.last
                      ? new Date(detailStats.last).toLocaleDateString("fr-FR")
                      : "—",
                  },
                ].map((k) => (
                  <div key={k.label} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="mt-1 text-sm font-semibold">{k.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Historique des commandes</h3>
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-end">Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[o.status]}>
                              {STATUS_LABEL[o.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end font-medium">
                            {formatDZD(o.total)}
                          </TableCell>
                          <TableCell className="text-end">
                            <Link
                              to={`/admin/orders/${o.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              Ouvrir
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      {detailOrders.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-16 text-center text-sm text-muted-foreground"
                          >
                            Aucune commande.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
