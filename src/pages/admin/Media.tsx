
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function AdminMedia() {
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
