import { useCallback, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { canPerform, getActiveRole, type AdminUserRole } from "@/lib/admin-store";
// IMPORT PROFOND VOLONTAIRE — même raison que dans `src/lib/auth.tsx` : passer
// par le baril `@/data-provider` créerait une dépendance circulaire entre
// chunks au build.
import { useRealRole } from "@/data-provider/auth";

export type AdminRole = AdminUserRole;

/**
 * Rôle admin de l'utilisateur connecté.
 *
 * La SOURCE du rôle est choisie par la couche de données (`useRealRole`), pas
 * ici : en http il vient de la session que le serveur a signée, en mock du
 * magasin local. Ce module ne sait pas — et ne doit pas savoir — dans quel mode
 * il tourne (`docs/DATA-PROVIDER.md`).
 *
 * Il cherchait auparavant l'email de la session dans `useAdminState().users`,
 * le magasin mock, **y compris en http** : un compte réellement créé en base
 * n'y figurant pas, son propriétaire se voyait refuser `/admin` alors que
 * `GET /auth/me` lui répondait `role: "owner"`. Voir `useRealRole`.
 *
 * - owner / admin / editor  → accès au back-office (isAdmin = true)
 * - viewer                  → connecté, mais pas d'accès admin
 * - customer / pas d'entrée → utilisateur client standard (pas admin)
 */
export function useAdminRoles() {
  const { user, loading } = useAuth();
  const sessionRole = useRealRole(user);

  // `customer` est un rôle du contrat, jamais un rang du back-office : il ne
  // doit pas se retrouver dans `AdminRole`. On le traite comme « pas d'entrée »,
  // ce qui laisse `useEffectiveRole` retomber sur `viewer` (moindre privilège).
  const role: AdminRole | undefined = sessionRole === "customer" ? undefined : sessionRole;
  const isAdmin = role === "owner" || role === "admin" || role === "editor";

  return {
    roles: role ? [role] : [],
    role,
    isAdmin,
    isSuperAdmin: role === "owner" || role === "admin",
    loading,
    user,
  };
}

// =====================================================================
// Socle de permissions du back-office
// =====================================================================
//
// Pourquoi ce module et pas `canPerform()` de admin-store telle quelle :
// `canPerform(min)` prend par défaut `getActiveRole()`, qui lit la clé
// localStorage `katech.admin.activeRole.v1` pilotée par le sélecteur de
// démonstration de l'en-tête, avec `"owner"` en valeur de repli. L'employer
// directement donnerait une sécurité DÉCORATIVE : n'importe qui se promeut
// `owner` depuis le sélecteur ou la console du navigateur.
//
// Ici, la source d'autorité est le rôle RÉEL — l'entrée `users` qui correspond
// à l'email authentifié (`useAdminRoles`). Le sélecteur ne peut que
// RÉTROGRADER, et uniquement en développement. Voir `docs/PERMISSIONS.md`.

/** Étiquettes françaises des rôles — source unique pour toute l'interface admin. */
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  editor: "Éditeur",
  viewer: "Lecteur",
};

/** Rôles du moins au plus puissant — ordre d'affichage des sélecteurs. */
export const ADMIN_ROLES: readonly AdminRole[] = ["viewer", "editor", "admin", "owner"];

/**
 * Types d'actions du back-office et rôle minimum requis pour chacun.
 * Matrice unique : ne pas redéfinir de seuil au cas par cas dans les pages,
 * sinon les 35 écrans divergeront. Justification : `docs/PERMISSIONS.md`.
 */
export type AdminPermission =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "manageUsers"
  | "manageSettings"
  | "manageCriticalSettings"
  | "resetData";

export const PERMISSION_MATRIX: Record<AdminPermission, AdminRole> = {
  /** Consulter listes, fiches, tableaux de bord, journaux. */
  read: "viewer",
  /** Créer du contenu (produit, catégorie, marque, article, média, coupon…). */
  create: "editor",
  /** Modifier du contenu existant, y compris statuts de commande. */
  update: "editor",
  /** Supprimer une entité — irréversible sur un store local, donc réservé. */
  delete: "admin",
  /** Créer / modifier / désactiver un compte du back-office et son rôle. */
  manageUsers: "owner",
  /** Réglages courants : boutique, livraison, paiement, notifications. */
  manageSettings: "admin",
  /** Réglages critiques : maintenance, données de démonstration, sécurité. */
  manageCriticalSettings: "owner",
  /** Réinitialiser tout ou partie des données. */
  resetData: "owner",
};

/**
 * Ce que `can()` accepte : soit une action de la matrice (`can("delete")`,
 * à privilégier), soit directement un rôle plancher (`can("editor")`) quand
 * l'action n'entre dans aucune catégorie. Les deux ensembles de littéraux
 * sont disjoints : aucune ambiguïté possible à la lecture.
 */
