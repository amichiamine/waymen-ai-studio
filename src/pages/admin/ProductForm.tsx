import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, ArrowLeft } from "lucide-react";
import { useAdminState, upsertProduct, deleteProduct, getProduct } from "@/lib/admin-store";
import type { Product, Category } from "@/data/products";

const imageField = z.string().trim().min(1, "Image requise").max(2048).refine(
  (v) => v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:") || /^[\w./-]+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(v),
  { message: "URL ou chemin d'image invalide" },
);

const schema = z.object({
  id: z.string().trim().min(2, "ID trop court (min 2 caractères)").max(60, "ID trop long (max 60)").regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
  name: z.string().trim().min(2, "Nom requis (min 2 caractères)").max(120, "Nom trop long"),
  brand: z.string().trim().min(1, "Marque requise").max(60),
  category: z.enum(["laptops", "desktops", "builds", "phones"], { message: "Catégorie invalide" }),
  specLine: z.string().trim().min(3, "Ligne de specs requise (min 3 caractères)").max(200),
  price: z.coerce.number({ message: "Prix requis" }).int("Nombre entier requis").min(1, "Le prix doit être supérieur à 0").max(100_000_000, "Prix trop élevé"),
  oldPrice: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]).optional(),
  stock: z.enum(["in", "low", "out"]),
  stockQty: z.coerce.number().int().min(0).max(1_000_000).optional(),
  image: imageField,
  bestSeller: z.boolean().optional(),
  sale: z.boolean().optional(),
  cpu: z.string().max(120).optional(),
  ram: z.string().max(60).optional(),
  storage: z.string().max(80).optional(),
  gpu: z.string().max(120).optional(),
  screen: z.string().max(80).optional(),
  os: z.string().max(80).optional(),
}).superRefine((v, ctx) => {
  if (v.oldPrice !== "" && v.oldPrice !== undefined && Number(v.oldPrice) > 0 && Number(v.oldPrice) <= v.price) {
    ctx.addIssue({ code: "custom", path: ["oldPrice"], message: "L'ancien prix doit être supérieur au prix actuel" });
  }
  if (v.sale && (v.oldPrice === "" || v.oldPrice === undefined || Number(v.oldPrice) <= v.price)) {
    ctx.addIssue({ code: "custom", path: ["oldPrice"], message: "Renseigner un ancien prix > prix pour activer la promotion" });
  }
});

type FormValues = z.infer<typeof schema>;


function emptyForm(): FormValues {
  return {
    id: "", name: "", brand: "", category: "laptops", specLine: "",
    price: 0, oldPrice: "" as unknown as number, stock: "in", stockQty: 50, image: "",
    bestSeller: false, sale: false,
    cpu: "", ram: "", storage: "", gpu: "", screen: "", os: "",
  };
}

function toForm(p: Product): FormValues {
  return {
    id: p.id, name: p.name, brand: p.brand, category: p.category, specLine: p.specLine,
    price: p.price, oldPrice: (p.oldPrice ?? "") as number, stock: p.stock, stockQty: p.stockQty ?? 0, image: p.image,
    bestSeller: !!p.bestSeller, sale: !!p.sale,
    cpu: p.specs.cpu ?? "", ram: p.specs.ram ?? "", storage: p.specs.storage ?? "",
    gpu: p.specs.gpu ?? "", screen: p.specs.screen ?? "", os: p.specs.os ?? "",
  };
}


