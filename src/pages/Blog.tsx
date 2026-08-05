import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Newspaper, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBlogPostList } from "@/data-provider";
import { useI18n } from "@/lib/i18n";

export default function Blog() {
  const [q, setQ] = useState("");
  const { data: blogPosts, loading, error } = useBlogPostList();
  const { t, lang } = useI18n();
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";

  const posts = useMemo(() => {
    const published = blogPosts
      .filter((p) => p.status === "published")
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    if (!q.trim()) return published;
    const needle = q.trim().toLowerCase();
    return published.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.excerpt.toLowerCase().includes(needle) ||
        p.tags.some((tg) => tg.toLowerCase().includes(needle)),
    );
  }, [blogPosts, q]);

  return (
    <div className="container mx-auto px-4 py-10">
      <Helmet>
        <title>{t("blog.page.title")}</title>
        <meta name="description" content={t("blog.page.desc")} />
        <link rel="canonical" href={`${window.location.origin}/blog`} />
      </Helmet>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">{t("blog.h1")}</h1>
        <p className="mt-3 text-muted-foreground">{t("blog.intro")}</p>
        <div className="relative mx-auto mt-6 max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("blog.search")}
            className="ps-9"
          />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-5xl">
        {/* 1. Chargement */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            <span className="sr-only">{t("app.loading")}</span>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : (
          <>
            {/* 2. Erreur */}
            {error && (
              <p
                role="status"
                className="mb-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error.message}
              </p>
            )}

            {/* 3. Vide / contenu */}
            {posts.length === 0 ? (
              <div className="mx-auto max-w-2xl flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
                <Newspaper className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {blogPosts.filter((p) => p.status === "published").length === 0
                    ? t("blog.emptyPub")
                    : t("blog.emptySearch")}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60"
                  >
                    {p.cover && (
                      <div className="aspect-[16/9] overflow-hidden bg-muted">
                        <img
                          src={p.cover}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {p.tags.slice(0, 3).map((tg) => (
                          <span
                            key={tg}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-lg font-bold leading-snug group-hover:text-primary">
                        {p.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.author}</span>
                        <time>
                          {new Date(p.publishedAt ?? p.createdAt).toLocaleDateString(locale)}
                        </time>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
