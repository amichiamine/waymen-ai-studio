
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/reports")({ component: Page });

export default function AdminReports() {
  return (
    <AdminPageShell title="Rapports" description="Exportez vos indicateurs de performance.">
      <div className="grid gap-4 lg:grid-cols-3">
        {["Ventes", "Stocks", "Clients"].map((t) => (
          <Card key={t}>
            <CardContent className="p-6">
              <h2 className="mb-2 text-sm font-semibold">Rapport — {t}</h2>
              <p className="text-xs text-muted-foreground">Aucun rapport généré pour le moment.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
