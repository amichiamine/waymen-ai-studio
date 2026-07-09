
import { useState, useEffect } from "react";
import { Search, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Blog() {
  useEffect(() => { document.title = `Blog — KA Tech`; }, []);
  const [q, setQ] = useState("");

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

      <div className="mx-auto mt-12 max-w-2xl">
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
          <Newspaper className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun article publié pour le moment.</p>
          <p className="text-xs text-muted-foreground">Revenez bientôt — les premières publications arrivent.</p>
        </div>
      </div>
    </div>
  );
}
