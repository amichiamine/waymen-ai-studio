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
import { Plus, Trash2, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { useSiteContent, useSiteContentMutations, toApiError } from "@/data-provider";
// resetSiteContentSection : pas encore exposé par le provider — migration douce §4.
import { resetSiteContentSection } from "@/lib/admin-store";
import type { SiteContent } from "@/lib/site-content";
import { ICON_NAMES, getIcon, type IconName } from "@/lib/site-content";
import type { Category } from "@/data/products";
import type { Localized } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { usePermissions, type PermissionsApi } from "@/lib/admin-auth";

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

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

const SECTIONS: { key: keyof SiteContent; label: string }[] = [
  { key: "header", label: "En-tête" },
  { key: "footer", label: "Pied de page" },
  { key: "hero", label: "Hero" },
  { key: "flashSale", label: "Ventes flash" },
  { key: "categories", label: "Catégories" },
  { key: "useChips", label: "Par usage" },
  { key: "bestSellers", label: "Meilleures ventes" },
  { key: "featuredTabs", label: "Sélection à onglets" },
  { key: "brandsMarquee", label: "Marques" },
  { key: "whyUs", label: "Pourquoi nous" },
  { key: "builderTeaser", label: "Builder teaser" },
  { key: "reviews", label: "Avis (titres)" },
  { key: "contactCta", label: "Contact CTA" },
  { key: "floatingWhatsApp", label: "WhatsApp flottant" },
  { key: "mobileBottomBar", label: "Barre mobile" },
];

export default function AdminContent() {
  const { data: siteContent, loading, error } = useSiteContent();
  const { update } = useSiteContentMutations();
  const perms = usePermissions();
  const [tab, setTab] = useState<keyof SiteContent>("header");

  return (
    <AdminPageShell
      title="Contenu du site"
      description="Chaque bloc de la page d'accueil est éditable ici."
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
          <span className="sr-only">Chargement…</span>
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as keyof SiteContent)}>
          <TabsList className="h-auto flex-wrap">
            {SECTIONS.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SECTIONS.map((s) => (
            <TabsContent key={s.key} value={s.key} className="mt-4">
              <SectionEditor
                sectionKey={s.key}
                label={s.label}
                value={siteContent[s.key]}
                perms={perms}
                onSaveSection={update}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </AdminPageShell>
  );
}

function SectionEditor<K extends keyof SiteContent>({
  sectionKey,
  label,
  value,
  perms,
  onSaveSection,
}: {
  sectionKey: K;
  label: string;
  value: SiteContent[K];
  perms: PermissionsApi;
  onSaveSection: (patch: Partial<SiteContent>) => Promise<void>;
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
    if (!guard("update", "Enregistrer la section")) return;
    setSaving(true);
    try {
      await onSaveSection({ [sectionKey]: draft });
      toast.success("Contenu enregistré");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    // Niveau 2 — la réinitialisation d'une section est une modification (update).
    if (!guard("update", "Réinitialiser la section")) return;
    setSaving(true);
    try {
      // resetSiteContentSection : pas encore exposé par le provider — migration douce §4.
      resetSiteContentSection(sectionKey);
      toast.success("Section réinitialisée");
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
              <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
            </Button>
          </span>
          {/* Niveau 1 + Niveau 3 — enregistrer = update */}
          <span title={denyReason("update")} className="inline-flex">
            <Button size="sm" disabled={readOnly || saving} onClick={save}>
              <Save className="me-2 h-4 w-4" /> Enregistrer
            </Button>
          </span>
        </div>
      </CardHeader>
      <CardContent>{renderForm(sectionKey, draft, (v) => setDraft(v), readOnly)}</CardContent>
    </Card>
  );
}

function renderForm<K extends keyof SiteContent>(
  key: K,
  draft: SiteContent[K],
  onChange: (v: SiteContent[K]) => void,
  readOnly: boolean,
): React.ReactNode {
  switch (key) {
    case "header":
      return (
        <HeaderForm
          value={draft as SiteContent["header"]}
          onChange={onChange as (v: SiteContent["header"]) => void}
          readOnly={readOnly}
        />
      );
    case "footer":
      return (
        <FooterForm
          value={draft as SiteContent["footer"]}
          onChange={onChange as (v: SiteContent["footer"]) => void}
          readOnly={readOnly}
        />
      );
    case "hero":
      return (
        <HeroForm
          value={draft as SiteContent["hero"]}
          onChange={onChange as (v: SiteContent["hero"]) => void}
          readOnly={readOnly}
        />
      );
    case "flashSale":
      return (
        <FlashSaleForm
          value={draft as SiteContent["flashSale"]}
          onChange={onChange as (v: SiteContent["flashSale"]) => void}
          readOnly={readOnly}
        />
      );
    case "categories":
      return (
        <CategoriesForm
          value={draft as SiteContent["categories"]}
          onChange={onChange as (v: SiteContent["categories"]) => void}
          readOnly={readOnly}
        />
      );
    case "useChips":
      return (
        <SimpleTitleForm
          value={draft as { title: Localized<string> }}
          onChange={onChange as (v: { title: Localized<string> }) => void}
          titleLabel="Titre de la section"
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
        />
      );
    case "featuredTabs":
      return (
        <FeaturedTabsForm
          value={draft as SiteContent["featuredTabs"]}
          onChange={onChange as (v: SiteContent["featuredTabs"]) => void}
          readOnly={readOnly}
        />
      );
    case "brandsMarquee":
      return (
        <SimpleTitleForm
          value={draft as { title: Localized<string> }}
          onChange={onChange as (v: { title: Localized<string> }) => void}
          titleLabel="Kicker au-dessus du défilement"
          readOnly={readOnly}
        />
      );
    case "whyUs":
      return (
        <WhyUsForm
          value={draft as SiteContent["whyUs"]}
          onChange={onChange as (v: SiteContent["whyUs"]) => void}
          readOnly={readOnly}
        />
      );
    case "builderTeaser":
      return (
        <BuilderTeaserForm
          value={draft as SiteContent["builderTeaser"]}
          onChange={onChange as (v: SiteContent["builderTeaser"]) => void}
          readOnly={readOnly}
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
        />
      );
    case "contactCta":
      return (
        <ContactCtaForm
          value={draft as SiteContent["contactCta"]}
          onChange={onChange as (v: SiteContent["contactCta"]) => void}
          readOnly={readOnly}
        />
      );
    case "floatingWhatsApp":
      return (
        <FloatingWaForm
          value={draft as SiteContent["floatingWhatsApp"]}
          onChange={onChange as (v: SiteContent["floatingWhatsApp"]) => void}
          readOnly={readOnly}
        />
      );
    case "mobileBottomBar":
      return (
        <MobileBarForm
          value={draft as SiteContent["mobileBottomBar"]}
          onChange={onChange as (v: SiteContent["mobileBottomBar"]) => void}
          readOnly={readOnly}
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
}: {
  value: { title: Localized<string>; subtitle: Localized<string> };
  onChange: (v: { title: Localized<string>; subtitle: Localized<string> }) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label="Titre"
        value={value.title}
        onChange={(next) => onChange({ ...value, title: next })}
        disabled={readOnly}
      />
      <LInput
        label="Sous-titre"
        value={value.subtitle}
        onChange={(next) => onChange({ ...value, subtitle: next })}
        disabled={readOnly}
      />
    </div>
  );
}

function HeroForm({
  value,
  onChange,
  readOnly,
}: {
  value: SiteContent["hero"];
  onChange: (v: SiteContent["hero"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label="Badge"
        value={v.badge}
        onChange={(next) => onChange({ ...v, badge: next })}
        disabled={readOnly}
      />
      <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
        <div>
          <p className="text-sm font-medium">Afficher l'image du hero</p>
        </div>
        <Switch
          checked={v.showImage}
          disabled={readOnly}
          onCheckedChange={(c) => onChange({ ...v, showImage: c })}
        />
      </div>
      <LInput
        label="Titre ligne 1"
        value={v.title1}
        onChange={(next) => onChange({ ...v, title1: next })}
        disabled={readOnly}
      />
      <LInput
        label="Titre ligne 2 (accent)"
        value={v.title2}
        onChange={(next) => onChange({ ...v, title2: next })}
        disabled={readOnly}
      />
      <div className="md:col-span-2">
        <LTextarea
          label="Sous-titre"
          rows={2}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
      </div>
      <LInput
        label="CTA principal — libellé"
        value={v.primaryCta.label}
        onChange={(next) => onChange({ ...v, primaryCta: { ...v.primaryCta, label: next } })}
        disabled={readOnly}
      />
      <Field label="CTA principal — lien">
        <Input
          value={v.primaryCta.href}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...v, primaryCta: { ...v.primaryCta, href: e.target.value } })
          }
        />
      </Field>
      <LInput
        label="CTA secondaire — libellé"
        value={v.secondaryCta.label}
        onChange={(next) => onChange({ ...v, secondaryCta: { ...v.secondaryCta, label: next } })}
        disabled={readOnly}
      />
      <Field label="CTA secondaire — lien">
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
          <Label>Indicateurs (KPI)</Label>
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
            <Plus className="me-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.kpis.map((k, i) => (
          <div
            key={k.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_1fr_auto]"
          >
            <Field label="Icône">
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
              label="Valeur"
              value={k.value}
              disabled={readOnly}
              onChange={(next) => {
                const kpis = v.kpis.slice();
                kpis[i] = { ...k, value: next };
                onChange({ ...v, kpis });
              }}
            />
            <LInput
              label="Libellé"
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
              aria-label="Supprimer"
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
}: {
  value: SiteContent["flashSale"];
  onChange: (v: SiteContent["flashSale"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label="Badge"
        value={v.badge}
        onChange={(next) => onChange({ ...v, badge: next })}
        disabled={readOnly}
      />
      <LInput
        label="Titre"
        value={v.title}
        onChange={(next) => onChange({ ...v, title: next })}
        disabled={readOnly}
      />
      <LInput
        label="Libellé « voir tout »"
        value={v.viewAllLabel}
        onChange={(next) => onChange({ ...v, viewAllLabel: next })}
        disabled={readOnly}
      />
      <Field label="Lien « voir tout »">
        <Input
          value={v.viewAllHref}
          disabled={readOnly}
          onChange={(e) => onChange({ ...v, viewAllHref: e.target.value })}
        />
      </Field>
      <Field label="Durée du compte à rebours (heures)">
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
}: {
  value: SiteContent["categories"];
  onChange: (v: SiteContent["categories"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label="Titre"
          value={v.title}
          onChange={(next) => onChange({ ...v, title: next })}
          disabled={readOnly}
        />
        <LInput
          label="Sous-titre"
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
        <LInput
          label="Libellé « parcourir »"
          value={v.browseLabel}
          onChange={(next) => onChange({ ...v, browseLabel: next })}
          disabled={readOnly}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Les libellés et images des 4 cartes se gèrent depuis <strong>Catégories</strong>.
      </p>
    </>
  );
}

function FeaturedTabsForm({
  value,
  onChange,
  readOnly,
}: {
  value: SiteContent["featuredTabs"];
  onChange: (v: SiteContent["featuredTabs"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  const cats: Category[] = ["laptops", "desktops", "builds", "phones"];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label="Titre"
          value={v.title}
          onChange={(next) => onChange({ ...v, title: next })}
          disabled={readOnly}
        />
        <LInput
          label="Sous-titre"
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Onglets</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly}
          onClick={() =>
            onChange({
              ...v,
              tabs: [
                ...v.tabs,
                { id: `t_${Date.now()}`, categorySlug: "laptops", label: "Nouveau" },
              ],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.tabs.map((tb, i) => (
        <div
          key={tb.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <Field label="Catégorie">
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
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <LInput
            label="Libellé"
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
            aria-label="Supprimer"
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
}: {
  value: SiteContent["whyUs"];
  onChange: (v: SiteContent["whyUs"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label="Kicker"
          value={v.kicker}
          onChange={(next) => onChange({ ...v, kicker: next })}
          disabled={readOnly}
        />
        <LInput
          label="Sous-titre"
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
        <LInput
          label="Titre ligne 1"
          value={v.title1}
          onChange={(next) => onChange({ ...v, title1: next })}
          disabled={readOnly}
        />
        <LInput
          label="Titre ligne 2"
          value={v.title2}
          onChange={(next) => onChange({ ...v, title2: next })}
          disabled={readOnly}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Arguments</Label>
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
          <Plus className="me-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div
          key={it.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_2fr_auto]"
        >
          <Field label="Icône">
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
            label="Titre"
            value={it.title}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, title: next };
              onChange({ ...v, items });
            }}
          />
          <LInput
            label="Description"
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
            aria-label="Supprimer"
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
}: {
  value: SiteContent["builderTeaser"];
  onChange: (v: SiteContent["builderTeaser"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label="Badge"
          value={v.badge}
          onChange={(next) => onChange({ ...v, badge: next })}
          disabled={readOnly}
        />
        <LInput
          label="Titre"
          value={v.title}
          onChange={(next) => onChange({ ...v, title: next })}
          disabled={readOnly}
        />
        <div className="md:col-span-2">
          <LTextarea
            label="Sous-titre"
            rows={2}
            value={v.subtitle}
            onChange={(next) => onChange({ ...v, subtitle: next })}
            disabled={readOnly}
          />
        </div>
        <LInput
          label="CTA — libellé"
          value={v.cta.label}
          onChange={(next) => onChange({ ...v, cta: { ...v.cta, label: next } })}
          disabled={readOnly}
        />
        <Field label="CTA — lien">
          <Input
            value={v.cta.href}
            disabled={readOnly}
            onChange={(e) => onChange({ ...v, cta: { ...v.cta, href: e.target.value } })}
          />
        </Field>
      </div>
      <div className="flex items-center justify-between">
        <Label>Cartes de composants</Label>
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
          <Plus className="me-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div
          key={it.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_1fr_auto]"
        >
          <Field label="Icône">
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
            label="Titre"
            value={it.title}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, title: next };
              onChange({ ...v, items });
            }}
          />
          <LInput
            label="Sous-titre"
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
            aria-label="Supprimer"
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
}: {
  value: SiteContent["contactCta"];
  onChange: (v: SiteContent["contactCta"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LInput
        label="Titre"
        value={v.title}
        onChange={(next) => onChange({ ...v, title: next })}
        disabled={readOnly}
      />
      <LInput
        label="Libellé WhatsApp"
        value={v.whatsappLabel}
        onChange={(next) => onChange({ ...v, whatsappLabel: next })}
        disabled={readOnly}
      />
      <div className="md:col-span-2">
        <LTextarea
          label="Sous-titre"
          rows={2}
          value={v.subtitle}
          onChange={(next) => onChange({ ...v, subtitle: next })}
          disabled={readOnly}
        />
      </div>
      <p className="text-xs text-muted-foreground md:col-span-2">
        Le numéro WhatsApp est configuré dans <strong>Paramètres</strong>.
      </p>
    </div>
  );
}

function FloatingWaForm({
  value,
  onChange,
  readOnly,
}: {
  value: SiteContent["floatingWhatsApp"];
  onChange: (v: SiteContent["floatingWhatsApp"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Afficher le bouton WhatsApp flottant</p>
          <p className="text-xs text-muted-foreground">
            Visible seulement si un numéro est configuré dans Paramètres.
          </p>
        </div>
        <Switch
          checked={v.enabled}
          disabled={readOnly}
          onCheckedChange={(c) => onChange({ ...v, enabled: c })}
        />
      </div>
      <LInput
        label="Label d'accessibilité"
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
}: {
  value: SiteContent["mobileBottomBar"];
  onChange: (v: SiteContent["mobileBottomBar"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Items (3 à 5 recommandés)</Label>
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
          <Plus className="me-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div
          key={it.id}
          className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[140px_1fr_1fr_auto_auto_auto]"
        >
          <Field label="Icône">
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
            label="Libellé"
            value={it.label}
            disabled={readOnly}
            onChange={(next) => {
              const items = v.items.slice();
              items[i] = { ...it, label: next };
              onChange({ ...v, items });
            }}
          />
          <Field label="Lien">
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
            <Label className="text-xs">Primaire</Label>
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
            <Label className="text-xs">Auth</Label>
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
            aria-label="Supprimer"
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
}: {
  value: SiteContent["header"];
  onChange: (v: SiteContent["header"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <LInput
          label="Placeholder du champ de recherche"
          value={v.searchPlaceholder}
          onChange={(next) => onChange({ ...v, searchPlaceholder: next })}
          disabled={readOnly}
        />
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Afficher la barre de recherche</p>
          </div>
          <Switch
            checked={v.showSearch}
            disabled={readOnly}
            onCheckedChange={(c) => onChange({ ...v, showSearch: c })}
          />
        </div>
        <LInput
          label="Bouton principal — libellé"
          value={v.builderCta.label}
          onChange={(next) => onChange({ ...v, builderCta: { ...v.builderCta, label: next } })}
          disabled={readOnly}
        />
        <Field label="Bouton principal — lien">
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
        <p className="text-sm font-semibold">Menu « Catégories »</p>
        <div className="grid gap-3 md:grid-cols-2">
          <LInput
            label="Libellé du menu"
            value={v.categoryMenu.label}
            onChange={(next) =>
              onChange({ ...v, categoryMenu: { ...v.categoryMenu, label: next } })
            }
            disabled={readOnly}
          />
          <LInput
            label="Titre à l'intérieur du menu"
            value={v.categoryMenu.title}
            onChange={(next) =>
              onChange({ ...v, categoryMenu: { ...v.categoryMenu, title: next } })
            }
            disabled={readOnly}
          />
          <LInput
            label="Libellé « voir toutes »"
            value={v.categoryMenu.browseLabel}
            onChange={(next) =>
              onChange({ ...v, categoryMenu: { ...v.categoryMenu, browseLabel: next } })
            }
            disabled={readOnly}
          />
          <Field label="Lien « voir toutes »">
            <Input
              value={v.categoryMenu.browseHref}
              disabled={readOnly}
              onChange={(e) =>
                onChange({ ...v, categoryMenu: { ...v.categoryMenu, browseHref: e.target.value } })
              }
            />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <Label>Entrées du menu Catégories</Label>
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
            <Plus className="me-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.categoryMenu.items.map((it, i) => (
          <div
            key={it.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[140px_1fr_1fr_auto_auto]"
          >
            <Field label="Icône">
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
              label="Libellé"
              value={it.label}
              disabled={readOnly}
              onChange={(next) => {
                const items = v.categoryMenu.items.slice();
                items[i] = { ...it, label: next };
                onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } });
              }}
            />
            <Field label="Lien">
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
              <Label className="text-xs">Accent</Label>
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
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Liens de navigation principaux</p>
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
            <Plus className="me-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.primaryNav.map((n, i) => (
          <div
            key={n.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <LInput
              label="Libellé"
              value={n.label}
              disabled={readOnly}
              onChange={(next) => {
                const arr = v.primaryNav.slice();
                arr[i] = { ...n, label: next };
                onChange({ ...v, primaryNav: arr });
              }}
            />
            <Field label="Lien">
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
              aria-label="Supprimer"
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
}: {
  value: SiteContent["footer"];
  onChange: (v: SiteContent["footer"]) => void;
  readOnly: boolean;
}) {
  const v = value;
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <LTextarea
          label="Baseline (sous le logo)"
          rows={2}
          value={v.tagline}
          onChange={(next) => onChange({ ...v, tagline: next })}
          disabled={readOnly}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <LInput
            label="Copyright"
            value={v.copyright}
            onChange={(next) => onChange({ ...v, copyright: next })}
            disabled={readOnly}
          />
          <LInput
            label="Mention « fait à… »"
            value={v.madeIn}
            onChange={(next) => onChange({ ...v, madeIn: next })}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Réseaux sociaux</p>
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
            <Plus className="me-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.socials.map((s, i) => (
          <div
            key={s.id}
            className="grid items-end gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_1fr_auto]"
          >
            <Field label="Icône">
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
              label="Libellé (a11y)"
              value={s.label}
              disabled={readOnly}
              onChange={(next) => {
                const arr = v.socials.slice();
                arr[i] = { ...s, label: next };
                onChange({ ...v, socials: arr });
              }}
            />
            <Field label="Lien">
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
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Colonnes de liens</p>
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
            <Plus className="me-2 h-4 w-4" /> Ajouter une colonne
          </Button>
        </div>
        {v.columns.map((col, ci) => (
          <div key={col.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <LInput
                  label="Titre de la colonne"
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
                <Plus className="me-2 h-4 w-4" /> Lien
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={readOnly}
                onClick={() => onChange({ ...v, columns: v.columns.filter((_, j) => j !== ci) })}
                aria-label="Supprimer la colonne"
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
                  label="Libellé"
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
                <Field label="Lien">
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
                  aria-label="Supprimer"
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
