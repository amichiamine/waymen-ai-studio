import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  RotateCcw,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import defaultLogoSrc from "@/assets/ka-tech-logo.webp";
import { resoudreUrlMedia } from "@/components/media-url";
import { MediaPickerDialog } from "@/components/admin/MediaPickerField";
import {
  useSiteSettings,
  useSiteSettingsMutations,
  useMediaAssetMutations,
  useTickerMessageList,
  useTickerMessageMutations,
  useMarqueeBrandList,
  useMarqueeBrandMutations,
  useAboutValueList,
  useAboutValueMutations,
  useBuilderStepList,
  useBuilderStepMutations,
  invalidateAll,
  toApiError,
} from "@/data-provider";
import { isHttpMode } from "@/api";
import { reinitialiserServeur } from "@/data-provider/maintenance";
import {
  resetData,
  type SiteSettings,
  type TickerMessage,
  type AboutValue,
  type BuilderStep,
} from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { formatPriceRaw } from "@/lib/format-price";
import {
  MarqueeBrandsVisualEditor,
  TickerMessagesVisualEditor,
  AboutValuesVisualEditor,
} from "@/components/admin/SettingsVisualEditors";
import { useI18n } from "@/lib/i18n";

// Répartition des permissions — voir docs/PERMISSIONS.md §2 et §3.3 :
//
// `manageSettings` (admin +) :
//   - Carte « Boutique »    : coordonnées, email, téléphone, adresse, horaires.
//   - Carte « Options »     : notifications, langue, note, seuils de stock.
//   - Carte « Bandeau »     : texte promotionnel, lien, bouton.
//   - Carte « Devise »      : symbole, position, séparateur de milliers.
//   - JSON « Marques »      : liste de marques du carrousel (cosmétique).
//   - JSON « Valeurs »      : cartes de la page À propos (contenu marketing).
//
// `manageCriticalSettings` (owner uniquement) :
//   - Carte « Mode maintenance » : coupe l'accès public au site.
//   - JSON « Bandeau défilant »  : écrase une structure entière visible en tête de site.
//   - JSON « Configurateur PC »  : écrase composants + tarifs du builder (impact métier fort).
//
// Justification : les éditeurs JSON bruts permettent d'écraser une structure
// entière en une seule opération. Quand la structure pilote le fonctionnement
// du site (tickers, builder), l'erreur a un impact immédiat sur la vitrine —
// même gravité que la maintenance. Les champs simples (marques, valeurs) ne
// risquent qu'un problème d'affichage cosmétique, `manageSettings` suffit.

