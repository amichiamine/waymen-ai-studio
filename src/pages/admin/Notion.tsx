import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Plug,
  Database,
  Webhook,
  Send,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";
import { useNotionEtat, useNotionMutations } from "@/data-provider/notion";
import { toApiError } from "@/data-provider/errors";
import type { NotionPage, NotionEtat } from "@/api/types";

// ── Page principale ───────────────────────────────────────────────────────────

/**
 * Page « Notion » — réservée au rôle `owner`.
 *
 * Guide en quatre étapes pour connecter la boutique à Notion :
 *   1. Enregistrement du jeton de connexion.
 *   2. Choix de la page parente dans Notion.
 *   3. Création de la base des commandes.
 *   4. (Optionnel) Configuration du webhook pour la synchronisation en retour.
 *
 * Tableau de bord permanent : état, commandes en attente, bouton Renvoyer.
 *
 * SÉCURITÉ (NOTION.md §5, SKILLS.md S13) :
 *   - Le jeton saisi est stocké dans un `useRef` (hors rendu React), pas dans
 *     un état React, pour ne jamais apparaître dans un instantané de composant.
 *   - Il n'est JAMAIS mis dans le localStorage, ni dans une URL, ni logué.
 *   - Le champ est de type `password`, sans `autocomplete`.
 *   - Dès que le serveur confirme l'enregistrement, la ref est vidée.
 *
 * DÉGRADATION GRACIEUSE (SKILLS.md S3) :
 *   - Backend injoignable → bandeau visible, aucun écran blanc.
 *   - Notion non configuré → explication et invitation à commencer.
 *   - Liste de pages vide → marche à suivre numérotée, pas un état vide muet.
 */
