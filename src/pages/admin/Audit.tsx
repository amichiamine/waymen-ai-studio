import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Search, ScrollText, Download, Trash2, AlertTriangle } from "lucide-react";
import { useAuditLogList } from "@/data-provider";
import { clearData } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

// `useAuditLogList()` est en lecture seule dans le provider — aucune mutation
// n'est exposée. Le vidage du journal reste une action directe sur le store,
// protégée par la garde `delete` (admin minimum) — voir DATA-PROVIDER.md §3.

function categoryOf(action: string): string {
  return action.split(".")[0] ?? "autre";
}
function badgeVariant(cat: string): "default" | "secondary" | "destructive" | "outline" {
  switch (cat) {
    case "order":
      return "default";
    case "stock":
      return "secondary";
    case "media":
      return "outline";
    case "product":
    case "brand":
    case "category":
      return "outline";
    default:
      return "secondary";
  }
}

export default function AdminAudit() {
  const { t } = useI18n();
  const { data: auditLogs, loading, error } = useAuditLogList();
  const { can, guard, denyReason } = usePermissions();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const categories = useMemo(() => {
    const s = new Set<string>();
    auditLogs.forEach((l) => s.add(categoryOf(l.action)));
    return ["all", ...Array.from(s).sort()];
  }, [auditLogs]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return auditLogs.filter((l) => {
      if (cat !== "all" && categoryOf(l.action) !== cat) return false;
      if (!n) return true;
      return (
        l.action.toLowerCase().includes(n) ||
        l.entity.toLowerCase().includes(n) ||
        l.actor.toLowerCase().includes(n) ||
        (l.detail ?? "").toLowerCase().includes(n)
      );
    });
  }, [auditLogs, q, cat]);

  const exportCsv = () => {
    // Export = lecture — `read` suffit. Niveau 2 dans l'action.
    if (!guard("read", t("admin.systeme.audit.btn_csv"))) return;
    const header = ["Date", "Acteur", "Action", "Entité", "Détail"];
    const lines = [
      header,
      ...auditLogs.map((l) => [l.createdAt, l.actor, l.action, l.entity, l.detail ?? ""]),
    ];
    const csv = lines
      .map((r) => r.map((v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ka-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t("admin.systeme.audit.toast_exporte"));
  };

  const clear = () => {
    // Vider le journal est une action destructive : clé `delete` (admin minimum).
    // Niveau 2 — vérification impérative avant la mutation.
    if (!guard("delete", t("admin.systeme.audit.btn_vider"))) return;
    if (!confirm(t("admin.systeme.audit.titre") + " ?")) return;
    clearData("auditLogs");
    toast.success(t("admin.systeme.audit.toast_vide"));
  };

  return (
    <AdminPageShell
      title={t("admin.systeme.audit.titre")}
      description={t("admin.systeme.audit.description", { n: auditLogs.length })}
      actions={
        <div className="flex gap-2">
          {/* Niveau 1 — affichage. Export (lecture) */}
          {can("read") ? (
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={auditLogs.length === 0 || loading}
            >
              <Download className="me-2 h-4 w-4" /> {t("admin.systeme.audit.btn_csv")}
            </Button>
          ) : (
            <span title={denyReason("read")} className="inline-flex">
              <Button variant="outline" disabled>
                <Download className="me-2 h-4 w-4" /> {t("admin.systeme.audit.btn_csv")}
              </Button>
            </span>
          )}
          {/* Niveau 1 — affichage. Vider (delete) */}
          {can("delete") ? (
            <Button variant="outline" onClick={clear} disabled={auditLogs.length === 0}>
              <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
              {t("admin.systeme.audit.btn_vider")}
            </Button>
          ) : (
            <span title={denyReason("delete")} className="inline-flex">
              <Button variant="outline" disabled>
                <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
                {t("admin.systeme.audit.btn_vider")}
              </Button>
            </span>
          )}
        </div>
      }
    >
      {/* Bandeau d'erreur — n'annule pas le rendu, data reste exploitable. */}
      {error && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      {/* Squelette pendant le chargement (inerte en mode mock). */}
      {loading ? (
        <div
          className="h-48 animate-pulse rounded-xl border border-border bg-card"
          aria-busy="true"
        >
          <span className="sr-only">{t("admin.socle.commun.chargement")}</span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("admin.systeme.audit.placeholder_recherche")}
                aria-label={t("admin.socle.commun.rechercher")}
                className="ps-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cat === c ? "default" : "outline"}
                  onClick={() => setCat(c)}
                >
                  {/* `all` est une valeur technique du filtre ; son libellé est traduit. */}
                  {c === "all" ? t("admin.systeme.audit.filtre_tous") : c}
                </Button>
              ))}
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground">
                <ScrollText className="h-8 w-8" />
                <p>{t("admin.systeme.audit.vide_titre")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] text-start">
                      {t("admin.systeme.audit.col_date")}
                    </TableHead>
                    <TableHead className="text-start">
                      {t("admin.systeme.audit.col_acteur")}
                    </TableHead>
                    <TableHead className="text-start">
                      {t("admin.systeme.audit.col_action")}
                    </TableHead>
                    <TableHead className="text-start">
                      {t("admin.systeme.audit.col_entite")}
                    </TableHead>
                    <TableHead className="text-start">
                      {t("admin.systeme.audit.col_detail")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-sm">{l.actor}</TableCell>
                      <TableCell>
                        {/* `l.action` est une valeur de base de données : elle ne se traduit pas. */}
                        <Badge
                          variant={badgeVariant(categoryOf(l.action))}
                          className="font-mono text-[10px]"
                        >
                          {l.action}
                        </Badge>
                      </TableCell>
                      {/* `l.entity` est une valeur de base de données : elle ne se traduit pas. */}
                      <TableCell className="text-sm">{l.entity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.detail ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-16 text-center text-sm text-muted-foreground"
                      >
                        {t("admin.systeme.audit.vide_filtre")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </AdminPageShell>
  );
}
