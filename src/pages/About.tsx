import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Truck, Headphones, Award, Star, Heart, AlertTriangle } from "lucide-react";
import archisysBannerSrc from "@/assets/stacgate-archisys-banner.webp";
import { useAboutValueList, useSiteSettings, useSiteContent } from "@/data-provider";
import type { AboutValue } from "@/lib/admin-store";
import { useI18n, useLocalize } from "@/lib/i18n";

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
      : "StacGate Platform";

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

      {/* Sceau d'Architecture R&D & Conception */}
      <section className="mb-14 overflow-hidden rounded-2xl border border-primary/20 bg-card/60 shadow-lg backdrop-blur-sm">
        <div className="grid gap-6 lg:grid-cols-12 items-center p-6 lg:p-8">
          <div className="lg:col-span-7 space-y-3 text-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span>🛡️ Architecture &amp; R&amp;D Certifiées</span>
            </div>
            <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              Conception &amp; Direction Technique
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              La plateforme repose sur une architecture moderne conçue et validée sous la direction
              de <strong className="text-foreground">ArchiSys3.0</strong>, garantissant souveraineté
              des données, haute disponibilité, résilience transactionnelle et performances
              d'exécution instantanées.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <img
              src={archisysBannerSrc}
              alt="StacGate Platform — Conçu et Validé par ArchiSys3.0"
              className="max-h-48 w-auto rounded-xl border border-border/80 object-cover shadow-md transition-transform hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        </div>
      </section>

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
