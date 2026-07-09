import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/inventory")({ component: Page });

function Page() {
  return (
    <AdminPageShell title="Stock" description="Suivi et ajustement des niveaux de stock.">
      <AdminEmptyState label="Aucune donnée de stock — connectez le backend." />
    </AdminPageShell>
  );
}
