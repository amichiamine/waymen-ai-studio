import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/users")({ component: Page });

function Page() {
  return (
    <AdminPageShell
      title="Utilisateurs & rôles"
      description="Gestion des accès au back-office."
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Inviter</Button>}
    >
      <AdminEmptyState label="Aucun utilisateur admin — connectez le backend pour gérer les rôles." />
    </AdminPageShell>
  );
}
