import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { products } from "@/data/products";
import { WILAYAS } from "@/data/wilayas";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const fmt = (n: number) => n.toLocaleString("fr-FR") + " DA";

export default function Checkout() {
  useEffect(() => { document.title = `Commande — KA Tech`; }, []);
  const { user } = useAuth();
  const { cart, clearCart } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");
  const [wilaya, setWilaya] = useState("");
  const [address, setAddress] = useState("");
  const [delivery, setDelivery] = useState<"home" | "desk">("home");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const lines = cart
    .map((c) => {
      const p = products.find((x) => x.id === c.product_id);
      return p ? { ...c, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const subtotal = lines.reduce((a, l) => a + l.product.price * l.quantity, 0);
  const shipping = delivery === "home" ? 800 : 400;
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // Frontend-only : pas d'appel backend. On enregistre localement et on redirige.
    await clearCart();
    navigate({ to: "/checkout/success" });
  };

  if (lines.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Votre panier est vide.</p>
        <Link to="/category" className="mt-4 inline-block text-primary hover:underline">Voir les produits</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Finaliser ma commande</h1>
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Wilaya</Label>
                <Select value={wilaya} onValueChange={setWilaya}>
                  <SelectTrigger><SelectValue placeholder="Choisir une wilaya" /></SelectTrigger>
                  <SelectContent>
                    {WILAYAS.map((w) => (
                      <SelectItem key={w.code} value={w.code}>{w.code} — {w.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Textarea id="address" required value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Livraison</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={delivery} onValueChange={(v) => setDelivery(v as "home" | "desk")}>
                <label className="flex cursor-pointer items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="home" id="d-home" />
                    <span>Livraison à domicile</span>
                  </div>
                  <span className="text-sm text-muted-foreground">800 DA</span>
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="desk" id="d-desk" />
                    <span>Retrait au bureau Yalidine</span>
                  </div>
                  <span className="text-sm text-muted-foreground">400 DA</span>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes (optionnel)</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instructions pour le livreur, précisions…" />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Récapitulatif</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l) => (
              <div key={l.product_id} className="flex items-center gap-3 text-sm">
                <img src={l.product.image} alt="" className="h-12 w-12 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">× {l.quantity}</p>
                </div>
                <span className="whitespace-nowrap">{fmt(l.product.price * l.quantity)}</span>
              </div>
            ))}
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span>{fmt(shipping)}</span></div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span className="text-primary">{fmt(total)}</span></div>
            </div>
            <Button type="submit" className="w-full" disabled={busy || !wilaya}>
              {busy ? "Traitement…" : "Confirmer la commande"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
