import { Suspense, type ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  AdminSidebar,
  AdminMobileNav,
  AdminBreadcrumbs,
  AdminRoleSwitcher,
  AdminNotificationBell,
} from "@/components/admin/AdminLayout";

/**
 * Cadre visuel du back-office : barre latérale, navigation mobile, fil d'Ariane,
 * sélecteur de rôle et cloche de notifications.
 *
 * Ce module est volontairement isolé de `App.tsx` et chargé paresseusement :
 * il tire `ui/sidebar` et plusieurs primitives Radix (select, dropdown-menu,
 * popover, tooltip, sheet, separator) qui n'ont rien à faire dans le bundle
 * servi au visiteur de la boutique.
 *
 * Il ne contient AUCUNE garde d'authentification : celle-ci reste dans
 * `App.tsx`, en amont du `React.lazy`, pour qu'un visiteur sans rôle admin ne
 * télécharge jamais ce chunk.
 */
export default function AdminShell({ pageFallback }: { pageFallback: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-card/50 px-3 lg:px-8">
          <AdminMobileNav />
          <AdminBreadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            <AdminRoleSwitcher />
            <AdminNotificationBell />
            <Link to="/" className="text-sm text-primary hover:underline">
              ← Boutique
            </Link>
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
    </div>
  );
}
