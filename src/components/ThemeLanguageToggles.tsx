import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const themeOptions: { value: Theme; icon: typeof Sun; key: "theme.light" | "theme.dark" | "theme.system" }[] = [
  { value: "light", icon: Sun, key: "theme.light" },
  { value: "dark", icon: Moon, key: "theme.dark" },
  { value: "system", icon: Monitor, key: "theme.system" },
];

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const { t } = useI18n();
  const Icon = resolved === "light" ? Sun : Moon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("header.theme")}
          className="inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <Icon className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>{t("header.theme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map((o) => {
          const active = theme === o.value;
          return (
            <DropdownMenuItem key={o.value} onClick={() => setTheme(o.value)} className="gap-2">
              <o.icon className="size-4" />
              <span className="flex-1">{t(o.key)}</span>
              {active && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const langOptions: { value: "fr" | "en" | "ar"; flag: string; key: "lang.fr" | "lang.en" | "lang.ar" }[] = [
  { value: "fr", flag: "🇫🇷", key: "lang.fr" },
  { value: "en", flag: "🇬🇧", key: "lang.en" },
  { value: "ar", flag: "🇩🇿", key: "lang.ar" },
];

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const current = langOptions.find((o) => o.value === lang) ?? langOptions[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("header.language")}
          className="inline-flex items-center justify-center size-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors text-base"
        >
          <span aria-hidden>{current.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel>{t("header.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {langOptions.map((o) => {
          const active = lang === o.value;
          return (
            <DropdownMenuItem key={o.value} onClick={() => setLang(o.value)} className="gap-2">
              <span aria-hidden className="text-base leading-none">{o.flag}</span>
              <span className="flex-1">{t(o.key)}</span>
              {active && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
