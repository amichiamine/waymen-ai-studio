import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "./Logo";
import {
  useSiteContent,
  useSiteSettings,
  useSubscriberMutations,
  useCategoryList,
} from "@/data-provider";
import { getIcon } from "@/lib/site-content";
import { useI18n, useLocalize } from "@/lib/i18n";

export function Footer() {
  const { data: siteContent } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  const { data: categories } = useCategoryList();
  const f = siteContent.footer;
  const L = useLocalize();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { subscribe } = useSubscriberMutations();

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await subscribe(email, "footer");
      toast.success(t("footer.newsletter.success"));
      setEmail("");
    } catch {
      toast.error(t("footer.newsletter.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="mt-24 border-t border-border bg-card/40 animate-fade-in-up">
      <div className="container-page py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-4">
          <Logo className="h-10 text-foreground" />
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">{L(f.tagline)}</p>

          {/* Coordonnées & Horaires du magasin issus de siteSettings */}
          {(siteSettings.address ||
            siteSettings.contactPhone ||
            siteSettings.contactEmail ||
            siteSettings.hours) && (
            <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/60 max-w-sm">
              {siteSettings.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{siteSettings.address}</span>
                </div>
              )}
              {siteSettings.contactPhone && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Phone className="size-3.5 shrink-0 text-primary" />
                  <a
                    href={`tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {siteSettings.contactPhone}
                  </a>
                  {siteSettings.whatsapp && (
                    <a
                      href={`https://wa.me/${siteSettings.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                    >
                      <MessageCircle className="size-3" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
              {siteSettings.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0 text-primary" />
                  <a
                    href={`mailto:${siteSettings.contactEmail}`}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {siteSettings.contactEmail}
                  </a>
                </div>
              )}
              {siteSettings.hours && (
                <div className="flex items-center gap-2 text-[11px]">
                  <Clock className="size-3.5 shrink-0 text-primary" />
                  <span>{siteSettings.hours}</span>
                </div>
              )}
            </div>
          )}

          {f.socials.length > 0 && (
            <div className="flex gap-2 pt-1">
              {f.socials.map((s) => {
                const Icon = getIcon(s.icon);
                const label = L(s.label) ?? "";
                return (
                  <a
                    key={s.id}
                    href={s.href || "#"}
                    aria-label={label}
                    target={s.href && s.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="size-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
          )}
          <form onSubmit={handleSubscribe} className="pt-3 max-w-sm">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              {t("footer.newsletter.title")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("footer.newsletter.placeholder")}
                  className="w-full h-10 ps-9 pe-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/60"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "..." : t("footer.newsletter.subscribe")}
              </button>
            </div>
          </form>
        </div>
        {f.columns.map((col) => {
          const links =
            col.id === "fc_cats" && categories.length > 0
              ? categories.slice(0, 6).map((c) => ({
                  id: `fl_dyn_${c.slug}`,
                  label: c.label,
                  href: `/category/${c.slug}`,
                }))
              : col.links.filter(
                  (l) => l.href !== "/builder" || siteSettings.builderEnabled !== false,
                );
          return (
            <div key={col.id}>
              <h3 className="text-sm font-semibold text-foreground mb-4">{L(col.title)}</h3>
              <ul className="space-y-2.5 text-sm">
                {links.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={l.href || "/"}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {L(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-4">
          <span>
            {(L(f.copyright) ?? "").replace(
              /\{storeName\}/g,
              siteSettings.storeName?.trim() || "Boutique",
            )}
          </span>
          <div className="flex items-center gap-4">
            <Link to="/track" className="hover:text-primary transition-colors font-medium">
              {t("track.title")}
            </Link>
            <span>·</span>
            <span>{L(f.madeIn)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
