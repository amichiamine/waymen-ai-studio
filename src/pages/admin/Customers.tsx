import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Search, Mail, Phone, MapPin, Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { formatDZD } from "@/data/products";
import { WILAYAS } from "@/data/wilayas";
import { useCustomerList, useOrderList, useCustomerMutations, toApiError } from "@/data-provider";
import type { Customer, Order } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

/**
 * Les valeurs techniques de statut (`pending`, `processing`…) viennent de l'API
 * et ne changent JAMAIS — seul leur libellé d'affichage est traduit.
 * Motif calqué sur Products.tsx (STOCK_LABEL_KEY).
 */
const STATUS_KEY: Record<Order["status"], string> = {
  pending: "admin.ventes.commun.statut_pending",
  processing: "admin.ventes.commun.statut_processing",
  shipped: "admin.ventes.commun.statut_shipped",
  delivered: "admin.ventes.commun.statut_delivered",
  cancelled: "admin.ventes.commun.statut_cancelled",
};

const STATUS_VARIANT: Record<Order["status"], "default" | "secondary" | "destructive" | "outline"> =
  {
    pending: "outline",
    processing: "secondary",
    shipped: "secondary",
    delivered: "default",
    cancelled: "destructive",
  };

// ---------- Validation Zod ----------
// Les messages sont des clés i18n — traduits à l'affichage dans le formulaire.
const customerSchema = z.object({
  name: z.string().trim().min(2, "admin.ventes.clients.err_nom").max(100),
  email: z.string().trim().email("admin.ventes.clients.err_email").max(150),
  phone: z
    .string()
    .trim()
    .regex(/^0[5-7]\d{8}$/, "admin.ventes.clients.err_telephone")
    .max(20),
  wilaya: z.string().trim().min(1, "admin.ventes.clients.err_wilaya").max(100),
});
type CustomerFormValues = z.infer<typeof customerSchema>;

// ---------- Formulaire (panneau Dialog) ----------
type FormProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Customer;
  existingEmails: string[];
  canSave: boolean;
  onGuardFail: () => boolean;
  onSave: (customer: Customer) => Promise<void>;
  saving: boolean;
};

