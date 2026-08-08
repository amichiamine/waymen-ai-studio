import { useMemo, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
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
import { localize, type Localized } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";

/** Toutes les variantes d'un champ localisé, en minuscules — base de recherche admin. */
const haystack = (v: Localized<string> | undefined): string =>
  (typeof v === "object" && v !== null ? [v.fr, v.en, v.ar] : [v])
    .filter((s): s is string => typeof s === "string")
    .join(" ")
    .toLowerCase();

export default function AdminBlogList() {
  const { data: blogPosts, loading, error } = useBlogPostList();
  const { remove } = useBlogPostMutations();
  const { can, guard, denyReason } = usePermissions();
  const { lang, t } = useI18n();
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return blogPosts
      .filter(
        (p) =>
          !needle ||
          haystack(p.title).includes(needle) ||
          p.slug.includes(needle) ||
          p.tags.some((tag) => tag.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [blogPosts, q]);

  const target = blogPosts.find((p) => p.id === pendingDelete);
  // Résoudre le titre dans la langue courante pour l'affichage dans la boîte de confirmation.
  const targetTitle = localize(target?.title, lang) ?? localize(target?.title, "fr") ?? "";

  async function confirmDelete() {
    if (!pendingDelete) return;
    // Niveau 2 — la vérification vit dans l'action, pas seulement dans le rendu.
    if (!guard("delete", t("admin.contenu.blog.garde_supprimer"))) return;
    setSaving(true);
    try {
      await remove(pendingDelete);
      toast.success(t("admin.contenu.blog.toast_supprime"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
      setPendingDelete(null);
    }
  }

  const publishedCount = blogPosts.filter((p) => p.status === "published").length;

  return (
    <AdminPageShell
      title={t("admin.contenu.blog.titre")}
      description={t("admin.contenu.blog.description", {
        n: blogPosts.length,
        publie: publishedCount,
      })}
      actions={
        // Niveau 1 — affichage. Niveau 3 — infobulle sur le <span> car un bouton
        // disabled a pointer-events-none et n'affiche jamais son propre title.
        can("create") ? (
          <Link to="/admin/blog/new">
            <Button>
              <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.blog.nouvel_article")}
            </Button>
          </Link>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.blog.nouvel_article")}
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
          placeholder={t("admin.contenu.blog.recherche_placeholder")}
          aria-label={t("admin.contenu.blog.recherche_placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-3" aria-busy="true">
          <span className="sr-only">{t("admin.socle.commun.chargement")}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmptyState
          label={
            blogPosts.length === 0
              ? t("admin.contenu.blog.vide_aucun_article")
              : t("admin.contenu.blog.vide_aucun_resultat")
          }
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((p) => {
            const title = localize(p.title, lang) ?? localize(p.title, "fr") ?? "";
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  {p.cover ? (
                    <ImageCatalogue
                      src={p.cover}
                      alt={title}
                      className="h-16 w-24 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-16 w-24 shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{title}</h3>
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status === "published"
                          ? t("admin.contenu.blog.statut_publie")
                          : t("admin.contenu.blog.statut_brouillon")}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      /{p.slug} · {p.author} · maj{" "}
                      {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {p.status === "published" && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">
                          <Eye className="me-2 h-4 w-4" /> {t("admin.contenu.blog.voir_article")}
                        </Button>
                      </a>
                    )}
                    {can("update") ? (
                      <Link to={`/admin/blog/${p.id}`}>
                        <Button size="sm" variant="outline">
                          <Pencil className="me-2 h-4 w-4" />{" "}
                          {t("admin.contenu.blog.editer_article")}
                        </Button>
                      </Link>
                    ) : (
                      <span title={denyReason("update")} className="inline-flex">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          aria-label={t("admin.contenu.blog.editer_article")}
                        >
                          <Pencil className="me-2 h-4 w-4" />{" "}
                          {t("admin.contenu.blog.editer_article")}
                        </Button>
                      </span>
                    )}
                    <span
                      title={denyReason("delete") ?? t("admin.socle.commun.supprimer")}
                      className="inline-flex align-middle"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t("admin.socle.commun.supprimer")}
                        disabled={!can("delete") || saving}
                        onClick={() => setPendingDelete(p.id)}
                      >
                        <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
                        {t("admin.socle.commun.supprimer")}
                      </Button>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={
          target
            ? t("admin.contenu.blog.supprimer_titre", { titre: targetTitle })
            : t("admin.contenu.blog.supprimer_titre_generique")
        }
        description={t("admin.contenu.blog.supprimer_description")}
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}
