import { useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  RotateCcw,
  Save,
  AlertTriangle,
  Home,
  FileText,
  Globe,
  Smartphone,
} from "lucide-react";
import heroLaptopSrc from "@/assets/hero-laptop.webp";
import builderBannerSrc from "@/assets/builder-banner.webp";
import {
  useSiteContent,
  useSiteContentMutations,
  useCategoryList,
  useTickerMessageList,
  useTickerMessageMutations,
  useMarqueeBrandList,
  useMarqueeBrandMutations,
  invalidateAll,
  toApiError,
} from "@/data-provider";
import { isHttpMode } from "@/api";
import { reinitialiserServeur } from "@/data-provider/maintenance";
import { resetData, type TickerMessage } from "@/lib/admin-store";
import {
  MarqueeBrandsVisualEditor,
  TickerMessagesVisualEditor,
} from "@/components/admin/SettingsVisualEditors";

import type { SiteContent } from "@/lib/site-content";
import { ICON_NAMES, getIcon, type IconName } from "@/lib/site-content";
import type { Category } from "@/data/products";
import type { Localized } from "@/lib/i18n";
import { useI18n, type TVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePermissions, type PermissionsApi } from "@/lib/admin-auth";
import { MediaPickerField } from "@/components/admin/MediaPickerField";

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

// Type alias for the t function passed down to sub-components.
type TFn = (k: string, vars?: TVars) => string;

function toMap(v: Localized<string> | undefined): Record<LangCode, string> {
  if (v == null) return { fr: "", en: "", ar: "" };
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: v.fr ?? "", en: v.en ?? "", ar: v.ar ?? "" };
}

