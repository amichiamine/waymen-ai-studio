import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/products/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <AdminPageShell title="Fiche produit" description={`Identifiant : ${id}`}>
      <AdminEmptyState label="Détails du produit indisponibles — connectez le backend." />
    </AdminPageShell>
  );
}
