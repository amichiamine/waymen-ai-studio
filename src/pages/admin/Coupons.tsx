import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDZD } from "@/data/products";
import { useAdminState, upsertCoupon, deleteCoupon, type Coupon } from "@/lib/admin-store";

const schema = z.object({
  code: z.string().trim().toUpperCase().min(3, "Code trop court").max(30).regex(/^[A-Z0-9_-]+$/, "Lettres majuscules, chiffres, - _"),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().min(1).max(1_000_000),
  minPurchase: z.coerce.number().min(0).max(10_000_000),
  usageLimit: z.coerce.number().int().min(1).max(1_000_000),
  expiresAt: z.string().min(1, "Date requise"),
  active: z.boolean(),
});

function empty(): z.infer<typeof schema> & { code: string } {
  return { code: "", type: "percent", value: 10, minPurchase: 0, usageLimit: 100, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), active: true };
}

export default function AdminCoupons() {
  const { coupons } = useAdminState();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(empty());
  const [err, setErr] = useState<Record<string, string>>({});

  function save() {
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErr(errs);
      return;
    }
    const c: Coupon = {
      code: p.data.code, type: p.data.type, value: p.data.value, minPurchase: p.data.minPurchase,
      usageLimit: p.data.usageLimit, usageCount: 0, expiresAt: new Date(p.data.expiresAt).toISOString(),
      active: p.data.active,
    };
    upsertCoupon(c);
    toast.success("Coupon créé");
    setOpen(false);
    setV(empty());
    setErr({});
  }

  function onDelete(code: string) {
    if (!confirm(`Supprimer le coupon ${code} ?`)) return;
    deleteCoupon(code); toast.success("Coupon supprimé");
  }

  function copy(code: string) { navigator.clipboard.writeText(code).then(() => toast.success(`${code} copié`)); }

  return (
    <AdminPageShell
      title="Coupons"
      description={`${coupons.length} codes promo actifs et archivés.`}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouveau coupon</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau coupon</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder="BIENVENUE10" />{err.code && <p className="text-xs text-destructive mt-1">{err.code}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={v.type} onValueChange={(x) => setV({ ...v, type: x as "percent" | "fixed" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percent">Pourcentage</SelectItem><SelectItem value="fixed">Montant fixe (DA)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Valeur</Label><Input type="number" value={v.value} onChange={(e) => setV({ ...v, value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Achat min. (DA)</Label><Input type="number" value={v.minPurchase} onChange={(e) => setV({ ...v, minPurchase: Number(e.target.value) })} /></div>
                <div><Label>Limite d'usage</Label><Input type="number" value={v.usageLimit} onChange={(e) => setV({ ...v, usageLimit: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Date d'expiration</Label><Input type="date" value={v.expiresAt} onChange={(e) => setV({ ...v, expiresAt: e.target.value })} /></div>
              <div className="flex items-center justify-between rounded-md border p-2"><Label htmlFor="active" className="mb-0">Actif</Label><Switch id="active" checked={v.active} onCheckedChange={(x) => setV({ ...v, active: x })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Créer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Remise</TableHead>
              <TableHead>Achat min.</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => {
              const expired = new Date(c.expiresAt).getTime() < Date.now();
              return (
                <TableRow key={c.code}>
                  <TableCell><span className="rounded bg-muted px-2 py-1 font-mono text-xs">{c.code}</span></TableCell>
                  <TableCell>{c.type === "percent" ? `${c.value} %` : formatDZD(c.value)}</TableCell>
                  <TableCell>{c.minPurchase ? formatDZD(c.minPurchase) : "—"}</TableCell>
                  <TableCell className="text-sm">{c.usageCount}/{c.usageLimit}</TableCell>
                  <TableCell className="text-sm">{new Date(c.expiresAt).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{!c.active ? <Badge variant="secondary">Désactivé</Badge> : expired ? <Badge variant="destructive">Expiré</Badge> : <Badge>Actif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => copy(c.code)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(c.code)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {coupons.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Aucun coupon.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
