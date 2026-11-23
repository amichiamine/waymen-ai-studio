import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getInitialSiteSettings } from "@/data-provider/site-settings";

export type Theme = "light" | "dark" | "system";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" };
const ThemeContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "ka-theme";

function getFallbackTheme(): Theme {
  if (typeof window !== "undefined") {
    try {
      const settings = getInitialSiteSettings();
      if (settings.defaultTheme) return settings.defaultTheme;
    } catch {
      // repli silencieux
    }
  }
  return "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  return isDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored) return stored;
      return getFallbackTheme();
    }
    return "light";
  });
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const fallback = getFallbackTheme();
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? fallback;
    setThemeState(stored);
    setResolved(applyTheme(stored) as "light" | "dark");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? getFallbackTheme();
      if (cur === "system") setResolved(applyTheme("system") as "light" | "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    setResolved(applyTheme(t) as "light" | "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
