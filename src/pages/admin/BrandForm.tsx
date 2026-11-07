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
import { cn } from "@/lib/utils";
import {
  useBrandList,
  useBrandDetail,
  useBrandMutations,
  useProductList,
  toApiError,
} from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { MediaPickerField } from "@/components/admin/MediaPickerField";
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

const localizedOptStringSchema = z.object({
  fr: z.string().trim().max(100, "Trop long (max 100)").optional(),
  en: z.string().trim().max(100).optional(),
  ar: z.string().trim().max(100).optional(),
});

const localizedOptDescSchema = z.object({
  fr: z.string().trim().max(500, "Description trop longue (max 500)").optional(),
  en: z.string().trim().max(500).optional(),
  ar: z.string().trim().max(500).optional(),
});

const schema = z.object({
  id: z
    .string()
    .trim()
    .min(2, "Slug trop court (min 2)")
    .max(40, "Slug trop long")
    .regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres, tirets"),
  name: z.string().trim().min(1, "Nom requis").max(60, "Nom trop long"),
  country: localizedOptStringSchema,
  description: localizedOptDescSchema,
  logo: z.string().trim().max(2048).optional().or(z.literal("")),
});

type V = z.infer<typeof schema>;

export default function AdminBrandForm({ mode }: { mode: "new" | "edit" }) {
  const { data: brands } = useBrandList();
  const { data: products } = useProductList();
  const { can, guard, denyReason } = usePermissions();
  const { id } = useParams();
  const { t } = useI18n();

  const { data: existing } = useBrandDetail(mode === "edit" ? id : undefined);
  const { create, update: updateBrand, remove } = useBrandMutations();
  const nav = useNavigate();

  const [activeLangCountry, setActiveLangCountry] = useState<LangCode>("fr");
  const [activeLangDesc, setActiveLangDesc] = useState<LangCode>("fr");

  const [v, setV] = useState<V>({
    id: "",
    name: "",
    country: { fr: "", en: "", ar: "" },
    description: { fr: "", en: "", ar: "" },
    logo: "",
  });

  const [err, setErr] = useState<Partial<Record<keyof V, string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existing) {
      setV({
        id: existing.id,
        name: existing.name,
        country: toMap(existing.country),
        description: toMap(existing.description),
        logo: existing.logo ?? "",
      });
    } else if (mode === "edit" && id) {
      const b = brands.find((x) => x.id === id);
      if (b) {
        setV({
          id: b.id,
          name: b.name,
          country: toMap(b.country),
          description: toMap(b.description),
          logo: b.logo ?? "",
        });
      }
    }
  }, [id, mode, existing, brands]);

  function update<K extends keyof V>(k: K, val: V[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
    setErr((e) => ({ ...e, [k]: undefined }));
  }

  function updateCountry(lang: LangCode, text: string) {
    setV((prev) => ({ ...prev, country: { ...prev.country, [lang]: text } }));
    setErr((e) => ({ ...e, country: undefined }));
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
        country: fromMap(p.data.country),
        description: fromMap(p.data.description),
        logo: p.data.logo || undefined,
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
    if (!guard("delete", t("admin.catalogue.marque_form.supprimer_garde"))) return;
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

            {/* Pays d'origine multilingue FR / EN / AR */}
            <div>
              <div className="flex items-center justify-between pb-1">
                <Label>{t("admin.catalogue.marque_form.label_pays")}</Label>
                <div
                  role="tablist"
                  aria-label="Langue du pays"
                  className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs"
                >
                  {LANGS.map((lang) => {
                    const hasVal = Boolean(v.country[lang]?.trim());
                    return (
                      <button
                        key={lang}
                        type="button"
                        role="tab"
                        aria-selected={activeLangCountry === lang}
                        onClick={() => setActiveLangCountry(lang)}
                        className={cn(
                          "rounded px-2 py-0.5 font-mono text-[11px] font-medium transition",
                          activeLangCountry === lang
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {lang.toUpperCase()}
                        {!hasVal && lang !== "fr" && <MissingDot />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Input
                value={v.country[activeLangCountry] ?? ""}
                dir={activeLangCountry === "ar" ? "rtl" : "ltr"}
                onChange={(e) => updateCountry(activeLangCountry, e.target.value)}
                placeholder={
                  activeLangCountry === "fr"
                    ? "ex: Taïwan, États-Unis..."
                    : activeLangCountry === "en"
                      ? "e.g. Taiwan, United States..."
                      : "مثال: تايوان، الولايات المتحدة..."
                }
              />
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

            {/* Description multilingue FR / EN / AR */}
            <div>
              <div className="flex items-center justify-between pb-1">
                <Label>{t("admin.catalogue.marque_form.label_description")}</Label>
                <div
                  role="tablist"
                  aria-label="Langue de la description"
                  className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs"
                >
                  {LANGS.map((lang) => {
                    const hasVal = Boolean(v.description[lang]?.trim());
                    return (
                      <button
                        key={lang}
                        type="button"
                        role="tab"
                        aria-selected={activeLangDesc === lang}
                        onClick={() => setActiveLangDesc(lang)}
                        className={cn(
                          "rounded px-2 py-0.5 font-mono text-[11px] font-medium transition",
                          activeLangDesc === lang
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {lang.toUpperCase()}
                        {!hasVal && lang !== "fr" && <MissingDot />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Textarea
                rows={3}
                dir={activeLangDesc === "ar" ? "rtl" : "ltr"}
                value={v.description[activeLangDesc] ?? ""}
                onChange={(e) => updateDescription(activeLangDesc, e.target.value)}
                placeholder={
                  activeLangDesc === "fr"
                    ? "Présentation officielle de la marque..."
                    : activeLangDesc === "en"
                      ? "Official brand overview..."
                      : "نظرة عامة رسمية عن العلامة التجارية..."
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.catalogue.marque_form.compteur_description", {
                  n: (v.description[activeLangDesc] ?? "").length,
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
