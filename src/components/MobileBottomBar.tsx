import { Link } from "react-router-dom";
import { Home, Grid3x3, Wrench, ShoppingCart, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export function MobileBottomBar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { cartCount } = useStore();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation mobile"
    >
      <ul className="grid grid-cols-5 h-16">
        <Item to="/" Icon={Home} label={t("nav.home")} />
        <Item to="/category" Icon={Grid3x3} label={t("nav.category")} />
        <li className="flex items-center justify-center">
          <Link
            to="/builder"
            className="-mt-6 inline-flex flex-col items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] active:scale-95 transition-transform"
            aria-label={t("nav.builder")}
          >
            <Wrench className="size-6" />
          </Link>
        </li>
        <Item
          to={user ? "/cart" : "/auth"}
          Icon={ShoppingCart}
          label={t("header.cart")}
          badge={user && cartCount > 0 ? cartCount : undefined}
        />
        <Item to={user ? "/account" : "/auth"} Icon={User} label={t("header.account")} />
      </ul>
    </nav>
  );
}

function Item({ to, Icon, label, badge }: { to: string; Icon: typeof Home; label: string; badge?: number }) {
  return (
    <li>
      <Link
        to={to}
        className="relative flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="relative">
          <Icon className="size-5" />
          {badge !== undefined && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold inline-flex items-center justify-center">
              {badge}
            </span>
          )}
        </span>
        <span className="leading-none truncate max-w-[60px]">{label}</span>
      </Link>
    </li>
  );
}
