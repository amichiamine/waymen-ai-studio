import { useRef, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RotateCcw, Trash2, Database, Download, Upload } from "lucide-react";
import {
  useProductList,
  useCategoryList,
  useBrandList,
  useOrderList,
  useCustomerList,
  useCouponList,
  useReviewList,
  useUserList,
  useBlogPostList,
  useHomeReviewList,
  useTickerMessageList,
  useMarqueeBrandList,
  useAboutValueList,
  useBuilderStepList,
  useShippingRateList,
  usePaymentMethodList,
  useStockMovementList,
  useMediaAssetList,
  useNotificationList,
  useAuditLogList,
  useContactMessageList,
  useSubscriberList,
  toApiError,
  reinitialiserServeur,
  invalidateAll,
} from "@/data-provider";
import {
  resetData,
  clearData,
  exportState,
  importState,
  ARRAY_KEYS,
  type ArrayKey,
} from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

// Toutes les actions de cette page relèvent de `resetData` (propriétaire
// uniquement). C'est la page la plus destructive du back-office : chaque
// mutation — y compris l'import JSON qui écrase l'état — exige le niveau 2.

type ResetTarget = ArrayKey | "siteSettings" | "shippingSettings";

export default function AdminReset() {
  const { t } = useI18n();

  // Les libellés et descriptions des lignes viennent du dictionnaire i18n.
  // Les clés techniques (`products`, `orders`…) ne se traduisent pas.
  type Row = { key: ResetTarget; labelKey: string; descKey: string };
  const ROWS: Row[] = [
    {
      key: "products",
      labelKey: "admin.systeme.reset.row_products",
      descKey: "admin.systeme.reset.row_products_desc",
    },
    {
      key: "categories",
      labelKey: "admin.systeme.reset.row_categories",
      descKey: "admin.systeme.reset.row_categories_desc",
    },
    {
      key: "brands",
      labelKey: "admin.systeme.reset.row_brands",
      descKey: "admin.systeme.reset.row_brands_desc",
    },
    {
      key: "orders",
      labelKey: "admin.systeme.reset.row_orders",
      descKey: "admin.systeme.reset.row_orders_desc",
    },
    {
      key: "customers",
      labelKey: "admin.systeme.reset.row_customers",
      descKey: "admin.systeme.reset.row_customers_desc",
    },
    {
      key: "coupons",
      labelKey: "admin.systeme.reset.row_coupons",
      descKey: "admin.systeme.reset.row_coupons_desc",
    },
    {
      key: "reviews",
      labelKey: "admin.systeme.reset.row_reviews",
      descKey: "admin.systeme.reset.row_reviews_desc",
    },
    {
      key: "users",
      labelKey: "admin.systeme.reset.row_users",
      descKey: "admin.systeme.reset.row_users_desc",
    },
    {
      key: "blogPosts",
      labelKey: "admin.systeme.reset.row_blog_posts",
      descKey: "admin.systeme.reset.row_blog_posts_desc",
    },
    {
      key: "homeReviews",
      labelKey: "admin.systeme.reset.row_home_reviews",
      descKey: "admin.systeme.reset.row_home_reviews_desc",
    },
    {
      key: "tickerMessages",
      labelKey: "admin.systeme.reset.row_ticker_messages",
      descKey: "admin.systeme.reset.row_ticker_messages_desc",
    },
    {
      key: "marqueeBrands",
      labelKey: "admin.systeme.reset.row_marquee_brands",
      descKey: "admin.systeme.reset.row_marquee_brands_desc",
    },
    {
      key: "aboutValues",
      labelKey: "admin.systeme.reset.row_about_values",
      descKey: "admin.systeme.reset.row_about_values_desc",
    },
    {
      key: "builderSteps",
      labelKey: "admin.systeme.reset.row_builder_steps",
      descKey: "admin.systeme.reset.row_builder_steps_desc",
    },
    {
      key: "shippingRates",
      labelKey: "admin.systeme.reset.row_shipping_rates",
      descKey: "admin.systeme.reset.row_shipping_rates_desc",
    },
    {
      key: "paymentMethods",
      labelKey: "admin.systeme.reset.row_payment_methods",
      descKey: "admin.systeme.reset.row_payment_methods_desc",
    },
    {
      key: "stockMovements",
      labelKey: "admin.systeme.reset.row_stock_movements",
      descKey: "admin.systeme.reset.row_stock_movements_desc",
    },
    {
      key: "mediaAssets",
      labelKey: "admin.systeme.reset.row_media_assets",
      descKey: "admin.systeme.reset.row_media_assets_desc",
    },
    {
      key: "notifications",
      labelKey: "admin.systeme.reset.row_notifications",
      descKey: "admin.systeme.reset.row_notifications_desc",
    },
    {
      key: "auditLogs",
      labelKey: "admin.systeme.reset.row_audit_logs",
      descKey: "admin.systeme.reset.row_audit_logs_desc",
    },
    {
      key: "messages",
      labelKey: "admin.systeme.reset.row_messages",
      descKey: "admin.systeme.reset.row_messages_desc",
    },
    {
      key: "subscribers",
      labelKey: "admin.systeme.reset.row_subscribers",
      descKey: "admin.systeme.reset.row_subscribers_desc",
    },
    {
      key: "siteSettings",
      labelKey: "admin.systeme.reset.row_site_settings",
      descKey: "admin.systeme.reset.row_site_settings_desc",
    },
    {
      key: "shippingSettings",
      labelKey: "admin.systeme.reset.row_shipping_settings",
      descKey: "admin.systeme.reset.row_shipping_settings_desc",
    },
  ];

  // Lecture des listes via le provider — remplace useAdminState() pour les
  // compteurs. Les hooks sont appelés inconditionnellement (§6 piège conditionnel).
  const { data: products } = useProductList();
  const { data: categories } = useCategoryList();
  const { data: brands } = useBrandList();
  const { data: orders } = useOrderList();
  const { data: customers } = useCustomerList();
  const { data: coupons } = useCouponList();
  const { data: reviews } = useReviewList();
  const { data: users } = useUserList();
  const { data: blogPosts } = useBlogPostList();
  const { data: homeReviews } = useHomeReviewList();
  const { data: tickerMessages } = useTickerMessageList();
  const { data: marqueeBrands } = useMarqueeBrandList();
  const { data: aboutValues } = useAboutValueList();
  const { data: builderSteps } = useBuilderStepList();
  const { data: shippingRates } = useShippingRateList();
  const { data: paymentMethods } = usePaymentMethodList();
  const { data: stockMovements } = useStockMovementList();
  const { data: mediaAssets } = useMediaAssetList();
  const { data: notifications } = useNotificationList();
  const { data: auditLogs } = useAuditLogList();
  const { data: messages } = useContactMessageList();
  const { data: subscribers } = useSubscriberList();

  const { can, guard, denyReason } = usePermissions();
  const fileRef = useRef<HTMLInputElement>(null);

  type PendingAction =
    | { kind: "reset"; key: ResetTarget | "all"; label: string }
    | { kind: "clear"; key: ResetTarget; label: string }
    | { kind: "clearAll" }
    | { kind: "import"; json: string; fileName: string };

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);

  const totals: Record<ResetTarget, number> = {
    products: products.length,
    categories: categories.length,
    brands: brands.length,
    orders: orders.length,
    customers: customers.length,
    coupons: coupons.length,
    reviews: reviews.length,
    users: users.length,
    blogPosts: blogPosts.length,
    homeReviews: homeReviews.length,
    tickerMessages: tickerMessages.length,
    marqueeBrands: marqueeBrands.length,
    aboutValues: aboutValues.length,
    builderSteps: builderSteps.length,
    shippingRates: shippingRates.length,
    paymentMethods: paymentMethods.length,
    stockMovements: stockMovements.length,
    mediaAssets: mediaAssets.length,
    notifications: notifications.length,
    auditLogs: auditLogs.length,
    messages: messages.length,
    subscribers: subscribers.length,
    siteSettings: 1,
    shippingSettings: 1,
  };

  async function exec() {
    if (!pending) return;
    // Niveau 2 — vérification impérative dans l'exécuteur, avant toute mutation.
    // Cette page est la plus destructive : la garde s'applique à chaque chemin.
    if (!guard("resetData", t("admin.systeme.reset.dialog_confirmer"))) return;
    setSaving(true);
    try {
      if (pending.kind === "reset") {
        await reinitialiserServeur("reset", pending.key);
        resetData(pending.key);
        invalidateAll();
        if (pending.key === "all") {
          toast.success(t("admin.systeme.reset.toast_reinitialises", { label: pending.label }));
        } else {
          toast.success(t("admin.systeme.reset.toast_reinitialise", { label: pending.label }));
        }
      } else if (pending.kind === "clear") {
        await reinitialiserServeur("clear", pending.key);
        clearData(pending.key);
        invalidateAll();
        toast.success(t("admin.systeme.reset.toast_vide", { label: pending.label }));
      } else if (pending.kind === "clearAll") {
        await reinitialiserServeur("clear", "all");
        [...ARRAY_KEYS, "siteSettings" as const, "shippingSettings" as const].forEach((k) =>
          clearData(k),
        );
        invalidateAll();
        toast.success(t("admin.systeme.reset.toast_tout_vide"));
      } else if (pending.kind === "import") {
        const res = importState(pending.json);
        if (!res.ok) {
          toast.error(t("admin.systeme.reset.toast_import_echec", { message: res.error }));
          return;
        }
        const total = Object.values(res.counts).reduce((s, n) => s + n, 0);
        toast.success(
          t("admin.systeme.reset.toast_import_ok", {
            total: total.toString(),
            fichier: pending.fileName,
          }),
        );
      }
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(t("admin.systeme.reset.toast_action_echec", { message: err.message }));
    } finally {
      setSaving(false);
      setPending(null);
    }
  }

  function downloadJson() {
    // Export JSON = lecture — pas de garde `resetData`. Niveau 2 avec `read`.
    if (!guard("read", t("admin.systeme.reset.btn_exporter_json"))) return;
    try {
      const json = exportState();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `katech-admin-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("admin.systeme.reset.toast_export_ok"));
    } catch {
      toast.error(t("admin.systeme.reset.toast_export_echec"));
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) {
      toast.error(t("admin.systeme.reset.toast_fichier_trop_grand"));
      return;
    }
    // L'import écrase l'état — il demande `resetData`. Le setPending déclenche
    // la ConfirmDialog, et c'est `exec()` (avec sa garde) qui effectue l'import.
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setPending({ kind: "import", json: text, fileName: file.name });
    };
    reader.onerror = () => toast.error(t("admin.systeme.reset.toast_lecture_echec"));
    reader.readAsText(file);
  }

  // Niveau 1 — la page entière est réservée à `resetData`.
  const disabledReset = !can("resetData");

  const dialogTitle = !pending
    ? ""
    : pending.kind === "reset"
      ? t("admin.systeme.reset.dialog_reinitialiser_titre", { label: pending.label })
      : pending.kind === "clear"
        ? t("admin.systeme.reset.dialog_vider_titre", { label: pending.label })
        : pending.kind === "clearAll"
          ? t("admin.systeme.reset.dialog_vider_tout_titre")
          : t("admin.systeme.reset.dialog_importer_titre", { fichier: pending.fileName });

  const dialogDesc = !pending
    ? null
    : pending.kind === "import"
      ? t("admin.systeme.reset.dialog_import_desc")
      : t("admin.systeme.reset.dialog_destructive_desc");

  return (
    <AdminPageShell
      title={t("admin.systeme.reset.titre")}
      description={t("admin.systeme.reset.description")}
    >
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("admin.systeme.reset.alerte_titre")}</AlertTitle>
        <AlertDescription>{t("admin.systeme.reset.alerte_description")}</AlertDescription>
      </Alert>

      {/* ── Sauvegarde & restauration ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> {t("admin.systeme.reset.section_sauvegarde")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {/* Export JSON = lecture, accessible à tous les rôles admin. */}
          <Button variant="outline" onClick={downloadJson}>
            <Download className="me-2 h-4 w-4" /> {t("admin.systeme.reset.btn_exporter_json")}
          </Button>
          {/* Import = mutation → resetData. Niveau 1 — bouton désactivé. */}
          {can("resetData") ? (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="me-2 h-4 w-4" /> {t("admin.systeme.reset.btn_importer_json")}
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button variant="outline" disabled>
                <Upload className="me-2 h-4 w-4" /> {t("admin.systeme.reset.btn_importer_json")}
              </Button>
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFileChosen}
          />
        </CardContent>
      </Card>

      {/* ── Actions globales ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" /> {t("admin.systeme.reset.section_global")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {can("resetData") ? (
            <Button
              disabled={saving}
              onClick={() =>
                setPending({
                  kind: "reset",
                  key: "all",
                  label: t("admin.systeme.reset.btn_reinitialiser_tout"),
                })
              }
            >
              <RotateCcw className="me-2 h-4 w-4" />{" "}
              {t("admin.systeme.reset.btn_reinitialiser_tout")}
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button disabled>
                <RotateCcw className="me-2 h-4 w-4" />{" "}
                {t("admin.systeme.reset.btn_reinitialiser_tout")}
              </Button>
            </span>
          )}
          {can("resetData") ? (
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => setPending({ kind: "clearAll" })}
            >
              <Trash2 className="me-2 h-4 w-4" /> {t("admin.systeme.reset.btn_vider_tout")}
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button variant="destructive" disabled>
                <Trash2 className="me-2 h-4 w-4" /> {t("admin.systeme.reset.btn_vider_tout")}
              </Button>
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Par type de données ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.systeme.reset.section_par_type")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {ROWS.map((r) => {
            const label = t(r.labelKey);
            const desc = t(r.descKey);
            const count = totals[r.key];
            const countLabel =
              r.key === "siteSettings" || r.key === "shippingSettings"
                ? t("admin.systeme.reset.objet_unique")
                : t("admin.systeme.reset.enregistrement", { n: count });
            return (
              <div key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {label}
                    <span className="ms-2 text-xs text-muted-foreground">{countLabel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <div className="flex gap-2">
                  {/* Niveau 1 — chaque bouton désactivé porte son infobulle. */}
                  {can("resetData") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() =>
                        setPending({ kind: "reset", key: r.key, label: label.toLowerCase() })
                      }
                    >
                      <RotateCcw className="me-2 h-4 w-4" />{" "}
                      {t("admin.systeme.reset.btn_reinitialiser")}
                    </Button>
                  ) : (
                    <span title={denyReason("resetData")} className="inline-flex">
                      <Button size="sm" variant="outline" disabled>
                        <RotateCcw className="me-2 h-4 w-4" />{" "}
                        {t("admin.systeme.reset.btn_reinitialiser")}
                      </Button>
                    </span>
                  )}
                  {can("resetData") ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={saving}
                      onClick={() =>
                        setPending({ kind: "clear", key: r.key, label: label.toLowerCase() })
                      }
                    >
                      <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
                      {t("admin.systeme.reset.btn_vider")}
                    </Button>
                  ) : (
                    <span title={denyReason("resetData")} className="inline-flex">
                      <Button size="sm" variant="ghost" disabled>
                        <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
                        {t("admin.systeme.reset.btn_vider")}
                      </Button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
        title={dialogTitle}
        description={dialogDesc}
        confirmLabel={
          pending?.kind === "import"
            ? t("admin.systeme.reset.dialog_confirmer_import")
            : t("admin.systeme.reset.dialog_confirmer")
        }
        destructive={
          pending?.kind === "clear" ||
          pending?.kind === "clearAll" ||
          pending?.kind === "import" ||
          (pending?.kind === "reset" && pending.key === "all")
        }
        onConfirm={exec}
      />

      {/* Niveau 1 — bannière informative quand l'accès est refusé. */}
      {disabledReset && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("admin.systeme.reset.acces_restreint_titre")}</AlertTitle>
          <AlertDescription>
            {denyReason("resetData") ?? t("admin.systeme.reset.acces_restreint_desc")}
          </AlertDescription>
        </Alert>
      )}
    </AdminPageShell>
  );
}
