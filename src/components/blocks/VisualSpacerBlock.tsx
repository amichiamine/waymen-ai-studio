import type { BlockConfig } from "@/types/pages";

export function VisualSpacerBlock({ config }: { config: BlockConfig }) {
  const p = config.props || {};

  const height = Math.max(12, Math.min(240, Number(p.height) || 48));
  const showDivider = Boolean(p.showDivider);
  const dividerStyle = p.dividerStyle || "subtle"; // "subtle" | "accent" | "dashed"

  const dividerClass =
    dividerStyle === "accent"
      ? "border-primary/40"
      : dividerStyle === "dashed"
        ? "border-dashed border-border"
        : "border-border/60";

  return (
    <div
      style={{ height: `${height}px` }}
      className="w-full flex items-center justify-center pointer-events-none select-none"
      aria-hidden="true"
    >
      {showDivider && <div className={`w-full max-w-5xl border-t ${dividerClass}`} />}
    </div>
  );
}
