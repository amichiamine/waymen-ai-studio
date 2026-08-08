import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Check, X, Trash2, Star, Plus, Pencil, Save } from "lucide-react";
import {
  useReviewList,
  useReviewMutations,
  useHomeReviewList,
  useHomeReviewMutations,
  useProductList,
  toApiError,
} from "@/data-provider";
import type { HomeReview } from "@/api/types";
import type { ReviewStatus } from "@/api/types";
import { usePermissions } from "@/lib/admin-auth";
import { useLocalize, useI18n } from "@/lib/i18n";

/**
 * Les valeurs techniques de statut d'avis (`pending`, `approved`, `rejected`)
 * ne changent pas — seul leur libellé d'affichage est traduit.
 */
const REVIEW_STATUS_KEY: Record<ReviewStatus, string> = {
  pending: "admin.ventes.commun.avis_pending",
  approved: "admin.ventes.commun.avis_approved",
  rejected: "admin.ventes.commun.avis_rejected",
};

const REVIEW_STATUS_VARIANT: Record<ReviewStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function AdminReviews() {
  const { data: reviews, loading: loadingReviews, error: errorReviews } = useReviewList();
  const { data: homeReviews, loading: loadingHome, error: errorHome } = useHomeReviewList();
  const { data: products } = useProductList();
  const { moderate, remove: removeReview } = useReviewMutations();
  const { upsert: upsertHomeReview, remove: removeHomeReview } = useHomeReviewMutations();
  const { can, guard, denyReason } = usePermissions();
  const L = useLocalize();
  const { t } = useI18n();
  const [tab, setTab] = useState<"product" | "home">("product");
  const [statusTab, setStatusTab] = useState<"all" | ReviewStatus>("all");
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "product" | "home";
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Libellés du sélecteur de produit, résolus une seule fois dans la langue
  // active. `HomeReviewsEditor` ne reçoit donc que des `string` : il affiche le
  // nom et l'écrit tel quel s'il devient une empreinte, sans jamais manipuler un
  // `Localized`.
  const productOptions = useMemo(
    () => products.map((p) => ({ id: p.id, name: L(p.name) ?? "" })),
    [products, L],
  );

  const rows = useMemo(() => {
    return reviews
      .filter((r) => statusTab === "all" || r.status === statusTab)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reviews, statusTab]);

  const counts = useMemo(
    () => ({
      all: reviews.length,
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
    }),
    [reviews],
  );

  // Niveau 2 — vérification dans le handler de confirmation de suppression.
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (!guard("delete", t("admin.ventes.avis.garde_supprimer"))) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === "product") {
        await removeReview(pendingDelete.id);
      } else {
        await removeHomeReview(pendingDelete.id);
      }
      toast.success(t("admin.ventes.avis.toast_supprime"));
      setPendingDelete(null);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const loading = loadingReviews || loadingHome;

  if (loading) {
    return (
      <AdminPageShell
        title={t("admin.ventes.avis.titre")}
        description={t("admin.socle.commun.chargement")}
      >
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("admin.ventes.avis.titre")}
      description={t("admin.ventes.avis.description", {
        produits: reviews.length,
        accueil: homeReviews.length,
      })}
    >
      {(errorReviews || errorHome) && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorReviews?.message ?? errorHome?.message}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "product" | "home")}>
        <TabsList>
          <TabsTrigger value="product">
            {t("admin.ventes.avis.onglet_produits", { n: reviews.length })}
          </TabsTrigger>
          <TabsTrigger value="home">
            {t("admin.ventes.avis.onglet_accueil", { n: homeReviews.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="mt-4 space-y-4">
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as "all" | ReviewStatus)}>
            <TabsList>
              <TabsTrigger value="all">
                {t("admin.ventes.avis.filtre_tous", { n: counts.all })}
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t("admin.ventes.avis.filtre_pending", { n: counts.pending })}
              </TabsTrigger>
              <TabsTrigger value="approved">
                {t("admin.ventes.avis.filtre_approuves", { n: counts.approved })}
              </TabsTrigger>
              <TabsTrigger value="rejected">
                {t("admin.ventes.avis.filtre_rejetes", { n: counts.rejected })}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-3">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                          />
                        ))}
                        <span className="text-sm font-medium">{r.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("admin.ventes.avis.meta", {
                          auteur: r.customerName,
                          produit: r.productName,
                          date: new Date(r.createdAt).toLocaleDateString("fr-FR"),
                        })}
                      </p>
                    </div>
                    <Badge variant={REVIEW_STATUS_VARIANT[r.status]}>
                      {t(REVIEW_STATUS_KEY[r.status])}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm">{r.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Niveau 1 + 3 — approuver / rejeter (update). */}
                    {r.status !== "approved" &&
                      (can("update") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            // Niveau 2 — vérification dans le handler.
                            if (!guard("update", t("admin.ventes.avis.garde_approuver"))) return;
                            try {
                              await moderate(r.id, "approved");
                              toast.success(t("admin.ventes.avis.toast_approuve"));
                            } catch (cause) {
                              const err = toApiError(cause);
                              toast.error(err.message);
                            }
                          }}
                        >
                          <Check className="me-2 h-4 w-4" /> {t("admin.ventes.avis.approuver")}
                        </Button>
                      ) : (
                        <span title={denyReason("update")} className="inline-flex">
                          <Button size="sm" variant="outline" disabled>
                            <Check className="me-2 h-4 w-4" /> {t("admin.ventes.avis.approuver")}
                          </Button>
                        </span>
                      ))}
                    {r.status !== "rejected" &&
                      (can("update") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            // Niveau 2 — vérification dans le handler.
                            if (!guard("update", t("admin.ventes.avis.garde_rejeter"))) return;
                            try {
                              await moderate(r.id, "rejected");
                              toast.success(t("admin.ventes.avis.toast_rejete"));
                            } catch (cause) {
                              const err = toApiError(cause);
                              toast.error(err.message);
                            }
                          }}
                        >
                          <X className="me-2 h-4 w-4" /> {t("admin.ventes.avis.rejeter")}
                        </Button>
                      ) : (
                        <span title={denyReason("update")} className="inline-flex">
                          <Button size="sm" variant="outline" disabled>
                            <X className="me-2 h-4 w-4" /> {t("admin.ventes.avis.rejeter")}
                          </Button>
                        </span>
                      ))}
                    {/* Niveau 1 + 3 — supprimer (delete). */}
                    <span
                      title={denyReason("delete") ?? t("admin.socle.commun.supprimer")}
                      className="inline-flex"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!can("delete")}
                        onClick={() =>
                          setPendingDelete({ kind: "product", id: r.id, label: r.title })
                        }
                      >
                        <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
                        {t("admin.socle.commun.supprimer")}
                      </Button>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rows.length === 0 && (
              <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                {t("admin.ventes.avis.vide")}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="home" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            {t("admin.ventes.avis.accueil_explication")}
          </p>
          <HomeReviewsEditor
            reviews={homeReviews}
            products={productOptions}
            onDeleteRequest={(r) => setPendingDelete({ kind: "home", id: r.id, label: r.name })}
            canUpdate={can("update")}
            canCreate={can("create")}
            denyReasonUpdate={denyReason("update")}
            denyReasonCreate={denyReason("create")}
            guardUpdate={(label: string) => guard("update", label)}
            guardCreate={(label: string) => guard("create", label)}
            onUpsert={upsertHomeReview}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={
          pendingDelete
            ? t("admin.ventes.avis.supprimer_titre", { label: pendingDelete.label })
            : t("admin.socle.commun.supprimer")
        }
        description={t("admin.ventes.avis.supprimer_description")}
        confirmLabel={
          deleting ? t("admin.ventes.avis.suppression_en_cours") : t("admin.socle.commun.supprimer")
        }
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}

