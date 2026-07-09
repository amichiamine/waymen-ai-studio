import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDZD } from "@/data/products";
import { useAdminState } from "@/lib/admin-store";

export default function AdminCustomers() {
  const { customers } = useAdminState();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return customers
      .filter((c) => !n || c.name.toLowerCase().includes(n) || c.email.toLowerCase().includes(n) || c.wilaya.toLowerCase().includes(n))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, q]);

  return (
    <AdminPageShell title="Clients" description={`${customers.length} clients enregistrés.`}>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un client…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Wilaya</TableHead>
              <TableHead className="text-right">Commandes</TableHead>
              <TableHead className="text-right">Dépensé</TableHead>
              <TableHead>Inscrit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm">{c.email}</TableCell>
                <TableCell className="text-sm">{c.phone}</TableCell>
                <TableCell className="text-sm">{c.wilaya}</TableCell>
                <TableCell className="text-right">{c.ordersCount}</TableCell>
                <TableCell className="text-right font-medium">{formatDZD(c.totalSpent)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Aucun client.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
