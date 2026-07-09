import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Applique un fondu doux à chaque changement de route en re-keyant le conteneur.
 * Aucun overhead, aucune dépendance externe.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-in">
      {children}
    </div>
  );
}
