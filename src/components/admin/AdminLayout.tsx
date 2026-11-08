import { Link, useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  Store,
  User,
  Terminal,
  BookOpen,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
  SheetDescription,
} from "@/components/ui/sheet";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { canPerform, setActiveRole, type AdminUserRole } from "@/lib/admin-store";
import { useNotificationList, useNotificationMutations } from "@/data-provider";
import { ADMIN_ROLES, useEffectiveRole } from "@/lib/admin-auth";
import { useAuth } from "@/lib/auth";
import { useI18n, type Lang } from "@/lib/i18n";

/**
 * Un lien de la barre latérale.
 *
 * `labelKey` est une CLÉ de traduction, pas un libellé : la navigation est
 * rendue dans la langue de l'interface, y compris dans le fil d'Ariane qui
 * réutilise cette même table. Idem pour `titleKey` des sections.
 * Les chemins (`/admin/products`) sont techniques : ils ne se traduisent pas.
 */
type Item = { to: string; labelKey: string; Icon: typeof LayoutDashboard; minRole?: AdminUserRole };

export const ADMIN_SECTIONS: { titleKey: string; items: Item[] }[] = [
  {
    titleKey: "admin.socle.navigation.section_apercu",
    items: [
      { to: "/admin", labelKey: "admin.socle.navigation.lien_tableau", Icon: LayoutDashboard },
      {
        to: "/admin/analytics",
        labelKey: "admin.socle.navigation.lien_analytique",
        Icon: BarChart3,
      },
      {
        to: "/admin/reports",
        labelKey: "admin.socle.navigation.lien_rapports",
        Icon: PieChart,
        minRole: "editor",
      },
    ],
  },
  {
    titleKey: "admin.socle.navigation.section_catalogue",
    items: [
      { to: "/admin/products", labelKey: "admin.socle.navigation.lien_produits", Icon: Package },
      { to: "/admin/categories", labelKey: "admin.socle.navigation.lien_categories", Icon: Boxes },
      { to: "/admin/brands", labelKey: "admin.socle.navigation.lien_marques", Icon: Tags },
      {
        to: "/admin/inventory",
        labelKey: "admin.socle.navigation.lien_stock",
        Icon: Warehouse,
        minRole: "editor",
      },
      {
        to: "/admin/media",
        labelKey: "admin.socle.navigation.lien_medias",
        Icon: ImageIcon,
        minRole: "editor",
      },
    ],
  },
  {
    titleKey: "admin.socle.navigation.section_ventes",
    items: [
      { to: "/admin/orders", labelKey: "admin.socle.navigation.lien_commandes", Icon: ShoppingBag },
      { to: "/admin/customers", labelKey: "admin.socle.navigation.lien_clients", Icon: Users },
      {
        to: "/admin/coupons",
        labelKey: "admin.socle.navigation.lien_coupons",
        Icon: Ticket,
        minRole: "editor",
      },
      {
        to: "/admin/shipping",
        labelKey: "admin.socle.navigation.lien_livraison",
        Icon: Truck,
        minRole: "admin",
      },
      {
        to: "/admin/payments",
        labelKey: "admin.socle.navigation.lien_paiements",
        Icon: CreditCard,
        minRole: "admin",
      },
    ],
  },
  {
    titleKey: "admin.socle.navigation.section_relation",
    items: [
      {
        to: "/admin/messages",
        labelKey: "admin.socle.navigation.lien_messages",
        Icon: Mail,
        minRole: "editor",
      },
      {
        to: "/admin/subscribers",
        labelKey: "admin.socle.navigation.lien_newsletter",
        Icon: Send,
        minRole: "editor",
      },
    ],
  },
  {
    titleKey: "admin.socle.navigation.section_contenu",
    items: [
      {
        to: "/admin/pages",
        labelKey: "admin.socle.navigation.lien_pages",
        Icon: Palette,
        minRole: "editor",
      },
      {
        to: "/admin/blog",
        labelKey: "admin.socle.navigation.lien_blog",
        Icon: FileText,
        minRole: "editor",
      },
      {
        to: "/admin/reviews",
        labelKey: "admin.socle.navigation.lien_avis",
        Icon: Star,
        minRole: "editor",
      },
    ],
  },
  {
    titleKey: "admin.socle.navigation.section_systeme",
    items: [
      {
        to: "/admin/users",
        labelKey: "admin.socle.navigation.lien_utilisateurs",
        Icon: ShieldCheck,
        minRole: "admin",
      },
      {
        to: "/admin/notifications",
        labelKey: "admin.socle.navigation.lien_notifications",
        Icon: Bell,
      },
      {
        to: "/admin/audit",
        labelKey: "admin.socle.navigation.lien_audit",
        Icon: ScrollText,
        minRole: "admin",
      },
      {
        to: "/admin/settings",
        labelKey: "admin.socle.navigation.lien_parametres",
        Icon: SettingsIcon,
        minRole: "admin",
      },
      {
        to: "/admin/reset",
        labelKey: "admin.socle.navigation.lien_reinitialiser",
        Icon: RotateCcw,
        minRole: "owner",
      },
      {
        to: "/admin/developpeur",
        labelKey: "admin.socle.navigation.lien_developpeur",
        Icon: Terminal,
        minRole: "owner",
      },
      {
        to: "/admin/notion",
        labelKey: "admin.reglages.notion.titre",
        Icon: BookOpen,
        minRole: "owner",
      },
    ],
  },
];

