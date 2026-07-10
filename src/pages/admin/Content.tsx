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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RotateCcw, Save } from "lucide-react";
import {
  useAdminState, setSiteContentSection, resetSiteContentSection,
} from "@/lib/admin-store";
import type { SiteContent } from "@/lib/site-content";
import { ICON_NAMES, getIcon, type IconName } from "@/lib/site-content";
import type { Category } from "@/data/products";
import type { Localized } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
            "px-2 py-0.5 rounded-sm transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function LInput({
  value, onChange, placeholder, label,
}: {
  value: Localized<string> | undefined;
  onChange: (next: Localized<string>) => void;
  placeholder?: string;
  label?: string;
}) {
  const [lang, setLang] = useState<LangCode>("fr");
  const map = toMap(value);
  const isAr = lang === "ar";
  return (
    <div className="space-y-1.5" dir={isAr ? "rtl" : "ltr"}>
      {label && <Label className={cn(isAr && "text-right block")}>{label}</Label>}
      <LangTabs lang={lang} onChange={setLang} />
      <Input
        dir={isAr ? "rtl" : "ltr"}
        className={cn(isAr && "text-right")}
        value={map[lang]}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...map, [lang]: e.target.value })}
      />
    </div>
  );
}

function LTextarea({
  value, onChange, rows, label,
}: {
  value: Localized<string> | undefined;
  onChange: (next: Localized<string>) => void;
  rows?: number;
  label?: string;
}) {
  const [lang, setLang] = useState<LangCode>("fr");
  const map = toMap(value);
  const isAr = lang === "ar";
  return (
    <div className="space-y-1.5" dir={isAr ? "rtl" : "ltr"}>
      {label && <Label className={cn(isAr && "text-right block")}>{label}</Label>}
      <LangTabs lang={lang} onChange={setLang} />
      <Textarea
        rows={rows}
        dir={isAr ? "rtl" : "ltr"}
        className={cn(isAr && "text-right")}
        value={map[lang]}
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
  const { siteContent } = useAdminState();
  const [tab, setTab] = useState<keyof SiteContent>("header");

  return (
    <AdminPageShell title="Contenu du site" description="Chaque bloc de la page d'accueil est éditable ici.">
      <Tabs value={tab} onValueChange={(v) => setTab(v as keyof SiteContent)}>
        <TabsList className="flex-wrap h-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.key} value={s.key} className="mt-4">
            <SectionEditor sectionKey={s.key} label={s.label} value={siteContent[s.key]} />
          </TabsContent>
        ))}
      </Tabs>
    </AdminPageShell>
  );
}

function SectionEditor<K extends keyof SiteContent>({
  sectionKey, label, value,
}: { sectionKey: K; label: string; value: SiteContent[K] }) {
  const [draft, setDraft] = useState<SiteContent[K]>(value);
  // Re-sync when the parent value changes (e.g. after reset)
  const key = JSON.stringify(value);
  const [signature, setSignature] = useState(key);
  if (signature !== key) { setSignature(key); setDraft(value); }

  function save() {
    setSiteContentSection(sectionKey, draft);
    toast.success("Contenu enregistré");
  }
  function reset() {
    resetSiteContentSection(sectionKey);
    toast.success("Section réinitialisée");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{label}</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser</Button>
          <Button size="sm" onClick={save}><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderForm(sectionKey, draft, (v) => setDraft(v))}
      </CardContent>
    </Card>
  );
}

