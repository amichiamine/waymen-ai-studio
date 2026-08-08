import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserList, useUserMutations, toApiError } from "@/data-provider";
import type { AdminUserRole } from "@/lib/admin-store";
import type { AdminUser } from "@/api/types";
import type { AdminUserPayload } from "@/api/resources/users";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

// La page est CONSULTABLE par les administrateurs (read), mais toutes les
// mutations (créer, modifier, supprimer, changer de rôle, changer un mot de
// passe) sont réservées au propriétaire via `manageUsers`. Sans cela, un
// `admin` pourrait se promouvoir `owner` en deux clics — élévation de
// privilèges. Voir docs/PERMISSIONS.md §2 justification 3.

// Le schéma de validation distingue la création (password obligatoire) de la
// modification (password facultatif). Le DTO AdminUserPayload exclut password
// pour les routes create/update — setPassword est le chemin dédié.
const schema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(120),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
  active: z.boolean(),
  password: z.string().max(72).optional(),
});

type FormValues = z.infer<typeof schema> & { id?: string };

export default function AdminUsers() {
  const { data: users, loading, error } = useUserList();
  const { create, update, remove, setPassword } = useUserMutations();
  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState<FormValues>({
    name: "",
    email: "",
    role: "editor",
    active: true,
    password: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  function openNew() {
    // Niveau 1 — l'ouverture de la boîte de création est conditionnée par
    // `manageUsers`. Le handler `save` revérifie (niveau 2).
    if (!can("manageUsers")) return;
    setV({ name: "", email: "", role: "editor", active: true, password: "" });
    setErr({});
    setOpen(true);
  }

  function openEdit(u: AdminUser) {
    // Niveau 1 — même garde pour la modification.
    if (!can("manageUsers")) return;
    setV({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, password: "" });
    setErr({});
    setOpen(true);
  }

  async function save() {
    // Niveau 2 — vérification impérative dans le handler, avant toute mutation.
    if (!guard("manageUsers", t("admin.reglages.utilisateurs.garde_enregistrer"))) return;
    const p = schema.safeParse(v);
    if (!p.success) {
      const errs: Record<string, string> = {};
      p.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErr(errs);
      return;
    }
    if (!v.id && users.some((u) => u.email.toLowerCase() === p.data.email.toLowerCase())) {
      setErr({ email: t("admin.reglages.utilisateurs.validation_email_utilise") });
      return;
    }
    if (!v.id && (!p.data.password || p.data.password.length < 6)) {
      setErr({ password: t("admin.reglages.utilisateurs.validation_mdp_requis") });
      return;
    }
    if (v.id && p.data.password && p.data.password.length < 6) {
      setErr({ password: t("admin.reglages.utilisateurs.validation_mdp_court") });
      return;
    }

    setSaving(true);
    try {
      // Le DTO AdminUserPayload exclut password — setPassword est le chemin dédié.
      const payload: AdminUserPayload = {
        id: v.id ?? `usr_${Date.now()}`,
        name: p.data.name,
        email: p.data.email,
        role: p.data.role,
        active: p.data.active,
        createdAt: new Date().toISOString(),
      };

      if (v.id) {
        // Mise à jour : on préserve createdAt depuis la liste courante.
        const existing = users.find((u) => u.id === v.id);
        const updatePayload: AdminUserPayload = {
          ...payload,
          createdAt: existing?.createdAt ?? payload.createdAt,
          lastLogin: existing?.lastLogin,
        };
        await update(v.id, updatePayload);
        // Changement de mot de passe via chemin dédié si renseigné.
        if (p.data.password && p.data.password.length >= 6) {
          await setPassword(p.data.email, p.data.password);
        }
        toast.success(t("admin.reglages.utilisateurs.toast_mis_a_jour"));
      } else {
        await create(payload);
        // setPassword après création — password ne transite pas dans le DTO.
        if (p.data.password) {
          await setPassword(p.data.email, p.data.password);
        }
        toast.success(t("admin.reglages.utilisateurs.toast_invite"));
      }
      setOpen(false);
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(u: AdminUser) {
    // Garde métier conservée — on n'élève pas la permission requise.
    if (u.role === "owner") {
      toast.error(t("admin.reglages.utilisateurs.toast_impossible_supprimer_owner"));
      return;
    }
    // Niveau 2 — vérification de la permission avant la mutation de suppression.
    if (!guard("manageUsers", t("admin.reglages.utilisateurs.garde_supprimer"))) return;
    if (!confirm(t("admin.reglages.utilisateurs.confirm_supprimer", { nom: u.name }))) return;
    setSaving(true);
    try {
      await remove(u.id);
      toast.success(t("admin.reglages.utilisateurs.toast_supprime"));
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  // En-têtes de colonnes : text-start explicite pour écraser le text-left en dur
  // de ui/table.tsx (motif identique à Products.tsx — voir convention §7).
  const COLONNES: { key: string; align?: "end" }[] = [
    { key: "admin.reglages.utilisateurs.col_nom" },
    { key: "admin.reglages.utilisateurs.col_email" },
    { key: "admin.reglages.utilisateurs.col_role" },
    { key: "admin.reglages.utilisateurs.col_derniere_connexion" },
    { key: "admin.reglages.utilisateurs.col_statut" },
    { key: "admin.socle.commun.actions", align: "end" },
  ];

  return (
    <AdminPageShell
      title={t("admin.reglages.utilisateurs.titre")}
      description={t("admin.reglages.utilisateurs.description", { n: users.length })}
      actions={
        // Niveau 1 — le bouton « Inviter » est masqué (bouton désactivé avec
        // infobulle) pour les non-propriétaires.
        can("manageUsers") ? (
          <Button onClick={openNew}>
            <Plus className="me-2 h-4 w-4" /> {t("admin.reglages.utilisateurs.inviter")}
          </Button>
        ) : (
          <span title={denyReason("manageUsers")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.reglages.utilisateurs.inviter")}
            </Button>
          </span>
        )
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

      {loading ? (
        <div className="overflow-hidden rounded-lg border" aria-busy="true">
          <span className="sr-only">{t("admin.reglages.utilisateurs.chargement")}</span>
          <div className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {COLONNES.map((c) => (
                  <TableHead
                    key={c.key}
                    className={[
                      c.key === "admin.socle.commun.actions" ? "w-[100px]" : "",
                      c.align === "end" ? "text-end" : "text-start",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {t(c.key)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLONNES.length}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {t("admin.reglages.utilisateurs.vide_aucun")}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      {/* Réutilisation de admin.socle.roles.* — ne pas redéclarer */}
                      <Badge variant={u.role === "owner" ? "default" : "secondary"}>
                        {t(`admin.socle.roles.${u.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      {u.active ? (
                        <Badge>{t("admin.reglages.utilisateurs.badge_actif")}</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t("admin.reglages.utilisateurs.badge_desactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {/* Niveau 1 — crayon désactivé pour les non-propriétaires.
                          Niveau 3 — infobulle portée par le <span>. */}
                      {can("manageUsers") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={saving}
                          onClick={() => openEdit(u)}
                          aria-label={t("admin.socle.commun.modifier")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span
                          title={denyReason("manageUsers")}
                          className="inline-flex align-middle"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            aria-label={t("admin.socle.commun.modifier")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </span>
                      )}
                      {/* Niveau 1 — corbeille désactivée pour les non-propriétaires. */}
                      {can("manageUsers") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={saving}
                          onClick={() => onDelete(u)}
                          aria-label={t("admin.socle.commun.supprimer")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <span
                          title={denyReason("manageUsers")}
                          className="inline-flex align-middle"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            aria-label={t("admin.socle.commun.supprimer")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {v.id
                ? t("admin.reglages.utilisateurs.dialog_modifier_titre")
                : t("admin.reglages.utilisateurs.dialog_inviter_titre")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.reglages.utilisateurs.champ_nom")}</Label>
              <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
              {err.name && <p className="mt-1 text-xs text-destructive">{err.name}</p>}
            </div>
            <div>
              <Label>{t("admin.reglages.utilisateurs.champ_email")}</Label>
              <Input
                type="email"
                value={v.email}
                onChange={(e) => setV({ ...v, email: e.target.value })}
              />
              {err.email && <p className="mt-1 text-xs text-destructive">{err.email}</p>}
            </div>
            <div>
              <Label>{t("admin.reglages.utilisateurs.champ_role")}</Label>
              <Select
                value={v.role}
                onValueChange={(x) => setV({ ...v, role: x as AdminUserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Réutilisation de admin.socle.roles.* — ne pas redéclarer */}
                  <SelectItem value="owner">{t("admin.socle.roles.owner")}</SelectItem>
                  <SelectItem value="admin">{t("admin.socle.roles.admin")}</SelectItem>
                  <SelectItem value="editor">{t("admin.socle.roles.editor")}</SelectItem>
                  <SelectItem value="viewer">{t("admin.socle.roles.viewer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <Label htmlFor="u-active" className="mb-0">
                {t("admin.reglages.utilisateurs.champ_actif")}
              </Label>
              <Switch
                id="u-active"
                checked={v.active}
                onCheckedChange={(x) => setV({ ...v, active: x })}
              />
            </div>
            <div>
              <Label>
                {v.id
                  ? t("admin.reglages.utilisateurs.champ_mdp_modifier")
                  : t("admin.reglages.utilisateurs.champ_mdp")}
              </Label>
              <Input
                type="password"
                value={v.password ?? ""}
                onChange={(e) => setV({ ...v, password: e.target.value })}
                placeholder={
                  v.id
                    ? t("admin.reglages.utilisateurs.champ_mdp_placeholder_modifier")
                    : t("admin.reglages.utilisateurs.champ_mdp_placeholder")
                }
              />
              {err.password && <p className="mt-1 text-xs text-destructive">{err.password}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("admin.socle.confirmation.annuler")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {t("admin.socle.commun.enregistrer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
