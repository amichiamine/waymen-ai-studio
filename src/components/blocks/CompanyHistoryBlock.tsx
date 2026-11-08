import { useSiteContent, useSiteSettings } from "@/data-provider";
import { useI18n, useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

export function CompanyHistoryBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  const { t } = useI18n();
  const L = useLocalize();
  const storeName = siteSettings.storeName?.trim() || "StacGate Platform";

  const p = config.props || {};
  const about = siteContent?.about;

  const getPropText = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return L(val as Localized<string>) || "";
    return "";
  };

  const historyTitle =
    getPropText(p.historyTitle) || L(about?.historyTitle) || t("about.history.title");
  const rawHistoryBody =
    getPropText(p.historyBody) || L(about?.historyBody) || t("about.history.body");
  const historyBody = rawHistoryBody
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);

  const missionTitle =
    getPropText(p.missionTitle) || L(about?.missionTitle) || t("about.mission.title");
  const rawMissionBody =
    getPropText(p.missionBody) || L(about?.missionBody) || t("about.mission.body");
  const missionBody = rawMissionBody
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="grid gap-10 lg:grid-cols-2 rounded-3xl border border-border/60 bg-card/40 p-8 md:p-12 shadow-xs">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">{historyTitle}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-base">
            {historyBody}
          </p>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">{missionTitle}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-base">
            {missionBody}
          </p>
        </div>
      </div>
    </section>
  );
}
