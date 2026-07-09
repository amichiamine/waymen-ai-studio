import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Heart, ShoppingCart, User, Search, Menu, X, Settings, Shield, LogOut,
  Wrench, Tag, ChevronDown, Laptop, Monitor, Cpu, Smartphone, ArrowRight,
} from "lucide-react";
import { Logo } from "./Logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useI18n, type TKey } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeLanguageToggles";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useAdminRoles } from "@/lib/admin-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV: { to: string; key: TKey }[] = [
  { to: "/blog", key: "nav.blog" },
  { to: "/about", key: "nav.about" },
  { to: "/contact", key: "nav.contact" },
];

const SECONDARY: { to: string; params?: Record<string, string>; key: TKey; Icon: typeof Tag; accent?: boolean }[] = [
  { to: "/category/$slug", params: { slug: "laptops" }, key: "nav.laptops", Icon: Laptop },
  { to: "/category/$slug", params: { slug: "desktops" }, key: "nav.desktops", Icon: Monitor },
  { to: "/category/$slug", params: { slug: "builds" }, key: "nav.builds", Icon: Cpu },
  { to: "/category/$slug", params: { slug: "phones" }, key: "nav.phones", Icon: Smartphone },
  { to: "/search", key: "nav.deals", Icon: Tag, accent: true },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRoles();
  const { cartCount, favorites } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled ? "bg-background/75 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container-page flex h-16 items-center gap-2 md:gap-4">
        <Link to="/" className="shrink-0 text-foreground">
          <Logo />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger className="group px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-card data-[state=open]:text-foreground data-[state=open]:bg-card transition-colors inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              {t("nav.category")}
              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-64 p-1.5">
              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t("cat.title")}
              </DropdownMenuLabel>
              {SECONDARY.map((n) => (
                <DropdownMenuItem
                  key={String(n.params?.slug ?? n.to) + n.key}
                  onSelect={() => navigate({ to: n.to, params: n.params as never })}
                  className="group/item gap-3 px-2 py-2.5 rounded-md cursor-pointer text-sm font-medium text-foreground/80 focus:bg-primary/10 focus:text-foreground data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground transition-colors"
                >
                  <span className={`inline-flex items-center justify-center size-8 rounded-md border border-border bg-card text-muted-foreground transition-colors group-hover/item:border-primary/40 group-hover/item:text-primary group-focus/item:border-primary/40 group-focus/item:text-primary ${n.accent ? "border-primary/40 text-primary bg-primary/10" : ""}`}>
                    <n.Icon className="size-4" />
                  </span>
                  <span className="flex-1">{t(n.key)}</span>
                  <ArrowRight className="size-3.5 opacity-0 -translate-x-1 transition-all group-hover/item:opacity-100 group-hover/item:translate-x-0 group-focus/item:opacity-100 group-focus/item:translate-x-0 text-primary" />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                onSelect={() => navigate({ to: "/category" })}
                className="justify-center px-2 py-2 rounded-md cursor-pointer text-xs font-semibold text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10"
              >
                {t("cat.browse")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              activeProps={{ className: "px-3 py-2 rounded-md text-foreground bg-card" }}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={(e) => { e.preventDefault(); const q = query.trim(); if (q) navigate({ to: "/search", search: { q } }); }}
          className="hidden md:flex flex-1 max-w-md mx-auto relative"
        >
          <button type="submit" aria-label="Rechercher" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <Search className="size-4" />
          </button>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("header.search")}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 h-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </form>

        <div className="flex items-center gap-0.5 md:gap-1 ms-auto lg:ms-0">
          <Link
            to="/builder"
            className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-[var(--shadow-glow)] transition-all active:scale-95"
          >
            <Wrench className="size-4" />
            <span>{t("nav.builder")}</span>
          </Link>
          <ThemeToggle />
          <Link to={user ? "/favorites" : "/auth"} aria-label={t("header.wishlist")}
            className="relative hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            <Heart className="size-5" />
            {user && favorites.size > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold inline-flex items-center justify-center">{favorites.size}</span>
            )}
          </Link>
          <Link to={user ? "/cart" : "/auth"} aria-label={t("header.cart")}
            className="relative hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            <ShoppingCart className="size-5" />
            {user && cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold inline-flex items-center justify-center">{cartCount}</span>
            )}
          </Link>
          {user && isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t("header.account")}
                className="hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <User className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/account" })}>
                  <Settings className="size-4 me-2" />
                  {t("header.account_settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/admin" })}
                  className="text-primary focus:text-primary"
                >
                  <Shield className="size-4 me-2" />
                  {t("header.admin_panel")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="size-4 me-2" />
                  {t("header.sign_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to={user ? "/account" : "/auth"} aria-label={t("header.account")}
              className="hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
              <User className="size-5" />
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label={t("header.menu")}
                className="lg:hidden inline-flex items-center justify-center size-11 rounded-md hover:bg-card transition-colors"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background border-border w-[85%] sm:w-80">
              <SheetTitle className="sr-only">{t("header.menu")}</SheetTitle>
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button onClick={() => setOpen(false)} aria-label={t("header.close")} className="size-9 inline-flex items-center justify-center rounded-md hover:bg-card">
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">{t("nav.category")}</div>
                {SECONDARY.map((n) => (
                  <Link
                    key={String(n.params?.slug ?? n.to) + n.key}
                    to={n.to}
                    params={n.params as never}
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 rounded-md text-foreground hover:bg-card text-sm inline-flex items-center gap-2"
                  >
                    {n.Icon && <n.Icon className="size-4" />}
                    {t(n.key)}
                  </Link>
                ))}
                <div className="h-px bg-border my-2" />
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-md text-foreground hover:bg-card text-base"
                  >
                    {t(n.key)}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
