import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSiteContent, useSiteContentMutations } from "@/data-provider";
import { useI18n, useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig, BlockType, CustomPageDefinition, BlockStyleConfig } from "@/types/pages";
import { BLOCK_REGISTRY, getBlockMeta } from "@/components/blocks";
import { BlockPropsEditor } from "@/components/admin/BlockPropsEditor";
import { StudioLiveCanvas } from "@/components/admin/StudioLiveCanvas";
import { cn } from "@/lib/utils";
import AdminContent from "./Content";

type LangCode = "fr" | "en" | "ar";
const LANGS: LangCode[] = ["fr", "en", "ar"];

function toLocObj(v: Localized<string> | undefined): { fr: string; en: string; ar: string } {
  if (!v) return { fr: "", en: "", ar: "" };
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: v.fr ?? "", en: v.en ?? "", ar: v.ar ?? "" };
}

export default function PagesManager() {
  const { data: siteContent } = useSiteContent();
  const { update: updateSiteContent } = useSiteContentMutations();
  const { t } = useI18n();
  const L = useLocalize();

  const customPages = useMemo(() => {
    return siteContent?.customPages || [];
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

  // Mode d'affichage : WYSYWIG Canvas (par défaut) vs Structure classique
  const [studioViewMode, setStudioViewMode] = useState<"canvas" | "structure">("canvas");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

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
    if (!isDirty && siteContent?.customPages) {
      setPages(siteContent.customPages);
      if (!selectedPageId && siteContent.customPages.length > 0) {
        setSelectedPageId(siteContent.customPages[0].id);
      }
    }
  }, [siteContent?.customPages, isDirty, selectedPageId]);

  const selectedPage = pages.find((p) => p.id === selectedPageId) || null;

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
      toast.success(t("common.saved") || "Pages et blocs enregistrés avec succès !");
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
      blocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setPageModalOpen(true);
  };

  // Ouverture modal édition paramètres de page
  const handleOpenEditPageMeta = (p: CustomPageDefinition) => {
    setEditingPageMeta({ ...p });
    setPageModalOpen(true);
  };

  // Enregistrement modal page
  const handleSavePageMeta = () => {
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
      blocks: editingPageMeta.blocks || [],
      createdAt: editingPageMeta.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === newPage.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newPage;
        return next;
      }
      return [...prev, newPage];
    });

    setIsDirty(true);
    setPageModalOpen(false);
    setSelectedPageId(newPage.id);
    toast.success(isHomePage ? "Vue d'Accueil configurée." : `Vue "/${newPage.slug}" configurée.`);
  };

  // Suppression d'une page
  const handleDeletePage = (id: string) => {
    const pageToDelete = pages.find((p) => p.id === id);
    if (!pageToDelete) return;

    if (
      pageToDelete.id === "page_home" ||
      pageToDelete.slug === "" ||
      pageToDelete.slug === "home"
    ) {
      toast.error("La page d'accueil est une vue racine du système et ne peut pas être supprimée.");
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

            {isDirty && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                Modifications non enregistrées
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="gap-2 font-semibold shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Enregistrement..." : "Enregistrer"}</span>
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
          {/* Sélecteur de mode tactile / mobile / tablette (< 1024px) */}
          <div className="flex lg:hidden items-center p-1 bg-muted/60 rounded-xl border border-border gap-1">
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
                      <SelectContent>
                        {pages.map((p) => {
                          const isHome = p.id === "page_home" || p.slug === "" || p.slug === "home";
                          const title = L(p.title) || (isHome ? "Accueil" : p.slug);
                          return (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {isHome ? "🏠 Accueil Vitrine (/)" : `/${p.slug} (${title})`}
                            </SelectItem>
                          );
                        })}
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
                "h-[740px] w-full",
                canvasColsClass,
                mobileStudioView !== "canvas" && "hidden lg:block",
              )}
            >
              <StudioLiveCanvas
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
              />
            </div>

            {/* Colonne Droite (3 cols) : Inspecteur Fin de Propriétés & Styles */}
            {!rightCollapsed && (
              <div
                className={cn(
                  "lg:col-span-3",
                  mobileStudioView !== "inspector" && "hidden lg:block",
                )}
              >
                {selectedPage && selectedBlock ? (
                  <Card className="h-full flex flex-col shadow-xs border-border">
                    <CardHeader className="py-2.5 px-3.5 border-b border-border/40 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                          <Settings className="size-3.5 text-primary" />
                          <span>{L(selectedBlockMeta?.label) || selectedBlock.type}</span>
                        </CardTitle>
                        <CardDescription className="text-[10px]">
                          Inspecteur visuel & fin
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => handleToggleBlock(selectedBlockIdx)}
                          title={selectedBlock.enabled ? "Désactiver ce bloc" : "Activer ce bloc"}
                        >
                          {selectedBlock.enabled ? (
                            <Eye className="size-3.5 text-emerald-500" />
                          ) : (
                            <EyeOff className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteBlock(selectedBlockIdx)}
                          title="Supprimer ce bloc"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setRightCollapsed(true)}
                          title="Replier le volet inspecteur"
                        >
                          <PanelRightClose className="size-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 overflow-y-auto max-h-[640px]">
                      <BlockPropsEditor
                        block={selectedBlock}
                        onChange={(newProps) => handleUpdateBlockProps(selectedBlockIdx, newProps)}
                        onStyleChange={(newStyle) =>
                          handleUpdateBlockStyle(selectedBlockIdx, newStyle)
                        }
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <Settings className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-foreground">Aucun bloc sélectionné</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Cliquez sur un bloc dans le Canvas ou dans l'arborescence de gauche pour
                      personnaliser son contenu et son style.
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
        <DialogContent className="sm:max-w-md text-start">
          <DialogHeader>
            <DialogTitle>Paramètres de la Vue</DialogTitle>
            <DialogDescription className="text-xs">
              Définissez l'adresse URL (slug) et la visibilité de cette vue.
            </DialogDescription>
          </DialogHeader>

          {editingPageMeta && (
            <div className="space-y-4 py-2">
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
                  Description SEO ({metaLang.toUpperCase()}) :
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
                  onCheckedChange={(c) => setEditingPageMeta({ ...editingPageMeta, inNavbar: c })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div>
                  <Label className="text-xs font-bold">Lien dans le pied de page (Footer) :</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Insère un lien dans la colonne institutionnelle du pied de page.
                  </p>
                </div>
                <Switch
                  checked={editingPageMeta.inFooter ?? false}
                  onCheckedChange={(c) => setEditingPageMeta({ ...editingPageMeta, inFooter: c })}
                />
              </div>
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
