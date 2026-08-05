import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
import { useSubscriberList, useSubscriberMutations, toApiError } from "@/data-provider";
import { usePermissions } from "@/lib/admin-auth";

export default function AdminSubscribers() {
  // Lecture via le fournisseur de données — remplace useAdminState().subscribers.
  // En mode mock, `loading` est faux dès le premier rendu et `error` reste nul.
  const { data: subscribers, loading, error } = useSubscriberList();
  const { remove } = useSubscriberMutations();
  const { can, guard, denyReason } = usePermissions();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; email: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function exportCsv() {
    const rows = [
      ["email", "source", "createdAt"],
      ...subscribers.map((s) => [s.email, s.source ?? "", s.createdAt]),
    ];
    const csv = rows
      .map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
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

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function confirmDelete() {
    if (!pendingDelete) return;
    // Niveau 2 — vérification dans l'action, pas seulement dans le rendu.
    // Ordre : garde de permission → mutation → retour d'erreur.
    if (!guard("delete", "Supprimer l'inscrit")) return;
    setSaving(true);
    try {
      await remove(pendingDelete.id);
      toast.success("Désinscrit");
      setPendingDelete(null);
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
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
      {/* Erreur au-dessus du contenu, sans remplacer la page (§5.3). */}
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

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
              {/* Chargement — squelettes de lignes (§5.3). */}
              {loading ? (
                <>
                  <tr className="sr-only" aria-busy="true">
                    <td>Chargement des inscrits…</td>
                  </tr>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      {[160, 80, 80, 40].map((w, j) => (
                        <TableCell key={j}>
                          <div
                            className="h-4 animate-pulse rounded bg-muted"
                            style={{ width: `${w}px` }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              ) : (
                <>
                  {subscribers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.source || "—"}
                      </TableCell>
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
                            disabled={!can("delete") || saving}
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
                      <TableCell
                        colSpan={4}
                        className="p-8 text-center text-sm text-muted-foreground"
                      >
                        Aucun inscrit pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
