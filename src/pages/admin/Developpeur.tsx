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
 * `erreur`       → rouge    (peut empêcher la migration)
 * `avertissement` → amber   (à surveiller, non bloquant)
 */
function BadgeGravite({ gravite }: { gravite: DetailAnomalie["gravite"] }) {
  if (gravite === "erreur") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
        <OctagonX className="h-3 w-3 shrink-0" />
        Erreur
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      Avertissement
    </span>
  );
}

/**
 * Ligne de table expandable : affiche le résumé des compteurs et, si des
 * anomalies sont présentes, permet de déplier les détails par un clic.
 *
 * Pourquoi gérer l'ouverture localement plutôt qu'avec un Accordéon shadcn :
 * le tableau a des `<tr>` imbriquées pour les détails — la primitive Accordion
 * attend des `<div>` ; mélanger les deux casserait la sémantique du tableau.
 * Un simple `useState` local est ici la solution la plus propre.
 */
function LigneTable({ t }: { t: MigrationResultTable }) {
  const [ouvert, setOuvert] = useState(false);
  // Repli défensif : le champ `details` peut être absent d'une réponse ancienne.
  const details = t.details ?? [];
  const aDesDetails = t.anomalies > 0 && details.length > 0;
  const anomaliesSansDetails = t.anomalies > 0 && details.length === 0;

  return (
    <>
      {/* Ligne principale */}
      <tr
        className={
          t.anomalies > 0 ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
        }
      >
        <td className="py-1.5 pe-2">
          {aDesDetails ? (
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              className="flex w-full items-center gap-1 text-start font-mono text-xs"
              aria-expanded={ouvert}
              aria-label={`Détails anomalies — ${t.nom}`}
            >
              {ouvert ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              {t.nom}
            </button>
          ) : (
            <span className="font-mono">{t.nom}</span>
          )}
        </td>
        <td className="py-1.5 pe-3 text-end tabular-nums">{t.lues.toLocaleString("fr-FR")}</td>
        <td className="py-1.5 pe-3 text-end tabular-nums">{t.ecrites.toLocaleString("fr-FR")}</td>
        <td className="py-1.5 text-end tabular-nums">
          {t.anomalies > 0 ? (
            <span className="font-semibold text-destructive">{t.anomalies}</span>
          ) : (
            <span className="text-green-600">0</span>
          )}
        </td>
      </tr>

      {/* Rangée de détails dépliée — uniquement si disponibles */}
      {ouvert && aDesDetails && (
        <tr className="bg-destructive/5">
          <td colSpan={4} className="pb-2 pt-0 ps-6 pe-3">
            <ul className="space-y-1.5">
              {details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <BadgeGravite gravite={d.gravite} />
                  <span>{simplifierMessage(d.message)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}

      {/*
       * Repli visible : anomalies signalées mais détails absents (backend ancien).
       * Sans ce message, le commerçant verrait « anomalies : 1 » sans savoir pourquoi
       * — c'est exactement le défaut qu'on cherche à corriger.
       */}
      {anomaliesSansDetails && (
        <tr className="bg-amber-500/5">
          <td colSpan={4} className="pb-2 pt-0 ps-4 pe-3">
            <p className="flex items-center gap-1.5 text-xs text-amber-700">
              <Info className="h-3 w-3 shrink-0" />
              Détails non disponibles — mettez à jour le serveur pour obtenir l&apos;explication
              complète.
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
 * Le commerçant doit lire ce bandeau et avoir une réponse sans lire le détail.
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
  if (!rapport.ok && totalErreurs > 0) {
    return (
      <Alert variant="destructive" className="py-3">
        <OctagonX className="h-4 w-4" />
        <AlertTitle>Migration déconseillée</AlertTitle>
        <AlertDescription>
          {totalErreurs} erreur{totalErreurs > 1 ? "s" : ""} bloquante
          {totalErreurs > 1 ? "s" : ""} détectée{totalErreurs > 1 ? "s" : ""}. Des données
          pourraient être perdues ou corrompues. Corrigez les problèmes avant d&apos;exécuter.
        </AlertDescription>
      </Alert>
    );
  }
  if (totalAvertissements > 0) {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/10 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Migration possible avec précautions</AlertTitle>
        <AlertDescription className="text-amber-700">
          {totalAvertissements} avertissement{totalAvertissements > 1 ? "s" : ""} signalé
          {totalAvertissements > 1 ? "s" : ""}. Aucune perte de données confirmée, mais vérifiez les
          détails avant de conclure.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className="border-green-500/40 bg-green-500/10 py-3">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">Migration sans anomalie</AlertTitle>
      <AlertDescription className="text-green-700">
        Toutes les tables ont été traitées sans erreur. Vous pouvez exécuter la migration.
      </AlertDescription>
    </Alert>
  );
}

function RapportMigration({ rapport }: { rapport: MigrationResult }) {
  const totalLues = rapport.tables.reduce((s, t) => s + t.lues, 0);
  const totalEcrites = rapport.tables.reduce((s, t) => s + t.ecrites, 0);
  const totalAnomalies = rapport.tables.reduce((s, t) => s + t.anomalies, 0);

  // Compteurs par gravité pour alimenter le bandeau de décision.
  // Repli défensif : `details` peut être absent (réponse de backend ancien).
  const totalErreurs = rapport.tables.reduce(
    (s, t) => s + (t.details ?? []).filter((d) => d.gravite === "erreur").length,
    0,
  );
  const totalAvertissements = rapport.tables.reduce(
    (s, t) => s + (t.details ?? []).filter((d) => d.gravite === "avertissement").length,
    0,
  );

  return (
    <div className="rounded-md border bg-muted/20 p-4 space-y-4">
      {/* En-tête : type de rapport et statut global */}
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

      {/* Bandeau de décision : verdict clair pour le commerçant */}
      <BandeauDecision
        rapport={rapport}
        totalErreurs={totalErreurs}
        totalAvertissements={totalAvertissements}
      />

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

      {/* Détail par table — lignes expandables pour les tables en anomalie */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              {/*
               * Colonne Table : largeur libre pour que les noms longs ne cassent
               * pas la mise en page. Les colonnes numériques sont à droite.
               */}
              <th className="py-1.5 pe-3 font-medium text-start">Table</th>
              <th className="py-1.5 pe-3 font-medium text-end">Lues</th>
              <th className="py-1.5 pe-3 font-medium text-end">Écrites</th>
              <th className="py-1.5 font-medium text-end">Anomalies</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rapport.tables.map((t) => (
              <LigneTable key={t.nom} t={t} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Note de lecture quand des lignes sont expandables */}
      {totalAnomalies > 0 && (
        <p className="text-xs text-muted-foreground">
          Cliquez sur une ligne en anomalie pour voir l&apos;explication détaillée.
        </p>
      )}
    </div>
  );
}
