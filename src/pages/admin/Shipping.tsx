import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { WILAYAS } from "@/data/wilayas";
import {
  useAdminState,
  upsertShippingRate,
  deleteShippingRate,
  updateShippingSettings,
  type ShippingRate,
} from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

// Les tarifs par wilaya, le franco de port et les modes de livraison sont des
// réglages commerciaux de boutique. Toutes les mutations utilisent
// `manageSettings` (rôle minimum : admin), conformément à la matrice
// PERMISSIONS.md §2 et §3.3 : « Écran /admin/settings, livraison, paiements. »
// On n'utilise PAS `create`/`update`/`delete` génériques qui ciblent le
// contenu éditorial, pas les réglages.

const fmt = (n: number) => `⁦${n.toLocaleString("fr-FR")} DA⁩`;

export default function AdminShipping() {
  const { shippingRates, shippingSettings } = useAdminState();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);
  const [form, setForm] = useState<ShippingRate>({ wilayaCode: "", home: 0, desk: 0 });

  const wilayaLabel = (code: string) =>
    code === "*" ? "Par défaut (toutes)" : (WILAYAS.find((w) => w.code === code)?.name_fr ?? code);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return [...shippingRates]
      .sort((a, b) =>
        a.wilayaCode === "*"
          ? -1
          : b.wilayaCode === "*"
            ? 1
            : a.wilayaCode.localeCompare(b.wilayaCode),
      )
      .filter(
        (r) =>
          !n || r.wilayaCode.includes(n) || wilayaLabel(r.wilayaCode).toLowerCase().includes(n),
      );
  }, [shippingRates, q]);

  function openNew() {
    setEditing(null);
    setForm({ wilayaCode: "", home: 800, desk: 400 });
    setOpen(true);
  }
  function openEdit(r: ShippingRate) {
    setEditing(r);
    setForm({ ...r });
    setOpen(true);
  }
  function save() {
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("manageSettings", editing ? "Modifier le tarif" : "Ajouter un tarif")) return;
    if (!form.wilayaCode) {
      toast.error("Choisissez une wilaya");
      return;
    }
    if (!editing && shippingRates.some((r) => r.wilayaCode === form.wilayaCode)) {
      toast.error("Une règle existe déjà pour cette wilaya");
      return;
    }
    if (form.home < 0 || form.desk < 0) {
      toast.error("Tarifs invalides");
      return;
    }
    upsertShippingRate(form);
    toast.success(editing ? "Tarif mis à jour" : "Tarif ajouté");
    setOpen(false);
  }
  function onDelete(code: string) {
    if (code === "*") {
      toast.error("Le tarif par défaut ne peut pas être supprimé");
      return;
    }
    if (!confirm(`Supprimer le tarif pour ${wilayaLabel(code)} ?`)) return;
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Supprimer le tarif")) return;
    deleteShippingRate(code);
    toast.success("Tarif supprimé");
  }
  function handleFreeShippingChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Modifier le franco de port")) return;
    updateShippingSettings({
      freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
    });
  }
  function handleHomeToggle(v: boolean) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Activer / désactiver la livraison à domicile")) return;
    updateShippingSettings({ homeEnabled: v });
  }
  function handleDeskToggle(v: boolean) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Activer / désactiver le retrait bureau")) return;
    updateShippingSettings({ deskEnabled: v });
  }

  const availableWilayas = WILAYAS.filter(
    (w) => !shippingRates.some((r) => r.wilayaCode === w.code),
  );

  return (
    <AdminPageShell
      title="Livraison"
      description="Tarifs par wilaya et règles de livraison."
      actions={
        // Niveau 1 — affichage. Niveau 3 — le <span> porte l'infobulle.
        can("manageSettings") ? (
          <Button onClick={openNew}>
            <Plus className="me-2 h-4 w-4" /> Ajouter un tarif
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> Ajouter un tarif
            </Button>
          </span>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Franco de port</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-xs">Livraison offerte à partir de (DA)</Label>
            {/* Niveau 3 — le <span> porte l'infobulle car un Input disabled
                a pointer-events-none. */}
            <span title={denyReason("manageSettings") ?? undefined} className="block">
              <Input
                type="number"
                value={shippingSettings.freeShippingThreshold}
                disabled={!can("manageSettings")}
                onChange={handleFreeShippingChange}
              />
            </span>
            <p className="text-xs text-muted-foreground">
              Mettre 0 pour désactiver la livraison offerte.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Livraison à domicile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label>Activée</Label>
            {/* Niveau 3 — le <span> porte l'infobulle. */}
            <span title={denyReason("manageSettings") ?? undefined} className="inline-flex">
              <Switch
                checked={shippingSettings.homeEnabled}
                disabled={!can("manageSettings")}
                onCheckedChange={handleHomeToggle}
              />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retrait bureau</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label>Activé</Label>
            <span title={denyReason("manageSettings") ?? undefined} className="inline-flex">
              <Switch
                checked={shippingSettings.deskEnabled}
                disabled={!can("manageSettings")}
                onCheckedChange={handleDeskToggle}
              />
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une wilaya…"
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Wilaya</TableHead>
              <TableHead className="text-end">Domicile</TableHead>
              <TableHead className="text-end">Bureau</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.wilayaCode}>
                <TableCell className="font-mono text-xs">
                  {r.wilayaCode === "*" ? <Badge>défaut</Badge> : r.wilayaCode}
                </TableCell>
                <TableCell>{wilayaLabel(r.wilayaCode)}</TableCell>
                <TableCell className="text-end">{fmt(r.home)}</TableCell>
                <TableCell className="text-end">{fmt(r.desk)}</TableCell>
                <TableCell className="text-end">
                  {/* Niveau 1 — bouton modifier. */}
                  {can("manageSettings") ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span title={denyReason("manageSettings")} className="inline-flex">
                      <Button variant="ghost" size="icon" disabled aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </span>
                  )}
                  {r.wilayaCode !== "*" && (
                    /* Niveau 1 — bouton supprimer. */
                    <span
                      title={denyReason("manageSettings") ?? "Supprimer"}
                      className="inline-flex align-middle"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        disabled={!can("manageSettings")}
                        onClick={() => onDelete(r.wilayaCode)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Aucun tarif.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Wilaya</Label>
              {editing ? (
                <Input value={wilayaLabel(form.wilayaCode)} disabled />
              ) : (
                <Select
                  value={form.wilayaCode}
                  onValueChange={(v) => setForm({ ...form, wilayaCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une wilaya" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWilayas.map((w) => (
                      <SelectItem key={w.code} value={w.code}>
                        {w.code} — {w.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Domicile (DA)</Label>
                <Input
                  type="number"
                  value={form.home}
                  onChange={(e) => setForm({ ...form, home: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Bureau (DA)</Label>
                <Input
                  type="number"
                  value={form.desk}
                  onChange={(e) => setForm({ ...form, desk: Number(e.target.value) || 0 })}
                />
              </div>
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
