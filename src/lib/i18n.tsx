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

/**
 * Clés déjà signalées comme manquantes, pour ne journaliser qu'une fois chacune.
 * Le repli reste silencieux en production : seul le développement voit le bruit.
 */
const reportedMissingKeys = new Set<string>();

function reportMissingKey(lang: Lang, key: string): void {
  if (!import.meta.env.DEV) return;
  const marker = `${lang}:${key}`;
  if (reportedMissingKeys.has(marker)) return;
  reportedMissingKeys.add(marker);
  console.warn(`[i18n] clé « ${key} » absente du dictionnaire « ${lang} » — repli appliqué.`);
}

// ─────────────────────────── Espaces de noms paresseux ───────────────────────
//
// INTENTION (à lire avant de toucher à ce bloc)
//
// Un « espace de noms » est un dictionnaire secondaire identifié par le premier
// segment de ses clés (`admin.…`), téléchargé seulement quand une partie de
// l'application le réclame — et pour les TROIS langues, `fr` comprise.
//
// Pourquoi : le back-office représente ~800 chaînes. Les verser dans
// `i18n/fr.ts` — importé STATIQUEMENT parce que c'est la langue par défaut —
// les enverrait à *chaque visiteur* de la boutique, alors que la phase 0 s'est
// battue pour ramener le premier chargement à 179 ko gzip. Un espace de noms
// séparé les garde hors du bundle d'entrée : elles n'arrivent qu'à l'entrée
// dans `/admin`, en même temps que le chunk du cadre admin.
//
// Contrat vis-à-vis des pages : `t("admin.…")` reste la SEULE API. Aucune page
// n'importe un dictionnaire, ne connaît un loader ni n'attend une promesse ;
// seule la coquille (`AdminShell`) demande l'espace de noms et attend qu'il
// soit prêt, exactement comme le provider attend le dictionnaire de la langue
// initiale (voir `dictionaryReady` ci-dessus).

export type Namespace = "admin";

/**
 * Un `import()` par langue et par espace de noms : trois chunks distincts, dont
 * un seul sera téléchargé pour un administrateur donné.
 */
const namespaceLoaders: Record<Namespace, Record<Lang, () => Promise<{ default: Dictionary }>>> = {
  admin: {
    fr: () => import("./i18n/admin/fr"),
    en: () => import("./i18n/admin/en"),
    ar: () => import("./i18n/admin/ar"),
  },
};

const NAMESPACE_NAMES: readonly string[] = Object.keys(namespaceLoaders);

/** `admin.socle.produits.titre` → `"admin"` ; `nav.home` → `null`. */
function namespaceOf(key: string): Namespace | null {
  const dot = key.indexOf(".");
  if (dot < 0) return null;
  const head = key.slice(0, dot);
  return NAMESPACE_NAMES.includes(head) ? (head as Namespace) : null;
}

/** Cache module, clé `espace:langue` : un chunk n'est évalué qu'une seule fois. */
const namespaceCache = new Map<string, Dictionary>();

async function loadNamespace(ns: Namespace, lang: Lang): Promise<Dictionary> {
  const cacheKey = `${ns}:${lang}`;
  const cached = namespaceCache.get(cacheKey);
  if (cached) return cached;
  const mod = await namespaceLoaders[ns][lang]();
  namespaceCache.set(cacheKey, mod.default);
  return mod.default;
}

// ─────────────────────────── Nombres et pluriels ─────────────────────────────

/**
 * Locale de formatage des nombres. L'Algérie écrit ses chiffres en caractères
 * latins, y compris en arabe : `ar-DZ` respecte cet usage (pas de chiffres
 * arabes-indiens, que les administrateurs ne lisent pas dans un tableau de bord).
 */
const NUMBER_LOCALE: Record<Lang, string> = { fr: "fr-DZ", en: "en-DZ", ar: "ar-DZ" };

/** Variables d'interpolation : `t("…", { n: 3, nom: "X" })` remplit `{n}` et `{nom}`. */
export type TVars = Record<string, string | number>;

