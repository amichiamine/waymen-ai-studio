import { useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { AdminPageShell, AdminEmptyState } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Circle, CheckCircle2, XCircle } from "lucide-react";
import { formatDZD } from "@/data/products";
import { useOrderDetail, useOrderMutations, useCustomerList, toApiError } from "@/data-provider";
import type { OrderStatus } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";

/**
 * Les valeurs techniques (`pending`, `processing`…) viennent de l'API et ne
 * changent JAMAIS — seul leur libellé d'affichage est traduit.
 * Critique : le Select envoie ces valeurs au serveur via PATCH /orders/:id/status.
 * Ne jamais passer un libellé traduit comme valeur — ce serait casser l'API.
 */
const STATUS_KEY: Record<OrderStatus, string> = {
  pending: "admin.ventes.commun.statut_pending",
  processing: "admin.ventes.commun.statut_processing",
  shipped: "admin.ventes.commun.statut_shipped",
  delivered: "admin.ventes.commun.statut_delivered",
  cancelled: "admin.ventes.commun.statut_cancelled",
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  // Le hook reste toujours monté, inactif quand `id` est indéfini (§6 pièges).
  const { data: order, loading, error } = useOrderDetail(id);
  const { data: customers } = useCustomerList();
  const { updateStatus } = useOrderMutations();
  const nav = useNavigate();
  // Autorité = rôle réel de l'utilisateur connecté, jamais le sélecteur de
  // l'en-tête (qui ne peut que rétrograder, et seulement en développement).
  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();

  // État local du Select pour éviter la mise à jour optimiste non réconciliée.
  // Le Select affiche `order.status` (la source de vérité) tant que la mutation
  // n'a pas abouti. En cas d'échec, `saving` repasse à false et le Select
  // revient naturellement à `order.status` — aucune UI incorrecte ne persiste.
  const [saving, setSaving] = useState(false);

  // Squelette de chargement — même structure que le contenu final.
  if (loading) {
    return (
      <AdminPageShell
        title={`${t("admin.ventes.commandes.titre")} #${id ?? "…"}`}
        actions={
          <Link to="/admin/orders">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.ventes.detail.retour")}
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]" aria-busy="true">
          <span className="sr-only">{t("admin.ventes.detail.chargement")}</span>
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-lg border bg-card" />
            <div className="h-32 animate-pulse rounded-lg border bg-card" />
          </div>
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg border bg-card" />
            <div className="h-24 animate-pulse rounded-lg border bg-card" />
          </div>
        </div>
      </AdminPageShell>
    );
  }

  // Erreur réseau : `order` peut être undefined mais le bandeau l'indique.
  if (error) {
    return (
      <AdminPageShell
        title={`${t("admin.ventes.commandes.titre")} #${id ?? "…"}`}
        actions={
          <Link to="/admin/orders">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.ventes.detail.retour")}
            </Button>
          </Link>
        }
      >
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      </AdminPageShell>
    );
  }

  if (!order) {
    return (
      <AdminPageShell
        title={`${t("admin.ventes.commandes.titre")} #${id}`}
        actions={
          <Link to="/admin/orders">
            <Button variant="outline">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t("admin.ventes.detail.retour")}
            </Button>
          </Link>
        }
      >
        <AdminEmptyState label={t("admin.ventes.detail.introuvable")} />
      </AdminPageShell>
    );
  }

  const customer = customers.find((c) => c.id === order.customerId);
  const history = order.statusHistory ?? [{ status: order.status, at: order.createdAt }];

  // Niveau 2 — le handler vérifie lui-même avant de muter.
  // Critique : passer une commande en « expédiée » ou « annulée » a un effet
  // commercial réel. Pas de mise à jour optimiste : le Select conserve
  // `order.status` pendant toute la durée de l'appel, puis affiche soit le
  // nouveau statut (si la mutation invalide le cache et rafraîchit `order`),
  // soit l'ancien statut en cas d'échec — jamais un état intermédiaire
  // non réconcilié.
  // IMPORTANT : la valeur envoyée au serveur (v) est toujours la valeur
  // technique de l'API (`pending`, `shipped`…), jamais un libellé traduit.
  async function handleStatusChange(v: string) {
    // Garde de permission avant toute mutation — ordre : garde → mutation → erreur.
    if (!guard("update", t("admin.ventes.detail.garde_changer_statut"))) return;
    setSaving(true);
    try {
      // v est la valeur technique (`pending`, `shipped`…) — elle n'est pas traduite.
      await updateStatus(order!.id, v as OrderStatus);
      toast.success(t("admin.ventes.detail.toast_statut_maj"));
    } catch (cause) {
      const apiErr = toApiError(cause);
      toast.error(apiErr.message);
      // Pas de setOrder(...) ici : on laisse `order` pointer sur la source
      // de vérité (rafraîchie par l'invalidation de cache si nécessaire).
      // En cas d'échec la valeur affichée dans le Select revient à
      // `order.status` car `saving` redevient false et le composant
      // est contrôlé par `order.status`.
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell
      title={t("admin.ventes.detail.titre", { id: order.id })}
      description={t("admin.ventes.detail.description", {
        date: new Date(order.createdAt).toLocaleString("fr-FR"),
      })}
      actions={
        <Link to="/admin/orders">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("admin.ventes.detail.retour")}
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.ventes.detail.section_articles")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b pb-3 last:border-none last:pb-0"
                >
                  {it.image && (
                    <ImageCatalogue
                      src={it.image}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/products/${it.productId}`}
                      className="font-medium hover:text-primary"
                    >
                      {it.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.ventes.detail.qte", { qty: it.qty, prix: formatDZD(it.price) })}
                    </p>
                  </div>
                  <p className="font-medium">{formatDZD(it.price * it.qty)}</p>
                </div>
              ))}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("admin.ventes.detail.sous_total")}
                  </span>
                  <span>{formatDZD(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>
                      {t("admin.ventes.detail.remise", {
                        coupon: order.couponCode ? `(${order.couponCode})` : "",
                      })}
                    </span>
                    <span>− {formatDZD(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("admin.ventes.detail.livraison")}
                  </span>
                  <span>
                    {order.shipping === 0
                      ? t("admin.ventes.detail.livraison_gratuite")
                      : formatDZD(order.shipping)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>{t("admin.ventes.detail.total")}</span>
                  <span>{formatDZD(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.ventes.detail.section_suivi")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-s ps-5">
                {history.map((ev, i) => {
                  const Icon =
                    ev.status === "cancelled"
                      ? XCircle
                      : ev.status === "delivered"
                        ? CheckCircle2
                        : Circle;
                  const color =
                    ev.status === "cancelled"
                      ? "text-destructive"
                      : ev.status === "delivered"
                        ? "text-green-600"
                        : "text-primary";
                  return (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -start-[26px] top-0 rounded-full bg-background ${color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {/* Libellé du statut : traduit via la table de clés.
                          La valeur `ev.status` n'est pas modifiée. */}
                      <p className="text-sm font-medium">{t(STATUS_KEY[ev.status])}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ev.at).toLocaleString("fr-FR")}
                      </p>
                      {ev.note && (
                        <p className="text-xs text-muted-foreground italic">« {ev.note} »</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {order.note && (
            <Card>
              <CardContent className="p-5 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  {t("admin.ventes.detail.note_client")}
                </p>
                {order.note}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.ventes.detail.section_changer_statut")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">{t(STATUS_KEY[order.status])}</Badge>
              {/* Niveau 1 — affichage. Niveau 3 — le <span> porte l'infobulle
                  car un Select `disabled` a pointer-events-none.
                  La valeur affichée est toujours `order.status` (source de vérité),
                  jamais un état optimiste.
                  CRITIQUE : `onValueChange` reçoit la valeur technique de l'API
                  (`pending`, `shipped`…), jamais un libellé traduit. */}
              <span title={denyReason("update") ?? undefined} className="block">
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                  disabled={!can("update") || saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Les valeurs `value` sont des identifiants techniques API —
                        elles ne sont JAMAIS traduites. Seul le texte affiché l'est. */}
                    <SelectItem value="pending">
                      {t("admin.ventes.commun.statut_pending")}
                    </SelectItem>
                    <SelectItem value="processing">
                      {t("admin.ventes.commun.statut_processing")}
                    </SelectItem>
                    <SelectItem value="shipped">
                      {t("admin.ventes.commun.statut_shipped")}
                    </SelectItem>
                    <SelectItem value="delivered">
                      {t("admin.ventes.commun.statut_delivered")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("admin.ventes.commun.statut_cancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </span>
              {saving && (
                <p className="text-xs text-muted-foreground">
                  {t("admin.ventes.detail.mise_a_jour_en_cours")}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.ventes.detail.section_client")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              {order.customerEmail && (
                <p className="text-muted-foreground">{order.customerEmail}</p>
              )}
              {customer && (
                <>
                  {!order.customerEmail && (
                    <p className="text-muted-foreground">{customer.email}</p>
                  )}
                  <p className="text-muted-foreground">{customer.phone}</p>
                </>
              )}
              <Button variant="link" className="h-auto p-0" onClick={() => nav("/admin/customers")}>
                {t("admin.ventes.detail.voir_client")}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.ventes.detail.section_livraison")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">{t("admin.ventes.detail.adresse")} </span>
                {order.address}
              </p>
              <p>
                <span className="text-muted-foreground">{t("admin.ventes.detail.wilaya")} </span>
                {order.wilaya}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {t("admin.ventes.detail.type_livraison")}{" "}
                </span>
                {order.deliveryKind === "home"
                  ? t("admin.ventes.detail.livraison_domicile")
                  : t("admin.ventes.detail.livraison_bureau")}
              </p>
              <p>
                <span className="text-muted-foreground">{t("admin.ventes.detail.telephone")} </span>
                {order.phone}
              </p>
              <p>
                <span className="text-muted-foreground">{t("admin.ventes.detail.paiement")} </span>
                {order.paymentLabel ?? order.paymentMethod}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
