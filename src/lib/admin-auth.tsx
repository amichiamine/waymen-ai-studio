import { useAuth } from "@/lib/auth";

// Frontend-only : tout utilisateur connecté est considéré admin
// pour permettre la navigation dans le back-office UI sans backend.

export type AdminRole = "super_admin" | "product_manager" | "order_manager" | "analyst";

export function useAdminRoles() {
  const { user, loading } = useAuth();
  const isAdmin = !!user;
  const roles: AdminRole[] = isAdmin ? ["super_admin"] : [];
  return {
    roles,
    isAdmin,
    isSuperAdmin: isAdmin,
    loading,
    user,
  };
}
