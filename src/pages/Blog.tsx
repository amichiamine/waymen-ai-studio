import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminState } from "@/lib/admin-store";

export default function Blog() {
  const [q, setQ] = useState("");
  const { blogPosts } = useAdminState();

  const posts = useMemo(() => {
    const published = blogPosts
      .filter((p) => p.status === "published")
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    if (!q.trim()) return published;
    const needle = q.trim().toLowerCase();
    return published.filter((p) =>
      p.title.toLowerCase().includes(needle) ||
      p.excerpt.toLowerCase().includes(needle) ||
      p.tags.some((t) => t.toLowerCase().includes(needle))
    );
  }, [blogPosts, q]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Le blog KA Tech</h1>
        <p className="mt-3 text-muted-foreground">
          Actualités, guides d'achat et conseils tech pour bien choisir votre matériel.
        </p>
        <div className="relative mx-auto mt-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un article…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-5xl">
        {posts.length === 0 ? (
          <div className="mx-auto max-w-2xl flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
            <Newspaper className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {blogPosts.length === 0
                ? "Aucun article publié pour le moment."
                : "Aucun article ne correspond à votre recherche."}
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
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-lg font-bold leading-snug group-hover:text-primary">{p.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.author}</span>
                    <time>{new Date(p.publishedAt ?? p.createdAt).toLocaleDateString("fr-FR")}</time>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
