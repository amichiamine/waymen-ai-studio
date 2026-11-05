/**
 * DataModeBadge — indicateur et inspecteur de mode de données.
 *
 * DEUX RENDUS, POUR DEUX PUBLICS.
 *
 * 1. EN DÉVELOPPEMENT : la pastille cliquable, en bas à droite, sur toutes
 *    les pages. Elle affiche le mode et les alertes. Un clic ouvre le volet
 *    d'inspection complet avec l'état de l'API, l'URL de base et le journal des
 *    éventuels replis réseau silencieux (AGENTS.md §7).
 *    Sa visibilité est configurable depuis l'onglet Développeur du back-office.
 *
 * 2. EN PRODUCTION : rien du tout… SAUF si le paquet a été construit en mode
 *    `mock`, et uniquement dans le BACK-OFFICE (`/admin`), où s'affiche alors
 *    un bandeau explicite.
 *
 * Lit le mode depuis `@/data-provider/mode` — jamais depuis
 * `import.meta.env` directement (doctrine DATA-PROVIDER.md).
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DATA_MODE } from "@/data-provider/mode";
import { getResourceFailures, clearResourceFailures } from "@/data-provider";
import { listPasswordlessAccounts } from "@/data-provider/auth";
import { API_BASE_URL } from "@/api/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Trash2, EyeOff, Activity } from "lucide-react";

export const KATECH_SHOW_DATA_BADGE_KEY = "katech_show_data_badge";
export const KATECH_TOGGLE_BADGE_EVENT = "katech-toggle-data-badge";

export function DataModeBadge() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(KATECH_SHOW_DATA_BADGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handler = () => {
      try {
        setVisible(localStorage.getItem(KATECH_SHOW_DATA_BADGE_KEY) !== "false");
      } catch {
        setVisible(true);
      }
    };
    window.addEventListener(KATECH_TOGGLE_BADGE_EVENT, handler);
    return () => window.removeEventListener(KATECH_TOGGLE_BADGE_EVENT, handler);
  }, []);

  if (!import.meta.env.DEV) {
    if (DATA_MODE !== "mock") return null;
    if (!estEcranDExploitation(pathname)) return null;
    return <BandeauDemonstrationAdmin />;
  }

  if (!visible) return null;

  return <PastilleDeveloppement />;
}

/**
 * Écrans où l'exploitant doit apprendre que le paquet est déconnecté.
 */
function estEcranDExploitation(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth" ||
    pathname === "/reset-password"
  );
}

/**
 * Bandeau de production, back-office uniquement.
 */
function BandeauDemonstrationAdmin() {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 9999,
        padding: "0.5rem 1rem",
        backgroundColor: "#b91c1c",
        color: "#fff",
        fontSize: "0.8125rem",
        fontWeight: 600,
        lineHeight: 1.45,
        textAlign: "center",
        boxShadow: "0 1px 6px rgba(0,0,0,0.35)",
      }}
    >
      Mode démonstration — ce site n’est relié à AUCUN serveur. Le catalogue, les comptes et les
      commandes affichés ici vivent dans ce seul navigateur&nbsp;: personne d’autre ne les voit, et
      rien n’est enregistré. Reconstruire le paquet avec «&nbsp;VITE_API_MODE=http&nbsp;» (ou sans
      aucune variable) pour brancher la vraie boutique.
    </div>
  );
}

/**
 * Pastille de développement interactive avec modal d'inspection.
 */
function PastilleDeveloppement() {
  const [open, setOpen] = useState(false);
  const [, setRevision] = useState(0);

  const failures = getResourceFailures();
  const failureCount = failures.length;

  const usersWithoutPassword = listPasswordlessAccounts();
  const passwordlessCount = usersWithoutPassword.length;

  const isHttp = DATA_MODE === "http";

  const masquerPastille = () => {
    try {
      localStorage.setItem(KATECH_SHOW_DATA_BADGE_KEY, "false");
      window.dispatchEvent(new CustomEvent(KATECH_TOGGLE_BADGE_EVENT));
    } catch {
      // Ignoré si indisponible
    }
    setOpen(false);
  };

  const viderJournal = () => {
    clearResourceFailures();
    setRevision((r) => r + 1);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Inspecter le mode de données"
        style={{
          position: "fixed",
          bottom: "0.75rem",
          right: "0.75rem",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.25rem 0.625rem",
          borderRadius: "9999px",
          fontSize: "0.7rem",
          fontFamily: "monospace",
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: "0.02em",
          pointerEvents: "auto",
          cursor: "pointer",
          userSelect: "none",
          backgroundColor: isHttp ? "#0ea5e9" : "#8b5cf6",
          color: "#fff",
          border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transition: "transform 0.15s ease, opacity 0.15s ease",
        }}
        className="opacity-90 hover:opacity-100 hover:scale-105"
        title="Mode de données actif. Cliquez pour inspecter l'environnement et les journaux réseau."
      >
        <span>{DATA_MODE}</span>
        {failureCount > 0 && (
          <span
            style={{
              backgroundColor: "#ef4444",
              color: "#fff",
              borderRadius: "9999px",
              padding: "0 0.35rem",
              fontSize: "0.65rem",
            }}
          >
            {failureCount}
          </span>
        )}
        {passwordlessCount > 0 && (
          <span
            style={{
              backgroundColor: "#f59e0b",
              color: "#1c1917",
              borderRadius: "9999px",
              padding: "0 0.35rem",
              fontSize: "0.65rem",
            }}
          >
            {`${passwordlessCount} sans mdp`}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <DialogTitle>Inspecteur du Mode de Données</DialogTitle>
            </div>
            <DialogDescription>
              État en direct de la couche réseau et du fournisseur de données.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Ligne Mode et Base URL */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Mode de fonctionnement :</span>
                <Badge variant={isHttp ? "default" : "secondary"} className="font-mono uppercase">
                  {DATA_MODE}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">URL d'accès API :</span>
                <span className="font-mono text-xs bg-background px-2 py-0.5 rounded border">
                  {API_BASE_URL || "/api/v1 (relatif)"}
                </span>
              </div>
            </div>

            {/* Comptes sans mot de passe */}
            {passwordlessCount > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Comptes sans mot de passe ({passwordlessCount})</span>
                </div>
                <p className="text-xs">
                  {usersWithoutPassword.join(", ")}. Connexion impossible en mode mock. Renseignez{" "}
                  <code>VITE_DEV_SEED_CREDENTIALS</code> dans <code>.env.local</code>.
                </p>
              </div>
            )}

            {/* Échecs et replis réseau */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Journal des replis & échecs réseau ({failureCount}) :
                </span>
                {failureCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={viderJournal}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="me-1 h-3.5 w-3.5" /> Vider
                  </Button>
                )}
              </div>

              {failureCount === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Aucun incident réseau ni repli dégradé détecté. Socle nominal 🟢</span>
                </div>
              ) : (
                <div className="rounded-lg border divide-y text-xs max-h-56 overflow-y-auto">
                  {failures.map((f, idx) => (
                    <div key={`${f.key}-${idx}`} className="p-2.5 space-y-1 bg-background">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold text-destructive">{f.key}</span>
                        <span className="text-muted-foreground">
                          HTTP {f.status} · {f.code}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{f.message}</p>
                      <p className="text-[10px] text-muted-foreground/70">{f.at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={masquerPastille}
              className="text-xs text-muted-foreground"
            >
              <EyeOff className="me-1.5 h-3.5 w-3.5" /> Masquer la pastille
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
