import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/products/new")({ component: Page });

function Page() {
  return (
    <AdminPageShell title="Nouveau produit" description="Créer une fiche produit.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nom</Label><Input placeholder="Nom du produit" /></div>
            <div><Label>Marque</Label><Input placeholder="Marque" /></div>
            <div>
              <Label>Catégorie</Label>
              <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptops">Ordinateurs portables</SelectItem>
                  <SelectItem value="desktops">Ordinateurs de bureau</SelectItem>
                  <SelectItem value="builds">Configurations</SelectItem>
                  <SelectItem value="phones">Smartphones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea rows={5} placeholder="Description détaillée" /></div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Prix & stock</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Prix (DA)</Label><Input type="number" placeholder="0" /></div>
              <div><Label>Ancien prix (DA)</Label><Input type="number" placeholder="0" /></div>
              <div><Label>État du stock</Label>
                <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">En stock</SelectItem>
                    <SelectItem value="low">Stock faible</SelectItem>
                    <SelectItem value="out">Rupture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Image</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                Glissez une image ou cliquez pour parcourir
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Annuler</Button>
        <Button>Enregistrer</Button>
      </div>
    </AdminPageShell>
  );
}
