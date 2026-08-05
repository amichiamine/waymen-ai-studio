import { Link, useLocation } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tags,
  Star,
  FileText,
  Settings as SettingsIcon,
  BarChart3,
  Image as ImageIcon,
  Bell,
  ShieldCheck,
  ScrollText,
  Warehouse,
  Truck,
  CreditCard,
  PieChart,
  Ticket,
  Boxes,
  Menu,
  ChevronRight,
  Home,
  RotateCcw,
  Check,
  Palette,
  Mail,
  Send,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useAdminState,
  canPerform,
  setActiveRole,
  markAllNotificationsRead,
  updateNotification,
  type AdminUserRole,
} from "@/lib/admin-store";
import { ADMIN_ROLES, ADMIN_ROLE_LABEL, useEffectiveRole } from "@/lib/admin-auth";

type Item = { to: string; label: string; Icon: typeof LayoutDashboard; minRole?: AdminUserRole };

export const ADMIN_SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { to: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
      { to: "/admin/analytics", label: "Analytique", Icon: BarChart3 },
      { to: "/admin/reports", label: "Rapports", Icon: PieChart, minRole: "editor" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { to: "/admin/products", label: "Produits", Icon: Package },
      { to: "/admin/categories", label: "Catégories", Icon: Boxes },
      { to: "/admin/brands", label: "Marques", Icon: Tags },
      { to: "/admin/inventory", label: "Stock", Icon: Warehouse, minRole: "editor" },
      { to: "/admin/media", label: "Médias", Icon: ImageIcon, minRole: "editor" },
    ],
  },
  {
    title: "Ventes",
    items: [
      { to: "/admin/orders", label: "Commandes", Icon: ShoppingBag },
      { to: "/admin/customers", label: "Clients", Icon: Users },
      { to: "/admin/coupons", label: "Coupons", Icon: Ticket, minRole: "editor" },
      { to: "/admin/shipping", label: "Livraison", Icon: Truck, minRole: "admin" },
      { to: "/admin/payments", label: "Paiements", Icon: CreditCard, minRole: "admin" },
    ],
  },
  {
    title: "Relation client",
    items: [
      { to: "/admin/messages", label: "Messages de contact", Icon: Mail, minRole: "editor" },
      { to: "/admin/subscribers", label: "Newsletter", Icon: Send, minRole: "editor" },
    ],
  },
  {
    title: "Contenu",
    items: [
      { to: "/admin/content", label: "Contenu du site", Icon: Palette, minRole: "editor" },
      { to: "/admin/blog", label: "Blog", Icon: FileText, minRole: "editor" },
      { to: "/admin/reviews", label: "Avis", Icon: Star, minRole: "editor" },
    ],
  },
  {
    title: "Système",
    items: [
      { to: "/admin/users", label: "Utilisateurs & rôles", Icon: ShieldCheck, minRole: "admin" },
      { to: "/admin/notifications", label: "Notifications", Icon: Bell },
      { to: "/admin/audit", label: "Journal d'audit", Icon: ScrollText, minRole: "admin" },
      { to: "/admin/settings", label: "Paramètres", Icon: SettingsIcon, minRole: "admin" },
      { to: "/admin/reset", label: "Réinitialiser", Icon: RotateCcw, minRole: "owner" },
    ],
  },
];