function CustomerForm({
  open,
  onOpenChange,
  initial,
  existingEmails,
  canSave,
  onGuardFail,
  onSave,
  saving,
}: FormProps) {
  const { t } = useI18n();
  const [v, setV] = useState<CustomerFormValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    wilaya: initial?.wilaya ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  // Réinitialiser quand le Dialog s'ouvre sur un nouveau contexte
  const [lastId, setLastId] = useState(initial?.id);
  if (initial?.id !== lastId) {
    setLastId(initial?.id);
    setV({
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      wilaya: initial?.wilaya ?? "",
    });
    setErr({});
  }

  async function save() {
    // Niveau 2 — vérification impérative avant toute mutation.
    if (!onGuardFail()) return;

    const parsed = customerSchema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        // Les messages sont des clés i18n — traduits ici.
        errs[i.path[0] as string] = t(i.message);
      });
      setErr(errs);
      return;
    }

    // Unicité email (hors client courant en modification)
    const otherEmails = initial
      ? existingEmails.filter((e) => e !== initial.email.toLowerCase())
      : existingEmails;
    if (otherEmails.includes(parsed.data.email.toLowerCase())) {
      setErr({ email: t("admin.ventes.clients.err_email_duplique") });
      return;
    }

    const now = new Date().toISOString();
    const customer: Customer = {
      id: initial?.id ?? `cus_${Date.now()}`,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      wilaya: parsed.data.wilaya,
      createdAt: initial?.createdAt ?? now,
      ordersCount: initial?.ordersCount ?? 0,
      totalSpent: initial?.totalSpent ?? 0,
    };
    await onSave(customer);
    setErr({});
    onOpenChange(false);
  }

  const wilayaNames = useMemo(() => WILAYAS.map((w) => w.name_fr).sort(), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t("admin.ventes.clients.form_titre_modifier")
              : t("admin.ventes.clients.form_titre_nouveau")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nom */}
          <div className="space-y-1">
            <Label htmlFor="cf-name">{t("admin.ventes.clients.form_nom")}</Label>
            <Input
              id="cf-name"
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              placeholder={t("admin.ventes.clients.form_nom_placeholder")}
              disabled={!canSave || saving}
            />
            {err.name && <p className="text-xs text-destructive">{err.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="cf-email">{t("admin.ventes.clients.form_email")}</Label>
            <Input
              id="cf-email"
              type="email"
              value={v.email}
              onChange={(e) => setV({ ...v, email: e.target.value })}
              placeholder={t("admin.ventes.clients.form_email_placeholder")}
              disabled={!canSave || saving}
            />
            {err.email && <p className="text-xs text-destructive">{err.email}</p>}
          </div>

          {/* Téléphone */}
          <div className="space-y-1">
            <Label htmlFor="cf-phone">{t("admin.ventes.clients.form_telephone")}</Label>
            <Input
              id="cf-phone"
              type="tel"
              value={v.phone}
              onChange={(e) => setV({ ...v, phone: e.target.value })}
              placeholder={t("admin.ventes.clients.form_telephone_placeholder")}
              disabled={!canSave || saving}
            />
            {err.phone && <p className="text-xs text-destructive">{err.phone}</p>}
          </div>

          {/* Wilaya — noms de wilaya : données référentielles, non traduites */}
          <div className="space-y-1">
            <Label htmlFor="cf-wilaya">{t("admin.ventes.clients.form_wilaya")}</Label>
            <Select
              value={v.wilaya}
              onValueChange={(x) => setV({ ...v, wilaya: x })}
              disabled={!canSave || saving}
            >
              <SelectTrigger id="cf-wilaya">
                <SelectValue placeholder={t("admin.ventes.clients.form_wilaya_placeholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {wilayaNames.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err.wilaya && <p className="text-xs text-destructive">{err.wilaya}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("admin.socle.confirmation.annuler")}
          </Button>
          <Button onClick={save} disabled={!canSave || saving}>
            {saving
              ? t("admin.ventes.clients.form_enregistrement")
              : t("admin.socle.commun.enregistrer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Page principale ----------
export default function AdminCustomers() {
  // Lecture via le fournisseur de données — remplace useAdminState().customers.
  // En mode mock, `loading` est faux dès le premier rendu et `error` reste nul.
  const { data: customers, loading: loadingCustomers, error: errorCustomers } = useCustomerList();
  const { data: orders, loading: loadingOrders } = useOrderList();
  const { upsert, remove } = useCustomerMutations();
  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  // Index email existants pour validation d'unicité
  const existingEmails = useMemo(() => customers.map((c) => c.email.toLowerCase()), [customers]);

  // Statistiques dérivées des commandes (source de vérité)
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; spent: number; last?: string }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const cur = map.get(o.customerId) ?? { count: 0, spent: 0 };
      cur.count += 1;
      cur.spent += o.total;
      if (!cur.last || cur.last < o.createdAt) cur.last = o.createdAt;
      map.set(o.customerId, cur);
    }
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return customers
      .map((c) => {
        const s = stats.get(c.id);
        return {
          ...c,
          ordersCount: s?.count ?? c.ordersCount,
          totalSpent: s?.spent ?? c.totalSpent,
          lastOrderAt: s?.last,
        };
      })
      .filter(
        (c) =>
          !n ||
          c.name.toLowerCase().includes(n) ||
          c.email.toLowerCase().includes(n) ||
          c.wilaya.toLowerCase().includes(n) ||
          c.phone.includes(n),
      )
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, q, stats]);

  // Commandes du client sélectionné (vue détail)
  const detailOrders = useMemo(
    () =>
      selected
        ? orders
            .filter((o) => o.customerId === selected.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [selected, orders],
  );
  const detailStats = useMemo(() => {
    const active = detailOrders.filter((o) => o.status !== "cancelled");
    return {
      ltv: active.reduce((s, o) => s + o.total, 0),
      count: active.length,
      aov: active.length ? Math.round(active.reduce((s, o) => s + o.total, 0) / active.length) : 0,
      last: detailOrders[0]?.createdAt,
    };
  }, [detailOrders]);

  // Nombre de commandes actives pour la garde métier de suppression.
  // Cette garde métier s'ajoute à la garde de permission `delete`.
  const deleteOrderCount = useMemo(() => {
    if (!toDelete) return 0;
    return orders.filter((o) => o.customerId === toDelete.id && o.status !== "cancelled").length;
  }, [toDelete, orders]);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setFormOpen(true);
  }

  // Garde retournée comme callback pour CustomerForm (niveau 2)
  function guardSave(): boolean {
    return guard(
      editing ? "update" : "create",
      editing ? t("admin.ventes.clients.garde_modifier") : t("admin.ventes.clients.garde_creer"),
    );
  }

  // Mutation asynchrone — désactive le formulaire pendant l'appel.
  async function handleSave(customer: Customer) {
    setSaving(true);
    try {
      await upsert(customer);
      toast.success(
        editing
          ? t("admin.ventes.clients.toast_modifie", { nom: customer.name })
          : t("admin.ventes.clients.toast_cree", { nom: customer.name }),
      );
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
      throw cause; // Ré-émettre pour que CustomerForm ne ferme pas le Dialog.
    } finally {
      setSaving(false);
    }
  }

  // Mutation asynchrone — désactive le bouton pendant l'appel.
  async function confirmDelete() {
    if (!toDelete) return;
    // Niveau 2 — vérification impérative. Ordre : garde de permission → mutation.
    if (!guard("delete", t("admin.ventes.clients.garde_supprimer"))) return;
    // Garde métier : refus si commandes actives. S'ajoute à la garde de permission.
    if (deleteOrderCount > 0) {
      setToDelete(null);
      return;
    }
    setSaving(true);
    try {
      await remove(toDelete.id);
      toast.success(t("admin.ventes.clients.toast_supprime", { nom: toDelete.name }));
      setToDelete(null);
      // Fermer la vue détail si le client supprimé y était affiché
      if (selected?.id === toDelete.id) setSelected(null);
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  // En-têtes — `text-start` explicite pour contrer le `text-left` en dur dans
  // `ui/table.tsx` (voir §7 de la convention i18n).
  const COLONNES: { key: string; align?: "end"; width?: string }[] = [
    { key: "admin.ventes.clients.col_nom" },
    { key: "admin.ventes.clients.col_email" },
    { key: "admin.ventes.clients.col_telephone" },
    { key: "admin.ventes.clients.col_wilaya" },
    { key: "admin.ventes.clients.col_commandes", align: "end" },
    { key: "admin.ventes.clients.col_depense", align: "end" },
    { key: "admin.ventes.clients.col_derniere_commande" },
    { key: "admin.socle.commun.actions", align: "end", width: "w-[140px]" },
  ];

  // Squelette de chargement — même structure que le tableau final.
  const isLoading = loadingCustomers || loadingOrders;

  return (
    <AdminPageShell
      title={t("admin.ventes.clients.titre")}
      description={t("admin.ventes.clients.description", { n: customers.length })}
      actions={
        // Niveau 1 — affichage. Niveau 3 — infobulle portée par le <span>.
        can("create") ? (
          <Button onClick={openNew}>
            <Plus className="me-2 h-4 w-4" /> {t("admin.ventes.clients.nouveau")}
          </Button>
        ) : (
          <span title={denyReason("create")} className="inline-flex">
            <Button disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.ventes.clients.nouveau")}
            </Button>
          </span>
        )
      }
    >
      {/* Erreur au-dessus du contenu, sans remplacer la page (§5.3). */}
      {errorCustomers && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorCustomers.message}
        </p>
      )}

      {/* Barre de recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("admin.ventes.clients.recherche_placeholder")}
          aria-label={t("admin.socle.commun.rechercher")}
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table principale */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLONNES.map((c) => (
                <TableHead
                  key={c.key}
                  className={[c.width, c.align === "end" ? "text-end" : "text-start"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {t(c.key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <tr className="sr-only" aria-busy="true">
                  <td>{t("admin.ventes.clients.chargement")}</td>
                </tr>
                {Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    {[120, 150, 100, 80, 50, 80, 80, 100].map((w, j) => (
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
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.email}</TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="text-sm">{c.wilaya}</TableCell>
                    <TableCell className="text-end">{c.ordersCount}</TableCell>
                    <TableCell className="text-end font-medium">
                      {formatDZD(c.totalSpent)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="me-1"
                        onClick={() => setSelected(c)}
                      >
                        {t("admin.ventes.clients.details")}
                      </Button>

                      {/* Modifier — niveau 1+3 */}
                      {can("update") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("admin.socle.commun.modifier")}
                          aria-label={t("admin.socle.commun.modifier")}
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span title={denyReason("update")} className="inline-flex align-middle">
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

                      {/* Supprimer — niveau 1+3 */}
                      <span
                        title={denyReason("delete") ?? t("admin.socle.commun.supprimer")}
                        className="inline-flex align-middle"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("admin.socle.commun.supprimer")}
                          disabled={!can("delete")}
                          onClick={() => setToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* État vide utile */}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={COLONNES.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {q
                        ? t("admin.ventes.clients.vide_recherche")
                        : t("admin.ventes.clients.vide_aucun")}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vue détail (Dialog lecture seule) */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {selected.email}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {selected.wilaya}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />{" "}
                  {t("admin.ventes.clients.inscrit_le", {
                    date: new Date(selected.createdAt).toLocaleDateString("fr-FR"),
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  {
                    label: t("admin.ventes.clients.kpi_ltv"),
                    value: formatDZD(detailStats.ltv),
                  },
                  {
                    label: t("admin.ventes.clients.kpi_commandes"),
                    value: detailStats.count.toString(),
                  },
                  {
                    label: t("admin.ventes.clients.kpi_panier_moyen"),
                    value: formatDZD(detailStats.aov),
                  },
                  {
                    label: t("admin.ventes.clients.kpi_derniere"),
                    value: detailStats.last
                      ? new Date(detailStats.last).toLocaleDateString("fr-FR")
                      : "—",
                  },
                ].map((k) => (
                  <div key={k.label} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="mt-1 text-sm font-semibold">{k.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  {t("admin.ventes.clients.historique_commandes")}
                </h3>
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">ID</TableHead>
                        <TableHead className="text-start">
                          {t("admin.ventes.commandes.col_date")}
                        </TableHead>
                        <TableHead className="text-start">
                          {t("admin.ventes.commandes.col_statut")}
                        </TableHead>
                        <TableHead className="text-end">
                          {t("admin.ventes.commandes.col_total")}
                        </TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[o.status]}>
                              {t(STATUS_KEY[o.status])}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end font-medium">
                            {formatDZD(o.total)}
                          </TableCell>
                          <TableCell className="text-end">
                            <Link
                              to={`/admin/orders/${o.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {t("admin.ventes.clients.ouvrir_commande")}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      {detailOrders.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-16 text-center text-sm text-muted-foreground"
                          >
                            {t("admin.ventes.clients.aucune_commande")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions dans la vue détail */}
              {can("update") && (
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelected(null);
                      openEdit(selected);
                    }}
                  >
                    <Pencil className="me-2 h-4 w-4" />
                    {t("admin.socle.commun.modifier")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formulaire création / modification */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        existingEmails={existingEmails}
        canSave={can(editing ? "update" : "create")}
        onGuardFail={guardSave}
        onSave={handleSave}
        saving={saving}
      />

      {/* Dialog de confirmation de suppression avec garde métier.
          La description utilise une clé i18n complète avec pluriel — jamais de
          phrase fragmentée autour d'un élément JSX (règle §5 de la convention). */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title={t("admin.ventes.clients.supprimer_titre")}
        description={
          toDelete
            ? deleteOrderCount > 0
              ? t("admin.ventes.clients.supprimer_bloque", {
                  nom: toDelete.name,
                  n: deleteOrderCount,
                })
              : t("admin.ventes.clients.supprimer_description", {
                  nom: toDelete.name,
                  email: toDelete.email,
                })
            : null
        }
        confirmLabel={t("admin.socle.commun.supprimer")}
        destructive
        onConfirm={deleteOrderCount > 0 ? () => setToDelete(null) : confirmDelete}
      />
    </AdminPageShell>
  );
}