/**
 * Deux formes plurielles seulement, suffixes `_un` et `_autre`.
 *
 * Choix assumé : l'arabe possède six formes grammaticales, mais un back-office
 * n'affiche que des compteurs. La règle ci-dessous couvre le français (0 et 1
 * au singulier : « 0 produit ») et l'anglais/arabe (1 au singulier). Pour
 * l'arabe, les valeurs `_autre` doivent être formulées de façon à rester
 * correctes de 2 à l'infini (« {n} منتج » plutôt qu'un accord sur 3–10) : voir
 * la convention en tête de `src/lib/i18n/admin/index.ts`.
 */
function pluralSuffix(lang: Lang, n: number): "_un" | "_autre" {
  const abs = Math.abs(n);
  if (lang === "fr") return abs < 2 ? "_un" : "_autre";
  return abs === 1 ? "_un" : "_autre";
}

/**
 * Remplace `{nom}` par sa valeur. Un nombre est formaté selon la locale ;
 * une variable absente laisse son marqueur visible — un « {n} » à l'écran se
 * corrige, une phrase amputée passe inaperçue.
 */
function interpolate(template: string, vars: TVars, lang: Lang): string {
  return template.replace(/\{(\w+)\}/g, (whole: string, name: string): string => {
    const value = vars[name];
    if (value === undefined) return whole;
    return typeof value === "number"
      ? new Intl.NumberFormat(NUMBER_LOCALE[lang]).format(value)
      : value;
  });
}

