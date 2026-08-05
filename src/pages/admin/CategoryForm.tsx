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
import { useAdminState, upsertCategory, deleteCategory, getCategory } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

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
  const { categories, products } = useAdminState();
  const { can, guard, denyReason } = usePermissions();
  const { slug } = useParams();
  const nav = useNavigate();
  const existing = mode === "edit" && slug ? getCategory(slug) : undefined;
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Niveau 2 — vérification dans le handler avant toute mutation.
    const perm = mode === "new" ? "create" : "update";
    if (!guard(perm, mode === "new" ? "Créer la catégorie" : "Modifier la catégorie")) return;
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
    if (mode === "new" && categories.some((c) => c.slug === p.data.slug)) {
      setErr({ slug: "Ce slug existe déjà" });
      toast.error("Slug déjà utilisé");
      return;
    }
    try {
      upsertCategory({
        slug: p.data.slug,
        label: p.data.label,
        description: p.data.description,
        cover: p.data.cover || undefined,
      });
      toast.success(mode === "new" ? "Catégorie créée" : "Catégorie mise à jour");
      nav("/admin/categories");
    } catch {
      toast.error("Enregistrement échoué");
    }
  }

  const usedCount = existing ? products.filter((p) => p.category === existing.slug).length : 0;

  function doDelete() {
    if (!existing) return;
    // Niveau 2 — vérification dans le handler avant toute mutation.
    if (!guard("delete", "Supprimer la catégorie")) return;
    // Garde métier préservée : refus si des produits sont encore rattachés.
    if (usedCount > 0) {
      toast.error(`Impossible : ${usedCount} produit(s) utilisent cette catégorie.`);
      return;
    }
    try {
      deleteCategory(existing.slug);
      toast.success("Catégorie supprimée");
      nav("/admin/categories");
    } catch {
      toast.error("Suppression échouée");
    }
  }

  // Clé de permission selon le mode : création ou modification.
  const formPerm = mode === "new" ? "create" : "update";

  return (
    <AdminPageShell
      title={mode === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/categories">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
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
                Supprimer
              </Button>
            </span>
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
                Slug (URL) <span className="text-destructive">*</span>
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
                Nom affiché <span className="text-destructive">*</span>
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
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                value={v.description}
                onChange={(e) => update("description", e.target.value)}
                aria-invalid={!!err.description}
              />
              <p className="mt-1 text-xs text-muted-foreground">{v.description.length}/300</p>
              {err.description && (
                <p className="mt-1 text-xs text-destructive">{err.description}</p>
              )}
            </div>
            <div>
              <Label>Image de couverture (URL, optionnel)</Label>
              <Input value={v.cover ?? ""} onChange={(e) => update("cover", e.target.value)} />
              {err.cover && <p className="mt-1 text-xs text-destructive">{err.cover}</p>}
              {v.cover && (
                <div className="mt-3 aspect-[16/10] overflow-hidden rounded-md border bg-muted">
                  <img
                    src={v.cover}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Link to="/admin/categories">
            <Button variant="outline" type="button">
              Annuler
            </Button>
          </Link>
          {/* Niveau 1+3 : bouton de soumission désactivé si pas la permission. */}
          <span title={denyReason(formPerm)} className="inline-flex">
            <Button type="submit" disabled={!can(formPerm)}>
              {mode === "new" ? "Créer" : "Enregistrer"}
            </Button>
          </span>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer cette catégorie ?"
        description={
          existing ? (
            usedCount > 0 ? (
              <>
                Impossible de supprimer : <strong>{usedCount}</strong> produit(s) utilisent encore
                cette catégorie.
              </>
            ) : (
              <>
                La catégorie « <strong>{existing.label}</strong> » sera supprimée définitivement.
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
