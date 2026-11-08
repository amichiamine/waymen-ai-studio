import React from "react";
import type { BlockConfig } from "@/types/pages";
import { cn } from "@/lib/utils";

interface BlockWrapperProps {
  config: BlockConfig;
  children?: React.ReactNode;
  className?: string;
}

export function BlockWrapper({ config, children, className }: BlockWrapperProps) {
  const style = config.style;

  if (!style) {
    return <div className={cn("w-full transition-all duration-200", className)}>{children}</div>;
  }

  const paddingClass =
    style.padding === "compact"
      ? "py-4 md:py-6"
      : style.padding === "ample"
        ? "py-16 md:py-24"
        : style.padding === "normal"
          ? "py-8 md:py-12"
          : "";

  const bgClass =
    style.bg === "surface"
      ? "bg-card border-y border-border/40"
      : style.bg === "muted"
        ? "bg-muted/30 border-y border-border/40"
        : style.bg === "accent"
          ? "bg-primary/5 border-y border-primary/20"
          : style.bg === "dark"
            ? "bg-[#0f172a] text-white"
            : style.bg === "transparent"
              ? "bg-transparent"
              : "";

  const alignClass =
    style.align === "center" ? "text-center" : style.align === "start" ? "text-start" : "";

  const visibilityClass = cn(
    style.hideOnMobile && "hidden md:block",
    style.hideOnDesktop && "md:hidden",
  );

  return (
    <div
      data-block-id={config.id}
      data-block-type={config.type}
      className={cn(
        "w-full transition-all duration-200",
        paddingClass,
        bgClass,
        alignClass,
        visibilityClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
