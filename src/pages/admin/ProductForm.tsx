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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, ArrowLeft } from "lucide-react";
import {
  useProductList,
  useProductDetail,
  useProductMutations,
  useCategoryList,
  useBrandList,
  useMediaAssetList,
  toApiError,
} from "@/data-provider";
import type { Product, Category } from "@/data/products";
import { usePermissions } from "@/lib/admin-auth";
import { localize, useLocalize } from "@/lib/i18n";

const imageField = z
  .string()
  .trim()
  .min(1, "Image requise")
  .max(2048)
  .refine(
    (v) =>
      v.startsWith("/") ||
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("data:") ||
      /^[\w./-]+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(v),
    { message: "URL ou chemin d'image invalide" },
  );

const schema = z
  .object({
    id: z
      .string()
      .trim()
      .min(2, "ID trop court (min 2 caractères)")
      .max(60, "ID trop long (max 60)")
      .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
    name: z.string().trim().min(2, "Nom requis (min 2 caractères)").max(120, "Nom trop long"),
    brand: z.string().trim().min(1, "Marque requise").max(60),
    category: z.enum(["laptops", "desktops", "builds", "phones"], {
      message: "Catégorie invalide",
    }),
    specLine: z.string().trim().min(3, "Ligne de specs requise (min 3 caractères)").max(200),
    price: z.coerce
      .number({ message: "Prix requis" })
      .int("Nombre entier requis")
      .min(1, "Le prix doit être supérieur à 0")
      .max(100_000_000, "Prix trop élevé"),
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
  })
  .superRefine((v, ctx) => {
    if (
      v.oldPrice !== "" &&
      v.oldPrice !== undefined &&
      Number(v.oldPrice) > 0 &&
      Number(v.oldPrice) <= v.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["oldPrice"],
        message: "L'ancien prix doit être supérieur au prix actuel",
      });
    }
    if (
      v.sale &&
      (v.oldPrice === "" || v.oldPrice === undefined || Number(v.oldPrice) <= v.price)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["oldPrice"],
        message: "Renseigner un ancien prix > prix pour activer la promotion",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function emptyForm(): FormValues {
  return {
    id: "",
    name: "",
    brand: "",
    category: "laptops",
    specLine: "",
    price: 0,
    oldPrice: "" as unknown as number,
    stock: "in",
    stockQty: 50,
    image: "",
    bestSeller: false,
    sale: false,
    cpu: "",
    ram: "",
    storage: "",
    gpu: "",
    screen: "",
    os: "",
  };
}

/**
 * Convertit un `Product` en valeurs de formulaire.
 *
 * Les champs `name`, `specLine` et les valeurs de `specs` sont des
 * `Localized<string>` depuis la vague 3.1. On les résout ici en français
 * (langue de référence du back-office) avec `localize(v, "fr")` afin que le
 * formulaire n'édite que la variante française — les variantes anglaise et
 * arabe sont préservées dans `existing` et réinjectées lors de l'enregistrement
 * (voir la logique `mergeLocalized` dans `onSubmit`).
 *
 * IMPORTANT : ne jamais écrire directement `name: data.name` (string) dans
 * l'objet `Product` transmis à l'API — cela écraserait l'objet multilingue
 * par une chaîne nue et détruirait silencieusement les traductions anglaise
 * et arabe. La vague des onglets FR/EN/AR (pilote : Content.tsx) pourra
 * exposer les trois champs sans risque car les données ne seront jamais perdues.
 */
function toForm(p: Product): FormValues {
  return {
    id: p.id,
    name: localize(p.name, "fr") ?? "",
    brand: p.brand,
    category: p.category,
    specLine: localize(p.specLine, "fr") ?? "",
    price: p.price,
    oldPrice: (p.oldPrice ?? "") as number,
    stock: p.stock,
    stockQty: p.stockQty ?? 0,
    image: p.image,
    bestSeller: !!p.bestSeller,
    sale: !!p.sale,
    cpu: localize(p.specs.cpu, "fr") ?? "",
    ram: localize(p.specs.ram, "fr") ?? "",
    storage: localize(p.specs.storage, "fr") ?? "",
    gpu: localize(p.specs.gpu, "fr") ?? "",
    screen: localize(p.specs.screen, "fr") ?? "",
    os: localize(p.specs.os, "fr") ?? "",
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
 *
 * Retourne `undefined` si la valeur éditée est vide (champ optionnel absent).
 */
function mergeLocalized(
  edited: string | undefined,
  original: { fr: string; en?: string; ar?: string } | string | undefined,
): { fr: string; en?: string; ar?: string } | string | undefined {
  if (!edited) return undefined;
  if (original !== undefined && typeof original === "object" && original !== null) {
    return { ...original, fr: edited };
  }
  return edited;
}

export default function AdminProductForm({ mode }: { mode: "new" | "edit" }) {
  const { data: products } = useProductList();
  const { data: categories } = useCategoryList();
  const { data: brands } = useBrandList();
  const { data: mediaAssets } = useMediaAssetList();
  const { can, guard, denyReason } = usePermissions();
  const { create, update: updateProduct, remove } = useProductMutations();
  const L = useLocalize();

  const nav = useNavigate();
  const { id } = useParams();

  // useProductDetail reste monté et inactif quand id est undefined — jamais de hook conditionnel.
  const { data: existing } = useProductDetail(mode === "edit" ? id : undefined);

  const [v, setV] = useState<FormValues>(existing ? toForm(existing) : emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      const p = products.find((x) => x.id === id);
      if (p) setV(toForm(p));
    }
  }, [id, mode, products]);

  const brandOptions = useMemo(() => brands.map((b) => b.name).sort(), [brands]);

  function updateField<K extends keyof FormValues>(k: K, val: FormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  // Niveau 2 — la vérification vit DANS l'action, pas seulement dans le rendu.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionKey = mode === "new" ? "create" : "update";
    if (!guard(actionKey, mode === "new" ? "Créer le produit" : "Modifier le produit")) return;
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues)
        errs[issue.path[0] as keyof FormValues] = issue.message;
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
    /**
     * Préservation des traductions non éditées (piège multilingue, vague 3.2).
     *
     * Le formulaire n'expose qu'un seul champ texte par propriété localisée :
     * il édite la variante française. Si le produit possédait déjà des
     * variantes anglaise et arabe (`existing.name = { fr, en, ar }`), écrire
     * `name: data.name` (string) les détruirait silencieusement.
     *
     * `mergeLocalized` réinjecte la valeur française dans l'objet d'origine,
     * en conservant les autres langues intactes. Pour un nouveau produit
     * (`existing` est undefined), la valeur française est utilisée directement
     * (chaîne simple, compatible avec `Localized<string>`).
     */
    const product: Product = {
      id: data.id,
      name: mergeLocalized(data.name, existing?.name) ?? data.name,
      brand: data.brand,
      category: data.category as Category,
      use: existing?.use ?? [],
      specLine: mergeLocalized(data.specLine, existing?.specLine) ?? data.specLine,
      specs: {
        cpu: mergeLocalized(data.cpu, existing?.specs.cpu),
        ram: mergeLocalized(data.ram, existing?.specs.ram),
        storage: mergeLocalized(data.storage, existing?.specs.storage),
        gpu: mergeLocalized(data.gpu, existing?.specs.gpu),
        screen: mergeLocalized(data.screen, existing?.specs.screen),
        os: mergeLocalized(data.os, existing?.specs.os),
      },
      price: data.price,
      oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
      stock: data.stock,
      stockQty: typeof data.stockQty === "number" ? data.stockQty : existing?.stockQty,
      image: data.image,
      bestSeller: data.bestSeller,
      sale: data.sale,
    };
    setSaving(true);
    try {
      if (mode === "new") {
        await create(product);
      } else {
        await updateProduct(product.id, product);
      }
      toast.success(mode === "new" ? "Produit créé" : "Produit mis à jour");
      nav("/admin/products");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Niveau 2 — vérification dans le handler de suppression.
  const doDelete = async () => {
    if (!existing) return;
    if (!guard("delete", "Supprimer le produit")) return;
    setDeleting(true);
    // Résoudre le nom pour l'affichage dans le toast (jamais interpoler un Localized brut).
    const existingName = L(existing.name) ?? "";
    try {
      await remove(existing.id);
      toast.success(`« ${existingName} » supprimé`);
      nav("/admin/products");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Clé applicable au formulaire courant : "create" en mode new, "update" en mode edit.
  const mutateKey = mode === "new" ? "create" : "update";

  // Nom résolu pour l'affichage dans la boîte de confirmation de suppression.
  const existingName = L(existing?.name) ?? "";

  return (
    <AdminPageShell
      title={mode === "new" ? "Nouveau produit" : "Modifier le produit"}
      description={mode === "new" ? "Créer une fiche produit." : `Identifiant : ${id}`}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/products">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          {/* Niveau 1 — masquer / désactiver le bouton de suppression si non autorisé. */}
          {mode === "edit" &&
            existing &&
            (can("delete") ? (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="me-2 h-4 w-4" />
                Supprimer
              </Button>
            ) : (
              <span title={denyReason("delete")} className="inline-flex">
                <Button variant="destructive" disabled>
                  <Trash2 className="me-2 h-4 w-4" />
                  Supprimer
                </Button>
              </span>
            ))}
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>ID (slug unique)</Label>
                  <Input
                    value={v.id}
                    disabled={mode === "edit"}
                    onChange={(e) => updateField("id", e.target.value)}
                    placeholder="ex: rog-strix-g16"
                  />
                  {errors.id && <p className="mt-1 text-xs text-destructive">{errors.id}</p>}
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input value={v.name} onChange={(e) => updateField("name", e.target.value)} />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </div>
                <div>
                  <Label>Marque</Label>
                  <Input
                    list="brand-list"
                    value={v.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                  />
                  <datalist id="brand-list">
                    {brandOptions.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  {errors.brand && <p className="mt-1 text-xs text-destructive">{errors.brand}</p>}
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Select
                    value={v.category}
                    onValueChange={(x) => updateField("category", x as Category)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Ligne de specs (résumé)</Label>
                <Input
                  value={v.specLine}
                  onChange={(e) => updateField("specLine", e.target.value)}
                  placeholder="Intel i7 · 16GB · 1TB SSD"
                />
                {errors.specLine && (
                  <p className="mt-1 text-xs text-destructive">{errors.specLine}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>CPU</Label>
                  <Input value={v.cpu} onChange={(e) => updateField("cpu", e.target.value)} />
                </div>
                <div>
                  <Label>RAM</Label>
                  <Input value={v.ram} onChange={(e) => updateField("ram", e.target.value)} />
                </div>
                <div>
                  <Label>Stockage</Label>
                  <Input
                    value={v.storage}
                    onChange={(e) => updateField("storage", e.target.value)}
                  />
                </div>
                <div>
                  <Label>GPU</Label>
                  <Input value={v.gpu} onChange={(e) => updateField("gpu", e.target.value)} />
                </div>
                <div>
                  <Label>Écran</Label>
                  <Input value={v.screen} onChange={(e) => updateField("screen", e.target.value)} />
                </div>
                <div>
                  <Label>OS</Label>
                  <Input value={v.os} onChange={(e) => updateField("os", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prix & stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Prix (DA)</Label>
                  <Input
                    type="number"
                    value={v.price}
                    onChange={(e) => updateField("price", Number(e.target.value))}
                  />
                  {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
                </div>
                <div>
                  <Label>Ancien prix (optionnel)</Label>
                  <Input
                    type="number"
                    value={v.oldPrice as number | ""}
                    onChange={(e) =>
                      updateField(
                        "oldPrice",
                        e.target.value === "" ? ("" as unknown as number) : Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Quantité (unités)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.stockQty ?? 0}
                    onChange={(e) => updateField("stockQty", Number(e.target.value))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Le statut se recalcule selon les seuils définis dans /admin/settings.
                  </p>
                </div>
                <div>
                  <Label>État du stock (surcharge)</Label>
                  <Select
                    value={v.stock}
                    onValueChange={(x) => updateField("stock", x as "in" | "low" | "out")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">En stock</SelectItem>
                      <SelectItem value="low">Stock faible</SelectItem>
                      <SelectItem value="out">Rupture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="bs" className="mb-0">
                    Best-seller
                  </Label>
                  <Switch
                    id="bs"
                    checked={!!v.bestSeller}
                    onCheckedChange={(x) => updateField("bestSeller", x)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="sale" className="mb-0">
                    En promotion
                  </Label>
                  <Switch
                    id="sale"
                    checked={!!v.sale}
                    onCheckedChange={(x) => updateField("sale", x)}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mediaAssets.length > 0 && (
                  <div>
                    <Label>Depuis la médiathèque</Label>
                    <Select value="" onValueChange={(src) => updateField("image", src)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un média…" />
                      </SelectTrigger>
                      <SelectContent>
                        {mediaAssets.map((m) => (
                          <SelectItem key={m.id} value={m.src}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Label>URL ou chemin</Label>
                <Input
                  value={v.image}
                  onChange={(e) => updateField("image", e.target.value)}
                  placeholder="URL ou chemin de l'image"
                />
                {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
                {v.image && (
                  <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                    <img
                      src={v.image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Niveau 1 — désactiver le bouton de soumission si l'action est interdite. */}
        {/* Niveau 3 — expliquer pourquoi via le <span> porteur du title.          */}
        <div className="flex justify-end gap-2">
          <Link to="/admin/products">
            <Button variant="outline" type="button">
              Annuler
            </Button>
          </Link>
          {can(mutateKey) ? (
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : mode === "new" ? "Créer" : "Enregistrer"}
            </Button>
          ) : (
            <span title={denyReason(mutateKey)} className="inline-flex">
              <Button type="submit" disabled>
                {mode === "new" ? "Créer" : "Enregistrer"}
              </Button>
            </span>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer ce produit ?"
        description={
          existing ? (
            <>
              Le produit « <strong>{existingName}</strong> » sera supprimé du catalogue local. Cette
              action est irréversible.
            </>
          ) : null
        }
        confirmLabel={deleting ? "Suppression…" : "Supprimer"}
        destructive
        onConfirm={doDelete}
      />
    </AdminPageShell>
  );
}
