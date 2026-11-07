import { Link, useParams } from "react-router-dom";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, Pencil, Plus } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useCategoryDetail, useProductList, useBrandList } from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useLocalize, useI18n } from "@/lib/i18n";

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default",
  low: "secondary",
  out: "destructive",
};

const STOCK_LABEL_KEY: Record<string, string> = {
  in: "admin.catalogue.commun.stock_in",
  low: "admin.catalogue.commun.stock_low",
  out: "admin.catalogue.commun.stock_out",
};

export default function AdminCategoryDetail() {
  const { slug } = useParams();
  const { data: category, loading, error } = useCategoryDetail(slug);
  const { data: products } = useProductList();
  const { data: brands } = useBrandList();
  const { can, denyReason } = usePermissions();
  const L = useLocalize();
  const { t } = useI18n();

  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.catalogue.categorie_detail.titre_chargement")}
        actions={
          <Link to="/admin/categories">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.categorie_detail.retour")}
            </Button>
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-busy="true">
          <div className="h-64 animate-pulse rounded-lg border bg-muted" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg border bg-muted" />
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell
        title={t("admin.catalogue.categorie_detail.titre_chargement")}
        actions={
          <Link to="/admin/categories">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.categorie_detail.retour")}
            </Button>
          </Link>
        }
      >
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      </AdminPageShell>
    );
  }

  if (!category) {
    return (
      <AdminPageShell
        title={t("admin.catalogue.categorie_detail.titre_introuvable")}
        actions={
          <Link to="/admin/categories">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.categorie_detail.retour")}
            </Button>
          </Link>
        }
      >
        <AdminEmptyState
          label={t("admin.catalogue.categorie_detail.vide_introuvable", { slug: slug ?? "" })}
        />
      </AdminPageShell>
    );
  }

  const items = products.filter((p) => p.category === category.slug);
  const total = items.reduce((s, p) => s + p.price, 0);
  const avg = items.length ? Math.round(total / items.length) : 0;
  const brandsUsed = Array.from(new Set(items.map((p) => p.brand)));

  return (
    <AdminPageShell
      title={L(category.label) ?? ""}
      description={L(category.description)}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/categories">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.catalogue.categorie_detail.retour")}
            </Button>
          </Link>
          {/* Niveau 1+3 : bouton Modifier (action update sur la catégorie). */}
          {can("update") ? (
            <Link to={`/admin/categories/${category.slug}`}>
              <Button>
                <Pencil className="me-2 h-4 w-4" />
                {t("admin.catalogue.categorie_detail.modifier")}
              </Button>
            </Link>
          ) : (
            <span title={denyReason("update")} className="inline-flex">
              <Button disabled>
                <Pencil className="me-2 h-4 w-4" />
                {t("admin.catalogue.categorie_detail.modifier")}
              </Button>
            </span>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          {category.cover ? (
            <div className="aspect-[16/10] bg-muted">
              <ImageCatalogue
                src={category.cover}
                alt={L(category.label) ?? ""}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/10] flex items-center justify-center bg-muted text-xs text-muted-foreground">
              {t("admin.catalogue.categorie_detail.pas_image")}
            </div>
          )}
          <CardContent className="p-5 text-sm">
            <p className="font-mono text-xs text-muted-foreground">/{category.slug}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">
                  {t("admin.catalogue.categorie_detail.kpi_produits")}
                </p>
                <p className="text-lg font-bold">{items.length}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-muted-foreground">
                  {t("admin.catalogue.categorie_detail.kpi_prix_moyen")}
                </p>
                <p className="text-lg font-bold">{avg ? formatDZD(avg) : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("admin.catalogue.categorie_detail.marques_presentes", { n: brandsUsed.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {brandsUsed.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                brandsUsed.map((name) => {
                  const b = brands.find((x) => x.name === name);
                  return b ? (
                    <Link key={name} to={`/admin/brands/${b.id}/view`}>
                      <Badge variant="outline" className="hover:border-primary">
                        {name}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t("admin.catalogue.categorie_detail.produits", { n: items.length })}
              </CardTitle>
              {/* Niveau 1+3 : raccourci Nouveau produit (action create sur produit). */}
              {can("create") ? (
                <Link to="/admin/products/new">
                  <Button size="sm" variant="outline">
                    <Plus className="me-2 h-4 w-4" />
                    {t("admin.catalogue.categorie_detail.btn_nouveau_produit")}
                  </Button>
                </Link>
              ) : (
                <span title={denyReason("create")} className="inline-flex">
                  <Button size="sm" variant="outline" disabled>
                    <Plus className="me-2 h-4 w-4" />
                    {t("admin.catalogue.categorie_detail.btn_nouveau_produit")}
                  </Button>
                </span>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("admin.catalogue.categorie_detail.vide_produits")}
                </p>
              ) : (
                <ul className="divide-y">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <ImageCatalogue
                        src={p.image}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/products/${p.id}/view`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {L(p.name) ?? ""}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {p.brand} · {L(p.specLine) ?? ""}
                        </p>
                      </div>
                      <Badge variant={STOCK_VARIANT[p.stock]}>{t(STOCK_LABEL_KEY[p.stock])}</Badge>
                      <span className="w-24 text-end font-medium">{formatDZD(p.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
