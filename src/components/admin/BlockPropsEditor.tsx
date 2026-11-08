import { useState } from "react";
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
import { useSiteContent } from "@/data-provider";
import { useLocalize } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

export function BlockPropsEditor({ block, onChange, onStyleChange }: BlockPropsEditorProps) {
  const p = block.props || {};
  const s = block.style || {};
  const [activeTab, setActiveTab] = useState<"content" | "style" | "json">("content");
  const [rawJson, setRawJson] = useState(() => JSON.stringify(p, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data: siteContent } = useSiteContent();
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
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Titre Ligne 1 :</Label>
                  <Input
                    value={getPropStr(p.title1) || L(siteContent.hero.title1) || ""}
                    onChange={(e) => updateProp("title1", e.target.value)}
                    placeholder="Plateforme E-Commerce"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Titre Ligne 2 (Glow) :</Label>
                  <Input
                    value={getPropStr(p.title2) || L(siteContent.hero.title2) || ""}
                    onChange={(e) => updateProp("title2", e.target.value)}
                    placeholder="Nouvelle Génération"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre / Slogan :</Label>
                <Textarea
                  rows={2}
                  value={getPropStr(p.subtitle) || L(siteContent.hero.subtitle) || ""}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Boutique officielle avec livraison 58 wilayas..."
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Badge d'accroche :</Label>
                <Input
                  value={getPropStr(p.badge) || L(siteContent.hero.badge) || ""}
                  onChange={(e) => updateProp("badge", e.target.value)}
                  placeholder="Offre spéciale"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 pt-1">
                <MediaPickerField
                  label="Image personnalisée du Hero"
                  description="Visuel principal d'illustration (laisser vide pour l'image officielle par défaut)"
                  value={typeof p.imageSrc === "string" ? p.imageSrc : ""}
                  onChange={(url) => updateProp("imageSrc", url)}
                />
              </div>
            </div>
          )}

          {/* B. VENTE FLASH */}
          {block.type === "flash_sale" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Titre Promotionnel :</Label>
                  <Input
                    value={getPropStr(p.title) || L(siteContent.flashSale.title) || ""}
                    onChange={(e) => updateProp("title", e.target.value)}
                    placeholder="Offres de la semaine"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Badge Flamme :</Label>
                  <Input
                    value={getPropStr(p.badge) || L(siteContent.flashSale.badge) || ""}
                    onChange={(e) => updateProp("badge", e.target.value)}
                    placeholder="VENTE FLASH"
                    className="h-8 text-xs"
                  />
                </div>
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
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Titre de la section :</Label>
                <Input
                  value={
                    getPropStr(p.title) ||
                    (block.type === "best_sellers"
                      ? L(siteContent.bestSellers.title)
                      : L(siteContent.featuredTabs.title)) ||
                    ""
                  }
                  onChange={(e) => updateProp("title", e.target.value)}
                  placeholder="Nos Meilleurs Produits"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre explicatif :</Label>
                <Input
                  value={
                    getPropStr(p.subtitle) ||
                    (block.type === "best_sellers"
                      ? L(siteContent.bestSellers.subtitle)
                      : L(siteContent.featuredTabs.subtitle)) ||
                    ""
                  }
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Sélectionnés par nos experts"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* D. WHY US / RÉASSURANCE */}
          {block.type === "why_us" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Titre Ligne 1 :</Label>
                  <Input
                    value={getPropStr(p.title1) || L(siteContent.whyUs.title1) || ""}
                    onChange={(e) => updateProp("title1", e.target.value)}
                    placeholder="Pourquoi nous"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Titre Ligne 2 :</Label>
                  <Input
                    value={getPropStr(p.title2) || L(siteContent.whyUs.title2) || ""}
                    onChange={(e) => updateProp("title2", e.target.value)}
                    placeholder="faire confiance"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre / Argumentaire :</Label>
                <Textarea
                  rows={2}
                  value={getPropStr(p.subtitle) || L(siteContent.whyUs.subtitle) || ""}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Garantie constructeur, livraison express, service client dédié..."
                  className="text-xs"
                />
              </div>

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
                        title: "Nouvelle garantie",
                        description: "Description de la garantie ou du service...",
                      });
                      updateProp("items", currentItems);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Ajouter une carte</span>
                  </Button>
                </div>

                {(Array.isArray(p.items) ? p.items : siteContent.whyUs?.items || []).map(
                  (card: Record<string, unknown>, idx: number) => (
                    <div
                      key={(card.id as string) || idx}
                      className="p-2.5 border rounded-lg bg-card/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          placeholder="Titre de la réassurance"
                          value={getPropStr(card.title)}
                          onChange={(e) => {
                            const current = Array.isArray(p.items)
                              ? [...p.items]
                              : [...(siteContent.whyUs?.items || [])];
                            current[idx] = { ...current[idx], title: e.target.value };
                            updateProp("items", current);
                          }}
                          className="h-7 text-xs font-semibold flex-1"
                        />
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
                      <Textarea
                        rows={2}
                        placeholder="Description de la réassurance..."
                        value={getPropStr(card.description)}
                        onChange={(e) => {
                          const current = Array.isArray(p.items)
                            ? [...p.items]
                            : [...(siteContent.whyUs?.items || [])];
                          current[idx] = { ...current[idx], description: e.target.value };
                          updateProp("items", current);
                        }}
                        className="text-xs"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* E. REVIEWS / AVIS CLIENTS */}
          {block.type === "reviews_grid" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Titre de la section Avis :</Label>
                <Input
                  value={getPropStr(p.title) || L(siteContent.reviews.title) || ""}
                  onChange={(e) => updateProp("title", e.target.value)}
                  placeholder="Ce que disent nos clients"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre :</Label>
                <Input
                  value={getPropStr(p.subtitle) || L(siteContent.reviews.subtitle) || ""}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Avis vérifiés et retours d'expérience"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* F. CONTACT CTA */}
          {block.type === "contact_cta" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Titre d'accroche :</Label>
                <Input
                  value={getPropStr(p.title) || L(siteContent.contactCta.title) || ""}
                  onChange={(e) => updateProp("title", e.target.value)}
                  placeholder="Besoin d'un conseil personnalisé ?"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Texte explicatif :</Label>
                <Input
                  value={getPropStr(p.subtitle) || L(siteContent.contactCta.subtitle) || ""}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Nos techniciens répondent directement sur WhatsApp"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* 1. PROFILE HERO */}
          {block.type === "profile_hero" && (
            <div className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nom complet affiché :</Label>
                  <Input
                    value={getPropStr(p.name)}
                    onChange={(e) => updateProp("name", e.target.value)}
                    placeholder="ArchiSys3.0"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Rôle professionnel / Titre :</Label>
                  <Input
                    value={getPropStr(p.role)}
                    onChange={(e) => updateProp("role", e.target.value)}
                    placeholder="Architecte Logiciel & Consultant R&D"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Biographie / Présentation :</Label>
                <Textarea
                  rows={2}
                  value={getPropStr(p.bio)}
                  onChange={(e) => updateProp("bio", e.target.value)}
                  placeholder="Expertise en architectures logicielles souveraines, cloud, web moderne..."
                  className="text-xs"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Badge de Disponibilité :</Label>
                  <Input
                    value={getPropStr(p.availability)}
                    onChange={(e) => updateProp("availability", e.target.value)}
                    placeholder="Disponible pour missions d'architecture & R&D"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Localisation :</Label>
                  <Input
                    value={getPropStr(p.location)}
                    onChange={(e) => updateProp("location", e.target.value)}
                    placeholder="Alger, Algérie / Remote"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. TIMELINE */}
          {block.type === "timeline" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Étapes / Expériences :</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const items = Array.isArray(p.items) ? [...p.items] : [];
                    items.push({
                      period: "2026 - Présent",
                      title: "Nouveau Rôle",
                      company: "Organisation",
                      desc: "Description de la mission...",
                    });
                    updateProp("items", items);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Ajouter une étape</span>
                </Button>
              </div>

              {(Array.isArray(p.items) ? p.items : []).map(
                (item: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-2.5 border rounded-lg bg-card/60 space-y-2 relative">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-primary">Étape #{idx + 1}</span>
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
                        placeholder="Entreprise / Cadre"
                        value={String(item.company || "")}
                        onChange={(e) => {
                          const items = [...(p.items as Record<string, unknown>[])];
                          items[idx] = { ...items[idx], company: e.target.value };
                          updateProp("items", items);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                    <Input
                      placeholder="Intitulé du poste / Mission"
                      value={String(item.title || "")}
                      onChange={(e) => {
                        const items = [...(p.items as Record<string, unknown>[])];
                        items[idx] = { ...items[idx], title: e.target.value };
                        updateProp("items", items);
                      }}
                      className="h-7 text-xs font-semibold"
                    />
                    <Textarea
                      rows={2}
                      placeholder="Détails des réalisations..."
                      value={String(item.desc || "")}
                      onChange={(e) => {
                        const items = [...(p.items as Record<string, unknown>[])];
                        items[idx] = { ...items[idx], desc: e.target.value };
                        updateProp("items", items);
                      }}
                      className="text-xs"
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {/* 3. SKILLS MATRIX */}
          {block.type === "skills_matrix" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Groupes de compétences :</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const groups = Array.isArray(p.groups) ? [...p.groups] : [];
                    groups.push({
                      category: "Nouveau Domaine",
                      skills: ["Compétence 1", "Compétence 2"],
                    });
                    updateProp("groups", groups);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Ajouter un domaine</span>
                </Button>
              </div>

              {(Array.isArray(p.groups) ? p.groups : []).map(
                (group: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-2.5 border rounded-lg bg-card/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Nom du domaine (ex: Architecture & Cloud)"
                        value={String(group.category || "")}
                        onChange={(e) => {
                          const groups = [...(p.groups as Record<string, unknown>[])];
                          groups[idx] = { ...groups[idx], category: e.target.value };
                          updateProp("groups", groups);
                        }}
                        className="h-7 text-xs font-semibold"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const groups = [...(p.groups as Record<string, unknown>[])];
                          groups.splice(idx, 1);
                          updateProp("groups", groups);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Compétences séparées par des virgules (ex: React, Node, Docker)"
                      value={
                        Array.isArray(group.skills)
                          ? group.skills.join(", ")
                          : String(group.skills || "")
                      }
                      onChange={(e) => {
                        const groups = [...(p.groups as Record<string, unknown>[])];
                        const arr = e.target.value.split(",").map((s) => s.trim());
                        groups[idx] = { ...groups[idx], skills: arr };
                        updateProp("groups", groups);
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {/* 4. PROJECTS GRID */}
          {block.type === "projects_grid" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Projets & Réalisations :</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const projects = Array.isArray(p.projects) ? [...p.projects] : [];
                    projects.push({
                      title: "Nouveau Projet",
                      category: "Architecture",
                      desc: "Présentation des réalisations...",
                      link: "#",
                      tags: ["Cloud", "Souveraineté"],
                    });
                    updateProp("projects", projects);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Ajouter un projet</span>
                </Button>
              </div>

              {(Array.isArray(p.projects) ? p.projects : []).map(
                (proj: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-2.5 border rounded-lg bg-card/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Nom du projet"
                        value={String(proj.title || "")}
                        onChange={(e) => {
                          const projects = [...(p.projects as Record<string, unknown>[])];
                          projects[idx] = { ...projects[idx], title: e.target.value };
                          updateProp("projects", projects);
                        }}
                        className="h-7 text-xs font-semibold"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const projects = [...(p.projects as Record<string, unknown>[])];
                          projects.splice(idx, 1);
                          updateProp("projects", projects);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Catégorie (ex: E-Commerce, R&D)"
                        value={String(proj.category || "")}
                        onChange={(e) => {
                          const projects = [...(p.projects as Record<string, unknown>[])];
                          projects[idx] = { ...projects[idx], category: e.target.value };
                          updateProp("projects", projects);
                        }}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="Lien / URL (ex: https://...)"
                        value={String(proj.link || "")}
                        onChange={(e) => {
                          const projects = [...(p.projects as Record<string, unknown>[])];
                          projects[idx] = { ...projects[idx], link: e.target.value };
                          updateProp("projects", projects);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Description du projet et résultats obtenus..."
                      value={String(proj.desc || "")}
                      onChange={(e) => {
                        const projects = [...(p.projects as Record<string, unknown>[])];
                        projects[idx] = { ...projects[idx], desc: e.target.value };
                        updateProp("projects", projects);
                      }}
                      className="text-xs"
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {/* 5. FAQ ACCORDION */}
          {block.type === "faq_accordion" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Questions / Réponses de la FAQ :</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const items = Array.isArray(p.items) ? [...p.items] : [];
                    items.push({
                      q: "Nouvelle question ?",
                      a: "Réponse détaillée...",
                    });
                    updateProp("items", items);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Ajouter une question</span>
                </Button>
              </div>

              {(Array.isArray(p.items) ? p.items : []).map(
                (faq: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-2.5 border rounded-lg bg-card/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Question posée par le client"
                        value={String(faq.q || "")}
                        onChange={(e) => {
                          const items = [...(p.items as Record<string, unknown>[])];
                          items[idx] = { ...items[idx], q: e.target.value };
                          updateProp("items", items);
                        }}
                        className="h-7 text-xs font-semibold"
                      />
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
                    <Textarea
                      rows={2}
                      placeholder="Réponse apportée..."
                      value={String(faq.a || "")}
                      onChange={(e) => {
                        const items = [...(p.items as Record<string, unknown>[])];
                        items[idx] = { ...items[idx], a: e.target.value };
                        updateProp("items", items);
                      }}
                      className="text-xs"
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {/* 6. CATEGORY CARDS / BLOG POSTS */}
          {(block.type === "category_cards" || block.type === "latest_blog_posts") && (
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs font-semibold">Nombre maximum d'éléments affichés :</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={typeof p.max === "number" ? p.max : 4}
                onChange={(e) => updateProp("max", parseInt(e.target.value, 10) || 4)}
                className="h-8 text-xs w-28 font-mono"
              />
            </div>
          )}

          {/* 7. MARKDOWN SECTION */}
          {block.type === "markdown_section" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Contenu Markdown (Titres, Images, Listes, Vidéos YouTube) :
              </Label>
              <Textarea
                rows={5}
                value={getPropStr(p.content)}
                onChange={(e) => updateProp("content", e.target.value)}
                placeholder="### Titre de votre section&#10;&#10;Votre contenu rédigé en Markdown..."
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* 8. BRAND BANNER (AVEC MEDIAPICKER) */}
          {block.type === "brand_banner" && (
            <div className="space-y-3">
              <MediaPickerField
                label="Visuel de la Bannière Marque"
                description="Sélectionnez l'image de bannière grand format (laisser vide pour la bannière officielle)"
                value={typeof p.bannerSrc === "string" ? p.bannerSrc : ""}
                onChange={(url) => updateProp("bannerSrc", url)}
              />
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  Texte alternatif (Accessibilité & SEO) :
                </Label>
                <Input
                  value={
                    getPropStr(p.altText) || "StacGate Platform — Conçu et Validé par ArchiSys3.0"
                  }
                  onChange={(e) => updateProp("altText", e.target.value)}
                  placeholder="Description textuelle du visuel"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* 9. FEATURES GRID (NOUVEAU BLOC PHASE 41) */}
          {block.type === "features_grid" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Titre de la section :</Label>
                <Input
                  value={getPropStr(p.title)}
                  onChange={(e) => updateProp("title", e.target.value)}
                  placeholder="Nos Atouts & Piliers Technologiques"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre d'accompagnement :</Label>
                <Textarea
                  rows={2}
                  value={getPropStr(p.subtitle)}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Une vision d'ingénierie sans compromis..."
                  className="text-xs"
                />
              </div>
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
                      const baseItems =
                        Array.isArray(p.items) && p.items.length > 0
                          ? p.items
                          : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                              string,
                              unknown
                            >[]) || [];
                      const items = [...baseItems];
                      items.push({
                        id: "f_" + Date.now(),
                        icon: "rocket",
                        title: "Nouvelle fonctionnalité",
                        description: "Description concise de l'atout...",
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

                {(Array.isArray(p.items) && p.items.length > 0
                  ? p.items
                  : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                      string,
                      unknown
                    >[]) || []
                ).map((item: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="p-2.5 border rounded-lg bg-card/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={String(item.icon || "rocket")}
                        onValueChange={(val) => {
                          const baseItems =
                            Array.isArray(p.items) && p.items.length > 0
                              ? p.items
                              : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                                  string,
                                  unknown
                                >[]) || [];
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

                      <Input
                        placeholder="Titre de la carte"
                        value={getPropStr(item.title)}
                        onChange={(e) => {
                          const baseItems =
                            Array.isArray(p.items) && p.items.length > 0
                              ? p.items
                              : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const items = [...baseItems];
                          items[idx] = { ...items[idx], title: e.target.value };
                          updateProp("items", items);
                        }}
                        className="h-7 text-xs font-semibold flex-1"
                      />

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const baseItems =
                            Array.isArray(p.items) && p.items.length > 0
                              ? p.items
                              : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const items = [...baseItems];
                          items.splice(idx, 1);
                          updateProp("items", items);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <Textarea
                      rows={2}
                      placeholder="Description de la fonctionnalité..."
                      value={getPropStr(item.description)}
                      onChange={(e) => {
                        const baseItems =
                          Array.isArray(p.items) && p.items.length > 0
                            ? p.items
                            : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                                string,
                                unknown
                              >[]) || [];
                        const items = [...baseItems];
                        items[idx] = { ...items[idx], description: e.target.value };
                        updateProp("items", items);
                      }}
                      className="text-xs"
                    />

                    <Input
                      placeholder="Lien d'action (optionnel, ex: /catalogue)"
                      value={String(item.link || "")}
                      onChange={(e) => {
                        const baseItems =
                          Array.isArray(p.items) && p.items.length > 0
                            ? p.items
                            : (getBlockMeta("features_grid")?.defaultProps?.items as Record<
                                string,
                                unknown
                              >[]) || [];
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
          )}

          {/* 10. PRICING TABLE (NOUVEAU BLOC PHASE 41) */}
          {block.type === "pricing_table" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Titre de la section tarifs :</Label>
                <Input
                  value={getPropStr(p.title)}
                  onChange={(e) => updateProp("title", e.target.value)}
                  placeholder="Nos Offres & Solutions"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre descriptif :</Label>
                <Textarea
                  rows={2}
                  value={getPropStr(p.subtitle)}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Formules transparentes adaptées à vos objectifs"
                  className="text-xs"
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
                        name: "Nouveau Plan",
                        price: "99 000 DZD",
                        period: "/ projet",
                        popular: false,
                        features: ["Fonctionnalité 1", "Fonctionnalité 2"],
                        ctaText: "Choisir",
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
                      <Input
                        placeholder="Nom de l'offre (ex: Starter)"
                        value={getPropStr(plan.name)}
                        onChange={(e) => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], name: e.target.value };
                          updateProp("plans", plans);
                        }}
                        className="h-7 text-xs font-bold"
                      />
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

                    <div className="grid grid-cols-2 gap-2">
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
                      <Input
                        placeholder="Période (ex: / projet)"
                        value={getPropStr(plan.period)}
                        onChange={(e) => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], period: e.target.value };
                          updateProp("plans", plans);
                        }}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Mettre en avant (Recommandé) :
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
                      <Input
                        placeholder="Libellé bouton (ex: Commander)"
                        value={getPropStr(plan.ctaText)}
                        onChange={(e) => {
                          const basePlans =
                            Array.isArray(p.plans) && p.plans.length > 0
                              ? p.plans
                              : (getBlockMeta("pricing_table")?.defaultProps?.plans as Record<
                                  string,
                                  unknown
                                >[]) || [];
                          const plans = [...basePlans];
                          plans[idx] = { ...plans[idx], ctaText: e.target.value };
                          updateProp("plans", plans);
                        }}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="Lien (ex: /contact)"
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
                ))}
              </div>
            </div>
          )}

          {/* 11. QUOTE STAR (NOUVEAU BLOC PHASE 41) */}
          {block.type === "quote_star" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Texte du témoignage / Citation :</Label>
                <Textarea
                  rows={3}
                  value={getPropStr(p.quote)}
                  onChange={(e) => updateProp("quote", e.target.value)}
                  placeholder="« Un travail d'ingénierie exemplaire et une fiabilité totale. »"
                  className="text-xs italic"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nom de l'auteur :</Label>
                  <Input
                    value={String(p.author || "")}
                    onChange={(e) => updateProp("author", e.target.value)}
                    placeholder="Dr. Salim B."
                    className="h-8 text-xs font-semibold"
                  />
                </div>
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
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Fonction & Entreprise :</Label>
                <Input
                  value={getPropStr(p.role)}
                  onChange={(e) => updateProp("role", e.target.value)}
                  placeholder="Directeur des Systèmes d'Information"
                  className="h-8 text-xs"
                />
              </div>
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
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Titre de la bannière :</Label>
                <Input
                  value={getPropStr(p.title)}
                  onChange={(e) => updateProp("title", e.target.value)}
                  placeholder="Construisez votre Écosystème Haute Performance"
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sous-titre descriptif :</Label>
                <Textarea
                  rows={2}
                  value={getPropStr(p.subtitle)}
                  onChange={(e) => updateProp("subtitle", e.target.value)}
                  placeholder="Une solution technologique souveraine et modulaire..."
                  className="text-xs"
                />
              </div>

              <MediaPickerField
                label="Image d'arrière-plan de la bannière"
                description="Image panoramique haute définition"
                value={typeof p.bannerSrc === "string" ? p.bannerSrc : ""}
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
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bouton CTA Principal :</Label>
                  <Input
                    value={getPropStr(p.primaryCtaText)}
                    onChange={(e) => updateProp("primaryCtaText", e.target.value)}
                    placeholder="Découvrir"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={String(p.primaryCtaLink || "")}
                    onChange={(e) => updateProp("primaryCtaLink", e.target.value)}
                    placeholder="/catalogue"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bouton CTA Secondaire :</Label>
                  <Input
                    value={getPropStr(p.secondaryCtaText)}
                    onChange={(e) => updateProp("secondaryCtaText", e.target.value)}
                    placeholder="Nous contacter"
                    className="h-7 text-xs"
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
        </div>
      )}
    </div>
  );
}
