import { Link } from "react-router-dom";
import { Wrench, LogIn } from "lucide-react";
import { useSiteSettings } from "@/data-provider";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./Logo";

/**
 * Full-page maintenance screen shown when siteSettings.maintenance is true.
 * The App gate skips this for /admin/* and /auth so operators can still work.
 *
 * Cas `loading` en mode http : si les réglages ne sont pas encore chargés,
 * on retourne null et on laisse passer le reste de l'application. Afficher
 * « site en maintenance » pendant un aller-retour réseau serait pire que
 * le mal — le visiteur verrait un écran de maintenance pour un site
 * parfaitement fonctionnel. En mode mock, loading vaut false dès le premier
 * rendu : ce comportement est complètement inerte.
 */
export function MaintenanceScreen() {
  const { data: s, loading } = useSiteSettings();
  const { t } = useI18n();

  // On laisse passer tant que les réglages ne sont pas encore connus.
  // Voir commentaire de fonction ci-dessus.
  if (loading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" />
        </div>
        <div>
          <Logo className="h-10 mx-auto text-foreground mb-4" />
          <h1 className="text-2xl font-bold">{t("maintenance.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
            {s.maintenanceMessage || t("maintenance.message")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm">
          {s.contactEmail && (
            <a href={`mailto:${s.contactEmail}`} className="text-primary hover:underline">
              {s.contactEmail}
            </a>
          )}
          {s.contactPhone && (
            <a
              href={`tel:${s.contactPhone.replace(/\s+/g, "")}`}
              className="text-primary hover:underline"
            >
              {s.contactPhone}
            </a>
          )}
        </div>
        <div className="pt-2">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogIn className="size-3.5" />
            {t("maintenance.admin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
