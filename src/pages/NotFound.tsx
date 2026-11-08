import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useI18n } from "@/lib/i18n";
import { useSiteContent } from "@/data-provider";
import { renderBlock } from "@/components/blocks";

export default function NotFound({
  suppressCustomBlocks = false,
}: {
  suppressCustomBlocks?: boolean;
} = {}) {
  const { t } = useI18n();
  const { data: siteContent } = useSiteContent();

  const systemPage = siteContent?.customPages?.find(
    (p) => p.isSystem && (p.systemKey === "not_found" || p.slug === "404"),
  );
  const blocks = suppressCustomBlocks ? [] : systemPage?.blocks?.filter((b) => b.enabled) || [];
  const topBlocks = blocks.filter((b) => (b.style?.placement || "top") === "top");
  const bottomBlocks = blocks.filter((b) => b.style?.placement === "bottom");

  const pageBgClass =
    systemPage?.layout?.pageBg === "dark"
      ? "bg-[#0a0f1d] text-white min-h-[80vh]"
      : systemPage?.layout?.pageBg === "surface"
        ? "bg-card min-h-[80vh]"
        : systemPage?.layout?.pageBg === "muted"
          ? "bg-muted/30 min-h-[80vh]"
          : systemPage?.layout?.pageBg === "gradient"
            ? "bg-gradient-to-b from-background via-muted/20 to-background min-h-[80vh]"
            : undefined;

  return (
    <div className={pageBgClass}>
      {topBlocks.map(renderBlock)}
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-16">
        <Helmet>
          <title>{t("notfound.page.title")}</title>
          <meta name="description" content={t("notfound.page.desc")} />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notfound.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("notfound.subtitle")}</p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("notfound.backHome")}
            </Link>
          </div>
        </div>
      </div>
      {bottomBlocks.map(renderBlock)}
    </div>
  );
}
