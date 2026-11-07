import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Tag, Pencil } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useBrandList, useProductList } from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n, useLocalize } from "@/lib/i18n";

export default function AdminBrands() {
  const { data: brands, loading, error } = useBrandList();
  const { data: products } = useProductList();
  const { can, denyReason } = usePermissions();
  const { t } = useI18n();
  const L = useLocalize();

  const rows = useMemo(() => {
    return brands
      .map((b) => {
        const items = products.filter((p) => p.brand === b.name);
        const total = items.reduce((s, p) => s + p.price, 0);
        return {
          ...b,
          count: items.length,
          avg: items.length ? Math.round(total / items.length) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [brands, products]);

  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.catalogue.marques.titre")}
        description={t("admin.socle.commun.chargement")}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.catalogue.marques.titre")}
      description={t("admin.catalogue.marques.description", { n: brands.length })}
      actions={
        // Niveau 1 — affichage. Niveau 3 — infobulle portée par le <span>.
        can("create") ? (
          <Link to="/admin/brands/new">
            <Button>
              <Plus className="me-2 h-4 w-4" />
              {t("admin.catalogue.marques.btn_nouvelle")}
            </Button>
          </Link>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" />
              {t("admin.catalogue.marques.btn_nouvelle")}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((b) => (
          <Card key={b.id} className="transition hover:border-primary/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <Link to={`/admin/brands/${b.id}/view`} className="group flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary group-hover:underline">
                      {b.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.catalogue.marques.produits", { n: b.count })}
                      {b.country ? ` · ${L(b.country)}` : ""}
                    </p>
                  </div>
                </Link>
                {/* Niveau 1+3 : bouton Modifier */}
                {can("update") ? (
                  <Link to={`/admin/brands/${b.id}`}>
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
              </div>

              <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                {t("admin.catalogue.marques.prix_moyen")} ·{" "}
                <span className="font-medium text-foreground">
                  {b.avg ? formatDZD(b.avg) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}
