import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Code2,
  Sliders,
  Shield,
  Truck,
  Headphones,
  Award,
  Star,
  Heart,
  Save,
  RotateCcw,
  Check,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { toApiError } from "@/data-provider";
import type { TickerMessage, AboutValue, BuilderStep } from "@/lib/admin-store";
import type { AdminPermission, PermissionRequirement } from "@/lib/admin-auth";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GESTIONNAIRE VISUEL : MARQUES DU CARROUSEL (CHIPS & TAGS)
// ─────────────────────────────────────────────────────────────────────────────

export function MarqueeBrandsVisualEditor({
  title,
  description,
  value,
  permission,
  onSave,
  onReset,
  can,
  guard,
  denyReason,
  t,
}: {
  title: string;
  description: string;
  value: string[];
  permission: AdminPermission;
  onSave: (v: string[]) => Promise<void>;
  onReset: () => Promise<void>;
  can: (r: PermissionRequirement) => boolean;
  guard: (r: PermissionRequirement, action?: string) => boolean;
  denyReason: (r: PermissionRequirement) => string | undefined;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [brands, setBrands] = useState<string[]>(value);
  const [newBrand, setNewBrand] = useState("");
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const disabled = !can(permission);

  useEffect(() => {
    setBrands(value);
    setJsonText(JSON.stringify(value, null, 2));
    setJsonError(null);
  }, [value]);

  const addBrand = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (brands.includes(trimmed)) {
      toast.info(`La marque « ${trimmed} » est déjà présente.`);
      return;
    }
    const updated = [...brands, trimmed];
    setBrands(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    setNewBrand("");
  };

  const removeBrand = (index: number) => {
    const updated = brands.filter((_, i) => i !== index);
    setBrands(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        setBrands(parsed);
        setJsonError(null);
      } else {
        setJsonError("Format attendu : tableau de chaînes ['Marque A', 'Marque B']");
      }
    } catch {
      setJsonError("JSON invalide");
    }
  };

  const handleSave = async () => {
    if (!guard(permission, t("admin.reglages.parametres.json_garde_sauvegarder", { titre: title })))
      return;
    let payload = brands;
    if (isJsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
          toast.error("Structure JSON non conforme");
          return;
        }
        payload = parsed;
      } catch {
        toast.error("JSON invalide");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(payload);
      toast.success(t("admin.reglages.parametres.json_toast_sauvegarde", { titre: title }));
    } catch (cause) {
      toast.error(toApiError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !guard(permission, t("admin.reglages.parametres.json_garde_reinitialiser", { titre: title }))
    )
      return;
    setSaving(true);
    try {
      await onReset();
      toast.success(t("admin.reglages.parametres.json_toast_reinitialise", { titre: title }));
    } catch (cause) {
      toast.error(toApiError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {brands.length} marque{brands.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsJsonMode(!isJsonMode)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {isJsonMode ? (
            <>
              <Sliders className="h-3.5 w-3.5" />
              <span>Contrôleur visuel</span>
            </>
          ) : (
            <>
              <Code2 className="h-3.5 w-3.5" />
              <span>Mode JSON brut</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isJsonMode ? (
          <div>
            <Textarea
              rows={8}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              disabled={disabled}
              className="font-mono text-xs"
            />
            {jsonError && <p className="mt-1 text-xs text-destructive">{jsonError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Ajout rapide */}
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter une marque (ex: Nike, Samsung, Sony...)"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBrand(newBrand);
                  }
                }}
                disabled={disabled}
                className="max-w-md text-sm"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => addBrand(newBrand)}
                disabled={disabled || !newBrand.trim()}
              >
                <Plus className="me-1 h-4 w-4" /> Ajouter
              </Button>
            </div>

            {/* Liste des marques en pastilles (chips) */}
            <div className="flex flex-wrap gap-2 min-h-[50px] p-3 rounded-lg border border-border/60 bg-muted/20">
              {brands.length === 0 ? (
                <span className="text-xs text-muted-foreground italic my-auto">
                  Aucune marque définie. Tapez un nom ci-dessus pour l'ajouter.
                </span>
              ) : (
                brands.map((b, idx) => (
                  <Badge
                    key={`${b}-${idx}`}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 px-2.5 text-sm font-medium bg-card border border-border/80 shadow-xs"
                  >
                    <span>{b}</span>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeBrand(idx)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title={`Supprimer ${b}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </Badge>
                ))
              )}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled || saving}
          >
            <RotateCcw className="me-1.5 h-3.5 w-3.5" />
            {t("admin.reglages.parametres.json_btn_reinitialiser")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={disabled || saving || (isJsonMode && !!jsonError)}
          >
            <Save className="me-1.5 h-3.5 w-3.5" />
            {saving
              ? t("admin.reglages.parametres.json_enregistrement")
              : t("admin.reglages.parametres.json_btn_sauvegarder")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GESTIONNAIRE VISUEL : MESSAGES DU BANDEAU DÉFILANT (TICKERS)
// ─────────────────────────────────────────────────────────────────────────────

export function TickerMessagesVisualEditor({
  title,
  description,
  value,
  permission,
  onSave,
  onReset,
  can,
  guard,
  denyReason,
  t,
}: {
  title: string;
  description: string;
  value: TickerMessage[];
  permission: AdminPermission;
  onSave: (v: TickerMessage[]) => Promise<void>;
  onReset: () => Promise<void>;
  can: (r: PermissionRequirement) => boolean;
  guard: (r: PermissionRequirement, action?: string) => boolean;
  denyReason: (r: PermissionRequirement) => string | undefined;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [items, setItems] = useState<TickerMessage[]>(value);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const disabled = !can(permission);

  useEffect(() => {
    setItems(value);
    setJsonText(JSON.stringify(value, null, 2));
    setJsonError(null);
  }, [value]);

  const addMessage = () => {
    const newItem: TickerMessage = {
      id: `ticker-${Date.now()}`,
      text: "Nouveau message d'annonce",
    };
    const updated = [...items, newItem];
    setItems(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const updateMessage = (index: number, text: string) => {
    const updated = items.map((it, i) => (i === index ? { ...it, text } : it));
    setItems(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const removeMessage = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (
        Array.isArray(parsed) &&
        parsed.every((x) => x && typeof x.id === "string" && typeof x.text === "string")
      ) {
        setItems(parsed);
        setJsonError(null);
      } else {
        setJsonError("Format attendu : tableau d'objets [{ id, text }]");
      }
    } catch {
      setJsonError("JSON invalide");
    }
  };

  const handleSave = async () => {
    if (!guard(permission, t("admin.reglages.parametres.json_garde_sauvegarder", { titre: title })))
      return;
    let payload = items;
    if (isJsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((x) => x && typeof x.id === "string" && typeof x.text === "string")
        ) {
          toast.error("Structure JSON non conforme");
          return;
        }
        payload = parsed;
      } catch {
        toast.error("JSON invalide");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(payload);
      toast.success(t("admin.reglages.parametres.json_toast_sauvegarde", { titre: title }));
    } catch (cause) {
      toast.error(toApiError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !guard(permission, t("admin.reglages.parametres.json_garde_reinitialiser", { titre: title }))
    )
      return;
    setSaving(true);
    try {
      await onReset();
      toast.success(t("admin.reglages.parametres.json_toast_reinitialise", { titre: title }));
    } catch (cause) {
      toast.error(toApiError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {items.length} message{items.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsJsonMode(!isJsonMode)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {isJsonMode ? (
            <>
              <Sliders className="h-3.5 w-3.5" />
              <span>Contrôleur visuel</span>
            </>
          ) : (
            <>
              <Code2 className="h-3.5 w-3.5" />
              <span>Mode JSON brut</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isJsonMode ? (
          <div>
            <Textarea
              rows={8}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              disabled={disabled}
              className="font-mono text-xs"
            />
            {jsonError && <p className="mt-1 text-xs text-destructive">{jsonError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-card hover:border-border transition-colors"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <Input
                    value={item.text}
                    onChange={(e) => updateMessage(idx, e.target.value)}
                    disabled={disabled}
                    placeholder="Texte du message..."
                    className="flex-1 text-sm bg-transparent border-0 focus-visible:ring-1"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMessage(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Supprimer ce message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMessage}
                className="w-full gap-1.5 border-dashed"
              >
                <Plus className="h-4 w-4" /> Ajouter un message au bandeau
              </Button>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled || saving}
          >
            <RotateCcw className="me-1.5 h-3.5 w-3.5" />
            {t("admin.reglages.parametres.json_btn_reinitialiser")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={disabled || saving || (isJsonMode && !!jsonError)}
          >
            <Save className="me-1.5 h-3.5 w-3.5" />
            {saving
              ? t("admin.reglages.parametres.json_enregistrement")
              : t("admin.reglages.parametres.json_btn_sauvegarder")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GESTIONNAIRE VISUEL : VALEURS DE LA PAGE À PROPOS
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP = {
  shield: { label: "Bouclier / Garantie", icon: Shield },
  truck: { label: "Camion / Livraison", icon: Truck },
  headphones: { label: "Casque / Support", icon: Headphones },
  award: { label: "Médaille / Qualité", icon: Award },
  star: { label: "Étoile / Excellence", icon: Star },
  heart: { label: "Cœur / Passion", icon: Heart },
};

export function AboutValuesVisualEditor({
  title,
  description,
  value,
  permission,
  onSave,
  onReset,
  can,
  guard,
  denyReason,
  t,
}: {
  title: string;
  description: string;
  value: AboutValue[];
  permission: AdminPermission;
  onSave: (v: AboutValue[]) => Promise<void>;
  onReset: () => Promise<void>;
  can: (r: PermissionRequirement) => boolean;
  guard: (r: PermissionRequirement, action?: string) => boolean;
  denyReason: (r: PermissionRequirement) => string | undefined;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [items, setItems] = useState<AboutValue[]>(value);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(value, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const disabled = !can(permission);

  useEffect(() => {
    setItems(value);
    setJsonText(JSON.stringify(value, null, 2));
    setJsonError(null);
  }, [value]);

  const addCard = () => {
    const newCard: AboutValue = {
      id: `val-${Date.now()}`,
      icon: "award",
      title: "Nouvelle valeur",
      description: "Description de la valeur d'engagement de la boutique.",
    };
    const updated = [...items, newCard];
    setItems(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const updateCard = (index: number, patch: Partial<AboutValue>) => {
    const updated = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    setItems(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const removeCard = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (x) =>
            x &&
            typeof x.id === "string" &&
            typeof x.title === "string" &&
            typeof x.description === "string" &&
            ["shield", "truck", "headphones", "award", "star", "heart"].includes(x.icon),
        )
      ) {
        setItems(parsed);
        setJsonError(null);
      } else {
        setJsonError("Format attendu : tableau d'objets [{ id, icon, title, description }]");
      }
    } catch {
      setJsonError("JSON invalide");
    }
  };

  const handleSave = async () => {
    if (!guard(permission, t("admin.reglages.parametres.json_garde_sauvegarder", { titre: title })))
      return;
    let payload = items;
    if (isJsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        if (
          !Array.isArray(parsed) ||
          !parsed.every(
            (x) =>
              x &&
              typeof x.id === "string" &&
              typeof x.title === "string" &&
              typeof x.description === "string" &&
              ["shield", "truck", "headphones", "award", "star", "heart"].includes(x.icon),
          )
        ) {
          toast.error("Structure JSON non conforme");
          return;
        }
        payload = parsed;
      } catch {
        toast.error("JSON invalide");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(payload);
      toast.success(t("admin.reglages.parametres.json_toast_sauvegarde", { titre: title }));
    } catch (cause) {
      toast.error(toApiError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !guard(permission, t("admin.reglages.parametres.json_garde_reinitialiser", { titre: title }))
    )
      return;
    setSaving(true);
    try {
      await onReset();
      toast.success(t("admin.reglages.parametres.json_toast_reinitialise", { titre: title }));
    } catch (cause) {
      toast.error(toApiError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {items.length} carte{items.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsJsonMode(!isJsonMode)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {isJsonMode ? (
            <>
              <Sliders className="h-3.5 w-3.5" />
              <span>Contrôleur visuel</span>
            </>
          ) : (
            <>
              <Code2 className="h-3.5 w-3.5" />
              <span>Mode JSON brut</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isJsonMode ? (
          <div>
            <Textarea
              rows={8}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              disabled={disabled}
              className="font-mono text-xs"
            />
            {jsonError && <p className="mt-1 text-xs text-destructive">{jsonError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item, idx) => {
                const IconComponent =
                  ICON_MAP[item.icon as keyof typeof ICON_MAP]?.icon || Sparkles;
                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <Select
                          value={item.icon}
                          onValueChange={(val: AboutValue["icon"]) =>
                            updateCard(idx, { icon: val })
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-8 text-xs w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ICON_MAP).map(([k, cfg]) => (
                              <SelectItem key={k} value={k} className="text-xs">
                                {cfg.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCard(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Supprimer cette carte"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Input
                        value={item.title}
                        onChange={(e) => updateCard(idx, { title: e.target.value })}
                        disabled={disabled}
                        placeholder="Titre de la valeur"
                        className="h-8 text-sm font-medium"
                      />
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateCard(idx, { description: e.target.value })}
                        disabled={disabled}
                        placeholder="Description explicative..."
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCard}
                className="w-full gap-1.5 border-dashed"
              >
                <Plus className="h-4 w-4" /> Ajouter une carte d'engagement
              </Button>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled || saving}
          >
            <RotateCcw className="me-1.5 h-3.5 w-3.5" />
            {t("admin.reglages.parametres.json_btn_reinitialiser")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={disabled || saving || (isJsonMode && !!jsonError)}
          >
            <Save className="me-1.5 h-3.5 w-3.5" />
            {saving
              ? t("admin.reglages.parametres.json_enregistrement")
              : t("admin.reglages.parametres.json_btn_sauvegarder")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
