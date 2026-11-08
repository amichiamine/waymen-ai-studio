import { useState } from "react";
import { Plus, Trash2, Code, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BlockConfig } from "@/types/pages";
import type { Localized } from "@/lib/i18n";

interface BlockPropsEditorProps {
  block: BlockConfig;
  onChange: (newProps: Record<string, unknown>) => void;
}

function getPropStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const loc = val as Record<string, unknown>;
    return String(loc.fr || loc.en || loc.ar || "");
  }
  return "";
}

export function BlockPropsEditor({ block, onChange }: BlockPropsEditorProps) {
  const p = block.props || {};
  const [showJson, setShowJson] = useState(false);
  const [rawJson, setRawJson] = useState(() => JSON.stringify(p, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const updateProp = (key: string, value: unknown) => {
    const updated = { ...p, [key]: value };
    onChange(updated);
    setRawJson(JSON.stringify(updated, null, 2));
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Le JSON doit être un objet clé-valeur.");
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      toast.success("Propriétés JSON appliquées avec succès !");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "JSON syntaxiquement invalide.";
      setJsonError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50 space-y-4 text-start">
      {/* 1. PROFILE HERO */}
      {block.type === "profile_hero" && (
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nom complet affiché :</Label>
              <Input
                value={getPropStr(p.name)}
                onChange={(e) => updateProp("name", e.target.value)}
                placeholder="ArchiSys3.0"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rôle professionnel / Titre :</Label>
              <Input
                value={getPropStr(p.role)}
                onChange={(e) => updateProp("role", e.target.value)}
                placeholder="Architecte Logiciel & Consultant R&D"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Biographie / Présentation :</Label>
            <Textarea
              rows={2}
              value={getPropStr(p.bio)}
              onChange={(e) => updateProp("bio", e.target.value)}
              placeholder="Expertise en architectures logicielles souveraines, cloud, web moderne..."
              className="text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Badge de Disponibilité :</Label>
              <Input
                value={getPropStr(p.availability)}
                onChange={(e) => updateProp("availability", e.target.value)}
                placeholder="Disponible pour missions d'architecture & R&D"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">URL de l'avatar / photo :</Label>
              <Input
                value={getPropStr(p.avatarUrl)}
                onChange={(e) => updateProp("avatarUrl", e.target.value)}
                placeholder="/media/avatar.png ou URL distante"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lien GitHub :</Label>
              <Input
                value={getPropStr(p.githubUrl)}
                onChange={(e) => updateProp("githubUrl", e.target.value)}
                placeholder="https://github.com/..."
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lien LinkedIn :</Label>
              <Input
                value={getPropStr(p.linkedinUrl)}
                onChange={(e) => updateProp("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email de contact :</Label>
              <Input
                value={getPropStr(p.email)}
                onChange={(e) => updateProp("email", e.target.value)}
                placeholder="contact@domaine.com"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label className="text-xs font-semibold">
              Bouton Téléchargement CV PDF (window.print) :
            </Label>
            <Switch
              checked={p.showDownloadPdf !== false}
              onCheckedChange={(c) => updateProp("showDownloadPdf", c)}
            />
          </div>
        </div>
      )}

      {/* 2. TIMELINE MILESTONES */}
      {block.type === "timeline" && (
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre de la section :</Label>
              <Input
                value={getPropStr(p.title)}
                onChange={(e) => updateProp("title", e.target.value)}
                placeholder="Parcours Professionnel & R&D"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sous-titre :</Label>
              <Input
                value={getPropStr(p.subtitle)}
                onChange={(e) => updateProp("subtitle", e.target.value)}
                placeholder="Étapes d'ingénierie et réalisations..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Jalons & Expériences :</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const current = Array.isArray(p.items) ? [...p.items] : [];
                  current.push({
                    id: "tl_" + Date.now(),
                    period: "2026 - Présent",
                    title: "Nouveau Rôle / Jalon",
                    organization: "Entreprise / Organisation",
                    description: "Détails de la mission ou des accomplissements...",
                  });
                  updateProp("items", current);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter un jalon</span>
              </Button>
            </div>

            {Array.isArray(p.items) && p.items.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {p.items.map((item: Record<string, unknown>, itemIdx: number) => (
                  <div
                    key={String(item.id || itemIdx)}
                    className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={String(item.period || "")}
                        onChange={(e) => {
                          const next = [...(p.items as Record<string, unknown>[])];
                          next[itemIdx] = { ...next[itemIdx], period: e.target.value };
                          updateProp("items", next);
                        }}
                        placeholder="Période (ex: 2024 - 2026)"
                        className="h-7 text-xs w-36 font-semibold"
                      />
                      <Input
                        value={String(item.title || "")}
                        onChange={(e) => {
                          const next = [...(p.items as Record<string, unknown>[])];
                          next[itemIdx] = { ...next[itemIdx], title: e.target.value };
                          updateProp("items", next);
                        }}
                        placeholder="Intitulé du poste ou jalon"
                        className="h-7 text-xs flex-1 font-bold"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const next = [...(p.items as Record<string, unknown>[])];
                          next.splice(itemIdx, 1);
                          updateProp("items", next);
                        }}
                        title="Supprimer ce jalon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={String(item.organization || "")}
                        onChange={(e) => {
                          const next = [...(p.items as Record<string, unknown>[])];
                          next[itemIdx] = { ...next[itemIdx], organization: e.target.value };
                          updateProp("items", next);
                        }}
                        placeholder="Entreprise ou Projet"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={String(item.description || "")}
                        onChange={(e) => {
                          const next = [...(p.items as Record<string, unknown>[])];
                          next[itemIdx] = { ...next[itemIdx], description: e.target.value };
                          updateProp("items", next);
                        }}
                        placeholder="Description succincte"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Aucun jalon personnalisé (utilise les données de démonstration intégrées).
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. SKILLS MATRIX */}
      {block.type === "skills_matrix" && (
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre de la section :</Label>
              <Input
                value={getPropStr(p.title)}
                onChange={(e) => updateProp("title", e.target.value)}
                placeholder="Matrice de Compétences & Technologies"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sous-titre :</Label>
              <Input
                value={getPropStr(p.subtitle)}
                onChange={(e) => updateProp("subtitle", e.target.value)}
                placeholder="Stack technologique et expertises..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Catégories & Compétences :
              </Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const current = Array.isArray(p.categories) ? [...p.categories] : [];
                  current.push({
                    name: "Nouvelle Catégorie",
                    skills: ["Compétence 1", "Compétence 2"],
                  });
                  updateProp("categories", current);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter une catégorie</span>
              </Button>
            </div>

            {Array.isArray(p.categories) && p.categories.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {p.categories.map((cat: Record<string, unknown>, catIdx: number) => (
                  <div
                    key={catIdx}
                    className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={String(cat.name || "")}
                        onChange={(e) => {
                          const next = [...(p.categories as Record<string, unknown>[])];
                          next[catIdx] = { ...next[catIdx], name: e.target.value };
                          updateProp("categories", next);
                        }}
                        placeholder="Nom de la catégorie (ex: Frontend)"
                        className="h-7 text-xs font-bold flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const next = [...(p.categories as Record<string, unknown>[])];
                          next.splice(catIdx, 1);
                          updateProp("categories", next);
                        }}
                        title="Supprimer cette catégorie"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Compétences (séparées par des virgules) :
                      </Label>
                      <Input
                        value={Array.isArray(cat.skills) ? cat.skills.join(", ") : ""}
                        onChange={(e) => {
                          const next = [...(p.categories as Record<string, unknown>[])];
                          const parsedSkills = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          next[catIdx] = { ...next[catIdx], skills: parsedSkills };
                          updateProp("categories", next);
                        }}
                        placeholder="React, TypeScript, Vite, Tailwind..."
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Aucune catégorie personnalisée (utilise la matrice par défaut).
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4. PROJECTS GRID */}
      {block.type === "projects_grid" && (
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre de la vitrine :</Label>
              <Input
                value={getPropStr(p.title)}
                onChange={(e) => updateProp("title", e.target.value)}
                placeholder="Vitrine de Projets & Solutions R&D"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sous-titre :</Label>
              <Input
                value={getPropStr(p.subtitle)}
                onChange={(e) => updateProp("subtitle", e.target.value)}
                placeholder="Sélection de réalisations et prototypes..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Projets Affichés :</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const current = Array.isArray(p.projects) ? [...p.projects] : [];
                  current.push({
                    id: "proj_" + Date.now(),
                    title: "Nouveau Projet R&D",
                    description: "Description de la solution, problématique et résultats...",
                    tags: ["TypeScript", "Architecture"],
                    demoUrl: "https://exemple.dz",
                    githubUrl: "https://github.com/...",
                  });
                  updateProp("projects", current);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter un projet</span>
              </Button>
            </div>

            {Array.isArray(p.projects) && p.projects.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {p.projects.map((proj: Record<string, unknown>, projIdx: number) => (
                  <div
                    key={String(proj.id || projIdx)}
                    className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={String(proj.title || "")}
                        onChange={(e) => {
                          const next = [...(p.projects as Record<string, unknown>[])];
                          next[projIdx] = { ...next[projIdx], title: e.target.value };
                          updateProp("projects", next);
                        }}
                        placeholder="Titre du projet"
                        className="h-7 text-xs font-bold flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const next = [...(p.projects as Record<string, unknown>[])];
                          next.splice(projIdx, 1);
                          updateProp("projects", next);
                        }}
                        title="Supprimer ce projet"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={String(proj.description || "")}
                      onChange={(e) => {
                        const next = [...(p.projects as Record<string, unknown>[])];
                        next[projIdx] = { ...next[projIdx], description: e.target.value };
                        updateProp("projects", next);
                      }}
                      placeholder="Description du projet..."
                      className="text-xs"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={String(proj.demoUrl || "")}
                        onChange={(e) => {
                          const next = [...(p.projects as Record<string, unknown>[])];
                          next[projIdx] = { ...next[projIdx], demoUrl: e.target.value };
                          updateProp("projects", next);
                        }}
                        placeholder="Lien Démo (https://...)"
                        className="h-7 text-xs font-mono"
                      />
                      <Input
                        value={String(proj.githubUrl || "")}
                        onChange={(e) => {
                          const next = [...(p.projects as Record<string, unknown>[])];
                          next[projIdx] = { ...next[projIdx], githubUrl: e.target.value };
                          updateProp("projects", next);
                        }}
                        placeholder="Lien GitHub (https://...)"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Aucun projet spécifique (utilise les 4 projets R&D d'étalon).
              </p>
            )}
          </div>
        </div>
      )}

      {/* 5. FAQ ACCORDION */}
      {block.type === "faq_accordion" && (
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre de la FAQ :</Label>
              <Input
                value={getPropStr(p.title)}
                onChange={(e) => updateProp("title", e.target.value)}
                placeholder="Foire Aux Questions"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sous-titre :</Label>
              <Input
                value={getPropStr(p.subtitle)}
                onChange={(e) => updateProp("subtitle", e.target.value)}
                placeholder="Retrouvez rapidement les réponses à vos questions..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Questions / Réponses :</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const current = Array.isArray(p.faqs) ? [...p.faqs] : [];
                  current.push({
                    id: "faq_" + Date.now(),
                    question: "Nouvelle question posée ?",
                    answer: "Réponse détaillée...",
                  });
                  updateProp("faqs", current);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter une question</span>
              </Button>
            </div>

            {Array.isArray(p.faqs) && p.faqs.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {p.faqs.map((faq: Record<string, unknown>, faqIdx: number) => (
                  <div
                    key={String(faq.id || faqIdx)}
                    className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={getPropStr(faq.question)}
                        onChange={(e) => {
                          const next = [...(p.faqs as Record<string, unknown>[])];
                          next[faqIdx] = { ...next[faqIdx], question: e.target.value };
                          updateProp("faqs", next);
                        }}
                        placeholder="Intitulé de la question"
                        className="h-7 text-xs font-bold flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const next = [...(p.faqs as Record<string, unknown>[])];
                          next.splice(faqIdx, 1);
                          updateProp("faqs", next);
                        }}
                        title="Supprimer cette question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={getPropStr(faq.answer)}
                      onChange={(e) => {
                        const next = [...(p.faqs as Record<string, unknown>[])];
                        next[faqIdx] = { ...next[faqIdx], answer: e.target.value };
                        updateProp("faqs", next);
                      }}
                      placeholder="Réponse explicative..."
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Aucune FAQ personnalisée (utilise la FAQ générale du site).
              </p>
            )}
          </div>
        </div>
      )}

      {/* 6. CONTACT FORM */}
      {block.type === "contact_form" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Titre du formulaire :</Label>
            <Input
              value={getPropStr(p.title)}
              onChange={(e) => updateProp("title", e.target.value)}
              placeholder="Envoyez-nous un message"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Sous-titre explicatif :</Label>
            <Input
              value={getPropStr(p.subtitle)}
              onChange={(e) => updateProp("subtitle", e.target.value)}
              placeholder="Une question, un devis ou un projet ?..."
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* 7. BRAND BANNER */}
      {block.type === "brand_banner" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">URL de la Bannière Image :</Label>
            <Input
              value={getPropStr(p.bannerSrc)}
              onChange={(e) => updateProp("bannerSrc", e.target.value)}
              placeholder="/media/banniere.webp ou URL absolue"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Texte alternatif (SEO / Alt) :</Label>
            <Input
              value={getPropStr(p.altText)}
              onChange={(e) => updateProp("altText", e.target.value)}
              placeholder="StacGate Platform — Conçu et Validé par ArchiSys3.0"
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* 8. COMPANY HISTORY */}
      {block.type === "company_history" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre Colonne Histoire :</Label>
              <Input
                value={getPropStr(p.historyTitle)}
                onChange={(e) => updateProp("historyTitle", e.target.value)}
                placeholder="Notre Histoire"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre Colonne Mission :</Label>
              <Input
                value={getPropStr(p.missionTitle)}
                onChange={(e) => updateProp("missionTitle", e.target.value)}
                placeholder="Notre Mission"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Corps Histoire :</Label>
              <Textarea
                rows={3}
                value={getPropStr(p.historyBody)}
                onChange={(e) => updateProp("historyBody", e.target.value)}
                placeholder="Texte de l'histoire de l'entreprise..."
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Corps Mission :</Label>
              <Textarea
                rows={3}
                value={getPropStr(p.missionBody)}
                onChange={(e) => updateProp("missionBody", e.target.value)}
                placeholder="Texte de la mission de l'entreprise..."
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. CATEGORY CARDS / BLOG POSTS (MAX ITEMS) */}
      {(block.type === "category_cards" || block.type === "latest_blog_posts") && (
        <div className="space-y-1 max-w-xs">
          <Label className="text-xs font-semibold">Nombre maximum d'éléments affichés :</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={typeof p.max === "number" ? p.max : 4}
            onChange={(e) => updateProp("max", parseInt(e.target.value, 10) || 4)}
            className="h-8 text-xs w-28 font-mono"
          />
        </div>
      )}

      {/* 10. MARKDOWN SECTION */}
      {block.type === "markdown_section" && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold">
            Contenu Markdown (Supporte Titres, Images, Listes, Vidéos YouTube/Vimeo) :
          </Label>
          <Textarea
            rows={5}
            value={getPropStr(p.content)}
            onChange={(e) => updateProp("content", e.target.value)}
            placeholder="### Titre de votre section&#10;&#10;Votre contenu rédigé en Markdown...&#10;https://www.youtube.com/watch?v=..."
            className="font-mono text-xs"
          />
        </div>
      )}

      {/* 11. MODE AVANCÉ JSON POUR TOUS LES BLOCS */}
      <div className="pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowJson(!showJson)}
            className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Code className="h-3 w-3" />
            <span>{showJson ? "Masquer le JSON brut" : "Mode Développeur : JSON brut"}</span>
          </Button>

          {showJson && (
            <Button size="sm" onClick={handleApplyJson} className="h-7 text-xs gap-1 font-semibold">
              <Check className="h-3 w-3" />
              <span>Appliquer le JSON</span>
            </Button>
          )}
        </div>

        {showJson && (
          <div className="mt-2 space-y-2">
            <Textarea
              rows={6}
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setJsonError(null);
              }}
              className="font-mono text-[11px] bg-muted/40"
            />
            {jsonError && <p className="text-[11px] text-destructive font-mono">{jsonError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
