import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useAdminState, deleteBlogPost } from "@/lib/admin-store";

export default function AdminBlogList() {
  const { blogPosts } = useAdminState();
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return blogPosts
      .filter((p) => !needle || p.title.toLowerCase().includes(needle) || p.slug.includes(needle) || p.tags.some((t) => t.toLowerCase().includes(needle)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [blogPosts, q]);

  const target = blogPosts.find((p) => p.id === pendingDelete);

  return (
    <AdminPageShell
      title="Blog"
      description={`${blogPosts.length} article${blogPosts.length > 1 ? "s" : ""} · ${blogPosts.filter((p) => p.status === "published").length} publié(s).`}
      actions={
        <Link to="/admin/blog/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Nouvel article</Button>
        </Link>
      }
    >
      <div className="max-w-md">
        <Input placeholder="Rechercher un article…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <AdminEmptyState label={blogPosts.length === 0 ? "Aucun article. Créez-en un ou réinitialisez les données pour restaurer les articles seed." : "Aucun article ne correspond."} />
      ) : (
        <div className="grid gap-3">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                {p.cover ? (
                  <img src={p.cover} alt={p.title} className="h-16 w-24 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-16 w-24 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{p.title}</h3>
                    <Badge variant={p.status === "published" ? "default" : "secondary"}>
                      {p.status === "published" ? "Publié" : "Brouillon"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">/{p.slug} · {p.author} · maj {new Date(p.updatedAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="flex gap-2">
                  {p.status === "published" && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost"><Eye className="mr-2 h-4 w-4" /> Voir</Button>
                    </a>
                  )}
                  <Link to={`/admin/blog/${p.id}`}>
                    <Button size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" /> Éditer</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(p.id)}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title={target ? `Supprimer « ${target.title} » ?` : "Supprimer l'article ?"}
        description="Cette action est irréversible."
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            deleteBlogPost(pendingDelete);
            toast.success("Article supprimé");
          }
        }}
      />
    </AdminPageShell>
  );
}
