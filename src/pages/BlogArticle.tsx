import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminState } from "@/lib/admin-store";
import { useI18n } from "@/lib/i18n";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { blogPosts } = useAdminState();
  const { t, lang } = useI18n();
  const locale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-US" : "fr-FR";
  const post = blogPosts.find((p) => p.slug === slug && p.status === "published");

  if (!post) return <BlogNotFound />;

  const canonical = `${window.location.origin}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Person", name: post.author },
    datePublished: post.publishedAt ?? post.createdAt,
    image: post.cover,
  };

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <Helmet>
        <title>{`${post.title} — KA Tech`}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
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
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{post.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{post.author}</span>
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
        <img
          src={post.cover}
          alt={post.title}
          className="mt-8 aspect-[16/9] w-full rounded-xl border border-border object-cover"
        />
      )}

      <div className="prose prose-invert mt-8 max-w-none text-foreground/90">
        {post.content.split(/\n\n+/).map((block, i) => {
          if (block.startsWith("# "))
            return (
              <h2 key={i} className="mt-8 text-2xl font-bold">
                {block.slice(2)}
              </h2>
            );
          if (block.startsWith("## "))
            return (
              <h3 key={i} className="mt-6 text-xl font-semibold">
                {block.slice(3)}
              </h3>
            );
          if (/^\d+\.\s/.test(block)) {
            const items = block.split(/\n/).map((l) => l.replace(/^\d+\.\s*/, ""));
            return (
              <ol key={i} className="my-4 list-decimal space-y-1 ps-6 text-sm leading-relaxed">
                {items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            );
          }
          return (
            <p key={i} className="my-4 whitespace-pre-line text-sm leading-relaxed">
              {renderInline(block)}
            </p>
          );
        })}
      </div>
    </article>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
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
