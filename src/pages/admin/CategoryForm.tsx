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
import { cn } from "@/lib/utils";
import {
  useCategoryList,
  useCategoryDetail,
  useCategoryMutations,
  useProductList,
  toApiError,
} from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n, type Localized } from "@/lib/i18n";

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

function toMap(v: Localized<string> | undefined): Record<LangCode, string> {
  if (v == null) return { fr: "", en: "", ar: "" };
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: v.fr ?? "", en: v.en ?? "", ar: v.ar ?? "" };
}

function fromMap(
  map: { fr?: string; en?: string; ar?: string } | undefined,
): Localized<string> | undefined {
  if (!map) return undefined;
  const fr = map.fr?.trim() ?? "";
  const en = map.en?.trim() ?? "";
  const ar = map.ar?.trim() ?? "";
  if (!fr && !en && !ar) return undefined;
  if (!en && !ar) return fr;
  const result: { fr: string; en?: string; ar?: string } = { fr };
  if (en) result.en = en;
  if (ar) result.ar = ar;
  return result;
}

function MissingDot() {
  return (
    <span
      aria-label="traduction manquante"
      className="ms-1 inline-block size-1.5 rounded-full bg-amber-400 align-middle"
    />
  );
}

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
      v.startsWith("data:") ||
      v.startsWith("uploads/") ||
      v.startsWith("assets/") ||
      /^[\w./-]+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(v),
    { message: "URL ou chemin d'image invalide (http(s)://, / ou uploads/ attendu)" },
  );

const localizedLangSchema = z.object({
  fr: z.string().trim().min(2, "Nom requis en français (min 2)").max(80, "Nom trop long"),
  en: z.string().trim().max(80).optional(),
  ar: z.string().trim().max(80).optional(),
});

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug trop court (min 2)")
    .max(40, "Slug trop long")
    .regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres, tirets"),
  label: localizedLangSchema,
  description: z.object({
    fr: z
      .string()
      .trim()
      .min(10, "Description requise en français (min 10)")
      .max(300, "Description trop longue (max 300)"),
    en: z.string().trim().max(300).optional(),
    ar: z.string().trim().max(300).optional(),
  }),
  cover: optionalUrl,
});

type V = z.infer<typeof schema>;

export default function AdminCategoryForm({ mode }: { mode: "new" | "edit" }) {
  const { data: categories } = useCategoryList();
  const { data: products } = useProductList();
  const { can, guard, denyReason } = usePermissions();
  const { slug } = useParams();
  const { t } = useI18n();

  const { data: existing } = useCategoryDetail(mode === "edit" ? slug : undefined);
  const { create, update: updateCategory, remove } = useCategoryMutations();
  const nav = useNavigate();

  const [activeLangLabel, setActiveLangLabel] = useState<LangCode>("fr");
  const [activeLangDesc, setActiveLangDesc] = useState<LangCode>("fr");

  const [v, setV] = useState<V>({
    slug: "",
    label: { fr: "", en: "", ar: "" },
    description: { fr: "", en: "", ar: "" },
    cover: "",
  });

  const [err, setErr] = useState<
    Partial<Record<"slug" | "label" | "description" | "cover", string>>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing) {
      setV({
        slug: existing.slug,
        label: toMap(existing.label),
        description: toMap(existing.description),
        cover: existing.cover ?? "",
      });
    } else if (mode === "edit" && slug) {
      const c = categories.find((x) => x.slug === slug);
      if (c) {
        setV({
          slug: c.slug,
          label: toMap(c.label),
          description: toMap(c.description),
          cover: c.cover ?? "",
        });
      }
    }
  }, [slug, mode, existing, categories]);

  function updateSlug(val: string) {
    setV((prev) => ({ ...prev, slug: val }));
    setErr((e) => ({ ...e, slug: undefined }));
  }

  function updateCover(url: string) {
    setV((prev) => ({ ...prev, cover: url }));
    setErr((e) => ({ ...e, cover: undefined }));
  }

  function updateLabel(lang: LangCode, text: string) {
    setV((prev) => ({ ...prev, label: { ...prev.label, [lang]: text } }));
    setErr((e) => ({ ...e, label: undefined }));
  }

  function updateDescription(lang: LangCode, text: string) {
    setV((prev) => ({ ...prev, description: { ...prev.description, [lang]: text } }));
    setErr((e) => ({ ...e, description: undefined }));
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const errs: Partial<Record<"slug" | "label" | "description" | "cover", string>> = {};
      p.error.issues.forEach((i) => {
        const field = i.path[0] as "slug" | "label" | "description" | "cover";
        errs[field] = i.message;
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
        label: fromMap(v.label)!,
        description: fromMap(v.description) ?? "",
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
    if (!guard("delete", t("admin.catalogue.categorie_form.supprimer_garde"))) return;
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
          <CardContent className="space-y-5">
            <div>
              <Label>
                {t("admin.catalogue.categorie_form.label_slug")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.slug}
                disabled={mode === "edit"}
                onChange={(e) => updateSlug(e.target.value)}
                placeholder="laptops"
                aria-invalid={!!err.slug}
              />
              {err.slug && <p className="mt-1 text-xs text-destructive">{err.slug}</p>}
            </div>

            {/* Champ Nom (Localized) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  {t("admin.catalogue.categorie_form.label_nom")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-semibold uppercase">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLangLabel(l)}
                      className={cn(
                        "rounded-sm px-2 py-0.5 transition-colors",
                        activeLangLabel === l
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {l}
                      {l !== "fr" && !v.label[l]?.trim() && <MissingDot />}
                    </button>
                  ))}
                </div>
              </div>
              <div dir={activeLangLabel === "ar" ? "rtl" : "ltr"}>
                <Input
                  dir={activeLangLabel === "ar" ? "rtl" : "ltr"}
                  className={cn(activeLangLabel === "ar" && "text-end")}
                  value={v.label[activeLangLabel]}
                  onChange={(e) => updateLabel(activeLangLabel, e.target.value)}
                  placeholder={
                    activeLangLabel === "fr"
                      ? "ex: Ordinateurs portables"
                      : activeLangLabel === "en"
                        ? "ex: Laptops"
                        : "مثال: حواسيب محمولة"
                  }
                  aria-invalid={!!err.label}
                />
              </div>
              {err.label && <p className="mt-1 text-xs text-destructive">{err.label}</p>}
            </div>

            {/* Champ Description (Localized) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  {t("admin.catalogue.categorie_form.label_description")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-semibold uppercase">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setActiveLangDesc(l)}
                      className={cn(
                        "rounded-sm px-2 py-0.5 transition-colors",
                        activeLangDesc === l
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {l}
                      {l !== "fr" && !v.description[l]?.trim() && <MissingDot />}
                    </button>
                  ))}
                </div>
              </div>
              <div dir={activeLangDesc === "ar" ? "rtl" : "ltr"}>
                <Textarea
                  rows={3}
                  dir={activeLangDesc === "ar" ? "rtl" : "ltr"}
                  className={cn(activeLangDesc === "ar" && "text-end")}
                  value={v.description[activeLangDesc]}
                  onChange={(e) => updateDescription(activeLangDesc, e.target.value)}
                  aria-invalid={!!err.description}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.catalogue.categorie_form.compteur_description", {
                  n: v.description[activeLangDesc]?.length || 0,
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
                onChange={updateCover}
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
                  nom:
                    typeof existing.label === "string"
                      ? existing.label
                      : existing.label?.fr || existing.slug,
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
