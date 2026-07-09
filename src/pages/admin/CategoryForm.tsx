import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAdminState, upsertCategory, deleteCategory, getCategory } from "@/lib/admin-store";

const schema = z.object({
  slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres, tirets"),
  label: z.string().trim().min(2, "Nom requis").max(80),
  description: z.string().trim().min(3, "Description requise").max(300),
  cover: z.string().trim().max(2048).optional().or(z.literal("")),
});
type V = z.infer<typeof schema>;

export default function AdminCategoryForm({ mode }: { mode: "new" | "edit" }) {
  const { categories, products } = useAdminState();
  const { slug } = useParams();
  const nav = useNavigate();
  const existing = mode === "edit" && slug ? getCategory(slug) : undefined;
  const [v, setV] = useState<V>(existing ? { slug: existing.slug, label: existing.label, description: existing.description, cover: existing.cover ?? "" } : { slug: "", label: "", description: "", cover: "" });
  const [err, setErr] = useState<Partial<Record<keyof V, string>>>({});

  useEffect(() => {
    if (mode === "edit" && slug) {
      const c = categories.find((x) => x.slug === slug);
      if (c) setV({ slug: c.slug, label: c.label, description: c.description, cover: c.cover ?? "" });
    }
  }, [slug, mode, categories]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Partial<Record<keyof V, string>> = {};
      p.error.issues.forEach((i) => { errs[i.path[0] as keyof V] = i.message; });
      setErr(errs);
      return;
    }
    if (mode === "new" && categories.some((c) => c.slug === p.data.slug)) {
      setErr({ slug: "Ce slug existe déjà" });
      return;
    }
    upsertCategory({ slug: p.data.slug, label: p.data.label, description: p.data.description, cover: p.data.cover || undefined });
    toast.success(mode === "new" ? "Catégorie créée" : "Catégorie mise à jour");
    nav("/admin/categories");
  }

  function onDelete() {
    if (!existing) return;
    const used = products.filter((p) => p.category === existing.slug).length;
    if (used > 0) { toast.error(`Impossible : ${used} produit(s) utilisent cette catégorie.`); return; }
    if (!confirm(`Supprimer « ${existing.label} » ?`)) return;
    deleteCategory(existing.slug);
    toast.success("Catégorie supprimée");
    nav("/admin/categories");
  }

  return (
    <AdminPageShell
      title={mode === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/categories"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
          {mode === "edit" && existing && <Button variant="destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>}
        </div>
      }
    >
      <form onSubmit={submit} className="max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Slug (URL)</Label>
              <Input value={v.slug} disabled={mode === "edit"} onChange={(e) => setV({ ...v, slug: e.target.value })} placeholder="laptops" />
              {err.slug && <p className="mt-1 text-xs text-destructive">{err.slug}</p>}
            </div>
            <div>
              <Label>Nom affiché</Label>
              <Input value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />
              {err.label && <p className="mt-1 text-xs text-destructive">{err.label}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
              {err.description && <p className="mt-1 text-xs text-destructive">{err.description}</p>}
            </div>
            <div>
              <Label>Image de couverture (URL, optionnel)</Label>
              <Input value={v.cover ?? ""} onChange={(e) => setV({ ...v, cover: e.target.value })} />
              {v.cover && <div className="mt-3 aspect-[16/10] overflow-hidden rounded-md border bg-muted"><img src={v.cover} alt="" className="h-full w-full object-cover" /></div>}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Link to="/admin/categories"><Button variant="outline" type="button">Annuler</Button></Link>
          <Button type="submit">{mode === "new" ? "Créer" : "Enregistrer"}</Button>
        </div>
      </form>
    </AdminPageShell>
  );
}
