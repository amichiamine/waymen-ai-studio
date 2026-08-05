import { useEffect, useState } from "react";
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
import { Save, RotateCcw, AlertTriangle } from "lucide-react";
import {
  useSiteSettings,
  useSiteSettingsMutations,
  useTickerMessageList,
  useTickerMessageMutations,
  useMarqueeBrandList,
  useMarqueeBrandMutations,
  useAboutValueList,
  useAboutValueMutations,
  useBuilderStepList,
  useBuilderStepMutations,
  toApiError,
} from "@/data-provider";
import {
  resetData,
  type SiteSettings,
  type TickerMessage,
  type AboutValue,
  type BuilderStep,
} from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";
import { formatDZD } from "@/data/products";

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
  const [form, setForm] = useState<SiteSettings>(siteSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(siteSettings);
  }, [siteSettings]);

  async function saveSettings() {
    // Niveau 2 — vérification dans l'action avant toute mutation.
    if (!guard("manageSettings", "Enregistrer les paramètres")) return;
    if (form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
      toast.error("E-mail invalide");
      return;
    }
    if (form.whatsapp && !/^\d{6,20}$/.test(form.whatsapp)) {
      toast.error("WhatsApp : chiffres uniquement (avec l'indicatif pays, ex. 213555000000)");
      return;
    }
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success("Paramètres enregistrés");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    // Réinitialiser les réglages courants — même niveau que saveSettings.
    if (!guard("manageSettings", "Réinitialiser les paramètres")) return;
    setSaving(true);
    try {
      // Le provider ne propose pas de reset vers les valeurs seed ; on passe
      // par la primitive du store (migration douce — DATA-PROVIDER.md §4).
      resetData("siteSettings");
      toast.success("Paramètres réinitialisés");
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const disabledSettings = !can("manageSettings");
  const disabledCritical = !can("manageCriticalSettings");

  return (
    <AdminPageShell
      title="Paramètres"
      description="Configuration générale de la boutique et contenu du site."
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
          <span className="sr-only">Chargement…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Boutique ── manageSettings ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Boutique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={form.storeName}
                  onChange={(e) => set("storeName", e.target.value)}
                  disabled={disabledSettings}
                />
              </div>
              <div>
                <Label>E-mail de contact</Label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  disabled={disabledSettings}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  placeholder="+213…"
                  disabled={disabledSettings}
                />
              </div>
              <div>
                <Label>WhatsApp (chiffres seulement)</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
                  placeholder="213555000000"
                  disabled={disabledSettings}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Utilisé pour les liens wa.me sur tout le site.
                </p>
              </div>
              <div>
                <Label>Adresse</Label>
                <Textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Adresse du siège"
                  disabled={disabledSettings}
                />
              </div>
              <div>
                <Label>Horaires</Label>
                <Input
                  value={form.hours}
                  onChange={(e) => set("hours", e.target.value)}
                  placeholder="Dim → Jeu, 9h – 19h"
                  disabled={disabledSettings}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Options ── manageSettings ───────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Notifications e-mail</Label>
                {/* Niveau 3 — infobulle sur le Switch quand désactivé. */}
                <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                  <Switch
                    checked={form.emailNotifications}
                    onCheckedChange={(v) => set("emailNotifications", v)}
                    disabled={disabledSettings}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label>Sélecteur de langue (FR / AR / EN)</Label>
                <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                  <Switch
                    checked={form.languageSelectorEnabled}
                    onCheckedChange={(v) => set("languageSelectorEnabled", v)}
                    disabled={disabledSettings}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label>Masquer la note produit sans avis</Label>
                <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                  <Switch
                    checked={form.hideRatingWhenNoReviews}
                    onCheckedChange={(v) => set("hideRatingWhenNoReviews", v)}
                    disabled={disabledSettings}
                  />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <Label>Seuil « stock faible » (≤)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.lowStockThreshold}
                    onChange={(e) => set("lowStockThreshold", Number(e.target.value) || 0)}
                    disabled={disabledSettings}
                  />
                </div>
                <div>
                  <Label>Seuil « rupture » (≤)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.outOfStockThreshold}
                    onChange={(e) => set("outOfStockThreshold", Number(e.target.value) || 0)}
                    disabled={disabledSettings}
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  Les statuts « en stock / faible / rupture » sont recalculés sur toute la vitrine à
                  l'enregistrement.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Mode maintenance ── manageCriticalSettings ─────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Mode maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer le mode maintenance</Label>
                  <p className="text-xs text-muted-foreground">
                    Bloque l'accès public au site. L'admin et /auth restent accessibles.
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
              <div>
                <Label>Message affiché</Label>
                <Textarea
                  rows={3}
                  value={form.maintenanceMessage}
                  onChange={(e) => set("maintenanceMessage", e.target.value)}
                  disabled={disabledCritical}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Bandeau promotionnel ── manageSettings ─────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Bandeau promotionnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Afficher le bandeau promo</Label>
                <span title={disabledSettings ? denyReason("manageSettings") : undefined}>
                  <Switch
                    checked={form.showPromoBanner}
                    onCheckedChange={(v) => set("showPromoBanner", v)}
                    disabled={disabledSettings}
                  />
                </span>
              </div>
              <div>
                <Label>Message du bandeau</Label>
                <Input
                  value={form.promoBannerText}
                  onChange={(e) => set("promoBannerText", e.target.value)}
                  disabled={disabledSettings}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Libellé du bouton</Label>
                  <Input
                    value={form.promoBannerLabel}
                    onChange={(e) => set("promoBannerLabel", e.target.value)}
                    disabled={disabledSettings}
                  />
                </div>
                <div>
                  <Label>Lien du bouton</Label>
                  <Input
                    value={form.promoBannerHref}
                    onChange={(e) => set("promoBannerHref", e.target.value)}
                    placeholder="/category/laptops"
                    disabled={disabledSettings}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le bandeau réapparaît automatiquement dès qu'on modifie son texte, son libellé ou
                son lien.
              </p>
            </CardContent>
          </Card>

          {/* ── Devise & format ── manageSettings ──────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Devise & format des prix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Symbole</Label>
                  <Input
                    value={form.currencySymbol}
                    onChange={(e) => set("currencySymbol", e.target.value)}
                    placeholder="DA"
                    disabled={disabledSettings}
                  />
                </div>
                <div>
                  <Label>Position</Label>
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
                      <SelectItem value="suffix">Suffixe (12 000 DA)</SelectItem>
                      <SelectItem value="prefix">Préfixe (DA 12 000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Séparateur de milliers</Label>
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
                      <SelectItem value=" ">Espace (12 000)</SelectItem>
                      <SelectItem value=",">Virgule (12,000)</SelectItem>
                      <SelectItem value=".">Point (12.000)</SelectItem>
                      <SelectItem value="'">Apostrophe (12'000)</SelectItem>
                      <SelectItem value="none">Aucun (12000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-md border border-dashed p-3 text-sm">
                Aperçu : <strong>{formatDZD(123456)}</strong> · <strong>{formatDZD(7500)}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enregistrez pour appliquer les changements à tout le site.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {/* Niveau 1 — affichage des boutons globaux. */}
        {can("manageSettings") ? (
          <Button variant="outline" onClick={resetSettings} disabled={saving}>
            <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button variant="outline" disabled>
              <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
            </Button>
          </span>
        )}
        {can("manageSettings") ? (
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="me-2 h-4 w-4" /> Enregistrer
          </Button>
        ) : (
          <span title={denyReason("manageSettings")} className="inline-flex">
            <Button disabled>
              <Save className="me-2 h-4 w-4" /> Enregistrer
            </Button>
          </span>
        )}
      </div>

      {/* ── Éditeurs JSON ─────────────────────────────────────────────────── */}

      {/* manageCriticalSettings : écrase une structure visible en tête de site */}
      <JsonEditorCard<TickerMessage[]>
        title="Bandeau défilant (messages)"
        description="Liste des messages du ruban en haut de page."
        value={tickerMessages}
        permission="manageCriticalSettings"
        onSave={async (v) => {
          await setTickers(v);
        }}
        onReset={async () => {
          resetData("tickerMessages");
        }}
        validate={(v) =>
          Array.isArray(v) &&
          v.every((x) => x && typeof x.id === "string" && typeof x.text === "string")
        }
        can={can}
        guard={guard}
        denyReason={denyReason}
      />

      {/* manageSettings : liste de noms de marques, impact cosmétique seulement */}
      <JsonEditorCard<string[]>
        title="Marques défilantes (carrousel)"
        description="Liste de noms de marques affichés en défilement horizontal."
        value={marqueeBrands}
        permission="manageSettings"
        onSave={async (v) => {
          await setMarquee(v);
        }}
        onReset={async () => {
          resetData("marqueeBrands");
        }}
        validate={(v) => Array.isArray(v) && v.every((x) => typeof x === "string")}
        can={can}
        guard={guard}
        denyReason={denyReason}
      />

      {/* manageSettings : contenu de la page À propos, impact marketing */}
      <JsonEditorCard<AboutValue[]>
        title="Valeurs — page À propos"
        description="4 cartes affichées sur /about. icon ∈ shield | truck | headphones | award | star | heart."
        value={aboutValues}
        permission="manageSettings"
        onSave={async (v) => {
          await setAbout(v);
        }}
        onReset={async () => {
          resetData("aboutValues");
        }}
        validate={(v) =>
          Array.isArray(v) &&
          v.every(
            (x) =>
              x &&
              typeof x.id === "string" &&
              typeof x.title === "string" &&
              typeof x.description === "string" &&
              ["shield", "truck", "headphones", "award", "star", "heart"].includes(
                (x as AboutValue).icon,
              ),
          )
        }
        can={can}
        guard={guard}
        denyReason={denyReason}
      />

      {/* manageCriticalSettings : composants + tarifs du builder, impact métier fort */}
      <JsonEditorCard<BuilderStep[]>
        title="Étapes du configurateur PC"
        description="Composants du builder. icon ∈ case | mb | cpu | ram | ssd | gpu | psu | cool."
        value={builderSteps}
        permission="manageCriticalSettings"
        onSave={async (v) => {
          await replaceBuilder(v);
        }}
        onReset={async () => {
          resetData("builderSteps");
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
    if (!guard(permission, `Sauvegarder ${title}`)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setParseError("JSON invalide");
      toast.error("JSON invalide");
      return;
    }
    if (!validate(parsed)) {
      setParseError("Structure invalide");
      toast.error("Structure invalide");
      return;
    }
    setParseError(null);
    setSaving(true);
    try {
      await onSave(parsed as T);
      toast.success(`${title} — sauvegardé`);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    // Niveau 2 — même garde que commit.
    if (!guard(permission, `Réinitialiser ${title}`)) return;
    setSaving(true);
    try {
      await onReset();
      toast.success(`${title} — réinitialisé`);
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
              <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
            </Button>
          ) : (
            <span title={denyReason(permission)} className="inline-flex">
              <Button variant="outline" size="sm" disabled>
                <RotateCcw className="me-2 h-4 w-4" /> Réinitialiser
              </Button>
            </span>
          )}
          {can(permission) ? (
            <Button size="sm" onClick={commit} disabled={saving}>
              <Save className="me-2 h-4 w-4" /> Sauvegarder
            </Button>
          ) : (
            <span title={denyReason(permission)} className="inline-flex">
              <Button size="sm" disabled>
                <Save className="me-2 h-4 w-4" /> Sauvegarder
              </Button>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