function renderForm<K extends keyof SiteContent>(
  key: K, draft: SiteContent[K], onChange: (v: SiteContent[K]) => void,
): React.ReactNode {
  switch (key) {
    case "header": return <HeaderForm value={draft as SiteContent["header"]} onChange={onChange as (v: SiteContent["header"]) => void} />;
    case "footer": return <FooterForm value={draft as SiteContent["footer"]} onChange={onChange as (v: SiteContent["footer"]) => void} />;
    case "hero": return <HeroForm value={draft as SiteContent["hero"]} onChange={onChange as (v: SiteContent["hero"]) => void} />;
    case "flashSale": return <FlashSaleForm value={draft as SiteContent["flashSale"]} onChange={onChange as (v: SiteContent["flashSale"]) => void} />;
    case "categories": return <CategoriesForm value={draft as SiteContent["categories"]} onChange={onChange as (v: SiteContent["categories"]) => void} />;
    case "useChips": return <SimpleTitleForm value={draft as { title: Localized<string> }} onChange={onChange as (v: { title: Localized<string> }) => void} titleLabel="Titre de la section" />;
    case "bestSellers": return <TitleSubForm value={draft as { title: Localized<string>; subtitle: Localized<string> }} onChange={onChange as (v: { title: Localized<string>; subtitle: Localized<string> }) => void} />;
    case "featuredTabs": return <FeaturedTabsForm value={draft as SiteContent["featuredTabs"]} onChange={onChange as (v: SiteContent["featuredTabs"]) => void} />;
    case "brandsMarquee": return <SimpleTitleForm value={draft as { title: Localized<string> }} onChange={onChange as (v: { title: Localized<string> }) => void} titleLabel="Kicker au-dessus du défilement" />;
    case "whyUs": return <WhyUsForm value={draft as SiteContent["whyUs"]} onChange={onChange as (v: SiteContent["whyUs"]) => void} />;
    case "builderTeaser": return <BuilderTeaserForm value={draft as SiteContent["builderTeaser"]} onChange={onChange as (v: SiteContent["builderTeaser"]) => void} />;
    case "reviews": return <TitleSubForm value={draft as { title: Localized<string>; subtitle: Localized<string> }} onChange={onChange as (v: { title: Localized<string>; subtitle: Localized<string> }) => void} />;
    case "contactCta": return <ContactCtaForm value={draft as SiteContent["contactCta"]} onChange={onChange as (v: SiteContent["contactCta"]) => void} />;
    case "floatingWhatsApp": return <FloatingWaForm value={draft as SiteContent["floatingWhatsApp"]} onChange={onChange as (v: SiteContent["floatingWhatsApp"]) => void} />;
    case "mobileBottomBar": return <MobileBarForm value={draft as SiteContent["mobileBottomBar"]} onChange={onChange as (v: SiteContent["mobileBottomBar"]) => void} />;
    default: return null;
  }
}