export default function AdminNotion() {
  const { t } = useI18n();
  const { can, denyReason } = usePermissions();
  const estOwner = can("resetData");

  // ── Lecture de l'état ─────────────────────────────────────────────────────
  const {
    data: etat,
    loading: chargementEtat,
    error: erreurEtat,
    refetch: rechargerEtat,
  } = useNotionEtat();

  const mutations = useNotionMutations();

  // ── Étape 1 — Token ───────────────────────────────────────────────────────
  // S13 : le jeton vit dans une ref, jamais dans un état React observable.
  const tokenRef = useRef<string>("");
  const [tokenVisible] = useState(false); // toujours masqué
  const [tokenCours, setTokenCours] = useState(false);
  const [montrerChampToken, setMontrerChampToken] = useState(false);

  // ── Étape 2 — Pages ───────────────────────────────────────────────────────
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [messagePages, setMessagePages] = useState<string | null>(null);
  const [pagesCours, setPagesCours] = useState(false);
  const [pageChoisie, setPageChoisie] = useState<NotionPage | null>(null);

  // ── Étape 3 — Base ────────────────────────────────────────────────────────
  const [baseCours, setBaseCours] = useState(false);
  const [databaseIdRattach, setDatabaseIdRattach] = useState("");
  const [rattachCours, setRattachCours] = useState(false);

  // ── Tableau de bord ───────────────────────────────────────────────────────
  const [renvoyerCours, setRenvoyerCours] = useState(false);
  const [toggleCours, setToggleCours] = useState(false);

  // ── Étape 4 — Webhook ─────────────────────────────────────────────────────
  const [webhookCopie, setWebhookCopie] = useState(false);
  const [verifCopie, setVerifCopie] = useState(false);

  // URL du webhook : construite depuis l'origine courante.
  // Le commerçant copie cette adresse dans le portail Notion.
  const webhookUrl = `${window.location.origin}/api/v1/notion/webhook`;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const enregistrerToken = useCallback(async () => {
    const token = tokenRef.current.trim();
    if (!token) {
      toast.error(t("admin.reglages.notion.token_requis"));
      return;
    }
    setTokenCours(true);
    try {
      await mutations.enregistrerToken(token);
      // S13 : vider la ref immédiatement après enregistrement.
      tokenRef.current = "";
      // Réinitialiser aussi la valeur affichée dans le DOM.
      const input = document.getElementById("notion-token-input") as HTMLInputElement | null;
      if (input) input.value = "";
      setMontrerChampToken(false);
      toast.success(t("admin.reglages.notion.toast_token_ok"));
      await rechargerEtat();
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(t("admin.reglages.notion.toast_token_echec", { message: err.message }));
    } finally {
      setTokenCours(false);
    }
  }, [mutations, rechargerEtat, t]);

  const chargerPages = useCallback(async () => {
    setPagesCours(true);
    try {
      const res = await mutations.listerPagesAvecMessage();
      setPages(res.pages);
      setMessagePages(res.message ?? null);
      if (res.pages.length === 0 && !res.message) {
        setMessagePages(t("admin.reglages.notion.pages_vide_marche_suivre"));
      }
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(t("admin.reglages.notion.toast_pages_echec", { message: err.message }));
    } finally {
      setPagesCours(false);
    }
  }, [mutations, t]);

  const creerBase = useCallback(async () => {
    if (!pageChoisie) return;
    setBaseCours(true);
    try {
      const nouvelEtat = await mutations.creerBase({ pageId: pageChoisie.id });
      toast.success(t("admin.reglages.notion.toast_base_ok"));
      if (nouvelEtat.avertissement) {
        toast.warning(nouvelEtat.avertissement, { duration: 10000 });
      }
      await rechargerEtat();
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(t("admin.reglages.notion.toast_base_echec", { message: err.message }));
    } finally {
      setBaseCours(false);
    }
  }, [pageChoisie, mutations, rechargerEtat, t]);

  const rattacherBase = useCallback(async () => {
    const id = databaseIdRattach.trim();
    if (!id) return;
    setRattachCours(true);
    try {
      const nouvelEtat = await mutations.creerBase({ databaseId: id });
      toast.success(t("admin.reglages.notion.toast_rattachement_ok"));
      if (nouvelEtat.avertissement) {
        toast.warning(nouvelEtat.avertissement, { duration: 10000 });
      }
      setDatabaseIdRattach("");
      await rechargerEtat();
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(t("admin.reglages.notion.toast_rattachement_echec", { message: err.message }));
    } finally {
      setRattachCours(false);
    }
  }, [databaseIdRattach, mutations, rechargerEtat, t]);

  const toggleActif = useCallback(async () => {
    setToggleCours(true);
    try {
      await mutations.definirActif(!etat.actif);
      toast.success(
        etat.actif
          ? t("admin.reglages.notion.toast_inactif")
          : t("admin.reglages.notion.toast_actif"),
      );
      await rechargerEtat();
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setToggleCours(false);
    }
  }, [etat.actif, mutations, rechargerEtat, t]);

  const renvoyer = useCallback(async () => {
    setRenvoyerCours(true);
    try {
      const res = await mutations.renvoyer();
      if (res.echecs === 0) {
        toast.success(t("admin.reglages.notion.toast_renvoyer_ok", { traitees: res.traitees }));
      } else {
        toast.error(
          t("admin.reglages.notion.toast_renvoyer_echec", {
            message: res.messages.join(" | ") || "échec",
          }),
        );
      }
      if (res.reste) {
        toast.info(t("admin.reglages.notion.toast_renvoyer_reste"));
      }
      await rechargerEtat();
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(t("admin.reglages.notion.toast_renvoyer_echec", { message: err.message }));
    } finally {
      setRenvoyerCours(false);
    }
  }, [mutations, rechargerEtat, t]);

  const copierWebhook = useCallback(async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setWebhookCopie(true);
    setTimeout(() => setWebhookCopie(false), 2000);
  }, [webhookUrl]);

  const copierVerification = useCallback(async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    setVerifCopie(true);
    setTimeout(() => setVerifCopie(false), 2000);
  }, []);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <AdminPageShell
      title={t("admin.reglages.notion.titre")}
      description={t("admin.reglages.notion.description")}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void rechargerEtat()}
          disabled={chargementEtat}
          aria-label={t("admin.reglages.notion.btn_rafraichir")}
        >
          <RefreshCw className={`me-2 h-4 w-4 ${chargementEtat ? "animate-spin" : ""}`} />
          {t("admin.reglages.notion.btn_rafraichir")}
        </Button>
      }
    >
      {/* Bannière accès restreint (rang < owner) */}
      {!estOwner && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("admin.reglages.notion.acces_restreint_titre")}</AlertTitle>
          <AlertDescription>
            {denyReason("resetData") ?? t("admin.reglages.notion.acces_restreint_desc")}
          </AlertDescription>
        </Alert>
      )}

      {/* Bandeau erreur backend injoignable — S3 : visible et lisible, pas un écran blanc */}
      {erreurEtat && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("admin.reglages.notion.erreur_backend_titre")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("admin.reglages.notion.erreur_backend_desc")}</span>
            <Button variant="outline" size="sm" onClick={() => void rechargerEtat()}>
              {t("admin.reglages.notion.btn_reessayer")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Tableau de bord permanent ──────────────────────────────────────── */}
      <TableauDeBord
        etat={etat}
        estOwner={estOwner}
        toggleCours={toggleCours}
        renvoyerCours={renvoyerCours}
        onToggle={() => void toggleActif()}
        onRenvoyer={() => void renvoyer()}
      />

      {/* ── Intro si non configuré ─────────────────────────────────────────── */}
      {!etat.configure && !erreurEtat && (
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertTitle>{t("admin.reglages.notion.intro_titre")}</AlertTitle>
          <AlertDescription>{t("admin.reglages.notion.intro_desc")}</AlertDescription>
        </Alert>
      )}

      {/* ── Étape 1 — Connexion ────────────────────────────────────────────── */}
      <Etape1Token
        etat={etat}
        estOwner={estOwner}
        tokenCours={tokenCours}
        montrerChamp={montrerChampToken}
        tokenRef={tokenRef}
        onMontrerChamp={() => setMontrerChampToken(true)}
        onEnregistrer={() => void enregistrerToken()}
      />

      {/* ── Étape 2 — Pages (visible dès que configuré, même sans base) ────── */}
      {etat.configure && !etat.relie && (
        <Etape2Pages
          estOwner={estOwner}
          pages={pages}
          messagePages={messagePages}
          pagesCours={pagesCours}
          pageChoisie={pageChoisie}
          onCharger={() => void chargerPages()}
          onChoisir={setPageChoisie}
        />
      )}

      {/* ── Étape 3 — Base (visible si pages chargées et page choisie OU déjà relié) */}
      {etat.configure && (
        <Etape3Base
          etat={etat}
          estOwner={estOwner}
          pageChoisie={pageChoisie}
          baseCours={baseCours}
          databaseIdRattach={databaseIdRattach}
          rattachCours={rattachCours}
          onCreerBase={() => void creerBase()}
          onDatabaseIdChange={setDatabaseIdRattach}
          onRattacher={() => void rattacherBase()}
        />
      )}

      {/* ── Étape 4 — Webhook (visible dès que relié) ───────────────────── */}
      {etat.relie && (
        <Etape4Webhook
          etat={etat}
          webhookUrl={webhookUrl}
          webhookCopie={webhookCopie}
          verifCopie={verifCopie}
          onCopierWebhook={() => void copierWebhook()}
          onCopierVerification={(s) => void copierVerification(s)}
        />
      )}
    </AdminPageShell>
  );
}

