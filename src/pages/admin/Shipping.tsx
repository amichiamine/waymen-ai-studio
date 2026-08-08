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
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRate | null>(null);
  const [form, setForm] = useState<ShippingRate>({ wilayaCode: "", home: 0, desk: 0 });
  const [saving, setSaving] = useState(false);

  // Noms de wilayas : DONNÉES (référentiel administratif algérien), jamais dans
  // un dictionnaire. Seuls les libellés d'interface se traduisent.
  const wilayaLabel = (code: string) =>
    code === "*"
      ? t("admin.reglages.livraison.wilaya_defaut_label")
      : (WILAYAS.find((w) => w.code === code)?.name_fr ?? code);

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
    if (
      !guard(
        "manageSettings",
        editing
          ? t("admin.reglages.livraison.garde_modifier")
          : t("admin.reglages.livraison.garde_ajouter"),
      )
    )
      return;
    if (!form.wilayaCode) {
      toast.error(t("admin.reglages.livraison.toast_wilaya_requise"));
      return;
    }
    if (!editing && shippingRates.some((r) => r.wilayaCode === form.wilayaCode)) {
      toast.error(t("admin.reglages.livraison.toast_regle_existe"));
      return;
    }
    if (form.home < 0 || form.desk < 0) {
      toast.error(t("admin.reglages.livraison.toast_tarifs_invalides"));
      return;
    }
    setSaving(true);
    try {
      await upsertRate(form);
      toast.success(
        editing
          ? t("admin.reglages.livraison.toast_tarif_mis_a_jour")
          : t("admin.reglages.livraison.toast_tarif_ajoute"),
      );
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
      toast.error(t("admin.reglages.livraison.toast_defaut_non_supprimable"));
      return;
    }
    if (!confirm(t("admin.reglages.livraison.confirm_supprimer", { wilaya: wilayaLabel(code) })))
      return;
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", t("admin.reglages.livraison.garde_supprimer"))) return;
    setSaving(true);
    try {
      await removeRate(code);
      toast.success(t("admin.reglages.livraison.toast_tarif_supprime"));
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFreeShippingChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", t("admin.reglages.livraison.garde_franco"))) return;
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
    if (!guard("manageSettings", t("admin.reglages.livraison.garde_domicile"))) return;
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
    if (!guard("manageSettings", t("admin.reglages.livraison.garde_bureau"))) return;
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

  // En-têtes de colonnes : text-start explicite pour écraser le text-left en dur
  // de ui/table.tsx (motif identique à Products.tsx — voir convention §7).
  // Le tableau des 58 wilayas est le plus large du back-office : en arabe, on
  // évite tout débordement en ne forçant aucun alignement physique.
  const COLONNES: { key: string; align?: "end"; width?: string }[] = [
    { key: "admin.reglages.livraison.col_code" },
    { key: "admin.reglages.livraison.col_wilaya" },
    { key: "admin.reglages.livraison.col_domicile", align: "end" },
    { key: "admin.reglages.livraison.col_bureau", align: "end" },
    { key: "", width: "w-[100px]" }, // colonne actions : pas de libellé
  ];

  return (
    <AdminPageShell
      title={t("admin.reglages.livraison.titre")}
      description={t("admin.reglages.livraison.description")}
      actions={
        // Niveau 1 — affichage. Niveau 3 — le <span> porte l'infobulle.
        can("manageSettings") ? (
          <Button onClick={openNew}>
            <Plus className="me-2 h-4 w-4" /> {t("admin.reglages.livraison.ajouter_tarif")}
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.reglages.livraison.ajouter_tarif")}
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
          <span className="sr-only">{t("admin.reglages.livraison.chargement_reglages")}</span>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("admin.reglages.livraison.carte_franco_titre")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-xs">{t("admin.reglages.livraison.carte_franco_label")}</Label>
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
                {t("admin.reglages.livraison.carte_franco_aide")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("admin.reglages.livraison.carte_domicile_titre")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Label>{t("admin.reglages.livraison.carte_domicile_label")}</Label>
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
              <CardTitle className="text-base">
                {t("admin.reglages.livraison.carte_bureau_titre")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Label>{t("admin.reglages.livraison.carte_bureau_label")}</Label>
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
          placeholder={t("admin.reglages.livraison.recherche_placeholder")}
          aria-label={t("admin.reglages.livraison.recherche_placeholder")}
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* overflow-x-auto : empêche le tableau des 58 wilayas de déborder en RTL */}
      <div className="overflow-x-auto overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLONNES.map((c, i) => (
                <TableHead
                  key={c.key || `col-actions-${i}`}
                  className={[c.width, c.align === "end" ? "text-end" : "text-start"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {c.key ? t(c.key) : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Squelette de chargement pour le tableau (§5.3). */}
            {loadingRates ? (
              <>
                <tr className="sr-only" aria-busy="true">
                  <td>{t("admin.reglages.livraison.chargement_tarifs")}</td>
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
                      {r.wilayaCode === "*" ? (
                        <Badge>{t("admin.reglages.livraison.badge_defaut")}</Badge>
                      ) : (
                        r.wilayaCode
                      )}
                    </TableCell>
                    {/* Nom de wilaya : DONNÉE (référentiel algérien), pas traduite */}
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
                          title={t("admin.reglages.livraison.aria_modifier")}
                          aria-label={t("admin.reglages.livraison.aria_modifier")}
                          disabled={saving}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span title={denyReason("manageSettings")} className="inline-flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            aria-label={t("admin.reglages.livraison.aria_modifier")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </span>
                      )}
                      {r.wilayaCode !== "*" && (
                        /* Niveau 1 — bouton supprimer. */
                        <span
                          title={
                            denyReason("manageSettings") ??
                            t("admin.reglages.livraison.aria_supprimer")
                          }
                          className="inline-flex align-middle"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("admin.reglages.livraison.aria_supprimer")}
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
                      colSpan={COLONNES.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {t("admin.reglages.livraison.vide_aucun")}
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
            <DialogTitle>
              {editing
                ? t("admin.reglages.livraison.dialog_modifier_titre")
                : t("admin.reglages.livraison.dialog_nouveau_titre")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.reglages.livraison.champ_wilaya")}</Label>
              {editing ? (
                <Input value={wilayaLabel(form.wilayaCode)} disabled />
              ) : (
                <Select
                  value={form.wilayaCode}
                  onValueChange={(val) => setForm({ ...form, wilayaCode: val })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.reglages.livraison.champ_wilaya_placeholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWilayas.map((w) => (
                      <SelectItem key={w.code} value={w.code}>
                        {/* Code et nom fr : DONNÉES, pas dans le dictionnaire */}
                        {w.code} — {w.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.reglages.livraison.champ_domicile")}</Label>
                <Input
                  type="number"
                  value={form.home}
                  onChange={(e) => setForm({ ...form, home: Number(e.target.value) || 0 })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>{t("admin.reglages.livraison.champ_bureau")}</Label>
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
              {t("admin.socle.confirmation.annuler")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving
                ? t("admin.reglages.livraison.btn_enregistrement")
                : editing
                  ? t("admin.socle.commun.enregistrer")
                  : t("admin.reglages.livraison.btn_creer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
