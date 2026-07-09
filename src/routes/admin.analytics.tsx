import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/analytics")({ component: Page });

function Page() {
  return (
    <AdminPageShell title="Analytique" description="Tendances de trafic et de ventes.">
      <div className="grid gap-4 lg:grid-cols-2">
        {["Trafic", "Conversions", "Panier moyen", "Meilleures ventes"].map((t) => (
          <Card key={t}>
            <CardContent className="p-6">
              <h2 className="mb-3 text-sm font-semibold">{t}</h2>
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Aucune donnée disponible
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
