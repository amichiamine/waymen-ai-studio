import { useMemo, useRef, useState } from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";
import { useLocalize } from "@/lib/i18n";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Upload,
  Search,
  Copy,
  Trash2,
  Pencil,
  Image as ImageIcon,
} from "lucide-react";
import {
  useMediaAssetList,
  useMediaAssetMutations,
  useProductList,
  toApiError,
} from "@/data-provider";
import type { MediaAsset } from "@/lib/admin-store";
import { usePermissions } from "@/lib/admin-auth";

const MAX = 5 * 1024 * 1024; // 5 Mo par fichier

// Budget global de la médiathèque en taille binaire.
// Le surcoût base64 (~33 %) est pris en compte dans le calcul de l'espace occupé.
// Le localStorage est partagé par l'ensemble de l'état : 3 Mo laisse une marge
// raisonnable pour les autres données (produits, commandes, blog…).
// TODO Phase 4 (PLAN.md §8, vague 4.5) : abandon du base64 et stockage en fichiers
// serveur — cette contrainte deviendra caduque.
const BUDGET = 3 * 1024 * 1024; // 3 Mo en taille binaire
const WARN_THRESHOLD = 0.8; // avertissement à 80 % du budget

const fmtSize = (b: number) =>
  b < 1024
    ? `${b} o`
    : b < 1048576
      ? `${(b / 1024).toFixed(1)} Ko`
      : `${(b / 1048576).toFixed(2)} Mo`;

