
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function AdminSettings() {
  return (
    <AdminPageShell title="Paramètres" description="Configuration générale de la boutique.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Boutique</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nom</Label><Input defaultValue="KA Tech" /></div>
            <div><Label>E-mail de contact</Label><Input defaultValue="contact@katech.dz" /></div>
            <div><Label>Téléphone</Label><Input placeholder="+213…" /></div>
            <div><Label>Adresse</Label><Textarea rows={2} placeholder="Adresse du siège" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Options</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Mode maintenance</Label><Switch /></div>
            <div className="flex items-center justify-between"><Label>Notifications e-mail</Label><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><Label>Afficher le bandeau promo</Label><Switch defaultChecked /></div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end"><Button>Enregistrer</Button></div>
    </AdminPageShell>
  );
}
