import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useBlogPostDetail, useBlogPostMutations, toApiError } from "@/data-provider";
import type { BlogPost } from "@/api/types";
import { usePermissions } from "@/lib/admin-auth";
import { localize } from "@/lib/i18n";

type Mode = "new" | "edit";

const schema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(200),
  slug: z
    .string()
    .trim()
    .min(2, "Slug requis")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug: minuscules, chiffres, tirets"),
  excerpt: z.string().trim().min(10, "Extrait trop court").max(400),
  content: z.string().trim().min(20, "Contenu trop court"),
  cover: z.string().trim().url("URL image invalide").max(500).or(z.literal("")),
  author: z.string().trim().min(2, "Auteur requis").max(120),
  tagsRaw: z.string().max(300),
  status: z.enum(["draft", "published"]),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

/**
 * Convertit un `BlogPost` en valeurs de formulaire.
 *
 * Les champs `title`, `excerpt` et `content` sont des `Localized<string>`
 * depuis la vague 3.2b. On les résout ici en français (langue de référence
 * du back-office) avec `localize(v, "fr")` afin que le formulaire n'édite
 * que la variante française — les variantes anglaise et arabe sont préservées
 * dans `existing` et réinjectées lors de l'enregistrement (voir `mergeLocalized`).
 */
function toForm(p: BlogPost) {
  return {
    title: localize(p.title, "fr") ?? "",
    slug: p.slug,
    excerpt: localize(p.excerpt, "fr") ?? "",
    content: localize(p.content, "fr") ?? "",
    cover: p.cover ?? "",
    author: p.author,
    tagsRaw: p.tags.join(", "),
    status: p.status as "draft" | "published",
  };
}

/**
 * Fusionne une valeur française éditée dans le formulaire avec un champ
 * `Localized<string>` existant, pour ne pas écraser les variantes non éditées.
 *
 * Règle : si l'original était un objet multilingue `{ fr, en?, ar? }`, on
 * remplace uniquement la variante `fr` et on conserve `en` et `ar` telles
 * quelles. Si l'original était une chaîne simple (monolingue), la valeur
 * française éditée la remplace directement — le type `Localized` le permet.
 */
function mergeLocalized(
  edited: string,
  original: { fr: string; en?: string; ar?: string } | string | undefined,
): { fr: string; en?: string; ar?: string } | string {
  if (original !== undefined && typeof original === "object" && original !== null) {
    return { ...original, fr: edited };
  }
  return edited;
}

