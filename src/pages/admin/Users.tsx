import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
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
import {
  useAdminState,
  upsertUser,
  deleteUser,
  type AdminUser,
  type AdminUserRole,
} from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

// La page est CONSULTABLE par les administrateurs (read), mais toutes les
// mutations (créer, modifier, supprimer, changer de rôle, changer un mot de
// passe) sont réservées au propriétaire via `manageUsers`. Sans cela, un
// `admin` pourrait se promouvoir `owner` en deux clics — élévation de
// privilèges. Voir docs/PERMISSIONS.md §2 justification 3.

const ROLE_LABEL: Record<AdminUserRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  editor: "Éditeur",
  viewer: "Lecteur",
};

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(120),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
  active: z.boolean(),
  password: z.string().max(72).optional(),
});

type V = z.infer<typeof schema> & { id?: string };

export default function AdminUsers() {
  const { users } = useAdminState();
  const { can, guard, denyReason } = usePermissions();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<V>({
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

  function save() {
    // Niveau 2 — vérification impérative dans le handler, avant toute mutation.
    // Le masquage du bouton ne protège pas contre une invocation directe ou un
    // état obsolète (rôle changé pendant que la boîte était ouverte).
    if (!guard("manageUsers", "Enregistrer l'utilisateur")) return;
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
      setErr({ email: "Email déjà utilisé" });
      return;
    }
    if (!v.id && (!p.data.password || p.data.password.length < 6)) {
      setErr({ password: "Mot de passe (6 caractères min.) requis pour un nouveau compte" });
      return;
    }
    if (v.id && p.data.password && p.data.password.length < 6) {
      setErr({ password: "6 caractères minimum" });
      return;
    }
    const existing = users.find((u) => u.id === v.id);
    const user: AdminUser = {
      id: v.id ?? `usr_${Date.now()}`,
      name: p.data.name,
      email: p.data.email,
      role: p.data.role,
      active: p.data.active,
      password: p.data.password ? p.data.password : existing?.password,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastLogin: existing?.lastLogin,
    };
    upsertUser(user);
    toast.success(v.id ? "Utilisateur mis à jour" : "Utilisateur invité");
    setOpen(false);
  }

  function onDelete(u: AdminUser) {
    // Garde métier existante conservée — on n'élève pas la permission requise.
    if (u.role === "owner") {
      toast.error("Impossible de supprimer le propriétaire.");
      return;
    }
    // Niveau 2 — vérification de la permission avant la mutation de suppression.
    if (!guard("manageUsers", "Supprimer l'utilisateur")) return;
    if (!confirm(`Supprimer ${u.name} ?`)) return;
    deleteUser(u.id);
    toast.success("Utilisateur supprimé");
  }

  return (
    <AdminPageShell
      title="Utilisateurs & rôles"
      description={`${users.length} membres de l'équipe.`}
      actions={
        // Niveau 1 — le bouton « Inviter » est masqué (bouton désactivé avec
        // infobulle) pour les non-propriétaires.
        can("manageUsers") ? (
          <Button onClick={openNew}>
            <Plus className="me-2 h-4 w-4" /> Inviter
          </Button>
        ) : (
          <span title={denyReason("manageUsers")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> Inviter
            </Button>
          </span>
        )
      }
    >
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[100px] text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "owner" ? "default" : "secondary"}>
                    {ROLE_LABEL[u.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                <TableCell>
                  {u.active ? <Badge>Actif</Badge> : <Badge variant="secondary">Désactivé</Badge>}
                </TableCell>
                <TableCell className="text-end">
                  {/* Niveau 1 — crayon désactivé pour les non-propriétaires.
                      Niveau 3 — infobulle portée par le <span>. */}
                  {can("manageUsers") ? (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span title={denyReason("manageUsers")} className="inline-flex align-middle">
                      <Button variant="ghost" size="icon" disabled aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </span>
                  )}
                  {/* Niveau 1 — corbeille désactivée pour les non-propriétaires. */}
                  {can("manageUsers") ? (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(u)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : (
                    <span title={denyReason("manageUsers")} className="inline-flex align-middle">
                      <Button variant="ghost" size="icon" disabled aria-label="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{v.id ? "Modifier l'utilisateur" : "Inviter un membre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom</Label>
              <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
              {err.name && <p className="mt-1 text-xs text-destructive">{err.name}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={v.email}
                onChange={(e) => setV({ ...v, email: e.target.value })}
              />
              {err.email && <p className="mt-1 text-xs text-destructive">{err.email}</p>}
            </div>
            <div>
              <Label>Rôle</Label>
              <Select
                value={v.role}
                onValueChange={(x) => setV({ ...v, role: x as AdminUserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="editor">Éditeur</SelectItem>
                  <SelectItem value="viewer">Lecteur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <Label htmlFor="u-active" className="mb-0">
                Actif
              </Label>
              <Switch
                id="u-active"
                checked={v.active}
                onCheckedChange={(x) => setV({ ...v, active: x })}
              />
            </div>
            <div>
              <Label>
                {v.id ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe"}
              </Label>
              <Input
                type="password"
                value={v.password ?? ""}
                onChange={(e) => setV({ ...v, password: e.target.value })}
                placeholder={v.id ? "••••••" : "6 caractères minimum"}
              />
              {err.password && <p className="mt-1 text-xs text-destructive">{err.password}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