export type PermissionRequirement = AdminPermission | AdminRole;

function isPermissionKey(value: PermissionRequirement): value is AdminPermission {
  return value in PERMISSION_MATRIX;
}

/** Traduit une exigence en rôle minimum requis. */
export function requiredRole(requirement: PermissionRequirement): AdminRole {
  return isPermissionKey(requirement) ? PERMISSION_MATRIX[requirement] : requirement;
}

function subscribeSimulatedRole(listener: () => void) {
  window.addEventListener("katech:role-changed", listener);
  return () => window.removeEventListener("katech:role-changed", listener);
}

/**
 * Rôle choisi dans le sélecteur de démonstration. N'est JAMAIS une autorité :
 * il ne sert qu'à rétrograder le rôle réel (voir `useEffectiveRole`).
 */
function useSimulatedRole(): AdminRole {
  return useSyncExternalStore(subscribeSimulatedRole, getActiveRole, () => "owner");
}

/**
 * Rôle qui fait foi dans l'interface.
 * - En production : strictement le rôle réel.
 * - En développement : le plus FAIBLE des deux (réel, simulé), pour pouvoir
 *   tester l'ergonomie d'un `viewer` depuis un compte `owner`. Jamais l'inverse.
 * Sans entrée `users` correspondante, on retombe sur `viewer` (moindre
 * privilège) plutôt que sur le `"owner"` de repli de `getActiveRole()`.
 */
export function useEffectiveRole(): { role: AdminRole; realRole: AdminRole; simulating: boolean } {
  const { role } = useAdminRoles();
  const simulated = useSimulatedRole();
  const realRole: AdminRole = role ?? "viewer";

  return useMemo(() => {
    if (!import.meta.env.DEV) return { role: realRole, realRole, simulating: false };
    // canPerform(min, r) === « r est au moins min ». Si le rôle simulé atteint
    // le rôle réel, il n'apporte rien : on garde le réel. Sinon il rétrograde.
    const downgrades = !canPerform(realRole, simulated);
    return {
      role: downgrades ? simulated : realRole,
      realRole,
      simulating: downgrades,
    };
  }, [realRole, simulated]);
}

export type PermissionsApi = {
  /** Rôle effectif (réel, éventuellement rétrogradé par la simulation en DEV). */
  role: AdminRole;
  /** Rôle réel issu de la table `users` — ignore toute simulation. */
  realRole: AdminRole;
  /** Vrai quand une simulation de rétrogradation est active (DEV uniquement). */
  simulating: boolean;
  /** Niveau 1 — affichage : `can("delete")`, `can("editor")`. */
  can: (requirement: PermissionRequirement) => boolean;
  /**
   * Niveau 2 — action : à appeler EN PREMIER dans tout handler qui mute.
   * Renvoie `false` et affiche un `toast.error` explicite si c'est refusé.
   * Ne jamais se reposer sur le seul masquage visuel.
   */
  guard: (requirement: PermissionRequirement, action?: string) => boolean;
  /**
   * Niveau 3 — ergonomie : motif du refus, `undefined` si l'action est permise.
   * À poser en `title` sur l'élément (ou son conteneur) pour qu'un bouton
   * désactivé ne reste jamais inerte et muet.
   */
  denyReason: (requirement: PermissionRequirement) => string | undefined;
};

function denialMessage(requirement: PermissionRequirement, action?: string): string {
  const min = ADMIN_ROLE_LABEL[requiredRole(requirement)];
  const what = action ? `« ${action} » : ` : "";
  return `${what}action réservée au rôle ${min} ou supérieur.`;
}

/**
 * Point d'entrée unique des permissions dans les pages admin.
 *
 *   const { can, guard, denyReason } = usePermissions();
 *
 * Mode d'emploi complet et exemple copiable : `docs/PERMISSIONS.md`.
 */
export function usePermissions(): PermissionsApi {
  const { role, realRole, simulating } = useEffectiveRole();

  const can = useCallback(
    (requirement: PermissionRequirement) => canPerform(requiredRole(requirement), role),
    [role],
  );

  const denyReason = useCallback(
    (requirement: PermissionRequirement) =>
      can(requirement) ? undefined : denialMessage(requirement),
    [can],
  );

  const guard = useCallback(
    (requirement: PermissionRequirement, action?: string) => {
      if (can(requirement)) return true;
      toast.error(denialMessage(requirement, action));
      return false;
    },
    [can],
  );

  return useMemo(
    () => ({ role, realRole, simulating, can, guard, denyReason }),
    [role, realRole, simulating, can, guard, denyReason],
  );
}
