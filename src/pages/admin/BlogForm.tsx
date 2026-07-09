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
import { useAdminState, upsertBlogPost, type BlogPost } from "@/lib/admin-store";

type Mode = "new" | "edit";

const schema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(200),
  slug: z.string().trim().min(2, "Slug requis").max(120).regex(/^[a-z0-9-]+$/, "Slug: minuscules, chiffres, tirets"),
  excerpt: z.string().trim().min(10, "Extrait trop court").max(400),
  content: z.string().trim().min(20, "Contenu trop court"),
  cover: z.string().trim().url("URL image invalide").max(500).or(z.literal("")),
  author: z.string().trim().min(2, "Auteur requis").max(120),
  tagsRaw: z.string().max(300),
  status: z.enum(["draft", "published"]),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

export function BlogFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { blogPosts } = useAdminState();
  const existing = mode === "edit" ? blogPosts.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState(() => ({
    title: existing?.title ?? "",
    slug: existing?.slug ?? "",
    excerpt: existing?.excerpt ?? "",
    content: existing?.content ?? "",
    cover: existing?.cover ?? "",
    author: existing?.author ?? "Équipe KA Tech",
    tagsRaw: (existing?.tags ?? []).join(", "),
    status: (existing?.status ?? "draft") as "draft" | "published",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [touchedSlug, setTouchedSlug] = useState(mode === "edit");

  useEffect(() => {
    document.title = mode === "edit" ? `Édition article — KA Tech` : `Nouvel article — KA Tech`;
  }, [mode]);

  if (mode === "edit" && !existing) {
    return (
      <AdminPageShell title="Article introuvable">
        <Link to="/admin/blog"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button></Link>
      </AdminPageShell>
    );
  }

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !touchedSlug) next.slug = slugify(String(value));
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onSubmit(nextStatus?: "draft" | "published") {
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
    const slugTaken = blogPosts.some((p) => p.slug === parsed.data.slug && p.id !== existing?.id);
    if (slugTaken) {
      setErrors((e) => ({ ...e, slug: "Ce slug est déjà utilisé" }));
      toast.error("Ce slug est déjà utilisé");
      return;
    }
    const tags = parsed.data.tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    const now = new Date().toISOString();
    const post: BlogPost = {
      id: existing?.id ?? `blog_${Date.now().toString(36)}`,
      slug: parsed.data.slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      cover: parsed.data.cover || undefined,
      author: parsed.data.author,
      tags,
      status: parsed.data.status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      publishedAt: parsed.data.status === "published"
        ? (existing?.publishedAt ?? now)
        : existing?.publishedAt,
    };
    upsertBlogPost(post);
    toast.success(mode === "edit" ? "Article mis à jour" : "Article créé");
    nav("/admin/blog");
  }

  return (
    <AdminPageShell
      title={mode === "edit" ? "Éditer l'article" : "Nouvel article"}
      description="Rédiger et publier un article de blog."
      actions={
        <Link to="/admin/blog"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button></Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Contenu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FieldRow label="Titre" error={errors.title}>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Titre de l'article" />
            </FieldRow>
            <FieldRow label="Extrait" error={errors.excerpt}>
              <Textarea rows={3} value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} placeholder="Court résumé" />
            </FieldRow>
            <FieldRow label="Corps (Markdown simple)" error={errors.content}>
              <Textarea rows={16} value={form.content} onChange={(e) => update("content", e.target.value)} placeholder="Contenu de l'article. Utilisez # Titre, ## Sous-titre, **gras**, listes 1. 2. 3." />
            </FieldRow>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Publication</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <FieldRow label="Slug" error={errors.slug}>
                <Input value={form.slug} onChange={(e) => { update("slug", e.target.value); setTouchedSlug(true); }} placeholder="mon-article" />
              </FieldRow>
              <FieldRow label="Auteur" error={errors.author}>
                <Input value={form.author} onChange={(e) => update("author", e.target.value)} placeholder="Nom de l'auteur" />
              </FieldRow>
              <FieldRow label="Étiquettes (séparées par des virgules)" error={errors.tagsRaw}>
                <Input value={form.tagsRaw} onChange={(e) => update("tagsRaw", e.target.value)} placeholder="tech, guide" />
              </FieldRow>
              <div className="pt-2 text-xs text-muted-foreground">
                Statut actuel : <strong>{form.status === "published" ? "Publié" : "Brouillon"}</strong>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Image de couverture</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={form.cover} onChange={(e) => update("cover", e.target.value)} placeholder="https://…" />
              {errors.cover && <p className="text-xs text-destructive">{errors.cover}</p>}
              {form.cover ? (
                <img src={form.cover} alt="Aperçu" className="mt-2 aspect-[16/9] w-full rounded-md border object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">Aucune image</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onSubmit("draft")}><Save className="mr-2 h-4 w-4" /> Enregistrer en brouillon</Button>
        <Button onClick={() => onSubmit("published")}><Save className="mr-2 h-4 w-4" /> Publier</Button>
      </div>
    </AdminPageShell>
  );
}

function FieldRow({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
