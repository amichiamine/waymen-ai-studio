import { useMemo, useState } from "react";
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
const STOCK_LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };

// Page pilote du motif de permissions — voir `docs/PERMISSIONS.md` §3.
// Les 34 autres écrans admin sont calqués sur celle-ci : toute correction
// apportée ici doit être reportée dans la recette de réplication.
export default function AdminProducts() {
  const { data: products, loading, error } = useProductList();
  const { data: categories } = useCategoryList();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const { remove } = useProductMutations();
  const { lang } = useI18n();
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

  // Niveau 2 — la vérification vit DANS l'action, pas seulement dans le
  // rendu : le masquage d'un bouton n'est pas une protection (route
  // directe, état obsolète, rôle changé pendant que la boîte est ouverte).
  const confirmDelete = async () => {
    if (!toDelete) return;
    if (!guard("delete", "Supprimer le produit")) return;
    setDeleting(true);
    try {
      await remove(toDelete.id);
      toast.success(`« ${toDelete.name} » supprimé`);
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
      <AdminPageShell title="Produits" description="Chargement…">
        <div className="overflow-hidden rounded-lg border" aria-busy="true">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px]"></TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-end">Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-[140px] text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
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
      title="Produits"
      description={
        customCount > 0
          ? `${products.length - customCount} produits dans le catalogue local, ${customCount} configuration${customCount > 1 ? "s" : ""} client (hors boutique).`
          : `${products.length} produits dans le catalogue local.`
      }
      actions={
        // Niveau 1 — affichage. Niveau 3 — un bouton désactivé dit pourquoi :
        // l'infobulle est portée par le <span>, car un bouton `disabled` a
        // `pointer-events-none` et n'affiche jamais son propre `title`.
        can("create") ? (
          <Link to="/admin/products/new">
            <Button>
              <Plus className="me-2 h-4 w-4" /> Nouveau produit
            </Button>
          </Link>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> Nouveau produit
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
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, marque, id)…"
            className="ps-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as "all" | Category)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
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
          <TableHeader>
            <TableRow>
              <TableHead className="w-[64px]"></TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-end">Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-[140px] text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link to={`/admin/products/${p.id}/view`}>
                    <img
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
                      Config. client
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {L(p.specLine) ?? ""}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.brand}</TableCell>
                <TableCell className="text-sm capitalize">{p.category}</TableCell>
                <TableCell className="text-end font-medium">{formatDZD(p.price)}</TableCell>
                <TableCell>
                  <Badge variant={STOCK_VARIANT[p.stock]}>{STOCK_LABEL[p.stock]}</Badge>
                </TableCell>
                <TableCell className="text-end">
                  <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" title="Voir la fiche publique">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {can("update") ? (
                    <Link to={`/admin/products/${p.id}`}>
                      <Button variant="ghost" size="icon" title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <span title={denyReason("update")} className="inline-flex">
                      <Button variant="ghost" size="icon" disabled aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </span>
                  )}
                  <span
                    title={denyReason("delete") ?? "Supprimer"}
                    className="inline-flex align-middle"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer"
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
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  Aucun produit ne correspond aux filtres.
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
        title="Supprimer ce produit ?"
        description={
          toDelete ? (
            <>
              Le produit « <strong>{toDelete.name}</strong> » sera supprimé du catalogue local.
              Cette action est irréversible.
            </>
          ) : null
        }
        confirmLabel={deleting ? "Suppression…" : "Supprimer"}
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}
