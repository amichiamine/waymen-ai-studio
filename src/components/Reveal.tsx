import { type ReactNode, type ElementType, type CSSProperties } from "react";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type Variant = "up" | "down" | "left" | "right" | "fade" | "zoom";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  variant?: Variant;
  delay?: number; // ms
  className?: string;
  style?: CSSProperties;
}

/**
 * Wrapper qui révèle son contenu au scroll grâce à IntersectionObserver.
 * Utilise les classes utilitaires `.reveal` définies dans styles.css.
 */
export function Reveal({
  children,
  as: Tag = "div",
  variant = "up",
  delay = 0,
  className,
  style,
}: RevealProps) {
  const { ref } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      className={cn("reveal", `reveal-${variant}`, className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </Tag>
  );
}
