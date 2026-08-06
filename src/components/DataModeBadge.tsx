/**
 * DataModeBadge — indicateur de mode de données (développement uniquement).
 *
 * En production (`import.meta.env.DEV === false`), ce composant ne rend rien
 * et n'alourdit pas le bundle runtime. Les imports sont statiques mais la
 * valeur de `DEV` est une constante de compilation : Vite les élimine via
 * tree-shaking / dead-code elimination.
 *
 * Lit le mode depuis `@/data-provider/mode` — jamais depuis
 * `import.meta.env` directement (doctrine DATA-PROVIDER.md).
 *
 * Affiche également le nombre d'échecs de ressources journalisés par le socle
 * (`getResourceFailures`) pour rendre visibles les dégradations gracieuses
 * silencieuses (AGENTS.md §7).
 *
 * Signale enfin les comptes d'administration dépourvus de mot de passe
 * (`listPasswordlessAccounts`) : de tels comptes ne peuvent pas se connecter en
 * mode mock. Cet état dégradé était auparavant invisible — c'est précisément ce
 * silence qui a permis à un repli d'authentification de passer inaperçu.
 * Développement uniquement, comme tout ce composant.
 *
 * Le diagnostic est lu via `@/data-provider/auth` et non `@/lib/admin-store` :
 * seul le fournisseur de données connaît le magasin mock (DATA-PROVIDER.md).
 */
import { DATA_MODE } from "@/data-provider/mode";
import { getResourceFailures } from "@/data-provider";
import { listPasswordlessAccounts } from "@/data-provider/auth";

export function DataModeBadge() {
  if (!import.meta.env.DEV) return null;

  const failures = getResourceFailures();
  const failureCount = failures.length;

  const usersWithoutPassword = listPasswordlessAccounts();
  const passwordlessCount = usersWithoutPassword.length;

  const isHttp = DATA_MODE === "http";

  return (
    <div
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
        pointerEvents: "none",
        userSelect: "none",
        opacity: 0.85,
        backgroundColor: isHttp ? "#0ea5e9" : "#8b5cf6",
        color: "#fff",
      }}
      title={
        `Mode de données : ${DATA_MODE}` +
        (failureCount > 0 ? ` — ${failureCount} échec(s) de ressource` : "") +
        (passwordlessCount > 0
          ? ` — ${passwordlessCount} compte(s) sans mot de passe, connexion impossible : ` +
            `${usersWithoutPassword.join(", ")}. Renseigner VITE_DEV_SEED_CREDENTIALS dans .env.local, ` +
            "puis réinitialiser les données semées via /admin/reset (elles ne sont semées qu'une fois)."
          : "")
      }
    >
      <span>{DATA_MODE}</span>
      {failureCount > 0 && (
        <span
          style={{
            backgroundColor: "#ef4444",
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
            textAlign: "end",
          }}
        >
          {`${passwordlessCount} sans mdp`}
        </span>
      )}
    </div>
  );
}
