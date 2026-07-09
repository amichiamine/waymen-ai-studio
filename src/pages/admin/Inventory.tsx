import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PackageCheck, PackageX, AlertTriangle, PackageMinus, PackagePlus, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdminState, adjustStock, setProductStockLevel, setProductStockQty } from "@/lib/admin-store";
import type { Product } from "@/data/products";

import { toast } from "sonner";

const LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };
const VARIANT: Record<string, "default" | "secondary" | "destructive"> = { in: "default", low: "secondary", out: "destructive" };

export default function AdminInventory() {
  const { products, stockMovements, siteSettings } = useAdminState();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [edit, setEdit] = useState<Product | null>(null);
  const [delta, setDelta] = useState<string>("0");
  const [qty, setQty] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [level, setLevel] = useState<Product["stock"]>("in");


  const kpi = useMemo(() => ({
    total: products.length,
    inStock: products.filter((p) => p.stock === "in").length,
    low: products.filter((p) => p.stock === "low").length,
    out: products.filter((p) => p.stock === "out").length,
  }), [products]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) =>
      (statusFilter === "all" || p.stock === statusFilter) &&
      (!n || p.name.toLowerCase().includes(n) || p.brand.toLowerCase().includes(n))
    );
  }, [q, statusFilter, products]);

  const cards = [
    { label: "Total produits", value: kpi.total, Icon: PackageCheck, tone: "text-primary bg-primary/10", filter: "all" as const },
    { label: "En stock", value: kpi.inStock, Icon: PackageCheck, tone: "text-emerald-600 bg-emerald-500/10", filter: "in" as const },
    { label: "Stock faible", value: kpi.low, Icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10", filter: "low" as const },
    { label: "Rupture", value: kpi.out, Icon: PackageX, tone: "text-destructive bg-destructive/10", filter: "out" as const },
  ];

  const openEdit = (p: Product) => {
    setEdit(p); setDelta("0"); setReason(""); setLevel(p.stock);
    setQty(String(p.stockQty ?? 0));
  };

  const saveAdjust = () => {
    if (!edit) return;
    const d = parseInt(delta, 10) || 0;
    const targetQty = qty === "" ? undefined : Math.max(0, parseInt(qty, 10) || 0);
    if (d !== 0) {
      if (!reason.trim()) { toast.error("Indiquez une raison"); return; }
      adjustStock(edit.id, d, reason.trim());
    } else if (targetQty !== undefined && targetQty !== (edit.stockQty ?? 0)) {
      setProductStockQty(edit.id, targetQty, reason.trim() || "Ajustement manuel");
    }
    if (level !== edit.stock) setProductStockLevel(edit.id, level);
    toast.success(`Stock mis à jour — ${edit.name}`);
    setEdit(null);
  };


  return (
    <AdminPageShell title="Stock" description="Ajustez les niveaux de stock, journalisez les mouvements et suivez les alertes.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <button key={c.label} type="button" onClick={() => setStatusFilter(c.filter)} className={`text-left ${statusFilter === c.filter ? "ring-2 ring-primary rounded-lg" : ""}`}>
            <Card><CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${c.tone}`}><c.Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold">{c.value}</p>
              </div>
            </CardContent></Card>
          </button>
        ))}
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock"><PackageCheck className="mr-2 h-4 w-4" /> Produits</TabsTrigger>
          <TabsTrigger value="movements"><History className="mr-2 h-4 w-4" /> Mouvements ({stockMovements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
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
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                    <TableCell className="text-right font-mono text-sm">{p.stockQty ?? 0}</TableCell>
                    <TableCell><Badge variant={VARIANT[p.stock]}>{LABEL[p.stock]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Ajuster</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Aucun produit.</TableCell></TableRow>}

              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Raison</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.slice(0, 200).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-sm">{m.productName}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${m.delta < 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {m.delta > 0 ? "+" : ""}{m.delta}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.reason}</TableCell>
                  </TableRow>
                ))}
                {stockMovements.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">Aucun mouvement journalisé.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuster le stock — {edit?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">Quantité en stock (nombre)</label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min={0} />
              <p className="mt-1 text-xs text-muted-foreground">
                Seuils actuels : rupture ≤ {siteSettings.outOfStockThreshold}, faible ≤ {siteSettings.lowStockThreshold}. Le statut sera recalculé automatiquement.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">Statut de stock (surcharge manuelle)</label>
              <Select value={level} onValueChange={(v) => setLevel(v as Product["stock"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">En stock</SelectItem>
                  <SelectItem value="low">Stock faible</SelectItem>
                  <SelectItem value="out">Rupture</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Mouvement (delta rapide)</label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setDelta((d) => String((parseInt(d, 10) || 0) - 1))}><PackageMinus className="h-4 w-4" /></Button>
                <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className="text-center" />
                <Button type="button" variant="outline" size="icon" onClick={() => setDelta((d) => String((parseInt(d, 10) || 0) + 1))}><PackagePlus className="h-4 w-4" /></Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Négatif = sortie (vente, casse), positif = entrée (réappro). Prioritaire sur la quantité ci-dessus.</p>
            </div>
            <div>
              <label className="text-xs font-medium">Raison</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Réapprovisionnement, inventaire, casse…" rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button>
            <Button onClick={saveAdjust}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
