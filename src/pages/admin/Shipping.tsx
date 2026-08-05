import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
  useShippingRateList,
  useShippingSettings,
  useShippingRateMutations,
  useShippingSettingsMutations,
  toApiError,
} from "@/data-provider";
import type { ShippingRate } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

// Les tarifs par wilaya, le franco de port et les modes de livraison sont des
// réglages commerciaux de boutique. Toutes les mutations utilisent
// `manageSettings` (rôle minimum : admin), conformément à la matrice
// PERMISSIONS.md §2 et §3.3 : « Écran /admin/settings, livraison, paiements. »
// On n'utilise PAS `create`/`update`/`delete` génériques qui ciblent le
// contenu éditorial, pas les réglages.

const fmt = (n: number) => `⁦${n.toLocaleString("fr-FR")} DA⁩`;

export default function AdminShipping() {
  // Lecture via le fournisseur de données — remplace useAdminState().shippingRates
  // et useAdminState().shippingSettings. En mode mock, `loading` est faux dès le
  // premier rendu et `error` reste nul.
  const { data: shippingRates, loading: loadingRates, error: errorRates } = useShippingRateList();
  const {
    data: shippingSettings,
    loading: loadingSettings,
    error: errorSettings,
  } = useShippingSettings();
  const { upsert: upsertRate, remove: removeRate } = useShippingRateMutations();
  const { update: updateSettings } = useShippingSettingsMutations();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);
  const [form, setForm] = useState<ShippingRate>({ wilayaCode: "", home: 0, desk: 0 });
  const [saving, setSaving] = useState(false);

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

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function save() {
    // Niveau 2 — vérification dans le handler avant toute mutation.
    // Ordre : garde de permission → mutation → retour d'erreur.
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
    setSaving(true);
    try {
      await upsertRate(form);
      toast.success(editing ? "Tarif mis à jour" : "Tarif ajouté");
      setOpen(false);
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function onDelete(code: string) {
    if (code === "*") {
      toast.error("Le tarif par défaut ne peut pas être supprimé");
      return;
    }
    if (!confirm(`Supprimer le tarif pour ${wilayaLabel(code)} ?`)) return;
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Supprimer le tarif")) return;
    setSaving(true);
    try {
      await removeRate(code);
      toast.success("Tarif supprimé");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFreeShippingChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Modifier le franco de port")) return;
    setSaving(true);
    try {
      await updateSettings({
        freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
      });
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleHomeToggle(val: boolean) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Activer / désactiver la livraison à domicile")) return;
    setSaving(true);
    try {
      await updateSettings({ homeEnabled: val });
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeskToggle(val: boolean) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", "Activer / désactiver le retrait bureau")) return;
    setSaving(true);
    try {
      await updateSettings({ deskEnabled: val });
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  const availableWilayas = WILAYAS.filter(
    (w) => !shippingRates.some((r) => r.wilayaCode === w.code),
  );

  const isLoading = loadingRates || loadingSettings;
  const anyError = errorRates ?? errorSettings;

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
      {/* Erreur au-dessus du contenu, sans remplacer la page (§5.3). */}
      {anyError && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {anyError.message}
        </p>
      )}

      {/* Squelette de chargement pour les cartes de réglages (§5.3). */}
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          <span className="sr-only">Chargement des réglages de livraison…</span>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      ) : (
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
                  disabled={!can("manageSettings") || saving}
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
                  disabled={!can("manageSettings") || saving}
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
                  disabled={!can("manageSettings") || saving}
                  onCheckedChange={handleDeskToggle}
                />
              </span>
            </CardContent>
          </Card>
        </div>
      )}

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
            {/* Squelette de chargement pour le tableau (§5.3). */}
            {loadingRates ? (
              <>
                <tr className="sr-only" aria-busy="true">
                  <td>Chargement des tarifs…</td>
                </tr>
                {Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    {[40, 120, 60, 60, 60].map((w, j) => (
                      <TableCell key={j}>
                        <div
                          className="h-4 animate-pulse rounded bg-muted"
                          style={{ width: `${w}px` }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : (
              <>
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
                          disabled={saving}
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
                            disabled={!can("manageSettings") || saving}
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
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Aucun tarif.
                    </TableCell>
                  </TableRow>
                )}
              </>
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
                  onValueChange={(val) => setForm({ ...form, wilayaCode: val })}
                  disabled={saving}
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
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Bureau (DA)</Label>
                <Input
                  type="number"
                  value={form.desk}
                  onChange={(e) => setForm({ ...form, desk: Number(e.target.value) || 0 })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
