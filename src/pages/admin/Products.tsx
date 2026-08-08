import { useMemo, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDZD, isCustomBuild, type Category } from "@/data/products";
import { useProductList, useProductMutations, useCategoryList, toApiError } from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useLocalize, localize, type Localized } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";

/** Toutes les variantes d'un champ localisé, en minuscules — base de recherche. */
const haystack = (v: Localized<string> | undefined): string =>
  (typeof v === "object" && v !== null ? [v.fr, v.en, v.ar] : [v])
    .filter((s): s is string => typeof s === "string")
    .join(" ")
    .toLowerCase();

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default",
  low: "secondary",
  out: "destructive",
};

/**
 * `in` / `low` / `out` sont des valeurs de DONNÉES : elles ne se traduisent
 * jamais. Seul leur libellé d'affichage le fait, via cette table de clés.
 * Motif à recopier pour tout statut (commande, avis, paiement…).
 */
const STOCK_LABEL_KEY: Record<string, string> = {
  in: "admin.socle.produits.stock_in",
  low: "admin.socle.produits.stock_low",
  out: "admin.socle.produits.stock_out",
};

// Page pilote du motif de permissions — voir `docs/PERMISSIONS.md` §3 — ET du
// motif de traduction du back-office — voir `src/lib/i18n/admin/index.ts`.
// Les 34 autres écrans admin sont calqués sur celle-ci : toute correction
// apportée ici doit être reportée dans la recette de réplication.
//
// Ce qu'il faut en retenir côté i18n :
//   1. AUCUNE chaîne visible en dur : titres, colonnes, placeholder, title,
//      aria-label, états vides, statuts, toasts, confirmation.
//   2. `t()` est la seule API — la page ignore qu'un dictionnaire `admin` est
//      chargé à la demande par `AdminShell`.
//   3. Une clé = une phrase complète ; les valeurs passent par `{nom}` / `{n}`.
//   4. Pluriels : `t("…description", { n })` choisit `_un` / `_autre` et formate
//      le nombre selon la langue.
//   5. Alignement en propriétés logiques (`text-end`, `ms-*`, `ps-*`) pour que
//      l'arabe se retourne sans retouche.
export default function AdminProducts() {
  const { data: products, loading, error } = useProductList();
  const { data: categories } = useCategoryList();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const { remove } = useProductMutations();
  const { lang, t } = useI18n();
  const L = useLocalize();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | Category>("all");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!needle) return true;
      // Recherche dans toutes les variantes linguistiques — recette LOCALIZED-DATA §4.
      return (
        haystack(p.name).includes(needle) ||
        p.brand.toLowerCase().includes(needle) ||
        p.id.toLowerCase().includes(needle)
      );
    });
  }, [q, cat, products]);

  // Nombre de configurations client présentes dans la liste : elles gonflent le
  // total sans être des articles vendus, autant l'annoncer explicitement.
  const customCount = useMemo(() => products.filter(isCustomBuild).length, [products]);

  // Deux phrases complètes, chacune avec son propre pluriel, plutôt qu'une
  // phrase assemblée par concaténation de fragments : c'est la règle §5 de la
  // convention, et la seule façon de rester juste en arabe.
  const catalogueCount = products.length - customCount;
  const description =
    customCount > 0
      ? `${t("admin.socle.produits.description", { n: catalogueCount })} ${t(
          "admin.socle.produits.configs",
          { n: customCount },
        )}`
      : t("admin.socle.produits.description", { n: products.length });

  // En-têtes du tableau : une seule source pour le squelette et le contenu, afin
  // qu'ils ne divergent jamais. `align` porte des propriétés LOGIQUES.
  const COLONNES: { key: string; align?: "end"; width?: string; masque?: boolean }[] = [
    { key: "admin.socle.produits.col_image", width: "w-[64px]", masque: true },
    { key: "admin.socle.produits.col_produit" },
    { key: "admin.socle.produits.col_marque" },
    { key: "admin.socle.produits.col_categorie" },
    { key: "admin.socle.produits.col_prix", align: "end" },
    { key: "admin.socle.produits.col_stock" },
    { key: "admin.socle.commun.actions", align: "end", width: "w-[140px]" },
  ];

  // `text-start` est passé EXPLICITEMENT : `ui/table.tsx` code un `text-left`
  // en dur dans `TableHead`, que `cn`/tailwind-merge remplace seulement si la
  // classe logique est fournie. Sans ça, les en-têtes restent collés à gauche en
  // arabe alors que le tableau se lit de droite à gauche. À recopier tel quel
  // sur les 33 autres écrans (le composant partagé n'est pas du périmètre i18n).
  const enTetes = (
    <TableHeader>
      <TableRow>
        {COLONNES.map((c) => (
          <TableHead
            key={c.key}
            className={[c.width, c.align === "end" ? "text-end" : "text-start"]
              .filter(Boolean)
              .join(" ")}
          >
            {/* La colonne des vignettes n'affiche pas son libellé, mais le donne
                aux lecteurs d'écran : une colonne anonyme n'est pas navigable. */}
            {c.masque ? <span className="sr-only">{t(c.key)}</span> : t(c.key)}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );

  // Niveau 2 — la vérification vit DANS l'action, pas seulement dans le
  // rendu : le masquage d'un bouton n'est pas une protection (route
  // directe, état obsolète, rôle changé pendant que la boîte est ouverte).
  const confirmDelete = async () => {
    if (!toDelete) return;
    // Le libellé d'action passé à `guard()` est traduit : il apparaît dans le
    // message de refus. (Le reste de ce message vient de `admin-auth.tsx`, hors
    // périmètre de cette phase.)
    if (!guard("delete", t("admin.socle.produits.garde_supprimer"))) return;
    setDeleting(true);
    try {
      await remove(toDelete.id);
      toast.success(t("admin.socle.produits.toast_supprime", { nom: toDelete.name }));
      setToDelete(null);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Squelette de tableau — même structure que le contenu final.
  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.socle.produits.titre")}
        description={t("admin.socle.commun.chargement")}
      >
        <div className="overflow-hidden rounded-lg border" aria-busy="true">
          <Table>
            {enTetes}
            <TableBody>
              {Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ms-auto h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ms-auto h-8 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.socle.produits.titre")}
      description={description}
      actions={
        // Niveau 1 — affichage. Niveau 3 — un bouton désactivé dit pourquoi :
        // l'infobulle est portée par le <span>, car un bouton `disabled` a
        // `pointer-events-none` et n'affiche jamais son propre `title`.
        can("create") ? (
          <Link to="/admin/products/new">
            <Button>
              <Plus className="me-2 h-4 w-4" /> {t("admin.socle.produits.nouveau")}
            </Button>
          </Link>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.socle.produits.nouveau")}
            </Button>
          </span>
        )
      }
    >
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          {/* `start-3` et `ps-9` : l'icône passe à droite du champ en arabe
              sans une ligne de code supplémentaire. */}
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin.socle.produits.recherche_placeholder")}
            aria-label={t("admin.socle.commun.rechercher")}
            className="ps-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as "all" | Category)}>
          <SelectTrigger className="w-[200px]" aria-label={t("admin.socle.produits.col_categorie")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* `all` est une valeur technique du filtre ; son libellé, lui, est traduit. */}
            <SelectItem value="all">{t("admin.socle.produits.toutes_categories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          {enTetes}
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link to={`/admin/products/${p.id}/view`}>
                    <ImageCatalogue
                      src={p.image}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 rounded object-cover"
                    />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/admin/products/${p.id}/view`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {L(p.name) ?? ""}
                  </Link>
                  {/* Les configurations composées dans /builder restent
                      visibles ici — l'administrateur doit savoir ce que ses
                      clients assemblent — mais ne sont pas des articles du
                      catalogue : le badge évite la confusion. */}
                  {isCustomBuild(p) && (
                    <Badge variant="outline" className="ms-2 align-middle">
                      {t("admin.socle.produits.badge_config")}
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {L(p.specLine) ?? ""}
                  </div>
                </TableCell>
                {/* Nom de marque : donnée, jamais traduite (§4 de la convention). */}
                <TableCell className="text-sm">{p.brand}</TableCell>
                {/* Le libellé de catégorie est une DONNÉE éditable dans l'admin
                    (table `categories`), pas une chaîne d'interface : il n'entre
                    pas dans un dictionnaire. Repli sur le slug technique. */}
                <TableCell className="text-sm">
                  {categories.find((c) => c.slug === p.category)?.label ?? p.category}
                </TableCell>
                <TableCell className="text-end font-medium">{formatDZD(p.price)}</TableCell>
                <TableCell>
                  <Badge variant={STOCK_VARIANT[p.stock]}>{t(STOCK_LABEL_KEY[p.stock])}</Badge>
                </TableCell>
                <TableCell className="text-end">
                  <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("admin.socle.produits.voir_public")}
                      aria-label={t("admin.socle.produits.voir_public")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {can("update") ? (
                    <Link to={`/admin/products/${p.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("admin.socle.commun.modifier")}
                        aria-label={t("admin.socle.commun.modifier")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <span title={denyReason("update")} className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        aria-label={t("admin.socle.commun.modifier")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </span>
                  )}
                  <span
                    title={denyReason("delete") ?? t("admin.socle.commun.supprimer")}
                    className="inline-flex align-middle"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("admin.socle.commun.supprimer")}
                      disabled={!can("delete")}
                      onClick={() => setToDelete({ id: p.id, name: localize(p.name, lang) ?? "" })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={COLONNES.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {t("admin.socle.produits.vide_aucun_resultat")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title={t("admin.socle.produits.supprimer_titre")}
        // Une seule clé pour toute la phrase, le nom du produit interpolé :
        // découper autour d'un <strong> casserait l'ordre des mots en arabe.
        description={
          toDelete ? t("admin.socle.produits.supprimer_description", { nom: toDelete.name }) : null
        }
        confirmLabel={
          deleting
            ? t("admin.socle.produits.suppression_en_cours")
            : t("admin.socle.commun.supprimer")
        }
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}
