import { MessageCircle } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";
import { Reveal } from "@/components/Reveal";

export function ContactCTA() {
  const { siteSettings, siteContent } = useAdminState();
  const c = siteContent.contactCta;
  return (
    <section className="container-page py-16">
      <Reveal variant="zoom">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 lg:p-12 grid lg:grid-cols-2 gap-8 items-center transition-all duration-500 hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
          <div className="absolute inset-0 -z-0 opacity-40" style={{ background: "var(--gradient-hero)" }} aria-hidden />
          <div className="relative space-y-3">
            <h2 className="text-2xl lg:text-3xl font-bold">{c.title}</h2>
            {c.subtitle && <p className="text-muted-foreground">{c.subtitle}</p>}
          </div>
          <div className="relative flex justify-start lg:justify-end">
            {siteSettings.whatsapp ? (
              <a href={`https://wa.me/${siteSettings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 h-14 px-7 rounded-md bg-success text-background font-semibold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_oklch(0.72_0.17_150/0.6)] active:scale-95">
                <MessageCircle className="size-5 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
                {c.whatsappLabel}
              </a>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

