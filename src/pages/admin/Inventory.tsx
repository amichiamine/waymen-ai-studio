import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, PackageCheck, PackageX, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminState } from "@/lib/admin-store";

const LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };
const VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default", low: "secondary", out: "destructive",
};

export default function AdminInventory() {
  const { products } = useAdminState();
  const [q, setQ] = useState("");

  const kpi = useMemo(() => ({
    total: products.length,
    inStock: products.filter((p) => p.stock === "in").length,
    low: products.filter((p) => p.stock === "low").length,
    out: products.filter((p) => p.stock === "out").length,
  }), [products]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) => !n || p.name.toLowerCase().includes(n) || p.brand.toLowerCase().includes(n));
  }, [q, products]);

  const cards = [
    { label: "Total produits", value: kpi.total, Icon: PackageCheck, tone: "text-primary bg-primary/10" },
    { label: "En stock", value: kpi.inStock, Icon: PackageCheck, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Stock faible", value: kpi.low, Icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Rupture", value: kpi.out, Icon: PackageX, tone: "text-destructive bg-destructive/10" },
  ];

  return (
    <AdminPageShell title="Stock" description="Vue d'ensemble des niveaux de stock du catalogue local.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${c.tone}`}>
                <c.Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un produit…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.brand}</TableCell>
                <TableCell className="text-sm capitalize">{p.category}</TableCell>
                <TableCell><Badge variant={VARIANT[p.stock]}>{LABEL[p.stock]}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
