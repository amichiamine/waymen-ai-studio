import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, RotateCcw } from "lucide-react";
import {
  useAdminState, updateSiteSettings, setTickerMessages, setMarqueeBrands,
  setAboutValues, setBuilderSteps, resetData,
  type SiteSettings, type TickerMessage, type AboutValue, type BuilderStep,
} from "@/lib/admin-store";

export default function AdminSettings() {
  const state = useAdminState();
  const [form, setForm] = useState<SiteSettings>(state.siteSettings);

  useEffect(() => { setForm(state.siteSettings); }, [state.siteSettings]);

  function saveSettings() {
    if (form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) {
      toast.error("E-mail invalide"); return;
    }
    if (form.whatsapp && !/^\d{6,20}$/.test(form.whatsapp)) {
      toast.error("WhatsApp : chiffres uniquement (avec l'indicatif pays, ex. 213555000000)"); return;
    }
    updateSiteSettings(form);
    toast.success("Paramètres enregistrés");
  }

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <AdminPageShell title="Paramètres" description="Configuration générale de la boutique et contenu du site.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Boutique</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nom</Label><Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} /></div>
            <div><Label>E-mail de contact</Label><Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></div>
            <div><Label>Téléphone</Label><Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+213…" /></div>
            <div>
              <Label>WhatsApp (chiffres seulement)</Label>
              <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} placeholder="213555000000" />
              <p className="mt-1 text-xs text-muted-foreground">Utilisé pour les liens wa.me sur tout le site.</p>
            </div>
            <div><Label>Adresse</Label><Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Adresse du siège" /></div>
            <div><Label>Horaires</Label><Input value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Dim → Jeu, 9h – 19h" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Options</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Mode maintenance</Label>
              <Switch checked={form.maintenance} onCheckedChange={(v) => set("maintenance", v)} /></div>
            <div className="flex items-center justify-between"><Label>Notifications e-mail</Label>
              <Switch checked={form.emailNotifications} onCheckedChange={(v) => set("emailNotifications", v)} /></div>
            <div className="flex items-center justify-between"><Label>Afficher le bandeau promo</Label>
              <Switch checked={form.showPromoBanner} onCheckedChange={(v) => set("showPromoBanner", v)} /></div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <div>
                <Label>Seuil « stock faible » (≤)</Label>
                <Input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Seuil « rupture » (≤)</Label>
                <Input type="number" min={0} value={form.outOfStockThreshold} onChange={(e) => set("outOfStockThreshold", Number(e.target.value) || 0)} />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">Les statuts « en stock / faible / rupture » sont recalculés sur toute la vitrine à l'enregistrement.</p>
            </div>
          </CardContent>
        </Card>

      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { resetData("siteSettings"); toast.success("Paramètres réinitialisés"); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
        </Button>
        <Button onClick={saveSettings}><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
      </div>

      <JsonEditorCard<TickerMessage[]>
        title="Bandeau défilant (messages)"
        description="Liste des messages du ruban en haut de page."
        value={state.tickerMessages}
        onSave={(v) => setTickerMessages(v)}
        onReset={() => resetData("tickerMessages")}
        validate={(v) => Array.isArray(v) && v.every((x) => x && typeof x.id === "string" && typeof x.text === "string")}
      />

      <JsonEditorCard<string[]>
        title="Marques défilantes (carrousel)"
        description="Liste de noms de marques affichés en défilement horizontal."
        value={state.marqueeBrands}
        onSave={(v) => setMarqueeBrands(v)}
        onReset={() => resetData("marqueeBrands")}
        validate={(v) => Array.isArray(v) && v.every((x) => typeof x === "string")}
      />

      <JsonEditorCard<AboutValue[]>
        title="Valeurs — page À propos"
        description="4 cartes affichées sur /about. icon ∈ shield | truck | headphones | award | star | heart."
        value={state.aboutValues}
        onSave={(v) => setAboutValues(v)}
        onReset={() => resetData("aboutValues")}
        validate={(v) =>
          Array.isArray(v) &&
          v.every((x) => x && typeof x.id === "string" && typeof x.title === "string" && typeof x.description === "string" &&
            ["shield","truck","headphones","award","star","heart"].includes((x as AboutValue).icon))
        }
      />

      <JsonEditorCard<BuilderStep[]>
        title="Étapes du configurateur PC"
        description="Composants du builder. icon ∈ case | mb | cpu | ram | ssd | gpu | psu | cool."
        value={state.builderSteps}
        onSave={(v) => setBuilderSteps(v)}
        onReset={() => resetData("builderSteps")}
        validate={(v) =>
          Array.isArray(v) &&
          v.every((s) =>
            s && typeof s.id === "string" && typeof s.label === "string" &&
            ["case","mb","cpu","ram","ssd","gpu","psu","cool"].includes((s as BuilderStep).icon) &&
            Array.isArray((s as BuilderStep).options) &&
            (s as BuilderStep).options.every((o) => o && typeof o.id === "string" && typeof o.name === "string" && typeof o.price === "number")
          )
        }
      />
    </AdminPageShell>
  );
}

function JsonEditorCard<T>({
  title, description, value, onSave, onReset, validate,
}: {
  title: string; description: string; value: T;
  onSave: (v: T) => void; onReset: () => void;
  validate: (v: unknown) => boolean;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setText(JSON.stringify(value, null, 2)); setError(null); }, [value]);

  function commit() {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { setError("JSON invalide"); toast.error("JSON invalide"); return; }
    if (!validate(parsed)) { setError("Structure invalide"); toast.error("Structure invalide"); return; }
    setError(null);
    onSave(parsed as T);
    toast.success(`${title} — sauvegardé`);
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
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
          </Button>
          <Button size="sm" onClick={commit}>
            <Save className="mr-2 h-4 w-4" /> Sauvegarder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
