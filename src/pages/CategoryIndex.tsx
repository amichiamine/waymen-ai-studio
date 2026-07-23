import { Helmet } from "react-helmet-async";
import { CategoryCards } from "@/components/CategoryCards";
import { useI18n } from "@/lib/i18n";

export default function CategoryIndex() {
  const { t } = useI18n();
  return (
    <div className="pt-6">
      <Helmet>
        <title>{t("categoryIndex.page.title")}</title>
        <meta name="description" content={t("categoryIndex.page.desc")} />
        <link rel="canonical" href="/category" />
      </Helmet>
      <CategoryCards />
    </div>
  );
}
