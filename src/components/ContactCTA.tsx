import { MessageCircle } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";

export function ContactCTA() {
  const { siteSettings, siteContent } = useAdminState();
  const c = siteContent.contactCta;
  return (
    <section className="container-page py-16">
      <div className="rounded-2xl border border-border bg-card p-8 lg:p-12 grid lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-3">
          <h2 className="text-2xl lg:text-3xl font-bold">{c.title}</h2>
          {c.subtitle && <p className="text-muted-foreground">{c.subtitle}</p>}
        </div>
        <div className="flex justify-start lg:justify-end">
          {siteSettings.whatsapp ? (
            <a href={`https://wa.me/${siteSettings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 h-14 px-7 rounded-md bg-success text-background font-semibold hover:opacity-90 transition-opacity">
              <MessageCircle className="size-5" />
              {c.whatsappLabel}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