// ---- Small reusable inputs ----
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function IconPicker({ value, onChange }: { value: IconName; onChange: (n: IconName) => void }) {
  const Current = getIcon(value);
  return (
    <div className="flex items-center gap-2">
      <div className="size-9 rounded-md border border-border inline-flex items-center justify-center bg-card"><Current className="size-4" /></div>
      <Select value={value} onValueChange={(v) => onChange(v as IconName)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-64">
          {ICON_NAMES.map((n) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---- Forms ----
function SimpleTitleForm({ value, onChange, titleLabel }: { value: { title: Localized<string> }; onChange: (v: { title: Localized<string> }) => void; titleLabel: string }) {
  return <Field label={titleLabel}><LInput value={value.title} onChange={(next) => onChange({ ...value, title: next })} /></Field>;
}
function TitleSubForm({ value, onChange }: { value: { title: Localized<string>; subtitle: Localized<string> }; onChange: (v: { title: Localized<string>; subtitle: Localized<string> }) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Titre"><LInput value={value.title} onChange={(next) => onChange({ ...value, title: next })} /></Field>
      <Field label="Sous-titre"><LInput value={value.subtitle} onChange={(next) => onChange({ ...value, subtitle: next })} /></Field>
    </div>
  );
}

function HeroForm({ value, onChange }: { value: SiteContent["hero"]; onChange: (v: SiteContent["hero"]) => void }) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Badge"><LInput value={v.badge} onChange={(next) => onChange({ ...v, badge: next })} /></Field>
      <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
        <div><p className="text-sm font-medium">Afficher l'image du hero</p></div>
        <Switch checked={v.showImage} onCheckedChange={(c) => onChange({ ...v, showImage: c })} />
      </div>
      <Field label="Titre ligne 1"><LInput value={v.title1} onChange={(next) => onChange({ ...v, title1: next })} /></Field>
      <Field label="Titre ligne 2 (accent)"><LInput value={v.title2} onChange={(next) => onChange({ ...v, title2: next })} /></Field>
      <div className="md:col-span-2"><Field label="Sous-titre"><LTextarea rows={2} value={v.subtitle} onChange={(next) => onChange({ ...v, subtitle: next })} /></Field></div>
      <Field label="CTA principal — libellé"><LInput value={v.primaryCta.label} onChange={(next) => onChange({ ...v, primaryCta: { ...v.primaryCta, label: next } })} /></Field>
      <Field label="CTA principal — lien"><Input value={v.primaryCta.href} onChange={(e) => onChange({ ...v, primaryCta: { ...v.primaryCta, href: e.target.value } })} /></Field>
      <Field label="CTA secondaire — libellé"><LInput value={v.secondaryCta.label} onChange={(next) => onChange({ ...v, secondaryCta: { ...v.secondaryCta, label: next } })} /></Field>
      <Field label="CTA secondaire — lien"><Input value={v.secondaryCta.href} onChange={(e) => onChange({ ...v, secondaryCta: { ...v.secondaryCta, href: e.target.value } })} /></Field>
      <div className="md:col-span-2 space-y-2">
        <div className="flex items-center justify-between"><Label>Indicateurs (KPI)</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, kpis: [...v.kpis, { id: `kpi_${Date.now()}`, icon: "star", value: "", label: "" }] })}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.kpis.map((k, i) => (
          <div key={k.id} className="grid gap-2 md:grid-cols-[160px_1fr_1fr_auto] items-end rounded-md border p-3">
            <Field label="Icône"><IconPicker value={k.icon} onChange={(n) => { const kpis = v.kpis.slice(); kpis[i] = { ...k, icon: n }; onChange({ ...v, kpis }); }} /></Field>
            <Field label="Valeur"><LInput value={k.value} onChange={(next) => { const kpis = v.kpis.slice(); kpis[i] = { ...k, value: next }; onChange({ ...v, kpis }); }} /></Field>
            <Field label="Libellé"><LInput value={k.label} onChange={(next) => { const kpis = v.kpis.slice(); kpis[i] = { ...k, label: next }; onChange({ ...v, kpis }); }} /></Field>
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, kpis: v.kpis.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlashSaleForm({ value, onChange }: { value: SiteContent["flashSale"]; onChange: (v: SiteContent["flashSale"]) => void }) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Badge"><LInput value={v.badge} onChange={(next) => onChange({ ...v, badge: next })} /></Field>
      <Field label="Titre"><LInput value={v.title} onChange={(next) => onChange({ ...v, title: next })} /></Field>
      <Field label="Libellé « voir tout »"><LInput value={v.viewAllLabel} onChange={(next) => onChange({ ...v, viewAllLabel: next })} /></Field>
      <Field label="Lien « voir tout »"><Input value={v.viewAllHref} onChange={(e) => onChange({ ...v, viewAllHref: e.target.value })} /></Field>
      <Field label="Durée du compte à rebours (heures)"><Input type="number" min={1} value={v.countdownHours} onChange={(e) => onChange({ ...v, countdownHours: Math.max(1, Number(e.target.value) || 1) })} /></Field>
    </div>
  );
}

function CategoriesForm({ value, onChange }: { value: SiteContent["categories"]; onChange: (v: SiteContent["categories"]) => void }) {
  const v = value;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Titre"><LInput value={v.title} onChange={(next) => onChange({ ...v, title: next })} /></Field>
        <Field label="Sous-titre"><LInput value={v.subtitle} onChange={(next) => onChange({ ...v, subtitle: next })} /></Field>
        <Field label="Libellé « parcourir »"><LInput value={v.browseLabel} onChange={(next) => onChange({ ...v, browseLabel: next })} /></Field>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Les libellés et images des 4 cartes se gèrent depuis <strong>Catégories</strong>.</p>
    </>
  );
}

function FeaturedTabsForm({ value, onChange }: { value: SiteContent["featuredTabs"]; onChange: (v: SiteContent["featuredTabs"]) => void }) {
  const v = value;
  const cats: Category[] = ["laptops", "desktops", "builds", "phones"];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Titre"><LInput value={v.title} onChange={(next) => onChange({ ...v, title: next })} /></Field>
        <Field label="Sous-titre"><LInput value={v.subtitle} onChange={(next) => onChange({ ...v, subtitle: next })} /></Field>
      </div>
      <div className="flex items-center justify-between">
        <Label>Onglets</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, tabs: [...v.tabs, { id: `t_${Date.now()}`, categorySlug: "laptops", label: "Nouveau" }] })}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.tabs.map((tb, i) => (
        <div key={tb.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end rounded-md border p-3">
          <Field label="Catégorie">
            <Select value={tb.categorySlug} onValueChange={(x) => { const tabs = v.tabs.slice(); tabs[i] = { ...tb, categorySlug: x as Category }; onChange({ ...v, tabs }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Libellé"><LInput value={tb.label} onChange={(next) => { const tabs = v.tabs.slice(); tabs[i] = { ...tb, label: next }; onChange({ ...v, tabs }); }} /></Field>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, tabs: v.tabs.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
}

function WhyUsForm({ value, onChange }: { value: SiteContent["whyUs"]; onChange: (v: SiteContent["whyUs"]) => void }) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Kicker"><LInput value={v.kicker} onChange={(next) => onChange({ ...v, kicker: next })} /></Field>
        <Field label="Sous-titre"><LInput value={v.subtitle} onChange={(next) => onChange({ ...v, subtitle: next })} /></Field>
        <Field label="Titre ligne 1"><LInput value={v.title1} onChange={(next) => onChange({ ...v, title1: next })} /></Field>
        <Field label="Titre ligne 2"><LInput value={v.title2} onChange={(next) => onChange({ ...v, title2: next })} /></Field>
      </div>
      <div className="flex items-center justify-between">
        <Label>Arguments</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, items: [...v.items, { id: `w_${Date.now()}`, icon: "shield", title: "", description: "" }] })}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div key={it.id} className="grid gap-2 md:grid-cols-[160px_1fr_2fr_auto] items-end rounded-md border p-3">
          <Field label="Icône"><IconPicker value={it.icon} onChange={(n) => { const items = v.items.slice(); items[i] = { ...it, icon: n }; onChange({ ...v, items }); }} /></Field>
          <Field label="Titre"><LInput value={it.title} onChange={(next) => { const items = v.items.slice(); items[i] = { ...it, title: next }; onChange({ ...v, items }); }} /></Field>
          <Field label="Description"><LInput value={it.description} onChange={(next) => { const items = v.items.slice(); items[i] = { ...it, description: next }; onChange({ ...v, items }); }} /></Field>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, items: v.items.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
}

function BuilderTeaserForm({ value, onChange }: { value: SiteContent["builderTeaser"]; onChange: (v: SiteContent["builderTeaser"]) => void }) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Badge"><LInput value={v.badge} onChange={(next) => onChange({ ...v, badge: next })} /></Field>
        <Field label="Titre"><LInput value={v.title} onChange={(next) => onChange({ ...v, title: next })} /></Field>
        <div className="md:col-span-2"><Field label="Sous-titre"><LTextarea rows={2} value={v.subtitle} onChange={(next) => onChange({ ...v, subtitle: next })} /></Field></div>
        <Field label="CTA — libellé"><LInput value={v.cta.label} onChange={(next) => onChange({ ...v, cta: { ...v.cta, label: next } })} /></Field>
        <Field label="CTA — lien"><Input value={v.cta.href} onChange={(e) => onChange({ ...v, cta: { ...v.cta, href: e.target.value } })} /></Field>
      </div>
      <div className="flex items-center justify-between">
        <Label>Cartes de composants</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, items: [...v.items, { id: `bt_${Date.now()}`, icon: "cpu", title: "", subtitle: "" }] })}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div key={it.id} className="grid gap-2 md:grid-cols-[160px_1fr_1fr_auto] items-end rounded-md border p-3">
          <Field label="Icône"><IconPicker value={it.icon} onChange={(n) => { const items = v.items.slice(); items[i] = { ...it, icon: n }; onChange({ ...v, items }); }} /></Field>
          <Field label="Titre"><LInput value={it.title} onChange={(next) => { const items = v.items.slice(); items[i] = { ...it, title: next }; onChange({ ...v, items }); }} /></Field>
          <Field label="Sous-titre"><LInput value={it.subtitle} onChange={(next) => { const items = v.items.slice(); items[i] = { ...it, subtitle: next }; onChange({ ...v, items }); }} /></Field>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, items: v.items.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
}

