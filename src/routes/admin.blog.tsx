import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/blog")({ component: Page });

function Page() {
  return (
    <AdminPageShell
      title="Blog"
      description="Articles publiés et brouillons."
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouvel article</Button>}
    >
      <AdminEmptyState label="Aucun article publié." />
    </AdminPageShell>
  );
}
