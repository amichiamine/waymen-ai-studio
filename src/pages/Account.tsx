import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useAdminState, type OrderStatus } from "@/lib/admin-store";
import { useAddresses, newAddressId, type UserAddress } from "@/lib/addresses";
import { WILAYAS } from "@/data/wilayas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, User, Package, MapPin, Plus, Trash2, Star } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("fr-FR") + " DA";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "En attente", processing: "En traitement", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};
const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", processing: "outline", shipped: "outline", delivered: "default", cancelled: "destructive",
};

export default function Account() {
  const { user, signOut } = useAuth();
  const { orders } = useAdminState();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.user_metadata?.name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");
  const { list: addresses, upsert, remove, setDefault } = useAddresses(user?.id);
  const [editing, setEditing] = useState<UserAddress | null>(null);

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

  function startNewAddress() {
    setEditing({
      id: newAddressId(),
      label: "Domicile",
      fullName: user?.user_metadata?.name ?? "",
      phone: user?.user_metadata?.phone ?? "",
      wilaya: WILAYAS[15]?.code ?? "16",
      address: "",
      isDefault: addresses.length === 0,
    });
  }

  function saveAddress() {
    if (!editing) return;
    if (!editing.fullName.trim() || !editing.phone.trim() || !editing.address.trim()) {
      toast.error("Nom, téléphone et adresse requis"); return;
    }
    upsert(editing);
    toast.success("Adresse enregistrée");
    setEditing(null);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <Helmet>
        <title>Mon compte — KA Tech</title>
        <meta name="description" content="Gérez votre profil, vos adresses de livraison et suivez vos commandes KA Tech." />
        <link rel="canonical" href="/account" />
        <meta name="robots" content="noindex" />
      </Helmet>
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
          <TabsTrigger value="addresses">Adresses ({addresses.length})</TabsTrigger>
          <TabsTrigger value="orders">Commandes ({myOrders.length})</TabsTrigger>
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

        <TabsContent value="addresses" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={startNewAddress}><Plus className="mr-2 h-4 w-4" /> Nouvelle adresse</Button>
          </div>
          {addresses.length === 0 && !editing && (
            <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">
              <MapPin className="mx-auto mb-3 h-10 w-10 opacity-40" />
              Aucune adresse enregistrée. Ajoutez-en une pour un checkout plus rapide.
            </CardContent></Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {addresses.map((a) => (
              <Card key={a.id} className={a.isDefault ? "border-primary" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{a.label}</span>
                    {a.isDefault && <Badge variant="default"><Star className="h-3 w-3 mr-1" />Par défaut</Badge>}
                  </div>
                  <p className="text-sm">{a.fullName} · {a.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {WILAYAS.find((w) => w.code === a.wilaya)?.name_fr ?? a.wilaya} — {a.address}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Modifier</Button>
                    {!a.isDefault && <Button size="sm" variant="ghost" onClick={() => setDefault(a.id)}>Définir par défaut</Button>}
                    <Button size="sm" variant="ghost" onClick={() => { remove(a.id); toast.success("Adresse supprimée"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {editing && (
            <Card className="border-primary/60">
              <CardHeader><CardTitle className="text-base">{addresses.find((a) => a.id === editing.id) ? "Modifier l'adresse" : "Nouvelle adresse"}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div><Label>Libellé</Label><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Domicile, Bureau…" /></div>
                <div><Label>Nom complet</Label><Input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div>
                  <Label>Wilaya</Label>
                  <Select value={editing.wilaya} onValueChange={(v) => setEditing({ ...editing, wilaya: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WILAYAS.map((w) => <SelectItem key={w.code} value={w.code}>{w.code} — {w.name_fr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>Adresse</Label><Textarea rows={2} value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
                <label className="md:col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} className="size-4 accent-primary" />
                  Définir comme adresse par défaut
                </label>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
                  <Button onClick={saveAddress}>Enregistrer</Button>
                </div>
              </CardContent>
            </Card>
          )}
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
