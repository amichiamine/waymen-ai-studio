import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/orders/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <AdminPageShell title={`Commande #${id}`} description="Détails de la commande.">
      <AdminEmptyState label="Détails indisponibles — connectez le backend." />
    </AdminPageShell>
  );
}
