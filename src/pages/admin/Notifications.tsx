
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/notifications")({ component: Page });

export default function AdminNotifications() {
  return (
    <AdminPageShell title="Notifications" description="Alertes internes de la boutique.">
      <AdminEmptyState label="Aucune notification." />
    </AdminPageShell>
  );
}
