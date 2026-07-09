import { Link, useLocation } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tags, Star, FileText,
  Settings as SettingsIcon, BarChart3, Image as ImageIcon, Bell, ShieldCheck,
  ScrollText, Warehouse, Truck, CreditCard, PieChart, Ticket, Boxes,
  Menu, ChevronRight, Home, RotateCcw,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Item = { to: string; label: string; Icon: typeof LayoutDashboard };

export const ADMIN_SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { to: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
      { to: "/admin/analytics", label: "Analytique", Icon: BarChart3 },
      { to: "/admin/reports", label: "Rapports", Icon: PieChart },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { to: "/admin/products", label: "Produits", Icon: Package },
      { to: "/admin/categories", label: "Catégories", Icon: Boxes },
      { to: "/admin/brands", label: "Marques", Icon: Tags },
      { to: "/admin/inventory", label: "Stock", Icon: Warehouse },
      { to: "/admin/media", label: "Médias", Icon: ImageIcon },
    ],
  },
  {
    title: "Ventes",
    items: [
      { to: "/admin/orders", label: "Commandes", Icon: ShoppingBag },
      { to: "/admin/customers", label: "Clients", Icon: Users },
      { to: "/admin/coupons", label: "Coupons", Icon: Ticket },
      { to: "/admin/shipping", label: "Livraison", Icon: Truck },
      { to: "/admin/payments", label: "Paiements", Icon: CreditCard },
    ],
  },
  {
    title: "Contenu",
    items: [
      { to: "/admin/blog", label: "Blog", Icon: FileText },
      { to: "/admin/reviews", label: "Avis", Icon: Star },
    ],
  },
  {
    title: "Système",
    items: [
      { to: "/admin/users", label: "Utilisateurs & rôles", Icon: ShieldCheck },
      { to: "/admin/notifications", label: "Notifications", Icon: Bell },
      { to: "/admin/audit", label: "Journal d'audit", Icon: ScrollText },
      { to: "/admin/settings", label: "Paramètres", Icon: SettingsIcon },
      { to: "/admin/reset", label: "Réinitialiser", Icon: RotateCcw },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useLocation().pathname;
  return (
    <nav className="space-y-6 p-4 text-sm">
      {ADMIN_SECTIONS.map((s) => (
        <div key={s.title}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</p>
          <ul className="space-y-1">
            {s.items.map((it) => {
              const active = pathname === it.to || (it.to !== "/admin" && pathname.startsWith(it.to));
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                      active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent"
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
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/50 lg:block">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <Logo />
        <span className="text-sm font-semibold text-muted-foreground">Admin</span>
      </div>
      <SidebarNav />
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
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-border/60 px-4 space-y-0">
          <Logo />
          <SheetTitle className="text-sm font-semibold text-muted-foreground">Admin</SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
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
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Fil d'Ariane">
      <Link to="/admin" className="flex items-center gap-1 hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.slice(1).map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {c.to ? (
            <Link to={c.to} className="hover:text-foreground">{c.label}</Link>
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
