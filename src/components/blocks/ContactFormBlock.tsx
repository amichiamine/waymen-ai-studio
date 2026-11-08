import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useContactMessageMutations } from "@/data-provider";
import { useI18n, useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

export function ContactFormBlock({ config }: { config: BlockConfig }) {
  const [sending, setSending] = useState(false);
  const { create: addContactMessage } = useContactMessageMutations();
  const { t } = useI18n();
  const L = useLocalize();
  const p = config.props || {};

  const title =
    (typeof p.title === "string" ? p.title : L(p.title as Localized<string> | undefined)) ||
    t("contact.form.title") ||
    "Envoyez-nous un message";
  const subtitle =
    (typeof p.subtitle === "string"
      ? p.subtitle
      : L(p.subtitle as Localized<string> | undefined)) ||
    t("contact.form.subtitle") ||
    "Une question, un devis ou un projet ? Remplissez ce formulaire et nous vous répondrons dans les plus brefs délais.";

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

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="max-w-2xl mx-auto rounded-3xl border border-border/60 bg-card/60 p-8 md:p-12 shadow-sm">
        <div className="mb-8 text-center md:text-start">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-muted-foreground text-sm sm:text-base">{subtitle}</p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_name">{t("contact.form.name")}</Label>
              <Input
                id="contact_name"
                name="name"
                required
                placeholder={t("contact.form.placeholder.name") || "Votre nom complet"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">{t("contact.form.email")}</Label>
              <Input
                id="contact_email"
                name="email"
                type="email"
                required
                placeholder="nom@exemple.com"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">{t("contact.form.phone")}</Label>
              <Input id="contact_phone" name="phone" placeholder="05 XX XX XX XX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_subject">{t("contact.form.subject")}</Label>
              <Input
                id="contact_subject"
                name="subject"
                required
                placeholder={t("contact.form.placeholder.subject") || "Objet de votre demande"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_message">{t("contact.form.message")}</Label>
            <Textarea
              id="contact_message"
              name="message"
              required
              rows={5}
              placeholder={
                t("contact.form.placeholder.message") ||
                "Détaillez votre projet ou votre question..."
              }
            />
          </div>

          <Button
            type="submit"
            disabled={sending}
            className="w-full sm:w-auto font-semibold gap-2 shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span>
              {sending
                ? t("common.sending") || "Envoi en cours..."
                : t("contact.form.send") || "Envoyer le message"}
            </span>
          </Button>
        </form>
      </div>
    </section>
  );
}
