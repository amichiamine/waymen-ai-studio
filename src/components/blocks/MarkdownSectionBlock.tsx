import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";

interface MarkdownSectionBlockProps {
  config: BlockConfig;
}

export function MarkdownSectionBlock({ config }: MarkdownSectionBlockProps) {
  const L = useLocalize();
  const p = config.props || {};

  const content =
    (typeof p.content === "string" ? p.content : L(p.content as Localized<string> | undefined)) ||
    "";

  if (!content.trim()) return null;

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-10 shadow-xs">
        <MarkdownRenderer content={content} />
      </div>
    </section>
  );
}
