import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Eye, AlertTriangle } from "lucide-react";
import { useBlogPostList, useBlogPostMutations, toApiError } from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";

export default function AdminBlogList() {
  const { data: blogPosts, loading, error } = useBlogPostList();
  const { remove } = useBlogPostMutations();
  const { can, guard, denyReason } = usePermissions();
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return blogPosts
      .filter(
        (p) =>
          !needle ||
          p.title.toLowerCase().includes(needle) ||
          p.slug.includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [blogPosts, q]);

  const target = blogPosts.find((p) => p.id === pendingDelete);

  async function confirmDelete() {
    if (!pendingDelete) return;
    // Niveau 2 — la vérification vit dans l'action, pas seulement dans le rendu.
    if (!guard("delete", "Supprimer l'article")) return;
    setSaving(true);
    try {
      await remove(pendingDelete);
      toast.success("Article supprimé");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
      setPendingDelete(null);
    }
  }

  return (
    <AdminPageShell
      title="Blog"
      description={`${blogPosts.length} article${blogPosts.length > 1 ? "s" : ""} · ${blogPosts.filter((p) => p.status === "published").length} publié(s).`}
      actions={
        // Niveau 1 — affichage. Niveau 3 — infobulle sur le <span> car un bouton
        // disabled a pointer-events-none et n'affiche jamais son propre title.
        can("create") ? (
          <Link to="/admin/blog/new">
            <Button>
              <Plus className="me-2 h-4 w-4" /> Nouvel article
            </Button>
          </Link>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> Nouvel article
            </Button>
          </span>
        )
      }
    >
      {error && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      <div className="max-w-md">
        <Input
          placeholder="Rechercher un article…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-3" aria-busy="true">
          <span className="sr-only">Chargement…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmptyState
          label={
            blogPosts.length === 0
              ? "Aucun article. Créez-en un ou réinitialisez les données pour restaurer les articles seed."
              : "Aucun article ne correspond."
          }
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                {p.cover ? (
                  <img
                    src={p.cover}
                    alt={p.title}
                    className="h-16 w-24 shrink-0 rounded-md object-cover"
                  />
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
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    /{p.slug} · {p.author} · maj {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {p.status === "published" && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost">
                        <Eye className="me-2 h-4 w-4" /> Voir
                      </Button>
                    </a>
                  )}
                  {can("update") ? (
                    <Link to={`/admin/blog/${p.id}`}>
                      <Button size="sm" variant="outline">
                        <Pencil className="me-2 h-4 w-4" /> Éditer
                      </Button>
                    </Link>
                  ) : (
                    <span title={denyReason("update")} className="inline-flex">
                      <Button size="sm" variant="outline" disabled aria-label="Éditer">
                        <Pencil className="me-2 h-4 w-4" /> Éditer
                      </Button>
                    </span>
                  )}
                  <span
                    title={denyReason("delete") ?? "Supprimer"}
                    className="inline-flex align-middle"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Supprimer"
                      disabled={!can("delete") || saving}
                      onClick={() => setPendingDelete(p.id)}
                    >
                      <Trash2 className="me-2 h-4 w-4 text-destructive" /> Supprimer
                    </Button>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={target ? `Supprimer « ${target.title} » ?` : "Supprimer l'article ?"}
        description="Cette action est irréversible."
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}
