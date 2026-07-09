import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useStore } from "@/lib/store";
import { products } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Mon panier — KA Tech" }] }),
});

const fmt = (n: number) => n.toLocaleString("fr-FR") + " DA";

function CartPage() {
  const { cart, updateQty, removeFromCart } = useStore();
  const lines = cart
    .map((c) => {
      const p = products.find((x) => x.id === c.product_id);
      return p ? { ...c, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const total = lines.reduce((a, l) => a + l.product.price * l.quantity, 0);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Mon panier</h1>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Votre panier est vide.</p>
          <Link to="/category" className="text-primary hover:underline">Découvrir les produits</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {lines.map((l) => (
              <Card key={l.product_id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <img src={l.product.image} alt={l.product.name} className="h-20 w-20 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.product.name}</p>
                    <p className="text-xs text-muted-foreground">{l.product.specLine}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{fmt(l.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => updateQty(l.product_id, l.quantity - 1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{l.quantity}</span>
                    <Button size="icon" variant="outline" onClick={() => updateQty(l.product_id, l.quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeFromCart(l.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="h-fit">
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span>Calculée à l'étape suivante</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="text-primary">{fmt(total)}</span>
              </div>
              <Link to="/checkout">
                <Button className="w-full">Passer commande</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
