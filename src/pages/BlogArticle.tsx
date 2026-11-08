import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useBlogPostDetail,
  useBlogPostList,
  useSiteSettings,
  useSiteContent,
} from "@/data-provider";
import { useI18n, useLocalize } from "@/lib/i18n";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { renderBlock } from "@/components/blocks";
import { cn } from "@/lib/utils";

export default function BlogArticle({
  suppressCustomBlocks = false,
}: {
  suppressCustomBlocks?: boolean;
} = {}) {
  const { slug } = useParams<{ slug: string }>();
  const { data: allPosts } = useBlogPostList();
  // En mode Studio Live Canvas (suppressCustomBlocks), fallback gracieux sur le premier article publié
  const effectiveSlug =
    slug ||
    (suppressCustomBlocks ? allPosts.find((p) => p.status === "published")?.slug : undefined);

  // Le hook reste toujours monté : on passe `effectiveSlug` au hook
  const { data: post, loading, error } = useBlogPostDetail(effectiveSlug);
  const { data: siteSettings } = useSiteSettings();
  const { data: siteContent } = useSiteContent();

  const systemPage = siteContent?.customPages?.find(
    (pg) =>
      pg.isSystem &&
      (pg.systemKey === "blog_article" || pg.slug === "blog/:slug" || pg.slug === "blog-article"),
  );
  const blocks = suppressCustomBlocks ? [] : systemPage?.blocks?.filter((b) => b.enabled) || [];
  const topBlocks = blocks.filter((b) => (b.style?.placement || "top") === "top");
  const bottomBlocks = blocks.filter((b) => b.style?.placement === "bottom");

  const pageBgClass =
    systemPage?.layout?.pageBg === "dark"
      ? "bg-slate-950 text-slate-50"
      : systemPage?.layout?.pageBg === "muted"
        ? "bg-muted/40"
        : systemPage?.layout?.pageBg === "surface"
          ? "bg-card"
          : systemPage?.layout?.pageBg === "gradient"
            ? "bg-gradient-to-b from-background via-muted/20 to-background"
            : "";
  const brand = siteSettings.storeName?.trim() || "Boutique";
  const { t, lang } = useI18n();
  const L = useLocalize();
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";

  // 1. Chargement
  if (loading) {
    return (
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <div className="h-4 w-24 animate-pulse rounded bg-muted mb-8" />
        <div className="space-y-4" aria-busy="true">
          <span className="sr-only">{t("app.loading")}</span>
          <div className="h-8 animate-pulse rounded bg-muted w-3/4" />
          <div className="h-4 animate-pulse rounded bg-muted w-full" />
          <div className="h-4 animate-pulse rounded bg-muted w-5/6" />
          <div className="mt-8 aspect-[16/9] animate-pulse rounded-xl bg-muted" />
        </div>
      </article>
    );
  }

  // 2. Erreur réseau (pas la même chose que « article introuvable »)
  if (error) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t("blogArticle.back")}
        </Link>
      </div>
    );
  }

  // 3. Article introuvable ou non publié
  if (!post || post.status !== "published") {
    return (
      <div className={cn("min-h-[60vh]", pageBgClass)}>
        {topBlocks.map(renderBlock)}
        <BlogNotFound />
        {bottomBlocks.map(renderBlock)}
      </div>
    );
  }

  // Résolution des champs localisés UNE SEULE FOIS — jamais post.title dans le corps.
  const rawTitle = L(post.title) ?? "";
  const title = rawTitle
    .replace(/{storeName}/g, brand)
    .replace(/\bKA Tech\b|\bStacGate Platform\b/g, brand);
  const rawExcerpt = L(post.excerpt) ?? "";
  const excerpt = rawExcerpt
    .replace(/{storeName}/g, brand)
    .replace(/\bKA Tech\b|\bStacGate Platform\b/g, brand);
  const rawContent = L(post.content) ?? "";
  const content = rawContent
    .replace(/{storeName}/g, brand)
    .replace(/\bKA Tech\b|\bStacGate Platform\b/g, brand);
  const rawAuthor = post.author ?? "";
  const author = rawAuthor
    .replace(/{storeName}/g, brand)
    .replace(/\bKA Tech\b|\bStacGate Platform\b/g, brand);

  const canonical = `${window.location.origin}/blog/${post.slug}`;
  // JSON-LD Article : headline, description et image doivent être des chaînes —
  // JSON.stringify({ fr: "…" }) produirait un objet invalide pour Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    author: { "@type": "Person", name: author },
    datePublished: post.publishedAt ?? post.createdAt,
    image: post.cover,
  };

  return (
    <div className={cn("min-h-screen", pageBgClass)}>
      {topBlocks.map(renderBlock)}
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <Helmet>
          <title>{`${title} — ${brand}`}</title>
          <meta name="description" content={excerpt} />
          <link rel="canonical" href={canonical} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={excerpt} />
          <meta property="og:url" content={canonical} />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>
        <Link
          to="/blog"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t("blogArticle.back")}
        </Link>

        <header className="mt-6">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((tg) => (
              <span
                key={tg}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {tg}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{excerpt}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{author}</span>
            <span>·</span>
            <time>
              {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
        </header>

        {post.cover && (
          <ImageCatalogue
            src={post.cover}
            alt={title}
            className="mt-8 aspect-[16/9] w-full rounded-xl border border-border object-cover"
          />
        )}

        <MarkdownRenderer content={content} className="mt-8" />
      </article>
      {bottomBlocks.map(renderBlock)}
    </div>
  );
}

function BlogNotFound() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{t("blogArticle.notFound")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("blogArticle.notFound.sub")}</p>
      <Link to="/blog" className="mt-6 inline-block">
        <Button variant="outline">
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" /> {t("blogArticle.back")}
        </Button>
      </Link>
    </div>
  );
}
