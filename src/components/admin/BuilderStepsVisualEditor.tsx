import { useState } from "react";
import {
  Plus,
  Trash2,
  Cpu,
  Save,
  RotateCcw,
  Box,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Monitor,
  Zap,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BuilderStep, BuilderPart } from "@/lib/admin-store";
import { useI18n } from "@/lib/i18n";
import { formatDZD } from "@/data/products";

const ICONS_CONFIG: Record<BuilderStep["icon"], typeof Cpu> = {
  case: Box,
  mb: CircuitBoard,
  cpu: Cpu,
  ram: MemoryStick,
  ssd: HardDrive,
  gpu: Monitor,
  psu: Zap,
  cool: Snowflake,
};

interface BuilderStepsVisualEditorProps {
  title: string;
  description: string;
  value: BuilderStep[];
  onSave: (val: BuilderStep[]) => Promise<void>;
  onReset: () => Promise<void>;
  disabled?: boolean;
}

export function BuilderStepsVisualEditor({
  title,
  description,
  value,
  onSave,
  onReset,
  disabled = false,
}: BuilderStepsVisualEditorProps) {
  const { t } = useI18n();
  const [steps, setSteps] = useState<BuilderStep[]>(value);
  const [saving, setSaving] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string>(value[0]?.id || "case");

  // Re-synchronisation si la valeur parente change (ex: après reset)
  const currentKey = JSON.stringify(value);
  const [prevKey, setPrevKey] = useState(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setSteps(value);
  }

  const activeStep = steps.find((s) => s.id === activeStepId) || steps[0];

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(steps);
      toast.success(
        t("admin.reglages.parametres.toast_enregistre") ||
          "Composants du configurateur enregistrés",
      );
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Erreur de sauvegarde";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function updateStep(stepId: string, patch: Partial<BuilderStep>) {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  }

  function addPart(stepId: string) {
    const newPart: BuilderPart = {
      id: `part_${Date.now()}`,
      name: "Nouveau composant",
      price: 15000,
    };
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, options: [...s.options, newPart] } : s)),
    );
  }

  function updatePart(stepId: string, partId: string, patch: Partial<BuilderPart>) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              options: s.options.map((p) => (p.id === partId ? { ...p, ...patch } : p)),
            }
          : s,
      ),
    );
  }

  function removePart(stepId: string, partId: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, options: s.options.filter((p) => p.id !== partId) } : s,
      ),
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="size-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving}
            onClick={onReset}
          >
            <RotateCcw className="me-1.5 size-3.5" />
            {t("common.reset") || "Réinitialiser"}
          </Button>
          <Button type="button" size="sm" disabled={disabled || saving} onClick={handleSave}>
            <Save className="me-1.5 size-3.5" />
            {saving ? "Enregistrement..." : t("common.save") || "Enregistrer"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Navigation des étapes du configurateur */}
        <div className="flex flex-wrap gap-2 mb-6 border-b pb-3">
          {steps.map((st) => {
            const Icon = ICONS_CONFIG[st.icon] || Cpu;
            const isActive = st.id === activeStep?.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStepId(st.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{st.label}</span>
                <span className="text-[10px] opacity-80 bg-background/20 px-1.5 py-0.2 rounded-full">
                  {st.options.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Détail de l'étape sélectionnée */}
        {activeStep && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/10">
              <div>
                <Label className="text-xs">Nom de l'étape</Label>
                <Input
                  value={activeStep.label}
                  disabled={disabled}
                  onChange={(e) => updateStep(activeStep.id, { label: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Icône</Label>
                <Select
                  value={activeStep.icon}
                  disabled={disabled}
                  onValueChange={(v: BuilderStep["icon"]) => updateStep(activeStep.id, { icon: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case">📦 Boîtier (Case)</SelectItem>
                    <SelectItem value="mb">🔌 Carte mère (Motherboard)</SelectItem>
                    <SelectItem value="cpu">🧠 Processeur (CPU)</SelectItem>
                    <SelectItem value="ram">⚡ Mémoire RAM</SelectItem>
                    <SelectItem value="ssd">💾 Disque / SSD</SelectItem>
                    <SelectItem value="gpu">🖥️ Carte graphique (GPU)</SelectItem>
                    <SelectItem value="psu">🔋 Alimentation (PSU)</SelectItem>
                    <SelectItem value="cool">❄️ Refroidissement (Cooler)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Liste des composants / pièces pour cette étape */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Pièces & Options disponibles pour cette étape ({activeStep.options.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => addPart(activeStep.id)}
                >
                  <Plus className="me-1.5 size-3.5" />
                  Ajouter un composant
                </Button>
              </div>

              {activeStep.options.length === 0 ? (
                <div className="text-center py-8 rounded-lg border border-dashed text-muted-foreground text-xs">
                  Aucun composant configuré pour cette étape.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStep.options.map((part) => (
                    <div
                      key={part.id}
                      className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 w-full">
                        <Input
                          value={part.name}
                          disabled={disabled}
                          placeholder="Nom du composant..."
                          onChange={(e) =>
                            updatePart(activeStep.id, part.id, { name: e.target.value })
                          }
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="w-full sm:w-44 flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={part.price}
                          disabled={disabled}
                          onChange={(e) =>
                            updatePart(activeStep.id, part.id, {
                              price: Number(e.target.value) || 0,
                            })
                          }
                          className="text-xs h-9 text-end"
                        />
                        <span className="text-xs font-semibold text-muted-foreground shrink-0">
                          DZD
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => removePart(activeStep.id, part.id)}
                        className="shrink-0 text-destructive hover:bg-destructive/10 h-9 w-9"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