export default function AdminSettings() {
  const { data: siteSettings, loading: lSettings, error: eSettings } = useSiteSettings();
  const { update: updateSettings } = useSiteSettingsMutations();

  const { data: tickerMessages } = useTickerMessageList();
  const { set: setTickers } = useTickerMessageMutations();

  const { data: marqueeBrands } = useMarqueeBrandList();
  const { set: setMarquee } = useMarqueeBrandMutations();

  const { data: aboutValues } = useAboutValueList();
  const { set: setAbout } = useAboutValueMutations();

  const { data: builderSteps } = useBuilderStepList();
  const { replace: replaceBuilder } = useBuilderStepMutations();

  const { can, guard, denyReason } = usePermissions();
  const { t } = useI18n();
  const [form, setForm] = useState<SiteSettings>(siteSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(siteSettings);
  }, [siteSettings]);

  async function saveSettings() {
    // Niveau 2 — vérification dans l'action avant toute mutation.
    if (!guard("manageSettings", t("admin.reglages.parametres.garde_enregistrer"))) return;
    if (form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
      toast.error(t("admin.reglages.parametres.toast_email_invalide"));
      return;
    }
    if (form.whatsapp && !/^\d{6,20}$/.test(form.whatsapp)) {
      toast.error(t("admin.reglages.parametres.toast_whatsapp_invalide"));
      return;
    }
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success(t("admin.reglages.parametres.toast_enregistre"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    // Réinitialiser les réglages courants — même niveau que saveSettings.
    if (!guard("manageSettings", t("admin.reglages.parametres.garde_reinitialiser"))) return;
    setSaving(true);
    try {
      if (isHttpMode()) {
        await reinitialiserServeur("reset", "siteSettings");
        invalidateAll();
      }
      resetData("siteSettings");
      toast.success(t("admin.reglages.parametres.toast_reinitialise"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const { upload: uploadMedia } = useMediaAssetMutations();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoMediaOpen, setLogoMediaOpen] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const COLOR_PRESETS = [
    { label: "Bleu Tech", value: "#2563eb" },
    { label: "Émeraude", value: "#059669" },
    { label: "Violet Royal", value: "#7c3aed" },
    { label: "Rouge Sport", value: "#dc2626" },
    { label: "Orange Solaire", value: "#ea580c" },
    { label: "Anthracite", value: "#18181b" },
  ];

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!guard("manageSettings", t("admin.reglages.parametres.garde_enregistrer"))) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("admin.reglages.parametres.toast_format_image_invalide"));
      return;
    }
    setUploadingLogo(true);
    try {
      const asset = await uploadMedia(file);
      set("logoUrl", asset.src);
      await updateSettings({ ...form, logoUrl: asset.src });
      toast.success(t("admin.reglages.parametres.toast_logo_succes"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message || t("admin.reglages.parametres.toast_logo_echec"));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!guard("manageSettings", t("admin.reglages.parametres.garde_enregistrer"))) return;
    if (!file.type.startsWith("image/") && !file.name.endsWith(".ico")) {
      toast.error(t("admin.reglages.parametres.toast_format_favicon_invalide"));
      return;
    }
    setUploadingFavicon(true);
    try {
      const asset = await uploadMedia(file);
      set("faviconUrl", asset.src);
      await updateSettings({ ...form, faviconUrl: asset.src });
      toast.success(t("admin.reglages.parametres.toast_favicon_succes"));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message || t("admin.reglages.parametres.toast_favicon_echec"));
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  }

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const disabledSettings = !can("manageSettings");
  const disabledCritical = !can("manageCriticalSettings");

  return (
    <AdminPageShell
      title={t("admin.reglages.parametres.titre")}
      description={t("admin.reglages.parametres.description")}
    >
      {eSettings && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {eSettings.message}
        </p>
      )}

      {lSettings ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
          <span className="sr-only">{t("admin.reglages.parametres.chargement")}</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bannière Setup Wizard d'Onboarding */}
          <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card overflow-hidden">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Assistant d'Installation & Configuration (Setup Wizard)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reconfigurez pas-à-pas l'identité de marque, les coordonnées, le secteur
                    d'activité et le catalogue démo.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent("open-setup-wizard"))}
                className="gap-2 shrink-0 border-primary/40 hover:bg-primary/10 text-xs font-semibold"
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Relancer l'assistant</span>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Boutique ── manageSettings ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.reglages.parametres.carte_boutique_titre")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t("admin.reglages.parametres.champ_nom")}</Label>
                  <Input
                    value={form.storeName}
                    onChange={(e) => set("storeName", e.target.value)}
                    disabled={disabledSettings}
                  />
                </div>

                {/* Logo de la boutique */}
                <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Logo de la boutique</Label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {form.logoUrl ? "Logo personnalisé" : "Logo officiel par défaut"}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    {/* Aperçu en direct */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-md border border-border bg-card dark:bg-white/95 shrink-0 min-w-28 h-14 shadow-xs">
                      <img
                        src={
                          form.logoUrl && form.logoUrl.trim() !== ""
                            ? resoudreUrlMedia(form.logoUrl)
                            : defaultLogoSrc
                        }
                        alt="Aperçu logo"
                        className="max-h-10 max-w-24 object-contain"
                      />
                    </div>

                    <div className="flex-1 w-full space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          value={form.logoUrl ?? ""}
                          onChange={(e) => set("logoUrl", e.target.value)}
                          placeholder="URL de l'image (https://... ou téléversez)"
                          disabled={disabledSettings || uploadingLogo}
                          className="text-xs h-9"
                        />
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={disabledSettings || uploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="gap-1.5 shrink-0 text-xs h-9"
                        >
                          <Upload className="size-3.5" />
                          {uploadingLogo ? "Téléversement…" : "Téléverser"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabledSettings || uploadingLogo}
                          onClick={() => setLogoMediaOpen(true)}
                          className="gap-1.5 shrink-0 text-xs h-9"
                        >
                          <ImageIcon className="size-3.5" />
                          Médiathèque
                        </Button>
                      </div>

                      <MediaPickerDialog
                        open={logoMediaOpen}
                        onOpenChange={setLogoMediaOpen}
                        selectedSrc={form.logoUrl ?? ""}
                        onSelect={async (src) => {
                          set("logoUrl", src);
                          await updateSettings({ ...form, logoUrl: src });
                          toast.success("Logo mis à jour");
                        }}
                      />

                      {form.logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={disabledSettings || uploadingLogo}
                          onClick={async () => {
                            set("logoUrl", "");
                            await updateSettings({ ...form, logoUrl: "" });
                            toast.success(t("admin.reglages.parametres.toast_logo_defaut_retabli"));
                          }}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Rétablir le logo officiel par défaut
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>{t("admin.reglages.parametres.champ_email_contact")}</Label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    disabled={disabledSettings}
                  />
                </div>
                <div>
                  <Label>{t("admin.reglages.parametres.champ_telephone")}</Label>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    placeholder="+213…"
                    disabled={disabledSettings}
                  />
                </div>
                <div>
                  <Label>{t("admin.reglages.parametres.champ_whatsapp")}</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
                    placeholder="213555000000"
                    disabled={disabledSettings}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.champ_whatsapp_aide")}
                  </p>
                </div>
                <div>
                  <Label>{t("admin.reglages.parametres.champ_adresse")}</Label>
                  <Textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder={t("admin.reglages.parametres.champ_adresse_placeholder")}
                    disabled={disabledSettings}
                  />
                </div>
                <div>
                  <Label>{t("admin.reglages.parametres.champ_horaires")}</Label>
                  <Input
                    value={form.hours}
                    onChange={(e) => set("hours", e.target.value)}
                    placeholder={t("admin.reglages.parametres.champ_horaires_placeholder")}
                    disabled={disabledSettings}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Identité Visuelle & Thème ── manageSettings ────────────────── */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Palette className="size-5 text-primary" />
                <CardTitle>{t("admin.reglages.parametres.carte_theme_titre")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Thème d'affichage par défaut */}
                <div className="space-y-1.5">
                  <Label>{t("admin.reglages.parametres.theme_defaut")}</Label>
                  <Select
                    value={form.defaultTheme ?? "dark"}
                    onValueChange={(val: "dark" | "light" | "system") => set("defaultTheme", val)}
                    disabled={disabledSettings}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">
                        {t("admin.reglages.parametres.theme_sombre")}
                      </SelectItem>
                      <SelectItem value="light">
                        {t("admin.reglages.parametres.theme_clair")}
                      </SelectItem>
                      <SelectItem value="system">
                        {t("admin.reglages.parametres.theme_systeme")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.theme_defaut_aide")}
                  </p>
                </div>

                {/* Couleur primaire d'accentuation */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label>{t("admin.reglages.parametres.couleur_primaire")}</Label>
                    {form.primaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabledSettings}
                        onClick={() => set("primaryColor", "")}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        {t("admin.reglages.parametres.couleur_reinitialiser")}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor || "#3b82f6"}
                      onChange={(e) => set("primaryColor", e.target.value)}
                      disabled={disabledSettings}
                      className="size-9 rounded-md border border-border cursor-pointer bg-card p-0.5 shrink-0"
                    />
                    <Input
                      value={form.primaryColor ?? ""}
                      onChange={(e) => set("primaryColor", e.target.value)}
                      placeholder="#2563eb (vide pour couleur officielle)"
                      disabled={disabledSettings}
                      className="font-mono text-xs max-w-64"
                    />
                    <div
                      className="size-8 rounded-full border border-border shadow-xs shrink-0"
                      style={{ backgroundColor: form.primaryColor || "var(--primary)" }}
                      title="Aperçu de la couleur active"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        disabled={disabledSettings}
                        onClick={() => set("primaryColor", p.value)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-border hover:bg-muted transition-colors"
                      >
                        <span
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.value }}
                        />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.couleur_primaire_aide")}
                  </p>
                </div>

                {/* Favicon de la boutique */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label>{t("admin.reglages.parametres.favicon_titre")}</Label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {form.faviconUrl
                        ? t("admin.reglages.parametres.favicon_personnalise")
                        : t("admin.reglages.parametres.favicon_officiel")}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <div className="flex items-center justify-center p-2 rounded-md border border-border bg-card shrink-0 size-12 shadow-xs">
                      <img
                        src={
                          form.faviconUrl && form.faviconUrl.trim() !== ""
                            ? resoudreUrlMedia(form.faviconUrl)
                            : "/favicon.ico"
                        }
                        alt="Aperçu favicon"
                        className="size-7 object-contain"
                      />
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          value={form.faviconUrl ?? ""}
                          onChange={(e) => set("faviconUrl", e.target.value)}
                          placeholder="URL du favicon (https://... ou téléversez)"
                          disabled={disabledSettings || uploadingFavicon}
                          className="text-xs h-9"
                        />
                        <input
                          type="file"
                          ref={faviconInputRef}
                          accept="image/*,.ico"
                          className="hidden"
                          onChange={handleFaviconUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={disabledSettings || uploadingFavicon}
                          onClick={() => faviconInputRef.current?.click()}
                          className="h-9 gap-1.5 text-xs shrink-0"
                        >
                          <Upload className="size-3.5" />
                          <span>{uploadingFavicon ? "Envoi…" : "Téléverser"}</span>
                        </Button>
                      </div>
                      {form.faviconUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={disabledSettings || uploadingFavicon}
                          onClick={async () => {
                            set("faviconUrl", "");
                            await updateSettings({ ...form, faviconUrl: "" });
                            toast.success(
                              t("admin.reglages.parametres.toast_favicon_defaut_retabli"),
                            );
                          }}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          {t("admin.reglages.parametres.favicon_reinitialiser")}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.favicon_aide")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── Options ── manageSettings ───────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.reglages.parametres.carte_options_titre")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>{t("admin.reglages.parametres.opt_notifications_email")}</Label>
                    {/* Niveau 3 — infobulle sur le Switch quand désactivé. */}
                    <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                      <Switch
                        checked={form.emailNotifications}
                        onCheckedChange={(v) => set("emailNotifications", v)}
                        disabled={disabledSettings}
                      />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.opt_notifications_email_desc")}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t("admin.reglages.parametres.opt_selecteur_langue")}</Label>
                  <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                    <Switch
                      checked={form.languageSelectorEnabled}
                      onCheckedChange={(v) => set("languageSelectorEnabled", v)}
                      disabled={disabledSettings}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t("admin.reglages.parametres.opt_masquer_note")}</Label>
                  <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                    <Switch
                      checked={form.hideRatingWhenNoReviews}
                      onCheckedChange={(v) => set("hideRatingWhenNoReviews", v)}
                      disabled={disabledSettings}
                    />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div>
                    <Label>{t("admin.reglages.parametres.seuil_stock_faible")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.lowStockThreshold}
                      onChange={(e) => set("lowStockThreshold", Number(e.target.value) || 0)}
                      disabled={disabledSettings}
                    />
                  </div>
                  <div>
                    <Label>{t("admin.reglages.parametres.seuil_rupture")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.outOfStockThreshold}
                      onChange={(e) => set("outOfStockThreshold", Number(e.target.value) || 0)}
                      disabled={disabledSettings}
                    />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.seuils_aide")}
                  </p>
                </div>

                {/* Modules métiers */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="space-y-0.5">
                    <Label>{t("admin.reglages.parametres.opt_configurateur")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.reglages.parametres.opt_configurateur_aide")}
                    </p>
                  </div>
                  <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                    <Switch
                      checked={form.builderEnabled !== false}
                      onCheckedChange={(v) => set("builderEnabled", v)}
                      disabled={disabledSettings}
                    />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ── Mode maintenance ── manageCriticalSettings ─────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.reglages.parametres.carte_maintenance_titre")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("admin.reglages.parametres.maintenance_activer")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.reglages.parametres.maintenance_aide")}
                    </p>
                  </div>
                  <span title={disabledCritical ? denyReason("manageCriticalSettings") : undefined}>
                    <Switch
                      checked={form.maintenance}
                      onCheckedChange={(v) => set("maintenance", v)}
                      disabled={disabledCritical}
                    />
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label>Titre d'accroche personnalisé</Label>
                  <Input
                    value={form.maintenanceTitle || ""}
                    onChange={(e) => set("maintenanceTitle", e.target.value)}
                    placeholder="ex: Réouverture très bientôt..."
                    disabled={disabledCritical}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("admin.reglages.parametres.maintenance_message")}</Label>
                  <Textarea
                    rows={3}
                    value={form.maintenanceMessage}
                    onChange={(e) => set("maintenanceMessage", e.target.value)}
                    placeholder="Message d'information pour vos visiteurs..."
                    disabled={disabledCritical}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date / Heure estimée de réouverture (optionnel)</Label>
                  <Input
                    value={form.maintenanceEstimatedReturn || ""}
                    onChange={(e) => set("maintenanceEstimatedReturn", e.target.value)}
                    placeholder="ex: Demain dès 09h00"
                    disabled={disabledCritical}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-3">
                  <div>
                    <Label>Bouton d'assistance WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">
                      Affiche un bouton vert direct pour discuter sur WhatsApp pendant la
                      maintenance
                    </p>
                  </div>
                  <span title={disabledCritical ? denyReason("manageCriticalSettings") : undefined}>
                    <Switch
                      checked={form.maintenanceShowWhatsApp ?? false}
                      onCheckedChange={(v) => set("maintenanceShowWhatsApp", v)}
                      disabled={disabledCritical}
                    />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ── Bandeau promotionnel ── manageSettings ─────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.reglages.parametres.carte_bandeau_titre")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("admin.reglages.parametres.bandeau_afficher")}</Label>
                  <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                    <Switch
                      checked={form.showPromoBanner}
                      onCheckedChange={(v) => set("showPromoBanner", v)}
                      disabled={disabledSettings}
                    />
                  </span>
                </div>
                <div>
                  <Label>{t("admin.reglages.parametres.bandeau_message")}</Label>
                  <Input
                    value={form.promoBannerText}
                    onChange={(e) => set("promoBannerText", e.target.value)}
                    disabled={disabledSettings}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.reglages.parametres.bandeau_libelle_bouton")}</Label>
                    <Input
                      value={form.promoBannerLabel}
                      onChange={(e) => set("promoBannerLabel", e.target.value)}
                      disabled={disabledSettings}
                    />
                  </div>
                  <div>
                    <Label>{t("admin.reglages.parametres.bandeau_lien_bouton")}</Label>
                    <Input
                      value={form.promoBannerHref}
                      onChange={(e) => set("promoBannerHref", e.target.value)}
                      placeholder="/category/laptops"
                      disabled={disabledSettings}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("admin.reglages.parametres.bandeau_aide")}
                </p>
              </CardContent>
            </Card>

            {/* ── Devise & format ── manageSettings ──────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.reglages.parametres.carte_devise_titre")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.reglages.parametres.devise_symbole")}</Label>
                    <Input
                      value={form.currencySymbol}
                      onChange={(e) => set("currencySymbol", e.target.value)}
                      placeholder="DA"
                      disabled={disabledSettings}
                    />
                  </div>
                  <div>
                    <Label>{t("admin.reglages.parametres.devise_position")}</Label>
                    <Select
                      value={form.currencyPosition}
                      onValueChange={(v) =>
                        set("currencyPosition", v as SiteSettings["currencyPosition"])
                      }
                      disabled={disabledSettings}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suffix">
                          {t("admin.reglages.parametres.devise_position_suffixe")}
                        </SelectItem>
                        <SelectItem value="prefix">
                          {t("admin.reglages.parametres.devise_position_prefixe")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>{t("admin.reglages.parametres.devise_separateur")}</Label>
                    <Select
                      value={form.currencyThousandSeparator || "none"}
                      onValueChange={(v) =>
                        set(
                          "currencyThousandSeparator",
                          (v === "none" ? "" : v) as SiteSettings["currencyThousandSeparator"],
                        )
                      }
                      disabled={disabledSettings}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">
                          {t("admin.reglages.parametres.devise_sep_espace")}
                        </SelectItem>
                        <SelectItem value=",">
                          {t("admin.reglages.parametres.devise_sep_virgule")}
                        </SelectItem>
                        <SelectItem value=".">
                          {t("admin.reglages.parametres.devise_sep_point")}
                        </SelectItem>
                        <SelectItem value="'">
                          {t("admin.reglages.parametres.devise_sep_apostrophe")}
                        </SelectItem>
                        <SelectItem value="none">
                          {t("admin.reglages.parametres.devise_sep_aucun")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md border border-dashed p-3 text-sm">
                  {t("admin.reglages.parametres.devise_apercu")}{" "}
                  <strong>{formatPriceRaw(123456, form)}</strong> ·{" "}
                  <strong>{formatPriceRaw(7500, form)}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("admin.reglages.parametres.devise_apercu_aide")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {/* Niveau 1 — affichage des boutons globaux. */}
        {can("manageSettings") ? (
          <Button variant="outline" onClick={resetSettings} disabled={saving}>
            <RotateCcw className="me-2 h-4 w-4" />{" "}
            {t("admin.reglages.parametres.btn_reinitialiser")}
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button variant="outline" disabled>
              <RotateCcw className="me-2 h-4 w-4" />{" "}
              {t("admin.reglages.parametres.btn_reinitialiser")}
            </Button>
          </span>
        )}
        {can("manageSettings") ? (
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="me-2 h-4 w-4" />{" "}
            {saving
              ? t("admin.reglages.parametres.btn_enregistrement")
              : t("admin.reglages.parametres.btn_enregistrer")}
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button disabled>
              <Save className="me-2 h-4 w-4" /> {t("admin.reglages.parametres.btn_enregistrer")}
            </Button>
          </span>
        )}
      </div>

      {/* ── Contrôleurs Visuels Interactifs & Éditeurs JSON ──────────────── */}

      {/* manageCriticalSettings : bandeau défilant d'annonces */}
      <TickerMessagesVisualEditor
        title={t("admin.reglages.parametres.json_tickers_titre")}
        description={t("admin.reglages.parametres.json_tickers_description")}
        value={tickerMessages}
        permission="manageCriticalSettings"
        onSave={async (v) => {
          await setTickers(v);
        }}
        onReset={async () => {
          if (isHttpMode()) {
            await reinitialiserServeur("reset", "tickerMessages");
            invalidateAll();
          }
          resetData("tickerMessages");
          toast.success(t("admin.reglages.parametres.toast_reinitialise"));
        }}
        can={can}
        guard={guard}
        denyReason={denyReason}
        t={t}
      />

      {/* manageSettings : gestionnaire visuel de badges de marques */}
      <MarqueeBrandsVisualEditor
        title={t("admin.reglages.parametres.json_marques_titre")}
        description={t("admin.reglages.parametres.json_marques_description")}
        value={marqueeBrands}
        permission="manageSettings"
        onSave={async (v) => {
          await setMarquee(v);
        }}
        onReset={async () => {
          if (isHttpMode()) {
            await reinitialiserServeur("reset", "marqueeBrands");
            invalidateAll();
          }
          resetData("marqueeBrands");
          toast.success(t("admin.reglages.parametres.toast_reinitialise"));
        }}
        can={can}
        guard={guard}
        denyReason={denyReason}
        t={t}
      />

      {/* manageSettings : cartes des valeurs et engagements */}
      <AboutValuesVisualEditor
        title={t("admin.reglages.parametres.json_valeurs_titre")}
        description={t("admin.reglages.parametres.json_valeurs_description")}
        value={aboutValues}
        permission="manageSettings"
        onSave={async (v) => {
          await setAbout(v);
        }}
        onReset={async () => {
          if (isHttpMode()) {
            await reinitialiserServeur("reset", "aboutValues");
            invalidateAll();
          }
          resetData("aboutValues");
          toast.success(t("admin.reglages.parametres.toast_reinitialise"));
        }}
        can={can}
        guard={guard}
        denyReason={denyReason}
        t={t}
      />

      {/* manageCriticalSettings : composants + tarifs du builder, impact métier fort */}
      <JsonEditorCard<BuilderStep[]>
        title={t("admin.reglages.parametres.json_builder_titre")}
        description={t("admin.reglages.parametres.json_builder_description")}
        value={builderSteps}
        permission="manageCriticalSettings"
        onSave={async (v) => {
          await replaceBuilder(v);
        }}
        onReset={async () => {
          if (isHttpMode()) {
            await reinitialiserServeur("reset", "builderSteps");
            invalidateAll();
          }
          resetData("builderSteps");
          toast.success(t("admin.reglages.parametres.toast_reinitialise"));
        }}
        validate={(v) =>
          Array.isArray(v) &&
          v.every(
            (s) =>
              s &&
              typeof s.id === "string" &&
              typeof s.label === "string" &&
              ["case", "mb", "cpu", "ram", "ssd", "gpu", "psu", "cool"].includes(
                (s as BuilderStep).icon,
              ) &&
              Array.isArray((s as BuilderStep).options) &&
              (s as BuilderStep).options.every(
                (o) =>
                  o &&
                  typeof o.id === "string" &&
                  typeof o.name === "string" &&
                  typeof o.price === "number",
              ),
          )
        }
        can={can}
        guard={guard}
        denyReason={denyReason}
        t={t}
      />
    </AdminPageShell>
  );
}

import type { AdminPermission, PermissionRequirement } from "@/lib/admin-auth";

function JsonEditorCard<T>({
  title,
  description,
  value,
  permission,
  onSave,
  onReset,
  validate,
  can,
  guard,
  denyReason,
  t,
}: {
  title: string;
  description: string;
  value: T;
  permission: AdminPermission;
  onSave: (v: T) => Promise<void>;
  onReset: () => Promise<void>;
  validate: (v: unknown) => boolean;
  can: (r: PermissionRequirement) => boolean;
  guard: (r: PermissionRequirement, action?: string) => boolean;
  denyReason: (r: PermissionRequirement) => string | undefined;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const disabled = !can(permission);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setParseError(null);
  }, [value]);

  async function commit() {
    // Niveau 2 — vérification dans l'action avant toute mutation.
    if (!guard(permission, t("admin.reglages.parametres.json_garde_sauvegarder", { titre: title })))
      return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setParseError(t("admin.reglages.parametres.json_json_invalide"));
      toast.error(t("admin.reglages.parametres.json_json_invalide"));
      return;
    }
    if (!validate(parsed)) {
      setParseError(t("admin.reglages.parametres.json_structure_invalide"));
      toast.error(t("admin.reglages.parametres.json_structure_invalide"));
      return;
    }
    setParseError(null);
    setSaving(true);
    try {
      await onSave(parsed as T);
      toast.success(t("admin.reglages.parametres.json_toast_sauvegarde", { titre: title }));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    // Niveau 2 — même garde que commit.
    if (
      !guard(permission, t("admin.reglages.parametres.json_garde_reinitialiser", { titre: title }))
    )
      return;
    setSaving(true);
    try {
      await onReset();
      toast.success(t("admin.reglages.parametres.json_toast_reinitialise", { titre: title }));
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(24, Math.max(6, text.split("\n").length))}
          className="font-mono text-xs"
          spellCheck={false}
          disabled={disabled}
        />
        {parseError && <p className="text-xs text-destructive">{parseError}</p>}
        <div className="flex justify-end gap-2">
          {can(permission) ? (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
              <RotateCcw className="me-2 h-4 w-4" />{" "}
              {t("admin.reglages.parametres.btn_reinitialiser")}
            </Button>
          ) : (
            <span title={denyReason(permission)} className="inline-flex">
              <Button variant="outline" size="sm" disabled>
                <RotateCcw className="me-2 h-4 w-4" />{" "}
                {t("admin.reglages.parametres.btn_reinitialiser")}
              </Button>
            </span>
          )}
          {can(permission) ? (
            <Button size="sm" onClick={commit} disabled={saving}>
              <Save className="me-2 h-4 w-4" />{" "}
              {saving
                ? t("admin.reglages.parametres.json_enregistrement")
                : t("admin.reglages.parametres.json_btn_sauvegarder")}
            </Button>
          ) : (
            <span title={denyReason(permission)} className="inline-flex">
              <Button size="sm" disabled>
                <Save className="me-2 h-4 w-4" />{" "}
                {t("admin.reglages.parametres.json_btn_sauvegarder")}
              </Button>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
