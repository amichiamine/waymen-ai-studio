
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export default function AdminNotifications() {
  return (
    <AdminPageShell title="Notifications" description="Alertes internes de la boutique.">
      <AdminEmptyState label="Aucune notification." />
    </AdminPageShell>
  );
}
