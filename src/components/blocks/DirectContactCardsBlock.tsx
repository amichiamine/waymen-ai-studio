import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { useSiteSettings } from "@/data-provider";
import { useI18n, useLocalize } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

export function DirectContactCardsBlock({ config }: { config: BlockConfig }) {
  const { data: s } = useSiteSettings();
  const { t } = useI18n();
  const L = useLocalize();
  const p = config.props || {};

  const contactPhone = (typeof p.contactPhone === "string" ? p.contactPhone : "") || s.contactPhone;
  const whatsapp = (typeof p.whatsapp === "string" ? p.whatsapp : "") || s.whatsapp;
  const contactEmail = (typeof p.contactEmail === "string" ? p.contactEmail : "") || s.contactEmail;
  const address = (typeof p.address === "string" ? p.address : "") || s.address;
  const hours = (typeof p.hours === "string" ? p.hours : "") || s.hours;

  const phoneDigits = contactPhone ? contactPhone.replace(/\s+/g, "") : "";

  return (
    <section className="container-page py-10 text-start">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contactPhone && (
          <a
            href={`tel:${phoneDigits}`}
            className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs hover:border-primary/40 transition-all group"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("contact.phone")}
              </p>
              <p className="text-base font-bold text-foreground mt-1">{contactPhone}</p>
            </div>
          </a>
        )}

        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs hover:border-emerald-500/40 transition-all group"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                WhatsApp
              </p>
              <p className="text-base font-bold text-foreground mt-1">{whatsapp}</p>
            </div>
          </a>
        )}

        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs hover:border-primary/40 transition-all group"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("contact.email")}
              </p>
              <p className="text-base font-bold text-foreground mt-1 truncate">{contactEmail}</p>
            </div>
          </a>
        )}

        {address && (
          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("contact.address")}
              </p>
              <p className="text-sm font-medium text-foreground mt-1 leading-snug">{address}</p>
            </div>
          </div>
        )}

        {hours && (
          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("contact.hours")}
              </p>
              <p className="text-sm font-medium text-foreground mt-1 leading-snug">{hours}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
