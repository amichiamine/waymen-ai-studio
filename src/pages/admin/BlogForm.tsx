import { useEffect, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { MediaPickerField } from "@/components/admin/MediaPickerField";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import {
  useBlogPostDetail,
  useBlogPostMutations,
  useSiteSettings,
  toApiError,
} from "@/data-provider";
import type { BlogPost } from "@/api/types";
import { usePermissions } from "@/lib/admin-auth";
import { useAuth } from "@/lib/auth";
import type { Localized } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";

type Mode = "new" | "edit";

// ---- Localisation helpers ----

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

const LANG_LABELS: Record<LangCode, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
};

/** Expand any Localized<string> into a full { fr, en, ar } map. */
function toMap(v: Localized<string> | undefined): Record<LangCode, string> {
  if (v == null) return { fr: "", en: "", ar: "" };
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: v.fr ?? "", en: v.en ?? "", ar: v.ar ?? "" };
}

/** True when a translation is missing (empty) for a given language. */
function isMissing(map: Record<LangCode, string>, lang: LangCode): boolean {
  return lang !== "fr" && map[lang].trim() === "";
}

// ---- Slug helper ----

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

// ---- Flat form shape ----

type FormValues = {
  titleFr: string;
  titleEn: string;
  titleAr: string;
  slug: string;
  excerptFr: string;
  excerptEn: string;
  excerptAr: string;
  contentFr: string;
  contentEn: string;
  contentAr: string;
  cover: string;
  author: string;
  tagsRaw: string;
  status: "draft" | "published";
};

/** Convert a BlogPost (with Localized fields) into the flat form shape. */
function toForm(p: BlogPost): FormValues {
  const title = toMap(p.title);
  const excerpt = toMap(p.excerpt);
  const content = toMap(p.content);
  return {
    titleFr: title.fr,
    titleEn: title.en,
    titleAr: title.ar,
    slug: p.slug,
    excerptFr: excerpt.fr,
    excerptEn: excerpt.en,
    excerptAr: excerpt.ar,
    contentFr: content.fr,
    contentEn: content.en,
    contentAr: content.ar,
    cover: p.cover ?? "",
    author: p.author,
    tagsRaw: p.tags.join(", "),
    status: p.status as "draft" | "published",
  };
}

function emptyForm(defaultAuthor = ""): FormValues {
  return {
    titleFr: "",
    titleEn: "",
    titleAr: "",
    slug: "",
    excerptFr: "",
    excerptEn: "",
    excerptAr: "",
    contentFr: "",
    contentEn: "",
    contentAr: "",
    cover: "",
    author: defaultAuthor,
    tagsRaw: "",
    status: "draft",
  };
}

/** Build the Localized<string> object to persist for a given field. */
function buildLocalized(
  fr: string,
  en: string,
  ar: string,
): { fr: string; en?: string; ar?: string } {
  const result: { fr: string; en?: string; ar?: string } = { fr };
  if (en.trim()) result.en = en;
  if (ar.trim()) result.ar = ar;
  return result;
}

// ---- Sub-components ----

/**
 * A three-tab (FR / EN / AR) editor for a localised short text field.
 * FR is the default and required tab. EN and AR show a subtle dot when empty.
 */
