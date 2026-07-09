
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AdminBrands() {
  return (
    <AdminPageShell
      title="Marques"
      description="Gérez les marques référencées."
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouvelle marque</Button>}
    >
      <AdminEmptyState />
    </AdminPageShell>
  );
}
