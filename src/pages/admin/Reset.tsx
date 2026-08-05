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

// Toutes les actions de cette page relèvent de `resetData` (propriétaire
// uniquement). C'est la page la plus destructive du back-office : chaque
// mutation — y compris l'import JSON qui écrase l'état — exige le niveau 2.

type ResetTarget = ArrayKey | "siteSettings" | "shippingSettings";
type Row = { key: ResetTarget; label: string; description: string };

const ROWS: Row[] = [
  { key: "products", label: "Produits", description: "Catalogue local des produits." },
  { key: "categories", label: "Catégories", description: "Rubriques du catalogue." },
  { key: "brands", label: "Marques", description: "Marques référencées." },
  { key: "orders", label: "Commandes", description: "Commandes clients." },
  { key: "customers", label: "Clients", description: "Base clients." },
  { key: "coupons", label: "Coupons", description: "Codes promo." },
  { key: "reviews", label: "Avis produits", description: "Avis clients à modérer." },
  { key: "users", label: "Utilisateurs admin", description: "Membres de l'équipe." },
  { key: "blogPosts", label: "Articles de blog", description: "Publications du blog." },
  { key: "homeReviews", label: "Avis d'accueil", description: "Témoignages en page d'accueil." },
  {
    key: "tickerMessages",
    label: "Bandeau défilant",
    description: "Messages du ruban en haut de page.",
  },
  {
    key: "marqueeBrands",
    label: "Marques défilantes",
    description: "Logos textuels du carrousel de marques.",
  },
  {
    key: "aboutValues",
    label: "Valeurs (À propos)",
    description: "Cartes d'engagements de la page À propos.",
  },
  {
    key: "builderSteps",
    label: "Étapes du configurateur",
    description: "Composants et options du builder PC.",
  },
  {
    key: "shippingRates",
    label: "Tarifs de livraison",
    description: "Tarifs par wilaya (domicile / bureau).",
  },
  {
    key: "paymentMethods",
    label: "Moyens de paiement",
    description: "Modes de paiement proposés au checkout.",
  },
  {
    key: "stockMovements",
    label: "Mouvements de stock",
    description: "Journal des ajustements de stock.",
  },
  {
    key: "mediaAssets",
    label: "Médiathèque",
    description: "Images téléversées disponibles pour le contenu.",
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Notifications internes de l'admin.",
  },
  { key: "auditLogs", label: "Journal d'audit", description: "Actions effectuées dans l'admin." },
  { key: "messages", label: "Messages de contact", description: "Messages reçus via /contact." },
  {
    key: "subscribers",
    label: "Inscrits newsletter",
    description: "E-mails collectés via le pied de page.",
  },
  {
    key: "siteSettings",
    label: "Paramètres du site",
    description: "Nom, contact, WhatsApp, adresse, horaires.",
  },
  {
    key: "shippingSettings",
    label: "Réglages livraison",
    description: "Franco de port, activation des modes de livraison.",
  },
];

type PendingAction =
  | { kind: "reset"; key: ResetTarget | "all"; label: string }
  | { kind: "clear"; key: ResetTarget; label: string }
  | { kind: "clearAll" }
  | { kind: "import"; json: string; fileName: string };

