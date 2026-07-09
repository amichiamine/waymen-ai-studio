
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminBlogNew() {
  return (
    <AdminPageShell title="Nouvel article" description="Rédiger un article de blog.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Contenu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Titre</Label><Input placeholder="Titre de l'article" /></div>
            <div><Label>Extrait</Label><Textarea rows={3} placeholder="Court résumé" /></div>
            <div><Label>Corps</Label><Textarea rows={14} placeholder="Contenu de l'article (Markdown)" /></div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Publication</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Slug</Label><Input placeholder="mon-article" /></div>
              <div><Label>Auteur</Label><Input placeholder="Nom de l'auteur" /></div>
              <div><Label>Étiquettes</Label><Input placeholder="tech, guide" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Image de couverture</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                Aucune image
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Brouillon</Button>
        <Button>Publier</Button>
      </div>
    </AdminPageShell>
  );
}
