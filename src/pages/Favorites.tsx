import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Heart, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useProductDetail, useSiteContent } from "@/data-provider";
import { ProductCard } from "@/components/ProductCard";
import { useI18n } from "@/lib/i18n";
import { renderBlock } from "@/components/blocks";
import { cn } from "@/lib/utils";

/**
 * Carte favorite autonome — résout son propre produit via `useProductDetail`.
 *
 * Raison d'être : après l'exclusion des `custom_build` du listing public, un
 * article de configuration n'est plus renvoyé par `GET /products?perPage=100`
 * mais reste accessible via `GET /products/:id`. Cette résolution individuelle
 * garantit qu'un favori portant un identifiant de configuration reste visible.
 */
function FavoriteItem({ id }: { id: string }) {
  const { data: product, loading, error } = useProductDetail(id);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-md bg-muted" />;
  }

  if (!product) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{error ? error.message : id}</span>
      </div>
    );
  }

  return <ProductCard p={product} />;
}

export default function Favorites({
  suppressCustomBlocks = false,
}: {
  suppressCustomBlocks?: boolean;
} = {}) {
  const { t } = useI18n();
  const { favorites } = useStore();
  const { data: siteContent } = useSiteContent();
  const ids = [...favorites];

  const systemPage = siteContent?.customPages?.find(
    (pg) => pg.isSystem && (pg.systemKey === "favorites" || pg.slug === "favorites"),
  );
  const blocks = suppressCustomBlocks ? [] : systemPage?.blocks?.filter((b) => b.enabled) || [];
  const topBlocks = blocks.filter((b) => (b.style?.placement || "top") === "top");
  const bottomBlocks = blocks.filter((b) => b.style?.placement === "bottom");

  const pageBgClass =
    systemPage?.layout?.pageBg === "dark"
      ? "bg-slate-950 text-slate-50"
      : systemPage?.layout?.pageBg === "muted"
        ? "bg-muted/40"
        : systemPage?.layout?.pageBg === "surface"
          ? "bg-card"
          : systemPage?.layout?.pageBg === "gradient"
            ? "bg-gradient-to-b from-background via-muted/20 to-background"
            : "";

  return (
    <div className={cn("min-h-[70vh]", pageBgClass)}>
      {topBlocks.map(renderBlock)}
      <div className="container mx-auto px-4 py-10">
        <Helmet>
          <title>{t("favorites.page.title")}</title>
          <meta name="description" content={t("favorites.page.desc")} />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <h1 className="mb-6 text-2xl font-bold">{t("favorites.title")}</h1>
        {ids.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("favorites.empty")}</p>
            <Link to="/category" className="text-primary hover:underline">
              {t("favorites.browse")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ids.map((id) => (
              <FavoriteItem key={id} id={id} />
            ))}
          </div>
        )}
      </div>
      {bottomBlocks.map(renderBlock)}
    </div>
  );
}
