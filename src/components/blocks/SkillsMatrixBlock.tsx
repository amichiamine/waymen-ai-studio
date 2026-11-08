import { Badge } from "@/components/ui/badge";
import { useLocalize } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { Code2, Cpu, Layers, Sparkles } from "lucide-react";

import type { Localized } from "@/lib/i18n";

interface SkillCategoryItem {
  id?: string;
  name?: Localized<string>;
  title?: string;
  skills?: string[];
}

interface SkillsMatrixBlockProps {
  config: BlockConfig;
}

export function SkillsMatrixBlock({ config }: SkillsMatrixBlockProps) {
  const L = useLocalize();
  const p = config.props || {};

  const title = L(p.title as Localized<string>) || "Compétences Clés & Technologies";
  const subtitle =
    L(p.subtitle as Localized<string>) ||
    "Savoir-faire éprouvé sur les stacks et architectures modernes.";
  const categories = (Array.isArray(p.categories) ? p.categories : []) as SkillCategoryItem[];

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="max-w-3xl mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground text-base sm:text-lg">{subtitle}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, idx: number) => {
          const catName = L(cat.name) || cat.title || "Domaine";
          const skills = Array.isArray(cat.skills) ? cat.skills : [];

          return (
            <div
              key={cat.id || idx}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{catName}</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills.map((skill: string, sIdx: number) => (
                    <Badge
                      key={sIdx}
                      variant="secondary"
                      className="px-2.5 py-1 text-xs font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
