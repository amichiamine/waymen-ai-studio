import { Suspense, useState, useEffect, type ReactNode } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, useNamespace } from "@/lib/i18n";
import { useSiteSettings } from "@/data-provider";
import { SetupWizard } from "@/components/admin/SetupWizard";
import {
  AdminSidebar,
  AdminMobileNav,
  AdminBreadcrumbs,
  AdminRoleSwitcher,
  AdminNotificationBell,
  AdminUserMenu,
} from "@/components/admin/AdminLayout";

/**
 * Cadre visuel du back-office : barre latérale, navigation mobile, fil d'Ariane,
 * sélecteur de rôle, cloche de notifications et assistant de configuration (Setup Wizard).
 *
 * Ce module est volontairement isolé de `App.tsx` et chargé paresseusement :
 * il tire `ui/sidebar` et plusieurs primitives Radix (select, dropdown-menu,
 * popover, tooltip, sheet, separator) qui n'ont rien à faire dans le bundle
 * servi au visiteur de la boutique.
 *
 * Il ne contient AUCUNE garde d'authentification : celle-ci reste dans
 * `App.tsx`, en amont du `React.lazy`, pour qu'un visiteur sans rôle admin ne
 * télécharge jamais ce chunk.
 *
 * C'est aussi le SEUL endroit qui réclame l'espace de noms de traduction
 * `admin` : les ~800 chaînes du back-office sont hors du bundle du visiteur
 * (voir l'intention détaillée dans `src/lib/i18n.tsx` et la convention dans
 * `src/lib/i18n/admin/index.ts`). Les pages, elles, n'appellent que `t()`.
 */
export default function AdminShell({ pageFallback }: { pageFallback: ReactNode }) {
  const { t } = useI18n();
  const { ready } = useNamespace("admin");
  const { data: siteSettings } = useSiteSettings();
  const [searchParams] = useSearchParams();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {
        // Ignorer les erreurs d'écriture de stockage privé
      }
      return next;
    });
  };

  useEffect(() => {
    if (siteSettings && siteSettings.onboardingCompleted === false) {
      setWizardOpen(true);
    }
  }, [siteSettings]);

  useEffect(() => {
    if (searchParams.get("wizard") === "1" || searchParams.get("setup") === "1") {
      setWizardOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = () => setWizardOpen(true);
    window.addEventListener("open-setup-wizard", handler);
    return () => window.removeEventListener("open-setup-wizard", handler);
  }, []);

  // Tant que le dictionnaire admin n'est pas là, on n'affiche RIEN du
  // back-office : même raisonnement que `dictionaryReady` dans le provider, un
  // écran d'attente d'une fraction de seconde vaut mieux qu'un flash de clés
  // brutes (« admin.socle.navigation.lien_produits ») dans la barre latérale.
  // Le texte d'attente vient du dictionnaire principal, déjà chargé.
  if (!ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
        aria-busy="true"
      >
        {t("app.loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border/60 bg-card/50 px-3 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex size-8 text-muted-foreground hover:text-foreground shrink-0"
            title={sidebarCollapsed ? "Déplier le menu backstage" : "Replier le menu backstage"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
          <AdminMobileNav />
          <AdminBreadcrumbs />
          <div className="ms-auto flex items-center gap-2">
            <AdminRoleSwitcher />
            <AdminNotificationBell />
            <AdminUserMenu />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          {/* Suspense local : le chargement d'un écran admin ne doit pas faire
              disparaître la barre latérale ni l'en-tête du back-office. */}
          <Suspense fallback={pageFallback}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <SetupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