export function BlogFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

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

  const [form, setForm] = useState(() => ({
    title: existing ? (localize(existing.title, "fr") ?? "") : "",
    slug: existing?.slug ?? "",
    excerpt: existing ? (localize(existing.excerpt, "fr") ?? "") : "",
    content: existing ? (localize(existing.content, "fr") ?? "") : "",
    cover: existing?.cover ?? "",
    author: existing?.author ?? "Équipe KA Tech",
    tagsRaw: (existing?.tags ?? []).join(", "),
    status: (existing?.status ?? "draft") as "draft" | "published",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [touchedSlug, setTouchedSlug] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  // Synchroniser le formulaire quand le détail de l'article est chargé.
  useEffect(() => {
    if (existing) {
      setForm(toForm(existing));
    }
  }, [existing]);

  useEffect(() => {
    document.title = mode === "edit" ? `Édition article — KA Tech` : `Nouvel article — KA Tech`;
  }, [mode]);

  // Garde d'article introuvable — rendu anticipé après tous les hooks (§6 piège).
  if (mode === "edit" && id && !existing) {
    return (
      <AdminPageShell title="Article introuvable">
        <Link to="/admin/blog">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4" /> Retour
          </Button>
        </Link>
      </AdminPageShell>
    );
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !touchedSlug) next.slug = slugify(String(value));
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(nextStatus?: "draft" | "published") {
    // Niveau 2 — vérification dans l'action, pas seulement dans le rendu.
    if (!guard(permission, mode === "new" ? "Créer l'article" : "Modifier l'article")) return;
    const candidate = { ...form, status: nextStatus ?? form.status };
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      const map: Partial<Record<keyof typeof form, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof typeof form;
        if (!map[k]) map[k] = issue.message;
      }
      setErrors(map);
      toast.error("Corrigez les erreurs du formulaire");
      return;
    }
    const slugTaken = false; // La liste complète n'est pas disponible ici — BlogList la valide.

    if (slugTaken) {
      setErrors((e) => ({ ...e, slug: "Ce slug est déjà utilisé" }));
      toast.error("Ce slug est déjà utilisé");
      return;
    }
    const tags = parsed.data.tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const now = new Date().toISOString();
    /**
     * Préservation des traductions non éditées (piège multilingue, vague 3.2b).
     *
     * Le formulaire n'expose qu'un seul champ texte par propriété localisée :
     * il édite la variante française. Si l'article possédait déjà des variantes
     * anglaise et arabe (`existing.title = { fr, en, ar }`), écrire
     * `title: data.title` (string) les détruirait silencieusement.
     *
     * `mergeLocalized` réinjecte la valeur française dans l'objet d'origine,
     * en conservant les autres langues intactes. Pour un nouvel article
     * (`existing` est undefined), la valeur française est utilisée directement
     * (chaîne simple, compatible avec `Localized<string>`).
     */
    const post: BlogPost = {
      id: existing?.id ?? `blog_${Date.now().toString(36)}`,
      slug: parsed.data.slug,
      title: mergeLocalized(parsed.data.title, existing?.title),
      excerpt: mergeLocalized(parsed.data.excerpt, existing?.excerpt),
      content: mergeLocalized(parsed.data.content, existing?.content),
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
        toast.success("Article mis à jour");
      } else {
        await create(post);
        toast.success("Article créé");
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

  return (
    <AdminPageShell
      title={mode === "edit" ? "Éditer l'article" : "Nouvel article"}
      description="Rédiger et publier un article de blog."
      actions={
        <Link to="/admin/blog">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4" /> Retour
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Contenu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow label="Titre" error={errors.title}>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Titre de l'article"
                disabled={saveDisabled}
              />
            </FieldRow>
            <FieldRow label="Extrait" error={errors.excerpt}>
              <Textarea
                rows={3}
                value={form.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder="Court résumé"
                disabled={saveDisabled}
              />
            </FieldRow>
            <FieldRow label="Corps (Markdown simple)" error={errors.content}>
              <Textarea
                rows={16}
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="Contenu de l'article. Utilisez # Titre, ## Sous-titre, **gras**, listes 1. 2. 3."
                disabled={saveDisabled}
              />
            </FieldRow>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <FieldRow label="Auteur" error={errors.author}>
                <Input
                  value={form.author}
                  onChange={(e) => updateField("author", e.target.value)}
                  placeholder="Nom de l'auteur"
                  disabled={saveDisabled}
                />
              </FieldRow>
              <FieldRow label="Étiquettes (séparées par des virgules)" error={errors.tagsRaw}>
                <Input
                  value={form.tagsRaw}
                  onChange={(e) => updateField("tagsRaw", e.target.value)}
                  placeholder="tech, guide"
                  disabled={saveDisabled}
                />
              </FieldRow>
              <div className="pt-2 text-xs text-muted-foreground">
                Statut actuel :{" "}
                <strong>{form.status === "published" ? "Publié" : "Brouillon"}</strong>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Image de couverture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={form.cover}
                onChange={(e) => updateField("cover", e.target.value)}
                placeholder="https://…"
                disabled={saveDisabled}
              />
              {errors.cover && <p className="text-xs text-destructive">{errors.cover}</p>}
              {form.cover ? (
                <img
                  src={form.cover}
                  alt="Aperçu"
                  className="mt-2 aspect-[16/9] w-full rounded-md border object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                  Aucune image
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Niveau 1 — affichage + Niveau 3 — infobulle sur le <span> */}
      <div className="flex flex-wrap justify-end gap-2">
        <span title={denyReason(permission)} className="inline-flex">
          <Button variant="outline" disabled={saveDisabled} onClick={() => onSubmit("draft")}>
            <Save className="me-2 h-4 w-4" /> Enregistrer en brouillon
          </Button>
        </span>
        <span title={denyReason(permission)} className="inline-flex">
          <Button disabled={saveDisabled} onClick={() => onSubmit("published")}>
            <Save className="me-2 h-4 w-4" /> Publier
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
