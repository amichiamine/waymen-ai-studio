
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShoppingBag, Users, DollarSign } from "lucide-react";

const KPIS = [
  { label: "Revenu (30 j)", value: "—", Icon: DollarSign },
  { label: "Commandes (30 j)", value: "0", Icon: ShoppingBag },
  { label: "Clients", value: "0", Icon: Users },
  { label: "Produits actifs", value: "0", Icon: Package },
];

export default function AdminDashboard() {
  return (
    <AdminPageShell title="Tableau de bord" description="Vue d'ensemble de votre boutique KA Tech.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <k.Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-semibold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 text-sm font-semibold">Dernières commandes</h2>
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucune commande pour le moment.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 text-sm font-semibold">Chiffre d'affaires</h2>
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Aucune donnée à afficher.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
