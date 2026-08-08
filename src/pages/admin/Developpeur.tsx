import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Database,
  Download,
  ArrowRightLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Play,
  FileSearch,
  ChevronDown,
  ChevronRight,
  Info,
  OctagonX,
} from "lucide-react";
import { usePermissions } from "@/lib/admin-auth";
import { useI18n } from "@/lib/i18n";
import {
  useEtatBase,
  useSauvegarde,
  useMigrationMutations,
  type MigrationInput,
  type MigrationResult,
  type MigrationResultTable,
  type DetailAnomalie,
} from "@/data-provider/maintenance";
import { toApiError } from "@/data-provider/errors";

// ── Types locaux ──────────────────────────────────────────────────────────────

/** État du formulaire de connexion à la base cible. */
type FormMigration = Omit<MigrationInput, "simulation">;

/** Dialogue de confirmation en attente. */
type DialogAttente = { type: "sauvegarde" } | { type: "migration_exec"; form: FormMigration };

// ── Page principale ───────────────────────────────────────────────────────────

/**
 * Page « Développeur » — réservée au rôle `owner`.
 *
 * Elle expose trois fonctionnalités indépendantes :
 *   1. L'état de la base (lecture seule, rafraîchissable).
 *   2. La sauvegarde — téléchargement authentifié via fetch (cookie HttpOnly).
 *   3. La migration vers un autre moteur — simulation obligatoire avant exécution.
 *
 * Chaque action irréversible exige un geste conscient via ConfirmDialog.
 * Les états de chargement sont toujours visibles (boutons désactivés + libellé).
 * Les erreurs affichent un message issu du serveur, pas un message générique.
 */
