import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useAdminRoles } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayoutRoute,
  head: () => ({ meta: [{ title: "Admin — KA Tech" }, { name: "robots", content: "noindex" }] }),
});

function AdminLayoutRoute() {
  const { isAdmin, loading } = useAdminRoles();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Zone réservée à l'équipe admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vous devez être connecté avec un compte administrateur pour accéder au back-office.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/auth"><Button>Se connecter</Button></Link>
            <Link to="/"><Button variant="outline"><Home className="mr-2 h-4 w-4" /> Accueil</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border/60 bg-card/50 px-4 lg:px-8">
          <div className="text-sm text-muted-foreground">Back-office KA Tech</div>
          <Link to="/" className="text-sm text-primary hover:underline">← Retour à la boutique</Link>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
