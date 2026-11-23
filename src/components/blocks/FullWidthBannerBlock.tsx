import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { Button } from "@/components/ui/button";
import { resoudreUrlMedia } from "@/components/media-url";

export function FullWidthBannerBlock({ config }: { config: BlockConfig }) {
  const L = useLocalize();
  const p = config.props || {};

  const title = p.title
    ? String(L(p.title as Localized<string>) || "")
    : String(
        L({
          fr: "Construisez votre Écosystème Haute Performance avec StacGate",
          en: "Build Your High Performance Ecosystem with StacGate",
          ar: "ابنِ بنيتك الرقمية عالية الأداء مع StacGate",
        }) || "",
      );

  const subtitle = p.subtitle
    ? String(L(p.subtitle as Localized<string>) || "")
    : String(
        L({
          fr: "Une solution technologique souveraine, composable et modulaire conçue pour l'excellence et la longévité.",
          en: "A sovereign, composable and modular technological solution designed for excellence and longevity.",
          ar: "حل برمجي سيادي وتكاملي مصمم لتحقيق أعلى معايير الجودة والاستدامة.",
        }) || "",
      );

  const rawBannerSrc =
    typeof p.bannerSrc === "string" && p.bannerSrc ? p.bannerSrc : "/media/waymen-og-banner.webp";
  const bannerSrc = resoudreUrlMedia(rawBannerSrc);

  const height = p.height || "normal";
  const heightClass =
    height === "compact"
      ? "min-h-[280px] md:min-h-[340px]"
      : height === "ample"
        ? "min-h-[460px] md:min-h-[560px]"
        : "min-h-[360px] md:min-h-[440px]";

  const primaryCtaText = p.primaryCtaText
    ? String(L(p.primaryCtaText as Localized<string>) || "")
    : String(
        L({ fr: "Découvrir la Plateforme", en: "Discover Platform", ar: "استكشف المنصة" }) || "",
      );
  const primaryCtaLink = typeof p.primaryCtaLink === "string" ? p.primaryCtaLink : "/catalogue";

  const secondaryCtaText = p.secondaryCtaText
    ? String(L(p.secondaryCtaText as Localized<string>) || "")
    : "";
  const secondaryCtaLink = typeof p.secondaryCtaLink === "string" ? p.secondaryCtaLink : "/contact";

  return (
    <section className="container-page py-6 md:py-10">
      <div
        className={`relative overflow-hidden rounded-3xl border border-border/80 shadow-xl flex items-center justify-center ${heightClass}`}
      >
        {/* Background Image */}
        <img
          src={bannerSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
        />

        {/* Gradient Overlay for high readability */}
        <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/85 to-background/70 dark:from-background/95 dark:via-background/90 dark:to-background/80 backdrop-blur-2xs" />

        {/* Content */}
        <div className="relative z-10 max-w-3xl p-6 sm:p-10 md:p-14 text-center mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-5 shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {L({
                fr: "Architecture Souveraine",
                en: "Sovereign Architecture",
                ar: "بنية سيادية",
              })}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            {title}
          </h2>

          <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mb-8">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {primaryCtaText && (
              <Button asChild size="lg" className="rounded-xl px-6 font-semibold shadow-md">
                <Link to={primaryCtaLink} className="flex items-center gap-2">
                  <span>{primaryCtaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {secondaryCtaText && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl px-6 font-semibold backdrop-blur-xs"
              >
                <Link to={secondaryCtaLink}>{secondaryCtaText}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
