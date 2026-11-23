import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Truck, Headphones, Award, Star, Heart, AlertTriangle } from "lucide-react";
import { useAboutValueList, useSiteSettings, useSiteContent } from "@/data-provider";
import type { AboutValue } from "@/lib/admin-store";
import { useI18n, useLocalize } from "@/lib/i18n";
import { renderBlock } from "@/components/blocks";
import NotFound from "@/pages/NotFound";

const ICONS: Record<AboutValue["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck,
  truck: Truck,
  headphones: Headphones,
  award: Award,
  star: Star,
  heart: Heart,
};

export default function About() {
  const { data: aboutValues, loading: loadingValues, error } = useAboutValueList();
  const { data: siteSettings } = useSiteSettings();
  const { data: siteContent, loading: loadingContent } = useSiteContent();
  const { t } = useI18n();
  const L = useLocalize();
  const storeName =
    siteSettings.storeName && siteSettings.storeName.trim() !== ""
      ? siteSettings.storeName
      : "WaYmen AI Studio";

  const about = siteContent?.about;

  const kicker = L(about?.kicker) || t("about.kicker");
  const rawTitle = L(about?.title) || t("about.title");
  const title = rawTitle
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);

  const rawIntro = L(about?.intro) || t("about.intro");
  const intro = rawIntro
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);

  const historyTitle = L(about?.historyTitle) || t("about.history.title");
  const rawHistoryBody = L(about?.historyBody) || t("about.history.body");
  const historyBody = rawHistoryBody
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);

  const missionTitle = L(about?.missionTitle) || t("about.mission.title");
  const rawMissionBody = L(about?.missionBody) || t("about.mission.body");
  const missionBody = rawMissionBody
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);

  const ctaTitle = (L(about?.ctaTitle) || t("about.cta.title")).replace(
    /{storeName}|\bKA Tech\b|\bStacGate Platform\b/g,
    storeName,
  );
  const ctaSub = (L(about?.ctaSubtitle) || t("about.cta.sub")).replace(
    /{storeName}|\bKA Tech\b|\bStacGate Platform\b/g,
    storeName,
  );
  const ctaBrowse = L(about?.ctaBrowseLabel) || t("about.cta.browse");
  const ctaContact = L(about?.ctaContactLabel) || t("about.cta.contact");

  // Les valeurs : si définies dans siteContent.about.values on les utilise, sinon repli sur aboutValues
  const displayedValues = about?.values && about.values.length > 0 ? about.values : aboutValues;
  const loading = loadingValues && loadingContent;

  const aboutCustomPageDef = useMemo(() => {
    return (siteContent?.customPages || []).find((p) => p.slug.toLowerCase() === "about");
  }, [siteContent?.customPages]);

  // Si la page À propos est explicitement dépubliée depuis le panel admin
  if (aboutCustomPageDef && aboutCustomPageDef.isPublished === false) {
    return <NotFound />;
  }

  const aboutCustomPage =
    aboutCustomPageDef?.isPublished !== false ? aboutCustomPageDef : undefined;

  // Si la vue composable À propos est configurée, rendre ses blocs dynamiques
  if (
    aboutCustomPage &&
    Array.isArray(aboutCustomPage.blocks) &&
    aboutCustomPage.blocks.length > 0
  ) {
    const enabledBlocks = aboutCustomPage.blocks.filter((b) => b.enabled);
    const metaTitle =
      (aboutCustomPage.seo?.metaTitle && L(aboutCustomPage.seo.metaTitle)) ||
      `${L(aboutCustomPage.title) || title} — ${storeName}`;
    const metaDesc =
      (aboutCustomPage.seo?.metaDescription && L(aboutCustomPage.seo.metaDescription)) ||
      L(aboutCustomPage.description) ||
      intro;
    const ogImage = aboutCustomPage.seo?.ogImage;
    const canonicalUrl = aboutCustomPage.seo?.canonicalUrl || `${window.location.origin}/about`;
    const noIndex = Boolean(aboutCustomPage.seo?.noIndex);

    const pageBgClass =
      aboutCustomPage.layout?.pageBg === "dark"
        ? "bg-[#0a0f1d] text-white min-h-[80vh]"
        : aboutCustomPage.layout?.pageBg === "surface"
          ? "bg-card min-h-[80vh]"
          : aboutCustomPage.layout?.pageBg === "muted"
            ? "bg-muted/30 min-h-[80vh]"
            : aboutCustomPage.layout?.pageBg === "gradient"
              ? "bg-gradient-to-b from-background via-muted/20 to-background min-h-[80vh]"
              : "min-h-[80vh]";

    return (
      <div className={pageBgClass}>
        <Helmet>
          <title>{metaTitle}</title>
          <meta name="description" content={metaDesc} />
          {ogImage && <meta property="og:image" content={ogImage} />}
          <link rel="canonical" href={canonicalUrl} />
          {noIndex && <meta name="robots" content="noindex, nofollow" />}
        </Helmet>
        <div className="flex flex-col space-y-2">
          {enabledBlocks.map((block) => renderBlock(block))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12 lg:py-16">
      <Helmet>
        <title>{t("about.page.title").replace(/KA Tech|StacGate Platform/g, storeName)}</title>
        <meta
          name="description"
          content={t("about.page.desc").replace(/KA Tech|StacGate Platform/g, storeName)}
        />
        <link rel="canonical" href={`${window.location.origin}/about`} />
      </Helmet>
      <header className="max-w-3xl mb-12 text-start">
        <p className="text-sm font-medium text-primary mb-2">{kicker}</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{intro}</p>
      </header>

      <section className="grid gap-10 lg:grid-cols-2 mb-16 text-start">
        <div>
          <h2 className="text-2xl font-bold mb-3">{historyTitle}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{historyBody}</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-3">{missionTitle}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{missionBody}</p>
        </div>
      </section>

      {/* 1. Chargement */}
      {loading ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12" aria-busy="true">
          <span className="sr-only">{t("app.loading")}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </section>
      ) : (
        <>
          {/* 2. Erreur */}
          {error && (
            <p
              role="status"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error.message}
            </p>
          )}

          {/* 3. Contenu (l'état vide est visuellement neutre : la section est omise) */}
          {displayedValues.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
              {displayedValues.map((v) => {
                const Icon = ICONS[v.icon as keyof typeof ICONS] ?? Award;
                return (
                  <div key={v.id} className="rounded-xl border border-border bg-card p-6">
                    <Icon className="size-8 text-primary mb-3" />
                    <h3 className="font-bold text-lg mb-1">
                      {(L(v.title as never) as unknown as string) ?? ""}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(L(v.description as never) as unknown as string) ?? ""}
                    </p>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border border-border bg-card p-8 lg:p-12 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold mb-3">{ctaTitle}</h2>
        <p className="text-muted-foreground mb-6">{ctaSub}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/category"
            className="inline-flex items-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
          >
            {ctaBrowse}
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center h-11 px-6 rounded-md border border-border text-sm font-semibold hover:bg-card"
          >
            {ctaContact}
          </Link>
        </div>
      </section>
    </div>
  );
}
