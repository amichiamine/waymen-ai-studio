import { Helmet } from "react-helmet-async";
import { CategoryCards } from "@/components/CategoryCards";
import { useI18n } from "@/lib/i18n";
import { useSiteSettings } from "@/data-provider";

export default function CategoryIndex() {
  const { t } = useI18n();
  const { data: siteSettings } = useSiteSettings();
  const storeName = siteSettings.storeName?.trim() || "StacGate Platform";
  const title = t("categoryIndex.page.title").replace(/KA Tech|StacGate Platform/g, storeName);
  const desc = t("categoryIndex.page.desc").replace(/KA Tech|StacGate Platform/g, storeName);

  return (
    <div className="pt-6">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`${window.location.origin}/category`} />
      </Helmet>
      <CategoryCards />
    </div>
  );
}
