import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useSiteContent } from "@/data-provider";
import { getIcon, type IconName } from "@/lib/site-content";
import { useLocalize } from "@/lib/i18n";

export function MobileBottomBar() {
  const { user } = useAuth();
  const { cartCount } = useStore();
  // loading inerte en mode mock. En http, data est le repli (contenu vide)
  // jusqu'au premier aller-retour — la barre reste montée mais sans items.
  const { data: siteContent } = useSiteContent();
  const L = useLocalize();
  const items = siteContent.mobileBottomBar.items;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation mobile"
    >
      <ul
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}
      >
        {items.map((it) => {
          const to = it.requiresAuth && !user ? "/auth" : it.href;
          const badge = it.href === "/cart" && user && cartCount > 0 ? cartCount : undefined;
          const label = L(it.label) ?? "";
          if (it.primary) {
            const Icon = getIcon(it.icon);
            return (
              <li key={it.id} className="flex items-center justify-center">
                <Link
                  to={to}
                  aria-label={label}
                  className="-mt-6 inline-flex flex-col items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] active:scale-95 transition-transform"
                >
                  <Icon className="size-6" />
                </Link>
              </li>
            );
          }
          return <Item key={it.id} to={to} icon={it.icon} label={label} badge={badge} />;
        })}
      </ul>
    </nav>
  );
}

function Item({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  const Icon = getIcon(icon);
  return (
    <li>
      <Link
        to={to}
        className="relative flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="relative">
          <Icon className="size-5" />
          {badge !== undefined && (
            <span className="absolute -top-1.5 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold inline-flex items-center justify-center">
              {badge}
            </span>
          )}
        </span>
        <span className="leading-none truncate max-w-[60px]">{label}</span>
      </Link>
    </li>
  );
}
