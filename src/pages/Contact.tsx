import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Phone, MapPin, MessageCircle, Send, Clock, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useContactMessageMutations, useSiteSettings, useSiteContent } from "@/data-provider";
import { useI18n, useLocalize } from "@/lib/i18n";
import { getIcon } from "@/lib/site-content";
import { renderBlock } from "@/components/blocks";
import NotFound from "@/pages/NotFound";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Contact() {
  const [sending, setSending] = useState(false);
  const { data: s } = useSiteSettings();
  const { data: siteContent } = useSiteContent();
  const { create: addContactMessage } = useContactMessageMutations();
  const { t } = useI18n();
  const L = useLocalize();
  const storeName = s.storeName && s.storeName.trim() !== "" ? s.storeName : "StacGate Platform";

  const contactSchema = z.object({
    name: z.string().trim().min(2, t("contact.form.name")).max(100),
    email: z.string().trim().email(t("contact.err.invalid")).max(255),
    phone: z.string().trim().max(30).optional(),
    subject: z.string().trim().min(2, t("contact.form.subject")).max(150),
    message: z.string().trim().min(5, t("contact.form.message")).max(2000),
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || "") || undefined,
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("contact.err.invalid"));
      return;
    }
    setSending(true);
    try {
      await addContactMessage(parsed.data);
      form.reset();
      toast.success(t("contact.toast.ok"));
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : t("contact.err.invalid");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const phoneDigits = s.contactPhone.replace(/\s+/g, "");

  const contact = siteContent?.contact;
  const kicker = L(contact?.kicker) || t("contact.kicker");
  const rawTitle = L(contact?.title) || t("contact.title");
  const title = rawTitle
    .replace(/{storeName}/g, storeName)
    .replace(/\bKA Tech\b/g, storeName)
    .replace(/\bStacGate Platform\b/g, storeName);
  const subtitle = L(contact?.subtitle) || t("contact.sub");
  const faqs = contact?.faqs && contact.faqs.length > 0 ? contact.faqs : [];

  const contactCustomPageDef = useMemo(() => {
    return (siteContent?.customPages || []).find((p) => p.slug.toLowerCase() === "contact");
  }, [siteContent?.customPages]);

  // Si la page Contact est explicitement dépubliée depuis le panel admin
  if (contactCustomPageDef && contactCustomPageDef.isPublished === false) {
    return <NotFound />;
  }

  const contactCustomPage =
    contactCustomPageDef?.isPublished !== false ? contactCustomPageDef : undefined;

  // Si la vue composable Contact est configurée, rendre ses blocs dynamiques
  if (
    contactCustomPage &&
    Array.isArray(contactCustomPage.blocks) &&
    contactCustomPage.blocks.length > 0
  ) {
    const enabledBlocks = contactCustomPage.blocks.filter((b) => b.enabled);
    const metaTitle =
      (contactCustomPage.seo?.metaTitle && L(contactCustomPage.seo.metaTitle)) ||
      `${L(contactCustomPage.title) || title} — ${storeName}`;
    const metaDesc =
      (contactCustomPage.seo?.metaDescription && L(contactCustomPage.seo.metaDescription)) ||
      L(contactCustomPage.description) ||
      subtitle;
    const ogImage = contactCustomPage.seo?.ogImage;
    const canonicalUrl = contactCustomPage.seo?.canonicalUrl || `${window.location.origin}/contact`;
    const noIndex = Boolean(contactCustomPage.seo?.noIndex);

    const pageBgClass =
      contactCustomPage.layout?.pageBg === "dark"
        ? "bg-[#0a0f1d] text-white min-h-[80vh]"
        : contactCustomPage.layout?.pageBg === "surface"
          ? "bg-card min-h-[80vh]"
          : contactCustomPage.layout?.pageBg === "muted"
            ? "bg-muted/30 min-h-[80vh]"
            : contactCustomPage.layout?.pageBg === "gradient"
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
        <title>{t("contact.page.title").replace(/KA Tech|StacGate Platform/g, storeName)}</title>
        <meta
          name="description"
          content={t("contact.page.desc").replace(/KA Tech|StacGate Platform/g, storeName)}
        />
        <link rel="canonical" href={`${window.location.origin}/contact`} />
      </Helmet>
      <header className="max-w-3xl mb-10 text-start">
        <p className="text-sm font-medium text-primary mb-2">{kicker}</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-muted-foreground">{subtitle}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <aside className="lg:col-span-1 space-y-4">
          {s.contactPhone && (
            <ContactCard
              Icon={Phone}
              title={t("contact.phone")}
              value={s.contactPhone}
              href={`tel:${phoneDigits}`}
            />
          )}
          {s.whatsapp && (
            <ContactCard
              Icon={MessageCircle}
              title={t("contact.whatsapp")}
              value={`+${s.whatsapp}`}
              href={`https://wa.me/${s.whatsapp}`}
            />
          )}
          {s.contactEmail && (
            <ContactCard
              Icon={Mail}
              title={t("contact.email")}
              value={s.contactEmail}
              href={`mailto:${s.contactEmail}`}
            />
          )}
          {s.address && (
            <ContactCard Icon={MapPin} title={t("contact.address")} value={s.address} />
          )}
          {s.hours && <ContactCard Icon={Clock} title={t("contact.hours")} value={s.hours} />}

          {/* Réseaux sociaux configurés dans le site */}
          {siteContent.footer.socials.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-start">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Nous suivre
              </h3>
              <div className="flex gap-2 flex-wrap">
                {siteContent.footer.socials.map((soc) => {
                  const Icon = getIcon(soc.icon);
                  const label = L(soc.label) ?? "";
                  return (
                    <a
                      key={soc.id}
                      href={soc.href || "#"}
                      aria-label={label}
                      target={soc.href && soc.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="size-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10"
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        <form
          onSubmit={onSubmit}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("contact.form.name")} name="name" required />
            <Field label={t("contact.form.email")} name="email" type="email" required />
          </div>
          <Field label={t("contact.form.phone")} name="phone" type="tel" />
          <Field label={t("contact.form.subject")} name="subject" required />
          <div>
            <label className="block text-sm font-medium mb-1.5 text-start">
              {t("contact.form.message")}
            </label>
            <textarea
              name="message"
              required
              rows={6}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="size-4" />
            {sending ? t("contact.form.sending") : t("contact.form.send")}
          </button>
        </form>
      </div>

      {faqs.length > 0 && (
        <section className="mt-16 max-w-3xl text-start">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <HelpCircle className="size-5" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t("contact.faq.title")}
            </h2>
          </div>
          <Accordion
            type="single"
            collapsible
            className="w-full divide-y divide-border rounded-xl border border-border bg-card px-4"
          >
            {faqs.map((faq, idx) => (
              <AccordionItem
                key={faq.id || idx}
                value={`faq-${faq.id || idx}`}
                className="border-b-0 py-1"
              >
                <AccordionTrigger className="text-start font-medium text-base hover:text-primary transition-colors">
                  {L(faq.question)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line pb-4">
                  {L(faq.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}

function ContactCard({
  Icon,
  title,
  value,
  href,
}: {
  Icon: typeof Phone;
  title: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/60 transition-colors">
      <div className="size-10 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-start">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
