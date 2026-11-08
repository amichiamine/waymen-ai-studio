import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBlogPostList } from "@/data-provider";
import { useI18n, useLocalize, type Localized } from "@/lib/i18n";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import type { BlockConfig } from "@/types/pages";
import { ArrowRight, Calendar, User, Newspaper } from "lucide-react";

export function LatestBlogPostsBlock({ config }: { config: BlockConfig }) {
  const { data: blogPosts } = useBlogPostList();
  const { t, lang } = useI18n();
  const L = useLocalize();
  const p = config.props || {};

  const title =
    (typeof p.title === "string" ? p.title : L(p.title as Localized<string> | undefined)) ||
    t("blog.title") ||
    "Dernières Publications & R&D";
  const subtitle =
    (typeof p.subtitle === "string"
      ? p.subtitle
      : L(p.subtitle as Localized<string> | undefined)) ||
    t("blog.subtitle") ||
    "Découvrez nos analyses, guides techniques et actualités technologiques.";
  const max = typeof p.max === "number" ? p.max : 3;

  const published = (blogPosts || []).filter((post) => post.status === "published").slice(0, max);

  if (published.length === 0) return null;

  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          {subtitle && <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
        </div>

        <Button variant="outline" asChild className="gap-2 shrink-0">
          <Link to="/blog">
            <span>{t("common.viewAll") || "Voir tous les articles"}</span>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {published.map((post) => {
          const postTitle = L(post.title) || "";
          const excerpt = L(post.excerpt);
          const formattedDate = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : null;

          return (
            <Card
              key={post.id}
              className="overflow-hidden border border-border/60 bg-card/60 hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <Link to={`/blog/${post.slug}`} className="block">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted/40 border-b border-border/40">
                    <ImageCatalogue
                      src={post.cover || ""}
                      alt={postTitle}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                </Link>

                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {formattedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formattedDate}
                      </span>
                    )}
                    {post.author && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {post.author}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    <Link to={`/blog/${post.slug}`}>{postTitle}</Link>
                  </h3>

                  {excerpt && (
                    <p className="text-muted-foreground text-sm leading-relaxed mt-2 line-clamp-3">
                      {excerpt}
                    </p>
                  )}
                </CardContent>
              </div>

              <div className="p-6 pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="gap-1.5 p-0 text-primary hover:text-primary/80 font-semibold text-xs"
                >
                  <Link to={`/blog/${post.slug}`}>
                    <span>{t("blog.readMore") || "Lire la suite"}</span>
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
