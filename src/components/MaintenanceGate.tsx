import { Link } from "react-router-dom";
import { Wrench, LogIn, Clock, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { useSiteSettings } from "@/data-provider";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./Logo";
import { Badge } from "@/components/ui/badge";

/**
 * Full-page maintenance screen shown when siteSettings.maintenance is true.
 * The App gate skips this for /admin/* and /auth so operators can still work.
 *
 * Vitrine de maintenance enrichie VIP :
 *  - Titre et message éditorial personnalisés
 *  - Date/heure estimée de réouverture (badge)
 *  - Bouton de discussion WhatsApp direct
 *  - Coordonnées de contact complètes
 *  - Bouton d'accès administrateur pointant directement vers /admin (0 boucle)
 */
export function MaintenanceScreen() {
  const { data: s, loading } = useSiteSettings();
  const { t } = useI18n();

  if (loading) return null;

  const rawWhatsApp = (s.whatsapp || s.contactPhone || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Halo d'ambiance d'arrière-plan */}
      <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-7 relative z-10 bg-card/60 backdrop-blur-md p-6 sm:p-10 rounded-2xl border border-border/80 shadow-2xl">
        {/* En-tête avec Logo et Icône */}
        <div className="space-y-4">
          <Logo className="h-11 mx-auto text-foreground" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/20 shadow-inner">
            <Wrench className="h-7 w-7" />
          </div>
        </div>

        {/* Titre & Message */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {s.maintenanceTitle?.trim() || t("maintenance.title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed max-w-md mx-auto">
            {s.maintenanceMessage || t("maintenance.message")}
          </p>
        </div>

        {/* Date de retour estimée */}
        {s.maintenanceEstimatedReturn?.trim() && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs sm:text-sm font-medium">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Réouverture estimée : {s.maintenanceEstimatedReturn}</span>
          </div>
        )}

        {/* Actions directes : WhatsApp & Contacts */}
        <div className="space-y-4 pt-2">
          {s.maintenanceShowWhatsApp && rawWhatsApp && (
            <div className="flex justify-center">
              <a
                href={`https://wa.me/${rawWhatsApp}?text=${encodeURIComponent(
                  `Bonjour ${s.storeName || ""}, je vous contacte depuis votre boutique en ligne.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20ba59] font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <MessageCircle className="h-4 w-4 shrink-0 fill-current" />
                <span>Discuter avec nous sur WhatsApp</span>
              </a>
            </div>
          )}

          {/* Coordonnées */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-muted-foreground pt-1">
            {s.contactEmail && (
              <a
                href={`mailto:${s.contactEmail}`}
                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>{s.contactEmail}</span>
              </a>
            )}
            {s.contactPhone && (
              <a
                href={`tel:${s.contactPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>{s.contactPhone}</span>
              </a>
            )}
            {s.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[200px]">{s.address}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bouton Espace Administrateur débloqué */}
        <div className="pt-4 border-t border-border/40">
          <Link
            to="/admin"
            state={{ from: { pathname: "/admin" } }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
          >
            <LogIn className="size-3.5" />
            <span>{t("maintenance.admin")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
