import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Pencil } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";

export default function AdminCategories() {
  const { categories, products } = useAdminState();
  const rows = useMemo(
    () => categories.map((c) => {
      const items = products.filter((p) => p.category === c.slug);
      return { ...c, count: items.length, cover: c.cover ?? items[0]?.image };
    }),
    [categories, products],
  );

  return (
    <AdminPageShell
      title="Catégories"
      description={`${categories.length} catégories · ${products.length} produits rattachés.`}
      actions={<Link to="/admin/categories/new"><Button><Plus className="mr-2 h-4 w-4" /> Nouvelle catégorie</Button></Link>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((c) => (
          <Card key={c.slug} className="overflow-hidden transition hover:border-primary/50 hover:shadow-sm">
            <Link to={`/admin/categories/${c.slug}/view`} className="block aspect-[16/10] w-full overflow-hidden bg-muted">
              {c.cover ? <img src={c.cover} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Pas d'image</div>
              )}
            </Link>
            <CardContent className="space-y-3 p-5">
              <div>
                <Link to={`/admin/categories/${c.slug}/view`} className="text-base font-semibold hover:text-primary hover:underline">
                  {c.label}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{c.count} produits</span>
                <div className="flex gap-1">
                  <Link to={`/admin/categories/${c.slug}`}>
                    <Button variant="ghost" size="icon" title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  </Link>
                  <Link to={`/admin/categories/${c.slug}/view`} className="flex items-center gap-1 text-primary hover:underline text-xs">
                    Détails <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rows.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune catégorie.</p>
        )}
      </div>
    </AdminPageShell>
  );
}