const ROLE_RANK: Record<AdminUserRole, number> = { owner: 4, admin: 3, editor: 2, viewer: 1 };
function canSee(item: Item, role: AdminUserRole): boolean {
  return !item.minRole || ROLE_RANK[role] >= ROLE_RANK[item.minRole];
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useLocation().pathname;
  const role = useActiveRole();
  return (
    <nav className="space-y-6 p-4 text-sm">
      {ADMIN_SECTIONS.map((s) => {
        const items = s.items.filter((it) => canSee(it, role));
        if (items.length === 0) return null;
        return (
          <div key={s.title}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {s.title}
            </p>
            <ul className="space-y-1">
              {items.map((it) => {
                const active =
                  pathname === it.to || (it.to !== "/admin" && pathname.startsWith(it.to));
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      onClick={onNavigate}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <it.Icon className="h-4 w-4" />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/50 lg:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4">
        <Logo />
        <span className="text-sm font-semibold text-muted-foreground">Admin</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu admin">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="h-14 shrink-0 flex-row items-center gap-2 border-b border-border/60 px-4 space-y-0">
          <Logo />
          <SheetTitle className="text-sm font-semibold text-muted-foreground">Admin</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminBreadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean); // e.g. ["admin", "products", "abc"]

  const findLabel = (to: string): string | null => {
    for (const s of ADMIN_SECTIONS) {
      const hit = s.items.find((it) => it.to === to);
      if (hit) return hit.label;
    }
    return null;
  };

  const crumbs: { label: string; to?: string }[] = [];
  let path = "";
  segments.forEach((seg, i) => {
    path += "/" + seg;
    if (i === 0) {
      crumbs.push({ label: "Admin", to: "/admin" });
    } else {
      const label = findLabel(path) ?? decodeURIComponent(seg);
      crumbs.push({ label, to: i === segments.length - 1 ? undefined : path });
    }
  });

  return (
    <nav
      className="flex items-center gap-1 text-sm text-muted-foreground"
      aria-label="Fil d'Ariane"
    >
      <Link to="/admin" className="flex items-center gap-1 hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.slice(1).map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {c.to ? (
            <Link to={c.to} className="hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function AdminEmptyState({ label = "Aucune donnée pour le moment" }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// ---------- Role switcher (simulation, développement uniquement) ----------
//
// Ce sélecteur est un outil de démonstration, pas un mécanisme d'autorisation.
// Il ne peut que RÉTROGRADER le rôle réel (voir `useEffectiveRole` dans
// `src/lib/admin-auth.tsx` et `docs/PERMISSIONS.md`) : proposer un rôle
// supérieur laisserait croire à une élévation de droits qui n'a pas lieu.
// En production, il n'est pas rendu du tout.

/** Rôle qui fait foi dans le chrome admin (navigation comprise). */
export function useActiveRole(): AdminUserRole {
  return useEffectiveRole().role;
}

export function AdminRoleSwitcher() {
  const { role, realRole, simulating } = useEffectiveRole();
  if (!import.meta.env.DEV) return null;

  // Seuls les rôles inférieurs ou égaux au rôle réel sont proposés.
  const options = ADMIN_ROLES.filter((r) => canPerform(r, realRole));

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="text-xs text-muted-foreground">
        Simuler un rôle
        {simulating && (
          <span className="ms-1 font-medium text-amber-600">
            (réel : {ADMIN_ROLE_LABEL[realRole]})
          </span>
        )}
      </span>
      <Select value={role} onValueChange={(v) => setActiveRole(v as AdminUserRole)}>
        <SelectTrigger
          className={`h-8 w-[150px] text-xs ${simulating ? "border-amber-500 text-amber-700" : ""}`}
          title="Outil de développement : permet uniquement de rétrograder son propre rôle pour tester l'interface."
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {ADMIN_ROLE_LABEL[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------- Notification bell ----------
export function AdminNotificationBell() {
  const { notifications } = useAdminState();
  const unread = notifications.filter((n) => !n.read).length;
  const latest = notifications.slice(0, 6);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={markAllNotificationsRead}
            disabled={unread === 0}
          >
            <Check className="mr-1 h-3 w-3" /> Tout lu
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {latest.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">Aucune notification.</p>
          ) : (
            <ul className="divide-y">
              {latest.map((n) => (
                <li key={n.id} className={`p-3 text-sm ${n.read ? "opacity-70" : "bg-primary/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {n.link && (
                      <Link to={n.link} className="text-xs text-primary hover:underline">
                        Voir
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => updateNotification(n.id, { read: true })}
                      >
                        Marquer lu
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2 text-center">
          <Link to="/admin/notifications" className="text-xs text-primary hover:underline">
            Toutes les notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
