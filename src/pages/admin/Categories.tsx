import { useMemo, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, ArrowRight, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategoryList, useCategoryMutations, useProductList, toApiError } from "@/data-provider";
import type { AdminCategory } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

export default function AdminCategories() {
  const { data: categories, loading, error } = useCategoryList();
  const { data: products } = useProductList();
  const { remove } = useCategoryMutations();
  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();
  const [pending, setPending] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(
    () =>
      categories.map((c) => {
        const items = products.filter((p) => p.category === c.slug);
        return { ...c, count: items.length, cover: c.cover ?? items[0]?.image };
      }),
    [categories, products],
  );

  const pendingCount = pending ? products.filter((p) => p.category === pending.slug).length : 0;

  const confirmDelete = async () => {
    if (!pending) return;
    // Niveau 2 — vérification dans le handler, pas seulement dans le rendu.
    if (!guard("delete", t("admin.catalogue.categories.supprimer_garde"))) return;
    // Garde métier préservée : refus si des produits sont encore rattachés.
    if (pendingCount > 0) return;
    setDeleting(true);
    try {
      await remove(pending.slug);
      toast.success(t("admin.catalogue.categories.toast_supprimee", { nom: pending.label }));
      setPending(null);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.catalogue.categories.titre")}
        description={t("admin.socle.commun.chargement")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.catalogue.categories.titre")}
      description={t("admin.catalogue.categories.description", {
        n: categories.length,
        produits: String(products.length),
      })}
      actions={
        // Niveau 1 — affichage. Niveau 3 — infobulle portée par le <span>.
        can("create") ? (
          <Link to="/admin/categories/new">
            <Button>
              <Plus className="me-2 h-4 w-4" />
              {t("admin.catalogue.categories.btn_nouvelle")}
            </Button>
          </Link>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" />
              {t("admin.catalogue.categories.btn_nouvelle")}
            </Button>
          </span>
        )
      }
    >
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((c) => (
          <Card
            key={c.slug}
            className="overflow-hidden transition hover:border-primary/50 hover:shadow-sm"
          >
            <Link
              to={`/admin/categories/${c.slug}/view`}
              className="block aspect-[16/10] w-full overflow-hidden bg-muted"
            >
              {c.cover ? (
                <ImageCatalogue
                  src={c.cover}
                  alt={c.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {t("admin.catalogue.categories.pas_image")}
                </div>
              )}
            </Link>
            <CardContent className="space-y-3 p-5">
              <div>
                <Link
                  to={`/admin/categories/${c.slug}/view`}
                  className="text-base font-semibold hover:text-primary hover:underline"
                >
                  {c.label}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("admin.catalogue.categories.produits", { n: c.count })}
                </span>
                <div className="flex gap-1">
                  {/* Niveau 1+3 : bouton Modifier */}
                  {can("update") ? (
                    <Link to={`/admin/categories/${c.slug}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("admin.socle.commun.modifier")}
                        aria-label={t("admin.socle.commun.modifier")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <span title={denyReason("update")} className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        aria-label={t("admin.socle.commun.modifier")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </span>
                  )}
                  {/* Niveau 1+3 : bouton Supprimer */}
                  <span
                    title={denyReason("delete") ?? t("admin.socle.commun.supprimer")}
                    className="inline-flex align-middle"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("admin.socle.commun.supprimer")}
                      disabled={!can("delete")}
                      onClick={() => setPending(c)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </span>
                  <Link
                    to={`/admin/categories/${c.slug}/view`}
                    className="flex items-center gap-1 text-primary hover:underline text-xs"
                  >
                    {t("admin.catalogue.categories.details")}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rows.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("admin.catalogue.categories.vide_aucune")}
          </p>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.catalogue.categories.supprimer_titre", { nom: pending?.label ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount > 0
                ? t("admin.catalogue.categories.supprimer_impossible", { n: pendingCount })
                : t("admin.catalogue.categories.supprimer_confirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.socle.confirmation.annuler")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={pendingCount > 0 || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting
                ? t("admin.catalogue.categories.supprimer_en_cours")
                : t("admin.socle.commun.supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
