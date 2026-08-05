import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  useAdminState,
  upsertPaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
} from "@/lib/admin-store";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPayments() {
  const { paymentMethods } = useAdminState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<PaymentMethod>({
    id: "",
    label: "",
    instructions: "",
    active: true,
  });

  function openNew() {
    setEditing(null);
    setForm({ id: "", label: "", instructions: "", active: true });
    setOpen(true);
  }
  function openEdit(m: PaymentMethod) {
    setEditing(m);
    setForm({ ...m });
    setOpen(true);
  }
  function save() {
    if (!form.label.trim()) {
      toast.error("Libellé requis");
      return;
    }
    const id = editing ? form.id : form.id || slugify(form.label);
    if (!editing && paymentMethods.some((m) => m.id === id)) {
      toast.error("Un moyen de paiement avec cet ID existe déjà");
      return;
    }
    upsertPaymentMethod({ ...form, id });
    toast.success(editing ? "Moyen de paiement mis à jour" : "Moyen de paiement ajouté");
    setOpen(false);
  }
  function onDelete(id: string) {
    if (!confirm("Supprimer ce moyen de paiement ?")) return;
    deletePaymentMethod(id);
    toast.success("Supprimé");
  }
  function toggleActive(m: PaymentMethod) {
    upsertPaymentMethod({ ...m, active: !m.active });
  }

  return (
    <AdminPageShell
      title="Paiements"
      description="Modes de paiement proposés au checkout."
      actions={
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau moyen
        </Button>
      }
    >
      <div className="grid gap-3">
        {paymentMethods.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{m.label}</p>
                  <Badge variant={m.active ? "default" : "secondary"}>
                    {m.active ? "Actif" : "Inactif"}
                  </Badge>
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {m.id}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{m.instructions || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor={`sw-${m.id}`} className="text-xs text-muted-foreground">
                    Actif
                  </Label>
                  <Switch
                    id={`sw-${m.id}`}
                    checked={m.active}
                    onCheckedChange={() => toggleActive(m)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {paymentMethods.length === 0 && (
          <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            Aucun moyen de paiement.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le moyen de paiement" : "Nouveau moyen de paiement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Libellé</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Paiement à la livraison"
              />
            </div>
            <div>
              <Label>Identifiant (ID)</Label>
              <Input
                value={form.id || slugify(form.label)}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="cod"
              />
            </div>
            <div>
              <Label>Instructions (affichées au client)</Label>
              <Textarea
                rows={3}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <Label className="mb-0">Actif</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save}>{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
