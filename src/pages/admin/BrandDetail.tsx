import { Link, useParams } from "react-router-dom";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Plus, Tag } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useAdminState } from "@/lib/admin-store";

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = { in: "default", low: "secondary", out: "destructive" };
const STOCK_LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };

export default function AdminBrandDetail() {
  const { id } = useParams();
  const { brands, products, categories } = useAdminState();
  const brand = brands.find((b) => b.id === id);

  if (!brand) {
    return (
      <AdminPageShell
        title="Marque introuvable"
        actions={<Link to="/admin/brands"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>}
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
          <Link to="/admin/brands"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
          <Link to={`/admin/brands/${brand.id}`}><Button><Pencil className="mr-2 h-4 w-4" />Modifier</Button></Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary"><Tag className="h-6 w-6" /></div>
              <div>
                <p className="text-lg font-semibold">{brand.name}</p>
                <p className="text-xs text-muted-foreground">{brand.country ?? "Origine inconnue"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Produits</p><p className="text-lg font-bold">{items.length}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Prix moyen</p><p className="text-lg font-bold">{avg ? formatDZD(avg) : "—"}</p></div>
            </div>
            {brand.description && <p className="text-sm text-muted-foreground">{brand.description}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Catégories couvertes ({catsUsed.length})</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {catsUsed.length === 0 ? <span className="text-sm text-muted-foreground">—</span> : catsUsed.map((slug) => {
                const c = categories.find((x) => x.slug === slug);
                const label = c?.label ?? slug;
                return <Link key={slug} to={`/admin/categories/${slug}/view`}><Badge variant="outline" className="hover:border-primary">{label}</Badge></Link>;
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Produits ({items.length})</CardTitle>
              <Link to="/admin/products/new"><Button size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />Nouveau produit</Button></Link>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun produit référencé pour cette marque.</p>
              ) : (
                <ul className="divide-y">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <img src={p.image} alt="" className="h-12 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/admin/products/${p.id}/view`} className="font-medium hover:text-primary hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted-foreground">{p.specLine}</p>
                      </div>
                      <Badge variant={STOCK_VARIANT[p.stock]}>{STOCK_LABEL[p.stock]}</Badge>
                      <span className="w-24 text-right font-medium">{formatDZD(p.price)}</span>
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
