import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Heart,
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  Settings,
  Shield,
  LogOut,
  Wrench,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Logo } from "./Logo";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useI18n, useLocalize } from "@/lib/i18n";
import { ThemeToggle, LanguageToggle } from "./ThemeLanguageToggles";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useAdminRoles } from "@/lib/admin-auth";
import { useSiteContent } from "@/data-provider";
import { getIcon } from "@/lib/site-content";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { t } = useI18n();
  const L = useLocalize();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRoles();
  const { cartCount, favorites } = useStore();
  // loading inerte en mode mock. En http, data est le repli (seedSiteContent)
  // jusqu'au premier aller-retour — l'en-tête reste visible avec les valeurs
  // par défaut. Dégradation gracieuse : un header vide casserait toutes les pages.
  const { data: siteContent } = useSiteContent();
  const H = siteContent.header;
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
              {L(H.categoryMenu.label)}
              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-64 p-1.5">
              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {L(H.categoryMenu.title)}
              </DropdownMenuLabel>
              {H.categoryMenu.items.map((n) => {
                const Icon = getIcon(n.icon);
                return (
                  <DropdownMenuItem
                    key={n.id}
                    onSelect={() => navigate(n.href)}
                    className="group/item gap-3 px-2 py-2.5 rounded-md cursor-pointer text-sm font-medium text-foreground/80 focus:bg-primary/10 focus:text-foreground data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground transition-colors"
                  >
                    <span
                      className={`inline-flex items-center justify-center size-8 rounded-md border border-border bg-card text-muted-foreground transition-colors group-hover/item:border-primary/40 group-hover/item:text-primary group-focus/item:border-primary/40 group-focus/item:text-primary ${n.accent ? "border-primary/40 text-primary bg-primary/10" : ""}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1">{L(n.label)}</span>
                    <ArrowRight className="size-3.5 opacity-0 -translate-x-1 transition-all group-hover/item:opacity-100 group-hover/item:translate-x-0 group-focus/item:opacity-100 group-focus/item:translate-x-0 text-primary" />
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                onSelect={() => navigate(H.categoryMenu.browseHref)}
                className="justify-center px-2 py-2 rounded-md cursor-pointer text-xs font-semibold text-primary focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10"
              >
                {L(H.categoryMenu.browseLabel)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {H.primaryNav.map((n) => (
            <Link
              key={n.id}
              to={n.href}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              {L(n.label)}
            </Link>
          ))}
        </nav>

        {H.showSearch && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
            className="hidden md:flex flex-1 max-w-md mx-auto relative"
          >
            <button
              type="submit"
              aria-label="Rechercher"
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Search className="size-4" />
            </button>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L(H.searchPlaceholder) ?? ""}
              className="w-full bg-card border border-border rounded-lg ps-10 pe-4 h-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </form>
        )}

        <div className="flex items-center gap-0.5 md:gap-1 ms-auto lg:ms-0">
          <Link
            to={H.builderCta.href}
            className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-[var(--shadow-glow)] transition-all active:scale-95"
          >
            <Wrench className="size-4" />
            <span>{L(H.builderCta.label)}</span>
          </Link>
          <LanguageToggle />
          <ThemeToggle />
          <Link
            to={user ? "/favorites" : "/auth"}
            aria-label={t("header.wishlist")}
            className="relative hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <Heart className="size-5" />
            {user && favorites.size > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold inline-flex items-center justify-center">
                {favorites.size}
              </span>
            )}
          </Link>
          <Link
            to={user ? "/cart" : "/auth"}
            aria-label={t("header.cart")}
            className="relative hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <ShoppingCart className="size-5" />
            {user && cartCount > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold inline-flex items-center justify-center">
                {cartCount}
              </span>
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
                <DropdownMenuItem onSelect={() => navigate("/account")}>
                  <Settings className="size-4 me-2" />
                  {t("header.account_settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate("/admin")}
                  className="text-primary focus:text-primary"
                >
                  <Shield className="size-4 me-2" />
                  {t("header.admin_panel")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async () => {
                    await signOut();
                    navigate("/");
                  }}
                >
                  <LogOut className="size-4 me-2" />
                  {t("header.sign_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to={user ? "/account" : "/auth"}
              aria-label={t("header.account")}
              className="hidden md:inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
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
                <button
                  onClick={() => setOpen(false)}
                  aria-label={t("header.close")}
                  className="size-9 inline-flex items-center justify-center rounded-md hover:bg-card"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                  {L(H.categoryMenu.label)}
                </div>
                {H.categoryMenu.items.map((n) => {
                  const Icon = getIcon(n.icon);
                  return (
                    <Link
                      key={n.id}
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className="px-4 py-2.5 rounded-md text-foreground hover:bg-card text-sm inline-flex items-center gap-2"
                    >
                      <Icon className="size-4" />
                      {L(n.label)}
                    </Link>
                  );
                })}
                <div className="h-px bg-border my-2" />
                {H.primaryNav.map((n) => (
                  <Link
                    key={n.id}
                    to={n.href}
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 rounded-md text-foreground hover:bg-card text-base"
                  >
                    {L(n.label)}
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
