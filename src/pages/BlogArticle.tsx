import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BlogArticle() {
  useEffect(() => { document.title = `Article — KA Tech`; }, []);
  return <BlogNotFound />;
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
