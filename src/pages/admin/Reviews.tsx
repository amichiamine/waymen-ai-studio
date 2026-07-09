
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export default function AdminReviews() {
  return (
    <AdminPageShell title="Avis clients" description="Modération des avis produits.">
      <AdminEmptyState label="Aucun avis à modérer." />
    </AdminPageShell>
  );
}
