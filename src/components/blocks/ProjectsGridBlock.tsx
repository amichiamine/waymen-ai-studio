import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocalize } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { ExternalLink, Github, FolderGit2 } from "lucide-react";

import type { Localized } from "@/lib/i18n";

interface ProjectItem {
  id?: string;
  title?: Localized<string>;
  description?: Localized<string>;
  category?: string;
  tags?: string[];
  demoUrl?: string;
  codeUrl?: string;
  image?: string;
}

interface ProjectsGridBlockProps {
  config: BlockConfig;
}

export function ProjectsGridBlock({ config }: ProjectsGridBlockProps) {
  const L = useLocalize();
  const p = config.props || {};

  const title = L(p.title as Localized<string>) || "Réalisations & Projets Phares";
  const subtitle =
    L(p.subtitle as Localized<string>) ||
    "Sélection de travaux d'ingénierie, prototypes et architectures en production.";
  const items = (Array.isArray(p.items) ? p.items : []) as ProjectItem[];

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="max-w-3xl mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-2 text-muted-foreground text-base sm:text-lg">{subtitle}</p>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((proj, idx: number) => {
          const projTitle = L(proj.title) || "Projet";
          const description = L(proj.description) || "";
          const category = proj.category || "";
          const tags = Array.isArray(proj.tags) ? proj.tags : [];
          const demoUrl = proj.demoUrl;
          const codeUrl = proj.codeUrl;
          const image = proj.image;

          return (
            <Card
              key={proj.id || idx}
              className="overflow-hidden border border-border/60 bg-card/60 hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {image && (
                  <div className="relative aspect-video w-full overflow-hidden bg-muted/40 border-b border-border/40">
                    <img
                      src={image}
                      alt={projTitle}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {category && (
                      <Badge className="absolute top-3 end-3 shadow-xs">{category}</Badge>
                    )}
                  </div>
                )}

                <CardContent className="p-6">
                  {!image && category && (
                    <Badge variant="outline" className="mb-3">
                      {category}
                    </Badge>
                  )}

                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {projTitle}
                  </h3>

                  {description && (
                    <p className="text-muted-foreground text-sm leading-relaxed mt-2 line-clamp-3">
                      {description}
                    </p>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {tags.map((t: string, tIdx: number) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>

              {(demoUrl || codeUrl) && (
                <div className="p-6 pt-0 flex items-center gap-2 border-t border-border/30 mt-4">
                  {demoUrl && (
                    <Button
                      size="sm"
                      variant="default"
                      asChild
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <a href={demoUrl} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Démo Live</span>
                      </a>
                    </Button>
                  )}

                  {codeUrl && (
                    <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
                      <a href={codeUrl} target="_blank" rel="noreferrer noopener">
                        <Github className="h-3.5 w-3.5" />
                        <span>Code</span>
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
