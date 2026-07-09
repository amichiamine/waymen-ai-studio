import { useRef, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RotateCcw, Trash2, Database, Download, Upload } from "lucide-react";
import {
  useAdminState, resetData, clearData, exportState, importState,
  ARRAY_KEYS, type ArrayKey,
} from "@/lib/admin-store";

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
  { key: "tickerMessages", label: "Bandeau défilant", description: "Messages du ruban en haut de page." },
  { key: "marqueeBrands", label: "Marques défilantes", description: "Logos textuels du carrousel de marques." },
  { key: "aboutValues", label: "Valeurs (À propos)", description: "Cartes d'engagements de la page À propos." },
  { key: "builderSteps", label: "Étapes du configurateur", description: "Composants et options du builder PC." },
  { key: "shippingRates", label: "Tarifs de livraison", description: "Tarifs par wilaya (domicile / bureau)." },
  { key: "paymentMethods", label: "Moyens de paiement", description: "Modes de paiement proposés au checkout." },
  { key: "stockMovements", label: "Mouvements de stock", description: "Journal des ajustements de stock." },
  { key: "siteSettings", label: "Paramètres du site", description: "Nom, contact, WhatsApp, adresse, horaires." },
  { key: "shippingSettings", label: "Réglages livraison", description: "Franco de port, activation des modes de livraison." },
];

type PendingAction =
  | { kind: "reset"; key: ResetTarget | "all"; label: string }
  | { kind: "clear"; key: ResetTarget; label: string }
  | { kind: "clearAll" }
  | { kind: "import"; json: string; fileName: string };

export default function AdminReset() {
  const state = useAdminState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const totals: Record<ResetTarget, number> = {
    products: state.products.length,
    categories: state.categories.length,
    brands: state.brands.length,
    orders: state.orders.length,
    customers: state.customers.length,
    coupons: state.coupons.length,
    reviews: state.reviews.length,
    users: state.users.length,
    blogPosts: state.blogPosts.length,
    homeReviews: state.homeReviews.length,
    tickerMessages: state.tickerMessages.length,
    marqueeBrands: state.marqueeBrands.length,
    aboutValues: state.aboutValues.length,
    builderSteps: state.builderSteps.length,
    shippingRates: state.shippingRates.length,
    paymentMethods: state.paymentMethods.length,
    stockMovements: state.stockMovements.length,
    siteSettings: 1,
    shippingSettings: 1,
  };

  function exec() {
    if (!pending) return;
    try {
      if (pending.kind === "reset") {
        resetData(pending.key);
        toast.success(`${pending.label} réinitialisé${pending.key === "all" ? "es" : ""}`);
      } else if (pending.kind === "clear") {
        clearData(pending.key);
        toast.success(`${pending.label} vidé`);
      } else if (pending.kind === "clearAll") {
        [...ARRAY_KEYS, "siteSettings" as const, "shippingSettings" as const].forEach((k) => clearData(k));
        toast.success("Toutes les données ont été vidées");
      } else if (pending.kind === "import") {
        const res = importState(pending.json);
        if (!res.ok) { toast.error(`Import échoué : ${res.error}`); return; }
        const total = Object.values(res.counts).reduce((s, n) => s + n, 0);
        toast.success(`Import réussi (${total} enregistrements depuis ${pending.fileName})`);
      }
    } catch (e) {
      toast.error(`Action échouée : ${e instanceof Error ? e.message : "erreur inconnue"}`);
    }
  }

  function downloadJson() {
    try {
      const json = exportState();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `katech-admin-${stamp}.json`;
      document.body.appendChild(a); a.click(); a.remove();
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
    if (file.size > 5_000_000) { toast.error("Fichier trop volumineux (>5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setPending({ kind: "import", json: text, fileName: file.name });
    };
    reader.onerror = () => toast.error("Impossible de lire le fichier");
    reader.readAsText(file);
  }

  const dialogTitle =
    !pending ? "" :
    pending.kind === "reset" ? `Réinitialiser ${pending.label} ?` :
    pending.kind === "clear" ? `Vider ${pending.label} ?` :
    pending.kind === "clearAll" ? "Vider TOUTES les données ?" :
    `Importer « ${pending.fileName} » ?`;

  const dialogDesc =
    !pending ? null :
    pending.kind === "import"
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Sauvegarde & restauration</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadJson}>
            <Download className="mr-2 h-4 w-4" /> Exporter en JSON
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importer un JSON…
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFileChosen} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Actions globales</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setPending({ kind: "reset", key: "all", label: "toutes les données" })}>
            <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser toute la boutique
          </Button>
          <Button variant="destructive" onClick={() => setPending({ kind: "clearAll" })}>
            <Trash2 className="mr-2 h-4 w-4" /> Tout vider
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Par type de données</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {ROWS.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.key === "siteSettings" || r.key === "shippingSettings"
                      ? "objet unique"
                      : `${totals[r.key]} enregistrement${totals[r.key] > 1 ? "s" : ""}`}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPending({ kind: "reset", key: r.key, label: r.label.toLowerCase() })}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "clear", key: r.key, label: r.label.toLowerCase() })}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Vider
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={dialogTitle}
        description={dialogDesc}
        confirmLabel={pending?.kind === "import" ? "Importer" : "Confirmer"}
        destructive={pending?.kind === "clear" || pending?.kind === "clearAll"}
        onConfirm={exec}
      />
    </AdminPageShell>
  );
}