function ContactCtaForm({ value, onChange }: { value: SiteContent["contactCta"]; onChange: (v: SiteContent["contactCta"]) => void }) {
  const v = value;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Titre"><LInput value={v.title} onChange={(next) => onChange({ ...v, title: next })} /></Field>
      <Field label="Libellé WhatsApp"><LInput value={v.whatsappLabel} onChange={(next) => onChange({ ...v, whatsappLabel: next })} /></Field>
      <div className="md:col-span-2"><Field label="Sous-titre"><LTextarea rows={2} value={v.subtitle} onChange={(next) => onChange({ ...v, subtitle: next })} /></Field></div>
      <p className="md:col-span-2 text-xs text-muted-foreground">Le numéro WhatsApp est configuré dans <strong>Paramètres</strong>.</p>
    </div>
  );
}

function FloatingWaForm({ value, onChange }: { value: SiteContent["floatingWhatsApp"]; onChange: (v: SiteContent["floatingWhatsApp"]) => void }) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div><p className="text-sm font-medium">Afficher le bouton WhatsApp flottant</p><p className="text-xs text-muted-foreground">Visible seulement si un numéro est configuré dans Paramètres.</p></div>
        <Switch checked={v.enabled} onCheckedChange={(c) => onChange({ ...v, enabled: c })} />
      </div>
      <Field label="Label d'accessibilité"><LInput value={v.ariaLabel} onChange={(next) => onChange({ ...v, ariaLabel: next })} /></Field>
    </div>
  );
}

