import { Link } from "react-router-dom";
import { Facebook, Instagram, MessageCircle, Music2 } from "lucide-react";
import { Logo } from "./Logo";
import { useI18n, type TKey } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border bg-card/40 animate-fade-in-up">
      <div className="container-page py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-4">
          <Logo className="h-10 text-foreground" />
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            {t("footer.tagline")}
          </p>
          <div className="flex gap-2">
            {[Facebook, Instagram, MessageCircle, Music2].map((Icon, i) => (
              <a key={i} href="#" aria-label="social" className="size-10 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <FCol title={t("footer.quick")} links={[
          { to: "/", key: "nav.home" },
          { to: "/builder", key: "nav.builder" },
          { to: "/category/laptops", key: "footer.deals" },
        ]} />
        <FCol title={t("footer.categories")} links={[
          { to: "/category/laptops", key: "nav.laptops" },
          { to: "/category/desktops", key: "nav.desktops" },
          { to: "/category/builds", key: "nav.builds" },
          { to: "/category/phones", key: "nav.phones" },
        ]} />
        <FCol title={t("footer.support")} links={[
          { to: "/contact", key: "footer.contact" },
          { to: "/about", key: "footer.warranty" },
          { to: "/about", key: "footer.shipping" },
          { to: "/about", key: "footer.faq" },
        ]} />
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>{t("footer.copy")}</span>
          <span>{t("footer.made")}</span>
        </div>
      </div>
    </footer>
  );
}

function FCol({ title, links }: { title: string; links: { to: string; key: TKey }[] }) {
  const { t } = useI18n();
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.key}>
            <Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{t(l.key)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
