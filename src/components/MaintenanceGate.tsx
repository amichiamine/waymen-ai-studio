import { Link } from "react-router-dom";
import { Wrench, LogIn } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";
import { Logo } from "./Logo";

/**
 * Full-page maintenance screen shown when siteSettings.maintenance is true.
 * The App gate skips this for /admin/* and /auth so operators can still work.
 */
export function MaintenanceScreen() {
  const { siteSettings: s } = useAdminState();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" />
        </div>
        <div>
          <Logo className="h-10 mx-auto text-foreground mb-4" />
          <h1 className="text-2xl font-bold">Site en maintenance</h1>
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
            {s.maintenanceMessage || "Nous revenons très vite."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-sm">
          {s.contactEmail && (
            <a href={`mailto:${s.contactEmail}`} className="text-primary hover:underline">
              {s.contactEmail}
            </a>
          )}
          {s.contactPhone && (
            <a href={`tel:${s.contactPhone.replace(/\s+/g, "")}`} className="text-primary hover:underline">
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
            Espace administrateur
          </Link>
        </div>
      </div>
    </div>
  );
}
