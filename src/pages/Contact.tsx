import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, MessageCircle, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAdminState } from "@/lib/admin-store";

export default function Contact() {
  useEffect(() => { document.title = `Contact — KA Tech`; }, []);
  const [sending, setSending] = useState(false);
  const { siteSettings: s } = useAdminState();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Message reçu ! Nous vous répondrons rapidement.");
    }, 700);
  };

  const phoneDigits = s.contactPhone.replace(/\s+/g, "");

  return (
    <div className="container-page py-12 lg:py-16">
      <header className="max-w-3xl mb-10">
        <p className="text-sm font-medium text-primary mb-2">Contact</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">Nous sommes là pour vous aider</h1>
        <p className="mt-3 text-muted-foreground">Envoyez-nous un message ou contactez-nous directement via les canaux ci-dessous.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <aside className="lg:col-span-1 space-y-4">
          {s.contactPhone && <ContactCard Icon={Phone} title="Téléphone" value={s.contactPhone} href={`tel:${phoneDigits}`} />}
          {s.whatsapp && <ContactCard Icon={MessageCircle} title="WhatsApp" value={`+${s.whatsapp}`} href={`https://wa.me/${s.whatsapp}`} />}
          {s.contactEmail && <ContactCard Icon={Mail} title="E-mail" value={s.contactEmail} href={`mailto:${s.contactEmail}`} />}
          {s.address && <ContactCard Icon={MapPin} title="Adresse" value={s.address} />}
          {s.hours && <ContactCard Icon={Clock} title="Horaires" value={s.hours} />}
        </aside>

        <form onSubmit={onSubmit} className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom complet" name="name" required />
            <Field label="E-mail" name="email" type="email" required />
          </div>
          <Field label="Téléphone" name="phone" type="tel" />
          <Field label="Sujet" name="subject" required />
          <div>
            <label className="block text-sm font-medium mb-1.5">Message</label>
            <textarea name="message" required rows={6} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" disabled={sending} className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
            <Send className="size-4" />
            {sending ? "Envoi en cours..." : "Envoyer le message"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ContactCard({ Icon, title, value, href }: { Icon: typeof Phone; title: string; value: string; href?: string }) {
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

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}{required && <span className="text-primary"> *</span>}</label>
      <input type={type} name={name} required={required} className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}
