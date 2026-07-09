
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminShipping() {
  return (
    <AdminPageShell title="Livraison" description="Tarifs et modes de livraison.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tarifs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Livraison à domicile (DA)</Label><Input type="number" defaultValue={800} /></div>
            <div><Label>Retrait bureau (DA)</Label><Input type="number" defaultValue={400} /></div>
            <div><Label>Franco de port à partir de (DA)</Label><Input type="number" placeholder="0" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Zones couvertes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">58 wilayas d'Algérie — configuration détaillée disponible après connexion du backend.</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end"><Button>Enregistrer</Button></div>
    </AdminPageShell>
  );
}
