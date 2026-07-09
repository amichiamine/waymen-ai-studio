import { useParams } from "react-router-dom";

import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";

export default function AdminBlogEdit() {
  const { id } = useParams();
  return (
    <AdminPageShell title="Éditer un article" description={`Identifiant : ${id}`}>
      <AdminEmptyState label="Contenu indisponible — connectez le backend." />
    </AdminPageShell>
  );
}
