import { useEffect, useRef, useState } from "react";

/**
 * Ajoute `.is-visible` à un élément quand il entre dans le viewport.
 * Idempotent et respectueux de `prefers-reduced-motion`.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  // Dépendre des champs primitifs évite la boucle si l'appelant passe un objet littéral à chaque rendu.
  const rootMargin = options?.rootMargin ?? "0px 0px -10% 0px";
  const threshold = options?.threshold ?? 0.08;
  const root = options?.root ?? null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        }
      },
      { rootMargin, threshold, root },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold, root]);

  return { ref, visible } as const;
}
