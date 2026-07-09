import { useParams } from "react-router-dom";

import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export default function AdminProductEdit() {
  const { id } = useParams();
  return (
    <AdminPageShell title="Fiche produit" description={`Identifiant : ${id}`}>
      <AdminEmptyState label="Détails du produit indisponibles — connectez le backend." />
    </AdminPageShell>
  );
}
