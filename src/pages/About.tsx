import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Truck, Headphones, Award, Star, Heart, AlertTriangle } from "lucide-react";
import { useAboutValueList } from "@/data-provider";
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
  const { data: aboutValues, loading, error } = useAboutValueList();
  const { t } = useI18n();
  const L = useLocalize();

  return (
    <div className="container-page py-12 lg:py-16">
      <Helmet>
        <title>{t("about.page.title")}</title>
        <meta name="description" content={t("about.page.desc")} />
        <link rel="canonical" href={`${window.location.origin}/about`} />
      </Helmet>
      <header className="max-w-3xl mb-12">
        <p className="text-sm font-medium text-primary mb-2">{t("about.kicker")}</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">{t("about.title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("about.intro")}</p>
      </header>

      <section className="grid gap-10 lg:grid-cols-2 mb-16">
        <div>
          <h2 className="text-2xl font-bold mb-3">{t("about.history.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("about.history.body")}</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-3">{t("about.mission.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("about.mission.body")}</p>
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
          {aboutValues.length > 0 && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
              {aboutValues.map((v) => {
                const Icon = ICONS[v.icon] ?? Award;
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
        <h2 className="text-2xl lg:text-3xl font-bold mb-3">{t("about.cta.title")}</h2>
        <p className="text-muted-foreground mb-6">{t("about.cta.sub")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/category"
            className="inline-flex items-center h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
          >
            {t("about.cta.browse")}
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center h-11 px-6 rounded-md border border-border text-sm font-semibold hover:bg-card"
          >
            {t("about.cta.contact")}
          </Link>
        </div>
      </section>
    </div>
  );
}
