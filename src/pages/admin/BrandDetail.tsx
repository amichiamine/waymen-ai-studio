import { Link, useParams } from "react-router-dom";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, Pencil, Plus, Tag } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useBrandDetail, useProductList, useCategoryList } from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useLocalize } from "@/lib/i18n";

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default",
  low: "secondary",
  out: "destructive",
};
const STOCK_LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };

export default function AdminBrandDetail() {
  const { id } = useParams();
  const { data: brand, loading, error } = useBrandDetail(id);
  const { data: products } = useProductList();
  const { data: categories } = useCategoryList();
  const { can, denyReason } = usePermissions();
  const L = useLocalize();

  if (loading) {
    return (
      <AdminPageShell
        title="Marque"
        actions={
          <Link to="/admin/brands">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-busy="true">
          <div className="h-64 animate-pulse rounded-lg border bg-muted" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg border bg-muted" />
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell
        title="Marque"
        actions={
          <Link to="/admin/brands">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
        }
      >
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      </AdminPageShell>
    );
  }

  if (!brand) {
    return (
      <AdminPageShell
        title="Marque introuvable"
        actions={
          <Link to="/admin/brands">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
        }
      >
        <AdminEmptyState label={`Aucune marque « ${id} »`} />
      </AdminPageShell>
    );
  }

  const items = products.filter((p) => p.brand === brand.name);
  const total = items.reduce((s, p) => s + p.price, 0);
  const avg = items.length ? Math.round(total / items.length) : 0;
  const catsUsed = Array.from(new Set(items.map((p) => p.category)));

  return (
    <AdminPageShell
      title={brand.name}
      description={brand.description ?? `Marque ${brand.name}`}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/brands">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          {/* Niveau 1+3 : bouton Modifier (action update sur la marque). */}
          {can("update") ? (
            <Link to={`/admin/brands/${brand.id}`}>
              <Button>
                <Pencil className="me-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>
          ) : (
            <span title={denyReason("update")} className="inline-flex">
              <Button disabled>
                <Pencil className="me-2 h-4 w-4" />
                Modifier
              </Button>
            </span>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">{brand.name}</p>
                <p className="text-xs text-muted-foreground">
                  {brand.country ?? "Origine inconnue"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Produits</p>
                <p className="text-lg font-bold">{items.length}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">Prix moyen</p>
                <p className="text-lg font-bold">{avg ? formatDZD(avg) : "—"}</p>
              </div>
            </div>
            {brand.description && (
              <p className="text-sm text-muted-foreground">{brand.description}</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catégories couvertes ({catsUsed.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {catsUsed.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                catsUsed.map((slug) => {
                  const c = categories.find((x) => x.slug === slug);
                  const label = c?.label ?? slug;
                  return (
                    <Link key={slug} to={`/admin/categories/${slug}/view`}>
                      <Badge variant="outline" className="hover:border-primary">
                        {label}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Produits ({items.length})</CardTitle>
              {/* Niveau 1+3 : raccourci Nouveau produit (action create sur produit). */}
              {can("create") ? (
                <Link to="/admin/products/new">
                  <Button size="sm" variant="outline">
                    <Plus className="me-2 h-4 w-4" />
                    Nouveau produit
                  </Button>
                </Link>
              ) : (
                <span title={denyReason("create")} className="inline-flex">
                  <Button size="sm" variant="outline" disabled>
                    <Plus className="me-2 h-4 w-4" />
                    Nouveau produit
                  </Button>
                </span>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun produit référencé pour cette marque.
                </p>
              ) : (
                <ul className="divide-y">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <img
                        src={p.image}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/products/${p.id}/view`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {L(p.name) ?? ""}
                        </Link>
                        <p className="text-xs text-muted-foreground">{L(p.specLine) ?? ""}</p>
                      </div>
                      <Badge variant={STOCK_VARIANT[p.stock]}>{STOCK_LABEL[p.stock]}</Badge>
                      <span className="w-24 text-end font-medium">{formatDZD(p.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
