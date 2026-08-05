import { Link, useParams } from "react-router-dom";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Eye, Pencil, Tag, Boxes, Package } from "lucide-react";
import { formatDZD } from "@/data/products";
import {
  useProductDetail,
  useCategoryList,
  useBrandList,
  useOrderList,
  useReviewList,
} from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";
import { useLocalize } from "@/lib/i18n";

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default",
  low: "secondary",
  out: "destructive",
};
const STOCK_LABEL: Record<string, string> = { in: "En stock", low: "Stock faible", out: "Rupture" };

export default function AdminProductDetail() {
  const { id } = useParams();
  const { data: product, loading, error } = useProductDetail(id);
  const { data: categories } = useCategoryList();
  const { data: brands } = useBrandList();
  const { data: orders } = useOrderList();
  const { data: reviews } = useReviewList();
  const { can, denyReason } = usePermissions();
  /**
   * Localisation faite une seule fois par champ en tête de composant.
   * `name` et `specLine` sont des `string` garantis : ils peuvent être
   * utilisés dans les attributs HTML, les titres et le JSX sans risque
   * de rendre un objet `Localized` brut.
   */
  const L = useLocalize();
  const name = L(product?.name) ?? "";
  const specLine = L(product?.specLine) ?? "";

  if (loading) {
    return (
      <AdminPageShell
        title="Produit"
        actions={
          <Link to="/admin/products">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-busy="true">
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell
        title="Produit"
        actions={
          <Link to="/admin/products">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
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

  if (!product) {
    return (
      <AdminPageShell
        title="Produit introuvable"
        actions={
          <Link to="/admin/products">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
        }
      >
        <AdminEmptyState label={`Aucun produit avec l'identifiant « ${id} »`} />
      </AdminPageShell>
    );
  }

  const cat = categories.find((c) => c.slug === product.category);
  const brand = brands.find((b) => b.name === product.brand);
  const productOrders = orders.filter((o) => o.items.some((it) => it.productId === product.id));
  const soldUnits = productOrders.reduce(
    (s, o) =>
      s + o.items.filter((it) => it.productId === product.id).reduce((s2, it) => s2 + it.qty, 0),
    0,
  );
  const revenue = productOrders.reduce(
    (s, o) =>
      s +
      o.items
        .filter((it) => it.productId === product.id)
        .reduce((s2, it) => s2 + it.qty * it.price, 0),
    0,
  );
  const productReviews = reviews.filter((r) => r.productId === product.id);
  const avgRating = productReviews.length
    ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length
    : 0;

  return (
    <AdminPageShell
      title={name}
      description={`ID : ${product.id} · ${product.brand}`}
      actions={
        <div className="flex gap-2">
          <Link to="/admin/products">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <Link to={`/product/${product.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Eye className="me-2 h-4 w-4" />
              Fiche publique
            </Button>
          </Link>
          {/* Niveau 1 — désactiver le bouton Modifier si update est interdit.    */}
          {/* Niveau 3 — le <span> porte l'infobulle (pointer-events-none sinon). */}
          {can("update") ? (
            <Link to={`/admin/products/${product.id}`}>
              <Button>
                <Pencil className="me-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>
          ) : (
            <span title={denyReason("update")} className="inline-flex">
              <Button disabled>
                <Pencil className="me-2 h-4 w-4" />
                Modifier
              </Button>
            </span>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-muted">
            <img src={product.image} alt={name} className="h-full w-full object-cover" />
          </div>
          <CardContent className="space-y-2 p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatDZD(product.price)}</span>
              {product.oldPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatDZD(product.oldPrice)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant={STOCK_VARIANT[product.stock]}>{STOCK_LABEL[product.stock]}</Badge>
              {product.bestSeller && <Badge variant="outline">Best-seller</Badge>}
              {product.sale && <Badge variant="outline">Promotion</Badge>}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{specLine}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(product.specs)
                  .filter(([, val]) => val)
                  .map(([k, val]) => (
                    <div key={k} className="rounded-md border p-2">
                      <p className="text-xs uppercase text-muted-foreground">{k}</p>
                      <p className="font-medium">{L(val)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Unités vendues</p>
                <p className="mt-1 text-xl font-bold">{soldUnits}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
                <p className="mt-1 text-xl font-bold">{formatDZD(revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Note moyenne ({productReviews.length})
                </p>
                <p className="mt-1 text-xl font-bold">
                  {avgRating ? avgRating.toFixed(1) + " / 5" : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Boxes className="h-4 w-4" />
                  Catégorie
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cat ? (
                  <Link
                    to={`/admin/categories/${cat.slug}/view`}
                    className="text-primary hover:underline"
                  >
                    {cat.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4" />
                  Marque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {brand ? (
                  <Link
                    to={`/admin/brands/${brand.id}/view`}
                    className="text-primary hover:underline"
                  >
                    {brand.name}
                  </Link>
                ) : (
                  <span>{product.brand}</span>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Commandes récentes ({productOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune commande mock associée.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {productOrders.slice(0, 6).map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2">
                      <Link to={`/admin/orders/${o.id}`} className="text-primary hover:underline">
                        #{o.id}
                      </Link>
                      <span className="text-muted-foreground">{o.customerName}</span>
                      <span>{formatDZD(o.total)}</span>
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
