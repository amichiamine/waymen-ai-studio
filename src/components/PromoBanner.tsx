import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/data-provider";

const DISMISS_KEY = "katech.promo.dismissed.v1";

export function PromoBanner() {
  // loading inerte en mode mock. En http, on n'affiche rien pendant l'aller-
  // retour : un bandeau vide provoquerait un saut de mise en page à l'arrivée.
  const { data: s, loading } = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  // Signature so re-editing text in admin re-shows the banner.
  const sig = `${s.promoBannerText}|${s.promoBannerLabel}|${s.promoBannerHref}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DISMISS_KEY);
      setDismissed(stored === sig);
    } catch {
      /* noop */
    }
  }, [sig]);

  if (loading || !s.showPromoBanner || !s.promoBannerText || dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, sig);
    } catch {
      /* noop */
    }
    setDismissed(true);
  }

  return (
    <div className="bg-primary/10 border-b border-primary/20 text-foreground text-sm">
      <div className="container-page flex items-center gap-3 py-2">
        <span className="flex-1 truncate">{s.promoBannerText}</span>
        {s.promoBannerHref && s.promoBannerLabel && (
          <Link
            to={s.promoBannerHref}
            className="shrink-0 rounded-md bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold hover:bg-primary/90"
          >
            {s.promoBannerLabel}
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Fermer le bandeau"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
