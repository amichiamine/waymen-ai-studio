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
import { Check, X, Trash2, Star, Plus, Pencil, Save } from "lucide-react";
import {
  useAdminState,
  updateReviewStatus,
  deleteReview,
  upsertHomeReview,
  deleteHomeReview,
  type ReviewStatus,
  type HomeReview,
} from "@/lib/admin-store";

export default function AdminReviews() {
  const { reviews, homeReviews, products } = useAdminState();
  const [tab, setTab] = useState<"product" | "home">("product");
  const [statusTab, setStatusTab] = useState<"all" | ReviewStatus>("all");
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "product" | "home";
    id: string;
    label: string;
  } | null>(null);

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

  return (
    <AdminPageShell
      title="Avis"
      description={`${reviews.length} avis produits · ${homeReviews.length} avis d'accueil.`}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "product" | "home")}>
        <TabsList>
          <TabsTrigger value="product">Avis produits ({reviews.length})</TabsTrigger>
          <TabsTrigger value="home">Avis d'accueil ({homeReviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="mt-4 space-y-4">
          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as "all" | ReviewStatus)}>
            <TabsList>
              <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
              <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approuvés ({counts.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({counts.rejected})</TabsTrigger>
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
                        Par <span className="font-medium text-foreground">{r.customerName}</span> ·
                        sur {r.productName} · {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "default"
                          : r.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status === "pending"
                        ? "En attente"
                        : r.status === "approved"
                          ? "Approuvé"
                          : "Rejeté"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm">{r.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          updateReviewStatus(r.id, "approved");
                          toast.success("Approuvé");
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" /> Approuver
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          updateReviewStatus(r.id, "rejected");
                          toast.success("Rejeté");
                        }}
                      >
                        <X className="mr-2 h-4 w-4" /> Rejeter
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPendingDelete({ kind: "product", id: r.id, label: r.title })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {rows.length === 0 && (
              <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                Aucun avis.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="home" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Ces témoignages sont affichés en page d'accueil, section « Avis de nos clients ».
          </p>
          <HomeReviewsEditor
            reviews={homeReviews}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
            onDeleteRequest={(r) => setPendingDelete({ kind: "home", id: r.id, label: r.name })}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={pendingDelete ? `Supprimer « ${pendingDelete.label} » ?` : "Supprimer ?"}
        description="Cette action est irréversible."
        destructive
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "product") deleteReview(pendingDelete.id);
          else deleteHomeReview(pendingDelete.id);
          toast.success("Supprimé");
        }}
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
}: {
  reviews: HomeReview[];
  products: { id: string; name: string }[];
  onDeleteRequest: (r: HomeReview) => void;
}) {
  const [editing, setEditing] = useState<HomeReview | null>(null);

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
        <Button size="sm" onClick={startNew}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel avis d'accueil
        </Button>
      </div>
      {reviews.length === 0 && !editing && (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucun avis d'accueil. Ajoutez-en ou réinitialisez les données.
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
                  <span className="font-semibold">{r.name || "Sans nom"}</span>
                  <span className="text-xs text-muted-foreground">· {r.city}</span>
                  <span className="ml-auto flex gap-0.5">
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
                  Produit : {products.find((p) => p.id === r.productId)?.name ?? <em>inconnu</em>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                  <Pencil className="mr-2 h-4 w-4" /> Éditer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDeleteRequest(r)}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Supprimer
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
              {reviews.find((r) => r.id === editing.id) ? "Modifier l'avis" : "Nouvel avis"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Nom</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Ville</Label>
              <Input
                value={editing.city}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Texte</Label>
              <Textarea
                rows={3}
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              />
            </div>
            <div>
              <Label>Produit</Label>
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
              <Label>Note (1-5)</Label>
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
              <Label>Gradient</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setEditing({ ...editing, gradient: g })}
                    className={`h-8 w-16 rounded-md border-2 ${editing.gradient === g ? "border-primary" : "border-transparent"}`}
                    style={{ background: g }}
                    aria-label="Gradient"
                  />
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (!editing.name.trim() || !editing.text.trim()) {
                    toast.error("Nom et texte requis");
                    return;
                  }
                  upsertHomeReview(editing);
                  toast.success("Avis enregistré");
                  setEditing(null);
                }}
              >
                <Save className="mr-2 h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
