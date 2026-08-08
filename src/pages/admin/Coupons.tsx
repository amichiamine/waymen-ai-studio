import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
import { useCouponList, useCouponMutations, toApiError } from "@/data-provider";
import type { Coupon } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

// Les messages de validation Zod restent en clés i18n — ils sont affichés dans
// l'interface. Le schéma traduit ses messages via les clés ventes.coupons.err_*.
// Note : on passe les clés brutes ici — la traduction est faite à l'affichage.
const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "admin.ventes.coupons.err_code_court")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "admin.ventes.coupons.err_code_format"),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().min(1).max(1_000_000),
  minPurchase: z.coerce.number().min(0).max(10_000_000),
  usageLimit: z.coerce.number().int().min(1).max(1_000_000),
  expiresAt: z.string().min(1, "admin.ventes.coupons.err_date"),
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
  // Lecture via le fournisseur de données — remplace useAdminState().coupons.
  // En mode mock, `loading` est faux dès le premier rendu et `error` reste nul.
  const { data: coupons, loading, error } = useCouponList();
  const { create, update, remove } = useCouponMutations();
  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // editTarget est null en mode création, contient le coupon à modifier en mode édition.
  const [editTarget, setEditTarget] = useState<Coupon | null>(null);
  const [v, setV] = useState(empty());
  const [err, setErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function save() {
    // Niveau 2 — vérification dans le handler avant toute mutation.
    // Ordre : garde de permission → mutation → retour d'erreur.
    const permission = editTarget ? "update" : "create";
    const label = editTarget
      ? t("admin.ventes.coupons.garde_modifier")
      : t("admin.ventes.coupons.garde_creer");
    if (!guard(permission, label)) return;
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => {
        // Les messages sont des clés i18n — on les traduit ici.
        errs[i.path[0] as string] = t(i.message);
      });
      setErr(errs);
      return;
    }
    const coupon: Coupon = {
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
    setSaving(true);
    try {
      if (editTarget) {
        await update(editTarget.code, coupon);
      } else {
        await create(coupon);
      }
      toast.success(
        editTarget ? t("admin.ventes.coupons.toast_modifie") : t("admin.ventes.coupons.toast_cree"),
      );
      setOpen(false);
      setEditTarget(null);
      setV(empty());
      setErr({});
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function onDelete(code: string) {
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("delete", t("admin.ventes.coupons.garde_supprimer"))) return;
    if (!confirm(t("admin.ventes.coupons.supprimer_confirm", { code }))) return;
    setSaving(true);
    try {
      await remove(code);
      toast.success(t("admin.ventes.coupons.toast_supprime"));
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  function copy(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success(t("admin.ventes.coupons.copie", { code })));
  }

  const isEditing = editTarget !== null;

  // En-têtes — `text-start` pour contrer le `text-left` en dur dans `ui/table.tsx`.
  const COLONNES: { key: string; align?: "end"; width?: string }[] = [
    { key: "admin.ventes.coupons.col_code" },
    { key: "admin.ventes.coupons.col_remise" },
    { key: "admin.ventes.coupons.col_achat_min" },
    { key: "admin.ventes.coupons.col_usage" },
    { key: "admin.ventes.coupons.col_expire" },
    { key: "admin.ventes.coupons.col_statut" },
    { key: "admin.socle.commun.actions", align: "end", width: "w-[100px]" },
  ];

  // Formulaire partagé création / édition
  function CouponForm({ forEdit }: { forEdit: boolean }) {
    return (
      <div className="space-y-3">
        <div>
          <Label>{t("admin.ventes.coupons.form_code")}</Label>
          <Input
            value={v.code}
            onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
            placeholder={t("admin.ventes.coupons.form_code_placeholder")}
            // Le code est l'identifiant — il ne peut pas être modifié en édition.
            readOnly={forEdit}
            className={forEdit ? "bg-muted" : ""}
            disabled={saving}
          />
          {err.code && <p className="mt-1 text-xs text-destructive">{err.code}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("admin.ventes.coupons.form_type")}</Label>
            <Select
              value={v.type}
              onValueChange={(x) => setV({ ...v, type: x as "percent" | "fixed" })}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  {t("admin.ventes.coupons.form_type_percent")}
                </SelectItem>
                <SelectItem value="fixed">{t("admin.ventes.coupons.form_type_fixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin.ventes.coupons.form_valeur")}</Label>
            <Input
              type="number"
              value={v.value}
              onChange={(e) => setV({ ...v, value: Number(e.target.value) })}
              disabled={saving}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("admin.ventes.coupons.form_achat_min")}</Label>
            <Input
              type="number"
              value={v.minPurchase}
              onChange={(e) => setV({ ...v, minPurchase: Number(e.target.value) })}
              disabled={saving}
            />
          </div>
          <div>
            <Label>{t("admin.ventes.coupons.form_limite_usage")}</Label>
            <Input
              type="number"
              value={v.usageLimit}
              onChange={(e) => setV({ ...v, usageLimit: Number(e.target.value) })}
              disabled={saving}
            />
          </div>
        </div>
        <div>
          <Label>{t("admin.ventes.coupons.form_expiration")}</Label>
          <Input
            type="date"
            value={v.expiresAt}
            onChange={(e) => setV({ ...v, expiresAt: e.target.value })}
            disabled={saving}
          />
          {err.expiresAt && <p className="mt-1 text-xs text-destructive">{err.expiresAt}</p>}
        </div>
        <div className="flex items-center justify-between rounded-md border p-2">
          <Label htmlFor={forEdit ? "active-edit" : "active"} className="mb-0">
            {t("admin.ventes.coupons.form_actif")}
          </Label>
          <Switch
            id={forEdit ? "active-edit" : "active"}
            checked={v.active}
            onCheckedChange={(x) => setV({ ...v, active: x })}
            disabled={saving}
          />
        </div>
      </div>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.ventes.coupons.titre")}
      description={t("admin.ventes.coupons.description", { n: coupons.length })}
      actions={
        // Niveau 1 — affichage. Le Dialog est contrôlé manuellement pour
        // éviter que le DialogTrigger l'ouvre quand la permission est refusée.
        // La boîte de dialogue de création est réutilisée pour l'édition
        // (pas de duplication — phase 1 conservée).
        can("create") ? (
          <>
            <Button onClick={openNew}>
              <Plus className="me-2 h-4 w-4" /> {t("admin.ventes.coupons.nouveau")}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isEditing
                      ? t("admin.ventes.coupons.form_titre_modifier")
                      : t("admin.ventes.coupons.form_titre_nouveau")}
                  </DialogTitle>
                </DialogHeader>
                <CouponForm forEdit={isEditing} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    {t("admin.socle.confirmation.annuler")}
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving
                      ? t("admin.ventes.coupons.form_enregistrement")
                      : isEditing
                        ? t("admin.socle.commun.enregistrer")
                        : t("admin.ventes.coupons.form_creer")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          // Niveau 3 — infobulle portée par le <span>.
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.ventes.coupons.nouveau")}
            </Button>
          </span>
        )
      }
    >
      {/* Erreur au-dessus du contenu, sans remplacer la page (§5.3). */}
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLONNES.map((c) => (
                <TableHead
                  key={c.key}
                  className={[c.width, c.align === "end" ? "text-end" : "text-start"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {c.key === "admin.socle.commun.actions" ? (
                    <span className="sr-only">{t(c.key)}</span>
                  ) : (
                    t(c.key)
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Chargement — squelettes de lignes (§5.3). */}
            {loading ? (
              <>
                <tr className="sr-only" aria-busy="true">
                  <td>{t("admin.ventes.coupons.chargement")}</td>
                </tr>
                {Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    {[80, 60, 70, 50, 80, 60, 80].map((w, j) => (
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
                {coupons.map((c) => {
                  const expired = new Date(c.expiresAt).getTime() < Date.now();
                  return (
                    <TableRow key={c.code}>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {c.code}
                        </span>
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
                          <Badge variant="secondary">
                            {t("admin.ventes.coupons.statut_desactive")}
                          </Badge>
                        ) : expired ? (
                          <Badge variant="destructive">
                            {t("admin.ventes.coupons.statut_expire")}
                          </Badge>
                        ) : (
                          <Badge>{t("admin.ventes.coupons.statut_actif")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("admin.ventes.coupons.col_code")}
                          aria-label={t("admin.ventes.coupons.col_code")}
                          onClick={() => copy(c.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {/* Niveau 1+3 : bouton Modifier */}
                        <span
                          title={denyReason("update") ?? t("admin.socle.commun.modifier")}
                          className="inline-flex align-middle"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("admin.socle.commun.modifier")}
                            disabled={!can("update") || saving}
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </span>
                        {/* Niveau 1+3 : bouton Supprimer */}
                        <span
                          title={denyReason("delete") ?? t("admin.socle.commun.supprimer")}
                          className="inline-flex align-middle"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("admin.socle.commun.supprimer")}
                            disabled={!can("delete") || saving}
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
                    <TableCell
                      colSpan={COLONNES.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {t("admin.ventes.coupons.vide")}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog d'édition visible même quand `can("create")` est faux,
          car l'édition peut être ouverte via openEdit() indépendamment. */}
      {!can("create") && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.ventes.coupons.form_titre_modifier")}</DialogTitle>
            </DialogHeader>
            <CouponForm forEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                {t("admin.socle.confirmation.annuler")}
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving
                  ? t("admin.ventes.coupons.form_enregistrement")
                  : t("admin.socle.commun.enregistrer")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminPageShell>
  );
}
