import React, { useState, useEffect } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  ArrowUp,
  ArrowDown,
  Trash2,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  PanelsTopLeft,
  Truck,
  Clock,
  Package,
  CheckCircle2,
  ShoppingBag,
  Cpu,
  Newspaper,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BlockConfig, CustomPageDefinition } from "@/types/pages";
import { getBlockMeta, BLOCK_COMPONENTS } from "@/components/blocks";
import { BlockWrapper } from "@/components/blocks/BlockWrapper";
import { useLocalize } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface StudioLiveCanvasProps {
  page?: CustomPageDefinition | null;
  blocks: BlockConfig[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onMoveBlockUp?: (index: number) => void;
  onMoveBlockDown?: (index: number) => void;
  onToggleBlock?: (index: number) => void;
  onDeleteBlock?: (index: number) => void;
  onOpenAddModal?: () => void;
  leftCollapsed?: boolean;
  onToggleLeft?: () => void;
  rightCollapsed?: boolean;
  onToggleRight?: () => void;
  isZenMode?: boolean;
  onToggleZen?: () => void;
}

/**
 * ⚙️ Réplique visuelle représentative du cœur applicatif des Vues Systèmes
 * Permet à l'administrateur de voir la vraie page métier au centre de ses blocs personnalisés.
 */
function SystemViewNativePreview({ page }: { page: CustomPageDefinition }) {
  const L = useLocalize();
  const slug = page.slug || "";
  const systemKey =
    page.systemKey ||
    (slug === "track" || slug === "suivi"
      ? "track"
      : slug === "cart" || slug === "panier"
        ? "cart"
        : slug === "builder" || slug === "configurateur"
          ? "builder"
          : slug === "blog"
            ? "blog"
            : slug === "checkout-success" || slug === "checkout/success"
              ? "checkout_success"
              : slug === "404"
                ? "not_found"
                : null);

  if (!systemKey) return null;

  return (
    <div className="p-4 sm:p-6 bg-card border-y-2 border-dashed border-primary/40 my-3 rounded-xl shadow-xs space-y-4">
      {/* Badge d'identification du cœur fonctionnel */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-bold gap-1 py-1 px-2.5">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>Cœur Fonctionnel Natif : {L(page.title) || page.slug}</span>
          </Badge>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            (Interface réelle générée par la plateforme)
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Emplacement dynamique
        </Badge>
      </div>

      {/* Rendu spécifique par vue métier */}
      {systemKey === "track" && (
        <div className="max-w-xl mx-auto space-y-4 py-2">
          <div className="text-center space-y-1">
            <div className="size-10 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-1">
              <Truck className="size-5" />
            </div>
            <h3 className="font-bold text-base">Suivre l'acheminement de mon colis</h3>
            <p className="text-xs text-muted-foreground">
              Saisissez votre référence de commande et numéro de téléphone
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 bg-muted/40 p-3 rounded-lg border">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">N° Commande</span>
              <div className="h-8 rounded bg-background border px-2.5 text-xs flex items-center font-mono">
                CMD-2026-9842
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground">Téléphone</span>
              <div className="h-8 rounded bg-background border px-2.5 text-xs flex items-center font-mono">
                +213 555 12 34 56
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-background space-y-3">
            <div className="flex items-center justify-between text-xs font-bold border-b pb-2">
              <span>Statut : En cours de livraison</span>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                Expédié
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span className="text-[10px] text-muted-foreground">Validée</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                  ✓
                </div>
                <span className="text-[10px] text-muted-foreground">Préparée</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] animate-pulse">
                  🚚
                </div>
                <span className="text-[10px] font-bold text-primary">Expédiée</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px]">
                  4
                </div>
                <span className="text-[10px] text-muted-foreground">Livrée</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {systemKey === "cart" && (
        <div className="max-w-2xl mx-auto space-y-4 py-2">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-bold text-base flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <span>Articles dans votre Panier</span>
            </h3>
            <Badge variant="outline" className="text-xs">
              2 articles
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground">
                  PC
                </div>
                <div>
                  <div className="font-bold">PC Portable Pro Gaming 16" QHD</div>
                  <div className="text-muted-foreground text-[10px]">
                    Core i7 · 32GB RAM · 1TB NVMe
                  </div>
                </div>
              </div>
              <div className="text-end font-bold text-primary">185 000 DZD</div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background text-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground">
                  LCD
                </div>
                <div>
                  <div className="font-bold">Écran Gaming 27" 165Hz IPS 1ms</div>
                  <div className="text-muted-foreground text-[10px]">
                    QHD 2560x1440 · FreeSync / G-Sync
                  </div>
                </div>
              </div>
              <div className="text-end font-bold text-primary">42 000 DZD</div>
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">Total estimé avec livraison 58 wilayas :</span>
            <span className="text-base text-primary">227 600 DZD</span>
          </div>
        </div>
      )}

      {systemKey === "builder" && (
        <div className="max-w-2xl mx-auto space-y-4 py-2">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              <span>Configurateur PC sur Mesure (8 Étapes)</span>
            </h3>
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
              100% Compatible
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 border rounded bg-background flex items-center justify-between">
              <span>1. Boîtier : Verre Trempé RGB</span>
              <span className="font-bold text-primary">14 500 DZD</span>
            </div>
            <div className="p-2 border rounded bg-background flex items-center justify-between">
              <span>2. Carte Mère : B760 DDR5</span>
              <span className="font-bold text-primary">26 000 DZD</span>
            </div>
            <div className="p-2 border rounded bg-background flex items-center justify-between">
              <span>3. CPU : Intel Core i5-14600KF</span>
              <span className="font-bold text-primary">48 000 DZD</span>
            </div>
            <div className="p-2 border rounded bg-background flex items-center justify-between">
              <span>4. RAM : 32GB DDR5 6000MHz</span>
              <span className="font-bold text-primary">22 000 DZD</span>
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-background flex items-center justify-between text-xs font-bold">
            <span>Total Configuration Sélectionnée :</span>
            <span className="text-base text-primary">285 000 DZD</span>
          </div>
        </div>
      )}

      {systemKey === "blog" && (
        <div className="max-w-2xl mx-auto space-y-4 py-2">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Newspaper className="size-4 text-primary" />
              <span>Hub Blog & Actualités Tech</span>
            </h3>
            <span className="text-xs text-muted-foreground">Listing dynamique des articles</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 border rounded-xl bg-background space-y-1.5">
              <Badge variant="secondary" className="text-[9px]">
                Guide Matériel
              </Badge>
              <div className="font-bold text-sm">Guide d'Achat PC Portable 2026</div>
              <p className="text-muted-foreground text-[11px] line-clamp-2">
                Comment choisir les meilleurs composants selon vos besoins professionnels et gaming.
              </p>
            </div>
            <div className="p-3 border rounded-xl bg-background space-y-1.5">
              <Badge variant="secondary" className="text-[9px]">
                Logistique
              </Badge>
              <div className="font-bold text-sm">Livraison Express 58 Wilayas</div>
              <p className="text-muted-foreground text-[11px] line-clamp-2">
                Découvrez notre réseau logistique en Cash-on-Delivery et nos garanties de suivi.
              </p>
            </div>
          </div>
        </div>
      )}

      {systemKey === "checkout_success" && (
        <div className="max-w-md mx-auto text-center space-y-3 py-4">
          <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="font-bold text-lg">Commande Confirmée avec Succès !</h3>
          <p className="text-xs text-muted-foreground">
            Votre commande #CMD-2026-8741 a été transmise à notre service logistique.
          </p>
          <div className="p-3 border rounded-lg bg-background text-xs text-start space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Sous-total:</span>
              <span>185 000 DZD</span>
            </div>
            <div className="flex justify-between">
              <span>Livraison:</span>
              <span>Gratuite</span>
            </div>
            <div className="flex justify-between font-bold text-primary pt-1 border-t">
              <span>Total Payé:</span>
              <span>185 000 DZD</span>
            </div>
          </div>
        </div>
      )}

      {systemKey === "not_found" && (
        <div className="max-w-md mx-auto text-center space-y-2 py-6">
          <span className="text-5xl font-black text-muted-foreground/40 font-mono">404</span>
          <h3 className="font-bold text-lg">Page Introuvable</h3>
          <p className="text-xs text-muted-foreground">
            La page demandée n'existe pas ou a été déplacée par l'administrateur.
          </p>
        </div>
      )}
    </div>
  );
}

export function StudioLiveCanvas({
  page,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onMoveBlockUp,
  onMoveBlockDown,
  onToggleBlock: _onToggleBlock,
  onDeleteBlock,
  onOpenAddModal,
  leftCollapsed,
  onToggleLeft,
  rightCollapsed,
  onToggleRight,
  isZenMode,
  onToggleZen,
}: StudioLiveCanvasProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [showSiteFrame, setShowSiteFrame] = useState(false);
  const L = useLocalize();

  // 📱 Auto-détection intelligente du terminal au montage selon la largeur d'écran
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    if (w < 640) {
      setDevice("mobile");
    } else if (w < 1024) {
      setDevice("tablet");
    }
  }, []);

  // 🎯 Auto-scroll focalisé : fait défiler le visualiseur directement vers le bloc sélectionné
  useEffect(() => {
    if (!selectedBlockId) return;
    const el = document.getElementById(`studio-canvas-block-${selectedBlockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedBlockId]);

  const getViewportWidth = () => {
    switch (device) {
      case "mobile":
        return "w-full max-w-[375px]";
      case "tablet":
        return "w-full max-w-[768px]";
      default:
        return "w-full";
    }
  };

  const getDeviceSimulationClass = () => {
    if (device === "mobile") return "simulate-mobile";
    if (device === "tablet") return "simulate-tablet";
    return "";
  };

  const isSystemPage = Boolean(
    page?.isSystem ||
    page?.systemKey ||
    page?.id?.startsWith("system_") ||
    (page?.slug &&
      ["track", "cart", "builder", "blog", "checkout-success", "404"].includes(page.slug)),
  );

  const topBlocks = isSystemPage
    ? blocks.filter((b) => (b.style?.placement || "top") === "top")
    : blocks;
  const bottomBlocks = isSystemPage ? blocks.filter((b) => b.style?.placement === "bottom") : [];

  const renderSingleBlock = (block: BlockConfig, idx: number, total: number) => {
    const isSelected = selectedBlockId === block.id;
    const meta = getBlockMeta(block.type);
    const Component = BLOCK_COMPONENTS[block.type];

    if (!block.enabled) {
      return (
        <div
          key={block.id}
          id={`studio-canvas-block-${block.id}`}
          onClick={() => onSelectBlock(block.id)}
          className={cn(
            "p-3 text-center bg-muted/30 border border-dashed border-border/70 cursor-pointer transition-all hover:bg-muted/50",
            isSelected && "ring-2 ring-primary border-primary",
          )}
        >
          <span className="text-xs font-semibold text-muted-foreground italic">
            [Bloc désactivé : {L(meta?.label) || block.type}] — Cliquez pour configurer
          </span>
        </div>
      );
    }

    return (
      <div
        key={block.id}
        id={`studio-canvas-block-${block.id}`}
        onClick={() => onSelectBlock(block.id)}
        className={cn(
          "group/canvas relative transition-all duration-200 cursor-pointer",
          isSelected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10"
            : "hover:outline hover:outline-2 hover:outline-primary/40",
        )}
      >
        {/* Badge du bloc en haut au survol ou sélection */}
        <div
          className={cn(
            "absolute top-2 start-2 z-20 flex items-center gap-1.5 transition-opacity duration-150",
            isSelected ? "opacity-100" : "opacity-0 group-hover/canvas:opacity-100",
          )}
        >
          <Badge
            variant="secondary"
            className="bg-background/90 text-foreground border border-border shadow-xs text-[10px] font-bold py-0.5 px-2 backdrop-blur-xs flex items-center gap-1"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            <span>{L(meta?.label) || block.type}</span>
          </Badge>
          {block.style?.placement && (
            <Badge
              variant="outline"
              className="bg-background/80 text-[9px] font-semibold py-0.5 px-1.5"
            >
              {block.style.placement === "bottom" ? "En bas" : "En haut"}
            </Badge>
          )}
        </div>

        {/* Mini-barre d'actions rapides (Monter/Descendre/Supprimer) si sélectionné */}
        {isSelected && (
          <div className="absolute top-2 end-2 z-20 flex items-center gap-1 bg-background/95 border border-border rounded-lg shadow-md p-0.5 backdrop-blur-sm animate-fade-in">
            {onMoveBlockUp && (
              <button
                type="button"
                disabled={idx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBlockUp(idx);
                }}
                className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                title="Monter ce bloc"
              >
                <ArrowUp className="size-3.5" />
              </button>
            )}
            {onMoveBlockDown && (
              <button
                type="button"
                disabled={idx === total - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBlockDown(idx);
                }}
                className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                title="Descendre ce bloc"
              >
                <ArrowDown className="size-3.5" />
              </button>
            )}
            <span className="w-px h-3.5 bg-border mx-0.5" />
            {onDeleteBlock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBlock(idx);
                }}
                className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Supprimer ce bloc"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Rendu réel du composant via BlockWrapper */}
        <BlockWrapper config={block}>
          {Component ? (
            <Component config={block} />
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Bloc introuvable : {block.type}
            </div>
          )}
        </BlockWrapper>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-muted/20 overflow-hidden shadow-xs">
      {/* Barre d'outils du Canvas avec volets rétractables & Zen Mode */}
      <div className="flex items-center justify-between px-3 py-2 bg-card/90 border-b border-border backdrop-blur-md gap-2">
        <div className="flex items-center gap-2">
          {onToggleLeft && (
            <Button
              size="icon"
              variant="outline"
              className="size-7 rounded-md shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleLeft}
              title={
                leftCollapsed
                  ? "Ouvrir le volet d'arborescence (gauche)"
                  : "Replier le volet gauche"
              }
            >
              {leftCollapsed ? (
                <PanelLeftOpen className="size-3.5" />
              ) : (
                <PanelLeftClose className="size-3.5" />
              )}
            </Button>
          )}

          <div className="flex items-center gap-1.5 hidden sm:flex">
            <Eye className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">Live Canvas</span>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 font-semibold bg-primary/10 text-primary border-primary/30"
            >
              WYSYWIG 360°
            </Badge>
          </div>
        </div>

        {/* Sélecteur de résolutions d'écran */}
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
              device === "desktop"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Résolution Bureau (100%)"
          >
            <Monitor className="size-3.5" />
            <span className="hidden md:inline">Bureau</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice("tablet")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
              device === "tablet"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Résolution Tablette (768px)"
          >
            <Tablet className="size-3.5" />
            <span className="hidden md:inline">Tablette</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
              device === "mobile"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Résolution Mobile (375px)"
          >
            <Smartphone className="size-3.5" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        {/* Contrôles droits : Cadre Site, Mode Zen & Volet Inspecteur */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={showSiteFrame ? "default" : "outline"}
            className="h-7 px-2 text-xs font-semibold gap-1 rounded-md"
            onClick={() => setShowSiteFrame((prev) => !prev)}
            title={
              showSiteFrame
                ? "Masquer le Header et Footer réels du site"
                : "Afficher le Header et Footer réels du site (immersion globale)"
            }
          >
            <PanelsTopLeft className="size-3.5" />
            <span className="hidden sm:inline">Cadre Site</span>
          </Button>

          {onToggleZen && (
            <Button
              size="sm"
              variant={isZenMode ? "default" : "outline"}
              className="h-7 px-2 text-xs font-semibold gap-1 rounded-md"
              onClick={onToggleZen}
              title={
                isZenMode
                  ? "Quitter le Plein Écran Zen"
                  : "Activer le Plein Écran Zen (100% Canvas)"
              }
            >
              {isZenMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              <span className="hidden lg:inline">{isZenMode ? "Normal" : "Zen"}</span>
            </Button>
          )}

          {onToggleRight && (
            <Button
              size="icon"
              variant="outline"
              className="size-7 rounded-md shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleRight}
              title={rightCollapsed ? "Ouvrir l'inspecteur (droite)" : "Replier le volet droit"}
            >
              {rightCollapsed ? (
                <PanelRightOpen className="size-3.5" />
              ) : (
                <PanelRightClose className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Surface de rendu WYSYWIG avec scrolling dédié */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-6 flex justify-center items-start bg-muted/15 max-w-full overflow-x-hidden">
        <div
          className={cn(
            "w-full transition-all duration-300 ease-out bg-background min-h-[500px] box-border max-w-full",
            getViewportWidth(),
            getDeviceSimulationClass(),
            device !== "desktop" &&
              "rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-700/80 shadow-2xl overflow-hidden my-2",
          )}
        >
          {device !== "desktop" && (
            <div className="bg-slate-800 text-slate-300 text-[10px] font-mono py-1 px-4 flex items-center justify-between border-b border-slate-700 select-none">
              <span>{device === "mobile" ? "375 × 812 (iPhone)" : "768 × 1024 (iPad)"}</span>
              <div className="size-2 rounded-full bg-slate-500" />
            </div>
          )}

          {showSiteFrame && (
            <div className="border-b border-border pointer-events-none select-none opacity-90 scale-[0.99] origin-top bg-background shadow-xs">
              <Header />
            </div>
          )}

          {/* Rendu lorsque aucun bloc custom n'est présent */}
          {blocks.length === 0 ? (
            isSystemPage && page ? (
              <div className="divide-y divide-border/20">
                <div className="p-4 bg-primary/5 border-b border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Cœur Métier Système Actif</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Cette page exécute son interface métier ci-dessous. Vous pouvez enrichir
                      l'expérience en ajoutant des bannières, réassurances ou FAQs au-dessus et
                      en-dessous.
                    </p>
                  </div>
                  {onOpenAddModal && (
                    <Button
                      size="sm"
                      onClick={onOpenAddModal}
                      className="h-7 text-xs font-semibold gap-1 shrink-0"
                    >
                      <Plus className="size-3" />
                      <span>Ajouter un bloc</span>
                    </Button>
                  )}
                </div>
                <SystemViewNativePreview page={page} />
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Plus className="size-6" />
                </div>
                <h4 className="font-bold text-base text-foreground mb-1">Cette vue est vide</h4>
                <p className="text-xs text-muted-foreground max-w-xs mb-4">
                  Ajoutez un premier bloc depuis le catalogue pour composer l'affichage de cette
                  page.
                </p>
                {onOpenAddModal && (
                  <Button
                    size="sm"
                    onClick={onOpenAddModal}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="size-3.5" />
                    <span>Ajouter un bloc</span>
                  </Button>
                )}
              </div>
            )
          ) : isSystemPage && page ? (
            <div className="divide-y divide-border/20">
              {/* Blocs positionnés en haut */}
              {topBlocks.map((b) => renderSingleBlock(b, blocks.indexOf(b), blocks.length))}

              {/* Cœur applicatif fidèle au centre */}
              <SystemViewNativePreview page={page} />

              {/* Blocs positionnés en bas */}
              {bottomBlocks.map((b) => renderSingleBlock(b, blocks.indexOf(b), blocks.length))}
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {blocks.map((b, i) => renderSingleBlock(b, i, blocks.length))}
            </div>
          )}

          {showSiteFrame && (
            <div className="border-t border-border pointer-events-none select-none opacity-90 scale-[0.99] origin-bottom mt-8 bg-background shadow-xs">
              <Footer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
