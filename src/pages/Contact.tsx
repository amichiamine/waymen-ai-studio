import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Phone, MapPin, MessageCircle, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useContactMessageMutations, useSiteSettings } from "@/data-provider";
import { useI18n } from "@/lib/i18n";

export default function Contact() {
  const [sending, setSending] = useState(false);
  const { data: s } = useSiteSettings();
  const { create: addContactMessage } = useContactMessageMutations();
  const { t } = useI18n();

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

  return (
    <div className="container-page py-12 lg:py-16">
      <Helmet>
        <title>{t("contact.page.title")}</title>
        <meta name="description" content={t("contact.page.desc")} />
        <link rel="canonical" href={`${window.location.origin}/contact`} />
      </Helmet>
      <header className="max-w-3xl mb-10">
        <p className="text-sm font-medium text-primary mb-2">{t("contact.kicker")}</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">{t("contact.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("contact.sub")}</p>
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
