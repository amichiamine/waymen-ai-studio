import { useEffect, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { MediaPickerField } from "@/components/admin/MediaPickerField";
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
  useCategoryList,
  useCategoryDetail,
  useCategoryMutations,
  useProductList,
  toApiError,
} from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .refine(
    (v) =>
      !v ||
      v.startsWith("/") ||
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("data:"),
    { message: "URL invalide (http(s):// ou / attendu)" },
  );

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug trop court (min 2)")
    .max(40, "Slug trop long")
    .regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres, tirets"),
  label: z.string().trim().min(2, "Nom requis (min 2)").max(80, "Nom trop long"),
  description: z
    .string()
    .trim()
    .min(10, "Description trop courte (min 10)")
    .max(300, "Description trop longue (max 300)"),
  cover: optionalUrl,
});
type V = z.infer<typeof schema>;

export default function AdminCategoryForm({ mode }: { mode: "new" | "edit" }) {
  const { data: categories } = useCategoryList();
  const { data: products } = useProductList();
  const { can, guard, denyReason } = usePermissions();
  const { slug } = useParams();
  const { t } = useI18n();

  // useProductDetail reste monté et inactif quand slug est undefined — jamais de hook conditionnel.
  const { data: existing } = useCategoryDetail(mode === "edit" ? slug : undefined);

  const { create, update: updateCategory, remove } = useCategoryMutations();
  const nav = useNavigate();

  const [v, setV] = useState<V>(
    existing
      ? {
          slug: existing.slug,
          label: existing.label,
          description: existing.description,
          cover: existing.cover ?? "",
        }
      : { slug: "", label: "", description: "", cover: "" },
  );
  const [err, setErr] = useState<Partial<Record<keyof V, string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && slug) {
      const c = categories.find((x) => x.slug === slug);
      if (c)
        setV({ slug: c.slug, label: c.label, description: c.description, cover: c.cover ?? "" });
    }
  }, [slug, mode, categories]);

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
          ? t("admin.catalogue.categorie_form.creer_garde")
          : t("admin.catalogue.categorie_form.modifier_garde"),
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
      toast.error(t("admin.catalogue.categorie_form.toast_form_invalide"));
      return;
    }
    if (mode === "new" && categories.some((c) => c.slug === p.data.slug)) {
      setErr({ slug: t("admin.catalogue.categorie_form.erreur_slug_existant") });
      toast.error(t("admin.catalogue.categorie_form.toast_slug_existant"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: p.data.slug,
        label: p.data.label,
        description: p.data.description,
        cover: p.data.cover || undefined,
      };
      if (mode === "new") {
        await create(payload);
      } else {
        await updateCategory(p.data.slug, payload);
      }
      toast.success(
        mode === "new"
          ? t("admin.catalogue.categorie_form.toast_creee")
          : t("admin.catalogue.categorie_form.toast_mise_a_jour"),
      );
      nav("/admin/categories");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  };

  const usedCount = existing ? products.filter((p) => p.category === existing.slug).length : 0;

  const doDelete = async () => {
    if (!existing) return;
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("delete", t("admin.catalogue.categorie_form.supprimer_garde"))) return;
    // Garde métier préservée : refus si des produits sont encore rattachés.
    if (usedCount > 0) {
      toast.error(t("admin.catalogue.categorie_form.erreur_produits_utilises", { n: usedCount }));
      return;
    }
    setDeleting(true);
    try {
      await remove(existing.slug);
      toast.success(t("admin.catalogue.categorie_form.toast_supprimee"));
      nav("/admin/categories");
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
          ? t("admin.catalogue.categorie_form.titre_nouveau")
          : t("admin.catalogue.categorie_form.titre_modifier")
      }
      actions={
        <div className="flex gap-2">
          <Link to="/admin/categories">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.categorie_form.retour")}
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
                {t("admin.catalogue.categorie_form.supprimer")}
              </Button>
            </span>
          )}
        </div>
      }
    >
      <form onSubmit={submit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.catalogue.categorie_form.section_informations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                {t("admin.catalogue.categorie_form.label_slug")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.slug}
                disabled={mode === "edit"}
                onChange={(e) => update("slug", e.target.value)}
                placeholder="laptops"
                aria-invalid={!!err.slug}
              />
              {err.slug && <p className="mt-1 text-xs text-destructive">{err.slug}</p>}
            </div>
            <div>
              <Label>
                {t("admin.catalogue.categorie_form.label_nom")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.label}
                onChange={(e) => update("label", e.target.value)}
                aria-invalid={!!err.label}
              />
              {err.label && <p className="mt-1 text-xs text-destructive">{err.label}</p>}
            </div>
            <div>
              <Label>
                {t("admin.catalogue.categorie_form.label_description")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                value={v.description}
                onChange={(e) => update("description", e.target.value)}
                aria-invalid={!!err.description}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.catalogue.categorie_form.compteur_description", {
                  n: v.description.length,
                })}
              </p>
              {err.description && (
                <p className="mt-1 text-xs text-destructive">{err.description}</p>
              )}
            </div>
            <div>
              <MediaPickerField
                label={t("admin.catalogue.categorie_form.label_image")}
                value={v.cover ?? ""}
                onChange={(url) => update("cover", url)}
                aspectRatio="video"
              />
              {err.cover && <p className="mt-1 text-xs text-destructive">{err.cover}</p>}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Link to="/admin/categories">
            <Button variant="outline" type="button">
              {t("admin.catalogue.categorie_form.annuler")}
            </Button>
          </Link>
          {/* Niveau 1+3 : bouton de soumission désactivé si pas la permission. */}
          <span title={denyReason(formPerm)} className="inline-flex">
            <Button type="submit" disabled={!can(formPerm) || saving}>
              {saving
                ? t("admin.catalogue.categorie_form.enregistrement")
                : mode === "new"
                  ? t("admin.catalogue.categorie_form.creer")
                  : t("admin.catalogue.categorie_form.enregistrer")}
            </Button>
          </span>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.catalogue.categorie_form.supprimer_titre")}
        description={
          existing
            ? usedCount > 0
              ? t("admin.catalogue.categorie_form.supprimer_impossible", { n: usedCount })
              : t("admin.catalogue.categorie_form.supprimer_confirmation", {
                  nom: existing.label,
                })
            : null
        }
        confirmLabel={
          deleting
            ? t("admin.catalogue.categorie_form.suppression")
            : t("admin.catalogue.categorie_form.supprimer")
        }
        destructive
        onConfirm={doDelete}
      />
    </AdminPageShell>
  );
}
