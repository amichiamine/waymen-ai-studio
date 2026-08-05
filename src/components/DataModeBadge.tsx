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
 */
import { DATA_MODE } from "@/data-provider/mode";
import { getResourceFailures } from "@/data-provider";

export function DataModeBadge() {
  if (!import.meta.env.DEV) return null;

  const failures = getResourceFailures();
  const failureCount = failures.length;

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
      title={`Mode de données : ${DATA_MODE}${failureCount > 0 ? ` — ${failureCount} échec(s) de ressource` : ""}`}
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
    </div>
  );
}
