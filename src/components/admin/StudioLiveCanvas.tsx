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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BlockConfig } from "@/types/pages";
import { getBlockMeta, BLOCK_COMPONENTS } from "@/components/blocks";
import { BlockWrapper } from "@/components/blocks/BlockWrapper";
import { useLocalize } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface StudioLiveCanvasProps {
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

export function StudioLiveCanvas({
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

          {blocks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Plus className="size-6" />
              </div>
              <h4 className="font-bold text-base text-foreground mb-1">Cette vue est vide</h4>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Ajoutez un premier bloc depuis le catalogue pour composer l'affichage de cette page.
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
          ) : (
            <div className="divide-y divide-border/20">
              {blocks.map((block, idx) => {
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
                            disabled={idx === blocks.length - 1}
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
              })}
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
