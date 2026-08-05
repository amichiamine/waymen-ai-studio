import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Trash2 } from "lucide-react";
import { useAdminState, deleteSubscriber } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

export default function AdminSubscribers() {
  const { subscribers } = useAdminState();
  const { can, guard, denyReason } = usePermissions();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; email: string } | null>(null);

  function exportCsv() {
    const rows = [
      ["email", "source", "createdAt"],
      ...subscribers.map((s) => [s.email, s.source ?? "", s.createdAt]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    // Niveau 2 — vérification dans l'action, pas seulement dans le rendu.
    if (!guard("delete", "Supprimer l'inscrit")) return;
    deleteSubscriber(pendingDelete.id);
    toast.success("Désinscrit");
  }

  return (
    <AdminPageShell
      title="Inscrits newsletter"
      description={`${subscribers.length} inscription(s) collectée(s) via le site.`}
      actions={
        // Export CSV = lecture : pas de restriction de permission au-delà de l'état vide.
        <Button onClick={exportCsv} disabled={subscribers.length === 0}>
          <Download className="me-2 h-4 w-4" /> Exporter en CSV
        </Button>
      }
    >
      <Card>
        <CardContent className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.source || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-end">
                    {/* Niveau 1 + Niveau 3 — infobulle sur le <span> */}
                    <span
                      title={denyReason("delete") ?? "Supprimer"}
                      className="inline-flex align-middle"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        disabled={!can("delete")}
                        onClick={() => setPendingDelete({ id: s.id, email: s.email })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {subscribers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                    Aucun inscrit pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={pendingDelete ? `Retirer ${pendingDelete.email} ?` : "Retirer l'inscrit ?"}
        description="L'adresse sera supprimée définitivement de la liste."
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}
