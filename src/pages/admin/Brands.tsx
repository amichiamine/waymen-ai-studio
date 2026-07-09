import { useMemo } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";
import { products, formatDZD } from "@/data/products";

export default function AdminBrands() {
  const brands = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const p of products) {
      const cur = map.get(p.brand) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += p.price;
      map.set(p.brand, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, avg: Math.round(v.total / v.count) }))
      .sort((a, b) => b.count - a.count);
  }, []);

  return (
    <AdminPageShell
      title="Marques"
      description={`${brands.length} marques référencées.`}
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouvelle marque</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {brands.map((b) => (
          <Card key={b.name} className="transition hover:border-primary/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.count} produit{b.count > 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Prix moyen · <span className="font-medium text-foreground">{formatDZD(b.avg)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
