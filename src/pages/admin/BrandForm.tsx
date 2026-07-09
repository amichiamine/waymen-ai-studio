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
import { useAdminState, upsertBrand, deleteBrand, getBrand } from "@/lib/admin-store";

const schema = z.object({
  id: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/, "Slug invalide"),
  name: z.string().trim().min(1, "Nom requis").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
});
type V = z.infer<typeof schema>;

export default function AdminBrandForm({ mode }: { mode: "new" | "edit" }) {
  const { brands, products } = useAdminState();
  const { id } = useParams();
  const nav = useNavigate();
  const existing = mode === "edit" && id ? getBrand(id) : undefined;
  const [v, setV] = useState<V>(existing ? { id: existing.id, name: existing.name, description: existing.description ?? "", country: existing.country ?? "" } : { id: "", name: "", description: "", country: "" });
  const [err, setErr] = useState<Partial<Record<keyof V, string>>>({});

  useEffect(() => {
    if (mode === "edit" && id) {
      const b = brands.find((x) => x.id === id);
      if (b) setV({ id: b.id, name: b.name, description: b.description ?? "", country: b.country ?? "" });
    }
  }, [id, mode, brands]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Partial<Record<keyof V, string>> = {};
      p.error.issues.forEach((i) => { errs[i.path[0] as keyof V] = i.message; });
      setErr(errs);
      return;
    }
    if (mode === "new" && brands.some((b) => b.id === p.data.id)) {
      setErr({ id: "Ce slug existe déjà" }); return;
    }
    upsertBrand({ id: p.data.id, name: p.data.name, description: p.data.description || undefined, country: p.data.country || undefined });
    toast.success(mode === "new" ? "Marque créée" : "Marque mise à jour");
    nav("/admin/brands");
  }

  function onDelete() {
    if (!existing) return;
    const used = products.filter((p) => p.brand === existing.name).length;
    if (used > 0) { toast.error(`Impossible : ${used} produit(s) utilisent cette marque.`); return; }
    if (!confirm(`Supprimer « ${existing.name} » ?`)) return;
    deleteBrand(existing.id);
    toast.success("Marque supprimée");
    nav("/admin/brands");
  }

  return (
    <AdminPageShell
      title={mode === "new" ? "Nouvelle marque" : "Modifier la marque"}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/brands"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
          {mode === "edit" && existing && <Button variant="destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>}
        </div>
      }
    >
      <form onSubmit={submit} className="max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Slug</Label>
              <Input value={v.id} disabled={mode === "edit"} onChange={(e) => setV({ ...v, id: e.target.value })} placeholder="asus" />
              {err.id && <p className="mt-1 text-xs text-destructive">{err.id}</p>}
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
              {err.name && <p className="mt-1 text-xs text-destructive">{err.name}</p>}
            </div>
            <div>
              <Label>Pays d'origine</Label>
              <Input value={v.country ?? ""} onChange={(e) => setV({ ...v, country: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} />
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Link to="/admin/brands"><Button variant="outline" type="button">Annuler</Button></Link>
          <Button type="submit">{mode === "new" ? "Créer" : "Enregistrer"}</Button>
        </div>
      </form>
    </AdminPageShell>
  );
}
