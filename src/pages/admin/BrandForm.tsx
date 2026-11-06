import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  useBrandList,
  useBrandDetail,
  useBrandMutations,
  useProductList,
  toApiError,
} from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { MediaPickerField } from "@/components/admin/MediaPickerField";
import { useI18n } from "@/lib/i18n";

const schema = z.object({
  id: z
    .string()
    .trim()
    .min(2, "Slug trop court (min 2)")
    .max(40, "Slug trop long")
    .regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres, tirets"),
  name: z.string().trim().min(1, "Nom requis").max(60, "Nom trop long"),
  description: z
    .string()
    .trim()
    .max(300, "Description trop longue (max 300)")
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(60, "Nom de pays trop long").optional().or(z.literal("")),
  logo: z.string().trim().max(2048).optional().or(z.literal("")),
});
type V = z.infer<typeof schema>;

export default function AdminBrandForm({ mode }: { mode: "new" | "edit" }) {
  const { data: brands } = useBrandList();
  const { data: products } = useProductList();
  const { can, guard, denyReason } = usePermissions();
  const { id } = useParams();
  const { t } = useI18n();

  // useBrandDetail reste monté et inactif quand id est undefined — jamais de hook conditionnel.
  const { data: existing } = useBrandDetail(mode === "edit" ? id : undefined);

  const { create, update: updateBrand, remove } = useBrandMutations();
  const nav = useNavigate();

  const [v, setV] = useState<V>(
    existing
      ? {
          id: existing.id,
          name: existing.name,
          description: existing.description ?? "",
          country: existing.country ?? "",
          logo: existing.logo ?? "",
        }
      : { id: "", name: "", description: "", country: "", logo: "" },
  );
  const [err, setErr] = useState<Partial<Record<keyof V, string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      const b = brands.find((x) => x.id === id);
      if (b)
        setV({
          id: b.id,
          name: b.name,
          description: b.description ?? "",
          country: b.country ?? "",
          logo: b.logo ?? "",
        });
    }
  }, [id, mode, brands]);

  function update<K extends keyof V>(k: K, val: V[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
    setErr((e) => ({ ...e, [k]: undefined }));
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Niveau 2 — vérification dans le handler avant toute mutation.
    const perm = mode === "new" ? "create" : "update";
    if (
      !guard(
        perm,
        mode === "new"
          ? t("admin.catalogue.marque_form.creer_garde")
          : t("admin.catalogue.marque_form.modifier_garde"),
      )
    )
      return;
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Partial<Record<keyof V, string>> = {};
      p.error.issues.forEach((i) => {
        errs[i.path[0] as keyof V] = i.message;
      });
      setErr(errs);
      toast.error(t("admin.catalogue.marque_form.toast_form_invalide"));
      return;
    }
    if (mode === "new" && brands.some((b) => b.id === p.data.id)) {
      setErr({ id: t("admin.catalogue.marque_form.erreur_slug_existant") });
      toast.error(t("admin.catalogue.marque_form.toast_slug_existant"));
      return;
    }
    if (mode === "new" && brands.some((b) => b.name.toLowerCase() === p.data.name.toLowerCase())) {
      setErr({ name: t("admin.catalogue.marque_form.erreur_nom_existant") });
      toast.error(t("admin.catalogue.marque_form.toast_nom_existant"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: p.data.id,
        name: p.data.name,
        description: p.data.description || undefined,
        country: p.data.country || undefined,
      };
      if (mode === "new") {
        await create(payload);
      } else {
        await updateBrand(p.data.id, payload);
      }
      toast.success(
        mode === "new"
          ? t("admin.catalogue.marque_form.toast_creee")
          : t("admin.catalogue.marque_form.toast_mise_a_jour"),
      );
      nav("/admin/brands");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  };

  const usedCount = existing ? products.filter((p) => p.brand === existing.name).length : 0;

  const doDelete = async () => {
    if (!existing) return;
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("delete", t("admin.catalogue.marque_form.supprimer_garde"))) return;
    // Garde métier préservée : refus si des produits sont encore rattachés.
    if (usedCount > 0) {
      toast.error(t("admin.catalogue.marque_form.erreur_produits_utilises", { n: usedCount }));
      return;
    }
    setDeleting(true);
    try {
      await remove(existing.id);
      toast.success(t("admin.catalogue.marque_form.toast_supprimee"));
      nav("/admin/brands");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setDeleting(false);
    }
  };

  // Clé de permission selon le mode : création ou modification.
  const formPerm = mode === "new" ? "create" : "update";

  return (
    <AdminPageShell
      title={
        mode === "new"
          ? t("admin.catalogue.marque_form.titre_nouveau")
          : t("admin.catalogue.marque_form.titre_modifier")
      }
      actions={
        <div className="flex gap-2">
          <Link to="/admin/brands">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.marque_form.retour")}
            </Button>
          </Link>
          {mode === "edit" && existing && (
            // Niveau 1+3 : bouton Supprimer dans l'en-tête du formulaire.
            <span title={denyReason("delete")} className="inline-flex">
              <Button
                variant="destructive"
                disabled={!can("delete")}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t("admin.catalogue.marque_form.supprimer")}
              </Button>
            </span>
          )}
        </div>
      }
    >
      <form onSubmit={submit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.catalogue.marque_form.section_informations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                {t("admin.catalogue.marque_form.label_slug")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.id}
                disabled={mode === "edit"}
                onChange={(e) => update("id", e.target.value)}
                placeholder="asus"
                aria-invalid={!!err.id}
              />
              {err.id && <p className="mt-1 text-xs text-destructive">{err.id}</p>}
            </div>
            <div>
              <Label>
                {t("admin.catalogue.marque_form.label_nom")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={!!err.name}
              />
              {err.name && <p className="mt-1 text-xs text-destructive">{err.name}</p>}
            </div>
            <div>
              <Label>{t("admin.catalogue.marque_form.label_pays")}</Label>
              <Input value={v.country ?? ""} onChange={(e) => update("country", e.target.value)} />
              {err.country && <p className="mt-1 text-xs text-destructive">{err.country}</p>}
            </div>
            <div>
              <MediaPickerField
                label="Logo officiel de la marque (optionnel)"
                description="Sélectionnez un logo depuis la médiathèque ou téléversez un nouveau visuel."
                value={v.logo ?? ""}
                disabled={!can(formPerm)}
                onChange={(url) => update("logo", url)}
              />
            </div>
            <div>
              <Label>{t("admin.catalogue.marque_form.label_description")}</Label>
              <Textarea
                rows={3}
                value={v.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.catalogue.marque_form.compteur_description", {
                  n: (v.description ?? "").length,
                })}
              </p>
              {err.description && (
                <p className="mt-1 text-xs text-destructive">{err.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Link to="/admin/brands">
            <Button variant="outline" type="button">
              {t("admin.catalogue.marque_form.annuler")}
            </Button>
          </Link>
          {/* Niveau 1+3 : bouton de soumission désactivé si pas la permission. */}
          <span title={denyReason(formPerm)} className="inline-flex">
            <Button type="submit" disabled={!can(formPerm) || saving}>
              {saving
                ? t("admin.catalogue.marque_form.enregistrement")
                : mode === "new"
                  ? t("admin.catalogue.marque_form.creer")
                  : t("admin.catalogue.marque_form.enregistrer")}
            </Button>
          </span>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.catalogue.marque_form.supprimer_titre")}
        description={
          existing
            ? usedCount > 0
              ? t("admin.catalogue.marque_form.supprimer_impossible", { n: usedCount })
              : t("admin.catalogue.marque_form.supprimer_confirmation", { nom: existing.name })
            : null
        }
        confirmLabel={
          deleting
            ? t("admin.catalogue.marque_form.suppression")
            : t("admin.catalogue.marque_form.supprimer")
        }
        destructive
        onConfirm={doDelete}
      />
    </AdminPageShell>
  );
}
