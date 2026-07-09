
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AdminCoupons() {
  return (
    <AdminPageShell
      title="Coupons"
      description="Codes promo et remises."
      actions={<Button><Plus className="mr-2 h-4 w-4" /> Nouveau coupon</Button>}
    >
      <AdminEmptyState />
    </AdminPageShell>
  );
}
