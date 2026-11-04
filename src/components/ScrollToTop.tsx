import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Composant de restauration de défilement pour les applications SPA.
 *
 * Dans une SPA avec React Router, naviguer vers une nouvelle route ne réinitialise
 * pas la position du scroll de la fenêtre. Si l'utilisateur clique sur un lien situé
 * en bas de page (ex: Footer), la vue de la page suivante s'ouvrirait en bas.
 *
 * Ce composant écoute les changements d'URL (`pathname`) et repositionne la fenêtre
 * à (0, 0), sauf si une ancre `#hash` explicite est ciblée.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [pathname, hash]);

  return null;
}
