import { useState, useEffect } from "react";
import { Plus, Trash2, Code, Check, Palette, FileText, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaPickerField } from "@/components/admin/MediaPickerField";
import type { BlockConfig, BlockStyleConfig } from "@/types/pages";
import type { Localized } from "@/lib/i18n";
import { getBlockMeta } from "@/components/blocks/registry";
import { useSiteContent, useSiteSettings } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/waymen-og-banner.webp";
import archisysBannerSrc from "@/assets/waymen-og-banner.webp";
import archisysSignatureSrc from "@/assets/waymen-logo.webp";

interface BlockPropsEditorProps {
  block: BlockConfig;
  onChange: (newProps: Record<string, unknown>) => void;
  onStyleChange?: (newStyle: BlockStyleConfig) => void;
}

function getPropStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const loc = val as Record<string, unknown>;
    return String(loc.fr || loc.en || loc.ar || "");
  }
  return "";
}

/**
 * 🌐 Éditeur de champ localisé trilingue (FR / EN / AR) avec conservation de la parité
 */
interface LocalizedFieldEditorProps {
  label: string;
  value: unknown;
  onChange: (val: Localized<string>) => void;
  isTextarea?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function LocalizedFieldEditor({
  label,
  value,
  onChange,
  isTextarea = false,
  rows = 2,
  placeholder,
  className,
}: LocalizedFieldEditorProps) {
  const [lang, setLang] = useState<"fr" | "en" | "ar">("fr");

  const locObj: { fr: string; en: string; ar: string } =
    typeof value === "object" && value !== null
      ? {
          fr: String((value as Record<string, unknown>).fr || ""),
          en: String((value as Record<string, unknown>).en || ""),
          ar: String((value as Record<string, unknown>).ar || ""),
        }
      : typeof value === "string"
        ? { fr: value, en: value, ar: value }
        : { fr: "", en: "", ar: "" };

  const currentVal = locObj[lang] || "";

  const handleChange = (newStr: string) => {
    onChange({
      ...locObj,
      [lang]: newStr,
    });
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-1">
        <Label className="text-xs font-semibold">{label} :</Label>
        <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setLang("fr")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-all",
              lang === "fr"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-all",
              lang === "en"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("ar")}
            className={cn(
              "px-1.5 py-0.5 rounded transition-all",
              lang === "ar"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            العربية
          </button>
        </div>
      </div>
      {isTextarea ? (
        <Textarea
          rows={rows}
          value={currentVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="text-xs"
        />
      ) : (
        <Input
          value={currentVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}

export function BlockPropsEditor({ block, onChange, onStyleChange }: BlockPropsEditorProps) {
  const p = block.props || {};
  const s = block.style || {};
  const [activeTab, setActiveTab] = useState<"content" | "style" | "json">("content");
  const [rawJson, setRawJson] = useState(() => JSON.stringify(p, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 🛡️ Synchronisation réactive immédiate du JSON lors du changement de bloc (éradication écrasement accidentel)
  useEffect(() => {
    setRawJson(JSON.stringify(block.props || {}, null, 2));
    setJsonError(null);
  }, [block.id, block.props]);

  const { data: siteContent } = useSiteContent();
  const { data: siteSettings } = useSiteSettings();
  const meta = getBlockMeta(block.type);
  const defProps = (meta?.defaultProps as Record<string, unknown>) || {};
  const L = useLocalize();

  const updateProp = (key: string, value: unknown) => {
    const updated = { ...p, [key]: value };
    onChange(updated);
    setRawJson(JSON.stringify(updated, null, 2));
  };

  const updateStyle = (key: keyof BlockStyleConfig, value: unknown) => {
    if (!onStyleChange) return;
    const nextStyle: BlockStyleConfig = { ...s, [key]: value };
    onStyleChange(nextStyle);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Le JSON doit être un objet clé-valeur.");
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      toast.success("Propriétés JSON appliquées avec succès !");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "JSON syntaxiquement invalide.";
      setJsonError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50 space-y-4 text-start">
      {/* Sélecteur d'onglets de l'inspecteur : Contenu | Style & Disposition | Mode JSON */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "content" ? "default" : "ghost"}
          className="flex-1 h-7 text-xs font-semibold gap-1.5"
          onClick={() => setActiveTab("content")}
        >
          <FileText className="size-3.5" />
          <span>Contenu</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "style" ? "default" : "ghost"}
          className="flex-1 h-7 text-xs font-semibold gap-1.5"
          onClick={() => setActiveTab("style")}
        >
          <Palette className="size-3.5" />
          <span>Style & Espacement</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "json" ? "default" : "ghost"}
          className="h-7 px-2 text-xs font-semibold gap-1"
          onClick={() => setActiveTab("json")}
          title="Mode Codeur / JSON brut"
        >
          <Code className="size-3.5" />
        </Button>
      </div>

      {/* ========================================================= */}
      {/* 🎨 ONGLET STYLE & ESPACEMENT UNIVERSEL                    */}
      {/* ========================================================= */}
      {activeTab === "style" && (
        <div className="space-y-4 animate-fade-in">
          {/* Espacement vertical (Padding) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Espacement vertical (Hauteur) :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "compact", label: "Compact" },
                { key: "normal", label: "Standard" },
                { key: "ample", label: "Aéré" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("padding", item.key)}
                  className={cn(
                    "py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all",
                    (s.padding || "normal") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Arrière-plan de la section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Arrière-plan de section :</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { key: "transparent", label: "Transparent" },
                { key: "surface", label: "Carte Surface" },
                { key: "muted", label: "Gris Léger" },
                { key: "accent", label: "Teinté Primaire" },
                { key: "dark", label: "Sombre Profond" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("bg", item.key)}
                  className={cn(
                    "py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all truncate",
                    (s.bg || "transparent") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alignement du texte */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Alignement textuel :</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateStyle("align", "start")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all",
                  (s.align || "start") === "start"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                )}
              >
                Début / Gauche
              </button>
              <button
                type="button"
                onClick={() => updateStyle("align", "center")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all",
                  s.align === "center"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                )}
              >
                Centré
              </button>
            </div>
          </div>

          {/* Visibilité responsive */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold">Visibilité Responsive :</Label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="size-3.5 text-primary" />
                <span>Masquer sur Mobile (&lt; 768px)</span>
              </div>
              <Switch
                checked={s.hideOnMobile ?? false}
                onCheckedChange={(v) => updateStyle("hideOnMobile", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Monitor className="size-3.5 text-primary" />
                <span>Masquer sur Bureau (≥ 768px)</span>
              </div>
              <Switch
                checked={s.hideOnDesktop ?? false}
                onCheckedChange={(v) => updateStyle("hideOnDesktop", v)}
              />
            </div>
          </div>

          {/* Rayon des bordures (Arrondis) */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold">Rayon d'arrondi (Bordures) :</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: "none", label: "Carré (0)" },
                { key: "md", label: "Moyen (md)" },
                { key: "2xl", label: "Grand (2xl)" },
                { key: "full", label: "Pilule" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("borderRadius", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.borderRadius || "none") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ombres portées & Élévation */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Ombre portée (Élévation) :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "none", label: "Plate (0)" },
                { key: "md", label: "Douce (md)" },
                { key: "xl", label: "Flottante (xl)" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("shadow", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.shadow || "none") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bordures & Délimiteurs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Liseré & Bordure :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "none", label: "Aucune" },
                { key: "subtle", label: "Subtile" },
                { key: "top_bottom", label: "Haut / Bas" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("border", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.border || "none") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Largeur maximale du conteneur */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Largeur max du contenu :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "full", label: "100% Pleine" },
                { key: "7xl", label: "Standard (7xl)" },
                { key: "5xl", label: "Centré (5xl)" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("maxWidth", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.maxWidth || "full") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Marges externes verticales */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Marge externe verticale (Écart) :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "none", label: "Zéro (0)" },
                { key: "compact", label: "Légère" },
                { key: "normal", label: "Standard" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("margin", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.margin || "none") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ancre HTML fluide */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold">Ancre HTML (Lien direct #) :</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-muted-foreground">#</span>
              <Input
                placeholder="ex: nos-offres, equipe, devis"
                value={s.anchorId || ""}
                onChange={(e) => updateStyle("anchorId", e.target.value)}
                className="h-7 text-xs font-mono"
              />
            </div>
          </div>

          {/* Classes CSS utilitaires personnalisées */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Classes Tailwind personnalisées :</Label>
            <Input
              placeholder="ex: backdrop-blur-md opacity-95 ring-1"
              value={s.customClassName || ""}
              onChange={(e) => updateStyle("customClassName", e.target.value)}
              className="h-7 text-xs font-mono"
            />
          </div>

          {/* 🎛️ Sous-éléments Atomiques : Cartes & Grille (Phase 43) */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold">Style des Cartes internes :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "default", label: "Défaut" },
                { key: "flat", label: "Plat" },
                { key: "elevated", label: "Surélevé" },
                { key: "bordered", label: "Bordé" },
                { key: "glass", label: "Verre Glass" },
                { key: "gradient", label: "Dégradé" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("cardStyle", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.cardStyle || "default") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Effet au survol des cartes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Effet au survol (Cartes) :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "none", label: "Aucun" },
                { key: "lift", label: "Élévation (Lift)" },
                { key: "glow", label: "Lueur (Glow)" },
                { key: "zoom", label: "Zoom (Scale)" },
                { key: "border-accent", label: "Liseré Actif" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("cardHover", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.cardHover || "none") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Boutons d'Action (CTAs) */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold">Variante des Boutons (CTAs) :</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "default", label: "Primaire" },
                { key: "secondary", label: "Secondaire" },
                { key: "outline", label: "Contour" },
                { key: "ghost", label: "Fantôme" },
                { key: "gradient", label: "Gradient" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("ctaVariant", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.ctaVariant || "default") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 📍 Emplacement dans la page (Vues systèmes & parcours) */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold">Emplacement dans la page :</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: "top", label: "En Haut (Avant le contenu)" },
                { key: "bottom", label: "En Bas (Après le contenu)" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateStyle("placement", item.key)}
                  className={cn(
                    "py-1 px-1.5 text-[11px] font-semibold rounded border text-center transition-all truncate",
                    (s.placement || "top") === item.key
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 💻 ONGLET MODE DÉVELOPPEUR JSON                           */}
      {/* ========================================================= */}
      {activeTab === "json" && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold">Éditeur JSON des propriétés :</Label>
            <Button size="sm" onClick={handleApplyJson} className="h-7 text-xs gap-1 font-semibold">
              <Check className="size-3" />
              <span>Appliquer</span>
            </Button>
          </div>
          <Textarea
            rows={8}
            value={rawJson}
            onChange={(e) => {
              setRawJson(e.target.value);
              setJsonError(null);
            }}
            className="font-mono text-[11px] bg-muted/40"
          />
          {jsonError && <p className="text-[11px] text-destructive font-mono">{jsonError}</p>}
        </div>
      )}

      {/* ========================================================= */}
      {/* 📝 ONGLET CONTENU DES 24 BLOCS                            */}
      {/* ========================================================= */}
      {activeTab === "content" && (
        <div className="space-y-4 animate-fade-in">
          {/* A. HERO BANNER */}
          {block.type === "hero_banner" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre Ligne 1"
                  value={p.title1 ?? siteContent.hero.title1}
                  onChange={(val) => updateProp("title1", val)}
                  placeholder="Plateforme E-Commerce"
                />
                <LocalizedFieldEditor
                  label="Titre Ligne 2 (Glow)"
                  value={p.title2 ?? siteContent.hero.title2}
                  onChange={(val) => updateProp("title2", val)}
                  placeholder="Nouvelle Génération"
                />
              </div>
              <LocalizedFieldEditor
                label="Sous-titre / Slogan"
                value={p.subtitle ?? siteContent.hero.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                isTextarea
                rows={2}
                placeholder="Boutique officielle avec livraison 58 wilayas..."
              />
              <LocalizedFieldEditor
                label="Badge d'accroche"
                value={p.badge ?? siteContent.hero.badge}
                onChange={(val) => updateProp("badge", val)}
                placeholder="Offre spéciale"
              />

              {/* Boutons CTA */}
              <div className="grid gap-3 pt-2 border-t border-border/40 sm:grid-cols-2">
                <div className="space-y-1.5 p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs font-bold text-primary">CTA Principal</span>
                  <LocalizedFieldEditor
                    label="Libellé bouton"
                    value={
                      (p.primaryCta as Record<string, unknown>)?.label ??
                      siteContent.hero.primaryCta.label
                    }
                    onChange={(val) => {
                      const cta = (p.primaryCta as Record<string, unknown>) || {
                        ...siteContent.hero.primaryCta,
                      };
                      updateProp("primaryCta", { ...cta, label: val });
                    }}
                    placeholder="Explorer le catalogue"
                  />
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Lien de destination :
                    </Label>
                    <Input
                      value={String(
                        (p.primaryCta as Record<string, unknown>)?.href ??
                          siteContent.hero.primaryCta.href ??
                          "/catalogue",
                      )}
                      onChange={(e) => {
                        const cta = (p.primaryCta as Record<string, unknown>) || {
                          ...siteContent.hero.primaryCta,
                        };
                        updateProp("primaryCta", { ...cta, href: e.target.value });
                      }}
                      placeholder="/catalogue"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 p-2.5 rounded-lg border bg-card/60">
                  <span className="text-xs font-bold text-muted-foreground">CTA Secondaire</span>
                  <LocalizedFieldEditor
                    label="Libellé bouton"
                    value={
                      (p.secondaryCta as Record<string, unknown>)?.label ??
                      siteContent.hero.secondaryCta.label
                    }
                    onChange={(val) => {
                      const cta = (p.secondaryCta as Record<string, unknown>) || {
                        ...siteContent.hero.secondaryCta,
                      };
                      updateProp("secondaryCta", { ...cta, label: val });
                    }}
                    placeholder="Configurateur PC"
                  />
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Lien de destination :
                    </Label>
                    <Input
                      value={String(
                        (p.secondaryCta as Record<string, unknown>)?.href ??
                          siteContent.hero.secondaryCta.href ??
                          "/builder",
                      )}
                      onChange={(e) => {
                        const cta = (p.secondaryCta as Record<string, unknown>) || {
                          ...siteContent.hero.secondaryCta,
                        };
                        updateProp("secondaryCta", { ...cta, href: e.target.value });
                      }}
                      placeholder="/builder"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Affichage de l'image & Visuel */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Afficher l'image du Hero :</Label>
                  <Switch
                    checked={
                      p.showImage !== undefined
                        ? Boolean(p.showImage)
                        : Boolean(siteContent.hero.showImage)
                    }
                    onCheckedChange={(val) => updateProp("showImage", val)}
                  />
                </div>
                <MediaPickerField
                  label="Image personnalisée du Hero"
                  description="Visuel principal d'illustration (laisser vide pour l'image officielle par défaut)"
                  value={typeof p.imageSrc === "string" && p.imageSrc ? p.imageSrc : heroImg}
                  onChange={(url) => updateProp("imageSrc", url)}
                />
              </div>
            </div>
          )}

          {/* B. VENTE FLASH */}
          {block.type === "flash_sale" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre Promotionnel"
                  value={p.title ?? siteContent.flashSale.title}
                  onChange={(val) => updateProp("title", val)}
                  placeholder="Offres de la semaine"
                />
                <LocalizedFieldEditor
                  label="Badge Flamme"
                  value={p.badge ?? siteContent.flashSale.badge}
                  onChange={(val) => updateProp("badge", val)}
                  placeholder="VENTE FLASH"
                />
              </div>
              <div className="space-y-1 max-w-xs">
                <Label className="text-xs font-semibold">
                  Durée du compte à rebours (heures) :
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={
                    typeof p.countdownHours === "number"
                      ? p.countdownHours
                      : siteContent.flashSale.countdownHours || 72
                  }
                  onChange={(e) => updateProp("countdownHours", parseInt(e.target.value, 10) || 72)}
                  className="h-8 text-xs w-28 font-mono"
                />
              </div>
            </div>
          )}

          {/* C. MEILLEURES VENTES & PRODUITS PHARES */}
          {(block.type === "best_sellers" || block.type === "featured_tabs") && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre de la section"
                value={
                  p.title ??
                  (block.type === "best_sellers"
                    ? siteContent.bestSellers.title
                    : siteContent.featuredTabs.title)
                }
                onChange={(val) => updateProp("title", val)}
                placeholder="Nos Meilleurs Produits"
              />
              <LocalizedFieldEditor
                label="Sous-titre explicatif"
                value={
                  p.subtitle ??
                  (block.type === "best_sellers"
                    ? siteContent.bestSellers.subtitle
                    : siteContent.featuredTabs.subtitle)
                }
                onChange={(val) => updateProp("subtitle", val)}
                placeholder="Sélectionnés par nos experts"
              />
            </div>
          )}

          {/* D. WHY US / RÉASSURANCE */}
          {block.type === "why_us" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre Ligne 1"
                  value={p.title1 ?? siteContent.whyUs.title1}
                  onChange={(val) => updateProp("title1", val)}
                  placeholder="Pourquoi nous"
                />
                <LocalizedFieldEditor
                  label="Titre Ligne 2"
                  value={p.title2 ?? siteContent.whyUs.title2}
                  onChange={(val) => updateProp("title2", val)}
                  placeholder="faire confiance"
                />
              </div>
              <LocalizedFieldEditor
                label="Sous-titre / Argumentaire"
                value={p.subtitle ?? siteContent.whyUs.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                isTextarea
                rows={2}
                placeholder="Garantie constructeur, livraison express, service client dédié..."
              />

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Cartes de réassurance :</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentItems = Array.isArray(p.items)
                        ? [...p.items]
                        : [...(siteContent.whyUs?.items || [])];
                      currentItems.push({
                        id: "w_" + Date.now(),
                        icon: "shield",
                        title: { fr: "Nouvelle garantie", en: "New guarantee", ar: "ضمان جديد" },
                        description: {
                          fr: "Description de la garantie ou du service...",
                          en: "Description of guarantee or service...",
                          ar: "وصف الضمان أو الخدمة...",
                        },
                      });
                      updateProp("items", currentItems);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter une carte</span>
                  </Button>
                </div>

                {(Array.isArray(p.items) && p.items.length > 0
                  ? (p.items as Record<string, unknown>[])
                  : (siteContent.whyUs?.items as Record<string, unknown>[]) || []
                ).map((card: Record<string, unknown>, idx: number) => (
                  <div
                    key={(card.id as string) || idx}
                    className="p-2.5 border rounded-lg bg-card/60 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-primary">Carte #{idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const current = Array.isArray(p.items)
                            ? [...p.items]
                            : [...(siteContent.whyUs?.items || [])];
                          current.splice(idx, 1);
                          updateProp("items", current);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <LocalizedFieldEditor
                      label="Titre réassurance"
                      value={card.title}
                      onChange={(val) => {
                        const current = Array.isArray(p.items)
                          ? [...p.items]
                          : [...(siteContent.whyUs?.items || [])];
                        current[idx] = { ...current[idx], title: val };
                        updateProp("items", current);
                      }}
                      placeholder="Titre de la réassurance"
                    />
                    <LocalizedFieldEditor
                      label="Description réassurance"
                      value={card.description}
                      onChange={(val) => {
                        const current = Array.isArray(p.items)
                          ? [...p.items]
                          : [...(siteContent.whyUs?.items || [])];
                        current[idx] = { ...current[idx], description: val };
                        updateProp("items", current);
                      }}
                      isTextarea
                      rows={2}
                      placeholder="Description de la réassurance..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E. REVIEWS / AVIS CLIENTS */}
          {block.type === "reviews_grid" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre de la section Avis"
                value={p.title ?? siteContent.reviews.title}
                onChange={(val) => updateProp("title", val)}
                placeholder="Ce que disent nos clients"
              />
              <LocalizedFieldEditor
                label="Sous-titre"
                value={p.subtitle ?? siteContent.reviews.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                placeholder="Avis vérifiés et retours d'expérience"
              />
            </div>
          )}

          {/* F. CONTACT CTA */}
          {block.type === "contact_cta" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre d'accroche"
                value={p.title ?? siteContent.contactCta.title}
                onChange={(val) => updateProp("title", val)}
                placeholder="Besoin d'un conseil personnalisé ?"
              />
              <LocalizedFieldEditor
                label="Texte explicatif"
                value={p.subtitle ?? siteContent.contactCta.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                placeholder="Nos techniciens répondent directement sur WhatsApp"
              />
            </div>
          )}

          {/* 1. PROFILE HERO */}
          {block.type === "profile_hero" && (
            <div className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nom complet affiché :</Label>
                  <Input
                    value={getPropStr(p.name || "ArchiSys3.0")}
                    onChange={(e) => updateProp("name", e.target.value)}
                    placeholder="ArchiSys3.0"
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <LocalizedFieldEditor
                  label="Rôle professionnel / Titre"
                  value={p.role || "Architecte Logiciel & Consultant R&D"}
                  onChange={(val) => updateProp("role", val)}
                  placeholder="Architecte Logiciel & Consultant R&D"
                />
              </div>

              <LocalizedFieldEditor
                label="Biographie / Présentation"
                value={
                  p.bio ||
                  "Expertise en architectures logicielles souveraines, cloud, web moderne et systèmes distribués à haute performance."
                }
                onChange={(val) => updateProp("bio", val)}
                isTextarea
                rows={3}
                placeholder="Expertise en architectures logicielles..."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Badge de Disponibilité"
                  value={p.availability || "Disponible pour missions d'architecture & R&D"}
                  onChange={(val) => updateProp("availability", val)}
                  placeholder="Disponible pour missions..."
                />
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Localisation :</Label>
                  <Input
                    value={getPropStr(p.location || "Alger, Algérie / Remote")}
                    onChange={(e) => updateProp("location", e.target.value)}
                    placeholder="Alger, Algérie / Remote"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Visuel Avatar / Portrait */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <MediaPickerField
                  label="Avatar / Portrait Professionnel"
                  description="Visuel de portrait ou insigne professionnel (laisser vide pour la signature ArchiSys officielle)"
                  value={
                    typeof p.avatarUrl === "string" && p.avatarUrl
                      ? p.avatarUrl
                      : archisysSignatureSrc
                  }
                  onChange={(url) => updateProp("avatarUrl", url)}
                  aspectRatio="square"
                />
              </div>

              {/* Liens Réseaux & Contact */}
              <div className="grid gap-2 pt-2 border-t border-border/40 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Lien GitHub :</Label>
                  <Input
                    placeholder="https://github.com/..."
                    value={String(p.githubUrl || "")}
                    onChange={(e) => updateProp("githubUrl", e.target.value)}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Lien LinkedIn :</Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={String(p.linkedinUrl || "")}
                    onChange={(e) => updateProp("linkedinUrl", e.target.value)}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Email direct :</Label>
                  <Input
                    placeholder="contact@..."
                    value={String(p.email || "")}
                    onChange={(e) => updateProp("email", e.target.value)}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Label className="text-xs font-semibold">Bouton de téléchargement CV (PDF) :</Label>
                <Switch
                  checked={p.showDownloadPdf !== false}
                  onCheckedChange={(val) => updateProp("showDownloadPdf", val)}
                />
              </div>
            </div>
          )}

          {/* 2. TIMELINE */}
          {block.type === "timeline" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre de la section Chronologie"
                  value={p.title || "Parcours Professionnel & Jalons"}
                  onChange={(val) => updateProp("title", val)}
                  placeholder="Parcours Professionnel & Jalons"
                />
                <LocalizedFieldEditor
                  label="Sous-titre descriptif"
                  value={p.subtitle || "Historique des réalisations et projets d'ingénierie."}
                  onChange={(val) => updateProp("subtitle", val)}
                  placeholder="Historique des réalisations..."
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Étapes & Jalons Chronologiques :</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const items = Array.isArray(p.items) ? [...p.items] : [];
                      items.push({
                        id: "tl_" + Date.now(),
                        period: "2026 - Présent",
                        role: { fr: "Nouveau Rôle", en: "New Role", ar: "دور جديد" },
                        title: "Nouveau Rôle",
                        company: "Organisation / Projet",
                        description: {
                          fr: "Détails de la mission...",
                          en: "Mission details...",
                          ar: "تفاصيل المهمة...",
                        },
                        desc: "Détails de la mission...",
                        tags: ["Architecture", "R&D"],
                      });
                      updateProp("items", items);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter un jalon</span>
                  </Button>
                </div>

                {(Array.isArray(p.items) ? p.items : []).map(
                  (item: Record<string, unknown>, idx: number) => (
                    <div key={idx} className="p-3 border rounded-xl bg-card/60 space-y-2 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-primary">Jalon #{idx + 1}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const items = [...(p.items as Record<string, unknown>[])];
                            items.splice(idx, 1);
                            updateProp("items", items);
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Période (ex: 2024 - 2026)"
                          value={String(item.period || "")}
                          onChange={(e) => {
                            const items = [...(p.items as Record<string, unknown>[])];
                            items[idx] = { ...items[idx], period: e.target.value };
                            updateProp("items", items);
                          }}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Entreprise / Organisation"
                          value={String(item.company || "")}
                          onChange={(e) => {
                            const items = [...(p.items as Record<string, unknown>[])];
                            items[idx] = { ...items[idx], company: e.target.value };
                            updateProp("items", items);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>

                      <LocalizedFieldEditor
                        label="Intitulé du poste / Rôle"
                        value={item.role || item.title}
                        onChange={(val) => {
                          const items = [...(p.items as Record<string, unknown>[])];
                          items[idx] = { ...items[idx], role: val, title: getPropStr(val) };
                          updateProp("items", items);
                        }}
                        placeholder="Intitulé du poste"
                      />

                      <LocalizedFieldEditor
                        label="Description des réalisations"
                        value={item.description || item.desc}
                        onChange={(val) => {
                          const items = [...(p.items as Record<string, unknown>[])];
                          items[idx] = { ...items[idx], description: val, desc: getPropStr(val) };
                          updateProp("items", items);
                        }}
                        isTextarea
                        rows={2}
                        placeholder="Détails des réalisations..."
                      />

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Tags (séparés par des virgules) :
                        </Label>
                        <Input
                          placeholder="ex: React, Cloud, Sécurité"
                          value={
                            Array.isArray(item.tags)
                              ? item.tags.join(", ")
                              : String(item.tags || "")
                          }
                          onChange={(e) => {
                            const items = [...(p.items as Record<string, unknown>[])];
                            const tags = e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            items[idx] = { ...items[idx], tags };
                            updateProp("items", items);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* 3. SKILLS MATRIX */}
          {block.type === "skills_matrix" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre de la section Compétences"
                  value={p.title || "Compétences Clés & Technologies"}
                  onChange={(val) => updateProp("title", val)}
                  placeholder="Compétences Clés & Technologies"
                />
                <LocalizedFieldEditor
                  label="Sous-titre descriptif"
                  value={
                    p.subtitle || "Savoir-faire éprouvé sur les stacks et architectures modernes."
                  }
                  onChange={(val) => updateProp("subtitle", val)}
                  placeholder="Savoir-faire éprouvé..."
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Domaines de Compétences :</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const baseList =
                        Array.isArray(p.categories) && p.categories.length > 0
                          ? p.categories
                          : Array.isArray(p.groups) && p.groups.length > 0
                            ? p.groups
                            : [];
                      const next = [...baseList];
                      next.push({
                        id: "cat_" + Date.now(),
                        name: { fr: "Nouveau Domaine", en: "New Domain", ar: "مجال جديد" },
                        category: "Nouveau Domaine",
                        skills: ["Compétence 1", "Compétence 2"],
                      });
                      updateProp("categories", next);
                      updateProp("groups", next);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter un domaine</span>
                  </Button>
                </div>

                {(Array.isArray(p.categories) && p.categories.length > 0
                  ? p.categories
                  : Array.isArray(p.groups) && p.groups.length > 0
                    ? p.groups
                    : []
                ).map((cat: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-3 border rounded-xl bg-card/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-primary">Domaine #{idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const baseList = Array.isArray(p.categories)
                            ? [...p.categories]
                            : [...((p.groups as Record<string, unknown>[]) || [])];
                          baseList.splice(idx, 1);
                          updateProp("categories", baseList);
                          updateProp("groups", baseList);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <LocalizedFieldEditor
                      label="Nom du domaine"
                      value={cat.name || cat.category || cat.title}
                      onChange={(val) => {
                        const baseList = Array.isArray(p.categories)
                          ? [...p.categories]
                          : [...((p.groups as Record<string, unknown>[]) || [])];
                        baseList[idx] = {
                          ...baseList[idx],
                          name: val,
                          category: getPropStr(val),
                          title: getPropStr(val),
                        };
                        updateProp("categories", baseList);
                        updateProp("groups", baseList);
                      }}
                      placeholder="Architecture & Cloud"
                    />

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Compétences (séparées par des virgules) :
                      </Label>
                      <Input
                        placeholder="React, TypeScript, Node.js, Docker, Kubernetes"
                        value={
                          Array.isArray(cat.skills)
                            ? cat.skills.join(", ")
                            : String(cat.skills || "")
                        }
                        onChange={(e) => {
                          const baseList = Array.isArray(p.categories)
                            ? [...p.categories]
                            : [...((p.groups as Record<string, unknown>[]) || [])];
                          const arr = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          baseList[idx] = { ...baseList[idx], skills: arr };
                          updateProp("categories", baseList);
                          updateProp("groups", baseList);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PROJECTS GRID */}
          {block.type === "projects_grid" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre de la section Projets"
                  value={p.title || "Réalisations & Projets Phares"}
                  onChange={(val) => updateProp("title", val)}
                  placeholder="Réalisations & Projets Phares"
                />
                <LocalizedFieldEditor
                  label="Sous-titre descriptif"
                  value={
                    p.subtitle ||
                    "Sélection de travaux d'ingénierie, prototypes et architectures en production."
                  }
                  onChange={(val) => updateProp("subtitle", val)}
                  placeholder="Sélection de travaux..."
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Projets & Réalisations :</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const baseList =
                        Array.isArray(p.items) && p.items.length > 0
                          ? p.items
                          : Array.isArray(p.projects) && p.projects.length > 0
                            ? p.projects
                            : [];
                      const next = [...baseList];
                      next.push({
                        id: "proj_" + Date.now(),
                        title: { fr: "Nouveau Projet", en: "New Project", ar: "مشروع جديد" },
                        description: {
                          fr: "Présentation des réalisations...",
                          en: "Presentation...",
                          ar: "عرض الإنجازات...",
                        },
                        desc: "Présentation des réalisations...",
                        category: "Architecture",
                        tags: ["Cloud", "Souveraineté"],
                        demoUrl: "#",
                        link: "#",
                        codeUrl: "",
                        image: "",
                      });
                      updateProp("items", next);
                      updateProp("projects", next);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter un projet</span>
                  </Button>
                </div>

                {(Array.isArray(p.items) && p.items.length > 0
                  ? p.items
                  : Array.isArray(p.projects) && p.projects.length > 0
                    ? p.projects
                    : []
                ).map((proj: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-3 border rounded-xl bg-card/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-primary">Projet #{idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const baseList = Array.isArray(p.items)
                            ? [...p.items]
                            : [...((p.projects as Record<string, unknown>[]) || [])];
                          baseList.splice(idx, 1);
                          updateProp("items", baseList);
                          updateProp("projects", baseList);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <MediaPickerField
                      label="Visuel de couverture du projet"
                      description="Image de présentation (16:9 recommandé)"
                      value={typeof proj.image === "string" ? proj.image : ""}
                      onChange={(url) => {
                        const baseList = Array.isArray(p.items)
                          ? [...p.items]
                          : [...((p.projects as Record<string, unknown>[]) || [])];
                        baseList[idx] = { ...baseList[idx], image: url };
                        updateProp("items", baseList);
                        updateProp("projects", baseList);
                      }}
                      aspectRatio="video"
                    />

                    <LocalizedFieldEditor
                      label="Titre du projet"
                      value={proj.title}
                      onChange={(val) => {
                        const baseList = Array.isArray(p.items)
                          ? [...p.items]
                          : [...((p.projects as Record<string, unknown>[]) || [])];
                        baseList[idx] = { ...baseList[idx], title: val };
                        updateProp("items", baseList);
                        updateProp("projects", baseList);
                      }}
                      placeholder="Nom du projet"
                    />

                    <LocalizedFieldEditor
                      label="Description détaillée"
                      value={proj.description || proj.desc}
                      onChange={(val) => {
                        const baseList = Array.isArray(p.items)
                          ? [...p.items]
                          : [...((p.projects as Record<string, unknown>[]) || [])];
                        baseList[idx] = {
                          ...baseList[idx],
                          description: val,
                          desc: getPropStr(val),
                        };
                        updateProp("items", baseList);
                        updateProp("projects", baseList);
                      }}
                      isTextarea
                      rows={2}
                      placeholder="Description du projet et résultats obtenus..."
                    />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Catégorie :</Label>
                        <Input
                          placeholder="ex: E-Commerce, R&D"
                          value={String(proj.category || "")}
                          onChange={(e) => {
                            const baseList = Array.isArray(p.items)
                              ? [...p.items]
                              : [...((p.projects as Record<string, unknown>[]) || [])];
                            baseList[idx] = { ...baseList[idx], category: e.target.value };
                            updateProp("items", baseList);
                            updateProp("projects", baseList);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Tags (séparés par virgules) :
                        </Label>
                        <Input
                          placeholder="Cloud, Souveraineté, React"
                          value={
                            Array.isArray(proj.tags)
                              ? proj.tags.join(", ")
                              : String(proj.tags || "")
                          }
                          onChange={(e) => {
                            const baseList = Array.isArray(p.items)
                              ? [...p.items]
                              : [...((p.projects as Record<string, unknown>[]) || [])];
                            const tags = e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            baseList[idx] = { ...baseList[idx], tags };
                            updateProp("items", baseList);
                            updateProp("projects", baseList);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          URL Démo / Production :
                        </Label>
                        <Input
                          placeholder="https://..."
                          value={String(proj.demoUrl || proj.link || "")}
                          onChange={(e) => {
                            const baseList = Array.isArray(p.items)
                              ? [...p.items]
                              : [...((p.projects as Record<string, unknown>[]) || [])];
                            baseList[idx] = {
                              ...baseList[idx],
                              demoUrl: e.target.value,
                              link: e.target.value,
                            };
                            updateProp("items", baseList);
                            updateProp("projects", baseList);
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          URL Code Source (GitHub) :
                        </Label>
                        <Input
                          placeholder="https://github.com/..."
                          value={String(proj.codeUrl || "")}
                          onChange={(e) => {
                            const baseList = Array.isArray(p.items)
                              ? [...p.items]
                              : [...((p.projects as Record<string, unknown>[]) || [])];
                            baseList[idx] = { ...baseList[idx], codeUrl: e.target.value };
                            updateProp("items", baseList);
                            updateProp("projects", baseList);
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. FAQ ACCORDION */}
          {block.type === "faq_accordion" &&
            (() => {
              const currentFaqs =
                Array.isArray(p.faqs) && p.faqs.length > 0
                  ? (p.faqs as Record<string, unknown>[])
                  : Array.isArray(p.items) && p.items.length > 0
                    ? (p.items as Record<string, unknown>[])
                    : (siteContent.contact?.faqs as unknown as Record<string, unknown>[]) || [];

              return (
                <div className="space-y-3">
                  <LocalizedFieldEditor
                    label="Titre de la section FAQ"
                    value={p.title ?? "Foire Aux Questions"}
                    onChange={(val) => updateProp("title", val)}
                    placeholder="Foire Aux Questions"
                  />
                  <LocalizedFieldEditor
                    label="Sous-titre descriptif"
                    value={
                      p.subtitle ??
                      "Retrouvez rapidement les réponses à vos questions les plus courantes."
                    }
                    onChange={(val) => updateProp("subtitle", val)}
                    isTextarea
                    rows={2}
                    placeholder="Retrouvez rapidement les réponses à vos questions les plus courantes."
                  />

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Questions / Réponses de la FAQ :
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const next = [...currentFaqs];
                          next.push({
                            id: "faq_" + Date.now(),
                            question: {
                              fr: "Nouvelle question ?",
                              en: "New question?",
                              ar: "سؤال جديد؟",
                            },
                            answer: {
                              fr: "Réponse détaillée...",
                              en: "Detailed answer...",
                              ar: "إجابة مفصلة...",
                            },
                          });
                          updateProp("faqs", next);
                          updateProp("items", next);
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Ajouter une question</span>
                      </Button>
                    </div>

                    {currentFaqs.map((faq: Record<string, unknown>, idx: number) => {
                      const qVal = faq.question ?? faq.q ?? "";
                      const aVal = faq.answer ?? faq.a ?? "";

                      return (
                        <div
                          key={(faq.id as string) || idx}
                          className="p-2.5 border rounded-lg bg-card/60 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-primary">
                              Question #{idx + 1}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const next = [...currentFaqs];
                                next.splice(idx, 1);
                                updateProp("faqs", next);
                                updateProp("items", next);
                              }}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <LocalizedFieldEditor
                            label="Question posée"
                            value={qVal}
                            onChange={(val) => {
                              const next = [...currentFaqs];
                              next[idx] = { ...next[idx], question: val, q: val };
                              updateProp("faqs", next);
                              updateProp("items", next);
                            }}
                            placeholder="Question posée par le client"
                          />
                          <LocalizedFieldEditor
                            label="Réponse apportée"
                            value={aVal}
                            onChange={(val) => {
                              const next = [...currentFaqs];
                              next[idx] = { ...next[idx], answer: val, a: val };
                              updateProp("faqs", next);
                              updateProp("items", next);
                            }}
                            isTextarea
                            rows={2}
                            placeholder="Réponse apportée..."
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* 6. CATEGORY CARDS / BLOG POSTS */}
          {(block.type === "category_cards" || block.type === "latest_blog_posts") && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre de la section"
                value={p.title}
                onChange={(val) => updateProp("title", val)}
                placeholder={
                  block.type === "category_cards"
                    ? "Explorez par Catégorie"
                    : "Derniers Articles du Blog"
                }
              />
              <LocalizedFieldEditor
                label="Sous-titre descriptif"
                value={p.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                placeholder="Découvrez notre sélection..."
              />
              <div className="space-y-1 max-w-xs">
                <Label className="text-xs font-semibold">
                  Nombre maximum d'éléments affichés :
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={typeof p.max === "number" ? p.max : 4}
                  onChange={(e) => updateProp("max", parseInt(e.target.value, 10) || 4)}
                  className="h-8 text-xs w-28 font-mono"
                />
              </div>
            </div>
          )}

          {/* 7. MARKDOWN SECTION */}
          {block.type === "markdown_section" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre de la section Markdown (Optionnel)"
                value={p.title}
                onChange={(val) => updateProp("title", val)}
                placeholder="Titre de la section"
              />
              <LocalizedFieldEditor
                label="Contenu Markdown (Titres, Images, Listes, Vidéos)"
                value={p.content}
                onChange={(val) => updateProp("content", val)}
                isTextarea
                rows={6}
                placeholder="### Titre de votre section&#10;&#10;Votre contenu rédigé en Markdown..."
              />
            </div>
          )}

          {/* 8. BRAND BANNER (AVEC MEDIAPICKER) */}
          {block.type === "brand_banner" && (
            <div className="space-y-3">
              <MediaPickerField
                label="Visuel de la Bannière Marque"
                description="Sélectionnez l'image de bannière grand format (laisser vide pour la bannière officielle)"
                value={
                  typeof p.bannerSrc === "string" && p.bannerSrc ? p.bannerSrc : archisysBannerSrc
                }
                onChange={(url) => updateProp("bannerSrc", url)}
              />
              <LocalizedFieldEditor
                label="Texte alternatif (Accessibilité & SEO)"
                value={p.altText ?? "StacGate Platform — Conçu et Validé par ArchiSys3.0"}
                onChange={(val) => updateProp("altText", val)}
                placeholder="Description textuelle du visuel"
              />
            </div>
          )}

          {/* 9. FEATURES GRID (NOUVEAU BLOC PHASE 41) */}
          {block.type === "features_grid" &&
            (() => {
              const baseItems =
                Array.isArray(p.items) && p.items.length > 0
                  ? (p.items as Record<string, unknown>[])
                  : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                      string,
                      unknown
                    >[]) || [];

              return (
                <div className="space-y-3">
                  <LocalizedFieldEditor
                    label="Titre de la section"
                    value={p.title ?? defProps.title ?? "Nos Atouts & Piliers Technologiques"}
                    onChange={(val) => updateProp("title", val)}
                    placeholder="Nos Atouts & Piliers Technologiques"
                  />
                  <LocalizedFieldEditor
                    label="Sous-titre d'accompagnement"
                    value={
                      p.subtitle ?? defProps.subtitle ?? "Une vision d'ingénierie sans compromis..."
                    }
                    onChange={(val) => updateProp("subtitle", val)}
                    isTextarea
                    rows={2}
                    placeholder="Une vision d'ingénierie sans compromis..."
                  />
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nombre de colonnes :</Label>
                    <Select
                      value={String(p.columns || "3")}
                      onValueChange={(val) => updateProp("columns", Number(val))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="3 colonnes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Colonnes</SelectItem>
                        <SelectItem value="3">3 Colonnes (Standard)</SelectItem>
                        <SelectItem value="4">4 Colonnes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Cartes de fonctionnalités :</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const items = [...baseItems];
                          items.push({
                            id: "f_" + Date.now(),
                            icon: "rocket",
                            title: {
                              fr: "Nouvelle fonctionnalité",
                              en: "New feature",
                              ar: "ميزة جديدة",
                            },
                            description: {
                              fr: "Description concise de l'atout...",
                              en: "Concise description...",
                              ar: "وصف موجز للميزة...",
                            },
                            link: "",
                          });
                          updateProp("items", items);
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Ajouter une carte</span>
                      </Button>
                    </div>

                    {baseItems.map((item: Record<string, unknown>, idx: number) => (
                      <div
                        key={(item.id as string) || idx}
                        className="p-2.5 border rounded-lg bg-card/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Select
                            value={String(item.icon || "rocket")}
                            onValueChange={(val) => {
                              const items = [...baseItems];
                              items[idx] = { ...items[idx], icon: val };
                              updateProp("items", items);
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px] w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rocket">Fusée</SelectItem>
                              <SelectItem value="shield">Bouclier</SelectItem>
                              <SelectItem value="cpu">Processeur</SelectItem>
                              <SelectItem value="zap">Éclair</SelectItem>
                              <SelectItem value="sparkles">Étoiles</SelectItem>
                              <SelectItem value="globe">Globe</SelectItem>
                              <SelectItem value="code">Code</SelectItem>
                              <SelectItem value="check">Validation</SelectItem>
                            </SelectContent>
                          </Select>

                          <span className="text-[11px] font-bold text-primary flex-1">
                            Carte #{idx + 1}
                          </span>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const items = [...baseItems];
                              items.splice(idx, 1);
                              updateProp("items", items);
                            }}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <LocalizedFieldEditor
                          label="Titre de la carte"
                          value={item.title}
                          onChange={(val) => {
                            const items = [...baseItems];
                            items[idx] = { ...items[idx], title: val };
                            updateProp("items", items);
                          }}
                          placeholder="Titre de la carte"
                        />

                        <LocalizedFieldEditor
                          label="Description"
                          value={item.description}
                          onChange={(val) => {
                            const items = [...baseItems];
                            items[idx] = { ...items[idx], description: val };
                            updateProp("items", items);
                          }}
                          isTextarea
                          rows={2}
                          placeholder="Description de la fonctionnalité..."
                        />

                        <Input
                          placeholder="Lien d'action (optionnel, ex: /catalogue)"
                          value={String(item.link || "")}
                          onChange={(e) => {
                            const items = [...baseItems];
                            items[idx] = { ...items[idx], link: e.target.value };
                            updateProp("items", items);
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          {/* 10. PRICING TABLE (NOUVEAU BLOC PHASE 41) */}
          {block.type === "pricing_table" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre de la section tarifs"
                  value={p.title || "Nos Offres & Solutions"}
                  onChange={(val) => updateProp("title", val)}
                  placeholder="Nos Offres & Solutions"
                />
                <LocalizedFieldEditor
                  label="Sous-titre descriptif"
                  value={p.subtitle || "Formules transparentes adaptées à vos objectifs"}
                  onChange={(val) => updateProp("subtitle", val)}
                  placeholder="Formules transparentes..."
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Plans tarifaires :</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const basePlans =
                        Array.isArray(p.plans) && p.plans.length > 0
                          ? p.plans
                          : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                              string,
                              unknown
                            >[]) || [];
                      const plans = [...basePlans];
                      plans.push({
                        id: "p_" + Date.now(),
                        name: { fr: "Nouveau Plan", en: "New Plan", ar: "خطة جديدة" },
                        price: "99 000 DZD",
                        period: { fr: "/ projet", en: "/ project", ar: "/ مشروع" },
                        popular: false,
                        features: ["Fonctionnalité 1", "Fonctionnalité 2"],
                        ctaText: { fr: "Choisir", en: "Select", ar: "اختيار" },
                        ctaLink: "/contact",
                      });
                      updateProp("plans", plans);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter un plan</span>
                  </Button>
                </div>

                {(Array.isArray(p.plans) && p.plans.length > 0
                  ? p.plans
                  : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                      string,
                      unknown
                    >[]) || []
                ).map((plan: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-3 border rounded-xl bg-card/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-primary">Offre #{idx + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans.splice(idx, 1);
                          updateProp("plans", plans);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <LocalizedFieldEditor
                        label="Nom de l'offre"
                        value={plan.name}
                        onChange={(val) => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], name: val };
                          updateProp("plans", plans);
                        }}
                        placeholder="Starter / Pro / Entreprise"
                      />

                      <LocalizedFieldEditor
                        label="Période de facturation"
                        value={plan.period}
                        onChange={(val) => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], period: val };
                          updateProp("plans", plans);
                        }}
                        placeholder="/ mois ou / projet"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Tarif affiché :</Label>
                        <Input
                          placeholder="Prix (ex: 49 000 DZD)"
                          value={String(plan.price || "")}
                          onChange={(e) => {
                            const basePlans =
                              Array.isArray(p.plans) && p.plans.length > 0
                                ? p.plans
                                : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                    string,
                                    unknown
                                  >[]) || [];
                            const plans = [...basePlans];
                            plans[idx] = { ...plans[idx], price: e.target.value };
                            updateProp("plans", plans);
                          }}
                          className="h-7 text-xs font-semibold"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Mettre en avant :
                        </span>
                        <Switch
                          checked={Boolean(plan.popular)}
                          onCheckedChange={(val) => {
                            const basePlans =
                              Array.isArray(p.plans) && p.plans.length > 0
                                ? p.plans
                                : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                    string,
                                    unknown
                                  >[]) || [];
                            const plans = [...basePlans];
                            plans[idx] = { ...plans[idx], popular: val };
                            updateProp("plans", plans);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Liste des avantages (1 ligne par point fort) :
                      </Label>
                      <Textarea
                        rows={3}
                        value={
                          Array.isArray(plan.features)
                            ? plan.features.map((f) => getPropStr(f)).join("\n")
                            : ""
                        }
                        onChange={(e) => {
                          const lines = e.target.value
                            .split("\n")
                            .filter((l) => l.trim().length > 0);
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], features: lines };
                          updateProp("plans", plans);
                        }}
                        placeholder="Architecture optimisée&#10;Support garanti&#10;Mises à jour..."
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <LocalizedFieldEditor
                        label="Libellé bouton CTA"
                        value={plan.ctaText}
                        onChange={(val) => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], ctaText: val };
                          updateProp("plans", plans);
                        }}
                        placeholder="Choisir l'offre"
                      />
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Lien CTA :</Label>
                        <Input
                          placeholder="/contact"
                          value={String(plan.ctaLink || "")}
                          onChange={(e) => {
                            const basePlans =
                              Array.isArray(p.plans) && p.plans.length > 0
                                ? p.plans
                                : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                    string,
                                    unknown
                                  >[]) || [];
                            const plans = [...basePlans];
                            plans[idx] = { ...plans[idx], ctaLink: e.target.value };
                            updateProp("plans", plans);
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. QUOTE STAR (NOUVEAU BLOC PHASE 41) */}
          {block.type === "quote_star" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Texte du témoignage / Citation"
                value={p.quote}
                onChange={(val) => updateProp("quote", val)}
                isTextarea
                rows={3}
                placeholder="« Un travail d'ingénierie exemplaire et une fiabilité totale. »"
              />
              <div className="grid grid-cols-2 gap-2">
                <LocalizedFieldEditor
                  label="Nom de l'auteur"
                  value={p.author}
                  onChange={(val) => updateProp("author", val)}
                  placeholder="Dr. Salim B."
                />
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Note Étoiles (1-5) :</Label>
                  <Select
                    value={String(p.rating || "5")}
                    onValueChange={(val) => updateProp("rating", Number(val))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="5 étoiles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">⭐⭐⭐⭐⭐ (5/5)</SelectItem>
                      <SelectItem value="4">⭐⭐⭐⭐ (4/5)</SelectItem>
                      <SelectItem value="3">⭐⭐⭐ (3/5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <LocalizedFieldEditor
                label="Fonction & Entreprise"
                value={p.role}
                onChange={(val) => updateProp("role", val)}
                placeholder="Directeur des Systèmes d'Information"
              />
              <MediaPickerField
                label="Photo ou Avatar de l'auteur"
                description="Visuel de portrait (laisser vide pour les initiales)"
                value={typeof p.avatarSrc === "string" ? p.avatarSrc : ""}
                onChange={(url) => updateProp("avatarSrc", url)}
                aspectRatio="square"
              />
            </div>
          )}

          {/* 12. FULL WIDTH BANNER (NOUVEAU BLOC PHASE 41) */}
          {block.type === "full_width_banner" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre de la bannière"
                value={p.title}
                onChange={(val) => updateProp("title", val)}
                placeholder="Construisez votre Écosystème Haute Performance"
              />
              <LocalizedFieldEditor
                label="Sous-titre descriptif"
                value={p.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                isTextarea
                rows={2}
                placeholder="Une solution technologique souveraine et modulaire..."
              />

              <MediaPickerField
                label="Image d'arrière-plan de la bannière"
                description="Image panoramique haute définition (laisser vide pour la bannière par défaut)"
                value={
                  typeof p.bannerSrc === "string" && p.bannerSrc ? p.bannerSrc : archisysBannerSrc
                }
                onChange={(url) => updateProp("bannerSrc", url)}
              />

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Hauteur de la bannière :</Label>
                <Select
                  value={String(p.height || "normal")}
                  onValueChange={(val) => updateProp("height", val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Normale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacte (280px)</SelectItem>
                    <SelectItem value="normal">Standard (360px)</SelectItem>
                    <SelectItem value="ample">Ample & Majestueuse (480px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-2">
                  <LocalizedFieldEditor
                    label="Bouton CTA Principal"
                    value={p.primaryCtaText}
                    onChange={(val) => updateProp("primaryCtaText", val)}
                    placeholder="Découvrir"
                  />
                  <Input
                    value={String(p.primaryCtaLink || "")}
                    onChange={(e) => updateProp("primaryCtaLink", e.target.value)}
                    placeholder="/catalogue"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <LocalizedFieldEditor
                    label="Bouton CTA Secondaire"
                    value={p.secondaryCtaText}
                    onChange={(val) => updateProp("secondaryCtaText", val)}
                    placeholder="Nous contacter"
                  />
                  <Input
                    value={String(p.secondaryCtaLink || "")}
                    onChange={(e) => updateProp("secondaryCtaLink", e.target.value)}
                    placeholder="/contact"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 13. VISUAL SPACER (NOUVEAU BLOC PHASE 41) */}
          {block.type === "visual_spacer" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Hauteur d'espacement (en pixels) :</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={12}
                    max={240}
                    step={4}
                    value={Number(p.height) || 48}
                    onChange={(e) => updateProp("height", Number(e.target.value))}
                    className="h-8 text-xs w-28 font-mono"
                  />
                  <span className="text-xs text-muted-foreground">pixels</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Ligne de séparation visuelle</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Trace un filet décoratif au centre de l'espace
                  </p>
                </div>
                <Switch
                  checked={Boolean(p.showDivider)}
                  onCheckedChange={(val) => updateProp("showDivider", val)}
                />
              </div>

              {Boolean(p.showDivider) && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold">Style du séparateur :</Label>
                  <Select
                    value={String(p.dividerStyle || "subtle")}
                    onValueChange={(val) => updateProp("dividerStyle", val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Discret" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Discret (Gris doux)</SelectItem>
                      <SelectItem value="accent">Accent (Couleur primaire)</SelectItem>
                      <SelectItem value="dashed">Pointillés (Tirets)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* 14. BUILDER TEASER (PHASE 43) */}
          {block.type === "builder_teaser" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <LocalizedFieldEditor
                  label="Titre principal"
                  value={p.title ?? siteContent.builderTeaser?.title}
                  onChange={(val) => updateProp("title", val)}
                  placeholder="Concevez votre PC sur Mesure"
                />
                <LocalizedFieldEditor
                  label="Badge d'accroche"
                  value={p.badge ?? siteContent.builderTeaser?.badge}
                  onChange={(val) => updateProp("badge", val)}
                  placeholder="Configurateur 3D"
                />
              </div>

              <LocalizedFieldEditor
                label="Sous-titre / Description"
                value={p.subtitle ?? siteContent.builderTeaser?.subtitle}
                onChange={(val) => updateProp("subtitle", val)}
                isTextarea
                rows={2}
                placeholder="Choisissez chaque composant selon vos besoins..."
              />

              <MediaPickerField
                label="Image d'arrière-plan du teaser"
                description="Image de fond haute résolution pour le teaser du configurateur (laisser vide pour la bannière par défaut)"
                value={
                  typeof p.bannerSrc === "string" && p.bannerSrc ? p.bannerSrc : archisysBannerSrc
                }
                onChange={(url) => updateProp("bannerSrc", url)}
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <LocalizedFieldEditor
                  label="Texte du bouton CTA"
                  value={
                    (p.cta as Record<string, unknown>)?.label ??
                    p.ctaLabel ??
                    siteContent.builderTeaser?.cta?.label
                  }
                  onChange={(val) => {
                    const cta = (p.cta as Record<string, unknown>) || {};
                    updateProp("cta", { ...cta, label: val });
                    updateProp("ctaLabel", val);
                  }}
                  placeholder="Lancer le configurateur"
                />
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lien URL du CTA :</Label>
                  <Input
                    value={
                      String((p.cta as Record<string, unknown>)?.href || "") ||
                      String(p.ctaHref || "") ||
                      siteContent.builderTeaser?.cta?.href ||
                      "/builder"
                    }
                    onChange={(e) => {
                      const cta = (p.cta as Record<string, unknown>) || {};
                      updateProp("cta", { ...cta, href: e.target.value });
                      updateProp("ctaHref", e.target.value);
                    }}
                    placeholder="/builder"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 15. COMPANY HISTORY (PHASE 43) */}
          {block.type === "company_history" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre Historique"
                value={p.historyTitle ?? siteContent.about?.historyTitle}
                onChange={(val) => updateProp("historyTitle", val)}
                placeholder="Notre Histoire"
              />
              <LocalizedFieldEditor
                label="Corps du texte Historique"
                value={p.historyBody ?? siteContent.about?.historyBody}
                onChange={(val) => updateProp("historyBody", val)}
                isTextarea
                rows={4}
                placeholder="Fondée avec la volonté d'offrir des solutions souveraines..."
              />

              <div className="pt-2 border-t border-border/40 space-y-3">
                <LocalizedFieldEditor
                  label="Titre Mission"
                  value={p.missionTitle ?? siteContent.about?.missionTitle}
                  onChange={(val) => updateProp("missionTitle", val)}
                  placeholder="Notre Mission"
                />
                <LocalizedFieldEditor
                  label="Corps du texte Mission"
                  value={p.missionBody ?? siteContent.about?.missionBody}
                  onChange={(val) => updateProp("missionBody", val)}
                  isTextarea
                  rows={4}
                  placeholder="Rendre la haute technologie accessible et durable..."
                />
              </div>
            </div>
          )}

          {/* 16. VALUES GRID (PHASE 43) */}
          {block.type === "values_grid" &&
            (() => {
              const baseValues =
                Array.isArray(p.values) && p.values.length > 0
                  ? (p.values as Record<string, unknown>[])
                  : (siteContent.about?.values as Record<string, unknown>[]) || [];

              return (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Cartes de Valeurs d'Entreprise :
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const values = [...baseValues];
                          values.push({
                            id: "val_" + Date.now(),
                            icon: "shield",
                            title: { fr: "Nouvelle Valeur", en: "New Value", ar: "قيمة جديدة" },
                            description: {
                              fr: "Description de la valeur d'entreprise...",
                              en: "Company value description...",
                              ar: "وصف قيمة الشركة...",
                            },
                          });
                          updateProp("values", values);
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Ajouter une valeur</span>
                      </Button>
                    </div>

                    {baseValues.map((valItem: Record<string, unknown>, idx: number) => (
                      <div
                        key={(valItem.id as string) || idx}
                        className="p-2.5 border rounded-lg bg-card/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Select
                            value={String(valItem.icon || "shield")}
                            onValueChange={(val) => {
                              const values = [...baseValues];
                              values[idx] = { ...valItem, icon: val };
                              updateProp("values", values);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shield">🛡️ Bouclier (Garantie)</SelectItem>
                              <SelectItem value="truck">🚚 Camion (Livraison)</SelectItem>
                              <SelectItem value="headphones">🎧 Casque (Support)</SelectItem>
                              <SelectItem value="award">🏆 Trophée (Excellence)</SelectItem>
                              <SelectItem value="star">⭐ Étoile (Qualité)</SelectItem>
                              <SelectItem value="heart">❤️ Cœur (Passion)</SelectItem>
                            </SelectContent>
                          </Select>

                          <span className="text-[11px] font-bold text-primary flex-1">
                            Valeur #{idx + 1}
                          </span>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const values = [...baseValues];
                              values.splice(idx, 1);
                              updateProp("values", values);
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <LocalizedFieldEditor
                          label="Titre de la valeur"
                          value={valItem.title}
                          onChange={(val) => {
                            const values = [...baseValues];
                            values[idx] = { ...valItem, title: val };
                            updateProp("values", values);
                          }}
                          placeholder="Titre de la valeur"
                        />

                        <LocalizedFieldEditor
                          label="Description de la valeur"
                          value={valItem.description}
                          onChange={(val) => {
                            const values = [...baseValues];
                            values[idx] = { ...valItem, description: val };
                            updateProp("values", values);
                          }}
                          isTextarea
                          rows={2}
                          placeholder="Description de la valeur..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          {/* 17. CONTACT FORM (PHASE 43) */}
          {block.type === "contact_form" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre du formulaire"
                value={p.title ?? "Envoyez-nous un message"}
                onChange={(val) => updateProp("title", val)}
                placeholder="Envoyez-nous un message"
              />
              <LocalizedFieldEditor
                label="Sous-titre / Chapô"
                value={
                  p.subtitle ?? "Une question, un devis ou un projet ? Remplissez ce formulaire..."
                }
                onChange={(val) => updateProp("subtitle", val)}
                isTextarea
                rows={2}
                placeholder="Une question, un devis ou un projet ? Remplissez ce formulaire..."
              />
              <LocalizedFieldEditor
                label="Libellé du bouton d'envoi"
                value={p.submitText ?? "Envoyer le message"}
                onChange={(val) => updateProp("submitText", val)}
                placeholder="Envoyer le message"
              />
            </div>
          )}

          {/* 18. DIRECT CONTACT CARDS (PHASE 43) */}
          {block.type === "direct_contact_cards" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Numéro de téléphone :</Label>
                <Input
                  value={String(p.contactPhone || siteSettings?.contactPhone || "")}
                  onChange={(e) => updateProp("contactPhone", e.target.value)}
                  placeholder="ex: +213 555 12 34 56"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Numéro WhatsApp :</Label>
                <Input
                  value={String(p.whatsapp || siteSettings?.whatsapp || "")}
                  onChange={(e) => updateProp("whatsapp", e.target.value)}
                  placeholder="ex: +213 661 00 00 00"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Adresse Email :</Label>
                <Input
                  value={String(p.contactEmail || siteSettings?.contactEmail || "")}
                  onChange={(e) => updateProp("contactEmail", e.target.value)}
                  placeholder="contact@entreprise.com"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Adresse physique :</Label>
                <Input
                  value={String(p.address || siteSettings?.address || "")}
                  onChange={(e) => updateProp("address", e.target.value)}
                  placeholder="123 Boulevard Technologique, Alger"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Horaires d'ouverture :</Label>
                <Input
                  value={String(p.hours || siteSettings?.hours || "")}
                  onChange={(e) => updateProp("hours", e.target.value)}
                  placeholder="Dimanche - Jeudi : 08h30 - 17h00"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* 19. TICKER BAR (PHASE 43) */}
          {block.type === "ticker_bar" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Vitesse de défilement :</Label>
                <Select
                  value={String(p.speed || "normal")}
                  onValueChange={(val) => updateProp("speed", val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Standard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Lente (Fluide & Posée)</SelectItem>
                    <SelectItem value="normal">Standard (Recommandé)</SelectItem>
                    <SelectItem value="fast">Rapide (Dynamique)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Messages Défilants :</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const msgs = Array.isArray(p.messages) ? [...(p.messages as string[])] : [];
                      msgs.push("Nouveau message d'annonce...");
                      updateProp("messages", msgs);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter un message</span>
                  </Button>
                </div>

                {(Array.isArray(p.messages) && p.messages.length > 0
                  ? (p.messages as string[])
                  : []
                ).map((msgText: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={msgText}
                      onChange={(e) => {
                        const msgs = [...(p.messages as string[])];
                        msgs[idx] = e.target.value;
                        updateProp("messages", msgs);
                      }}
                      placeholder="Texte du bandeau défilant..."
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const msgs = [...(p.messages as string[])];
                        msgs.splice(idx, 1);
                        updateProp("messages", msgs);
                      }}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {(!Array.isArray(p.messages) || p.messages.length === 0) && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Utilise les messages globaux définis dans les réglages du site.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 20. PROMO BANNER (PHASE 43) */}
          {block.type === "promo_banner" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Texte du bandeau promotionnel :</Label>
                <Input
                  value={String(p.text || siteSettings?.promoBannerText || "")}
                  onChange={(e) => updateProp("text", e.target.value)}
                  placeholder="Profitez de -15% sur toutes les stations de travail !"
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Code Promotionnel :</Label>
                  <Input
                    value={String(p.code || "KATECH15")}
                    onChange={(e) => updateProp("code", e.target.value)}
                    placeholder="ex: KATECH15"
                    className="h-7 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Libellé du Bouton :</Label>
                  <Input
                    value={String(p.label || siteSettings?.promoBannerLabel || "")}
                    onChange={(e) => updateProp("label", e.target.value)}
                    placeholder="En profiter"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Lien URL de redirection :</Label>
                <Input
                  value={String(p.href || siteSettings?.promoBannerHref || "/category/solutions")}
                  onChange={(e) => updateProp("href", e.target.value)}
                  placeholder="/category/solutions"
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* 21. USE CHIPS (SOUS-PHASE 43.1) */}
          {block.type === "use_chips" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre de la section d'usages"
                value={p.title ?? siteContent.useChips?.title}
                onChange={(val) => updateProp("title", val)}
                placeholder="Trouvez l'équipement adapté à votre métier"
              />
              <p className="text-[11px] text-muted-foreground italic">
                Ce bloc affiche automatiquement les puces filtrables de cas d'usage (Gaming, R&D,
                Bureautique, Création) associées aux produits du catalogue.
              </p>
            </div>
          )}

          {/* 22. BRANDS MARQUEE (SOUS-PHASE 43.1) */}
          {block.type === "brands_marquee" && (
            <div className="space-y-3">
              <LocalizedFieldEditor
                label="Titre du bandeau de défilement"
                value={p.title ?? siteContent.brandsMarquee?.title}
                onChange={(val) => updateProp("title", val)}
                placeholder="Marques & Partenaires Officiels"
              />
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Vitesse de défilement :</Label>
                <Select
                  value={String(p.speed || "fast")}
                  onValueChange={(val) => updateProp("speed", val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Vitesse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow" className="text-xs">
                      Lente (fluide & posée)
                    </SelectItem>
                    <SelectItem value="normal" className="text-xs">
                      Normale (standard vitrine)
                    </SelectItem>
                    <SelectItem value="fast" className="text-xs">
                      Rapide (dynamique)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
