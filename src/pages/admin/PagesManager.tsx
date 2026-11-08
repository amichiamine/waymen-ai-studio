import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ExternalLink,
  Layers,
  Settings,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  FileCode,
  Globe,
  Home,
  Smartphone,
  LayoutTemplate,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Sliders,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteContent, useSiteContentMutations } from "@/data-provider";
import { useI18n, useLocalize, type Localized } from "@/lib/i18n";
import { seedCustomPages } from "@/lib/site-content";
import type {
  BlockConfig,
  BlockType,
  CustomPageDefinition,
  BlockStyleConfig,
  PageLayoutConfig,
  PageSeoConfig,
} from "@/types/pages";
import { BLOCK_REGISTRY, getBlockMeta } from "@/components/blocks";
import { BlockPropsEditor } from "@/components/admin/BlockPropsEditor";
import { StudioLiveCanvas } from "@/components/admin/StudioLiveCanvas";
import { MediaPickerField } from "@/components/admin/MediaPickerField";
import { cn } from "@/lib/utils";
import AdminContent from "./Content";

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

function toLocObj(v: Localized<string> | undefined): { fr: string; en: string; ar: string } {
  if (!v) return { fr: "", en: "", ar: "" };
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: v.fr ?? "", en: v.en ?? "", ar: v.ar ?? "" };
}

/**
 * 🎛️ Inspecteur de Paramètres de Vue 360° (Phase 49)
 * Contrôle direct et temps réel des métadonnées, du fond, des masquages et du SEO.
 */
