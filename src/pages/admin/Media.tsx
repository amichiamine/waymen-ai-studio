import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useAdminState } from "@/lib/admin-store";

export default function AdminMedia() {
  const { products } = useAdminState();
  const media = products.map((p) => ({ src: p.image, name: p.name, id: p.id }));

  return (
    <AdminPageShell
      title="Médias"
      description={`${media.length} images utilisées par le catalogue.`}
      actions={<Button disabled title="Disponible en phase 2"><Upload className="mr-2 h-4 w-4" /> Téléverser</Button>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {media.map((m) => (
          <figure key={m.id} className="group overflow-hidden rounded-lg border bg-muted">
            <div className="aspect-square overflow-hidden">
              <img src={m.src} alt={m.name} className="h-full w-full object-cover transition group-hover:scale-105" />
            </div>
            <figcaption className="truncate p-2 text-xs text-muted-foreground" title={m.name}>{m.name}</figcaption>
          </figure>
        ))}
      </div>
    </AdminPageShell>
  );
}
