import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RotateCcw, Trash2, Database } from "lucide-react";
import { useAdminState, resetData, clearData, type AdminState } from "@/lib/admin-store";

type Row = { key: keyof AdminState; label: string; description: string };

const ROWS: Row[] = [
  { key: "products", label: "Produits", description: "Catalogue local des produits." },
  { key: "categories", label: "Catégories", description: "Rubriques du catalogue." },
  { key: "brands", label: "Marques", description: "Marques référencées." },
  { key: "orders", label: "Commandes", description: "Commandes clients mockées." },
  { key: "customers", label: "Clients", description: "Base clients." },
  { key: "coupons", label: "Coupons", description: "Codes promo." },
  { key: "reviews", label: "Avis", description: "Avis clients à modérer." },
  { key: "users", label: "Utilisateurs admin", description: "Membres de l'équipe (sauf propriétaire)." },
];

export default function AdminReset() {
  const state = useAdminState();

  function doReset(key: keyof AdminState | "all", label: string) {
    if (!confirm(`Réinitialiser ${label} aux données d'origine ?`)) return;
    resetData(key);
    toast.success(`${label} réinitialisées`);
  }
  function doClear(key: keyof AdminState, label: string) {
    if (!confirm(`Vider complètement ${label} ? Cette action est irréversible.`)) return;
    clearData(key);
    toast.success(`${label} vidées`);
  }

  const totals: Record<keyof AdminState, number> = {
    products: state.products.length,
    categories: state.categories.length,
    brands: state.brands.length,
    orders: state.orders.length,
    customers: state.customers.length,
    coupons: state.coupons.length,
    reviews: state.reviews.length,
    users: state.users.length,
  };

  return (
    <AdminPageShell
      title="Réinitialisation des données"
      description="Restaurer ou vider les données locales de la boutique (stockées dans le navigateur)."
    >
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Attention</AlertTitle>
        <AlertDescription>
          Ces actions modifient uniquement les données locales (localStorage) de ce navigateur. En phase 2, la même interface pilotera l'API Bun + SQLite.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Actions globales</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => doReset("all", "toutes les données")}>
            <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser toute la boutique
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm("Vider TOUTES les données de la boutique ? Cette action est irréversible.")) return;
              (Object.keys(totals) as (keyof AdminState)[]).forEach((k) => clearData(k));
              toast.success("Toutes les données ont été vidées");
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Tout vider
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Par type de données</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {ROWS.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">{r.label} <span className="ml-2 text-xs text-muted-foreground">{totals[r.key]} enregistrement{totals[r.key] > 1 ? "s" : ""}</span></p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => doReset(r.key, r.label.toLowerCase())}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                </Button>
                <Button size="sm" variant="ghost" onClick={() => doClear(r.key, r.label.toLowerCase())}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Vider
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
