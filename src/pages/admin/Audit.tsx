
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export default function AdminAudit() {
  return (
    <AdminPageShell title="Journal d'audit" description="Historique des actions administrateur.">
      <AdminEmptyState label="Aucun événement enregistré." />
    </AdminPageShell>
  );
}
