import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDZD, type Category } from "@/data/products";
import { useAdminState, deleteProduct } from "@/lib/admin-store";

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default", low: "secondary", out: "destructive",
};
const STOCK_LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };

export default function AdminProducts() {
  const { products, categories } = useAdminState();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | Category>("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!needle) return true;
      return p.name.toLowerCase().includes(needle) || p.brand.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle);
    });
  }, [q, cat, products]);

  function onDelete(id: string, name: string) {
    if (!confirm(`Supprimer « ${name} » ?`)) return;
    deleteProduct(id);
    toast.success("Produit supprimé");
  }

  return (
    <AdminPageShell
      title="Produits"
      description={`${products.length} produits dans le catalogue local.`}
      actions={
        <Link to="/admin/products/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Nouveau produit</Button>
        </Link>
      }
    >
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher (nom, marque, id)…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as "all" | Category)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[64px]"></TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell><img src={p.image} alt="" className="h-10 w-10 rounded object-cover" /></TableCell>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{p.specLine}</div>
                </TableCell>
                <TableCell className="text-sm">{p.brand}</TableCell>
                <TableCell className="text-sm capitalize">{p.category}</TableCell>
                <TableCell className="text-right font-medium">{formatDZD(p.price)}</TableCell>
                <TableCell><Badge variant={STOCK_VARIANT[p.stock]}>{STOCK_LABEL[p.stock]}</Badge></TableCell>
                <TableCell className="text-right">
                  <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" title="Voir la fiche publique"><Eye className="h-4 w-4" /></Button>
                  </Link>
                  <Link to={`/admin/products/${p.id}`}>
                    <Button variant="ghost" size="icon" title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="icon" title="Supprimer" onClick={() => onDelete(p.id, p.name)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  Aucun produit ne correspond aux filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
