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

  const roundedClass =
    style.borderRadius === "none"
      ? "rounded-none"
      : style.borderRadius === "sm"
        ? "rounded-sm"
        : style.borderRadius === "md"
          ? "rounded-md"
          : style.borderRadius === "lg"
            ? "rounded-lg"
            : style.borderRadius === "xl"
              ? "rounded-xl"
              : style.borderRadius === "2xl"
                ? "rounded-2xl"
                : style.borderRadius === "3xl"
                  ? "rounded-3xl"
                  : style.borderRadius === "full"
                    ? "rounded-full"
                    : "";

  const shadowClass =
    style.shadow === "none"
      ? "shadow-none"
      : style.shadow === "xs"
        ? "shadow-xs"
        : style.shadow === "sm"
          ? "shadow-sm"
          : style.shadow === "md"
            ? "shadow-md"
            : style.shadow === "lg"
              ? "shadow-lg"
              : style.shadow === "xl"
                ? "shadow-xl"
                : style.shadow === "accent"
                  ? "shadow-xl shadow-primary/10"
                  : "";

  const borderClass =
    style.border === "none"
      ? ""
      : style.border === "subtle"
        ? "border border-border/60"
        : style.border === "accent"
          ? "border-2 border-primary/40"
          : style.border === "top_bottom"
            ? "border-y border-border/60"
            : style.border === "dashed"
              ? "border-2 border-dashed border-border"
              : "";

  const maxWidthClass =
    style.maxWidth === "full"
      ? "w-full max-w-none"
      : style.maxWidth === "7xl"
        ? "max-w-7xl mx-auto px-4 sm:px-6"
        : style.maxWidth === "5xl"
          ? "max-w-5xl mx-auto px-4 sm:px-6"
          : style.maxWidth === "3xl"
            ? "max-w-3xl mx-auto px-4"
            : style.maxWidth === "prose"
              ? "max-w-prose mx-auto px-4"
              : "";

  const marginClass =
    style.margin === "none"
      ? "my-0"
      : style.margin === "compact"
        ? "my-4 md:my-6"
        : style.margin === "normal"
          ? "my-8 md:my-12"
          : style.margin === "ample"
            ? "my-14 md:my-20"
            : "";

  return (
    <section
      id={style.anchorId || undefined}
      data-block-id={config.id}
      data-block-type={config.type}
      className={cn(
        "w-full transition-all duration-200",
        paddingClass,
        bgClass,
        visibilityClass,
        roundedClass,
        shadowClass,
        borderClass,
        marginClass,
        style.customClassName,
      )}
    >
      <div
        className={cn("w-full transition-all duration-200", maxWidthClass, alignClass, className)}
      >
        {children}
      </div>
    </section>
  );
}
