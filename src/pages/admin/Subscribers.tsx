import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2 } from "lucide-react";
import { useAdminState, deleteSubscriber } from "@/lib/admin-store";

export default function AdminSubscribers() {
  const { subscribers } = useAdminState();

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

  return (
    <AdminPageShell
      title="Inscrits newsletter"
      description={`${subscribers.length} inscription(s) collectée(s) via le site.`}
      actions={<Button onClick={exportCsv} disabled={subscribers.length === 0}><Download className="mr-2 h-4 w-4" /> Exporter en CSV</Button>}
    >
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.source || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm(`Retirer ${s.email} ?`)) { deleteSubscriber(s.id); toast.success("Désinscrit"); } }}
                      title="Supprimer"
                    ><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {subscribers.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground p-8">Aucun inscrit pour le moment.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
