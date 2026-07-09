import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/$slug")({
  loader: () => {
    // Pas de source d'articles pour le moment.
    throw notFound();
  },
  component: BlogArticlePage,
  notFoundComponent: BlogNotFound,
  head: () => ({
    meta: [
      { title: "Article — KA Tech" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function BlogArticlePage() {
  return null;
}

function BlogNotFound() {
  return (
    <div className="container mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Article introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cet article n'existe pas encore ou a été retiré.
      </p>
      <Link to="/blog" className="mt-6 inline-block">
        <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Retour au blog</Button>
      </Link>
    </div>
  );
}
