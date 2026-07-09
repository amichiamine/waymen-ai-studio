import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, MessageCircle, Trash2, Check, Reply } from "lucide-react";
import {
  useAdminState, markMessageRead, deleteContactMessage, type ContactMessage,
} from "@/lib/admin-store";

export default function AdminMessages() {
  const { messages, siteSettings } = useAdminState();
  const [open, setOpen] = useState<ContactMessage | null>(null);

  function open_(m: ContactMessage) {
    setOpen(m);
    if (!m.read) markMessageRead(m.id, true);
  }

  const unread = messages.filter((m) => !m.read).length;

  return (
    <AdminPageShell
      title="Messages de contact"
      description={`${messages.length} message(s) reçus · ${unread} non lu(s).`}
    >
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Expéditeur</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Reçu le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((m) => (
                <TableRow key={m.id} className={m.read ? undefined : "font-medium"}>
                  <TableCell>
                    {m.read ? <Badge variant="secondary">Lu</Badge> : <Badge>Nouveau</Badge>}
                  </TableCell>
                  <TableCell>
                    <button className="text-left hover:text-primary" onClick={() => open_(m)}>
                      {m.name}
                      <div className="text-xs text-muted-foreground font-normal">{m.email}</div>
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate">{m.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(m.createdAt).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => open_(m)} title="Voir"><Mail className="h-4 w-4" /></Button>
                    {!m.read && <Button variant="ghost" size="icon" onClick={() => { markMessageRead(m.id, true); toast.success("Marqué comme lu"); }} title="Marquer lu"><Check className="h-4 w-4" /></Button>}
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Supprimer ce message ?")) { deleteContactMessage(m.id); toast.success("Supprimé"); } }} title="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {messages.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground p-8">Aucun message.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{open?.subject}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                De <strong className="text-foreground">{open.name}</strong> · {open.email}
                {open.phone && <> · {open.phone}</>}
                <br />
                Reçu le {new Date(open.createdAt).toLocaleString("fr-FR")}
              </div>
              <p className="whitespace-pre-line rounded-md bg-muted/40 p-3">{open.message}</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            {open && (
              <>
                <a href={`mailto:${open.email}?subject=Re: ${encodeURIComponent(open.subject)}`}>
                  <Button variant="outline"><Reply className="mr-2 h-4 w-4" /> Répondre par e-mail</Button>
                </a>
                {siteSettings.whatsapp && open.phone && (
                  <a href={`https://wa.me/${siteSettings.whatsapp}`} target="_blank" rel="noreferrer">
                    <Button variant="outline"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button>
                  </a>
                )}
                <Button variant="destructive" onClick={() => { deleteContactMessage(open.id); setOpen(null); toast.success("Message supprimé"); }}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
