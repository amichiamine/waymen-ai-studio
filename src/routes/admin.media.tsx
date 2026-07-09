import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/admin/media")({ component: Page });

function Page() {
  return (
    <AdminPageShell
      title="Médias"
      description="Bibliothèque d'images et fichiers."
      actions={<Button><Upload className="mr-2 h-4 w-4" /> Téléverser</Button>}
    >
      <AdminEmptyState label="Aucun média téléversé pour le moment." />
    </AdminPageShell>
  );
}
