
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

export default function AdminProducts() {
  return (
    <AdminPageShell
      title="Produits"
      description="Gérez le catalogue de votre boutique."
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouveau produit</Button>}
    >
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un produit…" className="pl-9" />
      </div>
      <AdminEmptyState label="Aucun produit à afficher — connectez le backend pour charger votre catalogue." />
    </AdminPageShell>
  );
}
