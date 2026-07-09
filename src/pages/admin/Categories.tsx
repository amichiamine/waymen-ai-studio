import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { products, categoryMeta, type Category } from "@/data/products";

const CAT_LABELS: Record<Category, string> = {
  laptops: "Ordinateurs portables",
  desktops: "Ordinateurs de bureau",
  builds: "Configurations PC",
  phones: "Smartphones",
};

const CAT_DESC: Record<Category, string> = {
  laptops: "Laptops pour le travail, les études et le gaming.",
  desktops: "Tours et mini-PC de bureau.",
  builds: "Configurations sur-mesure KA Build.",
  phones: "Smartphones Android et iOS.",
};

export default function AdminCategories() {
  const cats = useMemo(
    () =>
      (Object.keys(categoryMeta) as Category[]).map((slug) => {
        const items = products.filter((p) => p.category === slug);
        const cover = items[0]?.image;
        const value = items.reduce((s, p) => s + p.price, 0);
        return { slug, count: items.length, cover, value };
      }),
    [],
  );

  return (
    <AdminPageShell
      title="Catégories"
      description={`${cats.length} catégories · ${products.length} produits rattachés.`}
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouvelle catégorie</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c) => (
          <Card key={c.slug} className="overflow-hidden transition hover:border-primary/50 hover:shadow-sm">
            <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
              {c.cover ? (
                <img src={c.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Pas d'image
                </div>
              )}
            </div>
            <CardContent className="space-y-3 p-5">
              <div>
                <h3 className="text-base font-semibold">{CAT_LABELS[c.slug]}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{CAT_DESC[c.slug]}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{c.count} produits</span>
                <Link to={`/admin/products`} className="flex items-center gap-1 text-primary hover:underline">
                  Gérer <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
