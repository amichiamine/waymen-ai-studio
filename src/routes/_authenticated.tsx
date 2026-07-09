import { createFileRoute, Outlet } from "@tanstack/react-router";

// Frontend-only : pas de gate d'auth. La layout ne fait que rendre les enfants.
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