function LangTabs({ lang, onChange }: { lang: LangCode; onChange: (l: LangCode) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-semibold uppercase">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            "rounded-sm px-2 py-0.5 transition-colors",
            lang === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function LInput({
  value,
  onChange,
  placeholder,
  label,
  disabled,
}: {
  value: Localized<string> | undefined;
  onChange: (next: Localized<string>) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [lang, setLang] = useState<LangCode>("fr");
  const map = toMap(value);
  const isAr = lang === "ar";
  return (
    <div className="space-y-1.5" dir={isAr ? "rtl" : "ltr"}>
      {label && <Label className={cn(isAr && "block text-right")}>{label}</Label>}
      <LangTabs lang={lang} onChange={setLang} />
      <Input
        dir={isAr ? "rtl" : "ltr"}
        className={cn(isAr && "text-right")}
        value={map[lang]}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange({ ...map, [lang]: e.target.value })}
      />
    </div>
  );
}

function LTextarea({
  value,
  onChange,
  rows,
  label,
  disabled,
}: {
  value: Localized<string> | undefined;
  onChange: (next: Localized<string>) => void;
  rows?: number;
  label?: string;
  disabled?: boolean;
}) {
  const [lang, setLang] = useState<LangCode>("fr");
  const map = toMap(value);
  const isAr = lang === "ar";
  return (
    <div className="space-y-1.5" dir={isAr ? "rtl" : "ltr"}>
      {label && <Label className={cn(isAr && "block text-right")}>{label}</Label>}
      <LangTabs lang={lang} onChange={setLang} />
      <Textarea
        rows={rows}
        dir={isAr ? "rtl" : "ltr"}
        className={cn(isAr && "text-right")}
        value={map[lang]}
        disabled={disabled}
        onChange={(e) => onChange({ ...map, [lang]: e.target.value })}
      />
    </div>
  );
}

type PoleKey = "home" | "pages" | "global" | "mobile";

export default function AdminContent() {
  const { data: siteContent, loading, error } = useSiteContent();
  const { update, resetSection } = useSiteContentMutations();
  const perms = usePermissions();
  const { t } = useI18n();

  const { data: marqueeBrands } = useMarqueeBrandList();
  const { set: setMarquee } = useMarqueeBrandMutations();

  const { data: tickerMessages } = useTickerMessageList();
  const { set: setTickers } = useTickerMessageMutations();

  const [activePole, setActivePole] = useState<PoleKey>("home");
  const [subHome, setSubHome] = useState<keyof SiteContent>("hero");
  const [subPages, setSubPages] = useState<"about" | "contactCta">("about");
  const [subGlobal, setSubGlobal] = useState<"header" | "ticker" | "footer">("header");
  const [subMobile, setSubMobile] = useState<"floatingWhatsApp" | "mobileBottomBar">(
    "floatingWhatsApp",
  );

  const POLES: { key: PoleKey; label: string; icon: typeof Home }[] = [
    { key: "home", label: "Accueil", icon: Home },
    { key: "pages", label: "Pages & Textes", icon: FileText },
    { key: "global", label: "Global & Navigation", icon: Globe },
    { key: "mobile", label: "Mobile & Flottant", icon: Smartphone },
  ];

  const HOME_SECTIONS: { key: keyof SiteContent; labelKey: string }[] = [
    { key: "hero", labelKey: "admin.contenu.contenu.section_hero" },
    { key: "flashSale", labelKey: "admin.contenu.contenu.section_flash_sale" },
    { key: "categories", labelKey: "admin.contenu.contenu.section_categories" },
    { key: "useChips", labelKey: "admin.contenu.contenu.section_use_chips" },
    { key: "bestSellers", labelKey: "admin.contenu.contenu.section_best_sellers" },
    { key: "featuredTabs", labelKey: "admin.contenu.contenu.section_featured_tabs" },
    { key: "brandsMarquee", labelKey: "admin.contenu.contenu.section_brands_marquee" },
    { key: "whyUs", labelKey: "admin.contenu.contenu.section_why_us" },
    { key: "builderTeaser", labelKey: "admin.contenu.contenu.section_builder_teaser" },
    { key: "reviews", labelKey: "admin.contenu.contenu.section_reviews" },
    { key: "contactCta", labelKey: "admin.contenu.contenu.section_contact_cta" },
  ];

  const PAGES_SECTIONS: { key: "about" | "contactCta"; labelKey: string }[] = [
    { key: "about", labelKey: "admin.contenu.contenu.section_about" },
    { key: "contactCta", labelKey: "admin.contenu.contenu.section_contact_cta" },
  ];

  const GLOBAL_SECTIONS: { key: "header" | "ticker" | "footer"; label: string }[] = [
    { key: "header", label: t("admin.contenu.contenu.section_header") },
    { key: "ticker", label: "Bandeau d'annonces (Ticker)" },
    { key: "footer", label: t("admin.contenu.contenu.section_footer") },
  ];

  const MOBILE_SECTIONS: { key: "floatingWhatsApp" | "mobileBottomBar"; labelKey: string }[] = [
    { key: "floatingWhatsApp", labelKey: "admin.contenu.contenu.section_floating_wa" },
    { key: "mobileBottomBar", labelKey: "admin.contenu.contenu.section_mobile_bar" },
  ];

  return (
    <AdminPageShell
      title={t("admin.contenu.contenu.titre")}
      description={t("admin.contenu.contenu.description")}
    >
      {error && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <span className="sr-only">{t("admin.socle.commun.chargement")}</span>
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Navigation principale par Pôles thématiques */}
          <Tabs value={activePole} onValueChange={(p) => setActivePole(p as PoleKey)}>
            <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl border border-border">
              {POLES.map((pole) => {
                const Icon = pole.icon;
                return (
                  <TabsTrigger
                    key={pole.key}
                    value={pole.key}
                    className="flex items-center justify-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs md:text-sm rounded-lg transition-all"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{pole.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* 1. PÔLE ACCUEIL */}
          {activePole === "home" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5 rounded-lg border bg-card/60 p-2">
                {HOME_SECTIONS.map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    variant={subHome === s.key ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => setSubHome(s.key)}
                  >
                    {t(s.labelKey)}
                  </Button>
                ))}
              </div>

              {HOME_SECTIONS.map((s) =>
                subHome === s.key ? (
                  <SectionEditor
                    key={s.key}
                    sectionKey={s.key}
                    label={t(s.labelKey)}
                    value={siteContent[s.key]}
                    perms={perms}
                    t={t}
                    onSaveSection={update}
                    onResetSection={resetSection}
                    extraChild={
                      s.key === "brandsMarquee" ? (
                        <div className="mt-6 border-t pt-6">
                          <MarqueeBrandsVisualEditor
                            title={t("admin.reglages.parametres.json_marques_titre")}
                            description={t("admin.reglages.parametres.json_marques_description")}
                            value={marqueeBrands}
                            permission="manageSettings"
                            onSave={async (v: string[]) => {
                              await setMarquee(v);
                            }}
                            onReset={async () => {
                              if (isHttpMode()) {
                                await reinitialiserServeur("reset", "marqueeBrands");
                                invalidateAll();
                              }
                              resetData("marqueeBrands");
                              toast.success(t("admin.reglages.parametres.toast_reinitialise"));
                            }}
                            can={perms.can}
                            guard={perms.guard}
                            denyReason={perms.denyReason}
                            t={t}
                          />
                        </div>
                      ) : undefined
                    }
                  />
                ) : null,
              )}
            </div>
          )}

          {/* 2. PÔLE PAGES & TEXTES */}
          {activePole === "pages" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5 rounded-lg border bg-card/60 p-2">
                {PAGES_SECTIONS.map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    variant={subPages === s.key ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => setSubPages(s.key)}
                  >
                    {t(s.labelKey)}
                  </Button>
                ))}
              </div>

              {subPages === "about" && (
                <SectionEditor
                  sectionKey="about"
                  label={t("admin.contenu.contenu.section_about")}
                  value={siteContent.about}
                  perms={perms}
                  t={t}
                  onSaveSection={update}
                  onResetSection={resetSection}
                />
              )}

              {subPages === "contactCta" && (
                <SectionEditor
                  sectionKey="contactCta"
                  label={t("admin.contenu.contenu.section_contact_cta")}
                  value={siteContent.contactCta}
                  perms={perms}
                  t={t}
                  onSaveSection={update}
                  onResetSection={resetSection}
                />
              )}
            </div>
          )}

          {/* 3. PÔLE GLOBAL & NAVIGATION */}
          {activePole === "global" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5 rounded-lg border bg-card/60 p-2">
                {GLOBAL_SECTIONS.map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    variant={subGlobal === s.key ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => setSubGlobal(s.key)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>

              {subGlobal === "header" && (
                <SectionEditor
                  sectionKey="header"
                  label={t("admin.contenu.contenu.section_header")}
                  value={siteContent.header}
                  perms={perms}
                  t={t}
                  onSaveSection={update}
                  onResetSection={resetSection}
                />
              )}

              {subGlobal === "ticker" && (
                <TickerMessagesVisualEditor
                  title={t("admin.reglages.parametres.json_tickers_titre")}
                  description={t("admin.reglages.parametres.json_tickers_description")}
                  value={tickerMessages}
                  permission="manageCriticalSettings"
                  onSave={async (v: TickerMessage[]) => {
                    await setTickers(v);
                  }}
                  onReset={async () => {
                    if (isHttpMode()) {
                      await reinitialiserServeur("reset", "tickerMessages");
                      invalidateAll();
                    }
                    resetData("tickerMessages");
                    toast.success(t("admin.reglages.parametres.toast_reinitialise"));
                  }}
                  can={perms.can}
                  guard={perms.guard}
                  denyReason={perms.denyReason}
                  t={t}
                />
              )}

              {subGlobal === "footer" && (
                <SectionEditor
                  sectionKey="footer"
                  label={t("admin.contenu.contenu.section_footer")}
                  value={siteContent.footer}
                  perms={perms}
                  t={t}
                  onSaveSection={update}
                  onResetSection={resetSection}
                />
              )}
            </div>
          )}

          {/* 4. PÔLE MOBILE & FLOTTANT */}
          {activePole === "mobile" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5 rounded-lg border bg-card/60 p-2">
                {MOBILE_SECTIONS.map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    variant={subMobile === s.key ? "default" : "ghost"}
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => setSubMobile(s.key)}
                  >
                    {t(s.labelKey)}
                  </Button>
                ))}
              </div>

              {MOBILE_SECTIONS.map((s) =>
                subMobile === s.key ? (
                  <SectionEditor
                    key={s.key}
                    sectionKey={s.key}
                    label={t(s.labelKey)}
                    value={siteContent[s.key]}
                    perms={perms}
                    t={t}
                    onSaveSection={update}
                    onResetSection={resetSection}
                  />
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
    </AdminPageShell>
  );
}

function SectionEditor<K extends keyof SiteContent>({
  sectionKey,
  label,
  value,
  perms,
  t,
  onSaveSection,
  onResetSection,
  extraChild,
}: {
  sectionKey: K;
  label: string;
  value: SiteContent[K];
  perms: PermissionsApi;
  t: TFn;
  onSaveSection: (patch: Partial<SiteContent>) => Promise<void>;
  onResetSection: (section: K) => Promise<void>;
  extraChild?: React.ReactNode;
}) {
  const { can, guard, denyReason } = perms;
  const [draft, setDraft] = useState<SiteContent[K]>(value);
  const [saving, setSaving] = useState(false);

  // Re-sync when the parent value changes (e.g. after reset via the provider).
  const key = JSON.stringify(value);
  const [signature, setSignature] = useState(key);
  if (signature !== key) {
    setSignature(key);
    setDraft(value);
  }

  async function save() {
    // Niveau 2 — vérification dans l'action.
    if (!guard("update", t("admin.contenu.contenu.garde_enregistrer"))) return;
    setSaving(true);
    try {
      await onSaveSection({ [sectionKey]: draft });
      toast.success(t("admin.contenu.contenu.toast_enregistre"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    // Niveau 2 — la réinitialisation d'une section est une modification (update).
    if (!guard("update", t("admin.contenu.contenu.garde_reinitialiser"))) return;
    setSaving(true);
    try {
      await onResetSection(sectionKey);
      toast.success(t("admin.contenu.contenu.toast_reinitialise"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const readOnly = !can("update");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{label}</CardTitle>
        <div className="flex gap-2">
          {/* Niveau 1 + Niveau 3 — réinitialiser = update */}
          <span title={denyReason("update")} className="inline-flex">
            <Button size="sm" variant="ghost" disabled={readOnly || saving} onClick={reset}>
              <RotateCcw className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_reinitialiser")}
            </Button>
          </span>
          {/* Niveau 1 + Niveau 3 — enregistrer = update */}
          <span title={denyReason("update")} className="inline-flex">
            <Button size="sm" disabled={readOnly || saving} onClick={save}>
              <Save className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_enregistrer")}
            </Button>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderForm(sectionKey, draft, (v) => setDraft(v), readOnly, t)}
        {extraChild}
      </CardContent>
    </Card>
  );
}

function renderForm<K extends keyof SiteContent>(
  key: K,
  draft: SiteContent[K],
  onChange: (v: SiteContent[K]) => void,
  readOnly: boolean,
  t: TFn,
): React.ReactNode {
  switch (key) {
    case "header":
      return (
        <HeaderForm
          value={draft as SiteContent["header"]}
          onChange={onChange as (v: SiteContent["header"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "footer":
      return (
        <FooterForm
          value={draft as SiteContent["footer"]}
          onChange={onChange as (v: SiteContent["footer"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "about":
      return (
        <AboutForm
          value={draft as SiteContent["about"]}
          onChange={onChange as (v: SiteContent["about"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "hero":
      return (
        <HeroForm
          value={draft as SiteContent["hero"]}
          onChange={onChange as (v: SiteContent["hero"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "flashSale":
      return (
        <FlashSaleForm
          value={draft as SiteContent["flashSale"]}
          onChange={onChange as (v: SiteContent["flashSale"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "categories":
      return (
        <CategoriesForm
          value={draft as SiteContent["categories"]}
          onChange={onChange as (v: SiteContent["categories"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "useChips":
      return (
        <SimpleTitleForm
          value={draft as { title: Localized<string> }}
          onChange={onChange as (v: { title: Localized<string> }) => void}
          titleLabel={t("admin.contenu.contenu.champ_titre")}
          readOnly={readOnly}
        />
      );
    case "bestSellers":
      return (
        <TitleSubForm
          value={draft as { title: Localized<string>; subtitle: Localized<string> }}
          onChange={
            onChange as (v: { title: Localized<string>; subtitle: Localized<string> }) => void
          }
          readOnly={readOnly}
          t={t}
        />
      );
    case "featuredTabs":
      return (
        <FeaturedTabsForm
          value={draft as SiteContent["featuredTabs"]}
          onChange={onChange as (v: SiteContent["featuredTabs"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "brandsMarquee":
      return (
        <SimpleTitleForm
          value={draft as { title: Localized<string> }}
          onChange={onChange as (v: { title: Localized<string> }) => void}
          titleLabel={t("admin.contenu.contenu.champ_kicker")}
          readOnly={readOnly}
        />
      );
    case "whyUs":
      return (
        <WhyUsForm
          value={draft as SiteContent["whyUs"]}
          onChange={onChange as (v: SiteContent["whyUs"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "builderTeaser":
      return (
        <BuilderTeaserForm
          value={draft as SiteContent["builderTeaser"]}
          onChange={onChange as (v: SiteContent["builderTeaser"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "reviews":
      return (
        <TitleSubForm
          value={draft as { title: Localized<string>; subtitle: Localized<string> }}
          onChange={
            onChange as (v: { title: Localized<string>; subtitle: Localized<string> }) => void
          }
          readOnly={readOnly}
          t={t}
        />
      );
    case "contactCta":
      return (
        <ContactCtaForm
          value={draft as SiteContent["contactCta"]}
          onChange={onChange as (v: SiteContent["contactCta"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "floatingWhatsApp":
      return (
        <FloatingWaForm
          value={draft as SiteContent["floatingWhatsApp"]}
          onChange={onChange as (v: SiteContent["floatingWhatsApp"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    case "mobileBottomBar":
      return (
        <MobileBarForm
          value={draft as SiteContent["mobileBottomBar"]}
          onChange={onChange as (v: SiteContent["mobileBottomBar"]) => void}
          readOnly={readOnly}
          t={t}
        />
      );
    default:
      return null;
  }
}

// ---- Small reusable inputs ----
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: IconName;
  onChange: (n: IconName) => void;
  disabled?: boolean;
}) {
  const Current = getIcon(value);
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card">
        <Current className="size-4" />
      </div>
      <Select value={value} onValueChange={(v) => onChange(v as IconName)} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {ICON_NAMES.map((n) => (
            <SelectItem key={n} value={n}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---- Forms ----
function SimpleTitleForm({
  value,
  onChange,
  titleLabel,
  readOnly,
}: {
  value: { title: Localized<string> };
  onChange: (v: { title: Localized<string> }) => void;
  titleLabel: string;
  readOnly: boolean;
}) {
  return (
    <Field label={titleLabel}>
      <LInput
        value={value.title}
        onChange={(next) => onChange({ ...value, title: next })}
        disabled={readOnly}
      />
    </Field>
  );
}
function TitleSubForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: { title: Localized<string>; subtitle: Localized<string> };
  onChange: (v: { title: Localized<string>; subtitle: Localized<string> }) => void;
  readOnly: boolean;
  t: TFn;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label={t("admin.contenu.contenu.champ_titre")}
        value={value.title}
        onChange={(next) => onChange({ ...value, title: next })}
        disabled={readOnly}
      />
      <LInput
        label={t("admin.contenu.contenu.champ_sous_titre")}
        value={value.subtitle}
        onChange={(next) => onChange({ ...value, subtitle: next })}
        disabled={readOnly}
      />
    </div>
  );
}

function AboutForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["about"];
  onChange: (v: SiteContent["about"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  const values = Array.isArray(v.values) ? v.values : [];

  return (
    <div className="space-y-6">
      {/* 1. En-tête de la page */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">
          {t("admin.contenu.contenu.section_header")} & {t("admin.contenu.contenu.champ_titre")}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <LInput
            label={t("admin.contenu.contenu.about_kicker")}
            value={v.kicker}
            onChange={(next) => onChange({ ...v, kicker: next })}
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.about_titre")}
            value={v.title}
            onChange={(next) => onChange({ ...v, title: next })}
            disabled={readOnly}
          />
          <div className="md:col-span-2">
            <LTextarea
              label={t("admin.contenu.contenu.about_intro")}
              rows={3}
              value={v.intro}
              onChange={(next) => onChange({ ...v, intro: next })}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* 2. Notre Histoire & Notre Mission */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-base border-b pb-2">
            {t("admin.contenu.contenu.about_histoire_section")}
          </h3>
          <LInput
            label={t("admin.contenu.contenu.about_histoire_titre")}
            value={v.historyTitle}
            onChange={(next) => onChange({ ...v, historyTitle: next })}
            disabled={readOnly}
          />
          <LTextarea
            label={t("admin.contenu.contenu.about_histoire_corps")}
            rows={5}
            value={v.historyBody}
            onChange={(next) => onChange({ ...v, historyBody: next })}
            disabled={readOnly}
          />
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-base border-b pb-2">
            {t("admin.contenu.contenu.about_mission_section")}
          </h3>
          <LInput
            label={t("admin.contenu.contenu.about_mission_titre")}
            value={v.missionTitle}
            onChange={(next) => onChange({ ...v, missionTitle: next })}
            disabled={readOnly}
          />
          <LTextarea
            label={t("admin.contenu.contenu.about_mission_corps")}
            rows={5}
            value={v.missionBody}
            onChange={(next) => onChange({ ...v, missionBody: next })}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* 3. Cartes de valeurs et engagements */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="font-semibold text-base">
              {t("admin.contenu.contenu.about_valeurs_section")}
            </h3>
            <p className="text-xs text-muted-foreground">
              Les cartes affichées sous l'histoire et la mission de la page À propos.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              onChange({
                ...v,
                values: [
                  ...values,
                  {
                    id: `val_${Date.now()}`,
                    icon: "shield",
                    title: { fr: "", en: "", ar: "" },
                    description: { fr: "", en: "", ar: "" },
                  },
                ],
              })
            }
          >
            <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.about_ajouter_valeur")}
          </Button>
        </div>

        <div className="space-y-3">
          {values.map((it, i) => (
            <div
              key={it.id}
              className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-[140px_1fr_2fr_auto] bg-card"
            >
              <Field label={t("admin.contenu.contenu.champ_icone")}>
                <Select
                  value={it.icon}
                  disabled={readOnly}
                  onValueChange={(
                    val: "shield" | "truck" | "headphones" | "award" | "star" | "heart",
                  ) => {
                    const next = values.slice();
                    next[i] = { ...it, icon: val };
                    onChange({ ...v, values: next });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shield">🛡️ Shield</SelectItem>
                    <SelectItem value="truck">🚚 Truck</SelectItem>
                    <SelectItem value="headphones">🎧 Support</SelectItem>
                    <SelectItem value="award">🏆 Award</SelectItem>
                    <SelectItem value="star">⭐ Star</SelectItem>
                    <SelectItem value="heart">❤️ Heart</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <LInput
                label={t("admin.contenu.contenu.champ_titre")}
                value={it.title}
                disabled={readOnly}
                onChange={(next) => {
                  const nextVals = values.slice();
                  nextVals[i] = { ...it, title: next };
                  onChange({ ...v, values: nextVals });
                }}
              />
              <LInput
                label={t("admin.contenu.contenu.champ_description")}
                value={it.description}
                disabled={readOnly}
                onChange={(next) => {
                  const nextVals = values.slice();
                  nextVals[i] = { ...it, description: next };
                  onChange({ ...v, values: nextVals });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={readOnly}
                aria-label={t("admin.contenu.contenu.aria_supprimer")}
                onClick={() => {
                  const nextVals = values.filter((_, idx) => idx !== i);
                  onChange({ ...v, values: nextVals });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Appel à l'action final (CTA) */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">
          {t("admin.contenu.contenu.about_cta_section")}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <LInput
            label={t("admin.contenu.contenu.about_cta_titre")}
            value={v.ctaTitle}
            onChange={(next) => onChange({ ...v, ctaTitle: next })}
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.about_cta_soustitre")}
            value={v.ctaSubtitle}
            onChange={(next) => onChange({ ...v, ctaSubtitle: next })}
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.about_cta_bouton_parcourir")}
            value={v.ctaBrowseLabel}
            onChange={(next) => onChange({ ...v, ctaBrowseLabel: next })}
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.about_cta_bouton_contact")}
            value={v.ctaContactLabel}
            onChange={(next) => onChange({ ...v, ctaContactLabel: next })}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

function HeroForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["hero"];
  onChange: (v: SiteContent["hero"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label={t("admin.contenu.contenu.champ_badge")}
        value={v.badge}
        onChange={(next) => onChange({ ...v, badge: next })}
        disabled={readOnly}
      />
      <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
        <div>
          <p className="text-sm font-medium">{t("admin.contenu.contenu.hero_afficher_image")}</p>
        </div>
        <Switch
          checked={v.showImage}
          disabled={readOnly}
          onCheckedChange={(c) => onChange({ ...v, showImage: c })}
        />
      </div>
      {v.showImage && (
        <div className="md:col-span-2">
          <MediaPickerField
            label="Image personnalisée du Hero (optionnelle)"
            description="Si vide, l'image officielle par défaut est affichée."
            value={v.imageSrc ?? ""}
            defaultPreviewSrc={heroLaptopSrc}
            disabled={readOnly}
            onChange={(url) => onChange({ ...v, imageSrc: url })}
          />
        </div>
      )}
      <LInput
        label={t("admin.contenu.contenu.champ_titre_ligne1")}
        value={v.title1}
        onChange={(next) => onChange({ ...v, title1: next })}
        disabled={readOnly}
      />
      <LInput
        label={t("admin.contenu.contenu.champ_titre_ligne2")}
        value={v.title2}
        onChange={(next) => onChange({ ...v, title2: next })}
        disabled={readOnly}
      />
      <div className="md:col-span-2">
        <LTextarea
          label={t("admin.contenu.contenu.champ_sous_titre")}
          rows={2}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
      </div>
      <LInput
        label={t("admin.contenu.contenu.hero_cta_principal_label")}
        value={v.primaryCta.label}
        onChange={(next) => onChange({ ...v, primaryCta: { ...v.primaryCta, label: next } })}
        disabled={readOnly}
      />
      <Field label={t("admin.contenu.contenu.hero_cta_principal_lien")}>
        <Input
          value={v.primaryCta.href}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...v, primaryCta: { ...v.primaryCta, href: e.target.value } })
          }
        />
      </Field>
      <LInput
        label={t("admin.contenu.contenu.hero_cta_secondaire_label")}
        value={v.secondaryCta.label}
        onChange={(next) => onChange({ ...v, secondaryCta: { ...v.secondaryCta, label: next } })}
        disabled={readOnly}
      />
      <Field label={t("admin.contenu.contenu.hero_cta_secondaire_lien")}>
        <Input
          value={v.secondaryCta.href}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...v, secondaryCta: { ...v.secondaryCta, href: e.target.value } })
          }
        />
      </Field>
      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center justify-between">
          <Label>{t("admin.contenu.contenu.hero_kpis")}</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              onChange({
                ...v,
                kpis: [...v.kpis, { id: `kpi_${Date.now()}`, icon: "star", value: "", label: "" }],
              })
            }
          >
            <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
          </Button>
        </div>
        {v.kpis.map((k, i) => (
          <div
            key={k.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_1fr_auto]"
          >
            <Field label={t("admin.contenu.contenu.champ_icone")}>
              <IconPicker
                value={k.icon}
                disabled={readOnly}
                onChange={(n) => {
                  const kpis = v.kpis.slice();
                  kpis[i] = { ...k, icon: n };
                  onChange({ ...v, kpis });
                }}
              />
            </Field>
            <LInput
              label={t("admin.contenu.contenu.champ_valeur")}
              value={k.value}
              disabled={readOnly}
              onChange={(next) => {
                const kpis = v.kpis.slice();
                kpis[i] = { ...k, value: next };
                onChange({ ...v, kpis });
              }}
            />
            <LInput
              label={t("admin.contenu.contenu.champ_libelle")}
              value={k.label}
              disabled={readOnly}
              onChange={(next) => {
                const kpis = v.kpis.slice();
                kpis[i] = { ...k, label: next };
                onChange({ ...v, kpis });
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={readOnly}
              onClick={() => onChange({ ...v, kpis: v.kpis.filter((_, j) => j !== i) })}
              aria-label={t("admin.contenu.contenu.aria_supprimer")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlashSaleForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["flashSale"];
  onChange: (v: SiteContent["flashSale"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label={t("admin.contenu.contenu.champ_badge")}
        value={v.badge}
        onChange={(next) => onChange({ ...v, badge: next })}
        disabled={readOnly}
      />
      <LInput
        label={t("admin.contenu.contenu.champ_titre")}
        value={v.title}
        onChange={(next) => onChange({ ...v, title: next })}
        disabled={readOnly}
      />
      <LInput
        label={t("admin.contenu.contenu.flash_voir_tout_label")}
        value={v.viewAllLabel}
        onChange={(next) => onChange({ ...v, viewAllLabel: next })}
        disabled={readOnly}
      />
      <Field label={t("admin.contenu.contenu.flash_voir_tout_lien")}>
        <Input
          value={v.viewAllHref}
          disabled={readOnly}
          onChange={(e) => onChange({ ...v, viewAllHref: e.target.value })}
        />
      </Field>
      <Field label={t("admin.contenu.contenu.flash_countdown")}>
        <Input
          type="number"
          min={1}
          value={v.countdownHours}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...v, countdownHours: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </Field>
    </div>
  );
}

function CategoriesForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["categories"];
  onChange: (v: SiteContent["categories"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label={t("admin.contenu.contenu.champ_titre")}
          value={v.title}
          onChange={(next) => onChange({ ...v, title: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.champ_sous_titre")}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.categories_parcourir")}
          value={v.browseLabel}
          onChange={(next) => onChange({ ...v, browseLabel: next })}
          disabled={readOnly}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("admin.contenu.contenu.categories_note")}
      </p>
    </>
  );
}

function FeaturedTabsForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["featuredTabs"];
  onChange: (v: SiteContent["featuredTabs"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  const { data: categoryList } = useCategoryList();
  const availableCats =
    categoryList && categoryList.length > 0
      ? categoryList.map((c) => ({ slug: c.slug, label: c.label }))
      : [];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label={t("admin.contenu.contenu.champ_titre")}
          value={v.title}
          onChange={(next) => onChange({ ...v, title: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.champ_sous_titre")}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>{t("admin.contenu.contenu.featured_onglets")}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly || availableCats.length === 0}
          onClick={() =>
            onChange({
              ...v,
              tabs: [
                ...v.tabs,
                {
                  id: `t_${Date.now()}`,
                  categorySlug: (availableCats[0]?.slug ?? "") as Category,
                  label: "Nouveau",
                },
              ],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
        </Button>
      </div>
      {v.tabs.map((tb, i) => (
        <div
          key={tb.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <Field label={t("admin.contenu.contenu.champ_categorie")}>
            <Select
              value={tb.categorySlug}
              disabled={readOnly}
              onValueChange={(x) => {
                const tabs = v.tabs.slice();
                tabs[i] = { ...tb, categorySlug: x as Category };
                onChange({ ...v, tabs });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCats.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label} ({c.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <LInput
            label={t("admin.contenu.contenu.champ_libelle")}
            value={tb.label}
            disabled={readOnly}
            onChange={(next) => {
              const tabs = v.tabs.slice();
              tabs[i] = { ...tb, label: next };
              onChange({ ...v, tabs });
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={readOnly}
            onClick={() => onChange({ ...v, tabs: v.tabs.filter((_, j) => j !== i) })}
            aria-label={t("admin.contenu.contenu.aria_supprimer")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function WhyUsForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["whyUs"];
  onChange: (v: SiteContent["whyUs"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label={t("admin.contenu.contenu.champ_kicker")}
          value={v.kicker}
          onChange={(next) => onChange({ ...v, kicker: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.champ_sous_titre")}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.champ_titre_ligne1")}
          value={v.title1}
          onChange={(next) => onChange({ ...v, title1: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.champ_titre_ligne2")}
          value={v.title2}
          onChange={(next) => onChange({ ...v, title2: next })}
          disabled={readOnly}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>{t("admin.contenu.contenu.why_us_arguments")}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly}
          onClick={() =>
            onChange({
              ...v,
              items: [
                ...v.items,
                { id: `w_${Date.now()}`, icon: "shield", title: "", description: "" },
              ],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div
          key={it.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_2fr_auto]"
        >
          <Field label={t("admin.contenu.contenu.champ_icone")}>
            <IconPicker
              value={it.icon}
              disabled={readOnly}
              onChange={(n) => {
                const items = v.items.slice();
                items[i] = { ...it, icon: n };
                onChange({ ...v, items });
              }}
            />
          </Field>
          <LInput
            label={t("admin.contenu.contenu.champ_titre")}
            value={it.title}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, title: next };
              onChange({ ...v, items });
            }}
          />
          <LInput
            label={t("admin.contenu.contenu.champ_description")}
            value={it.description}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, description: next };
              onChange({ ...v, items });
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={readOnly}
            onClick={() => onChange({ ...v, items: v.items.filter((_, j) => j !== i) })}
            aria-label={t("admin.contenu.contenu.aria_supprimer")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function BuilderTeaserForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["builderTeaser"];
  onChange: (v: SiteContent["builderTeaser"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label={t("admin.contenu.contenu.champ_badge")}
          value={v.badge}
          onChange={(next) => onChange({ ...v, badge: next })}
          disabled={readOnly}
        />
        <LInput
          label={t("admin.contenu.contenu.champ_titre")}
          value={v.title}
          onChange={(next) => onChange({ ...v, title: next })}
          disabled={readOnly}
        />
        <div className="md:col-span-2">
          <LTextarea
            label={t("admin.contenu.contenu.champ_sous_titre")}
            rows={2}
            value={v.subtitle}
            onChange={(next) => onChange({ ...v, subtitle: next })}
            disabled={readOnly}
          />
        </div>
        <LInput
          label={t("admin.contenu.contenu.builder_cta_label")}
          value={v.cta.label}
          onChange={(next) => onChange({ ...v, cta: { ...v.cta, label: next } })}
          disabled={readOnly}
        />
        <Field label={t("admin.contenu.contenu.builder_cta_lien")}>
          <Input
            value={v.cta.href}
            disabled={readOnly}
            onChange={(e) => onChange({ ...v, cta: { ...v.cta, href: e.target.value } })}
          />
        </Field>
        <div className="md:col-span-2">
          <MediaPickerField
            label="Bannière visuelle du configurateur (optionnelle)"
            description="Si vide, la bannière officielle par défaut est affichée."
            value={v.bannerSrc ?? ""}
            defaultPreviewSrc={builderBannerSrc}
            disabled={readOnly}
            onChange={(url) => onChange({ ...v, bannerSrc: url })}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>{t("admin.contenu.contenu.builder_cartes")}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly}
          onClick={() =>
            onChange({
              ...v,
              items: [...v.items, { id: `bt_${Date.now()}`, icon: "cpu", title: "", subtitle: "" }],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div
          key={it.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_1fr_auto]"
        >
          <Field label={t("admin.contenu.contenu.champ_icone")}>
            <IconPicker
              value={it.icon}
              disabled={readOnly}
              onChange={(n) => {
                const items = v.items.slice();
                items[i] = { ...it, icon: n };
                onChange({ ...v, items });
              }}
            />
          </Field>
          <LInput
            label={t("admin.contenu.contenu.champ_titre")}
            value={it.title}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, title: next };
              onChange({ ...v, items });
            }}
          />
          <LInput
            label={t("admin.contenu.contenu.champ_sous_titre")}
            value={it.subtitle}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, subtitle: next };
              onChange({ ...v, items });
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={readOnly}
            onClick={() => onChange({ ...v, items: v.items.filter((_, j) => j !== i) })}
            aria-label={t("admin.contenu.contenu.aria_supprimer")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ContactCtaForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["contactCta"];
  onChange: (v: SiteContent["contactCta"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label={t("admin.contenu.contenu.champ_titre")}
        value={v.title}
        onChange={(next) => onChange({ ...v, title: next })}
        disabled={readOnly}
      />
      <LInput
        label={t("admin.contenu.contenu.contact_wa_label")}
        value={v.whatsappLabel}
        onChange={(next) => onChange({ ...v, whatsappLabel: next })}
        disabled={readOnly}
      />
      <div className="md:col-span-2">
        <LTextarea
          label={t("admin.contenu.contenu.champ_sous_titre")}
          rows={2}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
      </div>
      <p className="text-xs text-muted-foreground md:col-span-2">
        {t("admin.contenu.contenu.contact_wa_note")}
      </p>
    </div>
  );
}

function FloatingWaForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["floatingWhatsApp"];
  onChange: (v: SiteContent["floatingWhatsApp"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">{t("admin.contenu.contenu.wa_afficher")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.contenu.contenu.wa_note")}</p>
        </div>
        <Switch
          checked={v.enabled}
          disabled={readOnly}
          onCheckedChange={(c) => onChange({ ...v, enabled: c })}
        />
      </div>
      <LInput
        label={t("admin.contenu.contenu.wa_aria_label")}
        value={v.ariaLabel}
        onChange={(next) => onChange({ ...v, ariaLabel: next })}
        disabled={readOnly}
      />
    </div>
  );
}

function MobileBarForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["mobileBottomBar"];
  onChange: (v: SiteContent["mobileBottomBar"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("admin.contenu.contenu.mobile_items")}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly || v.items.length >= 5}
          onClick={() =>
            onChange({
              ...v,
              items: [
                ...v.items,
                { id: `mb_${Date.now()}`, icon: "home", label: "Nouveau", href: "/" },
              ],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div
          key={it.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[140px_1fr_1fr_auto_auto_auto]"
        >
          <Field label={t("admin.contenu.contenu.champ_icone")}>
            <IconPicker
              value={it.icon}
              disabled={readOnly}
              onChange={(n) => {
                const items = v.items.slice();
                items[i] = { ...it, icon: n };
                onChange({ ...v, items });
              }}
            />
          </Field>
          <LInput
            label={t("admin.contenu.contenu.champ_libelle")}
            value={it.label}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, label: next };
              onChange({ ...v, items });
            }}
          />
          <Field label={t("admin.contenu.contenu.champ_lien")}>
            <Input
              value={it.href}
              disabled={readOnly}
              onChange={(e) => {
                const items = v.items.slice();
                items[i] = { ...it, href: e.target.value };
                onChange({ ...v, items });
              }}
            />
          </Field>
          <div className="flex flex-col items-center gap-1">
            <Label className="text-xs">{t("admin.contenu.contenu.mobile_primaire")}</Label>
            <Switch
              checked={!!it.primary}
              disabled={readOnly}
              onCheckedChange={(c) => {
                const items = v.items.slice();
                items[i] = { ...it, primary: c };
                onChange({ ...v, items });
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Label className="text-xs">{t("admin.contenu.contenu.mobile_auth")}</Label>
            <Switch
              checked={!!it.requiresAuth}
              disabled={readOnly}
              onCheckedChange={(c) => {
                const items = v.items.slice();
                items[i] = { ...it, requiresAuth: c };
                onChange({ ...v, items });
              }}
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={readOnly}
            onClick={() => onChange({ ...v, items: v.items.filter((_, j) => j !== i) })}
            aria-label={t("admin.contenu.contenu.aria_supprimer")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---- Header form ----
function HeaderForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["header"];
  onChange: (v: SiteContent["header"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label={t("admin.contenu.contenu.header_recherche_placeholder")}
          value={v.searchPlaceholder}
          onChange={(next) => onChange({ ...v, searchPlaceholder: next })}
          disabled={readOnly}
        />
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">
              {t("admin.contenu.contenu.header_afficher_recherche")}
            </p>
          </div>
          <Switch
            checked={v.showSearch}
            disabled={readOnly}
            onCheckedChange={(c) => onChange({ ...v, showSearch: c })}
          />
        </div>
        <LInput
          label={t("admin.contenu.contenu.header_btn_principal_label")}
          value={v.builderCta.label}
          onChange={(next) => onChange({ ...v, builderCta: { ...v.builderCta, label: next } })}
          disabled={readOnly}
        />
        <Field label={t("admin.contenu.contenu.header_btn_principal_lien")}>
          <Input
            value={v.builderCta.href}
            disabled={readOnly}
            onChange={(e) =>
              onChange({ ...v, builderCta: { ...v.builderCta, href: e.target.value } })
            }
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-semibold">{t("admin.contenu.contenu.header_menu_categories")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <LInput
            label={t("admin.contenu.contenu.header_menu_label")}
            value={v.categoryMenu.label}
            onChange={(next) =>
              onChange({ ...v, categoryMenu: { ...v.categoryMenu, label: next } })
            }
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.header_menu_titre")}
            value={v.categoryMenu.title}
            onChange={(next) =>
              onChange({ ...v, categoryMenu: { ...v.categoryMenu, title: next } })
            }
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.header_menu_voir_toutes_label")}
            value={v.categoryMenu.browseLabel}
            onChange={(next) =>
              onChange({ ...v, categoryMenu: { ...v.categoryMenu, browseLabel: next } })
            }
            disabled={readOnly}
          />
          <Field label={t("admin.contenu.contenu.header_menu_voir_toutes_lien")}>
            <Input
              value={v.categoryMenu.browseHref}
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  ...v,
                  categoryMenu: { ...v.categoryMenu, browseHref: e.target.value },
                })
              }
            />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <Label>{t("admin.contenu.contenu.header_entrees_menu")}</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              onChange({
                ...v,
                categoryMenu: {
                  ...v.categoryMenu,
                  items: [
                    ...v.categoryMenu.items,
                    { id: `hc_${Date.now()}`, label: "Nouveau", href: "/", icon: "tag" },
                  ],
                },
              })
            }
          >
            <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
          </Button>
        </div>
        {v.categoryMenu.items.map((it, i) => (
          <div
            key={it.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[140px_1fr_1fr_auto_auto]"
          >
            <Field label={t("admin.contenu.contenu.champ_icone")}>
              <IconPicker
                value={(it.icon ?? "tag") as IconName}
                disabled={readOnly}
                onChange={(n) => {
                  const items = v.categoryMenu.items.slice();
                  items[i] = { ...it, icon: n };
                  onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } });
                }}
              />
            </Field>
            <LInput
              label={t("admin.contenu.contenu.champ_libelle")}
              value={it.label}
              disabled={readOnly}
              onChange={(next) => {
                const items = v.categoryMenu.items.slice();
                items[i] = { ...it, label: next };
                onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } });
              }}
            />
            <Field label={t("admin.contenu.contenu.champ_lien")}>
              <Input
                value={it.href}
                disabled={readOnly}
                onChange={(e) => {
                  const items = v.categoryMenu.items.slice();
                  items[i] = { ...it, href: e.target.value };
                  onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } });
                }}
              />
            </Field>
            <div className="flex flex-col items-center gap-1">
              <Label className="text-xs">{t("admin.contenu.contenu.header_accent")}</Label>
              <Switch
                checked={!!it.accent}
                disabled={readOnly}
                onCheckedChange={(c) => {
                  const items = v.categoryMenu.items.slice();
                  items[i] = { ...it, accent: c };
                  onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } });
                }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={readOnly}
              onClick={() =>
                onChange({
                  ...v,
                  categoryMenu: {
                    ...v.categoryMenu,
                    items: v.categoryMenu.items.filter((_, j) => j !== i),
                  },
                })
              }
              aria-label={t("admin.contenu.contenu.aria_supprimer")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            {t("admin.contenu.contenu.header_nav_principaux")}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              onChange({
                ...v,
                primaryNav: [
                  ...v.primaryNav,
                  { id: `hn_${Date.now()}`, label: "Nouveau", href: "/" },
                ],
              })
            }
          >
            <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
          </Button>
        </div>
        {v.primaryNav.map((n, i) => (
          <div
            key={n.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <LInput
              label={t("admin.contenu.contenu.champ_libelle")}
              value={n.label}
              disabled={readOnly}
              onChange={(next) => {
                const arr = v.primaryNav.slice();
                arr[i] = { ...n, label: next };
                onChange({ ...v, primaryNav: arr });
              }}
            />
            <Field label={t("admin.contenu.contenu.champ_lien")}>
              <Input
                value={n.href}
                disabled={readOnly}
                onChange={(e) => {
                  const arr = v.primaryNav.slice();
                  arr[i] = { ...n, href: e.target.value };
                  onChange({ ...v, primaryNav: arr });
                }}
              />
            </Field>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={readOnly}
              onClick={() => onChange({ ...v, primaryNav: v.primaryNav.filter((_, j) => j !== i) })}
              aria-label={t("admin.contenu.contenu.aria_supprimer")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Footer form ----
function FooterForm({
  value,
  onChange,
  readOnly,
  t,
}: {
  value: SiteContent["footer"];
  onChange: (v: SiteContent["footer"]) => void;
  readOnly: boolean;
  t: TFn;
}) {
  const v = value;
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <LTextarea
          label={t("admin.contenu.contenu.footer_baseline")}
          rows={2}
          value={v.tagline}
          onChange={(next) => onChange({ ...v, tagline: next })}
          disabled={readOnly}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <LInput
            label={t("admin.contenu.contenu.footer_copyright")}
            value={v.copyright}
            onChange={(next) => onChange({ ...v, copyright: next })}
            disabled={readOnly}
          />
          <LInput
            label={t("admin.contenu.contenu.footer_made_in")}
            value={v.madeIn}
            onChange={(next) => onChange({ ...v, madeIn: next })}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("admin.contenu.contenu.footer_reseaux")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              onChange({
                ...v,
                socials: [
                  ...v.socials,
                  { id: `s_${Date.now()}`, icon: "facebook", label: "Nouveau", href: "#" },
                ],
              })
            }
          >
            <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter")}
          </Button>
        </div>
        {v.socials.map((s, i) => (
          <div
            key={s.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_1fr_auto]"
          >
            <Field label={t("admin.contenu.contenu.champ_icone")}>
              <IconPicker
                value={s.icon}
                disabled={readOnly}
                onChange={(n) => {
                  const arr = v.socials.slice();
                  arr[i] = { ...s, icon: n };
                  onChange({ ...v, socials: arr });
                }}
              />
            </Field>
            <LInput
              label={t("admin.contenu.contenu.footer_libelle_a11y")}
              value={s.label}
              disabled={readOnly}
              onChange={(next) => {
                const arr = v.socials.slice();
                arr[i] = { ...s, label: next };
                onChange({ ...v, socials: arr });
              }}
            />
            <Field label={t("admin.contenu.contenu.champ_lien")}>
              <Input
                value={s.href}
                disabled={readOnly}
                onChange={(e) => {
                  const arr = v.socials.slice();
                  arr[i] = { ...s, href: e.target.value };
                  onChange({ ...v, socials: arr });
                }}
              />
            </Field>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={readOnly}
              onClick={() => onChange({ ...v, socials: v.socials.filter((_, j) => j !== i) })}
              aria-label={t("admin.contenu.contenu.aria_supprimer")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("admin.contenu.contenu.footer_colonnes")}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              onChange({
                ...v,
                columns: [
                  ...v.columns,
                  { id: `fc_${Date.now()}`, title: "Nouvelle colonne", links: [] },
                ],
              })
            }
          >
            <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.footer_ajouter_colonne")}
          </Button>
        </div>
        {v.columns.map((col, ci) => (
          <div key={col.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <LInput
                  label={t("admin.contenu.contenu.footer_titre_colonne")}
                  value={col.title}
                  disabled={readOnly}
                  onChange={(next) => {
                    const arr = v.columns.slice();
                    arr[ci] = { ...col, title: next };
                    onChange({ ...v, columns: arr });
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() => {
                  const arr = v.columns.slice();
                  arr[ci] = {
                    ...col,
                    links: [...col.links, { id: `fl_${Date.now()}`, label: "Nouveau", href: "/" }],
                  };
                  onChange({ ...v, columns: arr });
                }}
              >
                <Plus className="me-2 h-4 w-4" /> {t("admin.contenu.contenu.btn_ajouter_lien")}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={readOnly}
                onClick={() => onChange({ ...v, columns: v.columns.filter((_, j) => j !== ci) })}
                aria-label={t("admin.contenu.contenu.aria_supprimer_colonne")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {col.links.map((l, li) => (
              <div
                key={l.id}
                className="grid items-end gap-2 rounded-md border p-2 md:grid-cols-[1fr_1fr_auto]"
              >
                <LInput
                  label={t("admin.contenu.contenu.champ_libelle")}
                  value={l.label}
                  disabled={readOnly}
                  onChange={(next) => {
                    const arr = v.columns.slice();
                    const links = col.links.slice();
                    links[li] = { ...l, label: next };
                    arr[ci] = { ...col, links };
                    onChange({ ...v, columns: arr });
                  }}
                />
                <Field label={t("admin.contenu.contenu.champ_lien")}>
                  <Input
                    value={l.href}
                    disabled={readOnly}
                    onChange={(e) => {
                      const arr = v.columns.slice();
                      const links = col.links.slice();
                      links[li] = { ...l, href: e.target.value };
                      arr[ci] = { ...col, links };
                      onChange({ ...v, columns: arr });
                    }}
                  />
                </Field>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={readOnly}
                  onClick={() => {
                    const arr = v.columns.slice();
                    arr[ci] = { ...col, links: col.links.filter((_, j) => j !== li) };
                    onChange({ ...v, columns: arr });
                  }}
                  aria-label={t("admin.contenu.contenu.aria_supprimer")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
