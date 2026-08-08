import { useEffect, useMemo, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { Localized } from "@/lib/i18n";
import { useLocalize, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers pour les champs localisés (même recette que Content.tsx)
// ---------------------------------------------------------------------------

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

/** Normalise n'importe quel `Localized<string>` en objet à trois clés. */
function toMap(v: Localized<string> | undefined): Record<LangCode, string> {
  if (v == null) return { fr: "", en: "", ar: "" };
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: v.fr ?? "", en: v.en ?? "", ar: v.ar ?? "" };
}

/**
 * Construit le `Localized<string>` à persister depuis la map d'édition.
 * - Si fr vide → undefined (champ optionnel absent).
 * - Si en et ar vides → chaîne nue (rétrocompatible avec les données seed).
 * - Sinon → objet `{ fr, en?, ar? }` ne contenant que les variantes non vides.
 */
function fromMap(map: Record<LangCode, string>): Localized<string> | undefined {
  if (!map.fr.trim()) return undefined;
  if (!map.en.trim() && !map.ar.trim()) return map.fr;
  const result: { fr: string; en?: string; ar?: string } = { fr: map.fr };
  if (map.en.trim()) result.en = map.en;
  if (map.ar.trim()) result.ar = map.ar;
  return result;
}

// ---------------------------------------------------------------------------
// LField — champ Input avec onglets FR / EN / AR
// ---------------------------------------------------------------------------

function MissingDot() {
  return (
    <span
      aria-label="traduction manquante"
      className="ms-1 inline-block size-1.5 rounded-full bg-amber-400 align-middle"
    />
  );
}

function LField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: {
  label: string;
  value: Localized<string> | undefined;
  onChange: (next: Localized<string> | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [lang, setLang] = useState<LangCode>("fr");
  const map = toMap(value);
  const isAr = lang === "ar";

  function handleChange(text: string) {
    onChange(fromMap({ ...map, [lang]: text }));
  }

  return (
    <div className="space-y-1.5">
      <Label className={cn(isAr && "block text-end")}>{label}</Label>
      {/* Onglets langue */}
      <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-semibold uppercase">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={cn(
              "rounded-sm px-2 py-0.5 transition-colors",
              lang === l
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
            {l !== "fr" && !map[l].trim() && <MissingDot />}
          </button>
        ))}
      </div>
      <div dir={isAr ? "rtl" : "ltr"}>
        <Input
          dir={isAr ? "rtl" : "ltr"}
          className={cn(isAr && "text-end")}
          value={map[lang]}
          placeholder={lang === "fr" ? placeholder : undefined}
          disabled={disabled}
          required={lang === "fr" && required}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schéma Zod — seul le français est obligatoire
// ---------------------------------------------------------------------------

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

/** Schéma d'un champ localisé : seule la variante `fr` est obligatoire. */
const localizedStringSchema = z.object({
  fr: z.string().trim(),
  en: z.string().optional(),
  ar: z.string().optional(),
});

const schema = z
  .object({
    id: z
      .string()
      .trim()
      .min(2, "ID trop court (min 2 caractères)")
      .max(60, "ID trop long (max 60)")
      .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
    name: localizedStringSchema.refine((v) => v.fr.length >= 2, {
      path: ["fr"],
      message: "Nom requis (min 2 caractères)",
    }),
    brand: z.string().trim().min(1, "Marque requise").max(60),
    category: z.enum(["laptops", "desktops", "builds", "phones"], {
      message: "Catégorie invalide",
    }),
    specLine: localizedStringSchema.refine((v) => v.fr.length >= 3, {
      path: ["fr"],
      message: "Ligne de specs requise (min 3 caractères)",
    }),
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
    cpu: localizedStringSchema.optional(),
    ram: localizedStringSchema.optional(),
    storage: localizedStringSchema.optional(),
    gpu: localizedStringSchema.optional(),
    screen: localizedStringSchema.optional(),
    os: localizedStringSchema.optional(),
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

// ---------------------------------------------------------------------------
// Valeurs initiales
// ---------------------------------------------------------------------------

function emptyLocalized(): Record<LangCode, string> {
  return { fr: "", en: "", ar: "" };
}

function emptyForm(): FormValues {
  return {
    id: "",
    name: emptyLocalized(),
    brand: "",
    category: "laptops",
    specLine: emptyLocalized(),
    price: 0,
    oldPrice: "" as unknown as number,
    stock: "in",
    stockQty: 50,
    image: "",
    bestSeller: false,
    sale: false,
    cpu: emptyLocalized(),
    ram: emptyLocalized(),
    storage: emptyLocalized(),
    gpu: emptyLocalized(),
    screen: emptyLocalized(),
    os: emptyLocalized(),
  };
}

/**
 * Convertit un `Product` en valeurs de formulaire.
 * Les champs `Localized<string>` sont normalisés en objet `{ fr, en, ar }` via
 * `toMap()` pour permettre l'édition des trois langues.
 */
function toForm(p: Product): FormValues {
  return {
    id: p.id,
    name: toMap(p.name),
    brand: p.brand,
    category: p.category,
    specLine: toMap(p.specLine),
    price: p.price,
    oldPrice: (p.oldPrice ?? "") as number,
    stock: p.stock,
    stockQty: p.stockQty ?? 0,
    image: p.image,
    bestSeller: !!p.bestSeller,
    sale: !!p.sale,
    cpu: toMap(p.specs.cpu),
    ram: toMap(p.specs.ram),
    storage: toMap(p.specs.storage),
    gpu: toMap(p.specs.gpu),
    screen: toMap(p.specs.screen),
    os: toMap(p.specs.os),
  };
}

/**
 * Convertit un objet `{ fr, en?, ar? }` du formulaire en `Localized<string>`
 * ou `undefined` pour les champs de specs optionnels.
 *
 * - fr vide → undefined (champ optionnel absent).
 * - en et ar vides → chaîne nue (rétrocompatible avec les données seed).
 * - sinon → `{ fr, en?, ar? }` avec seulement les variantes non vides.
 */
function mapToLocalized(
  map: { fr: string; en?: string; ar?: string } | undefined,
): Localized<string> | undefined {
  if (!map) return undefined;
  return fromMap({ fr: map.fr, en: map.en ?? "", ar: map.ar ?? "" });
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function AdminProductForm({ mode }: { mode: "new" | "edit" }) {
  const { data: products } = useProductList();
  const { data: categories } = useCategoryList();
  const { data: brands } = useBrandList();
  const { data: mediaAssets } = useMediaAssetList();
  const { can, guard, denyReason } = usePermissions();
  const { create, update: updateProduct, remove } = useProductMutations();
  const L = useLocalize();
  const { t } = useI18n();

  const nav = useNavigate();
  const { id } = useParams();

  // useProductDetail reste monté et inactif quand id est undefined — jamais de hook conditionnel.
  const { data: existing } = useProductDetail(mode === "edit" ? id : undefined);

  const [v, setV] = useState<FormValues>(existing ? toForm(existing) : emptyForm());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
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
    if (
      !guard(
        actionKey,
        mode === "new"
          ? t("admin.catalogue.produit_form.creer_garde")
          : t("admin.catalogue.produit_form.modifier_garde"),
      )
    )
      return;
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        errs[path] = issue.message;
        if (issue.path.length > 0) {
          errs[issue.path[0] as string] ??= issue.message;
        }
      }
      setErrors(errs);
      toast.error(t("admin.catalogue.produit_form.toast_champs_invalides"));
      return;
    }
    const data = parsed.data;
    if (mode === "new" && products.some((p) => p.id === data.id)) {
      setErrors({ id: t("admin.catalogue.produit_form.erreur_id_existant") });
      toast.error(t("admin.catalogue.produit_form.toast_id_existant"));
      return;
    }
    if (!categories.some((c) => c.slug === data.category)) {
      setErrors({ category: t("admin.catalogue.produit_form.erreur_categorie_inconnue") });
      toast.error(t("admin.catalogue.produit_form.toast_categorie_inconnue"));
      return;
    }

    const product: Product = {
      id: data.id,
      name: mapToLocalized(data.name) ?? data.name.fr,
      brand: data.brand,
      category: data.category as Category,
      use: existing?.use ?? [],
      specLine: mapToLocalized(data.specLine) ?? data.specLine.fr,
      specs: {
        cpu: mapToLocalized(data.cpu),
        ram: mapToLocalized(data.ram),
        storage: mapToLocalized(data.storage),
        gpu: mapToLocalized(data.gpu),
        screen: mapToLocalized(data.screen),
        os: mapToLocalized(data.os),
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
      toast.success(
        mode === "new"
          ? t("admin.catalogue.produit_form.toast_cree")
          : t("admin.catalogue.produit_form.toast_mis_a_jour"),
      );
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
    if (!guard("delete", t("admin.catalogue.produit_form.supprimer_garde"))) return;
    setDeleting(true);
    // Résoudre le nom pour l'affichage dans le toast (jamais interpoler un Localized brut).
    const existingName = L(existing.name) ?? "";
    try {
      await remove(existing.id);
      toast.success(t("admin.catalogue.produit_form.supprimer_description", { nom: existingName }));
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

  const STOCK_LABEL_KEY: Record<string, string> = {
    in: "admin.catalogue.commun.stock_in",
    low: "admin.catalogue.commun.stock_low",
    out: "admin.catalogue.commun.stock_out",
  };

  return (
    <AdminPageShell
      title={
        mode === "new"
          ? t("admin.catalogue.produit_form.titre_nouveau")
          : t("admin.catalogue.produit_form.titre_modifier")
      }
      description={
        mode === "new"
          ? t("admin.catalogue.produit_form.description_nouveau")
          : t("admin.catalogue.produit_form.description_modifier", { id: id ?? "" })
      }
      actions={
        <div className="flex gap-2">
          <Link to="/admin/products">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.produit_form.retour")}
            </Button>
          </Link>
          {/* Niveau 1 — masquer / désactiver le bouton de suppression si non autorisé. */}
          {mode === "edit" &&
            existing &&
            (can("delete") ? (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="me-2 h-4 w-4" />
                {t("admin.catalogue.produit_form.supprimer")}
              </Button>
            ) : (
              <span title={denyReason("delete")} className="inline-flex">
                <Button variant="destructive" disabled>
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("admin.catalogue.produit_form.supprimer")}
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
              <CardTitle>{t("admin.catalogue.produit_form.section_informations")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Champs non localisés */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t("admin.catalogue.produit_form.label_id")}</Label>
                  <Input
                    value={v.id}
                    disabled={mode === "edit"}
                    onChange={(e) => updateField("id", e.target.value)}
                    placeholder="ex: rog-strix-g16"
                  />
                  {errors.id && <p className="mt-1 text-xs text-destructive">{errors.id}</p>}
                </div>
                <div>
                  <Label>{t("admin.catalogue.produit_form.label_marque")}</Label>
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
                  <Label>{t("admin.catalogue.produit_form.label_categorie")}</Label>
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

              {/* Onglets de traduction FR / EN / AR */}
              <Tabs defaultValue="fr">
                <TabsList>
                  <TabsTrigger value="fr">FR</TabsTrigger>
                  <TabsTrigger value="en">
                    EN
                    {!v.name?.en?.trim() && <MissingDot />}
                  </TabsTrigger>
                  <TabsTrigger value="ar">
                    AR
                    {!v.name?.ar?.trim() && <MissingDot />}
                  </TabsTrigger>
                </TabsList>

                {/* Onglet FR — obligatoire */}
                <TabsContent value="fr" className="space-y-4 pt-2">
                  <div>
                    <Label>{t("admin.catalogue.produit_form.label_nom")}</Label>
                    <Input
                      value={v.name.fr}
                      onChange={(e) => updateField("name", { ...v.name, fr: e.target.value })}
                    />
                    {errors["name.fr"] && (
                      <p className="mt-1 text-xs text-destructive">{errors["name.fr"]}</p>
                    )}
                    {errors.name && !errors["name.fr"] && (
                      <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t("admin.catalogue.produit_form.label_specs")}</Label>
                    <Input
                      value={v.specLine.fr}
                      onChange={(e) =>
                        updateField("specLine", { ...v.specLine, fr: e.target.value })
                      }
                      placeholder="Intel i7 · 16GB · 1TB SSD"
                    />
                    {errors["specLine.fr"] && (
                      <p className="mt-1 text-xs text-destructive">{errors["specLine.fr"]}</p>
                    )}
                    {errors.specLine && !errors["specLine.fr"] && (
                      <p className="mt-1 text-xs text-destructive">{errors.specLine}</p>
                    )}
                  </div>
                  <SpecsGrid
                    values={{
                      cpu: v.cpu,
                      ram: v.ram,
                      storage: v.storage,
                      gpu: v.gpu,
                      screen: v.screen,
                      os: v.os,
                    }}
                    lang="fr"
                    onChange={(k, map) =>
                      updateField(k as keyof FormValues, map as FormValues[typeof k])
                    }
                  />
                </TabsContent>

                {/* Onglet EN — facultatif */}
                <TabsContent value="en" className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground">
                    {t("admin.catalogue.produit_form.traductions_facultatives")}
                  </p>
                  <div>
                    <Label>{t("admin.catalogue.produit_form.label_nom_en")}</Label>
                    <Input
                      dir="ltr"
                      value={v.name.en ?? ""}
                      onChange={(e) => updateField("name", { ...v.name, en: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("admin.catalogue.produit_form.label_specs_en")}</Label>
                    <Input
                      dir="ltr"
                      value={v.specLine.en ?? ""}
                      onChange={(e) =>
                        updateField("specLine", { ...v.specLine, en: e.target.value })
                      }
                    />
                  </div>
                  <SpecsGrid
                    values={{
                      cpu: v.cpu,
                      ram: v.ram,
                      storage: v.storage,
                      gpu: v.gpu,
                      screen: v.screen,
                      os: v.os,
                    }}
                    lang="en"
                    onChange={(k, map) =>
                      updateField(k as keyof FormValues, map as FormValues[typeof k])
                    }
                  />
                </TabsContent>

                {/* Onglet AR — facultatif */}
                <TabsContent value="ar" className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground">
                    {t("admin.catalogue.produit_form.traductions_facultatives")}
                  </p>
                  <div>
                    <Label className="block text-end">
                      {t("admin.catalogue.produit_form.label_nom_ar")}
                    </Label>
                    <Input
                      dir="rtl"
                      className="text-end"
                      value={v.name.ar ?? ""}
                      onChange={(e) => updateField("name", { ...v.name, ar: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="block text-end">
                      {t("admin.catalogue.produit_form.label_specs_ar")}
                    </Label>
                    <Input
                      dir="rtl"
                      className="text-end"
                      value={v.specLine.ar ?? ""}
                      onChange={(e) =>
                        updateField("specLine", { ...v.specLine, ar: e.target.value })
                      }
                    />
                  </div>
                  <SpecsGrid
                    values={{
                      cpu: v.cpu,
                      ram: v.ram,
                      storage: v.storage,
                      gpu: v.gpu,
                      screen: v.screen,
                      os: v.os,
                    }}
                    lang="ar"
                    onChange={(k, map) =>
                      updateField(k as keyof FormValues, map as FormValues[typeof k])
                    }
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.catalogue.produit_form.section_prix_stock")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>{t("admin.catalogue.produit_form.label_prix")}</Label>
                  <Input
                    type="number"
                    value={v.price}
                    onChange={(e) => updateField("price", Number(e.target.value))}
                  />
                  {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
                </div>
                <div>
                  <Label>{t("admin.catalogue.produit_form.label_ancien_prix")}</Label>
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
                  {errors.oldPrice && (
                    <p className="mt-1 text-xs text-destructive">{errors.oldPrice}</p>
                  )}
                </div>
                <div>
                  <Label>{t("admin.catalogue.produit_form.label_quantite")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.stockQty ?? 0}
                    onChange={(e) => updateField("stockQty", Number(e.target.value))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("admin.catalogue.produit_form.hint_quantite")}
                  </p>
                </div>
                <div>
                  <Label>{t("admin.catalogue.produit_form.label_etat_stock")}</Label>
                  <Select
                    value={v.stock}
                    onValueChange={(x) => updateField("stock", x as "in" | "low" | "out")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">{t(STOCK_LABEL_KEY["in"])}</SelectItem>
                      <SelectItem value="low">{t(STOCK_LABEL_KEY["low"])}</SelectItem>
                      <SelectItem value="out">{t(STOCK_LABEL_KEY["out"])}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="bs" className="mb-0">
                    {t("admin.catalogue.produit_form.label_bestseller")}
                  </Label>
                  <Switch
                    id="bs"
                    checked={!!v.bestSeller}
                    onCheckedChange={(x) => updateField("bestSeller", x)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-2">
                  <Label htmlFor="sale" className="mb-0">
                    {t("admin.catalogue.produit_form.label_promotion")}
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
                <CardTitle>{t("admin.catalogue.produit_form.section_image")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mediaAssets.length > 0 && (
                  <div>
                    <Label>{t("admin.catalogue.produit_form.label_depuis_mediatheque")}</Label>
                    <Select value="" onValueChange={(src) => updateField("image", src)}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("admin.catalogue.produit_form.placeholder_choisir_media")}
                        />
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
                <Label>{t("admin.catalogue.produit_form.label_url_image")}</Label>
                <Input
                  value={v.image}
                  onChange={(e) => updateField("image", e.target.value)}
                  placeholder={t("admin.catalogue.produit_form.placeholder_url_image")}
                />
                {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
                {v.image && (
                  <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                    <ImageCatalogue src={v.image} alt="" className="h-full w-full object-cover" />
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
              {t("admin.catalogue.produit_form.annuler")}
            </Button>
          </Link>
          {can(mutateKey) ? (
            <Button type="submit" disabled={saving}>
              {saving
                ? t("admin.catalogue.produit_form.enregistrement")
                : mode === "new"
                  ? t("admin.catalogue.produit_form.creer")
                  : t("admin.catalogue.produit_form.enregistrer")}
            </Button>
          ) : (
            <span title={denyReason(mutateKey)} className="inline-flex">
              <Button type="submit" disabled>
                {mode === "new"
                  ? t("admin.catalogue.produit_form.creer")
                  : t("admin.catalogue.produit_form.enregistrer")}
              </Button>
            </span>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("admin.catalogue.produit_form.supprimer_titre")}
        description={
          existing
            ? t("admin.catalogue.produit_form.supprimer_description", { nom: existingName })
            : null
        }
        confirmLabel={
          deleting
            ? t("admin.catalogue.produit_form.suppression")
            : t("admin.catalogue.produit_form.supprimer")
        }
        destructive
        onConfirm={doDelete}
      />
    </AdminPageShell>
  );
}

// ---------------------------------------------------------------------------
// SpecsGrid — grille des specs pour un onglet de langue donné
// ---------------------------------------------------------------------------

type SpecEntry = { fr: string; en?: string; ar?: string } | undefined;

type SpecsMap = {
  cpu: SpecEntry;
  ram: SpecEntry;
  storage: SpecEntry;
  gpu: SpecEntry;
  screen: SpecEntry;
  os: SpecEntry;
};

function SpecsGrid({
  values,
  lang,
  onChange,
}: {
  values: SpecsMap;
  lang: LangCode;
  onChange: (key: keyof SpecsMap, map: Record<LangCode, string>) => void;
}) {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  function field(label: string, key: keyof SpecsMap) {
    const map = toMap(values[key]);
    return (
      <div key={key}>
        <Label className={cn(isAr && "block text-end")}>{label}</Label>
        <Input
          dir={dir}
          className={cn(isAr && "text-end")}
          value={map[lang]}
          onChange={(e) => onChange(key, { ...map, [lang]: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field("CPU", "cpu")}
      {field("RAM", "ram")}
      {field("Stockage", "storage")}
      {field("GPU", "gpu")}
      {field("Écran", "screen")}
      {field("OS", "os")}
    </div>
  );
}
