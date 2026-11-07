import React, { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Eye,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerDialog } from "@/components/admin/MediaPickerField";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
  error?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 14,
  disabled = false,
  dir = "ltr",
  error,
  className,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Dialogs state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  /**
   * Insère ou enveloppe du texte à la position du curseur
   */
  function insertFormatting(prefix: string, suffix: string = "", placeholderText: string = "") {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + prefix + placeholderText + suffix);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = value.slice(start, end);
    const textToInsert = selectedText || placeholderText;
    const replacement = prefix + textToInsert + suffix;

    const nextValue = value.slice(0, start) + replacement + value.slice(end);
    onChange(nextValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + textToInsert.length);
    }, 0);
  }

  function handleInsertLink() {
    if (!linkUrl.trim()) return;
    const label = linkText.trim() || linkUrl.trim();
    insertFormatting(`[${label}](`, ")", linkUrl.trim());
    setLinkModalOpen(false);
    setLinkText("");
    setLinkUrl("");
  }

  function handleInsertVideo() {
    if (!videoUrl.trim()) return;
    const url = videoUrl.trim();
    // Les vidéos se placent sur leur propre paragraphe
    insertFormatting("\n\n" + url + "\n\n", "", "");
    setVideoModalOpen(false);
    setVideoUrl("");
  }

  function handleSelectImageFromMedia(src: string) {
    insertFormatting(`\n\n![Image](${src})\n\n`, "", "");
    setMediaPickerOpen(false);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden shadow-xs transition-colors",
        error && "border-destructive ring-1 ring-destructive/20",
        className,
      )}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "edit" | "preview")}
        className="w-full"
      >
        {/* Barre d'en-tête : Outils d'édition + Commutateur Édition / Aperçu */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 p-2">
          {/* Barre d'outils de formatage */}
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("## ", "\n", "Titre de section")}
              title={t("admin.contenu.blog.editeur_titre2")}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("### ", "\n", "Sous-titre")}
              title={t("admin.contenu.blog.editeur_titre3")}
            >
              <Heading3 className="h-4 w-4" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("**", "**", "texte en gras")}
              title={t("admin.contenu.blog.editeur_gras")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("*", "*", "texte en italique")}
              title={t("admin.contenu.blog.editeur_italique")}
            >
              <Italic className="h-4 w-4" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("- ", "\n", "Élément de liste")}
              title={t("admin.contenu.blog.editeur_liste")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("1. ", "\n", "Premier élément")}
              title={t("admin.contenu.blog.editeur_liste_num")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => insertFormatting("> ", "\n", "Citation")}
              title={t("admin.contenu.blog.editeur_citation")}
            >
              <Quote className="h-4 w-4" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => {
                const el = textareaRef.current;
                const sel =
                  el && el.selectionStart !== el.selectionEnd
                    ? value.slice(el.selectionStart, el.selectionEnd)
                    : "";
                setLinkText(sel);
                setLinkModalOpen(true);
              }}
              title={t("admin.contenu.blog.editeur_lien")}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => setMediaPickerOpen(true)}
              title={t("admin.contenu.blog.editeur_image")}
            >
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <span>{t("admin.contenu.blog.editeur_image")}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
              disabled={disabled || activeTab !== "edit"}
              onClick={() => setVideoModalOpen(true)}
              title={t("admin.contenu.blog.editeur_video")}
            >
              <Video className="h-3.5 w-3.5 text-red-500" />
              <span>{t("admin.contenu.blog.editeur_video")}</span>
            </Button>
          </div>

          {/* Commutateur Édition / Aperçu */}
          <TabsList className="h-8 bg-background/80 border border-border">
            <TabsTrigger value="edit" className="text-xs h-7 px-3 gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              <span>{t("admin.contenu.blog.editeur_edition")}</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs h-7 px-3 gap-1.5">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>{t("admin.contenu.blog.editeur_apercu")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Vue Édition (Textarea) */}
        <TabsContent value="edit" className="m-0 p-0 focus-visible:outline-none">
          <Textarea
            ref={textareaRef}
            dir={dir}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="w-full resize-y rounded-none border-0 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed focus-visible:ring-0 focus-visible:outline-none"
          />
        </TabsContent>

        {/* Vue Aperçu en direct */}
        <TabsContent
          value="preview"
          className="m-0 p-6 min-h-[250px] max-h-[600px] overflow-y-auto bg-card focus-visible:outline-none"
          dir={dir}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm italic text-muted-foreground text-center py-12">
              {t("admin.contenu.blog.editeur_apercu_vide")}
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Modale d'insertion de lien */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.contenu.blog.editeur_dialog_lien_titre")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("admin.contenu.blog.editeur_dialog_lien_texte")}</Label>
              <Input
                placeholder="ex: Cliquez ici pour découvrir"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.contenu.blog.editeur_dialog_lien_url")}</Label>
              <Input
                type="url"
                placeholder="https://exemple.dz/produit"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInsertLink} disabled={!linkUrl.trim()}>
              {t("admin.contenu.blog.editeur_dialog_lien_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale d'insertion de vidéo */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="size-5 text-red-500" />
              <span>{t("admin.contenu.blog.editeur_dialog_video_titre")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              {t("admin.contenu.blog.editeur_dialog_video_desc")}
            </p>
            <div className="space-y-1.5">
              <Label>{t("admin.contenu.blog.editeur_dialog_video_url")}</Label>
              <Input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... ou /uploads/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInsertVideo} disabled={!videoUrl.trim()}>
              {t("admin.contenu.blog.editeur_dialog_video_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale Médiathèque pour insérer une image dans l'article */}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={handleSelectImageFromMedia}
      />
    </div>
  );
}
