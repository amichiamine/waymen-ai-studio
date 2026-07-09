
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/customers")({ component: Page });

export default function AdminCustomers() {
  return (
    <AdminPageShell title="Clients" description="Base clients de la boutique.">
      <Input placeholder="Rechercher un client…" className="max-w-sm" />
      <AdminEmptyState label="Aucun client à afficher." />
    </AdminPageShell>
  );
}
