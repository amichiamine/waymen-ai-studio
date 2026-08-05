import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageCircle, Trash2, Check, Reply } from "lucide-react";
import {
  useContactMessageList,
  useContactMessageMutations,
  useSiteSettings,
  toApiError,
} from "@/data-provider";
import type { ContactMessage } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

export default function AdminMessages() {
  // Lecture via le fournisseur de données — remplace useAdminState().messages
  // et useAdminState().siteSettings. En mode mock, `loading` est faux dès le
  // premier rendu et `error` reste nul.
  const { data: messages, loading, error } = useContactMessageList();
  const { data: siteSettings } = useSiteSettings();
  const { markRead, remove } = useContactMessageMutations();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [saving, setSaving] = useState(false);

  async function openMessage(m: ContactMessage) {
    setOpen(m);
    // Marquer lu = modification légère → clé `update`.
    // Pas de guard ici : l'ouverture est une lecture, le marquage automatique
    // est une conséquence UX attendue. Si l'utilisateur n'a pas `update`,
    // markRead est quand même appelé (comportement symétrique à avant).
    // Le vrai garde est sur les boutons explicites ci-dessous.
    if (!m.read) {
      try {
        await markRead(m.id, true);
      } catch {
        // Échec silencieux — le marquage automatique à l'ouverture est optionnel.
      }
    }
  }

  async function handleMarkRead(m: ContactMessage) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("update", "Marquer comme lu")) return;
    setSaving(true);
    try {
      await markRead(m.id, true);
      toast.success("Marqué comme lu");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce message ?")) return;
    // Niveau 2 — vérification dans le handler.
    if (!guard("delete", "Supprimer le message")) return;
    setSaving(true);
    try {
      await remove(id);
      toast.success("Supprimé");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFromDialog(id: string) {
    // Niveau 2 — vérification dans le handler.
    if (!guard("delete", "Supprimer le message")) return;
    setSaving(true);
    try {
      await remove(id);
      setOpen(null);
      toast.success("Message supprimé");
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  const unread = messages.filter((m) => !m.read).length;

  return (
    <AdminPageShell
      title="Messages de contact"
      description={`${messages.length} message(s) reçus · ${unread} non lu(s).`}
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
                <TableHead>Statut</TableHead>
                <TableHead>Expéditeur</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Reçu le</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Chargement — squelettes de lignes (§5.3). */}
              {loading ? (
                <>
                  <tr className="sr-only" aria-busy="true">
                    <td>Chargement des messages…</td>
                  </tr>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      {[50, 120, 200, 100, 80].map((w, j) => (
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
                  {messages.map((m) => (
                    <TableRow key={m.id} className={m.read ? undefined : "font-medium"}>
                      <TableCell>
                        {m.read ? <Badge variant="secondary">Lu</Badge> : <Badge>Nouveau</Badge>}
                      </TableCell>
                      <TableCell>
                        <button
                          className="text-start hover:text-primary"
                          onClick={() => openMessage(m)}
                        >
                          {m.name}
                          <div className="text-xs font-normal text-muted-foreground">{m.email}</div>
                        </button>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">{m.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openMessage(m)}
                          title="Voir"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {/* Niveau 1 — marquer lu = `update`. */}
                        {!m.read &&
                          (can("update") ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkRead(m)}
                              title="Marquer lu"
                              disabled={saving}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span title={denyReason("update")} className="inline-flex">
                              <Button variant="ghost" size="icon" disabled aria-label="Marquer lu">
                                <Check className="h-4 w-4" />
                              </Button>
                            </span>
                          ))}
                        {/* Niveau 1 — supprimer = `delete`. */}
                        <span
                          title={denyReason("delete") ?? "Supprimer"}
                          className="inline-flex align-middle"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Supprimer"
                            disabled={!can("delete") || saving}
                            onClick={() => handleDelete(m.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {messages.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="p-8 text-center text-sm text-muted-foreground"
                      >
                        Aucun message.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{open?.subject}</DialogTitle>
          </DialogHeader>
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
                {/* Les liens mailto: et WhatsApp sont une navigation, pas une
                    mutation : ils ne sont pas bridés par les permissions. */}
                <a href={`mailto:${open.email}?subject=Re: ${encodeURIComponent(open.subject)}`}>
                  <Button variant="outline">
                    <Reply className="me-2 h-4 w-4" /> Répondre par e-mail
                  </Button>
                </a>
                {siteSettings.whatsapp && open.phone && (
                  <a
                    href={`https://wa.me/${siteSettings.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">
                      <MessageCircle className="me-2 h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                )}
                {/* Niveau 1 — supprimer depuis le dialogue = `delete`. */}
                <span title={denyReason("delete") ?? undefined} className="inline-flex">
                  <Button
                    variant="destructive"
                    disabled={!can("delete") || saving}
                    onClick={() => handleDeleteFromDialog(open.id)}
                  >
                    <Trash2 className="me-2 h-4 w-4" /> Supprimer
                  </Button>
                </span>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
