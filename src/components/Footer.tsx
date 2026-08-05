import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { useAdminState, addSubscriber } from "@/lib/admin-store";
import { getIcon } from "@/lib/site-content";
import { useLocalize } from "@/lib/i18n";

export function Footer() {
  const { siteContent } = useAdminState();
  const f = siteContent.footer;
  const L = useLocalize();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = addSubscriber(email, "footer");
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error || "Inscription impossible");
      return;
    }
    toast.success("Merci pour votre inscription !");
    setEmail("");
  }
  return (
    <footer className="mt-24 border-t border-border bg-card/40 animate-fade-in-up">
      <div className="container-page py-14 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2 space-y-4">
          <Logo className="h-10 text-foreground" />
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">{L(f.tagline)}</p>
          {f.socials.length > 0 && (
            <div className="flex gap-2">
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
                    className="size-10 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
          )}
          <form onSubmit={subscribe} className="pt-3 max-w-sm">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              Newsletter
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full h-10 ps-9 pe-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/60"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "..." : "S'inscrire"}
              </button>
            </div>
          </form>
        </div>
        {f.columns.map((col) => (
          <div key={col.id}>
            <h3 className="text-sm font-semibold text-foreground mb-4">{L(col.title)}</h3>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((l) => (
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
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>{L(f.copyright)}</span>
          <span>{L(f.madeIn)}</span>
        </div>
      </div>
    </footer>
  );
}