function MobileBarForm({ value, onChange }: { value: SiteContent["mobileBottomBar"]; onChange: (v: SiteContent["mobileBottomBar"]) => void }) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Items (3 à 5 recommandés)</Label>
        <Button type="button" size="sm" variant="outline" disabled={v.items.length >= 5} onClick={() => onChange({ ...v, items: [...v.items, { id: `mb_${Date.now()}`, icon: "home", label: "Nouveau", href: "/" }] })}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {v.items.map((it, i) => (
        <div key={it.id} className="grid gap-2 md:grid-cols-[140px_1fr_1fr_auto_auto_auto] items-end rounded-md border p-3">
          <Field label="Icône"><IconPicker value={it.icon} onChange={(n) => { const items = v.items.slice(); items[i] = { ...it, icon: n }; onChange({ ...v, items }); }} /></Field>
          <Field label="Libellé"><LInput value={it.label} onChange={(next) => { const items = v.items.slice(); items[i] = { ...it, label: next }; onChange({ ...v, items }); }} /></Field>
          <Field label="Lien"><Input value={it.href} onChange={(e) => { const items = v.items.slice(); items[i] = { ...it, href: e.target.value }; onChange({ ...v, items }); }} /></Field>
          <div className="flex flex-col items-center gap-1"><Label className="text-xs">Primaire</Label><Switch checked={!!it.primary} onCheckedChange={(c) => { const items = v.items.slice(); items[i] = { ...it, primary: c }; onChange({ ...v, items }); }} /></div>
          <div className="flex flex-col items-center gap-1"><Label className="text-xs">Auth</Label><Switch checked={!!it.requiresAuth} onCheckedChange={(c) => { const items = v.items.slice(); items[i] = { ...it, requiresAuth: c }; onChange({ ...v, items }); }} /></div>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, items: v.items.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
}

// ---- Header form ----
function HeaderForm({ value, onChange }: { value: SiteContent["header"]; onChange: (v: SiteContent["header"]) => void }) {
  const v = value;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Placeholder du champ de recherche"><LInput value={v.searchPlaceholder} onChange={(next) => onChange({ ...v, searchPlaceholder: next })} /></Field>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div><p className="text-sm font-medium">Afficher la barre de recherche</p></div>
          <Switch checked={v.showSearch} onCheckedChange={(c) => onChange({ ...v, showSearch: c })} />
        </div>
        <Field label="Bouton principal — libellé"><LInput value={v.builderCta.label} onChange={(next) => onChange({ ...v, builderCta: { ...v.builderCta, label: next } })} /></Field>
        <Field label="Bouton principal — lien"><Input value={v.builderCta.href} onChange={(e) => onChange({ ...v, builderCta: { ...v.builderCta, href: e.target.value } })} /></Field>
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <p className="text-sm font-semibold">Menu « Catégories »</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Libellé du menu"><LInput value={v.categoryMenu.label} onChange={(next) => onChange({ ...v, categoryMenu: { ...v.categoryMenu, label: next } })} /></Field>
          <Field label="Titre à l'intérieur du menu"><LInput value={v.categoryMenu.title} onChange={(next) => onChange({ ...v, categoryMenu: { ...v.categoryMenu, title: next } })} /></Field>
          <Field label="Libellé « voir toutes »"><LInput value={v.categoryMenu.browseLabel} onChange={(next) => onChange({ ...v, categoryMenu: { ...v.categoryMenu, browseLabel: next } })} /></Field>
          <Field label="Lien « voir toutes »"><Input value={v.categoryMenu.browseHref} onChange={(e) => onChange({ ...v, categoryMenu: { ...v.categoryMenu, browseHref: e.target.value } })} /></Field>
        </div>
        <div className="flex items-center justify-between">
          <Label>Entrées du menu Catégories</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, categoryMenu: { ...v.categoryMenu, items: [...v.categoryMenu.items, { id: `hc_${Date.now()}`, label: "Nouveau", href: "/", icon: "tag" }] } })}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.categoryMenu.items.map((it, i) => (
          <div key={it.id} className="grid gap-2 md:grid-cols-[140px_1fr_1fr_auto_auto] items-end rounded-md border p-3">
            <Field label="Icône"><IconPicker value={(it.icon ?? "tag") as IconName} onChange={(n) => { const items = v.categoryMenu.items.slice(); items[i] = { ...it, icon: n }; onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } }); }} /></Field>
            <Field label="Libellé"><LInput value={it.label} onChange={(next) => { const items = v.categoryMenu.items.slice(); items[i] = { ...it, label: next }; onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } }); }} /></Field>
            <Field label="Lien"><Input value={it.href} onChange={(e) => { const items = v.categoryMenu.items.slice(); items[i] = { ...it, href: e.target.value }; onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } }); }} /></Field>
            <div className="flex flex-col items-center gap-1"><Label className="text-xs">Accent</Label><Switch checked={!!it.accent} onCheckedChange={(c) => { const items = v.categoryMenu.items.slice(); items[i] = { ...it, accent: c }; onChange({ ...v, categoryMenu: { ...v.categoryMenu, items } }); }} /></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, categoryMenu: { ...v.categoryMenu, items: v.categoryMenu.items.filter((_, j) => j !== i) } })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Liens de navigation principaux</p>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, primaryNav: [...v.primaryNav, { id: `hn_${Date.now()}`, label: "Nouveau", href: "/" }] })}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.primaryNav.map((n, i) => (
          <div key={n.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end rounded-md border p-3">
            <Field label="Libellé"><LInput value={n.label} onChange={(next) => { const arr = v.primaryNav.slice(); arr[i] = { ...n, label: next }; onChange({ ...v, primaryNav: arr }); }} /></Field>
            <Field label="Lien"><Input value={n.href} onChange={(e) => { const arr = v.primaryNav.slice(); arr[i] = { ...n, href: e.target.value }; onChange({ ...v, primaryNav: arr }); }} /></Field>
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, primaryNav: v.primaryNav.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Footer form ----
function FooterForm({ value, onChange }: { value: SiteContent["footer"]; onChange: (v: SiteContent["footer"]) => void }) {
  const v = value;
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <Field label="Baseline (sous le logo)"><LTextarea rows={2} value={v.tagline} onChange={(next) => onChange({ ...v, tagline: next })} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Copyright"><LInput value={v.copyright} onChange={(next) => onChange({ ...v, copyright: next })} /></Field>
          <Field label="Mention « fait à… »"><LInput value={v.madeIn} onChange={(next) => onChange({ ...v, madeIn: next })} /></Field>
        </div>
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Réseaux sociaux</p>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, socials: [...v.socials, { id: `s_${Date.now()}`, icon: "facebook", label: "Nouveau", href: "#" }] })}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
        {v.socials.map((s, i) => (
          <div key={s.id} className="grid gap-2 md:grid-cols-[160px_1fr_1fr_auto] items-end rounded-md border p-3">
            <Field label="Icône"><IconPicker value={s.icon} onChange={(n) => { const arr = v.socials.slice(); arr[i] = { ...s, icon: n }; onChange({ ...v, socials: arr }); }} /></Field>
            <Field label="Libellé (a11y)"><LInput value={s.label} onChange={(next) => { const arr = v.socials.slice(); arr[i] = { ...s, label: next }; onChange({ ...v, socials: arr }); }} /></Field>
            <Field label="Lien"><Input value={s.href} onChange={(e) => { const arr = v.socials.slice(); arr[i] = { ...s, href: e.target.value }; onChange({ ...v, socials: arr }); }} /></Field>
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, socials: v.socials.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Colonnes de liens</p>
          <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...v, columns: [...v.columns, { id: `fc_${Date.now()}`, title: "Nouvelle colonne", links: [] }] })}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une colonne
          </Button>
        </div>
        {v.columns.map((col, ci) => (
          <div key={col.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1"><Field label="Titre de la colonne"><LInput value={col.title} onChange={(next) => { const arr = v.columns.slice(); arr[ci] = { ...col, title: next }; onChange({ ...v, columns: arr }); }} /></Field></div>
              <Button type="button" size="sm" variant="outline" onClick={() => { const arr = v.columns.slice(); arr[ci] = { ...col, links: [...col.links, { id: `fl_${Date.now()}`, label: "Nouveau", href: "/" }] }; onChange({ ...v, columns: arr }); }}>
                <Plus className="mr-2 h-4 w-4" /> Lien
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => onChange({ ...v, columns: v.columns.filter((_, j) => j !== ci) })} aria-label="Supprimer la colonne"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            {col.links.map((l, li) => (
              <div key={l.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end rounded-md border p-2">
                <Field label="Libellé"><LInput value={l.label} onChange={(next) => { const arr = v.columns.slice(); const links = col.links.slice(); links[li] = { ...l, label: next }; arr[ci] = { ...col, links }; onChange({ ...v, columns: arr }); }} /></Field>
                <Field label="Lien"><Input value={l.href} onChange={(e) => { const arr = v.columns.slice(); const links = col.links.slice(); links[li] = { ...l, href: e.target.value }; arr[ci] = { ...col, links }; onChange({ ...v, columns: arr }); }} /></Field>
                <Button type="button" size="icon" variant="ghost" onClick={() => { const arr = v.columns.slice(); arr[ci] = { ...col, links: col.links.filter((_, j) => j !== li) }; onChange({ ...v, columns: arr }); }} aria-label="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
