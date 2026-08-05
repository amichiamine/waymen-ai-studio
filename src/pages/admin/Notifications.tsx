import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNotificationList, useNotificationMutations, toApiError } from "@/data-provider";
// addNotification n'est pas encore exposé par le provider (phase 4).
// Migration douce — DATA-PROVIDER.md §4 : admin-store reste valide pendant phase 2.
import { addNotification, type NotificationLevel } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

const LEVEL: Record<NotificationLevel, { label: string; Icon: typeof Bell; className: string }> = {
  info: { label: "Info", Icon: Info, className: "text-primary bg-primary/10" },
  success: { label: "Succès", Icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10" },
  warning: { label: "Alerte", Icon: AlertTriangle, className: "text-amber-600 bg-amber-500/10" },
  error: { label: "Erreur", Icon: XCircle, className: "text-destructive bg-destructive/10" },
};

export default function AdminNotifications() {
  const { data: notifications, loading, error } = useNotificationList();
  const { markRead, markAllRead, remove } = useNotificationMutations();
  const { can, guard, denyReason } = usePermissions();
  const [filter, setFilter] = useState<"all" | "unread" | NotificationLevel>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<NotificationLevel>("info");
  const [link, setLink] = useState("");

  const rows = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "all") return true;
      if (filter === "unread") return !n.read;
      return n.level === filter;
    });
  }, [notifications, filter]);

  const unread = notifications.filter((n) => !n.read).length;

  async function handleMarkAllRead() {
    // Niveau 2 — vérification dans l'action.
    if (!guard("update", "Marquer tout lu")) return;
    setSaving(true);
    try {
      await markAllRead();
      toast.success("Toutes marquées comme lues");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkRead(id: string) {
    // Niveau 2 — vérification dans l'action.
    if (!guard("update", "Marquer lu")) return;
    setSaving(true);
    try {
      await markRead(id, true);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    // Niveau 2 — vérification dans l'action.
    if (!guard("delete", "Supprimer la notification")) return;
    setSaving(true);
    try {
      await remove(id);
      toast.success("Supprimée");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function create() {
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }
    // Niveau 2 — vérification dans l'action.
    // addNotification reste synchrone (pas encore dans le provider — phase 4).
    if (!guard("create", "Créer la notification")) return;
    addNotification({
      title: title.trim(),
      body: body.trim(),
      level,
      link: link.trim() || undefined,
    });
    toast.success("Notification créée");
    setOpen(false);
    setTitle("");
    setBody("");
    setLevel("info");
    setLink("");
  }

  return (
    <AdminPageShell
      title="Notifications"
      description={`${notifications.length} notifications · ${unread} non lue${unread > 1 ? "s" : ""}. Générées automatiquement lors des événements clés (commandes, stock).`}
      actions={
        <div className="flex gap-2">
          {/* Niveau 1 + Niveau 3 — marquer tout lu = update */}
          <span
            title={unread === 0 ? undefined : (denyReason("update") ?? "Marquer toutes comme lues")}
            className="inline-flex"
          >
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={unread === 0 || !can("update") || saving}
            >
              <Check className="me-2 h-4 w-4" /> Tout marquer lu
            </Button>
          </span>
          {/* Niveau 1 + Niveau 3 — créer une notification */}
          {can("create") ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="me-2 h-4 w-4" /> Nouvelle
            </Button>
          ) : (
            <span title={denyReason("create")} className="inline-flex">
              <Button disabled>
                <Plus className="me-2 h-4 w-4" /> Nouvelle
              </Button>
            </span>
          )}
        </div>
      }
    >
      {error && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all" as const, label: "Toutes" },
          { key: "unread" as const, label: `Non lues (${unread})` },
          { key: "info" as const, label: "Info" },
          { key: "success" as const, label: "Succès" },
          { key: "warning" as const, label: "Alertes" },
          { key: "error" as const, label: "Erreurs" },
        ].map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <span className="sr-only">Chargement…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8" />
            <p>Aucune notification.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => {
            const L = LEVEL[n.level];
            return (
              <Card key={n.id} className={n.read ? "opacity-70" : ""}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${L.className}`}
                  >
                    <L.Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{n.title}</h3>
                      <div className="flex shrink-0 items-center gap-2">
                        {!n.read && (
                          <Badge variant="secondary" className="text-[10px]">
                            Nouveau
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString("fr-FR")}
                        </span>
                      </div>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {n.link && (
                        <Link
                          to={n.link}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Voir
                        </Link>
                      )}
                      {!n.read && (
                        // Niveau 1 + Niveau 3 — marquer lu = update
                        <span
                          title={denyReason("update") ?? "Marquer comme lu"}
                          className="inline-flex"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!can("update") || saving}
                            onClick={() => handleMarkRead(n.id)}
                          >
                            <Check className="me-1 h-3 w-3" /> Marquer lu
                          </Button>
                        </span>
                      )}
                      {/* Niveau 1 + Niveau 3 — supprimer = delete */}
                      <span
                        title={denyReason("delete") ?? "Supprimer"}
                        className="inline-flex align-middle"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Supprimer"
                          disabled={!can("delete") || saving}
                          onClick={() => handleDelete(n.id)}
                        >
                          <Trash2 className="me-1 h-3 w-3 text-destructive" /> Supprimer
                        </Button>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Titre</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Corps</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Niveau</label>
                <Select value={level} onValueChange={(v) => setLevel(v as NotificationLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEVEL) as NotificationLevel[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {LEVEL[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Lien (optionnel)</label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="/admin/orders/…"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={create}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
