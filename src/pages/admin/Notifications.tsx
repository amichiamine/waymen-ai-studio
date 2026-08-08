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
import type { NotificationLevel } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

// Les libellés des niveaux viennent du dictionnaire i18n.
// Les valeurs techniques (`info`, `success`, `warning`, `error`) ne se traduisent pas.
type LevelConfig = { Icon: typeof Bell; className: string };
const LEVEL_ICONS: Record<NotificationLevel, LevelConfig> = {
  info: { Icon: Info, className: "text-primary bg-primary/10" },
  success: { Icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10" },
  warning: { Icon: AlertTriangle, className: "text-amber-600 bg-amber-500/10" },
  error: { Icon: XCircle, className: "text-destructive bg-destructive/10" },
};

export default function AdminNotifications() {
  const { t } = useI18n();

  // Labels des niveaux depuis le dictionnaire, alignés sur les valeurs techniques.
  const LEVEL_LABELS: Record<NotificationLevel, string> = {
    info: t("admin.systeme.notifications.level_info"),
    success: t("admin.systeme.notifications.level_success"),
    warning: t("admin.systeme.notifications.level_warning"),
    error: t("admin.systeme.notifications.level_error"),
  };

  const { data: notifications, loading, error } = useNotificationList();
  const { create, markRead, markAllRead, remove } = useNotificationMutations();
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
    if (!guard("update", t("admin.systeme.notifications.btn_tout_marquer_lu"))) return;
    setSaving(true);
    try {
      await markAllRead();
      toast.success(t("admin.systeme.notifications.toast_tout_lu"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkRead(id: string) {
    // Niveau 2 — vérification dans l'action.
    if (!guard("update", t("admin.systeme.notifications.btn_marquer_lu"))) return;
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
    if (!guard("delete", t("admin.systeme.notifications.btn_supprimer"))) return;
    setSaving(true);
    try {
      await remove(id);
      toast.success(t("admin.systeme.notifications.toast_supprimee"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error(t("admin.systeme.notifications.toast_titre_requis"));
      return;
    }
    // Niveau 2 — vérification dans l'action.
    if (!guard("create", t("admin.systeme.notifications.btn_creer"))) return;
    setSaving(true);
    try {
      await create({
        title: title.trim(),
        body: body.trim() || undefined,
        level,
        link: link.trim() || undefined,
      });
      toast.success(t("admin.systeme.notifications.toast_creee"));
      setOpen(false);
      setTitle("");
      setBody("");
      setLevel("info");
      setLink("");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell
      title={t("admin.systeme.notifications.titre")}
      description={t("admin.systeme.notifications.description", {
        total: notifications.length.toString(),
        unread: unread.toString(),
      })}
      actions={
        <div className="flex gap-2">
          {/* Niveau 1 + Niveau 3 — marquer tout lu = update */}
          <span
            title={
              unread === 0
                ? undefined
                : (denyReason("update") ?? t("admin.systeme.notifications.btn_tout_marquer_lu"))
            }
            className="inline-flex"
          >
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={unread === 0 || !can("update") || saving}
            >
              <Check className="me-2 h-4 w-4" />{" "}
              {t("admin.systeme.notifications.btn_tout_marquer_lu")}
            </Button>
          </span>
          {/* Niveau 1 + Niveau 3 — créer une notification */}
          {can("create") ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="me-2 h-4 w-4" /> {t("admin.systeme.notifications.btn_nouvelle")}
            </Button>
          ) : (
            <span title={denyReason("create")} className="inline-flex">
              <Button disabled>
                <Plus className="me-2 h-4 w-4" /> {t("admin.systeme.notifications.btn_nouvelle")}
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
          { key: "all" as const, label: t("admin.systeme.notifications.filtre_toutes") },
          {
            key: "unread" as const,
            label: t("admin.systeme.notifications.filtre_non_lues", { n: unread }),
          },
          { key: "info" as const, label: t("admin.systeme.notifications.filtre_info") },
          { key: "success" as const, label: t("admin.systeme.notifications.filtre_succes") },
          { key: "warning" as const, label: t("admin.systeme.notifications.filtre_alertes") },
          { key: "error" as const, label: t("admin.systeme.notifications.filtre_erreurs") },
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
          <span className="sr-only">{t("admin.socle.commun.chargement")}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8" />
            <p>{t("admin.systeme.notifications.vide")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => {
            const L = LEVEL_ICONS[n.level];
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
                            {t("admin.systeme.notifications.badge_nouveau")}
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
                          <ExternalLink className="h-3 w-3" /> {t("admin.socle.commun.voir")}
                        </Link>
                      )}
                      {!n.read && (
                        // Niveau 1 + Niveau 3 — marquer lu = update
                        <span
                          title={
                            denyReason("update") ?? t("admin.systeme.notifications.btn_marquer_lu")
                          }
                          className="inline-flex"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!can("update") || saving}
                            onClick={() => handleMarkRead(n.id)}
                          >
                            <Check className="me-1 h-3 w-3" />{" "}
                            {t("admin.systeme.notifications.btn_marquer_lu")}
                          </Button>
                        </span>
                      )}
                      {/* Niveau 1 + Niveau 3 — supprimer = delete */}
                      <span
                        title={
                          denyReason("delete") ?? t("admin.systeme.notifications.btn_supprimer")
                        }
                        className="inline-flex align-middle"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("admin.systeme.notifications.aria_supprimer")}
                          disabled={!can("delete") || saving}
                          onClick={() => handleDelete(n.id)}
                        >
                          <Trash2 className="me-1 h-3 w-3 text-destructive" />{" "}
                          {t("admin.systeme.notifications.btn_supprimer")}
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
            <DialogTitle>{t("admin.systeme.notifications.dialog_titre")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">
                {t("admin.systeme.notifications.champ_titre")}
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">
                {t("admin.systeme.notifications.champ_corps")}
              </label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">
                  {t("admin.systeme.notifications.champ_niveau")}
                </label>
                <Select value={level} onValueChange={(v) => setLevel(v as NotificationLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEVEL_ICONS) as NotificationLevel[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {LEVEL_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">
                  {t("admin.systeme.notifications.champ_lien")}
                </label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder={t("admin.systeme.notifications.champ_lien_placeholder")}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("admin.systeme.notifications.btn_annuler")}
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {t("admin.systeme.notifications.btn_creer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