// ── Tableau de bord permanent ─────────────────────────────────────────────────

function TableauDeBord({
  etat,
  estOwner,
  toggleCours,
  renvoyerCours,
  onToggle,
  onRenvoyer,
}: {
  etat: NotionEtat;
  estOwner: boolean;
  toggleCours: boolean;
  renvoyerCours: boolean;
  onToggle: () => void;
  onRenvoyer: () => void;
}) {
  const { t } = useI18n();

  const badgeEtat = etat.relie
    ? etat.actif
      ? { label: t("admin.reglages.notion.badge_actif"), variant: "default" as const }
      : { label: t("admin.reglages.notion.badge_inactif"), variant: "secondary" as const }
    : etat.configure
      ? { label: t("admin.reglages.notion.badge_non_relie"), variant: "secondary" as const }
      : { label: t("admin.reglages.notion.badge_non_configure"), variant: "outline" as const };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t("admin.reglages.notion.tableau_bord_titre")}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeEtat.variant}>{badgeEtat.label}</Badge>
            {etat.relie && estOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                disabled={toggleCours}
                aria-label={
                  etat.actif
                    ? t("admin.reglages.notion.btn_desactiver")
                    : t("admin.reglages.notion.btn_activer")
                }
              >
                {etat.actif ? (
                  <ToggleRight className="me-1.5 h-4 w-4" />
                ) : (
                  <ToggleLeft className="me-1.5 h-4 w-4" />
                )}
                {etat.actif
                  ? t("admin.reglages.notion.btn_desactiver")
                  : t("admin.reglages.notion.btn_activer")}
              </Button>
            )}
            {etat.relie && estOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRenvoyer}
                disabled={renvoyerCours || etat.enAttente === 0}
              >
                <Send className={`me-1.5 h-4 w-4 ${renvoyerCours ? "animate-pulse" : ""}`} />
                {renvoyerCours
                  ? t("admin.reglages.notion.btn_renvoyer_cours")
                  : t("admin.reglages.notion.btn_renvoyer")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              {t("admin.reglages.notion.label_espace")}
            </p>
            <p className="mt-1 truncate font-semibold">{etat.espace ?? "—"}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{t("admin.reglages.notion.label_base")}</p>
            <p className="mt-1 truncate font-semibold">
              {etat.baseTitre ? (
                etat.baseUrl ? (
                  <a
                    href={etat.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {etat.baseTitre}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  etat.baseTitre
                )
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              {t("admin.reglages.notion.label_en_attente")}
            </p>
            <p className="mt-1 font-semibold">
              {etat.enAttente > 0 ? (
                <span className="text-amber-600">{etat.enAttente}</span>
              ) : (
                <span className="text-green-600">0</span>
              )}
            </p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              {t("admin.reglages.notion.label_derniere_verif")}
            </p>
            <p className="mt-1 truncate font-semibold text-sm">
              {etat.derniereVerification
                ? new Date(etat.derniereVerification).toLocaleString("fr-DZ")
                : "—"}
            </p>
          </div>
        </div>
        {etat.derniereErreur && (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">
                {t("admin.reglages.notion.label_derniere_erreur")} :{" "}
              </span>
              {/* Message d'erreur du serveur : donnée, affichée telle quelle. */}
              {etat.derniereErreur}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Étape 1 — Token ───────────────────────────────────────────────────────────

function Etape1Token({
  etat,
  estOwner,
  tokenCours,
  montrerChamp,
  tokenRef,
  onMontrerChamp,
  onEnregistrer,
}: {
  etat: NotionEtat;
  estOwner: boolean;
  tokenCours: boolean;
  montrerChamp: boolean;
  tokenRef: React.MutableRefObject<string>;
  onMontrerChamp: () => void;
  onEnregistrer: () => void;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          {t("admin.reglages.notion.etape1_titre")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("admin.reglages.notion.etape1_desc")}</p>

        {/* Connexion déjà enregistrée */}
        {etat.configure && !montrerChamp ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-green-500/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  {t("admin.reglages.notion.connexion_enregistree")}
                </p>
                {etat.espace && (
                  <p className="text-sm text-green-700">
                    {t("admin.reglages.notion.connexion_espace", { espace: etat.espace })}
                  </p>
                )}
                {etat.derniereVerification && (
                  <p className="text-xs text-green-600">
                    {t("admin.reglages.notion.connexion_verifiee_le", {
                      date: new Date(etat.derniereVerification).toLocaleString("fr-DZ"),
                    })}
                  </p>
                )}
              </div>
            </div>
            {estOwner && (
              <Button variant="outline" size="sm" onClick={onMontrerChamp}>
                {t("admin.reglages.notion.btn_remplacer")}
              </Button>
            )}
          </div>
        ) : (
          /* Formulaire de saisie du token */
          <fieldset disabled={!estOwner} className="space-y-3">
            <legend className="sr-only">{t("admin.reglages.notion.etape1_titre")}</legend>
            <div className="space-y-1.5">
              <Label htmlFor="notion-token-input">
                {t("admin.reglages.notion.champ_token_label")}
              </Label>
              {/*
               * S13 : champ de type `password`, sans `autocomplete="on"`.
               * La valeur n'est lue que dans `tokenRef` au moment du submit,
               * jamais stockée dans un état React.
               */}
              <Input
                id="notion-token-input"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("admin.reglages.notion.champ_token_placeholder")}
                onChange={(e) => {
                  tokenRef.current = e.target.value;
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.reglages.notion.champ_token_aide")}
              </p>
            </div>
            {estOwner ? (
              <Button onClick={onEnregistrer} disabled={tokenCours}>
                {tokenCours
                  ? t("admin.reglages.notion.btn_tester_cours")
                  : t("admin.reglages.notion.btn_tester")}
              </Button>
            ) : (
              <Button disabled>{t("admin.reglages.notion.btn_tester")}</Button>
            )}
          </fieldset>
        )}
      </CardContent>
    </Card>
  );
}

// ── Étape 2 — Pages ───────────────────────────────────────────────────────────

function Etape2Pages({
  estOwner,
  pages,
  messagePages,
  pagesCours,
  pageChoisie,
  onCharger,
  onChoisir,
}: {
  estOwner: boolean;
  pages: NotionPage[];
  messagePages: string | null;
  pagesCours: boolean;
  pageChoisie: NotionPage | null;
  onCharger: () => void;
  onChoisir: (p: NotionPage) => void;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          {t("admin.reglages.notion.etape2_titre")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("admin.reglages.notion.etape2_desc")}</p>

        <div className="flex gap-2">
          {estOwner ? (
            <Button variant="outline" size="sm" onClick={onCharger} disabled={pagesCours}>
              <RefreshCw className={`me-2 h-4 w-4 ${pagesCours ? "animate-spin" : ""}`} />
              {pagesCours
                ? t("admin.reglages.notion.btn_rafraichir_pages_cours")
                : t("admin.reglages.notion.btn_rafraichir_pages")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="me-2 h-4 w-4" />
              {t("admin.reglages.notion.btn_rafraichir_pages")}
            </Button>
          )}
        </div>

        {/* État vide avec marche à suivre — S10 : un vide vide est un échec de conception */}
        {pages.length === 0 && messagePages && !pagesCours && (
          <div className="rounded-md border bg-amber-500/5 p-4">
            <p className="mb-3 font-medium text-amber-800">
              {t("admin.reglages.notion.pages_vide_titre")}
            </p>
            <p className="mb-2 text-sm text-amber-700">
              {t("admin.reglages.notion.pages_vide_marche_suivre")}
            </p>
            <ol className="ms-4 list-decimal space-y-1 text-sm text-amber-700">
              <li>{t("admin.reglages.notion.pages_vide_etape1")}</li>
              <li>{t("admin.reglages.notion.pages_vide_etape2")}</li>
              <li>{t("admin.reglages.notion.pages_vide_etape3")}</li>
              <li>{t("admin.reglages.notion.pages_vide_etape4")}</li>
            </ol>
          </div>
        )}

        {/* Liste des pages */}
        {pages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("admin.reglages.notion.page_choisir_placeholder")}
            </p>
            <ul className="space-y-1">
              {pages.map((p) => {
                const active = pageChoisie?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onChoisir(p)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-start text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span className="truncate">{p.titre}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {active && <Check className="h-4 w-4 text-primary" />}
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("admin.reglages.notion.lien_ouvrir_notion")}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {pageChoisie && (
              <p className="text-xs text-muted-foreground">
                {t("admin.reglages.notion.page_selectionnee")} :{" "}
                <strong>{pageChoisie.titre}</strong>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Étape 3 — Base ────────────────────────────────────────────────────────────

function Etape3Base({
  etat,
  estOwner,
  pageChoisie,
  baseCours,
  databaseIdRattach,
  rattachCours,
  onCreerBase,
  onDatabaseIdChange,
  onRattacher,
}: {
  etat: NotionEtat;
  estOwner: boolean;
  pageChoisie: NotionPage | null;
  baseCours: boolean;
  databaseIdRattach: string;
  rattachCours: boolean;
  onCreerBase: () => void;
  onDatabaseIdChange: (v: string) => void;
  onRattacher: () => void;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          {t("admin.reglages.notion.etape3_titre")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("admin.reglages.notion.etape3_desc")}</p>

        {/* Base déjà reliée */}
        {etat.relie && etat.baseTitre ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-green-500/10 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                {t("admin.reglages.notion.base_existante_titre")}
              </p>
              <p className="text-sm text-green-700">
                {t("admin.reglages.notion.base_existante_desc", { nom: etat.baseTitre })}
              </p>
            </div>
            {etat.baseUrl && (
              <a
                href={etat.baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t("admin.reglages.notion.lien_ouvrir_notion")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ) : (
          /* Création / rattachement */
          <div className="space-y-4">
            {/* Bouton créer */}
            {estOwner ? (
              <Button onClick={onCreerBase} disabled={baseCours || !pageChoisie}>
                {baseCours
                  ? t("admin.reglages.notion.btn_creer_base_cours")
                  : t("admin.reglages.notion.btn_creer_base")}
              </Button>
            ) : (
              <Button disabled>{t("admin.reglages.notion.btn_creer_base")}</Button>
            )}

            {/* Séparateur et formulaire de rattachement */}
            <div className="rounded-md border p-4">
              <p className="mb-1 font-medium text-sm">
                {t("admin.reglages.notion.rattacher_existante_titre")}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("admin.reglages.notion.rattacher_existante_desc")}
              </p>
              <div className="flex gap-2">
                <Input
                  value={databaseIdRattach}
                  onChange={(e) => onDatabaseIdChange(e.target.value)}
                  placeholder={t("admin.reglages.notion.champ_database_id_placeholder")}
                  disabled={!estOwner || rattachCours}
                  aria-label={t("admin.reglages.notion.champ_database_id_label")}
                  className="font-mono text-sm"
                  spellCheck={false}
                  autoComplete="off"
                />
                {estOwner ? (
                  <Button
                    variant="outline"
                    onClick={onRattacher}
                    disabled={rattachCours || databaseIdRattach.trim() === ""}
                  >
                    {rattachCours
                      ? t("admin.reglages.notion.btn_rattacher_cours")
                      : t("admin.reglages.notion.btn_rattacher")}
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    {t("admin.reglages.notion.btn_rattacher")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Étape 4 — Webhook ─────────────────────────────────────────────────────────

/**
 * Étape 4 : affiche l'adresse du webhook et le jeton de vérification.
 *
 * Le jeton de vérification (`jetonVerification`) est renvoyé par
 * `GET /notion/status` uniquement au rang `owner` (garde `resetData`
 * dans `api/routes.php`). Il vient de `Configuration::etat()` et provient
 * de la poignée de main initiale de Notion.
 *
 * Précautions maintenues (S13, NOTION.md §5) :
 *   - Masqué par défaut (type="password") — l'utilisateur clique « Afficher »
 *     pour le voir : réduit la surface d'exposition lors du partage d'écran.
 *   - Bouton de copie : l'utilisateur copie sans jamais sélectionner la valeur.
 *   - Avertissement court : « ne pas partager ».
 *   - Jamais dans le localStorage (la valeur vient du state React du composant
 *     parent, pas d'un hook de stockage persistant).
 */
function Etape4Webhook({
  etat,
  webhookUrl,
  webhookCopie,
  verifCopie,
  onCopierWebhook,
  onCopierVerification,
}: {
  etat: NotionEtat;
  webhookUrl: string;
  webhookCopie: boolean;
  verifCopie: boolean;
  onCopierWebhook: () => void;
  onCopierVerification: (s: string) => void;
}) {
  const { t } = useI18n();
  const [afficherJeton, setAfficherJeton] = useState(false);

  const jetonVerification: string | null = etat.jetonVerification ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          {t("admin.reglages.notion.etape4_titre")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("admin.reglages.notion.etape4_desc")}</p>

        {/* Adresse du webhook */}
        <div className="space-y-1.5">
          <Label>{t("admin.reglages.notion.webhook_url_label")}</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={webhookUrl}
              className="font-mono text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
              aria-label={t("admin.reglages.notion.webhook_url_label")}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={onCopierWebhook}
              aria-label={t("admin.reglages.notion.btn_copier_webhook")}
            >
              {webhookCopie ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Jeton de vérification */}
        <div className="rounded-md border p-4 space-y-3">
          <div>
            <p className="mb-1 font-medium text-sm">
              {t("admin.reglages.notion.webhook_verification_titre")}
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t("admin.reglages.notion.webhook_verification_desc")}
            </p>
          </div>
          {jetonVerification ? (
            <>
              {/* Avertissement de sécurité bref — S13 */}
              <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t("admin.reglages.notion.webhook_verification_avertissement")}
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={jetonVerification}
                  type={afficherJeton ? "text" : "password"}
                  className="font-mono text-sm"
                  aria-label={t("admin.reglages.notion.webhook_verification_titre")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAfficherJeton((v) => !v)}
                  aria-label={
                    afficherJeton
                      ? t("admin.reglages.notion.btn_masquer_verification")
                      : t("admin.reglages.notion.btn_afficher_verification")
                  }
                >
                  {afficherJeton
                    ? t("admin.reglages.notion.btn_masquer_verification")
                    : t("admin.reglages.notion.btn_afficher_verification")}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onCopierVerification(jetonVerification)}
                  aria-label={t("admin.reglages.notion.btn_copier_verification")}
                >
                  {verifCopie ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {t("admin.reglages.notion.webhook_verification_absent")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
