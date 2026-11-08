import { Helmet } from "react-helmet-async";
import { CategoryCards } from "@/components/CategoryCards";
import { useI18n } from "@/lib/i18n";
import { useSiteSettings, useSiteContent } from "@/data-provider";
import { renderBlock } from "@/components/blocks";
import { cn } from "@/lib/utils";

export default function CategoryIndex({
  suppressCustomBlocks = false,
}: {
  suppressCustomBlocks?: boolean;
} = {}) {
  const { t } = useI18n();
  const { data: siteSettings } = useSiteSettings();
  const { data: siteContent } = useSiteContent();

  const systemPage = siteContent?.customPages?.find(
    (pg) => pg.isSystem && (pg.systemKey === "category" || pg.slug === "category"),
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

  const storeName = siteSettings.storeName?.trim() || "StacGate Platform";
  const title = t("categoryIndex.page.title").replace(/KA Tech|StacGate Platform/g, storeName);
  const desc = t("categoryIndex.page.desc").replace(/KA Tech|StacGate Platform/g, storeName);

  return (
    <div className={cn("min-h-[70vh] pt-6", pageBgClass)}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`${window.location.origin}/category`} />
      </Helmet>
      {topBlocks.map(renderBlock)}
      <CategoryCards />
      {bottomBlocks.map(renderBlock)}
    </div>
  );
}
