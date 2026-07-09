import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/orders")({ component: Page });

function Page() {
  return (
    <AdminPageShell title="Commandes" description="Suivez et gérez les commandes clients.">
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="processing">En traitement</TabsTrigger>
          <TabsTrigger value="shipped">Expédiées</TabsTrigger>
          <TabsTrigger value="delivered">Livrées</TabsTrigger>
          <TabsTrigger value="cancelled">Annulées</TabsTrigger>
        </TabsList>
      </Tabs>
      <AdminEmptyState label="Aucune commande à afficher." />
    </AdminPageShell>
  );
}
