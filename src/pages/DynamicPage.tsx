import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useSiteContent, useSiteSettings } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import { renderBlock } from "@/components/blocks";
import NotFound from "@/pages/NotFound";

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: siteContent, loading } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  const L = useLocalize();
  const storeName = siteSettings.storeName?.trim() || "StacGate Platform";

  if (!slug) {
    return <NotFound />;
  }

  // Éradication du Flash 404 / FOUC : si les données sont en cours de chargement
  if (loading && !siteContent) {
    return (
      <div className="container-page py-32 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent shadow-sm" />
        <p className="mt-4 text-xs text-muted-foreground animate-pulse">Chargement de la page...</p>
      </div>
    );
  }

  // Recherche de la page par slug dans les customPages
  const customPages = siteContent?.customPages || [];
  const page = customPages.find(
    (p) => p.slug.toLowerCase() === slug.toLowerCase() && p.isPublished,
  );

  // Si le chargement est terminé et que la page n'existe pas ou n'est pas publiée
  if (!page) {
    return <NotFound />;
  }

  const pageTitle = L(page.title) || page.slug;
  const pageDesc = L(page.description) || "";
  const metaTitle = `${pageTitle} — ${storeName}`;

  const enabledBlocks = (page.blocks || []).filter((b) => b.enabled);

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        {pageDesc && <meta name="description" content={pageDesc} />}
        <link rel="canonical" href={`${window.location.origin}/${page.slug}`} />
      </Helmet>

      {enabledBlocks.length === 0 ? (
        <div className="container-page py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">{pageTitle}</h1>
          <p className="text-muted-foreground">Cette page ne contient encore aucun bloc actif.</p>
        </div>
      ) : (
        <div className="flex flex-col space-y-2">
          {enabledBlocks.map((block) => renderBlock(block))}
        </div>
      )}
    </>
  );
}
