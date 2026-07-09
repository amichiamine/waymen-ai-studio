import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({ component: Page });

function Page() {
  return (
    <AdminPageShell
      title="Catégories"
      description="Organisez votre catalogue par catégories."
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouvelle catégorie</Button>}
    >
      <AdminEmptyState />
    </AdminPageShell>
  );
}
