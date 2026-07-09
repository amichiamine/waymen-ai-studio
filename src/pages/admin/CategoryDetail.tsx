import { Link, useParams } from "react-router-dom";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useAdminState } from "@/lib/admin-store";

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = { in: "default", low: "secondary", out: "destructive" };
const STOCK_LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };

export default function AdminCategoryDetail() {
  const { slug } = useParams();
  const { categories, products, brands } = useAdminState();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return (
      <AdminPageShell
        title="Catégorie introuvable"
        actions={<Link to="/admin/categories"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>}
      >
        <AdminEmptyState label={`Aucune catégorie « ${slug} »`} />
      </AdminPageShell>
    );
  }

  const items = products.filter((p) => p.category === category.slug);
  const total = items.reduce((s, p) => s + p.price, 0);
  const avg = items.length ? Math.round(total / items.length) : 0;
  const brandsUsed = Array.from(new Set(items.map((p) => p.brand)));

  return (
    <AdminPageShell
      title={category.label}
      description={category.description}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/categories"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
          <Link to={`/admin/categories/${category.slug}`}><Button><Pencil className="mr-2 h-4 w-4" />Modifier</Button></Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          {category.cover ? (
            <div className="aspect-[16/10] bg-muted"><img src={category.cover} alt="" className="h-full w-full object-cover" /></div>
          ) : (
            <div className="aspect-[16/10] flex items-center justify-center bg-muted text-xs text-muted-foreground">Pas d'image</div>
          )}
          <CardContent className="p-5 text-sm">
            <p className="font-mono text-xs text-muted-foreground">/{category.slug}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Produits</p><p className="text-lg font-bold">{items.length}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Prix moyen</p><p className="text-lg font-bold">{avg ? formatDZD(avg) : "—"}</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Marques présentes ({brandsUsed.length})</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {brandsUsed.length === 0 ? <span className="text-sm text-muted-foreground">—</span> : brandsUsed.map((name) => {
                const b = brands.find((x) => x.name === name);
                return b
                  ? <Link key={name} to={`/admin/brands/${b.id}/view`}><Badge variant="outline" className="hover:border-primary">{name}</Badge></Link>
                  : <Badge key={name} variant="outline">{name}</Badge>;
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
                <p className="text-sm text-muted-foreground">Aucun produit dans cette catégorie.</p>
              ) : (
                <ul className="divide-y">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <img src={p.image} alt="" className="h-12 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/admin/products/${p.id}/view`} className="font-medium hover:text-primary hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted-foreground">{p.brand} · {p.specLine}</p>
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
