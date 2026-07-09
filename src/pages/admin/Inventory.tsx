
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export default function AdminInventory() {
  return (
    <AdminPageShell title="Stock" description="Suivi et ajustement des niveaux de stock.">
      <AdminEmptyState label="Aucune donnée de stock — connectez le backend." />
    </AdminPageShell>
  );
}
