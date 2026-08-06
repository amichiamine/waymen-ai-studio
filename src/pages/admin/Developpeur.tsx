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
} from "lucide-react";
import { usePermissions } from "@/lib/admin-auth";
import {
  useEtatBase,
  useSauvegarde,
  useMigrationMutations,
  type MigrationInput,
  type MigrationResult,
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
    if (!guard("resetData", "Déclencher une sauvegarde")) return;
    setSauvegardeCours(true);
    try {
      await telecharger();
      toast.success("Sauvegarde téléchargée");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(`Sauvegarde échouée : ${err.message}`);
    } finally {
      setSauvegardeCours(false);
      setDialogue(null);
    }
  }

  async function lancerSimulation() {
    if (!guard("resetData", "Simuler la migration")) return;
    if (!formulaireValide()) {
      toast.error("Renseignez le DSN, l'utilisateur et le mot de passe.");
      return;
    }
    setSimulationCours(true);
    setRapportSimulation(null);
    try {
      const resultat = await migrer({ ...form, simulation: true });
      setRapportSimulation(resultat);
      if (resultat.ok) {
        toast.success("Simulation réussie — consultez le rapport avant d'exécuter.");
      } else {
        toast.error(`Simulation échouée : ${resultat.message}`);
      }
    } catch (cause) {
      const err = toApiError(cause);
      // Message explicite : distinguer le refus de connexion d'une panne réseau.
      toast.error(`Simulation échouée : ${err.message}`);
    } finally {
      setSimulationCours(false);
    }
  }

  async function executer() {
    // Ce handler est appelé après confirmation dans le ConfirmDialog.
    if (!guard("resetData", "Exécuter la migration")) return;
    if (dialogue?.type !== "migration_exec") return;
    setMigrationCours(true);
    try {
      const resultat = await migrer({ ...dialogue.form, simulation: false });
      if (resultat.ok) {
        toast.success("Migration exécutée avec succès.");
        setRapportSimulation(resultat);
      } else {
        toast.error(`Migration échouée : ${resultat.message}`);
      }
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(`Migration échouée : ${err.message}`);
    } finally {
      setMigrationCours(false);
      setDialogue(null);
    }
  }

  // ── Titre du dialogue ────────────────────────────────────────────────────

  const dialogueTitre = !dialogue
    ? ""
    : dialogue.type === "sauvegarde"
      ? "Télécharger la sauvegarde ?"
      : "Exécuter la migration ?";

  const dialogueDesc = !dialogue ? null : dialogue.type === "sauvegarde" ? (
    "Le fichier sera téléchargé directement dans votre navigateur."
  ) : (
    <div className="space-y-2 text-sm">
      <p>
        Cette opération transfère <strong>toutes les données</strong> vers la base cible. Elle est
        irréversible.
      </p>
      <p>
        Cible : <strong>{dialogue.form.cible.toUpperCase()}</strong> — {dialogue.form.dsn}
      </p>
      <p className="text-destructive font-medium">
        La simulation a été effectuée. Confirmez pour écrire les données.
      </p>
    </div>
  );

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <AdminPageShell
      title="Développeur"
      description="Diagnostic de base, sauvegarde et migration. Réservé au Propriétaire."
    >
      {/* Bannière accès restreint */}
      {!estOwner && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Accès restreint</AlertTitle>
          <AlertDescription>
            {denyReason("resetData") ?? "Cette page est réservée au Propriétaire."}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Section 1 : État de la base ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" /> État de la base
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={recharger}
              disabled={chargementEtat}
              aria-label="Rafraîchir l'état de la base"
            >
              <RefreshCw className={`me-2 h-4 w-4 ${chargementEtat ? "animate-spin" : ""}`} />
              {chargementEtat ? "Chargement…" : "Rafraîchir"}
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
              {erreurEtat.message}
            </p>
          )}

          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Pilote</p>
              <p className="mt-1 font-semibold">{etat.driver}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Base</p>
              <p className="mt-1 font-semibold truncate">{etat.database}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Taille</p>
              <p className="mt-1 font-semibold">{etat.size}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Événements en attente</p>
              <p className="mt-1 font-semibold">
                {etat.outboxPending === 0 ? (
                  <span className="text-green-600">Aucun</span>
                ) : (
                  <span className="text-amber-600">{etat.outboxPending}</span>
                )}
              </p>
            </div>
          </div>

          {/* Dernière sauvegarde */}
          <p className="text-xs text-muted-foreground">
            Dernière sauvegarde :{" "}
            {etat.lastBackup ? (
              <span className="font-medium text-foreground">
                {new Date(etat.lastBackup).toLocaleString("fr-DZ")}
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Aucune sauvegarde connue</span>
            )}
          </p>

          {/* Tableau des tables */}
          {chargementEtat ? (
            <div aria-busy="true" className="space-y-2">
              <span className="sr-only">Chargement des tables…</span>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : etat.tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune table disponible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start text-xs text-muted-foreground">
                    <th className="py-2 pe-4 font-medium text-start">Table</th>
                    <th className="py-2 font-medium text-end">Lignes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {etat.tables.map((t) => (
                    <tr key={t.name}>
                      <td className="py-2 pe-4 font-mono text-xs">{t.name}</td>
                      <td className="py-2 text-end tabular-nums">
                        {t.rows.toLocaleString("fr-FR")}
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
            <Download className="h-4 w-4" /> Sauvegarde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Télécharge un dump de la base. Le fichier est livré directement par le serveur et
            transite via votre session — aucun tiers ne le reçoit.
          </p>
          {can("resetData") ? (
            <Button onClick={() => setDialogue({ type: "sauvegarde" })} disabled={sauvegardeCours}>
              <Download className="me-2 h-4 w-4" />
              {sauvegardeCours ? "Téléchargement en cours…" : "Télécharger la sauvegarde"}
            </Button>
          ) : (
            <span title={denyReason("resetData")} className="inline-flex">
              <Button disabled>
                <Download className="me-2 h-4 w-4" /> Télécharger la sauvegarde
              </Button>
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Section 3 : Migration ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Migration vers un autre moteur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Simulation obligatoire</AlertTitle>
            <AlertDescription>
              Cliquez d&apos;abord sur <strong>Simuler</strong> pour vérifier la compatibilité sans
              toucher à vos données. Le bouton <strong>Exécuter</strong> n&apos;est disponible
              qu&apos;après une simulation réussie.
            </AlertDescription>
          </Alert>

          {/* Formulaire de connexion à la base cible */}
          <fieldset disabled={!estOwner} className="space-y-4">
            <legend className="sr-only">Connexion à la base cible</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="migration-cible">Moteur cible</Label>
                <Select
                  value={form.cible}
                  onValueChange={(v) => setChamp("cible", v as FormMigration["cible"])}
                >
                  <SelectTrigger id="migration-cible">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL / Supabase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="migration-utilisateur">Utilisateur de la base cible</Label>
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
              <Label htmlFor="migration-dsn">DSN de connexion</Label>
              <Input
                id="migration-dsn"
                value={form.dsn}
                onChange={(e) => setChamp("dsn", e.target.value)}
                placeholder="mysql://hôte:3306/base_cible"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Exemple MySQL : <code>mysql://hôte:3306/base_cible</code> — PostgreSQL :{" "}
                <code>postgresql://hôte:5432/base_cible</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="migration-mdp">Mot de passe</Label>
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
                    motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
                  }
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setMotDePasseVisible((v) => !v)}
                  tabIndex={-1}
                >
                  {motDePasseVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Transmis uniquement au serveur dans le corps de la requête. Jamais stocké
                localement.
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
                {simulationCours ? "Simulation en cours…" : "Simuler"}
              </Button>
            ) : (
              <span title={denyReason("resetData")} className="inline-flex">
                <Button variant="outline" disabled>
                  <FileSearch className="me-2 h-4 w-4" /> Simuler
                </Button>
              </span>
            )}

            {/* Le bouton Exécuter n'est déverrouillé qu'après une simulation réussie. */}
            {can("resetData") ? (
              <span
                title={
                  !rapportSimulation || !rapportSimulation.ok
                    ? "Effectuez d'abord une simulation réussie"
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
                  {migrationCours ? "Migration en cours…" : "Exécuter"}
                </Button>
              </span>
            ) : (
              <span title={denyReason("resetData")} className="inline-flex">
                <Button variant="destructive" disabled>
                  <Play className="me-2 h-4 w-4" /> Exécuter
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
        confirmLabel={dialogue?.type === "sauvegarde" ? "Télécharger" : "Exécuter la migration"}
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

// ── Sous-composant : rapport de migration ─────────────────────────────────────

function RapportMigration({ rapport }: { rapport: MigrationResult }) {
  const totalLues = rapport.tables.reduce((s, t) => s + t.lues, 0);
  const totalEcrites = rapport.tables.reduce((s, t) => s + t.ecrites, 0);
  const totalAnomalies = rapport.tables.reduce((s, t) => s + t.anomalies, 0);

  return (
    <div className="rounded-md border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {rapport.ok ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive shrink-0" />
        )}
        <p className={`text-sm font-medium ${rapport.ok ? "text-green-700" : "text-destructive"}`}>
          {rapport.simulation ? "Rapport de simulation" : "Rapport de migration"} —{" "}
          {rapport.message}
        </p>
        <Badge variant={rapport.simulation ? "secondary" : "default"} className="ms-auto shrink-0">
          {rapport.simulation ? "Simulation" : "Exécution réelle"}
        </Badge>
      </div>

      {/* Résumé chiffré */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded border bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Lignes lues</p>
          <p className="font-semibold tabular-nums">{totalLues.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded border bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Lignes écrites</p>
          <p className="font-semibold tabular-nums">{totalEcrites.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded border bg-background p-2 text-center">
          <p className="text-xs text-muted-foreground">Anomalies</p>
          <p
            className={`font-semibold tabular-nums ${
              totalAnomalies > 0 ? "text-destructive" : "text-green-600"
            }`}
          >
            {totalAnomalies}
          </p>
        </div>
      </div>

      {/* Détail par table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1.5 pe-3 font-medium text-start">Table</th>
              <th className="py-1.5 pe-3 font-medium text-end">Lues</th>
              <th className="py-1.5 pe-3 font-medium text-end">Écrites</th>
              <th className="py-1.5 font-medium text-end">Anomalies</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rapport.tables.map((t) => (
              <tr key={t.nom} className={t.anomalies > 0 ? "bg-destructive/5" : undefined}>
                <td className="py-1.5 pe-3 font-mono">{t.nom}</td>
                <td className="py-1.5 pe-3 text-end tabular-nums">
                  {t.lues.toLocaleString("fr-FR")}
                </td>
                <td className="py-1.5 pe-3 text-end tabular-nums">
                  {t.ecrites.toLocaleString("fr-FR")}
                </td>
                <td
                  className={`py-1.5 text-end tabular-nums ${
                    t.anomalies > 0 ? "font-semibold text-destructive" : ""
                  }`}
                >
                  {t.anomalies}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