export type TKey = string;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /**
   * Traduit `k`. `vars` est optionnel et rétrocompatible : sans lui, le
   * comportement est identique à l'origine (les 304 appels du site public ne
   * changent pas d'un caractère). Avec `vars.n`, la variante `_un` / `_autre`
   * est cherchée avant la clé nue.
   */
  t: (k: TKey, vars?: TVars) => string;
  dir: Dir;
  /** Déclenche le chargement d'un espace de noms (idempotent). */
  requestNamespace: (ns: Namespace) => void;
  /** Espaces de noms dont le dictionnaire est disponible. */
  readyNamespaces: readonly Namespace[];
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
  /**
   * Vrai dès que le dictionnaire de la langue **initiale** est disponible.
   * Choix assumé : tant qu'il est faux (langue persistée `en` ou `ar` au premier
   * rendu), on ne rend pas les enfants — un écran vide d'une fraction de seconde
   * vaut mieux qu'un flash de français aussitôt remplacé. Ce drapeau ne
   * redevient jamais faux : lors d'un changement de langue en cours de session,
   * l'ancien dictionnaire reste affiché jusqu'à l'arrivée du nouveau, ce qui
   * évite de vider l'écran sous les yeux de l'utilisateur.
   */
  const [dictionaryReady, setDictionaryReady] = useState<boolean>(
    () => dictionaryCache[lang] !== undefined,
  );
  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  /**
   * Espaces de noms réclamés par l'application (jamais retirés : quitter puis
   * revenir dans le back-office ne doit pas re-télécharger le dictionnaire).
   */
  const [requestedNamespaces, setRequestedNamespaces] = useState<readonly Namespace[]>([]);
  /** Dictionnaire courant de chaque espace de noms, pour la langue active. */
  const [namespaceDicts, setNamespaceDicts] = useState<Partial<Record<Namespace, Dictionary>>>({});
  /**
   * Comme `dictionaryReady`, ce drapeau ne redevient jamais faux : lors d'un
   * changement de langue en cours de session, l'ancien dictionnaire d'espace de
   * noms reste affiché jusqu'à l'arrivée du nouveau, plutôt que de vider un
   * écran d'administration sous les yeux de l'utilisateur.
   */
  const [readyNamespaces, setReadyNamespaces] = useState<readonly Namespace[]>([]);

  const requestNamespace = useCallback((ns: Namespace) => {
    setRequestedNamespaces((prev) => (prev.includes(ns) ? prev : [...prev, ns]));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    const cached = dictionaryCache[lang];
    if (cached) {
      setDict(cached);
      setDictionaryReady(true);
      return;
    }
    let cancelled = false;
    loadDictionary(lang)
      .then((loaded) => {
        if (cancelled) return;
        setDict(loaded);
        setDictionaryReady(true);
      })
      .catch((err: unknown) => {
        // Dégradation gracieuse : un échec réseau sur le chunk de langue laisse
        // l'application utilisable en français plutôt que de la casser.
        console.warn(`[i18n] chargement du dictionnaire « ${lang} » impossible :`, err);
        if (cancelled) return;
        setDict(fr);
        setDictionaryReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Chargement (et rechargement à chaque changement de langue) des espaces de
  // noms réclamés. Un seul chunk par espace et par langue est demandé : pas de
  // pré-chargement du français en repli, car `scripts/verifier-i18n.ts` garantit
  // en CI que les trois dictionnaires portent exactement les mêmes clés.
  useEffect(() => {
    if (requestedNamespaces.length === 0) return;
    let cancelled = false;
    const markReady = (ns: Namespace) =>
      setReadyNamespaces((prev) => (prev.includes(ns) ? prev : [...prev, ns]));

    for (const ns of requestedNamespaces) {
      loadNamespace(ns, lang)
        .then((loaded) => {
          if (cancelled) return;
          setNamespaceDicts((prev) => ({ ...prev, [ns]: loaded }));
          markReady(ns);
        })
        .catch(async (err: unknown) => {
          // Dégradation gracieuse, même esprit que pour les dictionnaires de
          // langue : un échec réseau ne doit pas laisser le back-office bloqué
          // sur son écran d'attente. On tente le français, puis on débloque
          // l'affichage dans tous les cas — `t` retombera sur la clé, visible
          // et donc corrigible, plutôt que sur un écran vide définitif.
          console.warn(`[i18n] chargement de l'espace de noms « ${ns}/${lang} » impossible :`, err);
          if (lang !== "fr") {
            try {
              const secours = await loadNamespace(ns, "fr");
              if (cancelled) return;
              setNamespaceDicts((prev) => ({ ...prev, [ns]: secours }));
            } catch (err2: unknown) {
              console.warn(`[i18n] repli « ${ns}/fr » impossible :`, err2);
            }
          }
          if (cancelled) return;
          markReady(ns);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [requestedNamespaces, lang]);

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
      requestNamespace,
      readyNamespaces,
      // `t` retourne toujours une chaîne : dictionnaire actif, puis espace de
      // noms chargé, puis repli fr, puis la clé elle-même. Jamais `undefined`,
      // même pendant le chargement.
      //
      // L'ordre compte : le dictionnaire principal est consulté AVANT l'espace
      // de noms, ce qui préserve à l'identique les clés `admin.restricted.*`
      // déjà présentes côté visiteur (garde d'accès de `App.tsx`).
      t: (k, vars) => {
        const chercher = (cle: string): string | undefined => {
          const direct = dict[cle];
          if (direct !== undefined) return direct;
          const ns = namespaceOf(cle);
          return ns ? namespaceDicts[ns]?.[cle] : undefined;
        };

        let value: string | undefined;
        const n = vars?.n;
        if (typeof n === "number") value = chercher(k + pluralSuffix(lang, n));
        if (value === undefined) value = chercher(k);
        if (value === undefined) {
          reportMissingKey(lang, k);
          value = fr[k] ?? k;
        }
        return vars ? interpolate(value, vars, lang) : value;
      },
    };
  }, [lang, dir, dict, namespaceDicts, requestNamespace, readyNamespaces]);

  return (
    <I18nContext.Provider value={value}>{dictionaryReady ? children : null}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/**
 * Réclame un espace de noms et dit s'il est prêt.
 *
 * À n'appeler que depuis une *coquille* (une seule fois par zone de
 * l'application, cf. `AdminShell`), jamais depuis une page : les pages ne
 * connaissent que `t()`. Tant que `ready` est faux, la coquille doit afficher
 * un état d'attente — jamais son contenu, sous peine d'exposer des clés brutes.
 */
export function useNamespace(ns: Namespace): { ready: boolean } {
  const { requestNamespace, readyNamespaces } = useI18n();
  useEffect(() => {
    requestNamespace(ns);
  }, [requestNamespace, ns]);
  return { ready: readyNamespaces.includes(ns) };
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
