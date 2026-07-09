import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useAdminState, updateOrderStatus, type OrderStatus } from "@/lib/admin-store";

const PAYMENT: Record<string, string> = { cod: "Paiement à la livraison", card: "Carte bancaire", bank: "Virement bancaire" };

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { orders, customers } = useAdminState();
  const nav = useNavigate();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <AdminPageShell title={`Commande #${id}`} actions={<Link to="/admin/orders"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>}>
        <AdminEmptyState label="Commande introuvable." />
      </AdminPageShell>
    );
  }

  const customer = customers.find((c) => c.id === order.customerId);

  return (
    <AdminPageShell
      title={`Commande ${order.id}`}
      description={`Passée le ${new Date(order.createdAt).toLocaleString("fr-FR")}`}
      actions={<Link to="/admin/orders"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Articles</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 border-b pb-3 last:border-none last:pb-0">
                  {it.image && <img src={it.image} alt="" className="h-14 w-14 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${it.productId}`} className="font-medium hover:text-primary">{it.name}</Link>
                    <p className="text-xs text-muted-foreground">Qté : {it.qty} × {formatDZD(it.price)}</p>
                  </div>
                  <p className="font-medium">{formatDZD(it.price * it.qty)}</p>
                </div>
              ))}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{formatDZD(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span>{order.shipping === 0 ? "Gratuite" : formatDZD(order.shipping)}</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatDZD(order.total)}</span></div>
              </div>
            </CardContent>
          </Card>
          {order.note && (
            <Card><CardContent className="p-5 text-sm"><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Note client</p>{order.note}</CardContent></Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Statut</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">{order.status}</Badge>
              <Select value={order.status} onValueChange={(v) => { updateOrderStatus(order.id, v as OrderStatus); toast.success("Statut mis à jour"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En traitement</SelectItem>
                  <SelectItem value="shipped">Expédiée</SelectItem>
                  <SelectItem value="delivered">Livrée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              {customer && <>
                <p className="text-muted-foreground">{customer.email}</p>
                <p className="text-muted-foreground">{customer.phone}</p>
              </>}
              <Button variant="link" className="h-auto p-0" onClick={() => nav("/admin/customers")}>Voir le client</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Livraison & paiement</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Adresse : </span>{order.address}</p>
              <p><span className="text-muted-foreground">Wilaya : </span>{order.wilaya}</p>
              <p><span className="text-muted-foreground">Téléphone : </span>{order.phone}</p>
              <p><span className="text-muted-foreground">Paiement : </span>{PAYMENT[order.paymentMethod]}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
