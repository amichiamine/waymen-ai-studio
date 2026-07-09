import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/notifications")({ component: Page });

function Page() {
  return (
    <AdminPageShell title="Notifications" description="Alertes internes de la boutique.">
      <AdminEmptyState label="Aucune notification." />
    </AdminPageShell>
  );
}