function LLocalizedInput({
  labelFr,
  labelEn,
  labelAr,
  valueFr,
  valueEn,
  valueAr,
  onChangeFr,
  onChangeEn,
  onChangeAr,
  placeholderFr,
  placeholderEn,
  placeholderAr,
  errorFr,
  missingLabel,
  disabled,
}: {
  labelFr: string;
  labelEn?: string;
  labelAr?: string;
  valueFr: string;
  valueEn: string;
  valueAr: string;
  onChangeFr: (v: string) => void;
  onChangeEn: (v: string) => void;
  onChangeAr: (v: string) => void;
  placeholderFr?: string;
  placeholderEn?: string;
  placeholderAr?: string;
  errorFr?: string;
  missingLabel: string;
  disabled?: boolean;
}) {
  const map: Record<LangCode, string> = { fr: valueFr, en: valueEn, ar: valueAr };

  return (
    <Tabs defaultValue="fr">
      <TabsList>
        {LANGS.map((l) => (
          <TabsTrigger key={l} value={l} className="relative">
            {LANG_LABELS[l]}
            {isMissing(map, l) && (
              <span
                className="absolute end-0.5 top-0.5 size-1.5 rounded-full bg-amber-400"
                aria-label={missingLabel}
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="fr" className="mt-2 space-y-1.5">
        <Label>{labelFr}</Label>
        <Input
          value={valueFr}
          placeholder={placeholderFr}
          disabled={disabled}
          onChange={(e) => onChangeFr(e.target.value)}
        />
        {errorFr && <p className="text-xs text-destructive">{errorFr}</p>}
      </TabsContent>

      <TabsContent value="en" className="mt-2 space-y-1.5">
        <Label>{labelEn ?? labelFr}</Label>
        <Input
          value={valueEn}
          placeholder={placeholderEn}
          disabled={disabled}
          onChange={(e) => onChangeEn(e.target.value)}
        />
      </TabsContent>

      <TabsContent value="ar" className="mt-2 space-y-1.5">
        <Label>{labelAr ?? labelFr}</Label>
        <Input
          dir="rtl"
          className="text-start"
          value={valueAr}
          placeholder={placeholderAr}
          disabled={disabled}
          onChange={(e) => onChangeAr(e.target.value)}
        />
      </TabsContent>
    </Tabs>
  );
}

/**
 * A three-tab (FR / EN / AR) editor for a localised long text (Markdown).
 * The Arabic tab renders its Textarea with dir="rtl" for correct RTL display.
 */
function LLocalizedTextarea({
  labelFr,
  labelEn,
  labelAr,
  valueFr,
  valueEn,
  valueAr,
  onChangeFr,
  onChangeEn,
  onChangeAr,
  placeholderFr,
  placeholderEn,
  placeholderAr,
  rowsFr,
  rowsOther,
  errorFr,
  missingLabel,
  disabled,
}: {
  labelFr: string;
  labelEn?: string;
  labelAr?: string;
  valueFr: string;
  valueEn: string;
  valueAr: string;
  onChangeFr: (v: string) => void;
  onChangeEn: (v: string) => void;
  onChangeAr: (v: string) => void;
  placeholderFr?: string;
  placeholderEn?: string;
  placeholderAr?: string;
  rowsFr?: number;
  rowsOther?: number;
  errorFr?: string;
  missingLabel: string;
  disabled?: boolean;
}) {
  const map: Record<LangCode, string> = { fr: valueFr, en: valueEn, ar: valueAr };

  return (
    <Tabs defaultValue="fr">
      <TabsList>
        {LANGS.map((l) => (
          <TabsTrigger key={l} value={l} className="relative">
            {LANG_LABELS[l]}
            {isMissing(map, l) && (
              <span
                className="absolute end-0.5 top-0.5 size-1.5 rounded-full bg-amber-400"
                aria-label={missingLabel}
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="fr" className="mt-2 space-y-1.5">
        <Label>{labelFr}</Label>
        <Textarea
          rows={rowsFr ?? 4}
          value={valueFr}
          placeholder={placeholderFr}
          disabled={disabled}
          onChange={(e) => onChangeFr(e.target.value)}
        />
        {errorFr && <p className="text-xs text-destructive">{errorFr}</p>}
      </TabsContent>

      <TabsContent value="en" className="mt-2 space-y-1.5">
        <Label>{labelEn ?? labelFr}</Label>
        <Textarea
          rows={rowsOther ?? 4}
          value={valueEn}
          placeholder={placeholderEn}
          disabled={disabled}
          onChange={(e) => onChangeEn(e.target.value)}
        />
      </TabsContent>

      <TabsContent value="ar" className="mt-2 space-y-1.5">
        <Label>{labelAr ?? labelFr}</Label>
        <Textarea
          dir="rtl"
          className={cn("text-start")}
          rows={rowsOther ?? 4}
          value={valueAr}
          placeholder={placeholderAr}
          disabled={disabled}
          onChange={(e) => onChangeAr(e.target.value)}
        />
      </TabsContent>
    </Tabs>
  );
}

/**
 * Éditeur Markdown trilingue (FR / EN / AR) avec barre d'outils,
 * passerelle médiathèque et prévisualisation en direct.
 */
function LLocalizedMarkdownEditor({
  labelFr,
  labelEn,
  labelAr,
  valueFr,
  valueEn,
  valueAr,
  onChangeFr,
  onChangeEn,
  onChangeAr,
  placeholderFr,
  placeholderEn,
  placeholderAr,
  rowsFr,
  rowsOther,
  errorFr,
  missingLabel,
  disabled,
}: {
  labelFr: string;
  labelEn?: string;
  labelAr?: string;
  valueFr: string;
  valueEn: string;
  valueAr: string;
  onChangeFr: (v: string) => void;
  onChangeEn: (v: string) => void;
  onChangeAr: (v: string) => void;
  placeholderFr?: string;
  placeholderEn?: string;
  placeholderAr?: string;
  rowsFr?: number;
  rowsOther?: number;
  errorFr?: string;
  missingLabel: string;
  disabled?: boolean;
}) {
  const map: Record<LangCode, string> = { fr: valueFr, en: valueEn, ar: valueAr };

  return (
    <Tabs defaultValue="fr">
      <div className="flex items-center justify-between mb-2">
        <TabsList>
          {LANGS.map((l) => (
            <TabsTrigger key={l} value={l} className="relative">
              {LANG_LABELS[l]}
              {isMissing(map, l) && (
                <span
                  className="absolute end-0.5 top-0.5 size-1.5 rounded-full bg-amber-400"
                  aria-label={missingLabel}
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="fr" className="mt-2 space-y-1.5">
        <Label>{labelFr}</Label>
        <MarkdownEditor
          rows={rowsFr ?? 14}
          value={valueFr}
          placeholder={placeholderFr}
          disabled={disabled}
          onChange={onChangeFr}
          error={errorFr}
        />
        {errorFr && <p className="text-xs text-destructive">{errorFr}</p>}
      </TabsContent>

      <TabsContent value="en" className="mt-2 space-y-1.5">
        <Label>{labelEn ?? labelFr}</Label>
        <MarkdownEditor
          rows={rowsOther ?? 14}
          value={valueEn}
          placeholder={placeholderEn}
          disabled={disabled}
          onChange={onChangeEn}
        />
      </TabsContent>

      <TabsContent value="ar" className="mt-2 space-y-1.5">
        <Label>{labelAr ?? labelFr}</Label>
        <MarkdownEditor
          dir="rtl"
          rows={rowsOther ?? 14}
          value={valueAr}
          placeholder={placeholderAr}
          disabled={disabled}
          onChange={onChangeAr}
        />
      </TabsContent>
    </Tabs>
  );
}

// ---- Main component ----

export function BlogFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { t } = useI18n();

  // Niveau 1, 2, 3 — toute la garde vit ici, dans le composant qui contient
  // les handlers de mutation. BlogNew et BlogEdit sont de simples enveloppes.
  const { can, guard, denyReason } = usePermissions();

  // useBlogPostDetail est appelé inconditionnellement (§6 piège).
  // En mode "new", id est undefined : le hook reste monté et inactif.
  const { data: existing } = useBlogPostDetail(id);
  const { create, update } = useBlogPostMutations();

  // La permission requise dépend du mode : create pour un nouvel article,
  // update pour une édition (y compris passage brouillon → publié).
  const permission = mode === "new" ? "create" : "update";

  // Schéma Zod avec messages traduits — construit après l'appel aux hooks.
  const schema = z.object({
    titleFr: z.string().trim().min(3, t("admin.contenu.blog.zod_titre_court")).max(200),
    titleEn: z.string().trim().max(200).optional(),
    titleAr: z.string().trim().max(200).optional(),
    slug: z
      .string()
      .trim()
      .min(2, t("admin.contenu.blog.zod_slug_requis"))
      .max(120)
      .regex(/^[a-z0-9-]+$/, t("admin.contenu.blog.zod_slug_format")),
    excerptFr: z.string().trim().min(10, t("admin.contenu.blog.zod_extrait_court")).max(400),
    excerptEn: z.string().trim().max(400).optional(),
    excerptAr: z.string().trim().max(400).optional(),
    contentFr: z.string().trim().min(20, t("admin.contenu.blog.zod_corps_court")),
    contentEn: z.string().trim().optional(),
    contentAr: z.string().trim().optional(),
    cover: z
      .string()
      .trim()
      .url(t("admin.contenu.blog.zod_url_invalide"))
      .max(500)
      .or(z.literal("")),
    author: z.string().trim().min(2, t("admin.contenu.blog.zod_auteur_requis")).max(120),
    tagsRaw: z.string().max(300),
    status: z.enum(["draft", "published"]),
  });

  const { data: siteSettings } = useSiteSettings();
  const { user } = useAuth();
  const storeName = siteSettings.storeName?.trim() || "";
  const defaultAuthor = user?.name?.trim() || (storeName ? `Équipe ${storeName}` : "Rédaction");

  const [form, setForm] = useState<FormValues>(() =>
    existing ? toForm(existing) : emptyForm(defaultAuthor),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [touchedSlug, setTouchedSlug] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "new" && !form.author && defaultAuthor) {
      setForm((prev) => (prev.author ? prev : { ...prev, author: defaultAuthor }));
    }
  }, [mode, defaultAuthor, form.author]);

  // Synchroniser le formulaire quand le détail de l'article est chargé.
  useEffect(() => {
    if (existing) {
      setForm(toForm(existing));
    }
  }, [existing]);

  useEffect(() => {
    document.title =
      mode === "edit"
        ? t("admin.contenu.blog.doc_title_edition")
        : t("admin.contenu.blog.doc_title_nouveau");
  }, [mode, t]);

  // Garde d'article introuvable — rendu anticipé après tous les hooks (§6 piège).
  if (mode === "edit" && id && !existing) {
    return (
      <AdminPageShell title={t("admin.contenu.blog.article_introuvable")}>
        <Link to="/admin/blog">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4" /> {t("admin.contenu.blog.retour")}
          </Button>
        </Link>
      </AdminPageShell>
    );
  }

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Auto-slugify from the French title only.
      if (key === "titleFr" && !touchedSlug) next.slug = slugify(String(value));
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(nextStatus?: "draft" | "published") {
    // Niveau 2 — vérification dans l'action, pas seulement dans le rendu.
    if (
      !guard(
        permission,
        mode === "new"
          ? t("admin.contenu.blog.garde_creer")
          : t("admin.contenu.blog.garde_modifier"),
      )
    )
      return;
    const candidate = { ...form, status: nextStatus ?? form.status };
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      const map: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormValues;
        if (!map[k]) map[k] = issue.message;
      }
      setErrors(map);
      toast.error(t("admin.contenu.blog.erreur_formulaire"));
      return;
    }

    const tags = parsed.data.tagsRaw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const now = new Date().toISOString();

    const post: BlogPost = {
      id: existing?.id ?? `blog_${Date.now().toString(36)}`,
      slug: parsed.data.slug,
      title: buildLocalized(
        parsed.data.titleFr,
        parsed.data.titleEn ?? "",
        parsed.data.titleAr ?? "",
      ),
      excerpt: buildLocalized(
        parsed.data.excerptFr,
        parsed.data.excerptEn ?? "",
        parsed.data.excerptAr ?? "",
      ),
      content: buildLocalized(
        parsed.data.contentFr,
        parsed.data.contentEn ?? "",
        parsed.data.contentAr ?? "",
      ),
      cover: parsed.data.cover || undefined,
      author: parsed.data.author,
      tags,
      status: parsed.data.status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      publishedAt:
        parsed.data.status === "published" ? (existing?.publishedAt ?? now) : existing?.publishedAt,
    };

    setSaving(true);
    try {
      if (mode === "edit" && existing) {
        await update(existing.id, post);
        toast.success(t("admin.contenu.blog.toast_mis_a_jour"));
      } else {
        await create(post);
        toast.success(t("admin.contenu.blog.toast_cree"));
      }
      nav("/admin/blog");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled = !can(permission) || saving;
  const missingLabel = t("admin.contenu.blog.traduction_manquante");
  const facultatifFr = t("admin.contenu.blog.facultatif");
  const facultatifEn = t("admin.contenu.blog.facultatif_en");
  const facultatifAr = t("admin.contenu.blog.facultatif_ar");

  return (
    <AdminPageShell
      title={
        mode === "edit"
          ? t("admin.contenu.blog.titre_edition")
          : t("admin.contenu.blog.titre_nouveau")
      }
      description={t("admin.contenu.blog.description_form")}
      actions={
        <Link to="/admin/blog">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4" /> {t("admin.contenu.blog.retour")}
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.contenu.blog.section_contenu")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Titre — champ court, trois langues */}
            <LLocalizedInput
              labelFr={t("admin.contenu.blog.champ_titre")}
              valueFr={form.titleFr}
              valueEn={form.titleEn}
              valueAr={form.titleAr}
              onChangeFr={(v) => updateField("titleFr", v)}
              onChangeEn={(v) => updateField("titleEn", v)}
              onChangeAr={(v) => updateField("titleAr", v)}
              placeholderFr={t("admin.contenu.blog.placeholder_titre")}
              placeholderEn={facultatifEn}
              placeholderAr={facultatifAr}
              errorFr={errors.titleFr}
              missingLabel={missingLabel}
              disabled={saveDisabled}
            />

            {/* Extrait — champ court, trois langues */}
            <LLocalizedTextarea
              labelFr={t("admin.contenu.blog.champ_extrait")}
              valueFr={form.excerptFr}
              valueEn={form.excerptEn}
              valueAr={form.excerptAr}
              onChangeFr={(v) => updateField("excerptFr", v)}
              onChangeEn={(v) => updateField("excerptEn", v)}
              onChangeAr={(v) => updateField("excerptAr", v)}
              placeholderFr={t("admin.contenu.blog.placeholder_extrait")}
              placeholderEn={facultatifEn}
              placeholderAr={facultatifAr}
              rowsFr={3}
              rowsOther={3}
              errorFr={errors.excerptFr}
              missingLabel={missingLabel}
              disabled={saveDisabled}
            />

            {/* Corps — champ long Markdown enrichi, trois langues */}
            <LLocalizedMarkdownEditor
              labelFr={t("admin.contenu.blog.champ_corps")}
              labelEn={t("admin.contenu.blog.champ_corps_en")}
              labelAr={t("admin.contenu.blog.champ_corps_ar")}
              valueFr={form.contentFr}
              valueEn={form.contentEn}
              valueAr={form.contentAr}
              onChangeFr={(v) => updateField("contentFr", v)}
              onChangeEn={(v) => updateField("contentEn", v)}
              onChangeAr={(v) => updateField("contentAr", v)}
              placeholderFr={t("admin.contenu.blog.placeholder_corps")}
              placeholderEn={facultatifEn}
              placeholderAr={facultatifAr}
              rowsFr={16}
              rowsOther={16}
              errorFr={errors.contentFr}
              missingLabel={missingLabel}
              disabled={saveDisabled}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.contenu.blog.section_publication")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Slug — URL technique, jamais traduit */}
              <FieldRow label="Slug" error={errors.slug}>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    updateField("slug", e.target.value);
                    setTouchedSlug(true);
                  }}
                  placeholder="mon-article"
                  disabled={saveDisabled}
                />
              </FieldRow>
              <FieldRow label={t("admin.contenu.blog.champ_auteur")} error={errors.author}>
                <Input
                  value={form.author}
                  onChange={(e) => updateField("author", e.target.value)}
                  placeholder={t("admin.contenu.blog.placeholder_auteur")}
                  disabled={saveDisabled}
                />
              </FieldRow>
              <FieldRow label={t("admin.contenu.blog.champ_etiquettes")} error={errors.tagsRaw}>
                <Input
                  value={form.tagsRaw}
                  onChange={(e) => updateField("tagsRaw", e.target.value)}
                  placeholder="tech, guide"
                  disabled={saveDisabled}
                />
              </FieldRow>
              <div className="pt-2 text-xs text-muted-foreground">
                {t("admin.contenu.blog.statut_actuel")}{" "}
                <strong>
                  {form.status === "published"
                    ? t("admin.contenu.blog.statut_publie")
                    : t("admin.contenu.blog.statut_brouillon")}
                </strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.contenu.blog.section_couverture")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaPickerField
                value={form.cover}
                onChange={(url) => updateField("cover", url)}
                disabled={saveDisabled}
                aspectRatio="video"
              />
              {errors.cover && <p className="mt-2 text-xs text-destructive">{errors.cover}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Niveau 1 — affichage + Niveau 3 — infobulle sur le <span> */}
      <div className="flex flex-wrap justify-end gap-2">
        <span title={denyReason(permission)} className="inline-flex">
          <Button variant="outline" disabled={saveDisabled} onClick={() => onSubmit("draft")}>
            <Save className="me-2 h-4 w-4" /> {t("admin.contenu.blog.enregistrer_brouillon")}
          </Button>
        </span>
        <span title={denyReason(permission)} className="inline-flex">
          <Button disabled={saveDisabled} onClick={() => onSubmit("published")}>
            <Save className="me-2 h-4 w-4" /> {t("admin.contenu.blog.publier")}
          </Button>
        </span>
      </div>
    </AdminPageShell>
  );
}

function FieldRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
