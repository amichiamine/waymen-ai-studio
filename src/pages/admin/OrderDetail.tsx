import { useParams } from "react-router-dom";

import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/orders/$id")({ component: Page });

export default function AdminOrderDetail() {
  const { id } = useParams();
  return (
    <AdminPageShell title={`Commande #${id}`} description="Détails de la commande.">
      <AdminEmptyState label="Détails indisponibles — connectez le backend." />
    </AdminPageShell>
  );
}
