import { useState, useRef, useMemo } from "react";
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { useMediaAssetList, useMediaAssetMutations, toApiError } from "@/data-provider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MediaPickerFieldProps {
  value?: string;
  defaultPreviewSrc?: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  aspectRatio?: "square" | "video" | "wide" | "auto";
  placeholder?: string;
}

export function MediaPickerField({
  value = "",
  defaultPreviewSrc,
  onChange,
  label,
  description,
  disabled = false,
  aspectRatio = "video",
  placeholder,
}: MediaPickerFieldProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { upload } = useMediaAssetMutations();

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const asset = await upload(file);
      onChange(asset.src);
      toast.success(t("admin.catalogue.media.toast_succes_simple"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(
        err.message ||
          t("admin.catalogue.media.toast_erreur_televersement") ||
          "Erreur lors du téléversement",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const ratioClass = useMemo(() => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square max-w-[160px]";
      case "wide":
        return "aspect-[21/9] max-h-36";
      case "auto":
        return "max-h-48 w-auto";
      case "video":
      default:
        return "aspect-[16/9] max-h-36";
    }
  }, [aspectRatio]);

  const activeSrc = value || defaultPreviewSrc || "";
  const isDefaultVisual = !value && !!defaultPreviewSrc;

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Zone d'aperçu */}
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center shrink-0 w-full sm:w-44",
            ratioClass,
          )}
        >
          {activeSrc ? (
            <>
              <ImageCatalogue src={activeSrc} alt="" className="h-full w-full object-cover" />
              {isDefaultVisual && (
                <div className="absolute bottom-1 inset-x-1 text-center bg-black/60 backdrop-blur-xs text-[10px] text-white/90 py-0.5 rounded px-1 truncate">
                  Visuel par défaut
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
              <ImageIcon className="size-8 opacity-40 mb-1" />
              <span className="text-[11px]">
                {placeholder || t("admin.catalogue.media.aucun_media")}
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Commandes d'action */}
        <div className="flex-1 space-y-2 w-full">
          <div className="flex flex-wrap gap-2">
            {/* Input fichier invisible */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
              onChange={handleFileUpload}
            />

            {/* Bouton Téléverser */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 me-1.5 animate-spin" />
              ) : (
                <Upload className="size-3.5 me-1.5" />
              )}
              {t("admin.catalogue.media.btn_televerser")}
            </Button>

            {/* Bouton Médiathèque */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => setDialogOpen(true)}
            >
              <ImageIcon className="size-3.5 me-1.5" />
              {t("admin.catalogue.media.choisir_mediatheque")}
            </Button>

            {/* Bascule Saisie manuelle URL */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => setShowManualUrl(!showManualUrl)}
              className="text-xs text-muted-foreground"
            >
              <LinkIcon className="size-3 me-1" />
              {showManualUrl ? "Masquer URL" : "URL externe"}
            </Button>

            {/* Effacer */}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onChange("")}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3 me-1" />
                {t("common.delete") || "Supprimer"}
              </Button>
            )}
          </div>

          {/* Saisie d'URL manuelle dépliée */}
          {showManualUrl && (
            <div className="pt-1">
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://... ou uploads/..."
                disabled={disabled || uploading}
                className="text-xs h-8"
              />
            </div>
          )}

          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>

      {/* Boîte de dialogue de sélection dans la médiathèque */}
      <MediaPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedSrc={value}
        onSelect={(src) => {
          onChange(src);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

/**
 * Boîte de dialogue modale pour choisir un média existant dans la médiathèque.
 */
interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSrc?: string;
  onSelect: (src: string) => void;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  selectedSrc,
  onSelect,
}: MediaPickerDialogProps) {
  const { t } = useI18n();
  const { data: mediaAssets, loading } = useMediaAssetList();
  const [search, setSearch] = useState("");

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return mediaAssets;
    const q = search.toLowerCase();
    return mediaAssets.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.tag && m.tag.toLowerCase().includes(q)),
    );
  }, [mediaAssets, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            {t("admin.catalogue.media.choisir_titre")}
          </DialogTitle>
        </DialogHeader>

        {/* Barre de recherche */}
        <div className="relative my-2">
          <Search className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.catalogue.media.recherche_placeholder")}
            className="ps-9"
          />
        </div>

        {/* Grille de vignettes */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] p-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <ImageIcon className="size-10 opacity-30 mb-2" />
              <p className="text-sm">
                {search
                  ? t("admin.catalogue.media.aucun_resultat")
                  : t("admin.catalogue.media.aucun_media")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = selectedSrc === asset.src;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset.src)}
                    className={cn(
                      "group relative aspect-square rounded-lg border overflow-hidden text-start transition-all hover:border-primary hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary",
                      isSelected ? "border-primary ring-2 ring-primary" : "border-border bg-card",
                    )}
                  >
                    <ImageCatalogue
                      src={asset.src}
                      alt={asset.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Badge sélection */}
                    {isSelected && (
                      <div className="absolute top-1.5 end-1.5 bg-primary text-primary-foreground rounded-full p-1 shadow">
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Légende au survol */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                      {asset.tag && (
                        <p className="text-[10px] text-white/70 truncate">#{asset.tag}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
