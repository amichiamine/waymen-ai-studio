import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useAdminState, type OrderStatus } from "@/lib/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogOut, User, Package } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("fr-FR") + " DA";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "En attente", processing: "En traitement", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};
const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", processing: "outline", shipped: "outline", delivered: "default", cancelled: "destructive",
};

export default function Account() {
  useEffect(() => { document.title = `Mon compte — KA Tech`; }, []);
  const { user, signOut } = useAuth();
  const { orders } = useAdminState();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");

  const myOrders = orders
    .filter((o) => (user?.email && o.customerEmail?.toLowerCase() === user.email.toLowerCase()) || o.customerId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profil enregistré localement");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mon compte</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="orders">Mes commandes ({myOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Enregistrer</Button>
                  <Button type="button" variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {myOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                Aucune commande pour le moment.
                <div className="mt-3">
                  <Link to="/category" className="text-primary hover:underline">Découvrir les produits</Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myOrders.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold">{o.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleString("fr-FR")} · {o.items.length} article{o.items.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{fmt(o.total)}</span>
                        <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.items.slice(0, 4).map((it, i) => (
                        it.image && <img key={i} src={it.image} alt="" className="h-10 w-10 rounded object-cover" />
                      ))}
                    </div>
                    {/* Timeline mini */}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {(o.statusHistory ?? []).map((ev, i) => (
                        <span key={i}>{STATUS_LABEL[ev.status]} · {new Date(ev.at).toLocaleDateString("fr-FR")}</span>
                      )).reduce<React.ReactNode[]>((acc, cur, i) => i === 0 ? [cur] : [...acc, " → ", cur], [])}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
