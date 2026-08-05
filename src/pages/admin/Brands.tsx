import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag, Pencil } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useAdminState } from "@/lib/admin-store";

export default function AdminBrands() {
  const { brands, products } = useAdminState();
  const rows = useMemo(() => {
    return brands
      .map((b) => {
        const items = products.filter((p) => p.brand === b.name);
        const total = items.reduce((s, p) => s + p.price, 0);
        return {
          ...b,
          count: items.length,
          avg: items.length ? Math.round(total / items.length) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [brands, products]);

  return (
    <AdminPageShell
      title="Marques"
      description={`${brands.length} marques référencées.`}
      actions={
        <Link to="/admin/brands/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle marque
          </Button>
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((b) => (
          <Card key={b.id} className="transition hover:border-primary/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <Link to={`/admin/brands/${b.id}/view`} className="group flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary group-hover:underline">
                      {b.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.count} produit{b.count > 1 ? "s" : ""}
                      {b.country ? ` · ${b.country}` : ""}
                    </p>
                  </div>
                </Link>
                <Link to={`/admin/brands/${b.id}`}>
                  <Button variant="ghost" size="icon" title="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Prix moyen ·{" "}
                <span className="font-medium text-foreground">
                  {b.avg ? formatDZD(b.avg) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