function PageViewPropsEditor({
  page,
  onChange,
}: {
  page: CustomPageDefinition;
  onChange: (updated: CustomPageDefinition) => void;
}) {
  const [lang, setLang] = useState<LangCode>("fr");

  const titleLoc = toLocObj(page.title);
  const descLoc = toLocObj(page.description);
  const metaTitleLoc = toLocObj(page.seo?.metaTitle);
  const metaDescLoc = toLocObj(page.seo?.metaDescription);

  const handleTitleChange = (val: string) => {
    onChange({
      ...page,
      title: { ...titleLoc, [lang]: val },
    });
  };

  const handleDescChange = (val: string) => {
    onChange({
      ...page,
      description: { ...descLoc, [lang]: val },
    });
  };

  const handleSlugChange = (val: string) => {
    onChange({
      ...page,
      slug: val.toLowerCase().replace(/[^a-z0-9_/-]/g, "-"),
    });
  };

  const handleLayoutBgChange = (bg: PageLayoutConfig["pageBg"]) => {
    onChange({
      ...page,
      layout: { ...(page.layout || {}), pageBg: bg },
    });
  };

  const handleLayoutToggle = (key: keyof PageLayoutConfig, value: boolean) => {
    onChange({
      ...page,
      layout: { ...(page.layout || {}), [key]: value },
    });
  };

  const handleSeoTextChange = (key: "metaTitle" | "metaDescription", val: string) => {
    const existing = key === "metaTitle" ? metaTitleLoc : metaDescLoc;
    onChange({
      ...page,
      seo: {
        ...(page.seo || {}),
        [key]: { ...existing, [lang]: val },
      },
    });
  };

  const handleSeoNoIndexChange = (noIndex: boolean) => {
    onChange({
      ...page,
      seo: { ...(page.seo || {}), noIndex },
    });
  };

  const isSystemPage = Boolean(page.isSystem || page.systemKey || page.id.startsWith("system_"));
  const isHomePage = page.id === "page_home";

  return (
    <div className="space-y-4 text-start text-xs">
      {/* Sélecteur de langue d'édition trilingue */}
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Globe className="size-3.5 text-primary" />
          <span>Langue d'édition</span>
        </span>
        <div className="flex items-center rounded-md border border-border bg-muted/60 p-0.5">
          {LANGS.map((lg) => (
            <button
              key={lg}
              type="button"
              onClick={() => setLang(lg)}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition-all",
                lang === lg
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {lg}
            </button>
          ))}
        </div>
      </div>

      {/* Titre & Identification */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Titre de la vue ({lang.toUpperCase()})
        </Label>
        <Input
          value={titleLoc[lang] || ""}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={`Titre en ${lang.toUpperCase()}...`}
          className="h-8 text-xs font-semibold"
          dir={lang === "ar" ? "rtl" : "ltr"}
        />
      </div>

      {/* Slug URL */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Slug d'accès URL
          </Label>
          {isSystemPage && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
              Système
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs font-mono">/</span>
          <Input
            value={page.slug}
            disabled={isSystemPage || isHomePage}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="slug-de-la-vue"
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      {/* Description courte */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Description ({lang.toUpperCase()})
        </Label>
        <Textarea
          value={descLoc[lang] || ""}
          onChange={(e) => handleDescChange(e.target.value)}
          rows={2}
          placeholder="Description de la vue pour le catalogue et SEO..."
          className="text-xs"
          dir={lang === "ar" ? "rtl" : "ltr"}
        />
      </div>

      {/* Style & Couleur de Fond de la Vue */}
      <div className="space-y-2 border-t pt-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Palette className="size-3.5 text-primary" />
          <span>Atmosphère & Fond de Vue</span>
        </Label>
        <Select
          value={page.layout?.pageBg || "default"}
          onValueChange={(v) => handleLayoutBgChange(v as PageLayoutConfig["pageBg"])}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Fond de page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Défaut du thème</SelectItem>
            <SelectItem value="surface">Surface Blanche / Carte</SelectItem>
            <SelectItem value="muted">Gris Muted Doux</SelectItem>
            <SelectItem value="gradient">Dégradé Subtil</SelectItem>
            <SelectItem value="dark">Sombre Profond (Dark 950)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interrupteurs de Mise en Page Globale */}
      <div className="space-y-2.5 border-t pt-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <LayoutTemplate className="size-3.5 text-primary" />
          <span>Cadre & Éléments Globaux</span>
        </Label>

        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">Masquer l'En-tête (Header)</p>
              <p className="text-[10px] text-muted-foreground">Pour tunnels immersifs ou landing</p>
            </div>
            <Switch
              checked={Boolean(page.layout?.hideHeader)}
              onCheckedChange={(v) => handleLayoutToggle("hideHeader", v)}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <div>
              <p className="text-xs font-semibold">Masquer le Pied de Page (Footer)</p>
              <p className="text-[10px] text-muted-foreground">
                Focalise l'attention sur le contenu
              </p>
            </div>
            <Switch
              checked={Boolean(page.layout?.hideFooter)}
              onCheckedChange={(v) => handleLayoutToggle("hideFooter", v)}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <div>
              <p className="text-xs font-semibold">Masquer le Ticker Déroulant</p>
              <p className="text-[10px] text-muted-foreground">Bandeau de promotions et annonces</p>
            </div>
            <Switch
              checked={Boolean(page.layout?.hideTicker)}
              onCheckedChange={(v) => handleLayoutToggle("hideTicker", v)}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <div>
              <p className="text-xs font-semibold">Masquer l'Assistance Flottante</p>
              <p className="text-[10px] text-muted-foreground">Bouton WhatsApp flottant</p>
            </div>
            <Switch
              checked={Boolean(page.layout?.hideFloatingContact)}
              onCheckedChange={(v) => handleLayoutToggle("hideFloatingContact", v)}
            />
          </div>
        </div>
      </div>

      {/* Référencement Naturel & SEO */}
      <div className="space-y-2.5 border-t pt-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Globe className="size-3.5 text-primary" />
          <span>SEO & Référencement Google</span>
        </Label>

        <div className="space-y-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">
              Méta Titre ({lang.toUpperCase()})
            </Label>
            <Input
              value={metaTitleLoc[lang] || ""}
              onChange={(e) => handleSeoTextChange("metaTitle", e.target.value)}
              placeholder="Titre affiché dans les moteurs de recherche..."
              className="h-8 text-xs"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground">
              Méta Description ({lang.toUpperCase()})
            </Label>
            <Textarea
              value={metaDescLoc[lang] || ""}
              onChange={(e) => handleSeoTextChange("metaDescription", e.target.value)}
              rows={2}
              placeholder="Extrait visible sous le lien dans Google..."
              className="text-xs"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold">Désindexer (noindex)</p>
              <p className="text-[10px] text-muted-foreground">
                Empêche les moteurs de référencer cette vue
              </p>
            </div>
            <Switch checked={Boolean(page.seo?.noIndex)} onCheckedChange={handleSeoNoIndexChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagesManager() {
  const { data: siteContent } = useSiteContent();
  const { update: updateSiteContent } = useSiteContentMutations();
  const { t } = useI18n();
  const L = useLocalize();

  const customPages = useMemo(() => {
    const existing = siteContent?.customPages || [];
    const defaults = seedCustomPages();
    const existingIds = new Set(existing.map((p) => p.id));
    const missingDefaults = defaults.filter((d) => !existingIds.has(d.id));
    if (missingDefaults.length === 0) return existing;
    return [...existing, ...missingDefaults];
  }, [siteContent]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeStudioTab =
    (searchParams.get("tab") as "views" | "home" | "global" | "mobile") || "views";
  const setStudioTab = (tab: "views" | "home" | "global" | "mobile") => {
    setSearchParams({ tab });
  };

  // État de la page en cours d'édition
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pages, setPages] = useState<CustomPageDefinition[]>(customPages);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mode d'affichage : WYSYWIG Canvas (par défaut) vs Structure classique
  const [studioViewMode, setStudioViewMode] = useState<"canvas" | "structure">("canvas");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // 🎛️ Mode d'Inspecteur 360° : "block" (Propriétés du Bloc sélectionné) | "page" (Paramètres de la Vue)
  const [inspectorMode, setInspectorMode] = useState<"block" | "page">("block");

  // ⏱️ Auto-Save Débouncé (1500ms) direct vers SQLite (katech-data)
  useEffect(() => {
    if (!isDirty) return;

    setSaveStatus("unsaved");

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      setSaving(true);
      try {
        await updateSiteContent({ customPages: pages });
        setIsDirty(false);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      } finally {
        setSaving(false);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [pages, isDirty, updateSiteContent]);

  // 🛡️ Garde anti-perte de données BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Volets rétractables & Mode Plein Écran Zen
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const isZenMode = leftCollapsed && rightCollapsed;

  const handleToggleZen = () => {
    if (isZenMode) {
      setLeftCollapsed(false);
      setRightCollapsed(false);
    } else {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    }
  };

  const canvasColsClass =
    leftCollapsed && rightCollapsed
      ? "lg:col-span-12"
      : leftCollapsed || rightCollapsed
        ? "lg:col-span-9"
        : "lg:col-span-6";

  // Dialog création / paramètres de page
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [metaLang, setMetaLang] = useState<LangCode>("fr");
  const [metaModalTab, setMetaModalTab] = useState<"general" | "layout" | "seo">("general");
  const [editingPageMeta, setEditingPageMeta] = useState<Partial<CustomPageDefinition> | null>(
    null,
  );

  // Blocs dont l'inspecteur de propriétés est ouvert
  const [expandedBlockIds, setExpandedBlockIds] = useState<Record<string, boolean>>({});
  const toggleExpandBlock = (id: string) =>
    setExpandedBlockIds((prev) => ({ ...prev, [id]: !prev[id] }));

  // Dialog catalogue d'ajout de bloc
  const [addBlockModalOpen, setAddBlockModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<string>("all");

  // Synchronisation réactive avec le store serveur dès réception des données
  useEffect(() => {
    if (!isDirty && customPages.length > 0) {
      setPages(customPages);
      if (!selectedPageId && customPages.length > 0) {
        setSelectedPageId(customPages[0].id);
      }
    }
  }, [customPages, isDirty, selectedPageId]);

  // Auto-persistance SQLite directe des nouvelles vues par défaut dans katech-data
  useEffect(() => {
    if (!siteContent?.customPages) return;
    const existingIds = new Set(siteContent.customPages.map((p) => p.id));
    const defaults = seedCustomPages();
    const hasMissing = defaults.some((d) => !existingIds.has(d.id));
    if (hasMissing && !isDirty) {
      updateSiteContent({ customPages }).catch(() => {
        // En cas d'indisponibilité temporaire, repli gracieux sans erreur bloquante
      });
    }
  }, [siteContent?.customPages, customPages, isDirty, updateSiteContent]);

  const selectedPage = pages.find((p) => p.id === selectedPageId) || null;

  // 🏛️ Groupement hiérarchique des vues du Studio (Phase 46)
  const institutionalIds = useMemo(
    () =>
      new Set([
        "page_home",
        "page_about",
        "page_contact",
        "page_cv_default",
        "page_projets_default",
        "page_shipping_returns",
        "page_warranty",
        "page_terms_conditions",
        "page_legal_notices",
      ]),
    [],
  );

  const institutionalPages = useMemo(
    () => pages.filter((p) => institutionalIds.has(p.id)),
    [pages, institutionalIds],
  );

  const systemPages = useMemo(
    () => pages.filter((p) => p.isSystem || p.systemKey || p.id.startsWith("system_")),
    [pages],
  );

  const customPagesList = useMemo(
    () =>
      pages.filter(
        (p) =>
          !institutionalIds.has(p.id) && !p.isSystem && !p.systemKey && !p.id.startsWith("system_"),
      ),
    [pages, institutionalIds],
  );

  // Synchronisation du bloc sélectionné
  useEffect(() => {
    if (selectedPage && selectedPage.blocks.length > 0) {
      if (!selectedBlockId || !selectedPage.blocks.some((b) => b.id === selectedBlockId)) {
        setSelectedBlockId(selectedPage.blocks[0].id);
      }
    } else {
      setSelectedBlockId(null);
    }
  }, [selectedPage, selectedBlockId]);

  // Navigation Studio Dédiée Mobile & Tablette (< 1024px)
  const [mobileStudioView, setMobileStudioView] = useState<"tree" | "canvas" | "inspector">(
    "canvas",
  );

  // 🎯 Auto-scroll focalisé : centre le bloc sélectionné dans l'arborescence
  useEffect(() => {
    if (!selectedBlockId) return;
    const el = document.getElementById(`studio-tree-block-${selectedBlockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedBlockId]);

  const selectedBlockIdx = selectedPage?.blocks?.findIndex((b) => b.id === selectedBlockId) ?? -1;
  const selectedBlock =
    selectedBlockIdx >= 0 && selectedPage ? selectedPage.blocks[selectedBlockIdx] : null;
  const selectedBlockMeta = selectedBlock ? getBlockMeta(selectedBlock.type) : null;

  // Sauvegarde globale dans site_content
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteContent({ customPages: pages });
      setIsDirty(false);
      toast.success(
        "Modifications persistées avec succès dans la base de données SQLite locale (katech-data) !",
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la sauvegarde.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Ouverture modal création
  const handleOpenCreatePage = () => {
    setEditingPageMeta({
      id: "page_" + Date.now(),
      slug: "",
      title: { fr: "", en: "", ar: "" },
      description: { fr: "", en: "", ar: "" },
      isPublished: true,
      inNavbar: true,
      inFooter: false,
      navOrder: pages.length + 1,
      layout: { pageBg: "default" },
      seo: {},
      blocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setMetaModalTab("general");
    setPageModalOpen(true);
  };

  // Ouverture modal édition paramètres de page
  const handleOpenEditPageMeta = (p: CustomPageDefinition) => {
    setEditingPageMeta({
      ...p,
      layout: p.layout ? { ...p.layout } : { pageBg: "default" },
      seo: p.seo ? { ...p.seo } : {},
    });
    setMetaModalTab("general");
    setPageModalOpen(true);
  };

  // Enregistrement modal page avec persistance directe instantanée SQLite
  const handleSavePageMeta = async () => {
    if (!editingPageMeta) return;

    const isHomePage = editingPageMeta.id === "page_home";
    let cleanSlug = "";

    if (!isHomePage) {
      if (!editingPageMeta.slug?.trim()) {
        toast.error("Veuillez spécifier un slug valide (ex: cv, projets).");
        return;
      }

      cleanSlug = editingPageMeta.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/^-+|-+$/g, "");

      const exists = pages.some((p) => p.slug === cleanSlug && p.id !== editingPageMeta.id);
      if (exists) {
        toast.error(`Le slug "/${cleanSlug}" est déjà utilisé par une autre vue.`);
        return;
      }
    }

    const newPage: CustomPageDefinition = {
      id: editingPageMeta.id || "page_" + Date.now(),
      slug: cleanSlug,
      title: editingPageMeta.title
        ? toLocObj(editingPageMeta.title)
        : {
            fr: isHomePage ? "Accueil" : cleanSlug,
            en: isHomePage ? "Home" : cleanSlug,
            ar: isHomePage ? "الرئيسية" : cleanSlug,
          },
      description: editingPageMeta.description
        ? toLocObj(editingPageMeta.description)
        : { fr: "", en: "", ar: "" },
      isPublished: editingPageMeta.isPublished ?? true,
      inNavbar: isHomePage ? false : (editingPageMeta.inNavbar ?? false),
      inFooter: isHomePage ? false : (editingPageMeta.inFooter ?? false),
      navOrder: editingPageMeta.navOrder ?? pages.length + 1,
      layout: editingPageMeta.layout,
      seo: editingPageMeta.seo,
      blocks: editingPageMeta.blocks || [],
      createdAt: editingPageMeta.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextPages = (() => {
      const idx = pages.findIndex((p) => p.id === newPage.id);
      if (idx >= 0) {
        const next = [...pages];
        next[idx] = newPage;
        return next;
      }
      return [...pages, newPage];
    })();

    setPages(nextPages);
    setSelectedPageId(newPage.id);
    setPageModalOpen(false);

    // ⚡ Persistance Directe Instantanée SQLite
    try {
      await updateSiteContent({ customPages: nextPages });
      setIsDirty(false);
      toast.success(
        isHomePage
          ? "Vue d'Accueil configurée et enregistrée en base."
          : `Vue "/${newPage.slug}" configurée et enregistrée en base.`,
      );
    } catch (err) {
      console.error("Erreur de persistance directe SQLite:", err);
      setIsDirty(true);
      toast.warning(
        isHomePage
          ? "Vue d'Accueil configurée localement."
          : `Vue "/${newPage.slug}" configurée localement.`,
      );
    }
  };

  // Suppression d'une page
  const handleDeletePage = (id: string) => {
    const pageToDelete = pages.find((p) => p.id === id);
    if (!pageToDelete) return;

    if (
      pageToDelete.id === "page_home" ||
      pageToDelete.slug === "" ||
      pageToDelete.slug === "home" ||
      pageToDelete.isSystem ||
      pageToDelete.id.startsWith("system_") ||
      institutionalIds.has(pageToDelete.id)
    ) {
      toast.error(
        "Cette vue est une vue officielle ou système de la plateforme et ne peut pas être supprimée.",
      );
      return;
    }

    if (confirm(`Confirmez-vous la suppression définitive de la vue "/${pageToDelete.slug}" ?`)) {
      setPages((prev) => prev.filter((p) => p.id !== id));
      if (selectedPageId === id) setSelectedPageId(null);
      setIsDirty(true);
      toast.success(`Vue "/${pageToDelete.slug}" supprimée.`);
    }
  };

  // Duplication d'une page
  const handleDuplicatePage = (p: CustomPageDefinition) => {
    const duplicated: CustomPageDefinition = {
      ...p,
      id: "page_" + Date.now(),
      slug: `${p.slug}-copie`,
      title: {
        fr: `${L(p.title)} (Copie)`,
        en: `${toLocObj(p.title).en || ""} (Copy)`,
        ar: `${toLocObj(p.title).ar || ""} (نسخة)`,
      },
      blocks: p.blocks.map((b) => ({
        ...b,
        id: "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPages((prev) => [...prev, duplicated]);
    setSelectedPageId(duplicated.id);
    setIsDirty(true);
    toast.success(`Vue dupliquée sous "/${duplicated.slug}".`);
  };

  // Ajout d'un bloc sur la page sélectionnée
  const handleAddBlock = (type: BlockType) => {
    if (!selectedPage) return;
    const meta = getBlockMeta(type);
    const newBlock: BlockConfig = {
      id: "blk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type,
      enabled: true,
      props: meta?.defaultProps ? JSON.parse(JSON.stringify(meta.defaultProps)) : {},
    };

    const updatedBlocks = [...(selectedPage.blocks || []), newBlock];
    updateSelectedPageBlocks(updatedBlocks);
    setAddBlockModalOpen(false);
    toast.success(`Bloc "${L(meta?.label) || type}" ajouté.`);
  };

  // Mise à jour des blocs de la page sélectionnée
  const updateSelectedPageBlocks = (newBlocks: BlockConfig[]) => {
    if (!selectedPage) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPage.id
          ? { ...p, blocks: newBlocks, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
    setIsDirty(true);
  };

  // Mise à jour complète de la configuration d'une vue (titre, fond, SEO, options)
  const updateSelectedPageConfig = (updatedPage: CustomPageDefinition) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === updatedPage.id ? { ...updatedPage, updatedAt: new Date().toISOString() } : p,
      ),
    );
    setIsDirty(true);
  };

  // Déplacement d'un bloc (Monter)
  const handleMoveBlockUp = (index: number) => {
    if (!selectedPage || index <= 0) return;
    const next = [...selectedPage.blocks];
    const [moved] = next.splice(index, 1);
    next.splice(index - 1, 0, moved);
    updateSelectedPageBlocks(next);
  };

  // Déplacement d'un bloc (Descendre)
  const handleMoveBlockDown = (index: number) => {
    if (!selectedPage || index >= selectedPage.blocks.length - 1) return;
    const next = [...selectedPage.blocks];
    const [moved] = next.splice(index, 1);
    next.splice(index + 1, 0, moved);
    updateSelectedPageBlocks(next);
  };

  // Bascule activation d'un bloc
  const handleToggleBlock = (index: number) => {
    if (!selectedPage) return;
    const next = [...selectedPage.blocks];
    next[index] = { ...next[index], enabled: !next[index].enabled };
    updateSelectedPageBlocks(next);
  };

  // Suppression d'un bloc
  const handleDeleteBlock = (index: number) => {
    if (!selectedPage) return;
    const next = [...selectedPage.blocks];
    next.splice(index, 1);
    updateSelectedPageBlocks(next);
  };

  // Mise à jour des props d'un bloc
  const handleUpdateBlockProps = (index: number, newProps: Record<string, unknown>) => {
    if (!selectedPage) return;
    const next = [...selectedPage.blocks];
    next[index] = { ...next[index], props: newProps };
    updateSelectedPageBlocks(next);
  };

  // Mise à jour du style d'un bloc
  const handleUpdateBlockStyle = (index: number, newStyle: BlockStyleConfig) => {
    if (!selectedPage) return;
    const next = [...selectedPage.blocks];
    next[index] = { ...next[index], style: newStyle };
    updateSelectedPageBlocks(next);
  };

  return (
    <AdminPageShell
      title="Studio Visuel & Pages"
      description="Studio de conception unifié : composez vos vues sur-mesure, ajustez les blocs de l'accueil, l'en-tête, le bandeau déroulant et le pied de page."
      actions={
        activeStudioTab === "views" ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={studioViewMode === "canvas" ? "default" : "ghost"}
                onClick={() => setStudioViewMode("canvas")}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">Studio WYSYWIG</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={studioViewMode === "structure" ? "default" : "ghost"}
                onClick={() => setStudioViewMode("structure")}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Layers className="size-3.5" />
                <span className="hidden sm:inline">Structure</span>
              </Button>
            </div>

            {saving || saveStatus === "saving" ? (
              <Badge
                variant="outline"
                className="text-blue-500 border-blue-500/40 bg-blue-500/10 gap-1.5 py-1 px-2.5 text-xs font-semibold"
              >
                <span className="size-2 rounded-full bg-blue-500 animate-ping" />
                <span>Sauvegarde SQLite en cours...</span>
              </Badge>
            ) : isDirty || saveStatus === "unsaved" ? (
              <Badge
                variant="outline"
                className="text-amber-500 border-amber-500/40 bg-amber-500/10 gap-1.5 py-1 px-2.5 text-xs font-semibold"
              >
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Modifications (auto-save 1.5s)</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 gap-1.5 py-1 px-2.5 text-xs font-semibold"
              >
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Synchronisé SQLite (katech-data)</span>
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="gap-2 font-semibold shadow-sm"
              title="Persister immédiatement toutes les modifications dans la base SQLite locale"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Sauvegarde SQLite..." : "Enregistrer en BD"}</span>
            </Button>
            <Button
              onClick={handleOpenCreatePage}
              variant="default"
              className="gap-2 font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Créer une vue</span>
            </Button>
          </div>
        ) : null
      }
    >
      {/* Barre d'onglets maîtres du Studio de Conception 360° */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/60 rounded-xl border border-border mb-6">
        <Button
          type="button"
          size="sm"
          variant={activeStudioTab === "views" ? "default" : "ghost"}
          className="gap-2 text-xs font-semibold h-9"
          onClick={() => setStudioTab("views")}
        >
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <span>Pages & Vues Composables</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeStudioTab === "home" ? "default" : "ghost"}
          className="gap-2 text-xs font-semibold h-9"
          onClick={() => setStudioTab("home")}
        >
          <Home className="h-4 w-4 text-primary" />
          <span>Sections de l'Accueil</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeStudioTab === "global" ? "default" : "ghost"}
          className="gap-2 text-xs font-semibold h-9"
          onClick={() => setStudioTab("global")}
        >
          <Globe className="h-4 w-4 text-primary" />
          <span>En-tête, Footer & Ticker</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeStudioTab === "mobile" ? "default" : "ghost"}
          className="gap-2 text-xs font-semibold h-9"
          onClick={() => setStudioTab("mobile")}
        >
          <Smartphone className="h-4 w-4 text-primary" />
          <span>Mobile & Flottant (WhatsApp)</span>
        </Button>
      </div>

      {activeStudioTab === "views" && studioViewMode === "canvas" && (
        <>
          {/* Sélecteur de mode tactile / mobile / tablette (< 1024px) avec ancrage sticky */}
          <div className="flex lg:hidden sticky top-2 z-30 shadow-md backdrop-blur-md bg-background/95 items-center p-1 rounded-xl border border-border gap-1 my-2">
            <button
              type="button"
              onClick={() => setMobileStudioView("tree")}
              className={cn(
                "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                mobileStudioView === "tree"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers className="size-3.5" />
              <span>Structure ({selectedPage?.blocks?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileStudioView("canvas")}
              className={cn(
                "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                mobileStudioView === "canvas"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="size-3.5" />
              <span>Aperçu Live</span>
            </button>
            <button
              type="button"
              disabled={!selectedBlock}
              onClick={() => setMobileStudioView("inspector")}
              className={cn(
                "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-40",
                mobileStudioView === "inspector"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Settings className="size-3.5" />
              <span>Inspecteur</span>
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-12 text-start items-start">
            {/* Colonne Gauche (3 cols) : Sélecteur de Vue & Arborescence des Blocs */}
            {!leftCollapsed && (
              <div
                className={cn(
                  "lg:col-span-3 space-y-4",
                  mobileStudioView !== "tree" && "hidden lg:block",
                )}
              >
                <Card className="shadow-xs border-border">
                  <CardHeader className="py-2.5 px-3.5 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Vue Active :
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleOpenCreatePage}
                          className="h-6 text-[11px] gap-1 px-1.5 font-semibold text-primary"
                        >
                          <Plus className="size-3" />
                          <span>Nouvelle</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setLeftCollapsed(true)}
                          title="Replier le volet d'arborescence"
                        >
                          <PanelLeftClose className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <Select
                      value={selectedPageId || ""}
                      onValueChange={(val) => setSelectedPageId(val)}
                    >
                      <SelectTrigger className="w-full h-9 font-semibold text-xs">
                        <SelectValue placeholder="Choisir une vue..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {institutionalPages.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-2 py-1">
                              🏛️ Vitrine & Institutionnel ({institutionalPages.length})
                            </SelectLabel>
                            {institutionalPages.map((p) => {
                              const isHome =
                                p.id === "page_home" || p.slug === "" || p.slug === "home";
                              const title = L(p.title) || (isHome ? "Accueil" : p.slug);
                              return (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {isHome ? "🏠 Accueil Vitrine (/)" : `/${p.slug} (${title})`}
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        )}

                        {systemPages.length > 0 && (
                          <SelectGroup>
                            <SelectSeparator className="my-1" />
                            <SelectLabel className="text-[10px] uppercase tracking-wider text-primary font-bold px-2 py-1">
                              ⚙️ Vues Systèmes & Parcours ({systemPages.length})
                            </SelectLabel>
                            {systemPages.map((p) => {
                              const title = L(p.title) || p.slug;
                              return (
                                <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                                  {`/${p.slug} (${title})`}
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        )}

                        {customPagesList.length > 0 && (
                          <SelectGroup>
                            <SelectSeparator className="my-1" />
                            <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-2 py-1">
                              📄 Vues Personnalisées ({customPagesList.length})
                            </SelectLabel>
                            {customPagesList.map((p) => {
                              const title = L(p.title) || p.slug;
                              return (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {`/${p.slug} (${title})`}
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>

                    {selectedPage && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="font-mono">
                            {selectedPage.id === "page_home" ? "/" : `/${selectedPage.slug}`}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[9px] py-0 px-1 font-semibold",
                              selectedPage.isPublished ? "text-emerald-500" : "text-amber-500",
                            )}
                          >
                            {selectedPage.isPublished ? "Publiée" : "Brouillon"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] gap-1 px-1.5 text-primary"
                          onClick={() => handleOpenEditPageMeta(selectedPage)}
                        >
                          <Settings className="size-3" />
                          <span>Paramètres</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Arborescence ordonnée des blocs de la vue */}
                <Card className="shadow-xs border-border">
                  <CardHeader className="py-2.5 px-3.5 border-b border-border/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Blocs ({selectedPage?.blocks?.length || 0})
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setAddBlockModalOpen(true)}
                      className="h-7 text-xs gap-1 font-semibold shadow-xs"
                    >
                      <Plus className="size-3" />
                      <span>Ajouter</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1 max-h-[520px] overflow-y-auto">
                    {!selectedPage || selectedPage.blocks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Aucun bloc dans cette vue.
                      </div>
                    ) : (
                      selectedPage.blocks.map((block, idx) => {
                        const isSelected = selectedBlockId === block.id;
                        const meta = getBlockMeta(block.type);
                        return (
                          <div
                            key={block.id}
                            id={`studio-tree-block-${block.id}`}
                            onClick={() => {
                              setSelectedBlockId(block.id);
                              if (window.innerWidth < 1024) {
                                setMobileStudioView("canvas");
                              }
                            }}
                            className={cn(
                              "p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all select-none",
                              isSelected
                                ? "bg-primary/10 border-primary text-foreground font-semibold shadow-xs"
                                : "bg-card/50 hover:bg-muted/40 border-border/60 text-muted-foreground",
                            )}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className={cn(
                                  "size-2 rounded-full shrink-0",
                                  block.enabled ? "bg-emerald-500" : "bg-muted-foreground/30",
                                )}
                              />
                              <span className="truncate">{L(meta?.label) || block.type}</span>
                            </div>
                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveBlockUp(idx)}
                                className="size-5 inline-flex items-center justify-center rounded hover:bg-muted disabled:opacity-20 text-muted-foreground"
                                title="Monter ce bloc"
                              >
                                <ArrowUp className="size-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === selectedPage.blocks.length - 1}
                                onClick={() => handleMoveBlockDown(idx)}
                                className="size-5 inline-flex items-center justify-center rounded hover:bg-muted disabled:opacity-20 text-muted-foreground"
                                title="Descendre ce bloc"
                              >
                                <ArrowDown className="size-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Colonne Centrale : Live Canvas WYSYWIG (portée dynamique 6, 9 ou 12 colonnes) */}
            <div
              className={cn(
                "h-[calc(100vh-13rem)] min-h-[520px] max-h-[850px] w-full",
                canvasColsClass,
                mobileStudioView !== "canvas" && "hidden lg:block",
              )}
            >
              <StudioLiveCanvas
                page={selectedPage}
                blocks={selectedPage?.blocks || []}
                selectedBlockId={selectedBlockId}
                onSelectBlock={(id) => setSelectedBlockId(id)}
                onMoveBlockUp={handleMoveBlockUp}
                onMoveBlockDown={handleMoveBlockDown}
                onToggleBlock={handleToggleBlock}
                onDeleteBlock={handleDeleteBlock}
                onOpenAddModal={() => setAddBlockModalOpen(true)}
                leftCollapsed={leftCollapsed}
                onToggleLeft={() => setLeftCollapsed((prev) => !prev)}
                rightCollapsed={rightCollapsed}
                onToggleRight={() => setRightCollapsed((prev) => !prev)}
                isZenMode={isZenMode}
                onToggleZen={handleToggleZen}
                onCloseMobilePreview={() => setMobileStudioView("tree")}
                onOpenMobileInspector={() => setMobileStudioView("inspector")}
              />
            </div>

            {/* Colonne Droite (3 cols) : Inspecteur Bi-Mode [ Bloc Actif ] / [ Paramètres Vue ] */}
            {!rightCollapsed && (
              <div
                className={cn(
                  "lg:col-span-3 h-[calc(100vh-13rem)] min-h-[520px] max-h-[850px]",
                  mobileStudioView !== "inspector" && "hidden lg:block",
                )}
              >
                {selectedPage ? (
                  <Card className="h-full flex flex-col shadow-xs border-border">
                    <CardHeader className="py-2.5 px-3.5 border-b border-border/40 flex flex-col gap-2">
                      {/* Commutateur Bi-Mode d'Inspecteur */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5">
                          <Button
                            size="sm"
                            type="button"
                            variant={inspectorMode === "block" ? "default" : "ghost"}
                            onClick={() => setInspectorMode("block")}
                            className="h-6 text-[11px] font-semibold gap-1 px-2"
                          >
                            <Settings className="size-3" />
                            <span>Bloc actif</span>
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant={inspectorMode === "page" ? "default" : "ghost"}
                            onClick={() => setInspectorMode("page")}
                            className="h-6 text-[11px] font-semibold gap-1 px-2"
                          >
                            <Sliders className="size-3" />
                            <span>Paramètres Vue</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Raccourci tactile direct vers l'aperçu Live sur Mobile/Tablette */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] font-semibold gap-1 px-2 lg:hidden text-primary"
                            onClick={() => setMobileStudioView("canvas")}
                            title="Voir l'aperçu en direct"
                          >
                            <Eye className="size-3" />
                            <span>Aperçu</span>
                          </Button>

                          {inspectorMode === "block" && selectedBlock && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6"
                                onClick={() => handleToggleBlock(selectedBlockIdx)}
                                title={
                                  selectedBlock.enabled ? "Désactiver ce bloc" : "Activer ce bloc"
                                }
                              >
                                {selectedBlock.enabled ? (
                                  <Eye className="size-3 text-emerald-500" />
                                ) : (
                                  <EyeOff className="size-3 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteBlock(selectedBlockIdx)}
                                title="Supprimer ce bloc"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setRightCollapsed(true)}
                            title="Replier le volet inspecteur"
                          >
                            <PanelRightClose className="size-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Sous-titre contextuel */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-foreground truncate max-w-[200px]">
                          {inspectorMode === "block"
                            ? selectedBlock
                              ? L(selectedBlockMeta?.label) || selectedBlock.type
                              : "Aucun bloc sélectionné"
                            : L(selectedPage.title) || selectedPage.slug || "Paramètres"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1 text-muted-foreground"
                        >
                          {inspectorMode === "block" ? "Bloc Studio" : "Vue 360°"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 overflow-y-auto flex-1 min-h-0">
                      {inspectorMode === "page" ? (
                        <PageViewPropsEditor
                          page={selectedPage}
                          onChange={updateSelectedPageConfig}
                        />
                      ) : selectedBlock ? (
                        <BlockPropsEditor
                          block={selectedBlock}
                          onChange={(newProps) =>
                            handleUpdateBlockProps(selectedBlockIdx, newProps)
                          }
                          onStyleChange={(newStyle) =>
                            handleUpdateBlockStyle(selectedBlockIdx, newStyle)
                          }
                        />
                      ) : (
                        <div className="p-6 text-center border border-dashed rounded-lg">
                          <Settings className="size-7 text-muted-foreground/30 mx-auto mb-2" />
                          <h4 className="text-xs font-bold text-foreground">
                            Aucun bloc sélectionné
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Sélectionnez un bloc dans le Canvas ou dans l'arborescence, ou cliquez
                            sur "Paramètres Vue" pour modifier les options de la page.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <Settings className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-foreground">Aucune vue active</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Sélectionnez une vue dans la liste de gauche pour l'inspecter et la concevoir.
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeStudioTab === "views" && studioViewMode === "structure" && (
        <div className="grid gap-6 lg:grid-cols-12 text-start">
          {/* Colonne Gauche : Liste des Vues */}
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <span>Vues Créées ({pages.length})</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenCreatePage}
                    className="h-8 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nouvelle</span>
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  Sélectionnez une vue pour gérer sa composition de blocs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {pages.length === 0 ? (
                  <div className="p-8 text-center border border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground mb-4">
                      Aucune vue personnalisée pour l'instant.
                    </p>
                    <Button size="sm" onClick={handleOpenCreatePage} className="gap-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Créer votre première vue</span>
                    </Button>
                  </div>
                ) : (
                  pages.map((p) => {
                    const isSelected = p.id === selectedPageId;
                    const isHome = p.id === "page_home" || p.slug === "" || p.slug === "home";
                    const isSystem = isHome || p.slug === "about" || p.slug === "contact";
                    const title = L(p.title) || (isHome ? "Accueil" : p.slug);
                    const activeBlocksCount = (p.blocks || []).filter((b) => b.enabled).length;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPageId(p.id)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs"
                            : "border-border/60 hover:border-primary/40 bg-card/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              {isHome && <Home className="h-3.5 w-3.5 text-primary" />}
                              <span className="text-foreground">{title}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {isHome ? "/ (racine)" : `/${p.slug}`}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {isHome ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30 font-semibold"
                                >
                                  Accueil Vitrine
                                </Badge>
                              ) : isSystem ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                >
                                  Système
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 bg-muted text-muted-foreground border-border/50"
                                >
                                  Sur-mesure
                                </Badge>
                              )}

                              <Badge
                                variant="secondary"
                                className={`text-[10px] py-0 px-1.5 ${
                                  p.isPublished
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {p.isPublished ? "Publiée" : "Brouillon"}
                              </Badge>

                              {p.inNavbar && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 text-primary border-primary/30"
                                >
                                  Menu Navbar
                                </Badge>
                              )}

                              <span className="text-[11px] text-muted-foreground">
                                {activeBlocksCount} {activeBlocksCount > 1 ? "blocs" : "bloc"}
                              </span>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditPageMeta(p)}
                              title="Paramètres de la vue"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleDuplicatePage(p)}
                              title="Dupliquer la vue"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            {!isHome && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeletePage(p.id)}
                                title="Supprimer la vue"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne Droite : Éditeur de Blocs de la Page Sélectionnée */}
          <div className="lg:col-span-8">
            {selectedPage ? (
              <Card>
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedPage.id === "page_home" && (
                          <Home className="h-4 w-4 text-primary" />
                        )}
                        <CardTitle className="text-xl font-bold">
                          {L(selectedPage.title) ||
                            (selectedPage.id === "page_home" ? "Accueil" : selectedPage.slug)}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                          {selectedPage.id === "page_home" || selectedPage.slug === ""
                            ? "/ (racine)"
                            : `/${selectedPage.slug}`}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Assemblez et ordonnez les blocs affichés sur cette vue.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <Link
                          to={selectedPage.slug ? `/${selectedPage.slug}` : "/"}
                          target="_blank"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Prévisualiser</span>
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setAddBlockModalOpen(true)}
                        className="gap-1.5 text-xs font-semibold shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Ajouter un bloc</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  {selectedPage.blocks.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed rounded-2xl p-6">
                      <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-foreground">
                        Cette vue ne contient aucun bloc
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                        Choisissez parmi les 24 blocs universels (Bannières, Profil, Expériences,
                        Grilles de projets, Avis, Contact, etc.).
                      </p>
                      <Button
                        onClick={() => setAddBlockModalOpen(true)}
                        className="gap-2 font-semibold shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter un premier bloc</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPage.blocks.map((block, idx) => {
                        const meta = getBlockMeta(block.type);
                        const blockLabel = L(meta?.label) || block.type;
                        const blockDesc = L(meta?.description) || "";

                        return (
                          <div
                            key={block.id}
                            className={`rounded-2xl border p-4 transition-all ${
                              block.enabled
                                ? "border-border/80 bg-card/70 shadow-xs"
                                : "border-border/40 bg-muted/20 opacity-60"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-foreground">
                                      {blockLabel}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] uppercase font-mono"
                                    >
                                      {block.type}
                                    </Badge>
                                  </div>
                                  {blockDesc && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                      {blockDesc}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                {/* Monter / Descendre */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveBlockUp(idx)}
                                  title="Monter ce bloc"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={idx === selectedPage.blocks.length - 1}
                                  onClick={() => handleMoveBlockDown(idx)}
                                  title="Descendre ce bloc"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>

                                {/* Activer / Désactiver */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleToggleBlock(idx)}
                                  title={block.enabled ? "Désactiver" : "Activer"}
                                >
                                  {block.enabled ? (
                                    <Eye className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>

                                {/* Configurer le contenu & les paramètres */}
                                <Button
                                  size="sm"
                                  variant={expandedBlockIds[block.id] ? "secondary" : "ghost"}
                                  className="h-8 gap-1.5 text-xs font-semibold"
                                  onClick={() => toggleExpandBlock(block.id)}
                                  title="Éditer le contenu et les paramètres de ce bloc"
                                >
                                  <Settings className="h-3.5 w-3.5 text-primary" />
                                  <span>{expandedBlockIds[block.id] ? "Fermer" : "Contenu"}</span>
                                </Button>

                                {/* Supprimer */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteBlock(idx)}
                                  title="Supprimer ce bloc"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Inspecteur de configuration étendu du bloc */}
                            {expandedBlockIds[block.id] && (
                              <BlockPropsEditor
                                block={block}
                                onChange={(newProps) => handleUpdateBlockProps(idx, newProps)}
                                onStyleChange={(newStyle) => handleUpdateBlockStyle(idx, newStyle)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold">Aucune vue sélectionnée</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Sélectionnez une vue dans la colonne de gauche ou créez-en une nouvelle pour
                  composer son contenu.
                </p>
                <Button onClick={handleOpenCreatePage} className="gap-2 font-semibold">
                  <Plus className="h-4 w-4" />
                  <span>Créer une vue</span>
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeStudioTab === "home" && <AdminContent embedded defaultPole="home" hidePoles />}

      {activeStudioTab === "global" && <AdminContent embedded defaultPole="global" hidePoles />}

      {activeStudioTab === "mobile" && <AdminContent embedded defaultPole="mobile" hidePoles />}

      {/* Modal Paramètres de Vue (Création / Édition) */}
      <Dialog open={pageModalOpen} onOpenChange={setPageModalOpen}>
        <DialogContent className="sm:max-w-xl text-start max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paramètres Avancés de la Vue (360°)</DialogTitle>
            <DialogDescription className="text-xs">
              Configurez la structure d'accès, la disposition d'affichage et l'optimisation SEO de
              cette vue.
            </DialogDescription>
          </DialogHeader>

          {/* Sélecteur d'onglets du Modal : Général | Layout | SEO */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
            <Button
              type="button"
              size="sm"
              variant={metaModalTab === "general" ? "default" : "ghost"}
              className="flex-1 h-7 text-xs font-semibold"
              onClick={() => setMetaModalTab("general")}
            >
              Général
            </Button>
            <Button
              type="button"
              size="sm"
              variant={metaModalTab === "layout" ? "default" : "ghost"}
              className="flex-1 h-7 text-xs font-semibold"
              onClick={() => setMetaModalTab("layout")}
            >
              Mise en page / Layout
            </Button>
            <Button
              type="button"
              size="sm"
              variant={metaModalTab === "seo" ? "default" : "ghost"}
              className="flex-1 h-7 text-xs font-semibold"
              onClick={() => setMetaModalTab("seo")}
            >
              SEO & Réseaux
            </Button>
          </div>

          {editingPageMeta && (
            <div className="space-y-4 py-2">
              {/* ========================================================= */}
              {/* 🏷️ ONGLET 1 : GÉNÉRAL                                     */}
              {/* ========================================================= */}
              {metaModalTab === "general" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <Label htmlFor="page_slug" className="text-xs font-semibold">
                      Adresse URL (Slug) :
                    </Label>
                    <div className="flex items-center rounded-md border border-input bg-muted/20 px-3">
                      <span className="text-xs text-muted-foreground font-mono">/</span>
                      <Input
                        id="page_slug"
                        value={editingPageMeta.id === "page_home" ? "" : editingPageMeta.slug || ""}
                        disabled={editingPageMeta.id === "page_home"}
                        onChange={(e) =>
                          setEditingPageMeta({ ...editingPageMeta, slug: e.target.value })
                        }
                        placeholder={
                          editingPageMeta.id === "page_home"
                            ? "(Racine Accueil /)"
                            : "cv, projets, solutions..."
                        }
                        className="border-0 bg-transparent focus-visible:ring-0 text-sm font-mono"
                      />
                    </div>
                    {editingPageMeta.id === "page_home" && (
                      <p className="text-[11px] text-muted-foreground">
                        La page d'accueil est fixée sur la racine principale (/) du site.
                      </p>
                    )}
                  </div>

                  {/* Sélecteur de langue trilingue FR / EN / AR */}
                  <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50">
                    <Button
                      type="button"
                      size="sm"
                      variant={metaLang === "fr" ? "secondary" : "ghost"}
                      className="text-xs h-7 flex-1 font-semibold"
                      onClick={() => setMetaLang("fr")}
                    >
                      Français (FR)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={metaLang === "en" ? "secondary" : "ghost"}
                      className="text-xs h-7 flex-1 font-semibold"
                      onClick={() => setMetaLang("en")}
                    >
                      English (EN)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={metaLang === "ar" ? "secondary" : "ghost"}
                      className="text-xs h-7 flex-1 font-semibold"
                      onClick={() => setMetaLang("ar")}
                    >
                      العربية (AR)
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Titre de la Vue ({metaLang.toUpperCase()}) :
                    </Label>
                    <Input
                      value={toLocObj(editingPageMeta.title)[metaLang]}
                      onChange={(e) =>
                        setEditingPageMeta({
                          ...editingPageMeta,
                          title: {
                            ...toLocObj(editingPageMeta.title),
                            [metaLang]: e.target.value,
                          },
                        })
                      }
                      placeholder={
                        metaLang === "ar"
                          ? "عنوان الصفحة..."
                          : metaLang === "en"
                            ? "Page title..."
                            : "ex: Mon Profil & CV"
                      }
                      dir={metaLang === "ar" ? "rtl" : "ltr"}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Description SEO courte ({metaLang.toUpperCase()}) :
                    </Label>
                    <Input
                      value={toLocObj(editingPageMeta.description)[metaLang]}
                      onChange={(e) =>
                        setEditingPageMeta({
                          ...editingPageMeta,
                          description: {
                            ...toLocObj(editingPageMeta.description),
                            [metaLang]: e.target.value,
                          },
                        })
                      }
                      placeholder={
                        metaLang === "ar"
                          ? "وصف محركات البحث..."
                          : metaLang === "en"
                            ? "Search engine description..."
                            : "Résumé pour les moteurs de recherche..."
                      }
                      dir={metaLang === "ar" ? "rtl" : "ltr"}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div>
                      <Label className="text-xs font-bold">Publier immédiatement :</Label>
                      <p className="text-[11px] text-muted-foreground">
                        La vue sera accessible aux visiteurs.
                      </p>
                    </div>
                    <Switch
                      checked={editingPageMeta.isPublished ?? true}
                      onCheckedChange={(c) =>
                        setEditingPageMeta({ ...editingPageMeta, isPublished: c })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div>
                      <Label className="text-xs font-bold">
                        Lien dans le menu supérieur (Navbar) :
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Insère un lien dans la barre de navigation et le menu mobile (dédoublonné si
                        déjà présent).
                      </p>
                    </div>
                    <Switch
                      checked={editingPageMeta.inNavbar ?? false}
                      onCheckedChange={(c) =>
                        setEditingPageMeta({ ...editingPageMeta, inNavbar: c })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div>
                      <Label className="text-xs font-bold">
                        Lien dans le pied de page (Footer) :
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Insère un lien dans la colonne institutionnelle du pied de page.
                      </p>
                    </div>
                    <Switch
                      checked={editingPageMeta.inFooter ?? false}
                      onCheckedChange={(c) =>
                        setEditingPageMeta({ ...editingPageMeta, inFooter: c })
                      }
                    />
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 🎨 ONGLET 2 : MISE EN PAGE / LAYOUT                       */}
              {/* ========================================================= */}
              {metaModalTab === "layout" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Arrière-plan de la Page :</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { key: "default", label: "Défaut (Standard)" },
                        { key: "dark", label: "Sombre Profond" },
                        { key: "surface", label: "Blanc / Carte" },
                        { key: "muted", label: "Gris Doux" },
                        { key: "gradient", label: "Dégradé Subtil" },
                      ].map((bgItem) => (
                        <button
                          key={bgItem.key}
                          type="button"
                          onClick={() =>
                            setEditingPageMeta({
                              ...editingPageMeta,
                              layout: {
                                ...editingPageMeta.layout,
                                pageBg: bgItem.key as PageLayoutConfig["pageBg"],
                              },
                            })
                          }
                          className={cn(
                            "py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all truncate",
                            (editingPageMeta.layout?.pageBg || "default") === bgItem.key
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card hover:bg-muted/50 border-border text-muted-foreground",
                          )}
                        >
                          {bgItem.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold">Masquer l'En-tête (Header) :</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Idéal pour les landing pages, formulaires plein écran ou tunnels épurés.
                        </p>
                      </div>
                      <Switch
                        checked={editingPageMeta.layout?.hideHeader ?? false}
                        onCheckedChange={(c) =>
                          setEditingPageMeta({
                            ...editingPageMeta,
                            layout: { ...editingPageMeta.layout, hideHeader: c },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold">
                          Masquer le Pied de page (Footer) :
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Retire le footer pour les pages d'action ou présentations focalisées.
                        </p>
                      </div>
                      <Switch
                        checked={editingPageMeta.layout?.hideFooter ?? false}
                        onCheckedChange={(c) =>
                          setEditingPageMeta({
                            ...editingPageMeta,
                            layout: { ...editingPageMeta.layout, hideFooter: c },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold">
                          Masquer le Bandeau Défilant (Ticker & Promo) :
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Désactive le bandeau d'annonces en haut de page.
                        </p>
                      </div>
                      <Switch
                        checked={editingPageMeta.layout?.hideTicker ?? false}
                        onCheckedChange={(c) =>
                          setEditingPageMeta({
                            ...editingPageMeta,
                            layout: { ...editingPageMeta.layout, hideTicker: c },
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-bold">
                          Masquer le Contact Flottant WhatsApp :
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Retire le bouton flottant WhatsApp en bas d'écran.
                        </p>
                      </div>
                      <Switch
                        checked={editingPageMeta.layout?.hideFloatingContact ?? false}
                        onCheckedChange={(c) =>
                          setEditingPageMeta({
                            ...editingPageMeta,
                            layout: { ...editingPageMeta.layout, hideFloatingContact: c },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 🚀 ONGLET 3 : SEO & RÉSEAUX SOCIAUX                       */}
              {/* ========================================================= */}
              {metaModalTab === "seo" && (
                <div className="space-y-4 animate-fade-in">
                  {/* Sélecteur de langue trilingue FR / EN / AR */}
                  <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50">
                    <Button
                      type="button"
                      size="sm"
                      variant={metaLang === "fr" ? "secondary" : "ghost"}
                      className="text-xs h-7 flex-1 font-semibold"
                      onClick={() => setMetaLang("fr")}
                    >
                      Français (FR)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={metaLang === "en" ? "secondary" : "ghost"}
                      className="text-xs h-7 flex-1 font-semibold"
                      onClick={() => setMetaLang("en")}
                    >
                      English (EN)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={metaLang === "ar" ? "secondary" : "ghost"}
                      className="text-xs h-7 flex-1 font-semibold"
                      onClick={() => setMetaLang("ar")}
                    >
                      العربية (AR)
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Titre Balise &lt;title&gt; SEO ({metaLang.toUpperCase()}) :
                    </Label>
                    <Input
                      value={toLocObj(editingPageMeta.seo?.metaTitle)[metaLang]}
                      onChange={(e) =>
                        setEditingPageMeta({
                          ...editingPageMeta,
                          seo: {
                            ...editingPageMeta.seo,
                            metaTitle: {
                              ...toLocObj(editingPageMeta.seo?.metaTitle),
                              [metaLang]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Titre personnalisé pour Google (laisser vide pour titre automatique)"
                      dir={metaLang === "ar" ? "rtl" : "ltr"}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Meta Description SEO ({metaLang.toUpperCase()}) :
                    </Label>
                    <Textarea
                      rows={2}
                      value={toLocObj(editingPageMeta.seo?.metaDescription)[metaLang]}
                      onChange={(e) =>
                        setEditingPageMeta({
                          ...editingPageMeta,
                          seo: {
                            ...editingPageMeta.seo,
                            metaDescription: {
                              ...toLocObj(editingPageMeta.seo?.metaDescription),
                              [metaLang]: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Texte descriptif affiché dans les résultats de recherche Google..."
                      dir={metaLang === "ar" ? "rtl" : "ltr"}
                      className="text-xs"
                    />
                  </div>

                  <MediaPickerField
                    label="Image OpenGraph (Partage Réseaux Sociaux)"
                    description="Visuel affiché lors du partage du lien sur Facebook, LinkedIn, Twitter/X, WhatsApp"
                    value={editingPageMeta.seo?.ogImage || ""}
                    onChange={(url) =>
                      setEditingPageMeta({
                        ...editingPageMeta,
                        seo: { ...editingPageMeta.seo, ogImage: url },
                      })
                    }
                  />

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      URL Canonique personnalisée (Optionnel) :
                    </Label>
                    <Input
                      value={editingPageMeta.seo?.canonicalUrl || ""}
                      onChange={(e) =>
                        setEditingPageMeta({
                          ...editingPageMeta,
                          seo: { ...editingPageMeta.seo, canonicalUrl: e.target.value },
                        })
                      }
                      placeholder="ex: https://mon-domaine.com/cv"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div>
                      <Label className="text-xs font-bold">
                        Interdire l'indexation (noindex, nofollow) :
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Empêche les robots d'indexer cette page dans les moteurs de recherche.
                      </p>
                    </div>
                    <Switch
                      checked={editingPageMeta.seo?.noIndex ?? false}
                      onCheckedChange={(c) =>
                        setEditingPageMeta({
                          ...editingPageMeta,
                          seo: { ...editingPageMeta.seo, noIndex: c },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPageModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSavePageMeta} className="font-semibold">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Catalogue des Blocs Universels */}
      <Dialog open={addBlockModalOpen} onOpenChange={setAddBlockModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto text-start">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Catalogue des Blocs Universels ({BLOCK_REGISTRY.length} Blocs)</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choisissez un bloc à ajouter dans votre vue. Il sera inséré à la suite des blocs
              existants.
            </DialogDescription>
          </DialogHeader>

          {/* Filtres par famille */}
          <div className="flex flex-wrap gap-1.5 py-2 border-b border-border/40">
            <Button
              size="sm"
              variant={selectedFamily === "all" ? "default" : "outline"}
              onClick={() => setSelectedFamily("all")}
              className="text-xs h-7 px-2.5"
            >
              Tous ({BLOCK_REGISTRY.length})
            </Button>
            <Button
              size="sm"
              variant={selectedFamily === "identity" ? "default" : "outline"}
              onClick={() => setSelectedFamily("identity")}
              className="text-xs h-7 px-2.5"
            >
              👤 Identité & CV
            </Button>
            <Button
              size="sm"
              variant={selectedFamily === "commerce" ? "default" : "outline"}
              onClick={() => setSelectedFamily("commerce")}
              className="text-xs h-7 px-2.5"
            >
              🛍️ Commerce & Vitrine
            </Button>
            <Button
              size="sm"
              variant={selectedFamily === "social" ? "default" : "outline"}
              onClick={() => setSelectedFamily("social")}
              className="text-xs h-7 px-2.5"
            >
              🤝 Preuve Sociale & Avis
            </Button>
            <Button
              size="sm"
              variant={selectedFamily === "interaction" ? "default" : "outline"}
              onClick={() => setSelectedFamily("interaction")}
              className="text-xs h-7 px-2.5"
            >
              💬 Contact & Interaction
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 py-3">
            {BLOCK_REGISTRY.filter(
              (b) => selectedFamily === "all" || b.family === selectedFamily,
            ).map((block) => (
              <div
                key={block.type}
                onClick={() => handleAddBlock(block.type)}
                className="cursor-pointer rounded-2xl border border-border/60 bg-card/60 p-4 hover:border-primary hover:bg-primary/5 transition-all flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {L(block.label)}
                    </h4>
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {L(block.description)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBlockModalOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