export default function AdminReset() {
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
    if (!guard("resetData", "Confirmer l'action")) return;
    setSaving(true);
    try {
      if (pending.kind === "reset") {
        resetData(pending.key);
        toast.success(`${pending.label} réinitialisé${pending.key === "all" ? "es" : ""}`);
      } else if (pending.kind === "clear") {
        clearData(pending.key);
        toast.success(`${pending.label} vidé`);
      } else if (pending.kind === "clearAll") {
        [...ARRAY_KEYS, "siteSettings" as const, "shippingSettings" as const].forEach((k) =>
          clearData(k),
        );
        toast.success("Toutes les données ont été vidées");
      } else if (pending.kind === "import") {
        const res = importState(pending.json);
        if (!res.ok) {
          toast.error(`Import échoué : ${res.error}`);
          return;
        }
        const total = Object.values(res.counts).reduce((s, n) => s + n, 0);
        toast.success(`Import réussi (${total} enregistrements depuis ${pending.fileName})`);
      }
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(`Action échouée : ${err.message}`);
    } finally {
      setSaving(false);
      setPending(null);
    }
  }

  function downloadJson() {
    // Export JSON = lecture — pas de garde `resetData`. Niveau 2 avec `read`.
    if (!guard("read", "Exporter en JSON")) return;
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
      toast.success("Export téléchargé");
    } catch {
      toast.error("Échec de l'export");
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) {
      toast.error("Fichier trop volumineux (>5 Mo)");
      return;
    }
    // L'import écrase l'état — il demande `resetData`. Le setPending déclenche
    // la ConfirmDialog, et c'est `exec()` (avec sa garde) qui effectue l'import.
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setPending({ kind: "import", json: text, fileName: file.name });
    };
    reader.onerror = () => toast.error("Impossible de lire le fichier");
    reader.readAsText(file);
  }

  // Niveau 1 — la page entière est réservée à `resetData`.
  const disabledReset = !can("resetData");

  const dialogTitle = !pending
    ? ""
    : pending.kind === "reset"
      ? `Réinitialiser ${pending.label} ?`
      : pending.kind === "clear"
        ? `Vider ${pending.label} ?`
        : pending.kind === "clearAll"
          ? "Vider TOUTES les données ?"
          : `Importer « ${pending.fileName} » ?`;

  const dialogDesc = !pending
    ? null
    : pending.kind === "import"
      ? "Cela remplacera toutes les données locales par le contenu du fichier."
      : "Cette action est irréversible sur les données locales du navigateur.";

  return (
    <AdminPageShell
      title="Réinitialisation des données"
      description="Restaurer, vider, exporter ou importer les données locales de la boutique."
    >
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Attention</AlertTitle>
        <AlertDescription>
          Ces actions modifient uniquement les données locales (localStorage) de ce navigateur.
        </AlertDescription>
      </Alert>

      {/* ── Sauvegarde & restauration ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Sauvegarde & restauration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {/* Export JSON = lecture, accessible à tous les rôles admin. */}
          <Button variant="outline" onClick={downloadJson}>
            <Download className="me-2 h-4 w-4" /> Exporter en JSON
          </Button>
          {/* Import = mutation → resetData. Niveau 1 — bouton désactivé. */}
          {can("resetData") ? (
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="me-2 h-4 w-4" /> Importer un JSON…
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button variant="outline" disabled>
                <Upload className="me-2 h-4 w-4" /> Importer un JSON…
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
            <Database className="h-4 w-4" /> Actions globales
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {can("resetData") ? (
            <Button
              disabled={saving}
              onClick={() => setPending({ kind: "reset", key: "all", label: "toutes les données" })}
            >
              <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser toute la boutique
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button disabled>
                <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser toute la boutique
              </Button>
            </span>
          )}
          {can("resetData") ? (
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => setPending({ kind: "clearAll" })}
            >
              <Trash2 className="me-2 h-4 w-4" /> Tout vider
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button variant="destructive" disabled>
                <Trash2 className="me-2 h-4 w-4" /> Tout vider
              </Button>
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Par type de données ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Par type de données</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {ROWS.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.label}
                  <span className="ms-2 text-xs text-muted-foreground">
                    {r.key === "siteSettings" || r.key === "shippingSettings"
                      ? "objet unique"
                      : `${totals[r.key]} enregistrement${totals[r.key] > 1 ? "s" : ""}`}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
              <div className="flex gap-2">
                {/* Niveau 1 — chaque bouton désactivé porte son infobulle. */}
                {can("resetData") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      setPending({ kind: "reset", key: r.key, label: r.label.toLowerCase() })
                    }
                  >
                    <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
                  </Button>
                ) : (
                  <span title={denyReason("resetData")} className="inline-flex">
                    <Button size="sm" variant="outline" disabled>
                      <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
                    </Button>
                  </span>
                )}
                {can("resetData") ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() =>
                      setPending({ kind: "clear", key: r.key, label: r.label.toLowerCase() })
                    }
                  >
                    <Trash2 className="me-2 h-4 w-4 text-destructive" /> Vider
                  </Button>
                ) : (
                  <span title={denyReason("resetData")} className="inline-flex">
                    <Button size="sm" variant="ghost" disabled>
                      <Trash2 className="me-2 h-4 w-4 text-destructive" /> Vider
                    </Button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
        title={dialogTitle}
        description={dialogDesc}
        confirmLabel={pending?.kind === "import" ? "Importer" : "Confirmer"}
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
          <AlertTitle>Accès restreint</AlertTitle>
          <AlertDescription>
            {denyReason("resetData") ??
              "La réinitialisation des données est réservée au Propriétaire."}
          </AlertDescription>
        </Alert>
      )}
    </AdminPageShell>
  );
}