/**
 * Locale d'affichage des dates dans le chrome admin. L'Algérie écrit ses
 * chiffres en caractères latins, y compris en arabe : `ar-DZ` le respecte.
 */
const DATE_LOCALE: Record<Lang, string> = { fr: "fr-DZ", en: "en-DZ", ar: "ar-DZ" };

const ROLE_RANK: Record<AdminUserRole, number> = { owner: 4, admin: 3, editor: 2, viewer: 1 };
function canSee(item: Item, role: AdminUserRole): boolean {
  return !item.minRole || ROLE_RANK[role] >= ROLE_RANK[item.minRole];
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useLocation().pathname;
  const role = useActiveRole();
  const { t } = useI18n();
  return (
    <nav className="space-y-6 p-4 text-sm">
      {ADMIN_SECTIONS.map((s) => {
        const items = s.items.filter((it) => canSee(it, role));
        if (items.length === 0) return null;
        return (
          <div key={s.titleKey}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(s.titleKey)}
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
                      {t(it.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div className="pt-4 border-t border-border/50">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-setup-wizard"));
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {t("admin.reglages.parametres.wizard_bouton_lancer") || "Assistant de configuration"}
          </span>
        </button>
      </div>
    </nav>
  );
}

export function AdminSidebar() {
  const { t } = useI18n();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/50 lg:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4">
        <Logo />
        <span className="text-sm font-semibold text-muted-foreground">
          {t("admin.socle.navigation.badge")}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={t("admin.socle.navigation.ouvrir_menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="h-14 shrink-0 flex-row items-center gap-2 border-b border-border/60 px-4 space-y-0">
          <Logo />
          <SheetTitle className="text-sm font-semibold text-muted-foreground">
            {t("admin.socle.navigation.badge")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("admin.socle.navigation.ouvrir_menu")}
          </SheetDescription>
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
  const { t } = useI18n();
  const segments = pathname.split("/").filter(Boolean); // e.g. ["admin", "products", "abc"]

  // Les libellés du fil d'Ariane proviennent de la même table que la barre
  // latérale : une seule source, donc aucune divergence de traduction possible.
  // Un segment inconnu (identifiant d'un produit, d'une commande…) est affiché
  // tel quel : c'est une donnée, elle ne se traduit pas.
  const findLabel = (to: string): string | null => {
    for (const s of ADMIN_SECTIONS) {
      const hit = s.items.find((it) => it.to === to);
      if (hit) return t(hit.labelKey);
    }
    return null;
  };

  const crumbs: { label: string; to?: string }[] = [];
  let path = "";
  segments.forEach((seg, i) => {
    path += "/" + seg;
    if (i === 0) {
      crumbs.push({ label: t("admin.socle.navigation.racine"), to: "/admin" });
    } else {
      const label = findLabel(path) ?? decodeURIComponent(seg);
      crumbs.push({ label, to: i === segments.length - 1 ? undefined : path });
    }
  });

  return (
    <nav
      className="flex items-center gap-1 text-sm text-muted-foreground"
      aria-label={t("admin.socle.navigation.fil_ariane")}
    >
      <Link
        to="/admin"
        className="flex items-center gap-1 hover:text-foreground"
        aria-label={t("admin.socle.navigation.accueil_admin")}
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
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

/**
 * État vide générique. `label` reste optionnel : à défaut, il prend le libellé
 * traduit `admin.socle.commun.aucune_donnee`. Résolu dans le corps du composant
 * (et non en valeur par défaut de paramètre) pour pouvoir lire le contexte de
 * langue. Un appelant qui passe un `label` doit le passer déjà traduit.
 */
export function AdminEmptyState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
      {label ?? t("admin.socle.commun.aucune_donnee")}
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

/**
 * Libellé traduit d'un rôle. `ADMIN_ROLE_LABEL` (dans `src/lib/admin-auth.tsx`)
 * reste la source des libellés côté logique de permissions ; l'interface, elle,
 * affiche `admin.socle.roles.<role>`. Les identifiants de rôle (`owner`,
 * `admin`, `editor`, `viewer`) sont techniques et ne se traduisent jamais.
 */
function useRoleLabel(): (role: AdminUserRole) => string {
  const { t } = useI18n();
  return (role) => t(`admin.socle.roles.${role}`);
}

export function AdminRoleSwitcher() {
  const { role, realRole, simulating } = useEffectiveRole();
  const { t } = useI18n();
  const roleLabel = useRoleLabel();
  if (!import.meta.env.DEV) return null;

  // Seuls les rôles inférieurs ou égaux au rôle réel sont proposés.
  const options = ADMIN_ROLES.filter((r) => canPerform(r, realRole));

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="text-xs text-muted-foreground">
        {t("admin.socle.entete.simuler_role")}
        {simulating && (
          <span className="ms-1 font-medium text-amber-600">
            {t("admin.socle.entete.role_reel", { role: roleLabel(realRole) })}
          </span>
        )}
      </span>
      <Select value={role} onValueChange={(v) => setActiveRole(v as AdminUserRole)}>
        <SelectTrigger
          className={`h-8 w-[150px] text-xs ${simulating ? "border-amber-500 text-amber-700" : ""}`}
          title={t("admin.socle.entete.simuler_infobulle")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {roleLabel(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------- Notification bell ----------
export function AdminNotificationBell() {
  // loading inerte en mode mock. En http, data vaut [] (repli stable) jusqu'au
  // premier aller-retour — la cloche reste visible sans badge.
  const { data: notifications } = useNotificationList();
  const { markRead, markAllRead } = useNotificationMutations();
  const { t, lang } = useI18n();
  const unread = notifications.filter((n) => !n.read).length;
  const latest = notifications.slice(0, 6);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("admin.socle.entete.notifications")}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]">
              {unread > 9 ? "9+" : unread}
              {/* Le badge est un chiffre tronqué : le compte exact est donné
                  aux lecteurs d'écran, avec la forme plurielle correcte. */}
              <span className="sr-only"> {t("admin.socle.entete.non_lues", { n: unread })}</span>
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">{t("admin.socle.entete.notifications")}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => void markAllRead()}
            disabled={unread === 0}
          >
            <Check className="me-1 h-3 w-3" /> {t("admin.socle.entete.tout_lu")}
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {latest.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              {t("admin.socle.entete.aucune_notification")}
            </p>
          ) : (
            <ul className="divide-y">
              {latest.map((n) => (
                <li key={n.id} className={`p-3 text-sm ${n.read ? "opacity-70" : "bg-primary/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {/* Date formatée selon la langue de l'interface, pas
                          selon une locale codée en dur. */}
                      {new Date(n.createdAt).toLocaleDateString(DATE_LOCALE[lang])}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {n.link && (
                      <Link to={n.link} className="text-xs text-primary hover:underline">
                        {t("admin.socle.commun.voir")}
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => void markRead(n.id, true)}
                      >
                        {t("admin.socle.entete.marquer_lu")}
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
            {t("admin.socle.entete.toutes_notifications")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Menu utilisateur ----------

function initiales(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function AdminUserMenu() {
  const { user, signOut } = useAuth();
  const { role, realRole, simulating } = useEffectiveRole();
  const navigate = useNavigate();
  const { t } = useI18n();
  const roleLabel = useRoleLabel();

  const name: string = user?.name ?? user?.email ?? t("admin.socle.entete.compte");
  const email: string = user?.email ?? "";
  const fallback = initiales(name) || <User className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("admin.socle.entete.menu_utilisateur")}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium text-sm">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          {simulating ? (
            <p className="mt-1 text-xs">
              <span className="text-muted-foreground">{t("admin.socle.entete.role_simule")} </span>
              <span className="font-medium text-amber-600">{roleLabel(role)}</span>
              <span className="text-muted-foreground">
                {" "}
                {t("admin.socle.entete.role_separateur_reel")}{" "}
              </span>
              <span className="font-medium">{roleLabel(realRole)}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.socle.entete.role")}{" "}
              <span className="font-medium text-foreground">{roleLabel(role)}</span>
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/")}>
          <Store className="h-4 w-4 me-2" />
          {t("admin.socle.entete.retour_boutique")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4 me-2" />
          {t("admin.socle.entete.deconnexion")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
