import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Trash2, Star } from "lucide-react";
import { useAdminState, updateReviewStatus, deleteReview, type ReviewStatus } from "@/lib/admin-store";

export default function AdminReviews() {
  const { reviews } = useAdminState();
  const [tab, setTab] = useState<"all" | ReviewStatus>("all");

  const rows = useMemo(() => {
    return reviews
      .filter((r) => tab === "all" || r.status === tab)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reviews, tab]);

  const counts = useMemo(() => ({
    all: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  }), [reviews]);

  return (
    <AdminPageShell title="Avis clients" description={`${reviews.length} avis · ${counts.pending} en attente.`}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | ReviewStatus)}>
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
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    ))}
                    <span className="text-sm font-medium">{r.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Par <span className="font-medium text-foreground">{r.customerName}</span> · sur {r.productName} · {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                    {r.status === "pending" ? "En attente" : r.status === "approved" ? "Approuvé" : "Rejeté"}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-sm">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <Button size="sm" variant="outline" onClick={() => { updateReviewStatus(r.id, "approved"); toast.success("Approuvé"); }}>
                    <Check className="mr-2 h-4 w-4" /> Approuver
                  </Button>
                )}
                {r.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => { updateReviewStatus(r.id, "rejected"); toast.success("Rejeté"); }}>
                    <X className="mr-2 h-4 w-4" /> Rejeter
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer cet avis ?")) { deleteReview(r.id); toast.success("Avis supprimé"); } }}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">Aucun avis.</div>
        )}
      </div>
    </AdminPageShell>
  );
}
