
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/payments")({ component: Page });

export default function AdminPayments() {
  return (
    <AdminPageShell title="Paiements" description="Modes de paiement acceptés.">
      <Card>
        <CardHeader><CardTitle>Moyens de paiement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            "Paiement à la livraison",
            "Virement bancaire",
            "CIB / Edahabia",
            "Paiement en boutique",
          ].map((m) => (
            <div key={m} className="flex items-center justify-between border-b py-2 last:border-0">
              <Label>{m}</Label>
              <Switch defaultChecked={m === "Paiement à la livraison"} />
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
