import { useAuth } from "@/lib/auth";
import { useAdminState, type AdminUserRole } from "@/lib/admin-store";

export type AdminRole = AdminUserRole;

/**
 * Rôle admin dérivé de l'entrée correspondante dans /admin/users (par email).
 * - owner / admin / editor  → accès au back-office (isAdmin = true)
 * - viewer                  → connecté, mais pas d'accès admin
 * - pas d'entrée            → utilisateur client standard (pas admin)
 */
export function useAdminRoles() {
  const { user, loading } = useAuth();
  const { users } = useAdminState();

  const match = user
    ? users.find((u) => u.email.toLowerCase() === user.email.toLowerCase() && u.active)
    : undefined;

  const role = match?.role;
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
