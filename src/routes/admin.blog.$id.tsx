import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/blog/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return (
    <AdminPageShell title="Éditer un article" description={`Identifiant : ${id}`}>
      <AdminEmptyState label="Contenu indisponible — connectez le backend." />
    </AdminPageShell>
  );
}
