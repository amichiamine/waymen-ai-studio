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
import { useAdminState, upsertBrand, deleteBrand, getBrand } from "@/lib/admin-store";

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
});
type V = z.infer<typeof schema>;

export default function AdminBrandForm({ mode }: { mode: "new" | "edit" }) {
  const { brands, products } = useAdminState();
  const { id } = useParams();
  const nav = useNavigate();
  const existing = mode === "edit" && id ? getBrand(id) : undefined;
  const [v, setV] = useState<V>(
    existing
      ? {
          id: existing.id,
          name: existing.name,
          description: existing.description ?? "",
          country: existing.country ?? "",
        }
      : { id: "", name: "", description: "", country: "" },
  );
  const [err, setErr] = useState<Partial<Record<keyof V, string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      const b = brands.find((x) => x.id === id);
      if (b)
        setV({
          id: b.id,
          name: b.name,
          description: b.description ?? "",
          country: b.country ?? "",
        });
    }
  }, [id, mode, brands]);

  function update<K extends keyof V>(k: K, val: V[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
    setErr((e) => ({ ...e, [k]: undefined }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Partial<Record<keyof V, string>> = {};
      p.error.issues.forEach((i) => {
        errs[i.path[0] as keyof V] = i.message;
      });
      setErr(errs);
      toast.error("Corrigez les erreurs du formulaire.");
      return;
    }
    if (mode === "new" && brands.some((b) => b.id === p.data.id)) {
      setErr({ id: "Ce slug existe déjà" });
      toast.error("Slug déjà utilisé");
      return;
    }
    if (mode === "new" && brands.some((b) => b.name.toLowerCase() === p.data.name.toLowerCase())) {
      setErr({ name: "Une marque avec ce nom existe déjà" });
      toast.error("Nom déjà utilisé");
      return;
    }
    try {
      upsertBrand({
        id: p.data.id,
        name: p.data.name,
        description: p.data.description || undefined,
        country: p.data.country || undefined,
      });
      toast.success(mode === "new" ? "Marque créée" : "Marque mise à jour");
      nav("/admin/brands");
    } catch {
      toast.error("Enregistrement échoué");
    }
  }

  const usedCount = existing ? products.filter((p) => p.brand === existing.name).length : 0;

  function doDelete() {
    if (!existing) return;
    if (usedCount > 0) {
      toast.error(`Impossible : ${usedCount} produit(s) utilisent cette marque.`);
      return;
    }
    try {
      deleteBrand(existing.id);
      toast.success("Marque supprimée");
      nav("/admin/brands");
    } catch {
      toast.error("Suppression échouée");
    }
  }

  return (
    <AdminPageShell
      title={mode === "new" ? "Nouvelle marque" : "Modifier la marque"}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/brands">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          {mode === "edit" && existing && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      }
    >
      <form onSubmit={submit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                Slug <span className="text-destructive">*</span>
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
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={!!err.name}
              />
              {err.name && <p className="mt-1 text-xs text-destructive">{err.name}</p>}
            </div>
            <div>
              <Label>Pays d'origine</Label>
              <Input value={v.country ?? ""} onChange={(e) => update("country", e.target.value)} />
              {err.country && <p className="mt-1 text-xs text-destructive">{err.country}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={v.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {(v.description ?? "").length}/300
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
              Annuler
            </Button>
          </Link>
          <Button type="submit">{mode === "new" ? "Créer" : "Enregistrer"}</Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer cette marque ?"
        description={
          existing ? (
            usedCount > 0 ? (
              <>
                Impossible de supprimer : <strong>{usedCount}</strong> produit(s) utilisent encore
                cette marque.
              </>
            ) : (
              <>
                La marque « <strong>{existing.name}</strong> » sera supprimée définitivement.
              </>
            )
          ) : null
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={doDelete}
      />
    </AdminPageShell>
  );
}
