import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDZD } from "@/data/products";
import { useAdminState, upsertCoupon, deleteCoupon, type Coupon } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Code trop court")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Lettres majuscules, chiffres, - _"),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().min(1).max(1_000_000),
  minPurchase: z.coerce.number().min(0).max(10_000_000),
  usageLimit: z.coerce.number().int().min(1).max(1_000_000),
  expiresAt: z.string().min(1, "Date requise"),
  active: z.boolean(),
});

function empty(): z.infer<typeof schema> & { code: string } {
  return {
    code: "",
    type: "percent",
    value: 10,
    minPurchase: 0,
    usageLimit: 100,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    active: true,
  };
}

export default function AdminCoupons() {
  const { coupons } = useAdminState();
  const { can, guard, denyReason } = usePermissions();
  const [open, setOpen] = useState(false);
  // editTarget est null en mode création, contient le coupon à modifier en mode édition.
  const [editTarget, setEditTarget] = useState<Coupon | null>(null);
  const [v, setV] = useState(empty());
  const [err, setErr] = useState<Record<string, string>>({});

  function openNew() {
    setEditTarget(null);
    setV(empty());
    setErr({});
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    // Niveau 1 — l'ouverture de la boîte d'édition est conditionnée par `update`.
    if (!can("update")) return;
    setEditTarget(c);
    setV({
      code: c.code,
      type: c.type,
      value: c.value,
      minPurchase: c.minPurchase,
      usageLimit: c.usageLimit,
      expiresAt: c.expiresAt.slice(0, 10),
      active: c.active,
    });
    setErr({});
    setOpen(true);
  }

  function save() {
    // Niveau 2 — vérification dans le handler avant toute mutation.
    const permission = editTarget ? "update" : "create";
    const label = editTarget ? "Modifier le coupon" : "Créer le coupon";
    if (!guard(permission, label)) return;
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErr(errs);
      return;
    }
    const c: Coupon = {
      code: p.data.code,
      type: p.data.type,
      value: p.data.value,
      minPurchase: p.data.minPurchase,
      usageLimit: p.data.usageLimit,
      // En édition on conserve le compteur d'usage existant.
      usageCount: editTarget ? editTarget.usageCount : 0,
      expiresAt: new Date(p.data.expiresAt).toISOString(),
      active: p.data.active,
    };
    upsertCoupon(c);
    toast.success(editTarget ? "Coupon modifié" : "Coupon créé");
    setOpen(false);
    setEditTarget(null);
    setV(empty());
    setErr({});
  }

  function onDelete(code: string) {
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("delete", "Supprimer le coupon")) return;
    if (!confirm(`Supprimer le coupon ${code} ?`)) return;
    deleteCoupon(code);
    toast.success("Coupon supprimé");
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code).then(() => toast.success(`${code} copié`));
  }

  const isEditing = editTarget !== null;

  return (
    <AdminPageShell
      title="Coupons"
      description={`${coupons.length} codes promo actifs et archivés.`}
      actions={
        // Niveau 1 — affichage. Le Dialog est contrôlé manuellement pour
        // éviter que le DialogTrigger l'ouvre quand la permission est refusée.
        can("create") ? (
          <>
            <Button onClick={openNew}>
              <Plus className="me-2 h-4 w-4" /> Nouveau coupon
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditing ? "Modifier le coupon" : "Nouveau coupon"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Code</Label>
                    <Input
                      value={v.code}
                      onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
                      placeholder="BIENVENUE10"
                      // Le code est l'identifiant — il ne peut pas être modifié en édition.
                      readOnly={isEditing}
                      className={isEditing ? "bg-muted" : ""}
                    />
                    {err.code && <p className="text-xs text-destructive mt-1">{err.code}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={v.type}
                        onValueChange={(x) => setV({ ...v, type: x as "percent" | "fixed" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Pourcentage</SelectItem>
                          <SelectItem value="fixed">Montant fixe (DA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valeur</Label>
                      <Input
                        type="number"
                        value={v.value}
                        onChange={(e) => setV({ ...v, value: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Achat min. (DA)</Label>
                      <Input
                        type="number"
                        value={v.minPurchase}
                        onChange={(e) => setV({ ...v, minPurchase: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Limite d'usage</Label>
                      <Input
                        type="number"
                        value={v.usageLimit}
                        onChange={(e) => setV({ ...v, usageLimit: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Date d'expiration</Label>
                    <Input
                      type="date"
                      value={v.expiresAt}
                      onChange={(e) => setV({ ...v, expiresAt: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <Label htmlFor="active" className="mb-0">
                      Actif
                    </Label>
                    <Switch
                      id="active"
                      checked={v.active}
                      onCheckedChange={(x) => setV({ ...v, active: x })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={save}>{isEditing ? "Enregistrer" : "Créer"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          // Niveau 3 — infobulle portée par le <span>.
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> Nouveau coupon
            </Button>
          </span>
        )
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
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => {
              const expired = new Date(c.expiresAt).getTime() < Date.now();
              return (
                <TableRow key={c.code}>
                  <TableCell>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs">{c.code}</span>
                  </TableCell>
                  <TableCell>
                    {c.type === "percent" ? `${c.value} %` : formatDZD(c.value)}
                  </TableCell>
                  <TableCell>{c.minPurchase ? formatDZD(c.minPurchase) : "—"}</TableCell>
                  <TableCell className="text-sm">
                    {c.usageCount}/{c.usageLimit}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(c.expiresAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {!c.active ? (
                      <Badge variant="secondary">Désactivé</Badge>
                    ) : expired ? (
                      <Badge variant="destructive">Expiré</Badge>
                    ) : (
                      <Badge>Actif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => copy(c.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {/* Niveau 1+3 : bouton Modifier */}
                    <span
                      title={denyReason("update") ?? "Modifier"}
                      className="inline-flex align-middle"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Modifier"
                        disabled={!can("update")}
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </span>
                    {/* Niveau 1+3 : bouton Supprimer */}
                    <span
                      title={denyReason("delete") ?? "Supprimer"}
                      className="inline-flex align-middle"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        disabled={!can("delete")}
                        onClick={() => onDelete(c.code)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  Aucun coupon.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPageShell>
  );
}
