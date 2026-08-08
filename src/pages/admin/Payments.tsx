import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
import { usePaymentMethodList, usePaymentMethodMutations, toApiError } from "@/data-provider";
import type { PaymentMethod } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

// Les modes de paiement sont des réglages de boutique (tarification du checkout,
// activation/désactivation, instructions client). Toutes les mutations utilisent
// `manageSettings` (rôle minimum : admin), conformément à la matrice
// PERMISSIONS.md §2 : « Réglages courants : boutique, livraison, paiements. »
// On n'utilise PAS `create`/`update`/`delete` génériques qui ciblent le
// contenu éditorial, pas les réglages.

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPayments() {
  // Lecture via le fournisseur de données — remplace useAdminState().paymentMethods.
  // En mode mock, `loading` est faux dès le premier rendu et `error` reste nul.
  const { data: paymentMethods, loading, error } = usePaymentMethodList();
  const { upsert, remove } = usePaymentMethodMutations();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<PaymentMethod>({
    id: "",
    label: "",
    instructions: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);

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

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function save() {
    // Niveau 2 — vérification dans le handler, pas seulement dans le rendu.
    // Ordre : garde de permission → mutation → retour d'erreur.
    if (
      !guard(
        "manageSettings",
        editing
          ? t("admin.reglages.paiements.garde_modifier")
          : t("admin.reglages.paiements.garde_ajouter"),
      )
    )
      return;
    if (!form.label.trim()) {
      toast.error(t("admin.reglages.paiements.toast_libelle_requis"));
      return;
    }
    const id = editing ? form.id : form.id || slugify(form.label);
    if (!editing && paymentMethods.some((m) => m.id === id)) {
      toast.error(t("admin.reglages.paiements.toast_id_existe"));
      return;
    }
    setSaving(true);
    try {
      await upsert({ ...form, id });
      toast.success(
        editing
          ? t("admin.reglages.paiements.toast_mis_a_jour")
          : t("admin.reglages.paiements.toast_ajoute"),
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
  async function onDelete(id: string) {
    if (!confirm(t("admin.reglages.paiements.confirm_supprimer"))) return;
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("manageSettings", t("admin.reglages.paiements.garde_supprimer"))) return;
    setSaving(true);
    try {
      await remove(id);
      toast.success(t("admin.reglages.paiements.toast_supprime"));
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  // Mutation asynchrone — désactive le Switch pendant l'appel.
  async function toggleActive(m: PaymentMethod) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("manageSettings", t("admin.reglages.paiements.garde_toggle"))) return;
    setSaving(true);
    try {
      await upsert({ ...m, active: !m.active });
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell
      title={t("admin.reglages.paiements.titre")}
      description={t("admin.reglages.paiements.description")}
      actions={
        // Niveau 1 — affichage. Niveau 3 — le <span> porte l'infobulle.
        can("manageSettings") ? (
          <Button onClick={openNew}>
            <Plus className="me-2 h-4 w-4" /> {t("admin.reglages.paiements.nouveau_moyen")}
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.reglages.paiements.nouveau_moyen")}
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

      <div className="grid gap-3">
        {/* Chargement — squelettes de cartes (§5.3). */}
        {loading ? (
          <>
            <span className="sr-only" aria-busy="true">
              {t("admin.reglages.paiements.chargement")}
            </span>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border bg-card" />
            ))}
          </>
        ) : (
          <>
            {paymentMethods.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.label}</p>
                      <Badge variant={m.active ? "default" : "secondary"}>
                        {m.active
                          ? t("admin.reglages.paiements.badge_actif")
                          : t("admin.reglages.paiements.badge_inactif")}
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
                        {t("admin.reglages.paiements.label_actif")}
                      </Label>
                      {/* Niveau 3 — le <span> porte l'infobulle car Switch disabled
                          a pointer-events-none. */}
                      <span
                        title={denyReason("manageSettings") ?? undefined}
                        className="inline-flex"
                      >
                        <Switch
                          id={`sw-${m.id}`}
                          checked={m.active}
                          disabled={!can("manageSettings") || saving}
                          onCheckedChange={() => toggleActive(m)}
                        />
                      </span>
                    </div>
                    {/* Niveau 1 — bouton modifier. */}
                    {can("manageSettings") ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(m)}
                        title={t("admin.socle.commun.modifier")}
                        aria-label={t("admin.socle.commun.modifier")}
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
                          aria-label={t("admin.socle.commun.modifier")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </span>
                    )}
                    {/* Niveau 1 — bouton supprimer. */}
                    <span
                      title={denyReason("manageSettings") ?? t("admin.socle.commun.supprimer")}
                      className="inline-flex align-middle"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("admin.socle.commun.supprimer")}
                        disabled={!can("manageSettings") || saving}
                        onClick={() => onDelete(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {paymentMethods.length === 0 && (
              <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
                {t("admin.reglages.paiements.vide_aucun")}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("admin.reglages.paiements.dialog_modifier_titre")
                : t("admin.reglages.paiements.dialog_nouveau_titre")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.reglages.paiements.champ_libelle")}</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder={t("admin.reglages.paiements.champ_libelle_placeholder")}
                disabled={saving}
              />
            </div>
            <div>
              <Label>{t("admin.reglages.paiements.champ_id")}</Label>
              <Input
                value={form.id || slugify(form.label)}
                disabled={!!editing || saving}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="cod"
              />
            </div>
            <div>
              <Label>{t("admin.reglages.paiements.champ_instructions")}</Label>
              <Textarea
                rows={3}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <Label className="mb-0">{t("admin.reglages.paiements.label_actif")}</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(val) => setForm({ ...form, active: val })}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("admin.socle.confirmation.annuler")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving
                ? t("admin.reglages.paiements.btn_enregistrement")
                : editing
                  ? t("admin.socle.commun.enregistrer")
                  : t("admin.reglages.paiements.btn_creer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