export default function AdminProductForm({ mode }: { mode: "new" | "edit" }) {
  const { products, categories, brands } = useAdminState();
  const nav = useNavigate();
  const { id } = useParams();
  const existing = mode === "edit" && id ? getProduct(id) : undefined;

  const [v, setV] = useState<FormValues>(existing ? toForm(existing) : emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      const p = products.find((x) => x.id === id);
      if (p) setV(toForm(p));
    }
  }, [id, mode, products]);

  const brandOptions = useMemo(() => brands.map((b) => b.name).sort(), [brands]);

  function update<K extends keyof FormValues>(k: K, val: FormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof FormValues] = issue.message;
      setErrors(errs);
      toast.error("Certains champs sont invalides — corrigez les erreurs en rouge.");
      return;
    }
    const data = parsed.data;
    if (mode === "new" && products.some((p) => p.id === data.id)) {
      setErrors({ id: "Cet ID existe déjà" });
      toast.error("ID déjà utilisé");
      return;
    }
    if (!categories.some((c) => c.slug === data.category)) {
      setErrors({ category: "Catégorie inconnue" });
      toast.error("Catégorie inconnue");
      return;
    }
    try {
      const product: Product = {
        id: data.id,
        name: data.name,
        brand: data.brand,
        category: data.category as Category,
        use: existing?.use ?? [],
        specLine: data.specLine,
        specs: {
          cpu: data.cpu || undefined, ram: data.ram || undefined, storage: data.storage || undefined,
          gpu: data.gpu || undefined, screen: data.screen || undefined, os: data.os || undefined,
        },
        price: data.price,
        oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
        stock: data.stock,
        stockQty: typeof data.stockQty === "number" ? data.stockQty : existing?.stockQty,
        image: data.image,
        bestSeller: data.bestSeller,
        sale: data.sale,
      };

      upsertProduct(product);
      toast.success(mode === "new" ? "Produit créé" : "Produit mis à jour");
      nav("/admin/products");
    } catch {
      toast.error("Enregistrement échoué");
    }
  }

  function doDelete() {
    if (!existing) return;
    try {
      deleteProduct(existing.id);
      toast.success(`« ${existing.name} » supprimé`);
      nav("/admin/products");
    } catch {
      toast.error("Suppression échouée");
    }
  }


  return (
    <AdminPageShell
      title={mode === "new" ? "Nouveau produit" : "Modifier le produit"}
      description={mode === "new" ? "Créer une fiche produit." : `Identifiant : ${id}`}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/products"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
          {mode === "edit" && existing && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
          )}
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>ID (slug unique)</Label>
                  <Input value={v.id} disabled={mode === "edit"} onChange={(e) => update("id", e.target.value)} placeholder="ex: rog-strix-g16" />
                  {errors.id && <p className="mt-1 text-xs text-destructive">{errors.id}</p>}
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input value={v.name} onChange={(e) => update("name", e.target.value)} />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </div>
                <div>
                  <Label>Marque</Label>
                  <Input list="brand-list" value={v.brand} onChange={(e) => update("brand", e.target.value)} />
                  <datalist id="brand-list">
                    {brandOptions.map((b) => <option key={b} value={b} />)}
                  </datalist>
                  {errors.brand && <p className="mt-1 text-xs text-destructive">{errors.brand}</p>}
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={v.category} onValueChange={(x) => update("category", x as Category)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Ligne de specs (résumé)</Label>
                <Input value={v.specLine} onChange={(e) => update("specLine", e.target.value)} placeholder="Intel i7 · 16GB · 1TB SSD" />
                {errors.specLine && <p className="mt-1 text-xs text-destructive">{errors.specLine}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>CPU</Label><Input value={v.cpu} onChange={(e) => update("cpu", e.target.value)} /></div>
                <div><Label>RAM</Label><Input value={v.ram} onChange={(e) => update("ram", e.target.value)} /></div>
                <div><Label>Stockage</Label><Input value={v.storage} onChange={(e) => update("storage", e.target.value)} /></div>
                <div><Label>GPU</Label><Input value={v.gpu} onChange={(e) => update("gpu", e.target.value)} /></div>
                <div><Label>Écran</Label><Input value={v.screen} onChange={(e) => update("screen", e.target.value)} /></div>
                <div><Label>OS</Label><Input value={v.os} onChange={(e) => update("os", e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Prix & stock</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Prix (DA)</Label>
                  <Input type="number" value={v.price} onChange={(e) => update("price", Number(e.target.value))} />
                  {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
                </div>
                <div>
                  <Label>Ancien prix (optionnel)</Label>
                  <Input type="number" value={v.oldPrice as number | ""} onChange={(e) => update("oldPrice", e.target.value === "" ? ("" as unknown as number) : Number(e.target.value))} />
                </div>
                <div>
                  <Label>Quantité (unités)</Label>
                  <Input type="number" min={0} value={v.stockQty ?? 0} onChange={(e) => update("stockQty", Number(e.target.value))} />
                  <p className="mt-1 text-xs text-muted-foreground">Le statut se recalcule selon les seuils définis dans /admin/settings.</p>
                </div>
                <div>
                  <Label>État du stock (surcharge)</Label>
                  <Select value={v.stock} onValueChange={(x) => update("stock", x as "in" | "low" | "out")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">En stock</SelectItem>
                      <SelectItem value="low">Stock faible</SelectItem>
                      <SelectItem value="out">Rupture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="bs" className="mb-0">Best-seller</Label>
                  <Switch id="bs" checked={!!v.bestSeller} onCheckedChange={(x) => update("bestSeller", x)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="sale" className="mb-0">En promotion</Label>
                  <Switch id="sale" checked={!!v.sale} onCheckedChange={(x) => update("sale", x)} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Image</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input value={v.image} onChange={(e) => update("image", e.target.value)} placeholder="URL ou chemin de l'image" />
                {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
                {v.image && (
                  <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                    <img src={v.image} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Link to="/admin/products"><Button variant="outline" type="button">Annuler</Button></Link>
          <Button type="submit">{mode === "new" ? "Créer" : "Enregistrer"}</Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer ce produit ?"
        description={existing ? <>Le produit « <strong>{existing.name}</strong> » sera supprimé du catalogue local. Cette action est irréversible.</> : null}
        confirmLabel="Supprimer"
        destructive
        onConfirm={doDelete}
      />
    </AdminPageShell>
  );

}