const GRADIENTS = [
  "linear-gradient(135deg,#3b82f6,#1e40af)",
  "linear-gradient(135deg,#a855f7,#6d28d9)",
  "linear-gradient(135deg,#10b981,#047857)",
  "linear-gradient(135deg,#f59e0b,#b45309)",
  "linear-gradient(135deg,#ef4444,#991b1b)",
];

function HomeReviewsEditor({
  reviews,
  products,
  onDeleteRequest,
  canUpdate,
  canCreate,
  denyReasonUpdate,
  denyReasonCreate,
  guardUpdate,
  guardCreate,
  onUpsert,
}: {
  reviews: HomeReview[];
  products: { id: string; name: string }[];
  onDeleteRequest: (r: HomeReview) => void;
  canUpdate: boolean;
  canCreate: boolean;
  denyReasonUpdate: string | undefined;
  denyReasonCreate: string | undefined;
  guardUpdate: (label: string) => boolean;
  guardCreate: (label: string) => boolean;
  onUpsert: (review: HomeReview) => Promise<HomeReview>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<HomeReview | null>(null);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setEditing({
      id: `hrev_${Date.now().toString(36)}`,
      name: "",
      city: "",
      productId: products[0]?.id ?? "",
      text: "",
      rating: 5,
      gradient: GRADIENTS[reviews.length % GRADIENTS.length],
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {/* Niveau 1 + 3 — créer un avis d'accueil (create). */}
        {canCreate ? (
          <Button size="sm" onClick={startNew}>
            <Plus className="me-2 h-4 w-4" /> {t("admin.ventes.avis.accueil_nouveau")}
          </Button>
        ) : (
          <span title={denyReasonCreate} className="inline-flex">
            <Button size="sm" disabled>
              <Plus className="me-2 h-4 w-4" /> {t("admin.ventes.avis.accueil_nouveau")}
            </Button>
          </span>
        )}
      </div>
      {reviews.length === 0 && !editing && (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          {t("admin.ventes.avis.accueil_vide")}
        </div>
      )}
      <div className="grid gap-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-start gap-4 p-4">
              <div
                className="size-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: r.gradient }}
              >
                {r.name.charAt(0) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {r.name || t("admin.ventes.avis.accueil_sans_nom")}
                  </span>
                  <span className="text-xs text-muted-foreground">· {r.city}</span>
                  <span className="ms-auto flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">"{r.text}"</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("admin.ventes.avis.accueil_produit", {
                    nom:
                      products.find((p) => p.id === r.productId)?.name ??
                      t("admin.ventes.avis.accueil_produit_inconnu"),
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Niveau 1 + 3 — modifier un avis d'accueil (update). */}
                {canUpdate ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                    <Pencil className="me-2 h-4 w-4" /> {t("admin.ventes.avis.accueil_editer")}
                  </Button>
                ) : (
                  <span title={denyReasonUpdate} className="inline-flex">
                    <Button size="sm" variant="outline" disabled>
                      <Pencil className="me-2 h-4 w-4" /> {t("admin.ventes.avis.accueil_editer")}
                    </Button>
                  </span>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDeleteRequest(r)}>
                  <Trash2 className="me-2 h-4 w-4 text-destructive" />{" "}
                  {t("admin.socle.commun.supprimer")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <Card className="border-primary/60">
          <CardHeader>
            <CardTitle className="text-base">
              {reviews.find((r) => r.id === editing.id)
                ? t("admin.ventes.avis.accueil_form_titre_modifier")
                : t("admin.ventes.avis.accueil_form_titre_nouveau")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>{t("admin.ventes.avis.accueil_form_nom")}</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.ventes.avis.accueil_form_ville")}</Label>
              <Input
                value={editing.city}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t("admin.ventes.avis.accueil_form_texte")}</Label>
              <Textarea
                rows={3}
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.ventes.avis.accueil_form_produit")}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={editing.productId}
                onChange={(e) => setEditing({ ...editing, productId: e.target.value })}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("admin.ventes.avis.accueil_form_note")}</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={editing.rating}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    rating: Math.max(1, Math.min(5, Number(e.target.value) || 0)),
                  })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t("admin.ventes.avis.accueil_form_gradient")}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setEditing({ ...editing, gradient: g })}
                    className={`h-8 w-16 rounded-md border-2 ${editing.gradient === g ? "border-primary" : "border-transparent"}`}
                    style={{ background: g }}
                    aria-label={t("admin.ventes.avis.accueil_form_gradient")}
                  />
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                {t("admin.socle.confirmation.annuler")}
              </Button>
              <Button
                disabled={saving}
                onClick={async () => {
                  if (!editing.name.trim() || !editing.text.trim()) {
                    toast.error(t("admin.ventes.avis.accueil_err_champs"));
                    return;
                  }
                  // Niveau 2 — vérification dans le handler d'enregistrement.
                  const isNew = !reviews.find((r) => r.id === editing.id);
                  if (isNew) {
                    if (!guardCreate(t("admin.ventes.avis.accueil_garde_creer"))) return;
                  } else {
                    if (!guardUpdate(t("admin.ventes.avis.accueil_garde_modifier"))) return;
                  }
                  setSaving(true);
                  try {
                    await onUpsert(editing);
                    toast.success(t("admin.ventes.avis.toast_enregistre"));
                    setEditing(null);
                  } catch (cause) {
                    const err = toApiError(cause);
                    toast.error(err.message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Save className="me-2 h-4 w-4" />{" "}
                {saving
                  ? t("admin.ventes.avis.accueil_form_enregistrement")
                  : t("admin.socle.commun.enregistrer")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