export default function AdminMedia() {
  const L = useLocalize();
  const { data: mediaAssets, loading, error } = useMediaAssetList();
  const { data: products } = useProductList();
  const { upload, rename: renameMutation, remove } = useMediaAssetMutations();
  const { can, guard, denyReason } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [renameFor, setRenameFor] = useState<MediaAsset | null>(null);
  const [rName, setRName] = useState("");
  const [rTag, setRTag] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Fusion : médiathèque + images utilisées par le catalogue (référence, non éditables ici)
  const catalog = useMemo(
    () =>
      products
        .map(
          (p) =>
            ({
              id: `cat_${p.id}`,
              // `Product.name` est un `Localized<string>` depuis la phase 3 : le
              // rendre tel quel dans le JSX faisait planter la page entière
              // (« Objects are not valid as a React child »). Le `as MediaAsset`
              // plus bas masquait l'erreur à TypeScript — d'où un défaut que
              // seul un vrai navigateur pouvait révéler.
              name: L(p.name) ?? p.id,
              src: p.image,
              mime: "image/*",
              size: 0,
              createdAt: "",
              tag: "catalogue",
            }) as MediaAsset & { fromCatalog?: boolean },
        )
        .map((m) => ({ ...m, fromCatalog: true })),
    // `L` participe au calcul : l'omettre figeait les libellés sur la langue
    // active au premier rendu, et un changement de langue ne retraduisait plus
    // rien ici.
    [products, L],
  );

  const combined = useMemo(
    () => [...mediaAssets.map((m) => ({ ...m, fromCatalog: false })), ...catalog],
    [mediaAssets, catalog],
  );
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return combined.filter(
      (m) => !n || m.name.toLowerCase().includes(n) || (m.tag ?? "").toLowerCase().includes(n),
    );
  }, [combined, q]);

  const totalSize = mediaAssets.reduce((s, m) => s + m.size, 0);
  const budgetPct = Math.min(100, Math.round((totalSize / BUDGET) * 100));
  const budgetCritical = budgetPct >= 100;
  const budgetWarning = budgetPct >= WARN_THRESHOLD * 100;

  // Niveau 2 — vérification dans le handler avant tout téléversement.
  // La protection de quota est conservée intacte : vérification avant l'appel
  // au provider, sans la court-circuiter ni la dupliquer.
  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    if (!guard("create", "Téléverser un média")) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} : format non supporté`);
        continue;
      }
      if (f.size > MAX) {
        toast.error(`${f.name} : trop volumineux (>5 Mo)`);
        continue;
      }

      // Garde quota global : vérification avant téléversement.
      if (totalSize + f.size > BUDGET) {
        toast.error(
          `Quota de la médiathèque atteint (${fmtSize(BUDGET)} max). ` +
            `Supprimez des images existantes, ou attendez la phase 4 (stockage serveur).`,
        );
        continue;
      }
      if (totalSize + f.size > BUDGET * WARN_THRESHOLD) {
        toast.warning(
          `Attention : ce téléversement portera la médiathèque à ${fmtSize(totalSize + f.size)} / ${fmtSize(BUDGET)}. ` +
            `Le stockage serveur (phase 4) lèvera cette limite.`,
        );
      }

      // Le provider gère la conversion base64 / FormData selon le mode.
      // Il vérifie aussi que l'écriture localStorage a réussi en mode mock.
      try {
        await upload(f);
        toast.success(`${f.name} : téléversé et sauvegardé.`);
      } catch (cause) {
        const err = toApiError(cause);
        toast.error(
          `${f.name} : l'image n'a pas pu être sauvegardée (${err.message}). ` +
            `Supprimez des médias pour libérer de l'espace, ou attendez la phase 4.`,
        );
      }
    }
  };

  const copySrc = (src: string) => {
    navigator.clipboard.writeText(src).then(
      () => toast.success("URL copiée"),
      () => toast.error("Impossible de copier"),
    );
  };

  const openRename = (m: MediaAsset) => {
    setRenameFor(m);
    setRName(m.name);
    setRTag(m.tag ?? "");
  };

  // Niveau 2 — vérification dans le handler de renommage (update).
  const saveRename = async () => {
    if (!renameFor) return;
    if (!guard("update", "Renommer le média")) return;
    if (!rName.trim()) {
      toast.error("Nom requis");
      return;
    }
    setRenameSaving(true);
    try {
      await renameMutation(renameFor.id, rName.trim(), rTag.trim() || undefined);
      toast.success("Métadonnées mises à jour");
      setRenameFor(null);
    } catch (cause) {
      const err = toApiError(cause);
      toast.error(err.message);
    } finally {
      setRenameSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageShell
        title="Médiathèque"
        description="Chargement…"
        actions={
          <>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden />
            <Button disabled>
              <Upload className="me-2 h-4 w-4" /> Téléverser
            </Button>
          </>
        }
      >
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          aria-busy="true"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Médiathèque"
      description={`${mediaAssets.length} images téléversées · ${products.length} images du catalogue · ${fmtSize(totalSize)} utilisés (limite pratique 5 Mo par fichier).`}
      actions={
        // Niveau 1 — désactiver le bouton Téléverser si create est interdit.
        // Niveau 3 — infobulle portée par le <span>.
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          {can("create") ? (
            <Button onClick={() => inputRef.current?.click()} disabled={budgetCritical}>
              <Upload className="me-2 h-4 w-4" /> Téléverser
            </Button>
          ) : (
            <span title={denyReason("create")} className="inline-flex">
              <Button disabled>
                <Upload className="me-2 h-4 w-4" /> Téléverser
              </Button>
            </span>
          )}
        </>
      }
    >
      {error && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-start text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error.message}
        </p>
      )}

      {/* Jauge de quota — affichage permanent */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Espace médiathèque : {fmtSize(totalSize)} / {fmtSize(BUDGET)}
          </span>
          <span>{budgetPct} %</span>
        </div>
        <Progress
          value={budgetPct}
          className={
            budgetCritical
              ? "[&>div]:bg-destructive"
              : budgetWarning
                ? "[&>div]:bg-yellow-500"
                : undefined
          }
        />
        {budgetCritical && (
          <p className="text-xs text-destructive">
            Quota atteint — téléversements bloqués. Supprimez des images ou attendez le stockage
            serveur (phase 4).
          </p>
        )}
        {!budgetCritical && budgetWarning && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Quota bientôt atteint. Envisagez de supprimer des images inutilisées.
          </p>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, tag)…"
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p>Aucune image. Cliquez sur « Téléverser » pour ajouter des visuels.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {rows.map((m) => (
            <figure
              key={m.id}
              className="group relative overflow-hidden rounded-lg border bg-muted"
            >
              <button
                type="button"
                onClick={() => setPreview(m as MediaAsset)}
                className="block aspect-square w-full overflow-hidden"
              >
                <ImageCatalogue
                  src={m.src}
                  alt={m.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </button>
              <figcaption className="space-y-1 p-2">
                <p className="truncate text-xs font-medium" title={m.name}>
                  {m.name}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] text-muted-foreground">
                    {(m as MediaAsset & { fromCatalog?: boolean }).fromCatalog
                      ? "Catalogue"
                      : `${fmtSize(m.size)} · ${new Date(m.createdAt).toLocaleDateString("fr-FR")}`}
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copySrc(m.src)}
                      title="Copier l'URL"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {!(m as MediaAsset & { fromCatalog?: boolean }).fromCatalog && (
                      <>
                        {/* Niveau 1 + 3 — renommer (update). */}
                        {can("update") ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openRename(m as MediaAsset)}
                            title="Renommer"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        ) : (
                          <span title={denyReason("update")} className="inline-flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled
                              aria-label="Renommer"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </span>
                        )}
                        {/* Niveau 1 + 3 — supprimer (delete). */}
                        <span title={denyReason("delete") ?? "Supprimer"} className="inline-flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={!can("delete")}
                            onClick={async () => {
                              // Niveau 2 — vérification dans le handler.
                              if (!guard("delete", "Supprimer le média")) return;
                              try {
                                await remove(m.id);
                                toast.success("Supprimé");
                              } catch (cause) {
                                const err = toApiError(cause);
                                toast.error(err.message);
                              }
                            }}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-center overflow-hidden rounded-md border bg-muted p-2">
                <ImageCatalogue
                  src={preview.src}
                  alt={preview.name}
                  className="max-h-[60vh] object-contain"
                />
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div>Format : {preview.mime || "—"}</div>
                <div>Taille : {preview.size ? fmtSize(preview.size) : "—"}</div>
                <div>
                  Ajouté :{" "}
                  {preview.createdAt ? new Date(preview.createdAt).toLocaleString("fr-FR") : "—"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => copySrc(preview.src)}>
                  <Copy className="me-2 h-4 w-4" /> Copier l'URL / data
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameFor} onOpenChange={(o) => !o && setRenameFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Nom</label>
              <Input value={rName} onChange={(e) => setRName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Tag (optionnel)</label>
              <Input
                value={rTag}
                onChange={(e) => setRTag(e.target.value)}
                placeholder="ex: bannière, produit…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFor(null)}>
              Annuler
            </Button>
            <Button onClick={saveRename} disabled={renameSaving}>
              {renameSaving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
