/**
 * DataModeBadge — indicateur de mode de données.
 *
 * DEUX RENDUS, POUR DEUX PUBLICS.
 *
 * 1. EN DÉVELOPPEMENT : la pastille habituelle, en bas à droite, sur toutes
 *    les pages. Elle affiche le mode et les états dégradés du socle.
 *
 * 2. EN PRODUCTION : rien du tout… SAUF si le paquet a été construit en mode
 *    `mock`, et uniquement dans le BACK-OFFICE (`/admin`), où s'affiche alors
 *    un bandeau explicite.
 *
 *    Pourquoi ce cas existe : un paquet de production en `mock` affiche un
 *    catalogue complet, sans une erreur de console, sans jamais appeler
 *    `/api/`. Le commerçant voyait des produits fantômes, des commandes qui
 *    n'arrivaient nulle part, et n'avait AUCUN moyen de comprendre pourquoi —
 *    la seule trace vivait dans un bundle minifié. C'est ce silence que ce
 *    bandeau supprime.
 *
 *    Pourquoi seulement `/admin` : le visiteur n'a rien à faire d'une
 *    information de build, et défigurer la vitrine serait un second défaut.
 *    L'exploitant, lui, doit l'apprendre à la seconde où il ouvre sa gestion.
 *    `vite.config.ts` refuse de produire un tel paquet sans demande
 *    explicite : ce bandeau ne concerne donc que les démonstrations assumées
 *    (`bun run build:dev`) — et les paquets antérieurs à ce correctif.
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
import { useLocation } from "react-router-dom";
import { DATA_MODE } from "@/data-provider/mode";
import { getResourceFailures } from "@/data-provider";
import { listPasswordlessAccounts } from "@/data-provider/auth";

export function DataModeBadge() {
  // Hook appelé sans condition : `DataModeBadge` est monté dans `App`, donc
  // sous le routeur. La branche production en a besoin pour ne se montrer que
  // dans le back-office.
  const { pathname } = useLocation();

  if (!import.meta.env.DEV) {
    if (DATA_MODE !== "mock") return null;
    if (!estEcranDExploitation(pathname)) return null;
    return <BandeauDemonstrationAdmin />;
  }

  return <PastilleDeveloppement />;
}

/**
 * Écrans où l'exploitant doit apprendre que le paquet est déconnecté.
 *
 * `/admin` va de soi. `/auth` et `/reset-password` sont tout aussi
 * indispensables, et c'est mesuré : un visiteur non connecté qui demande
 * `/admin` est immédiatement renvoyé vers `/auth` par `RequireAuth`. Or en
 * mode `mock` la connexion échoue justement parce que le compte existe en
 * base mais que l'application interroge un magasin local — c'est LE symptôme
 * rapporté. S'arrêter à `/admin` aurait donc affiché le bandeau exactement
 * là où personne, dans ce scénario, ne peut se rendre.
 *
 * La vitrine (`/`, `/shop`, `/product/…`) reste volontairement intacte : le
 * visiteur n'a que faire d'une information de build.
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
 * Bandeau de production, back-office uniquement. Volontairement massif et
 * non refermable : c'est un défaut de déploiement, pas une préférence
 * d'affichage. Il occupe le haut de l'écran plutôt que le coin, parce qu'une
 * pastille discrète est exactement ce que personne n'a vu la première fois.
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

/** Pastille de développement — comportement historique, inchangé. */
function PastilleDeveloppement() {
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
