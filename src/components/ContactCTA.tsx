import { Link } from "react-router-dom";
import { MessageCircle, ArrowRight, Sparkles } from "lucide-react";
import { useSiteContent, useSiteSettings } from "@/data-provider";
import { Reveal } from "@/components/Reveal";
import { useLocalize } from "@/lib/i18n";

import type { SiteContent } from "@/lib/site-content";

export function ContactCTA({ override }: { override?: Partial<SiteContent["contactCta"]> } = {}) {
  const { data: siteSettings } = useSiteSettings();
  const { data: siteContent } = useSiteContent();
  const c = override ? { ...siteContent.contactCta, ...override } : siteContent.contactCta;
  const L = useLocalize();

  const buttonLabel = c.buttonText ? L(c.buttonText) : "";
  const buttonHref = c.buttonHref || "/contact";
  const badgeText = c.badge ? L(c.badge) : "";

  return (
    <section className="container-page py-16">
      <Reveal variant="zoom">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 lg:p-12 grid lg:grid-cols-2 gap-8 items-center transition-all duration-500 hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
          <div
            className="absolute inset-0 -z-0 opacity-40"
            style={{ background: "var(--gradient-hero)" }}
            aria-hidden
          />
          <div className="relative space-y-3">
            {badgeText && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                <Sparkles className="size-3.5" /> {badgeText}
              </span>
            )}
            <h2 className="text-2xl lg:text-3xl font-bold">{L(c.title)}</h2>
            {c.subtitle && <p className="text-muted-foreground">{L(c.subtitle)}</p>}
          </div>
          <div className="relative flex flex-wrap items-center justify-start lg:justify-end gap-3.5">
            {buttonLabel && (
              <Link
                to={buttonHref}
                className="group inline-flex items-center gap-2.5 h-14 px-7 rounded-md bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] active:scale-95 shadow-[var(--shadow-glow)]"
              >
                <span>{buttonLabel}</span>
                <ArrowRight className="size-4 rtl:rotate-180 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
            )}
            {siteSettings.whatsapp ? (
              <a
                href={`https://wa.me/${siteSettings.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 h-14 px-7 rounded-md bg-success text-background font-semibold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_oklch(0.72_0.17_150/0.6)] active:scale-95"
              >
                <MessageCircle className="size-5 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
                {L(c.whatsappLabel)}
              </a>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
