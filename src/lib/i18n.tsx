import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import fr from "./i18n/fr";

export type Lang = "fr" | "en" | "ar";
export type Dir = "ltr" | "rtl";

const STORAGE_KEY = "ka-tech.lang";

export type Dictionary = Record<string, string>;

/**
 * `fr` est importé statiquement : c'est la langue par défaut, elle doit être
 * disponible dès le premier rendu et elle sert de repli pour toute clé absente
 * d'un autre dictionnaire. `en` et `ar` sont chargés à la demande par `import()`
 * afin qu'un visiteur francophone ne télécharge jamais leur contenu.
 */
const dictionaryLoaders: Record<Exclude<Lang, "fr">, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./i18n/en"),
  ar: () => import("./i18n/ar"),
};

/** Cache module : un dictionnaire n'est téléchargé et évalué qu'une seule fois. */
const dictionaryCache: Partial<Record<Lang, Dictionary>> = { fr };

async function loadDictionary(lang: Lang): Promise<Dictionary> {
  const cached = dictionaryCache[lang];
  if (cached) return cached;
  const loader = dictionaryLoaders[lang as Exclude<Lang, "fr">];
  const mod = await loader();
  dictionaryCache[lang] = mod.default;
  return mod.default;
}

export type TKey = string;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
  dir: Dir;
};

const I18nContext = createContext<Ctx | null>(null);

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en" || stored === "ar") return stored;
  const nav = window.navigator.language?.slice(0, 2).toLowerCase();
  if (nav === "en") return "en";
  if (nav === "ar") return "ar";
  return "fr";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readInitialLang());
  const [dict, setDict] = useState<Dictionary>(() => dictionaryCache[lang] ?? fr);
  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    const cached = dictionaryCache[lang];
    if (cached) {
      setDict(cached);
      return;
    }
    let cancelled = false;
    loadDictionary(lang)
      .then((loaded) => {
        if (!cancelled) setDict(loaded);
      })
      .catch((err: unknown) => {
        // Dégradation gracieuse : un échec réseau sur le chunk de langue laisse
        // l'application utilisable en français plutôt que de la casser.
        console.warn(`[i18n] chargement du dictionnaire « ${lang} » impossible :`, err);
        if (!cancelled) setDict(fr);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    return {
      lang,
      dir,
      setLang: (l) => {
        setLangState(l);
        try {
          window.localStorage.setItem(STORAGE_KEY, l);
        } catch (err) {
          // localStorage peut être indisponible (navigation privée, quota dépassé) — on continue sans persister.
          console.warn("[i18n] impossible de persister la langue :", err);
        }
      },
      t: (k) => dict[k] ?? fr[k] ?? k,
    };
  }, [lang, dir, dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** A translatable value: either a plain string (treated as FR) or a per-lang object. */
export type Localized<T = string> = T | { fr: T; en?: T; ar?: T };

/** Resolve a Localized value against a given language, with FR fallback. */
export function localize<T>(value: Localized<T> | undefined, lang: Lang): T | undefined {
  if (value === undefined || value === null) return value as T | undefined;
  if (typeof value === "object" && value !== null && "fr" in (value as object)) {
    const obj = value as { fr: T; en?: T; ar?: T };
    return (obj[lang] ?? obj.fr) as T;
  }
  return value as T;
}

/**
 * Hook returning a stable `L(v)` helper that reads any Localized<string> (or plain string)
 * in the currently selected language, with automatic FR fallback.
 * Also returns the current language for edge cases (number formatting, etc.).
 */
export function useLocalize() {
  const { lang } = useI18n();
  const L = useCallback(
    <T,>(v: Localized<T> | undefined): T | undefined => localize<T>(v, lang),
    [lang],
  );
  return L;
}