export default function AdminDeveloppeur() {
  const { t } = useI18n();
  const { can, guard, denyReason } = usePermissions();

  // L'accès entier est réservé au rôle `owner` — même niveau que resetData.
  const estOwner = can("resetData");

  // ── Section 1 : état de la base ─────────────────────────────────────────
  const {
    data: etat,
    loading: chargementEtat,
    error: erreurEtat,
    refetch: recharger,
  } = useEtatBase();

  // ── Section 2 : sauvegarde ───────────────────────────────────────────────
  const { telecharger } = useSauvegarde();
  const [sauvegardeCours, setSauvegardeCours] = useState(false);

  // ── Section 3 : migration ────────────────────────────────────────────────
  const { migrer } = useMigrationMutations();
  const [form, setForm] = useState<FormMigration>({
    cible: "mysql",
    dsn: "",
    utilisateur: "",
    motDePasse: "",
  });
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [simulationCours, setSimulationCours] = useState(false);
  const [migrationCours, setMigrationCours] = useState(false);
  const [rapportSimulation, setRapportSimulation] = useState<MigrationResult | null>(null);

  // Le dialogue de confirmation (sauvegarde ou migration réelle).
  const [dialogue, setDialogue] = useState<DialogAttente | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────

  function setChamp<K extends keyof FormMigration>(cle: K, valeur: FormMigration[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
    // Tout changement de formulaire invalide le rapport de simulation précédent,
    // pour éviter qu'on exécute sur des paramètres différents de ceux simulés.
    if (rapportSimulation) setRapportSimulation(null);
  }

  function formulaireValide(): boolean {
    return form.dsn.trim() !== "" && form.utilisateur.trim() !== "" && form.motDePasse !== "";
  }

  async function lancerSauvegarde() {
    if (!guard("resetData", t("admin.systeme.developpeur.sauvegarde_btn"))) return;
    setSauvegardeCours(true);
    try {
      await telecharger();
      toast.success(t("admin.systeme.developpeur.sauvegarde_toast_ok"));
    } catch (cause) {
      const err = toApiError(cause);
      // Le message d'erreur vient du serveur : c'est une donnée, on l'affiche tel quel.
      toast.error(t("admin.systeme.developpeur.sauvegarde_toast_echec", { message: err.message }));
    } finally {
      setSauvegardeCours(false);
      setDialogue(null);
    }
  }

  async function lancerSimulation() {
    if (!guard("resetData", t("admin.systeme.developpeur.migration_btn_simuler"))) return;
    if (!formulaireValide()) {
      toast.error(t("admin.systeme.developpeur.migration_toast_form_incomplet"));
      return;
    }
    setSimulationCours(true);
    setRapportSimulation(null);
    try {
      const resultat = await migrer({ ...form, simulation: true });
      setRapportSimulation(resultat);
      if (resultat.ok) {
        toast.success(t("admin.systeme.developpeur.migration_toast_simu_ok"));
      } else {
        // `resultat.message` vient du serveur : c'est une donnée, on l'affiche tel quel.
        toast.error(
          t("admin.systeme.developpeur.migration_toast_simu_echec", {
            message: resultat.message,
          }),
        );
      }
    } catch (cause) {
      const err = toApiError(cause);
      // Message explicite : distinguer le refus de connexion d'une panne réseau.
      toast.error(
        t("admin.systeme.developpeur.migration_toast_simu_echec", { message: err.message }),
      );
    } finally {
      setSimulationCours(false);
    }
  }

  async function executer() {
    // Ce handler est appelé après confirmation dans le ConfirmDialog.
    if (!guard("resetData", t("admin.systeme.developpeur.migration_btn_executer"))) return;
    if (dialogue?.type !== "migration_exec") return;
    setMigrationCours(true);
    try {
      const resultat = await migrer({ ...dialogue.form, simulation: false });
      if (resultat.ok) {
        toast.success(t("admin.systeme.developpeur.migration_toast_exec_ok"));
        setRapportSimulation(resultat);
      } else {
        // `resultat.message` vient du serveur : c'est une donnée, on l'affiche tel quel.
        toast.error(
          t("admin.systeme.developpeur.migration_toast_exec_echec", {
            message: resultat.message,
          }),
        );
      }
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(
        t("admin.systeme.developpeur.migration_toast_exec_echec", { message: err.message }),
      );
    } finally {
      setMigrationCours(false);
      setDialogue(null);
    }
  }

  // ── Titre du dialogue ────────────────────────────────────────────────────

  const dialogueTitre = !dialogue
    ? ""
    : dialogue.type === "sauvegarde"
      ? t("admin.systeme.developpeur.dialog_sauvegarde_titre")
      : t("admin.systeme.developpeur.dialog_migration_titre");

  const dialogueDesc = !dialogue ? null : dialogue.type === "sauvegarde" ? (
    t("admin.systeme.developpeur.dialog_sauvegarde_desc")
  ) : (
    <div className="space-y-2 text-sm">
      <p>
        {/* Phrase complète — ordre des mots respecté dans les trois langues. */}
        {t("admin.systeme.developpeur.dialog_migration_desc_intro")}
      </p>
      <p>
        {/* `dialogue.form.cible.toUpperCase()` et `dialogue.form.dsn` sont des données. */}
        {t("admin.systeme.developpeur.dialog_migration_desc_cible", {
          cible: dialogue.form.cible.toUpperCase(),
          dsn: dialogue.form.dsn,
        })}
      </p>
      <p className="font-medium text-destructive">
        {t("admin.systeme.developpeur.dialog_migration_desc_confirmer")}
      </p>
    </div>
  );

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <AdminPageShell
      title={t("admin.systeme.developpeur.titre")}
      description={t("admin.systeme.developpeur.description")}
    >
      {/* Bannière accès restreint */}
      {!estOwner && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("admin.systeme.developpeur.acces_restreint_titre")}</AlertTitle>
          <AlertDescription>
            {denyReason("resetData") ?? t("admin.systeme.developpeur.acces_restreint_desc")}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Section 1 : État de la base ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" /> {t("admin.systeme.developpeur.etat_titre")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={recharger}
              disabled={chargementEtat}
              aria-label={t("admin.systeme.developpeur.etat_rafraichir_aria")}
            >
              <RefreshCw className={`me-2 h-4 w-4 ${chargementEtat ? "animate-spin" : ""}`} />
              {chargementEtat
                ? t("admin.socle.commun.chargement")
                : t("admin.systeme.developpeur.etat_rafraichir")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {erreurEtat && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {/* Erreur serveur : donnée, affichée telle quelle. */}
              {erreurEtat.message}
            </p>
          )}

          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t("admin.systeme.developpeur.etat_pilote")}
              </p>
              {/* `etat.driver` est un identifiant technique (sqlite, mysql, pgsql) : il ne se traduit pas. */}
              <p className="mt-1 font-semibold">{etat.driver}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t("admin.systeme.developpeur.etat_base")}
              </p>
              <p className="mt-1 truncate font-semibold">{etat.database}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t("admin.systeme.developpeur.etat_taille")}
              </p>
              <p className="mt-1 font-semibold">{etat.size}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t("admin.systeme.developpeur.etat_outbox")}
              </p>
              <p className="mt-1 font-semibold">
                {etat.outboxPending === 0 ? (
                  <span className="text-green-600">
                    {t("admin.systeme.developpeur.etat_outbox_zero")}
                  </span>
                ) : (
                  <span className="text-amber-600">{etat.outboxPending}</span>
                )}
              </p>
            </div>
          </div>

          {/* Dernière sauvegarde */}
          <p className="text-xs text-muted-foreground">
            {t("admin.systeme.developpeur.etat_derniere_sauvegarde")}{" "}
            {etat.lastBackup ? (
              <span className="font-medium text-foreground">
                {new Date(etat.lastBackup).toLocaleString("fr-DZ")}
              </span>
            ) : (
              <span className="font-medium text-amber-600">
                {t("admin.systeme.developpeur.etat_aucune_sauvegarde")}
              </span>
            )}
          </p>

          {/* Tableau des tables */}
          {chargementEtat ? (
            <div aria-busy="true" className="space-y-2">
              <span className="sr-only">
                {t("admin.systeme.developpeur.etat_chargement_tables")}
              </span>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : etat.tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.systeme.developpeur.etat_aucune_table")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-xs text-muted-foreground">
                    <th className="py-2 pe-4 text-start font-medium">
                      {t("admin.systeme.developpeur.etat_col_table")}
                    </th>
                    <th className="py-2 text-end font-medium">
                      {t("admin.systeme.developpeur.etat_col_lignes")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {etat.tables.map((tbl) => (
                    <tr key={tbl.name}>
                      {/* `tbl.name` est un nom de table technique : donnée, pas traduite. */}
                      <td className="py-2 pe-4 font-mono text-xs">{tbl.name}</td>
                      <td className="py-2 text-end tabular-nums">
                        {tbl.rows.toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2 : Sauvegarde ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> {t("admin.systeme.developpeur.sauvegarde_titre")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("admin.systeme.developpeur.sauvegarde_description")}
          </p>
          {can("resetData") ? (
            <Button onClick={() => setDialogue({ type: "sauvegarde" })} disabled={sauvegardeCours}>
              <Download className="me-2 h-4 w-4" />
              {sauvegardeCours
                ? t("admin.systeme.developpeur.sauvegarde_en_cours")
                : t("admin.systeme.developpeur.sauvegarde_btn")}
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button disabled>
                <Download className="me-2 h-4 w-4" />{" "}
                {t("admin.systeme.developpeur.sauvegarde_btn")}
              </Button>
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3 : Migration ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> {t("admin.systeme.developpeur.migration_titre")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("admin.systeme.developpeur.migration_alerte_titre")}</AlertTitle>
            <AlertDescription>
              {t("admin.systeme.developpeur.migration_alerte_desc")}
            </AlertDescription>
          </Alert>

          {/* Formulaire de connexion à la base cible */}
          <fieldset disabled={!estOwner} className="space-y-4">
            <legend className="sr-only">{t("admin.systeme.developpeur.migration_legend")}</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="migration-cible">
                  {t("admin.systeme.developpeur.migration_label_cible")}
                </Label>
                <Select
                  value={form.cible}
                  onValueChange={(v) => setChamp("cible", v as FormMigration["cible"])}
                >
                  <SelectTrigger id="migration-cible">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* `mysql` et `postgresql` sont des noms de pilotes : valeurs techniques, pas traduites. */}
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL / Supabase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="migration-utilisateur">
                  {t("admin.systeme.developpeur.migration_label_utilisateur")}
                </Label>
                <Input
                  id="migration-utilisateur"
                  value={form.utilisateur}
                  onChange={(e) => setChamp("utilisateur", e.target.value)}
                  placeholder="root"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="migration-dsn">
                {t("admin.systeme.developpeur.migration_label_dsn")}
              </Label>
              <Input
                id="migration-dsn"
                value={form.dsn}
                onChange={(e) => setChamp("dsn", e.target.value)}
                placeholder="mysql://hôte:3306/base_cible"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.systeme.developpeur.migration_dsn_exemple")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="migration-mdp">
                {t("admin.systeme.developpeur.migration_label_mdp")}
              </Label>
              <div className="relative">
                <Input
                  id="migration-mdp"
                  type={motDePasseVisible ? "text" : "password"}
                  value={form.motDePasse}
                  onChange={(e) => setChamp("motDePasse", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pe-10"
                />
                <button
                  type="button"
                  aria-label={
                    motDePasseVisible
                      ? t("admin.systeme.developpeur.migration_aria_masquer_mdp")
                      : t("admin.systeme.developpeur.migration_aria_afficher_mdp")
                  }
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setMotDePasseVisible((v) => !v)}
                  tabIndex={-1}
                >
                  {motDePasseVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("admin.systeme.developpeur.migration_mdp_note")}
              </p>
            </div>
          </fieldset>

          {/* Boutons simulation / exécution */}
          <div className="flex flex-wrap gap-3">
            {can("resetData") ? (
              <Button
                variant="outline"
                onClick={lancerSimulation}
                disabled={simulationCours || migrationCours || !formulaireValide()}
              >
                <FileSearch className="me-2 h-4 w-4" />
                {simulationCours
                  ? t("admin.systeme.developpeur.migration_simulation_cours")
                  : t("admin.systeme.developpeur.migration_btn_simuler")}
              </Button>
            ) : (
              <span title={denyReason("resetData")} className="inline-flex">
                <Button variant="outline" disabled>
                  <FileSearch className="me-2 h-4 w-4" />{" "}
                  {t("admin.systeme.developpeur.migration_btn_simuler")}
                </Button>
              </span>
            )}

            {/* Le bouton Exécuter n'est déverrouillé qu'après une simulation réussie. */}
            {can("resetData") ? (
              <span
                title={
                  !rapportSimulation || !rapportSimulation.ok
                    ? t("admin.systeme.developpeur.migration_tooltip_simuler_dabord")
                    : undefined
                }
                className="inline-flex"
              >
                <Button
                  variant="destructive"
                  onClick={() => setDialogue({ type: "migration_exec", form })}
                  disabled={
                    migrationCours || simulationCours || !rapportSimulation || !rapportSimulation.ok
                  }
                >
                  <Play className="me-2 h-4 w-4" />
                  {migrationCours
                    ? t("admin.systeme.developpeur.migration_execution_cours")
                    : t("admin.systeme.developpeur.migration_btn_executer")}
                </Button>
              </span>
            ) : (
              <span title={denyReason("resetData")} className="inline-flex">
                <Button variant="destructive" disabled>
                  <Play className="me-2 h-4 w-4" />{" "}
                  {t("admin.systeme.developpeur.migration_btn_executer")}
                </Button>
              </span>
            )}
          </div>

          {/* Rapport de simulation / migration */}
          {rapportSimulation && <RapportMigration rapport={rapportSimulation} />}
        </CardContent>
      </Card>

      {/* Dialogue de confirmation */}
      <ConfirmDialog
        open={!!dialogue}
        onOpenChange={(ouvert) => {
          if (!ouvert) setDialogue(null);
        }}
        title={dialogueTitre}
        description={dialogueDesc}
        confirmLabel={
          dialogue?.type === "sauvegarde"
            ? t("admin.systeme.developpeur.dialog_btn_telecharger")
            : t("admin.systeme.developpeur.dialog_btn_executer")
        }
        destructive={dialogue?.type === "migration_exec"}
        onConfirm={() => {
          if (dialogue?.type === "sauvegarde") {
            void lancerSauvegarde();
          } else {
            void executer();
          }
        }}
      />
    </AdminPageShell>
  );
}

// ── Sous-composants : rapport de migration ────────────────────────────────────

/**
 * Simplifie un message technique issu du backend pour le rendre lisible
 * par un commerçant non-développeur.
 *
 * Pourquoi cette transformation ici et pas dans le backend : la page reçoit
 * des messages bruts du serveur (empreintes MD5, noms de contraintes SQL).
 * Le commerçant n'a pas besoin de ces identifiants pour décider s'il peut
 * migrer — il lui faut une phrase d'action claire. On traduit donc à
 * l'affichage, sans altérer la donnée source.
 */
function simplifierMessage(message: string): string {
  // Remplacer les séquences d'empreintes hex (ex. ad63bb2f….12) par une
  // formulation neutre. L'empreinte n'apporte aucune information utile au
  // propriétaire et rend le message illisible.
  return message
    .replace(/\b[0-9a-f]{8,}…?\.[0-9]+\b/gi, "[valeur calculée]")
    .replace(/\(source [0-9a-f]{6,}[^)]*\)/gi, "")
    .replace(/\(cible [0-9a-f]{6,}[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Icône et couleur associées à la gravité d'une anomalie.
 * `erreur`        → rouge   (peut empêcher la migration)
 * `avertissement` → amber   (à surveiller, non bloquant)
 */
function BadgeGravite({ gravite }: { gravite: DetailAnomalie["gravite"] }) {
  const { t } = useI18n();
  if (gravite === "erreur") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
        <OctagonX className="h-3 w-3 shrink-0" />
        {t("admin.systeme.developpeur.gravite_erreur")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {t("admin.systeme.developpeur.gravite_avertissement")}
    </span>
  );
}

/**
 * Ligne de table expandable : affiche le résumé des compteurs et, si des
 * anomalies sont présentes, permet de déplier les détails par un clic.
 */
function LigneTable({ t: tbl }: { t: MigrationResultTable }) {
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(false);
  // Repli défensif : le champ `details` peut être absent d'une réponse ancienne.
  const details = tbl.details ?? [];
  const aDesDetails = tbl.anomalies > 0 && details.length > 0;
  const anomaliesSansDetails = tbl.anomalies > 0 && details.length === 0;

  return (
    <>
      {/* Ligne principale */}
      <tr
        className={
          tbl.anomalies > 0 ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
        }
      >
        <td className="py-1.5 pe-2">
          {aDesDetails ? (
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              className="flex w-full items-center gap-1 text-start font-mono text-xs"
              aria-expanded={ouvert}
              aria-label={t("admin.systeme.developpeur.rapport_aria_details", { nom: tbl.nom })}
            >
              {ouvert ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              {/* `tbl.nom` est un nom de table technique : donnée, pas traduite. */}
              {tbl.nom}
            </button>
          ) : (
            <span className="font-mono">{tbl.nom}</span>
          )}
        </td>
        <td className="py-1.5 pe-3 text-end tabular-nums">{tbl.lues.toLocaleString("fr-FR")}</td>
        <td className="py-1.5 pe-3 text-end tabular-nums">{tbl.ecrites.toLocaleString("fr-FR")}</td>
        <td className="py-1.5 text-end tabular-nums">
          {tbl.anomalies > 0 ? (
            <span className="font-semibold text-destructive">{tbl.anomalies}</span>
          ) : (
            <span className="text-green-600">0</span>
          )}
        </td>
      </tr>

      {/* Rangée de détails dépliée — uniquement si disponibles */}
      {ouvert && aDesDetails && (
        <tr className="bg-destructive/5">
          <td colSpan={4} className="pb-2 pe-3 ps-6 pt-0">
            <ul className="space-y-1.5">
              {details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <BadgeGravite gravite={d.gravite} />
                  {/* `d.message` est un message serveur : donnée, affichée telle quelle
                      après simplification des empreintes techniques. */}
                  <span>{simplifierMessage(d.message)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}

      {/*
       * Repli visible : anomalies signalées mais détails absents (backend ancien).
       */}
      {anomaliesSansDetails && (
        <tr className="bg-amber-500/5">
          <td colSpan={4} className="pb-2 pe-3 ps-4 pt-0">
            <p className="flex items-center gap-1.5 text-xs text-amber-700">
              <Info className="h-3 w-3 shrink-0" />
              {t("admin.systeme.developpeur.rapport_details_indisponibles")}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Bandeau de décision en tête du rapport.
 *
 * Sa question centrale : « est-ce que je peux y aller, oui ou non ? »
 */
function BandeauDecision({
  rapport,
  totalErreurs,
  totalAvertissements,
}: {
  rapport: MigrationResult;
  totalErreurs: number;
  totalAvertissements: number;
}) {
  const { t } = useI18n();
  if (!rapport.ok && totalErreurs > 0) {
    return (
      <Alert variant="destructive" className="py-3">
        <OctagonX className="h-4 w-4" />
        <AlertTitle>{t("admin.systeme.developpeur.decision_bloquee_titre")}</AlertTitle>
        <AlertDescription>
          {t("admin.systeme.developpeur.decision_bloquee_desc", { n: totalErreurs })}
        </AlertDescription>
      </Alert>
    );
  }
  if (totalAvertissements > 0) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/10 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">
          {t("admin.systeme.developpeur.decision_precaution_titre")}
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          {t("admin.systeme.developpeur.decision_precaution_desc", { n: totalAvertissements })}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className="border-green-500/40 bg-green-500/10 py-3">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">
        {t("admin.systeme.developpeur.decision_ok_titre")}
      </AlertTitle>
      <AlertDescription className="text-green-700">
        {t("admin.systeme.developpeur.decision_ok_desc")}
      </AlertDescription>
    </Alert>
  );
}

function RapportMigration({ rapport }: { rapport: MigrationResult }) {
  const { t } = useI18n();
  const totalLues = rapport.tables.reduce((s, tbl) => s + tbl.lues, 0);
  const totalEcrites = rapport.tables.reduce((s, tbl) => s + tbl.ecrites, 0);
  const totalAnomalies = rapport.tables.reduce((s, tbl) => s + tbl.anomalies, 0);

  // Compteurs par gravité pour alimenter le bandeau de décision.
  // Repli défensif : `details` peut être absent (réponse de backend ancien).
  const totalErreurs = rapport.tables.reduce(
    (s, tbl) => s + (tbl.details ?? []).filter((d) => d.gravite === "erreur").length,
    0,
  );
  const totalAvertissements = rapport.tables.reduce(
    (s, tbl) => s + (tbl.details ?? []).filter((d) => d.gravite === "avertissement").length,
    0,
  );

  return (
    <div className="space-y-4 rounded-md border bg-muted/20 p-4">
      {/* En-tête : type de rapport et statut global */}
      <div className="flex items-center gap-2">
        {rapport.ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        )}
        <p className={`text-sm font-medium ${rapport.ok ? "text-green-700" : "text-destructive"}`}>
          {rapport.simulation
            ? t("admin.systeme.developpeur.rapport_simulation")
            : t("admin.systeme.developpeur.rapport_migration")}{" "}
          — {/* `rapport.message` est un message serveur : donnée, affichée telle quelle. */}
          {rapport.message}
        </p>
        <Badge variant={rapport.simulation ? "secondary" : "default"} className="ms-auto shrink-0">
          {rapport.simulation
            ? t("admin.systeme.developpeur.rapport_badge_simulation")
            : t("admin.systeme.developpeur.rapport_badge_execution")}
        </Badge>
      </div>

      {/* Bandeau de décision : verdict clair pour le commerçant */}
      <BandeauDecision
        rapport={rapport}
        totalErreurs={totalErreurs}
        totalAvertissements={totalAvertissements}
      />

      {/* Résumé chiffré */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded border bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">
            {t("admin.systeme.developpeur.rapport_lignes_lues")}
          </p>
          <p className="font-semibold tabular-nums">{totalLues.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded border bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">
            {t("admin.systeme.developpeur.rapport_lignes_ecrites")}
          </p>
          <p className="font-semibold tabular-nums">{totalEcrites.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded border bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">
            {t("admin.systeme.developpeur.rapport_anomalies")}
          </p>
          <p
            className={`font-semibold tabular-nums ${
              totalAnomalies > 0 ? "text-destructive" : "text-green-600"
            }`}
          >
            {totalAnomalies}
          </p>
        </div>
      </div>

      {/* Détail par table — lignes expandables pour les tables en anomalie */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1.5 pe-3 text-start font-medium">
                {t("admin.systeme.developpeur.rapport_col_table")}
              </th>
              <th className="py-1.5 pe-3 text-end font-medium">
                {t("admin.systeme.developpeur.rapport_col_lues")}
              </th>
              <th className="py-1.5 pe-3 text-end font-medium">
                {t("admin.systeme.developpeur.rapport_col_ecrites")}
              </th>
              <th className="py-1.5 text-end font-medium">
                {t("admin.systeme.developpeur.rapport_col_anomalies")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rapport.tables.map((tbl) => (
              <LigneTable key={tbl.nom} t={tbl} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Note de lecture quand des lignes sont expandables */}
      {totalAnomalies > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("admin.systeme.developpeur.rapport_details_note")}
        </p>
      )}
    </div>
  );
}
