import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/reviews")({ component: Page });

function Page() {
  return (
    <AdminPageShell title="Avis clients" description="Modération des avis produits.">
      <AdminEmptyState label="Aucun avis à modérer." />
    </AdminPageShell>
  );
}
