import { useMemo, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Search,
  PackageCheck,
  PackageX,
  PackageMinus,
  PackagePlus,
  History,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useProductList,
  useStockMovementList,
  useInventoryMutations,
  useSiteSettings,
  toApiError,
} from "@/data-provider";
import type { Product } from "@/data/products";
import { usePermissions } from "@/lib/admin-auth";
import { useLocalize, localize, type Localized, useI18n } from "@/lib/i18n";

import { toast } from "sonner";

/** Toutes les variantes d'un champ localisé, en minuscules — base de recherche. */
const haystack = (v: Localized<string> | undefined): string =>
  (typeof v === "object" && v !== null ? [v.fr, v.en, v.ar] : [v])
    .filter((s): s is string => typeof s === "string")
    .join(" ")
    .toLowerCase();

const STOCK_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  in: "default",
  low: "secondary",
  out: "destructive",
};

const STOCK_LABEL_KEY: Record<string, string> = {
  in: "admin.catalogue.commun.stock_in",
  low: "admin.catalogue.commun.stock_low",
  out: "admin.catalogue.commun.stock_out",
};

export default function AdminInventory() {
  const { data: products, loading: loadingProducts, error: errorProducts } = useProductList();
  const {
    data: stockMovements,
    loading: loadingMovements,
    error: errorMovements,
  } = useStockMovementList();
  const { data: siteSettings } = useSiteSettings();
  const { adjustStock } = useInventoryMutations();
  const { can, guard, denyReason } = usePermissions();
  const { lang, t } = useI18n();
  const L = useLocalize();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [edit, setEdit] = useState<Product | null>(null);
  const [delta, setDelta] = useState<string>("0");
  const [reason, setReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const kpi = useMemo(
    () => ({
      total: products.length,
      inStock: products.filter((p) => p.stock === "in").length,
      low: products.filter((p) => p.stock === "low").length,
      out: products.filter((p) => p.stock === "out").length,
    }),
    [products],
  );

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (statusFilter === "all" || p.stock === statusFilter) &&
        // Recherche dans toutes les variantes linguistiques — recette LOCALIZED-DATA §4.
        (!n || haystack(p.name).includes(n) || p.brand.toLowerCase().includes(n)),
    );
  }, [q, statusFilter, products]);

  // En-têtes du tableau — propriétés logiques pour RTL.
  const COLONNES_STOCK = [
    { key: "admin.catalogue.stock.col_produit" },
    { key: "admin.catalogue.stock.col_marque" },
    { key: "admin.catalogue.stock.col_categorie" },
    { key: "admin.catalogue.stock.col_qte", align: "end" as const },
    { key: "admin.catalogue.stock.col_statut" },
    { key: "admin.catalogue.stock.col_action", align: "end" as const },
  ];

  const COLONNES_MOUVEMENTS = [
    { key: "admin.catalogue.stock.col_date" },
    { key: "admin.catalogue.stock.col_produit" },
    { key: "admin.catalogue.stock.col_delta", align: "end" as const },
    { key: "admin.catalogue.stock.col_raison" },
  ];

  const cards = [
    {
      labelKey: "admin.catalogue.stock.kpi_total",
      value: kpi.total,
      Icon: PackageCheck,
      tone: "text-primary bg-primary/10",
      filter: "all" as const,
    },
    {
      labelKey: "admin.catalogue.stock.kpi_en_stock",
      value: kpi.inStock,
      Icon: PackageCheck,
      tone: "text-emerald-600 bg-emerald-500/10",
      filter: "in" as const,
    },
    {
      labelKey: "admin.catalogue.stock.kpi_faible",
      value: kpi.low,
      Icon: AlertTriangle,
      tone: "text-amber-600 bg-amber-500/10",
      filter: "low" as const,
    },
    {
      labelKey: "admin.catalogue.stock.kpi_rupture",
      value: kpi.out,
      Icon: PackageX,
      tone: "text-destructive bg-destructive/10",
      filter: "out" as const,
    },
  ];

  const openEdit = (p: Product) => {
    setEdit(p);
    setDelta("0");
    setReason("");
  };

  // Niveau 2 — vérification dans le handler avant toute mutation de stock.
  // La mutation transmet un delta au serveur — jamais de lecture puis écriture
  // depuis le composant. useInventoryMutations() garantit l'atomicité en phase 4.
  const saveAdjust = async () => {
    if (!edit) return;
    if (!guard("update", t("admin.catalogue.stock.ajuster_garde"))) return;
    const d = parseInt(delta, 10) || 0;
    if (d === 0) {
      toast.error(t("admin.catalogue.stock.erreur_delta_zero"));
      return;
    }
    if (!reason.trim()) {
      toast.error(t("admin.catalogue.stock.erreur_raison_requise"));
      return;
    }
    setSaving(true);
    try {
      await adjustStock(edit.id, { delta: d, reason: reason.trim() });
      toast.success(
        t("admin.catalogue.stock.toast_mis_a_jour", { nom: localize(edit.name, lang) ?? "" }),
      );
      setEdit(null);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const enTetesStock = (
    <TableHeader>
      <TableRow>
        {COLONNES_STOCK.map((c) => (
          <TableHead key={c.key} className={c.align === "end" ? "text-end" : "text-start"}>
            {t(c.key)}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );

  const enTetesMovements = (
    <TableHeader>
      <TableRow>
        {COLONNES_MOUVEMENTS.map((c) => (
          <TableHead key={c.key} className={c.align === "end" ? "text-end" : "text-start"}>
            {t(c.key)}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );

  // Squelettes de tableau pendant le chargement.
  if (loadingProducts) {
    return (
      <AdminPageShell
        title={t("admin.catalogue.stock.titre")}
        description={t("admin.catalogue.stock.description")}
      >
        <div className="overflow-hidden rounded-lg border" aria-busy="true">
          <Table>
            {enTetesStock}
            <TableBody>
              {Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ms-auto h-4 w-12 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ms-auto h-8 w-16 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.catalogue.stock.titre")}
      description={t("admin.catalogue.stock.description")}
    >
      {errorProducts && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorProducts.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.labelKey}
            type="button"
            onClick={() => setStatusFilter(c.filter)}
            className={`text-start ${statusFilter === c.filter ? "ring-2 ring-primary rounded-lg" : ""}`}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${c.tone}`}>
                  <c.Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t(c.labelKey)}</p>
                  <p className="text-lg font-semibold">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">
            <PackageCheck className="me-2 h-4 w-4" />
            {t("admin.catalogue.stock.onglet_produits")}
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="me-2 h-4 w-4" />
            {t("admin.catalogue.stock.onglet_mouvements", { n: stockMovements.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("admin.catalogue.stock.recherche_placeholder")}
              className="ps-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              {enTetesStock}
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ImageCatalogue
                          src={p.image}
                          alt=""
                          loading="lazy"
                          className="h-8 w-8 rounded object-cover"
                        />
                        <span className="font-medium">{L(p.name) ?? ""}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.brand}</TableCell>
                    <TableCell className="text-sm capitalize">{p.category}</TableCell>
                    <TableCell className="text-end font-mono text-sm">{p.stockQty ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={STOCK_VARIANT[p.stock]}>{t(STOCK_LABEL_KEY[p.stock])}</Badge>
                    </TableCell>
                    {/* Niveau 1 — désactiver le bouton Ajuster si update est interdit. */}
                    {/* Niveau 3 — infobulle portée par le <span>.                      */}
                    <TableCell className="text-end">
                      {can("update") ? (
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                          {t("admin.catalogue.stock.btn_ajuster")}
                        </Button>
                      ) : (
                        <span title={denyReason("update")} className="inline-flex">
                          <Button variant="outline" size="sm" disabled>
                            {t("admin.catalogue.stock.btn_ajuster")}
                          </Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {t("admin.catalogue.stock.vide_aucun_produit")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movements">
          {errorMovements && (
            <p
              role="status"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {errorMovements.message}
            </p>
          )}
          {loadingMovements ? (
            <div className="overflow-hidden rounded-lg border" aria-busy="true">
              <Table>
                {enTetesMovements}
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="ms-auto h-4 w-12 animate-pulse rounded bg-muted" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                {enTetesMovements}
                <TableBody>
                  {stockMovements.slice(0, 200).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-sm">{m.productName}</TableCell>
                      <TableCell
                        className={`text-end font-mono text-sm ${m.delta < 0 ? "text-destructive" : "text-emerald-600"}`}
                      >
                        {m.delta > 0 ? "+" : ""}
                        {m.delta}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.reason}</TableCell>
                    </TableRow>
                  ))}
                  {stockMovements.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        {t("admin.catalogue.stock.vide_aucun_mouvement")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.catalogue.stock.dialog_titre", {
                nom: localize(edit?.name, lang) ?? "",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">
                {t("admin.catalogue.stock.dialog_label_delta")}
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDelta((d) => String((parseInt(d, 10) || 0) - 1))}
                >
                  <PackageMinus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setDelta((d) => String((parseInt(d, 10) || 0) + 1))}
                >
                  <PackagePlus className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("admin.catalogue.stock.dialog_hint_delta")}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">
                {t("admin.catalogue.stock.dialog_label_raison")}
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("admin.catalogue.stock.dialog_placeholder_raison")}
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.catalogue.stock.dialog_seuils", {
                rupture: String(siteSettings.outOfStockThreshold),
                faible: String(siteSettings.lowStockThreshold),
              })}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              {t("admin.catalogue.stock.dialog_annuler")}
            </Button>
            <Button onClick={saveAdjust} disabled={saving}>
              {saving
                ? t("admin.catalogue.stock.dialog_enregistrement")
                : t("admin.catalogue.stock.dialog_enregistrer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
